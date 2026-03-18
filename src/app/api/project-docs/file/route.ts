import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DOCS_DIR = path.join(process.cwd(), 'project-docs')

// GET: serve a file for download
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  const name = req.nextUrl.searchParams.get('name')
  if (!slug || !name) return NextResponse.json({ error: 'slug and name required' }, { status: 400 })

  const safe = slug.replace(/[^a-zA-Z0-9_\-]/g, '')
  const fp = path.join(DOCS_DIR, safe, name)
  if (!existsSync(fp)) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const buffer = await readFile(fp)
  const ext = path.extname(name).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.txt': 'text/plain', '.md': 'text/markdown',
  }

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeMap[ext] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${name}"`,
    },
  })
}
