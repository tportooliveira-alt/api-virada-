import type { Config } from "tailwindcss";

// Direção "Editorial Financeiro" (2026-06) — herda a craft da landing (anti-AI-slop).
// Dark PREMIUM (navy quase-preto da landing), verde-emerald suave, dourado da landing.
// Tipografia: Instrument Serif (títulos) + Barlow (corpo). Ver CLAUDE.md.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./providers/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        virada: {
          bg: "#0a0a0c",       // navy quase-preto da landing (era #07111F frio)
          bgSoft: "#121316",   // cartela um tom acima
          green: "#34d399",    // emerald suave (era neon #22C55E)
          gold: "#f0a830",     // dourado da landing (era #F5C542)
          white: "#FFFFFF",
          gray: "#CBD5E1",     // texto claro (dark — segue funcionando)
          slate: "#8b92a0",    // texto secundário
          line: "rgba(255, 255, 255, 0.08)",  // hairline premium sutil
          card: "rgba(255, 255, 255, 0.03)",  // card translúcido elegante
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 18px 48px rgba(0, 0, 0, 0.40)",
        panel: "0 10px 30px rgba(0, 0, 0, 0.30)",
      },
      backgroundImage: {
        hero:
          "radial-gradient(circle at top left, rgba(52, 211, 153, 0.10), transparent 32%), radial-gradient(circle at right top, rgba(240, 168, 48, 0.08), transparent 24%), linear-gradient(180deg, #0a0a0c 0%, #0c0d10 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
