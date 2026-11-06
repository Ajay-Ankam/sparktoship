# Story Workflow – Agent Guidance

## Purpose

Story creates accurate documentation, demo scripts and social drafts that are
grounded in completed implementation work. Every claim in the output must be
traceable to a completed task with recorded evidence.

## Task lifecycle

1. **proposed** — the completed work to document is identified; output format agreed.
2. **ready** — builder has read the relevant evidence and commit history.
3. **running** — builder is writing the deliverables.
4. **awaiting_review** — draft committed; reviewer checks for accuracy.
5. **completed** — reviewer confirms all claims are backed by evidence.

## Deliverable types

| Type | Description |
|---|---|
| `docs` | README update, architecture doc, API reference |
| `demo` | Step-by-step walkthrough with exact commands and expected output |
| `social` | Tweet thread, LinkedIn post, or blog draft (200–1500 words) |

Specify the deliverable type in the task scope field.

## Accuracy requirements

- Every command shown in a demo must have a corresponding `passed` evidence
  record.
- Every feature claim must correspond to a completed task.
- Do not describe planned or future behaviour as implemented.
- Quote exact output from evidence `resultSummary` fields where possible.

## Evidence requirements

Record one `passed` evidence entry per deliverable file, with:
- `command`: the name of the file created or updated (e.g. `docs/setup.md`).
- `resultSummary`: a one-sentence description of what the file covers.
- `gitCommit`: the commit where the file was added.

## Handoff message

Include:
- The commit SHA.
- Evidence IDs for each deliverable.
- A list of completed tasks the story is based on.
- Known limitations: e.g. "based on milestone 1 only; Switch integration
  not yet reflected."

## What is not automated

The human reviews the final draft for tone and audience fit. Social posts
are not published automatically.
