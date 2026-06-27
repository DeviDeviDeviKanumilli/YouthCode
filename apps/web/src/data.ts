import type {
  AnalystAnswer,
  DashboardObservation,
  ExportRecord,
  SamplingCell,
  VerificationStatus,
} from "./types";

export const demoObservations: DashboardObservation[] = [
  {
    id: "OBS-2025-548721",
    commonName: "Emerald Ash Borer",
    scientificName: "Agrilus planipennis",
    location: "Delaware River Basin, PA",
    region: "PA",
    latitude: 40.611,
    longitude: -75.184,
    submittedAt: "Jun 27, 2026 10:42 AM",
    confidence: 82,
    verificationStatus: "Unverified",
    signalScore: 78,
    signalLabel: "Priority ecological signal",
    source: "iNaturalist",
    privacy: "obscured",
    coordinateUncertaintyM: 120,
    habitat: "Forest edge",
    distanceToWaterM: 120,
    samplingLabel: "High-risk under-sampled",
    evidenceCount: 4,
  },
  {
    id: "OBS-2025-548719",
    commonName: "Purple Loosestrife",
    scientificName: "Lythrum salicaria",
    location: "Wetland edge, NJ",
    region: "NJ",
    latitude: 40.973,
    longitude: -74.887,
    submittedAt: "Jun 26, 2026 9:15 AM",
    confidence: 42,
    verificationStatus: "Needs more evidence",
    signalScore: 61,
    signalLabel: "High-value verification candidate",
    source: "User submitted",
    privacy: "obscured",
    coordinateUncertaintyM: 80,
    habitat: "Wetland edge",
    distanceToWaterM: 45,
    samplingLabel: "Likely false absence",
    evidenceCount: 2,
  },
  {
    id: "OBS-2025-548718",
    commonName: "Spotted Lanternfly",
    scientificName: "Lycorma delicatula",
    location: "Urban greenbelt, PA",
    region: "PA",
    latitude: 40.793,
    longitude: -75.012,
    submittedAt: "Jun 25, 2026 6:28 PM",
    confidence: 79,
    verificationStatus: "Unverified",
    signalScore: 73,
    signalLabel: "High-value verification candidate",
    source: "User submitted",
    privacy: "public",
    coordinateUncertaintyM: 30,
    habitat: "Urban greenbelt",
    distanceToWaterM: 360,
    samplingLabel: "Road/trail-biased",
    evidenceCount: 3,
  },
  {
    id: "OBS-2025-548717",
    commonName: "Japanese Knotweed",
    scientificName: "Fallopia japonica",
    location: "Riparian corridor, NY",
    region: "NY",
    latitude: 41.144,
    longitude: -74.912,
    submittedAt: "Jun 24, 2026 3:10 PM",
    confidence: 63,
    verificationStatus: "Unverified",
    signalScore: 56,
    signalLabel: "High-value verification candidate",
    source: "User submitted",
    privacy: "obscured",
    coordinateUncertaintyM: 95,
    habitat: "Riparian corridor",
    distanceToWaterM: 22,
    samplingLabel: "Under-sampled",
    evidenceCount: 2,
  },
  {
    id: "OBS-2025-548716",
    commonName: "Water Chestnut",
    scientificName: "Trapa natans",
    location: "Slow water channel, NY",
    region: "NY",
    latitude: 41.038,
    longitude: -74.737,
    submittedAt: "Jun 20, 2026 1:05 PM",
    confidence: 68,
    verificationStatus: "Expert verified",
    signalScore: 48,
    signalLabel: "Moderate signal",
    source: "Seeded demo data",
    privacy: "public",
    coordinateUncertaintyM: 20,
    habitat: "Slow water channel",
    distanceToWaterM: 8,
    samplingLabel: "Well sampled",
    evidenceCount: 5,
  },
  {
    id: "OBS-2025-548715",
    commonName: "Garlic Mustard",
    scientificName: "Alliaria petiolata",
    location: "Trail edge, PA",
    region: "PA",
    latitude: 40.858,
    longitude: -75.298,
    submittedAt: "Jun 18, 2026 11:22 AM",
    confidence: 71,
    verificationStatus: "Needs more evidence",
    signalScore: 66,
    signalLabel: "High-value verification candidate",
    source: "iNaturalist",
    privacy: "obscured",
    coordinateUncertaintyM: 70,
    habitat: "Trail edge",
    distanceToWaterM: 210,
    samplingLabel: "Road/trail-biased",
    evidenceCount: 1,
  },
];

