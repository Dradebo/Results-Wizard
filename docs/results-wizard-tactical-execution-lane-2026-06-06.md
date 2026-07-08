# Results Wizard Tactical Execution Lane

Updated: 2026-06-06

Goal: Ship a sales-grade pilot demo for one school admin walkthrough in the next 2-4 weeks: upload batch -> review issues -> preview parent result -> show analytics -> request demo/pilot.

Decision: do not build full SaaS backend now. Build only the minimum product seams and infrastructure needed to make the demo believable, testable, and easy to evolve into a pilot.

Ground truth checked in repo:
- Demo routes already exist in `web/index.html` and `web/src/main.js`: Dashboard, New Batch, Review, Parent, Links, Analytics, Subscription.
- Web build passes with `npm --prefix web run build`.
- Web smoke tests are currently blocked because `playwright` is not installed in the root runtime (`npm run test:web` -> `sh: 1: playwright: not found`).
- Current app still has legacy package/app identity in root Electron files (`package.json`, `main.js`).
- CSV/PLE ingest currently lands in a PLE-shaped workbook pipeline in `web/src/pdfToWorkbook.js`.
- Lead capture is localStorage-only in `web/src/main.js`; no backend handoff exists.
- Parser audit update: the live CSV upload path in `web/src/main.js` bypasses the richer CSV parser in `web/src/pdfToWorkbook.js`, so the parser is functional as a toy demo but not logically sound enough for a school pilot without correction.

## Executive lane

Week 1 = tighten the sales story and remove trust breakers.
Week 2 = make the demo internally consistent end-to-end and testable.
Week 3 = add minimum backend/infrastructure seams that support pilot handoff without pretending to be production.
Week 4 = optional polish / capture / packaging if week 1-3 lands early.

## 1) Must-fix engineering tasks now

These are the tasks that most directly affect whether the walkthrough feels credible.

### A. Remove remaining legacy / utility framing
Why now:
- The product direction explicitly says Results Wizard is a school results portal, not a PLE converter.
- Legacy names in Electron/package metadata will leak during packaging, app chrome, and repo operations.

Actions:
- Rename root package/app metadata away from `ple-import-desktop` / `PLE Import Prep`.
- Remove any remaining utility-style copy that sounds like a conversion tool instead of a school operations portal.
- Keep PLE explicitly framed as one adapter only.

File focus:
- `package.json`
- `main.js`
- `web/index.html`
- `web/src/main.js`
- optionally `playwright.web.config.js` / `tests/web/dashboard.spec.js` if titles/selectors change

### B. Make the review screen prove the hard cases
Why now:
- The current audit gap is real: the review screen describes duplicate learner and grade mismatch, but the main table/demo flow does not actually dramatize them.
- This is the core trust screen for school admins.

Actions:
- Expand demo learner data so the review table contains explicit rows for:
  - duplicate learner / conflicting record
  - grade mismatch against school scale
  - missing comment
  - missing mark
  - blocked publish state
- Add visible issue badges or inline reasons in the review table, not only side notes.
- Make one click path from bad row -> preview or fix explanation.
- Ensure summary counts reflect these issue categories.

File focus:
- `web/src/main.js` (learner fixture data, review rendering, summary logic, table actions)
- `web/index.html` (review columns, issue chips, helper copy)
- `tests/web/dashboard.spec.js` (assert the new edge cases are visible)

### C. Stop overpromising delivery/automation depth
Why now:
- Several controls imply real send/delivery/export behavior even though the app is still a demo.
- Overclaiming damages trust faster than incomplete polish.

Actions:
- Reword delivery buttons and analytics/export controls so they read as pilot workflow previews unless backed by actual behavior.
- Replace ambiguous labels like "Open delivery queue" with wording that matches current capability.
- Keep the send/revoke/regenerate model visible, but mark it as operator-assisted / pilot workflow where appropriate.
- Do the same for analytics export if it only downloads the workbook today.

File focus:
- `web/index.html`
- `web/src/main.js`

### D. Unblock smoke testing
Why now:
- The launch brief requires Playwright smoke coverage.
- Current status is hard-blocked by missing runtime install, not failing assertions.

Actions:
- Install root dependencies and Playwright browser runtime for this environment.
- Re-run `npm run test:web`.
- Fix any selector/copy regressions introduced by the product tightening above.
- Keep PLE ingest test optional, but keep CSV ingest smoke green.

File focus:
- no code first: root install/runtime
- if needed: `tests/web/dashboard.spec.js`, `playwright.web.config.js`, `package.json`

### E. Create a believable pilot lead-capture seam
Why now:
- The walkthrough ends on request demo/pilot; localStorage-only capture is too thin for an implementation-ready demo.
- You do not need full auth/db, but you do need a believable handoff path.

Actions:
- Introduce a tiny adapter layer for lead submission with two modes:
  - demo/local mode -> current local save/export
  - webhook/API stub mode -> POST to a configurable endpoint
- Surface submission state clearly: saved locally vs sent to pilot inbox.
- Keep offline fallback so the demo never hard-fails.

