# State Migration: v1 to v2

This prompt provides guidance for migrating state files from v1 (legacy single-execution) to v2 (multi-execution support).

## Version Detection

Check the state file to determine its version:

```javascript
function detectStateVersion(state) {
  // No version field or version: 1 = v1 state
  if (!state.version || state.version === 1) {
    return 1;
  }
  // Explicit version: 2 = v2 state
  if (state.version === 2) {
    return 2;
  }
  // Unknown version - treat as v1 for safety
  return 1;
}
```

**v1 Indicators:**
- No `version` field present
- `version: 1` explicitly set
- Has `activeIssue` but no `activeExecutions` array
- Root-level execution fields without nesting

**v2 Indicators:**
- `version: 2` present
- Has `activeExecutions` array
- Has `executionHistory` array (even if empty)

## Migration Steps

When a v1 state is detected, perform these migration steps:

### Step 1: Extract Existing Execution Data

Collect all execution-related fields from the v1 state:

```javascript
const v1Fields = {
  issue: state.activeIssue,
  currentPhase: state.currentPhase,
  status: state.status,
  startedAt: state.startedAt,
  pausedAt: state.pausedAt,
  pauseReason: state.pauseReason,
  completedPhases: state.completedPhases || [],
  failedPhase: state.failedPhase,
  errorMessage: state.errorMessage,
  autoFixAttempt: state.autoFixAttempt,
  autoFixMaxAttempts: state.autoFixMaxAttempts,
  activeHook: state.activeHook,
  activeSubtasks: state.activeSubtasks || [],
  planFile: state.planFile,
  totalPhases: state.totalPhases,
  issueTitle: state.issue?.title
};
```

### Step 2: Generate Execution ID

Create a unique execution ID from the issue number:

```javascript
function generateMigrationId(issueNumber) {
  // Format: exec-{issue}-migrated
  return `exec-${issueNumber}-migrated`;
}
```

### Step 3: Create Execution Object

Wrap the v1 fields into a proper execution object:

```javascript
function createExecutionFromV1(v1Fields) {
  const now = new Date().toISOString();

  // Map v1 status to v2 execution status
  // v1 "idle" means no active execution, so we won't create one
  // v1 "executing"/"paused"/"failed" maps directly
  const executionStatus = v1Fields.status === 'idle' ? null : v1Fields.status;

  if (!executionStatus || !v1Fields.issue) {
    return null; // No active execution to migrate
  }

  // Normalize completedPhases to v2 object format
  const normalizedPhases = v1Fields.completedPhases.map(phase => {
    if (typeof phase === 'number') {
      return { number: phase };
    }
    return phase; // Already an object
  });

  return {
    id: generateMigrationId(v1Fields.issue),
    issue: v1Fields.issue,
    issueTitle: v1Fields.issueTitle || null,
    currentPhase: v1Fields.currentPhase,
    totalPhases: v1Fields.totalPhases,
    status: executionStatus,
    startedAt: v1Fields.startedAt || now,
    pausedAt: v1Fields.pausedAt || null,
    pauseReason: v1Fields.pauseReason || null,
    completedPhases: normalizedPhases,
    failedPhase: v1Fields.failedPhase || null,
    errorMessage: v1Fields.errorMessage || null,
    autoFixAttempt: v1Fields.autoFixAttempt || null,
    autoFixMaxAttempts: v1Fields.autoFixMaxAttempts || null,
    activeHook: v1Fields.activeHook || null,
    activeSubtasks: v1Fields.activeSubtasks || [],
    lastActivity: now,
    isStale: false,
    staledAt: null,
    planFile: v1Fields.planFile || null,
    migratedAt: now  // Track when migration occurred
  };
}
```

### Step 4: Build v2 State

Construct the complete v2 state object:

```javascript
function migrateToV2(v1State) {
  const now = new Date().toISOString();
  const execution = createExecutionFromV1(extractV1Fields(v1State));

  const v2State = {
    // Version marker
    version: 2,

    // New v2 structures
    activeExecutions: execution ? [execution] : [],
    executionHistory: [],
    lastActivity: now,

    // Preserved v1 fields for backward compatibility
    activeIssue: v1State.activeIssue || null,
    currentPhase: v1State.currentPhase || null,
    status: v1State.status || 'idle',
    startedAt: v1State.startedAt || null,
    pausedAt: v1State.pausedAt || null,
    pauseReason: v1State.pauseReason || null,
    completedPhases: v1State.completedPhases || [],
    failedPhase: v1State.failedPhase || null,
    errorMessage: v1State.errorMessage || null,
    autoFixAttempt: v1State.autoFixAttempt || null,
    autoFixMaxAttempts: v1State.autoFixMaxAttempts || null,
    activeHook: v1State.activeHook || null,
    activeSubtasks: v1State.activeSubtasks || [],
    issue: v1State.issue || null,
    planFile: v1State.planFile || null,
    totalPhases: v1State.totalPhases || null,

    // Preserved non-execution fields
    lastCompletedIssue: v1State.lastCompletedIssue || null,
    lastCompletedAt: v1State.lastCompletedAt || null
  };

  return v2State;
}
```

