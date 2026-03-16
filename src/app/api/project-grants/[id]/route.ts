import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { trackVersion } from '@/lib/versioning'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const existing = await prisma.projectGrant.findUnique({ where: { id } })
  if (existing) {
    for (const field of ['relevance', 'notes']) {
      if (body[field] !== undefined && body[field] !== (existing as Record<string, unknown>)[field]) {
        await trackVersion('project_grant', id, field, (existing as Record<string, unknown>)[field] as string)
      }
    }
  }

  const pg = await prisma.projectGrant.update({ where: { id }, data: body })
  return NextResponse.json(pg)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.projectGrant.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pg = await prisma.projectGrant.findUnique({
    where: { id },
    include: {
      project: true,
      grant: { include: { documents: true } },
      checklistItems: { orderBy: { sortOrder: 'asc' }, include: { documents: true } },
      budgetItems: { orderBy: { category: 'asc' } }
    }
  })
  if (!pg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(pg)
}
