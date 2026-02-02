---
type: prompt
name: tiki:resume
description: Resume paused work with full context restoration. Use when continuing work that was previously paused.
allowed-tools: Read, Write, Glob, Bash, Task, Edit, Grep
argument-hint: [issue-number]
---

# Resume

Resume paused execution by loading saved context and continuing from where work left off.

## Usage

```
/tiki:resume
/tiki:resume 34
```

## Instructions

### Step 1: Find Paused Work

Read `.tiki/state/current.json`.

If `status` is not "paused":
```
No paused work found.

Use `/tiki:state` to see current status.
Use `/tiki:execute <number>` to start execution.
```

If issue number provided as argument, verify `activeIssue` matches.

### Step 2: Load Context

Read saved context from `.tiki/context/issue-N-phase-M.json` for:

- Progress (completed tasks, remaining tasks)
- Decisions made during previous session
- Notes and previous phase summaries

### Step 3: Verify and Display

Read `.tiki/prompts/resume/context-verification.md` for:

- File state verification (git status check)
- Context conflict handling options
- Context summary display format

### Step 4: Update State

Update `.tiki/state/current.json`:
- Set `status` to "executing"
- Set `lastActivity` to current ISO timestamp

Update plan file `.tiki/plans/issue-N.json`:
- Set current phase's `status` to "in_progress"

Update `.tiki/state/phases.json` (UI state):
- Read existing file (or create if missing)
- Find execution entry matching `activeIssue`
- Set execution `status` to "executing"
- Set current phase's `status` to "in_progress" and update `startedAt` to current timestamp
- If `releaseContext` exists and has `status` of "paused", set it to "in_progress"
- Set `lastUpdated` to current ISO timestamp

See `.tiki/prompts/state/phases-update.md` for the read-modify-write pattern and format details.

### Step 5: Continue Execution

Read `.tiki/prompts/resume/execution-options.md` for:

- Option A: Continue in current context (small remaining work)
- Option B: Spawn sub-agent with full context (substantial work)
- Completion handling and cleanup

### Step 6: Handle Edge Cases

If issues arise, read `.tiki/prompts/resume/edge-cases.md` for:

- Stale context warning (>7 days old)
- Context file missing handling
- Context file format reference

## Notes

- Context file is source of truth for resuming
- If in doubt, start fresh with `/tiki:execute --from N`
- Clean up context files after successful phase completion
