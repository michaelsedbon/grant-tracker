# Grant Tracker

**Centralised research funding organiser for SYNTHETICA Lab.**

Track research projects, find and manage grant opportunities, build applications with submission checklists, and maintain reusable project narratives (state of the art, bibliography, partners, budget, deliverables).

## Tech Stack

- **Frontend & API:** Next.js 15 (App Router, Turbopack)
- **Database:** SQLite via Prisma 7 + better-sqlite3 adapter
- **Editor:** @uiw/react-md-editor for rich text fields
- **Icons:** lucide-react
- **Port:** 3009

## How to Run

```bash
cd applications/grant-tracker
npm install
npx prisma db push
npx tsx prisma/seed.ts     # seed initial data (first time only)
npm run dev -- -p 3009
```

Open [http://localhost:3009](http://localhost:3009)

## Project Structure

```
grant-tracker/
├── src/                    # Next.js app (see ARCHITECTURE.md)
├── prisma/                 # DB schema + migrations
├── project-docs/           # Per-project media & documents
├── grant-notes/            # Per-grant answer files (.md)
├── pdf-generator/          # ⬅ Proposal PDF + IDML generation system
│   ├── design_system.yaml  # Single source of truth for all design rules
│   ├── config.py           # YAML → Python loader (colors, fonts, styles)
│   ├── generator.py        # CLI: JSON → PDF (+ IDML with --idml flag)
│   ├── idml_export.py      # JSON → InDesign IDML (stdlib only)
│   ├── templates/          # Python page templates (10 types)
│   │   ├── __init__.py     # Template index (type → class mapping)
│   │   ├── base.py         # Shared drawing helpers + JPG caching
│   │   ├── cover.py        # Full-bleed cover + overlay strip
│   │   ├── toc.py          # Numbered table of contents
│   │   ├── text_image.py   # Two-zone text+image (65/35)
│   │   ├── video.py        # Video embed with play button
│   │   ├── illustration.py # Rendered illustration with labels
│   │   ├── section_opener.py # Dark photo with title overlay
│   │   ├── bio.py          # Artist bio + portrait + icon contacts
│   │   ├── technical_rider.py # Key::value table
│   │   ├── full_bleed_photo.py # Atmospheric photo, no text
│   │   └── dimensions.py   # 3D render with annotations
│   ├── fonts/              # Place .ttf font files here
│   ├── output/             # Generated PDFs, IDMLs, and image cache
│   │   └── img_cache/      # Auto-generated JPG cache for heavy images
│   └── requirements.txt    # reportlab, Pillow, PyYAML
├── .agents/                # AI agent workflows & scrapers
├── ARCHITECTURE.md         # Detailed component & API reference
├── AGENT_API.md            # API reference for agents
└── README.md               # This file
```

## PDF Generator

Generate professional grant proposal PDFs and InDesign IDML files from structured JSON data.

### Architecture

```
design_system.yaml  ──→  config.py  ──→  templates/*.py  ──→  generator.py
   (design rules)      (Python tokens)   (page renderers)    (orchestrator)
                                                              ├─ PDF output
                                                              └─ IDML output
```

**Single source of truth**: `design_system.yaml` defines every visual rule — page size, margins, grid, colors, fonts, type scale, and template definitions. All Python code reads from this file. To change any design rule, edit ONLY the YAML.

### Quick Start

```bash
cd pdf-generator
pip install -r requirements.txt

# Generate test PDF (all quality tiers)
python generator.py --sample --output test.pdf

# Generate from JSON data
python generator.py --input proposal.json --output my_proposal.pdf

# Also produce InDesign IDML
python generator.py --sample --idml --output test.pdf

# Pick a specific quality tier
python generator.py --sample --quality lossless --output test.pdf
```

### Export Formats

| Format | Flag | Description |
|--------|------|-------------|
| **PDF (lossless)** | `--quality lossless` | Max quality, no compression |
| **PDF (standard)** | `--quality standard` | 200 dpi, good for print |
| **PDF (compressed)** | `--quality compressed` | 120 dpi, smallest file |
| **PDF (all)** | `--quality all` (default) | All three tiers at once |
| **IDML** | `--idml` | InDesign-editable package |

### Image Caching

Large images (PNG, TIFF, BMP) are automatically converted to compressed JPGs and cached in `pdf-generator/output/img_cache/`. This reduces memory usage from ~250 MB to ~15 MB and avoids pipeline stalls. Cache settings in `config.py`:

- `IMG_CACHE_QUALITY`: JPG quality (default 85%)
- `IMG_CACHE_MAX_PX`: Max dimension in pixels (default 3000)

### InDesign IDML Export

The `idml_export.py` module generates `.idml` files (InDesign's native XML format) from the same JSON data the PDF generator uses. **Zero external dependencies** — uses only Python stdlib (`zipfile` + `xml.etree`).

The IDML includes:
- All paragraph styles matching the design system
- Color swatches (black, white, accent yellow, etc.)
- Proper page geometry (A4 landscape, 65/35 grid)
- Text frames and image frames with linked file references
- Support for all page types

> **Note:** IDML uses file-path references for images. If images are moved, InDesign will prompt to relink.

### Page Templates

| Type | File | Description |
|------|------|-------------|
| `cover` | `cover.py` | Full-bleed hero + title overlay strip + badge |
| `toc` | `toc.py` | Numbered TOC with underlines + dot-leaders |
| `text_image` | `text_image.py` | 65/35 text+image split (workhorse) |
| `video` | `video.py` | Video still + play button + caption |
| `illustration` | `illustration.py` | Render + yellow annotation labels |
| `section_opener` | `section_opener.py` | Dark photo + overlaid title |
| `bio` | `bio.py` | Artist bio + portrait + icon contact bar |
| `technical_rider` | `technical_rider.py` | Key :: value table |
| `full_bleed_photo` | `full_bleed_photo.py` | Atmospheric photo, no text |
| `dimensions` | `dimensions.py` | 3D render + title label |

### Fonts

Place Helvetica Neue `.ttf` files in `pdf-generator/fonts/`. If missing, the system falls back to built-in Helvetica.

### For Agents

- **To change design rules**: edit `design_system.yaml` only
- **To add a page type**: create `templates/my_type.py`, add to `TEMPLATE_INDEX` in `templates/__init__.py`
- **To generate a PDF**: call `generator.py` with a JSON matching the schema in `design_system.yaml`
- **To generate an IDML**: pass `--idml` flag alongside any PDF generation command
- **Image optimization**: heavy formats (PNG/TIFF/BMP) are auto-cached as JPGs — no manual conversion needed

## Architecture

3-panel layout with 10 project tabs, ~20 REST API routes, 11 Prisma models, full version history, and markdown editor for rich text fields. See [ARCHITECTURE.md](ARCHITECTURE.md) for full details.

