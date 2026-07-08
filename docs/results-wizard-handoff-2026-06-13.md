# Results Wizard handoff

Updated: 2026-06-14

## Current live state
- Production URL: https://results-wizard.vercel.app
- The live site was already verified on the production alias earlier in the run.
- Local web build now succeeds after the latest copy and presentation pass.

## What changed in the latest pass
- Reframed the app away from demo language and toward a private, pilot-style workspace.
- Tightened navigation and sidebar labels:
  - `Pilot Plans` -> `Pilot Setup`
  - `Request demo` -> `Open setup`
  - `School results portal` -> `Secure pilot workspace`
- Reworked dashboard copy to emphasize:
  - private school results
  - concierge-backed ingestion
  - fast parent preview
  - upload/check/send flow
- Simplified the batch flow and pilot language so the product feels more guided and less like a file utility.

## Verified local facts
- `npm run build` in `/root/project-reviews/Results-Wizard/web` completed successfully.
- Build output was generated in `web/dist`.

## Current repo state
Modified files:
- `docs/product-alignment.md`
- `web/index.html`
- `web/src/main.js`
- `web/src/pdfToWorkbook.js`
- `web/src/style.css`

Untracked files:
- `docs/results-wizard-handoff-2026-06-13.md`
- `docs/results-wizard-live-handback-2026-06-06.md`
- `docs/results-wizard-tactical-execution-lane-2026-06-06.md`
- `out/`
- `tests/parser-regression.mjs`

## Remaining gaps
- There is still no real backend intake workflow.
- CSV intake remains the main functional path, but the repo still notes the grouped-learner parser work before treating the parser path as fully pilot-ready.
- Browser automation checks remain limited in this Ubuntu environment.

## Suggested next step for the handoff
- If this is going to another operator, point them at `web/index.html` first for the live copy surface, then `web/src/main.js` and `web/src/pdfToWorkbook.js` for the actual intake logic.
