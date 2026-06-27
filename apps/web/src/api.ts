import { exportHistory, observations, samplingCells } from './data';
import type {
  DashboardData,
  ExportRecord,
  ExportRequest,
  Observation,
  SignalLabel,
  VerificationRequest,
  VerificationStatus,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const REQUESTER_ID = import.meta.env.VITE_RESEARCH_REQUESTER_ID as string | undefined;

export async function loadDashboardData(): Promise<DashboardData> {
  if (!API_BASE_URL || !REQUESTER_ID) {
    return demoDashboardData();
  }

  try {
    const [researchPage, exportRows] = await Promise.all([
      request<ResearchObservationPage>(
        `/research/observations?requester_id=${REQUESTER_ID}&limit=50&offset=0&sort=signal_score_desc`,
      ),
      request<ExportRead[]>(`/research/exports?requester_id=${REQUESTER_ID}`),
    ]);

    return {
      observations: researchPage.items.map(mapResearchObservation),
      samplingCells,
      exports: exportRows.map(mapExportRecord),
      source: 'api',
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('EcoSentinel dashboard API unavailable; using deterministic demo data.', error);
    return demoDashboardData();
  }
}

export async function submitVerification(data: VerificationRequest): Promise<VerificationStatus> {
  if (!API_BASE_URL || !REQUESTER_ID) {
    await sleep(250);
    return data.status;
  }

  await request(`/verification/${data.observationId}`, {
    method: 'POST',
    body: JSON.stringify({
      status: verificationToApi(data.status),
      reviewer_id: data.reviewerId,
      review_notes: data.notes,
    }),
  });

  return data.status;
}

export async function createResearchExport(data: ExportRequest): Promise<ExportRecord> {
  if (!API_BASE_URL || !REQUESTER_ID) {
    await sleep(250);
    return demoExport(data);
  }

  const created = await request<ExportRead>('/research/export', {
    method: 'POST',
    body: JSON.stringify({
      requester_id: REQUESTER_ID,
      format: data.format.toLowerCase(),
      filters: data.filters,
      include_media_urls: data.includeMediaUrls,
      include_environmental_context: data.includeEnvironmentalContext,
      include_signal_scores: data.includeSignalScores,
      include_verification: data.includeVerification,
    }),
  });

  return mapExportRecord(created);
}

export function demoDashboardData(): DashboardData {
  return {
    observations,
    samplingCells,
    exports: exportHistory,
    source: 'demo',
    lastSyncedAt: new Date().toISOString(),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function mapResearchObservation(item: ResearchObservationItem): Observation {
  const score = item.signal_score ? Number.parseFloat(item.signal_score) : null;
  return {
    id: item.observation_id,
    commonName: item.candidate_species ?? 'Possible species needs review',
    scientificName: 'Scientific name pending',
    location: item.location_summary.region_code ?? 'Location available to authorized users',
    region: regionCode(item.location_summary.region_code),
    latitude: Number.parseFloat(item.location_summary.latitude),
    longitude: Number.parseFloat(item.location_summary.longitude),
    submittedAt: new Date(item.submitted_at).toLocaleString(),
    confidence: item.confidence ? Number.parseFloat(item.confidence) : 0,
    verificationStatus: verificationFromApi(item.verification_status),
    signalScore: score,
    signalLabel: signalFromApi(item.signal_label),
    source: 'EcoSentinel API',
    privacy: privacyLevel(item.location_summary.privacy_level),
    coordinateUncertaintyM: 100,
    habitat: 'Context available in detail view',
    distanceToWaterM: 0,
    samplingLabel: item.sampling_label ?? 'Sampling context pending',
    evidenceCount: item.photo_thumbnail_url ? 1 : 0,
  };
}

function mapExportRecord(item: ExportRead): ExportRecord {
  return {
    id: item.id,
    name: `${item.format.toUpperCase()} export`,
    format: item.format === 'geojson' ? 'GeoJSON' : 'CSV',
    filters: Object.keys(item.filters).length,
    records: 0,
    status: exportStatus(item.status),
    requested: new Date(item.created_at).toLocaleString(),
  };
}

function demoExport(data: ExportRequest): ExportRecord {
  return {
    id: `EXP-${Date.now()}`,
    name: `${data.format} export - current filters`,
    format: data.format,
    filters: Object.keys(data.filters).length,
    records: 1246,
    status: 'Processing',
    requested: new Date().toLocaleString(),
  };
}

function verificationFromApi(value: string): VerificationStatus {
  const map: Record<string, VerificationStatus> = {
    unverified: 'Unverified',
    needs_more_evidence: 'Needs more evidence',
    expert_verified: 'Expert verified',
    field_confirmed: 'Field confirmed',
    rejected: 'Rejected',
  };
  return map[value] ?? 'Unverified';
}

function verificationToApi(value: VerificationStatus): string {
  const map: Record<VerificationStatus, string> = {
    Unverified: 'unverified',
    'Needs more evidence': 'needs_more_evidence',
    'Expert verified': 'expert_verified',
    'Field confirmed': 'field_confirmed',
    Rejected: 'rejected',
  };
  return map[value];
}

function signalFromApi(value: string | null): SignalLabel {
  const map: Record<string, SignalLabel> = {
    low_signal: 'Low signal',
    moderate_signal: 'Moderate signal',
    high_value_verification_candidate: 'High-value verification candidate',
    priority_ecological_signal: 'Priority ecological signal',
    insufficient_evidence: 'Insufficient evidence',
  };
  return value ? map[value] ?? 'Insufficient evidence' : 'Insufficient evidence';
}

function exportStatus(value: string): ExportRecord['status'] {
  const map: Record<string, ExportRecord['status']> = {
    pending: 'Processing',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    expired: 'Expired',
  };
  return map[value] ?? 'Processing';
}

function regionCode(value: string | null | undefined): Observation['region'] {
  return value === 'NY' || value === 'NJ' || value === 'PA' ? value : 'NY';
}

function privacyLevel(value: string): Observation['privacy'] {
  return value === 'private' || value === 'obscured' ? value : 'public';
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

interface ResearchObservationPage {
  items: ResearchObservationItem[];
}

interface ResearchObservationItem {
  observation_id: string;
  photo_thumbnail_url: string | null;
  candidate_species: string | null;
  confidence: string | null;
  signal_score: string | null;
  signal_label: string | null;
  verification_status: string;
  location_summary: {
    latitude: string;
    longitude: string;
    region_code: string | null;
    privacy_level: string;
  };
  submitted_at: string;
  sampling_label: string | null;
  needs_review: boolean;
}

interface ExportRead {
  id: string;
  filters: Record<string, unknown>;
  format: 'csv' | 'geojson';
  status: string;
  created_at: string;
}
