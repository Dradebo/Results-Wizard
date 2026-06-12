# Results Wizard Director Lane

## Objective
Sharpen the current sales-grade demo without redesigning it. Prioritize visible polish that increases trust fastest for school leaders, results officers, and parents.

## What already works
- The app already has the right route set: Dashboard, New Batch, Review, Parent View, Links, Analytics, Subscription.
- The Dashboard hero explains the core product promise quickly.
- New Batch already presents a believable six-step workflow.
- Parent Result Preview already carries the strongest trust signals: school identity, result ID, publish date, comments, school notice, and correction path.
- Analytics already uses aggregate-only language in the main charts.

## 1) Visible must-fix copy and CTA changes
These are the fastest credibility wins because they remove utility-tool language and make each action feel school-ready.

### Highest priority
1. `Check marks file` -> `Review uploaded results`
   - Reason: current wording sounds like a file utility, not a school workflow.
   - Location: New Batch primary CTA.

2. `View full report` -> `Open analytics summary`
   - Reason: "full report" is vague and suggests a dead-end or fake depth.
   - Location: Dashboard active batch panel.

3. `Open delivery queue` -> `Prepare parent delivery`
   - Reason: current wording feels internal/ops-heavy; new label ties directly to the parent outcome.
   - Location: Parent Links header CTA.

4. `Approve all clean rows (demo)` -> `Approve reviewed results`
   - Reason: "rows" is spreadsheet language; "demo" lowers trust on the main path.
   - Keep the demo disclaimer elsewhere, not inside the main CTA.
   - Location: Review toolbar.

5. `Download checked results` -> `Download reviewed workbook`
   - Reason: more official and consistent with approval workflow.
   - Location: New Batch download CTA.

6. `Download report list` -> `Download review list`
   - Reason: clearer and more action-aligned.
   - Location: New Batch secondary download CTA.

7. `Parent View` -> `Parent Preview`
   - Reason: better matches the preview nature of the screen and the sales script.
   - Location: Sidebar nav.

8. `Links` -> `Parent Links`
   - Reason: standalone "Links" sounds generic; the explicit label reduces demo narration load.
   - Location: Sidebar nav.

### Second priority
9. `Start demo batch` -> `Start new batch`
   - Reason: cleaner and more product-like; use subtle demo framing in supporting text instead.
   - Location: Dashboard hero primary CTA.

10. `Preview parent link` -> `Preview parent result`
   - Reason: outcome > transport mechanism.
   - Location: Dashboard hero secondary CTA.

11. `Publish official links` -> `Send parent results`
   - Reason: more concrete, less platform-jargony.
   - Location: Dashboard next-actions step 3.

12. `Flexible report-card structure` -> `Parent result page`
   - Reason: current heading is builder-oriented; the screen should sell trust first, flexibility second.
   - Location: Parent Preview left panel heading.

13. `Publication controls` -> `Parent page settings`
   - Reason: softer and easier to understand during a live demo.
   - Location: Parent Preview checklist block.

14. `Customise analytics pack` -> `Request custom analytics`
   - Reason: action should sound commercial and concrete, not like an internal configuration widget.
   - Location: Analytics footer CTA.

## 2) Layout and presentation priority list
This is the recommended order for visible polish work.

### Priority 1: Parent Result Preview (highest leverage)
Why first:
- This is already the emotional center and the strongest trust-builder.
- Small visual and copy upgrades here will do more for credibility than deeper analytics polish.

Polish moves:
- Make the phone preview the dominant visual focal point on the page.
- Reduce the prominence of the left-side configuration panel during demos.
- Lead with trust signals above the fold: school name, verification banner, learner identity, result ID, publish date.
- Tighten the action row to two primary behaviors: `Download result slip` and `Request correction`. Keep `Contact school` secondary.
- Consider changing the top label `Private result link` to `Official school result` for stronger legitimacy.
- Reduce builder-style language like "template families" in the supporting panel.

### Priority 2: Dashboard
Why second:
- This is the opening screen and must instantly frame the product as a school results portal.

Polish moves:
- Keep the hero, but make the path from batch -> parent preview -> analytics more explicit.
- Replace vague CTA labels.
- Make one active batch card feel like the "next best action" anchor for the demo.
- Consider elevating the `Preview parent link` action closer to the active batch panel since that is the proof moment.
- Keep the metrics strip, but ensure the most trust-building metric is visible first: reviewed reports, delivered links, viewed links.
- Treat the parent result page as the emotional center of the product: official school identity, verification, learner summary, result rows, teacher comment, correction path.
- Reduce anything that feels like a mock phone skin or generic wireframe.

