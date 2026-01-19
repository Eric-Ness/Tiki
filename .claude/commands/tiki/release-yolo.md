---
type: prompt
name: tiki:release-yolo
description: Automated release execution (plan, execute, ship all issues)
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion, Skill, Task
argument-hint: <version> [--skip-verify] [--no-tag] [--dry-run] [--continue] [--from <issue>]
---

# Release YOLO

Automated release execution that plans, executes, and ships all issues in a release sequentially with minimal interaction.

## Usage

```text
/tiki:release-yolo v1.1                   # Full automated workflow
/tiki:release-yolo v1.1 --skip-verify     # Skip requirement verification
/tiki:release-yolo v1.1 --no-tag          # Don't create git tag
/tiki:release-yolo v1.1 --dry-run         # Show what would happen
/tiki:release-yolo v1.1 --continue        # Resume paused execution
/tiki:release-yolo v1.1 --from 42         # Start from specific issue
```

**Arguments:**
- `<version>` (required): Version identifier to execute (e.g., v1.1, 2.0.0-beta)

**Flags:**

| Flag | Description |
|------|-------------|
| `--skip-verify` | Skip requirement verification at ship time |
| `--no-tag` | Don't create git tag when shipping |
| `--dry-run` | Show execution plan without running |
| `--continue` | Resume a paused YOLO execution |
| `--from <issue>` | Start from a specific issue (skip earlier ones) |

## YOLO State File Schema

Location: `.tiki/state/yolo.json`

Tracks YOLO execution state to allow resumption after errors or breaks.

```json
{
  "release": "v1.1",
  "status": "in_progress",
  "startedAt": "2026-01-20T10:00:00Z",
  "currentIssue": 20,
  "currentPhase": 2,
  "completedIssues": [34, 36],
  "failedIssues": [],
  "issueOrder": [34, 36, 20, 21, 22],
  "flags": {
    "skipVerify": false,
    "noTag": false
  },
  "errorHistory": []
}
```

### YOLO State Fields

| Field | Type | Description |
|-------|------|-------------|
| `release` | string | Version identifier being executed |
| `status` | string | One of: "in_progress", "paused", "completed", "failed" |
| `startedAt` | string | ISO 8601 timestamp when YOLO started |
| `currentIssue` | number\|null | Issue number currently being processed |
| `currentPhase` | number\|null | Phase number within current issue |
| `completedIssues` | array | Array of issue numbers that completed successfully |
| `failedIssues` | array | Array of issue numbers that failed |
| `issueOrder` | array | Issues in dependency order |
| `flags` | object | Flags passed to yolo command |
| `errorHistory` | array | Array of error records for recovery analysis |

## Flow

### Step 1: Parse and Validate Arguments

Parse the arguments to extract version and flags:

```text
Arguments: $ARGUMENTS
Expected format: <version> [--skip-verify] [--no-tag] [--dry-run] [--continue] [--from <issue>]

Extract:
- version: The version string (e.g., "v1.1", "2.0.0-beta")
- skipVerify: true if --skip-verify flag is present
- noTag: true if --no-tag flag is present
- dryRun: true if --dry-run flag is present
- continueExecution: true if --continue flag is present
- fromIssue: issue number if --from flag is present
```

**Parsing Logic:**

```javascript
function parseYoloArguments(args) {
  const tokens = args.split(/\s+/).filter(t => t);
  let version = null;
  let skipVerify = false;
  let noTag = false;
  let dryRun = false;
  let continueExecution = false;
  let fromIssue = null;

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '--skip-verify') {
      skipVerify = true;
    } else if (tokens[i] === '--no-tag') {
      noTag = true;
    } else if (tokens[i] === '--dry-run') {
      dryRun = true;
    } else if (tokens[i] === '--continue') {
      continueExecution = true;
    } else if (tokens[i] === '--from' && tokens[i + 1]) {
      fromIssue = parseInt(tokens[i + 1], 10);
      i++;
    } else if (!version && !tokens[i].startsWith('--')) {
      version = tokens[i];
    }
  }

  return { version, skipVerify, noTag, dryRun, continueExecution, fromIssue };
}
```

If version is missing (and not --continue):

```text
## Missing Version

Usage: /tiki:release-yolo <version> [flags]

Flags:
  --skip-verify   Skip requirement verification at ship time
  --no-tag        Don't create git tag when shipping
  --dry-run       Show execution plan without running
  --continue      Resume a paused YOLO execution
  --from <issue>  Start from a specific issue

Examples:
  /tiki:release-yolo v1.1
  /tiki:release-yolo v1.1 --dry-run
  /tiki:release-yolo v1.1 --skip-verify --no-tag
```

