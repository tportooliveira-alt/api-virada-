import sys
from pathlib import Path


def fmt_time(seconds: float) -> str:
    ms = int((seconds - int(seconds)) * 1000)
    s = int(seconds) % 60
    m = (int(seconds) // 60) % 60
    h = int(seconds) // 3600
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def chunk_text(text: str, max_chars: int = 42) -> list[str]:
    words = text.split()
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for word in words:
        add_len = len(word) + (1 if current else 0)
        if current_len + add_len <= max_chars:
            current.append(word)
            current_len += add_len
            continue

        chunks.append(" ".join(current))
        current = [word]
        current_len = len(word)

    if current:
        chunks.append(" ".join(current))

    return chunks


def main() -> int:
    if len(sys.argv) != 4:
        print("Uso: python scripts/make_srt.py <entrada.txt> <saida.srt> <duracao_total>")
        return 1

    in_file = Path(sys.argv[1])
    out_file = Path(sys.argv[2])
    total_seconds = float(sys.argv[3])

    text = in_file.read_text(encoding="utf-8").strip()
    chunks = chunk_text(text)
    duration = total_seconds / max(len(chunks), 1)

    lines: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        start = (index - 1) * duration
        end = index * duration - 0.05
        lines.append(str(index))
        lines.append(f"{fmt_time(start)} --> {fmt_time(end)}")
        lines.append(chunk)
        lines.append("")

    out_file.write_text("\n".join(lines), encoding="utf-8")
    print(f"SRT salvo em: {out_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
