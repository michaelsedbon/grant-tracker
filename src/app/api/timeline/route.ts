import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const body = await req.json()
  if (body.startDate) body.startDate = new Date(body.startDate)
  if (body.endDate) body.endDate = new Date(body.endDate)
  const count = await prisma.timelineItem.count({ where: { projectId: body.projectId } })
  const item = await prisma.timelineItem.create({ data: { ...body, sortOrder: count } })
  return NextResponse.json(item, { status: 201 })
}