### Step 2: Handle --continue Flag

If `--continue` flag is present, load and resume from saved state:

```bash
if [ -f ".tiki/state/yolo.json" ]; then
  cat ".tiki/state/yolo.json"
else
  echo "NO_YOLO_STATE"
fi
```

**If no saved state:**

```text
## No YOLO State Found

No paused YOLO execution to continue.

To start a new YOLO execution:
  /tiki:release-yolo <version>

To see available releases:
  /tiki:release-status
```

**If saved state exists:**

Load the state and extract:
- Release version
- Current position (issue and phase)
- Completed issues
- Flags from original invocation

Override with any new flags provided (e.g., `--skip-verify` can be added on continue).

Display resume information:

```text
## Resuming YOLO Execution

Release: {version}
Started: {startedAt}
Progress: {completedIssues.length}/{totalIssues} issues complete

### Completed Issues
{For each completed issue:}
- #{number}: {title}

### Resuming From
Issue #{currentIssue}: {title}
Phase: {currentPhase}/{totalPhases}

Continue? [Y/n]
```

Use AskUserQuestion to confirm, then skip to Step 6 (Issue Processing Loop) at the saved position.

### Step 3: Load and Validate Release

Load the release file:

```bash
VERSION="${version}"
if [[ ! "$VERSION" =~ ^v ]]; then
  VERSION="v${VERSION}"
fi

if [ -f ".tiki/releases/${VERSION}.json" ]; then
  cat ".tiki/releases/${VERSION}.json"
else
  echo "NOT_FOUND"
fi
```

**If release not found:**

```text
## Release Not Found

Release "{version}" not found.

Available active releases:
{List active releases from .tiki/releases/*.json}

To create a new release:
  /tiki:release-new {version}
```

**If release has no issues:**

```text
## Empty Release

Release {version} has no issues to execute.

Add issues first:
  /tiki:release-add <issue-number> --to {version}
```

### Step 4: Calculate Issue Dependency Order

Analyze issues to determine execution order based on dependencies:

```javascript
function calculateDependencyOrder(release) {
  const issues = release.issues;
  const ordered = [];
  const remaining = [...issues];
  const completed = new Set();

  // Build dependency map by analyzing issue bodies
  // Dependencies are indicated by "depends on #N" or "blocked by #N" in issue body

  while (remaining.length > 0) {
    let progress = false;

    for (let i = 0; i < remaining.length; i++) {
      const issue = remaining[i];
      const deps = issue.dependencies || [];

      // Check if all dependencies are satisfied
      const depsInRelease = deps.filter(d => issues.some(iss => iss.number === d));
      const depsSatisfied = depsInRelease.every(d => completed.has(d));

      if (depsSatisfied) {
        ordered.push(issue);
        completed.add(issue.number);
        remaining.splice(i, 1);
        progress = true;
        break;
      }
    }

    // If no progress, there's a circular dependency or external dependency
    if (!progress) {
      // Add remaining in original order with warning
      ordered.push(...remaining);
      break;
    }
  }

  return ordered;
}
```

For each issue, fetch dependency information:

```bash
gh issue view <number> --json body --jq '.body' | grep -oE '(depends on|blocked by) #[0-9]+' | grep -oE '#[0-9]+' | tr -d '#'
```

### Step 5: Display Pre-Flight Check

Display comprehensive pre-flight information:

```text
## Release YOLO: {version}

### Pre-Flight Check

Release {version} contains {count} issues:
{For each issue in original order:}
- #{number}: {title} ({status})

### Execution Order (by dependencies)

Issues will be processed in this order:

| Order | Issue | Title | Dependencies | Status |
|-------|-------|-------|--------------|--------|
| 1 | #34 | Diagnostic docs | none | not_planned |
| 2 | #36 | JSON schema | none | not_planned |
| 3 | #20 | Define requirements | none | planned |
| 4 | #21 | Roadmap | #20 | not_planned |
| 5 | #22 | Milestone mgmt | #20, #21 | not_planned |

{If --from flag provided:}
### Starting From

Starting from issue #{fromIssue}. The following issues will be skipped:
{List issues before fromIssue}

### Configuration

| Setting | Value |
|---------|-------|
| TDD Mode | {enabled/disabled} (from .tiki/config.json) |
| Auto-fix | {enabled/disabled/prompt} |
| Skip Verification | {yes/no} |
| Create Tag | {yes/no} |

{If requirementsEnabled:}
### Requirements

| Metric | Value |
|--------|-------|
| Total | {count} |
| Addressed by Issues | {addressedCount} |
| Coverage | {percent}% |
```

