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
          bg: "#F4F7F5",
          bgSoft: "#E8F0EC",
          green: "#0EA978",
          gold: "#DDAF2B",
          white: "#133335",
          gray: "#647875",
          slate: "#3C5552",
          line: "rgba(19, 51, 53, 0.12)",
          card: "#FFFFFF",
          ink: "#133335",
          coral: "#E6674F",
          lime: "#CBEA6B",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "Segoe UI", "sans-serif"],
        display: ["var(--font-sora)", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        glow: "0 24px 64px rgba(19, 51, 53, 0.14)",
        panel: "0 10px 30px rgba(19, 51, 53, 0.08)",
      },
      backgroundImage: {
        hero:
          "radial-gradient(circle at top left, rgba(203, 234, 107, 0.32), transparent 34%), radial-gradient(circle at right top, rgba(14, 169, 120, 0.16), transparent 28%), linear-gradient(180deg, #F8FAF8 0%, #EEF3F0 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
