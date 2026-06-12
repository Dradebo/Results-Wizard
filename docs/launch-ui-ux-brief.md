# Results Wizard Launch UI/UX Brief

Updated: 2026-05-03

## Non-Negotiable Product Definition

Results Wizard is a school results portal, not a PLE converter.

The launch product should make this promise immediately:

> At the end of term, a school sends parents a secure link where they can view their child's legitimate results, while the school gets clean analytics from the same results batch.

PLE is a valuable first adapter and sales wedge, but it must never dominate the product surface. The app should feel ready for term reports, mock exams, internal assessments, PLE, lower-secondary CBC reports, and custom school grading formats.

## Launch Goal

Build a sales-grade interactive demo that can get school leads quickly.

The first launch does not need full production backend behavior. It does need to make the workflow believable enough that a head teacher, director of studies, or school admin can understand the value in under three minutes.

Primary launch outcome:

- Get interested schools to request a demo, pilot, or custom analytics package.

Secondary launch outcome:

- Use school conversations to validate which result formats, parent delivery channels, pricing, and analytics packages matter most.

## User Roles

### School Leader

Needs to see:

- the school can look organized and trustworthy
- parents get official result links
- performance analytics can support decisions and compliant marketing
- the system does not expose individual learners publicly
- there is a clear paid offer

### Teacher / Results Officer

Needs to see:

- upload and review are simple
- the tool reduces repetitive formatting and checking work
- nothing is published without review
- errors are plain-language and actionable
- PLE is one source type, not the only workflow

### Parent

Needs to see:

- a private mobile result page
- school identity and authenticity signals
- the child's performance in a format the school chose
- teacher comments and school notices
- a way to download, contact the school, or request a correction

### Results Wizard Operator

Needs to see:

- lead capture
- package framing
- custom analytics request path
- future admin hooks for onboarding, templates, subscriptions, and analytics reports

## Product Shape For The First Build

The first implementation slice should be a web-first portal demo. Desktop can remain an internal ingestion utility until the story is validated.

Required web routes/views:

1. Dashboard
2. New Results Batch
3. Review Results
4. Parent Result Preview
5. Parent Links
6. Analytics
7. Subscription / Request Demo

Recommended navigation labels:

- Dashboard
- New Batch
- Review
- Parent View
- Links
- Analytics
- Subscription

## Information Architecture

### 1. Dashboard

Purpose: make the whole product obvious.

Must show:

- current school and term
- result batches
- publish status
- parent links sent/viewed
- validation issues
- analytics highlights
- primary action: `New results batch`
- secondary action: `Preview parent link` or `Request demo`

Dashboard copy must say "results portal", "parent result links", and "school analytics". It must not lead with PLE.

### 2. New Results Batch

Purpose: show that one upload turns into a structured, publishable result batch.

Flow:

1. Upload
2. Detect
3. Map columns
4. Validate
5. Preview
6. Publish

Supported demo source types:

- spreadsheet / marksheet
- CSV
- pasted table
- PLE PDF adapter

Only the PLE PDF adapter needs to be wired to the existing parser for now. Spreadsheet/CSV/pasted-table can be mocked in the demo if necessary, but the UI should present them as first-class future paths.

Plain-language mapping examples:

- Learner name -> Name / Full name
- Class or stream -> Class, Stream
- Subject scores -> Subject columns
- Grade -> Grade / Descriptor / Division
- Teacher comment -> Comment / Remark
- Parent contact -> Phone / Guardian phone / Email

### 3. Review Results

Purpose: prove that the school stays in control before anything is published.

Must show:

- learner table
- class/stream filters
- subject/status filters
- validation badges
- missing score state
- duplicate learner state
- grade mapping warning
- bulk approve
- preview individual parent result

Statuses:

- Draft
- Validating
- Needs review
- Error
- Approved
- Published
- Sent
- Viewed
- Revoked
- Correction requested

### 4. Parent Result Preview

