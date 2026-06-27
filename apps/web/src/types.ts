export type ScreenId =
  | 'overview'
  | 'verification'
  | 'observations'
  | 'forecast'
  | 'sampling'
  | 'exports'
  | 'analyst'
  | 'settings';

export type VerificationStatus =
  | 'Unverified'
  | 'Needs more evidence'
  | 'Expert verified'
  | 'Field confirmed'
  | 'Rejected';

export type SignalLabel =
  | 'Low signal'
  | 'Moderate signal'
  | 'High-value verification candidate'
  | 'Priority ecological signal'
  | 'Insufficient evidence';

export type UserRole = 'researcher' | 'reviewer' | 'admin';

export type ExportFormat = 'CSV' | 'GeoJSON';

export interface Observation {
  id: string;
  commonName: string;
  scientificName: string;
  location: string;
  region: 'NY' | 'NJ' | 'PA';
  latitude: number;
  longitude: number;
  submittedAt: string;
  confidence: number;
  verificationStatus: VerificationStatus;
  signalScore: number | null;
  signalLabel: SignalLabel;
  source: string;
  privacy: 'public' | 'obscured' | 'private';
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
  priority: 'Low' | 'Medium' | 'High';
  habitatSuitability: number;
  samplingEffort: number;
  detections: number;
  confidence: 'Low' | 'Medium' | 'High';
}

export interface ExportRecord {
  id: string;
  name: string;
  format: ExportFormat;
  filters: number;
  records: number;
  status: 'Completed' | 'Processing' | 'Failed' | 'Expired';
  requested: string;
}

export interface DashboardData {
  observations: Observation[];
  samplingCells: SamplingCell[];
  exports: ExportRecord[];
  source: 'api' | 'demo';
  lastSyncedAt: string;
}

export interface VerificationRequest {
  observationId: string;
  status: VerificationStatus;
  notes: string;
  reviewerId: string;
}

export interface ExportRequest {
  format: ExportFormat;
  filters: Record<string, string | number | boolean>;
  includeMediaUrls: boolean;
  includeEnvironmentalContext: boolean;
  includeSignalScores: boolean;
  includeVerification: boolean;
}
