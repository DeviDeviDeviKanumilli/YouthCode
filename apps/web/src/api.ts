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
  DashboardFilters,
  DashboardObservation,
  DashboardPayload,
  ExportRecord,
  ExportRequest,
  ForecastPayload,
  VerificationHistoryEvent,
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

export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;

  constructor(message: string, options?: { status?: number; code?: string; details?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export interface DashboardLoadResult {
  payload: DashboardPayload;
  apiError: ApiError | null;
}

type ObservationListItem = Parameters<typeof mapApiObservation>[0];
type ExportApiRecord = {
  id: string;
  format: string;
  filters?: Record<string, unknown>;
  status: string;
  created_at?: string;
  download_url?: string | null;
};

type VerificationEventApiRecord = {
  id: string;
  observation_id: string;
  previous_status: string;
  new_status: string;
  reviewer_id: string;
  notes?: string | null;
  created_at: string;
};

function toUtcIsoDateTime(date: string, endOfDay = false) {
  if (!date) {
    return undefined;
  }
  return `${date}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
}

function buildObservationParams(filters?: DashboardFilters) {
  const params = new URLSearchParams({
    requester_id: requesterId,
    limit: "50",
    offset: "0",
    sort: "submitted_at_desc",
  });

  if (!filters) {
    return params;
  }

  if (filters.speciesId.trim()) {
    params.set("species_id", filters.speciesId.trim());
  }
  if (filters.bbox.trim()) {
    params.set("bbox", filters.bbox.trim());
  }
  if (filters.regionCode) {
    params.set("region_code", filters.regionCode);
  }
  if (filters.verificationStatus) {
    params.set("verification_status", filters.verificationStatus);
  }
  if (filters.signalLabel) {
    params.set("signal_label", filters.signalLabel);
  }

  const fromDate = toUtcIsoDateTime(filters.fromDate);
  const toDate = toUtcIsoDateTime(filters.toDate, true);
  if (fromDate) {
    params.set("from_date", fromDate);
  }
  if (toDate) {
    params.set("to_date", toDate);
  }
  if (filters.hasMedia) {
    params.set("has_media", "true");
  }
  if (filters.needsReview) {
    params.set("needs_review", "true");
  }

  return params;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBase) {
    throw new ApiError("API base URL is not configured.");
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
    throw new ApiError(error?.message ?? `Request failed with status ${response.status}`, {
      status: response.status,
      code: error?.code,
      details: error?.details ?? error?.detail ?? null,
    });
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
    filterValues: filters,
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

function mapVerificationHistoryEvent(item: VerificationEventApiRecord): VerificationHistoryEvent {
  return {
    id: item.id,
    observationId: item.observation_id,
    previousStatus: mapVerificationResponseStatus(item.previous_status),
    newStatus: mapVerificationResponseStatus(item.new_status),
    reviewerId: item.reviewer_id,
    notes: item.notes,
    createdAt: new Date(item.created_at).toLocaleString(),
  };
}

function applyDemoFilters(observations: DashboardObservation[], filters?: DashboardFilters) {
  if (!filters) {
    return observations;
  }

  const bbox =
    filters.bbox
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((value) => Number.isFinite(value));

  return observations.filter((row) => {
    const matchesSpeciesId = !filters.speciesId.trim() || row.speciesId === filters.speciesId.trim();
    const matchesRegion = !filters.regionCode || row.region === filters.regionCode;
    const matchesVerification =
      !filters.verificationStatus ||
      verificationStatusToApi(row.verificationStatus) === filters.verificationStatus;
    const matchesSignal =
      !filters.signalLabel || mapSignalLabelToApi(row.signalLabel) === filters.signalLabel;
    const matchesNeedsReview =
      !filters.needsReview ||
      ["Unverified", "Needs more evidence"].includes(row.verificationStatus);
    const matchesMedia = !filters.hasMedia || row.evidenceCount > 0;
    const submitted = new Date(row.submittedAt);
    const matchesFrom =
      !filters.fromDate || Number.isNaN(submitted.valueOf()) || submitted >= new Date(filters.fromDate);
    const matchesTo =
      !filters.toDate ||
      Number.isNaN(submitted.valueOf()) ||
      submitted <= new Date(`${filters.toDate}T23:59:59`);
    const matchesBbox =
      bbox.length !== 4 ||
      (row.longitude >= bbox[0] &&
        row.latitude >= bbox[1] &&
        row.longitude <= bbox[2] &&
        row.latitude <= bbox[3]);

    return (
      matchesSpeciesId &&
      matchesRegion &&
      matchesVerification &&
      matchesSignal &&
      matchesNeedsReview &&
      matchesMedia &&
      matchesFrom &&
      matchesTo &&
      matchesBbox
    );
  });
}

async function loadFromApi(filters?: DashboardFilters): Promise<DashboardPayload> {
  const observationParams = buildObservationParams(filters);
  const [observationsPage, exportsPage, samplingGaps, verificationQueue] = await Promise.all([
    fetchJson<{
      items: ObservationListItem[];
      total: number;
    }>(
      `/research/observations?${observationParams.toString()}`,
    ),
    fetchJson<ExportApiRecord[]>(`/research/exports?requester_id=${requesterId}`).catch(() => []),
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

export async function loadDashboardData(filters?: DashboardFilters): Promise<DashboardLoadResult> {
  if (!apiBase) {
    await delay(250);
    return {
      payload: {
        ...buildDemoPayload(),
        observations: applyDemoFilters(buildDemoPayload().observations, filters),
      },
      apiError: null,
    };
  }

  try {
    return {
      payload: await loadFromApi(filters),
      apiError: null,
    };
  } catch (error) {
    console.warn("Falling back to demo dashboard data:", error);
    await delay(250);
    return {
      payload: {
        ...buildDemoPayload(),
        observations: applyDemoFilters(buildDemoPayload().observations, filters),
      },
      apiError:
        error instanceof ApiError
          ? error
          : new ApiError(error instanceof Error ? error.message : "Unable to reach the API."),
    };
  }
}

export async function loadForecastResearch(filters?: DashboardFilters): Promise<ForecastPayload | null> {
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
      bbox: filters?.bbox.trim() || delawareBasinBbox,
    });
    if (filters?.speciesId.trim()) {
      params.set("species_id", filters.speciesId.trim());
    }
    if (filters?.verificationStatus) {
      params.set("verification_status", filters.verificationStatus);
    }
    const fromDate = toUtcIsoDateTime(filters?.fromDate ?? "");
    const toDate = toUtcIsoDateTime(filters?.toDate ?? "", true);
    if (fromDate) {
      params.set("from_date", fromDate);
    }
    if (toDate) {
      params.set("to_date", toDate);
    }
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

  const response = await fetchJson<{ status: string }>(`/verification/${request.observationId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapVerificationResponseStatus(response.status);
}

export async function createExportRequest(request: ExportRequest): Promise<ExportRecord> {
  if (!apiBase) {
    await delay(250);
    return buildExportRecord(request);
  }

  const response = await fetchJson<ExportApiRecord>("/research/export", {
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
      typeof request.filters.visible_records === "number" ? request.filters.visible_records : mapped.records,
  };
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

export async function fetchVerificationHistory(
  observationId: string,
): Promise<VerificationHistoryEvent[]> {
  if (!apiBase) {
    await delay(150);
    return [];
  }

  const response = await fetchJson<VerificationEventApiRecord[]>(
    `/verification/${observationId}/history?requester_id=${requesterId}`,
  );
  return response.map(mapVerificationHistoryEvent);
}

export async function fetchExportRecord(exportId: string): Promise<ExportRecord> {
  if (!apiBase) {
    throw new ApiError("API base URL is not configured.");
  }

  const response = await fetchJson<ExportApiRecord>(
    `/research/exports/${exportId}?requester_id=${requesterId}`,
  );
  return mapExportRecord(response);
}

export async function waitForExportCompletion(
  exportId: string,
  options?: { attempts?: number; intervalMs?: number },
): Promise<ExportRecord> {
  const attempts = options?.attempts ?? 6;
  const intervalMs = options?.intervalMs ?? 600;

  let latest = await fetchExportRecord(exportId);
  for (let attempt = 1; attempt < attempts; attempt += 1) {
    if (latest.status !== "Processing") {
      return latest;
    }
    await delay(intervalMs);
    latest = await fetchExportRecord(exportId);
  }
  return latest;
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

function mapSignalLabelToApi(label: DashboardObservation["signalLabel"]) {
  const mapping: Record<DashboardObservation["signalLabel"], string> = {
    "Low signal": "low_signal",
    "Moderate signal": "moderate_signal",
    "High-value verification candidate": "high_value_verification_candidate",
    "Priority ecological signal": "priority_ecological_signal",
    "Insufficient evidence": "insufficient_evidence",
  };
  return mapping[label];
}
