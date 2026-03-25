"""
config.py — Design System Loader

Reads design_system.yaml and exposes all design tokens as Python objects.
Every template imports from here. NO hardcoded design values anywhere else.
"""

import os
import yaml
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Load YAML ─────────────────────────────────────────────────
_DIR = os.path.dirname(os.path.abspath(__file__))
_YAML_PATH = os.path.join(_DIR, "design_system.yaml")

with open(_YAML_PATH, "r") as f:
    DS = yaml.safe_load(f)

# ── Page ──────────────────────────────────────────────────────
PAGE_W = DS["page"]["width_mm"] * mm
PAGE_H = DS["page"]["height_mm"] * mm
PAGE_SIZE = (PAGE_W, PAGE_H)
BLEED = DS["page"]["bleed_mm"] * mm

# ── Margins ───────────────────────────────────────────────────
MARGIN_TOP = DS["margins"]["top_mm"] * mm
MARGIN_BOTTOM = DS["margins"]["bottom_mm"] * mm
MARGIN_LEFT = DS["margins"]["left_mm"] * mm
MARGIN_RIGHT = DS["margins"]["right_mm"] * mm

# ── Grid ──────────────────────────────────────────────────────
TEXT_ZONE_PCT = DS["grid"]["text_zone_pct"] / 100.0
IMAGE_ZONE_PCT = DS["grid"]["image_zone_pct"] / 100.0
TEXT_ZONE_W = PAGE_W * TEXT_ZONE_PCT
IMAGE_ZONE_W = PAGE_W * IMAGE_ZONE_PCT
TWO_COL_GUTTER = DS["grid"]["two_col_gutter_mm"] * mm

# ── Image Cache ───────────────────────────────────────────────
IMG_CACHE_DIR = os.path.join(_DIR, "output", "img_cache")
IMG_CACHE_QUALITY = 85       # JPG quality for cached images (1-100)
IMG_CACHE_MAX_PX = 3000      # Max dimension (px) for cached images

# ── Colors ────────────────────────────────────────────────────
COLORS = {}
for name, hex_val in DS["colors"].items():
    COLORS[name] = HexColor(hex_val)

def color(name: str) -> HexColor:
    """Look up a color by its YAML token name."""
    return COLORS[name]

# ── Fonts ─────────────────────────────────────────────────────
FONT_DIR = os.path.join(_DIR, "fonts")
FONT_MAP = {}  # weight_name -> registered_font_name

_font_cfg = DS["fonts"]
_family = _font_cfg["family"].replace(" ", "")
_fallback = _font_cfg["fallback"]

for weight_name, filename in _font_cfg["weights"].items():
    font_path = os.path.join(FONT_DIR, filename)
    registered_name = f"{_family}-{weight_name}"
    if os.path.exists(font_path):
        try:
            pdfmetrics.registerFont(TTFont(registered_name, font_path))
            FONT_MAP[weight_name] = registered_name
        except Exception:
            FONT_MAP[weight_name] = _fallback
    else:
        FONT_MAP[weight_name] = _fallback

def font(weight: str) -> str:
    """Return the registered font name for a weight (e.g., 'regular', 'light')."""
    return FONT_MAP.get(weight, _fallback)

# ── Typography Rules ──────────────────────────────────────────
_tr = DS["typography_rules"]
PARAGRAPH_SPACING = _tr["paragraph_spacing_mm"] * mm
HEADING_TOP_OFFSET = _tr["heading_top_offset_mm"] * mm
SUBTITLE_GAP = _tr["subtitle_gap_mm"] * mm
BODY_START_BELOW_SUBTITLE = _tr["body_start_below_subtitle_mm"] * mm

# ── Type Scale → ParagraphStyles ──────────────────────────────
STYLES = {}

for role_name, role_cfg in DS["type_scale"].items():
    color_token = role_cfg.get("color", "black")
    text_color = COLORS.get(color_token, COLORS["black"])

    STYLES[role_name] = ParagraphStyle(
        name=role_name,
        fontName=font(role_cfg["weight"]),
        fontSize=role_cfg["size_pt"],
        leading=role_cfg["leading_pt"],
        tracking=role_cfg.get("tracking_pt", 0),
        textColor=text_color,
        alignment=TA_LEFT,
        spaceAfter=0,
        spaceBefore=0,
    )

def style(role: str) -> ParagraphStyle:
    """Return the ParagraphStyle for a type-scale role (e.g., 'body', 'cover_title')."""
    return STYLES[role]

# ── Template Definitions ──────────────────────────────────────
TEMPLATES = DS.get("templates", {})

def template_def(name: str) -> dict:
    """Return the YAML template definition dict for a page type."""
    return TEMPLATES.get(name, {})

# ── Design Principles ─────────────────────────────────────────
PRINCIPLES = DS.get("principles", [])

# ── Export the raw DS dict for advanced use ────────────────────
RAW = DS
