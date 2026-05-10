import { convertPdfsToWorkbook } from "./pdfToWorkbook.js";

const state = {
  files: [],
  workbook: null,
  previews: {},
  summary: null,
  buffer: null,
  leads: JSON.parse(localStorage.getItem("rw-leads") || "[]")
};

const learners = [
  { name: "Nakato Sarah", initials: "Nakato S.", class: "P7", stream: "A", subjects: "8/8", status: "approved", action: "Preview", method: "WhatsApp", viewed: "Viewed 2h ago" },
  { name: "Kato Daniel", initials: "Kato D.", class: "P7", stream: "A", subjects: "7/8", status: "needs-review", action: "Fix marks", method: "SMS", viewed: "Not sent" },
  { name: "Achieng Maria", initials: "Achieng M.", class: "P7", stream: "B", subjects: "8/8", status: "approved", action: "Preview", method: "Email", viewed: "Viewed yesterday" },
  { name: "Mugisha Paul", initials: "Mugisha P.", class: "P7", stream: "B", subjects: "6/8", status: "error", action: "Resolve", method: "Printed code", viewed: "Blocked" },
  { name: "Namutebi Joy", initials: "Namutebi J.", class: "P6", stream: "A", subjects: "8/8", status: "published", action: "Open link", method: "WhatsApp", viewed: "Viewed 4h ago" },
  { name: "Okello Brian", initials: "Okello B.", class: "S2", stream: "East", subjects: "10/10", status: "viewed", action: "Resend", method: "SMS", viewed: "Viewed today" },
  { name: "Namugenyi Ruth", initials: "Namugenyi R.", class: "S1", stream: "North", subjects: "9/10", status: "needs-review", action: "Add comment", method: "Email", viewed: "Draft" }
];

const batches = [
  { title: "Primary 7 Term 1 Reports", meta: "89 learners - Parent links published", status: "published" },
  { title: "Senior 2 CBC Midterm", meta: "142 learners - Descriptor review in progress", status: "needs-review" },
  { title: "PLE Mock Results", meta: "76 learners - Ready for parent preview", status: "approved" },
  { title: "Primary 5 End of Term", meta: "118 learners - Missing 2 class comments", status: "error" }
];

const teacherSubmissions = [
  { teacher: "Mr. Ssemakula", subject: "Mathematics", className: "P7 Blue", submitted: "Submitted", missing: "3 learners missing marks", status: "needs-review" },
  { teacher: "Ms. Atim", subject: "English", className: "P7 Blue", submitted: "Not submitted", missing: "Full class pending", status: "error" },
  { teacher: "Mr. Okello", subject: "Science", className: "P7 Blue", submitted: "Submitted", missing: "Comments needed", status: "needs-review" },
  { teacher: "Ms. Namusoke", subject: "Social Studies", className: "P7 Blue", submitted: "Ready", missing: "No gaps", status: "approved" },
  { teacher: "Class Teacher", subject: "Conduct and attendance", className: "P7 Blue", submitted: "Ready", missing: "No gaps", status: "approved" }
];

const missingMarks = [
  { learner: "Kato Daniel", className: "P7 Blue", issue: "Mathematics mark missing", owner: "Mr. Ssemakula" },
  { learner: "Mugisha Paul", className: "P7 Blue", issue: "English mark missing", owner: "Ms. Atim" },
  { learner: "Namutebi Joy", className: "P7 Blue", issue: "Science comment missing", owner: "Mr. Okello" },
  { learner: "Achieng Maria", className: "P7 Blue", issue: "Attendance not filled", owner: "Class Teacher" }
];

