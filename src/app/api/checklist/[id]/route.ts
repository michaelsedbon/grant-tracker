import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { trackVersion } from '@/lib/versioning'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const existing = await prisma.checklistItem.findUnique({ where: { id } })
  if (existing && body.content !== undefined && body.content !== existing.content) {
    await trackVersion('checklist_item', id, 'content', existing.content)
  }

  const item = await prisma.checklistItem.update({ where: { id }, data: body })
  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.checklistItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
