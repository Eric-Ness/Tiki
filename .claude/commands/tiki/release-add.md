---
type: prompt
name: tiki:release-add
description: Add one or more issues to a release with optional requirements mapping. Supports batch adding and --to flag for specific versions.
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
argument-hint: <issue> [<issue>...] [--to <version>]
---

# Release Add

Add one or more GitHub issues to a release with optional requirements mapping.

## Usage

```text
/tiki:release-add 34                    # Add single issue to active release
/tiki:release-add 34 --to v1.2          # Add single issue to specific release
/tiki:release-add 23 24 25              # Add multiple issues to active release
/tiki:release-add 23 24 25 --to v1.2    # Add multiple issues to specific release
```

**Arguments:**
- `<issue>` (required): One or more issue numbers (space-separated)
- `--to <version>` (optional): Target release version (defaults to most recent active release)

## Helper Functions

The following helper functions are used by this command. They are implemented inline.

### loadRelease(version)

Loads a release file by version identifier.

```javascript
function loadRelease(version) {
  // Normalize version (add 'v' prefix if missing for file lookup)
  const normalized = version.startsWith('v') ? version : `v${version}`;

  // Check active releases first
  const activePath = `.tiki/releases/${normalized}.json`;
  if (fileExists(activePath)) {
    return { data: readJSON(activePath), archived: false };
  }

  // Check archived releases
  const archivePath = `.tiki/releases/archive/${normalized}.json`;
  if (fileExists(archivePath)) {
    return { data: readJSON(archivePath), archived: true };
  }

  return null; // Release not found
}
```

### saveRelease(version, data)

Saves a release file to the appropriate location.

```javascript
function saveRelease(version, data) {
  const normalized = version.startsWith('v') ? version : `v${version}`;

  if (data.status === 'shipped') {
    // Save to archive
    const path = `.tiki/releases/archive/${normalized}.json`;
    writeJSON(path, data);
  } else {
    // Save to active releases
    const path = `.tiki/releases/${normalized}.json`;
    writeJSON(path, data);
  }
}
```

### findReleaseForIssue(issueNumber)

Finds which release contains a specific issue.

```javascript
function findReleaseForIssue(issueNumber) {
  // Glob for all active release files
  const releaseFiles = glob('.tiki/releases/*.json');

  for (const file of releaseFiles) {
    const release = readJSON(file);
    const issue = release.issues.find(i => i.number === issueNumber);
    if (issue) {
      return { release, version: release.version };
    }
  }

  return null; // Issue not in any release
}
```

### getActiveRelease()

Finds the currently active release (most recent if multiple exist).

```javascript
function getActiveRelease() {
  const releaseFiles = glob('.tiki/releases/*.json');

  if (releaseFiles.length === 0) {
    return null;
  }

  // Sort by createdAt, most recent first
  const releases = releaseFiles
    .map(f => readJSON(f))
    .filter(r => r.status === 'active')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return releases[0] || null;
}
```

## Instructions

### Step 1: Parse Arguments

Parse the arguments to extract issue numbers and optional version flag:

```text
Arguments: $ARGUMENTS
Expected format: <issue> [<issue>...] [--to <version>]

Extract:
- issueNumbers: Array of issue numbers (e.g., [38, 39, 40])
- targetVersion: Optional version string from --to flag
```

**Parsing Logic:**

```javascript
function parseAddArguments(args) {
  const tokens = args.split(/\s+/).filter(t => t);
  const issueNumbers = [];
  let targetVersion = null;

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '--to' && tokens[i + 1]) {
      targetVersion = tokens[i + 1];
      i++; // Skip the version token
    } else if (/^\d+$/.test(tokens[i])) {
      issueNumbers.push(parseInt(tokens[i], 10));
    }
  }

  return { issueNumbers, targetVersion };
}
```

If no issue numbers provided:

```text
## Missing Issue Number

Usage: /tiki:release-add <issue> [<issue>...] [--to <version>]

Examples:
  /tiki:release-add 38                    # Add single issue
  /tiki:release-add 38 39 40              # Add multiple issues
  /tiki:release-add 38 --to v1.2          # Add to specific release
  /tiki:release-add 38 39 40 --to v1.2    # Add multiple to specific release
```

### Step 2: Determine Target Release

**If `--to <version>` is specified:**

