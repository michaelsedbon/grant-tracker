"""Section opener — full-bleed dark photo + overlaid title + subtitle."""

from templates.base import BaseTemplate
from config import MARGIN_LEFT, PAGE_W, PAGE_H, style, mm, color
from reportlab.platypus import Paragraph
from reportlab.lib.colors import Color


class SectionOpenerTemplate(BaseTemplate):

    def render(self, data: dict):
        section = data if "image" in data else data.get("section", data)

        self.draw_full_bleed_image(section.get("image", ""))

        # Semi-transparent strip at bottom for text legibility
        self.draw_overlay_strip(0, 0, PAGE_W / mm, 65, rgba=(0, 0, 0, 0.35))

        # Title — multi-line, anchored from bottom
        heading = section.get("heading", "").upper()
        if heading:
            s = style("cover_title")
            max_w = PAGE_W * 0.65
            p = Paragraph(heading, s)
            w, h = p.wrap(max_w, PAGE_H)
            p.drawOn(self.c, MARGIN_LEFT, 35 * mm)

        # Subtitle — below title
        subtitle = section.get("subtitle", "").upper()
        if subtitle:
            s_sub = style("cover_author")
            p_sub = Paragraph(subtitle, s_sub)
            w2, h2 = p_sub.wrap(max_w, PAGE_H)
            p_sub.drawOn(self.c, MARGIN_LEFT, 22 * mm)
