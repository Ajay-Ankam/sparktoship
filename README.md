# SparkToShip

Turn an idea or unfinished personal project into working software and an evidence-backed story, with a human directing two coding agents through Discord and Switch.

## The problem

Personal projects often stall between an idea, a working change, an independent check, and an explanation someone else can try. Chat alone makes it easy to lose scope, repeat requests, or describe work that was never verified. SparkToShip keeps those steps explicit with local task records, commit-linked check results, and review handoffs.

## What works today

- A TypeScript `sts` CLI creates, lists, and shows projects and tasks.
- Tasks record scope, acceptance criteria, workspace path, and timestamps. Their pipeline is `proposed -> ready -> running -> awaiting_review -> completed`, with blocked/failed states and explicit resume paths.
- Evidence records capture a command, directory, exit code, summary, timestamp, status (`passed`, `failed`, `not_run`), and Git commit string.
- Handoffs reference a task, reviewer, commit, evidence, and limitations. Request IDs provide duplicate/conflict handling for create operations.
- A runnable [study timer](examples/study-timer/README.md) demonstrates Prototype: configurable duration, start/pause/resume/reset, completion display, and wall-clock timing.
- [Story materials](examples/study-timer/docs/) document that prototype and its review history.

The demonstrated workflow is human-directed: Ajay sets scope in Discord, Builder implements and sends an exact commit through Switch, Reviewer checks it independently, and Builder resolves findings. These handoffs and review rounds happened in a Switch room. The CLI does not automatically start agents, send room messages, execute checks, or orchestrate the complete workflow. Evidence is recorded by callers; a record is not independent proof that its command ran.

## Switch's role

[Switch](https://github.com/sandbox-quantum/switch) provides rooms, context, addressed messages, and communication between humans and agents. SparkToShip uses the available Switch tools for coordination. Its own CLI stores work records locally; it is not a separate Discord bot or a replacement for Switch. The CLI and timer can run without a Switch connection. Reproducing the collaborative room workflow requires a separately configured Switch installation and agent access.

## Quick start

Use Node.js 20 or later, npm 10 or later, and Git. From PowerShell:

```powershell
git clone https://github.com/Ajay-Ankam/sparktoship.git
cd sparktoship
npm install
npm run typecheck
npm test
npm run build
node dist/cli.js --help
```

### Try the timer

From the repository root:

```powershell
cd examples\study-timer
npm install
npm run dev
# Open the URL printed by Vite (normally http://localhost:5173/).
```

Enter `0:10`, start, pause, resume, and observe completion. Reset to begin another session. See the application README for usage and timing design. Refresh persistence is not included in this preparation branch's approved application baseline.

### Track a small project

From the repository root, use an existing project path:

```powershell
$workspacePath = (Get-Location).Path
$projectResult = node dist/cli.js project create --name "demo" --desc "Small prototype" --path $workspacePath --request-id "demo-project-1" | ConvertFrom-Json
$taskResult = node dist/cli.js task create --project $projectResult.project.id --title "Build a small timer" --type prototype --scope "Local browser timer" --criteria "Configurable duration,Pause and resume,Visible completion" --request-id "demo-task-1" | ConvertFrom-Json
node dist/cli.js task show $taskResult.task.id
node dist/cli.js task advance $taskResult.task.id
```

Advance only as the corresponding work is ready. Run actual checks before recording evidence; use their actual exit codes, summaries, and exact checked commit. See [the CLI example](examples/rescue-walkthrough.md), [setup](docs/setup.md), and [architecture](docs/architecture.md).

By default `.sparktoship/` is relative to the current directory. To share records between worktrees on one machine, explicitly set the same absolute path in **each** agent session:

```powershell
$env:STS_DATA_DIR = Join-Path $env:LOCALAPPDATA "SparkToShip\data"
```

Runtime records are gitignored and are not distributed with the repository. Do not store credentials in task descriptions or evidence.

## Demonstrated work and review status

| Work | Evidence and status |
|---|---|
| Milestone 1: CLI | Approved at `d0c3b28`; independent typecheck, 55 tests, build and behavioral probes passed. |
| Milestone 2: timer | Approved at `f1436b9`; independent typecheck, 39 timer tests, build and mocked DOM/clock probes passed. |
| Story | Accuracy corrections approved at `0320ae6`; subsequent title-duration correction is in pushed baseline `1755f05`. |
| Rescue: refresh persistence | In progress. Local implementation `6b7269c` is not approved or included in this branch. Storage-access and malformed-state findings remain open pending a new committed fix and review. |

At submission preparation, fetched `origin/main` was `1755f05b9a6c255da84cc1795abd519d668fa8d6`. It contains the reviewed CLI, timer, and Story history. Local `main` also has the unapproved Rescue commit. This preparation branch starts from the pushed baseline.

**Human-reported smoke test:** Ajay reports launching the timer locally and that it worked as expected in his browser. No browser details, individual test cases, or verified commit were supplied for that observation. It is separate from the automated checks above.

## Scope and limitations

- Rescue, Prototype, and Story are workflow guidance with demonstrated agent coordination, not automated end-to-end orchestration.
- Timer timing was checked with injected clocks and mocked DOM. Actual hidden-tab behavior, refresh persistence, responsive visual layout, and screen-reader behavior have not been independently verified in a live browser.
- This baseline timer has no refresh persistence, session history, audio alert, accounts, or hosted deployment.
- JSON storage is local to a directory. Using separate defaults in separate worktrees creates separate records; no remote database or multi-machine synchronization exists.
- No submission has been made or social draft published by this preparation work.

## Submission materials

- [Project description and implemented features](docs/submission.md)
- [Three-minute recording plan](docs/demo-script.md)
- [Missing submission items](docs/submission-checklist.md)
- [Workflow guidance](agents/)
