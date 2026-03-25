import { NextResponse } from 'next/server'
import { readFile, access } from 'fs/promises'
import { join, resolve } from 'path'

const PAPERS_DIR = resolve(process.cwd(), '../../papers')

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
): Promise<Response> {
  try {
    const { filename } = await params
    const decoded = decodeURIComponent(filename)

    // Security: prevent directory traversal
    if (decoded.includes('..')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const filePath = resolve(PAPERS_DIR, decoded)

    // Ensure resolved path stays within PAPERS_DIR
    if (!filePath.startsWith(PAPERS_DIR)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }
    await access(filePath) // throws if not exists
    const buffer = await readFile(filePath)

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${decoded}"`,
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    console.error('GET /api/papers/[filename] error:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
