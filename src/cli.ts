#!/usr/bin/env node
/**
 * sts – SparkToShip CLI
 *
 * Usage:
 *   sts project create --name <n> --desc <d> --path <p> [--request-id <id>]
 *   sts project list
 *   sts project show <id|name>
 *
 *   sts task create --project <id> --title <t> --type <rescue|prototype|story>
 *                   --scope <s> --criteria <c> [--path <p>] [--request-id <id>]
 *   sts task list [--project <id>]
 *   sts task show <id>
 *   sts task advance <id>
 *   sts task block <id> --reason <r>
 *   sts task fail <id> --reason <r>
 *   sts task resume <id>
 *
 *   sts evidence add --task <id> --command <cmd> --dir <dir> --exit <n>
 *                    --summary <s> --status <passed|failed|not_run> --commit <sha>
 *   sts evidence list [--task <id>]
 *
 *   sts handoff create --task <id> --agent <name> --commit <sha>
 *                      --evidence <ids...> [--limit <text>] [--request-id <id>]
 *   sts handoff list [--task <id>]
 *   sts handoff show <id>
 */

import { Command } from 'commander';
import { createProject, listProjects, getProject } from './projects.js';
import { createTask, listTasks, requireTask, advanceTask, blockTask, failTask, resumeTask } from './tasks.js';
import { addEvidence, listEvidence } from './evidence.js';
import { createHandoff, listHandoffs, getHandoff } from './handoff.js';

const program = new Command();

