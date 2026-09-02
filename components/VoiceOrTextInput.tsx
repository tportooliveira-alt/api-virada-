"use client";

import { useState } from "react";
import { Mic, PenLine } from "lucide-react";
import { ParsedFinancialInput } from "@/lib/types";
import { parseFinancialInput } from "@/lib/parse-financial-input";

interface VoiceOrTextInputProps {
  onParsed: (parsed: ParsedFinancialInput) => void;
}

type SpeechRecognitionConstructor = new () => {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
};

export function VoiceOrTextInput({ onParsed }: VoiceOrTextInputProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"voice" | "text">("text");
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);

  function parse(text: string) {
    const parsed = parseFinancialInput(text);

    if (!parsed) {
      setMessage("Não consegui identificar o valor. Tente escrever como: Gastei 35 reais no mercado.");
      return;
    }

    setMessage("");
    onParsed(parsed);
  }

  function startListening() {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage("Seu navegador não permite reconhecimento de voz. Você pode escrever normalmente.");
      setMode("text");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setMessage("Não consegui ouvir com clareza. Você pode escrever normalmente.");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setInput(transcript);
      parse(transcript);
    };
    recognition.start();
  }

  return (
    <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
      <h2 className="text-2xl font-semibold leading-tight text-white">
        Fale ou escreva o movimento financeiro. O app organiza para você.
      </h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setMode("voice");
            startListening();
          }}
          className="flex min-h-20 items-center justify-center gap-3 rounded-lg bg-emerald-500 px-5 py-4 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          <Mic className="h-6 w-6" />
          {isListening ? "Ouvindo..." : "Falar"}
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className="flex min-h-20 items-center justify-center gap-3 rounded-lg border border-virada-line bg-white/5 px-5 py-4 text-lg font-semibold text-white transition hover:bg-white/10"
        >
          <PenLine className="h-6 w-6" />
          Escrever
        </button>
      </div>

      <div className="mt-5 grid gap-2 rounded-lg bg-slate-950/35 p-4 text-sm text-virada-gray">
        <span>Vendi 250 reais no Pix</span>
        <span>Recebi 100 reais de cliente</span>
        <span>Comprei 80 reais de mercadoria</span>
        <span>Paguei 35 reais de energia da empresa</span>
      </div>

      {mode === "text" ? (
        <div className="mt-5 grid gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ex: Vendi 250 reais no Pix"
            className="min-h-32 rounded-lg border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
          <button
            onClick={() => parse(input)}
            className="min-h-12 rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Interpretar
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm text-amber-200">{message}</p> : null}
    </section>
  );
}