const reportTemplates = {
  primary: {
    overall: "Distinction 1",
    notes: [
      ["Primary term report", "Subjects, marks, grades, aggregate, attendance, conduct, class teacher comment, head teacher comment, and next-term notice."],
      ["Default privacy", "Position and rank can be hidden unless the school explicitly enables them."]
    ],
    rows: [
      ["Mathematics", "92", "D1"],
      ["English", "81", "D2"],
      ["Science", "88", "D1"],
      ["Social Studies", "84", "D2"]
    ]
  },
  cbc: {
    overall: "Outstanding",
    notes: [
      ["CBC competency report", "Competencies, score out of 3, descriptor, generic skills, values, subject teacher remarks, and attendance."],
      ["Parent clarity", "Descriptors are explained in plain language so parents understand the report."]
    ],
    rows: [
      ["Mathematics competency", "2.8", "Outstanding"],
      ["English communication", "2.4", "Moderate"],
      ["Generic skills", "2.6", "Outstanding"],
      ["Values and conduct", "2.5", "Outstanding"]
    ]
  },
  ple: {
    overall: "Division 1",
    notes: [
      ["PLE summary", "Index number, subject grades, aggregate, division, school verification, and school performance summary."],
      ["General product", "PLE is one report type. The same parent link works for term reports, mock exams, and school assessments."]
    ],
    rows: [
      ["English", "2", "Distinction"],
      ["Mathematics", "1", "Distinction"],
      ["Science", "2", "Distinction"],
      ["Social Studies", "2", "Distinction"]
    ]
  },
  secondary: {
    overall: "Grade A",
    notes: [
      ["Secondary marksheet", "Coursework, end-of-term exam, total, grade, teacher remarks, and stream comparison."],
      ["Flexible columns", "Schools can keep their own grading scales and report language."]
    ],
    rows: [
      ["Mathematics", "87", "A"],
      ["English", "78", "B+"],
      ["Biology", "82", "A"],
      ["History", "74", "B"]
    ]
  },
  minimal: {
    overall: "Approved",
    notes: [
      ["Minimal parent link", "A clean official result summary for schools that only want secure result communication first."],
      ["Upgrade path", "Detailed analytics and branded report cards can be added after the first pilot."]
    ],
    rows: [
      ["Overall average", "84%", "Approved"],
      ["Teacher review", "Complete", "Approved"],
      ["School verification", "Published", "Official"]
    ]
  }
};

const charts = {
  division: [
    ["Distinction", 42],
    ["Credit", 31],
    ["Pass", 18],
    ["Needs support", 9]
  ],
  subjects: [
    ["Mathematics", 82],
    ["Science", 79],
    ["English", 71],
    ["Social Studies", 76]
  ],
  streams: [
    ["P7A", 84],
    ["P7B", 78],
    ["P6A", 74],
    ["S2 East", 69]
  ]
};

