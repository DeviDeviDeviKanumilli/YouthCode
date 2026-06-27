#!/usr/bin/env node
/**
 * Web dashboard API-mode QA — exercises the same endpoints as apps/web/src/api.ts.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const apiRoot = path.resolve(webRoot, "../api");
const apiBase = (process.env.QA_API_BASE ?? "http://127.0.0.1:8000").replace(/\/$/, "");
const delawareBbox = "-75.7,40.1,-73.9,41.3";
const fromDate = "2026-06-01";
const toDate = "2026-06-30";

const results = [];

function log(step, ok, detail = "") {
  results.push({ step, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${step}${detail ? ` — ${detail}` : ""}`);
}

function loadRequesterId() {
  const envPath = path.join(webRoot, ".env.local");
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, "utf8").match(/^VITE_REQUESTER_ID=(.+)$/m);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  const pythonBin = existsSync(path.join(apiRoot, ".venv/bin/python"))
    ? path.join(apiRoot, ".venv/bin/python")
    : "python3";
  const output = execFileSync(pythonBin, ["-m", "app.scripts.demo"], {
    cwd: apiRoot,
    encoding: "utf8",
  });
  return JSON.parse(output).research_experience.reviewer_id;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${response.status}: ${text.slice(0, 200)}`);
  }
  return body;
}

function buildResearchQuery(requesterId) {
  const params = new URLSearchParams({
    requester_id: requesterId,
    bbox: delawareBbox,
    from_date: `${fromDate}T00:00:00Z`,
    to_date: `${toDate}T23:59:59Z`,
    limit: "100",
  });
  return params.toString();
}

async function main() {
  console.log(`Web dashboard API-mode QA — ${apiBase}\n`);

  let requesterId;
  try {
    requesterId = loadRequesterId();
    log("Resolve reviewer requester_id", Boolean(requesterId), requesterId?.slice(0, 8) + "…");
  } catch (error) {
    log("Resolve reviewer requester_id", false, String(error));
    printSummary();
    process.exit(1);
  }

  let observations = [];
  try {
    const page = await fetchJson(
      `${apiBase}/research/observations?${buildResearchQuery(requesterId)}`,
    );
    observations = page?.items ?? [];
    log(
      "GET /research/observations (dashboard table)",
      Array.isArray(observations) && observations.length > 0,
      `${observations.length} rows (total ${page?.total ?? observations.length})`,
    );
  } catch (error) {
    log("GET /research/observations (dashboard table)", false, String(error));
  }

  let queue = [];
  try {
    queue = await fetchJson(`${apiBase}/research/verification-queue?requester_id=${requesterId}`);
    log(
      "GET /research/verification-queue",
      Array.isArray(queue) && queue.length > 0,
      `${queue.length} items`,
    );
  } catch (error) {
    log("GET /research/verification-queue", false, String(error));
  }

  const targetId = queue[0]?.observation_id ?? observations[0]?.id;
  if (targetId) {
    try {
      const history = await fetchJson(
        `${apiBase}/verification/${targetId}/history?requester_id=${requesterId}`,
      );
      log(
        "GET /verification/{id}/history",
        Array.isArray(history),
        `${history.length} events for ${targetId}`,
      );
    } catch (error) {
      log("GET /verification/{id}/history", false, String(error));
    }

    try {
      const verification = await fetchJson(`${apiBase}/verification/${targetId}`, {
        method: "POST",
        body: JSON.stringify({
          status: "needs_more_evidence",
          reviewer_id: requesterId,
          review_notes: "E2E web QA — request clearer habitat photo.",
        }),
      });
      log(
        "POST /verification/{id} (needs more evidence)",
        verification?.status === "needs_more_evidence",
        verification?.status,
      );
    } catch (error) {
      log("POST /verification/{id} (needs more evidence)", false, String(error));
    }
  } else {
    log("POST /verification/{id} (needs more evidence)", false, "no target observation");
  }

  try {
    const exportJob = await fetchJson(`${apiBase}/research/export`, {
      method: "POST",
      body: JSON.stringify({
        requester_id: requesterId,
        format: "csv",
        filters: {
          region_code: "Delaware River Basin",
          from_date: fromDate,
          to_date: toDate,
          visible_records: observations.length,
        },
        include_media_urls: true,
        include_environmental_context: true,
        include_signal_scores: true,
        include_verification: true,
      }),
    });
    log(
      "POST /research/export + download_url",
      exportJob?.status === "complete" && Boolean(exportJob?.download_url),
      exportJob?.status,
    );
  } catch (error) {
    log("POST /research/export + download_url", false, String(error));
  }

  try {
    const exports = await fetchJson(`${apiBase}/research/exports?requester_id=${requesterId}`);
    log(
      "GET /research/exports (history)",
      Array.isArray(exports) && exports.length > 0,
      `${exports.length} exports`,
    );
  } catch (error) {
    log("GET /research/exports (history)", false, String(error));
  }

  try {
    const forecast = await fetchJson(
      `${apiBase}/forecast/research?bbox=${encodeURIComponent(delawareBbox)}&requester_id=${requesterId}`,
    );
    const count = forecast?.features?.length ?? 0;
    log("GET /forecast/research (map layers)", count > 0, `${count} features`);
  } catch (error) {
    log("GET /forecast/research (map layers)", false, String(error));
  }

  try {
    const gaps = await fetchJson(
      `${apiBase}/sampling-gaps?mode=research&bbox=${encodeURIComponent(delawareBbox)}&requester_id=${requesterId}`,
    );
    const count = gaps?.features?.length ?? 0;
    log("GET /sampling-gaps (research)", count > 0, `${count} cells`);
  } catch (error) {
    log("GET /sampling-gaps (research)", false, String(error));
  }

  try {
    const analyst = await fetchJson(`${apiBase}/assistant/context/research`, {
      method: "POST",
      body: JSON.stringify({
        requester_id: requesterId,
        question_type: "verification_priority",
        filters: { needs_review: true, visible_records: observations.length },
      }),
    });
    log(
      "POST /assistant/context/research (AI Analyst)",
      (analyst?.top_records?.length ?? 0) > 0,
      `matched=${analyst?.filtered_observation_summary?.matched_observation_count ?? 0}`,
    );
  } catch (error) {
    log("POST /assistant/context/research (AI Analyst)", false, String(error));
  }

  printSummary();
  process.exit(results.some((row) => !row.ok) ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((row) => row.ok).length;
  console.log(`\nSummary: ${passed}/${results.length} checks passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
