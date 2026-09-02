import { execSync } from "node:child_process";

// Identifica a versão publicada. Vem do commit (estável entre `build` e `start`
// na VPS); sem git, cai num carimbo de tempo. O cliente compara o valor que foi
// embutido no bundle com o que /api/version devolve — se mudou, mostra "Atualizar".
function resolveBuildId() {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return Date.now().toString(36);
  }
}
const buildId = process.env.APP_BUILD_ID || resolveBuildId();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  generateBuildId: () => buildId,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  // Visitante sem login cai na landing de vendas (public/vendas.html, gerada por
  // scripts/build-vendas.mjs). O app continua em /app.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/vendas.html" },
        { source: "/vendas", destination: "/vendas.html" },
      ],
    };
  },
};

export default nextConfig;
