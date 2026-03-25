"""Full-bleed photo page — atmospheric image, no text."""

from templates.base import BaseTemplate


class FullBleedPhotoTemplate(BaseTemplate):

    def render(self, data: dict):
        section = data if "image" in data else data.get("section", data)
        self.draw_full_bleed_image(section.get("image", ""))
