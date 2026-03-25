#!/usr/bin/env python3
"""Enrich all grants with detailed research findings from the audit."""
import json
import urllib.request

BASE = "http://localhost:3009/api"

def api(method, path, data=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# ═══════════════════════════════════════════════════════════════════
# GRANT UPDATES — detailed eligibility, notes, and descriptions
# ═══════════════════════════════════════════════════════════════════

updates = {

# ── NEB Prizes 2026 ───────────────────────────────────────────────
"7de3b36a-5627-44a5-b56e-9d1edf0a1fce": {
    "eligibility": """ELIGIBLE ✓

WHO CAN APPLY:
- Any nationality welcome, provided project is implemented in the EU, Western Balkans, Ukraine, or Moldova
- Strand A (Champions): individuals or organisations representing a completed project
- Strand B (Rising Stars): individuals/orgs ≤30 years old on application deadline

TARGET: Category 3 — Arts, Culture, and Heritage as Drivers of Change
"Welcomes transdisciplinary initiatives connecting art, science, and industry — embedding artists in technological/scientific environments, fostering collaboration with construction, manufacturing, and academic sectors."

WHAT'S ELIGIBLE:
- Strand A: mature, implemented projects delivering concrete results
- Strand B: promising ideas or early-stage initiatives by young talents ≤30
- Must reflect NEB values: sustainable, inclusive, beautiful
- Must demonstrate participatory processes, multi-level engagement, transdisciplinary approach

NOT ELIGIBLE:
- Projects not implemented in eligible territories
- Applicants who received a previous EU monetary prize (for same project)""",

    "notes": """🔴 URGENT — Deadline March 22 at 19:00 CET

SUBMISSION:
- Apply via https://prizes.new-european-bauhaus.europa.eu/prizes
- Application in English
- Select Category 3, Strand A (Champions)

PRIZE AMOUNTS:
- €20,000 for Strand A winners
- €15,000 for Strand B winners  
- €5,000 for runners-up
- Total: 13 winners + 14 runners-up

EVALUATION:
- Expert jury selection
- Winners get communication package + coaching/mentoring programme

BEST FIT: Cryptographic Beings
- Bio-hybrid installation = transdisciplinary (art + biology + CS + electronics)
- Completed and exhibited = Strand A eligible
- Multiple awards (Falling Walls, A'Design, Japan Media Arts)
- Implemented in France (EU) ✓

DOCUMENTS AVAILABLE ON PLATFORM:
- Annex 1: Guiding Questions
- Annex 2: Water Resilience
- Info Session Presentation
- Strand A/B Bootcamp recordings
- Complete Guide (MD)
- Privacy Statement

FAQ: https://prizes.new-european-bauhaus.europa.eu/prizes-faq
NEB Compass: https://web.archive.org/web/20250120092220/https:/new-european-bauhaus.europa.eu/get-involved/use-compass_en"""
},

# ── CNAP Acquisition 2026 ────────────────────────────────────────
"975e6557-fd7a-468a-a6b0-15021986533d": {
    "eligibility": """ELIGIBLE ✓ (Collège Arts décoratifs, design et métiers d'art)

WHO CAN PROPOSE:
- Artists whose practice is attested by exhibitions, participating in French art scene
- French artists (any residence) OR foreign artists residing in France ✓
- Galleries installed in France
- Foreign galleries presenting a French artist

RESTRICTIONS:
- No acquisition by same commission in past 2 calendar years
- No other CNAP support in same year
- Works by artists deceased >3 years not eligible
- Galleries: max 2 artists per commission

DEADLINE DETAILS:
- Collège Arts plastiques: Mar 2 (PASSED)
- Collège Arts décoratifs/design/métiers d'art: Apr 1 at 13:00 ← TARGET
- Collège Photographie/images animées: Oct 14""",

    "notes": """TARGET: Collège Arts décoratifs, design et métiers d'art
Commission: October 7-8, 2026
Deadline: April 1, 2026 at 13:00

REQUIRED DOCUMENTS:
1. Biography (max 1,500 characters)
2. CV + Portfolio PDF (named "SEDBON-CV-PORTFOLIO.pdf")
3. Text of intent describing the acquisition proposal
4. JPEG visuals (max 5 MB each) — overall view, detail, exhibition view, videostills

SUBMISSION: Online only via CNAP platform
https://www.cnap.fr/soutien-creation/acquisitions

BEST FIT: Cryptographic Beings
- Installation involving electronics, custom bio-reactors, software = design + métiers d'art
- Would enter the CNAP national contemporary art collection (100,000+ works)

ALSO CONSIDER: Proposing via a gallery if Michael has gallery representation"""
},

# ── Prix Arts Numériques 2026 ────────────────────────────────────
"9c2cb30a-3d14-45b9-9a22-7077f0a878f4": {
    "eligibility": """ELIGIBLE ✓

WHO CAN APPLY:
- Artists or artistic collectives of any nationality
- Must reside in Europe ✓ (Michael is in Paris)
- No age limit

WORK ELIGIBILITY:
- Must be a digital art work (any medium: AI, generative art, net art, robotics, mapping, VR, etc.)
- Must be an existing work, created between March 3, 2023 and March 3, 2026
- Must have been shown publicly
- Must echo one or more disciplines of the Académie des beaux-arts:
  painting, sculpture, architecture, engraving/drawing, music, cinema, photography, choreography
- Works previously submitted to the 1st edition cannot be resubmitted

NOT ELIGIBLE:
- Works not yet created or not publicly shown
- Works created before March 3, 2023""",

    "notes": """PRIZE: €20,000 (one winner)
Deadline: April 30, 2026

PROCESS:
1. Appel à candidatures (open now)
2. Jury selects 3 finalists
3. Jury designates the laureate

BEST FIT: Cryptographic Beings
- Bio-hybrid digital installation ✓
- Created/exhibited in 2023-2026 window ✓
- Echoes sculpture/installation (Académie discipline) ✓
- Publicly exhibited at multiple venues ✓

SUBMISSION DETAILS:
- Check fondationetrillard.ch for the application form
- Also listed on culture.gouv.fr

ORGANIZERS:
- Fondation Etrillard (Swiss foundation for cultural heritage)
- Académie des Beaux-Arts (Institut de France)

Note: The Fondation Etrillard's main focus is cultural heritage preservation. The digital arts prize is a partnership with the Académie des Beaux-Arts."""
},

# ── Creative Europe Cooperation 2026 ─────────────────────────────
"e4fb5465-2b30-4224-bbc6-4357d0478d70": {
    "eligibility": """PARTIALLY ELIGIBLE — Consortium required

SMALL-SCALE PROJECTS:
- Min 3 partners from 3 different eligible countries
- Max EU grant: €200,000 (80% funding rate)

MEDIUM-SCALE PROJECTS:
- Min 5 partners from 5 different eligible countries  
- Max EU grant: €1,000,000 (70% funding rate)

ELIGIBLE ENTITIES:
- Legal entities (public or private) in Creative Europe participating countries
- EU Member States + associated countries (Iceland, Norway, etc.)
- Individual artists cannot apply — must be through an organisation

NOT ELIGIBLE:
- Exclusively audiovisual projects
- Organisations only from the audiovisual sector

APPLICATION LIMITS:
- 1 application as coordinator per call
- Max 3 applications total (coordinator + partner)""",

    "notes": """Deadline: May 5, 2026 at 17:00 CEST
Budget: ~€60M total, ~150 projects funded

BLOCKER: Michael needs to form/join a consortium with ≥2 other organisations from ≥2 other EU countries.

POTENTIAL PARTNERS:
- Ars Electronica (Austria) — art-science-technology
- Waag Futurelab (Netherlands) — art-science-society
- ZKM (Germany) — media art
- Medialab Prado (Spain) — digital culture
- FACT Liverpool (UK) — not eligible post-Brexit
- Hek Basel (Switzerland) — not EU but may be associated

ACTION NEEDED:
1. Identify potential consortium partners
2. Agree on project concept
3. Designate lead coordinator organisation
4. Michael would need to apply through a French legal entity (association, company)

APPLICATION: via EU Funding & Tenders Portal
https://ec.europa.eu/info/funding-tenders/opportunities/portal/

OBJECTIVES:
- Transnational creation and circulation of European works/artists
- Capacity building for European cultural/creative sectors
- Audience development, innovation, growth"""
},

# ── Fondation Botín 2026-2027 ────────────────────────────────────
"da3d041d-2b93-45f4-b04b-48471cdaea13": {
    "eligibility": """ELIGIBLE ✓

WHO CAN APPLY:
- Artists of any nationality and any age ✓
- Individual applicants only (not collectives)
- One of 6 grants is preferentially reserved for:
  Spanish artist or 5+ year resident of Spain, under 30, planning to relocate abroad

GRANT DETAILS:
- 6 grants of €23,000 each
- Duration: 9 months
- Covers: travel, accommodation, living costs, studio rental, production expenses
- Medical insurance included for artists relocating to another country
- Direct, indivisible, non-transferable
- Incompatible with other institutional aid for same purpose

PURPOSE:
- Training, research, and realization of personal artistic projects
- NOT purely theoretical studies""",

    "notes": """Deadline: May 8, 2026
Jury decision: before July 17, 2026

PAYMENT SCHEDULE:
- 45% at beginning
- 25% in second quarter
- 25% in third quarter
- 5% on approval of final report

EXHIBITION: Collective exhibition "Itinerarios" at Centro Botín (Santander, Spain)

REQUIRED DOCUMENTS:
1. Online registration form (fundacionbotin.org or centrobotin.org)
2. Physical documentation mailed:
   - Printed single-sided, A4 or US letter
   - Max 40 pages
   - No staples or bindings
   - Envelope marked "BECA DE ARTE"
3. Portfolio
4. Audiovisual files on USB stick (PC-formatted)
5. Applications in Spanish or English

BEST FIT: Ultrasound Bio-Printing
- New research project in early stage — perfect for a 9-month research grant
- Combines synthetic biology + acoustics + art
- Could use the grant period to develop the project significantly
- Exhibition at Centro Botín provides international visibility

ALSO POSSIBLE: Cryptographic Beings or Bio Electronic Music"""
},

# ── Résidences Île-de-France ─────────────────────────────────────
"db426333-343f-4f54-b912-957ce2f8d538": {
    "eligibility": """PARTIALLY ELIGIBLE — Requires host structure

PROGRAMME:
- Arts plastiques, numériques et urbains (digital arts eligible ✓)
- Artist receives €2,400 brut/month
- Duration: 2-10 months
- Host structure receives additional subsidy
- Residency starts October 1, 2026

APPLICATION:
- Opens: March 18, 2026
- Closes: May 18, 2026
- The HOST STRUCTURE submits the application (not the artist directly)
- Via "Mes Démarches" platform → "Programme régional de résidences d'artistes - dossier structure"

REQUIREMENTS:
- Artist based in or working with structures in Île-de-France ✓
- Joint application: artist + host structure (gallery, art centre, fablab, cultural association)""",

    "notes": """ACTION NEEDED: Find a host structure in Île-de-France willing to partner

POTENTIAL HOST STRUCTURES:
- A fablab or hackerspace in Paris (e.g. La Paillasse — biology + art)
- A digital art centre (e.g. Le Cube, Gaîté Lyrique)
- A gallery representing Michael's work
- A university lab (e.g. Paris 8, EnsAD)
- CRI / Learning Planet Institute

STIPEND: €2,400/month × 2-10 months = €4,800-€24,000
+ Host structure receives its own subsidy

BEST FIT: Cryptographic Beings (development/exhibition) or Bio Electronic Music (research)

TIMELINE:
- Applications: Mar 18 – May 18, 2026
- Residencies begin: Oct 1, 2026

Source: https://www.iledefrance.fr/"""
},

# ── CNAP Rebond 2026 ─────────────────────────────────────────────
"2babc278-5f90-45ad-8917-755860acd828": {
    "eligibility": """UNCLEAR — Depends on income level

WHO CAN APPLY:
- Professional artists-auteurs in activity
- Fiscally resident in France ✓
- Practicing for ≥5 years ✓ (Michael has extensive career)
- Disciplines: installation, nouveaux médias, sculpture, vidéo, performance, design, etc. ✓

INCOME REQUIREMENTS (must meet one):
- Significant drop or break in artistic income over past 5 years, OR
- Low income (≤ annual SMIC ~€21,622 brut) over past 3 years

NOT FOR:
- Artists in early career
- Specific projects, exhibitions, residencies, or equipment purchase
- Artists who received Rebond in past 24 months

AUTODIDACTS: Eligible if CV/portfolio shows ≥5 years significant career on French art scene""",

    "notes": """Applications: March 31, 2026 (12h) → June 23, 2026 (13h)
Programme duration: 8-10 months starting Jan 2026

THIS IS NOT A PROJECT GRANT — it's career development support.

WHAT YOU GET:
- €4,000 financial support (for time, transport, accommodation)
- 14-day professional development programme:
  - 1 diagnostic + 5 individual sessions (2h each)
  - 4 half-day group sessions (remote)
  - 2 full-day group sessions (Paris + Marseille)
  - Sessions with all programme artists

REQUIRED DOCUMENTS:
1. RIB (bank details) PDF
2. Last 3 tax notices (avis d'imposition 2022, 2023, 2024)
3. 5-year artistic income justification (URSSAF declarations, tax records)
4. Updated artistic CV
5. Portfolio (≥30 captioned, dated visuals)
6. 5 JPEG work images (named with name)

SUBMISSION: Online only via CNAP platform
WEBINARS: June 12 and June 19, 2026 (11h30-12h30)

Supported by Académie des beaux-arts.

⚠️ ELIGIBILITY DEPENDS ON MICHAEL'S INCOME — if artistic income exceeded €21,622/yr in recent years, likely not eligible."""
},

# ── Horizon Europe Artistic Intelligence ──────────────────────────
"e5f58d7d-4dff-4a1a-b657-83fb4f4fba4f": {
    "eligibility": """PARTIALLY ELIGIBLE — Consortium required

CALL: HORIZON-CL2-2026-01-HERITAGE-01 "Artistic Intelligence"
Topic: Harnessing the power of the arts to address complex challenges, enhance soft skills, and boost innovation and competitiveness

TYPICAL CONSORTIUM:
- 5-8 partners from multiple EU countries
- Mix of research institutions, universities, cultural organisations, SMEs
- Led by a research institution or university (typically)

MICHAEL'S ROLE:
- Could participate as an artist-researcher partner
- Would need to join an existing consortium being formed
- Could contribute: bio-art methodology, bio-hybrid systems expertise, installation art

FUNDING: Typically €2M-€3M per consortium
Single-stage evaluation""",

    "notes": """TIMELINE:
- Call opens: May 11-12, 2026
- Deadline: September 22-23, 2026

APPLICATION: via EU Funding & Tenders Portal
https://ec.europa.eu/info/funding-tenders/opportunities/portal/

Horizon Europe applications are complex:
- Part A: Administrative (online form)
- Part B: Technical proposal (typically 30-50 pages)
- Budget tables for each partner
- Letters of commitment from consortium partners

ACTION NEEDED:
1. Monitor the portal from May 2026 when call opens
2. Look for "partner search" listings related to this call
3. Contact art-science networks (e.g. STARTS network, S+T+ARTS)
4. Reach out to universities/labs working on art-science topics

POTENTIAL CONSORTIUM PARTNERS:
- Ars Electronica (AT) — STARTS hub
- Waag Futurelab (NL) — art-science-society
- University of the Arts London (UK) — if associated
- ZKM Karlsruhe (DE) — media art
- CRI / Learning Planet Institute (FR) — interdisciplinary research
- IRCAM (FR) — music + technology

BEST FIT: Ultrasound Bio-Printing or Cryptographic Beings
Both combine art + science + technology in ways that align with "artistic intelligence" """
},

# ── NEB Facility 2026 ─────────────────────────────────────────────
"6310870f-aad2-4fe2-8247-80927735d64d": {
    "eligibility": """PARTIALLY ELIGIBLE — Very large scale, consortium required

SCALE: €3,500,000 – €10,000,000 per project
Duration: 36-48 months
Total budget: €70M for 2026

CONSORTIUM REQUIREMENTS:
- Universities, research centres, local authorities, NGOs, cultural/creative sector
- Interdisciplinary, community-involving approach mandatory
- Neighbourhood-level transformation projects
- Must involve municipalities or local government

THREE DESTINATIONS:
1. Green transformation + social inclusion + local democracy
2. Circular & regenerative approaches for built environment
3. Innovative funding & business models for neighbourhood transformation""",

    "notes": """Deadline: December 1, 2026

⚠️ This is institutional-scale funding. Not realistic as lead applicant for an individual artist.

POSSIBLE ROLE:
- Art-science partner in a larger consortium led by a municipality or research institution
- Contribute bio-art/living materials expertise to a neighbourhood transformation project

ACTION: Only pursue if contacted by a consortium. Otherwise deprioritize.

Source: https://new-european-bauhaus.europa.eu/"""
},

# ── DRAC AIC 2027 ─────────────────────────────────────────────────
"391c941b-3026-4948-ab2a-8066cb3077b6": {
    "eligibility": """ELIGIBLE ✓ (for 2027 cycle)

WHO CAN APPLY:
- Individual artists (particuliers)
- Must reside in Île-de-France ✓
- Professional artist registered with Sécurité sociale des artistes-auteurs
- All visual arts: painting, drawing, sculpture, installation, performance, photography, video, digital art, graphic design, design, fashion ✓

AMOUNT: Up to €8,000 per applicant (typically €5,000-€8,000)
Covers: documentation costs, production, artistic work remuneration

2026 CYCLE (PASSED):
- Deadline: February 28, 2026 (passed)
- Commission: May 13, 2026

2027 CYCLE (EXPECTED):
- Deadline: ~February 2027
- Details to be published ~late 2026""",

    "notes": """NEXT OPPORTUNITY: ~February 2027

SUBMISSION:
- Online via Démarches Simplifiées platform
- Must read the "cahier des charges" guide before applying (download from platform)

REQUIRED DOCUMENTS:
1. Artistic project description
2. Budget breakdown
3. Portfolio / artistic dossier
4. CV
5. Proof of registration with Sécurité sociale des artistes-auteurs

EVALUATION CRITERIA:
- Artistic interest of the project
- Feasibility and conditions of realization
- Professional trajectory of the applicant

ALSO AVAILABLE FROM DRAC:
- Allocation d'installation (for studio setup/equipment)
- Other regional arts support

SOURCE: https://www.culture.gouv.fr/Regions/Drac-Ile-de-France

BEST FIT: Any of the 3 active projects — choose whichever is most compelling at the time.
Ultrasound Bio-Printing might be strongest for 2027 as a newer research-creation project."""
},

# ── Genspace AIR (archived) ───────────────────────────────────────
"425c7071-aa74-4ec1-b990-4ee9da407150": {
    "eligibility": """NOT ELIGIBLE

REQUIRES: Physical presence in Brooklyn, NYC for 6 months (April-October 2026)
Michael is based in Paris, France.

PROGRAMME: 6-month residency at Genspace community biolab
- Free membership + lab access + classes + stipend
- Focus on art through biological tools
- Perfect for bio-art practice but requires NYC relocation""",
    "notes": "Archived — deadline passed (Mar 20). NOT ELIGIBLE: requires NYC residency for 6 months."
},

# ── BBVA Leonardo (archived) ──────────────────────────────────────
"8a3037d1-7e91-467c-a669-1ff3b0ab6d22": {
    "eligibility": """WAS POTENTIALLY ELIGIBLE

- International, interdisciplinary projects welcome
- Researchers and cultural creators
- €30,000-€60,000 for 12-18 months
- Named after Leonardo da Vinci — emphasises interdisciplinary exploration

Deadline March 20, 2026 — already passed.""",
    "notes": "Archived — deadline passed (Mar 20). Was a strong potential match for Michael's interdisciplinary art-science work. Watch for 2027 cycle (~March 2027)."
},

# ── DAC Paris (archived, deadline corrected) ──────────────────────
"3c09f320-80cb-4601-a411-f4a08c368547": {
    "eligibility": """NOT ELIGIBLE (deadline passed)

WAS ELIGIBLE:
- Professional visual artists
- Joint application with a Parisian cultural space
- All mediums including digital art ✓
- Residency must be in Paris ✓
- Residency period: Aug-Dec 2026

Actual deadline: March 9, 2026 at 23:59 (NOT May 15 as originally recorded)""",
    "notes": "Archived — actual deadline was March 9, 2026 (database had incorrect May 15 date). Watch for next cycle (~Feb/Mar 2027). Apply via fondsartcontemporain.paris.fr"
},

# ── Creative Capital (archived) ───────────────────────────────────
"a7fe8054-b3aa-42ae-a56b-72b65dd0e11c": {
    "eligibility": """NOT ELIGIBLE

REQUIRES (all of the following):
- US citizen, permanent resident, Tribal ID holder, or O-1 visa holder
- At least 25 years old
- 5+ years professional artistic practice
- Not enrolled in degree-granting programme
- Not previously received a Creative Capital Award

Michael is France-based without US status.

NOTABLE:
- $50,000 over 3 years
- Bio-art explicitly listed as eligible sub-discipline
- 3-round process: Project Proposal → Project Details → Panel Review""",
    "notes": "Archived — NOT ELIGIBLE: US citizens/residents only. Would be excellent match otherwise (bio-art explicitly eligible, $50k, 3 years). Only pursue if Michael obtains O-1 visa."
},

# ── Fondation de France Rural (archived) ──────────────────────────
"ff1278a7-f5a2-4bfd-8d41-e73e371594e5": {
    "eligibility": """NOT ELIGIBLE

GEOGRAPHIC RESTRICTION:
Exclusively rural areas in: Loire, Rhône, Haute-Savoie, Côte d'Or, Saône-et-Loire
INSEE categories 4, 5, 6, 7 only (rural classifications)
Paris (urban Île-de-France) is excluded.

APPLICANT TYPE:
Must be a structure (association, établissement public) eligible for mécénat
Not for individual artists directly

PURPOSE:
- Anchor professional artistic presence in rural zones
- Year-round artistic activity (not seasonal/events)
- Must have documented relationship with territory""",
    "notes": "Archived — NOT ELIGIBLE. Restricted to specific rural departments in Centre-Est France. Michael is in Paris. Also requires a legal structure (not individual)."
},

# ── CultureAndHealth (archived) ───────────────────────────────────
"33128815-4363-4cbe-ab9d-eec403d0d95b": {
    "eligibility": """NOT ELIGIBLE (this cycle)

TWO-STAGE PROCESS:
- Stage 1 (EOI): closed February 2, 2026
- Stage 2 (Full application): March 30, 2026 — by invitation only for shortlisted applicants

WOULD HAVE BEEN ELIGIBLE:
- Individual artists, collectives, NGOs, or companies
- ≥3 years practicing artist experience
- Must collaborate with non-cultural organisations (hospitals, care homes, social NGOs)
- France is an eligible country ✓
- 8 grants of €8,000 each
- Implementation: May 2026 – April 2027

NOT ELIGIBLE IF:
- Previously received CultureAndHealth financial support""",
    "notes": "Archived — Stage 1 EOI closed Feb 2, 2026. Stage 2 is invite-only. Watch for next cycle. Would need to collaborate with a health/social care organisation."
},

# ── Wellcome Trust (archived) ─────────────────────────────────────
"45bec2f3-323b-41f8-b843-6502f8f3e814": {
    "eligibility": """NOT ELIGIBLE

GEOGRAPHIC RESTRICTION:
Eligible regions: UK, Republic of Ireland, and low-/middle-income countries in:
- Sub-Saharan Africa
- South Asia
- East Asia and Pacific

France is NOT in any eligible region.

PROGRAMME DETAILS (for reference):
- £25,000 to £3,000,000
- Arts, culture, media, heritage projects
- Must engage public with health research
- Rolling deadline""",
    "notes": "Archived — NOT ELIGIBLE. France not in eligible regions (UK/Ireland/LMICs only). Would need UK-based partner or PI."
},

}

# ═══════ APPLY ALL UPDATES ════════════════════════════════════════

print("Updating all grants with detailed research data...\n")
for gid, data in updates.items():
    try:
        r = api("PUT", f"/grants/{gid}", data)
        name = r.get("name", gid)
        print(f"  ✓ {name}")
    except Exception as e:
        print(f"  ✗ {gid}: {e}")

print("\n✅ All grants enriched with detailed research data!")
