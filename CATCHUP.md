# Grant Tracker — Catchup

## 2026-03-16 — Initial build

- Created full Next.js 16 app with Prisma 7 + SQLite
- 11 database models: Project, Grant, ProjectGrant, ChecklistItem, BudgetItem, TimelineItem, BibEntry, Partner, Deliverable, Document, ContentVersion
- 3-panel layout: left project selector, main view with 10 tabs, right panel for grant details
- VS Code dark theme matching lab design language
- ~20 REST API routes for full CRUD with version tracking
- Markdown editor (@uiw/react-md-editor) for rich text fields
- Seeded 3 projects (Cryptographic Beings, Bio Electronic Music, Ultrasound Bio-Printing) and 2 sample grants
- Port: 3009
