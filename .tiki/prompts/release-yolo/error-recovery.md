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

Update `.tiki/state/yolo.json`:

1. Read current yolo.json
2. Set `status` to `"paused"`
3. Set `lastActivity` to current ISO timestamp
4. Add entry to `errorHistory` array:
   - `issue`: current issue number
   - `error`: the error message
   - `timestamp`: current ISO timestamp
   - `resolved`: `false` (will be updated when resumed)

Display resume instructions:

```text
## YOLO Paused

State saved. After fixing the issue manually:
  /tiki:release-yolo {version} --continue

Current position:
- Issue: #{number} - {title}
- Release: {version}
```

Exit execution.

## Option 2: Skip Issue

Update `.tiki/state/yolo.json`:

1. Read current yolo.json
2. Add entry to `errorHistory` array:
   - `issue`: current issue number
   - `error`: the error message
   - `timestamp`: current ISO timestamp
   - `resolved`: `false`
3. Add issue number to `failedIssues` array
4. Set `currentIssue` to `null`
5. Set `lastActivity` to current ISO timestamp

Display:

```text
Issue #{number} marked as failed. Continuing with remaining issues...
```

## Option 3: Abort

Update `.tiki/state/yolo.json`:

1. Read current yolo.json
2. Set `status` to `"failed"`
3. Set `lastActivity` to current ISO timestamp
4. Add entry to `errorHistory` array:
   - `issue`: current issue number
   - `error`: "Aborted by user"
   - `timestamp`: current ISO timestamp
   - `resolved`: `false`

Display summary and exit:

```text
## YOLO Aborted

Execution aborted. {completedIssues.length}/{issueOrder.length} issues completed.

Completed issues:
{List completedIssues from yolo.json}

To retry:
  /tiki:release-yolo {version} --from {failedIssueNumber}
```

## Edge Cases

### State File Corrupted

```text
## YOLO State Corrupted

The yolo.json file is missing or corrupted.

Options:
1. **Start fresh** - Reset state and start new YOLO
2. **Restore** - Attempt to reconstruct state from release file
3. **Cancel** - Exit without changes
```

### Concurrent Release Execution

```text
## Release Execution Already Running

A release execution is already in progress for release {version}.
Status: {status from yolo.json}
Current issue: #{currentIssue}

Options:
1. **Continue existing** - Resume the in-progress execution
2. **Restart** - Reset yolo.json and start fresh
3. **Cancel** - Exit without changes
```
