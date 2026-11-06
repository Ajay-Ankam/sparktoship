# Sample Walkthrough: Rescue a Broken CLI Tool

This example shows the full SparkToShip flow for a Rescue task.
All commands use `node dist/cli.js`; substitute `sts` if you have run `npm link`.

## Scenario

You have a small Node.js CLI tool that stopped working after upgrading
Node.js from 18 to 20. `npm start` throws `ReferenceError: fetch is not defined`.
You want the builder to diagnose and fix it.

---

## Step 1 – Create the project

```powershell
node dist/cli.js project create `
  --name "my-cli-tool" `
  --desc "A small Node.js CLI that broke after Node 20 upgrade" `
  --path "C:\Users\ajay ankam\my-cli-tool"
```

Output (abbreviated):
```json
{
  "created": true,
  "project": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "name": "my-cli-tool",
    ...
  }
}
```

Save the project ID: `PROJ_ID=xxxxxxxx-...`

---

## Step 2 – Create the Rescue task

```powershell
node dist/cli.js task create `
  --project $PROJ_ID `
  --title "Fix fetch undefined after Node 20 upgrade" `
  --type rescue `
  --scope "npm start fails with ReferenceError: fetch is not defined" `
  --criteria "npm start exits 0,no ReferenceError in output"
```

Save the task ID: `TASK_ID=yyyyyyyy-...`

---

## Step 3 – Advance through the pipeline

```powershell
# proposed → ready (plan confirmed)
node dist/cli.js task advance $TASK_ID

# ready → running (fix in progress)
node dist/cli.js task advance $TASK_ID
```

---

## Step 4 – Make the fix and get the commit SHA

```powershell
cd "C:\Users\ajay ankam\my-cli-tool"
# ... apply the fix ...
git add .
git commit -m "fix: replace node-fetch with built-in fetch (Node 20+)"
$COMMIT = git rev-parse HEAD
```

---

## Step 5 – Record evidence

```powershell
# running → awaiting_review
node dist/cli.js task advance $TASK_ID

node dist/cli.js evidence add `
  --task $TASK_ID `
  --command "npm start -- --help" `
  --dir "C:\Users\ajay ankam\my-cli-tool" `
  --exit 0 `
  --summary "CLI starts without errors; help text displayed correctly" `
  --status passed `
  --commit $COMMIT
```

Save the evidence ID: `EV_ID=zzzzzzzz-...`

---

## Step 6 – Create the handoff

```powershell
node dist/cli.js handoff create `
  --task $TASK_ID `
  --agent sparktoship-reviewer `
  --commit $COMMIT `
  --evidence $EV_ID `
  --limit "Only the fetch usage was changed; unrelated modules were not tested" `
  --request-id "rescue-my-cli-tool-v1"
```

---

## Step 7 – Post to Switch room

The builder then sends a targeted message to sparktoship-reviewer in the
Switch room with the handoff ID and commit SHA. The reviewer pulls the branch,
runs their own checks, and posts findings or approval.

---

## Duplicate safety

If the builder is interrupted and re-runs step 6 with the same `--request-id`,
the CLI returns the existing handoff without creating a duplicate:

```json
{ "created": false, "handoff": { "id": "...", ... } }
```

If the same `--request-id` is reused with different input, the CLI rejects
it with a conflict error.
