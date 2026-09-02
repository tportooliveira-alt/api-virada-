import type { Config } from "tailwindcss";

// Tokens do Virada Design System v2 (.claude/skills/virada-design/tokens/*.css).
// Regras: verde só na ação principal e em valores positivos (texto verde = green-700);
// nenhum texto abaixo de 12px; R$ sempre com tabular-nums e sem quebra de linha.
const ink = {
  50: "#F8FAFC",
  100: "#F1F5F9",
  200: "#E5E9F0",
  300: "#CBD5E1",
  400: "#94A3B8",
  500: "#64748B",
  600: "#475569",
  700: "#334155",
  800: "#1E293B",
  900: "#0F172A",
};

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
        ink,
        green: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          700: "#15803D",
          800: "#166534",
          900: "#052E16",
        },
        amber: {
          50: "#FFFBEB",
          100: "#FDE68A",
          300: "#FCD34D",
          500: "#F5C542",
          700: "#B45309",
          800: "#92400E",
        },
        red: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        blue: {
          50: "#EFF6FF",
          700: "#1D4ED8",
        },
        // Alias legado: telas fora do redesign v2 (admin, missões, renda extra…)
        // ainda usam `virada-*`. Mapeado para os tokens novos até serem refeitas.
        virada: {
          bg: "#FFFFFF",
          bgSoft: ink[50],
          green: "#15803D",
          gold: "#B45309",
          white: ink[900],
          gray: ink[500],
          slate: ink[600],
          line: ink[200],
          card: "#FFFFFF",
          ink: ink[900],
          coral: "#B91C1C",
          lime: "#22C55E",
        },
      },
      fontFamily: {
        sans: ["var(--font-onest)", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
        display: ["var(--font-figtree)", "var(--font-onest)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.05)",
        float: "0 12px 32px rgba(15, 23, 42, 0.14)",
        segment: "0 1px 3px rgba(15, 23, 42, 0.12)",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
};

export default config;
