#!/usr/bin/env python3
"""Populate full, detailed checklists for ALL eligible/partial grants."""
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

# First, get all project-grant links to find the IDs
grants = api("GET", "/grants?archived=all")
link_map = {}  # grant_id -> list of project-grant link IDs
for g in grants:
    for pl in g.get("projectLinks", []):
        link_map.setdefault(g["id"], []).append(pl["id"])

def add_checklist(grant_id, items):
    """Add checklist items to the first project-grant link for this grant."""
    links = link_map.get(grant_id, [])
    if not links:
        print(f"  ⚠ No project link found for grant {grant_id}, skipping")
        return
    link_id = links[0]
    
    # First delete existing checklist items to avoid duplicates
    try:
        existing = api("GET", f"/project-grants/{link_id}/checklist")
        for item in existing:
            api("DELETE", f"/project-grants/{link_id}/checklist/{item['id']}")
    except:
        pass
    
    for i, item in enumerate(items):
        try:
            api("POST", f"/project-grants/{link_id}/checklist", {
                "label": item,
                "sortOrder": i + 1
            })
        except Exception as e:
            print(f"  ✗ {item[:50]}: {e}")

# ═══════════════════════════════════════════════
# CHECKLISTS FOR EACH GRANT
# ═══════════════════════════════════════════════

# 1. NEB Prizes 2026 — already has extensive checklist, skip
print("1. NEB Prizes 2026 — keeping existing 53-item checklist")

# 2. CNAP — Proposer une Acquisition 2026
print("\n2. CNAP Acquisition — full checklist...")
add_checklist("975e6557-fd7a-468a-a6b0-15021986533d", [
    "📋 PRE-APPLICATION",
    "Create/verify account on CNAP online platform (cnap.fr)",
    "Read the Modalités de candidature page carefully",
    "Confirm no other CNAP support received in current year",
    "Confirm no CNAP acquisition in past 2 calendar years",
    "Choose target: Collège Arts décoratifs, design et métiers d'art (deadline Apr 1)",
    "",
    "📝 DOCUMENTS TO PREPARE",
    "Write biography — max 1,500 characters (including spaces)",
    "Prepare CV + portfolio PDF — named SEDBON-CV-PORTFOLIO.pdf",
    "Write text of intent describing the acquisition proposal",
    "Select works to propose for acquisition",
    "Prepare JPEG visuals for each work (max 5 MB each): overall view, details, exhibition views, videostills",
    "Ensure all images are properly captioned with title, date, dimensions, medium",
    "",
    "🎯 SUBMISSION",
    "Upload all documents to CNAP online platform",
    "Review and verify entire dossier",
    "Submit before April 1, 2026 at 13:00 (strict deadline)",
    "",
    "📅 AFTER SUBMISSION",
    "Commission will review: October 7-8, 2026",
    "Wait for results notification",
])
print("  ✓ CNAP Acquisition checklist created")

# 3. Prix Arts Numériques — Fondation Etrillard
print("\n3. Prix Arts Numériques — full checklist...")
add_checklist("9c2cb30a-3d14-45b9-9a22-7077f0a878f4", [
    "📋 ELIGIBILITY CHECK",
    "Confirm European residency (Paris, France ✓)",
    "Select work to submit — must be created between March 3, 2023 and March 3, 2026",
    "Confirm work has been publicly shown/exhibited",
    "Identify which Académie discipline the work echoes (sculpture, architecture, etc.)",
    "Confirm work was NOT submitted to the 1st edition of this prize",
    "",
    "📝 DOCUMENTATION",
    "Write artist statement explaining the work and its digital art dimension",
    "Document how the work connects to Académie des beaux-arts disciplines",
    "Prepare high-resolution photos of the installation (min 5 images)",
    "Prepare video documentation of the work in action (if interactive/kinetic)",
    "Write technical description: materials, technologies, dimensions, process",
    "Compile list of previous exhibitions/showings of the work",
    "",
    "🎯 SUBMISSION",
    "Visit fondationetrillard.ch for the application form",
    "Complete all form fields",
    "Upload documentation files",
    "Submit before April 30, 2026",
    "",
    "📅 AFTER SUBMISSION",
    "Jury selects 3 finalists",
    "Jury designates laureate from the finalists",
    "Prize: €20,000",
])
print("  ✓ Prix Arts Numériques checklist created")

