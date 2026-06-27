#!/usr/bin/env node
/**
 * Live API vertical-slice QA: upload → queue → forecast → verify → export → analyst.
 * Requires Postgres + migrated API at E2E_API_BASE (default http://127.0.0.1:8000).
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const apiRoot = path.join(repoRoot, "apps/api");
const apiBase = (process.env.E2E_API_BASE ?? "http://127.0.0.1:8000").replace(/\/$/, "");
const delawareBbox = "-75.7,40.1,-73.9,41.3";

const results = [];

function log(step, ok, detail = "") {
  results.push({ step, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${step}${detail ? ` — ${detail}` : ""}`);
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
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message =
      typeof body === "object" && body?.detail
        ? JSON.stringify(body.detail)
        : typeof body === "object" && body?.message
          ? body.message
          : text.slice(0, 240);
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }
  return body;
}

function runDemo() {
  const pythonBin = existsSync(path.join(apiRoot, ".venv/bin/python"))
    ? path.join(apiRoot, ".venv/bin/python")
    : "python3";
  const output = execFileSync(pythonBin, ["-m", "app.scripts.demo"], {
    cwd: apiRoot,
    encoding: "utf8",
  });
  return JSON.parse(output);
}

async function main() {
  console.log(`EcoSentinel E2E MVP QA — ${apiBase}\n`);

  try {
    const health = await fetchJson(`${apiBase}/health`);
    log("API health", health?.status === "ok", health?.service ?? "");
  } catch (error) {
    log("API health", false, String(error));
    printSummary();
    process.exit(1);
  }

  let demo;
  try {
    demo = runDemo();
    log(
      "Demo seed + backend vertical slice",
      Boolean(demo.research_experience?.reviewer_id),
      `reviewer=${demo.research_experience?.reviewer_id?.slice(0, 8)}…`,
    );
  } catch (error) {
    log("Demo seed + backend vertical slice", false, String(error));
    printSummary();
    process.exit(1);
  }

  const reviewerId = demo.research_experience.reviewer_id;
  const suffix = Date.now();

  let consumerId;
  try {
    const user = await fetchJson(`${apiBase}/users`, {
      method: "POST",
      body: JSON.stringify({
        email: `e2e-consumer-${suffix}@example.com`,
        display_name: "E2E Consumer",
        role: "consumer",
      }),
    });
    consumerId = user.id;
    log("Create consumer user", Boolean(consumerId), consumerId);
  } catch (error) {
    log("Create consumer user", false, String(error));
    printSummary();
    process.exit(1);
  }

  let observationId;
  try {
    const created = await fetchJson(`${apiBase}/observations`, {
      method: "POST",
      body: JSON.stringify({
        user_id: consumerId,
        timestamp: new Date().toISOString(),
        latitude: "40.714000",
        longitude: "-74.006000",
        region_code: "NY",
        privacy_level: "obscured",
        habitat_answers: {
          organism_type: "plant",
          growth_pattern: "patch",
          near_water: "yes",
          near_road_or_trail: "yes",
          habitat_type: "wetland",
        },
        raw_note: `E2E QA sighting ${suffix}`,
      }),
    });
    observationId = created.observation_id;
    log("Upload observation (mobile Report equivalent)", Boolean(observationId), observationId);
  } catch (error) {
    log("Upload observation (mobile Report equivalent)", false, String(error));
    printSummary();
    process.exit(1);
  }

  let mediaId;
  try {
    const media = await fetchJson(`${apiBase}/observations/${observationId}/media`, {
      method: "POST",
      body: JSON.stringify({
        file_type: "image",
        mime_type: "image/jpeg",
        storage_key: `e2e/${observationId}/photo.jpg`,
        public_url: "https://example.test/ecosentinel/e2e-photo.jpg",
        original_filename: "e2e-photo.jpg",
        size_bytes: 256000,
        quality_score: "88.00",
        metadata_removed: true,
      }),
    });
    mediaId = media.id;
    log("Attach media evidence", Boolean(mediaId), mediaId);
  } catch (error) {
    log("Attach media evidence", false, String(error));
  }

  let identification;
  if (mediaId) {
    try {
      identification = await fetchJson(`${apiBase}/observations/${observationId}/identify`, {
        method: "POST",
        body: JSON.stringify({ media_id: mediaId }),
      });
      log(
        "Species identification",
        Boolean(identification?.candidate_species_id ?? identification?.candidate_common_name),
        identification?.candidate_common_name ?? identification?.confidence_label,
      );
    } catch (error) {
      log("Species identification", false, String(error));
    }
  }

  try {
    const pipeline = await fetchJson(`${apiBase}/observations/${observationId}/pipeline-status`);
    log(
      "Pipeline status",
      pipeline?.observation_id === observationId,
      `stages=${Object.keys(pipeline?.stages ?? {}).length}`,
    );
  } catch (error) {
    log("Pipeline status", false, String(error));
  }

  try {
    const forecast = await fetchJson(
      `${apiBase}/forecast/research?bbox=${encodeURIComponent(delawareBbox)}&requester_id=${reviewerId}`,
    );
    const featureCount = forecast?.features?.length ?? forecast?.metadata?.feature_count ?? 0;
    log("Forecast map research payload", featureCount > 0, `${featureCount} features`);
  } catch (error) {
    log("Forecast map research payload", false, String(error));
  }

  let inQueue = false;
  try {
    const queue = await fetchJson(
      `${apiBase}/research/verification-queue?requester_id=${reviewerId}`,
    );
    inQueue = Array.isArray(queue) && queue.some((item) => item.observation_id === observationId);
    log(
      "Verification queue contains new sighting",
      inQueue,
      `${queue?.length ?? 0} queue items`,
    );
  } catch (error) {
    log("Verification queue contains new sighting", false, String(error));
  }

  const speciesId = identification?.candidate_species_id;
  if (inQueue && speciesId) {
    try {
      const verification = await fetchJson(`${apiBase}/verification/${observationId}`, {
        method: "POST",
        body: JSON.stringify({
          status: "expert_verified",
          reviewer_id: reviewerId,
          verified_species_id: speciesId,
          review_notes: "E2E QA expert verification.",
        }),
      });
      log("Reviewer verifies observation", verification?.status === "expert_verified", verification?.status);
    } catch (error) {
      log("Reviewer verifies observation", false, String(error));
    }
  } else {
    log(
      "Reviewer verifies observation",
      false,
      inQueue ? "missing species id from identification" : "observation not in queue yet",
    );
  }

  try {
    const history = await fetchJson(
      `${apiBase}/verification/${observationId}/history?requester_id=${reviewerId}`,
    );
    log(
      "Verification history",
      Array.isArray(history) && history.length > 0,
      `${history?.length ?? 0} events`,
    );
  } catch (error) {
    log("Verification history", false, String(error));
  }

  try {
    const exportJob = await fetchJson(`${apiBase}/research/export`, {
      method: "POST",
      body: JSON.stringify({
        requester_id: reviewerId,
        format: "csv",
        filters: { region_code: "NY", visible_records: 1 },
        include_media_urls: true,
        include_environmental_context: true,
        include_signal_scores: true,
        include_verification: true,
      }),
    });
    const hasDownload =
      typeof exportJob?.download_url === "string" && exportJob.download_url.startsWith("data:");
    log(
      "Research CSV export + download_url",
      exportJob?.status === "complete" && hasDownload,
      exportJob?.status,
    );
  } catch (error) {
    log("Research CSV export + download_url", false, String(error));
  }

  try {
    const analyst = await fetchJson(`${apiBase}/assistant/context/research`, {
      method: "POST",
      body: JSON.stringify({
        requester_id: reviewerId,
        question_type: "verification_priority",
        filters: { region_code: "NY" },
      }),
    });
    log(
      "AI Analyst research context",
      (analyst?.filtered_observation_summary?.matched_observation_count ?? 0) > 0,
      `${analyst?.top_records?.length ?? 0} top records`,
    );
  } catch (error) {
    log("AI Analyst research context", false, String(error));
  }

  try {
    const card = await fetchJson(`${apiBase}/observations/${observationId}/intelligence-card`);
    log("Intelligence card (mobile detail)", Boolean(card?.observation_id), card?.possible_species?.common_name);
  } catch (error) {
    log("Intelligence card (mobile detail)", false, String(error));
  }

  printSummary();
  const failed = results.filter((row) => !row.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((row) => row.ok).length;
  console.log(`\nSummary: ${passed}/${results.length} checks passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
