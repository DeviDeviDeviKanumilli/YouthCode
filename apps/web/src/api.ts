import {
  buildDemoPayload,
  buildExportRecord,
  delawareBasinBbox,
  enrichObservationFromQueue,
  mapApiAssistantContext,
  mapApiObservation,
  mapApiSamplingFeature,
  mapVerificationResponseStatus,
} from "./data";
import type {
  AnalystAnswer,
  DashboardPayload,
  ExportRecord,
  ExportRequest,
  ForecastPayload,
  VerificationRequest,
  VerificationStatus,
} from "./types";

const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
const apiBase =
  configuredApiBase ?? (import.meta.env.DEV ? "/api" : undefined);
const requesterId =
  import.meta.env.VITE_REQUESTER_ID ?? "00000000-0000-0000-0000-000000000000";
const apiToken = import.meta.env.VITE_API_TOKEN;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBase) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function verificationStatusToApi(status: VerificationStatus): string {
  const mapping: Record<VerificationStatus, string> = {
    Unverified: "unverified",
    "Needs more evidence": "needs_more_evidence",
    "Expert verified": "expert_verified",
    "Field confirmed": "field_confirmed",
    Rejected: "rejected",
  };
  return mapping[status];
}

function mapExportStatus(status: string): ExportRecord["status"] {
  if (status === "complete") {
    return "Completed";
  }
  if (status === "failed") {
    return "Failed";
  }
  return "Processing";
}

function mapExportRecord(item: {
  id: string;
  format: string;
  filters?: Record<string, unknown>;
  status: string;
  created_at?: string;
  download_url?: string | null;
}): ExportRecord {
  const filters = item.filters ?? {};
  const format = item.format?.toLowerCase() === "geojson" ? "GeoJSON" : "CSV";

  return {
    id: item.id,
    name: `${format} export - ${Object.keys(filters).length || "current"} filters`,
    format,
    filters: Object.keys(filters).length,
    records: typeof filters.visible_records === "number" ? filters.visible_records : 0,
    status: mapExportStatus(item.status),
    requested: item.created_at
      ? new Date(item.created_at).toLocaleString()
      : new Date().toLocaleString(),
    downloadUrl: item.download_url ?? null,
  };
}

type QueueItem = Parameters<typeof enrichObservationFromQueue>[1] & {
  observation_id: string;
  observation?: {
    latitude?: string;
    longitude?: string;
    region_code?: string | null;
    privacy_level?: string;
    created_at?: string;
  };
  verification_status?: string;
  submitted_at?: string;
  signal_label?: string | null;
  sampling_label?: string | null;
};

function mapQueueItemToObservation(item: QueueItem) {
  const observation = item.observation ?? {};
  const candidate =
    item.latest_identification?.candidate_common_name &&
    item.latest_identification?.candidate_scientific_name
      ? `${item.latest_identification.candidate_common_name} (${item.latest_identification.candidate_scientific_name})`
      : item.latest_identification?.candidate_common_name ?? "Possible species";

  return mapApiObservation({
    observation_id: item.observation_id,
    candidate_species: candidate,
    confidence: item.latest_identification?.confidence ?? null,
    verification_status: item.verification_status ?? "unverified",
    signal_label: item.signal_label ?? item.signal_score?.label ?? null,
    signal_score: item.signal_score?.final_signal_priority ?? null,
    submitted_at: item.submitted_at ?? observation.created_at ?? new Date().toISOString(),
    sampling_label: item.sampling_label ?? null,
    location_summary: {
      latitude: observation.latitude ?? "40.7",
      longitude: observation.longitude ?? "-74.0",
      region_code: observation.region_code ?? null,
      privacy_level: observation.privacy_level ?? "obscured",
    },
  });
}

function mergeObservations(
  observationItems: ReturnType<typeof mapApiObservation>[],
  queueItems: QueueItem[],
) {
  const queueById = new Map(queueItems.map((item) => [item.observation_id, item]));
  const merged = observationItems.map((observation) => {
    const queueItem = queueById.get(observation.id);
    return queueItem ? enrichObservationFromQueue(observation, queueItem) : observation;
  });

  const knownIds = new Set(merged.map((row) => row.id));
  for (const queueItem of queueItems) {
    if (!knownIds.has(queueItem.observation_id)) {
      merged.push(enrichObservationFromQueue(mapQueueItemToObservation(queueItem), queueItem));
    }
  }

  return merged;
}

