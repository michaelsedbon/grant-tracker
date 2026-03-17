import { NextRequest, NextResponse } from 'next/server'
import { readdir, mkdir, writeFile, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DOCS_DIR = path.join(process.cwd(), 'grant-docs')

function grantDir(grantId: string) {
  const safe = grantId.replace(/[^a-zA-Z0-9_\-]/g, '')
  return path.join(DOCS_DIR, safe)
}

// GET: list all docs for a grant (from DB)
export async function GET(req: NextRequest) {
  const grantId = req.nextUrl.searchParams.get('grantId')
  if (!grantId) return NextResponse.json({ error: 'grantId required' }, { status: 400 })

  const docs = await prisma.document.findMany({
    where: { grantId },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ documents: docs })
}

// POST: upload a file and create a Document record
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const grantId = formData.get('grantId') as string
  const file = formData.get('file') as File
  const label = (formData.get('label') as string) || ''

  if (!grantId || !file) return NextResponse.json({ error: 'grantId and file required' }, { status: 400 })

  const dir = grantDir(grantId)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = file.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_')
  const filePath = path.join(dir, filename)
  await writeFile(filePath, buffer)

  const ext = path.extname(filename).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.txt': 'text/plain', '.md': 'text/markdown',
  }

  const doc = await prisma.document.create({
    data: {
      grantId,
      filename,
      originalName: file.name,
      label: label || file.name,
      filePath,
      mimeType: mimeMap[ext] || 'application/octet-stream',
      sizeBytes: buffer.length,
    }
  })

  return NextResponse.json({ ok: true, document: doc })
}

// DELETE: remove a file and its Document record
export async function DELETE(req: NextRequest) {
  const docId = req.nextUrl.searchParams.get('id')
  if (!docId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const doc = await prisma.document.findUnique({ where: { id: docId } })
  if (doc) {
    if (existsSync(doc.filePath)) await unlink(doc.filePath)
    await prisma.document.delete({ where: { id: docId } })
  }
  return NextResponse.json({ ok: true })
}
