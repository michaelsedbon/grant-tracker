"""Illustration page — full-bleed render + yellow labels + caption."""

from templates.base import BaseTemplate
from config import PAGE_W, PAGE_H, color, style, mm
from reportlab.platypus import Paragraph


class IllustrationTemplate(BaseTemplate):

    def render(self, data: dict):
        section = data if "image" in data else data.get("section", data)

        self.draw_full_bleed_image(section.get("image", ""))

        # Yellow annotation labels
        labels = section.get("labels", [])
        for label in labels:
            text = str(label.get("text", ""))
            # x, y as fractions of page (0.0 – 1.0)
            lx = label.get("x", 0.5) * PAGE_W
            ly = PAGE_H - label.get("y", 0.5) * PAGE_H
            label_size = 8 * mm

            self.c.saveState()
            self.c.setFillColor(color("accent_yellow"))
            self.c.rect(lx - label_size / 2, ly - label_size / 2,
                        label_size, label_size, fill=1, stroke=0)

            s = style("annotation_label")
            p = Paragraph(text, s)
            w, h = p.wrap(label_size, label_size)
            p.drawOn(self.c,
                     lx - w / 2,
                     ly - h / 2)
            self.c.restoreState()

        # Caption bar
        caption = section.get("caption", "")
        if caption:
            self.draw_caption_bar(caption)
