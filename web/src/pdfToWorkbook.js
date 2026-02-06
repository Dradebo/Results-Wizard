import ExcelJS from "exceljs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const HEADER_LABELS = [
  "Year",
  "Index_No",
  "NAME",
  "SEX",
  "ENG",
  "SCI",
  "SST",
  "MATH",
  "AGGR",
  "DIV"
];

const SCHOOL_HEADER_RE = /^(?<code>\d{6})\s*-\s*(?<name>.+)$/;
const DISTRICT_RE = /^DISTRICT\s*:\s*(.+)$/i;
const YEAR_RE = /^(19|20)\d{2}$/;
const INDEX_RE = /^\d{6}\/\d{3}$/;
const SEX_RE = /^[MF]$/;
const ROW_RE = new RegExp(
  "^(?<year>(19|20)\\d{2})\\s+" +
    "(?<index>\\d{6}\\/\\d{3})\\s+" +
    "(?<name>.+?)\\s+" +
    "(?<sex>[MF])\\s+" +
    "(?<eng>\\d+)\\s+" +
    "(?<sci>\\d+)\\s+" +
    "(?<sst>\\d+)\\s+" +
    "(?<math>\\d+)\\s+" +
    "(?<aggr>\\d+)\\s+" +
    "(?<div>\\d+|U)$"
);

const normalizeText = (text) => String(text || "").replace(/\s+/g, " ").trim();
const zfill = (value, width) => String(value || "").padStart(width, "0");

function groupWordsToLines(words, yTolerance = 2.0) {
  if (!words.length) return [];
  const sorted = [...words].sort((a, b) => (a.top - b.top) || (a.x0 - b.x0));
  const lines = [];
  let current = [];
  let currentTop = null;

  sorted.forEach((word) => {
    if (currentTop === null) {
      currentTop = word.top;
      current = [word];
      return;
    }
    if (Math.abs(word.top - currentTop) <= yTolerance) {
      current.push(word);
    } else {
      lines.push(current);
      current = [word];
      currentTop = word.top;
    }
  });

  if (current.length) lines.push(current);
  return lines;
}

const lineText = (line) =>
  normalizeText(
    line
      .slice()
      .sort((a, b) => a.x0 - b.x0)
      .map((w) => w.text)
      .join(" ")
  );

function detectHeaderLayout(line) {
  const tokens = line
    .slice()
    .sort((a, b) => a.x0 - b.x0)
    .map((w) => normalizeText(w.text));
  const joined = tokens.join(" ").toUpperCase();
  if (!joined.includes("YEAR") || !joined.includes("INDEX") || !joined.includes("NAME")) {
    return null;
  }

  const xPositions = {};
  const words = line.slice().sort((a, b) => a.x0 - b.x0);
  const upperTokens = words.map((w) => normalizeText(w.text).toUpperCase());

  const setPos = (label, idx) => {
    if (!xPositions[label]) xPositions[label] = words[idx].x0;
  };

  let i = 0;
  while (i < upperTokens.length) {
    const tok = upperTokens[i];
    if (["YEAR", "NAME", "SEX", "ENG", "SCI", "SST", "MATH", "AGGR", "DIV"].includes(tok)) {
      setPos(tok === "NAME" ? "NAME" : tok, i);
      i += 1;
      continue;
    }
    if (["INDEX", "INDEX_NO"].includes(tok)) {
      setPos("Index_No", i);
      i += 1;
      continue;
    }
    if (tok === "INDEX" && upperTokens[i + 1] && ["NO", "NO."].includes(upperTokens[i + 1])) {
      setPos("Index_No", i);
      i += 2;
      continue;
    }
    i += 1;
  }

  const normalized = {};
  HEADER_LABELS.forEach((label) => {
    if (xPositions[label] !== undefined) normalized[label] = xPositions[label];
    else if (xPositions[label.toUpperCase()] !== undefined) normalized[label] = xPositions[label.toUpperCase()];
  });

  if (Object.keys(normalized).length < 5) return null;
  return { xPositions: normalized };
}

