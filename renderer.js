const state = {
  pdfs: [],
  output: null,
  orgUnits: null,
  workbookPath: null,
  preview: {},
  sheetNames: [],
  records: [],
  customCharts: []
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
const exportDashboardBtn = document.getElementById("export-dashboard");
const exportDivisionBtn = document.getElementById("export-division");
const exportSubjectBtn = document.getElementById("export-subject");
const exportSchoolBtn = document.getElementById("export-school");
const exportExploreBtn = document.getElementById("export-explore");
const exportGapBtn = document.getElementById("export-gap");
const exportParityBtn = document.getElementById("export-parity");
const exportInterventionBtn = document.getElementById("export-intervention");
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
const schoolChart = document.getElementById("school-chart");
const gapChart = document.getElementById("gap-chart");
const gapLegend = document.getElementById("gap-legend");
const parityChart = document.getElementById("parity-chart");
const parityLegend = document.getElementById("parity-legend");
const interventionList = document.getElementById("intervention-list");
const heatmapTable = document.getElementById("heatmap-table");
const heatmapLegend = document.getElementById("heatmap-legend");
const heatmapNote = document.getElementById("heatmap-note");
const scatterChart = document.getElementById("scatter-chart");
const scatterLegend = document.getElementById("scatter-legend");
const scatterX = document.getElementById("scatter-x");
const scatterY = document.getElementById("scatter-y");
const scatterSex = document.getElementById("scatter-sex");
const scatterGroup = document.getElementById("scatter-group");
const customType = document.getElementById("custom-type");
const customMetric = document.getElementById("custom-metric");
const customGroup = document.getElementById("custom-group");
const customSeries = document.getElementById("custom-series");
const customView = document.getElementById("custom-view");
const customIncludeX = document.getElementById("custom-include-x");
const customYear = document.getElementById("custom-year");
const customSex = document.getElementById("custom-sex");
const customSchool = document.getElementById("custom-school");
const customSchoolList = document.getElementById("custom-school-list");
const customLimit = document.getElementById("custom-limit");
const customSortBy = document.getElementById("custom-sort-by");
const customSortDir = document.getElementById("custom-sort-dir");
const customShowTable = document.getElementById("custom-show-table");
const customTitle = document.getElementById("custom-title");
const customAdd = document.getElementById("custom-add");
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
  if (!window.api.saveDashboardSession) return;
  if (sessionSaveTimer) clearTimeout(sessionSaveTimer);
  sessionSaveTimer = setTimeout(async () => {
    const payload = buildSessionPayload();
    const result = await window.api.saveDashboardSession(payload);
    if (result && result.ok) {
      setSessionStatus(`Saved ${new Date().toLocaleTimeString()}.`, "info");
    }
  }, 600);
}

async function clearSavedSession() {
  if (!window.api.clearDashboardSession) return;
  const result = await window.api.clearDashboardSession();
  if (result && result.ok) {
    setSessionStatus("Saved job cleared.", "info");
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

const numberFormatter = new Intl.NumberFormat();
const percentFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (/^-?\d+(\.\d+)?$/.test(str)) return Number(str);
  return null;
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
  [exportDashboardBtn, exportDivisionBtn, exportSubjectBtn, exportSchoolBtn, exportExploreBtn, exportGapBtn, exportHeatmapBtn, exportScatterBtn, exportParityBtn, exportInterventionBtn]
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
    const bucket = bucketScore(row[subject]);
    counts[bucket] += 1;
  });
  return counts;
}

