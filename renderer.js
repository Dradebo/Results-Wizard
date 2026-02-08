const state = {
  pdfs: [],
  output: null,
  orgUnits: null,
  workbookPath: null,
  preview: {},
  sheetNames: [],
  records: [],
  customCharts: [],
  customiseMode: false,
  savedJobs: [],
  currentJobId: null
};

const steps = document.querySelectorAll(".step");
const panels = document.querySelectorAll(".panel");
const pdfList = document.getElementById("pdf-list");
const outputPath = document.getElementById("output-path");
const statusEl = document.getElementById("status");
const sheetSelect = document.getElementById("sheet-select");
const previewTable = document.getElementById("preview-table");
const workbookPathEl = document.getElementById("workbook-path");
const mappingTable = document.getElementById("mapping-table");
const summaryEl = document.getElementById("summary");
const automatchStatus = document.getElementById("automatch-status");
const mappingCount = document.getElementById("mapping-count");
const rememberSessionToggle = document.getElementById("remember-session");
const clearSessionBtn = document.getElementById("clear-session");
const sessionStatus = document.getElementById("session-status");
const savedJobSelect = document.getElementById("saved-job-select");
const savedJobName = document.getElementById("saved-job-name");
const loadJobBtn = document.getElementById("load-job");
const saveCurrentJobBtn = document.getElementById("save-current-job");
const saveNewJobBtn = document.getElementById("save-new-job");
const deleteJobBtn = document.getElementById("delete-job");
const exportDashboardBtn = document.getElementById("export-dashboard");
const exportDivisionBtn = document.getElementById("export-division");
const exportSubjectBtn = document.getElementById("export-subject");
const exportSchoolBtn = document.getElementById("export-school");
const exportExploreBtn = document.getElementById("export-explore");
const exportGapBtn = document.getElementById("export-gap");
const exportParityBtn = document.getElementById("export-parity");
const exportHeatmapBtn = document.getElementById("export-heatmap");
const exportScatterBtn = document.getElementById("export-scatter");
const customiseToggle = document.getElementById("toggle-customise");
const dashboardSection = document.getElementById("dashboard");
const dashboardKpis = document.getElementById("dashboard-kpis");
const successDefinition = document.getElementById("success-definition");
const includeX = document.getElementById("include-x");
const divisionView = document.getElementById("division-view");
const divisionChart = document.getElementById("division-chart");
const divisionLegend = document.getElementById("division-legend");
const subjectChart = document.getElementById("subject-chart");
const subjectLegend = document.getElementById("subject-legend");
const subjectNote = document.getElementById("subject-note");
const schoolChart = document.getElementById("school-chart");
const gapChart = document.getElementById("gap-chart");
const gapLegend = document.getElementById("gap-legend");
const gapNote = document.getElementById("gap-note");
const parityChart = document.getElementById("parity-chart");
const parityLegend = document.getElementById("parity-legend");
const heatmapTable = document.getElementById("heatmap-table");
const heatmapLegend = document.getElementById("heatmap-legend");
const heatmapNote = document.getElementById("heatmap-note");
const scatterChart = document.getElementById("scatter-chart");
const scatterLegend = document.getElementById("scatter-legend");
const scatterNote = document.getElementById("scatter-note");
const scatterX = document.getElementById("scatter-x");
const scatterY = document.getElementById("scatter-y");
const scatterSex = document.getElementById("scatter-sex");
const scatterGroup = document.getElementById("scatter-group");
const customBuilder = document.getElementById("custom-builder");
const customType = document.getElementById("custom-type");
const customMetric = document.getElementById("custom-metric");
const customCategory = document.getElementById("custom-category");
const customSeries = document.getElementById("custom-series");
const customView = document.getElementById("custom-view");
const customIncludeX = document.getElementById("custom-include-x");
const customSubject = document.getElementById("custom-subject");
const customYear = document.getElementById("custom-year");
const customSex = document.getElementById("custom-sex");
const customDistrict = document.getElementById("custom-district");
const customParish = document.getElementById("custom-parish");
const customSchool = document.getElementById("custom-school");
const customLimit = document.getElementById("custom-limit");
const customSortBy = document.getElementById("custom-sort-by");
const customSortDir = document.getElementById("custom-sort-dir");
const customShowTable = document.getElementById("custom-show-table");
const customTitle = document.getElementById("custom-title");
const customMode = document.getElementById("custom-mode");
const customAdd = document.getElementById("custom-add");
const customReset = document.getElementById("custom-reset");
const customHint = document.getElementById("custom-hint");
const customCharts = document.getElementById("custom-charts");
const filterYear = document.getElementById("filter-year");
const filterSchool = document.getElementById("filter-school");
const schoolList = document.getElementById("school-list");
const filterSex = document.getElementById("filter-sex");
const exploreMetric = document.getElementById("explore-metric");
const exploreSubject = document.getElementById("explore-subject");
const exploreSubjectWrap = document.getElementById("explore-subject-wrap");
const exploreView = document.getElementById("explore-view");
const exploreBreakdown = document.getElementById("explore-breakdown");
const exploreLimit = document.getElementById("explore-limit");
const exploreReset = document.getElementById("explore-reset");
const exploreChart = document.getElementById("explore-chart");
const exploreLegend = document.getElementById("explore-legend");
const exploreNote = document.getElementById("explore-note");
let automatchResult = { matched: [], unmatched: [] };
let selectedAncestor = null;
let hierarchyLevels = [];
let hierarchyPool = [];
let workbookSchools = [];
let confirmedMappings = [];
let orgunitLoadingToken = 0;
let lastExportPath = "";
let pendingExport = null;
let drillPath = [];
const drillOptionsByIndex = new Map();
const tipBank = [
  "Start with the parent org unit to limit your search area.",
  "Always confirm district and parish before applying IDs.",
  "Pick the target org unit level before mapping.",
  "Use the dropdown to resolve schools with similar names.",
  "Export only after reviewing all checked matches."
];
let tipIndex = 0;

function setStep(step) {
  steps.forEach((btn) => btn.classList.toggle("active", btn.dataset.step === step));
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === step));
}

function setCustomiseMode(enabled) {
  state.customiseMode = Boolean(enabled);
  if (customiseToggle) {
    customiseToggle.setAttribute("aria-pressed", state.customiseMode ? "true" : "false");
    customiseToggle.classList.toggle("active", state.customiseMode);
  }
  if (customBuilder) {
    customBuilder.classList.toggle("customise-focus", state.customiseMode);
  }
}

steps.forEach((btn) => {
  btn.addEventListener("click", () => setStep(btn.dataset.step));
});

function renderFileList(el, files, emptyLabel) {
  if (!files || files.length === 0) {
    el.textContent = emptyLabel;
    el.classList.add("empty");
    return;
  }
  el.classList.remove("empty");
  el.innerHTML = files.map((file) => `<div>${file}</div>`).join("");
}

function setSinglePath(el, path, emptyLabel) {
  if (!path) {
    el.textContent = emptyLabel;
    el.classList.add("empty");
    return;
  }
  el.classList.remove("empty");
  el.textContent = path;
}

function setStatus(message, tone = "info") {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function setSessionStatus(message, tone = "info") {
  if (!sessionStatus) return;
  sessionStatus.textContent = message;
  sessionStatus.dataset.tone = tone;
}

function formatJobTimestamp(isoValue) {
  if (!isoValue) return "";
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString();
}

function getSavedJobNameInput() {
  return (savedJobName?.value || "").trim();
}

function updateSavedJobsUI() {
  if (!savedJobSelect) return;
  const selected = state.currentJobId || savedJobSelect.value || "";
  savedJobSelect.innerHTML = "";
  if (!state.savedJobs.length) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "No saved jobs";
    savedJobSelect.appendChild(emptyOption);
    savedJobSelect.disabled = true;
    if (savedJobName) savedJobName.value = "";
    if (loadJobBtn) loadJobBtn.disabled = true;
    if (saveCurrentJobBtn) saveCurrentJobBtn.disabled = true;
    if (deleteJobBtn) deleteJobBtn.disabled = true;
    return;
  }

  state.savedJobs.forEach((job) => {
    const option = document.createElement("option");
    option.value = job.id;
    const updated = formatJobTimestamp(job.updatedAt);
    option.textContent = updated ? `${job.name} · ${updated}` : job.name;
    savedJobSelect.appendChild(option);
  });

  const jobIds = state.savedJobs.map((job) => job.id);
  savedJobSelect.value = jobIds.includes(selected) ? selected : jobIds[0];
  state.currentJobId = savedJobSelect.value;
  savedJobSelect.disabled = false;

  const activeJob = state.savedJobs.find((job) => job.id === state.currentJobId) || null;
  if (savedJobName) savedJobName.value = activeJob?.name || "";
  if (loadJobBtn) loadJobBtn.disabled = false;
  if (saveCurrentJobBtn) saveCurrentJobBtn.disabled = false;
  if (deleteJobBtn) deleteJobBtn.disabled = false;
}

function syncJobsFromResult(result) {
  if (!result) return;
  if (Array.isArray(result.jobs)) {
    state.savedJobs = result.jobs;
  }
  if (result.currentJobId !== undefined) {
    state.currentJobId = result.currentJobId || null;
  }
  if (result.job && result.job.id) {
    state.currentJobId = result.job.id;
    const exists = state.savedJobs.some((item) => item.id === result.job.id);
    if (!exists) {
      state.savedJobs = [result.job, ...state.savedJobs];
    }
  }
  updateSavedJobsUI();
}

function buildSessionPayload() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    keepSession: rememberSessionToggle ? rememberSessionToggle.checked : false,
    pdfs: state.pdfs,
    output: state.output,
    orgUnits: state.orgUnits,
    workbookPath: state.workbookPath,
    records: state.records,
    customCharts: state.customCharts
  };
}

let sessionSaveTimer = null;
function scheduleSessionSave() {
  if (!rememberSessionToggle || !rememberSessionToggle.checked) return;
  if (!window.api.saveDashboardJob) {
    if (!window.api.saveDashboardSession) return;
  }
  if (sessionSaveTimer) clearTimeout(sessionSaveTimer);
  sessionSaveTimer = setTimeout(async () => {
    const payload = buildSessionPayload();
    const result = window.api.saveDashboardJob
      ? await window.api.saveDashboardJob({
        session: payload,
        jobId: state.currentJobId,
        name: getSavedJobNameInput(),
        createNew: !state.currentJobId
      })
      : await window.api.saveDashboardSession(payload);
    if (result && result.ok) {
      syncJobsFromResult(result);
      setSessionStatus(`Saved ${new Date().toLocaleTimeString()}.`, "info");
    }
  }, 600);
}

async function clearSavedSession() {
  if (!window.api.clearDashboardSession) return;
  const result = await window.api.clearDashboardSession();
  if (result && result.ok) {
    state.savedJobs = [];
    state.currentJobId = null;
    updateSavedJobsUI();
    setSessionStatus("Saved jobs cleared.", "info");
  }
}

