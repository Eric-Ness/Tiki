# State Output Formats

## v2 Multi-Execution Display

When state has `version: 2` or `activeExecutions` array:

```text
## Tiki State

### Active Executions
Execution #1: Issue #45 - Phase 2/5 (executing)
  Title: Add user authentication
  Started: 2 hours ago
  Last activity: 15 minutes ago

Execution #2: Issue #52 - Phase 1/3 (paused)
  Title: Fix login redirect
  Started: 1 day ago
  Paused: 3 hours ago
  Reason: Waiting for API key

Execution #3: Issue #67 - Phase 3/4 (failed)
  Title: Update docs
  Started: 4 hours ago
  Failed at: Phase 3
  Error: Test verification failed

### Execution History
**2 archived executions** (use `/tiki:state --history` for details)

### Context Budget (Next Phase)
{Include if context-budget.md was loaded}

### Active Release
{Include if release-context.md was loaded}

### Planned Issues
| Issue | Title | Phases | Status |
|-------|-------|--------|--------|
| #34 | Add user authentication | 3 | in_progress |
| #35 | Fix login redirect | 1 | planned |
| #36 | Update docs | 2 | planned |

### Queue
**3 items** pending review

---
**Next:** Continue with `/tiki:execute 45` or `/tiki:resume` for paused work
```

When v2 state has no active executions:

```text
## Tiki State

### Active Executions
No active executions.

### Execution History
**5 archived executions** (use `/tiki:state --history` for details)

### Planned Issues
| Issue | Title | Phases | Status |
|-------|-------|--------|--------|
| #35 | Fix login redirect | 1 | planned |

---
**Next:** Start work with `/tiki:execute <issue-number>`
```

## v1 Full State Display (Legacy)

When active work exists:

```text
## Tiki State

### Active Work
**Issue #34:** Add user authentication
- Status: in_progress
- Progress: Phase 2 of 3 (67%)
- Current phase: Add login endpoint
- Started: 2 hours ago
- Last activity: 15 minutes ago

### Context Budget (Next Phase)
{Include if context-budget.md was loaded}

### Active Release
{Include if release-context.md was loaded}

### Planned Issues
| Issue | Title | Phases | Status |
|-------|-------|--------|--------|
| #34 | Add user authentication | 3 | in_progress |
| #35 | Fix login redirect | 1 | planned |
| #36 | Update docs | 2 | planned |

### Queue
**3 items** pending review
- 1 potential new issue
- 2 questions needing input

### Paused Work
None

---
**Next:** Continue with `/tiki:execute 34` or `/tiki:whats-next` for suggestions
```

## State When Nothing Active

```text
## Tiki State

### Active Work
No active execution.

### Active Release
None

### Planned Issues
| Issue | Title | Phases | Status |
|-------|-------|--------|--------|
| #35 | Fix login redirect | 1 | planned |
| #36 | Update docs | 2 | planned |

### Queue
Empty

### Paused Work
None

---
**Next:** Start work with `/tiki:execute <issue-number>` or plan a new issue with `/tiki:plan-issue <number>`
```

## State When Nothing Exists

When `.tiki/` folder is empty or doesn't exist:

```text
## Tiki State

No Tiki state found. This project hasn't been set up with Tiki yet.

**Get started:**
1. View GitHub issues: `/tiki:get-issue <number>`
2. Plan an issue: `/tiki:plan-issue <number>`
3. Execute the plan: `/tiki:execute <number>`
```

## State File Reference

### v2 Format (Multi-Execution)

`.tiki/state/current.json` v2 structure:

```json
{
  "version": 2,
  "status": "executing",
  "lastActivity": "2026-01-10T11:30:00Z",
  "activeExecutions": [
    {
      "id": "exec-45-a1b2c3d4",
      "issue": 45,
      "issueTitle": "Add user authentication",
      "currentPhase": 2,
      "totalPhases": 5,
      "status": "executing",
      "startedAt": "2026-01-10T10:00:00Z",
      "lastActivity": "2026-01-10T11:30:00Z",
      "completedPhases": [
        {
          "number": 1,
          "title": "Setup auth middleware",
          "summary": "Created auth middleware with JWT validation",
          "completedAt": "2026-01-10T10:30:00Z"
        }
      ]
    },
    {
      "id": "exec-52-e5f6g7h8",
      "issue": 52,
      "issueTitle": "Fix login redirect",
      "currentPhase": 1,
      "totalPhases": 3,
      "status": "paused",
      "startedAt": "2026-01-09T09:00:00Z",
      "pausedAt": "2026-01-10T08:30:00Z",
      "pauseReason": "Waiting for API key",
      "completedPhases": []
    }
  ],
  "executionHistory": [
    {
      "id": "exec-40-i9j0k1l2",
      "issue": 40,
      "issueTitle": "Initial setup",
      "status": "completed",
      "startedAt": "2026-01-08T10:00:00Z",
      "endedAt": "2026-01-08T14:00:00Z",
      "completedPhases": 3,
      "totalPhases": 3
    }
  ]
}
```

### v1 Format (Legacy Single-Execution)

`.tiki/state/current.json` v1 structure:

```json
{
  "activeIssue": 34,
  "currentPhase": 2,
  "status": "in_progress",
  "startedAt": "2026-01-10T10:00:00Z",
  "lastActivity": "2026-01-10T11:30:00Z",
  "pausedAt": null,
  "completedPhases": [
    {
      "number": 1,
      "title": "Setup auth middleware",
      "summary": "Created auth middleware with JWT validation",
      "completedAt": "2026-01-10T10:30:00Z"
    }
  ]
}
```
