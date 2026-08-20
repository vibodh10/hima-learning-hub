# Safe testing and learning journey

## Roles and isolation

Use only the fictional hosted accounts documented in `README.md`. Staff Test
Mode stores simulations in `test_mode_sessions` and `test_mode_events`.
Student submissions continue to use the real append-only evidence tables.

The staff banner must read:

> TEST MODE — results are not part of a real learner record.

Reset Demo Learner deletes only the current staff member's sandbox events. It
cannot delete or change real attempts, mastery, targets, interventions,
homework, streaks, badges, coins, purchases, or inspection evidence.

## Complete manual journey

Record the date, tester and result for each item.

1. Sign in as the teacher and open the Python lesson.
2. Open every activity without completing questions and confirm Test Mode is
   visible.
3. Reveal expected answers and simulate correct, incorrect, percentage and
   Support/Core/Stretch/Mastery outcomes.
4. Simulate a target, badge, coin award, reward purchase and equipment; confirm
   each reports that only sandbox data changed.
5. Preview each available theme and trigger the achievement notification.
6. Enable reduced motion at operating-system/browser level and confirm the
   celebration becomes static.
7. Choose Next activity without submitting and then Reset Demo Learner.
8. Sign in as the student and confirm no Test Mode or skip control exists.
9. Confirm the journey is Unit Starting Point, Learn, Worked Examples, Guided,
   Core, optional Challenge, Mastery, Progress and delayed Retention.
10. Confirm Core is locked before Guided completion and Mastery is locked
    before Core completion.
11. Confirm Progress is locked until the relevant learning/practice/mastery
    evidence exists.
12. Confirm Retention says Scheduled for a future UK-formatted date and cannot
    be submitted early.
13. Confirm Mastery Check says “Independent check — no hints. This confirms
    whether you are ready to move ahead.”
14. Confirm insufficient one-question starting evidence shows no percentage,
    says Insufficient evidence, and reports the supporting question count.
15. Confirm the practice summary matches the visible, eligible activities and
    shows completed, assigned, required, optional and percentage from one
    calculation.
16. Confirm the next target belongs to the active unit and shows skill, reason,
    evidence, deadline, success criterion and linked activity.
17. Earn a badge, close its notification, reload, and confirm the badge remains
    but confetti does not repeat.
18. Preview a reward without a debit; buy it once; confirm immediate Owned
    state, one ledger debit, and duplicate purchase rejection.
19. Equip the reward, sign out/in, and confirm the theme/frame remains visibly
    applied; unequip it and confirm removal.
20. As administrator, run incomplete-purchase reconciliation and confirm every
    restored amount has a refund entry, before/after balances and status.

## Automated evidence

- `src/lib/activity-progress.test.ts` covers all authoritative count exclusions
  and duplicate attempts.
- `supabase/tests/safe_testing_and_rewards_journey.sql` covers sandbox
  isolation, student denial, Guided/Core/Mastery/Progress/Retention sequencing,
  transactional ownership, duplicate/failed purchase safety, equipment
  persistence data, and exact ledger reconciliation.
- `scripts/verify-database-contract.ps1` runs every database journey in a fresh
  disposable database. Use `-TestName safe_testing_and_rewards_journey.sql` for
  the focused journey.

Run the complete release gate:

```text
npm test
npm run typecheck
npm run lint
npm run build
powershell -ExecutionPolicy Bypass -File .\scripts\verify-database-contract.ps1
```
