"""
Gera 5 vídeos motivacionais faceless 9:16 (1080x1920) prontos pra postar
em Reels / TikTok / Shorts vendendo "O Código da Virada Financeira".

- Narração: gTTS (Google) em PT-BR
- Visual: fundo dark cinematográfico + texto bombástico animado por bloco
- Saída: public/marketing/videos/*.mp4

Sem custo, sem chave de API, sem internet além do gTTS.
"""

from __future__ import annotations

import os
from pathlib import Path

from gtts import gTTS
from moviepy import (
    AudioFileClip,
    ColorClip,
    CompositeVideoClip,
    ImageClip,
    TextClip,
)
from PIL import Image, ImageDraw, ImageFilter

W, H = 1080, 1920
BG_DARK = (7, 17, 31)
GREEN = (22, 163, 74)
GREEN_SOFT = (34, 197, 94)
GOLD = (212, 160, 23)
GOLD_SOFT = (245, 197, 66)

FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_IMPACT = "C:/Windows/Fonts/impact.ttf"


VIDEOS = [
    {
        "id": 1,
        "slug": "a-culpa-nao-e-toda-sua",
        "title": "A CULPA NÃO É\nTODA SUA",
        "script": (
            "Para tudo. Olha pra você. "
            "Você trabalha. Você se esforça. E mesmo assim, dia doze o salário sumiu. "
            "Não é incompetência sua. "
            "A escola não te ensinou. Sua família talvez não soubesse. "
            "O banco lucra com a sua confusão. "
            "O sistema foi desenhado pra você pagar juros, não pra você receber. "
            "Mas existe um método. Brasileiro. Real. Testado. "
            "E quando você aprende as regras certas, o jogo vira. "
            "O Código da Virada Financeira tem o passo a passo. "
            "Sete capítulos. Vinte e sete reais. Hoje. "
            "Link na bio. Sua virada começa quando você decidir."
        ),
        "frames": [
            ("PARA.\nRESPIRA.\nASSISTE.", 0.00, 0.08),
            ("78% DAS FAMÍLIAS\nNO MESMO LUGAR", 0.08, 0.25),
            ("A CULPA NÃO É\nTODA SUA", 0.25, 0.50),
            ("EXISTE UM\nMÉTODO REAL", 0.50, 0.75),
            ("CÓDIGO DA VIRADA\nR$ 27", 0.75, 0.92),
            ("LINK NA BIO ↑", 0.92, 1.00),
        ],
    },
    {
        "id": 2,
        "slug": "dois-cenarios-em-12-meses",
        "title": "DOIS CENÁRIOS\nEM 12 MESES",
        "script": (
            "Daqui a doze meses você vai estar em UM de dois lugares. "
            "Cenário A: continuou como tá. "
            "Mais trezentos e sessenta e cinco dias de boleto, fatura, juro, vergonha. "
            "Acordando três da manhã com o coração apertado. "
            "Aplicativo do banco que você não tem coragem de abrir. "
            "Cenário B: dívida tóxica zerada. "
            "Reserva crescendo. Renda extra rodando. "
            "Primeiros investimentos. Sono tranquilo. Confiança recuperada. "
            "A diferença entre os dois NÃO é sorte. "
            "É decisão tomada hoje. "
            "E mantida em todas as terças, sextas e domingos pelos próximos doze meses. "
            "Código da Virada. Vinte e sete reais. Link na bio. "
            "Qual cenário você escolhe?"
        ),
        "frames": [
            ("2 CENÁRIOS\n365 DIAS\n1 ESCOLHA", 0.00, 0.10),
            ("CENÁRIO A\nVOCÊ NÃO\nFEZ NADA", 0.10, 0.35),
            ("CENÁRIO B\nVOCÊ APLICOU\nO MÉTODO", 0.35, 0.65),
            ("NÃO É SORTE.\nÉ MÉTODO.", 0.65, 0.85),
            ("R$ 27\nLINK NA BIO ↑", 0.85, 1.00),
        ],
    },
    {
        "id": 3,
        "slug": "o-segredo-dos-bancos",
        "title": "O SEGREDO\nDOS BANCOS",
        "script": (
            "Tem um segredo que o banco nunca vai te contar. "
            "Eles preferem receber trinta por cento agora "
            "do que cem por cento nunca. "
            "Existe um setor de recuperação de crédito "
            "com orçamento de desconto que ninguém divulga. "
            "Maria devia dezoito mil em cartão. "
            "Tinha vergonha de ligar. Quase entrou em depressão. "
            "Pegou um roteiro de cinco frases. Ligou. "
            "Em quatorze minutos: oitenta e sete por cento de desconto à vista. "
            "Você não tá pedindo favor. "
            "Você tá oferecendo dinheiro pra uma empresa "
            "que considerou aquela dívida como perdida. "
            "Você está NO CONTROLE. "
            "Os scripts exatos, palavra por palavra, "
            "estão no Código da Virada. Vinte e sete reais. "
            "Link na bio. Para de fugir. Liga."
        ),
        "frames": [
            ("O SEGREDO\nDOS BANCOS", 0.00, 0.10),
            ("DESCONTO\nDE ATÉ\n95%", 0.10, 0.30),
            ("R$ 18.000\n→ R$ 2.340\nEM 14 MIN", 0.30, 0.55),
            ("VOCÊ ESTÁ\nNO CONTROLE", 0.55, 0.80),
            ("5 SCRIPTS\nPRONTOS\nR$ 27", 0.80, 0.94),
            ("LINK NA BIO ↑", 0.94, 1.00),
        ],
    },
    {
        "id": 4,
        "slug": "estudar-financas-e-a-nova-riqueza",
        "title": "ESTUDAR FINANÇAS\nÉ A NOVA RIQUEZA",
        "script": (
            "Quer saber quem vai estar rico daqui a cinco anos? "
            "Não é quem ganha mais. "
            "É quem ESTUDA mais sobre dinheiro. "
            "Quem se aprofunda. "
            "Quem para de scrollar e começa a aprender. "
            "Enquanto a maioria assiste briga de famoso, "
            "uma minoria silenciosa tá aprendendo a negociar dívida, "
            "montar reserva, gerar renda extra. "
            "Em silêncio. Todo dia. "
            "O Código da Virada é o atalho. "
            "Sete capítulos. "
            "Tudo que funciona pro brasileiro real. "
            "Sem teoria gringa. "
            "Vinte e sete reais. Link na bio. Vai estudar."
        ),
        "frames": [
            ("QUEM VAI\nVIRAR O JOGO?", 0.00, 0.10),
            ("CONHECIMENTO\n>\nSALÁRIO", 0.10, 0.35),
            ("A MINORIA\nSILENCIOSA\nVENCE", 0.35, 0.65),
            ("7 CAPÍTULOS\n4 BÔNUS\nR$ 27", 0.65, 0.90),
            ("LINK NA BIO ↑", 0.90, 1.00),
        ],
    },
    {
        "id": 5,
        "slug": "o-dia-1-e-hoje",
        "title": "O DIA 1\nÉ HOJE",
        "script": (
            "Toda virada começa num dia um. "
            "O seu pode ser hoje. "
            "Não precisa começar grande. "
            "Cinquenta reais na reserva. "
            "Uma assinatura cancelada. "
            "Uma dívida negociada. "
            "Uma ideia de renda extra anunciada no grupo do bairro. "
            "Em trinta dias você não reconhece sua organização. "
            "Em noventa, sua reserva começa a respirar. "
            "Em doze meses, você olha pra trás e fala: "
            "foi aqui que eu virei. "
            "O Código da Virada Financeira te dá o mapa completo. "
            "Sete capítulos. Quatro bônus. Garantia de sete dias. "
            "Vinte e sete reais. Link na bio. "
            "Seu dia um é agora."
        ),
        "frames": [
            ("DIA 1", 0.00, 0.10),
            ("PEQUENO.\nCONSTANTE.", 0.10, 0.35),
            ("30 · 90 · 365\nDIAS", 0.35, 0.65),
            ("MAPA COMPLETO\nGARANTIA 7 DIAS", 0.65, 0.88),
            ("DIA 1 É AGORA\nLINK NA BIO ↑", 0.88, 1.00),
        ],
    },
]


