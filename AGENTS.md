# SparkToShip – Agent Instructions

This repository is worked on by two agents operating in separate worktrees.
Both agents share the same remote; each runs checks independently before
handing off or merging.

## Agents

| Agent | Tool | Worktree | Branch |
|---|---|---|---|
| sparktoship-builder | Claude Code | `sparktoship/` (main) | `main` |
| sparktoship-reviewer | Codex | `sparktoship-review/` | `review` |

## Coordination

Agents coordinate through the shared Switch room (see CLAUDE.md for how to
connect). The builder posts progress updates and sends a handoff message when
a task reaches `awaiting_review`. The reviewer pulls the branch, runs checks,
and posts findings or approval.

## Repository layout

```
src/           TypeScript source
tests/         Jest tests
dist/          Compiled output (gitignored)
docs/          Architecture and setup documentation
agents/        Workflow-specific agent guidance
examples/      Sample projects and task walkthroughs
.sparktoship/  Runtime data store (gitignored — machine-local)
```

## Before every commit

1. `npm run typecheck` — zero errors required.
2. `npm test` — all tests must pass.
3. `npm run build` — build must succeed.
4. `git status` — do not stage `.sparktoship/`, `dist/`, `node_modules/`,
   `.env*`, or any file containing credentials.

## Branching

- `main` — integration branch, owned by the builder.
- `review` — review worktree branch, owned by the reviewer.
- Feature branches: `feat/<slug>` cut from `main`.

## Commit messages

Summarise *what changed and why* in the subject line (≤72 chars).
Add a body when the change needs context. End with attribution lines per
`.claude/settings.json`.

## What is not implemented yet

The three end-to-end workflows (Rescue, Prototype, Story) are defined in
`agents/` as guidance documents; their automated orchestration is planned for
a later milestone. Do not claim they run end-to-end automatically.