## Complete Migration Example

**Before (v1 state):**
```json
{
  "activeIssue": 45,
  "currentPhase": 2,
  "status": "executing",
  "startedAt": "2026-01-30T10:00:00.000Z",
  "completedPhases": [1],
  "totalPhases": 5,
  "issue": {
    "number": 45,
    "title": "Add user authentication"
  },
  "planFile": ".tiki/plans/issue-45.json"
}
```

**After (v2 state):**
```json
{
  "version": 2,
  "activeExecutions": [
    {
      "id": "exec-45-migrated",
      "issue": 45,
      "issueTitle": "Add user authentication",
      "currentPhase": 2,
      "totalPhases": 5,
      "status": "executing",
      "startedAt": "2026-01-30T10:00:00.000Z",
      "pausedAt": null,
      "pauseReason": null,
      "completedPhases": [
        { "number": 1 }
      ],
      "failedPhase": null,
      "errorMessage": null,
      "autoFixAttempt": null,
      "autoFixMaxAttempts": null,
      "activeHook": null,
      "activeSubtasks": [],
      "lastActivity": "2026-01-30T12:00:00.000Z",
      "isStale": false,
      "staledAt": null,
      "planFile": ".tiki/plans/issue-45.json",
      "migratedAt": "2026-01-30T12:00:00.000Z"
    }
  ],
  "executionHistory": [],
  "lastActivity": "2026-01-30T12:00:00.000Z",

  "activeIssue": 45,
  "currentPhase": 2,
  "status": "executing",
  "startedAt": "2026-01-30T10:00:00.000Z",
  "completedPhases": [1],
  "totalPhases": 5,
  "issue": {
    "number": 45,
    "title": "Add user authentication"
  },
  "planFile": ".tiki/plans/issue-45.json",
  "lastCompletedIssue": null,
  "lastCompletedAt": null
}
```

## Auto-Migration Trigger Points

Migration should be triggered automatically at these points:

### 1. State Read Operations

Any command that reads state should check version:

```javascript
async function readState() {
  const stateFile = '.tiki/state/current.json';
  let state = await readJSON(stateFile);

  // Check if migration needed
  if (detectStateVersion(state) === 1) {
    state = migrateToV2(state);
    await writeJSON(stateFile, state);
    console.log('Migrated state from v1 to v2');
  }

  return state;
}
```

### 2. Command Entry Points

Commands that trigger auto-migration:
- `execute.md` - Before starting or resuming execution
- `pause.md` - Before pausing (ensures v2 structure for context save)
- `resume.md` - Before resuming execution
- `state.md` - When displaying state
- `ship.md` - Before archiving execution to history
- `heal.md` - Before attempting auto-fix

### 3. Idle State Migration

For idle v1 states (no active execution):

```json
// v1 idle state
{
  "status": "idle",
  "lastCompletedIssue": 44,
  "lastCompletedAt": "2026-01-29T15:00:00.000Z"
}

// Migrates to v2
{
  "version": 2,
  "activeExecutions": [],
  "executionHistory": [],
  "lastActivity": "2026-01-30T12:00:00.000Z",
  "status": "idle",
  "activeIssue": null,
  "currentPhase": null,
  "lastCompletedIssue": 44,
  "lastCompletedAt": "2026-01-29T15:00:00.000Z"
}
```

## V1 Compatibility Layer

After any change to `activeExecutions`, deprecated v1 fields must be updated for Tiki.Desktop and other consumers:

### Update Deprecated Fields