export const demoSamplingCells: SamplingCell[] = [
  {
    id: "18T WL 350 545",
    category: "High-risk under-sampled",
    priority: "High",
    habitatSuitability: 0.84,
    samplingEffort: 0.08,
    detections: 0,
    confidence: "Low",
  },
  {
    id: "18T WL 345 550",
    category: "Likely false absence",
    priority: "High",
    habitatSuitability: 0.72,
    samplingEffort: 0.12,
    detections: 0,
    confidence: "Low",
  },
  {
    id: "18T WL 355 540",
    category: "Under-sampled",
    priority: "Medium",
    habitatSuitability: 0.61,
    samplingEffort: 0.21,
    detections: 1,
    confidence: "Medium",
  },
  {
    id: "18T WL 360 555",
    category: "Road/trail-biased",
    priority: "Medium",
    habitatSuitability: 0.48,
    samplingEffort: 0.67,
    detections: 3,
    confidence: "Medium",
  },
  {
    id: "18T WL 340 535",
    category: "Park/protected-area biased",
    priority: "Low",
    habitatSuitability: 0.31,
    samplingEffort: 0.74,
    detections: 5,
    confidence: "High",
  },
];

export const demoExports: ExportRecord[] = [
  {
    id: "EXP-2026-001",
    name: "Priority ecological signals - Jun 2026",
    format: "CSV",
    filters: 5,
    records: 1246,
    status: "Completed",
    requested: "Jun 27, 2026 10:42 AM",
  },
  {
    id: "EXP-2026-002",
    name: "Delaware River Basin - all species",
    format: "GeoJSON",
    filters: 4,
    records: 3812,
    status: "Completed",
    requested: "Jun 25, 2026 3:15 PM",
  },
  {
    id: "EXP-2026-003",
    name: "Potential corridor review",
    format: "CSV",
    filters: 6,
    records: 645,
    status: "Processing",
    requested: "Jun 27, 2026 11:02 AM",
  },
  {
    id: "EXP-2026-004",
    name: "Under-sampled zones - Jun",
    format: "GeoJSON",
    filters: 3,
    records: 512,
    status: "Failed",
    requested: "Jun 26, 2026 9:21 AM",
  },
];

export const provenanceSources: Array<[string, string]> = [
  ["iNaturalist", "Community observation"],
  ["GBIF", "Historical occurrence context"],
  ["USGS 3DHP", "Hydrology layer"],
  ["NLCD", "Land cover and canopy"],
];

export const delawareBasinBbox = "-75.7,40.1,-73.9,41.3";

export const defaultMapLayers = {
  verifiedRecords: true,
  unverifiedRecords: true,
  corridors: true,
  samplingGaps: true,
  waterways: true,
  roadsAndTrails: true,
};

export const corridorPaths = {
  primary: [
    [40.52, -75.55],
    [40.72, -75.2],
    [40.94, -74.86],
    [41.12, -74.52],
  ] as [number, number][],
  secondary: [
    [40.22, -75.0],
    [40.44, -74.68],
    [40.7, -74.38],
    [40.98, -74.08],
  ] as [number, number][],
  waterways: [
    [40.28, -75.12],
    [40.45, -74.98],
    [40.62, -74.79],
    [40.86, -74.54],
    [41.06, -74.24],
  ] as [number, number][],
  roadsAndTrails: [
    [40.36, -75.38],
    [40.58, -75.08],
    [40.72, -74.82],
    [40.86, -74.58],
  ] as [number, number][],
};

export const samplingGapBounds: Array<[[number, number], [number, number]]> = [
  [
    [40.62, -75.2],
    [40.82, -74.96],
  ],
  [
    [40.9, -74.92],
    [41.12, -74.62],
  ],
  [
    [40.35, -74.9],
    [40.56, -74.62],
  ],
  [
    [40.78, -75.45],
    [40.98, -75.18],
  ],
  [
    [40.18, -74.72],
    [40.4, -74.48],
  ],
];