const steps = ["Upload", "Detect", "Map", "Validate", "Preview", "Publish"];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function statusLabel(status) {
  return status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function setView(view) {
  $$(".view").forEach((panel) => panel.classList.toggle("active", panel.id === view));
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.body.dataset.view = view;
  const target = document.getElementById(view);
  if ($("#page-title") && target?.dataset.title) $("#page-title").textContent = target.dataset.title;
}

function renderBatches() {
  const list = $("#batch-list");
  if (!list) return;
  list.innerHTML = batches.map((batch) => `
    <div class="batch-item">
      <div>
        <div class="batch-title">${batch.title}</div>
        <div class="batch-meta">${batch.meta}</div>
      </div>
      <span class="status-pill status-${batch.status}">${statusLabel(batch.status)}</span>
    </div>
  `).join("");
}

function renderStepper(activeIndex = 0) {
  const stepper = $("#batch-stepper");
  if (!stepper) return;
  stepper.innerHTML = steps.map((step, index) => `
    <div class="step-node ${index <= activeIndex ? "active" : ""}">
      <span>Step ${index + 1}</span>
      <strong>${step}</strong>
    </div>
  `).join("");
}

function renderTeacherSubmissions() {
  const target = $("#teacher-submissions");
  if (!target) return;
  target.innerHTML = teacherSubmissions.map((item) => `
    <div class="teacher-row">
      <div>
        <strong>${item.subject}</strong>
        <span>${item.teacher} - ${item.className}</span>
      </div>
      <div>
        <span class="status-pill status-${item.status}">${item.submitted}</span>
        <small>${item.missing}</small>
      </div>
    </div>
  `).join("");
}

function renderMissingMarks() {
  const target = $("#missing-marks");
  if (!target) return;
  target.innerHTML = missingMarks.map((item) => `
    <button class="missing-row" data-view-trigger="review">
      <strong>${item.learner}</strong>
      <span>${item.issue}</span>
      <small>${item.className} - ${item.owner}</small>
    </button>
  `).join("");
}

function renderReviewTable() {
  const body = $("#review-table-body");
  const query = ($("#review-search")?.value || "").toLowerCase();
  const filter = $("#review-status")?.value || "all";
  const classFilter = $("#review-class")?.value || "all";
  if (!body) return;

  const rows = learners.filter((learner) => {
    const matchesQuery = learner.name.toLowerCase().includes(query) || `${learner.class} ${learner.stream}`.toLowerCase().includes(query);
    const matchesFilter = filter === "all" || learner.status === filter;
    const matchesClass = classFilter === "all" || `${learner.class}-${learner.stream}` === classFilter;
    return matchesQuery && matchesFilter && matchesClass;
  });

  body.innerHTML = rows.map((learner) => `
    <tr>
      <td><strong>${learner.name}</strong><br><span class="batch-meta">Fictional demo learner</span></td>
      <td>${learner.class}</td>
      <td>${learner.stream}</td>
      <td>${learner.subjects}</td>
      <td><span class="status-pill status-${learner.status}">${statusLabel(learner.status)}</span></td>
      <td><button class="ghost" data-view-trigger="parent">${learner.action}</button></td>
    </tr>
  `).join("");
}

function renderLinksTable() {
  const body = $("#links-table-body");
  const query = ($("#links-search")?.value || "").toLowerCase();
  const filter = $("#links-status")?.value || "all";
  if (!body) return;
  body.innerHTML = learners.filter((learner, index) => {
    const status = learner.status === "approved" ? "sent" : learner.status;
    const matchesQuery = learner.name.toLowerCase().includes(query) || `${learner.class} ${learner.stream}`.toLowerCase().includes(query);
    const matchesFilter = filter === "all" || status === filter;
    return matchesQuery && matchesFilter;
  }).map((learner, index) => {
    const status = learner.status === "approved" ? "sent" : learner.status;
    const accessCode = `RW-${learner.class}-${learner.stream}`.replace(/\s+/g, "-").toUpperCase() + `-${String(index + 1).padStart(3, "0")}`;
    return `
      <tr>
        <td><strong>${learner.initials}</strong><br><span class="batch-meta">${learner.name}</span></td>
        <td>${learner.class} ${learner.stream}</td>
        <td><span class="status-pill status-${status}">${statusLabel(status)}</span></td>
        <td>${learner.method}</td>
        <td><span class="pill code-pill">${accessCode}</span></td>
        <td>${learner.viewed}</td>
        <td>
          <button class="ghost">Resend</button>
          <button class="ghost">Revoke</button>
          <button class="ghost">Regenerate</button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderTemplate(templateKey = "primary") {
  const template = reportTemplates[templateKey] || reportTemplates.primary;
  const notes = $("#template-notes");
  const body = $("#parent-result-body");
  if ($("#parent-overall")) $("#parent-overall").textContent = template.overall;
  if ($("#template-choice-label")) $("#template-choice-label").textContent = $("#report-template")?.selectedOptions?.[0]?.textContent || "Primary term report";

  if (notes) {
    notes.innerHTML = template.notes.map(([title, copy]) => `
      <div class="template-note">
        <strong>${title}</strong>
        <p>${copy}</p>
      </div>
    `).join("");
  }

  if (body) {
    body.innerHTML = `
      <div class="${templateKey === "cbc" ? "competency-list" : "result-list"}">
        ${template.rows.map(([subject, score, grade]) => `
          <div class="${templateKey === "cbc" ? "competency-row" : "result-row"}">
            <div>
              <strong>${subject}</strong>
              <span>${templateKey === "cbc" ? "Competency descriptor" : "Reviewed and approved"}</span>
            </div>
            <div class="score-pill">${score}<br><span>${grade}</span></div>
          </div>
        `).join("")}
      </div>
    `;
  }
}

function renderCharts() {
  renderBarChart("#division-chart", charts.division);
  renderBarChart("#subject-chart", charts.subjects);
  renderBarChart("#school-chart", charts.streams);
  const legend = $("#division-legend");
  if (legend) legend.textContent = "Aggregate view only. No learner names in this chart.";
  const subjectLegend = $("#subject-legend");
  if (subjectLegend) subjectLegend.textContent = "Use this for subject support planning and custom analytics reports.";
  const subjectNote = $("#subject-note");
  if (subjectNote) subjectNote.textContent = "Public-safe snapshots should use aggregate claims, not named learner rankings.";
}

function renderBarChart(selector, rows) {
  const target = $(selector);
  if (!target) return;
  target.innerHTML = rows.map(([label, value]) => `
    <div class="chart-row">
      <strong>${label}</strong>
      <div class="chart-track"><i class="chart-bar" style="width:${value}%"></i></div>
      <span class="chart-value">${value}%</span>
    </div>
  `).join("");
}

function renderSummary(summary = state.summary) {
  const target = $("#summary");
  if (!target) return;
  const readyLinks = learners.filter((learner) => ["approved", "published", "viewed"].includes(learner.status)).length;
  const cards = [
    ["Learners", summary?.learners ?? 89],
    ["QA rows", summary?.qaRows ?? 3],
    ["Unmatched", summary?.unmatchedSchools ?? 0],
    ["Ready links", summary?.readyLinks ?? readyLinks]
  ];
  target.innerHTML = cards.map(([label, value]) => `
    <div class="summary-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderPreview(previews = state.previews) {
  const select = $("#sheet-select");
  const table = $("#preview-table");
  const previewSize = $("#preview-size");
  if (!select || !table) return;

  const fallback = {
    marksheet: {
      headers: ["Learner", "Class", "Math", "English", "Science", "Report status"],
      rows: [
        ["Nakato Sarah", "P7A", "92", "81", "88", "Approved"],
        ["Kato Daniel", "P7A", "", "76", "79", "Needs review"],
        ["Achieng Maria", "P7B", "84", "86", "82", "Approved"],
        ["Mugisha Paul", "P7B", "70", "", "73", "Error"]
      ]
    }
  };

  const source = Object.keys(previews || {}).length ? previews : fallback;
  const currentName = select.value && source[select.value] ? select.value : Object.keys(source)[0];
  select.innerHTML = Object.keys(source).map((name) => `<option value="${name}">${name}</option>`).join("");
  select.value = currentName;

  const current = source[currentName];
  const headers = current.headers || [];
  const rows = current.rows || [];
  table.innerHTML = `
    <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
  `;
  if (previewSize) previewSize.textContent = `${rows.length} reports shown`;
}

function setStatus(message, tone = "info") {
  const status = $("#status");
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
}

function setProgress(current, total) {
  const bar = $("#conversion-progress");
  const fill = $("#conversion-progress-fill");
  if (!bar || !fill) return;
  bar.classList.remove("hidden");
  const percent = total ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;
  fill.style.width = `${percent}%`;
  if (percent >= 100) setTimeout(() => bar.classList.add("hidden"), 450);
}

function renderFileList(files) {
  const list = $("#pdf-list");
  if (!list) return;
  if (!files.length) {
    list.textContent = "No files selected.";
    list.classList.add("empty");
    return;
  }
  list.classList.remove("empty");
  list.innerHTML = files.map((file) => `<div>${file.name}</div>`).join("");
}

async function runConversion() {
  if (!state.files.length) {
    setStatus("Add a marks file first, or use the sample workflow shown below.", "error");
    setView("batch");
    return;
  }

  try {
    setStatus("Checking marks and looking for missing entries...");
    renderStepper(2);
    const result = await convertPdfsToWorkbook(state.files, setProgress);
    state.workbook = result.workbook;
    state.previews = result.previews;
    state.summary = result.summary;
    state.buffer = await result.workbook.xlsx.writeBuffer();
    renderPreview();
    renderSummary();
    renderStepper(4);
    $("#download")?.removeAttribute("disabled");
    $("#download-review")?.removeAttribute("disabled");
    $("#download-dashboard")?.removeAttribute("disabled");
    if ($("#download-hint")) $("#download-hint").textContent = "Results are ready for school review before parent links are sent.";
    setStatus("Marks checked. Review the report list before sending links.", "success");
    setView("review");
  } catch (error) {
    console.error(error);
    setStatus(`Marks could not be checked: ${error.message || error}`, "error");
  }
}

function downloadWorkbook() {
  if (!state.buffer) return;
  const blob = new Blob([state.buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "results-wizard-reviewed-workbook.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

function downloadMarksTemplate() {
  const rows = [
    ["Learner name", "Class", "Stream", "Subject", "Mark", "Grade", "Teacher comment", "Attendance", "Conduct", "Class teacher comment", "Head teacher comment", "Parent phone"],
    ["Nakato Sarah", "P7", "Blue", "Mathematics", "92", "D1", "Excellent reasoning", "64/66", "Very good", "Keep strengthening comprehension.", "Excellent progress this term.", "+256700000001"],
    ["Kato Daniel", "P7", "Blue", "English", "76", "C3", "Good effort", "62/66", "Good", "Needs more reading practice.", "Steady improvement.", "+256700000002"]
  ];
  const csv = rows.map((row) => row.map((cell) => JSON.stringify(cell)).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "results-wizard-teacher-marks-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function saveLead(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  state.leads.push({ ...data, createdAt: new Date().toISOString() });
  localStorage.setItem("rw-leads", JSON.stringify(state.leads));
  form.reset();
  const status = $("#lead-status");
  if (status) status.textContent = "Thank you. Your school interest has been saved in this demo.";
}

function exportLeads() {
  const rows = state.leads.length ? state.leads : [{
    school: "Demo Primary School",
    contact: "Head Teacher",
    phone: "+256 700 000000",
    email: "",
    interest: "Analytics Plus - UGX 1,000,000 / term",
    message: "We want parent result links and school analytics.",
    createdAt: new Date().toISOString()
  }];
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "results-wizard-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function populateReviewClassOptions() {
  const select = $("#review-class");
  if (!select) return;
  const current = select.value || "all";
  const options = Array.from(new Set(learners.map((learner) => `${learner.class}-${learner.stream}`)));
  select.innerHTML = [
    '<option value="all">All classes</option>',
    ...options.map((value) => `<option value="${value}">${value.replace("-", " ")}</option>`)
  ].join("");
  select.value = options.includes(current) ? current : "all";
}

function bulkApproveReady() {
  learners.forEach((learner) => {
    if (learner.status === "needs-review") {
      learner.status = "approved";
      learner.action = "Preview";
      learner.viewed = "Ready to send";
    }
  });
  renderReviewTable();
  renderLinksTable();
  renderSummary();
  const note = $("#qa-note");
  if (note) note.textContent = "Ready rows were bulk-approved for demo purposes. Remaining errors still block publishing.";
}

function exportBoardSnapshot() {
  if (state.buffer) {
    downloadWorkbook();
    return;
  }
  const note = $("#custom-fields");
  if (note) note.textContent = "Upload and review a real batch first, then export the workbook or board snapshot from this analytics view.";
}

function customiseAnalyticsPack() {
  const note = $("#custom-fields");
  if (note) note.textContent = "Custom analytics pack: leadership board report, public-safe marketing snapshot, and subject intervention report for the reviewed batch.";
  const mode = $("#custom-mode");
  if (mode) mode.value = "advanced";
}

function updateCustomAnalyticsHint() {
  const mode = $("#custom-mode")?.value || "quick";
  const metric = $("#custom-metric")?.selectedOptions?.[0]?.textContent || "Learner count";
  const category = $("#custom-category")?.selectedOptions?.[0]?.textContent || "Division";
  const note = $("#custom-fields");
  if (!note) return;
  note.textContent = `${mode === "advanced" ? "Advanced" : "Quick"} pack: ${metric} by ${category}. Useful for board reports, public-safe marketing snapshots, and intervention planning.`;
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-view-trigger]");
    if (trigger) setView(trigger.dataset.viewTrigger);
  });

  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  $("#pdf-input")?.addEventListener("change", (event) => {
    state.files = Array.from(event.target.files || []);
    renderFileList(state.files);
    if (state.files.length) {
      setStatus(`${state.files.length} marks file${state.files.length === 1 ? "" : "s"} added. Ready to check.`);
      renderStepper(1);
    }
  });

  $("#run")?.addEventListener("click", runConversion);
  $("#download-template")?.addEventListener("click", downloadMarksTemplate);
  $("#download")?.addEventListener("click", downloadWorkbook);
  $("#download-review")?.addEventListener("click", downloadWorkbook);
  $("#sheet-select")?.addEventListener("change", () => renderPreview());
  $("#review-search")?.addEventListener("input", renderReviewTable);
  $("#review-class")?.addEventListener("change", renderReviewTable);
  $("#review-status")?.addEventListener("change", renderReviewTable);
  $("#bulk-approve")?.addEventListener("click", bulkApproveReady);
  $("#links-search")?.addEventListener("input", renderLinksTable);
  $("#links-status")?.addEventListener("change", renderLinksTable);
  $("#report-template")?.addEventListener("change", (event) => renderTemplate(event.target.value));
  $("#lead-form")?.addEventListener("submit", saveLead);
  $("#export-leads")?.addEventListener("click", exportLeads);
  $("#export-dashboard")?.addEventListener("click", exportBoardSnapshot);
  $("#toggle-customise")?.addEventListener("click", customiseAnalyticsPack);
  $("#custom-mode")?.addEventListener("change", updateCustomAnalyticsHint);
  $("#custom-metric")?.addEventListener("change", updateCustomAnalyticsHint);
  $("#custom-category")?.addEventListener("change", updateCustomAnalyticsHint);
}

function init() {
  bindEvents();
  document.body.dataset.view = "dashboard";
  renderBatches();
  renderTeacherSubmissions();
  renderMissingMarks();
  renderStepper();
  populateReviewClassOptions();
  renderReviewTable();
  renderLinksTable();
  renderTemplate("primary");
  renderCharts();
  updateCustomAnalyticsHint();
  renderSummary();
  renderPreview();
}

init();
