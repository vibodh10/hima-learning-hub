# Assignment 1 preparation — 15 September 2026

## Confirmed and unconfirmed

The user requested preparation and date follow-ups for an assignment due **28 September 2026**, including comparing two websites, W3C standards/testing tools and Harvard referencing. They clarified **Pearson BTEC Level 3 National Diploma**, not Extended Diploma, and requested that assessment requirements be checked against Pearson only. The working subject is Information Technology, Unit 6 Website Development, Learning aim A, consistent with the two-website comparison described.

The actual centre assignment brief, submission time/location, chosen websites, class IDs and any individual extensions have not been supplied. This is provisional preparation, not a replacement brief or confirmation of full assignment readiness. No arbitrary word count or required number of screenshots has been introduced.

## Pearson check

Verified the [National Diploma specification](https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Information-Technology/2016/specification-and-sample-assessments/specification-pearson-btec-level-3-national-diploma-in-information-technology.pdf), Issue 6, September **2020**, qualification 603/0455/8. Unit 6: printed pages 69–76; PDF pages 76–83. Learning aim A addresses design principles and performance. A.P1 covers comparison; A.M1 analysis; A.D1 evaluation. B/C cover design and development and are not replaced by this guide.

No occurrence of “Harvard” was found in the Diploma specification. The guide therefore presents author–date referencing as a teacher-requested study skill, not a Pearson-mandated style or grading criterion. Its example uses the actual 2020 publication date. Learners must supply their own access dates. No claim is made that Pearson mandates W3C validator, CSS validator, Lighthouse or PageSpeed scores for A.P1/A.M1/A.D1.

Initial research included Leeds Harvard guidance before the user's Pearson-only clarification. No Leeds style is prescribed or linked in the implementation. Technical tool links are practical support for the requested testing, not sources of qualification requirements; their operation was checked against their official documentation before the clarification.

## Dates

| Suggested period | Work |
| --- | --- |
| 15–17 September | Confirm websites/task; start the source log |
| 18–20 September | Design observations; manual accessibility checks; markup/CSS validation; performance measurements |
| 21–23 September | Comparison and analysis using genuine evidence |
| 24–25 September | Evaluation and Harvard citations/reference list |
| 26–27 September | Check actual brief, evidence, references and final file |
| 28 September | Submit through teacher's required route and retain actual receipt |

The first checkpoint card in the current period is selected using server-side Europe/London dates when the page opens. All ten cards are immediately accessible, with previous/next and a step chooser. Dates do not represent individual completion or lock students out. Past-deadline wording refers students to their teacher and any extension; no midnight submission time is assumed.

## Implementation and boundaries

- Student guide: `/study/assignment-one`, guarded by authenticated role and existing assigned Unit 6 access. Staff can inspect it using the existing staff access policy.
- Existing `/study` footer exposes the guide only when the student has an active assigned Unit 6 in a published class. This is unit-scoped, not yet customised to named classes; review applicability before deployment to other cohorts.
- Local unauthenticated preview: `/study/preview/assignment-one`, development-only. The original lesson preview also links to it.
- Original short learning flow and saved attempts/rewards are preserved. Practice checks in the guide are explicitly unsaved and ungraded. Reading cards does not mark assignment completion.
- Blank evidence/source-log template is downloadable. Learners save their own work outside the guide; no submission or teacher review of a submitted document is implemented.
- Harvard teaching covers in-text citations, full references, corporate authors, no-date cases, paraphrasing/quoting, screenshot provenance, alphabetical order and same-author/same-year suffixes. It supplies no invented source metadata or completed assessed comparison.
- The guide is a preparation aid, not evidence that the entire Unit 6 specification has been taught or assessed. More detailed teaching and teacher verification remain necessary.

## Follow-up automation

Created heartbeat `assignment-1-checkpoints` in this task. It checks daily at 08:00 through 28 September 2026 and prompts the teacher only at a new checkpoint or material change. It must respect the latest Pearson-only clarification. It does not contact students, inspect private learner records automatically, grade or submit work. The reminder's existence is not proof the website changes are deployed.

## Verification and release

Local changes only; no production deployment has been performed for this addition. Date-boundary, navigation, feedback and route-guard tests accompany the change. Record actual test/build/browser results below after execution. The pre-existing changes to `docs/mini-learning-acceptance.md` and `.tmp/` belong to earlier work and are not part of this implementation.

Verified locally on 15 September:

- All 45 focused tests passed across the new calendar, guide and entry tests plus existing mini-study rules, packs and player. Corrected an existing test's timing assumption by waiting for the retry button to finish its React transition; no production lesson behaviour was changed.
- TypeScript and full ESLint passed. Production build passed, including the new routes. The subsequent presentation-only change collapsed the long Pearson URL behind a disclosure; the focused suite was rerun and passed after that change.
- Browser inspection of the actual preview verified step selection, the Harvard example and corrective feedback for uncited paraphrasing. The guide was visually inspected at the normal narrow panel width and at a 320px phone viewport. The viewport override was reset.
- No signed-in student journey or production deployment was executed. Existing permission checks are reused; mocked guard tests are not a new end-to-end database security audit. The new guide does not write to learner records.
