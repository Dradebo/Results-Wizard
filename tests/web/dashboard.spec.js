const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test("portal demo shell and parent result workflow load", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Term 3, 2026 Dashboard" })).toBeVisible();
  await expect(page.getByText("Active batch")).toBeVisible();
  await expect(page.getByText("Term report progress")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Items to fix" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New results batch" }).first()).toBeVisible();

  await page.getByRole("button", { name: "New Batch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "New results batch", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download template" })).toBeVisible();
  await expect(page.getByText("Template columns")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Teacher submissions" })).toBeVisible();
  await expect(page.getByText("Full class pending")).toBeVisible();

  await page.locator('.nav-item[data-view="parent"]').click();
  await expect(page.getByRole("heading", { name: "Parent Result Preview" })).toBeVisible();
  await expect(page.locator(".phone-card .verified")).toContainText("Official result published by the school");
  await expect(page.locator("#report-template")).toBeVisible();

  await page.locator("#report-template").selectOption("cbc");
  await expect(page.locator("#parent-overall")).toHaveText("Outstanding");
  await expect(page.locator("#template-notes").getByText("CBC competency report")).toBeVisible();

  await page.getByRole("button", { name: "Subscription" }).click();
  await expect(page.getByRole("heading", { name: "Subscription And Demo Requests" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Analytics Plus" })).toBeVisible();
  await expect(page.locator(".price-card").filter({ hasText: "Term Portal" }).getByText("UGX 500,000")).toBeVisible();
  await expect(page.locator(".price-card").filter({ hasText: "Custom School Analytics" }).getByText("UGX 1,500,000")).toBeVisible();
});

test("portal analytics workflow renders", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Analytics/ }).click();

  await expect(page.getByRole("heading", { name: "School Analytics" })).toBeVisible();
  await expect(page.locator("#division-chart .chart-row").first()).toBeVisible();
  await expect(page.locator("#subject-chart .chart-row").first()).toBeVisible();
  await expect(page.locator("#school-chart .chart-row").first()).toBeVisible();
  await expect(page.locator("#custom-mode")).toBeVisible();
  await expect(page.locator("#custom-metric")).toBeVisible();
  await expect(page.locator("#custom-category")).toBeVisible();
});

test("mobile dashboard and parent preview do not horizontally overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const dashboardOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(dashboardOverflow).toBeLessThanOrEqual(1);

  await page.locator('.nav-item[data-view="parent"]').click();
  await expect(page.getByRole("heading", { name: "Parent Result Preview" })).toBeVisible();
  const parentOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(parentOverflow).toBeLessThanOrEqual(1);
});

test("CSV teacher marks ingest generates review preview and parent-ready workbook", async ({ page }) => {
  const sampleCsv = path.resolve("tests/fixtures/sample-teacher-marks.csv");
  expect(fs.existsSync(sampleCsv)).toBeTruthy();

  await page.goto("/");
  await page.getByRole("button", { name: "New Batch", exact: true }).click();
  await page.locator("#pdf-input").setInputFiles(sampleCsv);
  await page.getByRole("button", { name: "Check marks file" }).click();

  await expect(page.locator("#status")).toHaveText("Marks checked. Review the report list before sending links.");
  await expect(page.locator("#summary")).toContainText("3");
  await expect(page.locator("#summary")).toContainText("Ready links");
  await expect(page.locator("#sheet-select")).toContainText("parent_results");
  await page.locator("#sheet-select").selectOption("parent_results");
  await expect(page.locator("#preview-table tbody")).toContainText("Nakato Sarah");
  await expect(page.locator("#preview-table tbody")).toContainText("RW-P7-BLUE-001");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.locator("#preview-table tbody tr").first()).toBeVisible();
});

test("optional PLE PDF ingest still feeds review preview", async ({ page }) => {
  test.setTimeout(180_000);
  const envPdf = process.env.PLE_SAMPLE_PDF ? path.resolve(process.env.PLE_SAMPLE_PDF) : "";
  const samplePdf = envPdf && fs.existsSync(envPdf) ? envPdf : "";
  test.skip(!samplePdf, "Set PLE_SAMPLE_PDF to a real UNEB PDF to run ingest+render validation.");

  await page.goto("/");
  await page.getByRole("button", { name: "New Batch", exact: true }).click();
  await page.locator("#pdf-input").setInputFiles(samplePdf);
  await page.getByRole("button", { name: "Check marks file" }).click();

  await expect(page.locator("#status")).toHaveText("Marks checked. Review the report list before sending links.", { timeout: 170_000 });
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.locator("#preview-table tbody tr").first()).toBeVisible();
});
