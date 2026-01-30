# Hook Execution Workflow

This prompt is loaded by commands that run lifecycle hooks.

## Available Hooks

| Hook Name | Trigger Point | Environment Variables |
|-----------|---------------|----------------------|
| pre-ship | Before /tiki:ship commits | ISSUE_NUMBER, ISSUE_TITLE |
| post-ship | After successful ship | ISSUE_NUMBER, ISSUE_TITLE, COMMIT_SHA |
| pre-execute | Before /tiki:execute starts | ISSUE_NUMBER, ISSUE_TITLE, TOTAL_PHASES |
| post-execute | After all phases complete | ISSUE_NUMBER, ISSUE_TITLE, PHASES_COMPLETED |
| pre-commit | Before /tiki:commit | ISSUE_NUMBER, ISSUE_TITLE, PHASE_NUMBER |
| post-commit | After /tiki:commit | ISSUE_NUMBER, ISSUE_TITLE, PHASE_NUMBER, COMMIT_SHA |
| phase-start | Before each phase | ISSUE_NUMBER, ISSUE_TITLE, PHASE_NUMBER |
| phase-complete | After each phase | ISSUE_NUMBER, ISSUE_TITLE, PHASE_NUMBER, PHASE_STATUS |

## Execution Steps

### 1. Check if hooks enabled

- Read `.tiki/config.json`
- If `extensions.lifecycleScripts.enabled` is false, skip silently
- Get directory from config (default: `.tiki/hooks`)
- Get timeout from config (default: 30000ms)
- Get verbose setting from config (default: false)

### 2. Locate hook file

- Check for `<directory>/<hook-name>` (Unix-style, no extension)
- On Windows: also check `<hook-name>.sh` and `<hook-name>.ps1`
- If not found, skip silently (hooks are optional)

### 3. Sanitize environment variables

Before passing values to the shell, sanitize all environment variable values:

- Escape shell metacharacters: `$ \` \\ " ' ; | & < > ( ) { } [ ] ! # ~`
- Replace newlines with spaces
- Truncate values exceeding 1000 characters

Example sanitization:
```
Original: "Fix bug with $variable and 'quotes'"
Sanitized: "Fix bug with \$variable and \'quotes\'"
```

### 4. Execute hook

Set environment variables as applicable for the hook type:
- `ISSUE_NUMBER` - GitHub issue number
- `ISSUE_TITLE` - Issue title (sanitized)
- `PHASE_NUMBER` - Current phase number
- `TOTAL_PHASES` - Total number of phases
- `PHASES_COMPLETED` - Count of completed phases
- `PHASE_STATUS` - Status of completed phase (success/failed)
- `COMMIT_SHA` - Git commit SHA

Run the hook with the configured timeout. Capture both stdout and stderr.

### 5. Handle result

**Exit code 0 (Success):**
- If verbose=true in config, display stdout
- Continue with parent operation

**Exit code non-zero (Failure):**
- ABORT the parent operation
- Display error information (see format below)

**Timeout exceeded:**
- ABORT the parent operation
- Report timeout error

## Output Format

On failure, display:

```
Hook failed: <hook-name>
Exit code: <code>
Output:
<stderr or stdout>

Aborted: <parent operation> not completed.
Fix the hook issue and retry, or disable hooks in .tiki/config.json
```

On timeout, display:

```
Hook timed out: <hook-name>
Timeout: <timeout>ms exceeded

Aborted: <parent operation> not completed.
Increase timeout in .tiki/config.json or optimize the hook script.
```

## Cross-Platform Notes

On Windows systems, load `.tiki/prompts/hooks/windows-support.md` for shell detection and execution details.