```javascript
function syncDeprecatedFields(v2State) {
  // Find the first executing execution (if any)
  const firstExecuting = v2State.activeExecutions.find(
    e => e.status === 'executing'
  );

  // Find any active execution (executing or paused)
  const firstActive = v2State.activeExecutions.find(
    e => e.status === 'executing' || e.status === 'paused'
  ) || v2State.activeExecutions[0];

  // Calculate aggregate status
  const aggregateStatus = calculateAggregateStatus(v2State.activeExecutions);

  // Update deprecated fields
  v2State.activeIssue = firstActive?.issue || null;
  v2State.currentPhase = firstActive?.currentPhase || null;
  v2State.status = aggregateStatus;
  v2State.startedAt = firstActive?.startedAt || null;
  v2State.pausedAt = firstActive?.pausedAt || null;
  v2State.pauseReason = firstActive?.pauseReason || null;
  v2State.completedPhases = firstActive?.completedPhases?.map(p =>
    typeof p === 'object' ? p.number : p
  ) || [];
  v2State.failedPhase = firstActive?.failedPhase || null;
  v2State.errorMessage = firstActive?.errorMessage || null;
  v2State.autoFixAttempt = firstActive?.autoFixAttempt || null;
  v2State.autoFixMaxAttempts = firstActive?.autoFixMaxAttempts || null;
  v2State.activeHook = firstActive?.activeHook || null;
  v2State.activeSubtasks = firstActive?.activeSubtasks || [];
  v2State.planFile = firstActive?.planFile || null;
  v2State.totalPhases = firstActive?.totalPhases || null;
  v2State.issue = firstActive ? {
    number: firstActive.issue,
    title: firstActive.issueTitle
  } : null;

  return v2State;
}

function calculateAggregateStatus(executions) {
  if (executions.length === 0) return 'idle';

  // Priority: failed > paused > executing
  if (executions.some(e => e.status === 'failed')) return 'failed';
  if (executions.some(e => e.status === 'paused')) return 'paused';
  if (executions.some(e => e.status === 'executing')) return 'executing';

  // All completed means we're idle
  return 'idle';
}
```

### When to Sync

Call `syncDeprecatedFields()` after:
- Adding a new execution to `activeExecutions`
- Updating execution status (executing, paused, failed, completed)
- Removing an execution from `activeExecutions`
- Moving an execution to `executionHistory`

## Rollback Instructions

If v2 migration causes issues, you can rollback to v1:

### Manual Rollback

1. Read the v2 state file
2. Extract the first active execution
3. Flatten to v1 format

```javascript
function rollbackToV1(v2State) {
  const execution = v2State.activeExecutions[0];

  return {
    activeIssue: execution?.issue || null,
    currentPhase: execution?.currentPhase || null,
    status: v2State.status || 'idle',
    startedAt: execution?.startedAt || null,
    pausedAt: execution?.pausedAt || null,
    pauseReason: execution?.pauseReason || null,
    completedPhases: execution?.completedPhases?.map(p =>
      typeof p === 'object' ? p.number : p
    ) || [],
    failedPhase: execution?.failedPhase || null,
    errorMessage: execution?.errorMessage || null,
    autoFixAttempt: execution?.autoFixAttempt || null,
    autoFixMaxAttempts: execution?.autoFixMaxAttempts || null,
    activeHook: execution?.activeHook || null,
    activeSubtasks: execution?.activeSubtasks || [],
    planFile: execution?.planFile || null,
    totalPhases: execution?.totalPhases || null,
    issue: execution ? {
      number: execution.issue,
      title: execution.issueTitle
    } : null,
    lastCompletedIssue: v2State.lastCompletedIssue || null,
    lastCompletedAt: v2State.lastCompletedAt || null
  };
}
```

### Rollback Considerations

- Rollback loses multi-execution data (only first execution is preserved)
- Execution history is lost
- Any migrated execution IDs (`exec-N-migrated`) indicate previously migrated data

## Edge Cases

### 1. Corrupted v1 State

If v1 state is partially corrupted:
- Preserve any valid fields
- Set missing required fields to defaults
- Log warning about corrupted state

### 2. Already v2 State

If state is already v2:
- Skip migration
- Optionally validate against schema
- Proceed with normal operations

### 3. Empty State File

If state file is empty or doesn't exist:
- Create fresh v2 state with defaults
- No migration needed

```json
{
  "version": 2,
  "activeExecutions": [],
  "executionHistory": [],
  "lastActivity": null,
  "status": "idle"
}
```

### 4. Multiple Migrated Executions

If user had paused execution and manually edited state:
- Migrate all recognizable executions
- Generate unique IDs for each (`exec-{issue}-migrated-1`, `exec-{issue}-migrated-2`)
- Preserve order
