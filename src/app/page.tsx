'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FolderOpen, Plus, Search, ClipboardList, Target, DollarSign, Calendar,
  Microscope, BookOpen, Users, FileText, BarChart3, Award, ChevronRight,
  X, ExternalLink, Star, Trash2, Edit3, Check, FolderOpenDot, Save,
  Archive, Eye, EyeOff, Unlink, Tag, Undo2, Redo2, Keyboard, User,
  GraduationCap, Medal, Briefcase, Lightbulb, Wrench, HelpCircle, ChevronDown, Upload,
  Image, Film, Play, Newspaper, Link2, RefreshCw, HardDrive, Loader
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
  projectLinks?: { id: string; status: string; project: { id: string; name: string; color: string } }[];
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
  { id: 'media', label: 'Media', icon: Image },
  { id: 'press', label: 'Press', icon: Newspaper },
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
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [globalGrantsMode, setGlobalGrantsMode] = useState(false)
  const [profileMode, setProfileMode] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [notesPanelMode, setNotesPanelMode] = useState<'checklist' | 'answers' | null>(null)
  const [rightPanelW, setRightPanelW] = useState(420)
  const [notesPanelW, setNotesPanelW] = useState(550)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelResizing = useRef<{ setter: (w: number) => void; startX: number; startW: number } | null>(null)

  const startPanelResize = (setter: (w: number) => void, currentW: number, e: React.MouseEvent) => {
    e.preventDefault()
    panelResizing.current = { setter, startX: e.clientX, startW: currentW }
    const onMove = (ev: MouseEvent) => {
      if (!panelResizing.current) return
      // Dragging left = increase width (panel is on the right)
      const delta = panelResizing.current.startX - ev.clientX
      const newW = Math.max(280, Math.min(window.innerWidth * 0.6, panelResizing.current.startW + delta))
      panelResizing.current.setter(newW)
    }
    const onUp = () => {
      panelResizing.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

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
        else if (selectedPartner) setSelectedPartner(null)
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
  }, [contextMenu, selectedGrant, selectedPartner, showShortcuts])

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
        {showAddProject && (
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
            <input className="input" placeholder="Project name" value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addProject()} autoFocus />
            <button className="btn btn-primary btn-sm" onClick={addProject}><Check size={14} /></button>
            <button className="btn btn-sm" onClick={() => setShowAddProject(false)}><X size={14} /></button>
          </div>
        )}
        <div style={{ padding: '4px 12px 8px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
          <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => setShowAddProject(true)}>
            <Plus size={14} /> Add Project
          </button>
          <button className="btn btn-sm" onClick={() => setShowHelp(true)} title="Help & Documentation">
            <HelpCircle size={14} />
          </button>
          <button className="btn btn-sm" onClick={() => setShowBackup(true)} title="Backup">
            <HardDrive size={14} />
          </button>
        </div>
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
              <AllGrantsView selectedGrant={selectedGrant} onSelectGrant={setSelectedGrant} projects={projects} />
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
              {projectData && activeTab === 'partners' && <PartnersTab project={projectData} onRefresh={fetchProjectDetail} selectedPartner={selectedPartner} onSelectPartner={setSelectedPartner} />}
              {projectData && activeTab === 'budget' && <BudgetTab project={projectData} onRefresh={fetchProjectDetail} />}
              {projectData && activeTab === 'timeline' && <TimelineTab project={projectData} onRefresh={fetchProjectDetail} />}
              {projectData && activeTab === 'deliverables' && <DeliverablesTab project={projectData} onRefresh={fetchProjectDetail} />}
              {projectData && activeTab === 'relevance' && <RelevanceTab project={projectData} onRefresh={fetchProjectDetail} />}
              {projectData && activeTab === 'media' && <MediaTab slug={projectData.slug} />}
              {projectData && activeTab === 'press' && <PressTab slug={projectData.slug} />}
              {projectData && activeTab === 'grants' && <GrantsTab project={projectData} onSelectGrant={setSelectedGrant} selectedGrant={selectedGrant} onRefresh={fetchProjectDetail} onContextMenu={handleContextMenu} />}
            </div>
          </>
        )}
      </div>

      {/* ─── Right Panel (Grant Detail) ── */}
      {selectedGrant && (
        <div className="right-panel" style={{ width: rightPanelW }}>
          <div
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 10 }}
            onMouseDown={e => startPanelResize(setRightPanelW, rightPanelW, e)}
          />
          <div className="panel-header">
            <h2><Award size={16} /> {selectedGrant.grant.name}</h2>
            <button className="btn-icon" onClick={() => { setSelectedGrant(null); setNotesPanelMode(null) }}><X size={16} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <GrantDetailPanel pg={selectedGrant} onRefresh={() => { fetchProjectDetail() }} notesPanelMode={notesPanelMode} onSetNotesPanelMode={setNotesPanelMode} projects={projects} />
          </div>
        </div>
      )}

      {/* ─── Wide Notes Panel ── */}
      {selectedGrant && notesPanelMode && (
        <div className="notes-panel" style={{ width: notesPanelW }}>
          <div
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 10 }}
            onMouseDown={e => startPanelResize(setNotesPanelW, notesPanelW, e)}
          />
          <div className="panel-header">
            <h2>{notesPanelMode === 'checklist' ? <><ClipboardList size={16} /> Notes &amp; Checklist</> : <><FileText size={16} /> Application Answers</>}</h2>
            <button className="btn-icon" onClick={() => setNotesPanelMode(null)}><X size={16} /></button>
          </div>
          <div className="notes-editor-area">
            <GrantNotesEditor grantId={selectedGrant.grant.id} noteType={notesPanelMode} />
          </div>
        </div>
      )}

      {/* ─── Right Panel (Partner Detail) ── */}
      {selectedPartner && !selectedGrant && (
        <div className="right-panel">
          <div className="panel-header">
            <h2><Users size={16} /> {selectedPartner.name}</h2>
            <button className="btn-icon" onClick={() => setSelectedPartner(null)}><X size={16} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <PartnerDetailPanel partner={selectedPartner} onRefresh={() => { fetchProjectDetail(); }} onUpdate={(updated: Partner) => setSelectedPartner(updated)} />
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

      {/* ─── Help Modal ────────────────── */}
      {showHelp && (
        <div className="shortcuts-overlay" onClick={() => setShowHelp(false)}>
          <div className="shortcuts-panel" style={{ maxWidth: 600, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="shortcuts-header">
              <HelpCircle size={16} /> Help & Documentation
              <button className="btn-icon" onClick={() => setShowHelp(false)}><X size={14} /></button>
            </div>
            <div style={{ padding: 16, fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              <h3 style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>🚀 How This App Works</h3>
              <p style={{ marginBottom: 12 }}>
                Grant Tracker is a project workspace for organising funding opportunities. Each project holds its own description, state of the art, bibliography, partners, budget, timeline, deliverables, and linked grants.
              </p>

              <h3 style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>🤖 Antigravity AI Integration</h3>
              <p style={{ marginBottom: 6 }}>
                This app is designed to work with the <strong>Antigravity AI agent</strong>. The agent can:
              </p>
              <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
                <li><strong>Search for grants</strong> — run <code>/search-grants</code> to find funding opportunities across 30+ databases</li>
                <li><strong>Populate projects</strong> — write descriptions, state of art, and bibliography</li>
                <li><strong>Add partners</strong> — identify potential collaborators</li>
                <li><strong>Manage grants</strong> — add, link, score, and archive grants via API</li>
              </ul>

              <h3 style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>📂 Where Things Live</h3>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.8 }}>
                <div><strong style={{ color: 'var(--accent-blue)' }}>.agents/workflows/</strong></div>
                <div style={{ paddingLeft: 16 }}>search-grants.md — grant search workflow (10 phases)</div>
                <div style={{ marginTop: 8 }}><strong style={{ color: 'var(--accent-blue)' }}>.agents/data/</strong></div>
                <div style={{ paddingLeft: 16 }}>GRANT_SOURCES.md — 30 funding source databases (FR/EU/IL/US)</div>
                <div style={{ paddingLeft: 16 }}>grant-search-runs.log.md — run history log</div>
                <div style={{ marginTop: 8 }}><strong style={{ color: 'var(--accent-blue)' }}>applications/grant-tracker/</strong></div>
                <div style={{ paddingLeft: 16 }}>src/app/page.tsx — main app (this file)</div>
                <div style={{ paddingLeft: 16 }}>prisma/schema.prisma — database schema</div>
                <div style={{ paddingLeft: 16 }}>prisma/dev.db — SQLite database</div>
              </div>

              <h3 style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>🔍 Grant Search Workflow</h3>
              <p style={{ marginBottom: 6 }}>Run <code>/search-grants</code> to start a search. The workflow:</p>
              <ol style={{ paddingLeft: 20, marginBottom: 12 }}>
                <li>Loads your projects, profile, and existing grants</li>
                <li>Checks which source databases are due for a search</li>
                <li>Searches each source + runs broader web searches (EN + FR)</li>
                <li>Filters: deduplicates, checks ≥€5k, deadline &gt;14 days</li>
                <li>Adds new grants with <span className="new-badge" style={{ position: 'relative', animation: 'none' }}>NEW</span> badges</li>
                <li>Links grants to matching projects with relevance scores</li>
                <li>Logs results to the run log</li>
              </ol>

              <h3 style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>💡 Tips</h3>
              <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
                <li>Right-click grants for context menu (archive, mark as new, remove)</li>
                <li>Click partners to see/edit details in the right panel</li>
                <li>Press <kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>?</kbd> for keyboard shortcuts</li>
                <li>Use the <strong>Delete All</strong> button in All Grants to reset during testing</li>
                <li>Grants requiring a collaborator are flagged with ⚠️ in description</li>
              </ul>

              <h3 style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>🌐 API Endpoints</h3>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.8 }}>
                <div>GET  /api/projects — list projects</div>
                <div>GET  /api/grants?archived=all — all grants</div>
                <div>POST /api/grants — create grant</div>
                <div>PUT  /api/grants/:id — update grant</div>
                <div>DELETE /api/grants — delete all grants</div>
                <div>POST /api/project-grants — link grant to project</div>
                <div>GET  /api/profile — user profile</div>
                <div>POST /api/bibliography — add reference</div>
                <div>POST /api/partners — add partner</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Backup Modal ────────────────── */}
      {showBackup && <BackupModal onClose={() => setShowBackup(false)} />}
    </div>
  )
}

/* ─── Tab: Overview ────────────────────── */
function OverviewTab({ project, onUpdate, onRefresh }: { project: Project; onUpdate: (f: string, v: string) => void; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(project.description)
  const [docs, setDocs] = useState<{ name: string; size: number; modified: string; path: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDesc(project.description) }, [project.description])

  const fetchDocs = useCallback(() => {
    fetch(`/api/project-docs?slug=${project.slug}`)
      .then(r => r.json())
      .then(data => setDocs(data.files || []))
      .catch(() => {})
  }, [project.slug])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const uploadFile = async (file: File) => {
    setUploading(true)
    const form = new FormData()
    form.append('slug', project.slug)
    form.append('file', file)
    await fetch('/api/project-docs', { method: 'POST', body: form })
    setUploading(false)
    fetchDocs()
  }

  const deleteDoc = async (name: string) => {
    await fetch(`/api/project-docs?slug=${project.slug}&name=${encodeURIComponent(name)}`, { method: 'DELETE' })
    fetchDocs()
  }

  const fmtSize = (b: number) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`

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

      {/* ─── Project Documents ── */}
      <div className="section-card">
        <div className="section-title" style={{ justifyContent: 'space-between' }}>
          <span><FolderOpenDot size={14} /> Past Proposals &amp; Documentation</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={12} /> Upload
            </button>
            <button className="btn btn-sm" onClick={() => {
              fetch('/api/open-finder', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: `project-docs/${project.slug}` })
              })
            }}>
              <FolderOpenDot size={12} /> Open Folder
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files) Array.from(e.target.files).forEach(f => uploadFile(f))
            e.target.value = ''
          }}
        />
        {uploading && <p style={{ fontSize: 12, color: 'var(--accent-blue)' }}>Uploading…</p>}
        {docs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {docs.map(d => (
              <div key={d.name} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                borderRadius: 6, background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)', fontSize: 12
              }}>
                <FileText size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                <a href={d.path} target="_blank" style={{ flex: 1, color: 'var(--text-primary)', textDecoration: 'none' }}>
                  {d.name}
                </a>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>{fmtSize(d.size)}</span>
                <button
                  onClick={() => deleteDoc(d.name)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                  title="Delete"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
            No documents uploaded yet. Upload past proposals, documentation, presentations, etc.
          </p>
        )}
      </div>
    </>
  )
}

/* ─── Backup Modal ─────────────────────── */
interface BackupInfo { filename: string; size: number; sizeFormatted: string; date: string; age: string }
interface GitCommit { hash: string; shortHash: string; author: string; date: string; subject: string }
interface GitData {
  branch: string; localHead: string; remoteHead: string;
  syncStatus: 'up_to_date' | 'behind' | 'ahead' | 'diverged' | 'unknown';
  ahead: number; behind: number; modifiedFiles: number; remoteUrl: string;
  commits: GitCommit[]; totalCommits: number
}

function BackupModal({ onClose }: { onClose: () => void }) {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [stats, setStats] = useState<{ dbSize: string; docsSize: string; totalSize: string; backupCount: number; backupDir: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<'backups' | 'github'>('backups')
  const [gitData, setGitData] = useState<GitData | null>(null)
  const [gitLoading, setGitLoading] = useState(false)

  const fetchBackups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/backups')
      const data = await res.json()
      setBackups(data.backups || [])
      setStats({ dbSize: data.dbSize, docsSize: data.docsSize, totalSize: data.totalSize, backupCount: data.backupCount, backupDir: data.backupDir || '' })
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const fetchGit = useCallback(async () => {
    setGitLoading(true)
    try {
      const res = await fetch('/api/git')
      if (res.ok) setGitData(await res.json())
    } catch { /* ignore */ }
    setGitLoading(false)
  }, [])

  useEffect(() => { fetchBackups() }, [fetchBackups])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const createBackup = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/backups', { method: 'POST' })
      const data = await res.json()
      if (data.error) alert(data.error)
      else await fetchBackups()
    } catch { alert('Backup failed') }
    setCreating(false)
  }

  const deleteBackup = async (filename: string) => {
    if (!confirm(`Delete backup ${filename}?`)) return
    await fetch(`/api/backups?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' })
    fetchBackups()
  }

  const deleteAll = async () => {
    if (!confirm(`Delete ALL ${backups.length} backups? This cannot be undone.`)) return
    for (const b of backups) {
      await fetch(`/api/backups?filename=${encodeURIComponent(b.filename)}`, { method: 'DELETE' })
    }
    fetchBackups()
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // Commit chart (last 14 days)
  const renderCommitChart = () => {
    if (!gitData) return null
    const days = 14
    const now = new Date()
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (days - 1 - i))
      return { date: d.toISOString().slice(0, 10), count: 0, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
    })
    for (const c of gitData.commits) {
      const key = c.date.slice(0, 10)
      const b = buckets.find(bk => bk.date === key)
      if (b) b.count++
    }
    const maxCount = Math.max(...buckets.map(b => b.count), 1)
    return (
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Commit frequency (last 14 days)</div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 48 }}>
          {buckets.map(b => (
            <div key={b.date} title={`${b.label}: ${b.count} commits`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{
                width: '100%', borderRadius: 2, minHeight: 2,
                height: `${(b.count / maxCount) * 100}%`,
                background: b.count > 0 ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)'
              }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
          {buckets.map((b, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: 'var(--text-muted)' }}>
              {i % 2 === 0 ? b.label.split(' ')[0] : ''}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="media-lightbox" onClick={onClose} style={{ zIndex: 10000 }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12,
        width: 660, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HardDrive size={16} /> Backup & Version Control
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm" onClick={() => { fetchBackups(); if (gitData) fetchGit() }} disabled={loading}>
              <RefreshCw size={12} className={loading || gitLoading ? 'spin' : ''} />
            </button>
            <button className="btn btn-sm" onClick={onClose}><X size={14} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 18px' }}>
          <button onClick={() => setActiveTab('backups')} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer',
            color: activeTab === 'backups' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'backups' ? '2px solid var(--accent-blue)' : '2px solid transparent'
          }}>
            <HardDrive size={12} style={{ marginRight: 4, verticalAlign: -2 }} /> Backups
          </button>
          <button onClick={() => { setActiveTab('github'); if (!gitData && !gitLoading) fetchGit() }} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer',
            color: activeTab === 'github' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'github' ? '2px solid var(--accent-blue)' : '2px solid transparent'
          }}>
            <ExternalLink size={12} style={{ marginRight: 4, verticalAlign: -2 }} /> GitHub
          </button>
        </div>

        {activeTab === 'backups' ? (
          <>
            {/* Stats */}
            {stats && (
              <div style={{ display: 'flex', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <span>DB: <strong style={{ color: 'var(--text-primary)' }}>{stats.dbSize}</strong></span>
                <span>Docs: <strong style={{ color: 'var(--text-primary)' }}>{stats.docsSize}</strong></span>
                <span>Backups: <strong style={{ color: 'var(--text-primary)' }}>{stats.totalSize}</strong> ({stats.backupCount})</span>
                <div style={{ flex: 1 }} />
                {backups.length > 0 && (
                  <button style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 11 }} onClick={deleteAll}>
                    Delete All
                  </button>
                )}
              </div>
            )}

            {/* Backup path */}
            {stats?.backupDir && (
              <div style={{ padding: '6px 18px', fontSize: 10, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontFamily: 'monospace' }}>
                📂 {stats.backupDir}
              </div>
            )}

            {/* Actions */}
            <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
              <button className="btn btn-primary btn-sm" onClick={createBackup} disabled={creating} style={{ width: '100%' }}>
                {creating ? <><Loader size={12} className="spin" /> Creating backup…</> : <><HardDrive size={12} /> Backup Now</>}
              </button>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Creates a tar.gz of database + all project documents & media</p>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 18px' }}>
              {loading && backups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}><Loader size={20} className="spin" /></div>
              ) : backups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12 }}>
                  <HardDrive size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>No backups yet</p>
                </div>
              ) : (
                backups.map((b, i) => (
                  <div key={b.filename} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                    borderBottom: i < backups.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12
                  }}>
                    <Archive size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.filename}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                        <span>{fmtDate(b.date)}</span>
                        <span>{b.age}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{b.sizeFormatted}</span>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                      onClick={() => deleteBackup(b.filename)} title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* GitHub Tab */
          <div style={{ flex: 1, overflow: 'auto' }}>
            {gitLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><Loader size={20} className="spin" /><p style={{ marginTop: 8, fontSize: 12 }}>Loading git data…</p></div>
            ) : !gitData ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>Failed to load git data</div>
            ) : (
              <>
                {/* Status bar */}
                <div style={{ display: 'flex', gap: 16, padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: 11, flexWrap: 'wrap' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Branch</span> <strong>{gitData.branch}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Local</span> <code style={{ fontSize: 10, background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 3 }}>{gitData.localHead}</code></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Remote</span> <code style={{ fontSize: 10, background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 3 }}>{gitData.remoteHead || '—'}</code></div>
                  <div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: gitData.syncStatus === 'up_to_date' ? 'rgba(76,175,80,0.15)' : gitData.syncStatus === 'behind' ? 'rgba(244,67,54,0.15)' : gitData.syncStatus === 'ahead' ? 'rgba(33,150,243,0.15)' : 'rgba(255,152,0,0.15)',
                      color: gitData.syncStatus === 'up_to_date' ? '#4caf50' : gitData.syncStatus === 'behind' ? '#f44336' : gitData.syncStatus === 'ahead' ? '#2196f3' : '#ff9800'
                    }}>
                      {gitData.syncStatus === 'up_to_date' ? '✓ Up to date' :
                       gitData.syncStatus === 'behind' ? `↓ ${gitData.behind} behind` :
                       gitData.syncStatus === 'ahead' ? `↑ ${gitData.ahead} ahead` :
                       gitData.syncStatus === 'diverged' ? `↑${gitData.ahead} ↓${gitData.behind} diverged` : '? Unknown'}
                    </span>
                  </div>
                  {gitData.modifiedFiles > 0 && (
                    <div><span style={{ color: '#f59e0b' }}>{gitData.modifiedFiles} modified files</span></div>
                  )}
                </div>

                {/* Remote URL */}
                {gitData.remoteUrl && (
                  <div style={{ padding: '6px 18px', fontSize: 10, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontFamily: 'monospace' }}>
                    🔗 {gitData.remoteUrl}
                  </div>
                )}

                {/* Chart */}
                {renderCommitChart()}

                {/* Commits */}
                <div style={{ padding: '8px 18px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Recent commits ({gitData.totalCommits})</div>
                  {gitData.commits.slice(0, 20).map(c => (
                    <div key={c.hash} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 11
                    }}>
                      <code style={{ fontSize: 10, color: 'var(--accent-blue)', flexShrink: 0, background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 3 }}>{c.shortHash}</code>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subject}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0 }}>{new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


/* ─── Tab: Media ───────────────────────── */
interface MediaFile { name: string; size: number; modified: string; type: 'image' | 'video' | 'document'; url: string }
interface MediaLink { id: string; url: string; title: string; type: string; addedAt: string }
interface MediaCredit { id: string; name: string; role: string; url: string }

function MediaTab({ slug }: { slug: string }) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [links, setLinks] = useState<MediaLink[]>([])
  const [credits, setCredits] = useState<MediaCredit[]>([])
  const [filter, setFilter] = useState<'all' | 'images' | 'videos' | 'documents' | 'links'>('all')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; type: 'image' | 'video' } | null>(null)
  const [showAddLink, setShowAddLink] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkType, setLinkType] = useState('video')
  const [showAddCredit, setShowAddCredit] = useState(false)
  const [creditName, setCreditName] = useState('')
  const [creditRole, setCreditRole] = useState('')
  const [creditUrl, setCreditUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(() => {
    fetch(`/api/project-media?slug=${slug}`)
      .then(r => r.json())
      .then(data => {
        setFiles(data.files || [])
        setLinks(data.links || [])
        setCredits(data.credits || [])
      })
      .catch(() => {})
  }, [slug])

  useEffect(() => { fetchData() }, [fetchData])

  // ESC to close lightbox
  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightbox])

  const uploadFile = async (file: File) => {
    setUploading(true)
    const form = new FormData()
    form.append('slug', slug)
    form.append('file', file)
    await fetch('/api/project-media', { method: 'POST', body: form })
    setUploading(false)
    fetchData()
  }

  const deleteFile = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/project-media?slug=${slug}&name=${encodeURIComponent(name)}`, { method: 'DELETE' })
    fetchData()
  }

  const addLink = async () => {
    if (!linkUrl.trim()) return
    await fetch('/api/project-media?action=add-link', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, url: linkUrl, title: linkTitle || linkUrl, type: linkType })
    })
    setLinkUrl(''); setLinkTitle(''); setShowAddLink(false)
    fetchData()
  }

  const deleteLink = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/project-media?slug=${slug}&action=delete-link&id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const addCredit = async () => {
    if (!creditName.trim()) return
    await fetch('/api/project-media?action=add-credit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, name: creditName, role: creditRole, url: creditUrl })
    })
    setCreditName(''); setCreditRole(''); setCreditUrl(''); setShowAddCredit(false)
    fetchData()
  }

  const deleteCredit = async (id: string) => {
    await fetch(`/api/project-media?slug=${slug}&action=delete-credit&id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach(f => uploadFile(f))
    }
  }

  const showInFinder = (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    fetch('/api/open-finder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `project-docs/${slug}/media/${name}` })
    })
  }

  const fmtSize = (b: number) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  const filtered = filter === 'links' ? [] : files.filter(f => {
    if (filter === 'images') return f.type === 'image'
    if (filter === 'videos') return f.type === 'video'
    if (filter === 'documents') return f.type === 'document'
    return true
  })
  const showLinks = filter === 'all' || filter === 'links'

  const counts = { all: files.length + links.length, images: files.filter(f => f.type === 'image').length, videos: files.filter(f => f.type === 'video').length, documents: files.filter(f => f.type === 'document').length, links: links.length }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image size={16} /> Media Gallery
        </h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm" onClick={() => setShowAddLink(true)}>
            <Link2 size={12} /> Add Link
          </button>
          <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={12} /> Upload
          </button>
          <button className="btn btn-sm" onClick={() => {
            fetch('/api/open-finder', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: `project-docs/${slug}/media` })
            })
          }}>
            <FolderOpenDot size={12} /> Open Folder
          </button>
        </div>
      </div>

      {/* Add Link inline form */}
      {showAddLink && (
        <div className="section-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label className="field-label">URL</label>
              <input className="input" placeholder="https://youtube.com/watch?v=..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} autoFocus />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="field-label">Title</label>
              <input className="input" placeholder="Video title" value={linkTitle} onChange={e => setLinkTitle(e.target.value)} />
            </div>
            <div style={{ minWidth: 100 }}>
              <label className="field-label">Type</label>
              <select className="select" value={linkType} onChange={e => setLinkType(e.target.value)} style={{ width: '100%' }}>
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button className="btn btn-primary btn-sm" onClick={addLink}><Check size={12} /> Add</button>
            <button className="btn btn-sm" onClick={() => setShowAddLink(false)}><X size={12} /></button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,.pdf"
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files) Array.from(e.target.files).forEach(f => uploadFile(f))
          e.target.value = ''
        }}
      />

      <div className="media-filter-bar">
        {(['all', 'images', 'videos', 'documents', 'links'] as const).map(f => (
          <button key={f} className={`media-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' && <Image size={11} />}
            {f === 'images' && <Image size={11} />}
            {f === 'videos' && <Film size={11} />}
            {f === 'documents' && <FileText size={11} />}
            {f === 'links' && <Link2 size={11} />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ opacity: 0.6 }}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {uploading && <p style={{ fontSize: 12, color: 'var(--accent-blue)', marginBottom: 8 }}>Uploading…</p>}

      <div
        className={`media-dropzone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="media-grid">
          {filtered.length === 0 && !showLinks && (
            <div className="media-empty">
              <Image size={40} />
              <p style={{ fontSize: 13 }}>{files.length === 0 ? 'No media yet' : 'No matching files'}</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Drag & drop files here or click Upload</p>
            </div>
          )}
          {filtered.length === 0 && showLinks && links.length === 0 && (
            <div className="media-empty">
              <Image size={40} />
              <p style={{ fontSize: 13 }}>No media yet</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Drag & drop files, click Upload, or Add Link</p>
            </div>
          )}
          {filtered.map(f => (
            <div key={f.name} className="media-card" onClick={() => {
              if (f.type === 'image') setLightbox({ src: f.url, type: 'image' })
              else if (f.type === 'video') setLightbox({ src: f.url, type: 'video' })
              else window.open(f.url, '_blank')
            }}>
              <button className="media-delete" onClick={e => deleteFile(f.name, e)} title="Delete">
                <X size={12} />
              </button>
              <button className="media-delete" style={{ right: 34 }} onClick={e => showInFinder(f.name, e)} title="Show in Finder">
                <FolderOpenDot size={12} />
              </button>
              <div className="media-thumb">
                {f.type === 'image' && <img src={f.url} alt={f.name} loading="lazy" />}
                {f.type === 'video' && (
                  <>
                    <video src={f.url} preload="metadata" muted />
                    <div className="media-video-overlay"><Play size={32} /></div>
                  </>
                )}
                {f.type === 'document' && (
                  <div className="media-doc-icon">
                    <FileText size={32} />
                    <span style={{ fontSize: 10 }}>PDF</span>
                  </div>
                )}
              </div>
              <div className="media-info">
                <div className="media-name" title={f.name}>{f.name}</div>
                <div className="media-meta">
                  <span>{fmtSize(f.size)}</span>
                  <span>{fmtDate(f.modified)}</span>
                </div>
              </div>
            </div>
          ))}
          {/* Link cards */}
          {showLinks && links.map(l => (
            <div key={l.id} className="media-card" onClick={() => window.open(l.url, '_blank')} style={{ cursor: 'pointer' }}>
              <button className="media-delete" onClick={e => deleteLink(l.id, e)} title="Delete"><X size={12} /></button>
              <div className="media-thumb">
                <div className="media-doc-icon">
                  {l.type === 'video' ? <Film size={32} /> : <Link2 size={32} />}
                  <span style={{ fontSize: 10, textTransform: 'uppercase' }}>{l.type}</span>
                </div>
              </div>
              <div className="media-info">
                <div className="media-name" title={l.title}>{l.title}</div>
                <div className="media-meta">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><ExternalLink size={9} /> Link</span>
                  <span>{fmtDate(l.addedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credits section */}
      <div className="section-card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ justifyContent: 'space-between' }}>
          <span><Users size={14} /> Credits</span>
          <button className="btn btn-sm" onClick={() => setShowAddCredit(true)}><Plus size={12} /> Add</button>
        </div>
        {showAddCredit && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: 1, minWidth: 120 }} placeholder="Name" value={creditName} onChange={e => setCreditName(e.target.value)} autoFocus />
            <input className="input" style={{ flex: 1, minWidth: 120 }} placeholder="Role (e.g. Photographer)" value={creditRole} onChange={e => setCreditRole(e.target.value)} />
            <input className="input" style={{ flex: 1, minWidth: 120 }} placeholder="Website (optional)" value={creditUrl} onChange={e => setCreditUrl(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={addCredit}><Check size={12} /></button>
            <button className="btn btn-sm" onClick={() => setShowAddCredit(false)}><X size={12} /></button>
          </div>
        )}
        {credits.length === 0 && !showAddCredit && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No credits yet. Add people who contributed to photos, videos, etc.</p>
        )}
        {credits.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <Users size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ fontWeight: 500, flex: 1 }}>{c.name}</span>
            {c.role && <span style={{ color: 'var(--text-muted)' }}>{c.role}</span>}
            {c.url && <a href={c.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--accent-blue)' }}><ExternalLink size={11} /></a>}
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }} onClick={() => deleteCredit(c.id)}><X size={11} /></button>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="media-lightbox" onClick={() => setLightbox(null)}>
          <div style={{ position: 'absolute', top: 16, right: 16, color: 'rgba(255,255,255,0.5)', fontSize: 11, pointerEvents: 'none' }}>Press ESC to close</div>
          {lightbox.type === 'image'
            ? <img src={lightbox.src} alt="Preview" onClick={e => e.stopPropagation()} />
            : <video src={lightbox.src} controls autoPlay onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh' }} />
          }
        </div>
      )}
    </>
  )
}

