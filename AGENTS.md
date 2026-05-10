# Results Wizard Guidance

## Product Direction

Results Wizard is a school results portal, not a PLE-only converter.

The core one-liner:

> At the end of term, parents receive a secure link and view their child's legitimate results.

PLE is only the first ingestion adapter and sample workflow. Do not center new UX, naming, or product docs around PLE unless explicitly working on the PLE adapter.

## Audiences

- Parents: mobile-first private result pages with legitimacy signals.
- Teachers/results officers: intuitive ingestion, validation, correction, and publish workflow that removes repetitive work without implying job replacement.
- School leaders: aggregate analytics for decision-making and compliant school marketing.
- Results Wizard operator: subscription/custom analytics delivery.

## UX Priorities

- Prioritize UI/UX over adding more parser features.
- The app should feel like a calm school operations portal, not a debug/import utility.
- Use plain-language steps: Upload, Detect, Map, Validate, Preview, Publish.
- Add parent preview and analytics preview before expanding PLE parsing.
- Avoid public display of individual learner names, faces, or scores by default.
- Use `docs/launch-ui-ux-brief.md` as the implementation source of truth for the first lead-generation portal demo. Do not start with backend/payment/auth work until that brief's demo acceptance criteria are satisfied.

## Current Repo Notes

- Current package/app names still say `PLE Import Prep`; rename/positioning work is pending.
- Main parser files are PLE-shaped: `ple_pdf_to_excel.js` and `web/src/pdfToWorkbook.js`.
- Useful reusable pieces: workbook preview, validation summary, dashboards, custom visualizer, saved jobs, exports, tests, and the synthetic fixture under `tests/fixtures`.
- `mapping_profiles.json` contains credential-bearing config; quarantine/remove before public demos, packaging, or repo sharing.

## Relevant Docs

- `docs/product-alignment.md`
- `docs/launch-ui-ux-brief.md`
- `Documents/OpenClaw-Ingestion/RESULTS_WIZARD_PRODUCT_PIPELINE.md`
