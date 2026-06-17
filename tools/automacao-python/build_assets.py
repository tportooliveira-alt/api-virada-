"""
Gera todos os assets gráficos do produto:
- Capa do e-book (1600x2560)
- Mockup 3D pseudo-realista (PNG transparente)
- Capas dos 5 bônus (1080x1350)
- Logo + favicon (PNG)
- OG image (1200x630)
- Banner YouTube (2560x1440)
- Criativos de anúncio: Story 9:16 (1080x1920) + Feed 1:1 (1080x1080)

Tudo salvo em public/assets/ e public/marketing/.

Visual: paleta azul-marinho profundo com destaques verde-esmeralda e dourado.
Estilo editorial premium, sem clichês.
"""

from __future__ import annotations

import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ----------------------------------------------------------------------
# Constantes
# ----------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"
MKT = ROOT / "public" / "marketing"
ASSETS.mkdir(parents=True, exist_ok=True)
MKT.mkdir(parents=True, exist_ok=True)

# Cores
BG = (7, 17, 31)           # #07111F
BG_ALT = (11, 16, 32)      # #0B1020
GREEN = (34, 197, 94)      # #22C55E
GREEN_DARK = (22, 163, 74) # #16A34A
GOLD = (245, 197, 66)      # #F5C542
GOLD_DARK = (212, 160, 23) # #D4A017
WHITE = (255, 255, 255)
GRAY = (203, 213, 225)     # #CBD5E1
GRAY_DARK = (148, 163, 184)
RED = (239, 68, 68)

# Fontes
FONT_DIR = "C:/Windows/Fonts"


def font(name: str, size: int) -> ImageFont.ImageFont:
    return ImageFont.truetype(f"{FONT_DIR}/{name}", size)


def text_w(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.ImageFont) -> int:
    box = draw.textbbox((0, 0), text, font=f)
    return box[2] - box[0]


def text_h(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.ImageFont) -> int:
    box = draw.textbbox((0, 0), text, font=f)
    return box[3] - box[1]


# ----------------------------------------------------------------------
# Helpers visuais
# ----------------------------------------------------------------------
def gradient_bg(w: int, h: int, top: tuple, bottom: tuple) -> Image.Image:
    img = Image.new("RGB", (w, h), top)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return img


def add_glow(img: Image.Image, x: int, y: int, radius: int, color: tuple, alpha: int = 90) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.ellipse([x - radius, y - radius, x + radius, y + radius],
              fill=color + (alpha,))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=radius // 4))
    img.paste(overlay, (0, 0), overlay)


def grid_pattern(img: Image.Image, spacing: int = 40, alpha: int = 18, color: tuple = GREEN) -> None:
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for x in range(0, w, spacing):
        d.line([(x, 0), (x, h)], fill=color + (alpha,), width=1)
    for y in range(0, h, spacing):
        d.line([(0, y), (w, y)], fill=color + (alpha,), width=1)
    img.paste(overlay, (0, 0), overlay)


def gold_frame(img: Image.Image, inset: int = 30, width: int = 2) -> None:
    d = ImageDraw.Draw(img)
    w, h = img.size
    for i in range(width):
        d.rectangle(
            [inset + i, inset + i, w - inset - i - 1, h - inset - i - 1],
            outline=GOLD,
        )