# 4. Fondation Botín Art Grants
print("\n4. Fondation Botín — full checklist...")
add_checklist("da3d041d-2b93-45f4-b04b-48471cdaea13", [
    "📋 PROJECT PLANNING",
    "Define 9-month research/production plan for Ultrasound Bio-Printing",
    "Identify location for the grant period (can relocate internationally)",
    "Create detailed project timeline with milestones",
    "Research if medical insurance is needed (covered by grant for relocation)",
    "",
    "📝 ONLINE APPLICATION",
    "Register on fundacionbotin.org or centrobotin.org",
    "Complete online registration form",
    "Write project proposal in English or Spanish",
    "",
    "📝 PHYSICAL DOCUMENTATION",
    "Prepare printed portfolio: single-sided, A4 or US letter, max 40 pages",
    "Include artistic CV and exhibition history",
    "Include project proposal with budget breakdown",
    "Include images of previous and current work",
    "DO NOT staple or bind the document",
    "Prepare audiovisual files: videos, documentation on USB stick (PC-formatted FAT32/NTFS)",
    "Write 'BECA DE ARTE' clearly on the envelope",
    "",
    "🎯 MAILING",
    "Mail physical documents to Fundación Botín, Santander, Spain",
    "Ensure arrival before May 8, 2026 (account for postal delays!)",
    "Keep tracking number for shipment",
    "",
    "📅 TIMELINE",
    "Jury decision: before July 17, 2026",
    "Payment: 45% upfront, 25% Q2, 25% Q3, 5% on final report",
    "Exhibition 'Itinerarios' at Centro Botín after completion",
])
print("  ✓ Fondation Botín checklist created")

# 5. Creative Europe Cooperation Projects
print("\n5. Creative Europe — full checklist...")
add_checklist("e4fb5465-2b30-4224-bbc6-4357d0478d70", [
    "📋 CONSORTIUM FORMATION (Critical Path)",
    "Identify potential partner organisations in ≥2 other EU countries",
    "Contact shortlist: Ars Electronica (AT), Waag (NL), ZKM (DE), Medialab Prado (ES)",
    "Send partnership proposals with project concept",
    "Agree on project concept and roles with ≥2 partners",
    "Designate lead coordinator (must be a legal entity)",
    "Check: Michael needs a French legal entity (association, company) to participate",
    "If needed: create or join a French association",
    "",
    "📝 APPLICATION PREPARATION",
    "Register on EU Funding & Tenders Portal (ec.europa.eu)",
    "Obtain a PIC number for each partner organisation",
    "Define project objectives aligned with Creative Europe priorities",
    "Write detailed project description and work plan (typically 30+ pages)",
    "Plan activities: creation, co-production, circulation, audience development",
    "Prepare budget: max €200k (small-scale, 80% funding) or €1M (medium-scale, 70%)",
    "Collect partner commitment letters",
    "Prepare CVs of key team members from each partner",
    "",
    "🎯 SUBMISSION",
    "Submit via EU Funding & Tenders Portal",
    "All partners must validate their participation in the portal",
    "Submit before May 5, 2026 at 17:00 CEST",
    "",
    "⚠️ NOTE: Can only apply once as coordinator. Max 3 applications total (coordinator + partner).",
])
print("  ✓ Creative Europe checklist created")

# 6. Programme Régional Résidences IdF
print("\n6. Résidences Île-de-France — full checklist...")
add_checklist("db426333-343f-4f54-b912-957ce2f8d538", [
    "📋 HOST STRUCTURE SEARCH (Critical Path)",
    "Contact La Paillasse (Paris) — biology + art community lab",
    "Contact Le Cube — digital art centre in Île-de-France",
    "Contact Gaîté Lyrique — digital culture venue",
    "Contact CRI / Learning Planet Institute — interdisciplinary research",
    "Contact galleries or art centres representing your work",
    "Present project concept and explain mutual benefits to potential host",
    "Confirm a host structure willing to submit the joint application",
    "",
    "📝 APPLICATION (submitted by HOST STRUCTURE)",
    "Host structure registers on 'Mes Démarches' platform",
    "Host structure selects: 'Programme régional de résidences d'artistes - dossier structure'",
    "Prepare artist dossier: project description, artistic CV, portfolio",
    "Define residency duration (2-10 months, starting Oct 1, 2026)",
    "Prepare budget for production/materials needs",
    "",
    "🎯 SUBMISSION",
    "Host structure submits complete dossier via Mes Démarches",
    "Applications close: May 18, 2026",
    "",
    "💰 STIPEND: €2,400/month × chosen duration",
])
print("  ✓ Résidences IdF checklist created")

