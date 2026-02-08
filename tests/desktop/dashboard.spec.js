const path = require("path");
const { test, expect, _electron: electron } = require("@playwright/test");

test("desktop app opens dashboard and exposes custom visualizer", async () => {
  const app = await electron.launch({
    cwd: path.resolve(__dirname, "../.."),
    args: ["."],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: ""
    }
  });

  try {
    const window = await app.firstWindow();
    await expect(window.getByRole("heading", { name: "Ingestion" })).toBeVisible();

    await window.getByRole("button", { name: "4. Dashboard" }).click();
    await expect(window.getByRole("heading", { name: "Results Dashboard" })).toBeVisible();
    await expect(window.getByRole("heading", { name: "Custom Visualizer" })).toBeVisible();

    await expect(window.locator("#custom-mode")).toBeVisible();
    await expect(window.locator("#custom-metric")).toBeVisible();
    await expect(window.locator("#custom-category")).toBeVisible();
    await expect(window.locator("#custom-district")).toBeHidden();
    await expect(window.locator("#custom-parish")).toBeHidden();
    await expect(window.locator("#custom-school")).toBeHidden();
    await window.locator("#custom-mode").selectOption("advanced");
    await expect(window.locator("#custom-district")).toBeVisible();
    await expect(window.locator("#custom-parish")).toBeVisible();
    await expect(window.locator("#custom-school")).toBeVisible();
    await expect(window.getByRole("heading", { name: "Intervention Required" })).toHaveCount(0);
  } finally {
    const window = app.windows()[0];
    if (window) {
      await window.evaluate(async () => {
        if (window.api?.clearDashboardSession) {
          await window.api.clearDashboardSession();
        }
      });
    }
    await app.close();
  }
});

test("desktop dashboard restores saved aggregate records and renders chart rows", async () => {
  const app = await electron.launch({
    cwd: path.resolve(__dirname, "../.."),
    args: ["."],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: ""
    }
  });

  try {
    const window = await app.firstWindow();
    const records = [
      { year: "2024", schoolName: "School A", district: "District 1", parish: "Parish X", sex: "F", div: "1", eng: 2, sci: 3, sst: 2, math: 3, aggr: 10 },
      { year: "2024", schoolName: "School A", district: "District 1", parish: "Parish X", sex: "M", div: "2", eng: 3, sci: 4, sst: 3, math: 4, aggr: 14 },
      { year: "2024", schoolName: "School B", district: "District 1", parish: "Parish Y", sex: "F", div: "2", eng: 4, sci: 4, sst: 5, math: 4, aggr: 17 },
      { year: "2024", schoolName: "School B", district: "District 1", parish: "Parish Y", sex: "M", div: "3", eng: 6, sci: 6, sst: 5, math: 6, aggr: 23 },
      { year: "2024", schoolName: "School C", district: "District 2", parish: "Parish Z", sex: "F", div: "4", eng: 7, sci: 6, sst: 7, math: 7, aggr: 28 },
      { year: "2024", schoolName: "School C", district: "District 2", parish: "Parish Z", sex: "M", div: "U", eng: 9, sci: 9, sst: 9, math: 8, aggr: 35 }
    ];

    await window.evaluate(async (payload) => {
      await window.api.saveDashboardSession({
        savedAt: new Date().toISOString(),
        keepSession: true,
        records: payload,
        customCharts: [],
        pdfs: [],
        output: null,
        orgUnits: null,
        workbookPath: null
      });
    }, records);

    await window.reload();
    await window.getByRole("button", { name: "4. Dashboard" }).click();

    await expect(window.locator("#division-chart .chart-row").first()).toBeVisible();
    await expect(window.locator("#subject-chart .chart-row").first()).toBeVisible();
    await expect(window.locator("#school-chart .chart-row").first()).toBeVisible();
    await expect(window.getByRole("heading", { name: "Intervention Required" })).toHaveCount(0);
  } finally {
    const window = app.windows()[0];
    if (window) {
      await window.evaluate(async () => {
        if (window.api?.clearDashboardSession) {
          await window.api.clearDashboardSession();
        }
      });
    }
    await app.close();
  }
});

test("desktop supports saved jobs history with multiple snapshots", async () => {
  const app = await electron.launch({
    cwd: path.resolve(__dirname, "../.."),
    args: ["."],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: ""
    }
  });

  try {
    const window = await app.firstWindow();
    const baseSession = {
      keepSession: true,
      pdfs: [],
      output: null,
      orgUnits: null,
      workbookPath: null,
      customCharts: []
    };

    await window.evaluate(async (payload) => {
      if (window.api?.clearDashboardSession) {
        await window.api.clearDashboardSession();
      }
      if (window.api?.saveDashboardJob) {
        await window.api.saveDashboardJob({
          createNew: true,
          name: "Snapshot A",
          session: {
            ...payload,
            savedAt: new Date().toISOString(),
            records: [{ year: "2024", schoolName: "School A", district: "District 1", parish: "Parish X", sex: "F", div: "1", eng: 2, sci: 3, sst: 2, math: 3, aggr: 10 }]
          }
        });
        await window.api.saveDashboardJob({
          createNew: true,
          name: "Snapshot B",
          session: {
            ...payload,
            savedAt: new Date().toISOString(),
            records: [{ year: "2025", schoolName: "School B", district: "District 2", parish: "Parish Y", sex: "M", div: "2", eng: 3, sci: 4, sst: 4, math: 4, aggr: 15 }]
          }
        });
      }
    }, baseSession);

    await window.reload();
    await expect(window.locator("#saved-job-select option")).toHaveCount(2);

    const snapshotAValue = await window.evaluate(() => {
      const select = document.getElementById("saved-job-select");
      if (!select) return "";
      const match = [...select.options].find((option) => option.textContent.includes("Snapshot A"));
      return match ? match.value : "";
    });
    await window.locator("#saved-job-select").selectOption(snapshotAValue);
    await window.getByRole("button", { name: "Load selected" }).click();
    await expect(window.locator("#session-status")).toContainText("Loaded saved job:");
  } finally {
    const window = app.windows()[0];
    if (window) {
      await window.evaluate(async () => {
        if (window.api?.clearDashboardSession) {
          await window.api.clearDashboardSession();
        }
      });
    }
    await app.close();
  }
});
