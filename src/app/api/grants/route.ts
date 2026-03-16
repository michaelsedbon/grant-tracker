import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url)
    const tag = searchParams.get('tag')
    const funder = searchParams.get('funder')
    const archived = searchParams.get('archived')

    const where: Record<string, unknown> = {}
    if (tag) where.tags = { contains: tag }
    if (funder) where.funder = { contains: funder }
    // Default: hide archived grants unless ?archived=true or ?archived=all
    if (archived === 'true') {
      where.archived = true
    } else if (archived === 'all') {
      // show all
    } else {
      where.archived = false
    }

    const grants = await prisma.grant.findMany({
      where,
      orderBy: { deadline: 'asc' },
      include: {
        projectLinks: { include: { project: { select: { id: true, name: true, color: true } } } },
        _count: { select: { projectLinks: true, documents: true } }
      }
    })
    return NextResponse.json(grants)
  } catch (error) {
    console.error('GET /api/grants error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    if (body.deadline) body.deadline = new Date(body.deadline)
    const grant = await prisma.grant.create({ data: body })
    return NextResponse.json(grant, { status: 201 })
  } catch (error) {
    console.error('POST /api/grants error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(): Promise<Response> {
  try {
    await prisma.projectGrant.deleteMany({})
    const result = await prisma.grant.deleteMany({})
    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error('DELETE /api/grants error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