/* ─── Tab: Press ───────────────────────── */
interface PressEntry { id: string; url: string; title: string; source: string; date: string; type: 'press' | 'scientific'; pdfFile: string | null; archiveStatus: 'pending' | 'done' | 'failed'; addedAt: string }

function PressTab({ slug }: { slug: string }) {
  const [entries, setEntries] = useState<PressEntry[]>([])
  const [pressFilter, setPressFilter] = useState<'all' | 'press' | 'scientific'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<'press' | 'scientific'>('press')

  const fetchEntries = useCallback(() => {
    fetch(`/api/project-press?slug=${slug}`)
      .then(r => r.json())
      .then(data => setEntries(data.entries || []))
      .catch(() => {})
  }, [slug])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // Poll for pending archival
  useEffect(() => {
    if (!entries.some(e => e.archiveStatus === 'pending')) return
    const t = setInterval(fetchEntries, 3000)
    return () => clearInterval(t)
  }, [entries, fetchEntries])

  const addEntry = async () => {
    if (!url.trim()) return
    await fetch('/api/project-press', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, url, title: title || url, source, date, type })
    })
    setUrl(''); setTitle(''); setSource(''); setDate(''); setShowAdd(false)
    fetchEntries()
  }

  const deleteEntry = async (id: string) => {
    await fetch(`/api/project-press?slug=${slug}&id=${id}`, { method: 'DELETE' })
    fetchEntries()
  }

  const retryArchive = async (id: string) => {
    await fetch('/api/project-press', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, id })
    })
    fetchEntries()
  }

  const filtered = entries.filter(e => pressFilter === 'all' || e.type === pressFilter)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Newspaper size={16} /> Press & Publications
        </h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm" onClick={() => setShowAdd(true)}><Plus size={12} /> Add Entry</button>
          <button className="btn btn-sm" onClick={() => {
            fetch('/api/open-finder', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: `project-docs/${slug}/press` })
            })
          }}><FolderOpenDot size={12} /> Open Folder</button>
        </div>
      </div>

      {showAdd && (
        <div className="section-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label className="field-label">URL</label>
              <input className="input" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} autoFocus />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="field-label">Title</label>
              <input className="input" placeholder="Article title" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="field-label">Source</label>
              <input className="input" placeholder="e.g. Nature, Wired" value={source} onChange={e => setSource(e.target.value)} />
            </div>
            <div style={{ minWidth: 120 }}>
              <label className="field-label">Date</label>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div style={{ minWidth: 100 }}>
              <label className="field-label">Type</label>
              <select className="select" value={type} onChange={e => setType(e.target.value as 'press' | 'scientific')} style={{ width: '100%' }}>
                <option value="press">Press</option>
                <option value="scientific">Scientific</option>
              </select>
            </div>
            <button className="btn btn-primary btn-sm" onClick={addEntry}><Check size={12} /> Add</button>
            <button className="btn btn-sm" onClick={() => setShowAdd(false)}><X size={12} /></button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>The web page will be automatically archived as PDF.</p>
        </div>
      )}

      <div className="media-filter-bar">
        {(['all', 'press', 'scientific'] as const).map(f => (
          <button key={f} className={`media-filter-btn ${pressFilter === f ? 'active' : ''}`} onClick={() => setPressFilter(f)}>
            {f === 'all' && <Newspaper size={11} />}
            {f === 'press' && <Newspaper size={11} />}
            {f === 'scientific' && <BookOpen size={11} />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ opacity: 0.6 }}>{f === 'all' ? entries.length : entries.filter(e => e.type === f).length}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Newspaper size={32} />
          <p>No press entries yet.</p>
          <p style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>Add links to press articles and scientific publications that mention your work.</p>
        </div>
      ) : (
        <div className="section-card" style={{ padding: 0 }}>
          {filtered.map((e, i) => (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              fontSize: 12
            }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: e.type === 'scientific' ? 'var(--accent-purple-subtle)' : 'var(--accent-blue-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {e.type === 'scientific' ? <BookOpen size={12} style={{ color: 'var(--accent-purple)' }} /> : <Newspaper size={12} style={{ color: 'var(--accent-blue)' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                  {e.source && <span>{e.source}</span>}
                  {e.date && <span>{new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                {e.archiveStatus === 'pending' && <span style={{ fontSize: 10, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 3 }}><RefreshCw size={10} className="spin" /> Archiving…</span>}
                {e.archiveStatus === 'failed' && <button className="btn btn-sm" style={{ fontSize: 10, color: 'var(--accent-red)' }} onClick={() => retryArchive(e.id)}><RefreshCw size={10} /> Retry</button>}
                {e.pdfFile && (
                  <a href={`/api/project-docs/file?slug=${slug}&name=${encodeURIComponent('press/' + e.pdfFile)}`} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ textDecoration: 'none' }}>
                    <FileText size={10} /> PDF
                  </a>
                )}
                <a href={e.url} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ textDecoration: 'none' }}>
                  <ExternalLink size={10} /> Open
                </a>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }} onClick={() => deleteEntry(e.id)} title="Delete"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
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


