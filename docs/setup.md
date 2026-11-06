# Setup – Windows PowerShell

## Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | 10 | `npm --version` |
| Git | 2.39 | `git --version` |

## Clone and install

```powershell
git clone https://github.com/your-org/sparktoship.git
cd sparktoship
npm install
```

## Build

```powershell
npm run build
```

The compiled CLI is written to `dist/cli.js`.

## Verify

```powershell
node dist/cli.js --help
```

Expected output:

```
Usage: sts [options] [command]

SparkToShip – project and task management CLI

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  project         Manage projects
  task            Manage tasks
  evidence        Manage verification evidence
  handoff         Manage review handoffs
  help [command]  display help for command
```

## Run typecheck and tests

```powershell
npm run typecheck
npm test
```

All tests should pass and typecheck should exit 0.

## Data directory

By default the CLI stores data in `.sparktoship/` inside the current
directory. To use a fixed location across sessions:

```powershell
# Set for the current session
$env:STS_DATA_DIR = "C:\Users\$env:USERNAME\.sparktoship"

# Set permanently (user scope)
[System.Environment]::SetEnvironmentVariable(
    "STS_DATA_DIR",
    "C:\Users\$env:USERNAME\.sparktoship",
    "User"
)
```

The `.sparktoship/` directory is created automatically on first use.

## Add `sts` to PATH (optional)

```powershell
# From the sparktoship directory
npm link
```

Then `sts --help` works from any directory.

## Two-worktree setup (builder + reviewer)

```powershell
# Builder worktree (main)
cd "C:\Users\ajay ankam\sparktoship"

# Reviewer worktree (review branch)
git worktree add "..\sparktoship-review" review
cd "..\sparktoship-review"
npm install
npm run build
```

Each worktree needs its own `npm install` and build.
Each worktree has its own `.sparktoship/` data directory by default;
set `STS_DATA_DIR` to a shared location only if the two agents need to
read each other's records directly (not required in Milestone 1).

## Windows path note

Paths containing spaces (e.g. `C:\Users\ajay ankam\...`) are fully supported.
Always quote paths in PowerShell:

```powershell
node dist/cli.js project create --name "my project" --desc "desc" --path "C:\Users\ajay ankam\my project"
```
