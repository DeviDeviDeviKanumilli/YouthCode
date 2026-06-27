import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const artifactsDir = path.join(rootDir, "artifacts");
const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4173";

const screens = [
  "overview",
  "verification",
  "observations",
  "forecast",
  "sampling",
  "exports",
  "analyst",
  "settings",
];

async function capture(page, name) {
  await page.screenshot({
    path: path.join(artifactsDir, `${name}.png`),
    fullPage: true,
  });
}

async function main() {
  await mkdir(artifactsDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".app-shell");
  await capture(page, "overview");

  await page.fill('input[aria-label="Search observations"]', "no matching ecological record");
  await page.waitForTimeout(300);
  await capture(page, "overview-empty");

  await page.fill('input[aria-label="Search observations"]', "");
  await page.waitForTimeout(300);

  for (const screen of screens.slice(1)) {
    await page.click(`button.nav-item:has-text("${screen === "verification" ? "Verification Queue" : screen === "forecast" ? "Forecast Map" : screen === "sampling" ? "Sampling Gaps" : screen === "exports" ? "Exports" : screen === "analyst" ? "AI Analyst" : "Settings"}")`);
    await page.waitForTimeout(400);
    await capture(page, screen);
  }

  await page.click('button.nav-item:has-text("Forecast Map")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Open in queue")');
  await page.waitForTimeout(400);
  await capture(page, "forecast-action-navigation");

  await page.click('button.nav-item:has-text("Verification Queue")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("View on map")');
  await page.waitForTimeout(400);
  await capture(page, "verification-action-navigation");

  await page.click('button.nav-item:has-text("Observations")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Flag")');
  await page.waitForTimeout(250);
  await page.click('button:has-text("Add to sampling plan")');
  await page.waitForTimeout(250);
  await capture(page, "observations-actions");

  await page.click('button.nav-item:has-text("Exports")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Retry")');
  await page.waitForTimeout(400);
  await capture(page, "exports-retry");

  await browser.close();
  console.log(`Smoke screenshots written to ${artifactsDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
