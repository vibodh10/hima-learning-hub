# Assessment quality audit

Audit date: 14 August 2026

Scope: Pearson BTEC Level 3 National Information Technology Units 2, 4 and 6 practical/application papers in `src/lib/atom-question-bank.ts`.

## Overall judgement

The assignment papers are practical briefs, not theory-only quizzes. Each assessed mark maps to one explicit rubric statement. Practical submissions are retained for teacher review; the model answer is indicative evidence, not a claim that there is only one valid implementation.

## Unit 2 — Creating Systems to Manage Information

Total: 66 marks across eight activities.

| Activity | Evidence required | Marks | Audit result |
| --- | --- | ---: | --- |
| Normalisation | UNF, 1NF, 2NF, 3NF, dependencies, PKs and FKs | 10 | Correct and complete |
| Table structures | Data types, sizes/formats, keys, required fields, validation and messages | 8 | Correct and complete |
| Selection query | Joins, overdue/unpaid criteria, calculation, aliases and sorting | 8 | SQL examples are coherent |
| Parameter/summary query | Parameter, joins, aggregate, grouping and sorting | 10 | Rubric correctly enforces valid grouping |
| Data-entry form | Record source, controls, lookups, locked/calculated fields and validation | 8 | Practical build evidence required |
| Management report | Record source, grouping, detail, totals and null handling | 6 | Practical report evidence required |
| Testing | Eight exact normal, boundary and erroneous tests plus retesting | 8 | Expected/actual evidence distinguished correctly |
| Evaluation | Requirements, implementation/test evidence, limitations and prioritised improvement | 8 | Appropriate evaluative standard |

A complete live submission was manually reviewed and awarded 62/66. The deductions matched the rubric: incomplete size/format and validation-message detail, combined-name surname search, and test evidence described rather than attached.

## Unit 4 — Programming

Total: 46 marks across six activities.

| Activity | Evidence required | Marks | Audit result |
| --- | --- | ---: | --- |
| Algorithm | Input/output, validation loop, selection, iteration and reusable function | 6 | Implementable rather than descriptive |
| Debugging | Type conversion, invalid/negative input, corrected condition/calculation and safe output | 6 | Correct diagnosis and indicative fix |
| Python development | Function, validation, list/dictionary processing, empty input, structured return and call | 10 | Requires executable Python |
| Testing | Six exact tests, expected dictionaries and an automated assertion | 8 | Covers branches, boundaries and failures |
| Refactoring | Functions/modules, reduced globals/duplication, validation and testability | 8 | Code plus justification required |
| Persistence | CSV/JSON load/save, context managers, encoding and safe exceptions | 8 | Requires real file-handling code |

Manual rubric check: every mark is tied to observable code or test evidence. The indicative solutions use valid Python concepts (`try`/`except`, `max`, functions, structured returns, context managers and JSON/CSV exception handling). No theory-only response can obtain full marks.

## Unit 6 — Website Development

Total: 50 marks across six activities.

| Activity | Evidence required | Marks | Audit result |
| --- | --- | ---: | --- |
| Semantic HTML | Document shell, skip link, landmarks, headings, accessible card and labelled form | 8 | Requires produced HTML |
| Responsive CSS | Fluid container, grid, breakpoint, focus, contrast and reduced motion | 8 | Requires produced CSS |
| JavaScript | Submit event, validation, accessible feedback and category filtering | 10 | Requires executable event-driven code |
| Debugging | Label association, input semantics, real button and keyboard focus | 8 | Corrected code supplied by learner |
| Testing | Browser/viewports, keyboard, zoom, validation, filtering, images, performance and accessibility | 8 | Reproducible evidence matrix required |
| Evaluation | Audience/purpose, requirements, validation, accessibility, compatibility and improvements | 8 | Evidence-led evaluation required |

Manual rubric check: the HTML/CSS/JavaScript expectations are technically consistent. The model answers correctly prefer semantic controls, associated labels, `:focus-visible`, `prefers-reduced-motion`, `preventDefault`, field-specific messages, an `aria-live` region and safe category filtering. No theory-only response can obtain full marks.

## Version and answer integrity

- Six consecutive assignment-paper versions are required to have different scenario prompts while preserving the same total marks.
- Objective questions reject duplicate options and require the configured correct option to exactly equal the displayed model answer.
- Units 2, 4 and 6 assignment rubrics require one explicit criterion per available mark.
- The automated suite verifies these invariants and currently passes.

## Teacher marking rule

Use the rubric point-by-point. Award a mark only where the submitted artefact or explanation visibly demonstrates that criterion. Accept technically valid alternative implementations; do not require wording identical to the indicative model. Record a short evidence-based reason for any withheld mark and one specific next step.