async function loadFromApi(): Promise<DashboardPayload> {
  const [observationsPage, exportsPage, samplingGaps, verificationQueue] = await Promise.all([
    fetchJson<{
      items: Parameters<typeof mapApiObservation>[0][];
      total: number;
    }>(
      `/research/observations?requester_id=${requesterId}&limit=50&offset=0&sort=submitted_at_desc`,
    ),
    fetchJson<
      Array<{
        id: string;
        format: string;
        filters?: Record<string, unknown>;
        status: string;
        created_at?: string;
        download_url?: string | null;
      }>
    >(`/research/exports?requester_id=${requesterId}`).catch(() => []),
    fetchJson<{
      features: Parameters<typeof mapApiSamplingFeature>[0][];
    }>(
      `/sampling-gaps?mode=research&bbox=${delawareBasinBbox}&requester_id=${requesterId}`,
    ).catch(() => null),
    fetchJson<QueueItem[]>(
      `/research/verification-queue?requester_id=${requesterId}`,
    ).catch(() => []),
  ]);

  const observations = mergeObservations(
    observationsPage.items.map(mapApiObservation),
    verificationQueue,
  );

  const samplingCells =
    samplingGaps && samplingGaps.features.length > 0
      ? samplingGaps.features.slice(0, 12).map(mapApiSamplingFeature)
      : buildDemoPayload().samplingCells;

  const exports =
    exportsPage.length > 0
      ? exportsPage.map(mapExportRecord)
      : buildDemoPayload().exports;

  return {
    observations,
    samplingCells,
    exports,
    source: "api",
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function loadDashboardData(): Promise<DashboardPayload> {
  if (!apiBase) {
    await delay(250);
    return buildDemoPayload();
  }

  try {
    return await loadFromApi();
  } catch (error) {
    console.warn("Falling back to demo dashboard data:", error);
    await delay(250);
    return buildDemoPayload();
  }
}

export async function loadForecastResearch(): Promise<ForecastPayload | null> {
  if (!apiBase) {
    return null;
  }

  try {
    const layers = [
      "observations",
      "verified_records",
      "unverified_records",
      "possible_corridors",
      "waterways",
      "roads_trails",
      "sampling_gap_grid",
    ];
    const params = new URLSearchParams({
      requester_id: requesterId,
      bbox: delawareBasinBbox,
    });
    for (const layer of layers) {
      params.append("layer", layer);
    }

    return await fetchJson<ForecastPayload>(`/forecast/research?${params.toString()}`);
  } catch (error) {
    console.warn("Research forecast unavailable:", error);
    return null;
  }
}

export function isApiModeConfigured() {
  return Boolean(apiBase);
}

export async function submitVerificationAction(
  request: VerificationRequest,
): Promise<VerificationStatus> {
  if (!apiBase) {
    await delay(250);
    return request.status;
  }

  const payload: Record<string, unknown> = {
    status: verificationStatusToApi(request.status),
    reviewer_id: request.reviewerId,
    review_notes: request.notes || undefined,
  };

  if (
    request.verifiedSpeciesId &&
    (request.status === "Expert verified" || request.status === "Field confirmed")
  ) {
    payload.verified_species_id = request.verifiedSpeciesId;
  }

  try {
    const response = await fetchJson<{ status: string }>(
      `/verification/${request.observationId}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return mapVerificationResponseStatus(response.status);
  } catch {
    await delay(250);
    return request.status;
  }
}

export async function createExportRequest(request: ExportRequest): Promise<ExportRecord> {
  if (!apiBase) {
    await delay(250);
    return buildExportRecord(request);
  }

  try {
    const response = await fetchJson<{
      id: string;
      format: string;
      filters?: Record<string, unknown>;
      status: string;
      created_at?: string;
      download_url?: string | null;
    }>("/research/exports", {
      method: "POST",
      body: JSON.stringify({
        requester_id: requesterId,
        format: request.format.toLowerCase(),
        filters: request.filters,
        include_media_urls: request.includeMediaUrls ?? true,
        include_environmental_context: request.includeEnvironmentalContext ?? true,
        include_signal_scores: request.includeSignalScores ?? true,
        include_verification: request.includeVerification ?? true,
      }),
    });

    const mapped = mapExportRecord(response);
    return {
      ...mapped,
      records:
        typeof request.filters.visible_records === "number"
          ? request.filters.visible_records
          : mapped.records,
    };
  } catch {
    await delay(250);
    return buildExportRecord(request);
  }
}

function inferQuestionType(question: string) {
  const normalized = question.toLowerCase();
  if (normalized.includes("export")) {
    return "export_summary";
  }
  if (normalized.includes("sampling") || normalized.includes("absence")) {
    return "under_sampled_areas";
  }
  if (normalized.includes("range") || normalized.includes("edge")) {
    return "range_edge";
  }
  if (normalized.includes("watershed")) {
    return "watershed_summary";
  }
  if (normalized.includes("species")) {
    return "species_summary";
  }
  return "verification_priority";
}

export async function askResearchAnalyst(
  question: string,
  filters: Record<string, unknown>,
): Promise<AnalystAnswer | null> {
  if (!apiBase) {
    return null;
  }

  try {
    const response = await fetchJson<Parameters<typeof mapApiAssistantContext>[0]>(
      "/assistant/context/research",
      {
        method: "POST",
        body: JSON.stringify({
          requester_id: requesterId,
          question_type: inferQuestionType(question),
          filters,
        }),
      },
    );
    return mapApiAssistantContext(response);
  } catch {
    return null;
  }
}

export function downloadExportRecord(record: ExportRecord, downloadUrl?: string | null) {
  const resolvedUrl = downloadUrl ?? record.downloadUrl;
  if (resolvedUrl) {
    const anchor = document.createElement("a");
    anchor.href = resolvedUrl.startsWith("http") ? resolvedUrl : `${apiBase ?? ""}${resolvedUrl}`;
    anchor.download = "";
    anchor.rel = "noopener";
    anchor.target = "_blank";
    anchor.click();
    return;
  }

  const slug = record.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const extension = record.format === "GeoJSON" ? "geojson" : "csv";
  const body =
    record.format === "GeoJSON"
      ? JSON.stringify(
          {
            type: "FeatureCollection",
            features: [],
            metadata: {
              export_id: record.id,
              privacy_notice:
                "Sensitive or obscured records remain generalized according to export permissions.",
            },
          },
          null,
          2,
        )
      : [
          "observation_id,candidate_species,verification_status,signal_label",
          "# export_id,format,records,privacy_notice",
          `${record.id},${record.format},${record.records},obscured records generalized`,
        ].join("\n");

  const blob = new Blob([body], {
    type: record.format === "GeoJSON" ? "application/geo+json" : "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug}.${extension}`;
  anchor.click();
  URL.revokeObjectURL(url);
}
