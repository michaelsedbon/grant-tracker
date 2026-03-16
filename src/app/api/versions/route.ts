import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entityType')
  const entityId = searchParams.get('entityId')
  const field = searchParams.get('field')

  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 })
  }

  const where: Record<string, unknown> = { entityType, entityId }
  if (field) where.field = field

  const versions = await prisma.contentVersion.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50
  })
  return NextResponse.json(versions)
}
