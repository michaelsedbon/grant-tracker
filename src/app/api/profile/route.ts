import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const PROFILE_PATH = path.join(process.cwd(), 'data', 'profile.json')

async function ensureDir() {
  const dir = path.dirname(PROFILE_PATH)
  await fs.mkdir(dir, { recursive: true })
}

async function readProfile() {
  try {
    const raw = await fs.readFile(PROFILE_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function GET() {
  const profile = await readProfile()
  if (!profile) return NextResponse.json({}, { status: 200 })
  return NextResponse.json(profile)
}

export async function PUT(req: Request) {
  await ensureDir()
  const body = await req.json()
  const existing = (await readProfile()) || {}
  const merged = { ...existing, ...body, updatedAt: new Date().toISOString() }
  await fs.writeFile(PROFILE_PATH, JSON.stringify(merged, null, 2))
  return NextResponse.json(merged)
}
