import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { trackVersion } from '@/lib/versioning'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const grant = await prisma.grant.findUnique({
    where: { id },
    include: { projectLinks: { include: { project: true } }, documents: true }
  })
  if (!grant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(grant)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  if (body.deadline) body.deadline = new Date(body.deadline)

  const existing = await prisma.grant.findUnique({ where: { id } })
  if (existing) {
    for (const field of ['description', 'eligibility', 'notes']) {
      if (body[field] !== undefined && body[field] !== (existing as Record<string, unknown>)[field]) {
        await trackVersion('grant', id, field, (existing as Record<string, unknown>)[field] as string)
      }
    }
  }

  const grant = await prisma.grant.update({ where: { id }, data: body })
  return NextResponse.json(grant)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.grant.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
