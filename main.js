const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { shell } = require("electron");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const { convertPdfsToExcel } = require("./ple_pdf_to_excel");
const profilesPath = path.join(__dirname, "mapping_profiles.json");
const crypto = require("crypto");

const APP_TITLE = "PLE Import Prep";
let mainWindow = null;
const levelsCache = new Map();

function normalize(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function toCsv(headers, rows) {
  const escape = (value) => {
    const s = String(value ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [];
  lines.push(headers.map(escape).join(","));
  rows.forEach((row) => {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  });
  return lines.join("\n");
}

async function dhis2Fetch(baseUrl, username, password, path) {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DHIS2 error ${res.status}: ${text}`);
  }
  return res.json();
}

function buildOrgUnitIndex(
  orgUnits,
  levelByNumber,
  districtLevelName,
  parishLevelName,
  schoolLevelName,
  targetLevelName,
  ancestorFilter
) {
  const levelNameMatch = (target, name) =>
    normalize(name) === normalize(target);

  let districtLevel = null;
  let parishLevel = null;
  let schoolLevel = null;
  let targetLevel = null;

  Object.values(levelByNumber).forEach((level) => {
    if (!districtLevel && levelNameMatch(districtLevelName, level.name)) {
      districtLevel = level.level;
    }
    if (!parishLevel && levelNameMatch(parishLevelName, level.name)) {
      parishLevel = level.level;
    }
    if (!schoolLevel && schoolLevelName && levelNameMatch(schoolLevelName, level.name)) {
      schoolLevel = level.level;
    }
    if (!targetLevel && targetLevelName && levelNameMatch(targetLevelName, level.name)) {
      targetLevel = level.level;
    }
  });

  const normalizeAncestor = normalize(ancestorFilter || "");
  const filteredByAncestor = ancestorFilter
    ? orgUnits.filter((ou) => {
        if (normalize(ou.id) === normalizeAncestor) return true;
        if (normalize(ou.name) === normalizeAncestor) return true;
        return (ou.ancestors || []).some(
          (a) =>
            normalize(a.id) === normalizeAncestor ||
            normalize(a.name) === normalizeAncestor
        );
      })
    : orgUnits;

  const filteredOrgUnits = targetLevel
    ? filteredByAncestor.filter((ou) => ou.level === targetLevel)
    : schoolLevel
      ? filteredByAncestor.filter((ou) => ou.level === schoolLevel)
      : filteredByAncestor;

  const byName = new Map();
  const records = filteredOrgUnits.map((ou) => {
    const ancestors = ou.ancestors || [];
    const district = districtLevel
      ? ancestors.find((a) => a.level === districtLevel)
      : null;
    const parish = parishLevel
      ? ancestors.find((a) => a.level === parishLevel)
      : null;

    const record = {
      id: ou.id,
      name: ou.name,
      code: ou.code || "",
      level: ou.level,
      district: district ? district.name : "",
      parish: parish ? parish.name : "",
      normalizedName: normalize(ou.name)
    };

    if (!byName.has(record.normalizedName)) {
      byName.set(record.normalizedName, []);
    }
    byName.get(record.normalizedName).push(record);
    return record;
  });

  return { records, byName, districtLevel, parishLevel, schoolLevel, targetLevel };
}

function matchSchools(schools, orgIndex) {
  const matched = [];
  const unmatched = [];

  schools.forEach((school) => {
    const normalizedName = normalize(school.school_name);
    const exactCandidates = orgIndex.byName.get(normalizedName) || [];

    let candidates = [...exactCandidates];
    if (candidates.length === 0) {
      candidates = orgIndex.records.filter((ou) =>
        ou.normalizedName.includes(normalizedName) ||
        normalizedName.includes(ou.normalizedName)
      );
    }

    const scored = candidates.map((ou) => {
      let score = 0;
      if (ou.normalizedName === normalizedName) score += 60;
      if (ou.normalizedName.includes(normalizedName) || normalizedName.includes(ou.normalizedName)) score += 30;
      if (school.district && normalize(ou.district) === normalize(school.district)) score += 25;
      if (school.parish && normalize(ou.parish) === normalize(school.parish)) score += 15;
      if (school.school_uneb && String(ou.code || "") === String(school.school_uneb)) score += 20;
      return { ...ou, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const districtMatch = (ou) =>
      school.district && normalize(ou.district) === normalize(school.district);
    const parishMatch = (ou) =>
      school.parish && normalize(ou.parish) === normalize(school.parish);

    const strictCandidates = scored.filter((ou) => {
      if (!districtMatch(ou)) return false;
      if (school.parish) return parishMatch(ou);
      return true;
    });

    if (strictCandidates.length === 1 && strictCandidates[0].score >= 70) {
      const top = strictCandidates[0];
      matched.push({
        ...school,
        orgunit_id: top.id,
        orgunit_name: top.name,
        orgunit_code: top.code,
        orgunit_district: top.district,
        orgunit_parish: top.parish,
        score: top.score
      });
    } else {
      unmatched.push({
        ...school,
        candidates: scored.slice(0, 5)
      });
    }
  });

  return { matched, unmatched };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 980,
    minHeight: 640,
    title: APP_TITLE,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "index.html"));
  mainWindow = win;
}

function readProfiles() {
  if (!fs.existsSync(profilesPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(profilesPath, "utf8"));
  } catch {
    return {};
  }
}

function writeProfiles(profiles) {
  fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
}

function encryptSecret(plaintext) {
  if (!plaintext) return "";
  const key = crypto.scryptSync(app.getName(), "ple-import-salt", 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decryptSecret(payload) {
  if (!payload) return "";
  try {
    const data = Buffer.from(payload, "base64");
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const key = crypto.scryptSync(app.getName(), "ple-import-salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

async function loadWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  return workbook;
}

function worksheetToAOA(worksheet) {
  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rows[rowNumber - 1] = row.values.slice(1);
  });
  return rows.filter(Boolean);
}

function worksheetToJson(worksheet) {
  const rows = worksheetToAOA(worksheet);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => String(h || "").trim());
  return rows.slice(1).map((row) => {
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = row[idx];
    });
    return obj;
  });
}

function addWorksheetFromJson(workbook, name, rows) {
  const existing = workbook.getWorksheet(name);
  if (existing) workbook.removeWorksheet(existing.id);
  const worksheet = workbook.addWorksheet(name);
  const headers = rows.length ? Object.keys(rows[0]) : [];
  worksheet.addRow(headers);
  rows.forEach((row) => {
    worksheet.addRow(headers.map((h) => row[h]));
  });
  return worksheet;
}

function replaceWorksheetFromAOA(workbook, name, rows) {
  const existing = workbook.getWorksheet(name);
  if (existing) workbook.removeWorksheet(existing.id);
  const worksheet = workbook.addWorksheet(name);
  rows.forEach((row) => worksheet.addRow(row));
  return worksheet;
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("select-pdfs", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "PDF", extensions: ["pdf"] }]
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle("select-org-units", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "CSV or Excel", extensions: ["csv", "xlsx", "xls"] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-output", async () => {
  const result = await dialog.showSaveDialog({
    title: "Save cleaned Excel",
    defaultPath: "ple_results_cleaned.xlsx",
    filters: [{ name: "Excel", extensions: ["xlsx"] }]
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle("select-workbook", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Excel", extensions: ["xlsx"] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("open-external", async (_event, url) => {
  if (!url) return { ok: false, error: "Missing URL." };
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle("run-conversion", async (_event, payload) => {
  const {
    pdfs,
    output,
    orgUnits,
    orgKey,
    orgSchoolIdCol,
    orgParishNameCol,
    orgParishIdCol
  } = payload;

  if (!pdfs || pdfs.length === 0) {
    return { ok: false, error: "Select at least one PDF." };
  }
  if (!output) {
    return { ok: false, error: "Choose an output Excel path." };
  }

  try {
    await convertPdfsToExcel({
      pdfPaths: pdfs,
      outputPath: output,
      orgUnitsPath: orgUnits,
      orgKey,
      orgSchoolIdCol,
      orgParishNameCol,
      orgParishIdCol,
      onProgress: (data) => {
        if (mainWindow) {
          mainWindow.webContents.send("conversion-progress", data);
        }
      }
    });
    if (mainWindow) {
      mainWindow.webContents.send("conversion-complete", { ok: true });
    }
    return { ok: true, output };
  } catch (error) {
    if (mainWindow) {
      mainWindow.webContents.send("conversion-complete", { ok: false });
    }
    return { ok: false, error: error?.message || "Conversion failed." };
  }
});

ipcMain.handle("preview-workbook", async (_event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, error: "Workbook not found." };
  }

  const workbook = await loadWorkbook(filePath);
  const sheetNames = workbook.worksheets.map((sheet) => sheet.name);

  const preview = {};
  for (const name of sheetNames) {
    const sheet = workbook.getWorksheet(name);
    const rows = worksheetToAOA(sheet);
    preview[name] = rows.slice(0, 50);
  }

  return { ok: true, preview, sheetNames };
});

ipcMain.handle("workbook-summary", async (_event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, error: "Workbook not found." };
  }

  const workbook = await loadWorkbook(filePath);
  const summary = {
    learners: 0,
    qaRows: 0,
    unmatchedSchools: 0,
    pivotTotals: {}
  };

  const workingSheet = workbook.getWorksheet("WORKING") || workbook.getWorksheet("raw_records");
  if (workingSheet) {
    const rows = worksheetToAOA(workingSheet);
    summary.learners = Math.max(0, rows.length - 1);
  }

  const qaSheet = workbook.getWorksheet("qa_issues");
  if (qaSheet) {
    const rows = worksheetToAOA(qaSheet);
    summary.qaRows = Math.max(0, rows.length - 1);
  }

  const unmatchedSheet = workbook.getWorksheet("org_unit_unmatched");
  if (unmatchedSheet) {
    const rows = worksheetToAOA(unmatchedSheet);
    summary.unmatchedSchools = Math.max(0, rows.length - 1);
  }

  const divSheet = workbook.getWorksheet("div");
  if (divSheet) {
    const rows = worksheetToAOA(divSheet);
    const header = rows[0] || [];
    const dataRows = rows.slice(1);
    const totals = {};
    const pivotColRe = /^([1-4ux])([fm])$/i;
    header.forEach((label, idx) => {
      if (!pivotColRe.test(String(label || ""))) return;
      totals[label] = 0;
      dataRows.forEach((row) => {
        const val = Number(row[idx] || 0);
        if (!Number.isNaN(val)) totals[label] += val;
      });
    });
    summary.pivotTotals = totals;
  }

  return { ok: true, summary };
});

ipcMain.handle("workbook-records", async (_event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, error: "Workbook not found." };
  }

  const workbook = await loadWorkbook(filePath);
  const sheet = workbook.getWorksheet("WORKING") || workbook.getWorksheet("raw_records");
  if (!sheet) {
    return { ok: false, error: "WORKING/raw_records sheet missing." };
  }

  const rows = worksheetToJson(sheet);
  const records = rows.map((row) => ({
    year: row.Year1 || row.year || row.Year || "",
    school_name: row["sch name"] || row.school_name || "",
    school_id: row["sch id"] || row.school_id || row.school_uneb || "",
    school_uneb: row.school_uneb || row["sch code"] || "",
    district: row.district || row.District || "",
    parish_name: row.parish_name || row.parish || row.Parish || "",
    parish_id: row.parish_id || row.Parish_ID || "",
    learner_name: row.NAME || row.learner_name || "",
    index_no: row.Index_No || row.index_no || "",
    sex: row.SEX || row.sex || "",
    div: row.DIV || row.div || "",
    eng: row.ENG || row.eng || "",
    sci: row.SCI || row.sci || "",
    sst: row.SST || row.sst || "",
    math: row.MATH || row.math || "",
    aggr: row.AGGR || row.aggr || ""
  }));

  return { ok: true, records };
});

function getSessionFilePath() {
  return path.join(app.getPath("userData"), "ple-import-session.json");
}

ipcMain.handle("load-dashboard-session", async () => {
  try {
    const sessionPath = getSessionFilePath();
    if (!fs.existsSync(sessionPath)) {
      return { ok: false, error: "No saved session." };
    }
    const raw = await fs.promises.readFile(sessionPath, "utf8");
    const session = JSON.parse(raw);
    return { ok: true, session };
  } catch (error) {
    return { ok: false, error: error.message || "Failed to load session." };
  }
});

ipcMain.handle("save-dashboard-session", async (_event, payload) => {
  try {
    if (!payload) return { ok: false, error: "Missing session payload." };
    const sessionPath = getSessionFilePath();
    await fs.promises.writeFile(sessionPath, JSON.stringify(payload, null, 2));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "Failed to save session." };
  }
});

ipcMain.handle("clear-dashboard-session", async () => {
  try {
    const sessionPath = getSessionFilePath();
    if (fs.existsSync(sessionPath)) {
      await fs.promises.unlink(sessionPath);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "Failed to clear session." };
  }
});

ipcMain.handle("save-dashboard-export", async (_event, payload) => {
  const { defaultPath, dataUrl } = payload || {};
  if (!dataUrl) {
    return { ok: false, error: "Missing image data." };
  }
  const fallbackName = defaultPath || "dashboard-export.png";
  const initialPath = path.join(app.getPath("downloads"), fallbackName);
  const result = await dialog.showSaveDialog({
    title: "Save dashboard export",
    defaultPath: initialPath,
    filters: [{ name: "PNG Image", extensions: ["png"] }]
  });
  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true };
  }
  const base64 = String(dataUrl).split(",")[1] || "";
  if (!base64) {
    return { ok: false, error: "Invalid image data." };
  }
  await fs.promises.writeFile(result.filePath, Buffer.from(base64, "base64"));
  return { ok: true, filePath: result.filePath };
});

ipcMain.handle("export-csv", async (_event, payload) => {
  const { filePath, sheetName, outputPath } = payload;
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, error: "Workbook not found." };
  }

  const workbook = await loadWorkbook(filePath);
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    return { ok: false, error: "Sheet not found." };
  }

  const rows = worksheetToAOA(sheet);
  const header = rows[0] || [];
  const data = rows.slice(1).map((row) => {
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = row[idx];
    });
    return obj;
  });
  const csv = toCsv(header, data);
  fs.writeFileSync(outputPath, csv);
  return { ok: true };
});

function buildCsvDefaultPath(workbookPath, kind) {
  let baseDir = app.getPath("documents");
  let baseName = "ple_results_import";
  if (workbookPath && fs.existsSync(workbookPath)) {
    const parsed = path.parse(workbookPath);
    baseDir = parsed.dir || baseDir;
    baseName = parsed.name || baseName;
  }
  let candidate = path.join(baseDir, `${baseName}.csv`);
  if (!fs.existsSync(candidate)) return candidate;
  let idx = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(baseDir, `${baseName}_${idx}.csv`);
    idx += 1;
  }
  return candidate;
}

ipcMain.handle("select-csv-output", async (_event, payload = {}) => {
  const { workbookPath, kind, lastPath } = payload;
  const result = await dialog.showSaveDialog({
    title: "Save CSV",
    defaultPath: lastPath || buildCsvDefaultPath(workbookPath, kind),
    filters: [{ name: "CSV", extensions: ["csv"] }]
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle("export-csv-data", async (_event, payload) => {
  const { headers, rows, outputPath } = payload;
  if (!outputPath) return { ok: false, error: "Missing output path." };
  fs.writeFileSync(outputPath, toCsv(headers, rows));
  return { ok: true };
});

ipcMain.handle("dhis2-list-ancestors", async (_event, payload) => {
  const { baseUrl, username, password, ancestorLevelName } = payload;
  if (!baseUrl || !username || !password) {
    return { ok: false, error: "DHIS2 credentials are required." };
  }
  if (!ancestorLevelName) {
    return { ok: false, error: "Ancestor level name is required." };
  }
  try {
    const levels = await dhis2Fetch(
      baseUrl,
      username,
      password,
      "/api/organisationUnitLevels.json?paging=false&fields=id,name,level"
    );
    const levelByNumber = {};
    (levels.organisationUnitLevels || []).forEach((lvl) => {
      levelByNumber[lvl.level] = lvl;
    });
    const levelMatch = Object.values(levelByNumber).find(
      (lvl) => normalize(lvl.name) === normalize(ancestorLevelName)
    );
    if (!levelMatch) {
      return { ok: false, error: "Ancestor level not found in DHIS2." };
    }
    const orgUnits = await dhis2Fetch(
      baseUrl,
      username,
      password,
      `/api/organisationUnits.json?paging=false&fields=id,name,level&filter=level:eq:${levelMatch.level}`
    );
    return { ok: true, ancestors: orgUnits.organisationUnits || [] };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("dhis2-list-children", async (_event, payload) => {
  const { baseUrl, username, password, parentId } = payload;
  if (!baseUrl || !username || !password) {
    return { ok: false, error: "DHIS2 credentials are required." };
  }
  if (!parentId) {
    return { ok: false, error: "Parent id is required." };
  }
  try {
    const parent = await dhis2Fetch(
      baseUrl,
      username,
      password,
      `/api/organisationUnits/${parentId}.json?fields=id,name,level,children[id,name,level]`
    );
    return { ok: true, children: parent.children || [] };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("apply-orgunit-mappings", async (_event, payload) => {
  const { workbookPath, mappings } = payload;
  if (!workbookPath || !fs.existsSync(workbookPath)) {
    return { ok: false, error: "Workbook not found." };
  }
  if (!mappings || mappings.length === 0) {
    return { ok: false, error: "No mappings provided." };
  }

  const workbook = await loadWorkbook(workbookPath);
  const sheet = workbook.getWorksheet("WORKING") || workbook.getWorksheet("raw_records");
  if (!sheet) {
    return { ok: false, error: "WORKING/raw_records sheet missing." };
  }

  const rows = worksheetToAOA(sheet);
  if (rows.length === 0) {
    return { ok: false, error: "WORKING sheet is empty." };
  }
  const header = rows[0].map((h) => String(h || "").trim());
  let nameIdx = header.findIndex((h) => normalize(h) === normalize("sch name"));
  if (nameIdx === -1) {
    nameIdx = header.findIndex((h) => normalize(h) === normalize("school_name"));
  }
  let unebIdx = header.findIndex((h) => normalize(h) === normalize("school_uneb"));
  if (unebIdx === -1) {
    unebIdx = header.findIndex((h) => normalize(h) === normalize("sch code"));
  }
  let idIdx = header.findIndex((h) => normalize(h) === normalize("sch id"));
  if (idIdx === -1) {
    header.push("sch id");
    idIdx = header.length - 1;
  }
  rows[0] = header;

  const mappingByName = new Map();
  const mappingByNameAndCode = new Map();
  mappings.forEach((m) => {
    const key = normalize(m.school_name || "");
    if (key) mappingByName.set(key, m);
    const codeKey = normalize(m.school_uneb || "");
    if (key && codeKey) mappingByNameAndCode.set(`${codeKey}::${key}`, m);
  });

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const schoolName = normalize(row[nameIdx] || "");
    const schoolCode = unebIdx !== -1 ? normalize(row[unebIdx] || "") : "";
    const match =
      (schoolCode ? mappingByNameAndCode.get(`${schoolCode}::${schoolName}`) : null) ||
      mappingByName.get(schoolName);
    if (!match) continue;
    row[idIdx] = match.orgunit_id || row[idIdx] || "";
    rows[i] = row;
  }

  replaceWorksheetFromAOA(workbook, "WORKING", rows);
  addWorksheetFromJson(workbook, "org_unit_confirmed", mappings);
  addWorksheetFromJson(workbook, "mapped_orgunit_hierarchy", mappings);
  await workbook.xlsx.writeFile(workbookPath);
  return { ok: true };
});

ipcMain.handle("write-mapped-orgunit-hierarchy", async (_event, payload) => {
  const { workbookPath, mappings } = payload;
  if (!workbookPath || !fs.existsSync(workbookPath)) {
    return { ok: false, error: "Workbook not found." };
  }
  if (!Array.isArray(mappings)) {
    return { ok: false, error: "Missing mappings." };
  }
  const workbook = await loadWorkbook(workbookPath);
  const trimmed = mappings.map((row) => ({
    school_uneb: row.school_uneb || "",
    school_name: row.school_name || "",
    district: row.district || "",
    parish: row.parish || "",
    orgunit_id: row.orgunit_id || "",
    orgunit_name: row.orgunit_name || "",
    score: row.score || 0
  }));
  addWorksheetFromJson(workbook, "mapped_orgunit_hierarchy", trimmed);
  await workbook.xlsx.writeFile(workbookPath);
  return { ok: true };
});

ipcMain.handle("write-orgunit-list", async (_event, payload) => {
  const { workbookPath, orgUnits, targetLevel, parentOrgunitId, parentOrgunitName } = payload;
  if (!workbookPath || !fs.existsSync(workbookPath)) {
    return { ok: false, error: "Workbook not found." };
  }
  if (!Array.isArray(orgUnits)) {
    return { ok: false, error: "Missing org units." };
  }
  const rows = orgUnits.map((ou) => ({
    target_level: targetLevel || "",
    parent_orgunit_id: parentOrgunitId || "",
    parent_orgunit_name: parentOrgunitName || "",
    orgunit_id: ou.id || "",
    orgunit_name: ou.name || ""
  }));
  const workbook = await loadWorkbook(workbookPath);
  addWorksheetFromJson(workbook, "org_unit_unmatched", rows);
  await workbook.xlsx.writeFile(workbookPath);
  return { ok: true };
});

ipcMain.handle("dhis2-fetch-hierarchy", async (_event, payload) => {
  const { baseUrl, username, password } = payload;
  if (!baseUrl || !username || !password) {
    return { ok: false, error: "DHIS2 credentials are required." };
  }

  try {
    const cacheKey = `${baseUrl}|${username}`;
    const cached = levelsCache.get(cacheKey);
    if (cached) return { ok: true, levels: cached };
    const levels = await dhis2Fetch(
      baseUrl,
      username,
      password,
      "/api/organisationUnitLevels.json?paging=false&fields=id,name,level"
    );
    const levelByNumber = {};
    (levels.organisationUnitLevels || []).forEach((lvl) => {
      levelByNumber[lvl.level] = lvl;
    });

    const levelSet = new Set();
    Object.keys(levelByNumber).forEach((levelNum) => levelSet.add(Number(levelNum)));
    const sortedLevels = [...levelSet]
      .sort((a, b) => a - b)
      .map((levelNum) => ({
        level: levelNum,
        name: levelByNumber[levelNum]?.name || `Level ${levelNum}`
      }));

    levelsCache.set(cacheKey, sortedLevels);
    return { ok: true, levels: sortedLevels };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("dhis2-fetch-orgunits", async (_event, payload) => {
  const { baseUrl, username, password, levelName, ancestorId } = payload;
  if (!baseUrl || !username || !password) {
    return { ok: false, error: "DHIS2 credentials are required." };
  }
  if (!levelName) {
    return { ok: false, error: "Org unit level is required." };
  }

  try {
    const levels = await dhis2Fetch(
      baseUrl,
      username,
      password,
      "/api/organisationUnitLevels.json?paging=false&fields=id,name,level"
    );
    const levelByName = new Map();
    (levels.organisationUnitLevels || []).forEach((lvl) => {
      levelByName.set(lvl.name, lvl.level);
    });
    const levelNum = levelByName.get(levelName);
    if (!levelNum) {
      return { ok: false, error: `Level not found: ${levelName}` };
    }
    const filters = [`filter=level:eq:${levelNum}`];
    if (ancestorId) {
      filters.push(`filter=path:ilike:${encodeURIComponent(ancestorId)}`);
    }
    const orgUnits = await dhis2Fetch(
      baseUrl,
      username,
      password,
      `/api/organisationUnits.json?paging=false&fields=id,name,level&${filters.join("&")}`
    );
    const items = (orgUnits.organisationUnits || [])
      .map((ou) => ({ id: ou.id, name: ou.name }))
      .filter((ou) => ou.id && ou.name);
    return { ok: true, orgUnits: items };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("workbook-schools", async (_event, payload) => {
  const { workbookPath } = payload;
  if (!workbookPath || !fs.existsSync(workbookPath)) {
    return { ok: false, error: "Workbook not found." };
  }
  const workbook = await loadWorkbook(workbookPath);
  const sheet = workbook.getWorksheet("WORKING") || workbook.getWorksheet("raw_records");
  if (!sheet) {
    return { ok: false, error: "WORKING/raw_records sheet missing." };
  }
  const rows = worksheetToJson(sheet);
  const schoolsMap = new Map();
  rows.forEach((row) => {
    const name = row["sch name"] || row["school_name"] || "";
    if (!name) return;
    const code = row["school_uneb"] || row["sch code"] || "";
    const district = row["district"] || row["District"] || "";
    const parish = row["parish_name"] || row["Parish"] || "";
    const key = `${code}::${name}`;
    if (!schoolsMap.has(key)) {
      schoolsMap.set(key, {
        school_uneb: code,
        school_name: name,
        district,
        parish
      });
    }
  });
  return { ok: true, schools: Array.from(schoolsMap.values()) };
});

ipcMain.handle("profiles-list", async () => {
  return { ok: true, profiles: readProfiles() };
});

ipcMain.handle("profiles-save", async (_event, payload) => {
  const { name, profile } = payload;
  if (!name) return { ok: false, error: "Profile name required." };
  const profiles = readProfiles();
  const sanitized = { ...profile };
  if (sanitized.dhis2Pass) {
    sanitized.dhis2Pass = encryptSecret(sanitized.dhis2Pass);
  }
  profiles[name] = sanitized;
  writeProfiles(profiles);
  return { ok: true };
});

ipcMain.handle("profiles-load", async (_event, payload) => {
  const profiles = readProfiles();
  const profile = profiles[payload.name] || null;
  if (profile && profile.dhis2Pass) {
    profile.dhis2Pass = decryptSecret(profile.dhis2Pass);
  }
  return { ok: true, profile };
});

ipcMain.handle("dhis2-automatch", async (_event, payload) => {
  const {
    workbookPath,
    baseUrl,
    username,
    password,
    districtLevelName,
    parishLevelName,
    districtColumn,
    parishColumn,
    schoolNameColumn,
    schoolCodeColumn,
    writeToWorkbook
  } = payload;

  if (!workbookPath || !fs.existsSync(workbookPath)) {
    return { ok: false, error: "Workbook not found." };
  }
  if (!baseUrl || !username || !password) {
    return { ok: false, error: "DHIS2 credentials are required." };
  }

  try {
    const levels = await dhis2Fetch(
      baseUrl,
      username,
      password,
      "/api/organisationUnitLevels.json?paging=false&fields=id,name,level"
    );
    const levelByNumber = {};
    (levels.organisationUnitLevels || []).forEach((lvl) => {
      levelByNumber[lvl.level] = lvl;
    });

    const ancestorIds = Array.isArray(payload.ancestorFilterIds)
      ? payload.ancestorFilterIds.filter(Boolean)
      : payload.ancestorFilter
        ? [payload.ancestorFilter]
        : [];
    const fetches = ancestorIds.length
      ? await Promise.all(
          ancestorIds.map((ancestorId) =>
            dhis2Fetch(
              baseUrl,
              username,
              password,
              `/api/organisationUnits.json?paging=false&fields=id,name,code,level,ancestors[id,name,level]&filter=path:ilike:${encodeURIComponent(ancestorId)}`
            )
          )
        )
      : [
          await dhis2Fetch(
            baseUrl,
            username,
            password,
            "/api/organisationUnits.json?paging=false&fields=id,name,code,level,ancestors[id,name,level]"
          )
        ];
    const merged = new Map();
    fetches.forEach((result) => {
      (result.organisationUnits || []).forEach((ou) => {
        if (ou && ou.id) merged.set(ou.id, ou);
      });
    });
    const orgUnits = { organisationUnits: [...merged.values()] };

    const workbook = await loadWorkbook(workbookPath);
    const rawSheet = workbook.getWorksheet("WORKING") || workbook.getWorksheet("raw_records");
    if (!rawSheet) {
      return { ok: false, error: "WORKING/raw_records sheet missing from workbook." };
    }

    const rows = worksheetToJson(rawSheet);
    const sample = rows[0] || {};
    const pickColumn = (preferred, fallback, alt) => {
      if (preferred && preferred in sample) return preferred;
      if (fallback && fallback in sample) return fallback;
      if (alt && alt in sample) return alt;
      return preferred || fallback || alt;
    };

    const schoolNameKey = pickColumn(schoolNameColumn, "school_name", "sch name");
    const schoolCodeKey = pickColumn(schoolCodeColumn, "school_uneb", "sch code");
    const districtKey = pickColumn(districtColumn, "district", "District");
    const parishKey = pickColumn(parishColumn, "parish_name", "Parish");
    const schoolsMap = new Map();
    rows.forEach((row) => {
      const schoolName = row[schoolNameKey];
      if (!schoolName) return;
      const key = `${row[schoolCodeKey] || ""}::${schoolName}`;
      if (!schoolsMap.has(key)) {
        schoolsMap.set(key, {
          school_uneb: row[schoolCodeKey] || "",
          school_name: schoolName,
          district: row[districtKey] || "",
          parish: row[parishKey] || ""
        });
      }
    });

    const schools = Array.from(schoolsMap.values());
    const orgIndex = buildOrgUnitIndex(
      orgUnits.organisationUnits || [],
      levelByNumber,
      districtLevelName || "District",
      parishLevelName || "Parish",
      payload.schoolLevelName || "",
      payload.targetLevelName || "",
      payload.ancestorFilter || ""
    );

    const result = matchSchools(schools, orgIndex);

    if (writeToWorkbook) {
      addWorksheetFromJson(workbook, "org_unit_automatch", result.matched);
      addWorksheetFromJson(
        workbook,
        "org_unit_unmatched_api",
        result.unmatched.map((u) => ({
          school_uneb: u.school_uneb,
          school_name: u.school_name,
          district: u.district,
          parish: u.parish,
          candidates: u.candidates
            .map((c) => `${c.name} (${c.district || "?"}/${c.parish || "?"})`)
            .join(" | ")
        }))
      );
      await workbook.xlsx.writeFile(workbookPath);
    }

    return { ok: true, matched: result.matched, unmatched: result.unmatched };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
