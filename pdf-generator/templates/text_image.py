"""Text + Image — the most common page type.
60% text (heading + subtitle + body) | 40% right-bleed image.
8mm gutter between text zone and image."""

from templates.base import BaseTemplate
from config import (
    MARGIN_LEFT, HEADING_TOP_OFFSET, SUBTITLE_GAP,
    BODY_START_BELOW_SUBTITLE, TEXT_ZONE_W, mm
)

GUTTER_MM = 8  # space between text column and image


class TextImageTemplate(BaseTemplate):

    def render(self, data: dict):
        self.fill_background("white")

        section = data if "heading" in data else data.get("section", data)

        # Right-column image
        image_path = section.get("image", "")
        if image_path:
            self.draw_right_column_image(image_path)

        x = MARGIN_LEFT / mm
        text_w = (TEXT_ZONE_W / mm) - x - GUTTER_MM
        y = HEADING_TOP_OFFSET / mm

        # Heading
        heading = section.get("heading", "")
        if heading:
            h = self.draw_text(heading, "section_heading", x_mm=x,
                               y_from_top_mm=y, max_width_mm=text_w)
            y += h + (SUBTITLE_GAP / mm)

        # Subtitle
        subtitle = section.get("subtitle", "")
        if subtitle:
            h = self.draw_text(subtitle, "section_subtitle", x_mm=x,
                               y_from_top_mm=y, max_width_mm=text_w)
            y += h + (BODY_START_BELOW_SUBTITLE / mm)

        # Body text
        body = section.get("body", "")
        if body:
            self.draw_body_text(body, x_mm=x, y_from_top_mm=y,
                                max_width_mm=text_w)