**If --dry-run flag:**

Display the execution plan and exit:

```text
### Execution Plan (Dry Run)

{For each issue in order:}

**{order}. #{number}: {title}**
- Current Status: {status}
- Action: {Plan -> Execute -> Ship | Execute -> Ship | Ship | Already complete}
- Requirements: {requirement IDs or "None"}
{If has dependencies:}- Depends on: {dependency issue numbers}

---

### Post-Execution Plan

1. {If not --skip-verify:}Verify {count} requirements
2. Close GitHub milestone (if linked)
3. {If not --no-tag:}Create git tag {version}
4. Archive release

---

**No changes made (dry run).** Run without --dry-run to execute.
```

Exit after dry run display.

**Confirmation Prompt (if not dry-run):**

Use AskUserQuestion:

```text
### Confirm YOLO Execution

This will:
1. Plan {unplannedCount} unplanned issues
2. Execute {totalPhases} phases across {issueCount} issues
3. Ship each issue as it completes
4. Verify {requirementCount} requirements
5. Ship the release

Estimated time: {estimate} (based on {avgPhaseDuration} per phase)

Proceed with YOLO execution? [Y/n]
```

If user declines, exit with "YOLO execution cancelled."

### Step 6: Initialize YOLO State

Create initial state file for recovery:

```javascript
const yoloState = {
  release: version,
  status: "in_progress",
  startedAt: new Date().toISOString(),
  currentIssue: null,
  currentPhase: null,
  completedIssues: [],
  failedIssues: [],
  issueOrder: orderedIssues.map(i => i.number),
  flags: {
    skipVerify,
    noTag
  },
  errorHistory: []
};
```

```bash
mkdir -p .tiki/state
cat > .tiki/state/yolo.json << 'EOF'
{yoloState JSON}
EOF
```

### Step 7: Issue Processing Loop

For each issue in dependency order (starting from --from position if provided):

#### Step 7a: Update State - Start Issue

```javascript
yoloState.currentIssue = issue.number;
yoloState.currentPhase = null;
// Save state
```

Display issue header:

```text
---

## Issue {index}/{total}: #{number} - {title}
```

#### Step 7b: Check if Planning Needed

```bash
if [ -f ".tiki/plans/issue-${number}.json" ]; then
  cat ".tiki/plans/issue-${number}.json"
else
  echo "NO_PLAN"
fi
```

**If issue needs planning (no plan file or status is "not_planned"):**

```text
### Planning Issue #{number}

Issue #{number} has no plan. Invoking /tiki:plan-issue...
```

Invoke the plan-issue skill:

```text
Skill tool invocation:
- skill: "tiki:plan-issue"
- args: "{number}"
```

Wait for planning to complete. The plan-issue command will:
1. Analyze the issue
2. Create phases with success criteria
3. Save plan to `.tiki/plans/issue-{number}.json`

After planning completes, verify plan was created:

```bash
if [ -f ".tiki/plans/issue-${number}.json" ]; then
  cat ".tiki/plans/issue-${number}.json"
fi
```

Display planning result:

```text
Plan created: {phaseCount} phases

| Phase | Title | Est. Context |
|-------|-------|--------------|
{For each phase:}
| {n} | {title} | {contextBudget}% |
```

**If planning fails:**

```text
### Planning Failed

Failed to create plan for issue #{number}.

### Recovery Options

1. **Retry planning** - Try /tiki:plan-issue again
2. **Skip issue** - Continue with remaining issues
3. **Pause YOLO** - Save state and exit for manual intervention

Enter choice:
```

Handle recovery based on user choice.

#### Step 7c: Execute Issue Phases

Invoke the execute command for this issue:

```text
### Executing Issue #{number}

Executing {phaseCount} phases...
```

**TDD Mode Check:**

Read TDD configuration:

```bash
cat .tiki/config.json 2>/dev/null | jq -r '.testing.createTests // "ask"'
```

Invoke execute skill with appropriate flags:

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

**During Execution - Update YOLO State:**

As phases complete, update the YOLO state:

```javascript
yoloState.currentPhase = currentPhaseNumber;
// Save state after each phase
```

Display phase progress:

```text
Executing phase {n}/{total}: {phaseTitle}...
{On success:}Phase {n} complete.

{On failure:}Phase {n} failed.
```

#### Step 7d: Handle Execution Failures

If a phase fails after auto-fix attempts are exhausted:

```text
### Execution Failed

Issue #{number} failed at phase {n}: {phaseTitle}

Error: {errorMessage}

### Error Recovery (Attempt {attemptNumber}/4)

{attemptNumber 1-3: Auto-fix attempts}
Attempting automatic fix...

{If auto-fix succeeds:}
Fix applied. Resuming execution...

{If auto-fix fails and attemptNumber < 4:}
Auto-fix attempt {attemptNumber} failed. Trying next strategy...

{attemptNumber 4: Invoke /tiki:heal}
Auto-fix exhausted. Invoking /tiki:heal for diagnostic analysis...
```

**4-Attempt Escalation Pattern:**

1. **Attempt 1**: Direct fix (pattern-matched inline fix)
2. **Attempt 2**: Contextual analysis (diagnostic sub-agent with file context)
3. **Attempt 3**: Approach review (full issue context, can signal fundamental issues)
4. **Attempt 4**: Invoke `/tiki:heal` for comprehensive diagnostic

On attempt 4, invoke heal:

```text
Skill tool invocation:
- skill: "tiki:heal"
- args: "{number}"
```

**If all recovery attempts fail:**

```text
### All Recovery Attempts Exhausted

Issue #{number} could not be automatically fixed after 4 attempts:
1. Direct fix - {result}
2. Contextual analysis - {result}
3. Approach review - {result}
4. Heal diagnostic - {result}

### Recovery Options

1. **Manual fix** - Pause YOLO, fix manually, then `/tiki:release-yolo {version} --continue`
2. **Skip issue** - Mark as failed and continue with remaining issues
3. **Abort YOLO** - Stop execution entirely

Enter choice:
```

Use AskUserQuestion for recovery choice:

**Option 1 - Manual fix:**
- Set yoloState.status to "paused"
- Save state
- Display resume instructions:

```text
## YOLO Paused

State saved. After fixing the issue manually:
  /tiki:release-yolo {version} --continue

Current position:
- Issue: #{number} - {title}
- Phase: {currentPhase}/{totalPhases}
```

**Option 2 - Skip issue:**
- Add issue to failedIssues array
- Continue to next issue

```text
Issue #{number} marked as failed. Continuing with remaining issues...
```

**Option 3 - Abort:**
- Set yoloState.status to "failed"
- Save state
- Exit

```text
## YOLO Aborted

Execution aborted. {completedCount}/{totalCount} issues completed.

Completed issues:
{List completed issues}

To retry:
  /tiki:release-yolo {version} --from {failedIssueNumber}
```

#### Step 7e: Ship Completed Issue

After all phases complete successfully, ship the issue:

```text
### Shipping Issue #{number}

All phases complete. Shipping issue...
```

Invoke ship skill:

```text
Skill tool invocation:
- skill: "tiki:ship"
- args: "{number}"
```

The ship command handles:
1. Final verification
2. Git commit if needed
3. Closing GitHub issue
4. Updating release tracking

Display ship result:

```text
Issue #{number} shipped.
{If requirements addressed:}Requirements marked as implemented: {requirementIds}

Release progress: {completedCount}/{totalCount} ({percent}%)
```

#### Step 7f: Update State - Complete Issue

```javascript
yoloState.completedIssues.push(issue.number);
yoloState.currentIssue = null;
yoloState.currentPhase = null;
// Save state
```

Update release file with issue completion:

```javascript
release.issues.find(i => i.number === issue.number).status = 'completed';
release.issues.find(i => i.number === issue.number).completedAt = new Date().toISOString();
// Save release file
```

### Step 8: Requirement Verification (unless --skip-verify)

After all issues complete, verify requirements before shipping the release.

#### Step 8a: Check for --skip-verify Flag

**If --skip-verify flag is present:**

```text
## Skipping Requirement Verification

--skip-verify flag provided. Proceeding to ship release.
```

Skip to Step 9.

#### Step 8b: Load Requirements

Load the requirements file:

```bash
if [ -f ".tiki/requirements.json" ]; then
  cat ".tiki/requirements.json"
else
  echo "NO_REQUIREMENTS"
fi
```

**If no requirements file exists:**

```text
## No Requirements Defined

No requirements.json found. Skipping verification.

To define requirements for future releases:
  /tiki:define-requirements
```

Skip to Step 9.

#### Step 8c: Identify Requirements to Verify

Parse requirements.json and identify requirements addressed by this release:

```javascript
function getRequirementsForRelease(requirements, release) {
  const releaseIssueNumbers = release.issues.map(i => i.number);
  const toVerify = [];

  for (const category of requirements.categories) {
    for (const req of category.requirements) {
      // Check if requirement is addressed by any issue in this release
      const addressedByReleaseIssue = req.implementedBy?.some(
        issueNum => releaseIssueNumbers.includes(issueNum)
      );

      // Only verify if addressed by this release and not already verified
      if (addressedByReleaseIssue && req.status !== 'verified') {
        toVerify.push({
          ...req,
          categoryName: category.name
        });
      }
    }
  }

  return toVerify;
}
```

**If no requirements to verify:**

```text
## Requirement Verification

No unverified requirements addressed by this release.
All {totalCount} requirements either:
- Already verified
- Not addressed by issues in this release

Proceeding to ship release.
```

Skip to Step 9.

#### Step 8d: Display Verification Overview

```text
## Requirement Verification

{count} requirements to verify for release {version}:

| # | ID | Requirement | Type | Addressed By |
|---|------|-------------|------|--------------|
{For each requirement:}
| {n} | {req.id} | {req.text (truncate to 50 chars)} | {req.verification.type} | #{issueNumbers.join(', #')} |

### Verification Types

| Type | Count | Auto-Verify |
|------|-------|-------------|
| automated_test | {count} | Yes |
| state_check | {count} | Yes |
| documentation | {count} | Partial |
| code_review | {count} | No |
| manual_test | {count} | No |
```

#### Step 8e: Auto-Verification Phase

Attempt automatic verification for requirements that support it:

```text
### Auto-Verification Phase

Attempting automatic verification for {autoVerifyCount} requirements...
```

For each requirement with auto-verifiable type:

**Type: automated_test**

```javascript
async function verifyAutomatedTest(req) {
  // Strategy 1: Look for test files matching requirement ID or keywords
  const testPatterns = [
    `**/*${req.id.toLowerCase()}*.test.{js,ts,jsx,tsx}`,
    `**/*${req.id.toLowerCase()}*.spec.{js,ts,jsx,tsx}`,
    `**/test/*${req.id.toLowerCase()}*`
  ];

  // Strategy 2: Run tests if test command is available
  // Check package.json for test script or .tiki/config.json for test command

  return {
    verified: testsExistAndPass,
    method: 'automated_test',
    details: testResults
  };
}
```

Execute verification:

```bash
# Check for test files related to the requirement
find . -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | head -20

# If .tiki/config.json has test command, run it
TEST_CMD=$(cat .tiki/config.json 2>/dev/null | jq -r '.testing.testCommand // empty')
if [ -n "$TEST_CMD" ]; then
  $TEST_CMD 2>&1 | tail -50
fi
```

Display result:

```text
#### {req.id}: {req.text}

**Type:** automated_test
**Verification:** {req.verification.description}

Running automated verification...

{If tests found and pass:}
- Found test file(s): {testFiles}
- Test result: PASSED
- Status: **Verified**

{If tests found but fail:}
- Found test file(s): {testFiles}
- Test result: FAILED
- Error: {errorMessage}
- Status: **Needs Manual Review**

{If no tests found:}
- No test files found matching requirement
- Status: **Needs Manual Verification**
```

**Type: state_check**

```javascript
async function verifyStateCheck(req) {
  // Parse verification description for file/state checks
  // Common patterns:
  // - "file X exists" -> check file existence
  // - "config contains X" -> check file content
  // - "X is set to Y" -> check configuration value

  const patterns = {
    fileExists: /file\s+['"]?([^'"]+)['"]?\s+exists/i,
    configContains: /config\s+contains?\s+['"]?([^'"]+)['"]?/i,
    stateHas: /state\s+(has|contains|includes)\s+['"]?([^'"]+)['"]?/i
  };

  // Attempt to verify based on description
  return {
    verified: stateCheckPassed,
    method: 'state_check',
    details: checkResults
  };
}
```

Execute verification:

```bash
# Example: Check if specific file exists (extracted from verification description)
# Pattern matching on verification.description to extract file paths

# For file existence checks
ls -la "{extractedFilePath}" 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"

# For content checks
grep -l "{extractedPattern}" "{extractedFilePath}" 2>/dev/null && echo "FOUND" || echo "NOT_FOUND"
```

Display result:

```text
#### {req.id}: {req.text}

**Type:** state_check
**Verification:** {req.verification.description}

Running state check...

{If check passes:}
- Check: {checkDescription}
- Result: PASSED
- Status: **Verified**

{If check fails:}
- Check: {checkDescription}
- Result: FAILED - {reason}
- Status: **Needs Manual Verification**
```

**Type: documentation**

```javascript
async function verifyDocumentation(req) {
  // Check if documentation files exist
  // Look for README, docs/, *.md files mentioned in verification

  const docPatterns = [
    'README.md',
    'docs/**/*.md',
    '**/*.md'
  ];

  // Check if specific documentation mentioned in verification exists
  return {
    verified: docExists,
    method: 'documentation',
    details: docCheckResults
  };
}
```

Display result:

```text
#### {req.id}: {req.text}

