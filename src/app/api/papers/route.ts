import { NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'

// Path to the papers folder (relative to workspace root)
const PAPERS_DIR = join(process.cwd(), '../../papers')
const PAPERS_TXT_DIR = join(process.cwd(), '../../papers_txt')

interface PaperInfo {
  filename: string
  title: string
  sizeBytes: number
  subjects: string
  url: string
  summary: string
}

function parseIndex(): Map<string, { subjects: string; url: string; summary: string }> {
  const indexPath = join(PAPERS_TXT_DIR, 'INDEX.md')
  const map = new Map()
  if (!existsSync(indexPath)) return map

  const content = readFileSync(indexPath, 'utf-8')
  const sections = content.split(/^---$/m).filter(s => s.trim())

  for (const section of sections) {
    const fileMatch = section.match(/\*\*File:\*\*\s*`([^`]+)`/)
    const subjectsMatch = section.match(/\*\*Subjects:\*\*\s*(.+)/)
    const urlMatch = section.match(/\*\*URL:\*\*\s*(\S+)/)
    const titleMatch = section.match(/^##\s+(.+)/m)

    if (fileMatch) {
      const txtFile = fileMatch[1]
      const pdfFile = txtFile.replace('.txt', '.pdf')
      const lines = section.trim().split('\n')
      // Summary is the last paragraph block
      const summaryLines = lines.filter(l => !l.startsWith('#') && !l.startsWith('**') && l.trim().length > 0)
      map.set(pdfFile, {
        subjects: subjectsMatch?.[1] || '',
        url: urlMatch?.[1] || '',
        summary: summaryLines.join(' ').trim().slice(0, 300) + (summaryLines.join(' ').length > 300 ? '...' : '')
      })
    }
  }
  return map
}

export async function GET(): Promise<Response> {
  try {
    const files = await readdir(PAPERS_DIR)
    const pdfs = files.filter(f => f.endsWith('.pdf'))
    const index = parseIndex()

    const papers: PaperInfo[] = await Promise.all(
      pdfs.map(async (filename) => {
        const filePath = join(PAPERS_DIR, filename)
        const fileInfo = await stat(filePath)
        const meta = index.get(filename) || { subjects: '', url: '', summary: '' }
        const title = filename
          .replace('.pdf', '')
          .replace(/_/g, ' ')
        return {
          filename,
          title,
          sizeBytes: fileInfo.size,
          subjects: meta.subjects,
          url: meta.url,
          summary: meta.summary
        }
      })
    )

    papers.sort((a, b) => a.title.localeCompare(b.title))
    return NextResponse.json(papers)
  } catch (error) {
    console.error('GET /api/papers error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
