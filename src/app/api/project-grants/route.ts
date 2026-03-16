import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const body = await req.json()
  const pg = await prisma.projectGrant.create({ data: body })
  return NextResponse.json(pg, { status: 201 })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const grantId = searchParams.get('grantId')

  const where: Record<string, unknown> = {}
  if (projectId) where.projectId = projectId
  if (grantId) where.grantId = grantId

  const links = await prisma.projectGrant.findMany({
    where,
    include: { project: true, grant: true, _count: { select: { checklistItems: true, budgetItems: true } } }
  })
  return NextResponse.json(links)
}
