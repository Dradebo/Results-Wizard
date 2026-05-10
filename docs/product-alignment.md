# Results Wizard Product Alignment

Updated: 2026-05-03.

## One-Liner

At the end of term, parents receive a secure link and view their child's legitimate results, while teachers and schools get an easier way to ingest, verify, analyze, and share results without public exposure of individual learners.

## Product Position

Results Wizard is not a PLE converter.

Results Wizard is a school results portal with:

- secure parent result links
- intuitive teacher/admin ingestion
- verification and approval before release
- private learner-level result views
- school-level analytics for leadership and marketing
- subscription-based custom analytics on top of uploaded results

PLE is an important initial source format and demo use case. It should be treated as one ingestion adapter, not as the product identity.

## Primary Jobs

### Parent

Parents need a trusted private link where they can see their child's results and know the results came from the school.

Required experience:

- receive link by SMS, WhatsApp, email, or printed code
- open on mobile first
- confirm child identity safely
- see result summary, subject breakdown, teacher/school notes, and downloadable report
- know whether the result is official, draft, corrected, or archived

### Teacher / Results Officer

Teachers and results officers need boring result-prep work to become straightforward without threatening their role.

Required experience:

- upload spreadsheet, PDF, or pasted table
- see exactly what was detected
- fix columns with plain-language prompts
- resolve duplicate or missing learners
- preview parent-facing result cards
- submit for approval or publish
- avoid retyping and repetitive formatting

### School Leader

Schools need aggregated analytics they can use internally and, where appropriate, for compliant marketing.

Required experience:

- cohort performance summaries
- subject strengths and weaknesses
- term-over-term trends
- class/stream comparisons
- anonymized public-safe highlights
- downloadable charts for board reports, parent meetings, and marketing

### Results Wizard Operator / Consultant

The business needs subscription and custom analytics work that can be sold beyond the base portal.

Required experience:

- onboard a school
- configure term, class, grading scale, subjects, streams, and result template
- create custom analytics packs
- generate school-specific reports
- manage subscription status and service tiers

## Privacy And Trust Direction

The product should be designed around private communication of individual learner results, not public display.

Implications:

- never make individual learner names, faces, or scores public by default
- analytics views should aggregate or anonymize learner data unless the viewer has a legitimate school role
- public-facing school marketing should use compliant aggregate claims, not named top-performer boards
- every parent result page should show authenticity signals: school name, term, publish date, verification status, and support/contact path
- every publish action should be logged and reversible

## Product Architecture

### 1. School Admin Portal

For school owners, head teachers, directors of studies, class teachers, and results officers.

Core modules:

- school setup
- grading scale setup
- learner roster
- result ingestion
- result review
- approvals
- publishing
- analytics
- parent link management
- subscription/billing

### 2. Parent Result Portal

Mobile-first private result page.

Core modules:

- secure link/code access
- child result card
- subject breakdown
- class teacher comments
- school notice/next steps
- downloadable result slip
- correction/support request

### 3. Analytics Studio

Subscription/custom analytics layer.

Core modules:

- standard school dashboard
- custom visualizations
- cohort comparisons
- subject diagnostics
- teacher/class/stream analysis
- exportable board/marketing reports
- public-safe aggregate snapshots

### 4. Ingestion Wizard

The current app becomes this module.

Core modules:

- upload source
- detect format
- map columns
- validate records
- fix issues
- preview parent result cards
- approve import

PLE-specific parsing belongs here as `PLE adapter`.

## Current Repo Fit

Reusable from the current codebase:

- PDF-to-workbook ingestion path
- workbook preview
- validation summary
- dashboard visualizations
- custom visualizer
- saved jobs/history
- export workflow
- school/org-unit matching ideas
- Playwright smoke-test foundation

PLE-specific or misaligned:

- package names: `ple-import-desktop`, `ple-import-web`
- app title: `PLE Import Prep`
- desktop title constant: `APP_TITLE = "PLE Import Prep"`
- web title and logo text: `PLE Import Prep (Web)` / `PLE`
- output filename: `ple_import_prep.xlsx`
- source parser names: `ple_pdf_to_excel.js`, `pdfToWorkbook.js`
- copy centered on UNEB/PDF/Excel conversion
- current UI has no parent portal, school account, publish workflow, access control, subscription, or result legitimacy layer

## UX Direction

The existing UI is a utility dashboard. The target product needs to feel like a calm school operations portal.

Design principles:

- mobile-first for parents
- desktop-efficient for teachers/admins
- plain-language ingestion, not technical parsing language
- few steps, clear status, strong review before publish
- "assist the teacher" framing, never "replace the teacher"
- privacy and legitimacy visible without fear-heavy copy
- analytics should look board-room ready, not like a debug dashboard

## Recommended Navigation

Teacher/admin portal:

1. Home
2. Results
3. Upload
4. Review
5. Publish
6. Parent Links
7. Analytics
8. Settings

Parent portal:

1. Result Summary
2. Subject Details
3. Teacher Comments
4. School Notice
5. Download / Request Correction

## First Rebuild Slice

Do not build the full SaaS immediately. Re-skin and restructure toward the target portal in this order:

1. Rename visible product language to Results Wizard.
2. Replace `PLE` framing with `Results Portal` framing.
3. Turn the first screen into an admin dashboard with "New results batch" as the primary action.
4. Rework ingestion into a five-step flow: Upload, Detect, Map, Validate, Publish Preview.
5. Add a mock parent result page generated from the sample data.
6. Add a mock school analytics page using aggregate data only.
7. Add a subscription/custom analytics placeholder page with packages.
8. Keep PLE as the first sample adapter.

## Open Questions

- Should the first paid product be school subscription, consultant-managed portal setup, or hybrid?
- Which parent delivery channel should be first: WhatsApp link, SMS link, email link, or printed access code?
- What proof should a parent see before trusting the result: school domain, school logo, signed result ID, OTP, or student code?
- Should schools get a public aggregate landing page, or should all analytics exports remain downloadable/private at first?
- What grading systems besides PLE should the first generalized importer support: termly marksheets, Cambridge-style reports, nursery/primary narratives, O-level/A-level, or custom Excel templates?

## Decision

All new product, UX, and code work should align to Results Wizard as a results portal with subscription analytics. PLE is only the first ingestion adapter and demonstration dataset.

For the first launch UI/UX pass, use `docs/launch-ui-ux-brief.md` as the implementation source of truth.