```bash
# Normalize version
VERSION="${targetVersion}"
if [[ ! "$VERSION" =~ ^v ]]; then
  VERSION="v${VERSION}"
fi

# Check if release exists
if [ -f ".tiki/releases/${VERSION}.json" ]; then
  cat ".tiki/releases/${VERSION}.json"
else
  echo "RELEASE_NOT_FOUND"
fi
```

If release not found:

```text
## Release Not Found

Release "{version}" not found.

Available active releases:
{List active releases from .tiki/releases/*.json}

To create a new release:
  /tiki:release-new {version}
```

**If no `--to` flag (use most recent active release):**

```bash
# Find most recent active release
ls -t .tiki/releases/*.json 2>/dev/null | head -1
```

If no active releases exist:

```text
## No Active Release

No active releases found. Create a release first:

  /tiki:release-new <version>

Example:
  /tiki:release-new v1.1
```

### Step 3: Validate Issues

For each issue number in the list, perform validation:

**Step 3a: Fetch Issue from GitHub**

```bash
gh issue view <number> --json number,title,state,labels,body
```

**Validation Checks:**

```javascript
async function validateIssue(issueNumber, targetRelease) {
  const errors = [];
  const warnings = [];

  // Check 1: Issue exists on GitHub
  try {
    const issue = await fetchGitHubIssue(issueNumber);
    if (!issue) {
      errors.push(`Issue #${issueNumber} not found on GitHub`);
      return { valid: false, errors, warnings };
    }

    // Check 2: Issue is not closed
    if (issue.state === 'CLOSED') {
      errors.push(`Issue #${issueNumber} is already closed`);
    }

    // Check 3: Issue is not already in target release
    const inTargetRelease = targetRelease.issues.find(i => i.number === issueNumber);
    if (inTargetRelease) {
      errors.push(`Issue #${issueNumber} is already in release ${targetRelease.version}`);
    }

    // Check 4: Issue is not in another release
    const existingRelease = findReleaseForIssue(issueNumber);
    if (existingRelease && existingRelease.version !== targetRelease.version) {
      warnings.push({
        type: 'in_other_release',
        issueNumber,
        currentRelease: existingRelease.version,
        message: `Issue #${issueNumber} is in release ${existingRelease.version}`
      });
    }

    return {
      valid: errors.length === 0,
      issue,
      errors,
      warnings
    };
  } catch (e) {
    errors.push(`Failed to fetch issue #${issueNumber}: ${e.message}`);
    return { valid: false, errors, warnings };
  }
}
```

**Handle Validation Errors:**

If any issues have errors:

```text
## Validation Errors

The following issues cannot be added:

| Issue | Error |
|-------|-------|
| #99 | Issue not found on GitHub |
| #38 | Issue is already closed |
| #42 | Issue is already in release v1.1 |

{If some issues are valid:}
Proceeding with {validCount} valid issues: #{validIssues.join(', #')}

{If no issues are valid:}
No valid issues to add. Please check the issue numbers and try again.
```

**Handle Issue in Another Release (Warning):**

If an issue is in another release, prompt the user:

```text
## Issue Already in Release

Issue #{number} "{title}" is currently in release {currentRelease}.

What would you like to do?

1. **Move** - Remove from {currentRelease} and add to {targetRelease}
2. **Skip** - Leave in {currentRelease}, don't add to {targetRelease}
3. **Cancel** - Stop the add operation entirely

Enter choice:
```

Handle each option:
- **Move**: Call remove logic first, then continue with add
- **Skip**: Remove from the issues list being added
- **Cancel**: Exit with message "No changes made."

### Step 4: Single Issue Flow

If only one issue is being added, show detailed view:

```text
## Adding Issue to Release

### Issue Details

| Field | Value |
|-------|-------|
| Number | #{number} |
| Title | {title} |
| State | {state} |
| Labels | {labels.join(', ') or 'None'} |

### Target Release

| Field | Value |
|-------|-------|
| Version | {targetRelease.version} |
| Current Issues | {targetRelease.issues.length} |
| Status | active |
```

**Check for Existing Plan:**

```bash
if [ -f ".tiki/plans/issue-${number}.json" ]; then
  cat ".tiki/plans/issue-${number}.json"
fi
```

If plan exists, show status:

```text
### Existing Plan Found

Issue #{number} has an existing Tiki plan:
- Phases: {totalPhases}
- Status: {plan.status}
- Completed phases: {completedPhases}/{totalPhases}

