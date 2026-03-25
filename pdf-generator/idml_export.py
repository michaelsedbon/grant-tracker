"""
idml_export.py — Generate InDesign IDML files from proposal data

IDML (InDesign Markup Language) is a ZIP archive containing XML files:
  - mimetype              (plain text, must be first entry, uncompressed)
  - designmap.xml         (master manifest — lists all spreads, stories, styles)
  - Resources/Styles.xml  (paragraph + character + object styles)
  - Resources/Preferences.xml
  - Resources/Graphic.xml
  - Spreads/Spread_*.xml  (one per spread — page geometry + placed frames)
  - Stories/Story_*.xml   (text content linked to frames)
  - XML/BackingStory.xml
  - XML/Tags.xml
  - META-INF/container.xml

This module generates a valid IDML that InDesign can open and edit.
All measurements are in points (1 pt = 1/72 inch).
"""

import os
import zipfile
import shutil
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom.minidom import parseString

# ── Constants ─────────────────────────────────────────────────
# A4 landscape in points (same as PDF generator)
PAGE_W_PT = 841.89  # 297 mm
PAGE_H_PT = 595.28  # 210 mm

MARGIN_PT = 42.52   # 15 mm
TEXT_ZONE_PCT = 0.65
IMAGE_ZONE_PCT = 0.35

TEXT_ZONE_W = PAGE_W_PT * TEXT_ZONE_PCT
IMAGE_ZONE_W = PAGE_W_PT * IMAGE_ZONE_PCT


def _pretty_xml(elem):
    """Return pretty-printed XML bytes for an Element."""
    rough = tostring(elem, encoding="unicode", xml_declaration=False)
    dom = parseString(rough)
    pretty = dom.toprettyxml(indent="  ", encoding="UTF-8")
    # Remove extra blank lines minidom adds
    lines = [l for l in pretty.decode("utf-8").split("\n") if l.strip()]
    return "\n".join(lines).encode("utf-8")


def _xml_header():
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'


# ── Unique ID counter ────────────────────────────────────────
_next_id = [100]

def _uid():
    """Generate a unique ID string for IDML elements."""
    _next_id[0] += 1
    return f"u{_next_id[0]:x}"


# ── Style definitions ────────────────────────────────────────

def _build_styles_xml():
    """Build Resources/Styles.xml with paragraph and character styles."""
    root = Element("idPkg:Styles")
    root.set("xmlns:idPkg", "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging")
    root.set("DOMVersion", "8.0")

    # Root paragraph style group
    rpsg = SubElement(root, "RootParagraphStyleGroup")
    rpsg.set("Self", "u10")

    # Default paragraph style
    _add_para_style(rpsg, "ParagraphStyle/$ID/[No Paragraph Style]",
                    "Helvetica Neue", "Regular", 10.5, 16)

    # Our custom styles
    _add_para_style(rpsg, "ParagraphStyle/CoverTitle",
                    "Helvetica Neue", "Regular", 34, 37,
                    capitalization="AllCaps", fill_color="Color/White")
    _add_para_style(rpsg, "ParagraphStyle/CoverAuthor",
                    "Helvetica Neue", "UltraLight", 15, 20,
                    capitalization="AllCaps", fill_color="Color/White")
    _add_para_style(rpsg, "ParagraphStyle/SectionHeading",
                    "Helvetica Neue", "Regular", 30, 35)
    _add_para_style(rpsg, "ParagraphStyle/SectionSubtitle",
                    "Helvetica Neue", "Light", 13.5, 19)
    _add_para_style(rpsg, "ParagraphStyle/Body",
                    "Helvetica Neue", "Light", 10.5, 16)
    _add_para_style(rpsg, "ParagraphStyle/BodyBold",
                    "Helvetica Neue", "Regular", 10.5, 16)
    _add_para_style(rpsg, "ParagraphStyle/TOCCategory",
                    "Helvetica Neue", "Regular", 11.5, 18,
                    capitalization="AllCaps")
    _add_para_style(rpsg, "ParagraphStyle/TOCEntry",
                    "Helvetica Neue", "Regular", 10.5, 18,
                    capitalization="AllCaps")
    _add_para_style(rpsg, "ParagraphStyle/Contact",
                    "Helvetica Neue", "Regular", 9.5, 12)
    _add_para_style(rpsg, "ParagraphStyle/RiderKey",
                    "Helvetica Neue", "Regular", 10.5, 17)
    _add_para_style(rpsg, "ParagraphStyle/RiderValue",
                    "Helvetica Neue", "Light", 10.5, 17,
                    fill_color="Color/DarkGrey")
    _add_para_style(rpsg, "ParagraphStyle/Badge",
                    "Helvetica Neue", "Regular", 12, 12,
                    capitalization="AllCaps")
    _add_para_style(rpsg, "ParagraphStyle/Caption",
                    "Helvetica Neue", "Regular", 10.5, 15)

    # Root character style group
    rcsg = SubElement(root, "RootCharacterStyleGroup")
    rcsg.set("Self", "u11")
    default_char = SubElement(rcsg, "CharacterStyle")
    default_char.set("Self", "CharacterStyle/$ID/[No Character Style]")
    default_char.set("Name", "[No Character Style]")

    # Root object style group
    rosg = SubElement(root, "RootObjectStyleGroup")
    rosg.set("Self", "u12")
    default_obj = SubElement(rosg, "ObjectStyle")
    default_obj.set("Self", "ObjectStyle/$ID/[None]")
    default_obj.set("Name", "[None]")

    # Root table / cell style groups (required even if empty)
    rtsg = SubElement(root, "RootTableStyleGroup")
    rtsg.set("Self", "u13")
    rcesg = SubElement(root, "RootCellStyleGroup")
    rcesg.set("Self", "u14")

    return root


