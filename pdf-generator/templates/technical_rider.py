"""Technical rider — key :: value table (60%) + right image (40%)."""

from templates.base import BaseTemplate
from config import MARGIN_LEFT, HEADING_TOP_OFFSET, TEXT_ZONE_W, style, mm
from reportlab.platypus import Paragraph


class TechnicalRiderTemplate(BaseTemplate):

    def render(self, data: dict):
        self.fill_background("white")

        section = data if "entries" in data else data.get("section", data)

        # Right-column image
        image = section.get("image", "")
        if image:
            self.draw_right_column_image(image)

        x = MARGIN_LEFT / mm
        y = HEADING_TOP_OFFSET / mm

        # Heading
        heading = section.get("heading", "TECHNICAL RIDER")
        h = self.draw_text(heading, "section_heading", x_mm=x, y_from_top_mm=y)
        y += h + 20

        # Key :: Value pairs
        entries = section.get("entries", {})
        key_style = style("rider_key")
        val_style = style("rider_value")

        key_col_w = 40  # mm
        val_x = x + key_col_w + 8  # after key + delimiter space
        row_spacing = 8  # mm

        for key, value in entries.items():
            # Key
            p_key = Paragraph(key, key_style)
            w, h = p_key.wrap(key_col_w * mm, 50 * mm)
            p_key.drawOn(self.c, x * mm, self.y_from_top(y) - h)

            # Delimiter `::`
            self.c.setFont(key_style.fontName, key_style.fontSize)
            self.c.setFillColor(key_style.textColor)
            self.c.drawString((x + key_col_w + 2) * mm, self.y_from_top(y) - h, "::")

            # Value
            p_val = Paragraph(value, val_style)
            max_val_w = (TEXT_ZONE_W / mm) - val_x - 5
            w2, h2 = p_val.wrap(max_val_w * mm, 50 * mm)
            p_val.drawOn(self.c, val_x * mm, self.y_from_top(y) - max(h, h2))

            y += max(h / mm, h2 / mm) + row_spacing