Issue will be added with status: {derived status}
```

**Requirements Mapping (if enabled):**

If `targetRelease.requirementsEnabled` is true, prompt for requirements:

```text
### Requirements Mapping

{If requirements.json exists:}
Map this issue to requirements?

{Analyze issue title and body for keyword matches:}
Based on the issue content, suggested requirements:
{List suggested requirement IDs with descriptions}

1. **Accept** - Map to suggested requirements
2. **Edit** - Choose different requirements
3. **Skip** - No requirements for this issue
4. **View all** - See all available requirements

Enter choice:
```

**Suggestion Logic:**

```javascript
function suggestRequirements(issue, requirementsData) {
  const suggestions = [];
  const text = `${issue.title} ${issue.body || ''}`.toLowerCase();
  const labels = (issue.labels || []).map(l => l.name.toLowerCase());

  for (const category of requirementsData.categories) {
    for (const req of category.requirements) {
      // Match by keywords in requirement text
      const reqKeywords = req.text.toLowerCase().split(/\s+/);
      const matches = reqKeywords.filter(kw =>
        kw.length > 3 && (text.includes(kw) || labels.some(l => l.includes(kw)))
      );

      if (matches.length >= 2) {
        suggestions.push({
          id: req.id,
          text: req.text,
          category: category.name,
          confidence: matches.length
        });
      }
    }
  }

  // Sort by confidence and return top 5
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}
```

**Edit Requirements Flow:**

If user selects "Edit":

```text
## Select Requirements for Issue #{number}

Available requirements by category:

### Core
| ID | Requirement |
|----|-------------|
| CORE-01 | User login functionality |
| CORE-02 | User registration |
| CORE-03 | Password reset |

### UI
| ID | Requirement |
|----|-------------|
| UI-01 | Support theming |
| UI-02 | Remember user preferences |

### Performance
| ID | Requirement |
|----|-------------|
| PERF-01 | Page load under 2s |

Enter requirement IDs (comma-separated), or "none" to skip:
Example: CORE-01,UI-02

Enter selection:
```

Validate entered IDs against available requirements.

### Step 5: Multiple Issues Flow

If multiple issues are being added, use batch mode:

```text
## Adding {count} Issues to Release {version}

### Issues to Add

| # | Title | Labels | Status |
|---|-------|--------|--------|
| 23 | Fix authentication bug | bug | Valid |
| 24 | Add dark mode toggle | feature, ui | Valid |
| 25 | Update API documentation | docs | Valid |

```

**Batch Requirements Mapping (if enabled):**

```text
### Requirements Mapping

Requirements tracking is enabled for this release.

How would you like to map requirements?

1. **Auto-map** - Accept suggested mappings for all issues
2. **Review each** - Approve/edit mapping for each issue
3. **Skip all** - Add issues without requirement mapping (can map later)

Enter choice:
```

**Option 1: Auto-map**

Show the batch table with suggestions:

```text
## Auto-Mapped Requirements

| # | Title | Suggested Requirements |
|---|-------|------------------------|
| 23 | Fix authentication bug | AUTH-01, AUTH-03 |
| 24 | Add dark mode toggle | UI-01 |
| 25 | Update API documentation | DOC-01, DOC-02 |

Accept these mappings?

1. **Yes** - Add all issues with these mappings
2. **Edit** - Modify specific mappings
3. **Cancel** - Go back to mapping options

Enter choice:
```

**Option 2: Review Each**

For each issue in the batch, show the single-issue requirements flow (Step 4 mapping section).

**Option 3: Skip All**

Proceed without requirements mapping. Issues will have empty `requirements` arrays.

### Step 6: Update Release File

Build issue entries and update the release:

```javascript
function buildIssueEntry(issue, requirements, plan, currentState) {
  // Determine status from existing plan/state
  let status = 'not_planned';
  let currentPhase = null;
  let totalPhases = null;
  let completedAt = null;

  if (plan) {
    totalPhases = plan.phases?.length || null;
    const completedPhases = plan.phases?.filter(p => p.status === 'completed').length || 0;

    if (completedPhases === totalPhases && totalPhases > 0) {
      status = 'completed';
      completedAt = plan.completedAt || new Date().toISOString();
    } else if (completedPhases > 0 || currentState?.activeIssue === issue.number) {
      status = 'in_progress';
      currentPhase = completedPhases + 1;
    } else if (totalPhases > 0) {
      status = 'planned';
    }
  }

  return {
    number: issue.number,
    title: issue.title,
    status,
    requirements: requirements || [],
    currentPhase,
    totalPhases,
    completedAt
  };
}

