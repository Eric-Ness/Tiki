---
type: prompt
name: tiki:release-remove
description: Remove an issue from its release
allowed-tools: Bash, Read, Write, Glob, Grep
argument-hint: <issue>
---

# Release Remove

Remove an issue from a release with optional handling of orphaned requirements.

## Usage

```text
/tiki:release-remove 34
```

**Arguments:**
- `<issue>` (required): Single issue number to remove

## Helper Functions

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
      return { release, version: release.version, filePath: file };
    }
  }

  return null; // Issue not in any release
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

### findOrphanedRequirements(release, issueNumber)

Checks if removing an issue would leave requirements orphaned.

```javascript
function findOrphanedRequirements(release, issueNumber) {
  const issueToRemove = release.issues.find(i => i.number === issueNumber);
  if (!issueToRemove || !issueToRemove.requirements?.length) {
    return [];
  }

  const orphaned = [];

  for (const reqId of issueToRemove.requirements) {
    // Check if any other issue in the release addresses this requirement
    const otherIssueWithReq = release.issues.find(i =>
      i.number !== issueNumber &&
      i.requirements?.includes(reqId)
    );

    if (!otherIssueWithReq) {
      orphaned.push(reqId);
    }
  }

  return orphaned;
}
```

## Flow

### Step 1: Parse Arguments

Parse the arguments to extract the issue number:

```text
Arguments: $ARGUMENTS
Expected format: <issue>

Extract:
- issueNumber: The issue number to remove
```

If no issue number provided:

```text
## Missing Issue Number

Usage: /tiki:release-remove <issue>

Example:
  /tiki:release-remove 34

To see which release an issue belongs to:
  /tiki:release-status
```

### Step 2: Find Issue's Release

Scan all active releases to find which one contains the issue:

```bash
# Search through all active release files
for file in .tiki/releases/*.json; do
  if [ -f "$file" ]; then
    # Check if this release contains the issue
    if grep -q "\"number\": ${ISSUE_NUMBER}" "$file" 2>/dev/null; then
      echo "FOUND:$file"
      cat "$file"
      break
    fi
  fi
done
```

If issue not found in any release:

```text
## Issue Not in Any Release

Issue #{number} is not assigned to any release.

To add it to a release:
  /tiki:release-add {number}
  /tiki:release-add {number} --to <version>

To view all releases:
  /tiki:release-status
```

### Step 3: Display Issue Details

Show the issue being removed:

```text
## Remove Issue from Release

### Issue Details

| Field | Value |
|-------|-------|
| Number | #{number} |
| Title | {title} |
| Status | {status} |
| Release | {version} |
| Requirements | {requirements.join(', ') or 'None'} |

{If issue has phases:}
| Phases | {currentPhase}/{totalPhases} |
```

### Step 4: Handle Orphaned Requirements

If the issue is mapped to requirements, check if removing it would leave requirements orphaned (not addressed by any other issue):

**If orphaned requirements exist:**

```text
### Orphaned Requirements Warning

Removing this issue will leave the following requirements unaddressed:

| ID | Requirement |
|----|-------------|
| AUTH-01 | User login functionality |
| AUTH-03 | Password reset capability |

These requirements will no longer be covered by any issue in release {version}.

How would you like to handle this?

1. **Keep requirements** - Remove issue but keep requirements in release tracking
2. **Clear requirements** - Remove issue and reset requirement counts
3. **Cancel** - Don't remove the issue

Enter choice:
```

**Option 1: Keep requirements**

The requirements remain tracked but show as "not_covered" in status.

**Option 2: Clear requirements**

Update requirements totals after removal.

**Option 3: Cancel**

Exit with message "No changes made."

**If no orphaned requirements:**

Proceed directly to removal confirmation.

### Step 5: Confirm Removal

```text
Confirm removal of issue #{number} from release {version}? [y/N]
```

If user confirms, proceed to Step 6.

If user declines:

```text
## Cancelled

Issue #{number} was not removed from release {version}.
```

### Step 6: Update Release File

Remove the issue from the release:

```javascript
// Remove issue from array
release.issues = release.issues.filter(i => i.number !== issueNumber);

// Update requirements totals if enabled
if (release.requirementsEnabled) {
  // Recalculate total requirements covered
  const allReqIds = new Set();
  for (const issue of release.issues) {
    for (const reqId of issue.requirements || []) {
      allReqIds.add(reqId);
    }
  }
  release.requirements.total = allReqIds.size;

  // Recalculate implemented requirements
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

// Save updated release
saveRelease(release.version, release);
```

**Write Updated Release File:**

```bash
cat > ".tiki/releases/${VERSION}.json" << 'EOF'
{updated release JSON}
EOF
```

### Step 7: GitHub Milestone Sync

If the release has a linked GitHub milestone, remove the milestone from the issue:

```bash
# Check if release has milestone
if [ -n "${MILESTONE_NUMBER}" ]; then
  # Remove milestone from issue (set to empty)
  gh issue edit ${ISSUE_NUMBER} --milestone ""
fi
```

Report result:

```text
{If milestone was linked:}
### Milestone Update

Removed milestone "{version}" from issue #{number}.
```

### Step 8: Display Updated Progress

Show the release status after removal:

```text
## Issue Removed

Issue #{number} "{title}" removed from release {version}.

### Updated Release Status

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

| Metric | Before | After |
|--------|--------|-------|
| Total | {oldTotal} | {newTotal} |
| Implemented | {oldImplemented} | {newImplemented} |
| Coverage | {oldPercent}% | {newPercent}% |

{If orphaned requirements were kept:}
### Uncovered Requirements

The following requirements are no longer addressed by any issue:

| ID | Requirement |
|----|-------------|
| AUTH-01 | User login functionality |

Consider adding another issue to address these requirements:
  gh issue list --state open
  /tiki:release-add <issue-number>

### Next Steps

{If release still has issues:}
View updated release status:
  /tiki:release-status {version}

{If release is now empty:}
Release {version} is now empty.

Add issues:
  /tiki:release-add <issue-number> --to {version}

Or delete the release:
  rm .tiki/releases/{version}.json
```

## Error Handling

### Issue Not Found in Any Release

```text
## Issue Not in Release

Issue #{number} is not assigned to any active release.

{If issue exists on GitHub:}
Issue #{number} exists on GitHub but is not in any Tiki release.

To add it to a release:
  /tiki:release-add {number}

{If issue doesn't exist on GitHub:}
Issue #{number} was not found on GitHub either.
Please verify the issue number.
```

### Release File Corrupted

If the release file cannot be parsed:

```text
## Release File Error

Unable to read release file for {version}.
File may be corrupted or improperly formatted.

To recover:
1. Check the file manually: cat .tiki/releases/{version}.json
2. Fix JSON syntax errors
3. Try the command again

Or create a backup and start fresh:
  mv .tiki/releases/{version}.json .tiki/releases/{version}.json.backup
  /tiki:release-new {version}
```

### Permission Error

If unable to write to release file:

```text
## Permission Error

Unable to update release file: .tiki/releases/{version}.json

Check file permissions and try again:
  ls -la .tiki/releases/
```
