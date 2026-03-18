import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)
const APP_DIR = process.cwd()

export async function GET() {
  try {
    // Check if git repo exists
    try {
      await execAsync('git rev-parse --is-inside-work-tree', { cwd: APP_DIR })
    } catch {
      return NextResponse.json({ error: 'No git repository found' }, { status: 404 })
    }

    // Get git log (last 50 commits)
    const { stdout: logRaw } = await execAsync(
      `git log --pretty=format:'{"hash":"%H","shortHash":"%h","author":"%an","date":"%aI","subject":"%s"}' -50`,
      { cwd: APP_DIR }
    )
    const commits = logRaw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line) } catch { return null }
      })
      .filter(Boolean)

    // Get current branch
    let branch = 'unknown'
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: APP_DIR })
      branch = stdout.trim() || 'detached'
    } catch { /* ignore */ }

    // Get local HEAD hash
    let localHead = ''
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: APP_DIR })
      localHead = stdout.trim()
    } catch { /* ignore */ }

    // Fetch remote to compare
    let remoteHead = ''
    let behind = 0
    let ahead = 0
    try {
      await execAsync('git fetch origin --quiet 2>/dev/null', { cwd: APP_DIR, timeout: 10000 })
      const { stdout: remoteRef } = await execAsync(`git rev-parse origin/${branch}`, { cwd: APP_DIR })
      remoteHead = remoteRef.trim()

      const { stdout: counts } = await execAsync(
        `git rev-list --left-right --count HEAD...origin/${branch}`,
        { cwd: APP_DIR }
      )
      const [a, b] = counts.trim().split(/\s+/).map(Number)
      ahead = a || 0
      behind = b || 0
    } catch { /* ignore — network unavailable */ }

    // Modified files count
    let modifiedFiles = 0
    try {
      const { stdout } = await execAsync('git status --porcelain | wc -l', { cwd: APP_DIR })
      modifiedFiles = parseInt(stdout.trim()) || 0
    } catch { /* ignore */ }

    // Remote URL
    let remoteUrl = ''
    try {
      const { stdout } = await execAsync('git remote get-url origin', { cwd: APP_DIR })
      remoteUrl = stdout.trim()
    } catch { /* ignore */ }

    // Sync status
    let syncStatus: 'up_to_date' | 'behind' | 'ahead' | 'diverged' | 'unknown' = 'unknown'
    if (localHead && remoteHead) {
      if (localHead === remoteHead && modifiedFiles === 0) syncStatus = 'up_to_date'
      else if (behind > 0 && ahead > 0) syncStatus = 'diverged'
      else if (behind > 0) syncStatus = 'behind'
      else if (ahead > 0 || modifiedFiles > 0) syncStatus = 'ahead'
      else syncStatus = 'up_to_date'
    }

    return NextResponse.json({
      branch,
      localHead: localHead.slice(0, 7),
      remoteHead: remoteHead.slice(0, 7),
      syncStatus,
      ahead,
      behind,
      modifiedFiles,
      remoteUrl,
      commits,
      totalCommits: commits.length
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Git info failed: ${message}` }, { status: 500 })
  }
}
