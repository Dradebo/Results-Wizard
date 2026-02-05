const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
let cachedPdfjs = null;

async function getPdfjs() {
  if (cachedPdfjs) return cachedPdfjs;
  const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
  cachedPdfjs = mod.default || mod;
  return cachedPdfjs;
}

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

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function zfill(value, width) {
  const str = String(value || "");
  return str.padStart(width, "0");
}

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

function lineText(line) {
  return normalizeText(
    line
      .slice()
      .sort((a, b) => a.x0 - b.x0)
      .map((w) => w.text)
      .join(" ")
  );
}

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
    if (!xPositions[label]) {
      xPositions[label] = words[idx].x0;
    }
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

  const mapped = {};
  Object.entries(xPositions).forEach(([key, x]) => {
    if (key === "Index_No") mapped["Index_No"] = x;
    else mapped[key] = x;
  });

  if (!mapped["Year"] && mapped["YEAR"]) {
    mapped["Year"] = mapped["YEAR"];
    delete mapped["YEAR"];
  }

  const normalized = {};
  HEADER_LABELS.forEach((label) => {
    if (mapped[label] !== undefined) normalized[label] = mapped[label];
    else if (mapped[label.toUpperCase()] !== undefined) normalized[label] = mapped[label.toUpperCase()];
  });

  if (Object.keys(normalized).length < 5) return null;
  return { xPositions: normalized };
}

function assignColumns(line, layout) {
  const cols = {};
  HEADER_LABELS.forEach((label) => {
    cols[label] = [];
  });

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

function isDataRow(row) {
  const year = row.Year || "";
  const indexNo = row.Index_No || "";
  const sex = row.SEX || "";
  const name = row.NAME || "";
  return Boolean(YEAR_RE.test(year) && INDEX_RE.test(indexNo) && SEX_RE.test(sex) && name);
}

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

async function extractWords(page, pdfjsLib) {
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false
  });
  const words = [];
  for (const item of textContent.items) {
    const transformed = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const cloned = { ...item, transform: transformed };
    const extracted = extractWordsFromTextItem(cloned, viewport.height);
    words.push(...extracted);
  }
  return words;
}

