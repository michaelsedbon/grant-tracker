# Grant Tracker — API Reference

> **Base URL:** `http://localhost:3009`  
> **Content-Type:** `application/json` for all POST/PUT requests  
> **Database:** SQLite at `applications/grant-tracker/dev.db`

---

## Projects

### `GET /api/projects`
List all projects.

**Response:** Array of `{ id, name, slug, description, color, status, createdAt, updatedAt, _count: { grantLinks } }`

```bash
curl http://localhost:3009/api/projects
```

### `POST /api/projects`
Create a new project.

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | ✅ | |
| `slug` | string | ✅ | |
| `description` | string | | `""` |
| `color` | string | | `"#569cd6"` |
| `status` | string | | `"active"` |
| `stateOfArt` | string | | `""` |
| `impact` | string | | `""` |

```bash
curl -X POST http://localhost:3009/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","slug":"my_project","status":"active"}'
```

### `GET /api/projects/[id]`
Get a single project with ALL related data.

**Response includes:** budgetItems, timelineItems, bibEntries, partners, deliverables, grantLinks (with nested grant + _count)

```bash
curl http://localhost:3009/api/projects/<project-id>
```

### `PUT /api/projects/[id]`
Update a project. Version history is tracked for: `description`, `stateOfArt`, `impact`.

```bash
curl -X PUT http://localhost:3009/api/projects/<project-id> \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated description"}'
```

### `DELETE /api/projects/[id]`
Delete a project and all related data (cascades).

```bash
curl -X DELETE http://localhost:3009/api/projects/<project-id>
```

---

## Grants

### `GET /api/grants`
List grants with filtering.

| Query Param | Type | Description |
|-------------|------|-------------|
| `tag` | string | Filter by tag (substring match) |
| `funder` | string | Filter by funder (substring match) |
| `archived` | `"false"` / `"true"` / `"all"` | Default: `"false"` (hide archived) |

**Response includes:** `projectLinks[].project {id, name, color}`, `_count {projectLinks, documents}`

```bash
# Active grants only (default)
curl "http://localhost:3009/api/grants"

# All grants including archived
curl "http://localhost:3009/api/grants?archived=all"

# Filter by tag
curl "http://localhost:3009/api/grants?tag=biotech"
```

### `POST /api/grants`
Create a new grant.

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | ✅ | |
| `funder` | string | | `""` |
| `description` | string | | `""` |
| `amount` | string | | `""` |
| `amountMin` | float | | `null` |
| `amountMax` | float | | `null` |
| `currency` | string | | `"EUR"` |
| `deadline` | string (ISO date) | | `null` |
| `duration` | string | | `""` |
| `url` | string | | `""` |
| `portalUrl` | string | | `""` |
| `faqUrl` | string | | `""` |
| `eligibility` | string | | `""` |
| `trlLevel` | string | | `""` |
| `tags` | string (comma-sep) | | `""` |
| `notes` | string | | `""` |
| `archived` | boolean | | `false` |

```bash
curl -X POST http://localhost:3009/api/grants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Horizon Europe EIC Pathfinder",
    "funder": "European Commission",
    "description": "Supports breakthrough research...",
    "amount": "€3M – €4M",
    "amountMin": 3000000,
    "amountMax": 4000000,
    "currency": "EUR",
    "deadline": "2026-10-15",
    "duration": "48 months",
    "url": "https://eic.ec.europa.eu/eic-funding-opportunities/eic-pathfinder_en",
    "eligibility": "EU consortium, min 3 partners from 3 countries",
    "trlLevel": "1-3",
    "tags": "EU,horizon,breakthrough,deep-tech"
  }'
```

### `GET /api/grants/[id]`
Get a single grant with documents.

### `PUT /api/grants/[id]`
Update a grant. Version history tracked for: `description`, `eligibility`, `notes`.

```bash
# Archive a grant
curl -X PUT http://localhost:3009/api/grants/<grant-id> \
  -H "Content-Type: application/json" \
  -d '{"archived": true}'

# Unarchive
curl -X PUT http://localhost:3009/api/grants/<grant-id> \
  -H "Content-Type: application/json" \
  -d '{"archived": false}'
```