export function buildDemoPayload() {
  return {
    observations: demoObservations,
    samplingCells: demoSamplingCells,
    exports: demoExports,
    source: "demo" as const,
    lastSyncedAt: new Date().toISOString(),
  };
}

export function buildExportRecord(request: {
  format: "CSV" | "GeoJSON";
  filters: Record<string, unknown>;
}): ExportRecord {
  return {
    id: `EXP-${Date.now()}`,
    name: `${request.format} export - current filters`,
    format: request.format,
    filters: Object.keys(request.filters).length,
    filterValues: request.filters,
    records: 1246,
    status: "Processing",
    requested: new Date().toLocaleString(),
  };
}

function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapSignalLabel(label: string | null | undefined): DashboardObservation["signalLabel"] {
  const mapping: Record<string, DashboardObservation["signalLabel"]> = {
    low_signal: "Low signal",
    moderate_signal: "Moderate signal",
    high_value_verification_candidate: "High-value verification candidate",
    priority_ecological_signal: "Priority ecological signal",
    insufficient_evidence: "Insufficient evidence",
  };
  return mapping[label ?? ""] ?? "Insufficient evidence";
}

function mapVerificationStatus(status: string): DashboardObservation["verificationStatus"] {
  const mapping: Record<string, DashboardObservation["verificationStatus"]> = {
    raw: "Unverified",
    ai_suggested: "Unverified",
    unverified: "Unverified",
    needs_more_evidence: "Needs more evidence",
    expert_verified: "Expert verified",
    field_confirmed: "Field confirmed",
    rejected: "Rejected",
  };
  return mapping[status] ?? "Unverified";
}

function mapSamplingLabel(label: string | null | undefined): string {
  if (!label) return "Under-sampled";
  return titleCase(label);
}

function samplingPriority(label: string, observationCount: number): SamplingCell["priority"] {
  if (label.includes("high_risk") || label.includes("needs_structured")) {
    return "High";
  }
  if (observationCount <= 1 || label.includes("under_sampled") || label.includes("false_absence")) {
    return "Medium";
  }
  return "Low";
}

export function mapApiSamplingFeature(feature: {
  properties: {
    cell_id: string;
    sampling_label: string;
    observation_count?: number;
    confidence?: string;
    risk_context?: string | null;
  };
}): SamplingCell {
  const label = feature.properties.sampling_label;
  const detections = feature.properties.observation_count ?? 0;
  const normalized = label.replaceAll("_", " ");

  return {
    id: feature.properties.cell_id,
    category: normalized.replace(/\b\w/g, (char) => char.toUpperCase()),
    priority: samplingPriority(label, detections),
    habitatSuitability: Math.min(0.95, 0.35 + detections * 0.08),
    samplingEffort: Math.min(0.95, detections * 0.12),
    detections,
    confidence: feature.properties.confidence
      ? feature.properties.confidence.charAt(0).toUpperCase() +
        feature.properties.confidence.slice(1)
      : "Medium",
  };
}

export function enrichObservationFromQueue(
  observation: DashboardObservation,
  queueItem: {
    latest_identification?: {
      candidate_species_id?: string;
      candidate_common_name?: string;
      candidate_scientific_name?: string;
      confidence?: string;
      model_version?: string;
    } | null;
    environmental_context?: {
      land_cover_class?: string | null;
      distance_to_water_m?: string | null;
    } | null;
    media?: Array<unknown>;
    signal_score?: { label?: string; final_signal_priority?: string } | null;
  },
): DashboardObservation {
  const identification = queueItem.latest_identification;
  const context = queueItem.environmental_context;

  return {
    ...observation,
    speciesId: identification?.candidate_species_id ?? observation.speciesId,
    commonName: identification?.candidate_common_name ?? observation.commonName,
    scientificName: identification?.candidate_scientific_name ?? observation.scientificName,
    confidence: identification?.confidence
      ? normalizeConfidence(identification.confidence)
      : observation.confidence,
    habitat: context?.land_cover_class
      ? titleCase(context.land_cover_class.replaceAll("_", " "))
      : observation.habitat,
    distanceToWaterM: context?.distance_to_water_m
      ? Number(context.distance_to_water_m)
      : observation.distanceToWaterM,
    evidenceCount: queueItem.media?.length ?? observation.evidenceCount ?? 0,
    signalLabel: queueItem.signal_score?.label
      ? mapSignalLabel(queueItem.signal_score.label)
      : observation.signalLabel,
    signalScore: queueItem.signal_score?.final_signal_priority
      ? Number(queueItem.signal_score.final_signal_priority)
      : observation.signalScore,
  };
}

