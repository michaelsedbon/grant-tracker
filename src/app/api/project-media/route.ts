import { NextRequest, NextResponse } from 'next/server'
import { readdir, mkdir, writeFile, readFile, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DOCS_DIR = path.join(process.cwd(), 'project-docs')

const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.mp4', '.webm',
  '.pdf'
])

function mediaType(ext: string): 'image' | 'video' | 'document' {
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return 'image'
  if (['.mp4', '.webm'].includes(ext)) return 'video'
  return 'document'
}

function mediaDir(slug: string) {
  const safe = slug.replace(/[^a-zA-Z0-9_\-]/g, '')
  return path.join(DOCS_DIR, safe, 'media')
}

// ── JSON helpers ──
interface MediaLink { id: string; url: string; title: string; type: string; addedAt: string }
interface MediaCredit { id: string; name: string; role: string; url: string }

async function readJson<T>(fp: string, fallback: T): Promise<T> {
  if (!existsSync(fp)) return fallback
  const raw = await readFile(fp, 'utf-8')
  try { return JSON.parse(raw) as T } catch { return fallback }
}

async function writeJson(fp: string, data: unknown) {
  const dir = path.dirname(fp)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(fp, JSON.stringify(data, null, 2))
}

function linksFile(slug: string) { return path.join(mediaDir(slug), '_links.json') }
function creditsFile(slug: string) { return path.join(mediaDir(slug), '_credits.json') }

// GET: list all media files, links, and credits for a project (or _profile)
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const dir = mediaDir(slug)

  // Files
  let files: { name: string; size: number; modified: string; type: string; url: string }[] = []
  if (existsSync(dir)) {
    const entries = await readdir(dir)
    files = await Promise.all(
      entries.filter(f => !f.startsWith('.') && !f.startsWith('_')).map(async (f) => {
        const fp = path.join(dir, f)
        const s = await stat(fp)
        const ext = path.extname(f).toLowerCase()
        return {
          name: f,
          size: s.size,
          modified: s.mtime.toISOString(),
          type: mediaType(ext),
          url: `/api/project-docs/file?slug=${slug}&name=${encodeURIComponent('media/' + f)}`
        }
      })
    )
  }

  // Links & Credits
  const links = await readJson<MediaLink[]>(linksFile(slug), [])
  const credits = await readJson<MediaCredit[]>(creditsFile(slug), [])

  return NextResponse.json({
    files: files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()),
    links,
    credits
  })
}

// POST: upload a media file, add a link, or add a credit
export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'add-link') {
    const body = await req.json()
    const { slug, url, title, type } = body
    if (!slug || !url) return NextResponse.json({ error: 'slug and url required' }, { status: 400 })
    const links = await readJson<MediaLink[]>(linksFile(slug), [])
    const entry: MediaLink = { id: crypto.randomUUID(), url, title: title || url, type: type || 'other', addedAt: new Date().toISOString() }
    links.unshift(entry)
    await writeJson(linksFile(slug), links)
    return NextResponse.json({ ok: true, entry })
  }

  if (action === 'add-credit') {
    const body = await req.json()
    const { slug, name, role, url } = body
    if (!slug || !name) return NextResponse.json({ error: 'slug and name required' }, { status: 400 })
    const credits = await readJson<MediaCredit[]>(creditsFile(slug), [])
    const entry: MediaCredit = { id: crypto.randomUUID(), name, role: role || '', url: url || '' }
    credits.push(entry)
    await writeJson(creditsFile(slug), credits)
    return NextResponse.json({ ok: true, entry })
  }

  // Default: file upload
  const formData = await req.formData()
  const slug = formData.get('slug') as string
  const file = formData.get('file') as File

  if (!slug || !file) return NextResponse.json({ error: 'slug and file required' }, { status: 400 })

  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: `File type ${ext} not allowed` }, { status: 400 })
  }

  const dir = mediaDir(slug)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = file.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_')
  await writeFile(path.join(dir, filename), buffer)

  return NextResponse.json({ ok: true, filename })
}

// DELETE: remove a media file, link, or credit
export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  const action = req.nextUrl.searchParams.get('action')

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  if (action === 'delete-link') {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const links = await readJson<MediaLink[]>(linksFile(slug), [])
    await writeJson(linksFile(slug), links.filter(l => l.id !== id))
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete-credit') {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const credits = await readJson<MediaCredit[]>(creditsFile(slug), [])
    await writeJson(creditsFile(slug), credits.filter(c => c.id !== id))
    return NextResponse.json({ ok: true })
  }

  // Default: delete file
  const name = req.nextUrl.searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const fp = path.join(mediaDir(slug), name)
  if (existsSync(fp)) await unlink(fp)
  return NextResponse.json({ ok: true })
}
