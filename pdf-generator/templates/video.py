"""Video embed page — full-bleed still + play button + caption bar."""

from templates.base import BaseTemplate


class VideoTemplate(BaseTemplate):

    def render(self, data: dict):
        section = data if "image" in data else data.get("section", data)

        self.draw_full_bleed_image(section.get("image", ""))
        self.draw_play_button(diameter_mm=20)

        caption = section.get("caption", "")
        if caption:
            self.draw_caption_bar(caption)
