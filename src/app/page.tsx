'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FolderOpen, Plus, Search, ClipboardList, Target, DollarSign, Calendar,
  Microscope, BookOpen, Users, FileText, BarChart3, Award, ChevronRight,
  X, ExternalLink, Star, Trash2, Edit3, Check, FolderOpenDot, Save,
  Archive, Eye, EyeOff, Unlink, Tag, Undo2, Redo2, Keyboard, User,
  GraduationCap, Medal, Briefcase, Lightbulb, Wrench
} from 'lucide-react'
import dynamic from 'next/dynamic'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })
const MarkdownPreview = dynamic(() => import('@uiw/react-md-editor').then(mod => mod.default.Markdown), { ssr: false })

/* ─── Action History for Undo/Redo ───── */
interface UndoAction {
  label: string
  undo: () => Promise<void>
  redo: () => Promise<void>
}

let undoStack: UndoAction[] = []
let redoStack: UndoAction[] = []

function pushAction(action: UndoAction) {
  undoStack.push(action)
  if (undoStack.length > 30) undoStack.shift()
  redoStack = [] // clear redo on new action
}

/* ─── Types ─────────────────────────────── */
interface Project {
  id: string; name: string; slug: string; description: string;
  color: string; status: string; stateOfArt: string; impact: string;
  createdAt: string; updatedAt: string;
  budgetItems: BudgetItem[]; timelineItems: TimelineItem[];
  bibEntries: BibEntry[]; partners: Partner[];
  deliverables: Deliverable[]; grantLinks: ProjectGrantLink[];
  _count?: { grantLinks: number };
}

interface Grant {
  id: string; name: string; funder: string; description: string;
  amount: string; amountMin: number | null; amountMax: number | null;
  currency: string; deadline: string | null; duration: string;
  url: string; portalUrl: string; faqUrl: string;
  eligibility: string; trlLevel: string; tags: string;
  notes: string; archived: boolean; seen: boolean; createdAt: string; updatedAt: string;
  documents?: Document[];
  projectLinks?: { project: { id: string; name: string; color: string } }[];
}

interface ContextMenuState {
  x: number; y: number; pgId: string; grantId: string; grantName: string;
}

interface PaperNode {
  name: string; type: 'file' | 'folder'; path: string;
  sizeBytes?: number; subjects?: string; url?: string; summary?: string;
  children?: PaperNode[];
}

interface ProjectGrantLink {
  id: string; projectId: string; grantId: string;
  status: string; matchScore: number; relevance: string; notes: string;
  grant: Grant;
  _count?: { checklistItems: number };
}

interface BudgetItem {
  id: string; category: string; label: string; amount: number; notes: string;
  projectId?: string; projectGrantId?: string;
}

interface TimelineItem {
  id: string; label: string; startDate: string | null;
  endDate: string | null; type: string; notes: string; sortOrder: number;
}

interface BibEntry {
  id: string; title: string; authors: string; year: number | null;
  doi: string; journal: string; notes: string;
}

interface Partner {
  id: string; name: string; institution: string; expertise: string;
  email: string; website: string; status: string; notes: string;
}

interface Deliverable {
  id: string; title: string; workPackage: string; type: string;
  description: string; dueMonth: number | null; sortOrder: number;
}

interface Document {
  id: string; filename: string; originalName: string; label: string;
  filePath: string; mimeType: string;
}

/* ─── Constants ────────────────────────── */
const TABS = [
  { id: 'overview', label: 'Overview', icon: ClipboardList },
  { id: 'stateOfArt', label: 'State of the Art', icon: Microscope },
  { id: 'bibliography', label: 'Bibliography', icon: BookOpen },
  { id: 'partners', label: 'Partners', icon: Users },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'deliverables', label: 'Deliverables', icon: FileText },
  { id: 'impact', label: 'Impact', icon: BarChart3 },
  { id: 'relevance', label: 'Relevance', icon: Target },
  { id: 'grants', label: 'Grants', icon: Award },
]

const STATUS_OPTIONS = ['identified', 'preparing', 'submitted', 'under_review', 'accepted', 'rejected']
const PARTNER_STATUS = ['to_contact', 'contacted', 'confirmed', 'declined']
const BUDGET_CATEGORIES = ['personnel', 'equipment', 'travel', 'consumables', 'subcontracting', 'other']