File focus:
- `web/src/main.js`
- create `web/src/config.js` or `web/src/demoApi.js`
- optionally `web/.env.example` or README notes if a Vite env var is introduced

### F. Make CSV parsing logically sound before calling it a pilot parser
Why now:
- The current school-owner walkthrough is CSV-first, but the active CSV upload branch in `web/src/main.js` uses a simplified `parseCsv()` + `buildWorkbookFromRows()` path.
- That path treats each CSV row as a report-card row, while the provided teacher marksheet template is one row per learner per subject.
- The richer `parseTeacherCsvFile()` logic in `web/src/pdfToWorkbook.js` already groups subjects under learners, captures parent/contact/comment fields, and emits QA rows, but CSV uploads do not currently use it.
- Therefore the parser works as a demo file reader, but it is not logically sound as the Results Wizard parser.

Observed parser audit results:
- `npm --prefix web run build` passes.
- `tests/fixtures/sample-teacher-marks.csv` parses as 4 CSV rows, but those rows represent 3 learner reports.
- The active workbook mapping checks `row.name || row.learner`, but the official template uses `Learner name`, so generated report rows can have blank learner names.
- Nakato Sarah appears as two subject rows; the active path does not aggregate Mathematics + English into one learner report.
- `numericAverage()` averages the row-level `Mark` column, so it produces per-subject marks instead of learner-level averages.
- The active CSV splitter handles quoted commas, but breaks on quoted multiline comments.
- The active CSV path has no meaningful validation for required columns, duplicates, impossible marks, missing parent contacts, grade mismatches, or malformed files.

Actions:
- Route CSV uploads through `convertPdfsToWorkbook()` / `parseTeacherCsvFile()` instead of the simplified `main.js` parser branch.
- Keep one canonical ingestion pipeline for CSV and PDF adapters.
- Add a parser regression test proving the sample teacher marksheet produces 3 learner records, not 4 report-card rows.
- Assert that Nakato Sarah has two subjects and one parent result row.
- Assert that Kato Daniel's missing Mathematics mark lands in `qa_issues`.
- Add a bad-header test with a clear school-facing error.
- Either replace the hand-written CSV splitter with a robust parser or explicitly reject multiline quoted cells with a clear QA message.

File focus:
- `web/src/main.js` (remove/bypass simplified CSV branch)
- `web/src/pdfToWorkbook.js` (promote `parseTeacherCsvFile` as canonical CSV parser)
- `tests/fixtures/sample-teacher-marks.csv`
- `tests/web/dashboard.spec.js` or a new focused parser test file

## 2) Should-fix next

These deepen the product story after the must-fix set is stable.

### G. Separate demo product state from parser/workbook plumbing
Why next:
- `web/src/main.js` currently carries most fixture data, view logic, lead handling, chart data, and review flows in one file.
- That is workable for the demo, but it slows targeted iteration.

Actions:
- Extract demo fixtures and UI state into dedicated modules.
- Keep ingest/workbook transformation isolated from portal-story demo data.
- Introduce a simple `demoData` / `portalState` / `leadCapture` split.

File focus:
- `web/src/main.js`
- create `web/src/demoData.js`
- create `web/src/portalState.js` or `web/src/leadCapture.js`

### H. Tighten the analytics-to-sales bridge
Why next:
- Analytics page is strong visually, but the conversion path to subscription/custom analytics is still mostly adjacent rather than progressive.

Actions:
- Add one explicit CTA thread from analytics insight -> report/export package -> request analytics plan.
- Make "public-safe marketing snapshot" and "board report" map directly to package tiers.
- Show which outputs are included in Term Portal vs Analytics Plus vs Custom.

File focus:
- `web/index.html`
- `web/src/main.js`
- `tests/web/dashboard.spec.js`

### I. Introduce a generalized school dataset beside parser output
Why next:
- The launch brief asks for generalized fictional school data separate from the PLE fixture.
- This will help the product feel broader than one parser path.

Actions:
- Move current hard-coded learner/batch/chart/template fixtures into a named sample school dataset.
- Add fields for guardian contact, notice, comments, report type, and issue types consistently.
- Use the same dataset across Dashboard, Review, Parent, Links, Analytics, and Subscription.

File focus:
- `web/src/main.js`
- create `web/src/fixtures/sampleSchool.js`
- possibly `tests/fixtures/sample-teacher-marks.csv`

### J. Package a reviewable pilot artifact
Why next:
- Once the walkthrough is coherent, the next bottleneck is sharing it cleanly with stakeholders.

Actions:
- Produce a stable web build.
- Optionally produce a renamed desktop shell only if it adds value for the demo.
- Add a short operator demo script / handoff note linked to the existing outreach docs.

File focus:
- `web/dist/*` via build
- `docs/outreach-pack.md`
- optionally root `package.json` / `main.js`

## 3) Defer

Do not spend the next 2-4 weeks here unless a must-fix depends on it.

- Real auth / multi-school accounts
- Real billing/subscription engine
- Production-grade parent-link security
- Real SMS/WhatsApp/email integrations
- Full backend ingestion service
- Multi-tenant database design
- Full report-template editor
- Broad non-PLE parser expansion beyond the current demo seams
- Heavy desktop packaging work before web demo acceptance is met
- Full analytics studio/backoffice

