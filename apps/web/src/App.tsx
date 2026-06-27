import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Columns3,
  Database,
  Download,
  Eye,
  FileDown,
  Flag,
  Filter,
  Grid3X3,
  Leaf,
  ListPlus,
  Map,
  MessageSquareText,
  MoreHorizontal,
  NotebookPen,
  Send,
  Search,
  Settings,
  ShieldCheck,
  Table2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { createResearchExport, demoDashboardData, loadDashboardData, submitVerification } from './api';
import { type MapLayerState, ResearchMap } from './ResearchMap';
import type {
  DashboardData,
  ExportRecord,
  ExportRequest,
  Observation,
  SamplingCell,
  ScreenId,
  SignalLabel,
  UserRole,
  VerificationStatus,
} from './types';

const navItems: Array<{ id: ScreenId; label: string; icon: typeof Grid3X3; badge?: string }> = [
  { id: 'overview', label: 'Overview', icon: Grid3X3 },
  { id: 'verification', label: 'Verification Queue', icon: ShieldCheck, badge: '12' },
  { id: 'observations', label: 'Observations', icon: Table2 },
  { id: 'forecast', label: 'Forecast Map', icon: Map },
  { id: 'sampling', label: 'Sampling Gaps', icon: BarChart3 },
  { id: 'exports', label: 'Exports', icon: FileDown },
  { id: 'analyst', label: 'AI Analyst', icon: MessageSquareText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const screenTitles: Record<ScreenId, { title: string; subtitle: string }> = {
  overview: {
    title: 'Research overview',
    subtitle: 'Filtered operational view for Delaware River Basin, May 2025.',
  },
  verification: {
    title: 'Verification queue',
    subtitle: 'Review high-value verification candidates with evidence and uncertainty.',
  },
  observations: {
    title: 'Observations',
    subtitle: 'Search and compare structured ecological records.',
  },
  forecast: {
    title: 'Forecast map',
    subtitle: 'Potential spread corridors, verified records, and sampling context.',
  },
  sampling: {
    title: 'Sampling gaps',
    subtitle: 'Find weak, biased, or missing data before treating absence as absence.',
  },
  exports: {
    title: 'Export center',
    subtitle: 'Create privacy-aware CSV and GeoJSON research exports.',
  },
  analyst: {
    title: 'AI analyst',
    subtitle: 'Grounded research answers with cited sources and uncertainty.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage workspace defaults and research access preferences.',
  },
};

const storageKeys = {
  analystSaves: 'ecosentinel.web.analystSaves',
  flaggedRecords: 'ecosentinel.web.flaggedRecords',
  observationViews: 'ecosentinel.web.observationViews',
  role: 'ecosentinel.web.role',
  samplingPlanRecords: 'ecosentinel.web.samplingPlanRecords',
  selectedId: 'ecosentinel.web.selectedId',
  taskRecords: 'ecosentinel.web.taskRecords',
} as const;

interface ObservationWorkbenchActions {
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

function App() {
  const [screen, setScreen] = useState<ScreenId>(() => readScreenFromHash());
  const [dashboard, setDashboard] = useState<DashboardData>(() => demoDashboardData());
  const [selectedId, setSelectedId] = useState(() => readStringStorage(storageKeys.selectedId, dashboard.observations[0].id));
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(() => readRoleStorage());
  const [filtersActive, setFiltersActive] = useState(true);
  const [flaggedRecords, setFlaggedRecords] = useState(() => readStringArrayStorage(storageKeys.flaggedRecords, []));
  const [samplingPlanRecords, setSamplingPlanRecords] = useState(() => readStringArrayStorage(storageKeys.samplingPlanRecords, []));
  const [taskRecords, setTaskRecords] = useState(() => readStringArrayStorage(storageKeys.taskRecords, []));
  const [workbenchNotice, setWorkbenchNotice] = useState<string | null>(null);
  const filteredObservations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return dashboard.observations.filter((item) => {
      const matchesQuery =
        !needle ||
        [item.id, item.commonName, item.scientificName, item.location, item.signalLabel, item.verificationStatus]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesDemoFilters =
        !filtersActive ||
        (['Unverified', 'Needs more evidence'].includes(item.verificationStatus) &&
          ['High-value verification candidate', 'Priority ecological signal'].includes(item.signalLabel));
      return matchesQuery && matchesDemoFilters;
    });
  }, [dashboard.observations, filtersActive, query]);
  const selected = filteredObservations.find((item) => item.id === selectedId) ?? filteredObservations[0] ?? null;

  useEffect(() => {
    if (filteredObservations.length > 0 && !filteredObservations.some((item) => item.id === selectedId)) {
      setSelectedId(filteredObservations[0].id);
    }
  }, [filteredObservations, selectedId]);

  useEffect(() => {
    const onHashChange = () => setScreen(readScreenFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    writeStorage(storageKeys.role, role);
  }, [role]);

  useEffect(() => {
    writeStorage(storageKeys.selectedId, selectedId);
  }, [selectedId]);

  useEffect(() => {
    writeJsonStorage(storageKeys.flaggedRecords, flaggedRecords);
  }, [flaggedRecords]);

  useEffect(() => {
    writeJsonStorage(storageKeys.samplingPlanRecords, samplingPlanRecords);
  }, [samplingPlanRecords]);

  useEffect(() => {
    writeJsonStorage(storageKeys.taskRecords, taskRecords);
  }, [taskRecords]);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const nextDashboard = await loadDashboardData();
        if (!isMounted) {
          return;
        }
        setDashboard(nextDashboard);
        setSelectedId((current) =>
          nextDashboard.observations.some((item) => item.id === current)
            ? current
            : nextDashboard.observations[0]?.id ?? current,
        );
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load dashboard data.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const changeScreen = (nextScreen: ScreenId) => {
    setScreen(nextScreen);
    window.history.replaceState(null, '', `#${nextScreen}`);
  };

  const updateStringSet = (setter: Dispatch<SetStateAction<string[]>>, id: string, mode: 'add' | 'toggle') => {
    setter((current) => {
      const exists = current.includes(id);
      if (mode === 'toggle') {
        return exists ? current.filter((item) => item !== id) : [id, ...current];
      }
      return exists ? current : [id, ...current];
    });
  };

  const updateVerification = async (status: VerificationStatus, reviewerNote?: string) => {
    if (!selected) {
      setLoadError('No visible observation is selected for verification.');
      return;
    }

    const defaultNotesByStatus: Record<VerificationStatus, string> = {
      Unverified: '',
      'Needs more evidence': 'Reviewer requested sharper habitat and close-up media evidence.',
      'Expert verified': 'Confirmed from submitted media evidence and species context.',
      'Field confirmed': 'Field confirmation recorded by authorized reviewer.',
      Rejected: 'Rejected because the submitted evidence is insufficient for this possible species.',
    };
    const note = reviewerNote?.trim() || defaultNotesByStatus[status];

    setPendingAction(status);
    setLoadError(null);
    try {
      const nextStatus = await submitVerification({
        observationId: selected.id,
        status,
        notes: note,
        reviewerId: '00000000-0000-0000-0000-000000000000',
      });
      setDashboard((current) => ({
        ...current,
        observations: current.observations.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                verificationStatus: nextStatus,
                reviewerNotes: note,
              }
            : item,
        ),
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Verification action failed.');
    } finally {
      setPendingAction(null);
    }
  };

  const createExport = async (request: ExportRequest) => {
    setPendingAction('export');
    setLoadError(null);
    try {
      const nextExport = await createResearchExport(request);
      setDashboard((current) => ({
        ...current,
        exports: [nextExport, ...current.exports],
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Export request failed.');
    } finally {
      setPendingAction(null);
    }
  };

  const retryExport = (row: ExportRecord) => {
    const retryRecord: ExportRecord = {
      ...row,
      id: `EXP-RETRY-${Date.now()}`,
      name: `${row.name} retry`,
      status: 'Processing',
      requested: new Date().toLocaleString(),
    };

    setDashboard((current) => ({
      ...current,
      exports: [retryRecord, ...current.exports],
      lastSyncedAt: new Date().toISOString(),
    }));
  };

  const selectedWorkbenchActions: ObservationWorkbenchActions | undefined = selected
    ? {
        flagged: flaggedRecords.includes(selected.id),
        inSamplingPlan: samplingPlanRecords.includes(selected.id),
        hasTask: taskRecords.includes(selected.id),
        onAddToSamplingPlan: () => {
          updateStringSet(setSamplingPlanRecords, selected.id, 'add');
          setWorkbenchNotice(`${selected.commonName} added to the sampling plan worklist.`);
        },
        onCreateTask: () => {
          updateStringSet(setTaskRecords, selected.id, 'add');
          setWorkbenchNotice(`Follow-up task created for ${selected.commonName}.`);
        },
        onExportRecord: () => {
          downloadExportRecord({
            id: `SINGLE-${selected.id}`,
            name: `${selected.commonName} observation`,
            format: 'CSV',
            filters: 1,
            records: 1,
            status: 'Completed',
            requested: new Date().toLocaleString(),
          });
          setWorkbenchNotice(`${selected.commonName} single-record CSV downloaded with privacy notes.`);
        },
        onOpenVerification: () => {
          setSelectedId(selected.id);
          changeScreen('verification');
          setWorkbenchNotice(`${selected.commonName} opened in the verification queue.`);
        },
        onToggleFlag: () => {
          const wasFlagged = flaggedRecords.includes(selected.id);
          updateStringSet(setFlaggedRecords, selected.id, 'toggle');
          setWorkbenchNotice(`${selected.commonName} ${wasFlagged ? 'removed from' : 'added to'} flagged records.`);
        },
        onViewOnMap: () => {
          setSelectedId(selected.id);
          changeScreen('forecast');
          setWorkbenchNotice(`${selected.commonName} opened on the Forecast Map.`);
        },
      }
    : undefined;

  return (
    <div className="app-shell">
      <Sidebar active={screen} onChange={changeScreen} role={role} onRoleChange={setRole} syncSource={dashboard.source} />
      <main className="workspace">
        <TopBar
          pendingExports={dashboard.exports.filter((item) => item.status === 'Processing').length}
          pendingReviews={filteredObservations.filter((item) => item.verificationStatus !== 'Expert verified').length}
          query={query}
          role={role}
          onQueryChange={setQuery}
        />
        <PageHeader screen={screen} source={dashboard.source} />
        {screen !== 'settings' && (
          <FilterRail filtersActive={filtersActive} onFiltersActiveChange={setFiltersActive} screen={screen} />
        )}
        {isLoading && <StatusBanner tone="info" title="Loading research workspace" body="Fetching current research records and export history." />}
        {loadError && <StatusBanner tone="warning" title="Dashboard notice" body={loadError} />}
        {workbenchNotice && <StatusBanner tone="info" title="Workbench update" body={workbenchNotice} />}
        {screen === 'overview' && (
          <Overview actions={selectedWorkbenchActions} selected={selected} observations={filteredObservations} onSelect={setSelectedId} />
        )}
        {screen === 'verification' && (
          <VerificationQueue
            actions={selectedWorkbenchActions}
            pendingAction={pendingAction}
            role={role}
            selected={selected}
            observations={filteredObservations}
            onSelect={setSelectedId}
            onVerify={updateVerification}
          />
        )}
        {screen === 'observations' && (
          <Observations
            actions={selectedWorkbenchActions}
            isPending={pendingAction === 'export'}
            query={query}
            selected={selected}
            observations={filteredObservations}
            onCreateExport={createExport}
            onSelect={setSelectedId}
          />
        )}
        {screen === 'forecast' && (
          <ForecastMap actions={selectedWorkbenchActions} selected={selected} observations={filteredObservations} onSelect={setSelectedId} />
        )}
        {screen === 'sampling' && (
          <SamplingGaps cells={dashboard.samplingCells} observations={filteredObservations} selected={selected} onSelect={setSelectedId} />
        )}
        {screen === 'exports' && (
          <ExportCenter
            exports={dashboard.exports}
            isPending={pendingAction === 'export'}
            visibleRecordCount={filteredObservations.length}
            onCreateExport={createExport}
            onRetryExport={retryExport}
          />
        )}
        {screen === 'analyst' && <Analyst observations={filteredObservations} />}
        {screen === 'settings' && <SettingsScreen role={role} onRoleChange={setRole} />}
      </main>
    </div>
  );
}

function readScreenFromHash(): ScreenId {
  const value = window.location.hash.replace('#', '') as ScreenId;
  return navItems.some((item) => item.id === value) ? value : 'overview';
}

function readStringStorage(key: string, fallback: string) {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function readStringArrayStorage(key: string, fallback: string[]) {
  try {
    const value = window.localStorage.getItem(key);
    const parsed = value ? (JSON.parse(value) as unknown) : null;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function readRoleStorage(): UserRole {
  const value = readStringStorage(storageKeys.role, 'reviewer');
  return value === 'researcher' || value === 'reviewer' || value === 'admin' ? value : 'reviewer';
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local persistence is progressive enhancement for demo and development workflows.
  }
}

function writeJsonStorage(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is progressive enhancement for demo and development workflows.
  }
}

function Sidebar({
  active,
  onChange,
  onRoleChange,
  role,
  syncSource,
}: {
  active: ScreenId;
  onChange: (screen: ScreenId) => void;
  onRoleChange: (role: UserRole) => void;
  role: UserRole;
  syncSource: DashboardData['source'];
}) {
  const [showGuideHint, setShowGuideHint] = useState(false);
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
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={active === item.id ? 'nav-item active' : 'nav-item'}
              key={item.id}
              onClick={() => onChange(item.id)}
              type="button"
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
              {item.badge && <span className="count-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sync-row">
          <span className="status-dot" />
          <span>{syncSource === 'api' ? 'API data synced' : 'Demo data active'}</span>
        </div>
        <button className="plain-button" onClick={() => setShowGuideHint((current) => !current)} type="button">
          <CircleHelp size={16} aria-hidden="true" />
          Documentation
        </button>
        {showGuideHint && (
          <div className="sidebar-hint">
            Dashboard direction is tracked in <strong>Research_Dashboard_UI_Guide.md</strong>.
          </div>
        )}
        <div className="profile-row">
          <div className="avatar" aria-hidden="true" />
          <div>
            <strong>Dr. Alex Morgan</strong>
            <select aria-label="Research role" onChange={(event) => onRoleChange(event.target.value as UserRole)} value={role}>
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
  role: UserRole;
  onQueryChange: (value: string) => void;
}) {
  const [openUtility, setOpenUtility] = useState<'notifications' | 'menu' | null>(null);

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
          aria-expanded={openUtility === 'notifications'}
          aria-label="Notifications"
          className="icon-button"
          onClick={() => setOpenUtility((current) => (current === 'notifications' ? null : 'notifications'))}
          type="button"
        >
          <Bell size={19} />
          <span className="notification-dot" />
        </button>
        <button
          aria-expanded={openUtility === 'menu'}
          aria-label="Open app menu"
          className="icon-button"
          onClick={() => setOpenUtility((current) => (current === 'menu' ? null : 'menu'))}
          type="button"
        >
          <Grid3X3 size={18} />
        </button>
        {openUtility === 'notifications' && (
          <div className="utility-popover">
            <strong>Workspace notices</strong>
            <span>{pendingReviews} records need reviewer attention.</span>
            <span>{pendingExports} export request{pendingExports === 1 ? '' : 's'} processing.</span>
          </div>
        )}
        {openUtility === 'menu' && (
          <div className="utility-popover app-menu">
            <strong>Research session</strong>
            <span>Role: {role}</span>
            <span>Requester: local demo identity</span>
            <span>Backend: API when configured, deterministic fallback otherwise</span>
          </div>
        )}
      </div>
    </header>
  );
}

function PageHeader({ screen, source }: { screen: ScreenId; source: DashboardData['source'] }) {
  return (
    <section className="page-heading">
      <div>
        <h1>{screenTitles[screen].title}</h1>
        <p>{screenTitles[screen].subtitle}</p>
      </div>
      <div className="scope-pill">
        <Database size={16} aria-hidden="true" />
        {source === 'api' ? 'Research mode' : 'Demo fallback'}
      </div>
    </section>
  );
}

function StatusBanner({ tone, title, body }: { tone: 'info' | 'warning'; title: string; body: string }) {
  return (
    <section className={`status-banner ${tone}`} role={tone === 'warning' ? 'alert' : 'status'}>
      <strong>{title}</strong>
      <span>{body}</span>
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
  const [filtersVisible, setFiltersVisible] = useState(true);
  const scope = screen === 'forecast' ? 'Map' : screen === 'exports' ? 'Export' : screen === 'analyst' ? 'Analyst context' : 'Table';
  return (
    <section className="filter-rail" aria-label={`${scope} filters`}>
      <button className="filter-button" onClick={() => setFiltersVisible((current) => !current)} type="button">
        <Filter size={17} aria-hidden="true" />
        {scope} filters
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <span className="active-count">{filtersActive ? '5 filters active' : 'No filters active'}</span>
      {filtersVisible && (
        <div className="filter-chips" aria-label="Active filters">
          {filtersActive ? (
            <>
              <span>May 1-May 31, 2025</span>
              <span>Delaware River Basin</span>
              <span>Unverified + needs review</span>
              <span>High-value signals</span>
              <button onClick={() => onFiltersActiveChange(false)} type="button">Clear all</button>
            </>
          ) : (
            <button onClick={() => onFiltersActiveChange(true)} type="button">Restore demo filters</button>
          )}
        </div>
      )}
    </section>
  );
}

function Overview({
  actions,
  observations: rows,
  selected,
  onSelect,
}: {
  actions?: ObservationWorkbenchActions;
  observations: Observation[];
  selected: Observation | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overview-grid">
      <MetricGrid observations={rows} />
      <section className="panel map-panel">
        <PanelTitle title="Advanced forecast map" meta="Visible layers: records, potential corridors, sampling gaps" />
        {selected ? (
          <ResearchMap selected={selected} observations={rows} onSelect={onSelect} />
        ) : (
          <EmptyState title="No map records visible" body="Clear search or restore filters to show observations on the map." />
        )}
      </section>
      <section className="panel priority-panel">
        <PanelTitle title="Priority review stream" meta="12 assigned to you" />
        <RecordList rows={rows.slice(0, 5)} selectedId={selected?.id ?? ''} onSelect={onSelect} compact />
      </section>
      <section className="panel detail-wide">
        <PanelTitle title="Selected observation" meta={selected?.id ?? 'No visible record'} />
        {selected ? (
          <>
            <ObservationDetail selected={selected} />
            {actions && <ObservationActionBar actions={actions} compact />}
          </>
        ) : (
          <EmptyState title="No observation selected" body="The current search and filters do not match any observations." />
        )}
      </section>
      <section className="panel provenance-panel">
        <PanelTitle title="Provenance and data sources" meta="Current selected record" />
        <SourceList />
      </section>
    </div>
  );
}

function MetricGrid({ observations: rows }: { observations: Observation[] }) {
  const needsVerification = rows.filter((row) =>
    ['Unverified', 'Needs more evidence'].includes(row.verificationStatus),
  ).length;
  const prioritySignals = rows.filter((row) =>
    ['High-value verification candidate', 'Priority ecological signal'].includes(row.signalLabel),
  ).length;
  const underSampled = rows.filter((row) => row.samplingLabel.toLowerCase().includes('under-sampled')).length;
  const metrics = [
    ['Visible observations', rows.length.toLocaleString(), 'Current dashboard filters'],
    ['Needs verification', needsVerification.toLocaleString(), 'Visible pending records'],
    ['Priority ecological signals', prioritySignals.toLocaleString(), 'High-value or priority labels'],
    ['Under-sampled records', underSampled.toLocaleString(), 'Visible records with sampling gaps'],
  ];
  return (
    <section className="metrics-grid">
      {metrics.map(([label, value, meta]) => (
        <div className="metric" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{meta}</small>
        </div>
      ))}
    </section>
  );
}

function VerificationQueue({
  actions,
  observations: rows,
  selected,
  onSelect,
  onVerify,
  pendingAction,
  role,
}: {
  actions?: ObservationWorkbenchActions;
  observations: Observation[];
  selected: Observation | null;
  onSelect: (id: string) => void;
  onVerify: (status: VerificationStatus, reviewerNote?: string) => Promise<void>;
  pendingAction: string | null;
  role: UserRole;
}) {
  const canReview = role === 'reviewer' || role === 'admin';
  const [reviewerNote, setReviewerNote] = useState(selected?.reviewerNotes ?? '');
  const [requestedEvidence, setRequestedEvidence] = useState('Close-up media and habitat context');
  const noteIsReady = reviewerNote.trim().length >= 12;

  useEffect(() => {
    setReviewerNote(selected?.reviewerNotes ?? '');
    setRequestedEvidence('Close-up media and habitat context');
  }, [selected?.id, selected?.reviewerNotes]);

  const submitReview = (status: VerificationStatus) => {
    const evidencePrefix =
      status === 'Needs more evidence' ? `Requested evidence: ${requestedEvidence}. ` : '';
    void onVerify(status, `${evidencePrefix}${reviewerNote}`.trim());
  };

  return (
    <div className="queue-layout">
      <section className="panel queue-list">
        <PanelTitle title="Assigned queue" meta="Sorted by Ecological Signal Priority" />
        <RecordList rows={rows} selectedId={selected?.id ?? ''} onSelect={onSelect} />
      </section>
      <section className="panel review-surface">
        <PanelTitle title={selected ? `${selected.commonName} review` : 'No visible record'} meta={selected?.scientificName ?? 'Adjust filters'} />
        {selected ? (
          <>
            <ObservationDetail selected={selected} expanded />
            {actions && <ObservationActionBar actions={actions} mode="review" />}
          </>
        ) : (
          <EmptyState title="No record available for review" body="The current search and filters do not match the assigned queue." />
        )}
        {!canReview && (
          <div className="inline-notice">You need reviewer or admin access to verify observations.</div>
        )}
        {selected && <div className="review-support-grid">
          <section>
            <h3>Verification history</h3>
            <div className="history-line">
              <span className="status-dot" />
              <p>
                System queued this record for review because it is a {selected.signalLabel.toLowerCase()}.
              </p>
            </div>
            {selected.reviewerNotes && (
              <div className="history-line">
                <span className="status-dot" />
                <p>{selected.reviewerNotes}</p>
              </div>
            )}
          </section>
          <section>
            <h3>Reviewer notes</h3>
            <textarea
              aria-label="Reviewer notes"
              onChange={(event) => setReviewerNote(event.target.value)}
              placeholder="Add the evidence basis, uncertainty, or requested evidence before taking action."
              value={reviewerNote}
            />
            <label className="evidence-select">
              <span>Evidence request type</span>
              <select onChange={(event) => setRequestedEvidence(event.target.value)} value={requestedEvidence}>
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
        </div>}
        <div className="review-actions" aria-label="Verification actions">
          <button
            className="primary-action"
            disabled={!selected || !canReview || pendingAction !== null}
            onClick={() => submitReview('Expert verified')}
            type="button"
          >
            <Check size={18} aria-hidden="true" />
            {pendingAction === 'Expert verified' ? 'Saving...' : 'Expert verified'}
          </button>
          <button
            className="warn-action"
            disabled={!selected || !canReview || pendingAction !== null || !noteIsReady}
            onClick={() => submitReview('Needs more evidence')}
            type="button"
          >
            <TriangleAlert size={18} aria-hidden="true" />
            {pendingAction === 'Needs more evidence' ? 'Saving...' : 'Needs more evidence'}
          </button>
          <button
            className="danger-action"
            disabled={!selected || !canReview || pendingAction !== null || !noteIsReady}
            onClick={() => submitReview('Rejected')}
            type="button"
          >
            <X size={18} aria-hidden="true" />
            {pendingAction === 'Rejected' ? 'Saving...' : 'Reject with notes'}
          </button>
        </div>
      </section>
    </div>
  );
}

function Observations({
  actions,
  observations: rows,
  selected,
  isPending,
  query,
  onCreateExport,
  onSelect,
}: {
  actions?: ObservationWorkbenchActions;
  observations: Observation[];
  selected: Observation | null;
  isPending: boolean;
  query: string;
  onCreateExport: (request: ExportRequest) => Promise<void>;
  onSelect: (id: string) => void;
}) {
  const [showSourceColumn, setShowSourceColumn] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [savedViews, setSavedViews] = useState(() => readStringArrayStorage(storageKeys.observationViews, [
    'Priority verification queue',
    'Delaware Basin export set',
  ]));
  const [activeView, setActiveView] = useState(savedViews[0]);

  useEffect(() => {
    writeJsonStorage(storageKeys.observationViews, savedViews);
  }, [savedViews]);

  const saveCurrentView = () => {
    const nextView = query.trim() ? `Search: ${query.trim()}` : `Visible records view ${savedViews.length + 1}`;
    setSavedViews((current) => (current.includes(nextView) ? current : [nextView, ...current]));
    setActiveView(nextView);
    setLocalNotice(`${nextView} saved with filters, columns, sort, and selected record.`);
  };

  const exportVisibleRows = async () => {
    setLocalNotice(null);
    await onCreateExport({
      format: 'CSV',
      filters: {
        source: 'observations_table',
        visible_records: rows.length,
        region_code: 'Delaware River Basin',
      },
      includeMediaUrls: true,
      includeEnvironmentalContext: true,
      includeSignalScores: true,
      includeVerification: true,
    });
    setLocalNotice('CSV export request created from the current observations table view.');
  };

  return (
    <div className="table-layout">
      <section className="panel table-panel">
        <div className="table-toolbar">
          <span>
            {rows.length} records visible · {activeView}{showSourceColumn ? ' · source column shown' : ''}
          </span>
          <div>
            <button className="plain-button" onClick={saveCurrentView} type="button">
              <Check size={16} aria-hidden="true" />
              Save view
            </button>
            <button className="plain-button" onClick={() => setShowSourceColumn((current) => !current)} type="button">
              <Columns3 size={16} aria-hidden="true" />
              {showSourceColumn ? 'Hide source' : 'Show source'}
            </button>
            <button className="plain-button" disabled={isPending || rows.length === 0} onClick={() => void exportVisibleRows()} type="button">
              <Download size={16} aria-hidden="true" />
              {isPending ? 'Requesting...' : 'Export view'}
            </button>
          </div>
        </div>
        <div className="saved-view-row" aria-label="Saved views">
          {savedViews.map((view) => (
            <button className={activeView === view ? 'saved-view active' : 'saved-view'} key={view} onClick={() => setActiveView(view)} type="button">
              {view}
            </button>
          ))}
        </div>
        {localNotice && <div className="inline-success">{localNotice}</div>}
        {rows.length === 0 ? (
          <EmptyState title="No observations match these filters" body="Adjust search or remove a filter to bring records back into view." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Observation ID</th>
                <th>Possible species</th>
                <th>Confidence</th>
                <th>Verification</th>
                <th>Ecological Signal Priority</th>
                <th>Region</th>
                {showSourceColumn && <th>Source</th>}
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className={row.id === selected?.id ? 'selected-row' : ''} key={row.id} onClick={() => onSelect(row.id)}>
                  <td>{row.id}</td>
                  <td>
                    <strong>{row.commonName}</strong>
                    <span>{row.scientificName}</span>
                  </td>
                  <td>{row.confidence}%</td>
                  <td>
                    <StatusBadge status={row.verificationStatus} />
                  </td>
                  <td>
                    <SignalBadge label={row.signalLabel} />
                  </td>
                  <td>{row.region}</td>
                  {showSourceColumn && <td>{row.source}</td>}
                  <td>{row.submittedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <aside className="panel detail-drawer">
        <PanelTitle title="Record detail" meta={selected?.id ?? 'No visible record'} />
        {selected ? (
          <>
            <ObservationDetail selected={selected} />
            {actions && <ObservationActionBar actions={actions} />}
          </>
        ) : (
          <EmptyState title="No record selected" body="Search and filter results are empty." />
        )}
      </aside>
    </div>
  );
}

function ForecastMap({
  actions,
  selected,
  observations: rows,
  onSelect,
}: {
  actions?: ObservationWorkbenchActions;
  selected: Observation | null;
  observations: Observation[];
  onSelect: (id: string) => void;
}) {
  const [layers, setLayers] = useState<MapLayerState>({
    verifiedRecords: true,
    unverifiedRecords: true,
    corridors: true,
    samplingGaps: true,
    waterways: true,
    roadsAndTrails: true,
  });
  const controls: Array<[keyof MapLayerState, string]> = [
    ['verifiedRecords', 'Verified records'],
    ['unverifiedRecords', 'Unverified records'],
    ['corridors', 'Potential spread corridors'],
    ['samplingGaps', 'Sampling gaps'],
    ['waterways', 'Waterways'],
    ['roadsAndTrails', 'Roads and trails'],
  ];

  return (
    <div className="map-workspace">
      <section className="map-stage">
        <div className="map-control-panel">
          <PanelTitle title="Layers" meta="Visible layer controls" />
          {controls.map(([key, label]) => (
              <label className="toggle-row" key={key}>
                <span>{label}</span>
                <input
                  checked={layers[key] ?? false}
                  onChange={(event) => setLayers((current) => ({ ...current, [key]: event.target.checked }))}
                  type="checkbox"
                />
              </label>
          ))}
        </div>
        {selected ? (
          <ResearchMap selected={selected} observations={rows} layers={layers} onSelect={onSelect} large />
        ) : (
          <EmptyState title="No map records visible" body="Clear search or restore filters to show research map records." />
        )}
      </section>
      <aside className="panel selected-map-record">
        <PanelTitle
          title="Selected record"
          meta={selected ? (selected.privacy === 'obscured' ? 'Obscured coordinates' : 'Public coordinates') : 'No visible record'}
        />
        {selected ? (
          <>
            <ObservationDetail selected={selected} />
            {actions && <ObservationActionBar actions={actions} mode="map" />}
          </>
        ) : (
          <EmptyState title="No record selected" body="The current map filters do not match any observations." />
        )}
      </aside>
    </div>
  );
}

function SamplingGaps({
  cells,
  observations,
  selected,
  onSelect,
}: {
  cells: SamplingCell[];
  observations: Observation[];
  selected: Observation | null;
  onSelect: (id: string) => void;
}) {
  const samplingLayers: MapLayerState = {
    verifiedRecords: false,
    unverifiedRecords: true,
    corridors: false,
    samplingGaps: true,
  };

  return (
    <div className="sampling-layout">
      <section className="panel sampling-map">
        <PanelTitle title="Sampling gap map" meta="Region: Delaware River Basin, grid: 5 km" />
        {selected ? (
          <ResearchMap
            selected={selected}
            observations={observations}
            layers={samplingLayers}
            samplingFocus
            onSelect={onSelect}
            large
          />
        ) : (
          <EmptyState title="No sampling records visible" body="Sampling gaps still exist, but no observations match the active table context." />
        )}
      </section>
      <aside className="panel">
        <PanelTitle title="Analysis summary" meta="No observations does not mean true absence" />
        <GapSummary />
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

function ExportCenter({
  exports,
  isPending,
  visibleRecordCount,
  onCreateExport,
  onRetryExport,
}: {
  exports: ExportRecord[];
  isPending: boolean;
  visibleRecordCount: number;
  onCreateExport: (request: ExportRequest) => Promise<void>;
  onRetryExport: (row: ExportRecord) => void;
}) {
  const [format, setFormat] = useState<ExportRequest['format']>('CSV');
  const [fields, setFields] = useState({
    environmentalContext: true,
    mediaUrls: true,
    signalScores: true,
    verificationFields: true,
  });
  const includedFieldCount =
    12 +
    (fields.mediaUrls ? 2 : 0) +
    (fields.environmentalContext ? 6 : 0) +
    (fields.signalScores ? 4 : 0) +
    (fields.verificationFields ? 6 : 0);
  const estimatedSizeMb = format === 'GeoJSON' ? (includedFieldCount / 30) * 3.6 : (includedFieldCount / 30) * 1.8;
  const fieldRows: Array<[keyof typeof fields, string]> = [
    ['mediaUrls', 'Media URLs'],
    ['environmentalContext', 'Environmental context'],
    ['signalScores', 'Signal scores'],
    ['verificationFields', 'Verification fields'],
  ];

  return (
    <div className="export-layout">
      <section className="panel">
        <PanelTitle title="Configure export" meta="Step 1 of 2" />
        <div className="format-grid">
          <button
            className={format === 'CSV' ? 'format-option selected' : 'format-option'}
            onClick={() => setFormat('CSV')}
            type="button"
          >
            <FileDown size={24} aria-hidden="true" />
            <strong>CSV</strong>
            <span>Tabular records for analysis in spreadsheets and statistical software.</span>
          </button>
          <button
            className={format === 'GeoJSON' ? 'format-option selected' : 'format-option'}
            onClick={() => setFormat('GeoJSON')}
            type="button"
          >
            <Map size={24} aria-hidden="true" />
            <strong>GeoJSON</strong>
            <span>Geospatial records for GIS workflows and map layers.</span>
          </button>
        </div>
        <div className="field-list">
          {fieldRows.map(([key, label]) => (
            <label className="toggle-row" key={key}>
              <span>{label}</span>
              <input
                checked={fields[key]}
                onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.checked }))}
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
        <PanelTitle title="Review and create" meta="Previewing up to 100 records" />
        <div className="preview-numbers">
          <div>
            <span>Records</span>
            <strong>{visibleRecordCount.toLocaleString()}</strong>
          </div>
          <div>
            <span>Species</span>
            <strong>42</strong>
          </div>
          <div>
            <span>Fields</span>
            <strong>{includedFieldCount}</strong>
          </div>
        </div>
        <div className="export-field-summary">
          <span>Estimated file size</span>
          <strong>~ {estimatedSizeMb.toFixed(1)} MB</strong>
        </div>
        <div className="notice">
          Sensitive or obscured records are generalized according to export permissions. Private records require admin access.
        </div>
        <button
          className="primary-action full-width"
          disabled={isPending}
          onClick={() =>
            void onCreateExport({
              format,
              filters: {
                region_code: 'Delaware River Basin',
                date_range: 'May 1-May 31, 2025',
                visible_records: visibleRecordCount,
                signal_label: 'high_value_verification_candidate',
              },
              includeMediaUrls: fields.mediaUrls,
              includeEnvironmentalContext: fields.environmentalContext,
              includeSignalScores: fields.signalScores,
              includeVerification: fields.verificationFields,
            })
          }
          type="button"
        >
          <Download size={18} aria-hidden="true" />
          {isPending ? 'Creating export...' : `Create ${format} export`}
        </button>
      </aside>
      <section className="panel export-history">
        <PanelTitle title="Export history" meta="Downloads expire after 7 days" />
        <ExportHistory rows={exports} onRetryExport={onRetryExport} />
      </section>
    </div>
  );
}

function Analyst({ observations }: { observations: Observation[] }) {
  const defaultQuestion = 'What are the key emerging ecological signals in the Delaware River Basin this month?';
  const [draftQuestion, setDraftQuestion] = useState('');
  const [activeQuestion, setActiveQuestion] = useState(defaultQuestion);
  const [savedAnalyses, setSavedAnalyses] = useState<string[]>(() =>
    readStringArrayStorage(storageKeys.analystSaves, ['May priority signal summary']),
  );

  const answer = useMemo(() => buildAnalystAnswer(activeQuestion, observations), [activeQuestion, observations]);
  useEffect(() => {
    writeJsonStorage(storageKeys.analystSaves, savedAnalyses);
  }, [savedAnalyses]);
  const askQuestion = () => {
    const nextQuestion = draftQuestion.trim();
    if (!nextQuestion) {
      return;
    }
    setActiveQuestion(nextQuestion);
    setDraftQuestion('');
  };
  const saveAnalysis = () => {
    const label = activeQuestion.length > 48 ? `${activeQuestion.slice(0, 45)}...` : activeQuestion;
    setSavedAnalyses((current) => (current.includes(label) ? current : [label, ...current]));
  };

  return (
    <div className="analyst-layout">
      <section className="panel analyst-chat">
        <PanelTitle title="Question" meta="Verified context, model EcoSentinel-1.3" />
        <div className="question-card">
          {activeQuestion}
        </div>
        <label className="ask-box">
          <span>Ask a research question</span>
          <textarea
            onChange={(event) => setDraftQuestion(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                askQuestion();
              }
            }}
            placeholder="Ask about signals, sampling gaps, verification status, or exportable records..."
            value={draftQuestion}
          />
        </label>
        <div className="analyst-actions">
          <button className="primary-action" disabled={!draftQuestion.trim()} onClick={askQuestion} type="button">
            <Send size={16} aria-hidden="true" />
            Ask analyst
          </button>
          <button className="plain-button" onClick={saveAnalysis} type="button">
            <Check size={16} aria-hidden="true" />
            Save analysis
          </button>
        </div>
        <div className="saved-analyses">
          <h3>Saved analyses</h3>
          {savedAnalyses.map((analysis) => (
            <button key={analysis} onClick={() => setActiveQuestion(analysis)} type="button">
              {analysis}
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
          <span>Filtered observations</span>
          <span>Checked verification status</span>
          <span>Compared sampling context</span>
          <span>Summarized uncertainty factors</span>
        </div>
      </section>
      <aside className="panel">
        <PanelTitle title="Cited data sources" meta="Current answer" />
        <SourceList />
      </aside>
    </div>
  );
}

function SettingsScreen({ role, onRoleChange }: { role: UserRole; onRoleChange: (role: UserRole) => void }) {
  return (
    <div className="settings-layout">
      <section className="panel settings-panel">
        <PanelTitle title="Workspace settings" meta="Research defaults" />
        <div className="settings-grid">
          <SettingRow label="Default region" value="Delaware River Basin" />
          <SettingRow label="Default map payload" value="Research mode" />
          <div className="setting-row">
            <span>Verification role</span>
            <select aria-label="Settings verification role" onChange={(event) => onRoleChange(event.target.value as UserRole)} value={role}>
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

function RecordList({
  rows,
  selectedId,
  onSelect,
  compact = false,
}: {
  rows: Observation[];
  selectedId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'record-list compact' : 'record-list'}>
      {rows.length === 0 && (
        <EmptyState title="No records in this queue" body="The current search and filters do not match any observations." />
      )}
      {rows.map((row, index) => (
        <button className={row.id === selectedId ? 'record-row active' : 'record-row'} key={row.id} onClick={() => onSelect(row.id)} type="button">
          <VisualTile index={index} label={row.commonName} />
          <span>
            <strong>{row.commonName}</strong>
            <small>{row.scientificName}</small>
            <small>{row.location} · {row.confidence}% confidence</small>
          </span>
          <SignalBadge label={row.signalLabel} />
        </button>
      ))}
    </div>
  );
}

function ObservationDetail({ selected, expanded = false }: { selected: Observation; expanded?: boolean }) {
  return (
    <div className={expanded ? 'observation-detail expanded' : 'observation-detail'}>
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
            <dd>{selected.privacy}, ±{selected.coordinateUncertaintyM} m</dd>
          </div>
        </dl>
      </div>
      <div className="detail-grid">
        <InfoGroup
          title="Habitat answers"
          rows={[
            ['Habitat', selected.habitat],
            ['Distance to water', `${selected.distanceToWaterM} m`],
            ['Sampling label', selected.samplingLabel],
          ]}
        />
        <InfoGroup
          title="Context sources"
          rows={[
            ['Observation source', selected.source],
            ['Land cover', 'NLCD, forest edge'],
            ['Nearby records', '12 verified, 7 unverified'],
          ]}
        />
        {expanded && (
          <InfoGroup
            title="Required review integrity"
            rows={[
              ['Expert verified', 'Requires selected species'],
              ['Needs more evidence', 'Requires requested evidence type'],
              ['Reject', 'Requires reviewer notes'],
            ]}
          />
        )}
      </div>
    </div>
  );
}

function ObservationActionBar({
  actions,
  compact = false,
  mode = 'default',
}: {
  actions: ObservationWorkbenchActions;
  compact?: boolean;
  mode?: 'default' | 'map' | 'review';
}) {
  const primaryNavigation =
    mode === 'map'
      ? {
          label: 'Open in queue',
          icon: ShieldCheck,
          onClick: actions.onOpenVerification,
        }
      : {
          label: mode === 'review' ? 'View on map' : 'View on map',
          icon: Map,
          onClick: actions.onViewOnMap,
        };
  const secondaryNavigation =
    mode === 'review'
      ? null
      : {
          label: 'Open in queue',
          icon: ShieldCheck,
          onClick: actions.onOpenVerification,
        };
  const PrimaryIcon = primaryNavigation.icon;
  const SecondaryIcon = secondaryNavigation?.icon;

  return (
    <div className={compact ? 'observation-actions compact' : 'observation-actions'} aria-label="Selected observation actions">
      <button className="plain-button" onClick={primaryNavigation.onClick} type="button">
        <PrimaryIcon size={16} aria-hidden="true" />
        {primaryNavigation.label}
      </button>
      {secondaryNavigation && SecondaryIcon && !compact && (
        <button className="plain-button" onClick={secondaryNavigation.onClick} type="button">
          <SecondaryIcon size={16} aria-hidden="true" />
          {secondaryNavigation.label}
        </button>
      )}
      <button className={actions.flagged ? 'plain-button active-command' : 'plain-button'} onClick={actions.onToggleFlag} type="button">
        <Flag size={16} aria-hidden="true" />
        {actions.flagged ? 'Flagged' : 'Flag'}
      </button>
      <button
        className={actions.inSamplingPlan ? 'plain-button active-command' : 'plain-button'}
        onClick={actions.onAddToSamplingPlan}
        type="button"
      >
        <ListPlus size={16} aria-hidden="true" />
        {actions.inSamplingPlan ? 'In sampling plan' : 'Add to sampling plan'}
      </button>
      {!compact && (
        <button className={actions.hasTask ? 'plain-button active-command' : 'plain-button'} onClick={actions.onCreateTask} type="button">
          <NotebookPen size={16} aria-hidden="true" />
          {actions.hasTask ? 'Task created' : 'Create follow-up task'}
        </button>
      )}
      <button className="plain-button" onClick={actions.onExportRecord} type="button">
        <Download size={16} aria-hidden="true" />
        Export record
      </button>
    </div>
  );
}

function PanelTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      {meta && <span>{meta}</span>}
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

function StatusBadge({ status }: { status: VerificationStatus }) {
  return <span className={`badge status ${statusSlug(status)}`}>{status}</span>;
}

function SignalBadge({ label }: { label: SignalLabel }) {
  return <span className={`badge signal ${statusSlug(label)}`}>{label}</span>;
}

function statusSlug(value: string) {
  return value.toLowerCase().replaceAll(' ', '-');
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

function SourceList() {
  const sources = [
    ['iNaturalist', 'Community observation'],
    ['GBIF', 'Historical occurrence context'],
    ['USGS 3DHP', 'Hydrology layer'],
    ['NLCD', 'Land cover and canopy'],
  ];
  return (
    <div className="source-list">
      {sources.map(([name, role]) => (
        <div key={name}>
          <span>{name}</span>
          <small>{role}</small>
        </div>
      ))}
    </div>
  );
}

function buildAnalystAnswer(question: string, observations: Observation[]) {
  const normalized = question.toLowerCase();
  const pendingCount = observations.filter((item) => item.verificationStatus !== 'Expert verified').length;
  const underSampledCount = observations.filter((item) => item.samplingLabel.toLowerCase().includes('under-sampled')).length;
  const priorityRecords = observations.filter((item) =>
    ['High-value verification candidate', 'Priority ecological signal'].includes(item.signalLabel),
  );
  const topRecord = priorityRecords[0] ?? observations[0];

  if (observations.length === 0) {
    return {
      summary:
        'Insufficient evidence. The current filters do not return observations, so EcoSentinel cannot summarize ecological signals from this dashboard context.',
      findings: [
        { title: 'Insufficient evidence', text: 'No visible records are available under the current filters.' },
        { title: 'Next step', text: 'Clear filters or expand the date range before interpreting absence.' },
      ],
      confidence: 18,
      confidenceLabel: 'Low confidence',
      uncertainty: 'Uncertainty is high because the visible dataset is empty.',
    };
  }

  if (normalized.includes('export')) {
    return {
      summary:
        `The current context has ${observations.length} visible records, including ${priorityRecords.length} high-value or priority signal records. CSV is best for tabular review, while GeoJSON is best for GIS workflows and map layers.`,
      findings: [
        { title: 'Export readiness', text: `${pendingCount} records still need verification before final research use.` },
        { title: 'Privacy handling', text: 'Obscured records should remain generalized unless an admin grants private export access.' },
        { title: 'Recommended format', text: 'Use GeoJSON when corridor or sampling-gap context must travel with the record set.' },
      ],
      confidence: 84,
      confidenceLabel: 'High confidence, with export caveats',
      uncertainty: 'Export confidence depends on verification status and location privacy permissions.',
    };
  }

  if (normalized.includes('sampling') || normalized.includes('absence')) {
    return {
      summary:
        `Sampling context is uneven. ${underSampledCount} visible records are associated with under-sampled areas, so absence should not be treated as true absence without checking effort and bias.`,
      findings: [
        { title: 'Sampling gap signal', text: 'High-risk under-sampled cells should be prioritized for structured surveys.' },
        { title: 'Bias warning', text: 'Road/trail-biased records can overrepresent accessible habitats.' },
        { title: 'Interpretation rule', text: 'Use insufficient evidence language when sampling effort is low.' },
      ],
      confidence: 79,
      confidenceLabel: 'Moderate confidence',
      uncertainty: 'Uncertainty comes from uneven sampling effort and unverified visible records.',
    };
  }

  return {
    summary:
      `In May 2025, the Delaware River Basin shows several notable ecological signals. ${topRecord.commonName} is the top visible possible species by Ecological Signal Priority, while ${pendingCount} records still need verification before stronger claims are appropriate.`,
    findings: [
      {
        title: topRecord.commonName,
        text: `Current visible context marks this as a ${topRecord.signalLabel.toLowerCase()} with ${topRecord.confidence}% identity confidence.`,
      },
      { title: 'Verification need', text: `${pendingCount} visible records remain unverified or need more evidence.` },
      {
        title: 'Sampling uncertainty',
        text: `${underSampledCount} visible records have under-sampled context, so absence should not be treated as true absence.`,
      },
    ],
    confidence: 82,
    confidenceLabel: 'High confidence, with caveats',
    uncertainty: 'Uncertainty comes from under-sampled zones, early-season variability, and unverified records.',
  };
}

function GapSummary() {
  const rows = [
    ['Under-sampled zones', '612 cells'],
    ['Road/trail-biased areas', '384 cells'],
    ['Park/protected-area biased', '429 cells'],
    ['Likely false absence areas', '563 cells'],
    ['High-risk under-sampled', '221 cells'],
  ];
  return (
    <div className="gap-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <div className="notice">No observations does not mean true absence. Verify sampling effort before concluding absence.</div>
    </div>
  );
}

function ExportHistory({
  rows,
  onRetryExport,
}: {
  rows: ExportRecord[];
  onRetryExport: (row: ExportRecord) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);

  const handleAction = (row: ExportRecord) => {
    if (row.status === 'Completed') {
      downloadExportRecord(row);
      setMessage(`${row.name} is ready for download. Privacy rules remain applied.`);
      return;
    }

    if (row.status === 'Failed') {
      onRetryExport(row);
      setMessage(`${row.name} retry queued with the same filters.`);
      return;
    }

    setMessage(`${row.name} is ${row.status.toLowerCase()}; downloads unlock when processing completes.`);
  };

  return (
    <>
      {message && <div className="inline-success">{message}</div>}
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
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.format}</td>
              <td>{row.filters}</td>
              <td>{row.records.toLocaleString()}</td>
              <td>
                <span className={`badge status ${row.status.toLowerCase()}`}>{row.status}</span>
              </td>
              <td>{row.requested}</td>
              <td>
                <button className="plain-button compact-action" onClick={() => handleAction(row)} type="button">
                  {row.status === 'Completed' ? <Download size={16} /> : <MoreHorizontal size={16} />}
                  {row.status === 'Failed' ? 'Retry' : row.status === 'Completed' ? 'Download' : 'Details'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function downloadExportRecord(row: ExportRecord) {
  const safeName = row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const extension = row.format === 'GeoJSON' ? 'geojson' : 'csv';
  const mimeType = row.format === 'GeoJSON' ? 'application/geo+json' : 'text/csv';
  const content =
    row.format === 'GeoJSON'
      ? JSON.stringify(
          {
            type: 'FeatureCollection',
            name: row.name,
            metadata: {
              exportId: row.id,
              filters: row.filters,
              records: row.records,
              requested: row.requested,
              privacy: 'Sensitive and obscured records remain generalized.',
            },
            features: [],
          },
          null,
          2,
        )
      : [
          'export_id,export_name,format,filters,records,status,requested,privacy_note',
          `${row.id},"${row.name.replaceAll('"', '""')}",${row.format},${row.filters},${row.records},${row.status},"${row.requested}","Sensitive and obscured records remain generalized."`,
        ].join('\n');
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function VisualTile({ index, label }: { index: number; label: string }) {
  return <span aria-label={label} className={`visual-tile tile-${index % 6}`} role="img" />;
}

function VisualHero({ label }: { label: string }) {
  return (
    <div aria-label={`${label} evidence image`} className="visual-hero" role="img">
      <Eye size={18} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function Finding({ title, text }: { title: string; text: string }) {
  return (
    <div className="finding">
      <Check size={17} aria-hidden="true" />
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

export default App;
