# Resume YOLO Execution

Load this prompt when --continue flag is provided.

## Load Saved State

Check for yolo.json state file:

1. Read `.tiki/state/yolo.json` if it exists
2. Check if `status` is 'paused' or 'in_progress'
3. If file doesn't exist or status is 'idle' or 'completed', show no state message

### If No Active Release Execution

Show if yolo.json doesn't exist, or status is 'idle' or 'completed':

```text
## No YOLO State Found

No paused or in-progress YOLO execution to continue.

To start a new YOLO execution:
  /tiki:release-yolo <version>

To see available releases:
  /tiki:release-status
```

Exit execution.

### If Release Execution Exists

Extract from yolo.json:
- Release version (`release`)
- Current issue (`currentIssue`)
- Completed issues (`completedIssues`)
- Skipped issues (`skippedIssues`)
- Failed issues (`failedIssues`)
- Issue order (`issueOrder`)
- Flags from original invocation (`flags`)
- Error history (`errorHistory`)

Override with any new flags provided (e.g., `--skip-verify` can be added on continue).

## Display Resume Information

```text
## Resuming YOLO Execution

Release: {release}
Started: {startedAt}
Last Activity: {lastActivity}
Progress: {completedIssues.length}/{issueOrder.length} issues complete

### Completed Issues
{For each in completedIssues:}
- #{number}: {title}

### Skipped Issues
{For each in skippedIssues:}
- #{number}: {title}

### Failed Issues
{For each in failedIssues:}
- #{number}: {title}

### Recent Errors
{For each in errorHistory (last 3):}
- Issue #{issue}: {error} (resolved: {resolved})

### Resuming From
Issue #{currentIssue}: {title}

Continue? [Y/n]
```

Use AskUserQuestion to confirm.

## State Mismatch Handling

If an issue in saved state was removed from release:

```text
## State Mismatch

Issue #{number} in saved state is no longer in release {release}.

Options:
1. **Continue** - Skip missing issue and continue
2. **Cancel** - Exit and investigate

Enter choice:
```

## Version Mismatch Handling

If `--continue <version>` is provided and doesn't match yolo.json release:

```text
## Version Mismatch

Requested to continue release {requested_version} but yolo.json has release {yolo_release}.

Options:
1. **Continue saved** - Continue the existing {yolo_release} execution
2. **Start fresh** - Abandon saved state and start new {requested_version} execution
3. **Cancel** - Exit and investigate

Enter choice:
```

## Resume Position

After confirmation, skip to the issue processing loop at the saved position:
- Find `currentIssue` position in `issueOrder`
- Set issueIndex to that position
- If currentPhase is available from current.json, resume from that phase via `--from` flag

## Verification Pause Resume

If status is 'paused' and last error indicates verification pending:

```text
## Resuming Verification

{autoVerifiedCount} requirements auto-verified.
{pendingManualCount} requirements pending manual verification.

Continue with manual verification? [Y/n]
```

Resume verification flow from saved position.
