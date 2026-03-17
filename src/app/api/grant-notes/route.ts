import { NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// Store notes alongside the app in grant-notes/
const NOTES_DIR = path.join(process.cwd(), 'grant-notes')

function notePath(grantId: string) {
  // Sanitise to prevent path traversal
  const safe = grantId.replace(/[^a-zA-Z0-9\-]/g, '')
  return path.join(NOTES_DIR, `${safe}.md`)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const grantId = searchParams.get('grantId')
  if (!grantId) return NextResponse.json({ error: 'grantId required' }, { status: 400 })

  const fp = notePath(grantId)
  if (!existsSync(fp)) {
    return NextResponse.json({ content: '', exists: false })
  }
  const content = await readFile(fp, 'utf-8')
  return NextResponse.json({ content, exists: true })
}

export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url)
  const grantId = searchParams.get('grantId')
  if (!grantId) return NextResponse.json({ error: 'grantId required' }, { status: 400 })

  const body = await req.json()
  const content = body.content ?? ''

  if (!existsSync(NOTES_DIR)) {
    await mkdir(NOTES_DIR, { recursive: true })
  }

  const fp = notePath(grantId)
  await writeFile(fp, content, 'utf-8')
  return NextResponse.json({ ok: true })
}
