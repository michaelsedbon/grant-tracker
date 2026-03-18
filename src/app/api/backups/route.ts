import { NextRequest, NextResponse } from 'next/server'
import { readdir, mkdir, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)
const APP_DIR = process.cwd()
// Store backups OUTSIDE the app, in the parent workspace — survives app deletion
const BACKUP_DIR = path.resolve(APP_DIR, '..', '..', 'backups', 'grant-tracker')
const DB_FILE = path.join(APP_DIR, 'dev.db')
const DOCS_DIR = path.join(APP_DIR, 'project-docs')

interface BackupInfo {
  filename: string
  size: number
  sizeFormatted: string
  date: string
  age: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatAge(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

// GET: list all backups
export async function GET() {
  if (!existsSync(BACKUP_DIR)) await mkdir(BACKUP_DIR, { recursive: true })

  const entries = await readdir(BACKUP_DIR)
  const backups: BackupInfo[] = []

  for (const f of entries) {
    if (!f.endsWith('.tar.gz')) continue
    const fp = path.join(BACKUP_DIR, f)
    const s = await stat(fp)
    backups.push({
      filename: f,
      size: s.size,
      sizeFormatted: formatBytes(s.size),
      date: s.mtime.toISOString(),
      age: formatAge(s.mtime.toISOString())
    })
  }

  backups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Compute total backup size
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0)

  // DB size
  let dbSize = '—'
  if (existsSync(DB_FILE)) {
    const s = await stat(DB_FILE)
    dbSize = formatBytes(s.size)
  }

  // project-docs size (rough)
  let docsSize = '—'
  try {
    const { stdout } = await execAsync(`du -sh "${DOCS_DIR}" 2>/dev/null | cut -f1`)
    docsSize = stdout.trim() || '—'
  } catch { /* ignore */ }

  return NextResponse.json({
    backups,
    totalSize: formatBytes(totalSize),
    totalSizeBytes: totalSize,
    dbSize,
    docsSize,
    backupCount: backups.length,
    backupDir: BACKUP_DIR
  })
}

// POST: create a new backup
export async function POST() {
  if (!existsSync(BACKUP_DIR)) await mkdir(BACKUP_DIR, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  const filename = `grant-tracker-${timestamp}.tar.gz`
  const archivePath = path.join(BACKUP_DIR, filename)

  // Build tar command: include db + project-docs (if they exist)
  const parts: string[] = []
  if (existsSync(DB_FILE)) parts.push('dev.db')
  if (existsSync(DOCS_DIR)) parts.push('project-docs')

  if (parts.length === 0) {
    return NextResponse.json({ error: 'Nothing to backup' }, { status: 400 })
  }

  try {
    await execAsync(`cd "${APP_DIR}" && tar czf "${archivePath}" ${parts.join(' ')}`, { timeout: 120000 })
    const s = await stat(archivePath)
    return NextResponse.json({
      ok: true,
      filename,
      size: formatBytes(s.size)
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Backup failed: ${message}` }, { status: 500 })
  }
}

// DELETE: remove a specific backup
export async function DELETE(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('filename')
  if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 })

  // Sanitize
  if (filename.includes('..') || filename.includes('/')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const fp = path.join(BACKUP_DIR, filename)
  if (!existsSync(fp)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await unlink(fp)
  return NextResponse.json({ ok: true })
}