async function parsePdf(pdfPath, options = {}) {
  const { yTolerance = 2.0, maxPages = null, progressCb = null } = options;
  const pdfjsLib = await getPdfjs();
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const records = [];
  const qa = [];
  const context = { code: "", name: "", district: "" };
  let currentLayout = null;

  const pageCount = pdf.numPages;
  const limit = maxPages ? Math.min(pageCount, maxPages) : pageCount;
  for (let pageIndex = 1; pageIndex <= limit; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    if (progressCb) progressCb();
    const words = await extractWords(page, pdfjsLib);
    const lines = groupWordsToLines(words, yTolerance);
    for (const line of lines) {
      const text = lineText(line);
      if (!text) continue;

      const districtMatch = text.match(DISTRICT_RE);
      if (districtMatch) {
        let districtValue = normalizeText(districtMatch[1]);
        if (districtValue.includes("Uganda National Examination Board")) {
          districtValue = districtValue
            .split("Uganda National Examination Board")[0]
            .trim();
        }
        context.district = districtValue;
        continue;
      }

      const schoolMatch = text.match(SCHOOL_HEADER_RE);
      if (schoolMatch && schoolMatch.groups) {
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
          source_pdf: path.basename(pdfPath),
          page: String(pageIndex)
        });
      } else if (row && (row.Year || row.Index_No || row.NAME)) {
        qa.push({
          source_pdf: path.basename(pdfPath),
          page: String(pageIndex),
          raw_text: text
        });
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
      indexCols.forEach((col) => {
        base[col] = row[col] || "";
      });
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
    columns.forEach((col) => {
      row[col] = entry.counts[col] || 0;
    });
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
      indexCols.forEach((col) => {
        base[col] = row[col] || "";
      });
      rowMap.set(key, { base, counts: {} });
    }
    const entry = rowMap.get(key);
    entry.counts[div] = (entry.counts[div] || 0) + 1;
  });

  const columns = [...columnSet].sort((a, b) => a.localeCompare(b));
  const rows = [];
  rowMap.forEach((entry) => {
    const row = { ...entry.base };
    columns.forEach((col) => {
      row[col] = entry.counts[col] || 0;
    });
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
  const indexCols = ["school_name", "school_id", "year"].filter((col) =>
    records.some((row) => row[col] !== undefined)
  );

  const rowMap = new Map();
  records.forEach((row) => {
    const div = normalizeText(String(row.div || "")).toLowerCase();
    const sex = normalizeText(String(row.sex || "")).toLowerCase();
    const key = indexCols.map((col) => row[col] || "").join("||");
    if (!rowMap.has(key)) {
      const base = {};
      indexCols.forEach((col) => {
        base[col] = row[col] || "";
      });
      rowMap.set(key, { base, counts: {} });
    }
    const entry = rowMap.get(key);
    const column = `${div}${sex}`;
    entry.counts[column] = (entry.counts[column] || 0) + 1;
  });

  const desiredDivs = ["1", "2", "3", "4", "u", "x"];
  const desiredCols = [];
  desiredDivs.forEach((div) => {
    ["f", "m"].forEach((sex) => {
      desiredCols.push(`${div}${sex}`);
    });
  });

  const rows = [];
  rowMap.forEach((entry) => {
    const row = { ...entry.base };
    desiredCols.forEach((col) => {
      row[col] = entry.counts[col] || 0;
    });
    if (row.school_name !== undefined) row["sch name"] = row.school_name;
    if (row.school_id !== undefined) row["sch id"] = row.school_id;
    if (row.year !== undefined) row.Year1 = row.year;
    delete row.school_name;
    delete row.school_id;
    delete row.year;
    rows.push(row);
  });
  const headers = [
    "sch name",
    "sch id",
    "Year1",
    ...desiredCols
  ].filter((h) => rows.length && h in rows[0]);
  return { rows, headers };
}

function buildSubjectSheet(records, subject) {
  if (!records.length) return { rows: [], headers: [] };
  const indexCols = ["school_name", "school_id", "year"].filter((col) =>
    records.some((row) => row[col] !== undefined)
  );

  const rowMap = new Map();
  records.forEach((row) => {
    const scoreRaw = String(row[subject] || "").trim();
    const score = /^\d+$/.test(scoreRaw) ? scoreRaw : "X";
    const sex = String(row.sex || "").trim().toUpperCase();
    const key = indexCols.map((col) => row[col] || "").join("||");
    if (!rowMap.has(key)) {
      const base = {};
      indexCols.forEach((col) => {
        base[col] = row[col] || "";
      });
      rowMap.set(key, { base, counts: {} });
    }
    const entry = rowMap.get(key);
    const column = `${score}${sex}`;
    entry.counts[column] = (entry.counts[column] || 0) + 1;
  });

  const desiredScores = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "X"];
  const desiredCols = [];
  desiredScores.forEach((score) => {
    ["F", "M"].forEach((sex) => {
      let label = `${score}${sex}`;
      if (score === "3" && sex === "F") label = "3f";
      if (score === "4" && sex === "M") label = "4m";
      desiredCols.push(label);
    });
  });

  const rows = [];
  rowMap.forEach((entry) => {
    const row = { ...entry.base };
    desiredCols.forEach((col) => {
      const lookup = col === "3f" ? "3F" : col === "4m" ? "4M" : col;
      row[col] = entry.counts[lookup] || 0;
    });
    if (row.school_name !== undefined) row["sch name"] = row.school_name;
    if (row.school_id !== undefined) row["sch id"] = row.school_id;
    if (row.year !== undefined) row.Year1 = row.year;
    delete row.school_name;
    delete row.school_id;
    delete row.year;
    rows.push(row);
  });
  const headers = [
    "sch name",
    "sch id",
    "Year1",
    ...desiredCols
  ].filter((h) => rows.length && h in rows[0]);
  return { rows, headers };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(current);
      if (row.length > 1 || row[0]) rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += ch;
  }
  row.push(current);
  if (row.length > 1 || row[0]) rows.push(row);
  return rows;
}

