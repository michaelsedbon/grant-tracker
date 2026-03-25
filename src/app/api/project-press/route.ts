import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile, readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DOCS_DIR = path.join(process.cwd(), 'project-docs')

interface PressEntry {
  id: string
  url: string
  title: string
  source: string
  date: string
  type: 'press' | 'scientific'
  pdfFile: string | null
  archiveStatus: 'pending' | 'done' | 'failed'
  addedAt: string
}

function pressDir(slug: string) {
  const safe = slug.replace(/[^a-zA-Z0-9_\-]/g, '')
  return path.join(DOCS_DIR, safe, 'press')
}

function entriesFile(slug: string) { return path.join(pressDir(slug), '_entries.json') }

async function readEntries(slug: string): Promise<PressEntry[]> {
  const fp = entriesFile(slug)
  if (!existsSync(fp)) return []
  const raw = await readFile(fp, 'utf-8')
  try { return JSON.parse(raw) as PressEntry[] } catch { return [] }
}

async function writeEntries(slug: string, entries: PressEntry[]) {
  const dir = pressDir(slug)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(entriesFile(slug), JSON.stringify(entries, null, 2))
}

// Background PDF archival
async function archivePage(slug: string, entry: PressEntry) {
  try {
    const puppeteer = await import('puppeteer-core')
    const browser = await puppeteer.default.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    })
    const page = await browser.newPage()
    await page.goto(entry.url, { waitUntil: 'networkidle2', timeout: 30000 })
    const dir = pressDir(slug)
    if (!existsSync(dir)) await mkdir(dir, { recursive: true })
    const pdfPath = path.join(dir, `${entry.id}.pdf`)
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } })
    await browser.close()

    // Update entry
    const entries = await readEntries(slug)
    const idx = entries.findIndex(e => e.id === entry.id)
    if (idx !== -1) {
      entries[idx].pdfFile = `${entry.id}.pdf`
      entries[idx].archiveStatus = 'done'
      await writeEntries(slug, entries)
    }
  } catch (err) {
    console.error('PDF archival failed:', err)
    const entries = await readEntries(slug)
    const idx = entries.findIndex(e => e.id === entry.id)
    if (idx !== -1) {
      entries[idx].archiveStatus = 'failed'
      await writeEntries(slug, entries)
    }
  }
}

// GET: list press entries
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
  const entries = await readEntries(slug)
  return NextResponse.json({ entries })
}

// POST: add a press entry (triggers background PDF archival)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { slug, url, title, source, date, type } = body
  if (!slug || !url) return NextResponse.json({ error: 'slug and url required' }, { status: 400 })

  const entries = await readEntries(slug)
  const entry: PressEntry = {
    id: crypto.randomUUID(),
    url,
    title: title || url,
    source: source || '',
    date: date || new Date().toISOString().split('T')[0],
    type: type || 'press',
    pdfFile: null,
    archiveStatus: 'pending',
    addedAt: new Date().toISOString()
  }
  entries.unshift(entry)
  await writeEntries(slug, entries)

  // Fire-and-forget PDF archival
  archivePage(slug, entry).catch(console.error)

  return NextResponse.json({ ok: true, entry })
}

// PUT: retry archival OR edit entry fields
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { slug, id, action, url, title, source, date, type } = body
  if (!slug || !id) return NextResponse.json({ error: 'slug and id required' }, { status: 400 })

  const entries = await readEntries(slug)
  const entry = entries.find(e => e.id === id)
  if (!entry) return NextResponse.json({ error: 'entry not found' }, { status: 404 })

  if (action === 'edit') {
    const urlChanged = url && url !== entry.url
    if (title !== undefined) entry.title = title
    if (source !== undefined) entry.source = source
    if (date !== undefined) entry.date = date
    if (type !== undefined) entry.type = type
    if (url !== undefined) entry.url = url
    await writeEntries(slug, entries)

    // Re-archive if URL changed
    if (urlChanged) {
      entry.archiveStatus = 'pending'
      entry.pdfFile = null
      await writeEntries(slug, entries)
      archivePage(slug, entry).catch(console.error)
    }

    return NextResponse.json({ ok: true, entry })
  }

  // Default: retry archival
  entry.archiveStatus = 'pending'
  await writeEntries(slug, entries)
  archivePage(slug, entry).catch(console.error)

  return NextResponse.json({ ok: true })
}

// DELETE: remove a press entry + its PDF
export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  const id = req.nextUrl.searchParams.get('id')
  if (!slug || !id) return NextResponse.json({ error: 'slug and id required' }, { status: 400 })

  const entries = await readEntries(slug)
  const entry = entries.find(e => e.id === id)
  if (entry?.pdfFile) {
    const pdfPath = path.join(pressDir(slug), entry.pdfFile)
    if (existsSync(pdfPath)) await unlink(pdfPath)
  }

  await writeEntries(slug, entries.filter(e => e.id !== id))
  return NextResponse.json({ ok: true })
}
