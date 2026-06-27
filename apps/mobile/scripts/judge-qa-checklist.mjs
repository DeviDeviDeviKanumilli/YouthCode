#!/usr/bin/env node
/**
 * Mobile judge demo QA — automated checks + manual checklist output.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const apiRoot = path.resolve(mobileRoot, "../api");
const apiBase = (process.env.E2E_API_BASE ?? "http://127.0.0.1:8000").replace(/\/$/, "");

const automated = [];
const manual = [
  "Explore map: forecast loads; pan/zoom; layer pills show counts",
  "Draggable sheet: Explore/Watch sheet snaps and scrolls independently",
  "Observation tap: pin opens Sighting Intelligence Card",
  "Demo scenarios: seeded scenario reframes map; Open card reaches detail",
  "Report flow: photo → clues → analyze → intelligence card + assistant context",
  "Draft resume: mid-report force-close → resume banner works",
  "Sightings list: cards open intelligence detail",
  "Watch: items and places load; map refresh works",
  "Profile: API/session/location status reflects backend",
  "Uncertainty copy: possible / needs verification framing only",
];

function log(name, ok, detail = "") {
  automated.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  return { ok: result.status === 0, stdout: result.stdout, stderr: result.stderr };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function main() {
  console.log("Mobile judge demo QA\n=== Automated ===\n");

  try {
    const health = await fetchJson(`${apiBase}/health`);
    log("API reachable for mobile", health?.status === "ok", apiBase);
  } catch (error) {
    log("API reachable for mobile", false, String(error));
  }

  const typecheck = run("npm", ["run", "typecheck"], mobileRoot);
  log("npm run typecheck", typecheck.ok, typecheck.ok ? "" : typecheck.stderr.trim().split("\n").pop());

  const tests = run("npm", ["test"], mobileRoot);
  log("npm test", tests.ok, tests.ok ? "unit tests pass" : tests.stderr.trim().split("\n").pop());

  const adb = spawnSync("adb", ["devices"], { encoding: "utf8" });
  const emulatorReady =
    adb.status === 0 && adb.stdout.split("\n").some((line) => line.includes("emulator") && line.includes("device"));
  console.log(
    `${emulatorReady ? "PASS" : "SKIP"}  Android emulator connected — ${
      emulatorReady ? "device ready for manual QA" : "optional; run emulator for full UI checklist"
    }`,
  );

  try {
    const watch = await fetchJson(`${apiBase}/consumer/watch?lat=40.714&lon=-74.006&radius_km=5`);
    const watchCount = watch?.watchedNearYou?.length ?? 0;
    log(
      "GET /consumer/watch (Watch screen data)",
      watchCount > 0,
      `${watchCount} watch cards`,
    );
  } catch (error) {
    log("GET /consumer/watch (Watch screen data)", false, String(error));
  }

  try {
    const forecast = await fetchJson(
      `${apiBase}/forecast/public?bbox=-74.03,40.69,-73.98,40.75`,
    );
    const count = forecast?.features?.length ?? forecast?.metadata?.feature_count ?? 0;
    log("GET /forecast/public (Explore map)", count > 0, `${count} features`);
  } catch (error) {
    log("GET /forecast/public (Explore map)", false, String(error));
  }

  try {
    const pythonBin = existsSync(path.join(apiRoot, ".venv/bin/python"))
      ? path.join(apiRoot, ".venv/bin/python")
      : "python3";
    const output = execFileSync(pythonBin, ["-m", "app.scripts.demo"], {
      cwd: apiRoot,
      encoding: "utf8",
    });
    const demo = JSON.parse(output);
    const card = await fetchJson(
      `${apiBase}/observations/${demo.consumer_experience.observation_id}/intelligence-card`,
    );
    log(
      "Intelligence card after demo upload pipeline",
      Boolean(card?.possible_species?.common_name),
      demo.consumer_experience.observation_id,
    );
  } catch (error) {
    log("Intelligence card after demo upload pipeline", false, String(error));
  }

  console.log("\n=== Manual (device/emulator) ===\n");
  manual.forEach((item, index) => {
    console.log(`${index + 1}. [ ] ${item}`);
  });

  const passed = automated.filter((row) => row.ok).length;
  console.log(`\nAutomated summary: ${passed}/${automated.length} passed`);
  console.log("Complete manual checklist on emulator with EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000");

  process.exit(automated.some((row) => !row.ok) ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
