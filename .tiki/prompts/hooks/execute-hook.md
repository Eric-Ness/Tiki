# Hook Execution Workflow

This prompt is loaded by commands that run lifecycle hooks.

## Available Hooks

| Hook Name | Trigger Point | Environment Variables |
|-----------|---------------|----------------------|
| pre-ship | Before /tiki:ship commits | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE |
| pre-ship | Before /tiki:release-ship | TIKI_ISSUE_NUMBER, TIKI_RELEASE_VERSION, TIKI_RELEASE_ISSUE_COUNT |
| post-ship | After /tiki:ship succeeds | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE, TIKI_COMMIT_SHA |
| post-ship | After /tiki:release-ship | TIKI_RELEASE_VERSION, TIKI_GIT_TAG |
| pre-execute | Before /tiki:execute starts | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE, TIKI_TOTAL_PHASES |
| post-execute | After all phases complete | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE, TIKI_PHASES_COMPLETED |
| pre-commit | Before /tiki:commit | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE, TIKI_PHASE_NUMBER |
| post-commit | After /tiki:commit | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE, TIKI_PHASE_NUMBER, TIKI_COMMIT_SHA |
| phase-start | Before each phase | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE, TIKI_PHASE_NUMBER |
| phase-complete | After each phase | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE, TIKI_PHASE_NUMBER, TIKI_PHASE_STATUS |

**Note:** The same hook (e.g., `pre-ship`) receives different variables depending on the calling command. Hooks should check for variable presence before using them.

## Environment Variable Reference

### Issue Context (always available for issue operations)
| Variable | Description |
|----------|-------------|
| `TIKI_ISSUE_NUMBER` | GitHub issue number |
| `TIKI_ISSUE_TITLE` | Issue title (sanitized for shell) |

### Phase Context (available during execute)
| Variable | Description |
|----------|-------------|
| `TIKI_PHASE_NUMBER` | Current phase number (1-based) |
| `TIKI_TOTAL_PHASES` | Total number of phases |
| `TIKI_PHASES_COMPLETED` | Count of completed phases |
| `TIKI_PHASE_STATUS` | Phase status: "completed" or "failed" |

### Commit Context (available after commits)
| Variable | Description |
|----------|-------------|
| `TIKI_COMMIT_SHA` | Git commit SHA |

### Release Context (available during release-ship)
| Variable | Description |
|----------|-------------|
| `TIKI_RELEASE_VERSION` | Release version (e.g., "v1.0.14") |
| `TIKI_RELEASE_ISSUE_COUNT` | Total issues in release |
| `TIKI_GIT_TAG` | Git tag created (post-ship only, may be empty) |

## Execution Steps

### 1. Check if hooks enabled

- Read `.tiki/config.json`
- If `extensions.lifecycleScripts.enabled` is EXPLICITLY false, skip silently. If undefined or true, proceed with hook execution.
- Get directory from config (default: `.tiki/hooks`)
- Get timeout from config (default: 30000ms)
- Get verbose setting from config (default: false)

**Default:** Hooks are enabled unless explicitly disabled with `enabled: false`

### 2. Locate hook file

Check for hook file in this exact order:
1. `<directory>/<hook-name>` (no extension) - run via bash
2. `<directory>/<hook-name>.sh` - run via bash
3. `<directory>/<hook-name>.ps1` - run via pwsh/powershell

Use the FIRST match found. If no file is found, skip silently (hooks are optional).

### 2.5 Verbose Logging (if enabled)

If `verbose: true` in config, output status at each step:

**Hook detection:**
- "Checking for {hook-name} hook..."
- "Found: {full-path}" OR "Not found: {hook-name} (skipping)"

**Hook execution:**
- "Executing {hook-name} via {shell}..."
- "Hook {hook-name} completed (exit code: {code})"

**Hook skipped:**
- "Hooks disabled in config (skipping {hook-name})"

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

Set environment variables with `TIKI_` prefix as documented in the tables above.

Run the hook with the configured timeout. Capture both stdout and stderr.

### 5. Handle result

**Exit code 0 (Success):**
- If verbose=true in config, display stdout and the completion message from Step 2.5 ("Hook {hook-name} completed (exit code: 0)")
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

## Example: Version Bump on Release Ship

A common use case is bumping `package.json` version when shipping a release:

```bash
#!/bin/bash
# .tiki/hooks/pre-ship
set -e

# Only bump version during release-ship (not individual issue ship)
if [ -z "$TIKI_RELEASE_VERSION" ]; then
    echo "Pre-ship: Individual issue ship, skipping version bump"
    exit 0
fi

echo "Bumping version for release $TIKI_RELEASE_VERSION"

# Extract version number (v1.0.14 -> 1.0.14)
VERSION="${TIKI_RELEASE_VERSION#v}"

# Update package.json
npm version "$VERSION" --no-git-tag-version --allow-same-version

# Stage for commit
git add package.json package-lock.json

echo "Version bumped to $VERSION"
```

## Cross-Platform Notes

On Windows systems, load `.tiki/prompts/hooks/windows-support.md` for shell detection and execution details.