### Priority 3: New Batch
Why third:
- This page already tells the workflow well, but some wording still feels operational/tool-like.

Polish moves:
- Keep the six-step process board as-is structurally.
- Reduce emphasis on internal workbook language like `parent_results workbook sheet` in user-facing copy.
- Make the upload area feel less like a parser utility and more like a guided intake step.
- Keep the teacher template preview, but frame it as "what schools upload" rather than as a system artifact.

### Priority 4: Review Results
Why fourth:
- It supports trust, but is not the hero screen.

Polish moves:
- Replace spreadsheet language (`rows`) with `results` or `reports`.
- Make learner actions status-aware: `Preview result`, `Resolve missing marks`, `Fix blocker`, `Add teacher comment`.
- Consider surfacing one trust sentence near the toolbar: "Nothing is sent to parents until reviewed results are approved."

### Priority 5: Links and Analytics
Why fifth:
- Both pages are useful proof, but are currently where fake-depth risk is highest.

Polish moves for Links:
- Keep status tables and delivery methods, but present them as placeholders unless real send capability exists.
- Emphasize `sent`, `viewed`, `correction requested`, and `revoked` more than generic method toggles.

Polish moves for Analytics:
- Lead with one or two decisive school-leader takeaways.
- Keep aggregate-only language.
- Remove the feeling that this is a configurable BI sandbox unless those controls truly change the story.

## 3) Elements to soften or remove
These are the main credibility drains.

### Soften
- `demo` wording on high-visibility CTAs.
- `copilot` / `black box` framing if it distracts from the school workflow.
- `Flexible report-card structure` and similar builder phrasing on the Parent Preview page.
- Heavy mention of workbook internals in visible UI copy.

### Remove or de-emphasize
- Fake-depth controls that do not strongly affect the visible narrative:
  - Analytics top controls: `Success rate`, `Include absentees`, `Division view`
  - Analytics custom builder controls: `Quick/Advanced`, `Learner count/Distinction rate/Term trend`, `Division/Subject/Stream`
  - Links method toggles: `Default: SMS`, `Default: WhatsApp`, `Default: Email`, `Default: Printed code`
- Why: these controls make the product feel half-configured and invite probing on functionality that is not central to the sale.

### Keep but reposition carefully
- Template selector on Parent Preview.
  - Keep it because it proves flexibility.
  - But in demos, it should read as a secondary proof point, not the opening focus.

## 4) Ideal demo click-path
Use a persuasion-first sequence, not a feature-tour sequence.

### Best live path
1. Dashboard
   - Open with the portal promise and term status.
   - Say: "This is the school's command center for reviewed results, parent delivery, and analytics."

2. New Batch
   - Show upload + step flow quickly.
   - Say: "The school starts with the marksheet they already have."
   - Do not linger on parser details.

3. Review Results
   - Show that missing marks and errors are caught before publishing.
   - Say: "Nothing reaches parents until the school reviews and approves it."

4. Parent Result Preview
   - Spend the most time here.
   - Show verification banner, learner details, publish date, comments, notice, and correction path.
   - Say: "This is the official result page the parent receives on phone."

5. Parent Links
   - Show send/track/revoke/viewed status.
   - Say: "After approval, the school can deliver and track access without exposing learner data publicly."

6. Analytics
   - Show aggregate-only insight and leadership summaries.
   - Say: "The same reviewed batch becomes school analytics."

7. Subscription
   - Close on package framing and request-demo CTA.
   - Say: "The base portal handles parent delivery; the subscription expands into leadership and marketing-safe reporting."

### Sequence to avoid
Do not go Dashboard -> Analytics -> Links -> Batch.
- That feels like disconnected features.
- The trust arc is batch -> review -> official parent result -> delivery -> analytics.

## 5) Fast execution lane
If only a short polish sprint is available, do this order:

1. Rename the visible CTAs and nav labels listed in section 1.
2. Reframe Parent Preview so the phone card dominates and builder/settings language recedes.
3. Remove or mute fake-depth controls on Analytics and Parent Links.
4. Clean spreadsheet/internal wording on Review and New Batch.
5. Rehearse the click-path so Parent Preview is the centerpiece.

## Bottom line
The biggest credibility gain will not come from adding new features. It will come from:
- replacing utility-tool copy with school-ready language,
- making Parent Result Preview the hero proof moment,
- removing fake-depth controls that invite doubt,
- and sequencing the demo around trust before analytics.