### `DELETE /api/grants/[id]`
Delete a grant and all related links.

---

## Project ↔ Grant Links

### `POST /api/project-grants`
Link a project to a grant.

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `projectId` | string (UUID) | ✅ | |
| `grantId` | string (UUID) | ✅ | |
| `status` | string | | `"identified"` |
| `matchScore` | int (1–5) | | `0` |
| `relevance` | string | | `""` |
| `notes` | string | | `""` |

**Status values:** `identified`, `preparing`, `submitted`, `under_review`, `accepted`, `rejected`

```bash
curl -X POST http://localhost:3009/api/project-grants \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<project-id>","grantId":"<grant-id>","status":"identified","matchScore":4}'
```

### `GET /api/project-grants`
List links. Supports filtering:

| Query Param | Description |
|-------------|-------------|
| `projectId` | Filter by project |
| `grantId` | Filter by grant |

```bash
curl "http://localhost:3009/api/project-grants?projectId=<project-id>"
```

### `GET /api/project-grants/[id]`
Get a single link with full project, grant, checklist items, and budget items.

### `PUT /api/project-grants/[id]`
Update a link. Version history tracked for: `relevance`, `notes`.

```bash
curl -X PUT http://localhost:3009/api/project-grants/<link-id> \
  -H "Content-Type: application/json" \
  -d '{"status":"preparing","matchScore":5}'
```

### `DELETE /api/project-grants/[id]`
Unlink a project from a grant.

---

## Checklist Items

### `POST /api/project-grants/[id]/checklist`
Create a checklist item for a specific project-grant link.

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `label` | string | ✅ | |
| `checked` | boolean | | `false` |
| `content` | string | | `""` |
| `notes` | string | | `""` |
| `sortOrder` | int | | `0` |

```bash
curl -X POST http://localhost:3009/api/project-grants/<link-id>/checklist \
  -H "Content-Type: application/json" \
  -d '{"label":"Submit budget breakdown","sortOrder":1}'
```

### `GET /api/project-grants/[id]/checklist`
List all checklist items for a project-grant link.

### `PUT /api/checklist/[id]`
Update a checklist item. Version history tracked for: `content`.

### `DELETE /api/checklist/[id]`
Delete a checklist item.

---

## Budget Items

### `POST /api/budget`
Create a budget item (project-level or grant-specific).

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `label` | string | ✅ | |
| `amount` | float | | `0` |
| `category` | string | | `"other"` |
| `notes` | string | | `""` |
| `projectId` | string | One of these | |
| `projectGrantId` | string | required | |

**Categories:** `personnel`, `equipment`, `travel`, `consumables`, `subcontracting`, `other`

```bash
curl -X POST http://localhost:3009/api/budget \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<id>","category":"personnel","label":"PI salary (24m)","amount":120000}'
```

### `GET /api/budget`
List budget items. Filter by `projectId` or `projectGrantId`.

### `PUT /api/budget/[id]` / `DELETE /api/budget/[id]`
Update or delete a budget item.

---

## Partners

### `POST /api/partners`
Create a partner linked to a project.

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `projectId` | string | ✅ | |
| `name` | string | ✅ | |
| `institution` | string | | `""` |
| `expertise` | string | | `""` |
| `email` | string | | `""` |
| `website` | string | | `""` |
| `status` | string | | `"to_contact"` |
| `notes` | string | | `""` |

**Status values:** `to_contact`, `contacted`, `confirmed`, `declined`

```bash
curl -X POST http://localhost:3009/api/partners \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<id>","name":"Dr. Smith","institution":"MIT","expertise":"bioelectronics","status":"to_contact"}'
```

### `PUT /api/partners/[id]` / `DELETE /api/partners/[id]`

---

## Bibliography

### `POST /api/bibliography`

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `projectId` | string | ✅ | |
| `title` | string | ✅ | |
| `authors` | string | | `""` |
| `year` | int | | `null` |
| `doi` | string | | `""` |
| `journal` | string | | `""` |
| `notes` | string | | `""` |

```bash
curl -X POST http://localhost:3009/api/bibliography \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<id>","title":"Electrical spiking in mycelium","authors":"Adamatzky","year":2022,"doi":"10.1038/..."}'
```