function buildDistinctionGap(records) {
  return Object.keys(SUBJECT_LABELS).map((subject) => {
    const femaleScores = records.filter((row) => row.sex === "F" && row[subject] !== null);
    const maleScores = records.filter((row) => row.sex === "M" && row[subject] !== null);
    const femaleDistinctions = femaleScores.filter((row) => row[subject] <= 2).length;
    const maleDistinctions = maleScores.filter((row) => row[subject] <= 2).length;
    const femaleRate = femaleScores.length ? (femaleDistinctions / femaleScores.length) * 100 : 0;
    const maleRate = maleScores.length ? (maleDistinctions / maleScores.length) * 100 : 0;
    return {
      subject,
      female: femaleRate,
      male: maleRate
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

  const groupMap = new Map();
  filtered.forEach((row) => {
    let key = row.schoolName || "Unknown";
    if (groupLevel === "district") key = row.district || "Unknown district";
    if (groupLevel === "parish") key = row.parish || "Unknown parish";
    if (!groupMap.has(key)) {
      groupMap.set(key, { name: key, valuesX: [], valuesY: [], count: 0 });
    }
    const entry = groupMap.get(key);
    if (row[xKey] !== null) entry.valuesX.push(row[xKey]);
    if (row[yKey] !== null) entry.valuesY.push(row[yKey]);
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
}

function populateCustomFilters(records) {
  if (!customYear || !customSchoolList) return;
  const years = [...new Set(records.map((row) => row.year).filter(Boolean))].sort();
  customYear.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All years";
  customYear.appendChild(allOption);
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    customYear.appendChild(option);
  });
  customSchoolList.innerHTML = "";
  const schools = [...new Set(records.map((row) => row.schoolName).filter(Boolean))].sort();
  schools.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    customSchoolList.appendChild(option);
  });
}

function filterRecordsForConfig(records, config) {
  return records.filter((row) => {
    if (config.year && config.year !== "all" && row.year !== config.year) return false;
    if (config.sex && config.sex !== "all" && row.sex !== config.sex) return false;
    if (config.school && config.school.trim()) {
      const query = config.school.trim().toLowerCase();
      if (!row.schoolName.toLowerCase().includes(query)) return false;
    }
    return true;
  });
}

function buildGroupStats(records, groupBy) {
  const map = new Map();
  const keyFor = (row) => {
    if (groupBy === "district") return row.district || "Unknown district";
    if (groupBy === "parish") return row.parish || "Unknown parish";
    if (groupBy === "school") return row.schoolName || "Unknown school";
    return "Overall";
  };
  records.forEach((row) => {
    const key = keyFor(row);
    if (!map.has(key)) {
      map.set(key, {
        name: key,
        counts: {},
        total: 0,
        aggr: [],
        bySex: {
          F: { counts: {}, total: 0, aggr: [] },
          M: { counts: {}, total: 0, aggr: [] },
          U: { counts: {}, total: 0, aggr: [] }
        }
      });
    }
    const entry = map.get(key);
    const div = DIV_ORDER.includes(row.div) ? row.div : "Unknown";
    entry.counts[div] = (entry.counts[div] || 0) + 1;
    entry.total += 1;
    if (row.aggr !== null) entry.aggr.push(row.aggr);
    const sex = row.sex === "F" || row.sex === "M" ? row.sex : "U";
    entry.bySex[sex].counts[div] = (entry.bySex[sex].counts[div] || 0) + 1;
    entry.bySex[sex].total += 1;
    if (row.aggr !== null) entry.bySex[sex].aggr.push(row.aggr);
  });
  const rows = [];
  map.forEach((entry) => {
    const totalAll = entry.total;
    const xCount = entry.counts.X || 0;
    const totalAcademic = Math.max(0, totalAll - xCount);
    rows.push({
      name: entry.name,
      counts: entry.counts,
      totalAll,
      totalAcademic,
      avgAggr: mean(entry.aggr),
      bySex: {
        F: {
          ...entry.bySex.F,
          totalAll: entry.bySex.F.total,
          totalAcademic: Math.max(0, entry.bySex.F.total - (entry.bySex.F.counts.X || 0)),
          avgAggr: mean(entry.bySex.F.aggr)
        },
        M: {
          ...entry.bySex.M,
          totalAll: entry.bySex.M.total,
          totalAcademic: Math.max(0, entry.bySex.M.total - (entry.bySex.M.counts.X || 0)),
          avgAggr: mean(entry.bySex.M.aggr)
        },
        U: {
          ...entry.bySex.U,
          totalAll: entry.bySex.U.total,
          totalAcademic: Math.max(0, entry.bySex.U.total - (entry.bySex.U.counts.X || 0)),
          avgAggr: mean(entry.bySex.U.aggr)
        }
      }
    });
  });
  return rows;
}

function evaluateMetricValue(entry, config, successDivs, includeAbsentees) {
  const successCount = successDivs.reduce((sum, div) => sum + (entry.counts[div] || 0), 0);
  const topCount = entry.counts["1"] || 0;
  const atRiskCount = (entry.counts.U || 0) + (includeAbsentees ? (entry.counts.X || 0) : 0);
  const denominator = includeAbsentees ? entry.totalAll : entry.totalAcademic;

  const successRate = denominator ? (successCount / denominator) * 100 : 0;
  const topRate = denominator ? (topCount / denominator) * 100 : 0;
  const atRiskRate = denominator ? (atRiskCount / denominator) * 100 : 0;

  if (config.metric === "avg_aggregate") {
    return {
      value: entry.avgAggr ?? NaN,
      displayValue: entry.avgAggr === null || entry.avgAggr === undefined ? "—" : entry.avgAggr.toFixed(1),
      rawCount: entry.totalAll
    };
  }
  if (config.metric === "top_rate") {
    return {
      value: config.view === "count" ? topCount : topRate,
      displayValue: config.view === "count" ? formatNumber(topCount) : formatPercent(topRate),
      rawCount: topCount
    };
  }
  if (config.metric === "at_risk") {
    return {
      value: config.view === "count" ? atRiskCount : atRiskRate,
      displayValue: config.view === "count" ? formatNumber(atRiskCount) : formatPercent(atRiskRate),
      rawCount: atRiskCount
    };
  }
  return {
    value: config.view === "count" ? successCount : successRate,
    displayValue: config.view === "count" ? formatNumber(successCount) : formatPercent(successRate),
    rawCount: successCount
  };
}

function sortCustomRows(rows, config) {
  const sortDir = config.sortDir === "asc" ? 1 : -1;
  const sortBy = config.sortBy || "value";
  rows.sort((a, b) => {
    if (sortBy === "name") {
      return sortDir * a.label.localeCompare(b.label);
    }
    const aFinite = Number.isFinite(a.value);
    const bFinite = Number.isFinite(b.value);
    if (!aFinite && !bFinite) return a.label.localeCompare(b.label);
    if (!aFinite) return 1;
    if (!bFinite) return -1;
    const av = a.value;
    const bv = b.value;
    if (av === bv) return a.label.localeCompare(b.label);
    return sortDir * (av - bv);
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

  state.customCharts.forEach((config) => {
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

    const filtered = filterRecordsForConfig(records, config);
    if (!filtered.length) {
      renderChartEmpty(body, "No data for this configuration.");
      return;
    }

    const resolvedConfig = {
      type: config.type || "bar",
      metric: config.metric || "success_rate",
      groupBy: config.groupBy || "none",
      series: config.series || "none",
      view: config.view || "percent",
      limit: Number(config.limit || 10),
      sortBy: config.sortBy || "value",
      sortDir: config.sortDir || (config.metric === "avg_aggregate" ? "asc" : "desc"),
      showTable: config.showTable || "no",
      includeX: config.includeX || includeX?.value || "exclude"
    };

    const definition = successDefinition?.value || "standard";
    const includeAbsentees = resolvedConfig.includeX === "include";
    const successDivs = getSuccessDivisions(definition);

    if (resolvedConfig.metric === "division_distribution") {
      if (resolvedConfig.groupBy !== "none") {
        renderChartEmpty(body, "Division distribution only supports Group by: None.");
        return;
      }
      const counts = getDivisionCounts(filtered);
      const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
      const rows = DIV_ORDER.map((div) => {
        const value = counts[div] || 0;
        if (!value) return null;
        const label = div === "U" ? "U (Ungraded)" : div === "X" ? "X (Missing)" : div === "Unknown" ? "Unknown" : `Div ${div}`;
        return {
          label,
          value: resolvedConfig.view === "percent" ? (total ? (value / total) * 100 : 0) : value,
          displayValue: resolvedConfig.view === "percent" ? formatPercent(total ? (value / total) * 100 : 0) : formatNumber(value),
          color: DIV_COLORS[div] || DIV_COLORS.Unknown
        };
      }).filter(Boolean);
      const sortedRows = applyCustomLimit(sortCustomRows(rows, resolvedConfig), resolvedConfig.limit);
      renderBars(body, sortedRows, { valueFormatter: resolvedConfig.view === "percent" ? formatPercent : formatNumber });
      if (resolvedConfig.showTable === "yes") {
        appendCustomDataTable(
          card,
          ["Division", resolvedConfig.view === "percent" ? "Percent" : "Count"],
          sortedRows.map((row) => [row.label, row.displayValue])
        );
      }
      return;
    }

    if (resolvedConfig.metric === "subject_mix") {
      if (resolvedConfig.groupBy !== "none") {
        renderChartEmpty(body, "Subject mix only supports Group by: None.");
        return;
      }
      const rows = Object.entries(SUBJECT_LABELS).map(([key, label]) => {
        const buckets = buildSubjectBuckets(filtered, key);
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
      renderDistributionBars(body, rows);
      if (resolvedConfig.showTable === "yes") {
        appendCustomDataTable(
          card,
          ["Subject", "Distinction", "Credit", "Pass", "Fail", "Missing"],
          rows.map((row) => {
            const values = row.segments.reduce((acc, segment) => ({ ...acc, [segment.label]: segment.value }), {});
            return [
              row.label,
              formatNumber(values["Distinction (1-2)"] || 0),
              formatNumber(values["Credit (3-6)"] || 0),
              formatNumber(values["Pass (7-8)"] || 0),
              formatNumber(values["Fail (9)"] || 0),
              formatNumber(values["Missing/X"] || 0)
            ];
          })
        );
      }
      return;
    }

    const groupRows = buildGroupStats(filtered, resolvedConfig.groupBy);

    if (resolvedConfig.series === "sex" && resolvedConfig.type === "stacked") {
      const stackedRows = groupRows.map((groupEntry) => {
        const femaleMetric = evaluateMetricValue(groupEntry.bySex.F, resolvedConfig, successDivs, includeAbsentees);
        const maleMetric = evaluateMetricValue(groupEntry.bySex.M, resolvedConfig, successDivs, includeAbsentees);
        const overallMetric = evaluateMetricValue(groupEntry, resolvedConfig, successDivs, includeAbsentees);
        return {
          label: groupEntry.name,
          sortValue: overallMetric.value,
          female: femaleMetric,
          male: maleMetric
        };
      });
      stackedRows.sort((a, b) => {
        const sortDir = resolvedConfig.sortDir === "asc" ? 1 : -1;
        if (resolvedConfig.sortBy === "name") {
          return sortDir * a.label.localeCompare(b.label);
        }
        const aFinite = Number.isFinite(a.sortValue);
        const bFinite = Number.isFinite(b.sortValue);
        if (!aFinite && !bFinite) return a.label.localeCompare(b.label);
        if (!aFinite) return 1;
        if (!bFinite) return -1;
        const av = a.sortValue;
        const bv = b.sortValue;
        if (av === bv) return a.label.localeCompare(b.label);
        return sortDir * (av - bv);
      });
      const limitedStackedRows = applyCustomLimit(stackedRows, resolvedConfig.limit);
      renderStackedBars(
        body,
        limitedStackedRows.map((item) => ({
          label: item.label,
          total: (Number.isFinite(item.female.value) ? item.female.value : 0) + (Number.isFinite(item.male.value) ? item.male.value : 0),
          segments: [
            { label: "Female", value: Number.isFinite(item.female.value) ? item.female.value : 0, color: COLORS.female },
            { label: "Male", value: Number.isFinite(item.male.value) ? item.male.value : 0, color: COLORS.male }
          ]
        })),
        {
          valueFormatter: resolvedConfig.metric === "avg_aggregate"
            ? formatNumber
            : resolvedConfig.view === "count"
              ? formatNumber
              : formatPercent
        }
      );
      if (resolvedConfig.showTable === "yes") {
        appendCustomDataTable(
          card,
          ["Group", "Female", "Male"],
          limitedStackedRows.map((item) => [item.label, item.female.displayValue, item.male.displayValue])
        );
      }
      return;
    }

    let rows = groupRows.map((groupEntry) => {
      const metric = evaluateMetricValue(groupEntry, resolvedConfig, successDivs, includeAbsentees);
      return { label: groupEntry.name, value: metric.value, displayValue: metric.displayValue };
    });

    if (resolvedConfig.series === "sex") {
      rows = [];
      groupRows.forEach((groupEntry) => {
        const femaleMetric = evaluateMetricValue(groupEntry.bySex.F, resolvedConfig, successDivs, includeAbsentees);
        const maleMetric = evaluateMetricValue(groupEntry.bySex.M, resolvedConfig, successDivs, includeAbsentees);
        rows.push({
          label: `${groupEntry.name} - Female`,
          value: femaleMetric.value,
          displayValue: femaleMetric.displayValue,
          color: COLORS.female
        });
        rows.push({
          label: `${groupEntry.name} - Male`,
          value: maleMetric.value,
          displayValue: maleMetric.displayValue,
          color: COLORS.male
        });
      });
    }

    const sortedRows = applyCustomLimit(sortCustomRows(rows, resolvedConfig), resolvedConfig.limit);

    if (resolvedConfig.type === "donut") {
      if (resolvedConfig.groupBy !== "none") {
        renderChartEmpty(body, "Donut charts require Group by: None.");
        return;
      }
      if (resolvedConfig.series !== "none") {
        renderChartEmpty(body, "Donut charts do not support series split.");
        return;
      }
      if (resolvedConfig.view === "count" || resolvedConfig.metric === "avg_aggregate") {
        renderChartEmpty(body, "Donut charts require percent-based metrics.");
        return;
      }
      const value = sortedRows[0]?.value ?? 0;
      const donut = document.createElement("div");
      donut.className = "kpi-donut";
      donut.style.setProperty("--kpi-value", Math.min(1, Math.max(0, value / 100)));
      donut.style.setProperty("--kpi-color", COLORS.accent);
      body.appendChild(donut);
      const note = document.createElement("div");
      note.className = "chart-note";
      note.textContent = sortedRows[0]?.displayValue ?? "—";
      body.appendChild(note);
      if (resolvedConfig.showTable === "yes") {
        appendCustomDataTable(
          card,
          ["Category", "Value"],
          sortedRows.slice(0, 1).map((row) => [row.label, row.displayValue])
        );
      }
      return;
    }

    const formatter = resolvedConfig.metric === "avg_aggregate"
      ? formatNumber
      : resolvedConfig.view === "count"
        ? formatNumber
        : formatPercent;
    renderBars(body, sortedRows, { valueFormatter: formatter });
    if (resolvedConfig.series === "sex" && resolvedConfig.showTable === "yes") {
      appendCustomDataTable(
        card,
        ["Label", "Value"],
        sortedRows.map((row) => [row.label, row.displayValue])
      );
    } else if (resolvedConfig.showTable === "yes") {
      appendCustomDataTable(
        card,
        ["Label", "Value"],
        sortedRows.map((row) => [row.label, row.displayValue])
      );
    }
  });
}

function renderGapChart(records) {
  if (!gapChart) return;
  const rows = buildDistinctionGap(records).map((row) => ({
    label: SUBJECT_LABELS[row.subject],
    female: row.female,
    male: row.male
  }));
  renderDumbbell(gapChart, rows, { empty: "No gender gap data available." });
  renderLegend(gapLegend, [
    { label: "Female", color: COLORS.female },
    { label: "Male", color: COLORS.male }
  ]);
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

function renderInterventionList(records, limit = 10) {
  if (!interventionList) return;
  interventionList.innerHTML = "";
  if (!records.length) {
    interventionList.innerHTML = "<div class='chart-empty'>No data available.</div>";
    return;
  }
  const flagged = records
    .map((row) => {
      const subjectIssues = [];
      if (row.eng !== null && row.eng >= 9) subjectIssues.push("ENG 9");
      if (row.sci !== null && row.sci >= 9) subjectIssues.push("SCI 9");
      if (row.sst !== null && row.sst >= 9) subjectIssues.push("SST 9");
      if (row.math !== null && row.math >= 9) subjectIssues.push("MATH 9");
      const divIssue = row.div === "U" ? "DIV U" : "";
      const issues = [divIssue, ...subjectIssues].filter(Boolean);
      return issues.length
        ? { name: row.learnerName || row.indexNo || "Unknown learner", school: row.schoolName || "", div: row.div || "", issues, aggr: row.aggr }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.div !== b.div) return a.div === "U" ? -1 : 1;
      return (b.aggr || 0) - (a.aggr || 0);
    })
    .slice(0, limit);

  if (!flagged.length) {
    interventionList.innerHTML = "<div class='chart-empty'>No learners flagged.</div>";
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Learner", "School", "Division", "Flags"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  flagged.forEach((row) => {
    const tr = document.createElement("tr");
    [row.name, row.school, row.div || "—", row.issues.join(", ")].forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  interventionList.appendChild(table);
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
    renderInterventionList([]);
    renderChartEmpty(exploreChart, "Load a workbook to explore results.");
    renderCustomCharts([]);
    return;
  }
  enableDashboardExports(true);
  renderDashboardKpis(records);
  renderDivisionChart(records);
  renderSubjectChart(records);
  renderParityChart(records);
  renderSchoolChart(records);
  renderGapChart(records);
  renderHeatmap(records);
  renderScatter(records);
  renderInterventionList(records);
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

[customType, customMetric, customGroup, customSeries, customView, customIncludeX, customYear, customSex, customSchool, customLimit, customSortBy, customSortDir, customShowTable].forEach((el) => {
  if (!el) return;
  el.addEventListener("change", () => {
    if (customHint) customHint.textContent = "";
  });
});

const refreshButton = document.getElementById("refresh");
if (refreshButton) refreshButton.addEventListener("click", loadPreview);
const mappingRefresh = document.getElementById("mapping-refresh");
if (mappingRefresh) mappingRefresh.addEventListener("click", loadPreview);

if (rememberSessionToggle) {
  rememberSessionToggle.addEventListener("change", () => {
    if (!rememberSessionToggle.checked) {
      clearSavedSession();
      setSessionStatus("Saving disabled for future sessions.", "info");
      return;
    }
    scheduleSessionSave();
  });
}

if (clearSessionBtn) {
  clearSessionBtn.addEventListener("click", async () => {
    await clearSavedSession();
    if (rememberSessionToggle) rememberSessionToggle.checked = false;
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
if (exportInterventionBtn) {
  exportInterventionBtn.addEventListener("click", () => exportElementAsPng(interventionList?.closest(".chart-card"), "intervention-required"));
}

if (customAdd) {
  customAdd.addEventListener("click", () => {
    const config = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: customType?.value || "bar",
      metric: customMetric?.value || "success_rate",
      groupBy: customGroup?.value || "none",
      series: customSeries?.value || "none",
      view: customView?.value || "percent",
      includeX: customIncludeX?.value || "exclude",
      year: customYear?.value || "all",
      sex: customSex?.value || "all",
      school: customSchool?.value || "",
      limit: Number(customLimit?.value || 10),
      sortBy: customSortBy?.value || "value",
      sortDir: customSortDir?.value || "desc",
      showTable: customShowTable?.value || "no",
      title: (customTitle?.value || "").trim()
    };

    const metricLabel = customMetric?.selectedOptions?.[0]?.textContent || "Metric";
    const groupLabel = customGroup?.selectedOptions?.[0]?.textContent || "Overall";
    config.title = config.title || `${metricLabel} (${groupLabel})`;
    const seriesLabel = customSeries?.selectedOptions?.[0]?.textContent || "None";
    config.subtitle = `Type: ${config.type} • View: ${config.view} • Series: ${seriesLabel}`;

    if (customHint) customHint.textContent = "Visualization added below.";
    state.customCharts.unshift(config);
    renderCustomCharts(state.records);
    scheduleSessionSave();
  });
}

if (customiseToggle) {
  customiseToggle.addEventListener("click", () => {
    const target = document.getElementById("custom-builder");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

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
    renderDashboard(state.records);
    return;
  }
  const result = await window.api.loadDashboardSession();
  if (!result || !result.ok || !result.session) {
    renderDashboard(state.records);
    return;
  }
  const session = result.session;
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

  if (session.savedAt) {
    const label = new Date(session.savedAt).toLocaleString();
    setSessionStatus(`Restored saved job from ${label}.`, "info");
  } else {
    setSessionStatus("Restored saved job.", "info");
  }
}

restoreSession();
