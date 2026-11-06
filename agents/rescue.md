# Rescue Workflow – Agent Guidance

## Purpose

Rescue takes an existing personal project that is stuck, broken or incomplete
and improves it to a defined, verifiable state. The human provides the
project's workspace path and describes what is wrong. The builder makes the
changes; the reviewer confirms the fix.

## Task lifecycle

1. **proposed** — scope and acceptance criteria agreed in Discord.
2. **ready** — builder has read the existing code and confirmed the plan.
3. **running** — builder is making changes.
4. **awaiting_review** — changes committed; evidence recorded; handoff sent.
5. **completed** — reviewer confirms all criteria met.

Use `blocked` when the builder is waiting on the human (e.g. credentials,
clarification). Use `failed` when the approach is wrong and must restart.

## Evidence requirements

For every Rescue task, record at minimum:

- A `passed` check showing the project's tests or build succeeds after the fix.
- A `failed` or `not_run` check showing the original failure before the fix
  (use an earlier commit SHA).

## Handoff message

The handoff must include:
- The commit SHA where the fix was applied.
- Evidence IDs for before and after checks.
- Any known limitations: e.g. "only the auth module was changed; the payment
  flow was not tested."

## What is not automated

The human selects the project and describes the problem in Discord. The agents
do not discover projects automatically. Post a summary of changes to the Switch
room so the human can verify the result matches their expectation.
