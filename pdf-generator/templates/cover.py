"""Cover page — full-bleed hero image + title overlay strip + author + badge."""

from templates.base import BaseTemplate
from config import MARGIN_LEFT, MARGIN_BOTTOM, PAGE_W, PAGE_H, TEXT_ZONE_W, style, mm
from reportlab.platypus import Paragraph
from reportlab.lib.colors import Color


class CoverTemplate(BaseTemplate):

    def render(self, data: dict):
        project = data.get("project", {})
        grant = data.get("grant", {})

        # Full-bleed hero image
        self.draw_full_bleed_image(data.get("cover_image", ""))

        # --- Title: multi-line, anchored from bottom ---
        title = project.get("title", "UNTITLED").upper()
        s = style("cover_title")
        max_w = PAGE_W * 0.65  # allow title to span wider than text zone
        p = Paragraph(title, s)
        w, h = p.wrap(max_w, PAGE_H)

        title_y = 50 * mm  # bottom of title block from page bottom

        # --- Semi-transparent dark strip behind title & author ---
        # The strip extends from left edge to ~70% of page width
        strip_left = 0
        strip_width = PAGE_W * 0.55
        author = project.get("author", "").upper()

        # Calculate strip height: covers title + author + padding
        strip_padding = 8 * mm
        author_h = 0
        if author:
            s_auth = style("cover_author")
            p_auth_tmp = Paragraph(author, s_auth)
            _, author_h = p_auth_tmp.wrap(max_w, PAGE_H)

        strip_bottom = title_y - h - 4 * mm - author_h - strip_padding
        strip_top = title_y + strip_padding
        strip_height = strip_top - strip_bottom

        self.c.saveState()
        self.c.setFillColor(Color(0, 0, 0, 0.45))
        self.c.rect(strip_left, strip_bottom, strip_width, strip_height, fill=1, stroke=0)
        self.c.restoreState()

        # Draw title text on top of the strip
        p.drawOn(self.c, MARGIN_LEFT, title_y)

        # --- Author: below title with gap ---
        if author:
            s_auth = style("cover_author")
            p_auth = Paragraph(author, s_auth)
            w2, h2 = p_auth.wrap(max_w, PAGE_H)
            p_auth.drawOn(self.c, MARGIN_LEFT, title_y - h - 4 * mm)

        # --- Grant badge: bottom right ---
        badge_text = grant.get("name", "")
        if badge_text:
            bg = grant.get("badge_color_token", "accent_yellow")
            self.draw_badge(badge_text, bg_color_name=bg)
