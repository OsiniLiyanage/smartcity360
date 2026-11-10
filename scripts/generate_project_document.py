"""Build the editable SmartCity360 Microsoft Word project document.

Dependencies are deliberately separate from the Java application:
    python -m pip install python-docx Pillow

Example:
    python scripts/generate_project_document.py \
      --name "Student name" --nic "NIC" --branch "Branch" \
      --student-id "Student ID" --output SmartCity360_Project_Document.docx

The tracked Markdown source contains no private candidate identifiers. Candidate details
are supplied only when generating a private deliverable.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image
from docx import Document
from docx.enum.section import WD_SECTION, WD_ORIENT
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "submission" / "PROJECT_DOCUMENT_SOURCE.md"
ASSETS = ROOT / "docs" / "submission" / "assets"

BLUE = "1F4E79"
DARK = "17212B"
MUTED = "586879"
LIGHT_BLUE = "DCEAF5"
LIGHT_GREY = "F2F4F6"
MID_GREY = "D9DEE3"
GREEN = "2D7A5D"
LIGHT_GREEN = "E0F1E9"
GOLD = "B7791F"
LIGHT_GOLD = "FFF3D6"
RED = "A63D40"
LIGHT_RED = "F8E2E2"
WHITE = "FFFFFF"


def rgb(value: str) -> RGBColor:
    return RGBColor.from_string(value)


def shade(cell, fill: str):
    tc_pr = cell._tc.get_or_add_tcPr()
    element = tc_pr.find(qn("w:shd"))
    if element is None:
        element = OxmlElement("w:shd")
        tc_pr.append(element)
    element.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=100, bottom=90, end=100):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_cant_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_cell_text(cell, text: str, bold=False, color=DARK, size=9):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.space_before = Pt(0)
    run = paragraph.add_run(text)
    run.bold = bold
    run.font.name = "Calibri"
    run.font.size = Pt(size)
    run.font.color.rgb = rgb(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_margins(cell)


def set_run_font(run, name="Calibri", size=10.5, bold=None, italic=None, color=DARK):
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)
    run.font.size = Pt(size)
    run.font.color.rgb = rgb(color)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def add_field(paragraph, instruction: str, placeholder="Update this field in Microsoft Word"):
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instruction
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = placeholder
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([begin, instr, separate, text, end])
    return run


def set_page_number_format(section, fmt: str, start: int | None = None):
    sect_pr = section._sectPr
    node = sect_pr.find(qn("w:pgNumType"))
    if node is None:
        node = OxmlElement("w:pgNumType")
        sect_pr.append(node)
    node.set(qn("w:fmt"), fmt)
    if start is not None:
        node.set(qn("w:start"), str(start))


def add_page_number(footer, color=MUTED):
    paragraph = footer.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.clear()
    run = add_field(paragraph, " PAGE ", "1")
    set_run_font(run, size=9, color=color)


def add_header(section, text: str):
    section.header.is_linked_to_previous = False
    paragraph = section.header.paragraphs[0]
    paragraph.text = text
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    paragraph.paragraph_format.space_after = Pt(0)
    for run in paragraph.runs:
        set_run_font(run, size=8.5, color=MUTED)
    p_pr = paragraph._p.get_or_add_pPr()
    border = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "4")
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), MID_GREY)
    border.append(bottom)
    p_pr.append(border)


def set_landscape(section):
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width, section.page_height = section.page_height, section.page_width


def configure_document(doc: Document):
    section = doc.sections[0]
    section.page_height = Cm(29.7)
    section.page_width = Cm(21.0)
    section.top_margin = Cm(2.2)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.2)
    section.header_distance = Cm(0.9)
    section.footer_distance = Cm(0.9)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Calibri"
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = rgb(DARK)
    normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    normal.paragraph_format.line_spacing = 1.15
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.widow_control = True

    heading_specs = {
        "Title": (24, BLUE, True),
        "Subtitle": (14, MUTED, False),
        "Heading 1": (16, BLUE, False),
        "Heading 2": (13, BLUE, False),
        "Heading 3": (11.5, DARK, False),
        "Heading 4": (10.5, GREEN, False),
    }
    for name, (size, color, page_break) in heading_specs.items():
        style = styles[name]
        style.font.name = "Calibri"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
        style.font.size = Pt(size)
        style.font.color.rgb = rgb(color)
        if name != "Subtitle":
            style.font.bold = name != "Title" or True
        style.paragraph_format.space_before = Pt(12 if name != "Heading 1" else 0)
        style.paragraph_format.space_after = Pt(7)
        style.paragraph_format.keep_with_next = True
        if page_break:
            style.paragraph_format.page_break_before = True
    styles["Heading 1"].paragraph_format.page_break_before = True

    caption = styles["Caption"]
    caption.font.name = "Calibri"
    caption._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    caption.font.size = Pt(9)
    caption.font.italic = True
    caption.font.color.rgb = rgb(MUTED)
    caption.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    caption.paragraph_format.space_before = Pt(4)
    caption.paragraph_format.space_after = Pt(8)
    caption.paragraph_format.keep_with_next = False

    for style_name in ("List Bullet", "List Number"):
        style = styles[style_name]
        style.font.name = "Calibri"
        style.font.size = Pt(10.5)
        style.paragraph_format.space_after = Pt(3)
        style.paragraph_format.left_indent = Cm(0.7)

    if "Code Block" not in styles:
        style = styles.add_style("Code Block", WD_STYLE_TYPE.PARAGRAPH)
    else:
        style = styles["Code Block"]
    style.font.name = "Consolas"
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "Consolas")
    style.font.size = Pt(8.5)
    style.font.color.rgb = rgb(DARK)
    style.paragraph_format.left_indent = Cm(0.35)
    style.paragraph_format.right_indent = Cm(0.35)
    style.paragraph_format.space_before = Pt(4)
    style.paragraph_format.space_after = Pt(7)
    style.paragraph_format.keep_together = True

    if "Small Note" not in styles:
        note = styles.add_style("Small Note", WD_STYLE_TYPE.PARAGRAPH)
    else:
        note = styles["Small Note"]
    note.font.name = "Calibri"
    note.font.size = Pt(8.5)
    note.font.color.rgb = rgb(MUTED)
    note.paragraph_format.space_after = Pt(5)

    settings = doc.settings._element
    update = settings.find(qn("w:updateFields"))
    if update is None:
        update = OxmlElement("w:updateFields")
        settings.append(update)
    update.set(qn("w:val"), "true")

    doc.core_properties.title = "SmartCity360 - Object Oriented Design Patterns II Project Document"
    doc.core_properties.subject = "SmartCity360 project documentation and design-pattern assessment answers"
    doc.core_properties.author = "A.P.L. Osini Navoda Liyanage"
    doc.core_properties.keywords = "SmartCity360, Decorator, Composite, Chain of Responsibility, Flyweight, Interpreter, Java"
    doc.core_properties.comments = "Editable working draft generated from the SmartCity360 repository."


def add_inline(paragraph, text: str):
    pattern = re.compile(r"(\*\*.+?\*\*|`.+?`|\*[^*]+?\*)")
    cursor = 0
    for match in pattern.finditer(text):
        if match.start() > cursor:
            run = paragraph.add_run(text[cursor:match.start()])
            set_run_font(run)
        token = match.group(0)
        if token.startswith("**"):
            run = paragraph.add_run(token[2:-2])
            set_run_font(run, bold=True)
        elif token.startswith("`"):
            run = paragraph.add_run(token[1:-1])
            set_run_font(run, name="Consolas", size=9, color=BLUE)
            shd = OxmlElement("w:shd")
            shd.set(qn("w:fill"), LIGHT_GREY)
            run._r.get_or_add_rPr().append(shd)
        else:
            run = paragraph.add_run(token[1:-1])
            set_run_font(run, italic=True)
        cursor = match.end()
    if cursor < len(text):
        run = paragraph.add_run(text[cursor:])
        set_run_font(run)


def add_body(doc: Document, text: str, style=None, align=None):
    paragraph = doc.add_paragraph(style=style)
    if align is not None:
        paragraph.alignment = align
    add_inline(paragraph, text)
    return paragraph


def add_status_box(doc: Document, title: str, body: str, color=GOLD, fill=LIGHT_GOLD):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    cell = table.cell(0, 0)
    shade(cell, fill)
    set_cell_margins(cell, top=150, start=170, bottom=150, end=170)
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_after = Pt(3)
    run = paragraph.add_run(title)
    set_run_font(run, size=10, bold=True, color=color)
    paragraph = cell.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(0)
    add_inline(paragraph, body)
    table.rows[0]._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


CAPTION_COUNTERS = {"Figure": 0, "Table": 0}


def add_caption(doc: Document, label: str, title: str):
    CAPTION_COUNTERS[label] = CAPTION_COUNTERS.get(label, 0) + 1
    paragraph = doc.add_paragraph(style="Caption")
    paragraph.paragraph_format.keep_with_next = label == "Table"
    run = paragraph.add_run(f"{label} ")
    set_run_font(run, size=9, italic=True, color=MUTED)
    field_run = add_field(paragraph, f" SEQ {label} \\* ARABIC ", str(CAPTION_COUNTERS[label]))
    set_run_font(field_run, size=9, italic=True, color=MUTED)
    run = paragraph.add_run(f" - {title}")
    set_run_font(run, size=9, italic=True, color=MUTED)
    return paragraph


def add_table(doc: Document, caption: str, headers: list[str], rows: list[list[str]]):
    add_caption(doc, "Table", caption)
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    table.autofit = True
    header = table.rows[0]
    set_repeat_table_header(header)
    set_cant_split(header)
    for idx, value in enumerate(headers):
        shade(header.cells[idx], BLUE)
        set_cell_text(header.cells[idx], value, bold=True, color=WHITE, size=9)
    for row_index, values in enumerate(rows):
        row = table.add_row()
        set_cant_split(row)
        fill = LIGHT_GREY if row_index % 2 == 0 else WHITE
        for idx in range(len(headers)):
            value = values[idx] if idx < len(values) else ""
            shade(row.cells[idx], fill)
            set_cell_text(row.cells[idx], value, bold=False, size=8.5)
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(0)
    return table


def add_figure(doc: Document, path: Path, caption: str, width_inches: float | None = None):
    if not path.exists():
        add_status_box(doc, "Missing figure", f"Expected image was not found: `{path}`", RED, LIGHT_RED)
        return
    with Image.open(path) as image:
        ratio = image.height / image.width
    available_width = width_inches or 6.35
    expected_height = available_width * ratio
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.keep_with_next = True
    run = paragraph.add_run()
    if expected_height > 7.4:
        run.add_picture(str(path), height=Inches(7.25))
    else:
        run.add_picture(str(path), width=Inches(available_width))
    add_caption(doc, "Figure", caption)


def add_code(doc: Document, code: str):
    paragraph = doc.add_paragraph(style="Code Block")
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = paragraph.add_run(code.rstrip())
    set_run_font(run, name="Consolas", size=8.2, color=DARK)
    p_pr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), LIGHT_GREY)
    p_pr.append(shd)
    border = OxmlElement("w:pBdr")
    for edge in ("top", "left", "bottom", "right"):
        node = OxmlElement(f"w:{edge}")
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), "4")
        node.set(qn("w:color"), MID_GREY)
        border.append(node)
    p_pr.append(border)


def parse_table(lines: list[str], start: int):
    raw = []
    i = start
    while i < len(lines) and lines[i].strip().startswith("|"):
        raw.append(lines[i].strip())
        i += 1
    cells = [[cell.strip() for cell in row.strip("|").split("|")] for row in raw]
    if len(cells) >= 2 and all(re.fullmatch(r":?-{3,}:?", value.replace(" ", "")) for value in cells[1]):
        return cells[0], cells[2:], i
    return cells[0], cells[1:], i


def render_markdown(doc: Document, source: Path):
    lines = source.read_text(encoding="utf-8").splitlines()
    i = 0
    pending_table_caption = "Project table"
    while i < len(lines):
        stripped = lines[i].strip()
        if not stripped:
            i += 1
            continue
        if stripped == "[[PAGEBREAK]]":
            doc.add_page_break()
            i += 1
            continue
        status = re.fullmatch(r"\[\[STATUS\|([^|]+)\|(.+)\]\]", stripped)
        if status:
            add_status_box(doc, status.group(1).strip(), status.group(2).strip())
            i += 1
            continue
        caption = re.fullmatch(r"\[\[TABLE\|(.+)\]\]", stripped)
        if caption:
            pending_table_caption = caption.group(1).strip()
            i += 1
            continue
        image_match = re.fullmatch(r"!\[(.+?)\]\((.+?)\)(?:\{width=([0-9.]+)\})?", stripped)
        if image_match:
            path = ROOT / image_match.group(2)
            width = float(image_match.group(3)) if image_match.group(3) else None
            add_figure(doc, path, image_match.group(1), width)
            i += 1
            continue
        heading = re.fullmatch(r"(#{1,4})\s+(.+)", stripped)
        if heading:
            level = len(heading.group(1))
            doc.add_heading(heading.group(2), level=level)
            i += 1
            continue
        if stripped.startswith("```"):
            language = stripped[3:].strip()
            i += 1
            code_lines = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1
            if language:
                p = doc.add_paragraph(style="Small Note")
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(language.upper())
                set_run_font(run, size=8, bold=True, color=BLUE)
            add_code(doc, "\n".join(code_lines))
            continue
        if stripped.startswith("|"):
            headers, rows, i = parse_table(lines, i)
            add_table(doc, pending_table_caption, headers, rows)
            pending_table_caption = "Project table"
            continue
        if re.match(r"[-*]\s+", stripped):
            while i < len(lines) and re.match(r"\s*[-*]\s+", lines[i]):
                item = re.sub(r"^\s*[-*]\s+", "", lines[i])
                paragraph = doc.add_paragraph(style="List Bullet")
                add_inline(paragraph, item)
                i += 1
            continue
        if re.match(r"\d+\.\s+", stripped):
            while i < len(lines) and re.match(r"\s*\d+\.\s+", lines[i]):
                item = re.sub(r"^\s*\d+\.\s+", "", lines[i])
                paragraph = doc.add_paragraph(style="List Number")
                add_inline(paragraph, item)
                i += 1
            continue
        if stripped.startswith(">"):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote_lines.append(lines[i].strip()[1:].strip())
                i += 1
            table = doc.add_table(rows=1, cols=1)
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            cell = table.cell(0, 0)
            shade(cell, LIGHT_BLUE)
            cell.text = ""
            paragraph = cell.paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(0)
            paragraph.paragraph_format.left_indent = Cm(0.15)
            add_inline(paragraph, " ".join(quote_lines))
            set_cell_margins(cell, top=120, start=160, bottom=120, end=160)
            doc.add_paragraph().paragraph_format.space_after = Pt(0)
            continue
        if stripped == "---":
            i += 1
            continue

        paragraph_lines = [stripped]
        i += 1
        while i < len(lines):
            nxt = lines[i].strip()
            if not nxt:
                break
            if (nxt.startswith("#") or nxt.startswith("|") or nxt.startswith("```") or
                    nxt.startswith("![") or nxt.startswith("[[") or nxt.startswith(">") or
                    re.match(r"[-*]\s+", nxt) or re.match(r"\d+\.\s+", nxt) or nxt == "---"):
                break
            paragraph_lines.append(nxt)
            i += 1
        add_body(doc, " ".join(paragraph_lines))


def cover_page(doc: Document, args):
    section = doc.sections[0]
    section.top_margin = Cm(1.0)
    section.bottom_margin = Cm(1.0)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(2.2)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(4)
    p.add_run().add_picture(str(ASSETS / "java-institute-logo.png"), width=Inches(5.8))

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run("Java Institute for Advanced Technology")
    set_run_font(run, size=15, bold=True, color=DARK)

    for value in ("UNIT NAME: OBJECT ORIENTED DESIGN PATTERNS II",
                  "UNIT ID: JIAT/OODP II",
                  "ASSESSMENT ID: JIAT/OODP II/EX/01"):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(value)
        set_run_font(run, size=12, color=DARK)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(20)
    p.paragraph_format.space_after = Pt(2)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("SMARTCITY360")
    set_run_font(run, size=26, bold=True, color=BLUE)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run("A Smart City Management Platform")
    set_run_font(run, size=14, italic=True, color=GREEN)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run("PROJECT DOCUMENT")
    set_run_font(run, size=15, bold=True, color=DARK)

    table = doc.add_table(rows=4, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    details = [("NAME", args.name), ("NIC", args.nic), ("BRANCH", args.branch), ("STUDENT ID", args.student_id)]
    for row, (label, value) in zip(table.rows, details):
        set_cell_text(row.cells[0], label, bold=True, color=DARK, size=9.5)
        set_cell_text(row.cells[1], value, bold=True, color=DARK, size=9.5)
        row.cells[0].width = Cm(3)
        row.cells[1].width = Cm(8)
        for cell in row.cells:
            cell._tc.get_or_add_tcPr().append(OxmlElement("w:tcBorders"))

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(3)
    p.add_run().add_picture(str(ASSETS / "accreditation-logos.png"), width=Inches(5.5))

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    run = p.add_run("WORKING DRAFT - FINAL EVIDENCE AND PAGE FIELDS MUST BE UPDATED BEFORE SUBMISSION")
    set_run_font(run, size=8, bold=True, color=RED)


def candidate_page(doc: Document, args):
    doc.add_page_break()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(ASSETS / "java-institute-logo.png"), width=Inches(4.4))
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("Department of Examinations")
    set_run_font(run, size=14, bold=True, color=DARK)
    data = [
        ("COURSE(S) - (LEADING TO)", "BSc(Hons) in Software Engineering"),
        ("UNIT NAME", "OBJECT ORIENTED DESIGN PATTERNS II"),
        ("UNIT ID", "JIAT/OODP II"),
        ("EXAMINATION ID", "JIAT/OODP II/EX/01"),
        ("NAME", args.name),
        ("ADMISSION NO", args.admission_no),
        ("NIC NO", args.nic),
    ]
    table = doc.add_table(rows=len(data), cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    for idx, (label, value) in enumerate(data):
        shade(table.cell(idx, 0), LIGHT_GREY)
        set_cell_text(table.cell(idx, 0), label, bold=True, size=10)
        set_cell_text(table.cell(idx, 1), value, size=10)
    doc.add_paragraph()
    add_status_box(doc, "Candidate review required",
                   "Confirm the candidate details, official unit identifiers and any institution-specific declaration wording against the portal before final submission.",
                   RED, LIGHT_RED)


def front_matter(doc: Document):
    section = doc.add_section(WD_SECTION.NEW_PAGE)
    section.top_margin = Cm(2.2)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.2)
    section.footer.is_linked_to_previous = False
    section.header.is_linked_to_previous = False
    set_page_number_format(section, "lowerRoman", 1)
    add_page_number(section.footer)

    doc.add_heading("Acknowledgements", level=1)
    add_body(doc, "I would like to thank the lecturers and staff of the Java Institute for Advanced Technology for the lessons, practical guidance and feedback provided during Object Oriented Design Patterns II. The class examples established the pattern structures that were adapted to the SmartCity360 scenarios in this project.")
    add_body(doc, "I am also grateful to the maintainers of Java, Jakarta EE, Payara Community, PostgreSQL, Tailwind CSS and the documentation used while implementing and verifying the application. Finally, I thank my family and friends for their encouragement during the design, implementation and testing process.")

    doc.add_heading("Abstract", level=1)
    add_body(doc, "SmartCity360 is a Java web application that demonstrates how object-oriented design patterns can solve five related smart-city management problems. Decorator composes authentication, compression and encryption around energy-meter messages. Composite represents city, district, street and building zones through one uniform interface. Chain of Responsibility routes resident complaints according to severity. Flyweight shares immutable lamp specifications across many streetlight contexts. Interpreter parses and evaluates a bounded mini-language for city policies.")
    add_body(doc, "The application is packaged as one Maven WAR and runs on Payara Community with Jakarta REST, Jakarta Persistence and PostgreSQL. HTML, compiled Tailwind CSS and plain JavaScript provide role-specific browser workspaces. Supporting account controls, complaint assignment and follow-up, scoped dashboards, filtered complaint reports and configurable themes connect the five assessed scenarios into one product. The repository records 67 Java tests and additional Node and live HTTP checks at its latest checkpoint. Older module checks remain dated evidence and have not all been repeated after every later permission change.")
    add_body(doc, "This document describes the requirements, architecture, data model, implementation and evaluation, and explicitly answers assessment questions A1-A3 through E1-E3. It distinguishes implemented behavior from simulated device operations and planned extensions so that no unverified result is presented as completed evidence.")

    doc.add_heading("Document Status and Evidence Policy", level=1)
    add_status_box(doc, "Working document",
                   "The application is still being refined. This Word file is an editable draft. Update fields, screenshots, final test results, limitations and references after the final acceptance run, then remove draft notices before export to PDF.")
    add_table(doc, "Evidence classification used in this report",
              ["Classification", "Meaning", "How it is written"],
              [
                  ["Implemented and recorded", "Code exists and the repository contains dated verification evidence.", "Described as implemented; the checkpoint date or scope is stated."],
                  ["Implemented, final recheck pending", "Feature exists but a final combined regression or browser/print check remains.", "Described with the remaining verification limit."],
                  ["Planned", "Roadmap item has not been implemented.", "Appears only as planned or future work, never as a completed result."],
                  ["Simulated", "Application performs real software logic without physical municipal hardware.", "Explicitly identified as simulation or demonstration data."],
              ])

    doc.add_heading("Contents", level=1)
    p = doc.add_paragraph(style="Small Note")
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    add_inline(p, "In Microsoft Word, select this page and choose **Update Field -> Update entire table** before final export.")
    toc = doc.add_paragraph()
    add_field(toc, ' TOC \\o "1-4" \\h \\z \\u ', "Table of contents will appear after fields are updated.")

    doc.add_heading("List of Figures", level=1)
    p = doc.add_paragraph(style="Small Note")
    add_inline(p, "Update this field after all figures and captions are final.")
    lof = doc.add_paragraph()
    add_field(lof, ' TOC \\h \\z \\c "Figure" ', "List of figures will appear after fields are updated.")

    doc.add_heading("List of Tables", level=1)
    p = doc.add_paragraph(style="Small Note")
    add_inline(p, "Update this field after all tables and captions are final.")
    lot = doc.add_paragraph()
    add_field(lot, ' TOC \\h \\z \\c "Table" ', "List of tables will appear after fields are updated.")


def main_section(doc: Document):
    section = doc.add_section(WD_SECTION.NEW_PAGE)
    section.top_margin = Cm(2.2)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.2)
    section.footer.is_linked_to_previous = False
    set_page_number_format(section, "decimal", 1)
    add_page_number(section.footer)
    add_header(section, "SmartCity360 | Object Oriented Design Patterns II")


def validate_output(path: Path):
    reopened = Document(path)
    paragraphs = len(reopened.paragraphs)
    tables = len(reopened.tables)
    inline_shapes = len(reopened.inline_shapes)
    if paragraphs < 200 or tables < 10 or inline_shapes < 10:
        raise RuntimeError(f"Generated document appears incomplete: {paragraphs} paragraphs, {tables} tables, {inline_shapes} images")
    return paragraphs, tables, inline_shapes


def args_parser():
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", default="[CONFIRM STUDENT NAME]")
    parser.add_argument("--nic", default="[CONFIRM NIC]")
    parser.add_argument("--branch", default="[CONFIRM BRANCH]")
    parser.add_argument("--student-id", default="[CONFIRM STUDENT ID]")
    parser.add_argument("--admission-no", default="[CONFIRM ADMISSION NUMBER]")
    parser.add_argument("--output", type=Path, default=ROOT / "SmartCity360_Project_Document_Draft.docx")
    return parser.parse_args()


def main():
    args = args_parser()
    if not SOURCE.exists():
        raise SystemExit(f"Missing report source: {SOURCE}")
    doc = Document()
    configure_document(doc)
    cover_page(doc, args)
    candidate_page(doc, args)
    front_matter(doc)
    main_section(doc)
    render_markdown(doc, SOURCE)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(args.output)
    paragraphs, tables, images = validate_output(args.output)
    print(f"Created {args.output}")
    print(f"Validated: {paragraphs} paragraphs, {tables} tables, {images} embedded images")


if __name__ == "__main__":
    main()
