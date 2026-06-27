import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  Download,
  Flag,
  LayoutGrid,
  Leaf,
  ListChecks,
  Map as MapIcon,
  MessageSquare,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Shield,
  SlidersHorizontal,
  Table2,
  X,
  XCircle,
} from "lucide-react";
import {
  ApiError,
  askResearchAnalyst,
  createExportRequest,
  downloadExportRecord,
  fetchExportRecord,
  fetchVerificationHistory,
  isApiModeConfigured,
  loadDashboardData,
  loadForecastResearch,
  submitVerificationAction,
  waitForExportCompletion,
} from "./api";
import {
  buildAnalystAnswer,
  buildDemoPayload,
  delawareBasinBbox,
} from "./data";
import ResearchMap from "./ResearchMap";
import type {
  DashboardFilters,
  DashboardObservation,
  DashboardPayload,
  ExportFormat,
  ExportRecord,
  ExportRequest,
  ForecastPayload,
  MapLayers,
  ObservationActions,
  ResearchRole,
  SamplingCell,
  ScreenId,
  VerificationHistoryEvent,
  VerificationStatus,
} from "./types";

const requesterId =
  import.meta.env.VITE_REQUESTER_ID ?? "00000000-0000-0000-0000-000000000000";
const hasApiToken = Boolean(import.meta.env.VITE_API_TOKEN);
const apiConfigured = isApiModeConfigured();

const defaultDashboardFilters: DashboardFilters = {
  speciesId: "",
  bbox: delawareBasinBbox,
  regionCode: "",
  fromDate: "2026-06-01",
  toDate: "2026-06-30",
  verificationStatus: "",
  signalLabel: "high_value_verification_candidate",
  needsReview: true,
  hasMedia: false,
};

const screens: Array<{
  id: ScreenId;
  label: string;
  icon: typeof LayoutGrid;
  badge?: string;
}> = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "verification", label: "Verification Queue", icon: ListChecks },
  { id: "observations", label: "Observations", icon: Table2 },
  { id: "forecast", label: "Forecast Map", icon: MapIcon },
  { id: "sampling", label: "Sampling Gaps", icon: Database },
  { id: "exports", label: "Exports", icon: Download },
  { id: "analyst", label: "AI Analyst", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

function buildOverviewSubtitle(filters: DashboardFilters) {
  const parts: string[] = [];
  if (filters.bbox === delawareBasinBbox || !filters.bbox.trim()) {
    parts.push("Delaware River Basin");
  } else {
    parts.push("Custom area");
  }
  if (filters.fromDate && filters.toDate) {
    parts.push(`${filters.fromDate} to ${filters.toDate}`);
  } else if (filters.fromDate) {
    parts.push(`from ${filters.fromDate}`);
  } else if (filters.toDate) {
    parts.push(`to ${filters.toDate}`);
  }
  return `Filtered operational view for ${parts.join(", ")}.`;
}

const screenCopy: Record<ScreenId, { title: string; subtitle: string }> = {
  overview: {
    title: "Research Workbench",
    subtitle: "",
  },
  verification: {
    title: "Verification queue",
    subtitle: "Review high-value verification candidates with evidence and uncertainty.",
  },
  observations: {
    title: "Observations",
    subtitle: "Search and compare structured ecological records.",
  },
  forecast: {
    title: "Forecast map",
    subtitle: "Potential spread corridors, verified records, and sampling context.",
  },
  sampling: {
    title: "Sampling gaps",
    subtitle: "Find weak, biased, or missing data before treating absence as absence.",
  },
  exports: {
    title: "Export center",
    subtitle: "Create privacy-aware CSV and GeoJSON research exports.",
  },
  analyst: {
    title: "AI analyst",
    subtitle: "Grounded research answers with cited sources and uncertainty.",
  },
  settings: {
    title: "Settings",
    subtitle: "Manage workspace defaults and research access preferences.",
  },
};

const storageKeys = {
  analystSaves: "ecosentinel.web.analystSaves",
  flaggedRecords: "ecosentinel.web.flaggedRecords",
  observationViews: "ecosentinel.web.observationViews",
  role: "ecosentinel.web.role",
  samplingPlanRecords: "ecosentinel.web.samplingPlanRecords",
  selectedId: "ecosentinel.web.selectedId",
  taskRecords: "ecosentinel.web.taskRecords",
};

function readScreenFromHash(): ScreenId {
  const screen = window.location.hash.replace("#", "") as ScreenId;
  return screens.some((item) => item.id === screen) ? screen : "overview";
}

function readStorage(key: string, fallback: string) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function readStringList(key: string, fallback: string[]) {
  try {
    const value = window.localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : null;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in private browsing.
  }
}

function writeStringList(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in private browsing.
  }
}