/* ─── Helpers ──────────────────────────── */
function deadlineClass(deadline: string | null): string {
  if (!deadline) return ''
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (days < 14) return 'deadline-urgent'
  if (days < 60) return 'deadline-soon'
  return 'deadline-ok'
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(d: string | null): string {
  if (!d) return ''
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'Passed'
  if (days === 0) return 'Today'
  return `${days}d`
}

/* ─── Main Component ───────────────────── */
export default function GrantTracker() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projectData, setProjectData] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedGrant, setSelectedGrant] = useState<ProjectGrantLink | null>(null)
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [globalGrantsMode, setGlobalGrantsMode] = useState(false)
  const [profileMode, setProfileMode] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show toast notification
  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(data)
    if (!selectedProjectId && data.length > 0) setSelectedProjectId(data[0].id)
    setLoading(false)
  }, [selectedProjectId])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  // Fetch selected project detail
  const fetchProjectDetail = useCallback(async () => {
    if (!selectedProjectId) return
    const res = await fetch(`/api/projects/${selectedProjectId}`)
    const data = await res.json()
    setProjectData(data)
  }, [selectedProjectId])

  useEffect(() => { fetchProjectDetail() }, [fetchProjectDetail])

  // Project update helper
  const updateProject = async (field: string, value: string) => {
    if (!projectData) return
    await fetch(`/api/projects/${projectData.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    })
    fetchProjectDetail()
  }

  // Add project
  const addProject = async () => {
    if (!newProjectName.trim()) return
    const slug = newProjectName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    await fetch('/api/projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProjectName, slug, status: 'active' })
    })
    setNewProjectName('')
    setShowAddProject(false)
    fetchProjects()
  }

  // Close context menu on click anywhere
  useEffect(() => {
    const handler = () => setContextMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      // Cmd+Z = undo
      if (mod && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        const action = undoStack.pop()
        if (action) {
          action.undo().then(() => { redoStack.push(action); fetchProjectDetail(); showToast(`↩ Undo: ${action.label}`) })
        } else showToast('Nothing to undo')
      }
      // Cmd+Shift+Z = redo
      if (mod && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        const action = redoStack.pop()
        if (action) {
          action.redo().then(() => { undoStack.push(action); fetchProjectDetail(); showToast(`↪ Redo: ${action.label}`) })
        } else showToast('Nothing to redo')
      }
      // Escape = close context menu / right panel / shortcuts
      if (e.key === 'Escape') {
        if (contextMenu) setContextMenu(null)
        else if (showShortcuts) setShowShortcuts(false)
        else if (selectedGrant) setSelectedGrant(null)
      }
      // Cmd+N = add project
      if (mod && e.key === 'n') { e.preventDefault(); setShowAddProject(true) }
      // Cmd+G = all grants
      if (mod && e.key === 'g') { e.preventDefault(); setGlobalGrantsMode(true); setSelectedGrant(null) }
      // ? = show shortcuts
      if (e.key === '?' && !mod) setShowShortcuts(s => !s)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [contextMenu, selectedGrant, showShortcuts])

  // Context menu actions
  const handleContextMenu = (e: React.MouseEvent, pg: ProjectGrantLink) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, pgId: pg.id, grantId: pg.grantId, grantName: pg.grant.name })
  }

  const removeFromProject = async (pgId: string) => {
    const link = projectData?.grantLinks?.find(g => g.id === pgId)
    const grantName = link?.grant.name || 'grant'
    const projectId = projectData?.id || ''
    const grantId = link?.grantId || ''
    const status = link?.status || 'identified'
    const matchScore = link?.matchScore || 0
    await fetch(`/api/project-grants/${pgId}`, { method: 'DELETE' })
    pushAction({
      label: `Removed "${grantName}" from project`,
      undo: async () => {
        await fetch('/api/project-grants', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, grantId, status, matchScore })
        })
      },
      redo: async () => {
        // re-delete: find latest link
        const res = await fetch(`/api/project-grants?projectId=${projectId}&grantId=${grantId}`)
        const links = await res.json()
        if (links.length > 0) await fetch(`/api/project-grants/${links[0].id}`, { method: 'DELETE' })
      }
    })
    setContextMenu(null)
    showToast(`Removed "${grantName}" — Cmd+Z to undo`)
    fetchProjectDetail()
  }

  const archiveGrant = async (grantId: string) => {
    const grantName = contextMenu?.grantName || 'grant'
    await fetch(`/api/grants/${grantId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true })
    })
    pushAction({
      label: `Archived "${grantName}"`,
      undo: async () => {
        await fetch(`/api/grants/${grantId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived: false })
        })
      },
      redo: async () => {
        await fetch(`/api/grants/${grantId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived: true })
        })
      }
    })
    setContextMenu(null)
    showToast(`Archived "${grantName}" — Cmd+Z to undo`)
    fetchProjectDetail()
  }

  if (loading) return <div className="app-layout" style={{ alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--text-muted)' }}>Loading…</p></div>

  return (
    <div className="app-layout">
      {/* ─── Left Panel ──────────────── */}
      <div className="left-panel">
        <div className="panel-header">
          <h2><FolderOpen size={16} /> Navigation</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {/* My Profile */}
          <div className={`project-item ${profileMode ? 'active' : ''}`}
            onClick={() => { setProfileMode(true); setGlobalGrantsMode(false); setSelectedGrant(null) }}>
            <span className="project-dot" style={{ backgroundColor: 'var(--accent-orange)' }} />
            <span className="project-name">My Profile</span>
            <User size={12} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
          </div>
          {/* All Grants global view */}
          <div className={`project-item ${!profileMode && globalGrantsMode ? 'active' : ''}`}
            onClick={() => { setGlobalGrantsMode(true); setProfileMode(false); setSelectedGrant(null) }}>
            <span className="project-dot" style={{ backgroundColor: 'var(--accent-yellow)' }} />
            <span className="project-name">All Grants</span>
            <Tag size={12} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 16px' }} />
          {projects.map(p => (
            <div key={p.id}
              className={`project-item ${!globalGrantsMode && !profileMode && p.id === selectedProjectId ? 'active' : ''}`}
              onClick={() => { setSelectedProjectId(p.id); setGlobalGrantsMode(false); setProfileMode(false); setSelectedGrant(null) }}>
              <span className="project-dot" style={{ backgroundColor: p.color }} />
              <span className="project-name">{p.name}</span>
              <span className="project-status">{p.status === 'placeholder' ? '○' : ''}</span>
            </div>
          ))}
        </div>
        {showAddProject ? (
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
            <input className="input" placeholder="Project name" value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addProject()} autoFocus />
            <button className="btn btn-primary btn-sm" onClick={addProject}><Check size={14} /></button>
            <button className="btn btn-sm" onClick={() => setShowAddProject(false)}><X size={14} /></button>
          </div>
        ) : (
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-sm" style={{ width: '100%' }} onClick={() => setShowAddProject(true)}>
              <Plus size={14} /> Add Project
            </button>
          </div>
        )}
      </div>

      {/* ─── Main Panel ──────────────── */}
      <div className="main-panel">
        {profileMode ? (
          <>
            <div className="tab-bar">
              <button className="tab active"><User size={14} /> Applicant Profile</button>
            </div>
            <div className="tab-content">
              <ProfileView />
            </div>
          </>
        ) : globalGrantsMode ? (
          <>
            <div className="tab-bar">
              <button className="tab active"><Award size={14} /> All Grants</button>
            </div>
            <div className="tab-content">
              <AllGrantsView />
            </div>
          </>
        ) : (
          <>
            <div className="tab-bar">
              {TABS.map(t => (
                <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.id)}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
            <div className="tab-content">
              {projectData && activeTab === 'overview' && <OverviewTab project={projectData} onUpdate={updateProject} onRefresh={fetchProjectDetail} />}
              {projectData && activeTab === 'stateOfArt' && <MarkdownTab project={projectData} field="stateOfArt" label="State of the Art" onUpdate={updateProject} />}
              {projectData && activeTab === 'impact' && <MarkdownTab project={projectData} field="impact" label="Impact & Dissemination" onUpdate={updateProject} />}
              {projectData && activeTab === 'bibliography' && <BibliographyTab project={projectData} onRefresh={fetchProjectDetail} />}
              {projectData && activeTab === 'partners' && <PartnersTab project={projectData} onRefresh={fetchProjectDetail} />}
              {projectData && activeTab === 'budget' && <BudgetTab project={projectData} onRefresh={fetchProjectDetail} />}
              {projectData && activeTab === 'timeline' && <TimelineTab project={projectData} onRefresh={fetchProjectDetail} />}
              {projectData && activeTab === 'deliverables' && <DeliverablesTab project={projectData} onRefresh={fetchProjectDetail} />}
              {projectData && activeTab === 'relevance' && <RelevanceTab project={projectData} onRefresh={fetchProjectDetail} />}
              {projectData && activeTab === 'grants' && <GrantsTab project={projectData} onSelectGrant={setSelectedGrant} selectedGrant={selectedGrant} onRefresh={fetchProjectDetail} onContextMenu={handleContextMenu} />}
            </div>
          </>
        )}
      </div>

      {/* ─── Right Panel (Grant Detail) ── */}
      {selectedGrant && (
        <div className="right-panel">
          <div className="panel-header">
            <h2><Award size={16} /> {selectedGrant.grant.name}</h2>
            <button className="btn-icon" onClick={() => setSelectedGrant(null)}><X size={16} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <GrantDetailPanel pg={selectedGrant} onRefresh={() => { fetchProjectDetail() }} />
          </div>
        </div>
      )}

      {/* ─── Context Menu ──────────────── */}
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <div className="context-menu-header">{contextMenu.grantName}</div>
          <button className="context-menu-item" onClick={() => removeFromProject(contextMenu.pgId)}>
            <Unlink size={13} /> Remove from project
          </button>
          <button className="context-menu-item" onClick={() => archiveGrant(contextMenu.grantId)}>
            <Archive size={13} /> Archive grant
          </button>
          <button className="context-menu-item" onClick={async () => {
            await fetch(`/api/grants/${contextMenu.grantId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seen: false }) })
            fetchProjectDetail()
            setContextMenu(null)
            showToast('Marked as new')
          }}>
            <Star size={13} /> Mark as new
          </button>
          <div className="context-menu-divider" />
          <button className="context-menu-item" onClick={() => {
            const pg = projectData?.grantLinks?.find(g => g.id === contextMenu.pgId)
            if (pg) setSelectedGrant(pg)
            setContextMenu(null)
          }}>
            <Eye size={13} /> View details
          </button>
        </div>
      )}

      {/* ─── Toast ──────────────────────── */}
      {toast && (
        <div className="toast-bar" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}

      {/* ─── Shortcuts Panel ───────────── */}
      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-panel" onClick={e => e.stopPropagation()}>
            <div className="shortcuts-header">
              <Keyboard size={16} /> Keyboard Shortcuts
              <button className="btn-icon" onClick={() => setShowShortcuts(false)}><X size={14} /></button>
            </div>
            <div className="shortcuts-list">
              <div className="shortcut-row"><kbd>⌘Z</kbd><span>Undo last action</span></div>
              <div className="shortcut-row"><kbd>⌘⇧Z</kbd><span>Redo last action</span></div>
              <div className="shortcut-row"><kbd>⌘N</kbd><span>New project</span></div>
              <div className="shortcut-row"><kbd>⌘G</kbd><span>All Grants view</span></div>
              <div className="shortcut-row"><kbd>Esc</kbd><span>Close panel / menu</span></div>
              <div className="shortcut-row"><kbd>?</kbd><span>Toggle this panel</span></div>
              <div className="shortcut-row"><kbd>Right-click</kbd><span>Context menu on grant rows</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Tab: Overview ────────────────────── */
function OverviewTab({ project, onUpdate, onRefresh }: { project: Project; onUpdate: (f: string, v: string) => void; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(project.description)

  useEffect(() => { setDesc(project.description) }, [project.description])

  const totalGrants = project.grantLinks?.length || 0
  const upcoming = project.grantLinks?.filter(g => g.grant.deadline && new Date(g.grant.deadline) > new Date()).length || 0

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{totalGrants}</div>
          <div className="stat-label">Grants Found</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{upcoming}</div>
          <div className="stat-label">Upcoming Deadlines</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{project.partners?.length || 0}</div>
          <div className="stat-label">Partners</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {project.budgetItems?.reduce((s, b) => s + b.amount, 0).toLocaleString('en', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) || '€0'}
          </div>
          <div className="stat-label">Budget (Template)</div>
        </div>
      </div>
      <div className="section-card">
        <div className="section-title" style={{ justifyContent: 'space-between' }}>
          <span><ClipboardList size={14} /> Project Description</span>
          {!editing && <button className="btn btn-sm" onClick={() => setEditing(true)}><Edit3 size={12} /> Edit</button>}
        </div>
        {editing ? (
          <div>
            <MDEditor value={desc} onChange={(v) => setDesc(v || '')} data-color-mode="dark" height={300} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => { onUpdate('description', desc); setEditing(false) }}><Save size={12} /> Save</button>
              <button className="btn btn-sm" onClick={() => { setDesc(project.description); setEditing(false) }}>Cancel</button>
            </div>
          </div>
        ) : (
          project.description ? (
            <div data-color-mode="dark"><MarkdownPreview source={project.description} style={{ background: 'transparent', fontSize: 13 }} /></div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No description yet. Click Edit to add one.</div>
          )
        )}
      </div>
    </>
  )
}

/* ─── Tab: Markdown (SoA / Impact) ───── */
function MarkdownTab({ project, field, label, onUpdate }: { project: Project; field: string; label: string; onUpdate: (f: string, v: string) => void }) {
  const value = (project as unknown as Record<string, unknown>)[field] as string || ''
  const [text, setText] = useState(value)
  const [saved, setSaved] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => { setText(value) }, [value])

  const save = () => {
    onUpdate(field, text)
    setSaved(true)
    setEditing(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>{label}</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {editing && !saved && <span style={{ fontSize: 11, color: 'var(--accent-orange)' }}>Unsaved changes</span>}
          {editing ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={save}><Save size={12} /> Save</button>
              <button className="btn btn-sm" onClick={() => { setText(value); setSaved(true); setEditing(false) }}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-sm" onClick={() => setEditing(true)}><Edit3 size={12} /> Edit</button>
          )}
        </div>
      </div>
      {editing ? (
        <MDEditor value={text} onChange={(v) => { setText(v || ''); setSaved(false) }} data-color-mode="dark" height={500} />
      ) : (
        value ? (
          <div data-color-mode="dark"><MarkdownPreview source={value} style={{ background: 'transparent', fontSize: 13 }} /></div>
        ) : (
          <div className="empty-state"><FileText size={32} /><p>No content yet. Click Edit to add {label.toLowerCase()}.</p></div>
        )
      )}
    </div>
  )
}

/* ─── Tab: Bibliography ──────────────── */
function BibliographyTab({ project, onRefresh }: { project: Project; onRefresh: () => void }) {
  const [showPicker, setShowPicker] = useState(false)
  const [papers, setPapers] = useState<PaperNode[]>([])
  const [selectedPaper, setSelectedPaper] = useState<string | null>(null)
  const [pdfPanelWidth, setPdfPanelWidth] = useState(50)
  const [pickerSearch, setPickerSearch] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const resizing = useRef(false)

  const loadPapers = () => {
    fetch('/api/papers').then(r => r.json()).then(setPapers).catch(() => {})
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizing.current) return
      const pct = ((window.innerWidth - e.clientX) / window.innerWidth) * 100
      setPdfPanelWidth(Math.max(25, Math.min(75, pct)))
    }
    const onUp = () => { resizing.current = false }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPicker) setShowPicker(false)
        else if (selectedPaper) setSelectedPaper(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showPicker, selectedPaper])

  const deleteEntry = async (id: string) => {
    await fetch(`/api/bibliography/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  const addPaperRef = async (node: PaperNode) => {
    const title = node.name.replace('.pdf', '').replace(/_/g, ' ')
    await fetch('/api/bibliography', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id, title, notes: `file:${node.path}`, journal: node.subjects || '' })
    })
    onRefresh()
  }

  const isAdded = (filename: string) => {
    const title = filename.replace('.pdf', '').replace(/_/g, ' ')
    return project.bibEntries?.some(b => b.title === title) || false
  }

  const getPdfPath = (entry: { notes: string }) => {
    if (entry.notes?.startsWith('file:')) return entry.notes.slice(5)
    return null
  }

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path); else next.add(path)
      return next
    })
  }

  const flattenTree = (nodes: PaperNode[]): PaperNode[] => {
    const result: PaperNode[] = []
    for (const n of nodes) {
      if (n.type === 'file') result.push(n)
      if (n.children) result.push(...flattenTree(n.children))
    }
    return result
  }

  const renderNode = (node: PaperNode, depth: number = 0): React.ReactNode => {
    if (node.type === 'folder') {
      const isOpen = expandedFolders.has(node.path)
      return (
        <div key={node.path}>
          <div className="picker-row" style={{ paddingLeft: 12 + depth * 16 }} onClick={() => toggleFolder(node.path)}>
            <FolderOpenDot size={14} style={{ color: 'var(--accent-yellow, #dcdcaa)', flexShrink: 0 }} />
            <span style={{ fontWeight: 500, fontSize: 12 }}>{node.name}</span>
            <ChevronRight size={12} style={{ marginLeft: 'auto', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
          </div>
          {isOpen && node.children?.map(c => renderNode(c, depth + 1))}
        </div>
      )
    }
    const added = isAdded(node.name)
    return (
      <div key={node.path} className={`picker-row ${added ? 'added' : ''}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={() => { if (!added) addPaperRef(node) }}>
        <FileText size={14} style={{ flexShrink: 0, color: added ? 'var(--text-muted)' : 'var(--accent-blue)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name.replace('.pdf', '').replace(/_/g, ' ')}
          </div>
          {node.subjects && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{node.subjects}</div>}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
          {added ? <Check size={12} style={{ color: 'var(--accent-green, #4ec9b0)' }} /> : `${((node.sizeBytes || 0) / 1024 / 1024).toFixed(1)} MB`}
        </span>
      </div>
    )
  }

  const getFilteredNodes = (): PaperNode[] => {
    if (!pickerSearch.trim()) return papers
    return flattenTree(papers).filter(p =>
      p.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      (p.subjects || '').toLowerCase().includes(pickerSearch.toLowerCase())
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Main: project references table */}
      <div style={{ flex: selectedPaper ? `0 0 ${100 - pdfPanelWidth}%` : '1', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={15} /> Project References ({project.bibEntries?.length || 0})
          </h3>
          <button className="btn btn-sm" onClick={() => { setShowPicker(true); loadPapers(); setPickerSearch('') }}>
            <Plus size={14} /> Add Reference
          </button>
        </div>

        {!project.bibEntries?.length ? (
          <div className="empty-state"><BookOpen size={32} /><p>No references yet. Click Add Reference to browse papers.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {project.bibEntries.map(b => {
              const pdfPath = getPdfPath(b)
              return (
                <div key={b.id} className={`paper-row ${selectedPaper === pdfPath ? 'selected' : ''}`}
                  onClick={() => { if (pdfPath) setSelectedPaper(selectedPaper === pdfPath ? null : pdfPath) }}
                  style={{ cursor: pdfPath ? 'pointer' : 'default' }}>
                  <FileText size={14} style={{ flexShrink: 0, color: 'var(--accent-blue)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {b.authors && `${b.authors} `}{b.year ? `(${b.year}) ` : ''}{b.journal || ''}
                    </div>
                  </div>
                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); deleteEntry(b.id) }}><Trash2 size={13} /></button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Resize handle + PDF viewer side panel */}
      {selectedPaper && (
        <>
          <div className="pdf-resize-handle" onMouseDown={() => { resizing.current = true }} />
          <div className="pdf-panel" style={{ width: `${pdfPanelWidth}%` }}>
            <div className="pdf-panel-header">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedPaper.replace('.pdf', '').replace(/_/g, ' ')}
              </span>
              <button className="btn-icon" onClick={() => setSelectedPaper(null)}><X size={14} /></button>
            </div>
            <iframe src={`/api/papers/${encodeURIComponent(selectedPaper)}`}
              style={{ width: '100%', flex: 1, border: 'none', background: '#fff' }} title="PDF Viewer" />
          </div>
        </>
      )}

      {/* Paper Picker Modal */}
      {showPicker && (
        <div className="shortcuts-overlay" onClick={() => setShowPicker(false)}>
          <div className="picker-modal" onClick={e => e.stopPropagation()}>
            <div className="picker-header">
              <FolderOpen size={16} />
              <span>Select a Paper</span>
              <button className="btn-icon" style={{ marginLeft: 'auto' }} onClick={() => setShowPicker(false)}><X size={14} /></button>
            </div>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
              <input className="input" placeholder="Search papers..." value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)} autoFocus />
            </div>
            <div className="picker-body">
              {getFilteredNodes().map(n => renderNode(n))}
              {getFilteredNodes().length === 0 && (
                <div className="empty-state" style={{ padding: 24 }}><FileText size={24} /><p>No papers found</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function PartnersTab({ project, onRefresh }: { project: Project; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', institution: '', expertise: '', email: '', website: '', status: 'to_contact', notes: '' })

  const addPartner = async () => {
    await fetch('/api/partners', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, projectId: project.id })
    })
    setForm({ name: '', institution: '', expertise: '', email: '', website: '', status: 'to_contact', notes: '' })
    setAdding(false)
    onRefresh()
  }

  const updatePartner = async (id: string, data: Record<string, unknown>) => {
    await fetch(`/api/partners/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    onRefresh()
  }

  const deletePartner = async (id: string) => {
    await fetch(`/api/partners/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>🤝 Potential Partners ({project.partners?.length || 0})</h3>
        <button className="btn btn-sm" onClick={() => setAdding(!adding)}><Plus size={14} /> Add Partner</button>
      </div>
      {adding && (
        <div className="section-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="field-group"><label className="field-label">Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Institution</label><input className="input" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Expertise</label><input className="input" value={form.expertise} onChange={e => setForm({ ...form, expertise: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Email</label><input className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Website</label><input className="input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Status</label>
              <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {PARTNER_STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={addPartner}>Save</button>
            <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}
      {project.partners?.map(p => (
        <div key={p.id} className="partner-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="partner-name">{p.name}</div>
              <div className="partner-institution">{p.institution}</div>
              {p.expertise && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.expertise}</div>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <select className="select" value={p.status} style={{ fontSize: 11, padding: '2px 6px' }}
                onChange={e => updatePartner(p.id, { status: e.target.value })}>
                {PARTNER_STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <button className="btn-icon" onClick={() => deletePartner(p.id)}><Trash2 size={14} /></button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11 }}>
            {p.email && <a href={`mailto:${p.email}`} className="detail-link">{p.email}</a>}
            {p.website && <a href={p.website} target="_blank" className="detail-link"><ExternalLink size={10} /> website</a>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Tab: Budget ──────────────────────── */
function BudgetTab({ project, onRefresh }: { project: Project; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ category: 'personnel', label: '', amount: '', notes: '' })

  const addItem = async () => {
    await fetch('/api/budget', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) || 0, projectId: project.id })
    })
    setForm({ category: 'personnel', label: '', amount: '', notes: '' })
    setAdding(false)
    onRefresh()
  }

  const deleteItem = async (id: string) => {
    await fetch(`/api/budget/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  const total = project.budgetItems?.reduce((s, b) => s + b.amount, 0) || 0
  const byCategory = BUDGET_CATEGORIES.map(cat => ({
    cat, items: project.budgetItems?.filter(b => b.category === cat) || [],
    total: project.budgetItems?.filter(b => b.category === cat).reduce((s, b) => s + b.amount, 0) || 0
  })).filter(c => c.items.length > 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}><DollarSign size={15} /> Project Budget Template</h3>
        <button className="btn btn-sm" onClick={() => setAdding(!adding)}><Plus size={14} /> Add Item</button>
      </div>
      {adding && (
        <div className="section-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 8 }}>
            <div className="field-group"><label className="field-label">Category</label>
              <select className="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field-group"><label className="field-label">Label</label><input className="input" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Amount (€)</label><input className="input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={addItem}>Save</button>
            <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}
      <table className="budget-table">
        <thead><tr><th>Category</th><th>Item</th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr></thead>
        <tbody>
          {byCategory.map(({ cat, items, total: catTotal }) => (
            items.map((item, i) => (
              <tr key={item.id}>
                {i === 0 && <td rowSpan={items.length} style={{ fontWeight: 600, textTransform: 'capitalize' }}>{cat}</td>}
                <td>{item.label}</td>
                <td style={{ textAlign: 'right' }}>€{item.amount.toLocaleString()}</td>
                <td><button className="btn-icon" onClick={() => deleteItem(item.id)}><Trash2 size={12} /></button></td>
              </tr>
            ))
          ))}
          <tr><td colSpan={2} style={{ fontWeight: 700 }}>Total</td><td className="budget-total" style={{ textAlign: 'right' }}>€{total.toLocaleString()}</td><td></td></tr>
        </tbody>
      </table>
    </div>
  )
}

/* ─── Tab: Timeline ────────────────────── */
function TimelineTab({ project, onRefresh }: { project: Project; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: '', type: 'milestone', startDate: '', endDate: '', notes: '' })

  const addItem = async () => {
    await fetch('/api/timeline', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, projectId: project.id, startDate: form.startDate || null, endDate: form.endDate || null })
    })
    setForm({ label: '', type: 'milestone', startDate: '', endDate: '', notes: '' })
    setAdding(false)
    onRefresh()
  }

  const deleteItem = async (id: string) => {
    await fetch(`/api/timeline/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>📅 Timeline & Milestones</h3>
        <button className="btn btn-sm" onClick={() => setAdding(!adding)}><Plus size={14} /> Add</button>
      </div>
      {adding && (
        <div className="section-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
            <div className="field-group"><label className="field-label">Label</label><input className="input" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Type</label>
              <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="milestone">Milestone</option><option value="phase">Phase</option><option value="deliverable">Deliverable</option>
              </select>
            </div>
            <div className="field-group"><label className="field-label">Start</label><input className="input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">End</label><input className="input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={addItem}>Save</button>
            <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}
      {project.timelineItems?.map(t => (
        <div key={t.id} className="section-card" style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}><Target size={14} /></span>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(t.startDate)}{t.endDate ? ` → ${formatDate(t.endDate)}` : ''}</div>
            </div>
          </div>
          <button className="btn-icon" onClick={() => deleteItem(t.id)}><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  )
}

/* ─── Tab: Deliverables ────────────────── */
function DeliverablesTab({ project, onRefresh }: { project: Project; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', workPackage: '', type: 'deliverable', description: '', dueMonth: '' })

  const addItem = async () => {
    await fetch('/api/deliverables', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, dueMonth: form.dueMonth ? parseInt(form.dueMonth) : null, projectId: project.id })
    })
    setForm({ title: '', workPackage: '', type: 'deliverable', description: '', dueMonth: '' })
    setAdding(false)
    onRefresh()
  }

  const deleteItem = async (id: string) => {
    await fetch(`/api/deliverables/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>📝 Deliverables & Work Packages</h3>
        <button className="btn btn-sm" onClick={() => setAdding(!adding)}><Plus size={14} /> Add</button>
      </div>
      {adding && (
        <div className="section-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
            <div className="field-group"><label className="field-label">Title</label><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Work Package</label><input className="input" value={form.workPackage} onChange={e => setForm({ ...form, workPackage: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Type</label>
              <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="deliverable">Deliverable</option><option value="milestone">Milestone</option>
              </select>
            </div>
            <div className="field-group"><label className="field-label">Due (Month)</label><input className="input" type="number" value={form.dueMonth} onChange={e => setForm({ ...form, dueMonth: e.target.value })} /></div>
          </div>
          <div className="field-group"><label className="field-label">Description</label><textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={addItem}>Save</button>
            <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}
      {project.deliverables?.map(d => (
        <div key={d.id} className="section-card" style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{d.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {d.workPackage && `WP: ${d.workPackage} · `}{d.type}{d.dueMonth ? ` · M${d.dueMonth}` : ''}
              </div>
              {d.description && <div style={{ fontSize: 12, marginTop: 4 }}>{d.description}</div>}
            </div>
            <button className="btn-icon" onClick={() => deleteItem(d.id)}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Tab: Relevance ───────────────────── */
function RelevanceTab({ project, onRefresh }: { project: Project; onRefresh: () => void }) {
  const updateRelevance = async (pgId: string, relevance: string) => {
    await fetch(`/api/project-grants/${pgId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relevance })
    })
    onRefresh()
  }

  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}><Target size={15} /> Relevance to Open Calls</h3>
      {!project.grantLinks?.length ? (
        <div className="empty-state"><Target size={32} /><p>No grants linked yet. Go to the Grants tab to add some.</p></div>
      ) : (
        project.grantLinks.map(pg => (
          <RelevanceCard key={pg.id} pg={pg} onSave={(text) => updateRelevance(pg.id, text)} />
        ))
      )}
    </div>
  )
}

function RelevanceCard({ pg, onSave }: { pg: ProjectGrantLink; onSave: (text: string) => void }) {
  const [text, setText] = useState(pg.relevance)
  const [dirty, setDirty] = useState(false)

  return (
    <div className="section-card">
      <div className="section-title">{pg.grant.name} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>— {pg.grant.funder}</span></div>
      <MDEditor value={text} onChange={(v) => { setText(v || ''); setDirty(true) }} data-color-mode="dark" height={150} />
      {dirty && <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => { onSave(text); setDirty(false) }}><Save size={12} /> Save</button>}
    </div>
  )
}

/* ─── Tab: Grants ──────────────────────── */
function GrantsTab({ project, onSelectGrant, selectedGrant, onRefresh, onContextMenu }: {
  project: Project; onSelectGrant: (g: ProjectGrantLink | null) => void;
  selectedGrant: ProjectGrantLink | null; onRefresh: () => void;
  onContextMenu: (e: React.MouseEvent, pg: ProjectGrantLink) => void;
}) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', funder: '', amount: '', deadline: '', tags: '', url: '' })

  const addGrant = async () => {
    const res = await fetch('/api/grants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, deadline: form.deadline || null })
    })
    const grant = await res.json()
    await fetch('/api/project-grants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id, grantId: grant.id, status: 'identified' })
    })
    setForm({ name: '', funder: '', amount: '', deadline: '', tags: '', url: '' })
    setAdding(false)
    onRefresh()
  }

  const updateStatus = async (pgId: string, status: string) => {
    await fetch(`/api/project-grants/${pgId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}><Award size={15} /> Applicable Grants ({project.grantLinks?.length || 0})</h3>
        <button className="btn btn-sm" onClick={() => setAdding(!adding)}><Plus size={14} /> Add Grant</button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Right-click a grant to remove from project or archive it.</p>
      {adding && (
        <div className="section-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
            <div className="field-group"><label className="field-label">Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Funder</label><input className="input" value={form.funder} onChange={e => setForm({ ...form, funder: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Amount</label><input className="input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Deadline</label><input className="input" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
            <div className="field-group"><label className="field-label">Tags</label><input className="input" placeholder="comma-separated" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">URL</label><input className="input" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={addGrant}>Save</button>
            <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div className="grant-header">
          <span>Grant Name</span><span>Funder</span><span>Deadline</span><span>Amount</span><span>Status</span><span>Match</span>
        </div>
        {project.grantLinks?.map(pg => (
          <div key={pg.id} className={`grant-row ${selectedGrant?.id === pg.id ? 'selected' : ''} ${!pg.grant.seen ? 'grant-new' : ''}`}
            onClick={async () => {
              if (!pg.grant.seen) {
                await fetch(`/api/grants/${pg.grant.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seen: true }) })
                onRefresh()
              }
              onSelectGrant(pg)
            }}
            onContextMenu={(e) => onContextMenu(e, pg)}>
            <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              {pg.grant.name}
              {!pg.grant.seen && <span className="new-badge">NEW</span>}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>{pg.grant.funder}</span>
            <span className={deadlineClass(pg.grant.deadline)}>
              {formatDate(pg.grant.deadline)} <span style={{ fontSize: 10, opacity: 0.7 }}>{daysUntil(pg.grant.deadline)}</span>
            </span>
            <span>{pg.grant.amount || '—'}</span>
            <select className="select" value={pg.status} style={{ fontSize: 11, padding: '2px 6px' }}
              onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); updateStatus(pg.id, e.target.value) }}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <MatchStars score={pg.matchScore} pgId={pg.id} onRefresh={onRefresh} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── All Grants View ──────────────────── */
function AllGrantsView() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchGrants = useCallback(async () => {
    const params = new URLSearchParams()
    params.set('archived', showArchived ? 'all' : 'false')
    if (tagFilter) params.set('tag', tagFilter)
    const res = await fetch(`/api/grants?${params}`)
    setGrants(await res.json())
    setLoading(false)
  }, [showArchived, tagFilter])

  useEffect(() => { fetchGrants() }, [fetchGrants])

  const toggleArchive = async (id: string, archived: boolean) => {
    await fetch(`/api/grants/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: !archived })
    })
    fetchGrants()
  }

  // Collect all tags
  const allTags = Array.from(new Set(grants.flatMap(g => g.tags ? g.tags.split(',').map(t => t.trim()).filter(Boolean) : [])))

  if (loading) return <div className="empty-state"><p>Loading grants…</p></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}><Target size={15} /> All Grants ({grants.length})</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className={`btn btn-sm ${showArchived ? 'btn-primary' : ''}`}
            onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? <Eye size={12} /> : <EyeOff size={12} />}
            {showArchived ? 'Showing all' : 'Hide archived'}
          </button>
        </div>
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className={`badge ${!tagFilter ? 'badge-identified' : ''}`}
            style={{ cursor: 'pointer', border: 'none' }}
            onClick={() => setTagFilter(null)}>All</button>
          {allTags.map(t => (
            <button key={t} className={`badge ${tagFilter === t ? 'badge-identified' : ''}`}
              style={{ cursor: 'pointer', border: 'none', opacity: tagFilter && tagFilter !== t ? 0.5 : 1 }}
              onClick={() => setTagFilter(tagFilter === t ? null : t)}>{t}</button>
          ))}
        </div>
      )}

      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div className="grant-header" style={{ gridTemplateColumns: '2fr 1fr 120px 100px 1.5fr 80px' }}>
          <span>Grant Name</span><span>Funder</span><span>Deadline</span><span>Amount</span><span>Projects</span><span></span>
        </div>
        {grants.map(g => (
          <div key={g.id} className={`grant-row ${g.archived ? 'archived-row' : ''} ${!g.seen ? 'grant-new' : ''}`}
            style={{ gridTemplateColumns: '2fr 1fr 120px 100px 1.5fr 80px' }}>
            <span style={{ fontWeight: 500, opacity: g.archived ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              {g.name}
              {!g.seen && <span className="new-badge">NEW</span>}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>{g.funder}</span>
            <span className={deadlineClass(g.deadline)}>
              {formatDate(g.deadline)} <span style={{ fontSize: 10, opacity: 0.7 }}>{daysUntil(g.deadline)}</span>
            </span>
            <span>{g.amount || '—'}</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {g.projectLinks?.map(pl => (
                <span key={pl.project.id} className="badge" style={{
                  background: `${pl.project.color}22`, color: pl.project.color, fontSize: 10
                }}>{pl.project.name}</span>
              ))}
              {(!g.projectLinks || g.projectLinks.length === 0) && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {!g.seen ? (
                <button className="btn-icon" title="Mark as seen" onClick={async () => {
                  await fetch(`/api/grants/${g.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seen: true }) })
                  fetchGrants()
                }}><Eye size={14} /></button>
              ) : (
                <button className="btn-icon" title="Mark as new" onClick={async () => {
                  await fetch(`/api/grants/${g.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seen: false }) })
                  fetchGrants()
                }}><Star size={14} /></button>
              )}
              <button className="btn-icon" title={g.archived ? 'Unarchive' : 'Archive'}
                onClick={() => toggleArchive(g.id, g.archived)}>
                {g.archived ? <Eye size={14} /> : <Archive size={14} />}
              </button>
            </div>
          </div>
        ))}
        {grants.length === 0 && (
          <div className="empty-state" style={{ padding: 24 }}>
            <Award size={32} /><p>No grants yet</p>
          </div>
        )}
      </div>

      {/* Tags summary */}
      {allTags.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
          Tags: {allTags.join(', ')}
        </div>
      )}
    </div>
  )
}

/* ─── Match Stars ──────────────────────── */
function MatchStars({ score, pgId, onRefresh }: { score: number; pgId: string; onRefresh: () => void }) {
  const setScore = async (val: number) => {
    await fetch(`/api/project-grants/${pgId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchScore: val })
    })
    onRefresh()
  }

  return (
    <div className="stars" onClick={e => e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`star ${i <= score ? 'filled' : ''}`} onClick={() => setScore(i)}>★</span>
      ))}
    </div>
  )
}

/* ─── Grant Detail Panel ───────────────── */
function GrantDetailPanel({ pg, onRefresh }: { pg: ProjectGrantLink; onRefresh: () => void }) {
  const g = pg.grant

  return (
    <>
      <div className="detail-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className={`badge badge-${pg.status}`} style={{ textTransform: 'capitalize' }}>{pg.status.replace('_', ' ')}</span>
          <span className={deadlineClass(g.deadline)} style={{ fontSize: 13, fontWeight: 600 }}>
            {g.deadline ? `${daysUntil(g.deadline)} — ${formatDate(g.deadline)}` : 'No deadline'}
          </span>
        </div>
        {g.description && <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{g.description}</p>}
      </div>

      <div className="detail-section">
        <div className="detail-label">Key Info</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Amount:</span> {g.amount || '—'}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Duration:</span> {g.duration || '—'}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Currency:</span> {g.currency}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>TRL:</span> {g.trlLevel || '—'}</div>
        </div>
      </div>

      {g.eligibility && (
        <div className="detail-section">
          <div className="detail-label">Eligibility</div>
          <div className="detail-value">{g.eligibility}</div>
        </div>
      )}

      <div className="detail-section">
        <div className="detail-label">Links</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {g.url && <a href={g.url} target="_blank" className="detail-link"><ExternalLink size={12} /> Call Page</a>}
          {g.portalUrl && <a href={g.portalUrl} target="_blank" className="detail-link"><ExternalLink size={12} /> Submission Portal</a>}
          {g.faqUrl && <a href={g.faqUrl} target="_blank" className="detail-link"><ExternalLink size={12} /> FAQ</a>}
          {!g.url && !g.portalUrl && !g.faqUrl && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No links added yet</span>}
        </div>
      </div>

      {g.tags && (
        <div className="detail-section">
          <div className="detail-label">Tags</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {g.tags.split(',').map(t => (
              <span key={t} className="badge badge-identified" style={{ fontSize: 10 }}>{t.trim()}</span>
            ))}
          </div>
        </div>
      )}

      <div className="detail-section">
        <div className="detail-label">Fit Assessment</div>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>{pg.relevance || <span style={{ color: 'var(--text-muted)' }}>Go to the Relevance tab to write your assessment.</span>}</div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Match:</span>
          <MatchStars score={pg.matchScore} pgId={pg.id} onRefresh={onRefresh} />
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-label">Documents</div>
        {g.documents && g.documents.length > 0 ? (
          g.documents.map(d => (
            <div key={d.id} className="doc-item">
              <FileText size={14} />
              <span className="doc-name">{d.originalName}</span>
              {d.label && <span className="doc-label">{d.label}</span>}
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No documents attached</p>
        )}
        <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => {
          fetch('/api/open-finder', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: process.cwd ? process.cwd() : '.' })
          })
        }}><FolderOpenDot size={12} /> Open in Finder</button>
      </div>
    </>
  )
}

/* ─── Applicant Profile View ────────── */
interface ProfileData {
  name: string; title: string; location: string; website: string; email: string;
  bio: string; education: { degree: string; institution: string; year: string }[];
  awards: { name: string; year: string }[];
  skills: string[]; keyWorks: { title: string; description: string }[];
  researchInterests: string[]; publications: string; notes: string;
}

function ProfileView() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [notes, setNotes] = useState('')
  const [pubs, setPubs] = useState('')

  const fetchProfile = useCallback(async () => {
    const res = await fetch('/api/profile')
    const data = await res.json()
    if (data.name) {
      setProfile(data)
      setBio(data.bio || '')
      setNotes(data.notes || '')
      setPubs(data.publications || '')
    }
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const saveField = async (field: string, value: string) => {
    await fetch('/api/profile', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    })
    fetchProfile()
  }

  if (!profile) return <div className="empty-state"><User size={32} /><p>Loading profile...</p></div>

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={28} style={{ color: 'var(--bg-primary)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{profile.name}</h2>
          <div style={{ fontSize: 14, color: 'var(--accent-blue)', marginBottom: 4 }}>{profile.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
            {profile.location && <span>{profile.location}</span>}
            {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>{profile.website}</a>}
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="section-card">
        <div className="section-title" style={{ justifyContent: 'space-between' }}>
          <span><User size={14} /> Biography</span>
          {!editing ? (
            <button className="btn btn-sm" onClick={() => setEditing(true)}><Edit3 size={12} /> Edit</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => { saveField('bio', bio); setEditing(false) }}><Save size={12} /> Save</button>
              <button className="btn btn-sm" onClick={() => { setBio(profile.bio); setEditing(false) }}>Cancel</button>
            </div>
          )}
        </div>
        {editing ? (
          <MDEditor value={bio} onChange={v => setBio(v || '')} data-color-mode="dark" height={200} />
        ) : (
          <div data-color-mode="dark"><MarkdownPreview source={profile.bio} style={{ background: 'transparent', fontSize: 13 }} /></div>
        )}
      </div>

      {/* Education + Awards side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="section-card">
          <div className="section-title"><GraduationCap size={14} /> Education</div>
          {profile.education?.map((e, i) => (
            <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{e.degree}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.institution}{e.year ? ` (${e.year})` : ''}</div>
            </div>
          ))}
        </div>
        <div className="section-card">
          <div className="section-title"><Medal size={14} /> Awards and Recognition</div>
          {profile.awards?.map((a, i) => (
            <div key={i} style={{ marginBottom: 6, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>{a.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.year}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key Works */}
      <div className="section-card">
        <div className="section-title"><Briefcase size={14} /> Key Works and Projects</div>
        {profile.keyWorks?.map((w, i) => (
          <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < profile.keyWorks.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{w.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{w.description}</div>
          </div>
        ))}
      </div>

      {/* Skills + Research Interests side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="section-card">
          <div className="section-title"><Wrench size={14} /> Skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.skills?.map((s, i) => (
              <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{s}</span>
            ))}
          </div>
        </div>
        <div className="section-card">
          <div className="section-title"><Lightbulb size={14} /> Research Interests</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.researchInterests?.map((r, i) => (
              <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{r}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Publications */}
      <div className="section-card">
        <div className="section-title" style={{ justifyContent: 'space-between' }}>
          <span><BookOpen size={14} /> Publications and Notes</span>
          <button className="btn btn-sm" onClick={() => {
            const newPubs = prompt('Publications (markdown):', pubs)
            if (newPubs !== null) { setPubs(newPubs); saveField('publications', newPubs) }
          }}><Edit3 size={12} /> Edit</button>
        </div>
        {pubs ? (
          <div data-color-mode="dark"><MarkdownPreview source={pubs} style={{ background: 'transparent', fontSize: 13 }} /></div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No publications listed yet.</p>
        )}
      </div>

      {/* Notes */}
      <div className="section-card">
        <div className="section-title" style={{ justifyContent: 'space-between' }}>
          <span><FileText size={14} /> Additional Notes</span>
          <button className="btn btn-sm" onClick={() => {
            const newNotes = prompt('Notes:', notes)
            if (newNotes !== null) { setNotes(newNotes); saveField('notes', newNotes) }
          }}><Edit3 size={12} /> Edit</button>
        </div>
        {notes ? (
          <div data-color-mode="dark"><MarkdownPreview source={notes} style={{ background: 'transparent', fontSize: 13 }} /></div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No additional notes yet.</p>
        )}
      </div>
    </div>
  )
}