program
  .name('sts')
  .description('SparkToShip – project and task management CLI')
  .version('0.1.0');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exit(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function print(obj: unknown): void {
  console.log(JSON.stringify(obj, null, 2));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(fn: (...args: any[]) => Promise<void>): (...args: any[]) => Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (...args: any[]) => {
    try {
      await fn(...args);
    } catch (err) {
      exit((err as Error).message);
    }
  };
}

// ─── project ─────────────────────────────────────────────────────────────────

const project = program.command('project').description('Manage projects');

project
  .command('create')
  .description('Create a new project')
  .requiredOption('-n, --name <name>', 'Project name')
  .requiredOption('-d, --desc <description>', 'Project description')
  .requiredOption('-p, --path <workspacePath>', 'Absolute workspace path')
  .option('--request-id <id>', 'Idempotency key (repeat safely)')
  .action(
    wrap(async (opts) => {
      const { project: p, created } = await createProject({
        name: opts.name as string,
        description: opts.desc as string,
        workspacePath: opts.path as string,
        requestId: opts.requestId as string | undefined,
      });
      print({ created, project: p });
    }),
  );

project
  .command('list')
  .description('List all projects')
  .action(
    wrap(async () => {
      const projects = listProjects();
      if (projects.length === 0) {
        console.log('No projects found.');
        return;
      }
      print(projects);
    }),
  );

project
  .command('show <idOrName>')
  .description('Show a project by ID or name')
  .action(
    wrap(async (idOrName: string) => {
      const p = getProject(idOrName);
      if (!p) exit(`Project not found: ${idOrName}`);
      print(p);
    }),
  );

// ─── task ─────────────────────────────────────────────────────────────────────

const task = program.command('task').description('Manage tasks');

task
  .command('create')
  .description('Create a new task')
  .requiredOption('--project <projectId>', 'Project ID')
  .requiredOption('-t, --title <title>', 'Task title')
  .requiredOption(
    '--type <workflowType>',
    'Workflow type: rescue | prototype | story',
  )
  .requiredOption('-s, --scope <scope>', 'Task scope description')
  .requiredOption(
    '-c, --criteria <criteria>',
    'Acceptance criteria (comma-separated)',
  )
  .option('-p, --path <workspacePath>', 'Override workspace path')
  .option('--request-id <id>', 'Idempotency key')
  .action(
    wrap(async (opts) => {
      const criteria = (opts.criteria as string)
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      const { task: t, created } = await createTask({
        projectId: opts.project as string,
        title: opts.title as string,
        workflowType: opts.type as 'rescue' | 'prototype' | 'story',
        scope: opts.scope as string,
        acceptanceCriteria: criteria,
        workspacePath: opts.path as string | undefined,
        requestId: opts.requestId as string | undefined,
      });
      print({ created, task: t });
    }),
  );

task
  .command('list')
  .description('List tasks')
  .option('--project <projectId>', 'Filter by project ID')
  .action(
    wrap(async (opts) => {
      const tasks = listTasks(opts.project as string | undefined);
      if (tasks.length === 0) {
        console.log('No tasks found.');
        return;
      }
      print(tasks);
    }),
  );

task
  .command('show <id>')
  .description('Show a task by ID')
  .action(
    wrap(async (id: string) => {
      const t = requireTask(id);
      print(t);
    }),
  );

task
  .command('advance <id>')
  .description(
    'Advance a task to the next pipeline status (proposed→ready→running→awaiting_review→completed)',
  )
  .action(
    wrap(async (id: string) => {
      const t = await advanceTask(id);
      print({ task: t });
    }),
  );

task
  .command('block <id>')
  .description('Mark a task as blocked')
  .requiredOption('-r, --reason <reason>', 'Reason for blocking')
  .action(
    wrap(async (id: string, opts) => {
      const t = await blockTask(id, opts.reason as string);
      print({ task: t });
    }),
  );

task
  .command('fail <id>')
  .description('Mark a task as failed')
  .requiredOption('-r, --reason <reason>', 'Reason for failure')
  .action(
    wrap(async (id: string, opts) => {
      const t = await failTask(id, opts.reason as string);
      print({ task: t });
    }),
  );

task
  .command('resume <id>')
  .description('Resume a blocked or failed task')
  .action(
    wrap(async (id: string) => {
      const t = await resumeTask(id);
      print({ task: t });
    }),
  );

// ─── evidence ────────────────────────────────────────────────────────────────

const evidence = program.command('evidence').description('Manage verification evidence');

evidence
  .command('add')
  .description('Record verification evidence for a task')
  .requiredOption('--task <taskId>', 'Task ID')
  .requiredOption('--command <command>', 'Command that was run')
  .requiredOption('--dir <workingDirectory>', 'Working directory where command ran')
  .requiredOption('--exit <exitCode>', 'Process exit code', parseInt)
  .requiredOption('--summary <resultSummary>', 'Human-readable result summary')
  .requiredOption(
    '--status <status>',
    'Evidence status: passed | failed | not_run',
  )
  .requiredOption('--commit <gitCommit>', 'Git commit SHA')
  .option('--timestamp <iso>', 'Override timestamp (ISO 8601)')
  .action(
    wrap(async (opts) => {
      const ev = await addEvidence({
        taskId: opts.task as string,
        command: opts.command as string,
        workingDirectory: opts.dir as string,
        exitCode: opts.exit as number,
        resultSummary: opts.summary as string,
        status: opts.status as 'passed' | 'failed' | 'not_run',
        gitCommit: opts.commit as string,
        timestamp: opts.timestamp as string | undefined,
      });
      print(ev);
    }),
  );

evidence
  .command('list')
  .description('List evidence records')
  .option('--task <taskId>', 'Filter by task ID')
  .action(
    wrap(async (opts) => {
      const records = listEvidence(opts.task as string | undefined);
      if (records.length === 0) {
        console.log('No evidence records found.');
        return;
      }
      print(records);
    }),
  );

// ─── handoff ──────────────────────────────────────────────────────────────────

const handoff = program.command('handoff').description('Manage review handoffs');

handoff
  .command('create')
  .description('Create a review handoff record')
  .requiredOption('--task <taskId>', 'Task ID (must be in awaiting_review)')
  .requiredOption('--agent <targetAgent>', 'Target agent name')
  .requiredOption('--commit <sha>', 'Git commit SHA to review')
  .requiredOption('--evidence <ids>', 'Comma-separated evidence IDs')
  .option('--limit <text>', 'Known limitations (comma-separated)')
  .option('--request-id <id>', 'Idempotency key')
  .action(
    wrap(async (opts) => {
      const evidenceIds = (opts.evidence as string)
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      const limitations = opts.limit
        ? (opts.limit as string)
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)
        : [];

      const { handoff: h, created } = await createHandoff({
        taskId: opts.task as string,
        targetAgent: opts.agent as string,
        commit: opts.commit as string,
        evidenceIds,
        limitations,
        requestId: opts.requestId as string | undefined,
      });
      print({ created, handoff: h });
    }),
  );

handoff
  .command('list')
  .description('List handoff records')
  .option('--task <taskId>', 'Filter by task ID')
  .action(
    wrap(async (opts) => {
      const records = listHandoffs(opts.task as string | undefined);
      if (records.length === 0) {
        console.log('No handoff records found.');
        return;
      }
      print(records);
    }),
  );

handoff
  .command('show <id>')
  .description('Show a handoff by ID')
  .action(
    wrap(async (id: string) => {
      const h = getHandoff(id);
      if (!h) exit(`Handoff not found: ${id}`);
      print(h);
    }),
  );

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parse(process.argv);