function assignColumns(line, layout) {
  const cols = {};
  HEADER_LABELS.forEach((label) => { cols[label] = []; });

  const items = line.slice().sort((a, b) => a.x0 - b.x0);
  const starts = Object.entries(layout.xPositions).sort((a, b) => a[1] - b[1]);
  const orderedLabels = starts.map(([label]) => label);
  const orderedX = starts.map(([, x]) => x);

  const findCol = (x) => {
    let idx = 0;
    for (let i = 0; i < orderedX.length; i += 1) {
      if (x >= orderedX[i]) idx = i;
      else break;
    }
    return orderedLabels[idx];
  };

  items.forEach((word) => {
    const label = findCol(word.x0);
    cols[label].push(word.text);
  });

  const result = {};
  Object.entries(cols).forEach(([label, values]) => {
    result[label] = normalizeText(values.join(" "));
  });
  return result;
}

const isDataRow = (row) => {
  const year = row.Year || "";
  const indexNo = row.Index_No || "";
  const sex = row.SEX || "";
  const name = row.NAME || "";
  return Boolean(YEAR_RE.test(year) && INDEX_RE.test(indexNo) && SEX_RE.test(sex) && name);
};

function parseRowText(text) {
  const match = text.match(ROW_RE);
  if (!match || !match.groups) return null;
  return {
    Year: match.groups.year,
    Index_No: match.groups.index,
    NAME: match.groups.name,
    SEX: match.groups.sex,
    ENG: match.groups.eng,
    SCI: match.groups.sci,
    SST: match.groups.sst,
    MATH: match.groups.math,
    AGGR: match.groups.aggr,
    DIV: match.groups.div
  };
}

function extractWordsFromTextItem(item, pageHeight) {
  const str = String(item.str || "");
  if (!str.trim()) return [];
  const transform = item.transform || [1, 0, 0, 1, 0, 0];
  const x = transform[4] || 0;
  const y = transform[5] || 0;
  const top = pageHeight - y;
  const width = item.width || 0;
  const words = [];

  const parts = [];
  let current = "";
  let start = 0;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str[i];
    if (/\s/.test(ch)) {
      if (current) {
        parts.push({ text: current, start });
        current = "";
      }
      start = i + 1;
    } else {
      if (!current) start = i;
      current += ch;
    }
  }
  if (current) parts.push({ text: current, start });

  const charWidth = width && str.length ? width / str.length : 0;
  parts.forEach((part) => {
    const wordX = charWidth ? x + charWidth * part.start : x;
    words.push({ text: part.text, x0: wordX, top });
  });
  return words;
}

async function extractWords(page) {
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
  const words = [];
  for (const item of textContent.items) {
    const transformed = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const cloned = { ...item, transform: transformed };
    const extracted = extractWordsFromTextItem(cloned, viewport.height);
    words.push(...extracted);
  }
  return words;
}

async function parsePdfFile(file, options = {}) {
  const { yTolerance = 2.0, maxPages = null, progressCb = null } = options;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const records = [];
  const qa = [];
  const context = { code: "", name: "", district: "" };
  let currentLayout = null;

  const pageCount = pdf.numPages;
  const limit = maxPages ? Math.min(pageCount, maxPages) : pageCount;
  for (let pageIndex = 1; pageIndex <= limit; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    if (progressCb) progressCb(pageIndex, limit);
    const words = await extractWords(page);
    const lines = groupWordsToLines(words, yTolerance);
    for (const line of lines) {
      const text = lineText(line);
      if (!text) continue;

      const districtMatch = text.match(DISTRICT_RE);
      if (districtMatch) {
        let districtValue = normalizeText(districtMatch[1]);
        if (districtValue.includes("Uganda National Examination Board")) {
          districtValue = districtValue.split("Uganda National Examination Board")[0].trim();
        }
        context.district = districtValue;
        continue;
      }

      const schoolMatch = text.match(SCHOOL_HEADER_RE);
      if (schoolMatch?.groups) {
        context.code = schoolMatch.groups.code;
        context.name = normalizeText(schoolMatch.groups.name);
        continue;
      }

      const layout = detectHeaderLayout(line);
      if (layout) {
        currentLayout = layout;
        continue;
      }

      if (!currentLayout) continue;

      let row = parseRowText(text);
      if (!row) row = assignColumns(line, currentLayout);

      if (row && isDataRow(row)) {
        records.push({
          district: context.district || "",
          school_uneb: context.code || "",
          school_name: context.name || "",
          year: row.Year || "",
          index_no: row.Index_No || "",
          learner_name: row.NAME || "",
          sex: row.SEX || "",
          eng: row.ENG || "",
          sci: row.SCI || "",
          sst: row.SST || "",
          math: row.MATH || "",
          aggr: row.AGGR || "",
          div: row.DIV || "",
          source_pdf: file.name,
          page: String(pageIndex)
        });
      } else if (row && (row.Year || row.Index_No || row.NAME)) {
        qa.push({ source_pdf: file.name, page: String(pageIndex), raw_text: text });
      }
    }
  }

  return { records, qa };
}