def draw_centered(draw: ImageDraw.ImageDraw, text: str, y: int,
                  f: ImageFont.ImageFont, fill: tuple, w: int) -> int:
    tw = text_w(draw, text, f)
    draw.text(((w - tw) // 2, y), text, font=f, fill=fill)
    return tw


# ----------------------------------------------------------------------
# 1) CAPA DO E-BOOK 1600x2560
# ----------------------------------------------------------------------
def cover_ebook(out: Path, size=(1600, 2560)) -> None:
    w, h = size
    img = gradient_bg(w, h, BG_ALT, BG)
    grid_pattern(img, spacing=80, alpha=14, color=GREEN)

    # Glows decorativos
    add_glow(img, int(w * 0.85), int(h * 0.08), 600, GREEN, alpha=70)
    add_glow(img, int(w * 0.1), int(h * 0.92), 500, GOLD, alpha=45)

    # Moldura dourada
    gold_frame(img, inset=60, width=3)

    d = ImageDraw.Draw(img)

    # Kicker
    f_kicker = font("arialbd.ttf", 36)
    txt = "EDUCAÇÃO  FINANCEIRA  ·  EDIÇÃO  2026"
    tw = text_w(d, txt, f_kicker)
    d.text(((w - tw) // 2, 240), txt, font=f_kicker, fill=GOLD)

    # Linha decorativa fina sob o kicker
    d.line([(w // 2 - 200, 320), (w // 2 + 200, 320)], fill=GOLD, width=2)

    # Título principal — 3 linhas
    f_title = font("impact.ttf", 230)
    f_title_big = font("impact.ttf", 280)

    y_title = 560
    # "O CÓDIGO DA"
    line1 = "O CÓDIGO DA"
    tw = text_w(d, line1, f_title)
    d.text(((w - tw) // 2, y_title), line1, font=f_title, fill=WHITE)

    # "VIRADA" em verde, maior
    line2 = "VIRADA"
    tw = text_w(d, line2, f_title_big)
    d.text(((w - tw) // 2, y_title + 240), line2, font=f_title_big, fill=GREEN)

    # "FINANCEIRA"
    line3 = "FINANCEIRA"
    tw = text_w(d, line3, f_title)
    d.text(((w - tw) // 2, y_title + 540), line3, font=f_title, fill=WHITE)

    # Linha decorativa abaixo do título
    d.line([(w // 2 - 280, y_title + 820), (w // 2 + 280, y_title + 820)],
           fill=GOLD, width=3)

    # Subtítulo (2 linhas)
    f_sub = font("segoeui.ttf", 44)
    sub = [
        "Como organizar seu dinheiro,",
        "sair do aperto e criar renda extra",
        "começando do zero",
    ]
    sy = y_title + 860
    for line in sub:
        tw = text_w(d, line, f_sub)
        d.text(((w - tw) // 2, sy), line, font=f_sub, fill=GRAY)
        sy += 56

    # Pilares na base
    f_pillar = font("arialbd.ttf", 32)
    pillars = ["CLAREZA", "PLANO", "ORGANIZAÇÃO", "DIREÇÃO"]
    base_y = h - 280
    section_w = w - 400
    spacing = section_w / (len(pillars) - 1)
    for i, p in enumerate(pillars):
        cx = 200 + spacing * i
        tw = text_w(d, p, f_pillar)
        d.text((cx - tw / 2, base_y), p, font=f_pillar, fill=GREEN)
        # ponto dourado
        d.ellipse([cx - 6, base_y + 50, cx + 6, base_y + 62], fill=GOLD)

    # Linha conectando pilares
    d.line([(220, base_y + 56), (w - 220, base_y + 56)], fill=GOLD, width=1)

    # Selo discreto base
    f_seal = font("arial.ttf", 26)
    seal = "GUIA  PRÁTICO  ·  SEM  PROMESSAS  MILAGROSAS"
    tw = text_w(d, seal, f_seal)
    d.text(((w - tw) // 2, h - 130), seal, font=f_seal, fill=GRAY_DARK)

    img.save(out, "PNG", optimize=True)


# ----------------------------------------------------------------------
# 2) MOCKUP 3D do livro (PNG transparente)
# ----------------------------------------------------------------------
def book_mockup_3d(cover_path: Path, out: Path, size=(1800, 2400)) -> None:
    w, h = size
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    cover = Image.open(cover_path).convert("RGBA")
    # Reduz capa
    bw, bh = 1100, 1700
    cover_small = cover.resize((bw, bh), Image.LANCZOS)

    # Sombra
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        [(w - bw) // 2 + 30, (h - bh) // 2 + 80,
         (w - bw) // 2 + bw + 30, (h - bh) // 2 + bh + 80],
        radius=14, fill=(0, 0, 0, 180),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=40))
    img.alpha_composite(shadow)

    # Lombada (faz parecer livro tridimensional)
    spine_x = (w - bw) // 2 - 28
    spine_y = (h - bh) // 2 + 6
    spine_w = 40
    spine = Image.new("RGBA", (spine_w, bh - 12), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(spine)
    # Gradiente lateral
    for y in range(bh - 12):
        t = y / (bh - 12)
        r = int(BG_ALT[0] + (BG[0] - BG_ALT[0]) * t)
        g = int(BG_ALT[1] + (BG[1] - BG_ALT[1]) * t)
        b = int(BG_ALT[2] + (BG[2] - BG_ALT[2]) * t)
        sdraw.line([(0, y), (spine_w, y)], fill=(r, g, b, 255))
    # Linha dourada na lateral
    sdraw.line([(spine_w - 1, 0), (spine_w - 1, bh - 12)], fill=GOLD + (255,), width=2)
    img.alpha_composite(spine, (spine_x, spine_y))

    # Capa principal
    img.alpha_composite(cover_small, ((w - bw) // 2, (h - bh) // 2))

    # Brilho na borda direita da capa (simula curvatura)
    highlight = Image.new("RGBA", (60, bh), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(highlight)
    for x in range(60):
        alpha = int(120 * (1 - x / 60))
        hdraw.line([(x, 0), (x, bh)], fill=(255, 255, 255, alpha))
    img.alpha_composite(highlight, ((w - bw) // 2 + bw - 60, (h - bh) // 2))

    # Detalhe dourado na borda superior das páginas (simula edição premium)
    page_top = Image.new("RGBA", (bw + 4, 8), (0, 0, 0, 0))
    pd = ImageDraw.Draw(page_top)
    pd.rectangle([(0, 0), (bw + 4, 8)], fill=GOLD + (220,))
    img.alpha_composite(page_top, ((w - bw) // 2 - 2, (h - bh) // 2 - 6))

    img.save(out, "PNG", optimize=True)


# ----------------------------------------------------------------------
# 3) CAPAS DOS BÔNUS — 5 imagens 1080x1350
# ----------------------------------------------------------------------
def bonus_cover(out: Path, num: str, title_lines: list[str], highlight: str,
                size=(1080, 1350)) -> None:
    w, h = size
    img = gradient_bg(w, h, BG_ALT, BG)
    grid_pattern(img, spacing=50, alpha=10, color=GREEN)
    add_glow(img, int(w * 0.85), int(h * 0.05), 350, GREEN, alpha=60)
    gold_frame(img, inset=40, width=2)

    d = ImageDraw.Draw(img)

    # Kicker
    f_kicker = font("arialbd.ttf", 28)
    txt = f"BÔNUS  {num}"
    draw_centered(d, txt, 130, f_kicker, GOLD, w)

    # Linha pequena
    d.line([(w // 2 - 80, 180), (w // 2 + 80, 180)], fill=GOLD, width=2)

    # Título
    f_title = font("impact.ttf", 110)
    cy = 380
    for line in title_lines:
        tw = text_w(d, line, f_title)
        if highlight in line:
            # palavra antes
            before, _, after = line.partition(highlight)
            x = (w - tw) // 2
            d.text((x, cy), before, font=f_title, fill=WHITE)
            x += text_w(d, before, f_title)
            d.text((x, cy), highlight, font=f_title, fill=GREEN)
            x += text_w(d, highlight, f_title)
            d.text((x, cy), after, font=f_title, fill=WHITE)
        else:
            d.text(((w - tw) // 2, cy), line, font=f_title, fill=WHITE)
        cy += 130

    # Linha decorativa
    d.line([(w // 2 - 200, h - 320), (w // 2 + 200, h - 320)],
           fill=GREEN, width=3)

    # Tag base
    f_tag = font("arialbd.ttf", 26)
    tag = "O  CÓDIGO  DA  VIRADA  FINANCEIRA"
    draw_centered(d, tag, h - 280, f_tag, GRAY, w)

    # Selo de coleção
    f_seal = font("arial.ttf", 22)
    seal = f"COLEÇÃO  COMPLETA  ·  {num}/05"
    draw_centered(d, seal, h - 230, f_seal, GRAY_DARK, w)

    # Diamante decorativo desenhado (substitui ◆ que não renderiza)
    cx_d, cy_d = w // 2, h - 140
    half_d = 22
    d.polygon(
        [(cx_d, cy_d - half_d), (cx_d + half_d, cy_d),
         (cx_d, cy_d + half_d), (cx_d - half_d, cy_d)],
        fill=GREEN,
    )
    inner_d = int(half_d * 0.55)
    d.polygon(
        [(cx_d, cy_d - inner_d), (cx_d + inner_d, cy_d),
         (cx_d, cy_d + inner_d), (cx_d - inner_d, cy_d)],
        fill=tuple(min(255, c + 35) for c in GREEN),
    )

    img.save(out, "PNG", optimize=True)


# ----------------------------------------------------------------------
# 4) LOGO E FAVICONS
# ----------------------------------------------------------------------
def diamond_icon(out: Path, size: int, fill_color: tuple, bg_color=None,
                 padding_ratio: float = 0.2, rounded: bool = False) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bg_color is not None:
        if rounded:
            d.rounded_rectangle([(0, 0), (size - 1, size - 1)],
                                radius=size // 6, fill=bg_color)
        else:
            d.rectangle([(0, 0), (size - 1, size - 1)], fill=bg_color)

    pad = int(size * padding_ratio)
    cx, cy = size // 2, size // 2
    half = (size - pad * 2) // 2
    points = [(cx, cy - half), (cx + half, cy), (cx, cy + half), (cx - half, cy)]
    d.polygon(points, fill=fill_color)

    # Brilho interno
    inner_half = int(half * 0.55)
    inner = [(cx, cy - inner_half), (cx + inner_half, cy),
             (cx, cy + inner_half), (cx - inner_half, cy)]
    d.polygon(inner, fill=tuple(min(255, c + 35) for c in fill_color[:3]))

    img.save(out, "PNG", optimize=True)


def logo_horizontal(out: Path, size=(1400, 360), variant: str = "dark") -> None:
    """Logo horizontal. variant='dark' = fundo escuro, 'light' = fundo claro."""
    w, h = size
    if variant == "dark":
        img = Image.new("RGBA", (w, h), BG + (255,))
        text_main = WHITE
        text_sub = GOLD
    else:
        img = Image.new("RGBA", (w, h), (255, 255, 255, 255))
        text_main = BG
        text_sub = GOLD_DARK
    d = ImageDraw.Draw(img)

    icon_size = 180
    icon_pad = 50
    cx, cy = icon_pad + icon_size // 2, h // 2
    half = icon_size // 2
    points = [(cx, cy - half), (cx + half, cy), (cx, cy + half), (cx - half, cy)]
    d.polygon(points, fill=GREEN)
    inner_h = int(half * 0.55)
    d.polygon(
        [(cx, cy - inner_h), (cx + inner_h, cy),
         (cx, cy + inner_h), (cx - inner_h, cy)],
        fill=tuple(min(255, c + 35) for c in GREEN),
    )

    f_main = font("impact.ttf", 88)
    f_sub = font("arialbd.ttf", 26)
    text_x = icon_pad + icon_size + 40
    d.text((text_x, 60), "O CÓDIGO DA", font=f_main, fill=text_main)
    d.text((text_x, 150), "VIRADA", font=f_main, fill=GREEN)
    # "FINANCEIRA" do lado direito da palavra VIRADA
    f_fin = font("impact.ttf", 48)
    virada_w = text_w(d, "VIRADA", f_main)
    d.text((text_x + virada_w + 20, 178), "FINANCEIRA",
           font=f_fin, fill=text_main)
    d.text((text_x, 250), "GUIA  PRÁTICO  ·  EDIÇÃO  2026",
           font=f_sub, fill=text_sub)

    img.save(out, "PNG", optimize=True)


# ----------------------------------------------------------------------
# 5) OG IMAGE 1200x630
# ----------------------------------------------------------------------
def og_image(cover_path: Path, out: Path, size=(1200, 630)) -> None:
    w, h = size
    img = gradient_bg(w, h, BG_ALT, BG)
    grid_pattern(img, spacing=40, alpha=12)
    add_glow(img, int(w * 0.85), int(h * 0.5), 380, GREEN, alpha=70)
    add_glow(img, int(w * 0.05), int(h * 0.1), 250, GOLD, alpha=40)

    d = ImageDraw.Draw(img)

    # Lado esquerdo: textos
    f_kicker = font("arialbd.ttf", 22)
    d.text((60, 80), "EDUCAÇÃO  FINANCEIRA  HONESTA", font=f_kicker, fill=GOLD)

    f_t1 = font("impact.ttf", 88)
    f_t2 = font("impact.ttf", 96)
    f_t3 = font("impact.ttf", 88)
    d.text((60, 130), "O CÓDIGO DA", font=f_t1, fill=WHITE)
    d.text((60, 220), "VIRADA", font=f_t2, fill=GREEN)
    d.text((60, 320), "FINANCEIRA", font=f_t3, fill=WHITE)

    f_sub = font("segoeui.ttf", 24)
    sub = [
        "Como organizar seu dinheiro,",
        "sair do aperto e criar renda extra",
        "começando do zero — com clareza,",
        "plano e direção.",
    ]
    y = 440
    for line in sub:
        d.text((60, y), line, font=f_sub, fill=GRAY)
        y += 32

    # Pequeno mockup do livro à direita
    cover = Image.open(cover_path).convert("RGBA")
    bw, bh = 320, 510
    cs = cover.resize((bw, bh), Image.LANCZOS)
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        [w - 320 - 60 + 12, 60 + 12, w - 60 + 12, 60 + bh + 12],
        radius=8, fill=(0, 0, 0, 200),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=22))
    img.paste(shadow, (0, 0), shadow)
    img.paste(cs, (w - bw - 60, 60), cs)

    img.save(out, "PNG", optimize=True)


# ----------------------------------------------------------------------
# 6) BANNER YOUTUBE 2560x1440
# ----------------------------------------------------------------------
def youtube_banner(cover_path: Path, out: Path, size=(2560, 1440)) -> None:
    w, h = size
    img = gradient_bg(w, h, BG_ALT, BG)
    grid_pattern(img, spacing=60, alpha=10)
    add_glow(img, int(w * 0.85), int(h * 0.5), 700, GREEN, alpha=70)
    add_glow(img, int(w * 0.1), int(h * 0.85), 500, GOLD, alpha=40)

    d = ImageDraw.Draw(img)

    # Safe area: centralizar o conteúdo principal nos 1235x338 centrais
    # Lado esquerdo: texto
    f_kicker = font("arialbd.ttf", 32)
    d.text((760, 540), "EDUCAÇÃO  FINANCEIRA  HONESTA", font=f_kicker, fill=GOLD)

    f_main = font("impact.ttf", 130)
    f_main_big = font("impact.ttf", 150)
    d.text((760, 590), "O CÓDIGO DA", font=f_main, fill=WHITE)
    d.text((760, 720), "VIRADA", font=f_main_big, fill=GREEN)
    d.text((760, 870), "FINANCEIRA", font=f_main, fill=WHITE)

    f_sub = font("segoeui.ttf", 30)
    d.text((760, 1010), "Para brasileiros que decidiram parar de viver no improviso",
           font=f_sub, fill=GRAY)

    # Lado direito: livrinho
    cover = Image.open(cover_path).convert("RGBA")
    bw, bh = 540, 860
    cs = cover.resize((bw, bh), Image.LANCZOS)
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        [w - bw - 380 + 18, (h - bh) // 2 + 18,
         w - 380 + 18, (h - bh) // 2 + bh + 18],
        radius=10, fill=(0, 0, 0, 200),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=30))
    img.paste(shadow, (0, 0), shadow)
    img.paste(cs, (w - bw - 380, (h - bh) // 2), cs)

    img.save(out, "PNG", optimize=True)


# ----------------------------------------------------------------------
# 7) CRIATIVO STORY 1080x1920 (emocional)
# ----------------------------------------------------------------------
def ad_story(cover_path: Path, out: Path, size=(1080, 1920)) -> None:
    w, h = size
    img = gradient_bg(w, h, BG_ALT, BG)
    grid_pattern(img, spacing=60, alpha=10)
    add_glow(img, int(w * 0.5), int(h * 0.55), 500, GREEN, alpha=85)

    d = ImageDraw.Draw(img)

    # Topo: pergunta de identificação
    f_top1 = font("impact.ttf", 70)
    f_top2 = font("impact.ttf", 70)
    title_lines = ["Você trabalha o", "mês inteiro", "e o dinheiro some", "antes do dia 15?"]
    y = 180
    for line in title_lines:
        tw = text_w(d, line, f_top1)
        d.text(((w - tw) // 2, y), line, font=f_top1, fill=WHITE)
        y += 86

    # Linha decorativa
    d.line([(w // 2 - 90, y + 20), (w // 2 + 90, y + 20)], fill=GOLD, width=3)

    # Centro: livro
    cover = Image.open(cover_path).convert("RGBA")
    bw, bh = 540, 864
    cs = cover.resize((bw, bh), Image.LANCZOS)
    bx = (w - bw) // 2
    by = 780
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([bx + 10, by + 10, bx + bw + 10, by + bh + 10],
                         radius=8, fill=(0, 0, 0, 230))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=30))
    img.paste(shadow, (0, 0), shadow)
    img.paste(cs, (bx, by), cs)

    # Frase abaixo do livro
    f_under1 = font("arialbd.ttf", 38)
    f_under2 = font("impact.ttf", 50)
    d2 = ImageDraw.Draw(img)
    line1 = "Você não está sozinho."
    line2 = "E a culpa não é toda sua."
    tw = text_w(d2, line1, f_under1)
    d2.text(((w - tw) // 2, by + bh + 60), line1, font=f_under1, fill=GREEN)
    tw = text_w(d2, line2, f_under2)
    d2.text(((w - tw) // 2, by + bh + 110), line2, font=f_under2, fill=WHITE)

    # Botão CTA
    btn_w, btn_h = 720, 100
    btn_x = (w - btn_w) // 2
    btn_y = h - 220
    d.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h],
                        radius=20, fill=GREEN)
    f_btn = font("arialbd.ttf", 36)
    btn_text = "DESCUBRA  O  MÉTODO  →"
    tw = text_w(d, btn_text, f_btn)
    d.text((btn_x + (btn_w - tw) // 2, btn_y + 30), btn_text, font=f_btn, fill=BG)

    f_small = font("arial.ttf", 24)
    sub = "R$ 27 · Acesso imediato · Garantia de 7 dias"
    tw = text_w(d, sub, f_small)
    d.text(((w - tw) // 2, h - 90), sub, font=f_small, fill=GRAY_DARK)

    img.save(out, "PNG", optimize=True)


# ----------------------------------------------------------------------
# 8) CRIATIVO FEED 1080x1080 (direto)
# ----------------------------------------------------------------------
def ad_feed(cover_path: Path, out: Path, size=(1080, 1080)) -> None:
    w, h = size
    img = gradient_bg(w, h, BG_ALT, BG)

    # Lado esquerdo: livro
    cover = Image.open(cover_path).convert("RGBA")
    bw, bh = 460, 736
    cs = cover.resize((bw, bh), Image.LANCZOS)
    bx = 60
    by = (h - bh) // 2
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([bx + 10, by + 10, bx + bw + 10, by + bh + 10],
                         radius=8, fill=(0, 0, 0, 220))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=24))
    img.paste(shadow, (0, 0), shadow)
    img.paste(cs, (bx, by), cs)

    # Lado direito: bloco verde
    d = ImageDraw.Draw(img)
    block_x = bx + bw + 30
    d.rectangle([block_x, 0, w, h], fill=GREEN)

    f_text = font("impact.ttf", 56)
    lines = [
        "O método",
        "brasileiro",
        "para sair do",
        "vermelho",
        "SEM virar",
        "influencer.",
    ]
    cy = 140
    for line in lines:
        d.text((block_x + 30, cy), line, font=f_text, fill=BG)
        cy += 70

    # Pequena info
    f_info = font("arialbd.ttf", 22)
    d.text((block_x + 30, h - 180), "ACESSO  IMEDIATO", font=f_info, fill=BG)
    d.text((block_x + 30, h - 145), "GARANTIA  DE  7  DIAS", font=f_info, fill=BG)

    f_price = font("impact.ttf", 80)
    d.text((block_x + 30, h - 110), "R$ 27", font=f_price, fill=BG)

    img.save(out, "PNG", optimize=True)


# ----------------------------------------------------------------------
# 9) CRIATIVO SOCIAL PROOF (Story)
# ----------------------------------------------------------------------
def ad_proof(cover_path: Path, out: Path, size=(1080, 1920)) -> None:
    w, h = size
    img = gradient_bg(w, h, BG_ALT, BG)
    grid_pattern(img, spacing=60, alpha=10)
    add_glow(img, int(w * 0.5), int(h * 0.4), 460, GOLD, alpha=70)
    d = ImageDraw.Draw(img)

    f_kicker = font("arialbd.ttf", 28)
    txt = "DEPOIMENTO  REAL"
    draw_centered(d, txt, 180, f_kicker, GOLD, w)
    d.line([(w // 2 - 90, 230), (w // 2 + 90, 230)], fill=GOLD, width=2)

    # Card com depoimento
    card_x, card_y = 80, 320
    card_w, card_h = w - 160, 760
    d.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h],
                        radius=24, fill=(248, 250, 252))

    f_quote = font("impact.ttf", 200)
    d.text((card_x + 50, card_y + 20), "“", font=f_quote, fill=GOLD)

    f_text = font("segoeuib.ttf", 44)
    quote_lines = [
        "Em 8 meses zerei",
        "R$ 18 mil em",
        "dívidas seguindo",
        "o método.",
        "",
        "Mudou minha vida.",
    ]
    cy = card_y + 220
    for line in quote_lines:
        d.text((card_x + 80, cy), line, font=f_text, fill=BG)
        cy += 60

    # Autoria
    f_name = font("arialbd.ttf", 34)
    f_city = font("arial.ttf", 26)
    d.line([(card_x + 80, card_y + card_h - 130),
            (card_x + 220, card_y + card_h - 130)], fill=GREEN, width=3)
    d.text((card_x + 80, card_y + card_h - 110), "Maria S.",
           font=f_name, fill=BG)
    d.text((card_x + 80, card_y + card_h - 65), "São Paulo · SP",
           font=f_city, fill=GRAY_DARK)

    # Capa do livro pequena no rodapé esquerdo
    cover = Image.open(cover_path).convert("RGBA")
    bw, bh = 220, 352
    cs = cover.resize((bw, bh), Image.LANCZOS)
    img.paste(cs, (80, h - 480), cs)

    # CTA direita
    f_cta = font("impact.ttf", 54)
    d.text((360, h - 410), "QUERO", font=f_cta, fill=WHITE)
    d.text((360, h - 350), "O MEU", font=f_cta, fill=GREEN)

    btn_x = 360
    btn_y = h - 260
    d.rounded_rectangle([btn_x, btn_y, btn_x + 540, btn_y + 90],
                        radius=18, fill=GREEN)
    f_btn = font("arialbd.ttf", 30)
    btn_text = "ACESSAR  AGORA  →"
    tw = text_w(d, btn_text, f_btn)
    d.text((btn_x + (540 - tw) // 2, btn_y + 28), btn_text, font=f_btn, fill=BG)

    f_small = font("arial.ttf", 22)
    foot = "Resultados individuais. Variam conforme aplicação."
    draw_centered(d, foot, h - 90, f_small, GRAY_DARK, w)

    img.save(out, "PNG", optimize=True)


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
def main() -> None:
    print("→ 1/9  Capa do e-book…")
    cover_path = ASSETS / "capa-ebook.png"
    cover_ebook(cover_path)

    print("→ 2/9  Mockup 3D…")
    book_mockup_3d(cover_path, ASSETS / "mockup-3d.png")

    print("→ 3/9  Capas dos 5 bônus…")
    bonus_specs = [
        ("01", ["PLANILHA DE", "CONTROLE"], "CONTROLE", "bonus-01-planilha.png"),
        ("02", ["50 IDEIAS DE", "RENDA EXTRA"], "RENDA", "bonus-02-renda-extra.png"),
        ("03", ["ROTEIRO DE", "NEGOCIAÇÃO"], "NEGOCIAÇÃO", "bonus-03-negociacao.png"),
        ("04", ["PLANO DE", "7 DIAS"], "7 DIAS", "bonus-04-plano-7-dias.png"),
        ("05", ["CHECKLIST", "MENSAL"], "MENSAL", "bonus-05-checklist.png"),
    ]
    for n, lines, hl, fname in bonus_specs:
        bonus_cover(ASSETS / fname, n, lines, hl)

    print("→ 4/9  Logo horizontal e ícones…")
    logo_horizontal(ASSETS / "logo-horizontal-dark.png", variant="dark")
    logo_horizontal(ASSETS / "logo-horizontal-light.png", variant="light")
    diamond_icon(ASSETS / "favicon-512.png", 512, GREEN, padding_ratio=0.18)
    diamond_icon(ASSETS / "favicon-32.png", 32, GREEN, padding_ratio=0.18)
    diamond_icon(ASSETS / "favicon-16.png", 16, GREEN, padding_ratio=0.15)
    diamond_icon(ASSETS / "apple-touch-icon.png", 180, GREEN,
                 bg_color=BG, padding_ratio=0.22, rounded=True)

    print("→ 5/9  OG image…")
    og_image(cover_path, ASSETS / "og-image.png")

    print("→ 6/9  Banner YouTube…")
    youtube_banner(cover_path, ASSETS / "banner-youtube.png")

    print("→ 7/9  Anúncio Story (emocional)…")
    ad_story(cover_path, MKT / "ad-story-emocional.png")

    print("→ 8/9  Anúncio Feed (direto)…")
    ad_feed(cover_path, MKT / "ad-feed-direto.png")

    print("→ 9/9  Anúncio Story (prova social)…")
    ad_proof(cover_path, MKT / "ad-story-proof.png")

    print("\n✔ Assets gerados em:")
    print(f"  {ASSETS}")
    for p in sorted(ASSETS.glob("*.png")):
        kb = p.stat().st_size / 1024
        print(f"    {p.name}  ({kb:.0f} KB)")
    print(f"  {MKT}")
    for p in sorted(MKT.glob("*.png")):
        kb = p.stat().st_size / 1024
        print(f"    {p.name}  ({kb:.0f} KB)")


if __name__ == "__main__":
    main()
