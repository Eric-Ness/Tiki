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

The /tiki:execute command contains essential state update logic that:
- Creates execution objects in `activeExecutions`
- Updates `currentPhase` as phases progress
- Populates `completedPhases` array
- Syncs deprecated v1 fields for Tiki.Desktop compatibility

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

### Update Release Execution State During Execution

As phases complete, update the release execution in main state:

```javascript
const state = JSON.parse(fs.readFileSync('.tiki/state/current.json'));
const releaseExec = state.activeExecutions.find(e => e.type === "release");
releaseExec.lastActivity = new Date().toISOString();
fs.writeFileSync('.tiki/state/current.json', JSON.stringify(state, null, 2));
// Individual phase tracking is handled by execute.md in main state
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

## State Updates

After all phases complete successfully, update the release execution:

```javascript
const state = JSON.parse(fs.readFileSync('.tiki/state/current.json'));
const releaseExec = state.activeExecutions.find(e => e.type === "release");
releaseExec.lastActivity = new Date().toISOString();
fs.writeFileSync('.tiki/state/current.json', JSON.stringify(state, null, 2));
// Issue execution complete, ready for ship stage
```

### State Validation (After Execute Returns)

**CRITICAL**: After the Skill tool invocation of `/tiki:execute` returns, validate that state was actually updated.

#### Validation Steps

1. **Read current state**:
   ```bash
   cat .tiki/state/current.json 2>/dev/null
   ```

2. **Check for execution evidence**:
   - Look in `activeExecutions` for an execution with matching issue number
   - OR look in `executionHistory` for a completed execution with matching issue number
   - The execution should have `id` format like `exec-{issueNumber}-{uuid}`

3. **Check for progress evidence**:
   - `currentPhase` should be > 0, OR
   - `completedPhases` array should be non-empty

#### Validation Failure Handling

If validation fails (no execution found or no progress recorded):

```text
### ⚠️ State Validation Warning

Execute completed but state file was not updated for issue #{number}.

This typically happens when:
- The Skill tool invocation was skipped
- A Task sub-agent executed directly instead of using /tiki:execute
- The execute command encountered an early error

**Recovery Options:**

1. **Retry** - Invoke /tiki:execute again using Skill tool
2. **Manual Update** - Create execution entry in state manually
3. **Continue Anyway** - Proceed to ship (state will be inconsistent)

Which option? [1/2/3]:
```

If user selects:
- **1 (Retry)**: Re-invoke `/tiki:execute {number}` using Skill tool, then re-validate
- **2 (Manual Update)**: Create minimal execution entry in state with current timestamp
- **3 (Continue)**: Log warning and proceed to ship stage