function PartnersTab({ project, onRefresh, selectedPartner, onSelectPartner }: { project: Project; onRefresh: () => void; selectedPartner: Partner | null; onSelectPartner: (p: Partner | null) => void }) {
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
        <div key={p.id} className={`partner-card ${selectedPartner?.id === p.id ? 'selected' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => onSelectPartner(p)}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="partner-name">{p.name}</div>
              <div className="partner-institution">{p.institution}</div>
              {p.expertise && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.expertise}</div>}
            </div>
            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
              <select className="select" value={p.status} style={{ fontSize: 11, padding: '2px 6px' }}
                onChange={e => updatePartner(p.id, { status: e.target.value })}>
                {PARTNER_STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <button className="btn-icon" onClick={() => deletePartner(p.id)}><Trash2 size={14} /></button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11 }}>
            {p.email && <a href={`mailto:${p.email}`} className="detail-link" onClick={e => e.stopPropagation()}>{p.email}</a>}
            {p.website && <a href={p.website} target="_blank" className="detail-link" onClick={e => e.stopPropagation()}><ExternalLink size={10} /> website</a>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Partner Detail Panel ─────────────── */
function PartnerDetailPanel({ partner, onRefresh, onUpdate }: { partner: Partner; onRefresh: () => void; onUpdate: (p: Partner) => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(partner)

  useEffect(() => { setForm(partner); setEditing(false) }, [partner.id])

  const save = async () => {
    const res = await fetch(`/api/partners/${partner.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const updated = await res.json()
    onUpdate(updated)
    onRefresh()
    setEditing(false)
  }

  return (
    <>
      <div className="detail-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className={`badge badge-${partner.status}`} style={{ textTransform: 'capitalize' }}>{partner.status.replace('_', ' ')}</span>
          <button className="btn btn-sm" onClick={() => setEditing(!editing)}>
            {editing ? <><X size={12} /> Cancel</> : <><Edit3 size={12} /> Edit</>}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="detail-section">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="field-group"><label className="field-label">Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field-group"><label className="field-label">Institution</label>
              <input className="input" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} />
            </div>
            <div className="field-group"><label className="field-label">Expertise</label>
              <textarea className="input" rows={3} value={form.expertise} onChange={e => setForm({ ...form, expertise: e.target.value })} />
            </div>
            <div className="field-group"><label className="field-label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field-group"><label className="field-label">Website</label>
              <input className="input" type="url" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="field-group"><label className="field-label">Status</label>
              <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {PARTNER_STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="field-group"><label className="field-label">Notes</label>
              <textarea className="input" rows={4} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={save}><Save size={12} /> Save</button>
          </div>
        </div>
      ) : (
        <>
          <div className="detail-section">
            <div className="detail-label">Institution</div>
            <div className="detail-value">{partner.institution || '—'}</div>
          </div>

          <div className="detail-section">
            <div className="detail-label">Expertise</div>
            <div className="detail-value" style={{ lineHeight: 1.6 }}>{partner.expertise || '—'}</div>
          </div>

          <div className="detail-section">
            <div className="detail-label">Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {partner.email ? <a href={`mailto:${partner.email}`} className="detail-link">{partner.email}</a> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No email</span>}
              {partner.website ? <a href={partner.website} target="_blank" className="detail-link"><ExternalLink size={12} /> {partner.website}</a> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No website</span>}
            </div>
          </div>

          {partner.notes && (
            <div className="detail-section">
              <div className="detail-label">Notes</div>
              <div className="detail-value" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{partner.notes}</div>
            </div>
          )}
        </>
      )}
    </>
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
function AllGrantsView({ selectedGrant, onSelectGrant, projects }: { selectedGrant: ProjectGrantLink | null; onSelectGrant: (g: ProjectGrantLink | null) => void; projects: Project[] }) {
  const [grants, setGrants] = useState<Grant[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [showTags, setShowTags] = useState(false)
  const [loading, setLoading] = useState(true)
  const [projectPicker, setProjectPicker] = useState<{ grantId: string; x: number; y: number } | null>(null)
  const [statusPicker, setStatusPicker] = useState<{ linkId: string; grantId: string; x: number; y: number } | null>(null)

  // Dismiss pickers on click outside
  useEffect(() => {
    if (!projectPicker && !statusPicker) return
    const dismiss = () => { setProjectPicker(null); setStatusPicker(null) }
    window.addEventListener('click', dismiss)
    return () => window.removeEventListener('click', dismiss)
  }, [projectPicker, statusPicker])

  const fetchGrants = useCallback(async () => {
    const params = new URLSearchParams()
    params.set('archived', showArchived ? 'all' : 'false')
    if (tagFilter) params.set('tag', tagFilter)
    const res = await fetch(`/api/grants?${params}`)
    const data = await res.json()
    setGrants(data)
    setLoading(false)
    // Update selectedGrant if it was refreshed
    if (selectedGrant) {
      const updated = data.find((g: Grant) => g.id === selectedGrant.grantId)
      if (updated) onSelectGrant({ ...selectedGrant, grant: updated })
    }
  }, [showArchived, tagFilter])

  useEffect(() => { fetchGrants() }, [fetchGrants])

  const toggleArchive = async (id: string, archived: boolean) => {
    await fetch(`/api/grants/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: !archived })
    })
    fetchGrants()
  }

  const addProjectToGrant = async (grantId: string, projectId: string) => {
    await fetch('/api/project-grants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grantId, projectId, status: 'identified' })
    })
    fetchGrants()
  }

  const removeProjectFromGrant = async (linkId: string) => {
    await fetch(`/api/project-grants/${linkId}`, { method: 'DELETE' })
    fetchGrants()
  }

  const updateLinkStatus = async (linkId: string, status: string) => {
    await fetch(`/api/project-grants/${linkId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    fetchGrants()
  }

  const statusColors: Record<string, string> = {
    identified: '#666',
    considering: '#eab308',
    'in-progress': '#6366f1',
    submitted: '#22c55e',
    rejected: '#ef4444',
    awarded: '#06b6d4'
  }
  const statusLabels: Record<string, string> = {
    identified: 'Identified',
    considering: 'Considering',
    'in-progress': 'In Progress',
    submitted: 'Submitted',
    rejected: 'Rejected',
    awarded: 'Awarded'
  }

  // ── Resizable columns ──
  const [colWidths, setColWidths] = useState([320, 180, 120, 100, 220, 80])
  const resizing = useRef<{ col: number; startX: number; startW: number } | null>(null)
  const gridTemplate = colWidths.map(w => `${w}px`).join(' ')

  const onResizeStart = (colIndex: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = { col: colIndex, startX: e.clientX, startW: colWidths[colIndex] }

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return
      const delta = ev.clientX - resizing.current.startX
      const newW = Math.max(60, resizing.current.startW + delta)
      setColWidths(prev => {
        const next = [...prev]
        next[resizing.current!.col] = newW
        return next
      })
    }

    const onUp = () => {
      resizing.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Text selection guard: track mousedown position, skip click if user dragged ──
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)
  const onRowMouseDown = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
  }
  const handleRowClick = async (g: Grant, e: React.MouseEvent) => {
    // If mouse moved > 5px, user was selecting text → don't navigate
    if (mouseDownPos.current) {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x)
      const dy = Math.abs(e.clientY - mouseDownPos.current.y)
      if (dx > 5 || dy > 5) return
    }
    // Also check if there's an active selection
    const sel = window.getSelection()
    if (sel && sel.toString().trim().length > 0) return
    if (!g.seen) {
      await fetch(`/api/grants/${g.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seen: true }) })
      fetchGrants()
    }
    const fullRes = await fetch(`/api/grants/${g.id}`)
    const fullGrant = await fullRes.json()
    const pgLink: ProjectGrantLink = {
      id: `all-${g.id}`, projectId: '', grantId: g.id,
      status: 'identified', matchScore: 0, relevance: '', notes: '',
      grant: { ...fullGrant, seen: true }
    }
    onSelectGrant(pgLink)
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
          <button className="btn btn-sm" style={{ color: 'var(--danger)' }}
            onClick={async () => {
              if (!confirm(`Delete all ${grants.length} grants? This cannot be undone.`)) return
              await fetch('/api/grants', { method: 'DELETE' })
              onSelectGrant(null)
              fetchGrants()
            }}>
            <Trash2 size={12} /> Delete All
          </button>
        </div>
      </div>

      {/* Tag filter pills — collapsible */}
      {allTags.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: showTags ? 8 : 0 }}>
            <button className="btn btn-sm" onClick={() => setShowTags(!showTags)}
              style={{ fontSize: 11, gap: 4 }}>
              <Tag size={11} />
              <ChevronDown size={11} style={{ transform: showTags ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              Tags ({allTags.length})
            </button>
            {tagFilter && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="badge badge-identified" style={{ fontSize: 11 }}>{tagFilter}</span>
                <button className="btn-icon" style={{ width: 18, height: 18 }} onClick={() => setTagFilter(null)}><X size={10} /></button>
              </span>
            )}
          </div>
          {showTags && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
        </div>
      )}

      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'auto' }}>
        <div className="grant-header" style={{ gridTemplateColumns: gridTemplate }}>
          {['Grant Name', 'Funder', 'Deadline', 'Amount', 'Projects', ''].map((label, i) => (
            <span key={i} style={{ position: 'relative', userSelect: 'none' }}>
              {label}
              {i < 5 && (
                <span
                  style={{
                    position: 'absolute', right: -4, top: 0, bottom: 0, width: 8,
                    cursor: 'col-resize', zIndex: 2
                  }}
                  onMouseDown={e => onResizeStart(i, e)}
                />
              )}
            </span>
          ))}
        </div>
        {grants.map(g => (
          <div key={g.id} className={`grant-row ${g.archived ? 'archived-row' : ''} ${!g.seen ? 'grant-new' : ''} ${selectedGrant?.grantId === g.id ? 'selected' : ''}`}
            style={{ gridTemplateColumns: gridTemplate, userSelect: 'text' }}
            onMouseDown={onRowMouseDown}
            onClick={e => handleRowClick(g, e)}>
            <span style={{ fontWeight: 500, opacity: g.archived ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              {g.name}
              {!g.seen && <span className="new-badge">NEW</span>}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>{g.funder}</span>
            <span className={deadlineClass(g.deadline)}>
              {formatDate(g.deadline)} <span style={{ fontSize: 10, opacity: 0.7 }}>{daysUntil(g.deadline)}</span>
            </span>
            <span>{g.amount || '—'}</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
              {g.projectLinks?.map(pl => (
                <span key={pl.id} className="badge" style={{
                  background: `${pl.project.color}22`, color: pl.project.color, fontSize: 10,
                  display: 'flex', alignItems: 'center', gap: 4, cursor: 'default'
                }}>
                  <span
                    style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: statusColors[pl.status] || '#666',
                      flexShrink: 0, cursor: 'pointer'
                    }}
                    title={statusLabels[pl.status] || pl.status}
                    onClick={e => { e.stopPropagation(); setStatusPicker({ linkId: pl.id, grantId: g.id, x: e.clientX, y: e.clientY }) }}
                  />
                  {pl.project.name}
                  <span
                    style={{
                      marginLeft: 2, cursor: 'pointer', opacity: 0.4, fontSize: 10, lineHeight: 1
                    }}
                    onMouseOver={e => (e.currentTarget.style.opacity = '1')}
                    onMouseOut={e => (e.currentTarget.style.opacity = '0.4')}
                    onClick={e => { e.stopPropagation(); removeProjectFromGrant(pl.id) }}
                    title="Remove project"
                  >✕</span>
                </span>
              ))}
              <button style={{
                width: 18, height: 18, borderRadius: '50%', border: '1px dashed var(--border)',
                background: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}
              onClick={e => { e.stopPropagation(); setProjectPicker({ grantId: g.id, x: e.clientX, y: e.clientY }) }}
              title="Assign project">+</button>
            </div>
            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
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
      {/* ─── Project Picker Popup ─── */}
      {projectPicker && (
        <div style={{
          position: 'fixed', top: projectPicker.y, left: projectPicker.x, zIndex: 9999,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 4, minWidth: 180, maxHeight: 240, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Assign Project
          </div>
          {(() => {
            const assigned = new Set(grants.find(g => g.id === projectPicker.grantId)?.projectLinks?.map(pl => pl.project.id) || [])
            const available = projects.filter(p => !assigned.has(p.id))
            if (available.length === 0) return <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)' }}>All projects assigned</div>
            return available.map(p => (
              <button key={p.id} style={{
                width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 12,
                background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer',
                borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseOut={e => (e.currentTarget.style.background = 'none')}
              onClick={() => { addProjectToGrant(projectPicker.grantId, p.id); setProjectPicker(null) }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                {p.name}
              </button>
            ))
          })()}
        </div>
      )}

      {/* ─── Status Picker Popup ─── */}
      {statusPicker && (
        <div style={{
          position: 'fixed', top: statusPicker.y, left: statusPicker.x, zIndex: 9999,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 4, minWidth: 160,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Status
          </div>
          {Object.entries(statusLabels).map(([key, label]) => (
            <button key={key} style={{
              width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 12,
              background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer',
              borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseOut={e => (e.currentTarget.style.background = 'none')}
            onClick={() => { updateLinkStatus(statusPicker.linkId, key); setStatusPicker(null) }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[key], flexShrink: 0 }} />
              {label}
            </button>
          ))}
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
function GrantNotesEditor({ grantId, noteType = 'checklist' }: { grantId: string; noteType?: 'checklist' | 'answers' }) {
  const [content, setContent] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setLoaded(false)
    setEditing(false)
    fetch(`/api/grant-notes?grantId=${grantId}&type=${noteType}`)
      .then(r => r.json())
      .then(data => { setContent(data.content || ''); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [grantId, noteType])

  const saveNotes = useCallback((text: string) => {
    setSaving(true)
    fetch(`/api/grant-notes?grantId=${grantId}&type=${noteType}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text })
    }).then(() => setSaving(false)).catch(() => setSaving(false))
  }, [grantId, noteType])

  const handleChange = useCallback((val: string | undefined) => {
    const v = val ?? ''
    setContent(v)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveNotes(v), 1500)
  }, [saveNotes])

  if (!loaded) return <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading…</p>

  if (!content && !editing) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>No notes yet for this grant.</p>
        <button className="btn btn-sm" onClick={() => setEditing(true)}>
          <Edit3 size={12} /> Create Notes
        </button>
      </div>
    )
  }

  if (editing) {
    return (
      <div data-color-mode="dark">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{saving ? 'Saving…' : 'Auto-saves as you type'}</span>
          <button className="btn btn-sm" onClick={() => { saveNotes(content); setEditing(false) }}>
            <Eye size={12} /> Preview
          </button>
        </div>
        <MDEditor
          value={content}
          onChange={handleChange}
          preview="edit"
          height={700}
          visibleDragbar={true}
          style={{ background: 'transparent', borderRadius: 8 }}
        />
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn btn-sm" onClick={() => setEditing(true)}>
          <Edit3 size={12} /> Edit
        </button>
      </div>
      <div
        data-color-mode="dark"
        style={{
          fontSize: 13, lineHeight: 1.8, cursor: 'text'
        }}
        onDoubleClick={() => setEditing(true)}
      >
        <MarkdownPreview source={content} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: 13 }} />
      </div>
    </div>
  )
}

