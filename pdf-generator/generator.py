"""
generator.py — Main entry point for PDF generation

Usage:
    python generator.py --input proposal.json --output output.pdf
    python generator.py --sample  # generate a test PDF with placeholder data
    python generator.py --sample --idml  # also produce InDesign IDML

Reads a JSON file describing the proposal content, selects the correct
template for each section, and renders a multi-page PDF.

All visual design rules come from design_system.yaml via config.py.

Multi-quality export:
    By default, generates three quality tiers:
      - _lossless.pdf  (max quality, no image compression)
      - _standard.pdf  (good quality, moderate compression)
      - _compressed.pdf (small file, heavier compression)
    Use --quality to pick one: lossless | standard | compressed | all (default)

InDesign export:
    Use --idml to also produce an .idml file that InDesign can open and edit.
"""

import argparse
import json
import os
import sys
import subprocess

# Add parent dir to path so templates can import config
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from reportlab.pdfgen import canvas as pdfcanvas
from config import PAGE_SIZE, RAW as DS
from templates import get_template


# ── Quality presets ──────────────────────────────────────────
# Ghostscript settings for each quality tier
QUALITY_PRESETS = {
    "lossless": {
        "suffix": "_lossless",
        "gs_settings": None,  # no GS post-processing, keep original
    },
    "standard": {
        "suffix": "_standard",
        "gs_settings": [
            "-dPDFSETTINGS=/printer",    # 300 dpi, good quality
            "-dColorImageResolution=200",
            "-dGrayImageResolution=200",
        ],
    },
    "compressed": {
        "suffix": "_compressed",
        "gs_settings": [
            "-dPDFSETTINGS=/ebook",      # 150 dpi, smaller file
            "-dColorImageResolution=120",
            "-dGrayImageResolution=120",
        ],
    },
}


