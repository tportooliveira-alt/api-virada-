import type { Config } from "tailwindcss";

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
          bg: "#F3F8FF",
          bgSoft: "#E9F3FF",
          green: "#22C55E",
          gold: "#F5C542",
          white: "#0F172A",
          gray: "#475569",
          slate: "#334155",
          line: "rgba(15, 23, 42, 0.14)",
          card: "rgba(255, 255, 255, 0.9)",
        },
      },
      boxShadow: {
        glow: "0 14px 36px rgba(15, 23, 42, 0.14)",
        panel: "0 8px 24px rgba(15, 23, 42, 0.12)",
      },
      backgroundImage: {
        hero:
          "radial-gradient(circle at top left, rgba(34, 197, 94, 0.2), transparent 34%), radial-gradient(circle at right top, rgba(245, 197, 66, 0.16), transparent 24%), linear-gradient(180deg, #F7FBFF 0%, #EAF5FF 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