**Type:** documentation
**Verification:** {req.verification.description}

Checking documentation...

{If doc found:}
- Documentation file: {docPath}
- Content check: {contentPresent ? 'Relevant content found' : 'File exists but content not verified'}
- Status: **Partially Verified** - Manual review recommended
```

#### Step 8f: Auto-Verification Summary

After auto-verification phase completes:

```text
### Auto-Verification Results

| Status | Count |
|--------|-------|
| Verified | {verifiedCount} |
| Needs Manual | {manualCount} |
| Failed | {failedCount} |

{If all verified:}
All {count} requirements verified automatically.

{If some need manual:}
#### Requirements Verified Automatically

| ID | Requirement | Method |
|----|-------------|--------|
{For each auto-verified:}
| {req.id} | {req.text} | {verificationMethod} |

#### Requirements Needing Manual Verification

| ID | Requirement | Type | Reason |
|----|-------------|------|--------|
{For each needing manual:}
| {req.id} | {req.text} | {req.verification.type} | {reason} |
```

#### Step 8g: Manual Verification Flow

**If all requirements auto-verified:**

Skip to Step 8i (Update Requirements).

**If requirements need manual verification:**

Use AskUserQuestion to present options:

```text
### Manual Verification Required

{manualCount} requirements need manual verification:

| # | ID | Requirement | Type |
|---|------|-------------|------|
{For each unverified requirement:}
| {n} | {req.id} | {req.text} | {req.verification.type} |

### Options

1. **Verify now** - Interactive verification for each requirement
2. **Ship without verification** - Mark as unverified and proceed (--skip-verify behavior)
3. **Pause and verify later** - Save state for manual verification, resume with --continue

Enter choice (1/2/3):
```

**Option 1 - Verify now (Interactive):**

For each unverified requirement:

```text
---

## Verify Requirement {n}/{total}

**ID:** {req.id}
**Category:** {req.categoryName}
**Requirement:** {req.text}

### Implementation Context

**Addressed by:**
{For each implementing issue:}
- #{issueNumber}: {issueTitle}
  - Phases: {phaseCount} phases completed
  - Files modified: {fileList (top 5)}

### Verification Instructions

**Type:** {req.verification.type}
**Description:** {req.verification.description}

{If type == 'manual_test':}
### Manual Test Steps

Please perform the following verification:
1. {Step extracted from verification description}
2. Confirm expected behavior

{If type == 'code_review':}
### Code Review Checklist

Please review the implementation:
- [ ] Code follows project conventions
- [ ] Implementation matches requirement
- [ ] No obvious bugs or issues

### Verification Decision

Is this requirement properly implemented?

1. **Yes** - Mark as verified
2. **No** - Mark as failed (will need follow-up)
3. **Skip** - Leave unverified for now
4. **View files** - Show implementation files before deciding

Enter choice:
```

**If user selects "View files":**

```text
### Implementation Files

{For each modified file in implementing issues:}

**{filePath}**
{Show relevant code snippet or summary}

---

Return to verification decision:

1. **Yes** - Mark as verified
2. **No** - Mark as failed
3. **Skip** - Leave unverified

Enter choice:
```

Handle user response:

```javascript
function handleVerificationResponse(choice, req) {
  switch (choice) {
    case '1': // Yes
      req.status = 'verified';
      req.verifiedAt = new Date().toISOString();
      verifiedCount++;
      break;
    case '2': // No
      req.status = 'failed';
      req.verificationNotes = 'Failed manual verification during release';
      failedCount++;
      break;
    case '3': // Skip
      // Leave status unchanged
      skippedCount++;
      break;
  }
}
```

Display progress after each:

```text
Requirement {req.id}: {status}

Progress: {verifiedCount} verified, {failedCount} failed, {skippedCount} skipped, {remainingCount} remaining
```

**Option 2 - Ship without verification:**

```text
## Shipping Without Verification

Proceeding without verifying {manualCount} requirements.

These requirements will remain in "implemented" status until manually verified:

| ID | Requirement |
|----|-------------|
{For each unverified:}
| {req.id} | {req.text} |

