---
type: prompt
name: tiki:release-yolo
description: Automated release execution (plan, execute, ship all issues)
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion, Skill, Task
argument-hint: <version> [--skip-verify] [--no-tag] [--dry-run] [--continue] [--from <issue>]
---

# Release YOLO

Automated release execution that plans, executes, and ships all issues in a release.

## Usage

```text
/tiki:release-yolo v1.1                   # Full automated workflow
/tiki:release-yolo v1.1 --skip-verify     # Skip requirement verification
/tiki:release-yolo v1.1 --no-tag          # Don't create git tag
/tiki:release-yolo v1.1 --dry-run         # Show what would happen
/tiki:release-yolo v1.1 --continue        # Resume paused execution
/tiki:release-yolo v1.1 --from 42         # Start from specific issue
```

## Flow

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`: version, --skip-verify, --no-tag, --dry-run, --continue, --from N.

If no version (and not --continue): show usage and exit.

### Step 2: Handle --continue

If `--continue` flag present:

1. Read YOLO state at `.tiki/state/yolo.json`
2. Check if status is `in_progress` or `paused`
3. If found, read `.tiki/prompts/release-yolo/resume.md` and follow resume workflow
4. Continue from saved position in yolo.json

### Step 3: Load Release

```bash
VERSION="${version}"
[[ ! "$VERSION" =~ ^v ]] && VERSION="v${VERSION}"
cat ".tiki/releases/${VERSION}.json" 2>/dev/null || echo "NOT_FOUND"
```

If not found or empty: show error with available releases.

### Step 4: Calculate Dependency Order

Analyze issue dependencies (look for "depends on #N" in issue bodies). Order issues so dependencies are processed first. If circular, warn and use original order.

### Step 5: Pre-Flight Display

```text
## Release YOLO: {version}

### Execution Order

| # | Issue | Title | Dependencies | Status |
|---|-------|-------|--------------|--------|
| 1 | #34 | Title | none | not_planned |

### Configuration

| Setting | Value |
|---------|-------|
| TDD Mode | {from .tiki/config.json} |
| Skip Verification | {yes/no} |
| Create Tag | {yes/no} |
```

If `--dry-run`: show plan and exit.

Otherwise, confirm with user before proceeding.

### Step 6: Initialize State

Check for existing yolo.json and initialize release state:

```javascript
// Check if yolo.json exists
const yoloPath = '.tiki/state/yolo.json';
let existingYolo = null;
try {
  existingYolo = JSON.parse(fs.readFileSync(yoloPath));
} catch (e) {
  // No existing yolo.json
}

// If yolo.json exists and is in_progress, prompt user
if (existingYolo && existingYolo.status === 'in_progress') {
  // Ask: continue existing or start fresh?
  // If continue, switch to --continue flow
  // If start fresh, overwrite
}

// Create yolo.json
const yoloState = {
  "release": VERSION,
  "status": "in_progress",
  "startedAt": new Date().toISOString(),
  "lastActivity": new Date().toISOString(),
  "currentIssue": null,
  "issueOrder": [34, 36, 20],  // From dependency order calculation
  "completedIssues": [],
  "skippedIssues": [],
  "failedIssues": [],
  "flags": { "skipVerify": false, "noTag": false },
  "errorHistory": []
};

// Write to .tiki/state/yolo.json
fs.writeFileSync(yoloPath, JSON.stringify(yoloState, null, 2));
```

### Step 7: Issue Processing Loop

For each issue in dependency order (starting from --from position if provided):

#### 7a: Display Issue Header

```text
---
## Issue {index}/{total}: #{number} - {title}
```

#### 7b: Update YOLO State

Update yolo.json with current issue:

```javascript
// Read yolo.json
const yoloState = JSON.parse(fs.readFileSync('.tiki/state/yolo.json'));
yoloState.currentIssue = issueNumber;
yoloState.lastActivity = new Date().toISOString();
// Write yolo.json
fs.writeFileSync('.tiki/state/yolo.json', JSON.stringify(yoloState, null, 2));
```

#### 7c: Plan Stage

If no plan exists:

1. Read `.tiki/prompts/release-yolo/plan-stage.md`
2. Follow planning workflow

#### 7d: Execute Stage

1. Read `.tiki/prompts/release-yolo/execute-stage.md`
2. Invoke `/tiki:execute {number}` using the Skill tool
3. **Validation Checkpoint**: After execute returns, verify state was updated:
   - Read `.tiki/plans/issue-{number}.json`
   - Check that phases have status `completed` or plan has completedPhases
   - If validation fails: display warning and offer recovery options (Retry execute, Manual state update, Continue anyway)
4. If failure, read `.tiki/prompts/release-yolo/error-recovery.md` and update yolo.json errorHistory

#### 7e: Ship Stage

1. Read `.tiki/prompts/release-yolo/ship-stage.md`
2. Invoke `/tiki:ship {number}` using the Skill tool
3. Update yolo.json:
   ```javascript
   const yoloState = JSON.parse(fs.readFileSync('.tiki/state/yolo.json'));
   yoloState.completedIssues.push(issueNumber);
   yoloState.currentIssue = null;
   yoloState.lastActivity = new Date().toISOString();
   fs.writeFileSync('.tiki/state/yolo.json', JSON.stringify(yoloState, null, 2));
   ```

### Step 8: Requirement Verification

If requirements exist AND not --skip-verify:

1. Read `.tiki/prompts/release-yolo/verification.md`
2. Follow verification workflow

### Step 9: Ship Release

Handle any failed issues (ship anyway, remove, or abort).

Create git tag (unless --no-tag):

```bash
git tag -a "${VERSION}" -m "Release ${VERSION}"
git push origin "${VERSION}"
```

Close milestone if linked. Archive release file.

Update yolo.json to completed:

```javascript
// Read and update yolo.json
const yoloState = JSON.parse(fs.readFileSync('.tiki/state/yolo.json'));
yoloState.status = "completed";
yoloState.completedAt = new Date().toISOString();
yoloState.lastActivity = new Date().toISOString();
yoloState.currentIssue = null;
fs.writeFileSync('.tiki/state/yolo.json', JSON.stringify(yoloState, null, 2));
```

Update version.json with changelog entry for completed issues.

### Step 10: Completion Summary

```text
## Release {version} Shipped!

| Metric | Value |
|--------|-------|
| Issues Completed | {n}/{total} |
| Phases Executed | {count} |
| Requirements Verified | {n}/{total} |

### Issues Completed

| Issue | Title | Phases |
|-------|-------|--------|
| #{n} | {title} | {count} |
```

## Error Handling

- Release not found: Show available releases
- GitHub CLI unavailable: Show auth instructions
- Circular dependencies: Warn and use original order
- State corrupted: Read error-recovery.md for options
- Concurrent execution: Offer continue/restart/cancel

## Edge Cases

- Empty release: Error, suggest adding issues
- All issues complete: Skip to verification/shipping
- Single issue: Handle normally, skip dependency analysis
- Resume after issue removal: Offer continue or cancel
