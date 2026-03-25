import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DOCS_DIR = path.join(process.cwd(), 'project-docs', '_profile')

async function readJsonFile(name: string) {
  const fp = path.join(DOCS_DIR, name)
  if (!existsSync(fp)) return []
  const raw = await readFile(fp, 'utf-8')
  try { return JSON.parse(raw) } catch { return [] }
}

async function writeJsonFile(name: string, data: unknown) {
  if (!existsSync(DOCS_DIR)) await mkdir(DOCS_DIR, { recursive: true })
  await writeFile(path.join(DOCS_DIR, name), JSON.stringify(data, null, 2))
}

// GET: read exhibitions or books_citations
export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file')
  if (!file || !['exhibitions.json', 'books_citations.json'].includes(file)) {
    return NextResponse.json({ error: 'file must be exhibitions.json or books_citations.json' }, { status: 400 })
  }
  const data = await readJsonFile(file)
  return NextResponse.json(data)
}

// PUT: update the entire file
export async function PUT(req: NextRequest) {
  const { file, data } = await req.json()
  if (!file || !['exhibitions.json', 'books_citations.json'].includes(file)) {
    return NextResponse.json({ error: 'invalid file' }, { status: 400 })
  }
  await writeJsonFile(file, data)
  return NextResponse.json({ ok: true })
}
