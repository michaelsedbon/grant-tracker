#!/usr/bin/env python3
"""
Run this script to update the Grant Tracker database with audit findings.
Usage: python3 update_grants_audit.py

Requires the Grant Tracker to be running on localhost:3009.
"""
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

# ── 1. Archive ineligible grants ──────────────────────────────────
print("Archiving ineligible grants...")
archives = [
    ("3c09f320-80cb-4601-a411-f4a08c368547", {  # DAC Paris
        "deadline": "2026-03-09",
        "archived": True,
        "notes": "Audit: Actual deadline was March 9, 2026 (not May 15). Passed."
    }),
    ("a7fe8054-b3aa-42ae-a56b-72b65dd0e11c", {  # Creative Capital
        "archived": True,
        "notes": "Audit: NOT ELIGIBLE. Requires US citizen/permanent resident/O-1 visa."
    }),
    ("ff1278a7-f5a2-4bfd-8d41-e73e371594e5", {  # Fondation de France Rural
        "archived": True,
        "notes": "Audit: NOT ELIGIBLE. Restricted to rural Loire/Rhone/Haute-Savoie/Cote d'Or/Saone-et-Loire only."
    }),
    ("33128815-4363-4cbe-ab9d-eec403d0d95b", {  # CultureAndHealth
        "archived": True,
        "notes": "Audit: NOT ELIGIBLE. Stage 1 EOI closed Feb 2, 2026. Stage 2 invite-only."
    }),
    ("45bec2f3-323b-41f8-b843-6502f8f3e814", {  # Wellcome Trust
        "archived": True,
        "notes": "Audit: NOT ELIGIBLE. UK/Ireland/LMICs only. France not eligible."
    }),
]

for gid, data in archives:
    try:
        r = api("PUT", f"/grants/{gid}", data)
        print(f"  ✓ Archived: {r['name']}")
    except Exception as e:
        print(f"  ✗ Failed ({gid}): {e}")

# ── 2. Update notes on eligible grants ────────────────────────────
print("\nUpdating notes on eligible grants...")
updates = [
    ("975e6557-fd7a-468a-a6b0-15021986533d", {  # CNAP Acquisition
        "notes": "Audit: College Arts plastiques deadline Mar 2 (passed). College Arts decoratifs/design deadline Apr 1 13h. Commission Oct 7-8."
    }),
    ("7de3b36a-5627-44a5-b56e-9d1edf0a1fce", {  # NEB Prizes
        "notes": "Audit: PRIORITY! Cat 3 Strand A (Champions). Submit Cryptographic Beings. Deadline Mar 22 at 19:00 CET."
    }),
    ("9c2cb30a-3d14-45b9-9a22-7077f0a878f4", {  # Prix Arts Numeriques
        "notes": "Audit: Excellent match. Work must be created 2023-2026, publicly shown. Any nationality, Europe-based."
    }),
    ("da3d041d-2b93-45f4-b04b-48471cdaea13", {  # Fondation Botin
        "notes": "Audit: Any nationality/age. 6 grants x EUR23k for 9 months. Online + physical (A4, max 40pp). Exhibition at Centro Botin."
    }),
    ("2babc278-5f90-45ad-8917-755860acd828", {  # CNAP Rebond
        "notes": "Audit: UNCLEAR eligibility. Requires income < EUR21,622/yr + 5yr career. Not a project grant. EUR4k + 14 days coaching."
    }),
]

for gid, data in updates:
    try:
        r = api("PUT", f"/grants/{gid}", data)
        print(f"  ✓ Updated: {r['name']}")
    except Exception as e:
        print(f"  ✗ Failed ({gid}): {e}")

# ── 3. Create checklists for NEB Prizes (most urgent) ─────────────
print("\nCreating checklist for NEB Prizes 2026...")
# The project-grant link ID for Cryptographic Beings <-> NEB Prizes
NEB_LINK_ID = "416a5070-6384-44a2-9834-69a9ced08c35"

