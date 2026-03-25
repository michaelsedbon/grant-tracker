"""Table of Contents — auto-generated from sections list.

Matches NOVA style: numbered entries, underlined headings, dot-leader fills.
"""

from templates.base import BaseTemplate
from config import (
    MARGIN_LEFT, HEADING_TOP_OFFSET, style, color, mm, PAGE_W, PAGE_H
)
from reportlab.platypus import Paragraph

# Template types that should be excluded from the TOC
_SKIP_TYPES = {"toc", "full_bleed_photo", "full-bleed-photo"}


class TOCTemplate(BaseTemplate):

    def render(self, data: dict):
        self.fill_background("off_white")

        # Title
        self.draw_text("TABLE OF CONTENTS", "section_heading",
                       x_mm=MARGIN_LEFT / mm,
                       y_from_top_mm=HEADING_TOP_OFFSET / mm)

        sections = data.get("sections", [])
        y_offset = (HEADING_TOP_OFFSET / mm) + 25
        current_group = None
        page_num = 2  # cover is page 1, TOC is page 2
        entry_num = 0  # sequential entry numbering

        for section in sections:
            sec_type = section.get("type", "")

            # Skip types that shouldn't appear in TOC
            if sec_type in _SKIP_TYPES:
                page_num += 1
                continue

            # Derive display name: use heading, then caption, then name
            heading = (section.get("heading")
                       or section.get("caption")
                       or section.get("name")
                       or "")
            if not heading:
                page_num += 1
                continue

            group = section.get("toc_group", "")

            # Group header
            if group and group != current_group:
                current_group = group
                if y_offset > (HEADING_TOP_OFFSET / mm) + 26:
                    y_offset += 4  # extra space between groups
                self.draw_text(group, "toc_category",
                               x_mm=MARGIN_LEFT / mm,
                               y_from_top_mm=y_offset)
                y_offset += 8

            # Entry with numbering, underline, and dot leader
            page_num += 1
            entry_num += 1
            entry_x = (MARGIN_LEFT / mm) + 8
            entry_w = (PAGE_W * 0.40) / mm  # tighter to leave room for dots

            # Draw numbered entry: "1. HEADING"
            numbered_heading = f"{entry_num}. {heading.upper()}"
            s = style("toc_entry")

            # Draw the text
            self.draw_text(numbered_heading, "toc_entry",
                           x_mm=entry_x,
                           y_from_top_mm=y_offset,
                           max_width_mm=entry_w)

            # Underline beneath the entry text
            underline_y = self.y_from_top(y_offset) - s.fontSize - 2
            text_end_x = entry_x + min(entry_w, len(numbered_heading) * s.fontSize * 0.45)
            self.c.saveState()
            self.c.setStrokeColor(color("black"))
            self.c.setLineWidth(0.5)
            self.c.line(entry_x * mm, underline_y,
                        text_end_x * mm, underline_y)
            self.c.restoreState()

            # Page number on the right
            num_str = str(page_num)
            self.c.setFont(s.fontName, s.fontSize)
            self.c.setFillColor(s.textColor)
            num_x = (PAGE_W * 0.55) / mm
            self.c.drawString(num_x * mm,
                              self.y_from_top(y_offset) - s.fontSize,
                              num_str)

            # Dot leader between entry and page number
            self.c.setFillColor(color("mid_grey"))
            dots_start = entry_x + entry_w + 2
            dots_end = num_x - 2
            dot_y = self.y_from_top(y_offset) - s.fontSize + 2
            if dots_end > dots_start:
                dot_text = " . " * int((dots_end - dots_start) / 3)
                self.c.setFont(s.fontName, 8)
                self.c.drawString(dots_start * mm, dot_y, dot_text)

            y_offset += 6
