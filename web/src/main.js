import { convertPdfsToWorkbook } from "./pdfToWorkbook.js";

const state = {
  files: [],
  workbook: null,
  previews: {},
  summary: null,
  buffer: null
};

const steps = document.querySelectorAll(".step");
const panels = document.querySelectorAll(".panel");
const pdfInput = document.getElementById("pdf-input");
const pdfList = document.getElementById("pdf-list");
const statusEl = document.getElementById("status");
const runBtn = document.getElementById("run");
const downloadBtn = document.getElementById("download");
const downloadHint = document.getElementById("download-hint");
const progressBar = document.getElementById("conversion-progress");
const progressFill = document.getElementById("conversion-progress-fill");
const sheetSelect = document.getElementById("sheet-select");
const previewTable = document.getElementById("preview-table");
const previewSize = document.getElementById("preview-size");
const refreshBtn = document.getElementById("refresh");
const summaryEl = document.getElementById("summary");
const qaNote = document.getElementById("qa-note");

function setStep(step) {
  steps.forEach((btn) => btn.classList.toggle("active", btn.dataset.step === step));
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === step));
}

steps.forEach((btn) => btn.addEventListener("click", () => setStep(btn.dataset.step)));

function renderFileList(files) {
  if (!files || !files.length) {
    pdfList.textContent = "No PDFs selected.";
    pdfList.classList.add("empty");
    return;
  }
  pdfList.classList.remove("empty");
  pdfList.innerHTML = files.map((file) => `<div>${file.name}</div>`).join("");
}

function setStatus(message, tone = "info") {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function setProgress(current, total) {
  if (!progressBar || !progressFill) return;
  progressBar.classList.remove("hidden");
  const percent = total ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;
  progressFill.style.width = `${percent}%`;
  if (percent >= 100) {
    setTimeout(() => progressBar.classList.add("hidden"), 400);
  }
}

function renderSummary(summary) {
  if (!summaryEl) return;
  summaryEl.innerHTML = "";
  const cards = [
    { label: "Learners", value: summary?.learners ?? 0 },
    { label: "QA Rows", value: summary?.qaRows ?? 0 },
    { label: "Unmatched", value: summary?.unmatchedSchools ?? 0 }
  ];
  Object.entries(summary?.pivotTotals || {}).forEach(([label, value]) => {
    cards.push({ label, value });
  });
  cards.forEach((item) => {
    const div = document.createElement("div");
    div.className = "summary-card";
    div.innerHTML = `<span>${item.label}</span>${item.value}`;
    summaryEl.appendChild(div);
  });
  if (qaNote) {
    const qa = summary?.qaRows ?? 0;
    qaNote.textContent = qa
      ? `${qa} QA rows captured — skim these before import.`
      : "No QA rows detected.";
  }
}

function renderPreview(sheetName) {
  const preview = state.previews[sheetName];
  if (!preview) return;
  const headers = preview.headers || [];
  const rows = preview.rows || [];
  previewTable.innerHTML = "";

  if (!headers.length) {
    previewTable.innerHTML = "<tr><td>No data.</td></tr>";
    previewSize.textContent = "0 rows";
    return;
  }

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((cell) => {
    const th = document.createElement("th");
    th.textContent = cell;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    headers.forEach((_, idx) => {
      const td = document.createElement("td");
      td.textContent = row[idx] ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  previewTable.appendChild(thead);
  previewTable.appendChild(tbody);
  previewSize.textContent = `${rows.length} rows (first 30 shown)`;
}

function populateSheets() {
  sheetSelect.innerHTML = "";
  Object.keys(state.previews).forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    sheetSelect.appendChild(option);
  });
  const defaultSheet = sheetSelect.options[0]?.value;
  if (defaultSheet) {
    sheetSelect.value = defaultSheet;
    renderPreview(defaultSheet);
  }
}

async function handleRun() {
  if (!state.files.length) {
    setStatus("Select at least one PDF first.", "error");
    return;
  }
  setStatus("Parsing PDFs…", "info");
  downloadBtn.disabled = true;
  downloadHint.textContent = "Working…";
  setProgress(0, 1);

  try {
    const { workbook, previews, summary } = await convertPdfsToWorkbook(state.files, (current, total) => {
      setProgress(current, total);
      setStatus(`Processing ${current}/${total} PDF(s)…`, "info");
    });
    state.workbook = workbook;
    state.previews = previews;
    state.summary = summary;
    setStatus("Conversion complete.", "success");
    downloadBtn.disabled = false;
    downloadHint.textContent = "Ready to download.";
    populateSheets();
    renderSummary(summary);
    setStep("review");
  } catch (err) {
    console.error(err);
    setStatus(err?.message || "Conversion failed.", "error");
  } finally {
    setProgress(1, 1);
  }
}

async function handleDownload() {
  if (!state.workbook) return;
  downloadBtn.disabled = true;
  downloadHint.textContent = "Building workbook…";
  const buffer = await state.workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ple_import_prep.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  downloadHint.textContent = "Workbook downloaded.";
  downloadBtn.disabled = false;
}

pdfInput.addEventListener("change", (event) => {
  state.files = Array.from(event.target.files || []);
  renderFileList(state.files);
  setStatus(state.files.length ? `Ready to run (${state.files.length} file${state.files.length === 1 ? "" : "s"}).` : "Ready.");
});

runBtn.addEventListener("click", handleRun);
downloadBtn.addEventListener("click", handleDownload);
refreshBtn.addEventListener("click", () => {
  const sheet = sheetSelect.value;
  if (sheet) renderPreview(sheet);
});
sheetSelect.addEventListener("change", (e) => renderPreview(e.target.value));

// Default step
setStep("ingest");
setStatus("Ready.");
renderFileList([]);
