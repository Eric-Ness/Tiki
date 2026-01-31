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