Note: Run `/tiki:verify` on individual issues later to verify these requirements.
```

Proceed to Step 8i without marking requirements as verified.

**Option 3 - Pause and verify later:**

Update YOLO state with verification pause:

```javascript
yoloState.status = 'paused';
yoloState.pauseReason = 'verification_pending';
yoloState.verificationState = {
  autoVerified: autoVerifiedReqs.map(r => r.id),
  pendingManual: manualReqs.map(r => r.id),
  currentIndex: 0
};
// Save state
```

```text
## YOLO Paused for Verification

State saved. Requirements verification paused.

### Verification State

| Status | Count |
|--------|-------|
| Auto-verified | {autoVerifiedCount} |
| Pending manual | {manualCount} |

To resume verification:
  /tiki:release-yolo {version} --continue

To skip verification and ship:
  /tiki:release-yolo {version} --continue --skip-verify
```

Exit execution.

#### Step 8h: Verification Summary

After all manual verifications complete:

```text
### Verification Complete

| Status | Count |
|--------|-------|
| Auto-Verified | {autoVerifiedCount} |
| Manually Verified | {manualVerifiedCount} |
| Failed | {failedCount} |
| Skipped | {skippedCount} |
| Total | {totalCount} |

{If failedCount > 0:}
### Failed Requirements

The following requirements failed verification:

| ID | Requirement | Notes |
|----|-------------|-------|
{For each failed:}
| {req.id} | {req.text} | {req.verificationNotes} |

**Warning:** Shipping with failed requirements. Consider creating follow-up issues.

{If skippedCount > 0:}
### Skipped Requirements

The following requirements were not verified:

| ID | Requirement |
|----|-------------|
{For each skipped:}
| {req.id} | {req.text} |
```

#### Step 8i: Update Requirements File

Update requirements.json with verification results:

```javascript
function updateRequirementsWithVerification(requirements, verificationResults) {
  for (const category of requirements.categories) {
    for (const req of category.requirements) {
      const result = verificationResults.find(r => r.id === req.id);
      if (result) {
        if (result.status === 'verified') {
          req.status = 'verified';
          req.verifiedAt = new Date().toISOString();
          req.verificationMethod = result.method; // 'auto' or 'manual'
        } else if (result.status === 'failed') {
          req.status = 'failed';
          req.verificationNotes = result.notes;
        }
        // 'skipped' leaves status unchanged
      }
    }
  }

  // Update summary counts
  requirements.summary = {
    ...requirements.summary,
    verified: countByStatus(requirements, 'verified'),
    failed: countByStatus(requirements, 'failed'),
    lastVerifiedAt: new Date().toISOString()
  };

  return requirements;
}
```

Save updated requirements:

```bash
cat > .tiki/requirements.json << 'EOF'
{updatedRequirements JSON}
EOF
```

Display update confirmation:

```text
### Requirements Updated

Updated .tiki/requirements.json:
- Verified: {verifiedCount} requirements marked as verified
- Failed: {failedCount} requirements marked as failed
- Last verified: {timestamp}

Release requirements verification complete. Proceeding to ship release.
```

### Step 9: Ship the Release

All issues complete (or skipped). Ship the release:

```text
## All Issues Complete

{completedCount}/{totalCount} issues completed.
{If failedCount > 0:}{failedCount} issues failed/skipped.

### Shipping Release {version}
```

**Handle failed issues:**

If any issues failed:

```text
### Warning: Failed Issues

The following issues were not completed:

| Issue | Title | Reason |
|-------|-------|--------|
{For each failed issue:}
| #{number} | {title} | {failureReason} |

Options:

1. **Ship anyway** - Archive release without these issues
2. **Remove and ship** - Remove failed issues from release, then ship
3. **Abort** - Don't ship, investigate failures

Enter choice:
```

**Create Git Tag (unless --no-tag):**

```bash
git tag -a "${VERSION}" -m "Release ${VERSION}"
git push origin "${VERSION}"
```

**Close GitHub Milestone (if linked):**

```bash
if [ -n "${MILESTONE_NUMBER}" ]; then
  gh api repos/:owner/:repo/milestones/${MILESTONE_NUMBER} -X PATCH -f state="closed"
fi
```

**Archive Release:**

Move release file to archive with shipping metadata (same as ship subcommand Step 8).

**Clean Up YOLO State:**

```bash
rm .tiki/state/yolo.json
```

**Bump Version:**

Update `version.json` with the new release version and changelog entry:

```javascript
// Read current version.json
const versionFile = JSON.parse(readFile('version.json'));

// Update version to match release
versionFile.version = version.replace('v', '') + '.0'; // v1.2 -> 1.2.0
versionFile.releaseDate = new Date().toISOString().split('T')[0];

