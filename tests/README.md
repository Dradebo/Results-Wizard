Playwright smoke tests are split by target:

- `npm run test:web`
  Runs dashboard smoke checks against the Vite web app (`desktop/web`).
- `npm run test:desktop`
  Runs dashboard smoke checks against the Electron desktop app.
- `npm run test:e2e`
  Runs web then desktop smoke checks.

If Chromium is missing locally, install it with:

`npx playwright install chromium`

Optional ingest validation:

- Web ingest test runs only when `PLE_SAMPLE_PDF` points to a real or fixture PDF.
- Example:
  `PLE_SAMPLE_PDF=/absolute/path/to/results.pdf npm run test:web`
- Included sanitized fixture:
  `PLE_SAMPLE_PDF=tests/fixtures/sample-ple-results.pdf npm run test:web`
