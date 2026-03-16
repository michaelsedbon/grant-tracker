import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const body = await req.json()
  const count = await prisma.deliverable.count({ where: { projectId: body.projectId } })
  const item = await prisma.deliverable.create({ data: { ...body, sortOrder: count } })
  return NextResponse.json(item, { status: 201 })
}
