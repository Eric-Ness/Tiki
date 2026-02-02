# Execute Stage

Load this prompt when executing issue phases.

## Execution Flow

### Start Execution

```text
### Executing Issue #{number}

Executing {phaseCount} phases...
```

### TDD Mode Check

Read TDD configuration:

```bash
cat .tiki/config.json 2>/dev/null | jq -r '.testing.createTests // "ask"'
```

### CRITICAL: Skill Tool Invocation Required

**YOU MUST USE THE SKILL TOOL TO INVOKE /tiki:execute**

Do NOT:
- Manually explore the codebase and make changes
- Spawn a Task sub-agent to do the work directly
- Skip the Skill tool invocation

The /tiki:execute command handles:
- Phase-by-phase execution via sub-agents
- Updates `currentPhase` in `.tiki/state/current.json` as phases progress
- Individual issue state tracking

**If you skip the Skill tool invocation:**
- The state file will remain empty
- The user will see no progress in their Tiki.Desktop State window
- The release execution will show 0 completed phases

This is the single most common cause of broken state tracking.

### Invoke Execute

```text
Skill tool invocation:
- skill: "tiki:execute"
- args: "{number}"
```

The execute command handles:
1. Phase-by-phase execution via sub-agents
2. TDD workflow if enabled
3. Auto-fix attempts on failures
4. State tracking in `.tiki/state/current.json`

### Update yolo.json Activity

After invoking execute, update the release YOLO state:

```bash
# Update lastActivity timestamp in yolo.json
cat .tiki/state/yolo.json | jq '.lastActivity = "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"' > .tiki/state/yolo.json.tmp && mv .tiki/state/yolo.json.tmp .tiki/state/yolo.json
```

### Phase Progress Display

```text
Executing phase {n}/{total}: {phaseTitle}...
Phase {n} complete.
```

## Failure Handling

If a phase fails after auto-fix attempts:

### 4-Attempt Escalation Pattern

1. **Attempt 1**: Direct fix (pattern-matched inline fix)
2. **Attempt 2**: Contextual analysis (diagnostic sub-agent with file context)
3. **Attempt 3**: Approach review (full issue context)
4. **Attempt 4**: Invoke `/tiki:heal` for comprehensive diagnostic

```text
Skill tool invocation:
- skill: "tiki:heal"
- args: "{number}"
```

### All Attempts Exhausted

If heal also fails, load error-recovery.md for user options:

```text
### All Recovery Attempts Exhausted

Issue #{number} could not be automatically fixed after 4 attempts.

Load .tiki/prompts/release-yolo/error-recovery.md for user recovery options.
```

## After Execution Completes

After all phases complete successfully:

- No state update needed here - execute.md handles its own state in `.tiki/state/current.json`
- The issue is now ready for the ship stage

### State Validation (After Execute Returns)

**CRITICAL**: After the Skill tool invocation of `/tiki:execute` returns, validate that execution completed successfully.

#### Validation Steps

1. **Read the plan file**:
   ```bash
   cat .tiki/plans/issue-{number}.json 2>/dev/null | jq '.phases'
   ```

2. **Check for completion evidence**:
   - All phases should have `status: "completed"`
   - If any phase has `status: "failed"`, execution did not complete

3. **Check current state**:
   ```bash
   cat .tiki/state/current.json 2>/dev/null | jq '.status, .activeIssue'
   ```
   - Status should NOT be "failed"
   - If `activeIssue` still matches, check if all phases are done

#### Validation Failure Handling

If validation fails (phases not completed or execution failed):

```text
### State Validation Warning

Execute did not complete successfully for issue #{number}.

This typically happens when:
- The Skill tool invocation was skipped
- A Task sub-agent executed directly instead of using /tiki:execute
- The execute command encountered an unrecoverable error

**Recovery Options:**

1. **Retry** - Invoke /tiki:execute again using Skill tool
2. **Skip Issue** - Mark issue as skipped and continue with next
3. **Abort** - Stop YOLO execution for manual intervention

Which option? [1/2/3]:
```

If user selects:
- **1 (Retry)**: Re-invoke `/tiki:execute {number}` using Skill tool, then re-validate
- **2 (Skip)**: Add issue to `skippedIssues` in yolo.json, proceed to next issue
- **3 (Abort)**: Update yolo.json status to "paused", stop execution
