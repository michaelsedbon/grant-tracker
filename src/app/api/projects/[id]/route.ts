import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { trackVersion } from '@/lib/versioning'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      budgetItems: { where: { projectGrantId: null }, orderBy: { category: 'asc' } },
      timelineItems: { orderBy: { sortOrder: 'asc' } },
      bibEntries: { orderBy: { year: 'desc' } },
      partners: { orderBy: { status: 'asc' } },
      deliverables: { orderBy: { sortOrder: 'asc' } },
      grantLinks: {
        include: {
          grant: true,
          _count: { select: { checklistItems: true } }
        }
      }
    }
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // Track version for text fields
  const textFields = ['description', 'stateOfArt', 'impact']
  const existing = await prisma.project.findUnique({ where: { id } })
  if (existing) {
    for (const field of textFields) {
      if (body[field] !== undefined && body[field] !== (existing as Record<string, unknown>)[field]) {
        await trackVersion('project', id, field, (existing as Record<string, unknown>)[field] as string)
      }
    }
  }

  const project = await prisma.project.update({ where: { id }, data: body })
  return NextResponse.json(project)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