### `PUT /api/bibliography/[id]` / `DELETE /api/bibliography/[id]`

---

## Timeline

### `POST /api/timeline`

| Field | Type | Required |
|-------|------|----------|
| `projectId` | string | ✅ |
| `label` | string | ✅ |
| `type` | string | `"milestone"` / `"phase"` / `"deliverable"` |
| `startDate` | ISO date | |
| `endDate` | ISO date | |
| `notes` | string | |
| `sortOrder` | int | |

### `PUT /api/timeline/[id]` / `DELETE /api/timeline/[id]`

---

## Deliverables

### `POST /api/deliverables`

| Field | Type | Required |
|-------|------|----------|
| `projectId` | string | ✅ |
| `title` | string | ✅ |
| `workPackage` | string | |
| `type` | `"deliverable"` / `"milestone"` | |
| `description` | string | |
| `dueMonth` | int | |

### `PUT /api/deliverables/[id]` / `DELETE /api/deliverables/[id]`

---

## Version History

### `GET /api/versions`
Retrieve change history for any versioned field.

| Query Param | Required | Description |
|-------------|----------|-------------|
| `entityType` | ✅ | `"project"`, `"grant"`, `"projectGrant"`, `"checklistItem"` |
| `entityId` | ✅ | UUID of the entity |
| `field` | ✅ | Field name (e.g. `"description"`, `"stateOfArt"`) |

```bash
curl "http://localhost:3009/api/versions?entityType=project&entityId=<id>&field=description"
```

**Response:** Array of `{ id, entityType, entityId, field, content, createdAt }` sorted by `createdAt DESC`.

---

## Utility

### `POST /api/open-finder`
Open a file in macOS Finder (local use only).

```bash
curl -X POST http://localhost:3009/api/open-finder \
  -H "Content-Type: application/json" \
  -d '{"path":"/Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/grant-tracker/documents"}'
```

---

## Papers (filesystem)

### `GET /api/papers`
List all PDF files from the `papers/` folder, enriched with metadata from `papers_txt/INDEX.md`.

**Response:** Array of `{ filename, title, sizeBytes, subjects, url, summary }`

```bash
curl http://localhost:3009/api/papers
```

### `GET /api/papers/[filename]`
Serve a PDF file. Returns `application/pdf` with inline disposition.

```bash
# View in browser
open "http://localhost:3009/api/papers/Fungal_sensing_skin.pdf"

# Download
curl -o paper.pdf "http://localhost:3009/api/papers/Fungal_sensing_skin.pdf"
```

---

## Common Workflows

### Add a new grant from a web search
```bash
# 1. Create the grant
GRANT_ID=$(curl -s -X POST http://localhost:3009/api/grants \
  -H "Content-Type: application/json" \
  -d '{"name":"...","funder":"...","deadline":"2026-12-01","tags":"art,science"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# 2. Link to a project
curl -X POST http://localhost:3009/api/project-grants \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"<project-id>\",\"grantId\":\"$GRANT_ID\",\"matchScore\":3}"
```

### Archive old grants
```bash
curl -X PUT http://localhost:3009/api/grants/<grant-id> \
  -H "Content-Type: application/json" \
  -d '{"archived":true}'
```

### Get all grants for a project
```bash
curl http://localhost:3009/api/projects/<project-id> \
  | python3 -c "import sys,json; [print(g['grant']['name']) for g in json.load(sys.stdin)['grantLinks']]"
```

---

## Keyboard Shortcuts (UI)

| Shortcut | Action |
|----------|--------|
| `⌘Z` | Undo last action |
| `⌘⇧Z` | Redo |
| `⌘N` | New project |
| `⌘G` | Switch to All Grants view |
| `Esc` | Close panel / menu |
| `?` | show keyboard shortcuts |
| Right-click | Context menu on grant rows |

## Data Model

```
Project ──┐  
           ├── BudgetItem (project-level template)
           ├── TimelineItem
           ├── BibEntry
           ├── Partner
           ├── Deliverable
           └── ProjectGrant ──┐
                               ├── ChecklistItem
                               ├── BudgetItem (grant-specific)
                               └── Grant ──┐
                                            └── Document
```
