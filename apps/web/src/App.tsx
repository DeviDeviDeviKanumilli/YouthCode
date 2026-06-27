import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Database,
  Download,
  Flag,
  LayoutGrid,
  Leaf,
  ListChecks,
  Map,
  MessageSquare,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Table2,
  XCircle,
} from "lucide-react";
import {
  askResearchAnalyst,
  createExportRequest,
  downloadExportRecord,
  loadDashboardData,
  loadForecastResearch,
  submitVerificationAction,
} from "./api";
import {
  buildAnalystAnswer,
  buildDemoPayload,
  provenanceSources,
} from "./data";
import ResearchMap from "./ResearchMap";
import type {
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
  VerificationStatus,
} from "./types";

const requesterId =
  import.meta.env.VITE_REQUESTER_ID ?? "00000000-0000-0000-0000-000000000000";

const screens: Array<{
  id: ScreenId;
  label: string;
  icon: typeof LayoutGrid;
  badge?: string;
}> = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "verification", label: "Verification Queue", icon: ListChecks },
  { id: "observations", label: "Observations", icon: Table2 },
  { id: "forecast", label: "Forecast Map", icon: Map },
  { id: "sampling", label: "Sampling Gaps", icon: Database },
  { id: "exports", label: "Exports", icon: Download },
  { id: "analyst", label: "AI Analyst", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

const screenCopy: Record<ScreenId, { title: string; subtitle: string }> = {
  overview: {
    title: "Research overview",
    subtitle: "Filtered operational view for Delaware River Basin, May 2025.",
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

function ProvenanceList() {
  return (
    <div className="source-list">
      {provenanceSources.map(([name, role]) => (
        <div key={name}>
          <span>{name}</span>
          <small>{role}</small>
        </div>
      ))}
    </div>
  );
}

function VisualTile({ index, label }: { index: number; label: string }) {
  return <span aria-label={label} className={`visual-tile tile-${index % 6}`} role="img" />;
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
          <VisualTile index={index} label={row.commonName} />
          <span>
            <strong>{row.commonName}</strong>
            <small className="scientific-name">{row.scientificName}</small>
            <small>
              {row.location} · {row.confidence}% confidence
            </small>
          </span>
          <SignalBadge label={row.signalLabel} />
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
      </div>
      <div className="detail-grid">
        <InfoGroup
          title="Habitat answers"
          rows={[
            ["Habitat", selected.habitat],
            ["Distance to water", `${selected.distanceToWaterM} m`],
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
      : { label: "View on map", icon: Map, onClick: actions.onViewOnMap };
  const secondary =
    mode === "review"
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
  const [docsOpen, setDocsOpen] = useState(false);

  return (
    <aside className="sidebar">
      <div className="brand" aria-label="EcoSentinel Research">
        <div className="brand-mark">
          <Leaf size={28} />
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
              <Icon size={20} aria-hidden="true" />
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
        <button className="plain-button" onClick={() => setDocsOpen((open) => !open)} type="button">
          <CircleHelp size={16} aria-hidden="true" />
          Documentation
        </button>
        {docsOpen ? (
          <div className="sidebar-hint">
            Dashboard direction is tracked in <strong>Research_Dashboard_UI_Guide.md</strong>.
          </div>
        ) : null}
        <div className="profile-row">
          <div className="avatar" aria-hidden="true" />
          <div>
            <strong>Dr. Alex Morgan</strong>
            <select
              aria-label="Research role"
              onChange={(event) => onRoleChange(event.target.value as ResearchRole)}
              value={role}
            >
              <option value="researcher">researcher</option>
              <option value="reviewer">reviewer</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <ChevronDown size={16} aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  pendingExports,
  pendingReviews,
  query,
  role,
  onQueryChange,
}: {
  pendingExports: number;
  pendingReviews: number;
  query: string;
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
            <span>Requester: local demo identity</span>
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
}: {
  screen: ScreenId;
  source: DashboardPayload["source"];
}) {
  return (
    <section className="page-heading">
      <div>
        <h1>{screenCopy[screen].title}</h1>
        <p>{screenCopy[screen].subtitle}</p>
      </div>
      <div className="scope-pill">
        <Database size={16} aria-hidden="true" />
        {source === "api" ? "Research mode" : "Demo fallback"}
      </div>
    </section>
  );
}

function FilterRail({
  filtersActive,
  onFiltersActiveChange,
  screen,
}: {
  filtersActive: boolean;
  onFiltersActiveChange: (active: boolean) => void;
  screen: ScreenId;
}) {
  const [expanded, setExpanded] = useState(true);
  const scope =
    screen === "forecast"
      ? "Map"
      : screen === "exports"
        ? "Export"
        : screen === "analyst"
          ? "Analyst context"
          : "Table";

  return (
    <section className="filter-rail" aria-label={`${scope} filters`}>
      <button className="filter-button" onClick={() => setExpanded((open) => !open)} type="button">
        <SlidersHorizontal size={17} aria-hidden="true" />
        {scope} filters
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <span className="active-count">
        {filtersActive ? "5 filters active" : "No filters active"}
      </span>
      {expanded ? (
        <div className="filter-chips" aria-label="Active filters">
          {filtersActive ? (
            <>
              <span>May 1–May 31, 2025</span>
              <span>Delaware River Basin</span>
              <span>Unverified + needs review</span>
              <span>High-value signals</span>
              <button onClick={() => onFiltersActiveChange(false)} type="button">
                Clear all
              </button>
            </>
          ) : (
            <button onClick={() => onFiltersActiveChange(true)} type="button">
              Restore demo filters
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function MetricsGrid({ observations }: { observations: DashboardObservation[] }) {
  const needsVerification = observations.filter((row) =>
    ["Unverified", "Needs more evidence"].includes(row.verificationStatus),
  ).length;
  const prioritySignals = observations.filter((row) =>
    ["High-value verification candidate", "Priority ecological signal"].includes(row.signalLabel),
  ).length;
  const underSampled = observations.filter((row) =>
    row.samplingLabel.toLowerCase().includes("under-sampled"),
  ).length;

  const metrics = [
    ["Visible observations", observations.length.toLocaleString(), "Current dashboard filters"],
    ["Needs verification", needsVerification.toLocaleString(), "Visible pending records"],
    ["Priority ecological signals", prioritySignals.toLocaleString(), "High-value or priority labels"],
    ["Under-sampled records", underSampled.toLocaleString(), "Visible records with sampling gaps"],
  ] as const;

  return (
    <section className="metrics-grid">
      {metrics.map(([label, value, meta]) => (
        <div key={label} className="metric">
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{meta}</small>
        </div>
      ))}
    </section>
  );
}

function OverviewPage({
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
  return (
    <div className="overview-grid">
      <MetricsGrid observations={observations} />
      <section className="panel map-panel">
        <PanelTitle
          title="Advanced forecast map"
          meta="Visible layers: records, potential corridors, sampling gaps"
        />
        {selected ? (
          <ResearchMap
            observations={observations}
            selected={selected}
            forecast={forecast}
            onSelect={onSelect}
          />
        ) : (
          <EmptyState
            title="No map records visible"
            body="Clear search or restore filters to show observations on the map."
          />
        )}
      </section>
      <section className="panel priority-panel">
        <PanelTitle title="Priority review stream" meta={`${observations.length} visible in current filters`} />
        <RecordList
          rows={observations.slice(0, 5)}
          selectedId={selected?.id ?? ""}
          onSelect={onSelect}
          compact
        />
      </section>
      <section className="panel detail-wide">
        <PanelTitle title="Selected observation" meta={selected?.id ?? "No visible record"} />
        {selected ? (
          <>
            <ObservationDetail selected={selected} />
            {actions ? <ObservationActionsBar actions={actions} compact /> : null}
          </>
        ) : (
          <EmptyState
            title="No observation selected"
            body="The current search and filters do not match any observations."
          />
        )}
      </section>
      <section className="panel provenance-panel">
        <PanelTitle title="Provenance and data sources" meta="Current selected record" />
        <ProvenanceList />
      </section>
    </div>
  );
}

function VerificationPage({
  actions,
  observations,
  selected,
  onSelect,
  onVerify,
  pendingAction,
  role,
}: {
  actions?: ObservationActions;
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
    <div className="queue-layout">
      <section className="panel queue-list">
        <PanelTitle title="Assigned queue" meta="Sorted by Ecological Signal Priority" />
        <RecordList rows={observations} selectedId={selected?.id ?? ""} onSelect={onSelect} />
      </section>
      <section className="panel review-surface">
        <PanelTitle
          title={selected ? `${selected.commonName} review` : "No visible record"}
          meta={selected?.scientificName ?? "Adjust filters"}
        />
        {selected ? (
          <>
            <ObservationDetail selected={selected} expanded />
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
        {selected ? (
          <div className="review-support-grid">
            <section>
              <h3>Verification history</h3>
              <div className="history-line">
                <span className="status-dot" />
                <p>
                  System queued this record for review because it is a{" "}
                  {selected.signalLabel.toLowerCase()}.
                </p>
              </div>
              {selected.reviewerNotes ? (
                <div className="history-line">
                  <span className="status-dot" />
                  <p>{selected.reviewerNotes}</p>
                </div>
              ) : null}
            </section>
            <section>
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
              <small className="review-hint">
                Notes are required for reject and needs-more-evidence decisions.
              </small>
            </section>
          </div>
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
    </div>
  );
}

function ObservationsPage({
  actions,
  observations,
  selected,
  isPending,
  query,
  onCreateExport,
  onSelect,
}: {
  actions?: ObservationActions;
  observations: DashboardObservation[];
  selected: DashboardObservation | null;
  isPending: boolean;
  query: string;
  onCreateExport: (request: ExportRequest) => Promise<void>;
  onSelect: (id: string) => void;
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

  return (
    <div className="table-layout">
      <section className="panel table-panel">
        <div className="table-toolbar">
          <span>
            {observations.length} records visible · {activeView}
            {showSource ? " · source column shown" : ""}
          </span>
          <div>
            <button className="plain-button" onClick={saveView} type="button">
              <Save size={16} aria-hidden="true" />
              Save view
            </button>
            <button className="plain-button" onClick={() => setShowSource((open) => !open)} type="button">
              <SlidersHorizontal size={16} aria-hidden="true" />
              {showSource ? "Hide source" : "Show source"}
            </button>
            <button
              className="plain-button"
              disabled={isPending || observations.length === 0}
              onClick={() => void exportView()}
              type="button"
            >
              <Download size={16} aria-hidden="true" />
              {isPending ? "Requesting..." : "Export view"}
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
            {observations.map((row) => (
              <tr
                key={row.id}
                className={row.id === selected?.id ? "selected-row" : undefined}
                onClick={() => onSelect(row.id)}
              >
                <td>{row.id}</td>
                <td>
                  {row.commonName}
                  <span className="scientific-name">{row.scientificName}</span>
                </td>
                <td>{row.confidence}%</td>
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
        <PanelTitle title="Record detail" meta={selected?.id ?? "Select a row"} />
        {selected ? (
          <>
            <ObservationDetail selected={selected} />
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
  const [layers, setLayers] = useState<MapLayers>({
    verifiedRecords: true,
    unverifiedRecords: true,
    corridors: true,
    samplingGaps: true,
    waterways: true,
    roadsAndTrails: true,
  });

  const layerOptions: Array<[keyof MapLayers, string]> = [
    ["verifiedRecords", "Verified records"],
    ["unverifiedRecords", "Unverified records"],
    ["corridors", "Potential spread corridors"],
    ["samplingGaps", "Sampling gaps"],
    ["waterways", "Waterways"],
    ["roadsAndTrails", "Roads and trails"],
  ];

  return (
    <div className="map-workspace">
      <section className="map-stage">
        <div className="map-control-panel">
          <PanelTitle title="Layers" meta="Visible layer controls" />
          {layerOptions.map(([key, label]) => (
            <label key={key} className="toggle-row">
              <span>{label}</span>
              <input
                checked={layers[key]}
                onChange={(event) =>
                  setLayers((current) => ({ ...current, [key]: event.target.checked }))
                }
                type="checkbox"
              />
            </label>
          ))}
        </div>
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
      <aside className="panel selected-map-record">
        <PanelTitle
          title="Selected record"
          meta={
            selected
              ? selected.privacy === "obscured"
                ? "Obscured coordinates"
                : "Public coordinates"
              : "No visible record"
          }
        />
        {selected ? (
          <>
            <ObservationDetail selected={selected} />
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

function SamplingSummary() {
  const rows = [
    ["Under-sampled zones", "612 cells"],
    ["Road/trail-biased areas", "384 cells"],
    ["Park/protected-area biased", "429 cells"],
    ["Likely false absence areas", "563 cells"],
    ["High-risk under-sampled", "221 cells"],
  ] as const;

  return (
    <div className="gap-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <div className="notice">
        No observations does not mean true absence. Verify sampling effort before concluding absence.
      </div>
    </div>
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
      <section className="panel sampling-map">
        <PanelTitle title="Sampling gap map" meta="Region: Delaware River Basin, grid: 5 km" />
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
        <PanelTitle title="Analysis summary" meta="No observations does not mean true absence" />
        <SamplingSummary />
      </aside>
      <section className="panel sampling-table">
        <PanelTitle title="Grid cell summary" meta="1,209 cells" />
        <table>
          <thead>
            <tr>
              <th>Priority</th>
              <th>Grid cell</th>
              <th>Category</th>
              <th>Habitat suitability</th>
              <th>Sampling effort</th>
              <th>Detections</th>
              <th>Gap confidence</th>
            </tr>
          </thead>
          <tbody>
            {cells.map((cell) => (
              <tr key={cell.id}>
                <td>
                  <span className={`priority ${cell.priority.toLowerCase()}`}>{cell.priority}</span>
                </td>
                <td>{cell.id}</td>
                <td>{cell.category}</td>
                <td>{cell.habitatSuitability.toFixed(2)}</td>
                <td>{cell.samplingEffort.toFixed(2)}</td>
                <td>{cell.detections}</td>
                <td>{cell.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ExportHistoryTable({
  rows,
  onRetryExport,
}: {
  rows: ExportRecord[];
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
    setMessage(`${record.name} is ${record.status.toLowerCase()}; downloads unlock when processing completes.`);
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
                      : "Details"}
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
  isPending,
  visibleRecordCount,
  onCreateExport,
  onRetryExport,
}: {
  exports: ExportRecord[];
  isPending: boolean;
  visibleRecordCount: number;
  onCreateExport: (request: ExportRequest) => Promise<void>;
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

  return (
    <div className="export-layout">
      <section className="panel">
        <PanelTitle title="Configure export" meta="Step 1 of 2" />
        <div className="format-grid">
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
            <Map size={24} aria-hidden="true" />
            <strong>GeoJSON</strong>
            <span>Geospatial records for GIS workflows and map layers.</span>
          </button>
        </div>
        <div className="field-list">
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
      </section>
      <aside className="panel">
        <PanelTitle title="Review and create" meta="Step 2 of 2" />
        <div className="preview-numbers">
          <div>
            <span>Records</span>
            <strong>{visibleRecordCount > 0 ? visibleRecordCount.toLocaleString() : "0"}</strong>
          </div>
          <div>
            <span>Species</span>
            <strong>42</strong>
          </div>
          <div>
            <span>Fields</span>
            <strong>{fieldCount}</strong>
          </div>
        </div>
        <div className="export-field-summary">
          <span>Estimated file size</span>
          <strong>~{estimatedSizeMb.toFixed(1)} MB</strong>
        </div>
        <div className="notice">
          Sensitive or obscured records are generalized according to export permissions. Private
          records require admin access.
        </div>
        <button
          className="primary-action full-width"
          disabled={isPending}
          onClick={() =>
            void onCreateExport({
              format,
              filters: {
                region_code: "Delaware River Basin",
                from_date: "2025-05-01",
                to_date: "2025-05-31",
                needs_review: true,
                signal_label: "high_value",
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
          {isPending ? "Creating..." : `Create ${format} export`}
        </button>
      </aside>
      <section className="panel export-history">
        <PanelTitle title="Export history" meta="Downloads expire after 7 days" />
        <ExportHistoryTable rows={exportRows} onRetryExport={onRetryExport} />
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

  return (
    <div className="analyst-layout">
      <section className="panel analyst-chat">
        <PanelTitle title="Question" meta="Verified context, model EcoSentinel-1.3" />
        <div className="question-card">{question}</div>
        <label className="ask-box">
          <span>Ask a research question</span>
          <textarea
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                ask();
              }
            }}
            placeholder="Ask about signals, sampling gaps, verification status, or exportable records..."
            value={draft}
          />
        </label>
        <div className="analyst-actions">
          <button className="primary-action" disabled={!draft.trim() || analystPending} onClick={() => void ask()} type="button">
            <Send size={16} aria-hidden="true" />
            {analystPending ? "Asking..." : "Ask analyst"}
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
      </section>
      <section className="panel analyst-answer">
        <PanelTitle title="Answer" meta="Includes uncertainty and cited sources" />
        <p>{answer.summary}</p>
        <div className="finding-list">
          {answer.findings.map((finding) => (
            <Finding key={finding.title} title={finding.title} text={finding.text} />
          ))}
        </div>
        <div className="confidence-row">
          <div className="confidence-ring">{answer.confidence}%</div>
          <div>
            <strong>{answer.confidenceLabel}</strong>
            <span>{answer.uncertainty}</span>
          </div>
        </div>
        <div className="method-list">
          <h3>Method</h3>
          {[
            "Filtered observations",
            "Compared against previous period",
            "Checked verification status",
            "Summarized uncertainty factors",
          ].map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
      </section>
      <aside className="panel">
        <PanelTitle title="Cited data sources" meta="Grounded platform context" />
        <ProvenanceList />
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
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [role, setRole] = useState<ResearchRole>(() => readRole());
  const [filtersActive, setFiltersActive] = useState(true);
  const [flaggedRecords, setFlaggedRecords] = useState(() => readStringList(storageKeys.flaggedRecords, []));
  const [samplingPlanRecords, setSamplingPlanRecords] = useState(() =>
    readStringList(storageKeys.samplingPlanRecords, []),
  );
  const [taskRecords, setTaskRecords] = useState(() => readStringList(storageKeys.taskRecords, []));
  const [workbenchMessage, setWorkbenchMessage] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastPayload | null>(null);

  const visibleObservations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return payload.observations.filter((row) => {
      const matchesSearch =
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
          .includes(normalized);
      const matchesFilters =
        !filtersActive ||
        (["Unverified", "Needs more evidence"].includes(row.verificationStatus) &&
          ["High-value verification candidate", "Priority ecological signal"].includes(
            row.signalLabel,
          ));
      return matchesSearch && matchesFilters;
    });
  }, [filtersActive, payload.observations, query]);

  const selected =
    visibleObservations.find((row) => row.id === selectedId) ?? visibleObservations[0] ?? null;

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
    let active = true;
    async function bootstrap() {
      setLoading(true);
      setNotice(null);
      try {
        const next = await loadDashboardData();
        if (!active) {
          return;
        }
        setPayload(next);
        setSelectedId((current) =>
          next.observations.some((row) => row.id === current)
            ? current
            : (next.observations[0]?.id ?? current),
        );
        if (next.source === "api") {
          const forecastPayload = await loadForecastResearch();
          if (active) {
            setForecast(forecastPayload);
          }
        } else {
          setForecast(null);
        }
      } catch (error) {
        if (active) {
          setNotice(error instanceof Error ? error.message : "Unable to load dashboard data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

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
      setNotice("No visible observation is selected for verification.");
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
      setPayload((current) => ({
        ...current,
        observations: current.observations.map((row) =>
          row.id === selected.id
            ? { ...row, verificationStatus: nextStatus, reviewerNotes: notes.trim() || defaults[status] }
            : row,
        ),
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Verification action failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleCreateExport = async (request: ExportRequest) => {
    setPendingAction("export");
    setNotice(null);
    try {
      const created = await createExportRequest(request);
      setPayload((current) => ({
        ...current,
        exports: [created, ...current.exports],
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Export request failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const retryExport = (record: ExportRecord) => {
    const retry: ExportRecord = {
      ...record,
      id: `EXP-RETRY-${Date.now()}`,
      name: `${record.name} retry`,
      status: "Processing",
      requested: new Date().toLocaleString(),
    };
    setPayload((current) => ({
      ...current,
      exports: [retry, ...current.exports],
      lastSyncedAt: new Date().toISOString(),
    }));
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
          role={role}
          onQueryChange={setQuery}
        />
        <PageHeading screen={screen} source={payload.source} />
        {screen !== "settings" ? (
          <FilterRail
            filtersActive={filtersActive}
            onFiltersActiveChange={setFiltersActive}
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
        {notice ? <StatusBanner tone="warning" title="Dashboard notice" body={notice} /> : null}
        {workbenchMessage ? (
          <StatusBanner tone="info" title="Workbench update" body={workbenchMessage} />
        ) : null}
        {screen === "overview" ? (
          <OverviewPage
            actions={actions}
            observations={visibleObservations}
            selected={selected}
            forecast={forecast}
            onSelect={setSelectedId}
          />
        ) : null}
        {screen === "verification" ? (
          <VerificationPage
            actions={actions}
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
            isPending={pendingAction === "export"}
            query={query}
            selected={selected}
            observations={visibleObservations}
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
            isPending={pendingAction === "export"}
            visibleRecordCount={visibleObservations.length}
            onCreateExport={handleCreateExport}
            onRetryExport={retryExport}
          />
        ) : null}
        {screen === "analyst" ? (
          <AnalystPage
            observations={visibleObservations}
            apiSource={payload.source}
            filtersActive={filtersActive}
          />
        ) : null}
        {screen === "settings" ? <SettingsPage role={role} onRoleChange={setRole} /> : null}
      </main>
    </div>
  );
}