Purpose: this is the emotional center of the product. It sells trust.

Must be mobile-first.

Must show:

- school name/logo placeholder
- official result status
- learner identity
- class/stream/term/session
- result ID
- publish date
- subject breakdown
- overall result
- teacher comment
- head teacher/school comment if enabled
- school notice
- download result slip
- request correction/contact school

Authenticity signals:

- "Official result published by the school"
- result ID
- school name and term
- publish date
- contact/correction path

Do not make the parent page feel like a marketing page. It should feel like a private document.

### 5. Parent Links

Purpose: show the school how results get to parents.

Must show:

- search learners
- link status
- delivery method placeholders: SMS, WhatsApp, email, printed code
- send selected
- resend
- revoke
- regenerate
- viewed tracking
- correction requested status

Do not actually send anything in the demo unless the user explicitly asks for real delivery work later.

### 6. Analytics

Purpose: show why this can be a subscription/custom analytics product.

Must show aggregate-only analytics:

- class/cohort performance
- subject strengths and weaknesses
- class/stream comparison
- term-over-term trend
- distribution of grades/divisions/descriptors
- public-safe marketing snapshot
- export chart/report controls

Important privacy rule:

- Marketing views must never show individual learner names, faces, or scores by default.

### 7. Subscription / Request Demo

Purpose: convert interest into leads.

Must show:

- Base Results Portal
- Custom Analytics Subscription
- Done-for-you Setup / Training
- Request Demo / Start Pilot lead form

Lead form fields:

- school name
- contact person
- phone/WhatsApp
- email optional
- school type
- learner count band
- interested package
- notes

Initial CTA language:

- "Request a school demo"
- "Start a term-results pilot"
- "Ask for custom analytics"

## Visual Direction

Use the Stitch design system as the visual base:

- warm neutral surfaces
- deep green primary
- restrained amber secondary
- status colors for workflow state
- modest radii
- dense, calm operations layout
- strong typography

Avoid:

- purple-heavy gradients
- generic blue SaaS dashboards
- cartoon edtech styling
- oversized marketing hero sections inside the app
- nested cards
- decorative blobs/orbs
- PLE-first branding

The UI should feel like school operations software, not a pitch deck.

## Design Inputs Reviewed

### Stitch Export

Useful patterns:

- strongest visual system
- good status palette
- good dashboard density
- good parent result mobile framing
- parent links page has the right operational status model
- review table has the right workflow seriousness

Adopt:

- color system
- typography direction
- status treatment
- sidebar/dashboard rhythm
- mobile parent result card discipline

### Figma Export

Useful patterns:

- full route map
- React component breakdown
- dashboard/new-batch/review/parent/analytics/links/subscription structure

Adopt:

- screen inventory
- route structure
- component responsibilities

Do not copy wholesale if it clashes with the current vanilla Vite app. The current app can implement the same UX in plain HTML/CSS/JS first.

## Uganda Report Card Flexibility

The system should treat report cards as configurable templates, because Ugandan school reports vary significantly by level, curriculum, and school.

Observed format patterns:

- classic primary reports with subjects, marks, comments, positions, conduct, class teacher comments, head teacher comments, next-term requirements, and parent comments
- upper-primary reports with term/year, class, subject marks, totals, aggregates, divisions, and teacher/head teacher remarks
- lower-secondary CBC reports with competencies, scores, descriptors, generic skills/values, subject teacher names/signatures, attendance, general remarks, and descriptor keys
- secondary/A-level style reports with coursework, end-of-year assessment, total marks, achievement level, descriptors, and teacher signatures

Template families for launch demo:

1. Primary Term Report
2. CBC Competency Report
3. PLE Summary
4. Secondary Marksheet
5. Minimal Parent Result Link

Configurable fields:

- school identity
- term/session
- class/stream
- learner identifier
- parent/guardian contact
- subject rows
- score columns
- grade/division/descriptor
- aggregates/totals
- position/rank visibility
- attendance
- conduct
- class teacher comment
- head teacher comment
- subject teacher comments
- generic skills/values
- next-term requirements
- school notice
- parent comment/correction request

Position/rank should be optional. Some schools may want it; the safer default is not to emphasize it in parent pages.

## Demo Data Requirements

Create one generalized sample school dataset separate from the PLE fixture.

Minimum fields:

- school name
- term
- academic year
- class
- stream
- learner name
- learner initials
- learner ID
- guardian name
- guardian phone placeholder
- subjects
- marks
- grades/descriptors
- total/aggregate
- overall summary
- teacher comment
- school notice
- status
- link status

Use realistic Ugandan school naming and subjects, but keep all learners fictional.

## What To Build First

Build order:

1. Lock the dashboard shell and visual system.
2. Build the parent mobile result preview.
3. Build the new batch flow as a believable UI.
4. Build the review table with validation states.
5. Build parent links management.
6. Build aggregate analytics.
7. Build subscription/lead capture.
8. Wire the existing PLE parser into the new batch flow as one adapter.
9. Add generalized fictional sample data.
10. Run Playwright smoke tests and visual screenshots.

Parent result preview should happen before deep analytics polish. That is the screen that makes the product real to schools and parents.

## What Not To Build Yet

Defer:

- real authentication
- real payment/subscription billing
- real SMS/WhatsApp/email sending
- multi-school backend
- production parent-link security
- public marketing microsites for schools
- full template editor
- full spreadsheet parser
- LearnHouse content
- DHIS2 integration

The demo can show these as planned or package-level capabilities, but should not pretend they are production-ready.

## Acceptance Criteria For The First Launch Demo

The implementation is ready for outreach when:

- no visible PLE-first branding remains in the main app
- dashboard explains the full results portal in one glance
- parent mobile preview looks legitimate and polished
- report template selector shows at least four school format families
- review table shows realistic validation states
- parent links page shows delivery/status workflow
- analytics page uses aggregate-only language and visuals
- subscription page has clear packages and lead capture
- existing PLE ingest smoke still passes
- web app passes Playwright smoke tests
- demo can be explained in under three minutes

## Sales Demo Script

1. Open dashboard: "This is the school's results command center for the term."
2. Start new batch: "The school uploads the marksheet, PDF, or table."
3. Show detect/map/validate: "The system finds issues before parents see anything."
4. Open review: "Teachers stay in control and approve results."
5. Open parent preview: "Parents receive this official private result page, with school identity, verification, and a clear correction path."
6. Open parent links: "The school can send, track, revoke, or print access codes."
7. Open analytics: "Leadership gets aggregate analytics from the same batch."
8. Open subscription: "The base portal publishes results; the custom analytics subscription turns results into reports for decision-making and marketing."

### Parent Preview Direction

The parent page should read like an official school-issued result artifact:

- school name, result ID, and publish date up top
- clear learner/result summary
- subject or competency rows with brief explanation text
- teacher comment and school notice anchored below the result block
- privacy and correction controls visible, but not noisy

The page should feel trustworthy and deliberate, not like a placeholder phone mockup.

## Research Sources

- Figma export source: https://www.figma.com/design/BGAWmLz4cbLVz6xPxFqTo7/Results-Wizard-web-app-UI
- NCDC lower-secondary sample report card: https://ictteachersug.net/wp-content/uploads/2022/11/Sample-Report-Card-for-LSC-NCDC.pdf
- Sample learner term report card: https://fresh-teacher.github.io/s3/NCDC-Sample%20Term%20Three%20Report%20Card-2022.pdf
- Sharebility CBC report sample: https://sharebility.net/wp-content/uploads/2022/11/Report-Card-Sharebility-CBC-Report-System.pdf
- Primary school report-card examples surfaced in search: https://www.scribd.com/document/879993013/p-1-p-3-Report-Card-Palabek-Parent-School