async function loadOrgUnits(filePath, options = {}) {
  if (!filePath) return [];
  const ext = path.extname(filePath).toLowerCase();
  let rows = [];
  if ([".xlsx", ".xls"].includes(ext)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      rows.push(row.values.slice(1));
    });
  } else {
    const csv = fs.readFileSync(filePath, "utf8");
    rows = parseCsv(csv);
  }

  if (!rows.length) return [];
  const header = rows[0].map((h) => String(h || "").trim());
  const dataRows = rows.slice(1).map((row) => {
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = row[idx];
    });
    return obj;
  });

  const lowerCols = {};
  header.forEach((col) => {
    lowerCols[col.toLowerCase()] = col;
  });

  let orgKey = options.orgKey;
  let schoolIdCol = options.schoolIdCol;
  let parishNameCol = options.parishNameCol;
  let parishIdCol = options.parishIdCol;

  if (!orgKey) {
    ["uneb", "uneb_code", "uneb_school", "school_code", "school_uneb"].some((candidate) => {
      if (lowerCols[candidate]) {
        orgKey = lowerCols[candidate];
        return true;
      }
      return false;
    });
  }
  if (!schoolIdCol) {
    ["school_id", "orgunit_id", "org_unit_id", "ou_id"].some((candidate) => {
      if (lowerCols[candidate]) {
        schoolIdCol = lowerCols[candidate];
        return true;
      }
      return false;
    });
  }
  if (!parishNameCol) {
    ["parish_name", "parish", "parishname"].some((candidate) => {
      if (lowerCols[candidate]) {
        parishNameCol = lowerCols[candidate];
        return true;
      }
      return false;
    });
  }
  if (!parishIdCol) {
    ["parish_id", "parishid"].some((candidate) => {
      if (lowerCols[candidate]) {
        parishIdCol = lowerCols[candidate];
        return true;
      }
      return false;
    });
  }

  if (!orgKey) return [];

  const seen = new Set();
  const result = [];
  dataRows.forEach((row) => {
    const schoolUneb = zfill(row[orgKey] || "", 6);
    if (!schoolUneb || seen.has(schoolUneb)) return;
    seen.add(schoolUneb);
    const item = { school_uneb: schoolUneb };
    if (schoolIdCol && row[schoolIdCol] !== undefined) item.school_id = row[schoolIdCol];
    if (parishNameCol && row[parishNameCol] !== undefined) item.parish_name = row[parishNameCol];
    if (parishIdCol && row[parishIdCol] !== undefined) item.parish_id = row[parishIdCol];
    result.push(item);
  });

  return result;
}

function enrichWithOrgUnits(records, orgUnits) {
  if (!orgUnits.length) return records;
  const byUneb = new Map();
  orgUnits.forEach((row) => {
    byUneb.set(zfill(row.school_uneb, 6), row);
  });
  return records.map((record) => {
    const schoolUneb = zfill(record.school_uneb, 6);
    const match = byUneb.get(schoolUneb);
    if (!match) return { ...record, school_uneb: schoolUneb };
    return {
      ...record,
      school_uneb: schoolUneb,
      school_id: match.school_id || "",
      parish_name: match.parish_name || "",
      parish_id: match.parish_id || ""
    };
  });
}