function buildPivot(records) {
  if (!records.length) return { rows: [], headers: [] };
  const indexCols = ["school_uneb", "school_name"];
  ["school_id", "parish_name", "parish_id"].forEach((col) => {
    if (records.some((row) => row[col] !== undefined)) indexCols.push(col);
  });

  const rowMap = new Map();
  const columnSet = new Set();

  records.forEach((row) => {
    const div = normalizeText(String(row.div || "")) || "Unknown";
    const sex = normalizeText(String(row.sex || "")) || "U";
    const column = `${div}(${sex})`;
    columnSet.add(column);
    const key = indexCols.map((col) => row[col] || "").join("||");
    if (!rowMap.has(key)) {
      const base = {};
      indexCols.forEach((col) => { base[col] = row[col] || ""; });
      rowMap.set(key, { base, counts: {} });
    }
    const entry = rowMap.get(key);
    entry.counts[column] = (entry.counts[column] || 0) + 1;
  });

  const columns = [...columnSet].sort((a, b) => {
    const divA = parseInt(a, 10);
    const divB = parseInt(b, 10);
    const keyA = Number.isNaN(divA) ? 99 : divA;
    const keyB = Number.isNaN(divB) ? 99 : divB;
    if (keyA !== keyB) return keyA - keyB;
    return a.localeCompare(b);
  });

  const rows = [];
  rowMap.forEach((entry) => {
    const row = { ...entry.base };
    columns.forEach((col) => { row[col] = entry.counts[col] || 0; });
    rows.push(row);
  });
  return { rows, headers: [...indexCols, ...columns] };
}

function buildDivisionTotals(records) {
  if (!records.length) return { rows: [], headers: [] };
  const indexCols = ["school_uneb", "school_name"];
  ["school_id", "parish_name", "parish_id"].forEach((col) => {
    if (records.some((row) => row[col] !== undefined)) indexCols.push(col);
  });

  const rowMap = new Map();
  const columnSet = new Set();

  records.forEach((row) => {
    const div = normalizeText(String(row.div || "")) || "Unknown";
    columnSet.add(div);
    const key = indexCols.map((col) => row[col] || "").join("||");
    if (!rowMap.has(key)) {
      const base = {};
      indexCols.forEach((col) => { base[col] = row[col] || ""; });
      rowMap.set(key, { base, counts: {} });
    }
    const entry = rowMap.get(key);
    entry.counts[div] = (entry.counts[div] || 0) + 1;
  });

  const columns = [...columnSet].sort((a, b) => a.localeCompare(b));
  const rows = [];
  rowMap.forEach((entry) => {
    const row = { ...entry.base };
    columns.forEach((col) => { row[col] = entry.counts[col] || 0; });
    rows.push(row);
  });
  return { rows, headers: [...indexCols, ...columns] };
}

function buildWorkingSheet(records) {
  if (!records.length) return { rows: [], headers: [] };
  const rows = records.map((row) => ({
    Year1: row.year || "",
    Index_No: row.index_no || "",
    NAME: row.learner_name || "",
    SEX: row.sex || "",
    ENG: row.eng || "",
    SCI: row.sci || "",
    SST: row.sst || "",
    MATH: row.math || "",
    AGGR: row.aggr || "",
    DIV: row.div || "",
    "sch name": row.school_name || "",
    "sch id": row.school_id || "",
    district: row.district || "",
    parish_name: row.parish_name || "",
    parish_id: row.parish_id || "",
    school_uneb: row.school_uneb || ""
  }));
  const headers = [
    "Year1",
    "Index_No",
    "NAME",
    "SEX",
    "ENG",
    "SCI",
    "SST",
    "MATH",
    "AGGR",
    "DIV",
    "sch name",
    "sch id",
    "district",
    "parish_name",
    "parish_id",
    "school_uneb"
  ].filter((h) => rows.length && h in rows[0]);
  return { rows, headers };
}

