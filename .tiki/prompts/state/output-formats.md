# State Output Formats

## Active Issue Display

When state has an active issue:

```text
## Tiki State

**Status:** executing

### Active Issue
**Issue #34:** Add user authentication
**Phase:** 2/3 - Add login endpoint
**Progress:** 1 of 3 phases complete
**Started:** 2 hours ago
**Last Activity:** 15 minutes ago

### Phase Details (from plan file)
- Phase 1: Setup auth middleware - completed
- Phase 2: Add login endpoint - in_progress
- Phase 3: Add session handling - pending

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

### Recent
**Last Completed:** Issue #32 at 2026-01-09T14:00:00Z

---
**Next:** Continue with `/tiki:execute 34` or `/tiki:whats-next` for suggestions
```

## Paused State Display

When state has status "paused":

```text
## Tiki State

**Status:** paused

### Active Issue
**Issue #34:** Add user authentication
**Phase:** 2/3 - Add login endpoint
**Progress:** 1 of 3 phases complete
**Started:** 2 hours ago
**Paused:** 30 minutes ago

### Phase Details (from plan file)
- Phase 1: Setup auth middleware - completed
- Phase 2: Add login endpoint - paused
- Phase 3: Add session handling - pending

---
**Next:** Resume with `/tiki:resume`
```

## Failed State Display

When state has status "failed":

```text
## Tiki State

**Status:** failed

### Active Issue
**Issue #34:** Add user authentication
**Phase:** 2/3 - Add login endpoint
**Progress:** 1 of 3 phases complete
**Error:** Test verification failed: login endpoint returns 500

### Phase Details (from plan file)
- Phase 1: Setup auth middleware - completed
- Phase 2: Add login endpoint - failed
- Phase 3: Add session handling - pending

---
**Next:** Fix with `/tiki:heal` or retry with `/tiki:redo-phase 2`
```

## Idle State Display

When no active issue:

```text
## Tiki State

**Status:** idle

### Active Issue
No active execution.

### Planned Issues
| Issue | Title | Phases | Status |
|-------|-------|--------|--------|
| #35 | Fix login redirect | 1 | planned |
| #36 | Update docs | 2 | planned |

### Queue
Empty

### Recent
**Last Completed:** Issue #34 at 2026-01-10T14:00:00Z

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

`.tiki/state/current.json` structure:

```json
{
  "status": "executing",
  "activeIssue": 34,
  "activeIssueTitle": "Add user authentication",
  "currentPhase": 2,
  "totalPhases": 3,
  "startedAt": "2026-01-10T10:00:00Z",
  "lastActivity": "2026-01-10T11:30:00Z",
  "errorMessage": null,
  "lastCompletedIssue": 32,
  "lastCompletedAt": "2026-01-09T14:00:00Z"
}
```

**Phase details are derived from plan file:** `.tiki/plans/issue-34.json`
- Each phase has: number, title, status (pending, in_progress, completed, failed, skipped)
- Progress is calculated by counting completed phases
- Current phase title is looked up by currentPhase number
