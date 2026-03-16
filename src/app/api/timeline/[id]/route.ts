import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  if (body.startDate) body.startDate = new Date(body.startDate)
  if (body.endDate) body.endDate = new Date(body.endDate)
  const item = await prisma.timelineItem.update({ where: { id }, data: body })
  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.timelineItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