export function mapApiAssistantContext(context: {
  filtered_observation_summary: { matched_observation_count: number };
  top_records: Array<{
    candidate_species?: string;
    signal_label?: string;
    verification_status?: string;
  }>;
  sampling_concerns: Array<{ sampling_label?: string; explanation?: string }>;
  uncertainty_notes: string[];
  data_sources_used: string[];
}): AnalystAnswer {
  const count = context.filtered_observation_summary.matched_observation_count;

  if (count === 0) {
    return {
      summary:
        "Insufficient evidence. The current filters do not return observations, so EcoSentinel cannot summarize ecological signals from this research context.",
      findings: context.uncertainty_notes.slice(0, 3).map((note, index) => ({
        title: index === 0 ? "Insufficient evidence" : `Uncertainty factor ${index + 1}`,
        text: note,
      })),
      confidence: 18,
      confidenceLabel: "Low confidence",
      uncertainty:
        context.uncertainty_notes.join(" ") ||
        "Uncertainty is high because the filtered dataset is empty.",
    };
  }

  const top = context.top_records[0];
  const sampling = context.sampling_concerns[0];

  return {
    summary: `The API research context returned ${count} matched observation${count === 1 ? "" : "s"}. ${
      top?.candidate_species
        ? `${top.candidate_species} is the top visible possible species by Ecological Signal Priority.`
        : "Review the top records before making stronger claims."
    }`,
    findings: [
      top
        ? {
            title: top.candidate_species ?? "Top record",
            text: `Current API context marks this as a possible ${top.signal_label?.replaceAll("_", " ") ?? "signal"} with verification status ${top.verification_status?.replaceAll("_", " ") ?? "unknown"}.`,
          }
        : {
            title: "Matched records",
            text: `${count} records match the current research filters.`,
          },
      sampling
        ? {
            title: "Sampling concern",
            text:
              sampling.explanation ??
              `Sampling label: ${sampling.sampling_label?.replaceAll("_", " ")}.`,
          }
        : {
            title: "Verification need",
            text: "Check verification status before treating possible species as confirmed.",
          },
      {
        title: "Data sources",
        text: context.data_sources_used.join(", ") || "Platform research context",
      },
    ],
    confidence: 78,
    confidenceLabel: "Moderate confidence, with caveats",
    uncertainty: context.uncertainty_notes.join(" ") || "Uncertainty depends on verification and sampling effort.",
  };
}

function normalizeConfidence(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric);
}

export function mapApiObservation(item: {
  observation_id: string;
  photo_thumbnail_url?: string | null;
  candidate_species?: string | null;
  confidence?: string | null;
  verification_status: string;
  signal_label?: string | null;
  signal_score?: string | null;
  submitted_at: string;
  sampling_label?: string | null;
  location_summary: {
    latitude: string;
    longitude: string;
    region_code?: string | null;
    privacy_level: string;
  };
}): DashboardObservation {
  const [commonName = "Possible species", scientificName = ""] =
    item.candidate_species?.includes("(")
      ? item.candidate_species.split("(").map((part) => part.replace(")", "").trim())
      : [item.candidate_species ?? "Possible species", ""];

  const latitude = Number(item.location_summary.latitude);
  const longitude = Number(item.location_summary.longitude);

  return {
    id: item.observation_id,
    commonName,
    scientificName: scientificName || commonName,
    location: item.location_summary.region_code
      ? `${item.location_summary.region_code} region`
      : "Tri-state region",
    region: item.location_summary.region_code ?? "MVP",
    latitude,
    longitude,
    submittedAt: new Date(item.submitted_at).toLocaleString(),
    confidence: normalizeConfidence(item.confidence),
    verificationStatus: mapVerificationStatus(item.verification_status),
    signalScore: Number(item.signal_score ?? 0),
    signalLabel: mapSignalLabel(item.signal_label),
    source: "API record",
    privacy: item.location_summary.privacy_level,
    coordinateUncertaintyM: 100,
    habitat: "Environmental context pending",
    distanceToWaterM: 0,
    samplingLabel: mapSamplingLabel(item.sampling_label),
    evidenceCount: item.photo_thumbnail_url ? 1 : 0,
  };
}

