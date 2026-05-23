// Quick screenshot script using child_process to invoke Chrome headless.
// Usage: node scripts/screenshot.js <url> <outpath>
const { spawnSync } = require("child_process");
const fs = require("fs");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const outPath = process.argv[3];

if (!url || !outPath) {
  console.error("Usage: node scripts/screenshot.js <url> <outpath>");
  process.exit(1);
}

const args = [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--hide-scrollbars",
  "--window-size=1280,1800",
  "--virtual-time-budget=8000",
  `--screenshot=${outPath}`,
  url,
];

const result = spawnSync(CHROME, args, { encoding: "utf8" });

if (result.error) {
  console.error("CHROME_ERROR", result.error.message);
  process.exit(2);
}

const exists = fs.existsSync(outPath);
const size = exists ? fs.statSync(outPath).size : 0;
console.log(`URL=${url}`);
console.log(`OUT=${outPath}`);
console.log(`EXIT=${result.status}`);
console.log(`FILE_EXISTS=${exists}`);
console.log(`SIZE_BYTES=${size}`);
if (result.stderr) console.log("STDERR:", result.stderr.slice(0, 400));