def _add_para_style(parent, self_id, font_family, font_style, size_pt, leading_pt,
                    capitalization=None, fill_color=None):
    """Add a ParagraphStyle element."""
    ps = SubElement(parent, "ParagraphStyle")
    ps.set("Self", self_id)
    ps.set("Name", self_id.split("/")[-1])
    ps.set("FontStyle", font_style)
    ps.set("PointSize", str(size_pt))
    ps.set("AutoLeading", str(leading_pt))

    props = SubElement(ps, "Properties")
    applied_font = SubElement(props, "AppliedFont")
    applied_font.set("type", "string")
    applied_font.text = font_family

    if capitalization:
        ps.set("Capitalization", capitalization)
    if fill_color:
        ps.set("FillColor", fill_color)

    return ps


# ── Color definitions ─────────────────────────────────────────

def _build_graphic_xml():
    """Build Resources/Graphic.xml with color swatches."""
    root = Element("idPkg:Graphic")
    root.set("xmlns:idPkg", "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging")
    root.set("DOMVersion", "8.0")

    # Color group
    colors = [
        ("Color/Black",       "Process", [0, 0, 0]),
        ("Color/White",       "Process", [0, 0, 0, 0]),  # CMYK paper
        ("Color/OffWhite",    "Process", [0, 0, 0.04]),
        ("Color/DarkGrey",    "Process", [0, 0, 0.2]),
        ("Color/MidGrey",     "Process", [0, 0, 0.5]),
        ("Color/AccentYellow","Process", [0, 0.1, 1, 0]),
        ("Color/AccentCoral", "Process", [0, 0.57, 0.68, 0.09]),
    ]

    for name, model, values in colors:
        c = SubElement(root, "Color")
        c.set("Self", name)
        c.set("Name", name.split("/")[1])
        c.set("Model", model)
        c.set("Space", "CMYK")
        c.set("ColorValue", " ".join(str(v) for v in values))

    # Swatch "None"
    sn = SubElement(root, "Swatch")
    sn.set("Self", "Swatch/None")
    sn.set("Name", "None")

    return root


# ── Preferences ───────────────────────────────────────────────

