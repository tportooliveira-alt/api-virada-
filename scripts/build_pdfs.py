"""
Gera os PDFs diagramados do produto "O Código da Virada Financeira".

Saída: public/downloads/
- ebook-codigo-da-virada.pdf  (com capa + sumário)
- bonus-50-ideias.pdf
- roteiro-negociacao.pdf
- plano-7-dias.pdf
- checklist-mensal.pdf

Formato A5 (148 x 210 mm), tema claro, cabeçalhos em destaque verde/dourado.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


# ----------------------------------------------------------------------
# Paleta e tipografia
# ----------------------------------------------------------------------
BG_DARK = colors.HexColor("#07111F")
GREEN = colors.HexColor("#16A34A")
GREEN_SOFT = colors.HexColor("#22C55E")
GOLD = colors.HexColor("#D4A017")
GOLD_SOFT = colors.HexColor("#F5C542")
INK = colors.HexColor("#0F172A")
INK_MUTED = colors.HexColor("#475569")
INK_SUBTLE = colors.HexColor("#94A3B8")
PAPER = colors.HexColor("#FFFFFF")
PAPER_ALT = colors.HexColor("#F8FAFC")
RULE = colors.HexColor("#E2E8F0")

PAGE_W, PAGE_H = A5
MARGIN_LR = 16 * mm
MARGIN_TB = 18 * mm

# ----------------------------------------------------------------------
# Estilos de parágrafo
# ----------------------------------------------------------------------
base_styles = getSampleStyleSheet()


def make_styles() -> dict[str, ParagraphStyle]:
    body_font = "Helvetica"
    heading_font = "Helvetica-Bold"

    s: dict[str, ParagraphStyle] = {}

    s["body"] = ParagraphStyle(
        "body",
        parent=base_styles["BodyText"],
        fontName=body_font,
        fontSize=10.5,
        leading=16,
        textColor=INK,
        alignment=TA_JUSTIFY,
        spaceAfter=8,
    )

    s["lead"] = ParagraphStyle(
        "lead",
        parent=s["body"],
        fontSize=11.5,
        leading=18,
        textColor=INK,
        alignment=TA_LEFT,
        spaceAfter=10,
    )

    s["h1"] = ParagraphStyle(
        "h1",
        fontName=heading_font,
        fontSize=24,
        leading=30,
        textColor=INK,
        spaceBefore=4,
        spaceAfter=14,
        alignment=TA_LEFT,
    )

    s["h2"] = ParagraphStyle(
        "h2",
        fontName=heading_font,
        fontSize=17,
        leading=22,
        textColor=GREEN,
        spaceBefore=18,
        spaceAfter=8,
        alignment=TA_LEFT,
    )

    s["h3"] = ParagraphStyle(
        "h3",
        fontName=heading_font,
        fontSize=13,
        leading=18,
        textColor=GOLD,
        spaceBefore=12,
        spaceAfter=6,
        alignment=TA_LEFT,
    )

    s["bullet"] = ParagraphStyle(
        "bullet",
        parent=s["body"],
        leftIndent=14,
        bulletIndent=4,
        spaceAfter=4,
        alignment=TA_LEFT,
    )

    s["numbered"] = ParagraphStyle(
        "numbered",
        parent=s["body"],
        leftIndent=18,
        bulletIndent=4,
        spaceAfter=4,
        alignment=TA_LEFT,
    )

    s["quote"] = ParagraphStyle(
        "quote",
        parent=s["body"],
        leftIndent=18,
        rightIndent=12,
        textColor=INK_MUTED,
        fontName="Helvetica-Oblique",
        spaceBefore=8,
        spaceAfter=10,
    )

    s["caption"] = ParagraphStyle(
        "caption",
        fontName=body_font,
        fontSize=9,
        textColor=INK_SUBTLE,
        leading=12,
        alignment=TA_CENTER,
    )

    s["cover_kicker"] = ParagraphStyle(
        "cover_kicker",
        fontName=heading_font,
        fontSize=10,
        textColor=GOLD_SOFT,
        leading=14,
        alignment=TA_CENTER,
        spaceAfter=4,
    )

    s["cover_title"] = ParagraphStyle(
        "cover_title",
        fontName=heading_font,
        fontSize=34,
        textColor=PAPER,
        leading=40,
        alignment=TA_CENTER,
        spaceBefore=8,
        spaceAfter=10,
    )

    s["cover_sub"] = ParagraphStyle(
        "cover_sub",
        fontName="Helvetica",
        fontSize=12,
        textColor=colors.HexColor("#CBD5E1"),
        leading=18,
        alignment=TA_CENTER,
        spaceAfter=10,
    )

    s["cover_author"] = ParagraphStyle(
        "cover_author",
        fontName=heading_font,
        fontSize=10,
        textColor=GREEN_SOFT,
        leading=14,
        alignment=TA_CENTER,
    )

    s["toc_h1"] = ParagraphStyle(
        "toc_h1",
        fontName=heading_font,
        fontSize=20,
        textColor=INK,
        leading=26,
        spaceAfter=14,
    )

    s["toc_item"] = ParagraphStyle(
        "toc_item",
        fontName=body_font,
        fontSize=11,
        textColor=INK,
        leading=18,
        spaceAfter=2,
    )

    return s


# ----------------------------------------------------------------------
# Markdown -> Flowables (parser leve, suficiente para nossos arquivos)
# ----------------------------------------------------------------------

INLINE_BOLD = re.compile(r"\*\*(.+?)\*\*")
INLINE_ITALIC = re.compile(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)")
INLINE_CODE = re.compile(r"`([^`]+)`")


def inline_md_to_html(text: str) -> str:
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = INLINE_BOLD.sub(r"<b>\1</b>", text)
    text = INLINE_ITALIC.sub(r"<i>\1</i>", text)
    text = INLINE_CODE.sub(r'<font face="Courier" color="#0F172A">\1</font>', text)
    return text


def md_to_flowables(md_text: str, styles: dict[str, ParagraphStyle]) -> list:
    flows: list = []
    lines = md_text.splitlines()
    i = 0
    in_code = False
    code_buf: list[str] = []
    paragraph_buf: list[str] = []
    h2_count = 0

    def flush_paragraph():
        if paragraph_buf:
            txt = " ".join(paragraph_buf).strip()
            if txt:
                flows.append(Paragraph(inline_md_to_html(txt), styles["body"]))
            paragraph_buf.clear()

    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip()

        if line.startswith("```"):
            flush_paragraph()
            in_code = not in_code
            if not in_code and code_buf:
                code_text = "<br/>".join(
                    inline_md_to_html(l) for l in code_buf
                )
                flows.append(
                    Paragraph(
                        f'<font face="Courier" size="9">{code_text}</font>',
                        styles["body"],
                    )
                )
                code_buf.clear()
            i += 1
            continue

        if in_code:
            code_buf.append(raw)
            i += 1
            continue

        if not line.strip():
            flush_paragraph()
            i += 1
            continue

        if line.startswith("# "):
            flush_paragraph()
            flows.append(Paragraph(inline_md_to_html(line[2:].strip()), styles["h1"]))
            i += 1
            continue

        if line.startswith("## "):
            flush_paragraph()
            h2_count += 1
            anchor = f'<a name="sec{h2_count}"/>'
            flows.append(
                Paragraph(anchor + inline_md_to_html(line[3:].strip()), styles["h2"])
            )
            i += 1
            continue

        if line.startswith("### "):
            flush_paragraph()
            flows.append(Paragraph(inline_md_to_html(line[4:].strip()), styles["h3"]))
            i += 1
            continue

        if line.strip() == "---":
            flush_paragraph()
            flows.append(Spacer(1, 4))
            flows.append(
                Table(
                    [[""]],
                    colWidths=[PAGE_W - 2 * MARGIN_LR],
                    rowHeights=[0.6],
                    style=TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.5, RULE)]),
                )
            )
            flows.append(Spacer(1, 8))
            i += 1
            continue

        if line.startswith("> "):
            flush_paragraph()
            flows.append(
                Paragraph(inline_md_to_html(line[2:].strip()), styles["quote"])
            )
            i += 1
            continue

        m = re.match(r"^(\s*)([-*])\s+(.*)$", line)
        if m:
            flush_paragraph()
            content = m.group(3).strip()
            content = re.sub(r"^\[\s\]\s*", "☐ ", content)
            content = re.sub(r"^\[x\]\s*", "☑ ", content, flags=re.IGNORECASE)
            flows.append(
                Paragraph(
                    f"• {inline_md_to_html(content)}", styles["bullet"]
                )
            )
            i += 1
            continue

        m = re.match(r"^(\d+)\.\s+(.*)$", line)
        if m:
            flush_paragraph()
            num = m.group(1)
            content = m.group(2).strip()
            flows.append(
                Paragraph(
                    f"<b>{num}.</b> {inline_md_to_html(content)}",
                    styles["numbered"],
                )
            )
            i += 1
            continue

        if line.startswith("|") and "|" in line[1:]:
            flush_paragraph()
            tbl_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                tbl_lines.append(lines[i].strip())
                i += 1
            data = []
            for tl in tbl_lines:
                if re.match(r"^\|\s*-+", tl):
                    continue
                cells = [c.strip() for c in tl.strip().strip("|").split("|")]
                data.append(
                    [Paragraph(inline_md_to_html(c), styles["body"]) for c in cells]
                )
            if data:
                col_count = max(len(r) for r in data)
                for r in data:
                    while len(r) < col_count:
                        r.append(Paragraph("", styles["body"]))
                col_w = (PAGE_W - 2 * MARGIN_LR) / col_count
                tbl = Table(data, colWidths=[col_w] * col_count, hAlign="LEFT")
                tbl.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), INK),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("LINEBELOW", (0, 0), (-1, 0), 0.6, GREEN),
                            ("LINEBELOW", (0, 1), (-1, -1), 0.3, RULE),
                            ("VALIGN", (0, 0), (-1, -1), "TOP"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 6),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                            ("TOPPADDING", (0, 0), (-1, -1), 5),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                        ]
                    )
                )
                flows.append(Spacer(1, 4))
                flows.append(tbl)
                flows.append(Spacer(1, 8))
            continue

        paragraph_buf.append(line.strip())
        i += 1

    flush_paragraph()
    return flows


# ----------------------------------------------------------------------
# Templates de página
# ----------------------------------------------------------------------


def draw_cover(canvas, doc, *, title: str, subtitle: str, kicker: str) -> None:
    canvas.saveState()
    canvas.setFillColor(BG_DARK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    canvas.setFillColor(GREEN_SOFT)
    canvas.setFillAlpha(0.18)
    canvas.circle(PAGE_W * 0.85, PAGE_H * 0.95, 70 * mm, fill=1, stroke=0)
    canvas.setFillColor(GOLD_SOFT)
    canvas.setFillAlpha(0.12)
    canvas.circle(PAGE_W * 0.1, PAGE_H * 0.18, 60 * mm, fill=1, stroke=0)
    canvas.setFillAlpha(1)

    canvas.setStrokeColor(GOLD_SOFT)
    canvas.setLineWidth(0.6)
    inset = 8 * mm
    canvas.rect(inset, inset, PAGE_W - 2 * inset, PAGE_H - 2 * inset, fill=0, stroke=1)

    canvas.setFillColor(GOLD_SOFT)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawCentredString(PAGE_W / 2, PAGE_H - 28 * mm, kicker.upper())

    canvas.setFillColor(PAPER)
    canvas.setFont("Helvetica-Bold", 30)
    canvas.drawCentredString(PAGE_W / 2, PAGE_H - 70 * mm, "O CÓDIGO DA")
    canvas.setFillColor(GREEN_SOFT)
    canvas.drawCentredString(PAGE_W / 2, PAGE_H - 86 * mm, "VIRADA")
    canvas.setFillColor(PAPER)
    canvas.setFont("Helvetica-Bold", 22)
    canvas.drawCentredString(PAGE_W / 2, PAGE_H - 102 * mm, "FINANCEIRA")

    canvas.setStrokeColor(GOLD_SOFT)
    canvas.setLineWidth(0.8)
    canvas.line(PAGE_W / 2 - 30 * mm, PAGE_H - 110 * mm, PAGE_W / 2 + 30 * mm, PAGE_H - 110 * mm)

    canvas.setFillColor(colors.HexColor("#CBD5E1"))
    canvas.setFont("Helvetica", 10)
    sub_y = PAGE_H - 122 * mm
    for line in subtitle.split("|"):
        canvas.drawCentredString(PAGE_W / 2, sub_y, line.strip())
        sub_y -= 6 * mm

    canvas.setFillColor(GREEN_SOFT)
    canvas.setFont("Helvetica-Bold", 9)
    pillars = ["CLAREZA", "PLANO", "ORGANIZAÇÃO", "DIREÇÃO"]
    pillar_y = 50 * mm
    spacing = (PAGE_W - 2 * 18 * mm) / (len(pillars) - 1)
    for idx, p in enumerate(pillars):
        x = 18 * mm + spacing * idx
        canvas.drawCentredString(x, pillar_y, p)
        canvas.setFillColor(GOLD_SOFT)
        canvas.circle(x, pillar_y - 4 * mm, 0.7 * mm, fill=1, stroke=0)
        canvas.setFillColor(GREEN_SOFT)

    canvas.setFillColor(colors.HexColor("#94A3B8"))
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(PAGE_W / 2, 22 * mm, "EDIÇÃO 2026")
    canvas.restoreState()


def draw_section_cover(canvas, doc, *, title: str, kicker: str) -> None:
    canvas.saveState()
    canvas.setFillColor(BG_DARK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(GREEN_SOFT)
    canvas.setFillAlpha(0.18)
    canvas.circle(PAGE_W * 0.85, PAGE_H * 0.95, 60 * mm, fill=1, stroke=0)
    canvas.setFillAlpha(1)

    canvas.setStrokeColor(GOLD_SOFT)
    canvas.setLineWidth(0.6)
    inset = 8 * mm
    canvas.rect(inset, inset, PAGE_W - 2 * inset, PAGE_H - 2 * inset, fill=0, stroke=1)

    canvas.setFillColor(GOLD_SOFT)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawCentredString(PAGE_W / 2, PAGE_H - 32 * mm, "BÔNUS")

    canvas.setFillColor(PAPER)
    canvas.setFont("Helvetica-Bold", 22)
    y = PAGE_H / 2 + 6 * mm
    for line in title.split("\n"):
        canvas.drawCentredString(PAGE_W / 2, y, line)
        y -= 9 * mm

    canvas.setStrokeColor(GREEN_SOFT)
    canvas.line(PAGE_W / 2 - 25 * mm, y - 4 * mm, PAGE_W / 2 + 25 * mm, y - 4 * mm)

    canvas.setFillColor(colors.HexColor("#CBD5E1"))
    canvas.setFont("Helvetica", 9)
    canvas.drawCentredString(PAGE_W / 2, y - 14 * mm, kicker)
    canvas.restoreState()


def make_content_decorator(title: str):
    def _decorate(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.4)
        canvas.line(MARGIN_LR, PAGE_H - 12 * mm, PAGE_W - MARGIN_LR, PAGE_H - 12 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(INK_SUBTLE)
        canvas.drawString(MARGIN_LR, PAGE_H - 9 * mm, title)
        canvas.drawRightString(
            PAGE_W - MARGIN_LR, PAGE_H - 9 * mm, "O CÓDIGO DA VIRADA"
        )

        canvas.setLineWidth(0.4)
        canvas.line(MARGIN_LR, 12 * mm, PAGE_W - MARGIN_LR, 12 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(INK_SUBTLE)
        canvas.drawCentredString(PAGE_W / 2, 8 * mm, f"— {doc.page} —")
        canvas.restoreState()

    return _decorate


# ----------------------------------------------------------------------
# Doc template com bookmarks/outline automáticos para cada h2
# ----------------------------------------------------------------------


class CodigoDocTemplate(BaseDocTemplate):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._sec_counter = 0
        self.showOutline = True

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == "h2":
            self._sec_counter += 1
            key = f"sec{self._sec_counter}"
            text = flowable.getPlainText()
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=0, closed=False)


# ----------------------------------------------------------------------
# Builders
# ----------------------------------------------------------------------


def build_main_ebook(content_dir: Path, out_path: Path) -> None:
    styles = make_styles()
    md = (content_dir / "ebook.md").read_text(encoding="utf-8")

    body_lines = []
    for line in md.splitlines():
        if line.startswith("# "):
            continue
        if line.startswith("**Como organizar"):
            continue
        body_lines.append(line)
    md_body = "\n".join(body_lines).lstrip()

    flows: list = []

    flows.append(Spacer(1, PAGE_H))
    flows.append(NextPageTemplate("toc"))
    flows.append(PageBreak())

    flows.append(Paragraph("Sumário", styles["toc_h1"]))
    toc_items = [
        ("Aviso importante", "01"),
        ("Introdução", "02"),
        ("Capítulo 1 — Clareza", "03"),
        ("Capítulo 2 — Organização", "04"),
        ("Capítulo 3 — Plano de ataque", "05"),
        ("Capítulo 4 — Renda extra", "06"),
        ("Capítulo 5 — A reserva de paz", "07"),
        ("Capítulo 6 — Direção", "08"),
        ("Capítulo 7 — Plano de 7 dias", "09"),
        ("Conclusão", "10"),
    ]
    for idx, (title, num) in enumerate(toc_items, start=1):
        dots = "." * max(2, 50 - len(title))
        flows.append(
            Paragraph(
                f'<link href="#sec{idx}">'
                f'<font color="#16A34A"><b>{num}</b></font>  '
                f'<font color="#0F172A">{title}</font>  '
                f'<font color="#CBD5E1">{dots}</font>'
                f'</link>',
                styles["toc_item"],
            )
        )
    flows.append(Spacer(1, 14))
    flows.append(
        Paragraph(
            'Sete capítulos curtos. Sete passos práticos. '
            'No final de cada um, um exercício para você aplicar.',
            styles["caption"],
        )
    )

    flows.append(NextPageTemplate("content"))
    flows.append(PageBreak())

    flows.extend(md_to_flowables(md_body, styles))

    doc = CodigoDocTemplate(
        str(out_path),
        pagesize=A5,
        leftMargin=MARGIN_LR,
        rightMargin=MARGIN_LR,
        topMargin=MARGIN_TB,
        bottomMargin=MARGIN_TB,
        title="O Código da Virada Financeira",
        author="Código da Virada Financeira",
        subject="Educação financeira prática",
    )

    frame_full = Frame(0, 0, PAGE_W, PAGE_H, leftPadding=0, bottomPadding=0,
                       rightPadding=0, topPadding=0, id="full")
    frame_content = Frame(MARGIN_LR, MARGIN_TB, PAGE_W - 2 * MARGIN_LR,
                          PAGE_H - 2 * MARGIN_TB, id="content")

    cover_tpl = PageTemplate(
        id="cover",
        frames=[frame_full],
        onPage=lambda c, d: draw_cover(
            c, d,
            title="O Código da Virada Financeira",
            subtitle="Como organizar seu dinheiro, sair do aperto | "
                     "e criar renda extra começando do zero",
            kicker="E-BOOK",
        ),
    )
    toc_tpl = PageTemplate(
        id="toc",
        frames=[frame_content],
        onPage=make_content_decorator("Sumário"),
    )
    content_tpl = PageTemplate(
        id="content",
        frames=[frame_content],
        onPage=make_content_decorator("O Código da Virada"),
    )

    doc.addPageTemplates([cover_tpl, toc_tpl, content_tpl])
    doc.build(flows)


def build_bonus(
    md_path: Path,
    out_path: Path,
    *,
    cover_title: str,
    cover_kicker: str,
    header_title: str,
) -> None:
    styles = make_styles()
    md = md_path.read_text(encoding="utf-8")

    body_lines = []
    skipped_first_h1 = False
    for line in md.splitlines():
        if line.startswith("# ") and not skipped_first_h1:
            skipped_first_h1 = True
            continue
        body_lines.append(line)
    md_body = "\n".join(body_lines).lstrip()

    flows: list = []
    flows.append(Spacer(1, PAGE_H))
    flows.append(NextPageTemplate("content"))
    flows.append(PageBreak())
    flows.extend(md_to_flowables(md_body, styles))

    doc = CodigoDocTemplate(
        str(out_path),
        pagesize=A5,
        leftMargin=MARGIN_LR,
        rightMargin=MARGIN_LR,
        topMargin=MARGIN_TB,
        bottomMargin=MARGIN_TB,
        title=cover_title.replace("\n", " "),
        author="Código da Virada Financeira",
    )

    frame_full = Frame(0, 0, PAGE_W, PAGE_H, leftPadding=0, bottomPadding=0,
                       rightPadding=0, topPadding=0, id="full")
    frame_content = Frame(MARGIN_LR, MARGIN_TB, PAGE_W - 2 * MARGIN_LR,
                          PAGE_H - 2 * MARGIN_TB, id="content")

    cover_tpl = PageTemplate(
        id="cover",
        frames=[frame_full],
        onPage=lambda c, d: draw_section_cover(
            c, d, title=cover_title, kicker=cover_kicker
        ),
    )
    content_tpl = PageTemplate(
        id="content",
        frames=[frame_content],
        onPage=make_content_decorator(header_title),
    )
    doc.addPageTemplates([cover_tpl, content_tpl])
    doc.build(flows)


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    content_dir = root / "content"
    out_dir = root / "public" / "downloads"
    out_dir.mkdir(parents=True, exist_ok=True)

    print("→ Construindo e-book principal…")
    build_main_ebook(content_dir, out_dir / "ebook-codigo-da-virada.pdf")

    bonus_specs = [
        (
            "bonus-50-ideias-renda-extra.md",
            "bonus-50-ideias.pdf",
            "50 IDEIAS DE\nRENDA EXTRA",
            "Bônus 02 • Para começar do zero",
            "Bônus — 50 ideias de renda extra",
        ),
        (
            "roteiro-negociacao-dividas.md",
            "roteiro-negociacao.pdf",
            "ROTEIRO DE\nNEGOCIAÇÃO",
            "Bônus 03 • Scripts prontos",
            "Bônus — Roteiro de negociação",
        ),
        (
            "plano-7-dias.md",
            "plano-7-dias.pdf",
            "PLANO DE\n7 DIAS",
            "Bônus 04 • Comece sua virada em uma semana",
            "Bônus — Plano de 7 dias",
        ),
        (
            "checklist-mensal.md",
            "checklist-mensal.pdf",
            "CHECKLIST\nMENSAL",
            "Bônus 05 • Revisão financeira de 30 minutos",
            "Bônus — Checklist mensal",
        ),
    ]

    for src, dst, title, kicker, header in bonus_specs:
        print(f"→ Construindo {dst}…")
        build_bonus(
            content_dir / src,
            out_dir / dst,
            cover_title=title,
            cover_kicker=kicker,
            header_title=header,
        )

    print("\n✔ PDFs gerados em:", out_dir)
    for p in sorted(out_dir.glob("*.pdf")):
        size_kb = p.stat().st_size / 1024
        print(f"  - {p.name}  ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