def make_bg(duration: float) -> ImageClip:
    """Background dark cinematográfico com gradiente vertical e linhas de marca."""
    img = Image.new("RGB", (W, H), BG_DARK)
    pixels = img.load()
    # Gradient subtle: top a bit lighter than bottom
    for y in range(H):
        t = y / H
        r = int(BG_DARK[0] + (10 - BG_DARK[0]) * (1 - t) * 0.3)
        g = int(BG_DARK[1] + (25 - BG_DARK[1]) * (1 - t) * 0.3)
        b = int(BG_DARK[2] + (45 - BG_DARK[2]) * (1 - t) * 0.3)
        for x in range(W):
            pixels[x, y] = (r, g, b)

    # Vinheta circular escura
    overlay = Image.new("RGB", (W, H), BG_DARK)
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([-W // 2, -H // 4, W + W // 2, H + H // 4], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(180))
    img = Image.composite(img, overlay, mask)

    # Linha verde no topo, dourada no rodapé
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 14], fill=GREEN)
    d.rectangle([0, H - 14, W, H], fill=GOLD)

    # Brand watermark no rodapé
    try:
        from PIL import ImageFont

        font = ImageFont.truetype(FONT_BOLD, 32)
        text = "CÓDIGO DA VIRADA"
        bbox = d.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) / 2, H - 90), text, font=font, fill=GOLD_SOFT)
    except Exception:
        pass

    bg_path = "/tmp/bg_codigo.png"
    Path("/tmp").mkdir(exist_ok=True)
    img.save(bg_path)
    return ImageClip(bg_path).with_duration(duration)