function formatDhis2Error(error) {
  const message = String(error || "");
  if (message.includes("DHIS2 error 401") || message.includes("DHIS2 error 403")) {
    return "Authentication failed. Check the DHIS2 URL and credentials.";
  }
  return message;
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function renderPreview(sheetName) {
  const rows = state.preview[sheetName] || [];
  previewTable.innerHTML = "";

  if (rows.length === 0) {
    previewTable.innerHTML = "<tr><td>No data.</td></tr>";
    return;
  }

  const [header, ...body] = rows;
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  header.forEach((cell) => {
    const th = document.createElement("th");
    th.textContent = formatHeader(cell);
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  body.forEach((row) => {
    const tr = document.createElement("tr");
    header.forEach((_, idx) => {
      const td = document.createElement("td");
      td.textContent = row[idx] ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  previewTable.appendChild(thead);
  previewTable.appendChild(tbody);
}

function formatHeader(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  if (["eng", "sci", "sst", "math", "div", "sex", "aggr"].includes(lower)) {
    return lower.toUpperCase();
  }
  if (/^\d+[fmux]$/i.test(text)) {
    return text.toLowerCase();
  }
  if (/^\d+\([fmux]\)$/i.test(text)) {
    return text.toUpperCase();
  }
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SUBJECT_LABELS = {
  eng: "English",
  sci: "Science",
  sst: "Social Studies",
  math: "Mathematics"
};

const DIV_ORDER = ["1", "2", "3", "4", "U", "X", "Unknown"];

const COLORS = {
  female: "#1f77b4",
  male: "#ff7f0e",
  unknown: "#9aa0a6",
  accent: "#003f5c",
  accentSoft: "#58508d"
};

const DIV_COLORS = {
  "1": "#003f5c",
  "2": "#58508d",
  "3": "#bc5090",
  "4": "#ff6361",
  "U": "#ffa600",
  "X": "#ffd166",
  "Unknown": "#c0c0c0"
};

const BUCKET_COLORS = {
  distinction: "#003f5c",
  credit: "#58508d",
  pass: "#bdbdbd",
  fail: "#ffa600",
  missing: "#e0e0e0"
};

const CUSTOM_PALETTE = [
  "#003f5c",
  "#58508d",
  "#bc5090",
  "#ff6361",
  "#ffa600",
  "#2f7f5f",
  "#7f7f7f",
  "#4d6cfa"
];

const numberFormatter = new Intl.NumberFormat();
const percentFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  const compact = str.replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(compact)) return Number(compact);
  const matched = compact.match(/-?\d+(\.\d+)?/);
  if (!matched) return null;
  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value) {
  return String(value || "").trim();
}

function normalizeRecord(row) {
  const sex = toText(row.sex ?? row.SEX).toUpperCase();
  const divRaw = toText(row.div ?? row.DIV).toUpperCase();
  return {
    year: toText(row.year ?? row.Year1 ?? row.Year),
    schoolName: toText(row.school_name ?? row["sch name"]),
    schoolId: toText(row.school_id ?? row["sch id"] ?? row.school_uneb),
    district: toText(row.district ?? row.District),
    parish: toText(row.parish_name ?? row.parish ?? row.Parish),
    parishId: toText(row.parish_id ?? row.Parish_ID),
    learnerName: toText(row.learner_name ?? row.NAME),
    indexNo: toText(row.index_no ?? row.Index_No),
    sex: sex === "F" || sex === "M" ? sex : "U",
    div: DIV_ORDER.includes(divRaw) ? divRaw : divRaw || "Unknown",
    eng: toNumber(row.eng ?? row.ENG),
    sci: toNumber(row.sci ?? row.SCI),
    sst: toNumber(row.sst ?? row.SST),
    math: toNumber(row.math ?? row.MATH),
    aggr: toNumber(row.aggr ?? row.AGGR)
  };
}

function mean(values) {
  if (!values.length) return null;
  const total = values.reduce((sum, val) => sum + val, 0);
  return total / values.length;
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return numberFormatter.format(value);
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${percentFormatter.format(value)}%`;
}

function getDivisionCounts(records) {
  const counts = {};
  DIV_ORDER.forEach((div) => { counts[div] = 0; });
  records.forEach((row) => {
    const div = DIV_ORDER.includes(row.div) ? row.div : "Unknown";
    if (!counts[div]) counts[div] = 0;
    counts[div] += 1;
  });
  return counts;
}

function getRateDenominator(records, includeAbsentees) {
  return records.filter((row) => {
    if (!row.div || row.div === "Unknown") return false;
    if (!includeAbsentees && row.div === "X") return false;
    return true;
  }).length;
}

function getSuccessDivisions(definition) {
  return definition === "strict" ? ["1", "2"] : ["1", "2", "3", "4"];
}

function isValidSubjectScore(value) {
  return Number.isFinite(value) && value >= 1 && value <= 9;
}

function buildSubjectCoverage(records) {
  const coverage = {};
  Object.keys(SUBJECT_LABELS).forEach((subjectKey) => {
    let valid = 0;
    records.forEach((row) => {
      if (isValidSubjectScore(row[subjectKey])) valid += 1;
    });
    const total = records.length;
    coverage[subjectKey] = {
      valid,
      total,
      missing: Math.max(0, total - valid),
      pct: total ? (valid / total) * 100 : 0
    };
  });
  return coverage;
}

function hasAnySubjectCoverage(coverage) {
  return Object.values(coverage || {}).some((item) => (item?.valid || 0) > 0);
}

function formatCoverageSnippet(coverage, subjectKeys = Object.keys(SUBJECT_LABELS)) {
  return subjectKeys
    .filter((key) => coverage[key])
    .map((key) => `${SUBJECT_LABELS[key]} ${formatPercent(coverage[key].pct)}`)
    .join(" | ");
}

function setChartNote(noteEl, message = "", tone = "") {
  if (!noteEl) return;
  noteEl.textContent = message;
  noteEl.classList.remove("warning", "success");
  if (tone) noteEl.classList.add(tone);
}

const DEFAULT_CUSTOM_DIMENSIONS = [
  { value: "division", label: "Division" },
  { value: "subject", label: "Subject" },
  { value: "school", label: "School" },
  { value: "parish", label: "Parish" },
  { value: "district", label: "District" },
  { value: "year", label: "Year" },
  { value: "sex", label: "Sex" }
];

function bucketScore(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "missing";
  if (value <= 2) return "distinction";
  if (value <= 6) return "credit";
  if (value <= 8) return "pass";
  return "fail";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60) || "export";
}

function timestampLabel() {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

async function exportElementAsPng(element, baseName) {
  if (!element) return;
  if (!window.html2canvas) return;
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const canvas = await window.html2canvas(element, {
    backgroundColor: null,
    scale,
    useCORS: true,
    ignoreElements: (el) => el?.classList?.contains("export-ignore")
  });
  const dataUrl = canvas.toDataURL("image/png");
  const result = await window.api.saveDashboardExport({
    defaultPath: `${slugify(baseName)}-${timestampLabel()}.png`,
    dataUrl
  });
  if (!result || result.canceled) return;
}

function enableDashboardExports(enabled) {
  [exportDashboardBtn, exportDivisionBtn, exportSubjectBtn, exportSchoolBtn, exportExploreBtn, exportGapBtn, exportHeatmapBtn, exportScatterBtn, exportParityBtn]
    .forEach((btn) => {
      if (btn) btn.disabled = !enabled;
    });
}

function hexToRgb(hex) {
  const cleaned = String(hex || "").replace("#", "");
  if (cleaned.length !== 6) return { r: 0, g: 0, b: 0 };
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function colorWithAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  const safeAlpha = Math.min(0.9, Math.max(0.12, alpha));
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

function renderChartEmpty(container, message) {
  if (!container) return;
  container.innerHTML = "";
  const div = document.createElement("div");
  div.className = "chart-empty";
  div.textContent = message;
  container.appendChild(div);
}

function renderLegend(container, items) {
  if (!container) return;
  container.innerHTML = "";
  items.forEach((item) => {
    const span = document.createElement("span");
    span.className = "legend-item";
    span.innerHTML = `<span class="legend-swatch" style="background:${item.color}"></span>${item.label}`;
    container.appendChild(span);
  });
}

function renderStackedBars(container, rows, options = {}) {
  if (!container) return;
  container.innerHTML = "";
  if (!rows.length) {
    renderChartEmpty(container, options.empty || "No data available for this view.");
    return;
  }
  const maxTotal = Math.max(...rows.map((row) => row.total));
  rows.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "chart-row";
    const label = document.createElement("div");
    label.className = "chart-label";
    label.textContent = row.label;
    const track = document.createElement("div");
    track.className = "chart-track";
    row.segments.forEach((segment) => {
      const seg = document.createElement("div");
      seg.className = "chart-segment";
      const width = maxTotal ? (segment.value / maxTotal) * 100 : 0;
      seg.style.width = `${Math.max(0, width)}%`;
      seg.style.background = segment.color;
      seg.title = `${segment.label}: ${formatNumber(segment.value)}`;
      track.appendChild(seg);
    });
    const value = document.createElement("div");
    value.className = "chart-value";
    value.textContent = options.valueFormatter ? options.valueFormatter(row.total) : formatNumber(row.total);
    rowEl.appendChild(label);
    rowEl.appendChild(track);
    rowEl.appendChild(value);
    container.appendChild(rowEl);
  });
}

function renderBars(container, rows, options = {}) {
  if (!container) return;
  container.innerHTML = "";
  if (!rows.length) {
    renderChartEmpty(container, options.empty || "No data available for this view.");
    return;
  }
  const max = Math.max(...rows.map((row) => row.value));
  rows.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "chart-row";
    const label = document.createElement("div");
    label.className = "chart-label";
    label.textContent = row.label;
    const track = document.createElement("div");
    track.className = "chart-track";
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    const barColor = row.color || options.color;
    if (barColor) bar.style.background = barColor;
    const width = max ? (row.value / max) * 100 : 0;
    bar.style.width = `${Math.max(0, width)}%`;
    bar.title = row.tooltip || `${row.label}: ${row.value}`;
    track.appendChild(bar);
    const value = document.createElement("div");
    value.className = "chart-value";
    const displayValue = row.displayValue ?? (options.valueFormatter ? options.valueFormatter(row.value) : formatNumber(row.value));
    value.textContent = displayValue;
    rowEl.appendChild(label);
    rowEl.appendChild(track);
    rowEl.appendChild(value);
    container.appendChild(rowEl);
  });
}

function renderDistributionBars(container, rows, options = {}) {
  if (!container) return;
  container.innerHTML = "";
  if (!rows.length) {
    renderChartEmpty(container, options.empty || "No data available for this view.");
    return;
  }
  rows.forEach((row) => {
    const total = row.total || 0;
    const rowEl = document.createElement("div");
    rowEl.className = "chart-row";
    const label = document.createElement("div");
    label.className = "chart-label";
    label.textContent = row.label;
    const track = document.createElement("div");
    track.className = "chart-track";
    row.segments.forEach((segment) => {
      const seg = document.createElement("div");
      seg.className = "chart-segment";
      const width = total ? (segment.value / total) * 100 : 0;
      seg.style.width = `${Math.max(0, width)}%`;
      seg.style.background = segment.color;
      seg.title = `${segment.label}: ${formatNumber(segment.value)}`;
      track.appendChild(seg);
    });
    if (row.dividerAt !== null && row.dividerAt !== undefined) {
      const divider = document.createElement("div");
      divider.className = "chart-divider";
      divider.style.left = `${Math.min(100, Math.max(0, row.dividerAt))}%`;
      track.appendChild(divider);
    }
    const value = document.createElement("div");
    value.className = "chart-value";
    value.textContent = options.valueFormatter ? options.valueFormatter(total) : formatNumber(total);
    rowEl.appendChild(label);
    rowEl.appendChild(track);
    rowEl.appendChild(value);
    container.appendChild(rowEl);
  });
}

function renderDonutChart(container, rows, options = {}) {
  if (!container) return;
  container.innerHTML = "";
  const finiteRows = rows.filter((row) => Number.isFinite(row.value) && row.value > 0);
  if (!finiteRows.length) {
    renderChartEmpty(container, options.empty || "No data available for this view.");
    return;
  }
  const total = finiteRows.reduce((sum, row) => sum + row.value, 0);
  if (!total) {
    renderChartEmpty(container, options.empty || "No data available for this view.");
    return;
  }

  let cursor = 0;
  const segments = finiteRows.map((row, index) => {
    const color = row.color || CUSTOM_PALETTE[index % CUSTOM_PALETTE.length];
    const pct = (row.value / total) * 100;
    const start = cursor;
    const end = cursor + pct;
    cursor = end;
    return `${color} ${start}% ${end}%`;
  });

  const wrap = document.createElement("div");
  wrap.className = "custom-donut-wrap";
  const ring = document.createElement("div");
  ring.className = "custom-donut-ring";
  ring.style.background = `conic-gradient(${segments.join(", ")})`;
  const hole = document.createElement("div");
  hole.className = "custom-donut-hole";
  hole.textContent = options.totalLabel || formatNumber(total);
  ring.appendChild(hole);
  wrap.appendChild(ring);
  container.appendChild(wrap);

  const legend = document.createElement("div");
  legend.className = "chart-legend";
  finiteRows.forEach((row, index) => {
    const item = document.createElement("span");
    item.className = "legend-item";
    const color = row.color || CUSTOM_PALETTE[index % CUSTOM_PALETTE.length];
    const valueLabel = row.displayValue ?? (options.valueFormatter ? options.valueFormatter(row.value) : formatNumber(row.value));
    item.innerHTML = `<span class="legend-swatch" style="background:${color}"></span>${row.label} (${valueLabel})`;
    legend.appendChild(item);
  });
  container.appendChild(legend);
}

function renderDumbbell(container, rows, options = {}) {
  if (!container) return;
  container.innerHTML = "";
  if (!rows.length) {
    renderChartEmpty(container, options.empty || "No data available for this view.");
    return;
  }
  rows.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "dumbbell-row";
    const label = document.createElement("div");
    label.className = "chart-label";
    label.textContent = row.label;
    const track = document.createElement("div");
    track.className = "dumbbell-track";
    const line = document.createElement("div");
    line.className = "dumbbell-line";
    const dotF = document.createElement("div");
    dotF.className = "dumbbell-dot female";
    dotF.style.left = `${Math.min(100, Math.max(0, row.female))}%`;
    dotF.title = `Female: ${formatPercent(row.female)}`;
    const dotM = document.createElement("div");
    dotM.className = "dumbbell-dot male";
    dotM.style.left = `${Math.min(100, Math.max(0, row.male))}%`;
    dotM.title = `Male: ${formatPercent(row.male)}`;
    track.appendChild(line);
    track.appendChild(dotF);
    track.appendChild(dotM);
    const value = document.createElement("div");
    value.className = "dumbbell-value";
    value.textContent = `${formatPercent(row.female)} / ${formatPercent(row.male)}`;
    rowEl.appendChild(label);
    rowEl.appendChild(track);
    rowEl.appendChild(value);
    container.appendChild(rowEl);
  });
}

function buildDivisionStats(records) {
  const stats = {};
  DIV_ORDER.forEach((div) => { stats[div] = { total: 0, F: 0, M: 0, U: 0 }; });
  records.forEach((row) => {
    const div = DIV_ORDER.includes(row.div) ? row.div : "Unknown";
    if (!stats[div]) stats[div] = { total: 0, F: 0, M: 0, U: 0 };
    stats[div].total += 1;
    stats[div][row.sex] = (stats[div][row.sex] || 0) + 1;
  });
  return stats;
}

function buildSubjectBuckets(records, subject) {
  const counts = {
    distinction: 0,
    credit: 0,
    pass: 0,
    fail: 0,
    missing: 0
  };
  records.forEach((row) => {
    const score = isValidSubjectScore(row[subject]) ? row[subject] : null;
    const bucket = bucketScore(score);
    counts[bucket] += 1;
  });
  return counts;
}

function buildDistinctionGap(records) {
  return Object.keys(SUBJECT_LABELS).map((subject) => {
    const femaleScores = records.filter((row) => row.sex === "F" && isValidSubjectScore(row[subject]));
    const maleScores = records.filter((row) => row.sex === "M" && isValidSubjectScore(row[subject]));
    const femaleDistinctions = femaleScores.filter((row) => row[subject] <= 2).length;
    const maleDistinctions = maleScores.filter((row) => row[subject] <= 2).length;
    const femaleRate = femaleScores.length ? (femaleDistinctions / femaleScores.length) * 100 : 0;
    const maleRate = maleScores.length ? (maleDistinctions / maleScores.length) * 100 : 0;
    return {
      subject,
      female: femaleRate,
      male: maleRate,
      femaleValid: femaleScores.length,
      maleValid: maleScores.length
    };
  });
}

function buildSchoolStats(records) {
  const bySchool = new Map();
  records.forEach((row) => {
    const key = row.schoolName || "Unknown school";
    if (!bySchool.has(key)) {
      bySchool.set(key, { name: key, total: 0, aggr: [], div12: 0 });
    }
    const entry = bySchool.get(key);
    entry.total += 1;
    if (row.aggr !== null) entry.aggr.push(row.aggr);
    if (row.div === "1" || row.div === "2") entry.div12 += 1;
  });
  const stats = [];
  bySchool.forEach((entry) => {
    stats.push({
      name: entry.name,
      total: entry.total,
      avgAggr: mean(entry.aggr),
      div12Pct: entry.total ? (entry.div12 / entry.total) * 100 : 0
    });
  });
  return stats;
}

function renderDashboardKpis(records) {
  if (!dashboardKpis) return;
  dashboardKpis.innerHTML = "";
  if (!records.length) {
    renderChartEmpty(dashboardKpis, "No learner records available.");
    return;
  }
  const totalLearners = records.length;
  const definition = successDefinition?.value || "standard";
  const includeAbsentees = includeX?.value === "include";
  const denominator = getRateDenominator(records, includeAbsentees);
  const successDivs = getSuccessDivisions(definition);
  const successCount = records.filter((row) => successDivs.includes(row.div)).length;
  const topCount = records.filter((row) => row.div === "1").length;
  const atRiskCount = records.filter((row) => row.div === "U" || (includeAbsentees && row.div === "X")).length;
  const successRate = denominator ? (successCount / denominator) * 100 : null;
  const topRate = denominator ? (topCount / denominator) * 100 : null;
  const atRiskRate = denominator ? (atRiskCount / denominator) * 100 : null;

  const cards = [
    { label: "Success Rate", value: successRate === null ? "—" : formatPercent(successRate), donut: successRate ? successRate / 100 : 0, color: DIV_COLORS["1"], note: definition === "strict" ? "Div 1-2" : "Div 1-4" },
    { label: "Top Performers", value: topRate === null ? "—" : formatPercent(topRate), donut: topRate ? topRate / 100 : 0, color: DIV_COLORS["2"], note: "Div 1" },
    { label: "At-Risk", value: atRiskRate === null ? "—" : formatPercent(atRiskRate), donut: atRiskRate ? atRiskRate / 100 : 0, color: DIV_COLORS["U"], note: includeAbsentees ? "U + X" : "U only" },
    { label: "Enrollment", value: formatNumber(totalLearners), donut: null, color: COLORS.accentSoft, note: "Total candidates" }
  ];
  cards.forEach((item) => {
    const div = document.createElement("div");
    div.className = "kpi-card";
    const donut = item.donut === null
      ? ""
      : `<div class="kpi-donut" style="--kpi-value:${item.donut};--kpi-color:${item.color}"></div>`;
    div.innerHTML = `
      ${donut}
      <div class="kpi-meta">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
        <small>${item.note || ""}</small>
      </div>
    `;
    dashboardKpis.appendChild(div);
  });
}

function renderDivisionChart(records) {
  if (!divisionChart) return;
  const counts = getDivisionCounts(records);
  const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
  const view = divisionView?.value || "percent";
  const rows = DIV_ORDER.map((div) => {
    const value = counts[div] || 0;
    if (!value) return null;
    const label = div === "U" ? "U (Ungraded)" : div === "X" ? "X (Missing)" : div === "Unknown" ? "Unknown" : `Div ${div}`;
    return {
      label,
      value: view === "percent" ? (total ? (value / total) * 100 : 0) : value,
      displayValue: view === "percent" ? formatPercent(total ? (value / total) * 100 : 0) : formatNumber(value),
      color: DIV_COLORS[div] || DIV_COLORS.Unknown
    };
  }).filter(Boolean);
  renderBars(divisionChart, rows, {
    empty: "No division data available.",
    valueFormatter: view === "percent" ? formatPercent : formatNumber
  });
  renderLegend(divisionLegend, DIV_ORDER.filter((div) => counts[div]).map((div) => ({
    label: div === "U" ? "U" : div === "X" ? "X" : div === "Unknown" ? "Unknown" : `Div ${div}`,
    color: DIV_COLORS[div] || DIV_COLORS.Unknown
  })));
}

function renderSubjectChart(records) {
  if (!subjectChart) return;
  const coverage = buildSubjectCoverage(records);
  const hasCoverage = hasAnySubjectCoverage(coverage);
  if (!hasCoverage) {
    renderChartEmpty(subjectChart, "No numeric subject scores were parsed from this dataset.");
    renderLegend(subjectLegend, [
      { label: "Distinction (1-2)", color: BUCKET_COLORS.distinction },
      { label: "Credit (3-6)", color: BUCKET_COLORS.credit },
      { label: "Pass (7-8)", color: BUCKET_COLORS.pass },
      { label: "Fail (9)", color: BUCKET_COLORS.fail },
      { label: "Missing/X", color: BUCKET_COLORS.missing }
    ]);
    setChartNote(subjectNote, "Subject fields are unavailable. Re-run conversion with a standard UNEB score table.", "warning");
    return;
  }
  const rows = Object.entries(SUBJECT_LABELS).map(([key, label]) => {
    const buckets = buildSubjectBuckets(records, key);
    const total = Object.values(buckets).reduce((sum, val) => sum + val, 0);
    const positive = buckets.distinction + buckets.credit;
    return {
      label,
      total,
      dividerAt: total ? (positive / total) * 100 : 0,
      segments: [
        { label: "Distinction (1-2)", value: buckets.distinction, color: BUCKET_COLORS.distinction },
        { label: "Credit (3-6)", value: buckets.credit, color: BUCKET_COLORS.credit },
        { label: "Pass (7-8)", value: buckets.pass, color: BUCKET_COLORS.pass },
        { label: "Fail (9)", value: buckets.fail, color: BUCKET_COLORS.fail },
        { label: "Missing/X", value: buckets.missing, color: BUCKET_COLORS.missing }
      ]
    };
  });
  renderDistributionBars(subjectChart, rows, { empty: "No subject scores available." });
  renderLegend(subjectLegend, [
    { label: "Distinction (1-2)", color: BUCKET_COLORS.distinction },
    { label: "Credit (3-6)", color: BUCKET_COLORS.credit },
    { label: "Pass (7-8)", color: BUCKET_COLORS.pass },
    { label: "Fail (9)", color: BUCKET_COLORS.fail },
    { label: "Missing/X", color: BUCKET_COLORS.missing }
  ]);
  setChartNote(subjectNote, `Coverage (valid grades 1-9): ${formatCoverageSnippet(coverage)}.`, "success");
}

function renderSchoolChart(records, limit = 8) {
  if (!schoolChart) return;
  const stats = buildSchoolStats(records)
    .filter((row) => row.total > 0)
    .sort((a, b) => b.div12Pct - a.div12Pct)
    .slice(0, limit);
  const rows = stats.map((row) => ({
    label: row.name,
    value: row.div12Pct,
    displayValue: `${formatPercent(row.div12Pct)} · Avg ${row.avgAggr === null ? "—" : row.avgAggr.toFixed(1)}`,
    tooltip: `${row.name}: ${formatPercent(row.div12Pct)} Div 1-2 (${formatNumber(row.total)} learners), Avg aggr ${row.avgAggr === null ? "—" : row.avgAggr.toFixed(1)} (lower is better)`
  }));
  renderBars(schoolChart, rows, { empty: "No school-level data available.", valueFormatter: formatPercent });
}

function renderHeatmap(records) {
  if (!heatmapTable) return;
  heatmapTable.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "chart-empty";
    cell.textContent = "No school data available.";
    row.appendChild(cell);
    heatmapTable.appendChild(row);
    return;
  }
  const definition = successDefinition?.value || "standard";
  const includeAbsentees = includeX?.value === "include";
  const successDivs = getSuccessDivisions(definition);
  const schoolMap = new Map();
  records.forEach((row) => {
    const key = row.schoolName || "Unknown school";
    if (!schoolMap.has(key)) {
      schoolMap.set(key, { name: key, counts: {}, total: 0 });
    }
    const entry = schoolMap.get(key);
    const div = DIV_ORDER.includes(row.div) ? row.div : "Unknown";
    entry.counts[div] = (entry.counts[div] || 0) + 1;
    entry.total += 1;
  });

  const rows = [];
  schoolMap.forEach((entry) => {
    const counts = entry.counts;
    const totalAll = entry.total;
    const xCount = counts.X || 0;
    const totalAcademic = Math.max(0, totalAll - xCount);
    const denomAcademic = includeAbsentees ? totalAll : totalAcademic;
    const successCount = successDivs.reduce((sum, div) => sum + (counts[div] || 0), 0);
    const successRate = denomAcademic ? (successCount / denomAcademic) * 100 : 0;
    const percents = {};
    DIV_ORDER.forEach((div) => {
      const denom = includeAbsentees ? totalAll : div === "X" ? totalAll : totalAcademic;
      percents[div] = denom ? ((counts[div] || 0) / denom) * 100 : 0;
    });
    rows.push({
      name: entry.name,
      counts,
      percents,
      successRate,
      totalAll,
      totalAcademic
    });
  });

  rows.sort((a, b) => {
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    return b.totalAll - a.totalAll;
  });

  const maxByDiv = {};
  DIV_ORDER.forEach((div) => {
    maxByDiv[div] = Math.max(...rows.map((row) => row.percents[div] || 0), 1);
  });

  const header = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["School", "Div 1", "Div 2", "Div 3", "Div 4", "U", "X", "Success"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  });
  header.appendChild(headerRow);

  const body = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const schoolCell = document.createElement("td");
    schoolCell.textContent = row.name;
    tr.appendChild(schoolCell);
    const divisions = ["1", "2", "3", "4", "U", "X"];
    divisions.forEach((div) => {
      const td = document.createElement("td");
      td.className = "heatmap-cell";
      const percent = row.percents[div] || 0;
      const intensity = percent / (maxByDiv[div] || 1);
      td.style.background = colorWithAlpha(DIV_COLORS[div] || DIV_COLORS.Unknown, 0.15 + intensity * 0.7);
      td.textContent = `${percentFormatter.format(percent)}%`;
      td.title = `${row.name} · Div ${div}: ${formatNumber(row.counts[div] || 0)} learners`;
      tr.appendChild(td);
    });
    const successTd = document.createElement("td");
    successTd.className = "heatmap-cell";
    successTd.style.background = colorWithAlpha(COLORS.accent, 0.15 + (row.successRate / 100) * 0.7);
    successTd.textContent = `${percentFormatter.format(row.successRate)}%`;
    successTd.title = `Success (${definition === "strict" ? "Div 1-2" : "Div 1-4"}): ${formatNumber(row.totalAcademic)} academic learners`;
    tr.appendChild(successTd);
    body.appendChild(tr);
  });

  heatmapTable.appendChild(header);
  heatmapTable.appendChild(body);

  if (heatmapLegend) {
    renderLegend(heatmapLegend, [
      { label: "Div 1", color: DIV_COLORS["1"] },
      { label: "Div 2", color: DIV_COLORS["2"] },
      { label: "Div 3", color: DIV_COLORS["3"] },
      { label: "Div 4", color: DIV_COLORS["4"] },
      { label: "U", color: DIV_COLORS["U"] },
      { label: "X", color: DIV_COLORS["X"] }
    ]);
  }
  if (heatmapNote) {
    heatmapNote.textContent = includeAbsentees
      ? "Percentages include absentees (X) in the denominator."
      : "Divisions exclude X from denominators; X uses total enrollment.";
  }
}

function renderScatter(records) {
  if (!scatterChart) return;
  scatterChart.innerHTML = "";
  if (!records.length) {
    renderChartEmpty(scatterChart, "No data available for scatter plot.");
    setChartNote(scatterNote, "Load dashboard data first to view correlation.", "warning");
    return;
  }
  const xKey = scatterX?.value || "eng";
  const yKey = scatterY?.value || "sci";
  const sex = scatterSex?.value || "all";
  const groupLevel = scatterGroup?.value || "school";

  const filtered = records.filter((row) => {
    if (sex !== "all" && row.sex !== sex) return false;
    return true;
  });
  const validX = filtered.filter((row) => isValidSubjectScore(row[xKey])).length;
  const validY = filtered.filter((row) => isValidSubjectScore(row[yKey])).length;
  if (!validX || !validY) {
    renderChartEmpty(scatterChart, "No valid subject scores available for the selected axes.");
    if (scatterLegend) scatterLegend.textContent = "";
    setChartNote(
      scatterNote,
      `Coverage is too low for ${SUBJECT_LABELS[xKey]} or ${SUBJECT_LABELS[yKey]}. Choose another subject or re-run parsing.`,
      "warning"
    );
    return;
  }

  const groupMap = new Map();
  filtered.forEach((row) => {
    let key = row.schoolName || "Unknown";
    if (groupLevel === "district") key = row.district || "Unknown district";
    if (groupLevel === "parish") key = row.parish || "Unknown parish";
    if (!groupMap.has(key)) {
      groupMap.set(key, { name: key, valuesX: [], valuesY: [], count: 0 });
    }
    const entry = groupMap.get(key);
    if (isValidSubjectScore(row[xKey])) entry.valuesX.push(row[xKey]);
    if (isValidSubjectScore(row[yKey])) entry.valuesY.push(row[yKey]);
    entry.count += 1;
  });

  const points = [];
  groupMap.forEach((entry) => {
    const avgX = mean(entry.valuesX);
    const avgY = mean(entry.valuesY);
    if (avgX === null || avgY === null) return;
    points.push({
      name: entry.name,
      x: avgX,
      y: avgY,
      count: entry.count
    });
  });

  if (!points.length) {
    renderChartEmpty(scatterChart, "No matching data for the selected filters.");
    if (scatterLegend) scatterLegend.textContent = "";
    setChartNote(scatterNote, "Not enough grouped records with valid scores to plot correlation.", "warning");
    return;
  }

  const width = Math.max(360, scatterChart.clientWidth || 640);
  const height = 320;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const min = 1;
  const max = 9;

  const scaleX = (value) => {
    const ratio = (value - min) / (max - min);
    return margin.left + (1 - ratio) * (width - margin.left - margin.right);
  };
  const scaleY = (value) => {
    const ratio = (value - min) / (max - min);
    return margin.top + ratio * (height - margin.top - margin.bottom);
  };

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.style.display = "block";

  const axis = document.createElementNS(svg.namespaceURI, "line");
  axis.setAttribute("x1", margin.left);
  axis.setAttribute("y1", margin.top);
  axis.setAttribute("x2", margin.left);
  axis.setAttribute("y2", height - margin.bottom);
  axis.setAttribute("stroke", "#d1c7bb");
  svg.appendChild(axis);

  const axisX = document.createElementNS(svg.namespaceURI, "line");
  axisX.setAttribute("x1", margin.left);
  axisX.setAttribute("y1", height - margin.bottom);
  axisX.setAttribute("x2", width - margin.right);
  axisX.setAttribute("y2", height - margin.bottom);
  axisX.setAttribute("stroke", "#d1c7bb");
  svg.appendChild(axisX);

  for (let tick = 1; tick <= 9; tick += 2) {
    const x = scaleX(tick);
    const tickLine = document.createElementNS(svg.namespaceURI, "line");
    tickLine.setAttribute("x1", x);
    tickLine.setAttribute("y1", height - margin.bottom);
    tickLine.setAttribute("x2", x);
    tickLine.setAttribute("y2", height - margin.bottom + 6);
    tickLine.setAttribute("stroke", "#d1c7bb");
    svg.appendChild(tickLine);

    const label = document.createElementNS(svg.namespaceURI, "text");
    label.setAttribute("x", x);
    label.setAttribute("y", height - margin.bottom + 18);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "10");
    label.setAttribute("fill", "#6b7280");
    label.textContent = String(tick);
    svg.appendChild(label);

    const y = scaleY(tick);
    const tickLineY = document.createElementNS(svg.namespaceURI, "line");
    tickLineY.setAttribute("x1", margin.left - 6);
    tickLineY.setAttribute("y1", y);
    tickLineY.setAttribute("x2", margin.left);
    tickLineY.setAttribute("y2", y);
    tickLineY.setAttribute("stroke", "#d1c7bb");
    svg.appendChild(tickLineY);

    const labelY = document.createElementNS(svg.namespaceURI, "text");
    labelY.setAttribute("x", margin.left - 10);
    labelY.setAttribute("y", y + 3);
    labelY.setAttribute("text-anchor", "end");
    labelY.setAttribute("font-size", "10");
    labelY.setAttribute("fill", "#6b7280");
    labelY.textContent = String(tick);
    svg.appendChild(labelY);
  }

  points.forEach((point) => {
    const circle = document.createElementNS(svg.namespaceURI, "circle");
    circle.setAttribute("cx", scaleX(point.x));
    circle.setAttribute("cy", scaleY(point.y));
    circle.setAttribute("r", Math.min(10, 3 + Math.sqrt(point.count) / 3));
    circle.setAttribute("fill", COLORS.accentSoft);
    circle.setAttribute("fill-opacity", "0.75");
    circle.setAttribute("stroke", COLORS.accent);
    circle.setAttribute("stroke-width", "1");
    const title = document.createElementNS(svg.namespaceURI, "title");
    title.textContent = `${point.name}: ${SUBJECT_LABELS[xKey]} ${point.x.toFixed(1)}, ${SUBJECT_LABELS[yKey]} ${point.y.toFixed(1)} (n=${point.count})`;
    circle.appendChild(title);
    svg.appendChild(circle);
  });

  const labelX = document.createElementNS(svg.namespaceURI, "text");
  labelX.setAttribute("x", (margin.left + width - margin.right) / 2);
  labelX.setAttribute("y", height - 8);
  labelX.setAttribute("text-anchor", "middle");
  labelX.setAttribute("font-size", "11");
  labelX.setAttribute("fill", "#6b7280");
  labelX.textContent = `${SUBJECT_LABELS[xKey]} (1 = best)`;
  svg.appendChild(labelX);

  const labelY = document.createElementNS(svg.namespaceURI, "text");
  labelY.setAttribute("x", 12);
  labelY.setAttribute("y", (margin.top + height - margin.bottom) / 2);
  labelY.setAttribute("transform", `rotate(-90 12 ${(margin.top + height - margin.bottom) / 2})`);
  labelY.setAttribute("text-anchor", "middle");
  labelY.setAttribute("font-size", "11");
  labelY.setAttribute("fill", "#6b7280");
  labelY.textContent = `${SUBJECT_LABELS[yKey]} (1 = best)`;
  svg.appendChild(labelY);

  scatterChart.appendChild(svg);

  if (scatterLegend) {
    scatterLegend.textContent = `${points.length} ${groupLevel} point${points.length === 1 ? "" : "s"} • dot size reflects enrollment.`;
  }
  setChartNote(
    scatterNote,
    `Coverage: ${SUBJECT_LABELS[xKey]} ${formatPercent((validX / filtered.length) * 100)}, ${SUBJECT_LABELS[yKey]} ${formatPercent((validY / filtered.length) * 100)}.`,
    "success"
  );
}

function setSelectOptions(selectEl, values, allLabel = "All", preserveValue = "all") {
  if (!selectEl) return;
  const previous = preserveValue ?? selectEl.value ?? "all";
  selectEl.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = allLabel;
  selectEl.appendChild(allOption);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });
  selectEl.value = values.includes(previous) ? previous : "all";
}

function setDimensionOptions(selectEl, options, { includeNone = false, noneLabel = "None", preserveValue } = {}) {
  if (!selectEl) return;
  const previous = preserveValue ?? selectEl.value ?? (includeNone ? "none" : "");
  selectEl.innerHTML = "";
  if (includeNone) {
    const noneOption = document.createElement("option");
    noneOption.value = "none";
    noneOption.textContent = noneLabel;
    selectEl.appendChild(noneOption);
  }
  options.forEach((option) => {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    selectEl.appendChild(el);
  });
  const values = options.map((option) => option.value);
  if (includeNone && previous === "none") {
    selectEl.value = "none";
  } else if (values.includes(previous)) {
    selectEl.value = previous;
  } else if (includeNone) {
    selectEl.value = "none";
  } else if (values.length) {
    [selectEl.value] = values;
  }
}

function getAvailableSubjects(records) {
  const coverage = buildSubjectCoverage(records);
  const withCoverage = Object.keys(SUBJECT_LABELS).filter((key) => (coverage[key]?.valid || 0) > 0);
  return withCoverage.length ? withCoverage : Object.keys(SUBJECT_LABELS);
}

function populateSubjectSelectors(records) {
  const subjectKeys = getAvailableSubjects(records);
  const options = subjectKeys.map((key) => ({ value: key, label: SUBJECT_LABELS[key] || key }));
  const prevCustom = customSubject?.value || subjectKeys[0] || "eng";
  const prevScatterX = scatterX?.value || subjectKeys[0] || "eng";
  const prevScatterY = scatterY?.value || subjectKeys[1] || subjectKeys[0] || "sci";
  const prevExplore = exploreSubject?.value || subjectKeys[0] || "eng";

  setDimensionOptions(customSubject, options, { preserveValue: prevCustom });
  setDimensionOptions(scatterX, options, { preserveValue: prevScatterX });
  setDimensionOptions(scatterY, options, { preserveValue: prevScatterY });
  setDimensionOptions(exploreSubject, options, { preserveValue: prevExplore });

  if (scatterX && scatterY && scatterX.value === scatterY.value && subjectKeys.length > 1) {
    const fallback = subjectKeys.find((key) => key !== scatterX.value);
    if (fallback) scatterY.value = fallback;
  }
}

function getAvailableCustomDimensions(records) {
  if (!records.length) return DEFAULT_CUSTOM_DIMENSIONS;
  const coverage = buildSubjectCoverage(records);
  const hasSubject = hasAnySubjectCoverage(coverage);
  const years = new Set(records.map((row) => row.year).filter(Boolean));
  const districts = new Set(records.map((row) => row.district).filter(Boolean));
  const parishes = new Set(records.map((row) => row.parish).filter(Boolean));
  const schools = new Set(records.map((row) => row.schoolName).filter(Boolean));
  const sexes = new Set(records.map((row) => row.sex).filter(Boolean));
  const divisions = new Set(records.map((row) => row.div).filter(Boolean));
  return DEFAULT_CUSTOM_DIMENSIONS.filter((dim) => {
    if (dim.value === "subject") return hasSubject;
    if (dim.value === "year") return years.size > 0;
    if (dim.value === "district") return districts.size > 0;
    if (dim.value === "parish") return parishes.size > 0;
    if (dim.value === "school") return schools.size > 0;
    if (dim.value === "sex") return sexes.size > 0;
    if (dim.value === "division") return divisions.size > 0;
    return true;
  });
}

function populateCustomDimensionSelectors(records) {
  const options = getAvailableCustomDimensions(records);
  if (!options.length) return;
  const previousCategory = customCategory?.value || options[0].value;
  setDimensionOptions(customCategory, options, { preserveValue: previousCategory });
  const seriesOptions = options.filter((option) => option.value !== customCategory?.value);
  const previousSeries = customSeries?.value || "none";
  setDimensionOptions(customSeries, seriesOptions, { includeNone: true, preserveValue: previousSeries });
}

function getDimensionLabel(dimension, value) {
  if (dimension === "division") {
    if (value === "U") return "U (Ungraded)";
    if (value === "X") return "X (Missing)";
    if (value === "Unknown") return "Unknown";
    return `Div ${value}`;
  }
  if (dimension === "sex") {
    if (value === "F") return "Female";
    if (value === "M") return "Male";
    return "Unspecified";
  }
  if (dimension === "subject") {
    return SUBJECT_LABELS[value] || value;
  }
  return value || "Unknown";
}

function getDimensionColor(dimension, value, index = 0) {
  if (dimension === "division") return DIV_COLORS[value] || DIV_COLORS.Unknown;
  if (dimension === "sex") {
    if (value === "F") return COLORS.female;
    if (value === "M") return COLORS.male;
    return COLORS.unknown;
  }
  if (dimension === "subject") {
    const subjectColors = {
      eng: "#003f5c",
      sci: "#58508d",
      sst: "#bc5090",
      math: "#ff6361"
    };
    return subjectColors[value] || CUSTOM_PALETTE[index % CUSTOM_PALETTE.length];
  }
  return CUSTOM_PALETTE[index % CUSTOM_PALETTE.length];
}

function metricUsesRateView(metric) {
  return ["success_rate", "top_rate", "at_risk_rate", "distinction_rate", "fail_rate"].includes(metric);
}

function isCustomAdvancedMode() {
  return (customMode?.value || "quick") === "advanced";
}

function applyCustomQuickDefaults() {
  if (customView) customView.value = "percent";
  if (customIncludeX) customIncludeX.value = "exclude";
  if (customLimit) customLimit.value = "10";
  if (customSortBy) customSortBy.value = "value";
  if (customSortDir) customSortDir.value = (customMetric?.value || "count") === "avg_aggregate" ? "asc" : "desc";
  if (customShowTable) customShowTable.value = "no";
  if (customTitle) customTitle.value = "";
  if (customDistrict) customDistrict.value = "all";
  if (customParish) customParish.value = "all";
  if (customSchool) customSchool.value = "all";
}

function normalizeCustomConfig(config) {
  const normalizedMetric = config?.metric === "at_risk" ? "at_risk_rate" : (config?.metric || "count");
  const normalizedCategory = config?.category || config?.groupBy || "division";
  const normalizedSeries = config?.series || "none";
  const normalizedSchoolMode = config?.schoolMode || (config?.groupBy ? "contains" : "exact");
  const defaultSortDir = normalizedMetric === "avg_aggregate" ? "asc" : "desc";
  return {
    id: config?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: config?.type || "bar",
    metric: normalizedMetric,
    category: normalizedCategory,
    series: normalizedSeries,
    view: config?.view || "percent",
    includeX: config?.includeX || includeX?.value || "exclude",
    subject: config?.subject || "eng",
    year: config?.year || "all",
    sex: config?.sex || "all",
    district: config?.district || "all",
    parish: config?.parish || "all",
    school: config?.school || "all",
    schoolMode: normalizedSchoolMode,
    limit: Number(config?.limit || 10),
    sortBy: config?.sortBy || "value",
    sortDir: config?.sortDir || defaultSortDir,
    showTable: config?.showTable || "no",
    title: config?.title || "",
    subtitle: config?.subtitle || ""
  };
}

function updateCustomLocationFilters(records) {
  if (!customDistrict || !customParish || !customSchool) return;
  const year = customYear?.value || "all";
  const sex = customSex?.value || "all";
  const base = records.filter((row) => {
    if (year !== "all" && row.year !== year) return false;
    if (sex !== "all" && row.sex !== sex) return false;
    return true;
  });

  const districtValues = [...new Set(base.map((row) => row.district).filter(Boolean))].sort();
  const districtPrev = customDistrict.value || "all";
  setSelectOptions(customDistrict, districtValues, "All districts", districtPrev);

  const district = customDistrict.value || "all";
  const parishBase = base.filter((row) => district === "all" || row.district === district);
  const parishValues = [...new Set(parishBase.map((row) => row.parish).filter(Boolean))].sort();
  const parishPrev = customParish.value || "all";
  setSelectOptions(customParish, parishValues, "All parishes", parishPrev);

  const parish = customParish.value || "all";
  const schoolBase = parishBase.filter((row) => parish === "all" || row.parish === parish);
  const schoolValues = [...new Set(schoolBase.map((row) => row.schoolName).filter(Boolean))].sort();
  const schoolPrev = customSchool.value || "all";
  setSelectOptions(customSchool, schoolValues, "All schools", schoolPrev);
}

function populateCustomFilters(records) {
  if (!customYear) return;
  const years = [...new Set(records.map((row) => row.year).filter(Boolean))].sort();
  const yearPrev = customYear.value || "all";
  setSelectOptions(customYear, years, "All years", yearPrev);
  updateCustomLocationFilters(records);
  populateCustomDimensionSelectors(records);
}

function filterRecordsForConfig(records, config) {
  return records.filter((row) => {
    if (config.year !== "all" && row.year !== config.year) return false;
    if (config.sex !== "all" && row.sex !== config.sex) return false;
    if (config.district !== "all" && row.district !== config.district) return false;
    if (config.parish !== "all" && row.parish !== config.parish) return false;
    if (config.school !== "all") {
      if (config.schoolMode === "contains") {
        const query = String(config.school).toLowerCase();
        if (!row.schoolName.toLowerCase().includes(query)) return false;
      } else if (row.schoolName !== config.school) {
        return false;
      }
    }
    return true;
  });
}

function matchesDimension(row, dimension, value) {
  if (dimension === "division") {
    const div = DIV_ORDER.includes(row.div) ? row.div : "Unknown";
    return div === value;
  }
  if (dimension === "sex") {
    const sex = row.sex === "F" || row.sex === "M" ? row.sex : "U";
    return sex === value;
  }
  if (dimension === "year") return row.year === value;
  if (dimension === "district") return row.district === value;
  if (dimension === "parish") return row.parish === value;
  if (dimension === "school") return row.schoolName === value;
  return false;
}

function summarizeRecords(records) {
  const counts = {};
  DIV_ORDER.forEach((div) => { counts[div] = 0; });
  counts.Unknown = 0;
  const aggr = [];
  const subjectStats = {
    eng: { valid: 0, distinction: 0, fail: 0 },
    sci: { valid: 0, distinction: 0, fail: 0 },
    sst: { valid: 0, distinction: 0, fail: 0 },
    math: { valid: 0, distinction: 0, fail: 0 }
  };

  records.forEach((row) => {
    const div = DIV_ORDER.includes(row.div) ? row.div : "Unknown";
    counts[div] = (counts[div] || 0) + 1;
    if (row.aggr !== null) aggr.push(row.aggr);

    Object.keys(subjectStats).forEach((subjectKey) => {
      const score = row[subjectKey];
      if (!isValidSubjectScore(score)) return;
      subjectStats[subjectKey].valid += 1;
      if (score <= 2) subjectStats[subjectKey].distinction += 1;
      if (score >= 9) subjectStats[subjectKey].fail += 1;
    });
  });

  const totalAll = records.length;
  const totalAcademic = Math.max(0, totalAll - (counts.X || 0));
  return {
    counts,
    totalAll,
    totalAcademic,
    avgAggr: mean(aggr),
    subjectStats
  };
}

function getDimensionValues(records, dimension) {
  if (dimension === "subject") return getAvailableSubjects(records);
  if (dimension === "division") {
    const counts = getDivisionCounts(records);
    const ordered = DIV_ORDER.filter((div) => (counts[div] || 0) > 0);
    if ((counts.Unknown || 0) > 0) ordered.push("Unknown");
    return ordered;
  }
  if (dimension === "sex") {
    const seen = new Set(records.map((row) => (row.sex === "F" || row.sex === "M" ? row.sex : "U")));
    return ["F", "M", "U"].filter((value) => seen.has(value));
  }
  if (dimension === "year") return [...new Set(records.map((row) => row.year).filter(Boolean))].sort();
  if (dimension === "district") return [...new Set(records.map((row) => row.district).filter(Boolean))].sort();
  if (dimension === "parish") return [...new Set(records.map((row) => row.parish).filter(Boolean))].sort();
  if (dimension === "school") return [...new Set(records.map((row) => row.schoolName).filter(Boolean))].sort();
  return [];
}

function evaluateCustomMetric(records, config, context) {
  const summary = summarizeRecords(records);
  const includeAbsentees = config.includeX === "include";
  const denominator = includeAbsentees ? summary.totalAll : summary.totalAcademic;

  if (config.metric === "count") {
    if (config.category === "subject") {
      const raw = summary.subjectStats[context.categoryValue]?.valid || 0;
      return { value: raw, displayValue: formatNumber(raw), raw };
    }
    const raw = summary.totalAll;
    return { value: raw, displayValue: formatNumber(raw), raw };
  }

  if (config.metric === "share") {
    const raw = config.category === "subject"
      ? (summary.subjectStats[context.categoryValue]?.valid || 0)
      : summary.totalAll;
    return { value: raw, displayValue: formatNumber(raw), raw };
  }

  if (config.metric === "avg_aggregate") {
    const avg = summary.avgAggr;
    return {
      value: avg ?? NaN,
      displayValue: avg === null || avg === undefined ? "—" : avg.toFixed(1),
      raw: Number.isFinite(avg) ? avg : NaN
    };
  }

  const successCount = context.successDivs.reduce((sum, div) => sum + (summary.counts[div] || 0), 0);
  const topCount = summary.counts["1"] || 0;
  const atRiskCount = (summary.counts.U || 0) + (includeAbsentees ? (summary.counts.X || 0) : 0);

  if (config.metric === "success_rate") {
    const rate = denominator ? (successCount / denominator) * 100 : 0;
    if (config.view === "count") return { value: successCount, displayValue: formatNumber(successCount), raw: successCount };
    return { value: rate, displayValue: formatPercent(rate), raw: successCount };
  }
  if (config.metric === "top_rate") {
    const rate = denominator ? (topCount / denominator) * 100 : 0;
    if (config.view === "count") return { value: topCount, displayValue: formatNumber(topCount), raw: topCount };
    return { value: rate, displayValue: formatPercent(rate), raw: topCount };
  }
  if (config.metric === "at_risk_rate") {
    const rate = denominator ? (atRiskCount / denominator) * 100 : 0;
    if (config.view === "count") return { value: atRiskCount, displayValue: formatNumber(atRiskCount), raw: atRiskCount };
    return { value: rate, displayValue: formatPercent(rate), raw: atRiskCount };
  }

  if (config.metric === "distinction_rate" || config.metric === "fail_rate") {
    const subjectKey = config.category === "subject" ? context.categoryValue : config.subject;
    const stat = summary.subjectStats[subjectKey] || { distinction: 0, fail: 0 };
    const count = config.metric === "distinction_rate" ? stat.distinction : stat.fail;
    const rate = denominator ? (count / denominator) * 100 : 0;
    if (config.view === "count") return { value: count, displayValue: formatNumber(count), raw: count };
    return { value: rate, displayValue: formatPercent(rate), raw: count };
  }

  return { value: NaN, displayValue: "—", raw: NaN };
}

function sortCustomRows(rows, config) {
  const sortDir = config.sortDir === "asc" ? 1 : -1;
  const sortBy = config.sortBy || "value";
  rows.sort((a, b) => {
    if (sortBy === "name") return sortDir * a.label.localeCompare(b.label);
    const aFinite = Number.isFinite(a.value);
    const bFinite = Number.isFinite(b.value);
    if (!aFinite && !bFinite) return a.label.localeCompare(b.label);
    if (!aFinite) return 1;
    if (!bFinite) return -1;
    if (a.value === b.value) return a.label.localeCompare(b.label);
    return sortDir * (a.value - b.value);
  });
  return rows;
}

function sortCustomSeriesRows(rows, config) {
  const sortDir = config.sortDir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    if (config.sortBy === "name") return sortDir * a.label.localeCompare(b.label);
    const aFinite = Number.isFinite(a.sortValue);
    const bFinite = Number.isFinite(b.sortValue);
    if (!aFinite && !bFinite) return a.label.localeCompare(b.label);
    if (!aFinite) return 1;
    if (!bFinite) return -1;
    if (a.sortValue === b.sortValue) return a.label.localeCompare(b.label);
    return sortDir * (a.sortValue - b.sortValue);
  });
  return rows;
}

function applyCustomLimit(rows, limit) {
  const parsed = Number(limit || 0);
  if (!parsed || parsed < 0) return rows;
  return rows.slice(0, parsed);
}

function appendCustomDataTable(container, headers, rowValues) {
  if (!container || !rowValues.length) return;
  const wrap = document.createElement("div");
  wrap.className = "custom-data-table";
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((headerLabel) => {
    const th = document.createElement("th");
    th.textContent = headerLabel;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rowValues.forEach((values) => {
    const tr = document.createElement("tr");
    values.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  container.appendChild(wrap);
}

function validateCustomConfig(config) {
  if (!config) return "Invalid visualization configuration.";
  if (config.type === "donut" && config.series !== "none") {
    return "Donut charts do not support a series split.";
  }
  if (config.type === "donut" && config.metric === "avg_aggregate") {
    return "Donut charts do not support average aggregate.";
  }
  if (config.type === "stacked" && config.series === "none") {
    return "Stacked charts require a series split.";
  }
  if (config.type === "stacked" && config.metric === "avg_aggregate") {
    return "Stacked charts do not support average aggregate.";
  }
  if (config.category === "division" && !["count", "share"].includes(config.metric)) {
    return "Division category supports count/share metrics only.";
  }
  if (config.category === "subject" && !["count", "share", "distinction_rate", "fail_rate"].includes(config.metric)) {
    return "Subject category supports count/share/distinction/fail metrics.";
  }
  if (config.category === "sex" && config.series === "sex") {
    return "Series: Sex cannot be used when category is Sex.";
  }
  if (config.category === "division" && config.series === "division") {
    return "Series: Division cannot be used when category is Division.";
  }
  if (config.category === "subject" && config.series === "division") {
    return "Series: Division is not supported for Subject category.";
  }
  return "";
}

function updateCustomBuilderControls() {
  if (!customMetric || !customView || !customSeries) return;
  const metric = customMetric.value;
  const category = customCategory?.value || "division";
  const advancedMode = isCustomAdvancedMode();
  document.querySelectorAll("#custom-builder .custom-advanced").forEach((node) => {
    node.style.display = advancedMode ? "flex" : "none";
  });

  const showSubjectFilter = ["distinction_rate", "fail_rate"].includes(metric) && category !== "subject";
  const subjectLabel = customSubject?.closest("label");
  if (subjectLabel) {
    subjectLabel.style.display = showSubjectFilter ? "flex" : "none";
  }

  const viewForcedPercent = metric === "share";
  const viewDisabled = viewForcedPercent || metric === "count" || metric === "avg_aggregate";
  if (viewForcedPercent) customView.value = "percent";
  customView.disabled = viewDisabled;

  if (customSeries.value === category) customSeries.value = "none";

  const seriesSexOption = customSeries.querySelector('option[value="sex"]');
  const seriesDivisionOption = customSeries.querySelector('option[value="division"]');
  if (seriesSexOption) seriesSexOption.disabled = category === "sex";
  if (seriesDivisionOption) seriesDivisionOption.disabled = category === "division" || category === "subject";
}

function updateCustomBuilderHint() {
  updateCustomBuilderControls();
  const config = normalizeCustomConfig({
    type: customType?.value || "bar",
    metric: customMetric?.value || "count",
    category: customCategory?.value || "division",
    series: customSeries?.value || "none",
    view: customView?.value || "percent",
    includeX: customIncludeX?.value || "exclude",
    subject: customSubject?.value || "eng",
    year: customYear?.value || "all",
    sex: customSex?.value || "all",
    district: customDistrict?.value || "all",
    parish: customParish?.value || "all",
    school: customSchool?.value || "all",
    limit: Number(customLimit?.value || 10),
    sortBy: customSortBy?.value || "value",
    sortDir: customSortDir?.value || "desc",
    showTable: customShowTable?.value || "no"
  });
  const error = validateCustomConfig(config);
  if (customHint) {
    if (error) {
      customHint.textContent = error;
      return;
    }
    customHint.textContent = isCustomAdvancedMode()
      ? "Advanced mode: configure rows, columns, filters, and denominator behavior."
      : "Quick mode: pick chart type, metric, and rows. Switch to advanced for more control.";
  }
}

function renderCustomCharts(records) {
  if (!customCharts) return;
  customCharts.innerHTML = "";
  if (!state.customCharts.length) {
    const empty = document.createElement("div");
    empty.className = "chart-empty";
    empty.textContent = "No custom visualizations yet.";
    customCharts.appendChild(empty);
    return;
  }

  const successDivs = getSuccessDivisions(successDefinition?.value || "standard");

  state.customCharts.forEach((rawConfig) => {
    const config = normalizeCustomConfig(rawConfig);
    const card = document.createElement("div");
    card.className = "card chart-card";
    const header = document.createElement("div");
    header.className = "chart-header";
    const row = document.createElement("div");
    row.className = "chart-header-row";
    const titleWrap = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = config.title;
    const subtitle = document.createElement("p");
    subtitle.textContent = config.subtitle;
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);
    const actions = document.createElement("div");
    actions.className = "custom-card-actions";
    const exportBtn = document.createElement("button");
    exportBtn.className = "ghost export-ignore";
    exportBtn.textContent = "Export chart";
    exportBtn.addEventListener("click", () => exportElementAsPng(card, config.title));
    const removeBtn = document.createElement("button");
    removeBtn.className = "ghost export-ignore";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      state.customCharts = state.customCharts.filter((item) => item.id !== config.id);
      renderCustomCharts(state.records);
      scheduleSessionSave();
    });
    actions.appendChild(exportBtn);
    actions.appendChild(removeBtn);
    row.appendChild(titleWrap);
    row.appendChild(actions);
    header.appendChild(row);
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "chart-body";
    card.appendChild(body);
    customCharts.appendChild(card);

    const validationError = validateCustomConfig(config);
    if (validationError) {
      renderChartEmpty(body, validationError);
      return;
    }

    const filtered = filterRecordsForConfig(records, config);
    if (!filtered.length) {
      renderChartEmpty(body, "No data for this configuration.");
      return;
    }

    const filteredCoverage = buildSubjectCoverage(filtered);
    if ((config.category === "subject" || config.metric === "distinction_rate" || config.metric === "fail_rate") && !hasAnySubjectCoverage(filteredCoverage)) {
      renderChartEmpty(body, "Subject scores are unavailable for this selection.");
      return;
    }
    if ((config.metric === "distinction_rate" || config.metric === "fail_rate") && config.category !== "subject") {
      const selectedSubjectCoverage = filteredCoverage[config.subject]?.valid || 0;
      if (!selectedSubjectCoverage) {
        renderChartEmpty(body, `No valid ${SUBJECT_LABELS[config.subject] || config.subject} scores for this selection.`);
        return;
      }
    }

    const categoryValues = getDimensionValues(filtered, config.category);
    if (!categoryValues.length) {
      renderChartEmpty(body, "No categories available for this configuration.");
      return;
    }

    const formatter = config.metric === "avg_aggregate"
      ? formatNumber
      : (config.metric === "count" || (metricUsesRateView(config.metric) && config.view === "count"))
        ? formatNumber
        : formatPercent;

    if (config.series !== "none") {
      const seriesValues = getDimensionValues(filtered, config.series);
      if (!seriesValues.length) {
        renderChartEmpty(body, "No series values available for this configuration.");
        return;
      }

      const seriesRows = categoryValues.map((categoryValue, categoryIndex) => {
        const categoryRecords = config.category === "subject"
          ? filtered
          : filtered.filter((item) => matchesDimension(item, config.category, categoryValue));
        const segments = seriesValues.map((seriesValue, seriesIndex) => {
          const scoped = categoryRecords.filter((item) => matchesDimension(item, config.series, seriesValue));
          const metric = evaluateCustomMetric(scoped, config, { categoryValue, successDivs });
          return {
            key: seriesValue,
            label: getDimensionLabel(config.series, seriesValue),
            value: metric.value,
            raw: metric.raw,
            displayValue: metric.displayValue,
            color: getDimensionColor(config.series, seriesValue, seriesIndex)
          };
        });

        return {
          key: categoryValue,
          label: getDimensionLabel(config.category, categoryValue),
          color: getDimensionColor(config.category, categoryValue, categoryIndex),
          segments
        };
      });

      if (config.metric === "share") {
        const totalRaw = seriesRows.reduce((sum, item) => {
          return sum + item.segments.reduce((acc, segment) => acc + (Number.isFinite(segment.raw) ? segment.raw : 0), 0);
        }, 0);
        seriesRows.forEach((item) => {
          item.segments.forEach((segment) => {
            const value = totalRaw ? (segment.raw / totalRaw) * 100 : 0;
            segment.value = value;
            segment.displayValue = formatPercent(value);
          });
        });
      }

      seriesRows.forEach((item) => {
        item.total = item.segments.reduce((sum, segment) => sum + (Number.isFinite(segment.value) ? segment.value : 0), 0);
        if (config.metric === "avg_aggregate") {
          const finite = item.segments.map((segment) => segment.value).filter((value) => Number.isFinite(value));
          item.sortValue = finite.length ? mean(finite) : NaN;
        } else {
          item.sortValue = item.total;
        }
      });

      const sortedSeriesRows = applyCustomLimit(sortCustomSeriesRows(seriesRows, config), config.limit);

      if (config.type === "stacked") {
        renderStackedBars(
          body,
          sortedSeriesRows.map((item) => ({
            label: item.label,
            total: item.total,
            segments: item.segments.map((segment) => ({
              label: segment.label,
              value: Number.isFinite(segment.value) ? segment.value : 0,
              color: segment.color
            }))
          })),
          { valueFormatter: formatter }
        );
        if (config.showTable === "yes") {
          appendCustomDataTable(
            card,
            ["Category", ...seriesValues.map((seriesValue) => getDimensionLabel(config.series, seriesValue))],
            sortedSeriesRows.map((item) => [
              item.label,
              ...item.segments.map((segment) => segment.displayValue)
            ])
          );
        }
        return;
      }

      const flattened = [];
      sortedSeriesRows.forEach((item) => {
        item.segments.forEach((segment) => {
          flattened.push({
            label: `${item.label} - ${segment.label}`,
            value: segment.value,
            displayValue: segment.displayValue,
            color: segment.color
          });
        });
      });
      const sortedFlattened = applyCustomLimit(sortCustomRows(flattened, config), config.limit);
      renderBars(body, sortedFlattened, { valueFormatter: formatter });
      if (config.showTable === "yes") {
        appendCustomDataTable(
          card,
          ["Label", "Value"],
          sortedFlattened.map((item) => [item.label, item.displayValue])
        );
      }
      return;
    }

    const rows = categoryValues.map((categoryValue, index) => {
      const scoped = config.category === "subject"
        ? filtered
        : filtered.filter((item) => matchesDimension(item, config.category, categoryValue));
      const metric = evaluateCustomMetric(scoped, config, { categoryValue, successDivs });
      return {
        key: categoryValue,
        label: getDimensionLabel(config.category, categoryValue),
        value: metric.value,
        raw: metric.raw,
        displayValue: metric.displayValue,
        color: getDimensionColor(config.category, categoryValue, index)
      };
    });

    if (config.metric === "share") {
      const totalRaw = rows.reduce((sum, item) => sum + (Number.isFinite(item.raw) ? item.raw : 0), 0);
      rows.forEach((item) => {
        const value = totalRaw ? (item.raw / totalRaw) * 100 : 0;
        item.value = value;
        item.displayValue = formatPercent(value);
      });
    }

    const sortedRows = applyCustomLimit(sortCustomRows(rows, config), config.limit);
    if (config.type === "donut") {
      renderDonutChart(body, sortedRows, {
        valueFormatter: formatter,
        totalLabel: config.metric === "count" ? formatNumber(sortedRows.reduce((sum, item) => sum + (item.value || 0), 0)) : null
      });
      if (config.showTable === "yes") {
        appendCustomDataTable(
          card,
          ["Category", "Value"],
          sortedRows.map((item) => [item.label, item.displayValue])
        );
      }
      return;
    }

    renderBars(body, sortedRows, { valueFormatter: formatter });
    if (config.showTable === "yes") {
      appendCustomDataTable(
        card,
        ["Category", "Value"],
        sortedRows.map((item) => [item.label, item.displayValue])
      );
    }
  });
}

function renderGapChart(records) {
  if (!gapChart) return;
  const rawRows = buildDistinctionGap(records).filter((row) => row.femaleValid > 0 || row.maleValid > 0);
  const rows = rawRows.map((row) => ({
    label: SUBJECT_LABELS[row.subject],
    female: row.female,
    male: row.male
  }));
  if (!rows.length) {
    renderChartEmpty(gapChart, "No gender gap data available.");
    renderLegend(gapLegend, [
      { label: "Female", color: COLORS.female },
      { label: "Male", color: COLORS.male }
    ]);
    setChartNote(gapNote, "No valid subject scores were found by sex for this dataset.", "warning");
    return;
  }
  renderDumbbell(gapChart, rows, { empty: "No gender gap data available." });
  renderLegend(gapLegend, [
    { label: "Female", color: COLORS.female },
    { label: "Male", color: COLORS.male }
  ]);
  setChartNote(
    gapNote,
    rawRows
      .map((row) => `${SUBJECT_LABELS[row.subject]} F:${row.femaleValid} M:${row.maleValid}`)
      .join(" | "),
    "success"
  );
}

function renderParityChart(records) {
  if (!parityChart) return;
  parityChart.innerHTML = "";
  if (!records.length) {
    renderChartEmpty(parityChart, "No data available.");
    return;
  }
  const stats = buildDivisionStats(records);
  const maxValue = Math.max(...Object.values(stats).map((row) => Math.max(row.F, row.M)));
  const rows = DIV_ORDER.filter((div) => stats[div]?.total).map((div) => {
    const label = div === "U" ? "U" : div === "X" ? "X" : div === "Unknown" ? "Unknown" : `Div ${div}`;
    const data = stats[div];
    return { label, female: data.F, male: data.M };
  });
  rows.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "pyramid-row";
    const label = document.createElement("div");
    label.className = "chart-label";
    label.textContent = row.label;
    const left = document.createElement("div");
    left.className = "pyramid-track left";
    const leftBar = document.createElement("div");
    leftBar.className = "pyramid-bar female";
    leftBar.style.width = `${maxValue ? (row.female / maxValue) * 100 : 0}%`;
    left.appendChild(leftBar);
    const right = document.createElement("div");
    right.className = "pyramid-track right";
    const rightBar = document.createElement("div");
    rightBar.className = "pyramid-bar male";
    rightBar.style.width = `${maxValue ? (row.male / maxValue) * 100 : 0}%`;
    right.appendChild(rightBar);
    const value = document.createElement("div");
    value.className = "chart-value";
    value.textContent = `${formatNumber(row.female)} / ${formatNumber(row.male)}`;
    rowEl.appendChild(label);
    rowEl.appendChild(left);
    rowEl.appendChild(right);
    rowEl.appendChild(value);
    parityChart.appendChild(rowEl);
  });
  renderLegend(parityLegend, [
    { label: "Female", color: COLORS.female },
    { label: "Male", color: COLORS.male }
  ]);
}

function populateDashboardFilters(records) {
  if (!filterYear || !schoolList) return;
  const years = [...new Set(records.map((row) => row.year).filter(Boolean))].sort();
  filterYear.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All years";
  filterYear.appendChild(allOption);
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    filterYear.appendChild(option);
  });

  schoolList.innerHTML = "";
  const schools = [...new Set(records.map((row) => row.schoolName).filter(Boolean))].sort();
  schools.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    schoolList.appendChild(option);
  });
}

function getFilteredRecords(records) {
  const year = filterYear?.value || "all";
  const sex = filterSex?.value || "all";
  const schoolQuery = (filterSchool?.value || "").trim().toLowerCase();
  return records.filter((row) => {
    if (year !== "all" && row.year !== year) return false;
    if (sex !== "all" && row.sex !== sex) return false;
    if (schoolQuery && !row.schoolName.toLowerCase().includes(schoolQuery)) return false;
    return true;
  });
}

function updateExplorerControls() {
  if (!exploreMetric || !exploreSubjectWrap || !exploreBreakdown) return;
  const metric = exploreMetric.value;
  exploreSubjectWrap.style.display = metric === "subject" ? "flex" : "none";
  if (metric !== "division") {
    exploreBreakdown.value = "none";
    exploreBreakdown.disabled = true;
  } else {
    exploreBreakdown.disabled = false;
  }
}

function renderExplorer(records) {
  if (!exploreChart) return;
  const filtered = getFilteredRecords(records);
  const metric = exploreMetric?.value || "division";
  const view = exploreView?.value || "count";
  const breakdown = exploreBreakdown?.value || "none";
  const limit = Number(exploreLimit?.value || 10);

  exploreLegend.innerHTML = "";
  if (exploreNote) exploreNote.textContent = "";

  if (!filtered.length) {
    renderChartEmpty(exploreChart, "No data matches these filters.");
    return;
  }

  if (metric === "division") {
    const stats = buildDivisionStats(filtered);
    const total = filtered.length;
    const rows = DIV_ORDER.map((div) => {
      const data = stats[div] || { total: 0, F: 0, M: 0, U: 0 };
      const label = div === "U" ? "U" : div === "X" ? "X" : div === "Unknown" ? "Unknown" : `Div ${div}`;
      if (breakdown === "sex") {
        return {
          label,
          total: view === "percent" ? (data.total / total) * 100 : data.total,
          segments: [
            { label: "Female", value: view === "percent" ? (data.F / total) * 100 : data.F, color: COLORS.female },
            { label: "Male", value: view === "percent" ? (data.M / total) * 100 : data.M, color: COLORS.male },
            { label: "Unspecified", value: view === "percent" ? (data.U / total) * 100 : data.U, color: COLORS.unknown }
          ]
        };
      }
      return {
        label,
        total: view === "percent" ? (data.total / total) * 100 : data.total,
        segments: [{ label: "Total", value: view === "percent" ? (data.total / total) * 100 : data.total, color: COLORS.accent }]
      };
    }).filter((row) => row.total > 0);

    renderStackedBars(exploreChart, rows, {
      valueFormatter: view === "percent" ? formatPercent : formatNumber,
      empty: "No division results for this filter."
    });
    if (breakdown === "sex") {
      renderLegend(exploreLegend, [
        { label: "Female", color: COLORS.female },
        { label: "Male", color: COLORS.male },
        { label: "Unspecified", color: COLORS.unknown }
      ]);
    }
    if (exploreNote) {
      exploreNote.textContent = view === "percent"
        ? "Percentages are out of the filtered learner total."
        : "Counts are based on the current filter selection.";
    }
    return;
  }

  if (metric === "subject") {
    const subject = exploreSubject?.value || "eng";
    const buckets = buildSubjectBuckets(filtered, subject);
    const total = Object.values(buckets).reduce((sum, val) => sum + val, 0);
    const positive = buckets.distinction + buckets.credit;
    const rows = [
      {
        label: SUBJECT_LABELS[subject],
        total,
        dividerAt: total ? (positive / total) * 100 : 0,
        segments: [
          { label: "Distinction (1-2)", value: buckets.distinction, color: BUCKET_COLORS.distinction },
          { label: "Credit (3-6)", value: buckets.credit, color: BUCKET_COLORS.credit },
          { label: "Pass (7-8)", value: buckets.pass, color: BUCKET_COLORS.pass },
          { label: "Fail (9)", value: buckets.fail, color: BUCKET_COLORS.fail },
          { label: "Missing/X", value: buckets.missing, color: BUCKET_COLORS.missing }
        ]
      }
    ];

    renderDistributionBars(exploreChart, rows, {
      empty: "No subject scores for this filter."
    });
    renderLegend(exploreLegend, [
      { label: "Distinction (1-2)", color: BUCKET_COLORS.distinction },
      { label: "Credit (3-6)", color: BUCKET_COLORS.credit },
      { label: "Pass (7-8)", color: BUCKET_COLORS.pass },
      { label: "Fail (9)", color: BUCKET_COLORS.fail },
      { label: "Missing/X", color: BUCKET_COLORS.missing }
    ]);
    if (exploreNote) {
      exploreNote.textContent = `${SUBJECT_LABELS[subject]} distribution for ${filtered.length} learner${filtered.length === 1 ? "" : "s"}.`;
    }
    return;
  }

  if (metric === "school") {
    const stats = buildSchoolStats(filtered);
    const rows = stats
      .filter((row) => row.total > 0)
      .sort((a, b) => {
        if (view === "percent") return b.div12Pct - a.div12Pct;
        return b.total - a.total;
      })
      .slice(0, limit)
      .map((row) => ({
        label: row.name,
        value: view === "percent" ? row.div12Pct : row.total,
        displayValue: view === "percent"
          ? `${formatPercent(row.div12Pct)} · Avg ${row.avgAggr === null ? "—" : row.avgAggr.toFixed(1)}`
          : `${formatNumber(row.total)} learners · Avg ${row.avgAggr === null ? "—" : row.avgAggr.toFixed(1)}`
      }));
    renderBars(exploreChart, rows, {
      valueFormatter: view === "percent" ? formatPercent : formatNumber,
      empty: "No school-level data for this filter."
    });
    if (exploreNote) {
      exploreNote.textContent = view === "percent"
        ? "Sorted by highest Division 1-2 rate."
        : "Sorted by highest learner count.";
    }
  }
}

function renderDashboard(records) {
  if (!records.length) {
    enableDashboardExports(false);
    renderDashboardKpis([]);
    renderChartEmpty(divisionChart, "No division data available.");
    renderChartEmpty(subjectChart, "No subject data available.");
    renderChartEmpty(schoolChart, "No school data available.");
    renderChartEmpty(gapChart, "No gender gap data available.");
    renderChartEmpty(parityChart, "No gender parity data available.");
    renderHeatmap([]);
    renderChartEmpty(scatterChart, "No data available for scatter plot.");
    renderChartEmpty(exploreChart, "Load a workbook to explore results.");
    renderCustomCharts([]);
    setChartNote(subjectNote);
    setChartNote(gapNote);
    setChartNote(scatterNote);
    return;
  }
  populateSubjectSelectors(records);
  enableDashboardExports(true);
  renderDashboardKpis(records);
  renderDivisionChart(records);
  renderSubjectChart(records);
  renderParityChart(records);
  renderSchoolChart(records);
  renderGapChart(records);
  renderHeatmap(records);
  renderScatter(records);
  populateCustomFilters(records);
  populateDashboardFilters(records);
  updateExplorerControls();
  renderExplorer(records);
  renderCustomCharts(records);
}

function renderMapping() {
  renderAutomatchTable();
}

function setOrgUnitLoading(isLoading) {
  const spinner = document.getElementById("orgunit-loading");
  if (!spinner) return;
  spinner.classList.toggle("hidden", !isLoading);
}

function setMappingLoading(isLoading) {
  const bar = document.getElementById("mapping-loading");
  if (!bar) return;
  bar.classList.toggle("hidden", !isLoading);
}

function renderAutomatchTable() {
  mappingTable.innerHTML = "";
  const header = [
    "school_uneb",
    "school_name",
    "district",
    "parish",
    "orgunit (search)"
  ];
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  header.forEach((cell) => {
    const th = document.createElement("th");
    th.textContent = cell;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  if (!workbookSchools.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = header.length;
    td.textContent = "No schools loaded.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    mappingTable.appendChild(thead);
    mappingTable.appendChild(tbody);
    if (mappingCount) mappingCount.textContent = "No schools loaded.";
    return;
  }
  if (mappingCount) mappingCount.textContent = `Schools loaded: ${workbookSchools.length}`;

  const suggestionMap = new Map();
  [...automatchResult.matched, ...automatchResult.unmatched].forEach((row) => {
    const key = `${row.school_uneb || ""}::${row.school_name || ""}`;
    suggestionMap.set(key, row);
  });

  workbookSchools.forEach((row, idx) => {
    const tr = document.createElement("tr");
    const input = document.createElement("input");
    input.setAttribute("list", "orgunit-options");
    input.dataset.index = String(idx);
    input.placeholder = "Search org unit...";
    input.disabled = hierarchyPool.length === 0;

    const key = `${row.school_uneb || ""}::${row.school_name || ""}`;
    const suggested = suggestionMap.get(key);
    if (suggested?.orgunit_id && suggested?.orgunit_name) {
      input.value = `${suggested.orgunit_name} [${suggested.orgunit_id}]`;
    }

    input.addEventListener("change", () => {
      const match = input.value.match(/\[([A-Za-z0-9]+)\]$/);
      updateSelectedCount();
    });

    const cells = [
      row.school_uneb || "",
      row.school_name || "",
      row.district || "",
      row.parish || "",
      input
    ];
    cells.forEach((cell) => {
      const td = document.createElement("td");
      if (cell instanceof HTMLElement) {
        td.appendChild(cell);
      } else {
        td.textContent = cell;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  mappingTable.appendChild(thead);
  mappingTable.appendChild(tbody);

  ensureOrgunitDatalist();
  updateSelectedCount();
}

function updateSelectedCount() {
  if (!mappingCount) return;
  const inputs = mappingTable.querySelectorAll("input[list='orgunit-options']");
  let selected = 0;
  inputs.forEach((input) => {
    const selectedLabel = input.value || "";
    const match = selectedLabel.match(/\[([A-Za-z0-9]+)\]$/);
    if (match && match[1]) {
      selected += 1;
    }
  });
  const total = workbookSchools.length;
  if (!total) {
    mappingCount.textContent = "No schools loaded.";
    return;
  }
  mappingCount.textContent = `Schools loaded: ${total} • Mapped: ${selected}`;
}

function getFilteredOrgunitPool() {
  return hierarchyPool
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function ensureOrgunitDatalist() {
  let list = document.getElementById("orgunit-options");
  if (!list) {
    list = document.createElement("datalist");
    list.id = "orgunit-options";
    document.body.appendChild(list);
  }
  list.innerHTML = "";
  const pool = getFilteredOrgunitPool();
  pool.forEach((ou) => {
    const option = document.createElement("option");
    option.value = `${ou.name} [${ou.id}]`;
    list.appendChild(option);
  });
}

async function loadPreview() {
  if (!state.workbookPath) return;
  setSinglePath(workbookPathEl, state.workbookPath, "No workbook loaded.");
  const result = await window.api.previewWorkbook(state.workbookPath);
  if (!result.ok) {
    if (summaryEl) {
      summaryEl.textContent = result.error || "Preview failed.";
    }
    return;
  }
  state.preview = result.preview;
  state.sheetNames = result.sheetNames;

  sheetSelect.innerHTML = "";
  state.sheetNames.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    sheetSelect.appendChild(option);
  });

  const defaultSheet = state.sheetNames.includes("div")
    ? "div"
    : state.sheetNames[0];
  sheetSelect.value = defaultSheet;
  renderPreview(defaultSheet);

  renderMapping();

  const summaryResult = await window.api.workbookSummary(state.workbookPath);
  if (summaryResult.ok) {
    renderSummary(summaryResult.summary);
  }

  await loadDashboard();
}

async function loadDashboard() {
  if (!state.workbookPath) {
    state.records = [];
    renderDashboard(state.records);
    return;
  }
  const recordsResult = await window.api.workbookRecords(state.workbookPath);
  if (!recordsResult.ok) {
    state.records = [];
    renderDashboard(state.records);
    return;
  }
  state.records = (recordsResult.records || []).map(normalizeRecord);
  renderDashboard(state.records);
  scheduleSessionSave();
}

sheetSelect.addEventListener("change", (event) => {
  renderPreview(event.target.value);
});

[
  filterYear,
  filterSchool,
  filterSex,
  exploreMetric,
  exploreSubject,
  exploreView,
  exploreBreakdown,
  exploreLimit
].forEach((el) => {
  if (!el) return;
  el.addEventListener("change", () => {
    updateExplorerControls();
    renderExplorer(state.records);
  });
});

[scatterX, scatterY, scatterSex, scatterGroup].forEach((el) => {
  if (!el) return;
  el.addEventListener("change", () => renderScatter(state.records));
});

if (filterSchool) {
  filterSchool.addEventListener("input", () => renderExplorer(state.records));
}

if (exploreReset) {
  exploreReset.addEventListener("click", () => {
    if (filterYear) filterYear.value = "all";
    if (filterSchool) filterSchool.value = "";
    if (filterSex) filterSex.value = "all";
    if (exploreMetric) exploreMetric.value = "division";
    if (exploreSubject) exploreSubject.value = "eng";
    if (exploreView) exploreView.value = "count";
    if (exploreBreakdown) exploreBreakdown.value = "none";
    if (exploreLimit) exploreLimit.value = "10";
    updateExplorerControls();
    renderExplorer(state.records);
  });
}

[successDefinition, includeX, divisionView].forEach((el) => {
  if (!el) return;
  el.addEventListener("change", () => renderDashboard(state.records));
});

[customMode, customType, customMetric, customCategory, customSeries, customView, customIncludeX, customSubject, customYear, customSex, customDistrict, customParish, customSchool, customLimit, customSortBy, customSortDir, customShowTable].forEach((el) => {
  if (!el) return;
  el.addEventListener("change", () => {
    if (el === customMode && customMode?.value === "quick") {
      applyCustomQuickDefaults();
    }
    if (el === customCategory) {
      populateCustomDimensionSelectors(state.records);
    }
    if ([customYear, customSex, customDistrict, customParish].includes(el)) {
      updateCustomLocationFilters(state.records);
    }
    updateCustomBuilderHint();
  });
});

if (customReset) {
  customReset.addEventListener("click", () => {
    if (customMode) customMode.value = "quick";
    if (customType) customType.value = "bar";
    if (customMetric) customMetric.value = "count";
    populateCustomDimensionSelectors(state.records);
    if (customCategory && customCategory.options.length) customCategory.value = customCategory.options[0].value;
    if (customSeries) customSeries.value = "none";
    populateSubjectSelectors(state.records);
    if (customYear) customYear.value = "all";
    if (customSex) customSex.value = "all";
    applyCustomQuickDefaults();
    updateCustomLocationFilters(state.records);
    updateCustomBuilderHint();
    if (customHint) customHint.textContent = "Builder reset to quick defaults.";
  });
}

const refreshButton = document.getElementById("refresh");
if (refreshButton) refreshButton.addEventListener("click", loadPreview);
const mappingRefresh = document.getElementById("mapping-refresh");
if (mappingRefresh) mappingRefresh.addEventListener("click", loadPreview);

if (rememberSessionToggle) {
  rememberSessionToggle.addEventListener("change", () => {
    if (!rememberSessionToggle.checked) {
      setSessionStatus("Saving disabled for future sessions.", "info");
      return;
    }
    scheduleSessionSave();
  });
}

if (savedJobSelect) {
  savedJobSelect.addEventListener("change", () => {
    state.currentJobId = savedJobSelect.value || null;
    const active = state.savedJobs.find((job) => job.id === state.currentJobId) || null;
    if (savedJobName) savedJobName.value = active?.name || "";
  });
}

if (saveCurrentJobBtn) {
  saveCurrentJobBtn.addEventListener("click", async () => {
    if (!window.api.saveDashboardJob) return;
    const payload = buildSessionPayload();
    const result = await window.api.saveDashboardJob({
      session: payload,
      jobId: state.currentJobId,
      name: getSavedJobNameInput(),
      createNew: false
    });
    if (result && result.ok) {
      syncJobsFromResult(result);
      setSessionStatus("Saved updates to selected job.", "info");
      return;
    }
    setSessionStatus(result?.error || "Failed to save selected job.", "error");
  });
}

if (saveNewJobBtn) {
  saveNewJobBtn.addEventListener("click", async () => {
    if (!window.api.saveDashboardJob) return;
    const payload = buildSessionPayload();
    const result = await window.api.saveDashboardJob({
      session: payload,
      name: getSavedJobNameInput(),
      createNew: true
    });
    if (result && result.ok) {
      syncJobsFromResult(result);
      setSessionStatus("Saved as a new job snapshot.", "info");
      return;
    }
    setSessionStatus(result?.error || "Failed to save new job.", "error");
  });
}

if (loadJobBtn) {
  loadJobBtn.addEventListener("click", async () => {
    const jobId = savedJobSelect?.value || "";
    if (!jobId || !window.api.loadDashboardJob) return;
    const result = await window.api.loadDashboardJob({ jobId });
    if (!result || !result.ok || !result.session) {
      setSessionStatus(result?.error || "Failed to load saved job.", "error");
      return;
    }
    syncJobsFromResult(result);
    await applySession(result.session, {
      savedAt: result.session?.savedAt,
      message: `Loaded saved job: ${(result.job && result.job.name) || "selected job"}.`
    });
  });
}

if (deleteJobBtn) {
  deleteJobBtn.addEventListener("click", async () => {
    const jobId = savedJobSelect?.value || "";
    if (!jobId || !window.api.deleteDashboardJob) return;
    const result = await window.api.deleteDashboardJob({ jobId });
    if (!result || !result.ok) {
      setSessionStatus(result?.error || "Failed to delete saved job.", "error");
      return;
    }
    syncJobsFromResult(result);
    if (state.currentJobId && window.api.loadDashboardJob) {
      const next = await window.api.loadDashboardJob({ jobId: state.currentJobId });
      if (next && next.ok && next.session) {
        syncJobsFromResult(next);
        await applySession(next.session, {
          savedAt: next.session?.savedAt,
          message: `Loaded saved job: ${(next.job && next.job.name) || "selected job"}.`
        });
      }
    }
    setSessionStatus("Deleted saved job.", "info");
  });
}

if (clearSessionBtn) {
  clearSessionBtn.addEventListener("click", async () => {
    await clearSavedSession();
  });
}

// Buttons

document.getElementById("pick-pdfs").addEventListener("click", async () => {
  const files = await window.api.selectPdfs();
  state.pdfs = files;
  renderFileList(pdfList, state.pdfs, "No PDFs selected.");
  scheduleSessionSave();
});

document.getElementById("pick-output").addEventListener("click", async () => {
  const output = await window.api.selectOutput();
  state.output = output;
  setSinglePath(outputPath, state.output, "No output selected.");
  scheduleSessionSave();
});


document.getElementById("run").addEventListener("click", async () => {
  setStatus("Running conversion...", "info");
  if (conversionProgress) {
    conversionProgress.classList.remove("hidden");
  }
  if (conversionProgressFill) {
    conversionProgressFill.style.width = "0%";
  }
  const payload = {
    pdfs: state.pdfs,
    output: state.output,
    orgUnits: state.orgUnits,
    orgKey: "",
    orgSchoolIdCol: "",
    orgParishNameCol: "",
    orgParishIdCol: ""
  };

  try {
    const result = await window.api.runConversion(payload);
    if (!result.ok) {
      setStatus(result.error || "Conversion failed.", "error");
      return;
    }

    setStatus(`Complete. ${result.output}`, "success");
    state.workbookPath = result.output;
    setStep("mapping");
    await loadPreview();
    scheduleSessionSave();
  } finally {
    if (conversionProgress) {
      conversionProgress.classList.add("hidden");
    }
    if (conversionProgressFill) {
      conversionProgressFill.style.width = "0%";
    }
  }
});

document.getElementById("open-workbook").addEventListener("click", async () => {
  const file = await window.api.selectWorkbook();
  if (!file) return;
  state.workbookPath = file;
  await loadPreview();
  scheduleSessionSave();
});

const conversionProgress = document.getElementById("conversion-progress");
const conversionProgressFill = document.getElementById("conversion-progress-fill");

const goMapping = document.getElementById("go-mapping");
if (goMapping) goMapping.addEventListener("click", () => setStep("mapping"));

const goDashboard = document.getElementById("go-dashboard");
if (goDashboard) goDashboard.addEventListener("click", () => setStep("dashboard"));

const goValidation = document.getElementById("go-validation");
if (goValidation) goValidation.addEventListener("click", () => setStep("validate"));

const dashboardRefresh = document.getElementById("dashboard-refresh");
if (dashboardRefresh) dashboardRefresh.addEventListener("click", loadDashboard);

if (exportDashboardBtn) {
  exportDashboardBtn.addEventListener("click", () => exportElementAsPng(dashboardSection, "ple-dashboard"));
}
if (exportDivisionBtn) {
  exportDivisionBtn.addEventListener("click", () => exportElementAsPng(divisionChart?.closest(".chart-card"), "division-outcomes"));
}
if (exportSubjectBtn) {
  exportSubjectBtn.addEventListener("click", () => exportElementAsPng(subjectChart?.closest(".chart-card"), "subject-mix"));
}
if (exportSchoolBtn) {
  exportSchoolBtn.addEventListener("click", () => exportElementAsPng(schoolChart?.closest(".chart-card"), "top-schools"));
}
if (exportExploreBtn) {
  exportExploreBtn.addEventListener("click", () => exportElementAsPng(exploreChart?.closest(".chart-card"), "explore-view"));
}
if (exportGapBtn) {
  exportGapBtn.addEventListener("click", () => exportElementAsPng(gapChart?.closest(".chart-card"), "gender-gap"));
}
if (exportHeatmapBtn) {
  exportHeatmapBtn.addEventListener("click", () => exportElementAsPng(heatmapTable?.closest(".chart-card"), "school-leaderboard"));
}
if (exportScatterBtn) {
  exportScatterBtn.addEventListener("click", () => exportElementAsPng(scatterChart?.closest(".chart-card"), "subject-correlation"));
}
if (exportParityBtn) {
  exportParityBtn.addEventListener("click", () => exportElementAsPng(parityChart?.closest(".chart-card"), "gender-parity"));
}

if (customAdd) {
  customAdd.addEventListener("click", () => {
    const config = normalizeCustomConfig({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: customType?.value || "bar",
      metric: customMetric?.value || "count",
      category: customCategory?.value || "division",
      series: customSeries?.value || "none",
      view: customView?.value || "percent",
      includeX: customIncludeX?.value || "exclude",
      subject: customSubject?.value || "eng",
      year: customYear?.value || "all",
      sex: customSex?.value || "all",
      district: customDistrict?.value || "all",
      parish: customParish?.value || "all",
      school: customSchool?.value || "all",
      schoolMode: "exact",
      limit: Number(customLimit?.value || 10),
      sortBy: customSortBy?.value || "value",
      sortDir: customSortDir?.value || "desc",
      showTable: customShowTable?.value || "no",
      title: (customTitle?.value || "").trim()
    });
    const validationError = validateCustomConfig(config);
    if (validationError) {
      if (customHint) customHint.textContent = validationError;
      return;
    }

    const metricLabel = customMetric?.selectedOptions?.[0]?.textContent || "Metric";
    const categoryLabel = customCategory?.selectedOptions?.[0]?.textContent || "Rows";
    config.title = config.title || `${metricLabel} by ${categoryLabel}`;
    const seriesLabel = customSeries?.selectedOptions?.[0]?.textContent || "None";
    const modeLabel = customMode?.selectedOptions?.[0]?.textContent || "Quick";
    const filters = [];
    if (config.year !== "all") filters.push(config.year);
    if (config.sex !== "all") filters.push(getDimensionLabel("sex", config.sex));
    if (config.district !== "all") filters.push(config.district);
    if (config.parish !== "all") filters.push(config.parish);
    if (config.school !== "all") filters.push(config.school);
    config.subtitle = `Mode: ${modeLabel} | Type: ${config.type} | View: ${config.view} | Columns: ${seriesLabel}${filters.length ? ` | Filters: ${filters.join(", ")}` : ""}`;

    if (customHint) customHint.textContent = "Visualization added below.";
    state.customCharts.unshift(config);
    renderCustomCharts(state.records);
    scheduleSessionSave();
  });
}

if (customiseToggle) {
  customiseToggle.addEventListener("click", () => {
    const next = !state.customiseMode;
    setCustomiseMode(next);
    if (next && customBuilder) {
      customBuilder.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}
setCustomiseMode(false);

const exportCsv = document.getElementById("export-csv");
if (exportCsv) exportCsv.addEventListener("click", () => {
  if (!state.workbookPath) {
    automatchStatus.textContent = "Load a workbook first.";
    return;
  }
  openExportModal({
    kind: "validation",
    sheetName: "pivot_import",
    statusTarget: automatchStatus
  });
});

function buildConfirmedMappings() {
  const inputs = mappingTable.querySelectorAll("input[list='orgunit-options']");
  const rows = workbookSchools;
  const confirmed = [];
  inputs.forEach((input) => {
    const idx = Number(input.dataset.index);
    const row = rows[idx];
    if (!row) return;
    const selectedLabel = input ? input.value : "";
    const match = selectedLabel.match(/\[([A-Za-z0-9]+)\]$/);
    const selectedId = match ? match[1] : "";
    if (!selectedId) return;
    confirmed.push({
      school_uneb: row.school_uneb || "",
      school_name: row.school_name || "",
      district: row.district || "",
      parish: row.parish || "",
      orgunit_id: selectedId,
      orgunit_name: selectedLabel.replace(/\s*\[[A-Za-z0-9]+\]\s*$/, "") || "",
      score: row.score || 0
    });
  });
  return confirmed;
}

const exportCsvMapping = document.getElementById("export-csv-mapping");
if (exportCsvMapping) exportCsvMapping.addEventListener("click", () => {
  if (!state.workbookPath) {
    automatchStatus.textContent = "Load a workbook first.";
    return;
  }
  openExportModal({
    kind: "mapping",
    sheetName: "pivot_import",
    statusTarget: automatchStatus
  });
});

const openDhis2 = document.getElementById("open-dhis2");
if (openDhis2) openDhis2.addEventListener("click", async () => {
  const url = getInputValue("dhis2-url");
  if (!url) return;
  await window.api.openExternal(url);
});

const runAutomatchBtn = document.getElementById("run-automatch");
  if (runAutomatchBtn) runAutomatchBtn.addEventListener("click", async () => {
  if (!state.workbookPath) {
    automatchStatus.textContent = "Load a workbook first.";
    return;
  }
  const targetLevel = getInputValue("target-level");
  const schoolLevel = getInputValue("dhis2-school-level");
  if (!targetLevel && !schoolLevel) {
    automatchStatus.textContent = "Select a target UID level or school level.";
    return;
  }
  automatchStatus.textContent = "Fetching org units and matching...";
  setMappingLoading(true);
  const parentIds = getCurrentParentIds();
  const targetFetches = parentIds.length
    ? await Promise.all(
        parentIds.map((parentId) =>
          window.api.dhis2FetchOrgunits({
            baseUrl: getInputValue("dhis2-url"),
            username: getInputValue("dhis2-user"),
            password: (document.getElementById("dhis2-pass") || {}).value || "",
            levelName: targetLevel || schoolLevel,
            ancestorId: parentId
          })
        )
      )
    : [
        await window.api.dhis2FetchOrgunits({
          baseUrl: getInputValue("dhis2-url"),
          username: getInputValue("dhis2-user"),
          password: (document.getElementById("dhis2-pass") || {}).value || "",
          levelName: targetLevel || schoolLevel,
          ancestorId: ""
        })
      ];

  const merged = new Map();
  targetFetches.forEach((result) => {
    (result.ok ? result.orgUnits : []).forEach((ou) => {
      if (ou && ou.id && ou.name) merged.set(ou.id, ou);
    });
  });
  hierarchyPool = [...merged.values()];
  ensureOrgunitDatalist();
  updateMappingInputsDisabled();
  if (state.workbookPath) {
    const last = drillPath[drillPath.length - 1] || {};
    await window.api.writeOrgunitList({
      workbookPath: state.workbookPath,
      orgUnits: hierarchyPool,
      targetLevel: targetLevel || schoolLevel,
      parentOrgunitId: parentIds.join(","),
      parentOrgunitName: last.orgunitName || ""
    });
  }
  const payload = {
    workbookPath: state.workbookPath,
    baseUrl: getInputValue("dhis2-url"),
    username: getInputValue("dhis2-user"),
    password: (document.getElementById("dhis2-pass") || {}).value || "",
    districtLevelName: getInputValue("dhis2-district-level"),
    parishLevelName: getInputValue("dhis2-parish-level"),
    schoolLevelName: schoolLevel,
    targetLevelName: targetLevel,
    ancestorFilterIds: parentIds,
    districtColumn: getInputValue("workbook-district"),
    parishColumn: getInputValue("workbook-parish"),
    schoolNameColumn: getInputValue("workbook-school-name"),
    schoolCodeColumn: getInputValue("workbook-school-code"),
    writeToWorkbook: false
  };

  try {
    const result = await window.api.dhis2Automatch(payload);
    if (!result.ok) {
      automatchStatus.textContent = formatDhis2Error(result.error) || "Automatch failed.";
      return;
    }

    automatchResult = { matched: result.matched || [], unmatched: result.unmatched || [] };
    automatchStatus.textContent = `Matched ${automatchResult.matched.length}, unmatched ${automatchResult.unmatched.length}.`;
    renderAutomatchTable();
  } finally {
    setMappingLoading(false);
  }
});
const applyMatchesBtn = document.getElementById("apply-matches");
if (applyMatchesBtn) applyMatchesBtn.addEventListener("click", async () => {
  if (!state.workbookPath) {
    automatchStatus.textContent = "Load a workbook first.";
    return;
  }
  if (!hierarchyPool.length) {
    automatchStatus.textContent = "Fetch target org units first.";
    return;
  }
  const confirmed = buildConfirmedMappings();

  if (confirmed.length === 0) {
    automatchStatus.textContent = "No matches selected. Proceeding to validation.";
    setStep("validate");
    await loadPreview();
    return;
  }
  confirmedMappings = confirmed;

  const result = await window.api.applyOrgunitMappings({
    workbookPath: state.workbookPath,
    mappings: confirmed
  });
  if (!result.ok) {
    automatchStatus.textContent = result.error || "Apply failed.";
    return;
  }
  automatchStatus.textContent = `Applied ${confirmed.length} mappings to WORKING.`;
  await loadPreview();
  setStep("validate");
});

// Additional export actions removed per updated mapping UX.

const fetchHierarchyBtn = document.getElementById("fetch-hierarchy");
if (fetchHierarchyBtn) fetchHierarchyBtn.addEventListener("click", async () => {
  const token = ++orgunitLoadingToken;
  const payload = {
    baseUrl: getInputValue("dhis2-url"),
    username: getInputValue("dhis2-user"),
    password: (document.getElementById("dhis2-pass") || {}).value || ""
  };
  automatchStatus.textContent = "Fetching hierarchy...";
  setOrgUnitLoading(true);
  try {
    const result = await window.api.dhis2FetchHierarchy(payload);
    if (!result.ok) {
      automatchStatus.textContent = formatDhis2Error(result.error) || "Hierarchy fetch failed.";
      return;
    }
    hierarchyLevels = (result.levels || []).slice().sort((a, b) => a.level - b.level);
    hierarchyPool = [];
    populateTargetLevels();
    populateDrilldown();
    enableMappingControls(true);
    if (token === orgunitLoadingToken) {
      setOrgUnitLoading(false);
    }
    const schoolsResult = await window.api.workbookSchools({ workbookPath: state.workbookPath });
    if (schoolsResult.ok) {
      workbookSchools = schoolsResult.schools || [];
      if (mappingCount) mappingCount.textContent = `Schools loaded: ${workbookSchools.length}`;
    }
    automatchStatus.textContent = "Hierarchy levels loaded.";
    await loadPreview();
  } finally {
    if (token === orgunitLoadingToken) {
      setOrgUnitLoading(false);
    }
  }
});

function populateTargetLevels() {
  const targetSelect = document.getElementById("target-level");
  targetSelect.innerHTML = "";
  if (!hierarchyLevels.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Select level";
    targetSelect.appendChild(option);
    return;
  }
  const minLevelNum = drillPath.length
    ? hierarchyLevels.find((lvl) => lvl.name === drillPath[drillPath.length - 1].levelName)?.level
    : null;
  hierarchyLevels
    .filter((level) => (minLevelNum ? level.level >= minLevelNum : true))
    .forEach((level) => {
      const option = document.createElement("option");
      option.value = level.name;
      option.textContent = level.name;
      targetSelect.appendChild(option);
    });
  targetSelect.onchange = () => {
    if (hierarchyPool.length === 0) {
      updateMappingInputsDisabled();
    }
    ensureOrgunitDatalist();
  };
}

function updateMappingInputsDisabled() {
  const inputs = mappingTable.querySelectorAll("input[list='orgunit-options']");
  inputs.forEach((input) => {
    input.disabled = hierarchyPool.length === 0;
  });
}

function populateDrilldown() {
  drillPath = [];
  const container = document.getElementById("drilldown-container");
  if (container) {
    container.innerHTML = "";
  }
  addDrilldownSelect(0);
}

function getNextLevelName(levelName) {
  if (!levelName) return null;
  const idx = hierarchyLevels.findIndex((lvl) => lvl.name === levelName);
  if (idx === -1 || idx + 1 >= hierarchyLevels.length) return null;
  return hierarchyLevels[idx + 1].name;
}

function addDrilldownSelect(index, preset = {}) {
  const container = document.getElementById("drilldown-container");
  if (!container) return;
  const row = document.createElement("div");
  row.className = "drilldown-item";
  row.dataset.index = String(index);
  if (preset.levelName) {
    row.dataset.levelName = preset.levelName;
  }

  let levelSelect = null;
  if (index === 0) {
    const levelLabel = document.createElement("label");
    levelLabel.textContent = "Select level";
    levelSelect = document.createElement("select");
    levelSelect.id = `drill-level-${index}`;
    levelLabel.appendChild(levelSelect);
    row.appendChild(levelLabel);

    populateLevelSelect(levelSelect, preset.levelName);
  }

  const orgLabel = document.createElement("label");
  const levelName = preset.levelName || "";
  orgLabel.textContent =
    index === 0 ? "Select org unit" : levelName ? `Select org unit (${levelName})` : "Select org unit";

  const orgInput = document.createElement("input");
  orgInput.type = "text";
  orgInput.placeholder = "Search org unit...";
  orgInput.id = `drill-orgunit-${index}`;
  orgInput.setAttribute("list", `drill-orgunit-list-${index}`);
  const orgList = document.createElement("datalist");
  orgList.id = `drill-orgunit-list-${index}`;

  orgLabel.appendChild(orgInput);
  orgLabel.appendChild(orgList);
  row.appendChild(orgLabel);

  const selectionList = document.createElement("div");
  selectionList.className = "drilldown-selection";
  selectionList.id = `drill-selection-${index}`;
  row.appendChild(selectionList);

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "ghost";
  clearBtn.textContent = "Clear selections";
  clearBtn.addEventListener("click", () => clearDrillSelection(index));
  row.appendChild(clearBtn);

  const loading = document.createElement("div");
  loading.className = "inline-loading";
  row.appendChild(loading);
  container.appendChild(row);

  orgInput.addEventListener("change", () => {
    addDrillSelection(index, orgInput.value);
  });
  orgInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDrillSelection(index, orgInput.value);
    }
  });

  if (levelSelect) {
    levelSelect.onchange = async () => {
      await populateOrgunitSelect(
        orgInput,
        orgList,
        levelSelect.value,
        preset.ancestorIds || []
      );
    };
  }

  if (preset.levelName) {
    populateOrgunitSelect(orgInput, orgList, preset.levelName, preset.ancestorIds || []);
  } else {
    orgInput.value = "";
    orgList.innerHTML = "";
  }
}

function populateLevelSelect(select, selected) {
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select level";
  select.appendChild(placeholder);
  hierarchyLevels.forEach((level) => {
    const option = document.createElement("option");
    option.value = level.name;
    option.textContent = level.name;
    select.appendChild(option);
  });
  if (selected) select.value = selected;
}

async function populateOrgunitSelect(input, list, levelName, ancestorIds) {
  const row = input.closest(".drilldown-item");
  if (row) row.classList.add("is-loading");
  list.innerHTML = "";
  if (!levelName) {
    input.value = "";
    if (row) row.classList.remove("is-loading");
    return;
  }
  const parentIds = Array.isArray(ancestorIds) ? ancestorIds.filter(Boolean) : [ancestorIds].filter(Boolean);
  const fetches = parentIds.length
    ? await Promise.all(
        parentIds.map((parentId) =>
          window.api.dhis2FetchOrgunits({
            baseUrl: getInputValue("dhis2-url"),
            username: getInputValue("dhis2-user"),
            password: (document.getElementById("dhis2-pass") || {}).value || "",
            levelName,
            ancestorId: parentId
          })
        )
      )
    : [
        await window.api.dhis2FetchOrgunits({
          baseUrl: getInputValue("dhis2-url"),
          username: getInputValue("dhis2-user"),
          password: (document.getElementById("dhis2-pass") || {}).value || "",
          levelName,
          ancestorId: ""
        })
      ];

  const merged = new Map();
  fetches.forEach((result) => {
    (result.ok ? result.orgUnits : []).forEach((ou) => {
      if (ou && ou.id && ou.name) merged.set(ou.id, ou);
    });
  });

  if (!merged.size) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No org units found";
    list.appendChild(opt);
    if (row) row.classList.remove("is-loading");
    return;
  }
  const mergedList = [...merged.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );
  drillOptionsByIndex.set(Number(row.dataset.index), mergedList);
  mergedList
    .slice()
    .forEach(({ id, name }) => {
      const opt = document.createElement("option");
      opt.value = name;
      list.appendChild(opt);
    });
  input.value = "";
  if (state.workbookPath) {
    await window.api.writeOrgunitList({
      workbookPath: state.workbookPath,
      orgUnits: mergedList,
      targetLevel: levelName || "",
      parentOrgunitId: parentIds.join(","),
      parentOrgunitName: ""
    });
  }
  if (row) row.classList.remove("is-loading");
}

function getSelectionsAt(index) {
  return drillPath[index]?.selections || [];
}

function renderSelections(index) {
  const container = document.getElementById(`drill-selection-${index}`);
  if (!container) return;
  container.innerHTML = "";
  const selections = getSelectionsAt(index);
  selections.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "drill-chip";
    chip.textContent = item.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "chip-remove";
    remove.textContent = "×";
    remove.addEventListener("click", () => removeDrillSelection(index, item.id));
    chip.appendChild(remove);
    container.appendChild(chip);
  });
}

function addDrillSelection(index, value) {
  const rowEl = document.querySelector(`.drilldown-item[data-index='${index}']`);
  const levelSelect = document.getElementById(`drill-level-${index}`);
  const levelName = levelSelect ? levelSelect.value : rowEl?.dataset.levelName || "";
  if (!levelName) return;
  const options = drillOptionsByIndex.get(index) || [];
  const matched = options.find((ou) => ou.name === value);
  if (!matched) return;

  const existing = getSelectionsAt(index);
  if (existing.some((item) => item.id === matched.id)) {
    const input = document.getElementById(`drill-orgunit-${index}`);
    if (input) input.value = "";
    return;
  }

  drillPath = drillPath.slice(0, index);
  drillPath[index] = {
    levelName,
    selections: [...existing, { id: matched.id, name: matched.name }]
  };

  const input = document.getElementById(`drill-orgunit-${index}`);
  if (input) input.value = "";

  renderSelections(index);
  ensureNextDrillLevel(index);
  updateSelectedAncestorFromPath();
  populateTargetLevels();
  ensureOrgunitDatalist();
}

function removeDrillSelection(index, id) {
  const current = getSelectionsAt(index).filter((item) => item.id !== id);
  if (!current.length) {
    delete drillPath[index];
  } else {
    drillPath[index] = { ...drillPath[index], selections: current };
  }
  pruneDrilldown(index);
  renderSelections(index);
  if (current.length) {
    ensureNextDrillLevel(index);
  }
  updateSelectedAncestorFromPath();
  populateTargetLevels();
  ensureOrgunitDatalist();
}

function clearDrillSelection(index) {
  delete drillPath[index];
  pruneDrilldown(index);
  renderSelections(index);
  updateSelectedAncestorFromPath();
  populateTargetLevels();
  ensureOrgunitDatalist();
}

function pruneDrilldown(index) {
  const container = document.getElementById("drilldown-container");
  if (!container) return;
  const rows = container.querySelectorAll(".drilldown-item");
  rows.forEach((rowEl) => {
    const rowIndex = Number(rowEl.dataset.index);
    if (rowIndex > index) rowEl.remove();
  });
  drillPath = drillPath.slice(0, index + 1);
}

function ensureNextDrillLevel(index) {
  const rowEl = document.querySelector(`.drilldown-item[data-index='${index}']`);
  const levelSelect = document.getElementById(`drill-level-${index}`);
  const levelName = levelSelect ? levelSelect.value : rowEl?.dataset.levelName || "";
  const nextLevel = getNextLevelName(levelName);
  if (!nextLevel) return;
  const existingRow = document.querySelector(`.drilldown-item[data-index='${index + 1}']`);
  if (!existingRow) {
    addDrilldownSelect(index + 1, { levelName: nextLevel, ancestorIds: getSelectedAncestorIds(index) });
  }
}

function getSelectedAncestorIds(index) {
  return getSelectionsAt(index).map((s) => s.id);
}

function updateSelectedAncestorFromPath() {
  const lastIndex = drillPath.length ? drillPath.length - 1 : -1;
  if (lastIndex === -1) {
    selectedAncestor = null;
    return;
  }
  const selections = getSelectionsAt(lastIndex);
  if (!selections.length) {
    selectedAncestor = null;
    return;
  }
  selectedAncestor = { id: selections.map((s) => s.id).join(","), name: selections.map((s) => s.name).join(", ") };
}

function getCurrentParentIds() {
  const lastIndex = drillPath.length ? drillPath.length - 1 : -1;
  if (lastIndex === -1) return [];
  return getSelectionsAt(lastIndex).map((s) => s.id);
}
 

function enableMappingControls(enabled) {
  const container = document.querySelector(".mapping-disabled");
  if (!container) return;
  if (enabled) {
    container.style.pointerEvents = "auto";
    container.style.opacity = "1";
  } else {
    container.style.pointerEvents = "none";
    container.style.opacity = "0.6";
  }
}

async function saveProfile() {
  const name = document.getElementById("profile-name").value.trim();
  if (!name) {
    automatchStatus.textContent = "Profile name required.";
    return;
  }
  const profile = {
    dhis2Url: getInputValue("dhis2-url"),
    dhis2User: getInputValue("dhis2-user"),
    dhis2Pass: (document.getElementById("dhis2-pass") || {}).value || "",
    districtLevel: getInputValue("dhis2-district-level"),
    parishLevel: getInputValue("dhis2-parish-level"),
    schoolLevel: getInputValue("dhis2-school-level"),
    targetLevel: getInputValue("target-level"),
    workbookDistrict: getInputValue("workbook-district"),
    workbookParish: getInputValue("workbook-parish"),
    workbookSchoolName: getInputValue("workbook-school-name"),
    workbookSchoolCode: getInputValue("workbook-school-code")
  };
  const result = await window.api.profilesSave({ name, profile });
  if (!result.ok) {
    automatchStatus.textContent = result.error || "Profile save failed.";
    return;
  }
  await renderProfiles();
  automatchStatus.textContent = `Profile saved: ${name}`;
}

async function renderProfiles() {
  const select = document.getElementById("profile-select");
  if (!select) return;
  select.innerHTML = "";
  const result = await window.api.profilesList();
  if (!result.ok) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No profiles";
    select.appendChild(option);
    return;
  }
  const profiles = result.profiles || {};
  const names = Object.keys(profiles);
  if (names.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No profiles";
    select.appendChild(option);
    return;
  }
  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

async function applyProfile() {
  const select = document.getElementById("profile-select");
  const result = await window.api.profilesLoad({ name: select.value });
  if (!result.ok || !result.profile) {
    automatchStatus.textContent = "Profile not found.";
    return;
  }
  const profile = result.profile;
  if (!profile) return;
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };
  setValue("dhis2-url", profile.dhis2Url);
  setValue("dhis2-user", profile.dhis2User);
  const pass = document.getElementById("dhis2-pass");
  if (pass) pass.value = profile.dhis2Pass || "";
  setValue("dhis2-district-level", profile.districtLevel);
  setValue("dhis2-parish-level", profile.parishLevel);
  setValue("dhis2-school-level", profile.schoolLevel);
  setValue("target-level", profile.targetLevel);
  setValue("workbook-district", profile.workbookDistrict);
  setValue("workbook-parish", profile.workbookParish);
  setValue("workbook-school-name", profile.workbookSchoolName);
  setValue("workbook-school-code", profile.workbookSchoolCode);
  automatchStatus.textContent = `Profile loaded: ${select.value}`;
}

const saveProfileBtn = document.getElementById("save-profile");
if (saveProfileBtn) saveProfileBtn.addEventListener("click", saveProfile);
const loadProfileBtn = document.getElementById("load-profile");
if (loadProfileBtn) loadProfileBtn.addEventListener("click", applyProfile);

enableMappingControls(false);
renderProfiles();

function cycleTips() {
  const tip = document.getElementById("tip-text");
  if (!tip) return;
  tip.classList.add("fade-out");
  setTimeout(() => {
    tipIndex = (tipIndex + 1) % tipBank.length;
    tip.textContent = tipBank[tipIndex];
    tip.classList.remove("fade-out");
  }, 250);
}

setInterval(cycleTips, 4000);

function openExportModal(context) {
  const modal = document.getElementById("export-modal");
  if (!modal) return;
  pendingExport = context;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  const primary = document.getElementById("export-new");
  if (primary) primary.focus();
}

function closeExportModal() {
  const modal = document.getElementById("export-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  pendingExport = null;
}

async function runExportWithPath(outputPath) {
  if (!pendingExport || !outputPath) return;
  if (pendingExport.kind === "mapping") {
    const mappings = buildConfirmedMappings();
    if (!mappings.length) {
      pendingExport.statusTarget.textContent = "No mappings selected.";
      return;
    }
    const applyResult = await window.api.applyOrgunitMappings({
      workbookPath: state.workbookPath,
      mappings
    });
    if (!applyResult.ok) {
      pendingExport.statusTarget.textContent = applyResult.error || "Apply failed.";
      return;
    }
    const headers = [
      "school_uneb",
      "school_name",
      "district",
      "parish",
      "orgunit_id",
      "score"
    ];
    const result = await window.api.exportCsvData({
      headers,
      rows: mappings,
      outputPath
    });
    if (result.ok) {
      await window.api.writeMappedOrgunitHierarchy({
        workbookPath: state.workbookPath,
        mappings
      });
      pendingExport.statusTarget.textContent = `CSV saved: ${outputPath}`;
      await loadPreview();
      setStep("validate");
    } else {
      pendingExport.statusTarget.textContent = result.error || "CSV export failed.";
    }
    return;
  }
  const result = await window.api.exportCsv({
    filePath: state.workbookPath,
    sheetName: pendingExport.sheetName,
    outputPath
  });

  if (result.ok) {
    pendingExport.statusTarget.textContent = `CSV saved: ${outputPath}`;
  } else {
    pendingExport.statusTarget.textContent = result.error || "CSV export failed.";
  }
}

const exportModalClose = document.getElementById("export-modal-close");
if (exportModalClose) exportModalClose.addEventListener("click", closeExportModal);
const exportModalBackdrop = document.querySelector("#export-modal .modal-backdrop");
if (exportModalBackdrop) exportModalBackdrop.addEventListener("click", closeExportModal);
document.addEventListener("keydown", (event) => {
  const modal = document.getElementById("export-modal");
  if (!modal || modal.classList.contains("hidden")) return;
  if (event.key === "Escape") {
    closeExportModal();
    return;
  }
  if (event.key === "Enter") {
    const primary = document.getElementById("export-new");
    if (primary) primary.click();
  }
  if (event.key === "Tab") {
    const focusables = [
      document.getElementById("export-modal-close"),
      document.getElementById("export-update"),
      document.getElementById("export-new")
    ].filter(Boolean);
    if (!focusables.length) return;
    const currentIndex = focusables.indexOf(document.activeElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1)
      : (currentIndex === -1 || currentIndex === focusables.length - 1 ? 0 : currentIndex + 1);
    focusables[nextIndex].focus();
    event.preventDefault();
  }
});
  const exportUpdateBtn = document.getElementById("export-update");
if (exportUpdateBtn) exportUpdateBtn.addEventListener("click", async () => {
  if (!pendingExport) return;
  const lastPath = lastExportPath;
  if (!lastPath) {
    const outputPath = await window.api.selectCsvOutput({
      workbookPath: state.workbookPath,
      kind: pendingExport.kind,
      lastPath
    });
    if (!outputPath) return;
    lastExportPath = outputPath;
    await runExportWithPath(outputPath);
    closeExportModal();
    return;
  }
  await runExportWithPath(lastPath);
  closeExportModal();
});

const exportNewBtn = document.getElementById("export-new");
if (exportNewBtn) exportNewBtn.addEventListener("click", async () => {
  if (!pendingExport) return;
  const outputPath = await window.api.selectCsvOutput({
    workbookPath: state.workbookPath,
    kind: pendingExport.kind,
    lastPath: lastExportPath
  });
  if (!outputPath) return;
  lastExportPath = outputPath;
  await runExportWithPath(outputPath);
  closeExportModal();
});

if (window.api.onConversionProgress) {
  window.api.onConversionProgress((data) => {
    if (!conversionProgress || !conversionProgressFill) return;
    const total = Number(data.total || 0);
    const current = Number(data.current || 0);
    if (!total) return;
    const percent = Math.min(100, Math.max(0, (current / total) * 100));
    conversionProgress.classList.remove("hidden");
    conversionProgressFill.style.width = `${percent}%`;
  });
}

if (window.api.onConversionComplete) {
  window.api.onConversionComplete(() => {
    if (!conversionProgress || !conversionProgressFill) return;
    conversionProgress.classList.add("hidden");
    conversionProgressFill.style.width = "0%";
  });
}

function renderSummary(summary) {
  if (!summaryEl) return;
  summaryEl.innerHTML = "";
  const cards = [
    { label: "Learners", value: summary.learners ?? 0 },
    { label: "QA Rows", value: summary.qaRows ?? 0 },
    { label: "Unmatched", value: summary.unmatchedSchools ?? 0 }
  ];

  Object.entries(summary.pivotTotals || {}).forEach(([label, value]) => {
    cards.push({ label, value });
  });

  cards.forEach((item) => {
    const div = document.createElement("div");
    div.className = "summary-card";
    div.innerHTML = `<span>${item.label}</span>${item.value}`;
    summaryEl.appendChild(div);
  });
}

async function restoreSession() {
  if (!window.api.loadDashboardSession) {
    updateSavedJobsUI();
    renderDashboard(state.records);
    return;
  }
  const result = await window.api.loadDashboardSession();
  if (!result || !result.ok || !result.session) {
    if (window.api.listDashboardJobs) {
      const jobsResult = await window.api.listDashboardJobs();
      if (jobsResult && jobsResult.ok) {
        syncJobsFromResult(jobsResult);
      } else {
        updateSavedJobsUI();
      }
    } else {
      updateSavedJobsUI();
    }
    renderDashboard(state.records);
    return;
  }
  syncJobsFromResult(result);
  await applySession(result.session, {
    savedAt: result.session?.savedAt
  });
}

async function applySession(session, options = {}) {
  if (!session || typeof session !== "object") return;
  state.pdfs = Array.isArray(session.pdfs) ? session.pdfs : [];
  state.output = session.output || null;
  state.orgUnits = session.orgUnits || null;
  state.workbookPath = session.workbookPath || null;
  state.records = Array.isArray(session.records) ? session.records : [];
  state.customCharts = Array.isArray(session.customCharts) ? session.customCharts : [];

  if (rememberSessionToggle) {
    rememberSessionToggle.checked = session.keepSession !== false;
  }

  renderFileList(pdfList, state.pdfs, "No PDFs selected.");
  setSinglePath(outputPath, state.output, "No output selected.");
  setSinglePath(workbookPathEl, state.workbookPath, "No workbook loaded.");

  renderDashboard(state.records);

  if (state.workbookPath) {
    await loadPreview();
  }

  if (options.message) {
    setSessionStatus(options.message, "info");
  } else if (options.savedAt || session.savedAt) {
    const label = new Date(options.savedAt || session.savedAt).toLocaleString();
    setSessionStatus(`Restored saved job from ${label}.`, "info");
  } else {
    setSessionStatus("Restored saved job.", "info");
  }
}

updateCustomBuilderHint();
restoreSession();
