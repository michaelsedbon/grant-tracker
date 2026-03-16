import { NextResponse } from 'next/server'
import { exec } from 'child_process'

export async function POST(req: Request): Promise<Response> {
  const { path } = await req.json()
  if (!path) return NextResponse.json({ error: 'Path required' }, { status: 400 })

  try {
    await new Promise<void>((resolve, reject) => {
      exec(`open -R "${path}"`, (error) => {
        if (error) reject(error)
        else resolve()
      })
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
