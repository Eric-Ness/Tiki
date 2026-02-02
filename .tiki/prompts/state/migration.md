# State Migration: v2 to Simplified

This prompt provides guidance for migrating state files from v2 (multi-execution) to the simplified format (single-issue tracking).

## Version Detection

Check the state file to determine if migration is needed:

```javascript
function needsMigration(state) {
  // v2 state: has version field or activeExecutions array
  if (state.version === 2 || Array.isArray(state.activeExecutions)) {
    return true;
  }

  // Already simplified or empty: no migration needed
  return false;
}
```

**v2 Indicators (needs migration):**
- `version: 2` present
- Has `activeExecutions` array
- Has `executionHistory` array

**Simplified/Empty Indicators (no migration needed):**
- No `version` field present
- No `activeExecutions` array
- Has only the 10 simplified fields

## Fresh State

For empty or missing state files, create this fresh state:

```json
{
  "status": "idle",
  "activeIssue": null,
  "activeIssueTitle": null,
  "startedAt": null,
  "lastActivity": null,
  "lastCompletedIssue": null,
  "lastCompletedAt": null,
  "errorMessage": null,
  "currentPhase": null,
  "totalPhases": null
}
```

## Migration Steps

When a v2 state is detected, perform these migration steps:

### Step 1: Extract Active Issue

Get the active issue from either the top-level field or the first active execution:

```javascript
function extractActiveIssue(v2State) {
  // Try top-level field first (for backward compatibility)
  if (v2State.activeIssue) {
    return {
      issue: v2State.activeIssue,
      title: v2State.issue?.title || null
    };
  }

  // Fall back to first active execution
  const firstExec = v2State.activeExecutions?.[0];
  if (firstExec) {
    return {
      issue: firstExec.issue,
      title: firstExec.issueTitle || null
    };
  }

  return { issue: null, title: null };
}
```

### Step 2: Extract Status

Get the execution status from the top-level field:

```javascript
function extractStatus(v2State) {
  // Top-level status was always the aggregate status
  return v2State.status || 'idle';
}
```

### Step 3: Derive Phase Information from Plan

Get `currentPhase` and `totalPhases` from the plan file:

```javascript
async function derivePhaseInfo(activeIssue) {
  if (!activeIssue) {
    return { currentPhase: null, totalPhases: null };
  }

  const planPath = `.tiki/plans/issue-${activeIssue}.json`;
  const plan = await readJSON(planPath);

  if (!plan) {
    return { currentPhase: null, totalPhases: null };
  }

  const totalPhases = plan.phases?.length || null;

  // Find current phase: first incomplete phase or last phase
  const completedPhases = plan.phases?.filter(p => p.status === 'completed') || [];
  const currentPhase = completedPhases.length < totalPhases
    ? completedPhases.length + 1
    : totalPhases;

  return { currentPhase, totalPhases };
}
```

### Step 4: Build Simplified State

Construct the simplified state object:

```javascript
async function migrateToSimplified(v2State) {
  const now = new Date().toISOString();
  const { issue, title } = extractActiveIssue(v2State);
  const status = extractStatus(v2State);
  const { currentPhase, totalPhases } = await derivePhaseInfo(issue);

  return {
    status: status,
    activeIssue: issue,
    activeIssueTitle: title,
    startedAt: v2State.startedAt || null,
    lastActivity: now,
    lastCompletedIssue: v2State.lastCompletedIssue || null,
    lastCompletedAt: v2State.lastCompletedAt || null,
    errorMessage: v2State.errorMessage || null,
    currentPhase: currentPhase,
    totalPhases: totalPhases
  };
}
```

## Complete Migration Example

**Before (v2 state):**
```json
{
  "version": 2,
  "activeExecutions": [
    {
      "id": "exec-45-a1b2c3d4",
      "issue": 45,
      "issueTitle": "Add user authentication",
      "currentPhase": 2,
      "totalPhases": 5,
      "status": "executing",
      "startedAt": "2026-01-30T10:00:00.000Z",
      "completedPhases": [
        { "number": 1, "title": "Setup", "completedAt": "..." }
      ],
      "planFile": ".tiki/plans/issue-45.json"
    }
  ],
  "executionHistory": [
    {
      "id": "exec-44-b2c3d4e5",
      "issue": 44,
      "status": "completed",
      "endedAt": "2026-01-29T15:00:00.000Z"
    }
  ],
  "lastActivity": "2026-01-30T12:00:00.000Z",
  "activeIssue": 45,
  "currentPhase": 2,
  "status": "executing",
  "lastCompletedIssue": 44,
  "lastCompletedAt": "2026-01-29T15:00:00.000Z"
}
```

