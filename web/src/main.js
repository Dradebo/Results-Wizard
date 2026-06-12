import ExcelJS from "exceljs";
import { convertPdfsToWorkbook } from "./pdfToWorkbook.js";

const state = {
  files: [],
  workbook: null,
  previews: {},
  summary: null,
  buffer: null,
  leads: JSON.parse(localStorage.getItem("rw-leads") || "[]")
};

const demoContext = {
  schoolName: "Kampala View Junior School",
  activeBatch: "Primary 7 Blue - Term 3, 2026",
  totalLearners: 89,
  approved: 84,
  needsReview: 3,
  blocked: 2,
  linksDelivered: 73,
  linksViewed: 58,
  correctionsOpen: 5,
  classesReporting: 8,
  averagePerformance: 78.5,
  distinctionRate: 42
};

function parseCsv(text) {
  const lines = String(text || "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => { row[header] = values[index] ?? ""; });
    return row;
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && inQuotes && next === '"') { current += '"'; i += 1; continue; }
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { values.push(current); current = ''; continue; }
    current += ch;
  }
  values.push(current);
  return values;
}

function numericAverage(row) {
  const values = Object.entries(row)
    .filter(([key]) => /^(math|english|science|social|history|mark|score)/i.test(key))
    .map(([, value]) => Number.parseFloat(String(value).replace(/[^0-9.]/g, "")))
    .filter((n) => Number.isFinite(n));
  if (!values.length) return "";
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

async function buildWorkbookFromRows(rows, schoolName, term) {
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet("School Summary");
  summary.addRow(["School", schoolName]);
  summary.addRow(["Term", term]);
  summary.addRow(["Learners", rows.length]);
  const report = workbook.addWorksheet("Report Cards");
  report.columns = [
    { header: "Learner", key: "learner", width: 24 },
    { header: "Class", key: "class", width: 10 },
    { header: "Stream", key: "stream", width: 10 },
    { header: "Parent email", key: "email", width: 28 },
    { header: "Average", key: "average", width: 10 },
    { header: "Comment", key: "comment", width: 42 }
  ];
  rows.forEach((row) => {
    report.addRow({
      learner: row.name || row.learner || "",
      class: row.class || row.Class || "",
      stream: row.stream || row.Stream || "",
      email: row.email || row.parent_email || row.guardian_email || "",
      average: numericAverage(row),
      comment: row.comment || row["Teacher comment"] || ""
    });
  });
  return workbook;
}

const learners = [
  { name: "Nakato Sarah", initials: "Nakato S.", class: "P7", stream: "A", subjects: "8/8", status: "approved", action: "Preview parent result", method: "WhatsApp", viewed: "Viewed 2h ago", rowNote: "Reviewed and ready for parent delivery", linkStatus: "sent" },
  { name: "Kato Daniel", initials: "Kato D.", class: "P7", stream: "A", subjects: "7/8", status: "needs-review", action: "Fix before publish", method: "SMS", viewed: "Hold until marks are complete", rowNote: "Missing Mathematics mark before release", linkStatus: "needs-review" },
  { name: "Achieng Maria", initials: "Achieng M.", class: "P7", stream: "B", subjects: "8/8", status: "approved", action: "Preview parent result", method: "Email", viewed: "Viewed yesterday", rowNote: "Parent opened the result link", linkStatus: "viewed" },
  { name: "Mugisha Paul", initials: "Mugisha P.", class: "P7", stream: "B", subjects: "6/8", status: "error", action: "Fix blocker", method: "Printed code", viewed: "Blocked by missing English mark", rowNote: "Blocked until the class sheet is complete", linkStatus: "blocked" },
  { name: "Namutebi Joy", initials: "Namutebi J.", class: "P6", stream: "A", subjects: "8/8", status: "approved", action: "Preview parent result", method: "WhatsApp", viewed: "Sent 4h ago", rowNote: "Ready for SMS or WhatsApp delivery", linkStatus: "sent" },
  { name: "Okello Brian", initials: "Okello B.", class: "S2", stream: "East", subjects: "10/10", status: "approved", action: "Preview parent result", method: "SMS", viewed: "Viewed today", rowNote: "Aggregate-ready after school approval", linkStatus: "viewed" },
  { name: "Namugenyi Ruth", initials: "Namugenyi R.", class: "S1", stream: "North", subjects: "9/10", status: "needs-review", action: "Add comment", method: "Email", viewed: "Waiting for class teacher comment", rowNote: "Teacher comment still required before approval", linkStatus: "needs-review" },
  { name: "Nakato Sarah", initials: "Nakato S.", class: "P7", stream: "Blue", subjects: "8/8", status: "needs-review", action: "Merge duplicate", method: "WhatsApp", viewed: "Duplicate learner detected in uploaded roster", rowNote: "Duplicate learner warning: merge before publish", linkStatus: "needs-review" },
  { name: "Ssenfuma Joel", initials: "Ssenfuma J.", class: "P7", stream: "Blue", subjects: "8/8", status: "needs-review", action: "Check grade mapping", method: "SMS", viewed: "Grade exceeds the school scale", rowNote: "Grade mapping warning: 102 needs confirmation", linkStatus: "correction-requested" }
];

const batches = [
  { title: "Primary 7 Blue - Term 3 Results", meta: "89 learners - 84 approved, 5 still need action", status: "needs-review" },
  { title: "Senior 2 CBC Midterm", meta: "142 learners - Descriptor review in progress", status: "needs-review" },
  { title: "PLE Mock Results", meta: "76 learners - Ready for parent preview", status: "approved" },
  { title: "Primary 5 End of Term", meta: "118 learners - Missing 2 class comments", status: "error" }
];

const teacherSubmissions = [
  { teacher: "Mr. Ssemakula", subject: "Mathematics", className: "P7 Blue", submitted: "Submitted", missing: "3 learners missing marks", status: "needs-review" },
  { teacher: "Ms. Atim", subject: "English", className: "P7 Blue", submitted: "Not submitted", missing: "Full class pending", status: "error" },
  { teacher: "Mr. Okello", subject: "Science", className: "P7 Blue", submitted: "Submitted", missing: "Comments needed", status: "needs-review" },
  { teacher: "Records office", subject: "Roster QA", className: "P7 Blue", submitted: "Needs merge", missing: "Duplicate learner found", status: "needs-review" },
  { teacher: "Ms. Namusoke", subject: "Social Studies", className: "P7 Blue", submitted: "Ready", missing: "No gaps", status: "approved" },
  { teacher: "Class Teacher", subject: "Conduct and attendance", className: "P7 Blue", submitted: "Ready", missing: "No gaps", status: "approved" }
];

const missingMarks = [
  { learner: "Kato Daniel", className: "P7 Blue", issue: "Mathematics mark missing", owner: "Mr. Ssemakula" },
  { learner: "Mugisha Paul", className: "P7 Blue", issue: "English mark missing", owner: "Ms. Atim" },
  { learner: "Namugenyi Ruth", className: "P7 Blue", issue: "Science comment missing", owner: "Mr. Okello" },
  { learner: "Achieng Maria", className: "P7 Blue", issue: "Attendance not filled", owner: "Class Teacher" },
  { learner: "Nakato Sarah", className: "P7 Blue", issue: "Duplicate learner needs merge review", owner: "Records office" },
  { learner: "Ssenfuma Joel", className: "P7 Blue", issue: "Grade mapping warning above school scale", owner: "Results officer" }
];

const reportTemplates = {
  primary: {
    title: "Primary Term Report",
    subtitle: "Official school result page for parents and guardians",
    badge: "Verified by school office",
    footer: "Result issued by Kampala View Junior School. Corrections remain open for 5 days.",
    overall: "Distinction 1",
    notes: [
      ["Primary term report", "Subjects, marks, grades, aggregate, attendance, conduct, class teacher comment, head teacher comment, and next-term notice."],
      ["Default privacy", "Position and rank can be hidden unless the school explicitly enables them."]
    ],
    rows: [
      ["Mathematics", "92", "D1", "Excellent reasoning"],
      ["English", "81", "D2", "Strong reading and expression"],
      ["Science", "88", "D1", "Confident practical work"],
      ["Social Studies", "84", "D2", "Good class participation"]
    ]
  },
  cbc: {
    title: "CBC Competency Report",
    subtitle: "Parent view for competencies, descriptors, and school comments",
    badge: "CBC format",
    footer: "Competency descriptors are explained in plain language for parents.",
    overall: "Outstanding",
    notes: [
      ["CBC competency report", "Competencies, score out of 3, descriptor, generic skills, values, subject teacher remarks, and attendance."],
      ["Parent clarity", "Descriptors are explained in plain language so parents understand the report."]
    ],
    rows: [
      ["Mathematics competency", "2.8", "Outstanding", "Applies concepts with confidence"],
      ["English communication", "2.4", "Moderate", "Understands meaning and responds clearly"],
      ["Generic skills", "2.6", "Outstanding", "Shows initiative and self-management"],
      ["Values and conduct", "2.5", "Outstanding", "Positive and respectful" ]
    ]
  },
  ple: {
    title: "PLE Summary",
    subtitle: "Official results page for final primary examination reporting",
    badge: "Exam summary",
    footer: "Verified school summary ready for parent delivery.",
    overall: "Division 1",
    notes: [
      ["PLE summary", "Index number, subject grades, aggregate, division, school verification, and school performance summary."],
      ["General product", "PLE is one report type. The same parent link works for term reports, mock exams, and school assessments."]
    ],
    rows: [
      ["English", "2", "Distinction", "Clear comprehension and composition"],
      ["Mathematics", "1", "Distinction", "High accuracy and speed"],
      ["Science", "2", "Distinction", "Strong practical understanding"],
      ["Social Studies", "2", "Distinction", "Solid recall and application"]
    ]
  },
  secondary: {
    title: "Secondary Marksheet",
    subtitle: "Official school result page for secondary students",
    badge: "Secondary format",
    footer: "School-approved grades shown with learner-facing privacy controls.",
    overall: "Grade A",
    notes: [
      ["Secondary marksheet", "Coursework, end-of-term exam, total, grade, teacher remarks, and stream comparison."],
      ["Flexible columns", "Schools can keep their own grading scales and report language."]
    ],
    rows: [
      ["Mathematics", "87", "A", "Strong algebra and problem solving"],
      ["English", "78", "B+", "Good grammar and comprehension"],
      ["Biology", "82", "A", "Clear practical understanding"],
      ["History", "74", "B", "Good recall with room to deepen analysis"]
    ]
  },
  minimal: {
    title: "Minimal Parent Link",
    subtitle: "Simple official result summary with school verification",
    badge: "Low-friction link",
    footer: "This is the minimal version for schools that want secure delivery first.",
    overall: "Approved",
    notes: [
      ["Minimal parent link", "A clean official result summary for schools that only want secure result communication first."],
      ["Upgrade path", "Detailed analytics and branded report cards can be added after the first pilot."]
    ],
    rows: [
      ["Overall average", "84%", "Approved", "Parent-ready"],
      ["Teacher review", "Complete", "Approved", "No missing marks"],
      ["School verification", "Published", "Official", "Approved by office"]
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
  const labels = {
    "needs-review": "Needs review",
    blocked: "Blocked",
    sent: "Sent",
    viewed: "Viewed",
    "correction-requested": "Correction requested",
    approved: "Approved",
    error: "Error"
  };
  if (labels[status]) return labels[status];
  return status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function updateTopbarActions(view = document.body.dataset.view || "dashboard") {
  const secondary = document.querySelector("[data-role='topbar-secondary']");
  const primary = document.querySelector("[data-role='topbar-primary']");
  if (!secondary || !primary) return;

  const actions = {
    dashboard: {
      secondaryLabel: "View school analytics",
      secondaryTarget: "analytics",
      primaryLabel: "New results batch",
      primaryTarget: "batch"
    },
    batch: {
      secondaryLabel: "Return to dashboard",
      secondaryTarget: "dashboard",
      primaryLabel: "Open review queue",
      primaryTarget: "review"
    },
    review: {
      secondaryLabel: "Open parent preview",
      secondaryTarget: "parent",
      primaryLabel: "Prepare parent delivery",
      primaryTarget: "links"
    },
    parent: {
      secondaryLabel: "Back to review",
      secondaryTarget: "review",
      primaryLabel: "Open link workflow",
      primaryTarget: "links"
    },
    links: {
      secondaryLabel: "Return to review",
      secondaryTarget: "review",
      primaryLabel: "Request pilot walkthrough",
      primaryTarget: "subscription"
    },
    analytics: {
      secondaryLabel: "View active batch",
      secondaryTarget: "dashboard",
      primaryLabel: "Request analytics plan",
      primaryTarget: "subscription"
    },
    subscription: {
      secondaryLabel: "See active batch",
      secondaryTarget: "dashboard",
      primaryLabel: "Review another batch",
      primaryTarget: "batch"
    }
  };

  const current = actions[view] || actions.dashboard;
  secondary.textContent = current.secondaryLabel;
  secondary.dataset.viewTrigger = current.secondaryTarget;
  primary.textContent = current.primaryLabel;
  primary.dataset.viewTrigger = current.primaryTarget;
}

function setView(view) {
  $$(".view").forEach((panel) => panel.classList.toggle("active", panel.id === view));
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.body.dataset.view = view;
  const target = document.getElementById(view);
  if ($("#page-title") && target?.dataset.title) $("#page-title").textContent = target.dataset.title;
  updateTopbarActions(view);
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
      <td><strong>${learner.name}</strong><br><span class="batch-meta">${learner.rowNote}</span></td>
      <td>${learner.class}</td>
      <td>${learner.stream}</td>
      <td>${learner.subjects}</td>
      <td><span class="status-pill status-${learner.status}">${statusLabel(learner.status)}</span></td>
      <td><button class="ghost" data-view-trigger="parent" title="Open the parent preview for this learner">${learner.action}</button></td>
    </tr>
  `).join("");
}

function renderLinksTable() {
  const body = $("#links-table-body");
  const query = ($("#links-search")?.value || "").toLowerCase();
  const filter = $("#links-status")?.value || "all";
  if (!body) return;
  body.innerHTML = learners.filter((learner) => {
    const status = learner.linkStatus || (learner.status === "approved" ? "sent" : learner.status);
    const matchesQuery = learner.name.toLowerCase().includes(query) || `${learner.class} ${learner.stream}`.toLowerCase().includes(query);
    const matchesFilter = filter === "all" || status === filter;
    return matchesQuery && matchesFilter;
  }).map((learner, index) => {
    const status = learner.linkStatus || (learner.status === "approved" ? "sent" : learner.status);
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
  const title = $("#parent-result-title");
  const subline = $("#parent-result-subline");
  const badge = $("#parent-result-badge");
  const footer = $("#parent-result-footer");
  if ($("#parent-overall")) $("#parent-overall").textContent = template.overall;
  if ($("#template-choice-label")) $("#template-choice-label").textContent = $("#report-template")?.selectedOptions?.[0]?.textContent || "Primary term report";

  if (title) title.textContent = template.title;
  if (subline) subline.textContent = template.subtitle;
  if (badge) badge.textContent = template.badge;
  if (footer) footer.textContent = template.footer;

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
        ${template.rows.map(([subject, score, grade, detail]) => `
          <div class="${templateKey === "cbc" ? "competency-row" : "result-row"}">
            <div>
              <strong>${subject}</strong>
              <span>${detail || (templateKey === "cbc" ? "Competency descriptor" : "Reviewed and approved")}</span>
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
  const readyLinks = demoContext.approved;
  const cards = [
    ["Learners", summary?.learners ?? demoContext.totalLearners],
    ["QA rows", summary?.qaRows ?? demoContext.needsReview + demoContext.blocked],
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
  const strip = $("#preview-summary-strip");
  const calloutTitle = $("#preview-callout-title");
  const calloutBody = $("#preview-callout-body");
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
  const statusCounts = rows.reduce((acc, row) => {
    const status = String(row[row.length - 1] || "").toLowerCase();
    acc.approved += Number(status.includes("approved"));
    acc.review += Number(status.includes("review"));
    acc.error += Number(status.includes("error"));
    return acc;
  }, { approved: 0, review: 0, error: 0 });
  const sampleLearners = rows.slice(0, 3).map((row) => row[0]).filter(Boolean);

  table.innerHTML = `
    <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
  `;
  if (previewSize) previewSize.textContent = `${rows.length} reports shown`;
  if (strip) {
    strip.innerHTML = [
      ["Approved", statusCounts.approved],
      ["Needs review", statusCounts.review],
      ["Errors", statusCounts.error],
      ["Sample learners", sampleLearners.length ? sampleLearners.join(" • ") : "—"]
    ].map(([label, value]) => `<div class="preview-stat"><span>${label}</span><strong>${value}</strong></div>`).join("");
  }
  if (calloutTitle && calloutBody) {
    calloutTitle.textContent = currentName === "marksheet" ? "What this sheet says" : `${currentName} sheet at a glance`;
    calloutBody.textContent = `${rows.length} report rows are visible here. ${statusCounts.error} are blocked, ${statusCounts.review} need human review, and ${statusCounts.approved} are ready to move forward.`;
  }
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
    const csvFiles = state.files.filter((file) => /\.csv$/i.test(file.name));
    if (csvFiles.length) {
      setStatus("Reading the uploaded school results and building report cards...");
      renderStepper(2);
      const text = await csvFiles[0].text();
      const rows = parseCsv(text);
      if (!rows.length) throw new Error("The CSV file does not contain any learner rows.");
      const workbook = await buildWorkbookFromRows(rows, demoContext.schoolName, demoContext.activeBatch);
      state.workbook = workbook;
      state.previews = { "Report Cards": rows };
      state.summary = {
        rows: rows.length,
        school: demoContext.schoolName,
        term: demoContext.activeBatch,
        mode: "csv"
      };
      state.buffer = await workbook.xlsx.writeBuffer();
      renderPreview();
      renderSummary();
      renderStepper(4);
      $("#download")?.removeAttribute("disabled");
      $("#download-review")?.removeAttribute("disabled");
      $("#download-dashboard")?.removeAttribute("disabled");
      if ($("#download-hint")) $("#download-hint").textContent = "CSV results are ready for review and workbook export.";
      setStatus(`Built report cards for ${rows.length} learners from CSV. Review before publish.`, "success");
      setView("review");
      return;
    }

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
    interest: "Pilot + Leadership Analytics - from UGX 450,000",
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
      learner.action = "Preview parent result";
      learner.viewed = "Queued for link delivery";
      learner.linkStatus = "sent";
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
  if (note) note.textContent = "Planned analytics bundle: leadership board report, public-safe marketing snapshot, and subject intervention report for the reviewed batch.";
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
  updateTopbarActions("dashboard");
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