function buildDivSheet(records) {
  if (!records.length) return { rows: [], headers: [] };
  const indexCols = ["school_name", "school_id", "year"].filter((col) => records.some((row) => row[col] !== undefined));

  const rowMap = new Map();
  records.forEach((row) => {
    const div = normalizeText(String(row.div || "")).toLowerCase();
    const sex = normalizeText(String(row.sex || "")).toLowerCase();
    const key = indexCols.map((col) => row[col] || "").join("||");
    if (!rowMap.has(key)) {
      const base = {};
      indexCols.forEach((col) => { base[col] = row[col] || ""; });
      rowMap.set(key, { base, counts: {} });
    }
    const entry = rowMap.get(key);
    const column = `${div}${sex}`;
    entry.counts[column] = (entry.counts[column] || 0) + 1;
  });

  const desiredDivs = ["1", "2", "3", "4", "u", "x"];
  const desiredCols = [];
  desiredDivs.forEach((div) => {
    ["f", "m"].forEach((sex) => { desiredCols.push(`${div}${sex}`); });
  });

  const rows = [];
  rowMap.forEach((entry) => {
    const row = { ...entry.base };
    desiredCols.forEach((col) => { row[col] = entry.counts[col] || 0; });
    if (row.school_name !== undefined) row["sch name"] = row.school_name;
    if (row.school_id !== undefined) row["sch id"] = row.school_id;
    if (row.year !== undefined) row.Year1 = row.year;
    delete row.school_name;
    delete row.school_id;
    delete row.year;
    rows.push(row);
  });
  const headers = ["sch name", "sch id", "Year1", ...desiredCols].filter((h) => rows.length && h in rows[0]);
  return { rows, headers };
}

function addSheet(workbook, name, headers, rows) {
  const sheet = workbook.addWorksheet(name);
  if (!headers.length) return sheet;
  sheet.addRow(headers);
  rows.forEach((row) => {
    const rowValues = headers.map((h) => row[h] ?? "");
    sheet.addRow(rowValues);
  });
  sheet.columns = headers.map((h) => ({ header: h, key: h, width: Math.min(30, Math.max(10, String(h).length + 2)) }));
  return sheet;
}

function sheetPreview(sheet, limit = 30) {
  const values = sheet.getSheetValues();
  const rows = [];
  for (let i = 1; i < values.length; i += 1) {
    if (rows.length >= limit) break;
    const row = values[i];
    if (!row) continue;
    const normalized = Array.isArray(row) ? row.slice(1) : Object.values(row || {});
    rows.push(normalized.map((cell) => (cell === null || cell === undefined ? "" : cell)));
  }
  const headers = rows.length ? rows[0].map((_, idx) => sheet.getRow(1).getCell(idx + 1).value || "") : [];
  const body = rows.length > 1 ? rows.slice(1) : [];
  return { headers, rows: body };
}

function buildSummary(records, qaRows) {
  const pivotTotals = {};
  records.forEach((row) => {
    const div = normalizeText(String(row.div || "")) || "Unknown";
    pivotTotals[div] = (pivotTotals[div] || 0) + 1;
  });
  return {
    learners: records.length,
    qaRows: qaRows.length,
    unmatchedSchools: 0,
    pivotTotals
  };
}

export async function convertPdfsToWorkbook(files, onProgress = () => {}) {
  const allRecords = [];
  const allQa = [];

  let processed = 0;
  for (const file of files) {
    const { records, qa } = await parsePdfFile(file, {
      progressCb: () => {}
    });
    allRecords.push(...records);
    allQa.push(...qa);
    processed += 1;
    onProgress(processed, files.length);
  }

  const workbook = new ExcelJS.Workbook();

  const working = buildWorkingSheet(allRecords);
  const pivot = buildPivot(allRecords);
  const divSheet = buildDivSheet(allRecords);
  const divTotals = buildDivisionTotals(allRecords);

  const sheets = {
    WORKING: addSheet(workbook, "WORKING", working.headers, working.rows),
    pivot_import: addSheet(workbook, "pivot_import", pivot.headers, pivot.rows),
    div: addSheet(workbook, "div", divSheet.headers, divSheet.rows),
    div_totals: addSheet(workbook, "div_totals", divTotals.headers, divTotals.rows),
    qa_raw: addSheet(workbook, "qa_raw", ["source_pdf", "page", "raw_text"], allQa)
  };

  const previews = {};
  Object.entries(sheets).forEach(([name, sheet]) => {
    previews[name] = sheetPreview(sheet);
  });

  const summary = buildSummary(allRecords, allQa);

  return { workbook, previews, summary };
}
