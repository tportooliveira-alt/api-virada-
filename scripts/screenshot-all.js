// Capture screenshots of all virada-app pages while pre-seeding the AuthGate
// localStorage so we skip the Google login screen.
// Usage: node scripts/screenshot-all.js
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUTDIR = "C:\\Users\\Thiago Porto\\codigo-da-virada\\_validacao-screenshots";
const BASE = "http://localhost:3000";

const PAGES = [
  { name: "raiz",          url: "/" },
  { name: "inicio",        url: "/app/inicio" },
  { name: "lancar",        url: "/app/lancar" },
  { name: "gastos",        url: "/app/gastos" },
  { name: "dividas",       url: "/app/dividas" },
  { name: "metas",         url: "/app/metas" },
  { name: "missoes",       url: "/app/missoes" },
  { name: "conta",         url: "/app/conta" },
  { name: "aprendizado",   url: "/app/aprendizado" },
  { name: "evolucao",      url: "/app/evolucao" },
  { name: "planilha-demo", url: "/app/planilha-demo" },
  { name: "instalar",      url: "/app/instalar" },
  { name: "admin-membros", url: "/admin/membros" },
];

const ACCESS = {
  email: "dev@localhost",
  sub: "dev-local",
  name: "Dev Local",
  picture: null,
  status: "ativo",
  checkedAt: new Date().toISOString(),
};

(async () => {
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
    defaultViewport: { width: 1280, height: 1800 },
  });

  const results = [];

  for (const p of PAGES) {
    const page = await browser.newPage();
    const errors = [];
    const consoleErrors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Seed localStorage on the same origin BEFORE the real navigation.
    await page.goto(BASE + "/?seed=1", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await page.evaluate((rec) => {
      try { localStorage.setItem("virada_access_v2", JSON.stringify(rec)); } catch {}
    }, ACCESS);

    let status = 0;
    let renderText = "";
    try {
      const resp = await page.goto(BASE + p.url, { waitUntil: "networkidle2", timeout: 45000 });
      status = resp ? resp.status() : 0;
      // Wait for client-side hydration to finish (AuthGate stage transitions).
      await new Promise((r) => setTimeout(r, 4000));
      renderText = (await page.evaluate(() => document.body.innerText || "")).slice(0, 300).replace(/\s+/g, " ").trim();
    } catch (e) {
      errors.push("NAV_ERROR: " + e.message);
    }

    const outFile = path.join(OUTDIR, `virada-app-${p.name}.png`);
    try {
      await page.screenshot({ path: outFile, fullPage: false });
    } catch (e) {
      errors.push("SCREENSHOT_ERROR: " + e.message);
    }

    const size = fs.existsSync(outFile) ? fs.statSync(outFile).size : 0;
    results.push({
      page: p.url,
      file: `virada-app-${p.name}.png`,
      status,
      sizeBytes: size,
      pageErrors: errors,
      consoleErrors,
      preview: renderText,
    });

    await page.close();
  }

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