// Build changelog entry from completed issues
const changelogEntry = {
  version: versionFile.version,
  date: versionFile.releaseDate,
  changes: completedIssues.map(issue => `Issue #${issue.number}: ${issue.title}`)
};

// Prepend to changelog array
versionFile.changelog.unshift(changelogEntry);

// Write updated version.json
writeFile('version.json', JSON.stringify(versionFile, null, 2));
```

Commit the version bump:

```bash
git add version.json
git commit -m "chore: Bump version to {newVersion}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
git push
```

### Step 10: Display Completion Summary

```text
## Release {version} Shipped!

### Summary

| Metric | Value |
|--------|-------|
| Duration | {duration} |
| Issues Completed | {completedCount}/{totalCount} |
| Phases Executed | {totalPhases} |
| Requirements Verified | {verifiedCount}/{totalRequirements} |

### Issues Completed

| Order | Issue | Title | Phases | Time |
|-------|-------|-------|--------|------|
{For each completed issue:}
| {n} | #{number} | {title} | {phaseCount} | {duration} |

{If failed issues:}
### Issues Not Completed

| Issue | Title | Reason |
|-------|-------|--------|
{For each failed issue:}
| #{number} | {title} | {failureReason} |

### Actions Taken

| Action | Status |
|--------|--------|
| Issues planned | {plannedCount} |
| Issues executed | {executedCount} |
| Issues shipped | {shippedCount} |
| Requirements verified | {verifiedCount} |
{If milestone:}| Milestone closed | #{milestoneNumber} |
{If tag created:}| Git tag created | {version} |
| Version bumped | {newVersion} |
| Release archived | .tiki/releases/archive/{version}.json |

### Files Updated

- Updated: `version.json` (bumped to {newVersion})
- Archived: `.tiki/releases/archive/{version}.json`
- Removed: `.tiki/releases/{version}.json`
- Removed: `.tiki/state/yolo.json`
{For each issue:}- Plan: `.tiki/plans/issue-{number}.json`

---

Congratulations on shipping {version}!

### What's Next?

{If other active releases:}
Continue with other releases:
  /tiki:release-status

{If no other releases:}
Create a new release:
  /tiki:release-new <version>
```

## Error Handling

### Release Not Found

```text
## Release Not Found

Release "{version}" not found.

Available active releases:
{List releases}

To create a new release:
  /tiki:release-new {version}
```

### GitHub CLI Unavailable

```text
## GitHub CLI Error

Unable to communicate with GitHub.

YOLO execution requires GitHub CLI for:
- Fetching issue details
- Closing issues
- Managing milestones

Please ensure `gh` is installed and authenticated:
  gh auth login
```

### Circular Dependencies

```text
## Circular Dependency Detected

The following issues have circular dependencies:

{List issues with circular deps}

YOLO cannot determine execution order.

Options:
1. **Execute in original order** - Ignore dependencies
2. **Cancel** - Fix dependencies first

Enter choice:
```

### State File Corrupted

```text
## YOLO State Corrupted

Unable to read YOLO state file: .tiki/state/yolo.json

Options:
1. **Start fresh** - Delete state and start new YOLO
2. **Restore** - Attempt to reconstruct state from release file
3. **Cancel** - Exit without changes

Enter choice:
```

### Concurrent YOLO Execution

```text
## YOLO Already Running

A YOLO execution is already in progress for release {version}.

Status: {status}
Current issue: #{currentIssue}
Progress: {completedCount}/{totalCount}

Options:
1. **Continue existing** - Resume the in-progress execution
2. **Restart** - Abort current and start fresh (data may be lost)
3. **Cancel** - Exit without changes

Enter choice:
```

## Edge Cases

### Empty Release

```text
## Cannot YOLO Empty Release

Release {version} has no issues.

Add issues first:
  /tiki:release-add <issue-number> --to {version}
```

### All Issues Already Completed

```text
## All Issues Already Complete

All {count} issues in release {version} are already completed.

Proceeding directly to requirement verification and shipping.
```

### Single Issue Release

Handle normally but skip dependency analysis:

```text
## Release YOLO: {version}

### Pre-Flight Check

Release contains 1 issue:
- #{number}: {title}

Proceed with YOLO execution? [Y/n]
```

### Resume After Issue Removal

If an issue in the saved state was removed from the release:

```text
## State Mismatch

Issue #{number} in saved state is no longer in release {version}.

The issue may have been removed or moved to another release.

Options:
1. **Continue** - Skip missing issue and continue
2. **Cancel** - Exit and investigate

Enter choice:
```