def _build_preferences_xml():
    """Build Resources/Preferences.xml."""
    root = Element("idPkg:Preferences")
    root.set("xmlns:idPkg", "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging")
    root.set("DOMVersion", "8.0")

    doc_pref = SubElement(root, "DocumentPreference")
    doc_pref.set("PageWidth", str(PAGE_W_PT))
    doc_pref.set("PageHeight", str(PAGE_H_PT))
    doc_pref.set("FacingPages", "false")
    doc_pref.set("PagesPerDocument", "1")
    doc_pref.set("DocumentBleedTopOffset", "8.504")  # 3mm
    doc_pref.set("DocumentBleedBottomOffset", "8.504")
    doc_pref.set("DocumentBleedInsideOrLeftOffset", "8.504")
    doc_pref.set("DocumentBleedOutsideOrRightOffset", "8.504")

    margin_pref = SubElement(root, "MarginPreference")
    margin_pref.set("Top", str(MARGIN_PT))
    margin_pref.set("Bottom", str(MARGIN_PT))
    margin_pref.set("Left", str(MARGIN_PT))
    margin_pref.set("Right", str(MARGIN_PT))
    margin_pref.set("ColumnCount", "1")
    margin_pref.set("ColumnGutter", "12")

    return root


# ── Spread builder ────────────────────────────────────────────

def _build_spread(spread_id, page_items):
    """Build a Spread XML element.

    page_items: list of dicts, each with:
      - type: 'text_frame' | 'image_frame' | 'rect'
      - x, y, w, h: geometry in points (origin = top-left of page)
      - story_id: (for text_frame) reference to a Story
      - image_path: (for image_frame) path to linked image
      - fill_color: (for rect) color swatch name
      - fill_tint: (for rect) opacity 0-100
    """
    root = Element("idPkg:Spread")
    root.set("xmlns:idPkg", "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging")
    root.set("DOMVersion", "8.0")

    spread = SubElement(root, "Spread")
    spread.set("Self", spread_id)
    spread.set("PageCount", "1")
    spread.set("BindingLocation", "0")
    spread.set("AllowPageShuffle", "true")

    # Page
    page = SubElement(spread, "Page")
    page.set("Self", f"{spread_id}_page")
    page.set("GeometricBounds", f"0 0 {PAGE_H_PT} {PAGE_W_PT}")
    page.set("ItemTransform", "1 0 0 1 0 0")

    margin = SubElement(page, "MarginPreference")
    margin.set("Top", str(MARGIN_PT))
    margin.set("Bottom", str(MARGIN_PT))
    margin.set("Left", str(MARGIN_PT))
    margin.set("Right", str(MARGIN_PT))
    margin.set("ColumnCount", "1")

    # Place items on the spread
    for item in page_items:
        _place_item(spread, item)

    return root


