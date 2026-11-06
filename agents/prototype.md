# Prototype Workflow – Agent Guidance

## Purpose

Prototype turns a small, concrete idea into a runnable application. The
human describes the idea in Discord; the builder creates a minimal working
implementation; the reviewer confirms it runs and meets the acceptance
criteria.

## Task lifecycle

1. **proposed** — idea and acceptance criteria agreed in Discord.
2. **ready** — builder has chosen the tech stack and confirmed the plan.
3. **running** — builder is building.
4. **awaiting_review** — application runs and evidence is recorded.
5. **completed** — reviewer confirms the prototype works.

Use `blocked` when a decision requires human input (e.g. API key, design
choice). Use `failed` when the chosen approach is a dead end.

## Scope guidelines

Keep prototypes small enough that a single task covers the whole thing.
If the idea requires multiple independent pieces, split into separate tasks
and sequence them explicitly.

## Evidence requirements

- A `passed` check for `npm install` (or equivalent) with exit code 0.
- A `passed` check for the build/compile step.
- A `passed` check for any automated tests.
- A `not_run` or `passed` check for a manual smoke-test command (describe
  the expected output in `resultSummary`).

All evidence must reference the same Git commit SHA.

## Handoff message

Include:
- The commit SHA.
- The command to run the prototype.
- Evidence IDs for install, build, and test checks.
- Known limitations: e.g. "no error handling", "hardcoded config values".

## What is not automated

The human provides the idea. The prototype is not deployed automatically.
Post the run command and expected output to the Switch room so the human can
try it themselves.
