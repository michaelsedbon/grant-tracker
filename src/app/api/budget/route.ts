import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const body = await req.json()
  const item = await prisma.budgetItem.create({ data: body })
  return NextResponse.json(item, { status: 201 })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const projectGrantId = searchParams.get('projectGrantId')

  const where: Record<string, unknown> = {}
  if (projectId) where.projectId = projectId
  if (projectGrantId) where.projectGrantId = projectGrantId

  const items = await prisma.budgetItem.findMany({
    where,
    orderBy: { category: 'asc' }
  })
  return NextResponse.json(items)
}
