# Submission: SparkToShip

## Project description

SparkToShip helps a person take a small project from scope to implementation, independent review, and accurate documentation. Discord is the human conversation surface; Switch carries room context and agent handoffs; a local TypeScript CLI tracks projects, tasks, evidence, and review records. A browser study timer is the concrete working example.

## Implemented features

- Project/task create, list, and show commands; scope and acceptance criteria.
- Validated task transitions, blocked/failed reasons, and resume paths.
- Check evidence with command, directory, exit code, summary, status, timestamp, and commit reference.
- Review handoffs with task/evidence references and limitations.
- Request-ID duplicate/conflict handling for project/task/handoff creation, with concurrency coverage.
- Vite/TypeScript timer with duration input, pause/resume/reset, completion banner, and progress value updates.
- Prototype and Story completed through actual Builder/Reviewer handoffs in Switch, including reported defects and corrective review rounds.

These are demonstrated human-directed workflows. SparkToShip does not automatically consume Discord requests, schedule agents, execute checks, send handoffs, or complete Rescue/Prototype/Story from a single command.

## Verification

The CLI at `d0c3b28` passed independent typecheck, 55 tests, build, and behavioral probes. The timer at `f1436b9` passed independent typecheck, 39 tests, build, and mocked clock/DOM probes. Story accuracy corrections were approved at `0320ae6`; the pushed baseline `1755f05` also adjusts the short demo's duration label.

Ajay reports successfully launching the timer locally in his browser and that it worked as expected. Browser details, individual test cases, and a verified commit were not supplied. Do not present this report as a browser compatibility, accessibility, hidden-tab, or persistence test.

## Rescue status

Refresh persistence is in progress, not complete. The local implementation `6b7269c` passed 61 tests, typecheck, and build, but review found that blocked localStorage access can abort initialization and malformed numeric storage can restore invalid state. Builder has uncommitted fix work; it has not been handed back as a reviewed commit. This preparation branch deliberately uses the pushed baseline without that implementation.

## Links and materials

- Repository: https://github.com/Ajay-Ankam/sparktoship
- Local timer: follow the root README; Vite normally prints http://localhost:5173/.
- Recording plan: [three-minute demo](demo-script.md).
- Remaining work: [submission checklist](submission-checklist.md).

No public demo URL or recorded video is available in this preparation. No contest eligibility or submission acceptance is claimed. Select the target event and confirm its rules before adapting this description to a submission form.
