const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  selectPdfs: () => ipcRenderer.invoke("select-pdfs"),
  selectOrgUnits: () => ipcRenderer.invoke("select-org-units"),
  selectOutput: () => ipcRenderer.invoke("select-output"),
  selectWorkbook: () => ipcRenderer.invoke("select-workbook"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  runConversion: (payload) => ipcRenderer.invoke("run-conversion", payload),
  previewWorkbook: (filePath) => ipcRenderer.invoke("preview-workbook", filePath),
  workbookSummary: (filePath) => ipcRenderer.invoke("workbook-summary", filePath),
  workbookRecords: (filePath) => ipcRenderer.invoke("workbook-records", filePath),
  loadDashboardSession: () => ipcRenderer.invoke("load-dashboard-session"),
  saveDashboardSession: (payload) => ipcRenderer.invoke("save-dashboard-session", payload),
  clearDashboardSession: () => ipcRenderer.invoke("clear-dashboard-session"),
  saveDashboardExport: (payload) => ipcRenderer.invoke("save-dashboard-export", payload),
  exportCsvData: (payload) => ipcRenderer.invoke("export-csv-data", payload),
  dhis2Automatch: (payload) => ipcRenderer.invoke("dhis2-automatch", payload),
  dhis2ListAncestors: (payload) => ipcRenderer.invoke("dhis2-list-ancestors", payload),
  applyOrgunitMappings: (payload) => ipcRenderer.invoke("apply-orgunit-mappings", payload),
  writeMappedOrgunitHierarchy: (payload) =>
    ipcRenderer.invoke("write-mapped-orgunit-hierarchy", payload),
  dhis2FetchHierarchy: (payload) => ipcRenderer.invoke("dhis2-fetch-hierarchy", payload),
  dhis2FetchOrgunits: (payload) => ipcRenderer.invoke("dhis2-fetch-orgunits", payload),
  writeOrgunitList: (payload) => ipcRenderer.invoke("write-orgunit-list", payload),
  dhis2ListChildren: (payload) => ipcRenderer.invoke("dhis2-list-children", payload),
  workbookSchools: (payload) => ipcRenderer.invoke("workbook-schools", payload),
  profilesList: () => ipcRenderer.invoke("profiles-list"),
  profilesSave: (payload) => ipcRenderer.invoke("profiles-save", payload),
  profilesLoad: (payload) => ipcRenderer.invoke("profiles-load", payload),
  exportCsv: (payload) => ipcRenderer.invoke("export-csv", payload),
  selectCsvOutput: (payload) => ipcRenderer.invoke("select-csv-output", payload),
  onConversionProgress: (handler) =>
    ipcRenderer.on("conversion-progress", (_event, data) => handler(data)),
  onConversionComplete: (handler) =>
    ipcRenderer.on("conversion-complete", (_event, data) => handler(data))
});