// Add all issues to release
for (const issueData of validatedIssues) {
  const entry = buildIssueEntry(
    issueData.issue,
    issueData.requirements,
    issueData.plan,
    currentState
  );
  release.issues.push(entry);
}

// Update requirements totals
if (release.requirementsEnabled) {
  const allReqIds = new Set();
  for (const issue of release.issues) {
    for (const reqId of issue.requirements || []) {
      allReqIds.add(reqId);
    }
  }
  release.requirements.total = allReqIds.size;

  // Count implemented (requirements addressed by completed issues)
  const implementedReqs = new Set();
  for (const issue of release.issues) {
    if (issue.status === 'completed') {
      for (const reqId of issue.requirements || []) {
        implementedReqs.add(reqId);
      }
    }
  }
  release.requirements.implemented = implementedReqs.size;
}

// Save the release file
saveRelease(release.version, release);
```

**Write Updated Release File:**

```bash
# Write to release file
cat > ".tiki/releases/${VERSION}.json" << 'EOF'
{release JSON}
EOF
```

### Step 7: GitHub Milestone Sync

If the release has a linked GitHub milestone, assign the issues:

```bash
# Check if release has milestone
if [ -n "${MILESTONE_NUMBER}" ]; then
  for issue_number in ${ISSUE_NUMBERS}; do
    gh issue edit ${issue_number} --milestone "${MILESTONE_TITLE}"
  done
fi
```

Track results:

```text
### Milestone Sync

{If release has milestone:}
Assigning issues to milestone "{version}":

| Issue | Status |
|-------|--------|
| #23 | Assigned |
| #24 | Assigned |
| #25 | Failed: Already assigned to v1.0 |

{successes}/{total} issues assigned to milestone.
```

### Step 8: Display Updated Progress

Show the release status after adding issues:

```text
## Issues Added

Successfully added {count} issue(s) to release {version}.

### Added Issues

| # | Title | Status | Requirements |
|---|-------|--------|--------------|
| 23 | Fix authentication bug | not_planned | AUTH-01, AUTH-03 |
| 24 | Add dark mode toggle | not_planned | UI-01 |
| 25 | Update API documentation | planned | DOC-01, DOC-02 |

### Updated Release Progress

{progressBar} {progress}%

{completed}/{total} issues complete

| Status | Count |
|--------|-------|
| Completed | {completed} |
| In Progress | {inProgress} |
| Planned | {planned} |
| Not Planned | {notPlanned} |

{If requirementsEnabled:}
### Requirements Coverage

| Metric | Value |
|--------|-------|
| Total Requirements | {total} |
| Implemented | {implemented} |
| Coverage | {percent}% |

### Next Steps

{If issues are not_planned:}
Plan the newly added issues:
  /tiki:get-issue {firstNotPlanned}
  /tiki:plan-issue

{If issues are planned:}
Start executing planned issues:
  /tiki:get-issue {firstPlanned}
  /tiki:execute
```

## Error Handling

### Issue Not Found on GitHub

```text
## Issue Not Found

Issue #{number} was not found on GitHub.

Possible causes:
- Issue number is incorrect
- Issue was deleted
- Repository access issue

Verify the issue exists:
  gh issue view {number}
```

### Issue Already Closed

```text
## Issue Already Closed

Issue #{number} "{title}" is already closed.

Closed issues typically should not be added to releases.

Options:
1. Reopen the issue first: `gh issue reopen {number}`
2. Skip this issue

Would you like to add it anyway? [y/N]
```

If user confirms, add with status "completed".

### Issue Already in Target Release

```text
## Issue Already in Release

Issue #{number} "{title}" is already in release {version}.

Current status in release: {status}

No action needed. Use `/tiki:release-status {version}` to view release details.
```

### No Active Releases Exist

```text
## No Active Release

Cannot add issues - no active releases found.

Create a release first:
  /tiki:release-new <version>

Example:
  /tiki:release-new v1.1
  /tiki:release-add {issueNumbers.join(' ')} --to v1.1
```

### Requirements File Not Found (when release has requirements enabled)

```text
## Requirements File Missing

Release {version} has requirements enabled, but no requirements file found.

Options:
1. **Continue without mapping** - Add issues without requirement mapping
2. **Define requirements** - Run /tiki:define-requirements first
3. **Cancel** - Exit without changes

Enter choice:
```