export function mapVerificationResponseStatus(status: string): VerificationStatus {
  return mapVerificationStatus(status);
}

export function buildAnalystAnswer(
  question: string,
  observations: DashboardObservation[],
): AnalystAnswer {
  const normalized = question.toLowerCase();
  const needsVerification = observations.filter(
    (row) => !["Expert verified", "Field confirmed"].includes(row.verificationStatus),
  ).length;
  const underSampled = observations.filter((row) =>
    row.samplingLabel.toLowerCase().includes("under-sampled"),
  ).length;
  const priorityRows = observations.filter((row) =>
    ["High-value verification candidate", "Priority ecological signal"].includes(row.signalLabel),
  );
  const topRow = priorityRows[0] ?? observations[0];

  if (observations.length === 0) {
    return {
      summary:
        "Insufficient evidence. The current filters do not return observations, so EcoSentinel cannot summarize ecological signals from this dashboard context.",
      findings: [
        {
          title: "Insufficient evidence",
          text: "No visible records are available under the current filters.",
        },
        {
          title: "Next step",
          text: "Clear filters or expand the date range before interpreting absence.",
        },
      ],
      confidence: 18,
      confidenceLabel: "Low confidence",
      uncertainty: "Uncertainty is high because the visible dataset is empty.",
    };
  }

  if (normalized.includes("export")) {
    return {
      summary: `The current context has ${observations.length} visible records, including ${priorityRows.length} high-value or priority signal records. CSV is best for tabular review, while GeoJSON is best for GIS workflows and map layers.`,
      findings: [
        {
          title: "Export readiness",
          text: `${needsVerification} records still need verification before final research use.`,
        },
        {
          title: "Privacy handling",
          text: "Obscured records should remain generalized unless an admin grants private export access.",
        },
        {
          title: "Recommended format",
          text: "Use GeoJSON when corridor or sampling-gap context must travel with the record set.",
        },
      ],
      confidence: 84,
      confidenceLabel: "High confidence, with export caveats",
      uncertainty: "Export confidence depends on verification status and location privacy permissions.",
    };
  }

  if (normalized.includes("sampling") || normalized.includes("absence")) {
    return {
      summary: `Sampling context is uneven. ${underSampled} visible records are associated with under-sampled areas, so absence should not be treated as true absence without checking effort and bias.`,
      findings: [
        {
          title: "Sampling gap signal",
          text: "High-risk under-sampled cells should be prioritized for structured surveys.",
        },
        {
          title: "Bias warning",
          text: "Road/trail-biased records can overrepresent accessible habitats.",
        },
        {
          title: "Interpretation rule",
          text: "Use insufficient evidence language when sampling effort is low.",
        },
      ],
      confidence: 79,
      confidenceLabel: "Moderate confidence",
      uncertainty: "Uncertainty comes from uneven sampling effort and unverified visible records.",
    };
  }

  return {
    summary: `The Delaware River Basin shows several notable ecological signals. ${topRow.commonName} is the top visible possible species by Ecological Signal Priority, while ${needsVerification} records still need verification before stronger claims are appropriate.`,
    findings: [
      {
        title: topRow.commonName,
        text: `Current visible context marks this as a ${topRow.signalLabel.toLowerCase()} with ${topRow.confidence}% identity confidence.`,
      },
      {
        title: "Verification need",
        text: `${needsVerification} visible records remain unverified or need more evidence.`,
      },
      {
        title: "Sampling uncertainty",
        text: `${underSampled} visible records have under-sampled context, so absence should not be treated as true absence.`,
      },
    ],
    confidence: 82,
    confidenceLabel: "High confidence, with caveats",
    uncertainty:
      "Uncertainty comes from under-sampled zones, early-season variability, and unverified records.",
  };
}
