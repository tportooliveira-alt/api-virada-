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
          bg: "#07111F",
          bgSoft: "#0B1020",
          green: "#22C55E",
          gold: "#F5C542",
          white: "#FFFFFF",
          gray: "#CBD5E1",
          slate: "#94A3B8",
          line: "rgba(203, 213, 225, 0.12)",
          card: "rgba(11, 16, 32, 0.78)",
        },
      },
      boxShadow: {
        glow: "0 18px 48px rgba(0, 0, 0, 0.28)",
        panel: "0 10px 30px rgba(0, 0, 0, 0.22)",
      },
      backgroundImage: {
        hero:
          "radial-gradient(circle at top left, rgba(34, 197, 94, 0.16), transparent 34%), radial-gradient(circle at right top, rgba(245, 197, 66, 0.12), transparent 24%), linear-gradient(180deg, #07111F 0%, #0B1020 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