function GrantDetailPanel({ pg, onRefresh, notesPanelMode, onSetNotesPanelMode, projects }: {
  pg: ProjectGrantLink; onRefresh: () => void;
  notesPanelMode: 'checklist' | 'answers' | null;
  onSetNotesPanelMode: (m: 'checklist' | 'answers' | null) => void;
  projects: Project[];
}) {
  const g = pg.grant
  const [notesMeta, setNotesMeta] = useState<{ total: number; done: number } | null>(null)
  const [uploading, setUploading] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)
  const [docCtx, setDocCtx] = useState<{ x: number; y: number; path: string; docId: string } | null>(null)
  const [tunnelOpen, setTunnelOpen] = useState(false)

  // Dismiss context menu on click outside
  useEffect(() => {
    if (!docCtx) return
    const dismiss = () => setDocCtx(null)
    window.addEventListener('click', dismiss)
    return () => window.removeEventListener('click', dismiss)
  }, [docCtx])

  // Fetch note metadata (checkbox counts) for the badge
  useEffect(() => {
    fetch(`/api/grant-notes?grantId=${g.id}`)
      .then(r => r.json())
      .then(data => {
        const c = data.content || ''
        const total = (c.match(/- \[[ x\/]\]/g) || []).length
        const done = (c.match(/- \[x\]/g) || []).length
        setNotesMeta({ total, done })
      })
      .catch(() => {})
  }, [g.id, notesPanelMode]) // re-fetch when notes panel closes (may have changed)

  const uploadFile = async (file: File) => {
    setUploading(true)
    const form = new FormData()
    form.append('grantId', g.id)
    form.append('file', file)
    form.append('label', file.name)
    await fetch('/api/grant-docs', { method: 'POST', body: form })
    setUploading(false)
    // Refresh grant data to show new document
    onRefresh()
  }

  const deleteDoc = async (docId: string) => {
    await fetch(`/api/grant-docs?id=${docId}`, { method: 'DELETE' })
    onRefresh()
  }

  const notesOpen = notesPanelMode === 'checklist'
  const answersOpen = notesPanelMode === 'answers'

  return (
    <>
      <div className="detail-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className={`badge badge-${pg.status}`} style={{ textTransform: 'capitalize' }}>{pg.status.replace('_', ' ')}</span>
          <span className={deadlineClass(g.deadline)} style={{ fontSize: 13, fontWeight: 600 }}>
            {formatDate(g.deadline)} <span style={{ fontSize: 10, opacity: 0.7 }}>{daysUntil(g.deadline)}</span>
          </span>
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{g.eligibility || g.description || 'No eligibility info.'}</p>
      </div>

      {/* Links */}
      {(g.url || g.portalUrl || g.faqUrl) && (
        <div className="detail-section">
          <div className="detail-label">Links</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {g.url && <a href={g.url} target="_blank" style={{ fontSize: 12, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4 }}><ExternalLink size={11} /> Call Page</a>}
            {g.portalUrl && <a href={g.portalUrl} target="_blank" style={{ fontSize: 12, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4 }}><ExternalLink size={11} /> Submission Portal</a>}
            {g.faqUrl && <a href={g.faqUrl} target="_blank" style={{ fontSize: 12, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4 }}><ExternalLink size={11} /> FAQ / Guide</a>}
          </div>
        </div>
      )}

      {/* Tags */}
      {g.tags && (
        <div className="detail-section">
          <div className="detail-label">Tags</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {g.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
              <span key={t} className="badge" style={{ fontSize: 10 }}>{t}</span>
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

      {/* ─── Projects assignment ── */}
      <div className="detail-section">
        <div className="detail-label">Projects</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {g.projectLinks?.map(pl => (
            <span key={pl.id} className="badge" style={{
              background: `${pl.project.color}22`, color: pl.project.color, fontSize: 11,
              display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px'
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: { identified: '#666', considering: '#eab308', 'in-progress': '#6366f1', submitted: '#22c55e', rejected: '#ef4444', awarded: '#06b6d4' }[pl.status] || '#666',
                flexShrink: 0
              }} />
              {pl.project.name}
              <span
                style={{ marginLeft: 2, cursor: 'pointer', opacity: 0.4, fontSize: 10 }}
                onMouseOver={e => (e.currentTarget.style.opacity = '1')}
                onMouseOut={e => (e.currentTarget.style.opacity = '0.4')}
                onClick={async () => { await fetch(`/api/project-grants/${pl.id}`, { method: 'DELETE' }); onRefresh() }}
                title="Remove project"
              >✕</span>
            </span>
          ))}
          {(!g.projectLinks || g.projectLinks.length === 0) && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No projects assigned</span>}
          <select
            style={{
              background: 'var(--bg-primary)', border: '1px dashed var(--border)', borderRadius: 6,
              color: 'var(--text-muted)', fontSize: 11, padding: '2px 6px', cursor: 'pointer'
            }}
            value=""
            onChange={async e => {
              if (!e.target.value) return
              await fetch('/api/project-grants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grantId: g.id, projectId: e.target.value, status: 'identified' })
              })
              onRefresh()
            }}
          >
            <option value="">+ Add project</option>
            {projects
              .filter(p => !g.projectLinks?.some(pl => pl.project.id === p.id))
              .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
            }
          </select>
        </div>
      </div>

      {/* ─── Documents + Upload ── */}
      <div className="detail-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="detail-label" style={{ marginBottom: 0 }}>Documents ({g.documents?.length || 0})</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-sm" onClick={() => uploadRef.current?.click()}>
              <Upload size={11} /> Upload
            </button>
            <button className="btn btn-sm" onClick={() => {
              const docPath = g.documents?.[0]?.filePath
              const dir = docPath ? docPath.substring(0, docPath.lastIndexOf('/')) : ''
              fetch('/api/open-finder', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: dir || '.' })
              })
            }}><FolderOpenDot size={11} /> Finder</button>
          </div>
        </div>
        <input ref={uploadRef} type="file" multiple style={{ display: 'none' }} onChange={e => {
          if (e.target.files) Array.from(e.target.files).forEach(f => uploadFile(f))
          e.target.value = ''
        }} />
        {uploading && <p style={{ fontSize: 11, color: 'var(--accent-blue)', marginTop: 4 }}>Uploading…</p>}

        {/* Right-click context menu */}
        {docCtx && (
          <div style={{
            position: 'fixed', top: docCtx.y, left: docCtx.x, zIndex: 9999,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 4, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }} onClick={() => setDocCtx(null)}>
            <button style={{
              width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 12,
              background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer',
              borderRadius: 4
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseOut={e => (e.currentTarget.style.background = 'none')}
            onClick={() => { navigator.clipboard.writeText(docCtx.path); setDocCtx(null) }}>
              📋 Copy Path
            </button>
            <button style={{
              width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 12,
              background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer',
              borderRadius: 4
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseOut={e => (e.currentTarget.style.background = 'none')}
            onClick={() => {
              fetch('/api/open-finder', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: docCtx.path })
              })
              setDocCtx(null)
            }}>
              📂 Open in Finder
            </button>
            <button style={{
              width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 12,
              background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer',
              borderRadius: 4
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseOut={e => (e.currentTarget.style.background = 'none')}
            onClick={() => { deleteDoc(docCtx.docId); setDocCtx(null) }}>
              🗑 Delete
            </button>
          </div>
        )}

        {(() => {
          const docs = g.documents || []
          const tunnelDocs = docs.filter(d => d.filePath?.includes('/agent-tunnel/'))
          const regularDocs = docs.filter(d => !d.filePath?.includes('/agent-tunnel/'))

          const renderDoc = (d: Document) => (
            <div key={d.id} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
              borderRadius: 6, background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)', fontSize: 11, cursor: 'pointer'
            }}
            onClick={() => {
              fetch('/api/open-finder', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: d.filePath })
              })
            }}
            onContextMenu={e => {
              e.preventDefault()
              setDocCtx({ x: e.clientX, y: e.clientY, path: d.filePath, docId: d.id })
            }}>
              <FileText size={11} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
              <span style={{ flex: 1 }}>{d.label || d.originalName}</span>
            </div>
          )

          if (docs.length === 0) {
            return <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>No documents yet — click Upload to add PDFs, screenshots, etc.</p>
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
              {regularDocs.map(renderDoc)}
              {tunnelDocs.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <button onClick={() => setTunnelOpen(o => !o)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                    background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer',
                    color: 'rgb(129,140,248)', fontWeight: 600
                  }}>
                    <ChevronDown size={11} style={{
                      transition: 'transform 150ms',
                      transform: tunnelOpen ? 'rotate(0)' : 'rotate(-90deg)'
                    }} />
                    Agent Tunnel ({tunnelDocs.length})
                  </button>
                  {tunnelOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 12, marginTop: 4 }}>
                      {tunnelDocs.map(renderDoc)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ─── Notes & Checklist Toggle ── */}
      <div className="detail-section" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => onSetNotesPanelMode(notesOpen ? null : 'checklist')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: notesOpen ? 'rgba(99,102,241,0.1)' : 'none',
            border: notesOpen ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
            borderRadius: 8, cursor: 'pointer', padding: '10px 12px',
            color: notesOpen ? 'rgb(129,140,248)' : 'var(--text-primary)',
            fontWeight: 600, fontSize: 13, transition: 'all 200ms'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={15} />
            Notes &amp; Checklist
            {notesMeta && notesMeta.total > 0 && (
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 10,
                background: notesMeta.done === notesMeta.total ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.15)',
                color: notesMeta.done === notesMeta.total ? '#34d399' : '#fbbf24',
                fontWeight: 700
              }}>
                {notesMeta.done}/{notesMeta.total}
              </span>
            )}
          </span>
          <ChevronRight size={14} style={{
            transition: 'transform 200ms',
            transform: notesOpen ? 'rotate(180deg)' : 'rotate(0)'
          }} />
        </button>

        <button
          onClick={() => onSetNotesPanelMode(answersOpen ? null : 'answers')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: answersOpen ? 'rgba(52,211,153,0.1)' : 'none',
            border: answersOpen ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
            borderRadius: 8, cursor: 'pointer', padding: '10px 12px', marginTop: 6,
            color: answersOpen ? 'rgb(52,211,153)' : 'var(--text-primary)',
            fontWeight: 600, fontSize: 13, transition: 'all 200ms'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Edit3 size={15} />
            Application Answers
          </span>
          <ChevronRight size={14} style={{
            transition: 'transform 200ms',
            transform: answersOpen ? 'rotate(180deg)' : 'rotate(0)'
          }} />
        </button>
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

      {/* Media */}
      <div className="section-card">
        <MediaTab slug="_profile" />
      </div>

      {/* Press */}
      <div className="section-card">
        <PressTab slug="_profile" />
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
