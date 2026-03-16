import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...', { dbPath })

  const cryptoBeings = await prisma.project.upsert({
    where: { slug: 'cryptographic_beings' },
    update: {},
    create: {
      name: 'Cryptographic Beings',
      slug: 'cryptographic_beings',
      color: '#569cd6',
      status: 'active',
      description: 'Bio-hybrid art installation using Marimo moss balls as biological binary storage elements. Encodes and decodes data through photosynthesis-driven buoyancy changes in 18 transparent tubes.',
    },
  })

  const bioMusic = await prisma.project.upsert({
    where: { slug: 'bio_electronic_music' },
    update: {},
    create: {
      name: 'Bio Electronic Music',
      slug: 'bio_electronic_music',
      color: '#4ec9b0',
      status: 'active',
      description: 'Exploring the intersection of biological signals and electronic music production. Captures electrical signals from living fungal mycelia and transforms them into musical parameters.',
    },
  })

  const ultrasound = await prisma.project.upsert({
    where: { slug: 'ultrasound_bio_printing' },
    update: {},
    create: {
      name: 'Ultrasound Bio-Printing',
      slug: 'ultrasound_bio_printing',
      color: '#c586c0',
      status: 'placeholder',
      description: '3D printing with engineered bacteria using hyperfocused ultrasound.',
    },
  })

  const grant1 = await prisma.grant.upsert({
    where: { id: 'sample-grant-1' },
    update: {},
    create: {
      id: 'sample-grant-1',
      name: 'Sample Art & Science Grant',
      funder: 'Example Foundation',
      description: 'Placeholder grant — replace with real calls.',
      amount: '€50,000 – €100,000',
      amountMin: 50000,
      amountMax: 100000,
      currency: 'EUR',
      deadline: new Date('2026-06-15'),
      duration: '12 months',
      tags: 'art,science,bio-art',
      eligibility: 'Open to all EU researchers.',
    },
  })

  const grant2 = await prisma.grant.upsert({
    where: { id: 'sample-grant-2' },
    update: {},
    create: {
      id: 'sample-grant-2',
      name: 'Sample Biotech Innovation Grant',
      funder: 'Example Agency',
      description: 'Placeholder grant — replace with real calls.',
      amount: '€200,000 – €500,000',
      amountMin: 200000,
      amountMax: 500000,
      currency: 'EUR',
      deadline: new Date('2026-09-01'),
      duration: '24 months',
      tags: 'biotech,innovation,3d-printing',
      eligibility: 'Research institutions and startups.',
    },
  })

  await prisma.projectGrant.upsert({
    where: { projectId_grantId: { projectId: cryptoBeings.id, grantId: grant1.id } },
    update: {},
    create: { projectId: cryptoBeings.id, grantId: grant1.id, status: 'identified', matchScore: 3, relevance: 'Bio-art installation fits the art & science scope.' },
  })

  await prisma.projectGrant.upsert({
    where: { projectId_grantId: { projectId: bioMusic.id, grantId: grant1.id } },
    update: {},
    create: { projectId: bioMusic.id, grantId: grant1.id, status: 'identified', matchScore: 4, relevance: 'Bio-electronic music fits art & science blend.' },
  })

  await prisma.projectGrant.upsert({
    where: { projectId_grantId: { projectId: ultrasound.id, grantId: grant2.id } },
    update: {},
    create: { projectId: ultrasound.id, grantId: grant2.id, status: 'identified', matchScore: 2, relevance: 'Biotech innovation scope is relevant for bio-printing.' },
  })

  console.log('Done! Seeded 3 projects and 2 grants.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
