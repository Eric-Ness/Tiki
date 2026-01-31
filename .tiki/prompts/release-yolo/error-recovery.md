# Error Recovery

Load this prompt when all automatic recovery attempts have failed.

## Recovery Options

Present to user:

```text
### Recovery Options

1. **Manual fix** - Pause YOLO, fix manually, then `/tiki:release-yolo {version} --continue`
2. **Skip issue** - Mark as failed and continue with remaining issues
3. **Abort YOLO** - Stop execution entirely

Enter choice:
```

Use AskUserQuestion for recovery choice.

## Option 1: Manual Fix

Update the release execution in main state:

```javascript
// Read main state
const state = JSON.parse(fs.readFileSync('.tiki/state/current.json'));

// Find and update release execution
const releaseExec = state.activeExecutions.find(e => e.type === "release");
releaseExec.status = "paused";
releaseExec.pauseReason = "manual_intervention";
releaseExec.lastActivity = new Date().toISOString();

// Write updated state
fs.writeFileSync('.tiki/state/current.json', JSON.stringify(state, null, 2));
```

Display resume instructions:

```text
## YOLO Paused

State saved. After fixing the issue manually:
  /tiki:release-yolo {version} --continue

Current position:
- Issue: #{number} - {title}
- Execution ID: {releaseExec.id}
```

Exit execution.

## Option 2: Skip Issue

Update the release execution in main state:

```javascript
// Read main state
const state = JSON.parse(fs.readFileSync('.tiki/state/current.json'));

// Find and update release execution
const releaseExec = state.activeExecutions.find(e => e.type === "release");
releaseExec.failedIssues.push({
  number: issue.number,
  error: errorMessage,
  skippedAt: new Date().toISOString()
});
releaseExec.currentIssue = null;
releaseExec.lastActivity = new Date().toISOString();

// Write updated state
fs.writeFileSync('.tiki/state/current.json', JSON.stringify(state, null, 2));
```

Display:

```text
Issue #{number} marked as failed. Continuing with remaining issues...
```

## Option 3: Abort

Update and move release execution to history:

```javascript
// Read main state
const state = JSON.parse(fs.readFileSync('.tiki/state/current.json'));

// Find and update release execution
const releaseExec = state.activeExecutions.find(e => e.type === "release");
releaseExec.status = "failed";
releaseExec.failedAt = new Date().toISOString();

// Move from activeExecutions to executionHistory
state.activeExecutions = state.activeExecutions.filter(e => e.type !== "release");
state.executionHistory.push(releaseExec);

// Write updated state
fs.writeFileSync('.tiki/state/current.json', JSON.stringify(state, null, 2));
```

Display summary and exit:

```text
## YOLO Aborted

Execution aborted. {releaseExec.completedIssues.length}/{releaseExec.issueOrder.length} issues completed.

Completed issues:
{List releaseExec.completedIssues}

To retry:
  /tiki:release-yolo {version} --from {failedIssueNumber}
```

## Edge Cases

### State File Corrupted

```text
## Main State Corrupted

Options:
1. **Start fresh** - Reset state and start new YOLO
2. **Restore** - Attempt to reconstruct state from release file
3. **Cancel** - Exit without changes
```

### Concurrent Release Execution

```text
## Release Execution Already Running

A release execution is already in progress for release {version}.
Execution ID: {releaseExec.id}

Options:
1. **Continue existing** - Resume the in-progress execution
2. **Restart** - Move current to history and start fresh
3. **Cancel** - Exit without changes
```
