# Phases.json Update Protocol

This document specifies when and how to update `.tiki/state/phases.json` for UI consumption.

## Purpose

`phases.json` is optimized for desktop UI display. It provides execution details without requiring the UI to parse plan files. This is separate from `current.json` (orchestration state) and plan files (execution logic).

## Update Triggers

Update `phases.json` at these workflow points:

| Event | Action |
|-------|--------|
| Execution start | Create new execution entry |
| Phase start | Update phase status to `in_progress`, set `startedAt` |
| Phase complete | Update phase status to `completed`, set `completedAt`, increment `completedCount` |
| Phase failure | Update phase status to `failed`, set `errorMessage` on execution |
| Pause | Update execution status to `paused` |
| Resume | Update execution status to `executing` |
| Ship | Remove execution entry, update `lastCompleted` |
| Auto-fix start | Add `autoFix` object with attempt info |
| Auto-fix complete | Remove `autoFix` object, update phase status |

## Read-Modify-Write Pattern

Always use this pattern to avoid race conditions:

```javascript
// 1. Read current state
const phasesFile = '.tiki/state/phases.json';
let phases = { schemaVersion: 1, lastUpdated: null, executions: [] };
if (fileExists(phasesFile)) {
  phases = JSON.parse(readFile(phasesFile));
}

// 2. Modify state
// ... make changes ...

// 3. Update timestamp
phases.lastUpdated = new Date().toISOString();

// 4. Write back
writeFile(phasesFile, JSON.stringify(phases, null, 2));
```

## Execution ID Format

Generate unique execution IDs as: `exec-{issueNumber}-{timestamp}`

```javascript
const executionId = `exec-${issueNumber}-${Date.now()}`;
// Example: exec-106-1706889600000
```

## State Transition Examples

### Execution Start

When `/tiki:execute` begins:

```json
{
  "schemaVersion": 1,
  "lastUpdated": "2026-02-02T10:00:00.000Z",
  "executions": [
    {
      "id": "exec-106-1706889600000",
      "issueNumber": 106,
      "issueTitle": "Add phases.json for Desktop UI state display",
      "issueUrl": "https://github.com/owner/repo/issues/106",
      "status": "executing",
      "currentPhase": 1,
      "phases": [
        { "number": 1, "title": "Create schema and helper prompt", "status": "in_progress", "startedAt": "2026-02-02T10:00:00.000Z", "completedAt": null },
        { "number": 2, "title": "Update execute.md", "status": "pending", "startedAt": null, "completedAt": null },
        { "number": 3, "title": "Update ship.md", "status": "pending", "startedAt": null, "completedAt": null }
      ],
      "completedCount": 0,
      "totalCount": 3,
      "startedAt": "2026-02-02T10:00:00.000Z",
      "errorMessage": null,
      "autoFix": null
    }
  ],
  "releaseContext": null,
  "lastCompleted": null
}
```

### Phase Complete

When a phase finishes successfully:

```json
{
  "phases": [
    { "number": 1, "title": "Create schema and helper prompt", "status": "completed", "startedAt": "2026-02-02T10:00:00.000Z", "completedAt": "2026-02-02T10:15:00.000Z" },
    { "number": 2, "title": "Update execute.md", "status": "in_progress", "startedAt": "2026-02-02T10:15:00.000Z", "completedAt": null },
    { "number": 3, "title": "Update ship.md", "status": "pending", "startedAt": null, "completedAt": null }
  ],
  "currentPhase": 2,
  "completedCount": 1
}
```

### Phase Failure

When a phase fails:

```json
{
  "status": "failed",
  "phases": [
    { "number": 1, "title": "Create schema and helper prompt", "status": "completed", "startedAt": "2026-02-02T10:00:00.000Z", "completedAt": "2026-02-02T10:15:00.000Z" },
    { "number": 2, "title": "Update execute.md", "status": "failed", "startedAt": "2026-02-02T10:15:00.000Z", "completedAt": null },
    { "number": 3, "title": "Update ship.md", "status": "pending", "startedAt": null, "completedAt": null }
  ],
  "currentPhase": 2,
  "errorMessage": "Verification failed: tests not passing"
}
```

### Auto-Fix In Progress

When heal attempts auto-fix:

```json
{
  "status": "executing",
  "autoFix": {
    "attempt": 1,
    "maxAttempts": 3,
    "startedAt": "2026-02-02T10:20:00.000Z"
  }
}
```

### Pause

When `/tiki:pause` is invoked:

```json
{
  "status": "paused",
  "currentPhase": 2
}
```

### Resume

When `/tiki:resume` is invoked:

```json
{
  "status": "executing",
  "currentPhase": 2,
  "phases": [
    { "number": 2, "title": "Update execute.md", "status": "in_progress", "startedAt": "2026-02-02T11:00:00.000Z", "completedAt": null }
  ]
}
```

### Ship (Issue Complete)

When `/tiki:ship` completes:

1. Remove the execution entry from `executions` array
2. Update `lastCompleted`:

```json
{
  "lastUpdated": "2026-02-02T12:00:00.000Z",
  "executions": [],
  "lastCompleted": {
    "issueNumber": 106,
    "issueTitle": "Add phases.json for Desktop UI state display",
    "completedAt": "2026-02-02T12:00:00.000Z"
  }
}
```

### Release Context (release-yolo)

When processing a release:

```json
{
  "releaseContext": {
    "version": "v1.7",
    "status": "in_progress",
    "startedAt": "2026-02-02T09:00:00.000Z",
    "issues": {
      "total": [101, 102, 103, 104, 105],
      "completed": [101, 102],
      "current": 103,
      "pending": [104, 105],
      "failed": [],
      "skipped": []
    },
    "progress": {
      "completedCount": 2,
      "totalCount": 5,
      "percentage": 40
    }
  }
}
```

## Multiple Executions

While Tiki's simplified state model supports single-issue execution, `phases.json` uses an array to support future parallel execution scenarios. Currently, there should be at most one active execution.

## File Location

Always write to: `.tiki/state/phases.json`

Ensure the `.tiki/state/` directory exists before writing.

## Schema Version

Always set `schemaVersion: 1`. Future breaking changes will increment this version, allowing consumers to detect and handle schema evolution.