def _place_item(spread, item):
    """Place a single item (frame) on a spread."""
    item_type = item["type"]
    x = item["x"]
    y = item["y"]
    w = item["w"]
    h = item["h"]

    # GeometricBounds = "top left bottom right"
    bounds = f"{y} {x} {y + h} {x + w}"
    transform = f"1 0 0 1 {x} {y}"

    if item_type == "text_frame":
        tf = SubElement(spread, "TextFrame")
        tf.set("Self", item.get("frame_id", _uid()))
        tf.set("ParentStory", item["story_id"])
        tf.set("GeometricBounds", f"0 0 {h} {w}")
        tf.set("ItemTransform", transform)
        tf.set("ContentType", "TextType")

        props = SubElement(tf, "Properties")
        path_geo = SubElement(props, "PathGeometry")
        path_point_array = SubElement(path_geo, "GeometryPathType")
        path_point_array.set("PathOpen", "false")
        ppa = SubElement(path_point_array, "PathPointArray")
        for px, py in [(0, 0), (w, 0), (w, h), (0, h)]:
            pp = SubElement(ppa, "PathPointType")
            pp.set("Anchor", f"{px} {py}")
            pp.set("LeftDirection", f"{px} {py}")
            pp.set("RightDirection", f"{px} {py}")

        # Text frame options
        tfo = SubElement(tf, "TextFramePreference")
        tfo.set("TextColumnCount", "1")

    elif item_type == "image_frame":
        rect = SubElement(spread, "Rectangle")
        rect.set("Self", item.get("frame_id", _uid()))
        rect.set("GeometricBounds", f"0 0 {h} {w}")
        rect.set("ItemTransform", transform)
        rect.set("ContentType", "GraphicType")

        props = SubElement(rect, "Properties")
        path_geo = SubElement(props, "PathGeometry")
        path_point_array = SubElement(path_geo, "GeometryPathType")
        path_point_array.set("PathOpen", "false")
        ppa = SubElement(path_point_array, "PathPointArray")
        for px, py in [(0, 0), (w, 0), (w, h), (0, h)]:
            pp = SubElement(ppa, "PathPointType")
            pp.set("Anchor", f"{px} {py}")
            pp.set("LeftDirection", f"{px} {py}")
            pp.set("RightDirection", f"{px} {py}")

        # Image placeholder (link reference)
        image_path = item.get("image_path", "")
        if image_path:
            img = SubElement(rect, "Image")
            img.set("Self", _uid())
            link = SubElement(img, "Link")
            link.set("Self", _uid())
            link.set("LinkResourceURI", f"file://{os.path.abspath(image_path)}")
            link.set("StoredState", "Normal")

            # Fit image to frame (cover crop)
            ff = SubElement(img, "FrameFittingOption")
            ff.set("FittingOnEmptyFrame", "FillProportionally")
            ff.set("FittingAlignment", "CenterAnchor")

    elif item_type == "rect":
        rect = SubElement(spread, "Rectangle")
        rect.set("Self", item.get("frame_id", _uid()))
        rect.set("GeometricBounds", f"0 0 {h} {w}")
        rect.set("ItemTransform", transform)
        rect.set("ContentType", "Unassigned")

        fill_color = item.get("fill_color", "Color/Black")
        fill_tint = item.get("fill_tint", 100)
        rect.set("FillColor", fill_color)
        rect.set("FillTint", str(fill_tint))

        props = SubElement(rect, "Properties")
        path_geo = SubElement(props, "PathGeometry")
        path_point_array = SubElement(path_geo, "GeometryPathType")
        path_point_array.set("PathOpen", "false")
        ppa = SubElement(path_point_array, "PathPointArray")
        for px, py in [(0, 0), (w, 0), (w, h), (0, h)]:
            pp = SubElement(ppa, "PathPointType")
            pp.set("Anchor", f"{px} {py}")
            pp.set("LeftDirection", f"{px} {py}")
            pp.set("RightDirection", f"{px} {py}")


# ── Story builder ─────────────────────────────────────────────

def _build_story(story_id, paragraphs):
    """Build a Story XML element.

    paragraphs: list of dicts with:
      - text: string content
      - style: paragraph style reference (e.g. "ParagraphStyle/Body")
    """
    root = Element("idPkg:Story")
    root.set("xmlns:idPkg", "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging")
    root.set("DOMVersion", "8.0")

    story = SubElement(root, "Story")
    story.set("Self", story_id)
    story.set("TrackChanges", "false")
    story.set("StoryTitle", "")

    for i, para in enumerate(paragraphs):
        psr = SubElement(story, "ParagraphStyleRange")
        psr.set("AppliedParagraphStyle", para.get("style", "ParagraphStyle/Body"))

        csr = SubElement(psr, "CharacterStyleRange")
        csr.set("AppliedCharacterStyle", "CharacterStyle/$ID/[No Character Style]")

        content = SubElement(csr, "Content")
        content.text = para.get("text", "")

        # Add paragraph break between paragraphs (except last)
        if i < len(paragraphs) - 1:
            br = SubElement(csr, "Br")

    return root


# ── Design map ────────────────────────────────────────────────

def _build_designmap(spread_ids, story_ids):
    """Build the designmap.xml manifest."""
    root = Element("Document")
    root.set("xmlns:idPkg", "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging")
    root.set("DOMVersion", "8.0")
    root.set("Self", "d")
    root.set("ActiveProcess", "XMP_PROCESS")

    # Reference styles
    pkg_styles = SubElement(root, "idPkg:Styles")
    pkg_styles.set("src", "Resources/Styles.xml")

    # Reference preferences
    pkg_prefs = SubElement(root, "idPkg:Preferences")
    pkg_prefs.set("src", "Resources/Preferences.xml")

    # Reference graphic
    pkg_graphic = SubElement(root, "idPkg:Graphic")
    pkg_graphic.set("src", "Resources/Graphic.xml")

    # Reference spreads
    for sid in spread_ids:
        pkg_spread = SubElement(root, "idPkg:Spread")
        pkg_spread.set("src", f"Spreads/Spread_{sid}.xml")

    # Reference stories
    for st_id in story_ids:
        pkg_story = SubElement(root, "idPkg:Story")
        pkg_story.set("src", f"Stories/Story_{st_id}.xml")

    # Backing story
    pkg_backing = SubElement(root, "idPkg:BackingStory")
    pkg_backing.set("src", "XML/BackingStory.xml")

    # Tags
    pkg_tags = SubElement(root, "idPkg:Tags")
    pkg_tags.set("src", "XML/Tags.xml")

    return root