## 4) Recommended sequencing by week

## Week 1: Story integrity and trust
Primary outcome: no obvious product contradiction during the walkthrough.

Tasks:
1. Rename root package/app identity and remaining legacy labels.
2. Audit `web/index.html` and `web/src/main.js` for overclaiming copy and controls.
3. Add explicit duplicate learner / grade mismatch / blocked publish demo rows.
4. Update review summary and issue rendering.
5. Rebuild web bundle.

Definition of done:
- No visible PLE-first product identity in primary flow.
- Review screen shows hard cases as actual rows, not just helper text.
- Build still passes.

## Week 2: Demo reliability and smoke coverage
Primary outcome: the walkthrough is testable and repeatable.

Tasks:
1. Install Playwright runtime and rerun `npm run test:web`.
2. Update tests for any wording/selector shifts.
3. Add assertions for review edge cases and subscription CTA continuity.
4. Verify CSV ingest uses the canonical parser and drives the review/parent-preview flow from grouped learner records.
5. Keep optional PLE ingest smoke path documented.

Definition of done:
- `npm run test:web` passes locally.
- CSV ingest smoke proves grouped learner output, not merely non-empty CSV rows.
- Parent/analytics/subscription flow remains covered.

## Week 3: Minimum backend/infrastructure seam
Primary outcome: the demo has a believable pilot handoff without pretending to be SaaS.

Tasks:
1. Extract lead capture into an adapter with local + webhook/API stub modes.
2. Add env/config handling for a pilot endpoint.
3. Make submission/export status visible in the UI.
4. Extract sample school data from the giant main file.
5. Keep fallback behavior deterministic for offline demos.

Definition of done:
- Lead form can save locally and optionally POST outward.
- The UI truthfully reports what happened.
- Main demo state is easier to maintain.

## Week 4: Optional polish and packaging
Primary outcome: cleaner stakeholder handoff if weeks 1-3 finish early.

Tasks:
1. Tighten analytics-to-package CTA path.
2. Add operator demo notes/outreach handoff.
3. Optionally rename/package desktop shell if needed for presentation.
4. Capture screenshots or a short demo checklist from the passing smoke flow.

Definition of done:
- Stakeholder can understand the product, pilot path, and package upsell in under 3 minutes.

## Exact file-level focus

Highest priority edit set:
- `web/index.html`
  - copy truthfulness
  - review page issue presentation
  - analytics/package CTA wording
  - delivery/export wording
- `web/src/main.js`
  - demo fixtures
  - active CSV routing into the canonical parser
  - review-table issue logic
  - summary counts/statuses
  - lead capture handling
  - analytics/export behavior messaging
- `tests/web/dashboard.spec.js`
  - smoke assertions for edge cases and updated labels
- `package.json`
  - root package identity and test/runtime setup
- `main.js`
  - Electron app title and legacy identity strings

Second-wave files:
- `web/src/pdfToWorkbook.js`
  - canonical CSV parser path
  - grouped learner records and parser QA
  - workbook sheet naming/output semantics aligned with portal story
- `playwright.web.config.js`
  - only if test harness or server assumptions need adjustment
- `tests/README.md`
  - update install/run instructions once Playwright is unblocked
- new small modules, likely:
  - `web/src/demoData.js`
  - `web/src/demoApi.js` or `web/src/leadCapture.js`
  - `web/src/fixtures/sampleSchool.js`

## Architecture stance for the next 2-4 weeks

Build these seams now:
- demo data module
- canonical parser boundary: CSV/PDF adapters -> grouped learner records -> workbook/parent results
- lead submission adapter
- testable review-state rendering
- truthful UI copy around delivery/export behavior

Do not build these yet:
- auth service
- real parent-link backend
- full API/database layer
- payment system
- production notification service

## Recommended order if only 5 concrete tasks get done

1. Route CSV upload through the canonical grouped-learner parser (`web/src/main.js`, `web/src/pdfToWorkbook.js`).
2. Rename legacy root identity (`package.json`, `main.js`).
3. Strengthen review-table edge cases (`web/src/main.js`, `web/index.html`).
4. Remove overpromising delivery/export language (`web/index.html`, `web/src/main.js`).
5. Unblock and run web/parser smoke (`package.json`, environment, `tests/web/dashboard.spec.js`).

## Verification commands already checked

- Build passes:
  - `npm --prefix web run build`
- Parser probe result:
  - active CSV path parses the sample as 4 rows even though it represents 3 learners; first-row learner mapping is blank because the template header is `Learner name`, not `name` or `learner`.
- Root web smoke currently blocked in this environment:
  - `npm run test:web`
  - current result: `playwright: not found`

## Bottom line

The next 2-4 week lane should optimize for credibility, not completeness.

The sharpest implementation sequence is:
1. make the CSV parser logically sound for grouped learner reports,
2. remove identity/copy contradictions,
3. make review issues visibly real,
4. make claims truthful,
5. restore smoke-test reliability,
6. add only the smallest backend seam needed for pilot lead handoff.