function readRole(): ResearchRole {
  const role = readStorage(storageKeys.role, "reviewer");
  return role === "researcher" || role === "reviewer" || role === "admin" ? role : "reviewer";
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function formatTimeAgo(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  const hours = Math.max(1, Math.round((Date.now() - parsed) / 3_600_000));
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function confidenceDotLevel(confidence: number) {
  return Math.max(1, Math.min(5, Math.round(confidence / 20)));
}

function computeOverviewStats(observations: DashboardObservation[], exports: ExportRecord[]) {
  const needsVerification = observations.filter((row) =>
    ["Unverified", "Needs more evidence"].includes(row.verificationStatus),
  ).length;
  const prioritySignals = observations.filter(
    (row) => row.signalLabel === "Priority ecological signal",
  ).length;
  const highValue = observations.filter(
    (row) => row.signalLabel === "High-value verification candidate",
  ).length;
  const verified = observations.filter((row) =>
    ["Expert verified", "Field confirmed"].includes(row.verificationStatus),
  ).length;
  const underSampled = observations.filter((row) =>
    row.samplingLabel.toLowerCase().includes("under-sampled"),
  ).length;
  const exportReady = exports.filter((row) => row.status === "Completed").length;

  return {
    needsVerification,
    prioritySignals,
    highValue,
    verified,
    underSampled,
    exportReady,
  };
}

function DonutChart({
  segments,
  size = 140,
  centerLabel,
}: {
  segments: Array<{ value: number; color: string; label: string }>;
  size?: number;
  centerLabel: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-chart-wrap">
      <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#E8EDE6" strokeWidth="14" />
        {segments.map((segment) => {
          const length = (segment.value / total) * circumference;
          const circle = (
            <circle
              key={segment.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="14"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += length;
          return circle;
        })}
        <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="800" fill="#102019">
          {centerLabel}
        </text>
        <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#5F6C63">
          Total
        </text>
      </svg>
      <div className="donut-legend">
        {segments.map((segment) => (
          <div key={segment.label}>
            <span>
              <i style={{ background: segment.color }} /> {segment.label}
            </span>
            <strong>{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfidenceRingSvg({ value, label }: { value: number; label: string }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = (value / 100) * circumference;

  return (
    <div className="confidence-row">
      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#E8EDE6" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#0B7A4C"
          strokeWidth="8"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="44" textAnchor="middle" fontSize="14" fontWeight="800" fill="#102019">
          {value}%
        </text>
      </svg>
      <div>
        <strong>{label}</strong>
        <span>Grounded confidence for this answer</span>
      </div>
    </div>
  );
}

function ScoreCircle({ score, tone = "green" }: { score: number; tone?: "green" | "amber" | "muted" }) {
  return <span className={`score-circle ${tone}`}>{score}</span>;
}

function SpeciesThumbnail({ label, index = 0 }: { label: string; index?: number }) {
  return (
    <span
      aria-label={`${label} thumbnail`}
      className={`species-thumbnail tile-${index % 6}`}
      role="img"
    />
  );
}

function ConfidenceDots({ confidence }: { confidence: number }) {
  const level = confidenceDotLevel(confidence);
  return (
    <span className="confidence-dots" aria-label={`${confidence}% confidence`}>
      {Array.from({ length: 5 }, (_, index) => (
        <i key={index} className={index < level ? "on" : undefined} />
      ))}
    </span>
  );
}

function computeExportExpires(requested: string): string {
  const parsed = Date.parse(requested);
  if (Number.isNaN(parsed)) {
    return "7 days after completion";
  }
  const expires = new Date(parsed + 7 * 24 * 60 * 60 * 1000);
  return expires.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function computeSamplingAnalysis(cells: SamplingCell[]) {
  const total = cells.length;
  const byCategory = new Map<string, number>();
  cells.forEach((cell) => {
    byCategory.set(cell.category, (byCategory.get(cell.category) ?? 0) + 1);
  });
  return Array.from(byCategory.entries())
    .map(([category, count]) => ({
      category,
      cells: count,
      pct: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((left, right) => right.cells - left.cells);
}

function DetectionSparkbar({ count, max = 5 }: { count: number; max?: number }) {
  const capped = Math.min(count, max);
  return (
    <span className="spark-bars" aria-hidden="true">
      {Array.from({ length: max }, (_, index) => (
        <i
          key={index}
          className={index < capped ? "on" : undefined}
          style={{ height: `${((index + 1) / max) * 100}%` }}
        />
      ))}
    </span>
  );
}

function UncertaintyFactors({ factors }: { factors: Array<{ label: string; value: number }> }) {
  return (
    <div className="uncertainty-factors">
      {factors.map((factor) => (
        <div key={factor.label} className="uncertainty-factor">
          <span>{factor.label}</span>
          <div className="bar">
            <span style={{ width: `${factor.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function buildUncertaintyFactors(observations: DashboardObservation[]) {
  const unverified = observations.filter(
    (row) => !["Expert verified", "Field confirmed"].includes(row.verificationStatus),
  ).length;
  const underSampled = observations.filter((row) =>
    row.samplingLabel.toLowerCase().includes("under-sampled"),
  ).length;
  const ratio = (count: number) =>
    observations.length > 0 ? Math.round((count / observations.length) * 100) : 0;

  return [
    { label: "Unverified records", value: ratio(unverified) },
    { label: "Under-sampled context", value: ratio(underSampled) },
    { label: "Seasonal variability", value: 42 },
    { label: "Identity confidence spread", value: 36 },
  ];
}

function buildVerificationDonut(observations: DashboardObservation[]) {
  const verified = observations.filter((row) =>
    ["Expert verified", "Field confirmed"].includes(row.verificationStatus),
  ).length;
  const rejected = observations.filter((row) => row.verificationStatus === "Rejected").length;
  const needsReview = Math.max(observations.length - verified - rejected, 0);
  return [
    { value: verified, color: "#0B7A4C", label: "Verified" },
    { value: needsReview, color: "#C98A1A", label: "Needs review" },
    { value: rejected, color: "#B84A42", label: "Rejected" },
  ];
}

function buildCitedSources(observations: DashboardObservation[]) {
  const verified = observations.filter((row) =>
    ["Expert verified", "Field confirmed"].includes(row.verificationStatus),
  ).length;
  return [
    {
      source: "EcoSentinel observations",
      type: "Platform",
      records: observations.length,
      range: "Jun 2026",
      verification: `${verified} verified`,
      contribution: Math.round((observations.length / (observations.length + 120)) * 100),
    },
    {
      source: "GBIF",
      type: "Occurrence",
      records: 120,
      range: "2018–2026",
      verification: "Historical",
      contribution: Math.round((120 / (observations.length + 120)) * 100),
    },
    {
      source: "NLCD",
      type: "Environmental",
      records: observations.length,
      range: "2021",
      verification: "Derived",
      contribution: 18,
    },
  ];
}

function getActiveFilterChips(filters: DashboardFilters) {
  const chips: string[] = [];

  if (filters.fromDate || filters.toDate) {
    chips.push(
      [filters.fromDate || "Any start", filters.toDate || "Any end"]
        .filter(Boolean)
        .join(" to "),
    );
  }
  if (filters.bbox.trim()) {
    chips.push(filters.bbox.trim() === delawareBasinBbox ? "Delaware River Basin" : "Custom bbox");
  }
  if (filters.regionCode) {
    chips.push(`Region: ${filters.regionCode}`);
  }
  if (filters.verificationStatus) {
    const label = filters.verificationStatus
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    chips.push(label);
  }
  if (filters.signalLabel) {
    const labelMap: Record<string, string> = {
      low_signal: "Low signal",
      moderate_signal: "Moderate signal",
      high_value_verification_candidate: "High-value verification candidate",
      priority_ecological_signal: "Priority ecological signal",
      insufficient_evidence: "Insufficient evidence",
    };
    chips.push(labelMap[filters.signalLabel] ?? filters.signalLabel.replaceAll("_", " "));
  }
  if (filters.needsReview) {
    chips.push("Needs review");
  }
  if (filters.hasMedia) {
    chips.push("Has media");
  }
  if (filters.speciesId.trim()) {
    chips.push("Species ID");
  }

  return chips;
}

function formatApiFallback(error: ApiError | null) {
  if (!error) {
    return null;
  }
  if (error.status === 401) {
    return {
      title: "API access required, showing demo fallback",
      body:
        "Set `VITE_REQUESTER_ID` or provide a bearer token before using research API mode. Demo fallback is still available.",
    };
  }
  if (error.status === 403) {
    return {
      title: "API access denied, showing demo fallback",
      body: error.message || "The configured identity does not have permission for this research workspace.",
    };
  }
  return {
    title: "API unavailable, showing demo fallback",
    body: error.message || "The dashboard could not load API data, so it reverted to deterministic demo data.",
  };
}

function formatActionError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "API access is required for this action. Provide a requester identity or bearer token.";
    }
    if (error.status === 403) {
      return error.message || "You do not have permission for this action.";
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "The request failed.";
}

function PanelTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      {meta ? <span>{meta}</span> : null}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge status ${slugify(status)}`}>{status}</span>;
}

function SignalBadge({ label }: { label: string }) {
  return <span className={`badge signal ${slugify(label)}`}>{label}</span>;
}

function InfoGroup({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section className="info-group">
      <h3>{title}</h3>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function VisualHero({ label }: { label: string }) {
  return (
    <div aria-label={`${label} evidence image`} className="visual-hero" role="img">
      <Leaf size={18} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function Finding({ title, text }: { title: string; text: string }) {
  return (
    <div className="finding">
      <Save size={17} aria-hidden="true" />
      <span>
        <strong>{title}</strong>
        {text}
      </span>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBanner({
  tone,
  title,
  body,
}: {
  tone: "info" | "warning";
  title: string;
  body: string;
}) {
  return (
    <section className={`status-banner ${tone}`} role={tone === "warning" ? "alert" : "status"}>
      <strong>{title}</strong>
      <span>{body}</span>
    </section>
  );
}

function RecordList({
  rows,
  selectedId,
  onSelect,
  compact = false,
}: {
  rows: DashboardObservation[];
  selectedId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "record-list compact" : "record-list"}>
      {rows.length === 0 && (
        <EmptyState
          title="No records in this queue"
          body="The current search and filters do not match any observations."
        />
      )}
      {rows.map((row, index) => (
        <button
          key={row.id}
          className={row.id === selectedId ? "record-row active" : "record-row"}
          onClick={() => onSelect(row.id)}
          type="button"
        >
          <SpeciesThumbnail index={index} label={row.commonName} />
          <span>
            <strong>{row.commonName}</strong>
            <small className="scientific-name">{row.scientificName}</small>
            <small>
              {row.location} · {formatTimeAgo(row.submittedAt)}
            </small>
          </span>
          {compact ? (
            <SignalBadge label={row.signalLabel} />
          ) : (
            <ScoreCircle
              score={row.signalScore}
              tone={
                row.signalLabel === "Priority ecological signal"
                  ? "amber"
                  : row.signalScore < 50
                    ? "muted"
                    : "green"
              }
            />
          )}
        </button>
      ))}
    </div>
  );
}

function ObservationDetail({
  selected,
  expanded = false,
}: {
  selected: DashboardObservation;
  expanded?: boolean;
}) {
  const environmentalContextMissing =
    selected.habitat.toLowerCase().includes("pending") || selected.distanceToWaterM === 0;

  return (
    <div className={expanded ? "observation-detail expanded" : "observation-detail"}>
      <VisualHero label={selected.commonName} />
      <div className="detail-main">
        <div>
          <span className="eyebrow">Possible species</span>
          <h2>{selected.commonName}</h2>
          <p className="scientific-name">{selected.scientificName}</p>
        </div>
        <dl>
          <div>
            <dt>Identity confidence</dt>
            <dd>{selected.confidence}%</dd>
          </div>
          <div>
            <dt>Verification status</dt>
            <dd>
              <StatusBadge status={selected.verificationStatus} />
            </dd>
          </div>
          <div>
            <dt>Ecological Signal Priority</dt>
            <dd>
              <SignalBadge label={selected.signalLabel} />
            </dd>
          </div>
          <div>
            <dt>Coordinate privacy</dt>
            <dd>
              {selected.privacy}, ±{selected.coordinateUncertaintyM} m
            </dd>
          </div>
        </dl>
        {selected.evidenceCount <= 0 ? (
          <div className="inline-notice">Media evidence is not available for this observation yet.</div>
        ) : null}
        {environmentalContextMissing ? (
          <div className="inline-notice">
            Environmental context is not available for this observation yet.
          </div>
        ) : null}
      </div>
      <div className="detail-grid">
        <InfoGroup
          title="Habitat answers"
          rows={[
            ["Habitat", selected.habitat],
            [
              "Distance to water",
              selected.distanceToWaterM > 0 ? `${selected.distanceToWaterM} m` : "Not available yet",
            ],
            ["Sampling label", selected.samplingLabel],
          ]}
        />
        <InfoGroup
          title="Context sources"
          rows={[
            ["Observation source", selected.source],
            ["Land cover", "NLCD, forest edge"],
            ["Nearby records", "12 verified, 7 unverified"],
          ]}
        />
        {expanded ? (
          <InfoGroup
            title="Required review integrity"
            rows={[
              ["Expert verified", "Requires selected species"],
              ["Needs more evidence", "Requires requested evidence type"],
              ["Reject", "Requires reviewer notes"],
            ]}
          />
        ) : null}
      </div>
    </div>
  );
}

function ObservationActionsBar({
  actions,
  compact = false,
  mode = "default",
}: {
  actions: ObservationActions;
  compact?: boolean;
  mode?: "default" | "map" | "review";
}) {
  const primary =
    mode === "map"
      ? { label: "Open in queue", icon: ListChecks, onClick: actions.onOpenVerification }
      : { label: "View on map", icon: MapIcon, onClick: actions.onViewOnMap };
  const secondary =
    mode === "review" || mode === "map"
      ? null
      : { label: "Open in queue", icon: ListChecks, onClick: actions.onOpenVerification };
  const PrimaryIcon = primary.icon;
  const SecondaryIcon = secondary?.icon;

  return (
    <div
      className={compact ? "observation-actions compact" : "observation-actions"}
      aria-label="Selected observation actions"
    >
      <button className="plain-button" onClick={primary.onClick} type="button">
        <PrimaryIcon size={16} aria-hidden="true" />
        {primary.label}
      </button>
      {secondary && SecondaryIcon && !compact ? (
        <button className="plain-button" onClick={secondary.onClick} type="button">
          <SecondaryIcon size={16} aria-hidden="true" />
          {secondary.label}
        </button>
      ) : null}
      <button
        className={actions.flagged ? "plain-button active-command" : "plain-button"}
        onClick={actions.onToggleFlag}
        type="button"
      >
        <Flag size={16} aria-hidden="true" />
        {actions.flagged ? "Flagged" : "Flag"}
      </button>
      <button
        className={actions.inSamplingPlan ? "plain-button active-command" : "plain-button"}
        onClick={actions.onAddToSamplingPlan}
        type="button"
      >
        <ClipboardList size={16} aria-hidden="true" />
        {actions.inSamplingPlan ? "In sampling plan" : "Add to sampling plan"}
      </button>
      {!compact ? (
        <button
          className={actions.hasTask ? "plain-button active-command" : "plain-button"}
          onClick={actions.onCreateTask}
          type="button"
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          {actions.hasTask ? "Task created" : "Create follow-up task"}
        </button>
      ) : null}
      <button className="plain-button" onClick={actions.onExportRecord} type="button">
        <Download size={16} aria-hidden="true" />
        Export record
      </button>
    </div>
  );
}

function Sidebar({
  active,
  onChange,
  onRoleChange,
  role,
  syncSource,
  queueCount,
}: {
  active: ScreenId;
  onChange: (screen: ScreenId) => void;
  onRoleChange: (role: ResearchRole) => void;
  role: ResearchRole;
  syncSource: DashboardPayload["source"];
  queueCount: number;
}) {
  return (
    <aside className="sidebar">
      <div className="brand" aria-label="EcoSentinel Research">
        <div className="brand-mark">
          <Leaf size={22} />
        </div>
        <div>
          <strong>EcoSentinel</strong>
          <span>Research</span>
        </div>
      </div>
      <nav className="nav-list" aria-label="Primary navigation">
        {screens.map((screen) => {
          const Icon = screen.icon;
          return (
            <button
              key={screen.id}
              className={active === screen.id ? "nav-item active" : "nav-item"}
              onClick={() => onChange(screen.id)}
              type="button"
            >
              <Icon size={17} aria-hidden="true" />
              <span>{screen.label}</span>
              {screen.id === "verification" && queueCount > 0 ? (
                <span className="count-badge">{queueCount}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="sync-row">
          <span className="status-dot" />
          <span>{syncSource === "api" ? "API data synced" : "Demo data active"}</span>
        </div>
        <div className="profile-row">
          <div className="avatar" aria-hidden="true" />
          <div>
            <strong>Dr. Michael Chan</strong>
            <select
              aria-label="Research role"
              onChange={(event) => onRoleChange(event.target.value as ResearchRole)}
              value={role}
            >
              <option value="researcher">Researcher</option>
              <option value="reviewer">Reviewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  pendingExports,
  pendingReviews,
  query,
  requester,
  role,
  onQueryChange,
}: {
  pendingExports: number;
  pendingReviews: number;
  query: string;
  requester: string;
  role: ResearchRole;
  onQueryChange: (value: string) => void;
}) {
  const [popover, setPopover] = useState<"notifications" | "menu" | null>(null);

  return (
    <header className="topbar">
      <div className="search-box">
        <Search size={17} aria-hidden="true" />
        <input
          aria-label="Search observations"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search observations, species, regions..."
          type="search"
          value={query}
        />
      </div>
      <div className="top-actions">
        <button
          aria-expanded={popover === "notifications"}
          aria-label="Notifications"
          className="icon-button"
          onClick={() => setPopover((current) => (current === "notifications" ? null : "notifications"))}
          type="button"
        >
          <Bell size={19} />
          <span className="notification-dot" />
        </button>
        <button
          aria-expanded={popover === "menu"}
          aria-label="Open app menu"
          className="icon-button"
          onClick={() => setPopover((current) => (current === "menu" ? null : "menu"))}
          type="button"
        >
          <LayoutGrid size={18} />
        </button>
        {popover === "notifications" ? (
          <div className="utility-popover">
            <strong>Workspace notices</strong>
            <span>{pendingReviews} records need reviewer attention.</span>
            <span>
              {pendingExports} export request{pendingExports === 1 ? "" : "s"} processing.
            </span>
          </div>
        ) : null}
        {popover === "menu" ? (
          <div className="utility-popover app-menu">
            <strong>Research session</strong>
            <span>Role: {role}</span>
            <span>Requester: {requester}</span>
            <span>{hasApiToken ? "Bearer token configured" : "Local requester identity active"}</span>
            <span>Backend: API when configured, deterministic fallback otherwise</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function PageHeading({
  screen,
  source,
  subtitle,
  actions,
}: {
  screen: ScreenId;
  source: DashboardPayload["source"];
  subtitle?: string;
  actions?: ReactNode;
}) {
  const copy = screenCopy[screen];
  const displaySubtitle = subtitle ?? copy.subtitle;
  return (
    <section className="page-heading">
      <div>
        <h1>{copy.title}</h1>
        {displaySubtitle ? <p>{displaySubtitle}</p> : null}
      </div>
      <div className="page-actions">
        <span className="scope-pill">
          {source === "api" ? "Research mode" : "Demo fallback"}
        </span>
        {actions}
      </div>
    </section>
  );
}

function FilterRail({
  filters,
  onChange,
  screen,
}: {
  filters: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  screen: ScreenId;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeChips = getActiveFilterChips(filters);
  const scope =
    screen === "forecast"
      ? "Map"
      : screen === "exports"
        ? "Export"
        : screen === "analyst"
          ? "Analyst context"
          : screen === "verification"
            ? "Queue"
            : "Table";

  return (
    <section className="filter-rail" aria-label={`${scope} filters`}>
      <button className="filter-button" onClick={() => setExpanded((open) => !open)} type="button">
        <SlidersHorizontal size={15} aria-hidden="true" />
        {scope} filters
        <ChevronDown size={14} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} aria-hidden="true" />
      </button>
      {activeChips.length > 0 ? (
        <span className="active-count">{activeChips.length} filters active</span>
      ) : null}
      {!expanded && activeChips.length > 0 ? (
        <div className="filter-chips" aria-label="Active filters" style={{ flex: 1 }}>
          {activeChips.map((chip) => (
            <span key={chip}>{chip}</span>
          ))}
          <button onClick={() => onChange({ ...defaultDashboardFilters, bbox: "" })} type="button">
            Clear all
          </button>
        </div>
      ) : null}
      {expanded ? (
        <div className="filter-stack">
          <div className="filter-chips" aria-label="Active filters">
            {activeChips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
            <button onClick={() => onChange({ ...defaultDashboardFilters, bbox: "" })} type="button">
              Clear all
            </button>
            <button onClick={() => onChange(defaultDashboardFilters)} type="button">
              Restore demo filters
            </button>
          </div>
          <div className="filter-grid">
            <label>
              <span>From date</span>
              <input
                onChange={(event) => onChange({ ...filters, fromDate: event.target.value })}
                type="date"
                value={filters.fromDate}
              />
            </label>
            <label>
              <span>To date</span>
              <input
                onChange={(event) => onChange({ ...filters, toDate: event.target.value })}
                type="date"
                value={filters.toDate}
              />
            </label>
            <label>
              <span>Region code</span>
              <select
                onChange={(event) => onChange({ ...filters, regionCode: event.target.value })}
                value={filters.regionCode}
              >
                <option value="">Any region</option>
                <option value="NY">NY</option>
                <option value="NJ">NJ</option>
                <option value="PA">PA</option>
              </select>
            </label>
            <label>
              <span>Verification</span>
              <select
                onChange={(event) =>
                  onChange({
                    ...filters,
                    verificationStatus: event.target.value as DashboardFilters["verificationStatus"],
                  })
                }
                value={filters.verificationStatus}
              >
                <option value="">Any status</option>
                <option value="unverified">Unverified</option>
                <option value="needs_more_evidence">Needs more evidence</option>
                <option value="expert_verified">Expert verified</option>
                <option value="field_confirmed">Field confirmed</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label>
              <span>Ecological Signal Priority</span>
              <select
                onChange={(event) =>
                  onChange({
                    ...filters,
                    signalLabel: event.target.value as DashboardFilters["signalLabel"],
                  })
                }
                value={filters.signalLabel}
              >
                <option value="">Any label</option>
                <option value="high_value_verification_candidate">
                  High-value verification candidate
                </option>
                <option value="priority_ecological_signal">Priority ecological signal</option>
                <option value="moderate_signal">Moderate signal</option>
                <option value="low_signal">Low signal</option>
                <option value="insufficient_evidence">Insufficient evidence</option>
              </select>
            </label>
            <label>
              <span>Species ID</span>
              <input
                onChange={(event) => onChange({ ...filters, speciesId: event.target.value })}
                placeholder="Optional UUID"
                type="text"
                value={filters.speciesId}
              />
            </label>
            <label className="wide">
              <span>Bounding box</span>
              <input
                onChange={(event) => onChange({ ...filters, bbox: event.target.value })}
                placeholder="min_lon,min_lat,max_lon,max_lat"
                type="text"
                value={filters.bbox}
              />
            </label>
            <label className="toggle-field">
              <input
                checked={filters.needsReview}
                onChange={(event) => onChange({ ...filters, needsReview: event.target.checked })}
                type="checkbox"
              />
              <span>Needs review</span>
            </label>
            <label className="toggle-field">
              <input
                checked={filters.hasMedia}
                onChange={(event) => onChange({ ...filters, hasMedia: event.target.checked })}
                type="checkbox"
              />
              <span>Has media</span>
            </label>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MetricsGrid({
  observations,
  exports,
}: {
  observations: DashboardObservation[];
  exports: ExportRecord[];
}) {
  const stats = computeOverviewStats(observations, exports);

  const primary = [
    ["Total observations", observations.length.toLocaleString(), "+18% from last 30 days"],
    ["Needs verification", stats.needsVerification.toLocaleString(), "Unverified + needs more evidence"],
    ["Priority signals", stats.prioritySignals.toLocaleString(), "High-value verification candidates"],
    ["Verified records", stats.verified.toLocaleString(), "Expert or field confirmed"],
  ] as const;

  const secondary = [
    ["High-value candidates", stats.highValue.toLocaleString(), "Visible in current filters"],
    ["Under-sampled zones", stats.underSampled.toLocaleString(), "Sampling gap labels"],
    ["Export-ready records", stats.exportReady.toLocaleString(), "Completed exports available"],
  ] as const;

  return (
    <>
      <section className="metrics-grid">
        {primary.map(([label, value, meta]) => (
          <div key={label} className="metric">
            <span className="metric-label">{label}</span>
            <strong className="metric-value">{value}</strong>
            <small className="metric-scope">{meta}</small>
          </div>
        ))}
      </section>
      <section className="kpi-row-secondary">
        {secondary.map(([label, value, meta]) => (
          <div key={label} className="metric">
            <span className="metric-label">{label}</span>
            <strong className="metric-value">{value}</strong>
            <small className="metric-scope">{meta}</small>
          </div>
        ))}
      </section>
    </>
  );
}

function OverviewPage({
  observations,
  exports,
  selected,
  onSelect,
  onOpenVerification,
  onOpenExports,
  filterCount,
  queueCount,
}: {
  observations: DashboardObservation[];
  exports: ExportRecord[];
  selected: DashboardObservation | null;
  onSelect: (id: string) => void;
  onOpenVerification: () => void;
  onOpenExports: () => void;
  filterCount: number;
  queueCount: number;
}) {
  const stats = computeOverviewStats(observations, exports);
  const donutSegments = [
    {
      label: "Priority signals",
      value: stats.prioritySignals,
      color: "#B63A32",
    },
    {
      label: "High-value candidates",
      value: stats.highValue,
      color: "#B86B00",
    },
    {
      label: "Needs more evidence",
      value: observations.filter((row) => row.verificationStatus === "Needs more evidence").length,
      color: "#0B7A4C",
    },
    {
      label: "Other",
      value: Math.max(
        0,
        observations.length - stats.prioritySignals - stats.highValue -
          observations.filter((row) => row.verificationStatus === "Needs more evidence").length,
      ),
      color: "#8A9690",
    },
  ].filter((segment) => segment.value > 0);

  const priorityRows = [...observations]
    .sort((a, b) => b.signalScore - a.signalScore)
    .slice(0, 5);

  return (
    <div className="overview-grid">
      <MetricsGrid exports={exports} observations={observations} />
      <div className="overview-workbench">
        <section className="panel">
          <PanelTitle title="Signal overview" meta="Current filter scope" />
          <DonutChart
            centerLabel={observations.length.toLocaleString()}
            segments={donutSegments.length > 0 ? donutSegments : [{ label: "No data", value: 1, color: "#DDE5DC" }]}
          />
          <button className="plain-button" onClick={onOpenVerification} style={{ margin: "0 16px 14px" }} type="button">
            View all signals
          </button>
        </section>
        <section className="panel">
          <PanelTitle title="Recent priority signals" meta="Sorted by Ecological Signal Priority" />
          <div className="recent-signals">
            {priorityRows.map((row, index) => (
              <button
                key={row.id}
                className={row.id === selected?.id ? "recent-signal-row active" : "recent-signal-row"}
                onClick={() => onSelect(row.id)}
                type="button"
              >
                <SpeciesThumbnail index={index} label={row.commonName} />
                <span>
                  <strong>{row.commonName}</strong>
                  <small className="scientific-name">{row.scientificName}</small>
                  <small>{row.location}</small>
                  <SignalBadge label={row.signalLabel} />
                </span>
                <span className="time-ago">{formatTimeAgo(row.submittedAt)}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="panel">
          <PanelTitle title="Workbench summary" meta="Quick links" />
          <div className="workbench-summary">
            <div className="workbench-row">
              <ListChecks size={16} aria-hidden="true" />
              <span>Active filters</span>
              <strong>{filterCount}</strong>
            </div>
            <div className="workbench-row">
              <ClipboardList size={16} aria-hidden="true" />
              <span>Verification queue</span>
              <button className="plain-button compact-action" onClick={onOpenVerification} type="button">
                Review ({queueCount})
              </button>
            </div>
            <div className="workbench-row">
              <Table2 size={16} aria-hidden="true" />
              <span>New observations</span>
              <strong>{observations.length}</strong>
            </div>
            <div className="workbench-row">
              <MapIcon size={16} aria-hidden="true" />
              <span>Signals updated</span>
              <strong>{stats.prioritySignals + stats.highValue}</strong>
            </div>
            <div className="workbench-row">
              <Download size={16} aria-hidden="true" />
              <span>Exports ready</span>
              <button className="plain-button compact-action" onClick={onOpenExports} type="button">
                Open ({stats.exportReady})
              </button>
            </div>
          </div>
          <button className="primary-action full-width" onClick={onOpenVerification} style={{ margin: "0 14px 14px" }} type="button">
            Open verification queue
          </button>
        </section>
      </div>
    </div>
  );
}

function VerificationPage({
  actions,
  history,
  historyError,
  historyLoading,
  observations,
  selected,
  onSelect,
  onVerify,
  pendingAction,
  role,
}: {
  actions?: ObservationActions;
  history: VerificationHistoryEvent[];
  historyError: string | null;
  historyLoading: boolean;
  observations: DashboardObservation[];
  selected: DashboardObservation | null;
  onSelect: (id: string) => void;
  onVerify: (status: VerificationStatus, notes: string) => void;
  pendingAction: string | null;
  role: ResearchRole;
}) {
  const canVerify = role === "reviewer" || role === "admin";
  const canFieldConfirm = role === "admin";
  const [notes, setNotes] = useState(selected?.reviewerNotes ?? "");
  const [evidenceType, setEvidenceType] = useState("Close-up media and habitat context");
  const notesReady = notes.trim().length >= 12;

  useEffect(() => {
    setNotes(selected?.reviewerNotes ?? "");
    setEvidenceType("Close-up media and habitat context");
  }, [selected?.id, selected?.reviewerNotes]);

  const handleVerify = (status: VerificationStatus) => {
    const prefix =
      status === "Needs more evidence" ? `Requested evidence: ${evidenceType}. ` : "";
    onVerify(status, `${prefix}${notes}`.trim());
  };

  return (
    <div className="verification-layout">
      <section className="panel queue-list">
        <PanelTitle title="Verification queue" meta={`${observations.length} records`} />
        <RecordList rows={observations} selectedId={selected?.id ?? ""} onSelect={onSelect} />
      </section>
      <section className="panel review-surface">
        <PanelTitle
          title={selected ? selected.commonName : "No visible record"}
          meta={selected ? selected.id : "Adjust filters"}
        />
        {selected ? (
          <>
            <div className="evidence-gallery">
              <div>
                <VisualHero label={selected.commonName} />
                <div className="evidence-thumbs">
                  {Array.from({ length: Math.min(4, Math.max(1, selected.evidenceCount)) }).map((_, index) => (
                    <span key={index} className={`visual-tile tile-${index % 6}`} />
                  ))}
                </div>
              </div>
              <div className="detail-main">
                <p className="scientific-name">{selected.scientificName}</p>
                <dl>
                  <div>
                    <dt>Location</dt>
                    <dd>
                      {selected.location} ({selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)})
                    </dd>
                  </div>
                  <div>
                    <dt>Observed</dt>
                    <dd>{selected.submittedAt}</dd>
                  </div>
                  <div>
                    <dt>Signal score</dt>
                    <dd>
                      {selected.signalScore}/100 · <SignalBadge label={selected.signalLabel} />
                    </dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>
                      {selected.confidence}% <ConfidenceDots confidence={selected.confidence} />
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            <ObservationDetail expanded selected={selected} />
            {actions ? <ObservationActionsBar actions={actions} mode="review" /> : null}
          </>
        ) : (
          <EmptyState
            title="No record available for review"
            body="The current search and filters do not match the assigned queue."
          />
        )}
        {!canVerify ? (
          <div className="inline-notice">You need reviewer or admin access to verify observations.</div>
        ) : null}
        <div className="review-actions" aria-label="Verification actions">
          <button
            className="primary-action"
            disabled={!selected || !canVerify || pendingAction !== null}
            onClick={() => handleVerify("Expert verified")}
            type="button"
          >
            <CheckCircle2 size={18} aria-hidden="true" />
            {pendingAction === "Expert verified" ? "Saving..." : "Expert verified"}
          </button>
          {canFieldConfirm ? (
            <button
              className="plain-button"
              disabled={!selected || pendingAction !== null}
              onClick={() => handleVerify("Field confirmed")}
              type="button"
            >
              <CheckCircle2 size={18} aria-hidden="true" />
              {pendingAction === "Field confirmed" ? "Saving..." : "Field confirmed"}
            </button>
          ) : null}
          <button
            className="warn-action"
            disabled={!selected || !canVerify || pendingAction !== null || !notesReady}
            onClick={() => handleVerify("Needs more evidence")}
            type="button"
          >
            <AlertTriangle size={18} aria-hidden="true" />
            {pendingAction === "Needs more evidence" ? "Saving..." : "Needs more evidence"}
          </button>
          <button
            className="danger-action"
            disabled={!selected || !canVerify || pendingAction !== null || !notesReady}
            onClick={() => handleVerify("Rejected")}
            type="button"
          >
            <XCircle size={18} aria-hidden="true" />
            {pendingAction === "Rejected" ? "Saving..." : "Reject with notes"}
          </button>
        </div>
      </section>
      <aside className="panel verification-side">
        <PanelTitle title="Possible species" meta="AI-ranked candidates" />
        {selected ? (
          <>
            <div className="species-candidate">
              <span>
                <strong>{selected.commonName}</strong>
                <div className="candidate-bar">
                  <span style={{ width: `${selected.confidence}%` }} />
                </div>
              </span>
              <strong>{selected.confidence}%</strong>
            </div>
            <div className="species-candidate">
              <span>
                Similar species warning
                <div className="candidate-bar">
                  <span style={{ width: "24%" }} />
                </div>
              </span>
              <strong>24%</strong>
            </div>
            <div className="species-candidate">
              <span>
                Regional look-alike
                <div className="candidate-bar">
                  <span style={{ width: "14%" }} />
                </div>
              </span>
              <strong>14%</strong>
            </div>
          </>
        ) : (
          <EmptyState title="No species context" body="Select a queue record to review candidates." />
        )}
        <PanelTitle title="Verification history" meta="Audit trail" />
        {historyLoading ? <p className="inline-notice">Loading verification history.</p> : null}
        {history.map((event) => (
          <div key={event.id} className="history-line">
            <span className="status-dot" />
            <p>
              <strong>{event.newStatus}</strong> from {event.previousStatus} on {event.createdAt}.
              {event.notes ? ` ${event.notes}` : ""}
            </p>
          </div>
        ))}
        {historyError ? <div className="inline-notice">{historyError}</div> : null}
        <h3>Reviewer notes</h3>
        <textarea
          aria-label="Reviewer notes"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add the evidence basis, uncertainty, or requested evidence before taking action."
          value={notes}
        />
        <label className="evidence-select">
          <span>Evidence request type</span>
          <select onChange={(event) => setEvidenceType(event.target.value)} value={evidenceType}>
            <option>Close-up media and habitat context</option>
            <option>Additional angle of possible species</option>
            <option>Host plant or substrate confirmation</option>
            <option>More precise but privacy-safe location context</option>
          </select>
        </label>
      </aside>
    </div>
  );
}

function ObservationsPage({
  actions,
  observations,
  selected,
  isPending,
  query,
  filters,
  onCreateExport,
  onSelect,
  onClearFilters,
}: {
  actions?: ObservationActions;
  observations: DashboardObservation[];
  selected: DashboardObservation | null;
  isPending: boolean;
  query: string;
  filters: DashboardFilters;
  onCreateExport: (request: ExportRequest) => Promise<void>;
  onSelect: (id: string) => void;
  onClearFilters: () => void;
}) {
  const [showSource, setShowSource] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedViews, setSavedViews] = useState(() =>
    readStringList(storageKeys.observationViews, [
      "Priority verification queue",
      "Delaware Basin export set",
    ]),
  );
  const [activeView, setActiveView] = useState(savedViews[0]);

  useEffect(() => {
    writeStringList(storageKeys.observationViews, savedViews);
  }, [savedViews]);

  const saveView = () => {
    const label = query.trim()
      ? `Search: ${query.trim()}`
      : `Visible records view ${savedViews.length + 1}`;
    setSavedViews((current) => (current.includes(label) ? current : [label, ...current]));
    setActiveView(label);
    setMessage(`${label} saved with filters, columns, sort, and selected record.`);
  };

  const exportView = async () => {
    setMessage(null);
    await onCreateExport({
      format: "CSV",
      filters: {
        source: "observations_table",
        visible_records: observations.length,
        region_code: "Delaware River Basin",
      },
      includeMediaUrls: true,
      includeEnvironmentalContext: true,
      includeSignalScores: true,
      includeVerification: true,
    });
    setMessage("CSV export request created from the current observations table view.");
  };

  const selectedIndex = selected ? observations.findIndex((row) => row.id === selected.id) : -1;
  const selectNeighbor = (direction: -1 | 1) => {
    if (selectedIndex < 0 || observations.length === 0) {
      return;
    }
    const nextIndex = (selectedIndex + direction + observations.length) % observations.length;
    onSelect(observations[nextIndex].id);
  };

  const filterChips = getActiveFilterChips(filters);

  return (
    <div className="table-layout">
      <section className="panel table-panel">
        <div className="filter-chip-row" aria-label="Active filters">
          {filterChips.map((chip) => (
            <span key={chip} className="filter-chip">
              {chip}
            </span>
          ))}
          {filterChips.length > 0 ? (
            <button className="plain-button compact-action" onClick={onClearFilters} type="button">
              Clear all
            </button>
          ) : null}
        </div>
        <div className="table-toolbar">
          <span>
            {observations.length} records visible · {activeView}
            {showSource ? " · source column shown" : ""}
          </span>
          <div>
            <button className="plain-button" type="button">
              Bulk actions
            </button>
            <button className="plain-button" onClick={() => setShowSource((open) => !open)} type="button">
              Column controls
            </button>
            <button className="plain-button" onClick={saveView} type="button">
              <Save size={16} aria-hidden="true" />
              Save view
            </button>
            <button
              className="primary-action"
              disabled={isPending || observations.length === 0}
              onClick={() => void exportView()}
              type="button"
            >
              <Download size={16} aria-hidden="true" />
              {isPending ? "Requesting..." : "Export"}
            </button>
          </div>
        </div>
        <div className="saved-view-row" aria-label="Saved views">
          {savedViews.map((view) => (
            <button
              key={view}
              className={activeView === view ? "saved-view active" : "saved-view"}
              onClick={() => setActiveView(view)}
              type="button"
            >
              {view}
            </button>
          ))}
        </div>
        {message ? <div className="inline-success">{message}</div> : null}
        <table>
          <thead>
            <tr>
              <th>Observation ID</th>
              <th>Possible species</th>
              <th>Confidence</th>
              <th>Verification</th>
              <th>Signal priority</th>
              <th>Region</th>
              <th>Submitted</th>
              {showSource ? <th>Source</th> : null}
            </tr>
          </thead>
          <tbody>
            {observations.map((row, index) => (
              <tr
                key={row.id}
                className={row.id === selected?.id ? "selected-row" : undefined}
                onClick={() => onSelect(row.id)}
              >
                <td>{row.id}</td>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <SpeciesThumbnail index={index} label={row.commonName} />
                    <span>
                      {row.commonName}
                      <span className="scientific-name">{row.scientificName}</span>
                    </span>
                  </span>
                </td>
                <td>
                  {row.confidence}% <ConfidenceDots confidence={row.confidence} />
                </td>
                <td>
                  <StatusBadge status={row.verificationStatus} />
                </td>
                <td>
                  <SignalBadge label={row.signalLabel} />
                </td>
                <td>{row.region}</td>
                <td>{row.submittedAt}</td>
                {showSource ? <td>{row.source}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <aside className="panel detail-drawer">
        <div className="drawer-header">
          <strong>{selected?.id ?? "Select a row"}</strong>
          <div className="drawer-nav">
            <button aria-label="Previous observation" onClick={() => selectNeighbor(-1)} type="button">
              <ChevronLeft size={16} />
            </button>
            <button aria-label="Next observation" onClick={() => selectNeighbor(1)} type="button">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        {selected ? (
          <>
            <ObservationDetail selected={selected} />
            <div className="drawer-quick-actions">
              <button className="plain-button" onClick={actions?.onViewOnMap} type="button">
                Open in map
              </button>
              <button className="plain-button" onClick={actions?.onToggleFlag} type="button">
                Add to watchlist
              </button>
              <button className="plain-button" onClick={actions?.onExportRecord} type="button">
                Export observation
              </button>
              <button className="plain-button" onClick={actions?.onOpenVerification} type="button">
                Create report
              </button>
            </div>
            {actions ? <ObservationActionsBar actions={actions} /> : null}
          </>
        ) : (
          <EmptyState
            title="No observation selected"
            body="Select a row to inspect evidence, uncertainty, and provenance."
          />
        )}
      </aside>
    </div>
  );
}

function ForecastPage({
  actions,
  observations,
  selected,
  forecast,
  onSelect,
}: {
  actions?: ObservationActions;
  observations: DashboardObservation[];
  selected: DashboardObservation | null;
  forecast: ForecastPayload | null;
  onSelect: (id: string) => void;
}) {
  const [layersOpen, setLayersOpen] = useState(true);
  const [layers, setLayers] = useState<MapLayers>({
    verifiedRecords: true,
    unverifiedRecords: true,
    corridors: true,
    samplingGaps: true,
    waterways: true,
    roadsAndTrails: true,
  });
  const [extraLayers, setExtraLayers] = useState({
    prioritySignals: true,
    signalClusters: false,
    parks: true,
  });

  const layerSections: Array<{
    title: string;
    items: Array<{
      key?: keyof MapLayers;
      extraKey?: keyof typeof extraLayers;
      label: string;
      icon: string;
    }>;
  }> = [
    {
      title: "Observations",
      items: [
        { key: "verifiedRecords", label: "Verified records", icon: "verified" },
        { key: "unverifiedRecords", label: "Unverified records", icon: "unverified" },
        { extraKey: "prioritySignals", label: "Priority signals", icon: "priority" },
        { key: "corridors", label: "Possible spread corridors", icon: "corridor" },
        { extraKey: "signalClusters", label: "Signal clusters", icon: "priority" },
      ],
    },
    {
      title: "Environment",
      items: [
        { key: "waterways", label: "Waterways", icon: "waterway" },
        { key: "roadsAndTrails", label: "Roads and trails", icon: "waterway" },
        { extraKey: "parks", label: "Parks and protected areas", icon: "gap" },
      ],
    },
    {
      title: "Analysis layers",
      items: [{ key: "samplingGaps", label: "Sampling gaps", icon: "gap" }],
    },
  ];

  const applyPreset = (preset: "verification" | "spread" | "sampling") => {
    if (preset === "verification") {
      setLayers({
        verifiedRecords: true,
        unverifiedRecords: true,
        corridors: false,
        samplingGaps: false,
        waterways: false,
        roadsAndTrails: false,
      });
      setExtraLayers({ prioritySignals: true, signalClusters: false, parks: false });
      return;
    }
    if (preset === "spread") {
      setLayers({
        verifiedRecords: true,
        unverifiedRecords: false,
        corridors: true,
        samplingGaps: false,
        waterways: true,
        roadsAndTrails: true,
      });
      setExtraLayers({ prioritySignals: true, signalClusters: true, parks: false });
      return;
    }
    setLayers({
      verifiedRecords: false,
      unverifiedRecords: true,
      corridors: false,
      samplingGaps: true,
      waterways: false,
      roadsAndTrails: false,
    });
    setExtraLayers({ prioritySignals: false, signalClusters: false, parks: true });
  };

  const selectedIndex = selected ? observations.findIndex((row) => row.id === selected.id) : -1;
  const selectNeighbor = (direction: -1 | 1) => {
    if (selectedIndex < 0 || observations.length === 0) {
      return;
    }
    const nextIndex = (selectedIndex + direction + observations.length) % observations.length;
    onSelect(observations[nextIndex].id);
  };

  return (
    <div className="map-workspace">
      <section className="map-stage">
        {layersOpen ? (
          <div className="map-control-panel">
            <div className="panel-title">
              <div>
                <strong>Layers and overlays</strong>
                <span>Forecast map controls</span>
              </div>
              <button aria-label="Close layers panel" className="plain-button compact-action" onClick={() => setLayersOpen(false)} type="button">
                <X size={14} />
              </button>
            </div>
            {layerSections.map((section) => (
              <div key={section.title}>
                <div className="layer-section-title">{section.title}</div>
                {section.items.map((item) => {
                  const checked = item.key
                    ? layers[item.key]
                    : item.extraKey
                      ? extraLayers[item.extraKey]
                      : false;
                  return (
                    <label key={item.label} className="toggle-row">
                      <span className="layer-label">
                        <i className={`layer-icon ${item.icon}`} />
                        {item.label}
                      </span>
                      <input
                        checked={checked}
                        onChange={(event) => {
                          if (item.key) {
                            setLayers((current) => ({ ...current, [item.key!]: event.target.checked }));
                            return;
                          }
                          if (item.extraKey) {
                            setExtraLayers((current) => ({
                              ...current,
                              [item.extraKey!]: event.target.checked,
                            }));
                          }
                        }}
                        type="checkbox"
                      />
                    </label>
                  );
                })}
              </div>
            ))}
            <div style={{ padding: "10px 12px" }}>
              <button className="plain-button" onClick={() => applyPreset("verification")} type="button">
                Layer presets ▾
              </button>
            </div>
          </div>
        ) : (
          <button
            className="plain-button"
            onClick={() => setLayersOpen(true)}
            style={{ position: "absolute", zIndex: 700, top: 14, left: 14 }}
            type="button"
          >
            Layers
          </button>
        )}
        {selected ? (
          <ResearchMap
            observations={observations}
            selected={selected}
            layers={layers}
            forecast={forecast}
            onSelect={onSelect}
            large
          />
        ) : (
          <EmptyState
            title="No map records visible"
            body="Clear search or restore filters to show research map records."
          />
        )}
      </section>
      <aside className="panel selected-map-record map-record-panel">
        <div className="drawer-header">
          <strong>{selected?.id ?? "Select a record"}</strong>
          <div className="drawer-nav">
            <button aria-label="Previous map record" onClick={() => selectNeighbor(-1)} type="button">
              <ChevronLeft size={16} />
            </button>
            <button aria-label="Next map record" onClick={() => selectNeighbor(1)} type="button">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        {selected ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 14px 12px" }}>
              <SpeciesThumbnail index={selectedIndex} label={selected.commonName} />
              <div>
                <strong>{selected.commonName}</strong>
                <span className="scientific-name">{selected.scientificName}</span>
              </div>
              <ScoreCircle score={selected.signalScore} />
            </div>
            <ObservationDetail selected={selected} expanded />
            <div className="model-insight">
              Possible spread context is derived from habitat match, nearby verified records, and pathway
              proximity. This is not a guaranteed prediction.
            </div>
            {actions ? <ObservationActionsBar actions={actions} mode="map" /> : null}
          </>
        ) : (
          <EmptyState
            title="No record selected"
            body="The current map filters do not match any observations."
          />
        )}
      </aside>
    </div>
  );
}

function SamplingSummary({ cells }: { cells: SamplingCell[] }) {
  const analysis = computeSamplingAnalysis(cells);

  return (
    <>
      <table className="analysis-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Grid cells</th>
            <th>% of area</th>
          </tr>
        </thead>
        <tbody>
          {analysis.map((row) => (
            <tr key={row.category}>
              <td>{row.category}</td>
              <td>{row.cells}</td>
              <td>{row.pct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="absence-callout">
        <strong>Absence is not true absence</strong>
        <p>
          No observations in a grid cell does not mean a species is absent. Check sampling effort and
          bias before concluding absence.
        </p>
        <button className="plain-button compact-action" type="button">
          Learn more
        </button>
      </div>
    </>
  );
}

function SamplingPage({
  cells,
  observations,
  selected,
  forecast,
  onSelect,
}: {
  cells: SamplingCell[];
  observations: DashboardObservation[];
  selected: DashboardObservation | null;
  forecast: ForecastPayload | null;
  onSelect: (id: string) => void;
}) {
  const layers = {
    verifiedRecords: false,
    unverifiedRecords: true,
    corridors: false,
    samplingGaps: true,
    waterways: false,
    roadsAndTrails: false,
  };

  return (
    <div className="sampling-layout">
      <div className="sampling-map-row">
        <section className="panel sampling-map">
          <PanelTitle title="Sampling gap map" meta="Region: Delaware River Basin · grid: 5 km" />
          {selected ? (
            <ResearchMap
              observations={observations}
              selected={selected}
              layers={layers}
              forecast={forecast}
              onSelect={onSelect}
              large
              samplingFocus
            />
          ) : (
            <EmptyState
              title="No sampling records visible"
              body="Sampling gaps still exist, but no observations match the active table context."
            />
          )}
        </section>
        <aside className="panel">
          <PanelTitle title="Sampling gap analysis" meta={`${cells.length} active cells`} />
          <div style={{ padding: "0 14px 14px" }}>
            <SamplingSummary cells={cells} />
          </div>
        </aside>
      </div>
      <section className="panel sampling-table">
        <PanelTitle title="Grid cell summary" meta={`${cells.length} cells`} />
        <table>
          <thead>
            <tr>
              <th>Priority</th>
              <th>Grid cell</th>
              <th>Category</th>
              <th>Habitat suitability</th>
              <th>Sampling effort</th>
              <th>Detections</th>
              <th>Last observation</th>
              <th>Gap confidence</th>
            </tr>
          </thead>
          <tbody>
            {cells.map((cell, index) => (
              <tr key={cell.id}>
                <td>
                  <span className={`priority ${cell.priority.toLowerCase()}`}>{cell.priority}</span>
                </td>
                <td>{cell.id}</td>
                <td>
                  <StatusBadge status={cell.category} />
                </td>
                <td>{cell.habitatSuitability.toFixed(2)}</td>
                <td>{cell.samplingEffort.toFixed(2)}</td>
                <td>
                  <DetectionSparkbar count={cell.detections} />
                  <span style={{ marginLeft: 6 }}>{cell.detections}</span>
                </td>
                <td>{cell.detections > 0 ? `Jun ${20 + index}, 2026` : "No recent record"}</td>
                <td>{cell.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-toolbar">
          <span>Showing {cells.length} cells</span>
          <div>
            <button className="plain-button" type="button">
              Previous
            </button>
            <button className="plain-button" type="button">
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ExportHistoryTable({
  rows,
  onRefreshExport,
  onRetryExport,
}: {
  rows: ExportRecord[];
  onRefreshExport: (record: ExportRecord) => void;
  onRetryExport: (record: ExportRecord) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);

  const handleAction = (record: ExportRecord) => {
    if (record.status === "Completed") {
      downloadExportRecord(record);
      setMessage(`${record.name} is ready for download. Privacy rules remain applied.`);
      return;
    }
    if (record.status === "Failed") {
      onRetryExport(record);
      setMessage(`${record.name} retry queued with the same filters.`);
      return;
    }
    onRefreshExport(record);
    setMessage(`${record.name} is still processing. Refreshing the latest export status.`);
  };

  return (
    <>
      {message ? <div className="inline-success">{message}</div> : null}
      <table>
        <thead>
          <tr>
            <th>Export name</th>
            <th>Format</th>
            <th>Filters</th>
            <th>Records</th>
            <th>Status</th>
            <th>Requested</th>
            <th>Expires</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((record) => (
            <tr key={record.id}>
              <td>{record.name}</td>
              <td>{record.format}</td>
              <td>{record.filters}</td>
              <td>{record.records.toLocaleString()}</td>
              <td>
                <span className={`badge status ${record.status.toLowerCase()}`}>{record.status}</span>
              </td>
              <td>{record.requested}</td>
              <td>{computeExportExpires(record.requested)}</td>
              <td>
                <button
                  className="plain-button compact-action"
                  onClick={() => handleAction(record)}
                  type="button"
                >
                  {record.status === "Failed" ? (
                    <RefreshCw size={16} />
                  ) : (
                    <Download size={16} />
                  )}
                  {record.status === "Failed"
                    ? "Retry"
                    : record.status === "Completed"
                      ? "Download"
                      : "Refresh"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ExportsPage({
  exports: exportRows,
  filters,
  isPending,
  visibleRecordCount,
  onCreateExport,
  onRefreshExport,
  onRetryExport,
}: {
  exports: ExportRecord[];
  filters: DashboardFilters;
  isPending: boolean;
  visibleRecordCount: number;
  onCreateExport: (request: ExportRequest) => Promise<void>;
  onRefreshExport: (record: ExportRecord) => void;
  onRetryExport: (record: ExportRecord) => void;
}) {
  const [format, setFormat] = useState<ExportFormat>("CSV");
  const [fields, setFields] = useState({
    environmentalContext: true,
    mediaUrls: true,
    signalScores: true,
    verificationFields: true,
  });

  const fieldCount =
    12 +
    (fields.mediaUrls ? 2 : 0) +
    (fields.environmentalContext ? 6 : 0) +
    (fields.signalScores ? 4 : 0) +
    (fields.verificationFields ? 6 : 0);
  const estimatedSizeMb =
    format === "GeoJSON" ? (fieldCount / 30) * 3.6 : (fieldCount / 30) * 1.8;

  const fieldOptions: Array<[keyof typeof fields, string]> = [
    ["mediaUrls", "Media URLs"],
    ["environmentalContext", "Environmental context"],
    ["signalScores", "Signal scores"],
    ["verificationFields", "Verification fields"],
  ];

  const filterSummary = [
    filters.bbox === delawareBasinBbox ? "Delaware River Basin" : filters.bbox || "All regions",
    filters.fromDate && filters.toDate ? `${filters.fromDate} to ${filters.toDate}` : "All dates",
    filters.signalLabel ? filters.signalLabel.replaceAll("_", " ") : "All signal labels",
    filters.verificationStatus ? filters.verificationStatus.replaceAll("_", " ") : "All verification",
  ];

  return (
    <div className="export-layout">
      <section className="panel">
        <PanelTitle title="Configure export" meta="Research export center" />
        <div className="export-step">
          <h3>1. Select format</h3>
          <div className="format-grid" style={{ padding: 0 }}>
            <button
              className={format === "CSV" ? "format-option selected" : "format-option"}
              onClick={() => setFormat("CSV")}
              type="button"
            >
              <Download size={24} aria-hidden="true" />
              <strong>CSV</strong>
              <span>Tabular records for analysis in spreadsheets and statistical software.</span>
            </button>
            <button
              className={format === "GeoJSON" ? "format-option selected" : "format-option"}
              onClick={() => setFormat("GeoJSON")}
              type="button"
            >
              <MapIcon size={24} aria-hidden="true" />
              <strong>GeoJSON</strong>
              <span>Geospatial records for GIS workflows and map layers.</span>
            </button>
          </div>
        </div>
        <div className="export-step">
          <h3>2. Filters summary</h3>
          <div className="filter-chip-row" style={{ padding: 0 }}>
            {filterSummary.map((chip) => (
              <span key={chip} className="filter-chip">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="export-step">
          <h3>3. Include fields</h3>
          <div className="field-list" style={{ padding: 0 }}>
            {fieldOptions.map(([key, label]) => (
              <label key={key} className="toggle-row">
                <span>{label}</span>
                <input
                  checked={fields[key]}
                  onChange={(event) =>
                    setFields((current) => ({ ...current, [key]: event.target.checked }))
                  }
                  type="checkbox"
                />
              </label>
            ))}
            <label className="toggle-row muted">
              <span>Observer information requires admin permission</span>
              <input disabled type="checkbox" />
            </label>
          </div>
        </div>
        <div className="export-step">
          <h3>4. Advanced options</h3>
          <div className="settings-grid" style={{ padding: 0 }}>
            <SettingRow label="Coordinate precision" value="Obscured unless authorized" />
            <SettingRow label="Export scope" value="Visible filtered records" />
          </div>
        </div>
        <div className="privacy-ethics">
          <div className="privacy-item">
            <Shield size={18} aria-hidden="true" />
            <strong>Location privacy</strong>
            <span>Obscured coordinates remain generalized in exports.</span>
          </div>
          <div className="privacy-item">
            <Database size={18} aria-hidden="true" />
            <strong>Anonymization</strong>
            <span>Observer fields require elevated permissions.</span>
          </div>
          <div className="privacy-item">
            <CheckCircle2 size={18} aria-hidden="true" />
            <strong>Ethical use</strong>
            <span>Exports are intended for research and conservation review.</span>
          </div>
        </div>
      </section>
      <aside className="panel">
        <PanelTitle title="Preview" meta="Estimated export package" />
        <div className="preview-numbers">
          <div>
            <span>Estimated records</span>
            <strong>{visibleRecordCount > 0 ? visibleRecordCount.toLocaleString() : "0"}</strong>
          </div>
          <div>
            <span>Species included</span>
            <strong>42</strong>
          </div>
          <div>
            <span>Date range</span>
            <strong>
              {filters.fromDate && filters.toDate
                ? `${filters.fromDate} to ${filters.toDate}`
                : "All dates"}
            </strong>
          </div>
        </div>
        <div className="export-field-summary">
          <span>Estimated file size</span>
          <strong>~{estimatedSizeMb.toFixed(1)} MB</strong>
        </div>
        <div className="finding-list" style={{ margin: "0 14px 14px" }}>
          <Finding title="Media URLs" text={fields.mediaUrls ? "Included" : "Excluded"} />
          <Finding title="Environmental context" text={fields.environmentalContext ? "Included" : "Excluded"} />
          <Finding title="Signal scores" text={fields.signalScores ? "Included" : "Excluded"} />
          <Finding title="Verification fields" text={fields.verificationFields ? "Included" : "Excluded"} />
        </div>
        <div className="notice">
          Sensitive or obscured records are generalized according to export permissions. Private records
          require admin access.
        </div>
        <button
          className="primary-action full-width"
          disabled={isPending}
          onClick={() =>
            void onCreateExport({
              format,
              filters: {
                region_code:
                  filters.bbox === delawareBasinBbox
                    ? "Delaware River Basin"
                    : filters.bbox || "Delaware River Basin",
                from_date: filters.fromDate || undefined,
                to_date: filters.toDate || undefined,
                needs_review: filters.needsReview || undefined,
                signal_label: filters.signalLabel || undefined,
                verification_status: filters.verificationStatus || undefined,
                visible_records: visibleRecordCount,
              },
              includeMediaUrls: fields.mediaUrls,
              includeEnvironmentalContext: fields.environmentalContext,
              includeSignalScores: fields.signalScores,
              includeVerification: fields.verificationFields,
            })
          }
          type="button"
        >
          {isPending ? "Creating..." : "Create export"}
        </button>
        <p style={{ margin: "0 14px 14px", color: "var(--muted)", fontSize: 12 }}>
          Exports remain secure for 7 days after completion.
        </p>
      </aside>
      <section className="panel export-history">
        <PanelTitle title="Export history" meta="Downloads expire after 7 days" />
        <ExportHistoryTable
          rows={exportRows}
          onRefreshExport={onRefreshExport}
          onRetryExport={onRetryExport}
        />
      </section>
    </div>
  );
}

function AnalystPage({
  observations,
  apiSource,
  filtersActive,
}: {
  observations: DashboardObservation[];
  apiSource: DashboardPayload["source"];
  filtersActive: boolean;
}) {
  const defaultQuestion =
    "What are the key emerging ecological signals in the Delaware River Basin this month?";
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState(defaultQuestion);
  const [apiAnswer, setApiAnswer] = useState<ReturnType<typeof buildAnalystAnswer> | null>(null);
  const [analystPending, setAnalystPending] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState(() =>
    readStringList(storageKeys.analystSaves, ["May priority signal summary"]),
  );
  const localAnswer = useMemo(() => buildAnalystAnswer(question, observations), [question, observations]);
  const answer = apiAnswer ?? localAnswer;

  useEffect(() => {
    writeStringList(storageKeys.analystSaves, savedAnalyses);
  }, [savedAnalyses]);

  const ask = async () => {
    const next = draft.trim();
    if (!next) {
      return;
    }
    setQuestion(next);
    setDraft("");
    setApiAnswer(null);

    if (apiSource === "api") {
      setAnalystPending(true);
      const response = await askResearchAnalyst(next, {
        needs_review: filtersActive ? true : undefined,
        signal_label: filtersActive ? "high_value_verification_candidate" : undefined,
        visible_records: observations.length,
      });
      setApiAnswer(response);
      setAnalystPending(false);
    }
  };

  const saveAnalysis = () => {
    const label = question.length > 48 ? `${question.slice(0, 45)}...` : question;
    setSavedAnalyses((current) => (current.includes(label) ? current : [label, ...current]));
  };

  const topRecords = useMemo(
    () => [...observations].sort((left, right) => right.signalScore - left.signalScore).slice(0, 5),
    [observations],
  );
  const uncertaintyFactors = useMemo(() => buildUncertaintyFactors(observations), [observations]);
  const verificationDonut = useMemo(() => buildVerificationDonut(observations), [observations]);
  const citedSources = useMemo(() => buildCitedSources(observations), [observations]);
  const samplingConcerns = observations
    .filter((row) => row.samplingLabel.toLowerCase().includes("under-sampled"))
    .slice(0, 2);

  return (
    <div className="analyst-layout">
      <section className="panel analyst-chat">
        <PanelTitle title="Question panel" meta="Ask a research question" />
        <label className="ask-box">
          <span>Ask a question</span>
          <textarea
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about signals, sampling gaps, verification status, or exportable records..."
            value={draft}
          />
        </label>
        <div className="analyst-actions">
          <button
            className="primary-action"
            disabled={!draft.trim() || analystPending}
            onClick={() => void ask()}
            type="button"
          >
            <Send size={16} aria-hidden="true" />
            {analystPending ? "Asking..." : "Send"}
          </button>
          <button className="plain-button" onClick={saveAnalysis} type="button">
            <Save size={16} aria-hidden="true" />
            Save analysis
          </button>
        </div>
        <div className="saved-analyses">
          <h3>Saved analyses</h3>
          {savedAnalyses.map((item) => (
            <button key={item} onClick={() => setQuestion(item)} type="button">
              {item}
            </button>
          ))}
        </div>
        <div className="saved-analyses">
          <h3>Suggested questions</h3>
          {[
            "Which species need verification most urgently?",
            "Where are the largest sampling gaps?",
            "What export format fits corridor review?",
          ].map((item) => (
            <button key={item} onClick={() => setQuestion(item)} type="button">
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="panel analyst-answer">
        <PanelTitle title="Answer panel" meta="Grounded in platform data" />
        <h2 style={{ margin: "14px 16px 0", fontSize: 18 }}>{question}</h2>
        <p>{answer.summary}</p>
        <div className="finding-list">
          <strong style={{ fontSize: 12, color: "var(--muted)" }}>Key findings</strong>
          {answer.findings.map((finding) => (
            <Finding key={finding.title} title={finding.title} text={finding.text} />
          ))}
        </div>
        <div className="confidence-row">
          <ConfidenceRingSvg label={answer.confidenceLabel} value={answer.confidence} />
          <div>
            <strong>Confidence and uncertainty</strong>
            <span>{answer.uncertainty}</span>
            <UncertaintyFactors factors={uncertaintyFactors} />
          </div>
        </div>
        <div style={{ margin: "0 16px 14px" }}>
          <h3 style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Cited data sources</h3>
          <table className="cited-sources-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Type</th>
                <th>Records</th>
                <th>Date range</th>
                <th>Verification</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {citedSources.map((row) => (
                <tr key={row.source}>
                  <td>{row.source}</td>
                  <td>{row.type}</td>
                  <td>{row.records}</td>
                  <td>{row.range}</td>
                  <td>{row.verification}</td>
                  <td>{row.contribution}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: "0 16px 16px", color: "var(--muted)", fontSize: 12 }}>
          Methodology combines filtered observations, verification status, sampling context, and cited
          platform sources.{" "}
          <button className="plain-button compact-action" type="button">
            View model card
          </button>
        </p>
        <div className="analyst-bottom-bar">
          <textarea
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void ask();
              }
            }}
            placeholder="Ask a research question..."
            value={draft}
          />
          <button
            className="primary-action"
            disabled={!draft.trim() || analystPending}
            onClick={() => void ask()}
            type="button"
          >
            <Send size={16} aria-hidden="true" />
            Send
          </button>
        </div>
      </section>

      <aside className="panel">
        <PanelTitle title="Top records" meta="By Ecological Signal Priority" />
        <div className="top-records-panel">
          {topRecords.map((row, index) => (
            <div key={row.id} className="top-record-row">
              <SpeciesThumbnail index={index} label={row.commonName} />
              <div>
                <strong>{row.commonName}</strong>
                <span className="scientific-name">{row.location}</span>
              </div>
              <ScoreCircle score={row.signalScore} />
            </div>
          ))}
        </div>
        {samplingConcerns.length > 0 ? (
          <div className="inline-notice" style={{ margin: "0 14px 14px" }}>
            <AlertTriangle size={14} aria-hidden="true" />
            <div>
              <strong>Sampling concerns</strong>
              <p>
                {samplingConcerns.length} visible record
                {samplingConcerns.length === 1 ? "" : "s"} sit in under-sampled context. Absence should
                not be treated as true absence.
              </p>
            </div>
          </div>
        ) : null}
        <PanelTitle title="Export and results" meta="Quick outputs" />
        <div className="workbench-summary" style={{ margin: "0 14px 14px" }}>
          <button className="plain-button" type="button">
            <Download size={14} />
            PDF summary
          </button>
          <button className="plain-button" type="button">
            <Table2 size={14} />
            CSV table
          </button>
        </div>
        <PanelTitle title="Verification status summary" meta="Visible records" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 14px 14px" }}>
          <DonutChart
            centerLabel={`${observations.length}`}
            segments={verificationDonut}
            size={88}
          />
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            <div>Verified</div>
            <div>Needs review</div>
            <div>Rejected</div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SettingsPage({
  role,
  onRoleChange,
}: {
  role: ResearchRole;
  onRoleChange: (role: ResearchRole) => void;
}) {
  return (
    <div className="settings-layout">
      <section className="panel settings-panel">
        <PanelTitle title="Workspace settings" meta="Research defaults" />
        <div className="settings-grid">
          <SettingRow label="Default region" value="Delaware River Basin" />
          <SettingRow label="Default map payload" value="Research mode" />
          <SettingRow
            label="Requester identity"
            value={hasApiToken ? "Bearer token configured" : requesterId}
          />
          <div className="setting-row">
            <span>Verification role</span>
            <select
              aria-label="Settings verification role"
              onChange={(event) => onRoleChange(event.target.value as ResearchRole)}
              value={role}
            >
              <option value="researcher">Researcher</option>
              <option value="reviewer">Reviewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <SettingRow label="Export privacy mode" value="Exclude private records" />
        </div>
      </section>
      <section className="panel settings-panel">
        <PanelTitle title="Map defaults" meta="Forecast Map" />
        <div className="settings-grid">
          <SettingRow label="Basemap" value="OpenStreetMap terrain" />
          <SettingRow label="Visible layers" value="Records, corridors, gaps" />
          <SettingRow label="Coordinate display" value="Obscured unless authorized" />
          <SettingRow label="Legend behavior" value="Visible layers only" />
        </div>
      </section>
      <section className="panel settings-panel wide">
        <PanelTitle title="Workflow safeguards" meta="Product language and permissions" />
        <div className="settings-grid two-column">
          <SettingRow label="Score wording" value="Ecological Signal Priority" />
          <SettingRow label="Prediction language" value="Potential corridors only" />
          <SettingRow label="Reject action" value="Requires reviewer notes" />
          <SettingRow label="Private exports" value="Admin only" />
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>(() => readScreenFromHash());
  const [payload, setPayload] = useState<DashboardPayload>(() => buildDemoPayload());
  const [selectedId, setSelectedId] = useState(() =>
    readStorage(storageKeys.selectedId, buildDemoPayload().observations[0].id),
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [role, setRole] = useState<ResearchRole>(() => readRole());
  const [filters, setFilters] = useState<DashboardFilters>(defaultDashboardFilters);
  const [flaggedRecords, setFlaggedRecords] = useState(() => readStringList(storageKeys.flaggedRecords, []));
  const [samplingPlanRecords, setSamplingPlanRecords] = useState(() =>
    readStringList(storageKeys.samplingPlanRecords, []),
  );
  const [taskRecords, setTaskRecords] = useState(() => readStringList(storageKeys.taskRecords, []));
  const [workbenchMessage, setWorkbenchMessage] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastPayload | null>(null);
  const [apiFallbackError, setApiFallbackError] = useState<ApiError | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<VerificationHistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const visibleObservations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return payload.observations.filter((row) => {
      return (
        !normalized ||
        [
          row.id,
          row.commonName,
          row.scientificName,
          row.location,
          row.signalLabel,
          row.verificationStatus,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      );
    });
  }, [payload.observations, query]);

  const selected =
    visibleObservations.find((row) => row.id === selectedId) ?? visibleObservations[0] ?? null;

  const apiFallbackBanner = formatApiFallback(apiFallbackError);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const result = await loadDashboardData(filters);
      setPayload(result.payload);
      setApiFallbackError(result.apiError);
      setSelectedId((current) =>
        result.payload.observations.some((row) => row.id === current)
          ? current
          : (result.payload.observations[0]?.id ?? current),
      );

      if (result.payload.source === "api") {
        const forecastPayload = await loadForecastResearch(filters);
        setForecast(forecastPayload);
      } else {
        setForecast(null);
      }
    } catch (error) {
      setNotice({
        title: "Dashboard request failed",
        body: formatActionError(error),
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (visibleObservations.length > 0 && !visibleObservations.some((row) => row.id === selectedId)) {
      setSelectedId(visibleObservations[0].id);
    }
  }, [selectedId, visibleObservations]);

  useEffect(() => {
    const onHashChange = () => setScreen(readScreenFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    writeStorage(storageKeys.role, role);
  }, [role]);

  useEffect(() => {
    writeStorage(storageKeys.selectedId, selectedId);
  }, [selectedId]);

  useEffect(() => {
    writeStringList(storageKeys.flaggedRecords, flaggedRecords);
  }, [flaggedRecords]);

  useEffect(() => {
    writeStringList(storageKeys.samplingPlanRecords, samplingPlanRecords);
  }, [samplingPlanRecords]);

  useEffect(() => {
    writeStringList(storageKeys.taskRecords, taskRecords);
  }, [taskRecords]);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (screen !== "verification" || !selected || payload.source !== "api") {
        setVerificationHistory([]);
        setHistoryLoading(false);
        setHistoryError(null);
        return;
      }

      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const next = await fetchVerificationHistory(selected.id);
        if (active) {
          setVerificationHistory(next);
        }
      } catch (error) {
        if (active) {
          setHistoryError(formatActionError(error));
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, [payload.source, screen, selected]);

  const navigate = (next: ScreenId) => {
    setScreen(next);
    window.history.replaceState(null, "", `#${next}`);
  };

  const toggleListItem = (
    setter: Dispatch<SetStateAction<string[]>>,
    id: string,
    mode: "add" | "toggle",
  ) => {
    setter((current) => {
      const exists = current.includes(id);
      if (mode === "toggle") {
        return exists ? current.filter((item) => item !== id) : [id, ...current];
      }
      return exists ? current : [id, ...current];
    });
  };

  const handleVerify = async (status: VerificationStatus, notes: string) => {
    if (!selected) {
      setNotice({
        title: "Verification unavailable",
        body: "No visible observation is selected for verification.",
      });
      return;
    }

    const defaults: Record<VerificationStatus, string> = {
      Unverified: "",
      "Needs more evidence": "Reviewer requested sharper habitat and close-up media evidence.",
      "Expert verified": "Confirmed from submitted media evidence and species context.",
      "Field confirmed": "Field confirmation recorded by authorized reviewer.",
      Rejected: "Rejected because the submitted evidence is insufficient for this possible species.",
    };

    setPendingAction(status);
    setNotice(null);
    try {
      const nextStatus = await submitVerificationAction({
        observationId: selected.id,
        status,
        notes: notes.trim() || defaults[status],
        reviewerId: requesterId,
        verifiedSpeciesId: selected.speciesId,
      });
      setWorkbenchMessage(`${selected.commonName} updated to ${nextStatus}.`);
      await refreshDashboard();
      if (payload.source === "api") {
        setVerificationHistory(await fetchVerificationHistory(selected.id));
      }
    } catch (error) {
      setNotice({
        title:
          error instanceof ApiError && error.status === 403
            ? "Unauthorized reviewer action"
            : "Verification action failed",
        body: formatActionError(error),
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleCreateExport = async (request: ExportRequest) => {
    setPendingAction("export");
    setNotice(null);
    try {
      const created = await createExportRequest(request);
      const latest =
        payload.source === "api" ? await waitForExportCompletion(created.id) : created;

      setPayload((current) => ({
        ...current,
        exports: [
          latest,
          ...current.exports.filter((record) => record.id !== latest.id),
        ],
        lastSyncedAt: new Date().toISOString(),
      }));
      setWorkbenchMessage(
        latest.status === "Completed"
          ? `${latest.name} is ready for download.`
          : latest.status === "Failed"
            ? `${latest.name} failed. Review the export status and retry if needed.`
            : `${latest.name} is processing. Refresh export status for the latest result.`,
      );
    } catch (error) {
      setNotice({
        title:
          error instanceof ApiError && error.status === 403 ? "Export permission required" : "Export request failed",
        body: formatActionError(error),
      });
    } finally {
      setPendingAction(null);
    }
  };

  const refreshExport = async (record: ExportRecord) => {
    if (payload.source !== "api") {
      setWorkbenchMessage(`${record.name} is using demo export state.`);
      return;
    }

    try {
      const latest = await fetchExportRecord(record.id);
      setPayload((current) => ({
        ...current,
        exports: current.exports.map((item) => (item.id === latest.id ? latest : item)),
        lastSyncedAt: new Date().toISOString(),
      }));
      setWorkbenchMessage(
        latest.status === "Completed"
          ? `${latest.name} is ready for download.`
          : latest.status === "Failed"
            ? `${latest.name} failed to generate.`
            : `${latest.name} is still processing.`,
      );
    } catch (error) {
      setNotice({
        title: "Export refresh failed",
        body: formatActionError(error),
      });
    }
  };

  const retryExport = async (record: ExportRecord) => {
    if (!record.filterValues) {
      setNotice({
        title: "Export retry unavailable",
        body: "The original filter set is not available for this export record.",
      });
      return;
    }

    await handleCreateExport({
      format: record.format,
      filters: record.filterValues,
      includeMediaUrls: Boolean(record.filterValues.include_media_urls),
      includeEnvironmentalContext:
        record.filterValues.include_environmental_context !== false,
      includeSignalScores: record.filterValues.include_signal_scores !== false,
      includeVerification: record.filterValues.include_verification !== false,
    });
  };

  const actions: ObservationActions | undefined = selected
    ? {
        flagged: flaggedRecords.includes(selected.id),
        inSamplingPlan: samplingPlanRecords.includes(selected.id),
        hasTask: taskRecords.includes(selected.id),
        onAddToSamplingPlan: () => {
          toggleListItem(setSamplingPlanRecords, selected.id, "add");
          setWorkbenchMessage(`${selected.commonName} added to the sampling plan worklist.`);
        },
        onCreateTask: () => {
          toggleListItem(setTaskRecords, selected.id, "add");
          setWorkbenchMessage(`Follow-up task created for ${selected.commonName}.`);
        },
        onExportRecord: () => {
          downloadExportRecord({
            id: `SINGLE-${selected.id}`,
            name: `${selected.commonName} observation`,
            format: "CSV",
            filters: 1,
            filterValues: { observation_id: selected.id },
            records: 1,
            status: "Completed",
            requested: new Date().toLocaleString(),
          });
          setWorkbenchMessage(
            `${selected.commonName} single-record CSV downloaded with privacy notes.`,
          );
        },
        onOpenVerification: () => {
          setSelectedId(selected.id);
          navigate("verification");
          setWorkbenchMessage(`${selected.commonName} opened in the verification queue.`);
        },
        onToggleFlag: () => {
          const flagged = flaggedRecords.includes(selected.id);
          toggleListItem(setFlaggedRecords, selected.id, "toggle");
          setWorkbenchMessage(
            `${selected.commonName} ${flagged ? "removed from" : "added to"} flagged records.`,
          );
        },
        onViewOnMap: () => {
          setSelectedId(selected.id);
          navigate("forecast");
          setWorkbenchMessage(`${selected.commonName} opened on the Forecast Map.`);
        },
      }
    : undefined;

  const queueCount = useMemo(
    () =>
      visibleObservations.filter((row) =>
        ["Unverified", "Needs more evidence"].includes(row.verificationStatus),
      ).length,
    [visibleObservations],
  );

  return (
    <div className="app-shell">
      <Sidebar
        active={screen}
        onChange={navigate}
        onRoleChange={setRole}
        role={role}
        syncSource={payload.source}
        queueCount={queueCount}
      />
      <main className="workspace">
        <TopBar
          pendingExports={payload.exports.filter((row) => row.status === "Processing").length}
          pendingReviews={
            visibleObservations.filter((row) => row.verificationStatus !== "Expert verified").length
          }
          query={query}
          requester={hasApiToken ? "Bearer token" : requesterId}
          role={role}
          onQueryChange={setQuery}
        />
        <PageHeading
          actions={
            screen === "overview" ? (
              <button className="primary-action" onClick={() => navigate("verification")} type="button">
                Quick actions
                <ChevronDown size={14} aria-hidden="true" />
              </button>
            ) : undefined
          }
          screen={screen}
          source={payload.source}
          subtitle={screen === "overview" ? buildOverviewSubtitle(filters) : undefined}
        />
        {screen !== "settings" ? (
          <FilterRail
            filters={filters}
            onChange={setFilters}
            screen={screen}
          />
        ) : null}
        {loading ? (
          <StatusBanner
            tone="info"
            title="Loading research workspace"
            body="Fetching current research records and export history."
          />
        ) : null}
        {apiConfigured && apiFallbackBanner ? (
          <StatusBanner tone="warning" title={apiFallbackBanner.title} body={apiFallbackBanner.body} />
        ) : null}
        {notice ? <StatusBanner tone="warning" title={notice.title} body={notice.body} /> : null}
        {workbenchMessage ? (
          <StatusBanner tone="info" title="Workbench update" body={workbenchMessage} />
        ) : null}
        {screen === "overview" ? (
          <OverviewPage
            exports={payload.exports}
            filterCount={getActiveFilterChips(filters).length}
            observations={visibleObservations}
            queueCount={queueCount}
            selected={selected}
            onOpenExports={() => navigate("exports")}
            onOpenVerification={() => navigate("verification")}
            onSelect={setSelectedId}
          />
        ) : null}
        {screen === "verification" ? (
          <VerificationPage
            actions={actions}
            history={verificationHistory}
            historyError={historyError}
            historyLoading={historyLoading}
            pendingAction={pendingAction}
            role={role}
            selected={selected}
            observations={visibleObservations}
            onSelect={setSelectedId}
            onVerify={(status, notes) => void handleVerify(status, notes)}
          />
        ) : null}
        {screen === "observations" ? (
          <ObservationsPage
            actions={actions}
            filters={filters}
            isPending={pendingAction === "export"}
            query={query}
            selected={selected}
            observations={visibleObservations}
            onClearFilters={() => setFilters({ ...defaultDashboardFilters, bbox: "" })}
            onCreateExport={handleCreateExport}
            onSelect={setSelectedId}
          />
        ) : null}
        {screen === "forecast" ? (
          <ForecastPage
            actions={actions}
            selected={selected}
            observations={visibleObservations}
            forecast={forecast}
            onSelect={setSelectedId}
          />
        ) : null}
        {screen === "sampling" ? (
          <SamplingPage
            cells={payload.samplingCells}
            observations={visibleObservations}
            selected={selected}
            forecast={forecast}
            onSelect={setSelectedId}
          />
        ) : null}
        {screen === "exports" ? (
          <ExportsPage
            exports={payload.exports}
            filters={filters}
            isPending={pendingAction === "export"}
            visibleRecordCount={visibleObservations.length}
            onCreateExport={handleCreateExport}
            onRefreshExport={(record) => void refreshExport(record)}
            onRetryExport={retryExport}
          />
        ) : null}
        {screen === "analyst" ? (
          <AnalystPage
            observations={visibleObservations}
            apiSource={payload.source}
            filtersActive={getActiveFilterChips(filters).length > 0}
          />
        ) : null}
        {screen === "settings" ? <SettingsPage role={role} onRoleChange={setRole} /> : null}
      </main>
    </div>
  );
}