def render_video(video: dict, out_dir: Path) -> None:
    print(f"\n→ [{video['id']}/5] {video['title'].replace(chr(10), ' ')}")

    audio_path = out_dir / f"_audio_{video['id']}.mp3"
    print(f"  · gerando narração TTS …")
    tts = gTTS(text=video["script"], lang="pt", tld="com.br", slow=False)
    tts.save(str(audio_path))

    audio = AudioFileClip(str(audio_path))
    duration = audio.duration
    print(f"  · duração da narração: {duration:.1f}s")

    bg = make_bg(duration)

    clips = [bg]
    for text, t_start_norm, t_end_norm in video["frames"]:
        start = t_start_norm * duration
        end = t_end_norm * duration
        seg = end - start
        if seg <= 0.1:
            continue
        try:
            tc = (
                TextClip(
                    text=text,
                    font=FONT_IMPACT,
                    font_size=140,
                    color="white",
                    method="caption",
                    size=(W - 120, None),
                    text_align="center",
                    stroke_color="black",
                    stroke_width=5,
                )
                .with_position("center")
                .with_start(start)
                .with_duration(seg)
                .with_effects([])
            )
            clips.append(tc)
        except Exception as e:
            print(f"    ! falha no texto '{text[:20]}': {e}")

    # CTA persistente no rodapé
    try:
        cta = (
            TextClip(
                text="R$ 27 · LINK NA BIO",
                font=FONT_BOLD,
                font_size=56,
                color="white",
                method="caption",
                size=(W - 120, None),
                text_align="center",
                bg_color=GREEN,
            )
            .with_position(("center", H - 220))
            .with_start(duration * 0.6)
            .with_duration(duration * 0.4)
        )
        clips.append(cta)
    except Exception:
        pass

    final = CompositeVideoClip(clips, size=(W, H)).with_audio(audio).with_duration(duration)

    out_path = out_dir / f"video-{video['id']}-{video['slug']}.mp4"
    print(f"  · renderizando MP4 …")
    final.write_videofile(
        str(out_path),
        fps=24,
        codec="libx264",
        audio_codec="aac",
        preset="ultrafast",
        threads=4,
        logger=None,
    )
    final.close()
    audio.close()
    audio_path.unlink(missing_ok=True)
    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"  ✔ {out_path.name}  ({size_mb:.1f} MB)")


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    out_dir = root / "public" / "marketing" / "videos"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"📁 saída: {out_dir}")
    for v in VIDEOS:
        try:
            render_video(v, out_dir)
        except Exception as e:
            print(f"  ✘ falhou: {e}")
            import traceback

            traceback.print_exc()

    print("\n✅ pronto. arquivos:")
    for p in sorted(out_dir.glob("*.mp4")):
        size = p.stat().st_size / 1024 / 1024
        print(f"  {p.name}  ({size:.1f} MB)")


if __name__ == "__main__":
    main()
