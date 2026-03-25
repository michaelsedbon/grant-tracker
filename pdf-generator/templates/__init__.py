"""
templates/__init__.py — Template Index

Maps template type names (from design_system.yaml) to their Python render classes.
An agent updating this system only needs to:
  1. Edit design_system.yaml for visual changes
  2. Add/modify a template file here for structural changes
  3. Register it in TEMPLATE_INDEX below
"""

from templates.cover import CoverTemplate
from templates.toc import TOCTemplate
from templates.text_image import TextImageTemplate
from templates.video import VideoTemplate
from templates.illustration import IllustrationTemplate
from templates.section_opener import SectionOpenerTemplate
from templates.bio import BioTemplate
from templates.technical_rider import TechnicalRiderTemplate
from templates.full_bleed_photo import FullBleedPhotoTemplate
from templates.dimensions import DimensionsTemplate

# ── TEMPLATE INDEX ────────────────────────────────────────────
# Key = the "type" field in proposal JSON sections
# Value = Template class (must have a render(data) method)
#
# To add a new page type:
#   1. Create templates/my_new_type.py with a class inheriting BaseTemplate
#   2. Add it to this index
#   3. Optionally add a template definition in design_system.yaml

TEMPLATE_INDEX = {
    "cover":            CoverTemplate,
    "toc":              TOCTemplate,
    "text_image":       TextImageTemplate,
    "text-image":       TextImageTemplate,          # alias
    "video":            VideoTemplate,
    "illustration":     IllustrationTemplate,
    "section_opener":   SectionOpenerTemplate,
    "section-opener":   SectionOpenerTemplate,       # alias
    "bio":              BioTemplate,
    "technical_rider":  TechnicalRiderTemplate,
    "technical-rider":  TechnicalRiderTemplate,      # alias
    "full_bleed_photo": FullBleedPhotoTemplate,
    "full-bleed-photo": FullBleedPhotoTemplate,      # alias
    "dimensions":       DimensionsTemplate,
}


def get_template(template_type: str, canvas, design_system=None):
    """Instantiate and return the template class for a given type name."""
    cls = TEMPLATE_INDEX.get(template_type)
    if cls is None:
        raise ValueError(
            f"Unknown template type: '{template_type}'. "
            f"Available: {list(TEMPLATE_INDEX.keys())}"
        )
    return cls(canvas, design_system)