def _build_backing_story():
    """Build XML/BackingStory.xml (required by IDML spec)."""
    root = Element("idPkg:BackingStory")
    root.set("xmlns:idPkg", "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging")
    root.set("DOMVersion", "8.0")

    story = SubElement(root, "Story")
    story.set("Self", "backstory")
    story.set("TrackChanges", "false")
    story.set("StoryTitle", "$ID/")

    psr = SubElement(story, "ParagraphStyleRange")
    psr.set("AppliedParagraphStyle", "ParagraphStyle/$ID/[No Paragraph Style]")
    csr = SubElement(psr, "CharacterStyleRange")
    csr.set("AppliedCharacterStyle", "CharacterStyle/$ID/[No Character Style]")

    return root


def _build_tags():
    """Build XML/Tags.xml (required by IDML spec)."""
    root = Element("idPkg:Tags")
    root.set("xmlns:idPkg", "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging")
    root.set("DOMVersion", "8.0")

    tag = SubElement(root, "XMLTag")
    tag.set("Self", "XMLTag/Root")
    tag.set("Name", "Root")
    tag.set("TagColor", "Nothing")

    return root


# ── High-level page builders ─────────────────────────────────

def _build_cover_page(data, spread_num):
    """Build spread + stories for a cover page."""
    spread_id = f"spread_{spread_num}"
    project = data.get("project", {})
    title = project.get("title", "UNTITLED")
    author = project.get("author", "")
    grant = data.get("grant", {})
    badge_text = grant.get("name", "")
    cover_image = data.get("cover_image", "")

    items = []
    stories = []
    story_ids = []

    # Full-bleed image frame
    if cover_image and os.path.exists(cover_image):
        items.append({
            "type": "image_frame",
            "x": 0, "y": 0, "w": PAGE_W_PT, "h": PAGE_H_PT,
            "image_path": cover_image,
            "frame_id": _uid(),
        })

    # Dark overlay strip
    strip_y = PAGE_H_PT - 180
    items.append({
        "type": "rect",
        "x": 0, "y": strip_y,
        "w": PAGE_W_PT * 0.55, "h": 130,
        "fill_color": "Color/Black",
        "fill_tint": 45,
        "frame_id": _uid(),
    })

    # Title text frame
    title_story_id = _uid()
    story_ids.append(title_story_id)
    items.append({
        "type": "text_frame",
        "x": MARGIN_PT, "y": strip_y + 15,
        "w": PAGE_W_PT * 0.6, "h": 60,
        "story_id": title_story_id,
        "frame_id": _uid(),
    })
    stories.append(_build_story(title_story_id, [
        {"text": title, "style": "ParagraphStyle/CoverTitle"}
    ]))

    # Author text frame
    if author:
        author_story_id = _uid()
        story_ids.append(author_story_id)
        items.append({
            "type": "text_frame",
            "x": MARGIN_PT, "y": strip_y + 80,
            "w": PAGE_W_PT * 0.5, "h": 30,
            "story_id": author_story_id,
            "frame_id": _uid(),
        })
        stories.append(_build_story(author_story_id, [
            {"text": author, "style": "ParagraphStyle/CoverAuthor"}
        ]))

    # Badge
    if badge_text:
        badge_story_id = _uid()
        story_ids.append(badge_story_id)
        items.append({
            "type": "rect",
            "x": PAGE_W_PT - 130, "y": PAGE_H_PT - 55,
            "w": 110, "h": 30,
            "fill_color": "Color/AccentYellow",
            "fill_tint": 100,
            "frame_id": _uid(),
        })
        items.append({
            "type": "text_frame",
            "x": PAGE_W_PT - 125, "y": PAGE_H_PT - 50,
            "w": 100, "h": 20,
            "story_id": badge_story_id,
            "frame_id": _uid(),
        })
        stories.append(_build_story(badge_story_id, [
            {"text": badge_text, "style": "ParagraphStyle/Badge"}
        ]))

    spread_xml = _build_spread(spread_id, items)
    return spread_id, spread_xml, stories, story_ids


