# Three-minute recording plan

Use the approved pushed baseline `1755f05` or this documentation-only preparation branch. Prepare the timer and CLI before recording. This is a plan, not a claim that a recording or browser test already happened. Do not show credentials, private room data, or machine-local runtime files.

## Before recording

From the repository root, install and build the CLI using the README commands. In a second terminal, run `npm install` and `npm run dev` from `examples/study-timer`; open the URL Vite prints. Use sample task data in an isolated STS_DATA_DIR. Select a sanitized excerpt of the existing Switch review conversation, preserving the distinction between actual historical handoffs and any sample CLI records.

## 0:00–0:25 — Problem and workflow

Show the repository README. Explain: “Small projects need scope, working code, an independent check, and an accurate story. SparkToShip tracks those steps while a human directs agents through Discord and Switch.” State that orchestration is human-directed today.

## 0:25–0:55 — Records that make a handoff concrete

Show a sample project/task using `node dist/cli.js project list` and `node dist/cli.js task show <actual-sample-task-id>` (replace the placeholder before recording). Point out scope, acceptance criteria, status, and workspace. Explain that evidence records identify the checked commit and distinguish passed, failed, and not-run checks. Records are caller-supplied, not proof of execution by themselves.

## 0:55–1:25 — Actual Switch review loop

Show the sanitized historical handoff at `6be1f3f`, the deadline/ARIA findings, and approval at `f1436b9`. Explain that Builder sent the exact commit, Reviewer used a separate worktree, reproduced defects, and checked fixes. Switch delivered the messages; the local CLI did not automate them. Do not recreate a conversation and label it historical evidence.

## 1:25–2:10 — Working timer

Show the loaded timer. Enter `0:10` and click Start. After a few seconds click Pause; wait briefly; click Resume and allow completion. Show the banner, then Reset. Narrate results only if observed during recording; if a step fails, record the failure accurately rather than claiming a pass. Mention that the implementation calculates time from timestamps, with automated coverage using fake clocks. Do not claim real hidden-tab verification from those tests.

## 2:10–2:35 — Evidence-backed Story

Show the application README, development log, short demo plan, and unpublished social draft. State the independently checked counts: 55 CLI tests at `d0c3b28`, 39 timer tests at `f1436b9`. Show the recorded results or run checks before recording; do not invent terminal output. Explain that ARIA values were separately checked in a mocked DOM, not with a screen reader.

## 2:35–3:00 — Honest limits and next step

Say: “Ajay reports that he launched the timer successfully in his browser; no browser details, individual test cases, or verified commit were supplied. Refresh persistence is a Rescue task still awaiting fixes and independent re-review. This baseline does not persist across refresh. No hosted app or fully automated orchestration is claimed.” End on the repository URL and submission checklist.

## Command evidence context

Historical independent checks cover CLI typecheck/tests/build at `d0c3b28` and timer typecheck/tests/build at `f1436b9`. Builder recorded timer install evidence at `6be1f3f` and dev-server startup at `5d3167e` (server startup only). The new recording's sample CLI queries and manual browser actions must be observed during recording; they are not claimed as completed tests by this plan.
