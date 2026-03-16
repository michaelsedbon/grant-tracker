import { NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'

// Path to the papers folder (relative to workspace root)
const PAPERS_DIR = join(process.cwd(), '../../papers')
const PAPERS_TXT_DIR = join(process.cwd(), '../../papers_txt')

interface PaperNode {
  name: string
  type: 'file' | 'folder'
  path: string          // relative path from papers root
  sizeBytes?: number
  subjects?: string
  url?: string
  summary?: string
  children?: PaperNode[]
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

    if (fileMatch) {
      const txtFile = fileMatch[1]
      const pdfFile = txtFile.replace('.txt', '.pdf')
      const lines = section.trim().split('\n')
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

async function buildTree(dirPath: string, relativePath: string, index: Map<string, { subjects: string; url: string; summary: string }>): Promise<PaperNode[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const nodes: PaperNode[] = []

  for (const entry of entries) {
    const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name
    const fullPath = join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const children = await buildTree(fullPath, entryRelPath, index)
      if (children.length > 0) {
        nodes.push({ name: entry.name, type: 'folder', path: entryRelPath, children })
      }
    } else if (entry.name.endsWith('.pdf')) {
      const fileInfo = await stat(fullPath)
      const meta = index.get(entry.name) || { subjects: '', url: '', summary: '' }
      nodes.push({
        name: entry.name,
        type: 'file',
        path: entryRelPath,
        sizeBytes: fileInfo.size,
        subjects: meta.subjects,
        url: meta.url,
        summary: meta.summary
      })
    }
  }

  // Sort: folders first, then files alphabetically
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return nodes
}

export async function GET(): Promise<Response> {
  try {
    const index = parseIndex()
    const tree = await buildTree(PAPERS_DIR, '', index)
    return NextResponse.json(tree)
  } catch (error) {
    console.error('GET /api/papers error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
