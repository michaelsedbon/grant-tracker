"""Artist bio page — text (65%) + portrait (35%) + icon contact bar.

Matches NOVA style: contact row at bottom with icon-style labels.
"""

from templates.base import BaseTemplate
from config import (
    MARGIN_LEFT, MARGIN_BOTTOM, HEADING_TOP_OFFSET, SUBTITLE_GAP,
    BODY_START_BELOW_SUBTITLE, TEXT_ZONE_W, PAGE_H, PAGE_W,
    style, color, font, mm
)
from reportlab.platypus import Paragraph
from reportlab.lib.colors import Color


# Unicode symbols used as lightweight "icons" for contact types
_CONTACT_ICONS = {
    "Website":   "\u25CF",   # ● filled circle
    "website":   "\u25CF",
    "Instagram": "\u25A0",   # ■ filled square
    "instagram": "\u25A0",
    "Email":     "@",
    "email":     "@",
    "Phone":     "\u260E",   # ☎ phone symbol
    "phone":     "\u260E",
    "Twitter":   "\u25B6",   # ▶ play/arrow
    "twitter":   "\u25B6",
}


class BioTemplate(BaseTemplate):

    def render(self, data: dict):
        self.fill_background("white")

        section = data if "name" in data else data.get("section", data)

        # Portrait in right column
        portrait = section.get("portrait", "")
        if portrait:
            self.draw_right_column_image(portrait)

        x = MARGIN_LEFT / mm
        text_w = (TEXT_ZONE_W / mm) - x - 10  # 10mm gutter before image
        y = HEADING_TOP_OFFSET / mm

        # Name
        name = section.get("name", "")
        if name:
            h = self.draw_text(name, "section_heading", x_mm=x, y_from_top_mm=y,
                               max_width_mm=text_w)
            y += h + (SUBTITLE_GAP / mm)

        # Titles / roles — each on a separate line
        titles = section.get("titles", [])
        if isinstance(titles, str):
            titles = [titles]
        for title_line in titles:
            h = self.draw_text(title_line, "section_subtitle", x_mm=x, y_from_top_mm=y,
                               max_width_mm=text_w)
            y += h + 2  # tight spacing between title lines

        y += (BODY_START_BELOW_SUBTITLE / mm)

        # Bio text — stop before contact bar zone
        bio = section.get("bio_text", "")
        contact_reserve = 20  # mm reserved at bottom for contact bar
        max_body_y = (PAGE_H / mm) - (MARGIN_BOTTOM / mm) - contact_reserve
        if bio:
            paragraphs = bio.split("\n\n") if "\n\n" in bio else [bio]
            s = style("body")
            from config import PARAGRAPH_SPACING
            for para_text in paragraphs:
                if not para_text.strip():
                    continue
                p = Paragraph(para_text.strip(), s)
                w, h = p.wrap(text_w * mm, PAGE_H)
                if y + (h / mm) > max_body_y:
                    break  # don't overflow into contact zone
                p.drawOn(self.c, x * mm, self.y_from_top(y) - h)
                y += (h / mm) + (PARAGRAPH_SPACING / mm)

        # Contact bar — icon + label pairs, horizontally spaced
        contacts = section.get("contacts", {})
        if contacts:
            self._draw_contact_icons(contacts, x, text_w)

    def _draw_contact_icons(self, contacts: dict, x_mm: float, max_w_mm: float):
        """Draw a horizontal row of icon + label contact pairs at the page bottom."""
        s = style("contact")
        contact_y = MARGIN_BOTTOM + 8 * mm

        # Calculate spacing: evenly distribute across the text zone
        items = list(contacts.items())
        if not items:
            return

        available_w = max_w_mm * mm
        item_w = available_w / len(items)
        cur_x = x_mm * mm

        for key, val in items:
            icon_char = _CONTACT_ICONS.get(key, "\u25CF")  # default: filled circle

            # Draw icon character
            self.c.saveState()
            self.c.setFont(s.fontName, s.fontSize + 1)
            self.c.setFillColor(s.textColor)
            self.c.drawString(cur_x, contact_y, icon_char)
            self.c.restoreState()

            # Draw label text after icon
            label_x = cur_x + 6 * mm
            p = Paragraph(str(val), s)
            w, h = p.wrap(item_w - 8 * mm, 15 * mm)
            p.drawOn(self.c, label_x, contact_y - 1 * mm)

            cur_x += item_w
