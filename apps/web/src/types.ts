export type ScreenId =
  | "overview"
  | "verification"
  | "observations"
  | "forecast"
  | "sampling"
  | "exports"
  | "analyst"
  | "settings";

export type ResearchRole = "researcher" | "reviewer" | "admin";

export type VerificationStatus =
  | "Unverified"
  | "Needs more evidence"
  | "Expert verified"
  | "Field confirmed"
  | "Rejected";

export type SignalLabel =
  | "Low signal"
  | "Moderate signal"
  | "High-value verification candidate"
  | "Priority ecological signal"
  | "Insufficient evidence";

export type ExportFormat = "CSV" | "GeoJSON";

export type ExportStatus = "Completed" | "Processing" | "Failed";

export interface DashboardObservation {
  id: string;
  speciesId?: string;
  commonName: string;
  scientificName: string;
  location: string;
  region: string;
  latitude: number;
  longitude: number;
  submittedAt: string;
  confidence: number;
  verificationStatus: VerificationStatus;
  signalScore: number;
  signalLabel: SignalLabel;
  source: string;
  privacy: string;
  coordinateUncertaintyM: number;
  habitat: string;
  distanceToWaterM: number;
  samplingLabel: string;
  evidenceCount: number;
  reviewerNotes?: string;
}

export interface SamplingCell {
  id: string;
  category: string;
  priority: "High" | "Medium" | "Low";
  habitatSuitability: number;
  samplingEffort: number;
  detections: number;
  confidence: string;
}

export interface ExportRecord {
  id: string;
  name: string;
  format: ExportFormat;
  filters: number;
  records: number;
  status: ExportStatus;
  requested: string;
  downloadUrl?: string | null;
}

export interface ForecastFeature {
  type: "Feature";
  geometry: {
    type: string;
    coordinates: unknown;
  };
  properties: {
    layer?: string;
    observation_id?: string;
    [key: string]: unknown;
  };
}

export interface ForecastPayload {
  type: "FeatureCollection";
  features: ForecastFeature[];
}

export interface DashboardPayload {
  observations: DashboardObservation[];
  samplingCells: SamplingCell[];
  exports: ExportRecord[];
  source: "api" | "demo";
  lastSyncedAt: string;
}

export interface MapLayers {
  verifiedRecords: boolean;
  unverifiedRecords: boolean;
  corridors: boolean;
  samplingGaps: boolean;
  waterways: boolean;
  roadsAndTrails: boolean;
}

export interface ExportRequest {
  format: ExportFormat;
  filters: Record<string, unknown>;
  includeMediaUrls?: boolean;
  includeEnvironmentalContext?: boolean;
  includeSignalScores?: boolean;
  includeVerification?: boolean;
}

export interface VerificationRequest {
  observationId: string;
  status: VerificationStatus;
  notes: string;
  reviewerId: string;
  verifiedSpeciesId?: string;
}

export interface AnalystAnswer {
  summary: string;
  findings: Array<{ title: string; text: string }>;
  confidence: number;
  confidenceLabel: string;
  uncertainty: string;
}

export interface ObservationActions {
  flagged: boolean;
  inSamplingPlan: boolean;
  hasTask: boolean;
  onAddToSamplingPlan: () => void;
  onCreateTask: () => void;
  onExportRecord: () => void;
  onOpenVerification: () => void;
  onToggleFlag: () => void;
  onViewOnMap: () => void;
}
