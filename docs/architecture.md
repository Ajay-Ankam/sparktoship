# Architecture – SparkToShip

## Overview

SparkToShip consists of two independent layers:

1. **Switch** — a real-time messaging and coordination layer built on Matrix.
   It delivers messages between Discord, the Switch Console, and AI agents.
   SparkToShip uses Switch as a transport; it does not modify Switch internals.

2. **SparkToShip CLI (`sts`)** — a local command-line tool that manages
   projects, tasks, evidence and handoffs on each agent's machine.

The two layers are deliberately separate. Switch handles who talks to whom.
The CLI handles what work was done and what evidence backs it.

## Switch responsibilities

| Responsibility | Switch |
|---|---|
| Route Discord messages to agents | ✅ |
| Deliver addressed events to agents | ✅ |
| Provide room context (history, participants) | ✅ |
| Handle agent-to-agent communication | ✅ |
| Persist task state | ❌ |
| Record verification evidence | ❌ |
| Enforce status transitions | ❌ |

## SparkToShip CLI responsibilities

| Responsibility | sts CLI |
|---|---|
| Persist project and task records | ✅ |
| Enforce validated status transitions | ✅ |
| Record verification evidence with git commit | ✅ |
| Duplicate request protection | ✅ |
| Handoff record creation | ✅ |
| Send messages to other agents | ❌ (use Switch) |
| Read Discord messages | ❌ (use Switch) |

## Data flow

```
Human (Discord)
    │  types a request
    ▼
Switch Room
    │  delivers addressed event to builder
    ▼
sparktoship-builder (Claude Code)
    │  runs `sts task create`, `sts task advance`, etc.
    │  makes code changes
    │  runs checks, records evidence with `sts evidence add`
    │  creates handoff with `sts handoff create`
    │  posts handoff ID to Switch room
    ▼
Switch Room
    │  delivers handoff message to reviewer
    ▼
sparktoship-reviewer (Codex)
    │  pulls git branch, reads handoff record
    │  runs own checks, posts findings
    ▼
Switch Room
    │  reviewer posts approval or issues
    ▼
Human (Discord)
```

## Storage

The CLI stores all data in `.sparktoship/` inside the working directory
(or the path in `STS_DATA_DIR`). Each collection is a JSON file:

```
.sparktoship/
  projects.json
  tasks.json
  evidence.json
  handoffs.json
  requests.json    ← idempotency log
```

**Why JSON files?**

- Zero infrastructure: no database server to install or configure.
- Human-readable: easy to inspect and debug.
- Atomic writes (write-to-temp + rename) prevent corruption.
- `proper-lockfile` prevents concurrent write races between builder and
  reviewer processes on the same machine.
- The whole store can be cleared by deleting the directory, which is
  useful during development.

**What stays out of Git:**

`.sparktoship/` is gitignored. It holds machine-local runtime state and
must not be shared between machines or committed.

## Git worktrees

The builder and reviewer operate in separate worktrees to avoid interfering
with each other's working trees during active tasks:

```
C:\Users\ajay ankam\sparktoship\       ← builder (branch: main)
C:\Users\ajay ankam\sparktoship-review\ ← reviewer (branch: review)
```

Each worktree has its own `.sparktoship/` data directory. The reviewer reads
the builder's committed code from the git history, not from the builder's
working tree.

## End-to-end workflow status

The three workflows (Rescue, Prototype, Story) are defined in `agents/` as
agent guidance documents. Their step-by-step automated orchestration is
planned for a future milestone. Currently, agents follow the guidance
documents manually and coordinate through Switch.
