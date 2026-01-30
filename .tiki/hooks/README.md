# Lifecycle Hooks

Place executable shell scripts here to run at workflow points.

## Available Hooks

| Hook | When it runs | Blocks on failure |
|------|--------------|-------------------|
| pre-ship | Before /tiki:ship commits | Yes |
| post-ship | After successful ship | No |
| pre-execute | Before /tiki:execute starts | Yes |
| post-execute | After all phases complete | No |
| pre-commit | Before /tiki:commit | Yes |
| post-commit | After commit | No |
| phase-start | Before each phase | Yes |
| phase-complete | After each phase | No |

## Environment Variables

Hooks receive context via environment variables (all prefixed with `TIKI_`):

- `TIKI_ISSUE_NUMBER` - Active issue number
- `TIKI_ISSUE_TITLE` - Issue title (sanitized)
- `TIKI_PHASE_NUMBER` - Current phase number
- `TIKI_PHASE_TITLE` - Phase title
- `TIKI_PHASE_STATUS` - "completed" or "failed"
- `TIKI_COMMIT_SHA` - Commit hash
- `TIKI_TOTAL_PHASES` - Total phases in plan
- `TIKI_PHASES_COMPLETED` - Count of completed phases

## Example: pre-ship

```bash
#!/bin/bash
set -e

echo "Running pre-ship hook for issue #$TIKI_ISSUE_NUMBER"

# Example: Bump version before shipping
npm version patch --no-git-tag-version
git add package.json package-lock.json
```

## Windows Support

- `.sh` files run via Git Bash (auto-detected)
- `.ps1` files run via PowerShell
- Provide both for maximum compatibility

## Configuration

In `.tiki/config.json`:

```json
"extensions": {
  "lifecycleScripts": {
    "enabled": true,
    "directory": ".tiki/hooks",
    "timeout": 30000,
    "verbose": false
  }
}
```

## Testing Hooks

Use `/tiki:hook-run` to test hooks manually:

```
/tiki:hook-run pre-ship
/tiki:hook-run phase-complete --env TIKI_PHASE_NUMBER=2 --env TIKI_PHASE_STATUS=completed
```
