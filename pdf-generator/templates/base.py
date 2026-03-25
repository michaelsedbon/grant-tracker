"""
templates/base.py — Base page template

Shared drawing helpers that all page templates use.
All measurements and styles come from config.py (which reads design_system.yaml).
"""

from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, Spacer, Image as RLImage
from reportlab.lib.colors import Color
from PIL import Image as PILImage
import os
import io
import hashlib

from config import (
    PAGE_W, PAGE_H, PAGE_SIZE, BLEED,
    MARGIN_TOP, MARGIN_BOTTOM, MARGIN_LEFT, MARGIN_RIGHT,
    TEXT_ZONE_W, IMAGE_ZONE_W,
    COLORS, color, font, style,
    PARAGRAPH_SPACING, HEADING_TOP_OFFSET, SUBTITLE_GAP,
    BODY_START_BELOW_SUBTITLE,
    IMG_CACHE_DIR, IMG_CACHE_QUALITY, IMG_CACHE_MAX_PX,
)

# Formats that are already lightweight — skip conversion
_LIGHTWEIGHT_EXTS = {'.jpg', '.jpeg', '.webp'}


def _ensure_jpg(image_path: str) -> str:
    """Return a lightweight JPG version of the image, converting if needed.

    - JPG/JPEG/WEBP inputs are returned as-is (already lightweight).
    - PNG/TIFF/BMP are converted to JPG at IMG_CACHE_QUALITY, capped at
      IMG_CACHE_MAX_PX on the longest edge, and cached in IMG_CACHE_DIR.
    - Subsequent calls return the cached file immediately.
    """
    if not image_path or not os.path.exists(image_path):
        return image_path

    ext = os.path.splitext(image_path)[1].lower()
    if ext in _LIGHTWEIGHT_EXTS:
        return image_path  # already light

    # Build a cache filename from the source basename (strip ext → .jpg)
    base = os.path.splitext(os.path.basename(image_path))[0]
    cached = os.path.join(IMG_CACHE_DIR, f"{base}.jpg")

    # Re-use cache if it exists and is newer than source
    if os.path.exists(cached) and os.path.getmtime(cached) >= os.path.getmtime(image_path):
        return cached

    # Convert & cache
    os.makedirs(IMG_CACHE_DIR, exist_ok=True)
    with PILImage.open(image_path) as img:
        img = img.convert("RGB")
        # Down-scale if larger than max
        w, h = img.size
        longest = max(w, h)
        if longest > IMG_CACHE_MAX_PX:
            ratio = IMG_CACHE_MAX_PX / longest
            img = img.resize((int(w * ratio), int(h * ratio)), PILImage.LANCZOS)
        img.save(cached, "JPEG", quality=IMG_CACHE_QUALITY, optimize=True)

    return cached


