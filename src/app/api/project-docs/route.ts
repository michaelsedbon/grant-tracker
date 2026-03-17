import { NextRequest, NextResponse } from 'next/server'
import { readdir, mkdir, writeFile, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DOCS_DIR = path.join(process.cwd(), 'project-docs')

function projectDir(slug: string) {
  const safe = slug.replace(/[^a-zA-Z0-9_\-]/g, '')
  return path.join(DOCS_DIR, safe)
}

// GET: list all docs for a project
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const dir = projectDir(slug)
  if (!existsSync(dir)) return NextResponse.json({ files: [] })

  const entries = await readdir(dir)
  const files = await Promise.all(
    entries.filter(f => !f.startsWith('.')).map(async (f) => {
      const fp = path.join(dir, f)
      const s = await stat(fp)
      return {
        name: f,
        size: s.size,
        modified: s.mtime.toISOString(),
        path: `/api/project-docs/file?slug=${slug}&name=${encodeURIComponent(f)}`
      }
    })
  )
  return NextResponse.json({ files: files.sort((a, b) => a.name.localeCompare(b.name)) })
}

// POST: upload a file
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const slug = formData.get('slug') as string
  const file = formData.get('file') as File

  if (!slug || !file) return NextResponse.json({ error: 'slug and file required' }, { status: 400 })

  const dir = projectDir(slug)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = file.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_')
  await writeFile(path.join(dir, filename), buffer)

  return NextResponse.json({ ok: true, filename })
}

// DELETE: remove a file
export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  const name = req.nextUrl.searchParams.get('name')
  if (!slug || !name) return NextResponse.json({ error: 'slug and name required' }, { status: 400 })

  const fp = path.join(projectDir(slug), name)
  if (existsSync(fp)) await unlink(fp)
  return NextResponse.json({ ok: true })
}
