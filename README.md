# SparkToShip

Turn ideas and unfinished personal projects into working software and evidence-backed stories through Discord, Switch, Claude Code, and Codex.

## Workflows

- **Rescue** — improve an existing project.
- **Prototype** — turn an idea into a runnable application.
- **Story** — prepare accurate documentation and demo materials.

---

## CLI Walkthrough

The `sts` CLI manages projects, tasks, evidence and handoffs on each agent's machine.

### Install and build

```powershell
npm install
npm run build
node dist/cli.js --help
```

### Create a project

```powershell
node dist/cli.js project create `
  --name "my-app" `
  --desc "Personal Node.js app" `
  --path "C:\Users\ajay ankam\my-app"
```

### Create a task

```powershell
# Replace <project-id> with the id from the create output
node dist/cli.js task create `
  --project <project-id> `
  --title "Fix login bug" `
  --type rescue `
  --scope "Users cannot log in after password reset" `
  --criteria "login succeeds after reset,no 500 errors in logs"
```

### Advance through the pipeline

```powershell
node dist/cli.js task advance <task-id>  # proposed → ready
node dist/cli.js task advance <task-id>  # ready → running
```

### Block and resume

```powershell
# Block while waiting for an API key
node dist/cli.js task block <task-id> --reason "Need production API key from owner"

# Resume when unblocked — returns to 'running'
node dist/cli.js task resume <task-id>
```

### Record evidence

After making changes and committing:

```powershell
$COMMIT = git rev-parse HEAD

node dist/cli.js task advance <task-id>  # running → awaiting_review

node dist/cli.js evidence add `
  --task <task-id> `
  --command "npm test" `
  --dir "C:\Users\ajay ankam\my-app" `
  --exit 0 `
  --summary "42 tests passed, 0 failed" `
  --status passed `
  --commit $COMMIT
```

### Create a handoff

```powershell
node dist/cli.js handoff create `
  --task <task-id> `
  --agent sparktoship-reviewer `
  --commit $COMMIT `
  --evidence <evidence-id> `
  --limit "Payment flow not tested" `
  --request-id "my-handoff-v1"
```

Repeating the same `--request-id` with identical input returns the existing
handoff safely (idempotent). Using the same ID with different input is rejected.

### List and show

```powershell
node dist/cli.js project list
node dist/cli.js task list --project <project-id>
node dist/cli.js task show <task-id>
node dist/cli.js evidence list --task <task-id>
node dist/cli.js handoff list --task <task-id>
```

---

## Status transitions

```
proposed ──► ready ──► running ──► awaiting_review ──► completed
    │           │          │              │
    └───────────┴──────────┴──────────────┴──► blocked (resume → prior status)
    └───────────┴──────────┴──────────────┴──► failed  (resume → proposed)
```

---

## Data storage

Data is stored in `.sparktoship/` (gitignored). Override with `STS_DATA_DIR`:

```powershell
$env:STS_DATA_DIR = "C:\Users\ajay ankam\.sparktoship"
```

---

## Development

```powershell
npm run typecheck   # TypeScript type check
npm test            # Run all tests (42 tests)
npm run build       # Compile to dist/
```

See `docs/setup.md` for full setup instructions and `examples/` for a
step-by-step walkthrough.

---

## Architecture

See `docs/architecture.md` for how Switch and the SparkToShip CLI divide
responsibilities.

## Agent guidance

- `agents/rescue.md` — Rescue workflow guidance
- `agents/prototype.md` — Prototype workflow guidance
- `agents/story.md` — Story workflow guidance
- `AGENTS.md` — Repository instructions for all agents
- `CLAUDE.md` — Builder-specific instructions
