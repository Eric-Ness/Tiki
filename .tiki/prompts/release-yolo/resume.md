# Resume YOLO Execution

Load this prompt when --continue flag is provided.

## Load Saved State

Read main state at `.tiki/state/current.json` and find release execution:

```javascript
// Read state
const state = JSON.parse(fs.readFileSync('.tiki/state/current.json'));

// Find release execution in activeExecutions
const releaseExec = state.activeExecutions?.find(e => e.type === "release");

if (!releaseExec) {
  // No active release execution
  console.log("NO_RELEASE_EXECUTION");
}
```

### If No Active Release Execution

```text
## No YOLO State Found

No paused YOLO execution to continue.

To start a new YOLO execution:
  /tiki:release-yolo <version>

To see available releases:
  /tiki:release-status
```

Exit execution.

### If Release Execution Exists

Extract from execution object:
- Release version (`releaseExec.release`)
- Current position (`releaseExec.currentIssue`)
- Completed issues (`releaseExec.completedIssues`)
- Failed issues (`releaseExec.failedIssues`)
- Issue order (`releaseExec.issueOrder`)
- Flags from original invocation (`releaseExec.flags`)

Override with any new flags provided (e.g., `--skip-verify` can be added on continue).

## Display Resume Information

```text
## Resuming YOLO Execution

Release: {releaseExec.release}
Execution ID: {releaseExec.id}
Started: {releaseExec.startedAt}
Last Activity: {releaseExec.lastActivity}
Progress: {releaseExec.completedIssues.length}/{releaseExec.issueOrder.length} issues complete

### Completed Issues
{For each in releaseExec.completedIssues:}
- #{number}: {title}

### Failed Issues
{For each in releaseExec.failedIssues:}
- #{number}: {title} - {error}

### Resuming From
Issue #{releaseExec.currentIssue}: {title}

Continue? [Y/n]
```

Use AskUserQuestion to confirm.

## State Mismatch Handling

If an issue in saved state was removed from release:

```text
## State Mismatch

Issue #{number} in saved state is no longer in release {version}.

Options:
1. **Continue** - Skip missing issue and continue
2. **Cancel** - Exit and investigate

Enter choice:
```

## Resume Position

After confirmation, skip to the issue processing loop at the saved position:
- Set issueIndex to the position of currentIssue in issueOrder
- If currentPhase is set, resume from that phase via `--from` flag

## Verification Pause Resume

If paused during verification (pauseReason === 'verification_pending'):

```text
## Resuming Verification

{autoVerifiedCount} requirements auto-verified.
{pendingManualCount} requirements pending manual verification.

Continue with manual verification? [Y/n]
```

Resume verification flow from saved position.
