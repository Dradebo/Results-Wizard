const state = {
  pdfs: [],
  output: null,
  orgUnits: null,
  workbookPath: null,
  preview: {},
  sheetNames: []
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
}

sheetSelect.addEventListener("change", (event) => {
  renderPreview(event.target.value);
});

const refreshButton = document.getElementById("refresh");
if (refreshButton) refreshButton.addEventListener("click", loadPreview);
const mappingRefresh = document.getElementById("mapping-refresh");
if (mappingRefresh) mappingRefresh.addEventListener("click", loadPreview);


// Buttons

document.getElementById("pick-pdfs").addEventListener("click", async () => {
  const files = await window.api.selectPdfs();
  state.pdfs = files;
  renderFileList(pdfList, state.pdfs, "No PDFs selected.");
});

document.getElementById("pick-output").addEventListener("click", async () => {
  const output = await window.api.selectOutput();
  state.output = output;
  setSinglePath(outputPath, state.output, "No output selected.");
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
});

const conversionProgress = document.getElementById("conversion-progress");
const conversionProgressFill = document.getElementById("conversion-progress-fill");

const goMapping = document.getElementById("go-mapping");
if (goMapping) goMapping.addEventListener("click", () => setStep("mapping"));

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