def _build_toc_page(data, spread_num):
    """Build spread + stories for a TOC page."""
    spread_id = f"spread_{spread_num}"
    sections = data.get("sections", [])

    items = []
    stories = []
    story_ids = []

    # Background (off-white would be handled by InDesign; we use a rect)
    items.append({
        "type": "rect",
        "x": 0, "y": 0, "w": PAGE_W_PT, "h": PAGE_H_PT,
        "fill_color": "Color/OffWhite", "fill_tint": 100,
        "frame_id": _uid(),
    })

    # Build TOC content as one story
    toc_story_id = _uid()
    story_ids.append(toc_story_id)

    paras = [{"text": "TABLE OF CONTENTS", "style": "ParagraphStyle/SectionHeading"}]

    skip_types = {"toc", "full_bleed_photo", "full-bleed-photo"}
    page_num = 2
    entry_num = 0
    current_group = None

    for section in sections:
        sec_type = section.get("type", "")
        if sec_type in skip_types:
            page_num += 1
            continue

        heading = section.get("heading") or section.get("caption") or section.get("name") or ""
        if not heading:
            page_num += 1
            continue

        group = section.get("toc_group", "")
        if group and group != current_group:
            current_group = group
            paras.append({"text": "", "style": "ParagraphStyle/Body"})  # spacer
            paras.append({"text": group, "style": "ParagraphStyle/TOCCategory"})

        page_num += 1
        entry_num += 1
        paras.append({
            "text": f"{entry_num}. {heading.upper()}  ......  {page_num}",
            "style": "ParagraphStyle/TOCEntry"
        })

    items.append({
        "type": "text_frame",
        "x": MARGIN_PT, "y": MARGIN_PT,
        "w": PAGE_W_PT * 0.6, "h": PAGE_H_PT - 2 * MARGIN_PT,
        "story_id": toc_story_id,
        "frame_id": _uid(),
    })
    stories.append(_build_story(toc_story_id, paras))

    spread_xml = _build_spread(spread_id, items)
    return spread_id, spread_xml, stories, story_ids


def _build_text_image_page(section, spread_num):
    """Build spread + stories for a text+image page."""
    spread_id = f"spread_{spread_num}"
    items = []
    stories = []
    story_ids = []

    # Right-column image
    image_path = section.get("image", "")
    if image_path and os.path.exists(image_path):
        items.append({
            "type": "image_frame",
            "x": TEXT_ZONE_W, "y": 0,
            "w": IMAGE_ZONE_W, "h": PAGE_H_PT,
            "image_path": image_path,
            "frame_id": _uid(),
        })

    # Text content as one story
    text_story_id = _uid()
    story_ids.append(text_story_id)

    paras = []
    heading = section.get("heading", "")
    if heading:
        paras.append({"text": heading, "style": "ParagraphStyle/SectionHeading"})

    subtitle = section.get("subtitle", "")
    if subtitle:
        paras.append({"text": subtitle, "style": "ParagraphStyle/SectionSubtitle"})

    body = section.get("body", "")
    if body:
        for para_text in body.split("\n\n"):
            if para_text.strip():
                paras.append({"text": para_text.strip(), "style": "ParagraphStyle/Body"})

    gutter = 8 * 2.835  # 8mm in points
    items.append({
        "type": "text_frame",
        "x": MARGIN_PT, "y": MARGIN_PT,
        "w": TEXT_ZONE_W - MARGIN_PT - gutter,
        "h": PAGE_H_PT - 2 * MARGIN_PT,
        "story_id": text_story_id,
        "frame_id": _uid(),
    })
    stories.append(_build_story(text_story_id, paras))

    spread_xml = _build_spread(spread_id, items)
    return spread_id, spread_xml, stories, story_ids