class BaseTemplate:
    """Base class for all page templates. Provides shared drawing helpers."""

    def __init__(self, canvas, design_system=None):
        self.c = canvas
        self.ds = design_system  # raw YAML dict, if needed

    # ── Coordinate helpers ────────────────────────────────────
    # ReportLab origin is bottom-left. These convert top-left thinking.

    def y_from_top(self, offset_mm: float) -> float:
        """Convert a distance from the top of the page to ReportLab y."""
        return PAGE_H - (offset_mm * mm)

    def text_zone_right(self) -> float:
        """Right edge of the text zone (x coordinate)."""
        return TEXT_ZONE_W

    def image_zone_left(self) -> float:
        """Left edge of the image zone (x coordinate)."""
        return TEXT_ZONE_W

    # ── Cover-crop image helper ───────────────────────────────
    # "Cover" = scale + crop to fill the target box exactly (no letterbox).
    # Preserves aspect ratio (homothety), crops overflow.

    def _draw_cover_image(self, image_path: str, box_x: float, box_y: float,
                          box_w: float, box_h: float):
        """Draw image covering box exactly. Scales up to fill, crops overflow.
        box_x/y/w/h are in points (ReportLab units)."""
        if not image_path or not os.path.exists(image_path):
            self.c.setFillColor(color("dark_grey"))
            self.c.rect(box_x, box_y, box_w, box_h, fill=1, stroke=0)
            return

        # Use lightweight cached version
        light_path = _ensure_jpg(image_path)

        img = PILImage.open(light_path)
        img_w, img_h = img.size

        # Compute scale so image covers the box (like CSS cover)
        scale_w = box_w / img_w
        scale_h = box_h / img_h
        cover_scale = max(scale_w, scale_h)

        draw_w = img_w * cover_scale
        draw_h = img_h * cover_scale

        # Center the oversize image in the box
        draw_x = box_x + (box_w - draw_w) / 2
        draw_y = box_y + (box_h - draw_h) / 2

        # Clip to the box
        self.c.saveState()
        path = self.c.beginPath()
        path.rect(box_x, box_y, box_w, box_h)
        self.c.clipPath(path, stroke=0)

        self.c.drawImage(
            light_path, draw_x, draw_y, draw_w, draw_h,
            preserveAspectRatio=False, mask='auto'
        )
        self.c.restoreState()

    # ── Full-bleed image ──────────────────────────────────────

    def draw_full_bleed_image(self, image_path: str):
        """Draw an image that fills the entire page, edge to edge."""
        self._draw_cover_image(image_path, 0, 0, PAGE_W, PAGE_H)

    # ── Right-column image ────────────────────────────────────

    def draw_right_column_image(self, image_path: str):
        """Draw an image in the right 40% zone, full height, flush right."""
        x = self.image_zone_left()
        w = IMAGE_ZONE_W
        self._draw_cover_image(image_path, x, 0, w, PAGE_H)

    # ── Text drawing ──────────────────────────────────────────

    def draw_text(self, text: str, style_name: str, x_mm: float, y_from_top_mm: float,
                  max_width_mm: float = None, case: str = None):
        """Draw a single line or short text block at a position."""
        s = style(style_name)
        if max_width_mm is None:
            max_width_mm = (TEXT_ZONE_W / mm) - (x_mm) - (MARGIN_RIGHT / mm)

        # Apply case transform
        display_text = text
        ts = self.ds["type_scale"].get(style_name, {}) if self.ds else {}
        effective_case = case or ts.get("case", "none")
        if effective_case == "uppercase":
            display_text = text.upper()

        p = Paragraph(display_text, s)
        w, h = p.wrap(max_width_mm * mm, PAGE_H)
        p.drawOn(self.c, x_mm * mm, self.y_from_top(y_from_top_mm) - h)
        return h / mm  # return height used, in mm

    def draw_body_text(self, text: str, x_mm: float, y_from_top_mm: float,
                       max_width_mm: float = None) -> float:
        """Draw multiple paragraphs of body text. Returns total height in mm."""
        paragraphs = text.split("\n\n") if "\n\n" in text else [text]
        s = style("body")
        if max_width_mm is None:
            max_width_mm = (TEXT_ZONE_W / mm) - x_mm - (MARGIN_RIGHT / mm)

        total_h = 0
        for i, para_text in enumerate(paragraphs):
            if not para_text.strip():
                continue
            p = Paragraph(para_text.strip(), s)
            w, h = p.wrap(max_width_mm * mm, PAGE_H)
            y = self.y_from_top(y_from_top_mm + total_h) - h
            if y < MARGIN_BOTTOM:
                break  # don't overflow past bottom margin
            p.drawOn(self.c, x_mm * mm, y)
            total_h += (h / mm) + (PARAGRAPH_SPACING / mm)

        return total_h

    # ── Badge ─────────────────────────────────────────────────

    def draw_badge(self, text: str, bg_color_name: str = "accent_yellow",
                   x_from_right_mm: float = 15, y_from_bottom_mm: float = 15,
                   padding_mm: float = 4):
        """Draw a colored badge rectangle with text in the corner."""
        s = style("badge")
        p = Paragraph(text.upper(), s)
        w, h = p.wrap(200, 50)
        box_w = w + (padding_mm * 2 * mm)
        box_h = h + (padding_mm * 2 * mm)
        bx = PAGE_W - (x_from_right_mm * mm) - box_w
        by = y_from_bottom_mm * mm

        self.c.setFillColor(color(bg_color_name))
        self.c.rect(bx, by, box_w, box_h, fill=1, stroke=0)
        p.drawOn(self.c, bx + (padding_mm * mm), by + (padding_mm * mm))

    # ── Semi-transparent overlay ──────────────────────────────

    def draw_overlay_strip(self, x_mm, y_mm, w_mm, h_mm,
                           rgba=(0, 0, 0, 0.4)):
        """Draw a semi-transparent rectangle (for text backing on images)."""
        self.c.saveState()
        self.c.setFillColor(Color(rgba[0], rgba[1], rgba[2], rgba[3]))
        self.c.rect(x_mm * mm, y_mm * mm, w_mm * mm, h_mm * mm, fill=1, stroke=0)
        self.c.restoreState()

    # ── Caption bar ───────────────────────────────────────────

    def draw_caption_bar(self, text: str, bar_height_mm: float = 10):
        """Draw a white caption bar at the bottom center of the page."""
        bar_w = TEXT_ZONE_W * 0.6
        bar_x = (PAGE_W - bar_w) / 2
        bar_y = MARGIN_BOTTOM

        self.c.saveState()
        self.c.setFillColor(Color(1, 1, 1, 0.9))
        self.c.rect(bar_x, bar_y, bar_w, bar_height_mm * mm, fill=1, stroke=0)
        self.c.restoreState()

        s = style("caption")
        p = Paragraph(text, s)
        w, h = p.wrap(bar_w - 10 * mm, bar_height_mm * mm)
        p.drawOn(self.c, bar_x + 5 * mm, bar_y + (bar_height_mm * mm - h) / 2)

    # ── Play button ───────────────────────────────────────────

    def draw_play_button(self, diameter_mm: float = 20):
        """Draw a centered play button circle with triangle."""
        cx = PAGE_W / 2
        cy = PAGE_H / 2
        r = (diameter_mm * mm) / 2

        self.c.saveState()
        self.c.setFillColor(Color(1, 1, 1, 0.8))
        self.c.circle(cx, cy, r, fill=1, stroke=0)

        # Triangle
        self.c.setFillColor(Color(0.3, 0.3, 0.3, 0.9))
        tri_size = r * 0.6
        path = self.c.beginPath()
        path.moveTo(cx - tri_size * 0.4, cy + tri_size * 0.6)
        path.lineTo(cx - tri_size * 0.4, cy - tri_size * 0.6)
        path.lineTo(cx + tri_size * 0.7, cy)
        path.close()
        self.c.drawPath(path, fill=1, stroke=0)
        self.c.restoreState()

    # ── Page background ───────────────────────────────────────

    def fill_background(self, color_name: str = "white"):
        """Fill the entire page with a solid color."""
        self.c.setFillColor(color(color_name))
        self.c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