# 7. CNAP Rebond
print("\n7. CNAP Rebond — full checklist...")
add_checklist("2babc278-5f90-45ad-8917-755860acd828", [
    "📋 ELIGIBILITY SELF-CHECK",
    "Verify: practicing professionally for ≥5 years",
    "Verify: fiscally resident in France",
    "Verify: artistic income ≤ €21,622 brut/year over past 3 years, OR significant revenue drop over past 5 years",
    "Verify: NOT early-career artist",
    "Verify: no previous Rebond support in past 24 months",
    "",
    "📝 DOCUMENTS TO GATHER",
    "Scan/PDF of RIB (bank details) — complete with IBAN/BIC",
    "Last 3 avis d'imposition (tax notices): 2024 for 2023, 2023 for 2022, 2022 for 2021",
    "5-year artistic income justification: URSSAF declarations, Agessa/MDA statements, tax documents",
    "Updated artistic CV (parcours professionnel)",
    "Portfolio: minimum 30 visuals, each captioned and dated",
    "Select 5 representative JPEG images of your work, named NOM_PRENOM_01.jpg etc.",
    "",
    "🎯 SUBMISSION",
    "Applications open: March 31, 2026 at 12:00",
    "Submit via CNAP online platform",
    "Deadline: June 23, 2026 at 13:00",
    "",
    "📅 AFTER ACCEPTANCE",
    "Programme runs 8-10 months",
    "1 diagnostic meeting + 5 individual 2h sessions",
    "4 half-day group sessions (remote) + 2 full-day group sessions (Paris + Marseille)",
    "Submit financial and qualitative report within 18 months",
    "",
    "ℹ️ WEBINARS: June 12 & June 19, 2026 (11h30-12h30) for Q&A",
])
print("  ✓ CNAP Rebond checklist created")

# 8. Horizon Europe — Artistic Intelligence
print("\n8. Horizon Europe — full checklist...")
add_checklist("e5f58d7d-4dff-4a1a-b657-83fb4f4fba4f", [
    "📋 MONITORING (call opens May 11-12, 2026)",
    "Set calendar reminder for May 11, 2026: call opens",
    "Monitor EU Funding & Tenders Portal for call publication",
    "Read full call text when published",
    "Check for partner search tools on the portal",
    "",
    "🤝 CONSORTIUM SEARCH",
    "Contact STARTS network (S+T+ARTS) about forming/joining a consortium",
    "Reach out to Ars Electronica (AT) — STARTS hub",
    "Contact Waag Futurelab (NL) — art-science-society",
    "Contact ZKM Karlsruhe (DE) — media art",
    "Contact CRI/Learning Planet Institute (FR) — interdisciplinary research",
    "Contact IRCAM (FR) — music + technology",
    "Express interest as artist-researcher partner",
    "",
    "📝 IF JOINING A CONSORTIUM",
    "Prepare partner profile: CV, organization description, expertise",
    "Define role and work package contribution",
    "Prepare budget estimate for your participation",
    "Provide letter of commitment",
    "",
    "🎯 DEADLINE: September 22-23, 2026",
])
print("  ✓ Horizon Europe checklist created")

# 9. DRAC AIC 2027
print("\n9. DRAC AIC 2027 — full checklist...")
add_checklist("391c941b-3026-4948-ab2a-8066cb3077b6", [
    "📋 PREPARATION (deadline ~February 2027)",
    "Verify registration with Sécurité sociale des artistes-auteurs (Urssaf Limousin)",
    "Confirm residency in Île-de-France",
    "Choose which project to submit (consider strongest new work)",
    "",
    "📝 DOCUMENTS TO PREPARE (Jan/Feb 2027)",
    "Download 'cahier des charges' guide when published (~late 2026)",
    "Write detailed artistic project description",
    "Prepare realistic budget breakdown (max €8,000)",
    "Create/update artistic portfolio and dossier",
    "Update CV with recent exhibitions and activities",
    "Gather proof of Sécurité sociale registration",
    "",
    "🎯 SUBMISSION",
    "Register on Démarches Simplifiées platform",
    "Complete online application form",
    "Upload all required documents",
    "Submit before deadline (~February 28, 2027)",
    "",
    "📅 TIMELINE",
    "Commission review: ~May 2027",
    "Notification of results",
    "12-month grant period upon acceptance",
])
print("  ✓ DRAC AIC 2027 checklist created")

# 10. NEB Facility 2026
print("\n10. NEB Facility — full checklist...")
add_checklist("6310870f-aad2-4fe2-8247-80927735d64d", [
    "📋 THIS IS A LONG-SHOT — deprioritize unless contacted by a consortium",
    "Scale: €3.5M - €10M per project — institutional level",
    "Requires: municipality + research centres + cultural sector consortium",
    "",
    "🔍 IF CONTACTED BY A CONSORTIUM",
    "Evaluate if the project aligns with bio-art / bio-hybrid systems expertise",
    "Prepare partner profile and contribution description",
    "Provide CV and portfolio",
    "",
    "📅 Deadline: December 1, 2026",
])
print("  ✓ NEB Facility checklist created")

print("\n✅ All checklists populated!")