neb_checklist = [
    {"label": "Create account on NEB Prizes platform", "sortOrder": 1},
    {"label": "Prepare project description (Category 3, Strand A)", "sortOrder": 2},
    {"label": "Write project summary highlighting NEB values (sustainability, inclusivity, beauty)", "sortOrder": 3},
    {"label": "Gather high-quality photos/videos of Cryptographic Beings installation", "sortOrder": 4},
    {"label": "Describe transdisciplinary approach (art + biology + CS + electronics)", "sortOrder": 5},
    {"label": "Document project results and impact", "sortOrder": 6},
    {"label": "Explain replicability potential", "sortOrder": 7},
    {"label": "Submit before March 22 19:00 CET", "sortOrder": 8},
]
for item in neb_checklist:
    try:
        api("POST", f"/project-grants/{NEB_LINK_ID}/checklist", item)
        print(f"  ✓ {item['label']}")
    except Exception as e:
        print(f"  ✗ {item['label']}: {e}")

# ── 4. Create checklists for CNAP Acquisition ─────────────────────
print("\nCreating checklist for CNAP Acquisition...")
CNAP_LINK_ID = "5eb5b4eb-720a-4f6a-8f96-efac16665b90"

cnap_checklist = [
    {"label": "Create account on CNAP online platform", "sortOrder": 1},
    {"label": "Write biography (max 1,500 characters)", "sortOrder": 2},
    {"label": "Prepare CV + portfolio PDF (named SEDBON-CV-PORTFOLIO.pdf)", "sortOrder": 3},
    {"label": "Write text of intent for the acquisition proposal", "sortOrder": 4},
    {"label": "Prepare JPEG work visuals (max 5 MB each)", "sortOrder": 5},
    {"label": "Submit before April 1 at 13:00", "sortOrder": 6},
]
for item in cnap_checklist:
    try:
        api("POST", f"/project-grants/{CNAP_LINK_ID}/checklist", item)
        print(f"  ✓ {item['label']}")
    except Exception as e:
        print(f"  ✗ {item['label']}: {e}")

# ── 5. Create checklists for Prix Arts Numériques ──────────────────
print("\nCreating checklist for Prix Arts Numeriques...")
PRIX_LINK_ID = "4c6573b6-bbaf-40d9-a262-2c4fd23103bf"

prix_checklist = [
    {"label": "Select the work to submit (must be created 2023-2026, publicly shown)", "sortOrder": 1},
    {"label": "Document how the work echoes Academie disciplines (sculpture/installation)", "sortOrder": 2},
    {"label": "Prepare high-quality documentation (photos, videos)", "sortOrder": 3},
    {"label": "Write artist statement and project description", "sortOrder": 4},
    {"label": "Submit before April 30, 2026", "sortOrder": 5},
]
for item in prix_checklist:
    try:
        api("POST", f"/project-grants/{PRIX_LINK_ID}/checklist", item)
        print(f"  ✓ {item['label']}")
    except Exception as e:
        print(f"  ✗ {item['label']}: {e}")

# ── 6. Create checklists for Fondation Botin ───────────────────────
print("\nCreating checklist for Fondation Botin...")
BOTIN_LINK_ID = "1daba471-4a10-49a5-970d-a3818bc9dd79"

botin_checklist = [
    {"label": "Complete online registration form (fundacionbotin.org)", "sortOrder": 1},
    {"label": "Prepare project proposal for Ultrasound Bio-Printing research", "sortOrder": 2},
    {"label": "Print docs single-sided A4, max 40 pages, no staples/bindings", "sortOrder": 3},
    {"label": "Prepare portfolio with artistic and research documentation", "sortOrder": 4},
    {"label": "Prepare audiovisual files on USB stick (PC-formatted)", "sortOrder": 5},
    {"label": "Write envelope with BECA DE ARTE", "sortOrder": 6},
    {"label": "Mail physical documents before May 8, 2026", "sortOrder": 7},
]
for item in botin_checklist:
    try:
        api("POST", f"/project-grants/{BOTIN_LINK_ID}/checklist", item)
        print(f"  ✓ {item['label']}")
    except Exception as e:
        print(f"  ✗ {item['label']}: {e}")

print("\n✅ All updates complete!")