def _build_bio_page(section, spread_num):
    """Build spread + stories for a bio page."""
    spread_id = f"spread_{spread_num}"
    items = []
    stories = []
    story_ids = []

    # Portrait in right column
    portrait = section.get("portrait", "")
    if portrait and os.path.exists(portrait):
        items.append({
            "type": "image_frame",
            "x": TEXT_ZONE_W, "y": 0,
            "w": IMAGE_ZONE_W, "h": PAGE_H_PT,
            "image_path": portrait,
            "frame_id": _uid(),
        })

    # Bio text
    bio_story_id = _uid()
    story_ids.append(bio_story_id)

    paras = []
    name = section.get("name", "")
    if name:
        paras.append({"text": name, "style": "ParagraphStyle/SectionHeading"})

    titles = section.get("titles", [])
    if isinstance(titles, str):
        titles = [titles]
    for t in titles:
        paras.append({"text": t, "style": "ParagraphStyle/SectionSubtitle"})

    bio_text = section.get("bio_text", "")
    if bio_text:
        for para_text in bio_text.split("\n\n"):
            if para_text.strip():
                paras.append({"text": para_text.strip(), "style": "ParagraphStyle/Body"})

    gutter = 10 * 2.835
    items.append({
        "type": "text_frame",
        "x": MARGIN_PT, "y": MARGIN_PT,
        "w": TEXT_ZONE_W - MARGIN_PT - gutter,
        "h": PAGE_H_PT - 2 * MARGIN_PT - 40,
        "story_id": bio_story_id,
        "frame_id": _uid(),
    })
    stories.append(_build_story(bio_story_id, paras))

    # Contact bar
    contacts = section.get("contacts", {})
    if contacts:
        contact_story_id = _uid()
        story_ids.append(contact_story_id)
        contact_parts = [f"{k}: {v}" for k, v in contacts.items()]
        contact_line = "  ·  ".join(contact_parts)
        items.append({
            "type": "text_frame",
            "x": MARGIN_PT, "y": PAGE_H_PT - MARGIN_PT - 25,
            "w": TEXT_ZONE_W - MARGIN_PT - gutter,
            "h": 20,
            "story_id": contact_story_id,
            "frame_id": _uid(),
        })
        stories.append(_build_story(contact_story_id, [
            {"text": contact_line, "style": "ParagraphStyle/Contact"}
        ]))

    spread_xml = _build_spread(spread_id, items)
    return spread_id, spread_xml, stories, story_ids


def _build_technical_rider_page(section, spread_num):
    """Build spread + stories for a technical rider page."""
    spread_id = f"spread_{spread_num}"
    items = []
    stories = []
    story_ids = []

    # Right-column image
    image_path = section.get("image", "")
    if image_path and os.path.exists(image_path):
        items.append({
            "type": "image_frame",
            "x": TEXT_ZONE_W, "y": 0,
            "w": IMAGE_ZONE_W, "h": PAGE_H_PT,
            "image_path": image_path,
            "frame_id": _uid(),
        })

    # Rider content
    rider_story_id = _uid()
    story_ids.append(rider_story_id)

    paras = [{"text": section.get("heading", "TECHNICAL RIDER"),
              "style": "ParagraphStyle/SectionHeading"}]

    entries = section.get("entries", {})
    for key, value in entries.items():
        paras.append({"text": f"{key}  ::  {value}", "style": "ParagraphStyle/RiderKey"})

    gutter = 8 * 2.835
    items.append({
        "type": "text_frame",
        "x": MARGIN_PT, "y": MARGIN_PT,
        "w": TEXT_ZONE_W - MARGIN_PT - gutter,
        "h": PAGE_H_PT - 2 * MARGIN_PT,
        "story_id": rider_story_id,
        "frame_id": _uid(),
    })
    stories.append(_build_story(rider_story_id, paras))

    spread_xml = _build_spread(spread_id, items)
    return spread_id, spread_xml, stories, story_ids