async function convertPdfsToExcel(options) {
  const {
    pdfPaths,
    outputPath,
    yTolerance = 2.0,
    maxPages = null,
    orgUnitsPath = null,
    orgKey = null,
    orgSchoolIdCol = null,
    orgParishNameCol = null,
    orgParishIdCol = null,
    onProgress = null
  } = options;

  const allRecords = [];
  const allQa = [];
  let totalPages = 0;

  if (onProgress) {
    const pdfjsLib = await getPdfjs();
    for (const pdfPath of pdfPaths) {
      const data = new Uint8Array(fs.readFileSync(pdfPath));
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      totalPages += pdf.numPages;
    }
    if (!totalPages) totalPages = 1;
  }

  let currentPage = 0;
  const handleProgress = () => {
    currentPage += 1;
    if (onProgress) onProgress({ current: currentPage, total: totalPages });
  };

  for (const pdfPath of pdfPaths) {
    const { records, qa } = await parsePdf(pdfPath, {
      yTolerance,
      maxPages,
      progressCb: onProgress ? handleProgress : null
    });
    allRecords.push(...records);
    allQa.push(...qa);
  }

  let records = allRecords;
  if (orgUnitsPath && records.length) {
    const orgUnits = await loadOrgUnits(orgUnitsPath, {
      orgKey,
      schoolIdCol: orgSchoolIdCol,
      parishNameCol: orgParishNameCol,
      parishIdCol: orgParishIdCol
    });
    if (orgUnits.length) records = enrichWithOrgUnits(records, orgUnits);
  }

  if (records.length) {
    records = records.map((row) => ({
      ...row,
      school_uneb: zfill(row.school_uneb, 6)
    }));
  }

  const orgUnmatched = records
    .filter((row) => row.school_id === undefined || row.school_id === "")
    .map((row) => ({
      school_uneb: row.school_uneb,
      school_name: row.school_name
    }))
    .filter((row, index, arr) =>
      index === arr.findIndex((item) => item.school_uneb === row.school_uneb && item.school_name === row.school_name)
    )
    .sort((a, b) => (a.school_uneb || "").localeCompare(b.school_uneb || "") || (a.school_name || "").localeCompare(b.school_name || ""));

  const pivot = buildPivot(records);
  const divisionTotals = buildDivisionTotals(records);
  const working = buildWorkingSheet(records);
  const divSheet = buildDivSheet(records);
  const engSheet = buildSubjectSheet(records, "eng");
  const sciSheet = buildSubjectSheet(records, "sci");
  const sstSheet = buildSubjectSheet(records, "sst");
  const mathSheet = buildSubjectSheet(records, "math");

  const workbook = new ExcelJS.Workbook();
  const addSheet = (name, rows, headers = null) => {
    const sheet = workbook.addWorksheet(name);
    if (!rows.length) return;
    const safeHeaders = headers && headers.length ? headers : Object.keys(rows[0]);
    sheet.addRow(safeHeaders);
    rows.forEach((row) => {
      sheet.addRow(safeHeaders.map((h) => row[h]));
    });
  };

  addSheet(
    "raw_records",
    records,
    [
      "district",
      "school_uneb",
      "school_name",
      "year",
      "index_no",
      "learner_name",
      "sex",
      "eng",
      "sci",
      "sst",
      "math",
      "aggr",
      "div",
      "source_pdf",
      "page"
    ]
  );
  addSheet("WORKING", working.rows, working.headers);
  addSheet("pivot_import", pivot.rows, pivot.headers);
  addSheet("pivot_division_total", divisionTotals.rows, divisionTotals.headers);
  addSheet("div", divSheet.rows, divSheet.headers);
  addSheet("eng", engSheet.rows, engSheet.headers);
  addSheet("sci", sciSheet.rows, sciSheet.headers);
  addSheet("SST", sstSheet.rows, sstSheet.headers);
  addSheet("mATH", mathSheet.rows, mathSheet.headers);
  if (allQa.length) addSheet("qa_issues", allQa);
  if (orgUnmatched.length) addSheet("org_unit_unmatched", orgUnmatched);

  await workbook.xlsx.writeFile(outputPath);
  return { recordsCount: records.length };
}

module.exports = {
  convertPdfsToExcel
};
