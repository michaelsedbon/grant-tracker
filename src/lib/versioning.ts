import { prisma } from './prisma'

export async function trackVersion(
  entityType: string,
  entityId: string,
  field: string,
  content: string
) {
  await prisma.contentVersion.create({
    data: { entityType, entityId, field, content },
  })
}
