"""Dimensions page — full-bleed 3D render with title overlay."""

from templates.base import BaseTemplate
from config import MARGIN_LEFT, PAGE_H, mm


class DimensionsTemplate(BaseTemplate):

    def render(self, data: dict):
        section = data if "image" in data else data.get("section", data)

        self.draw_full_bleed_image(section.get("image", ""))

        label = section.get("heading", "DIMENSIONS")
        self.draw_text(label, "cover_author",
                       x_mm=MARGIN_LEFT / mm,
                       y_from_top_mm=(PAGE_H / mm) - 15)
