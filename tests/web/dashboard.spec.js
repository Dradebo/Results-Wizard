const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test("dashboard shell and custom visualizer controls load", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "3. Dashboard" }).click();

  await expect(page.getByRole("heading", { name: "Results Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Customise" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Custom Visualizer" })).toBeVisible();

  await expect(page.locator("#custom-mode")).toBeVisible();
  await expect(page.locator("#custom-metric")).toBeVisible();
  await expect(page.locator("#custom-category")).toBeVisible();
  await expect(page.locator("#custom-district")).toBeHidden();
  await expect(page.locator("#custom-parish")).toBeHidden();
  await expect(page.locator("#custom-school")).toBeHidden();

  await page.locator("#custom-mode").selectOption("advanced");
  await expect(page.locator("#custom-district")).toBeVisible();
  await expect(page.locator("#custom-parish")).toBeVisible();
  await expect(page.locator("#custom-school")).toBeVisible();
});

test("dashboard renders aggregate charts after PDF ingest", async ({ page }) => {
  test.setTimeout(180_000);
  const envPdf = process.env.PLE_SAMPLE_PDF ? path.resolve(process.env.PLE_SAMPLE_PDF) : "";
  const samplePdf = envPdf && fs.existsSync(envPdf) ? envPdf : "";
  test.skip(!samplePdf, "Set PLE_SAMPLE_PDF to a real UNEB PDF to run ingest+render validation.");

  await page.goto("/");
  await page.locator("#pdf-input").setInputFiles(samplePdf);
  await page.getByRole("button", { name: "Run conversion" }).click();

  await expect(page.locator("#status")).toHaveText("Conversion complete.", { timeout: 170_000 });
  await page.getByRole("button", { name: "3. Dashboard" }).click();

  await expect(page.locator("#division-chart .chart-row").first()).toBeVisible();
  await expect(page.locator("#subject-chart .chart-row").first()).toBeVisible();
  await expect(page.locator("#school-chart .chart-row").first()).toBeVisible();

  await page.locator("#custom-metric").selectOption("distinction_rate");
  await page.locator("#custom-category").selectOption("subject");
  await page.locator("#custom-type").selectOption("donut");
  await page.getByRole("button", { name: "Add visualization" }).click();

  await expect(page.locator("#custom-charts .chart-card").first()).toBeVisible();
});