def _compress_pdf(input_path: str, output_path: str, gs_settings: list):
    """Compress a PDF using Ghostscript."""
    cmd = [
        "gs", "-q", "-dNOPAUSE", "-dBATCH", "-dSAFER",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.5",
    ] + gs_settings + [
        f"-sOutputFile={output_path}",
        input_path,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def generate_pdf(data: dict, output_path: str, quality: str = "all"):
    """Generate a PDF from proposal data.

    Args:
        data: Proposal content dict.
        output_path: Base output path (e.g. 'output/proposal.pdf').
        quality: 'lossless', 'standard', 'compressed', or 'all'.
    """
    # Strip existing quality suffixes from path for clean base name
    base, ext = os.path.splitext(output_path)
    for preset in QUALITY_PRESETS.values():
        if base.endswith(preset["suffix"]):
            base = base[: -len(preset["suffix"])]
            break

    # Always generate lossless first as source
    lossless_path = f"{base}_lossless{ext}"
    _render_pdf(data, lossless_path)

    # Determine which qualities to produce
    if quality == "all":
        targets = list(QUALITY_PRESETS.keys())
    else:
        targets = [quality]

    results = {}
    for q in targets:
        preset = QUALITY_PRESETS[q]
        out = f"{base}{preset['suffix']}{ext}"

        if q == "lossless":
            results[q] = lossless_path
            size = os.path.getsize(lossless_path)
            print(f"  📄 {q:12s}  →  {out}  ({_human_size(size)})")
            continue

        if preset["gs_settings"] and _compress_pdf(lossless_path, out, preset["gs_settings"]):
            size = os.path.getsize(out)
            results[q] = out
            print(f"  📄 {q:12s}  →  {out}  ({_human_size(size)})")
        else:
            print(f"  ⚠  {q:12s}  →  skipped (ghostscript not available)")

    # Clean up: if 'all' and we only wanted compressed, remove lossless
    # Actually keep all — user asked for all qualities

    return results


def _render_pdf(data: dict, output_path: str):
    """Render the raw PDF (maximum quality, no compression)."""
    c = pdfcanvas.Canvas(output_path, pagesize=PAGE_SIZE)

    # ── Cover page ────────────────────────────────────────────
    cover = get_template("cover", c, DS)
    cover.render(data)
    c.showPage()

    # ── TOC (if auto_generate) ────────────────────────────────
    sections = data.get("sections", [])
    has_toc = any(s.get("type") == "toc" for s in sections)
    if has_toc:
        toc = get_template("toc", c, DS)
        toc.render(data)
        c.showPage()

    # ── Remaining sections ────────────────────────────────────
    for section in sections:
        sec_type = section.get("type", "text_image")
        if sec_type == "toc":
            continue  # already rendered

        try:
            template = get_template(sec_type, c, DS)
        except ValueError as e:
            print(f"⚠ Skipping unknown section type: {sec_type}")
            continue

        template.render(section)
        c.showPage()

    c.save()
    page_count = len([s for s in sections if s.get("type") != "toc"]) + (2 if has_toc else 1)
    print(f"✅ PDF generated: {output_path}")
    print(f"   Pages: {page_count}")


def _human_size(size_bytes: int) -> str:
    """Format bytes as human-readable size."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def sample_data() -> dict:
    """Return sample proposal data for testing."""
    return {
        "project": {
            "title": "CRYPTOGRAPHIC BEINGS",
            "subtitle": "Custom bio reactors & software, motors, kinetic lights",
            "author": "MICHAEL SEDBON"
        },
        "grant": {
            "name": "NOVA",
            "badge_color_token": "accent_yellow"
        },
        "cover_image": "",
        "sections": [
            {"type": "toc", "auto_generate": True},
            {
                "type": "text_image",
                "heading": "CRYPTOGRAPHIC BEINGS",
                "subtitle": "Custom bio reactors & software, motors, kinetic lights, Aegagropila linnaei",
                "body": (
                    "Cryptographic Beings is a technological proposal for a "
                    "\"living hard-drive\" where digital information is stored "
                    "in living (vegetal) media instead of silicon based transistors.\n\n"
                    "The project realises binary logic through photosynthetic "
                    "buoyancy switching: each \"living bit\" is a marimo algae "
                    "sphere. When illuminated, photosynthesis supersaturates "
                    "the sphere with oxygen; micro-bubbles become trapped inside "
                    "its filaments, decreasing its density so the sphere rises."
                ),
                "toc_group": "WORK DESCRIPTION",
                "image": ""
            },
            {
                "type": "text_image",
                "heading": "NOVA Utopia <> Dystopia",
                "subtitle": "Positioning within the curatorial question",
                "body": (
                    "NOVA asks whether AI will guide us toward a glittering "
                    "UTOPIA or pull us into a dark DYSTOPIA.\n\n"
                    "Cryptographic Beings deliberately inhabits the fault-line "
                    "between those extremes."
                ),
                "toc_group": "NOVA",
                "image": ""
            },
            {
                "type": "bio",
                "name": "MICHAEL SEDBON",
                "titles": ["Bio Hybrid computation Design Studio",
                           "Head of Cyber Synthetic Biology @ OXMAN NYC"],
                "bio_text": (
                    "Michael Sedbon is an interaction designer, artist and "
                    "life science researcher currently based in New York.\n\n"
                    "His work explores digital networked technologies and "
                    "systems through their convergence with non-human intelligence."
                ),
                "toc_group": "ABOUT THE ARTIST",
                "portrait": "",
                "contacts": {
                    "Website": "michaelsedbon.com",
                    "Email": "michaelsedbon@gmail.com",
                    "Phone": "+33.6.61.24.09.73"
                }
            },
            {
                "type": "technical_rider",
                "heading": "TECHNICAL RIDER",
                "toc_group": "TECHNICAL RIDER",
                "entries": {
                    "Space Required": "6 m² floor area × 4 m height",
                    "Electricity": "Three 220V plug",
                    "Installation": "2 Days on site",
                    "Dismantling": "2 Days on site",
                    "Start-up": "Single automated start-up routine",
                    "Transportation": "Size: 9m3"
                },
                "image": ""
            }
        ]
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate a grant proposal PDF from JSON data"
    )
    parser.add_argument("--input", "-i", help="Path to proposal JSON file")
    parser.add_argument("--output", "-o", default="proposal.pdf",
                        help="Output PDF base path (default: proposal.pdf)")
    parser.add_argument("--sample", action="store_true",
                        help="Generate a test PDF with sample data")
    parser.add_argument("--quality", "-q", default="all",
                        choices=["lossless", "standard", "compressed", "all"],
                        help="Quality tier (default: all)")
    parser.add_argument("--idml", action="store_true",
                        help="Also export an InDesign IDML file")

    args = parser.parse_args()

    if args.sample:
        data = sample_data()
        generate_pdf(data, args.output, quality=args.quality)
        if args.idml:
            from idml_export import generate_idml
            idml_path = os.path.splitext(args.output)[0] + ".idml"
            generate_idml(data, idml_path)
    elif args.input:
        with open(args.input) as f:
            data = json.load(f)
        generate_pdf(data, args.output, quality=args.quality)
        if args.idml:
            from idml_export import generate_idml
            idml_path = os.path.splitext(args.output)[0] + ".idml"
            generate_idml(data, idml_path)
    else:
        parser.print_help()
        print("\nUse --sample to generate a test PDF, or --input to provide data.")
        print("Add --idml to also produce an InDesign IDML file.")
