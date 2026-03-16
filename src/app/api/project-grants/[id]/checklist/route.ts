import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Checklist items for a ProjectGrant
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const items = await prisma.checklistItem.findMany({
    where: { projectGrantId: id },
    orderBy: { sortOrder: 'asc' },
    include: { documents: true }
  })
  return NextResponse.json(items)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const count = await prisma.checklistItem.count({ where: { projectGrantId: id } })
  const item = await prisma.checklistItem.create({
    data: { ...body, projectGrantId: id, sortOrder: count }
  })
  return NextResponse.json(item, { status: 201 })
}