**After (simplified state):**
```json
{
  "status": "executing",
  "activeIssue": 45,
  "activeIssueTitle": "Add user authentication",
  "startedAt": "2026-01-30T10:00:00.000Z",
  "lastActivity": "2026-01-30T12:00:00.000Z",
  "lastCompletedIssue": 44,
  "lastCompletedAt": "2026-01-29T15:00:00.000Z",
  "errorMessage": null,
  "currentPhase": 2,
  "totalPhases": 5
}
```

## Fields Discarded During Migration

The following v2 fields are intentionally discarded:

| Field | Reason |
|-------|--------|
| `version` | Simplified format has no version field |
| `activeExecutions` | Single-issue model; phase progress in plan files |
| `executionHistory` | Git commit history provides sufficient history |
| `completedPhases` | Phase status tracked in plan files |
| `execution.id` | Execution IDs no longer needed |
| `pausedAt`, `pauseReason` | Status field is sufficient |
| `failedPhase` | Covered by currentPhase + status |
| `autoFixAttempt`, `autoFixMaxAttempts` | Transient execution state |
| `activeHook`, `activeSubtasks` | Transient execution state |
| `isStale`, `staledAt` | Simplified model has no stale detection |
| `planFile` | Derived from activeIssue |
| `issue` object | Replaced by activeIssue + activeIssueTitle |

## Auto-Migration Trigger Points

Migration should be triggered automatically at these points:

### 1. State Read Operations

Any command that reads state should check for v2 format:

```javascript
async function readState() {
  const stateFile = '.tiki/state/current.json';

  // Handle missing file
  if (!fileExists(stateFile)) {
    return createFreshState();
  }

  let state = await readJSON(stateFile);

  // Handle empty file
  if (!state || Object.keys(state).length === 0) {
    return createFreshState();
  }

  // Check if migration needed
  if (needsMigration(state)) {
    state = await migrateToSimplified(state);
    await writeJSON(stateFile, state);
    console.log('Migrated state from v2 to simplified format');
  }

  return state;
}

function createFreshState() {
  return {
    status: 'idle',
    activeIssue: null,
    activeIssueTitle: null,
    startedAt: null,
    lastActivity: null,
    lastCompletedIssue: null,
    lastCompletedAt: null,
    errorMessage: null,
    currentPhase: null,
    totalPhases: null
  };
}
```

### 2. Command Entry Points

Commands that trigger auto-migration:
- `execute.md` - Before starting or resuming execution
- `pause.md` - Before pausing
- `resume.md` - Before resuming execution
- `state.md` - When displaying state
- `ship.md` - Before completing issue
- `heal.md` - Before attempting auto-fix

## Edge Cases

### 1. Multiple Active Executions in v2

If v2 state has multiple active executions:
- Migrate the first active execution only
- Log warning about discarded executions
- User should complete or cancel other executions before migration

### 2. Corrupted v2 State

If v2 state is partially corrupted:
- Extract what fields are valid
- Fall back to fresh state for missing required fields
- Log warning about corruption

### 3. Idle v2 State

For idle v2 states (no active execution):

```json
// v2 idle state
{
  "version": 2,
  "activeExecutions": [],
  "executionHistory": [...],
  "status": "idle",
  "lastCompletedIssue": 44,
  "lastCompletedAt": "2026-01-29T15:00:00.000Z"
}

// Migrates to simplified
{
  "status": "idle",
  "activeIssue": null,
  "activeIssueTitle": null,
  "startedAt": null,
  "lastActivity": "2026-01-30T12:00:00.000Z",
  "lastCompletedIssue": 44,
  "lastCompletedAt": "2026-01-29T15:00:00.000Z",
  "errorMessage": null,
  "currentPhase": null,
  "totalPhases": null
}
```

### 4. Plan File Missing

If the plan file for the active issue is missing:
- Set `currentPhase` and `totalPhases` to null
- Log warning about missing plan
- State is still valid; plan should be created via `/tiki:plan-issue`

## Tiki.Desktop Compatibility

The simplified format maintains `currentPhase` and `totalPhases` fields specifically for Tiki.Desktop compatibility. These are derived from the plan file during:
- State read operations
- Phase completion
- Status display

Desktop clients can read these fields to display progress without parsing plan files.