def _build_full_bleed_page(section, spread_num):
    """Build spread for a full-bleed photo page."""
    spread_id = f"spread_{spread_num}"
    items = []

    image_path = section.get("image", "")
    if image_path and os.path.exists(image_path):
        items.append({
            "type": "image_frame",
            "x": 0, "y": 0,
            "w": PAGE_W_PT, "h": PAGE_H_PT,
            "image_path": image_path,
            "frame_id": _uid(),
        })

    spread_xml = _build_spread(spread_id, items)
    return spread_id, spread_xml, [], []


# ── Main export function ──────────────────────────────────────

def generate_idml(data: dict, output_path: str):
    """Generate an IDML file from proposal data.

    Args:
        data: Proposal content dict (same format as PDF generator).
        output_path: Output .idml file path.
    """
    # Reset ID counter
    _next_id[0] = 100

    all_spread_ids = []
    all_spread_xmls = []
    all_stories = []
    all_story_ids = []
    spread_num = 0

    # ── Cover page ────────────────────────────────────────────
    spread_num += 1
    sid, sxml, sts, st_ids = _build_cover_page(data, spread_num)
    all_spread_ids.append(sid)
    all_spread_xmls.append(sxml)
    all_stories.extend(sts)
    all_story_ids.extend(st_ids)

    # ── Sections ──────────────────────────────────────────────
    sections = data.get("sections", [])
    has_toc = any(s.get("type") == "toc" for s in sections)

    if has_toc:
        spread_num += 1
        sid, sxml, sts, st_ids = _build_toc_page(data, spread_num)
        all_spread_ids.append(sid)
        all_spread_xmls.append(sxml)
        all_stories.extend(sts)
        all_story_ids.extend(st_ids)

    for section in sections:
        sec_type = section.get("type", "text_image")
        if sec_type == "toc":
            continue

        spread_num += 1
        builder = {
            "text_image": _build_text_image_page,
            "bio": _build_bio_page,
            "technical_rider": _build_technical_rider_page,
            "full_bleed_photo": _build_full_bleed_page,
            "full-bleed-photo": _build_full_bleed_page,
        }.get(sec_type, _build_text_image_page)

        sid, sxml, sts, st_ids = builder(section, spread_num)
        all_spread_ids.append(sid)
        all_spread_xmls.append(sxml)
        all_stories.extend(sts)
        all_story_ids.extend(st_ids)

    # ── Build resource XMLs ───────────────────────────────────
    styles_xml = _build_styles_xml()
    graphic_xml = _build_graphic_xml()
    prefs_xml = _build_preferences_xml()
    designmap_xml = _build_designmap(all_spread_ids, all_story_ids)
    backing_xml = _build_backing_story()
    tags_xml = _build_tags()

    # ── Write IDML ZIP ────────────────────────────────────────
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # mimetype MUST be first entry, stored uncompressed
        zf.writestr("mimetype", "application/vnd.adobe.indesign-idml-package",
                     compress_type=zipfile.ZIP_STORED)

        # META-INF
        container = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        container += '<container><rootfiles><rootfile full-path="designmap.xml"/></rootfiles></container>'
        zf.writestr("META-INF/container.xml", container)

        # designmap
        zf.writestr("designmap.xml", _pretty_xml(designmap_xml))

        # Resources
        zf.writestr("Resources/Styles.xml", _pretty_xml(styles_xml))
        zf.writestr("Resources/Graphic.xml", _pretty_xml(graphic_xml))
        zf.writestr("Resources/Preferences.xml", _pretty_xml(prefs_xml))

        # Spreads
        for sid, sxml in zip(all_spread_ids, all_spread_xmls):
            zf.writestr(f"Spreads/Spread_{sid}.xml", _pretty_xml(sxml))

        # Stories
        for story_xml, st_id in zip(all_stories, all_story_ids):
            zf.writestr(f"Stories/Story_{st_id}.xml", _pretty_xml(story_xml))

        # XML
        zf.writestr("XML/BackingStory.xml", _pretty_xml(backing_xml))
        zf.writestr("XML/Tags.xml", _pretty_xml(tags_xml))

    file_size = os.path.getsize(output_path)
    print(f"✅ IDML generated: {output_path}")
    print(f"   Spreads: {len(all_spread_ids)}")
    print(f"   Stories: {len(all_story_ids)}")
    print(f"   Size:    {file_size / 1024:.0f} KB")

    return output_path
