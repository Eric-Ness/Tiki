# Manual Hook Trigger Context

This prompt provides context auto-population logic for `/tiki:hook-run`.

## Auto-Population from Tiki State

When `.tiki/state/current.json` exists, extract:

```javascript
// From state file
TIKI_ISSUE_NUMBER = state.activeIssue
TIKI_PHASE_NUMBER = state.currentPhase

// From plan file (.tiki/plans/issue-N.json)
TIKI_ISSUE_TITLE = plan.issue.title
TIKI_TOTAL_PHASES = plan.phases.length
TIKI_PHASES_COMPLETED = plan.phases.filter(p => p.status === "completed").length
```

## Suggested Environment Variables by Hook

When no state exists, suggest these variables based on hook type:

| Hook | Suggested Variables |
|------|---------------------|
| pre-ship | `TIKI_ISSUE_NUMBER`, `TIKI_ISSUE_TITLE` |
| post-ship | `TIKI_ISSUE_NUMBER`, `TIKI_ISSUE_TITLE`, `TIKI_COMMIT_SHA` |
| pre-execute | `TIKI_ISSUE_NUMBER`, `TIKI_ISSUE_TITLE`, `TIKI_TOTAL_PHASES` |
| post-execute | `TIKI_ISSUE_NUMBER`, `TIKI_ISSUE_TITLE`, `TIKI_PHASES_COMPLETED` |
| pre-commit | `TIKI_ISSUE_NUMBER`, `TIKI_PHASE_NUMBER`, `TIKI_COMMIT_MESSAGE` |
| post-commit | `TIKI_ISSUE_NUMBER`, `TIKI_PHASE_NUMBER`, `TIKI_COMMIT_SHA` |
| phase-start | `TIKI_ISSUE_NUMBER`, `TIKI_PHASE_NUMBER`, `TIKI_PHASE_TITLE` |
| phase-complete | `TIKI_ISSUE_NUMBER`, `TIKI_PHASE_NUMBER`, `TIKI_PHASE_TITLE`, `TIKI_PHASE_STATUS` |

## Override Behavior

User-provided `--env` values always take precedence:

1. Start with auto-populated values (if state exists)
2. Merge user-provided `--env KEY=VALUE` pairs
3. User values override auto-populated values with same key

## Example Output

When suggesting variables for a hook without state:

```
No Tiki state found. For testing this hook, consider providing:

  /tiki:hook-run pre-ship --env TIKI_ISSUE_NUMBER=42 --env TIKI_ISSUE_TITLE="Fix login bug"

Common variables for pre-ship:
  TIKI_ISSUE_NUMBER - GitHub issue number
  TIKI_ISSUE_TITLE  - Issue title (sanitized)
```
