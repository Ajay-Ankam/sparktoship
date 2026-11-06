# Submission checklist

Preparation is based on fetched origin/main `1755f05b9a6c255da84cc1795abd519d668fa8d6`. The preparation branch is documentation only and must not be represented as a completed Rescue delivery.

## Ready

- [x] Main README explains the problem, workflow, Switch role, setup, example, and limitations.
- [x] Concise project description and implemented-feature list prepared.
- [x] Three-minute recording plan prepared.
- [x] Human-reported timer launch recorded without inferred browser details, test cases, or commit.
- [x] Reviewed CLI, Prototype, and Story history confirmed in fetched origin/main.
- [x] Rescue identified as in progress; Builder's uncommitted work preserved.

## Missing or pending

- [ ] Choose the submission event/category and confirm deadline, eligibility, required fields, and AI-disclosure rules. No target event was specified for this preparation.
- [ ] Record and upload the three-minute demo; add its public URL.
- [ ] Capture permitted screenshots of the app and sanitized handoff/review evidence.
- [ ] Confirm submitter/team details and any required attribution or licensing information.
- [ ] Independently review this preparation branch before merging it into main; no merge is authorized here.
- [ ] Complete the existing Rescue task: commit Builder's storage-access and malformed-state fixes, run checks, and request independent re-review. Preserve the existing task rather than creating another.
- [ ] After Rescue approval, update application Story materials and submission claims to the exact reviewed implementation and limitations.
- [ ] Perform and document live-browser refresh and background-tab checks if those claims are needed; record exact tested commit and actual outcomes.
- [ ] Perform responsive visual and screen-reader checks if making compatibility/accessibility claims.
- [ ] Verify repository links and public visibility from the submission viewer's perspective.
- [ ] Decide whether a hosted demo is required; none is provided and no deployment is authorized by this preparation.
- [ ] Complete the actual submission form and submit only after the required materials and authorization are in place.

## Recorded state at preparation

Local main: `6b7269ca999344f5614681471ce8171b7260b5cc` (unapproved persistence implementation).
Fetched origin/main: `1755f05b9a6c255da84cc1795abd519d668fa8d6`.
Rescue task `3a60cd82-cc8d-49c7-83f9-0ebcd565b3e6`: awaiting_review, with changes requested.
Builder worktree had uncommitted edits in `examples/study-timer/src/persist.ts` and `examples/study-timer/tests/persist.test.ts`; preparation did not modify them.
