---
type: prompt
name: tiki:release-new
description: Create a new release version with interactive issue selection
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
argument-hint: <version> [--sync-github]
---

# Release New

Create a new release version with interactive issue selection.

## Usage

```text
/tiki:release-new v1.1
/tiki:release-new v1.1 --sync-github
/tiki:release-new 2.0.0-beta
```

**Arguments:**
- `<version>` (required): Version identifier (e.g., v1.1, 2.0.0-beta)
- `--sync-github` (optional): Create and sync GitHub milestone

## Helper Functions

The following helper functions are used by this command. These are implemented inline.

### validateVersion(version)

Validates that a version string follows semver-like format.

```javascript
function validateVersion(version) {
  // Accept: v1.0.0, v1.1, 2.0.0-beta, v1.0.0-rc.1
  const pattern = /^v?\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?$/;
  return pattern.test(version);
}
```

Valid examples:
- `v1.0.0` - Full semver with prefix
- `v1.1` - Major.minor with prefix
- `2.0.0-beta` - Without prefix, with prerelease
- `v1.0.0-rc.1` - With release candidate

Invalid examples:
- `version1` - No version number
- `1` - Missing minor version
- `v1.0.0.0` - Too many segments

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

## Instructions

### Step 1: Parse and Validate Arguments

Parse the arguments to extract version and flags:

```text
Arguments: $ARGUMENTS
Expected format: <version> [--sync-github]

Extract:
- version: The version string (e.g., "v1.1", "2.0.0-beta")
- syncGithub: true if --sync-github flag is present
```

Validate the version format using the validateVersion() helper.

If version is missing or invalid:

```text
## Invalid Version

{If missing:}
Missing version argument.

{If invalid:}
Invalid version format: "{version}"

Version must follow semver-like format:
- v1.0.0 (full version with prefix)
- v1.1 (major.minor with prefix)
- 2.0.0-beta (with prerelease identifier)
- v1.0.0-rc.1 (release candidate)

Usage:
  /tiki:release-new v1.2
  /tiki:release-new v2.0.0-beta --sync-github
```

### Step 2: Check for Existing Release

Check if a release file already exists:

```bash
# Normalize version (add 'v' prefix if missing)
VERSION="v1.1"  # or user-provided value
if [ -f ".tiki/releases/${VERSION}.json" ]; then
  echo "RELEASE_EXISTS"
fi
```

If release already exists, use AskUserQuestion to prompt the user:

```text
## Release Already Exists

Release {version} already exists.

What would you like to do?

1. View existing - Show current release status
2. Overwrite - Delete existing and create fresh (issues will be removed)
3. Cancel - Exit without changes

Enter choice:
```

Handle each option:
- **View existing**: Run `/tiki:release-status {version}` and exit
- **Overwrite**: Backup existing file, then continue with creation
  ```bash
  mv .tiki/releases/${VERSION}.json .tiki/releases/${VERSION}.json.backup.$(date +%Y%m%d%H%M%S)
  ```
- **Cancel**: Exit with message "No changes made."

### Step 3: Check Requirements Configuration

Check if project requirements are defined:

```bash
if [ -f ".tiki/requirements.json" ]; then
  echo "REQUIREMENTS_FOUND"
  cat .tiki/requirements.json
else
  echo "REQUIREMENTS_NOT_FOUND"
fi
```

**If requirements.json does NOT exist:**

Use AskUserQuestion to prompt the user:

```text
## Requirements Not Configured

No requirements file found (.tiki/requirements.json).

Requirements help track which issues address which product needs, enabling
better release coverage analysis.

Options:

1. Continue without requirements - Create release without requirement tracking
2. Define requirements first - Run /tiki:define-requirements before continuing
3. Cancel - Exit without creating release

Enter choice:
```

Handle each option:
- **Continue without requirements**: Set `requirementsEnabled: false` and proceed
- **Define requirements first**: Exit with message suggesting user run `/tiki:define-requirements`
- **Cancel**: Exit with message "No changes made."

**If requirements.json exists:**

Set `requirementsEnabled: true` and load the requirements for later mapping.

Store the requirements data:

```json
{
  "requirementsEnabled": true,
  "requirementsData": {
    "categories": [...],
    "totalRequirements": 15
  }
}
```

### Step 4: Fetch Open GitHub Issues

Fetch all open issues from GitHub:

```bash
gh issue list --state open --json number,title,body,labels --limit 100
```

**If gh command fails:**

```text
## GitHub CLI Error

Unable to fetch issues from GitHub.

Possible causes:
- GitHub CLI (gh) is not installed
- Not authenticated: run `gh auth login`
- Not in a git repository
- No remote repository configured

Options:
1. Create empty release - Proceed without any issues (add manually later)
2. Cancel - Exit and fix GitHub CLI first

Enter choice:
```

**If no open issues found:**

```text
## No Open Issues

No open issues found in this repository.

Options:
1. Create empty release - Proceed with no issues (add manually later)
2. Cancel - Exit without creating release

Enter choice:
```

### Step 5: Group Issues by Theme

Analyze issue titles, bodies, and labels to group them into categories:

**Grouping Logic:**

```text
For each issue:
  1. Check labels first (highest priority for categorization):
     - Labels containing "bug", "fix", "defect" -> "Bug Fixes"
     - Labels containing "feature", "enhancement" -> "Features"
     - Labels containing "docs", "documentation" -> "Documentation"
     - Labels containing "security", "auth" -> "Security"
     - Labels containing "performance", "perf" -> "Performance"
     - Labels containing "tech-debt", "refactor", "cleanup" -> "Technical Debt"
     - Labels containing "test" -> "Testing"

  2. If no label match, analyze title keywords:
     - Contains "fix", "bug", "error", "crash" -> "Bug Fixes"
     - Contains "add", "implement", "create", "new" -> "Features"
     - Contains "update", "improve", "enhance" -> "Enhancements"
     - Contains "doc", "readme" -> "Documentation"
     - Contains "refactor", "cleanup", "tech debt" -> "Technical Debt"
     - Default -> "Other"

  3. Build grouped structure:
     {
       "Features": [
         {"number": 42, "title": "Add dark mode", "labels": ["feature", "ui"]},
         {"number": 45, "title": "Implement SSO login", "labels": ["feature"]}
       ],
       "Bug Fixes": [
         {"number": 38, "title": "Fix login timeout", "labels": ["bug"]}
       ],
       "Documentation": [],
       "Security": [],
       "Performance": [],
       "Technical Debt": [],
       "Other": []
     }
```

**Display grouped issues:**

```text
## Open Issues by Theme

Found {total} open issues grouped into themes:

### Features (5 issues)
| # | Title | Labels |
|---|-------|--------|
| 42 | Add dark mode toggle | feature, ui |
| 45 | Implement SSO authentication | feature, auth |
| 48 | Add export to CSV | feature |
| 51 | User profile customization | feature, ui |
| 55 | Webhook integrations | feature, api |

### Bug Fixes (3 issues)
| # | Title | Labels |
|---|-------|--------|
| 38 | Fix login redirect loop | bug, critical |
| 41 | Memory leak in worker | bug |
| 44 | Date picker timezone issue | bug, ui |

### Enhancements (2 issues)
| # | Title | Labels |
|---|-------|--------|
| 52 | Improve search performance | enhancement, perf |
| 53 | Better error messages | enhancement, ux |

### Documentation (1 issue)
| # | Title | Labels |
|---|-------|--------|
| 50 | Update API documentation | docs |

### Other (1 issue)
| # | Title | Labels |
|---|-------|--------|
| 47 | Investigate flaky test | test |

---

Total: 12 open issues across 5 themes
```

### Step 6: Interactive Issue Selection

Use AskUserQuestion to let the user select issues for the release:

```text
## Issue Selection

How would you like to select issues for release {version}?

1. **By category** - Select entire categories (e.g., all Features)
2. **Individually** - Pick specific issues by number
3. **Recommended** - Let me suggest based on priority and dependencies
4. **All issues** - Include all {total} open issues in this release
5. **None** - Create empty release (add issues later)

Enter choice:
```

**Option 1: By Category**

```text
## Select by Category

Select categories to include (comma-separated, or "all"):

1. Features (5 issues)
2. Bug Fixes (3 issues)
3. Enhancements (2 issues)
4. Documentation (1 issue)
5. Other (1 issue)

Example: "1,2" for Features and Bug Fixes
Example: "all" for everything

Enter selection:
```

Parse selection and gather all issues from selected categories.

**Option 2: Individually**

```text
## Select Individual Issues

Enter issue numbers to include (comma-separated):

Available issues:
38, 41, 42, 44, 45, 47, 48, 50, 51, 52, 53, 55

Example: "42,45,38,41" to select issues #42, #45, #38, and #41

Enter selection:
```

Validate each number exists in the fetched issues.

**Option 3: Recommended**

Analyze issues using scoring similar to `/tiki:pick-issue`:

```text
Scoring factors:
- +3: Has priority label (high-priority, critical, urgent)
- +2: Has blocking label or enables other issues
- +1: Age > 2 weeks
- +0.5 per enabled issue
- -3: Has defer label (backlog, someday)
- -5: Blocked by another open issue

Recommend top N issues (up to 10) that are:
- Not blocked by other open issues
- Not deferred
- Sorted by score descending
```

Display recommendations:

```text
## Recommended Issues for {version}

Based on priority, age, and dependencies, I recommend these issues:

| # | Title | Score | Reason |
|---|-------|-------|--------|
| 38 | Fix login redirect loop | 8 | Critical bug, high-priority label |
| 42 | Add dark mode toggle | 5 | Feature, requested frequently |
| 45 | Implement SSO | 5 | Feature, enables #52 |
| 52 | Improve search performance | 4 | Enhancement, 3 weeks old |
| 50 | Update API documentation | 3 | Documentation gap |

Accept these recommendations?

1. Yes - Add all 5 recommended issues
2. Modify - Edit the list (add/remove)
3. Cancel - Go back to selection menu

Enter choice:
```

**Option 4: All Issues**

```text
## Confirm All Issues

Add all {total} open issues to release {version}?

This includes:
- {n} Features
- {n} Bug Fixes
- {n} Enhancements
- {n} Documentation
- {n} Other

Confirm? [y/N]
```

**Option 5: None**

Proceed with empty issues array.

### Step 7: Requirements Mapping Flow (if enabled)

If `requirementsEnabled` is true, prompt for requirement mapping for each selected issue:

```text
## Requirements Mapping

You've selected {n} issues. Let's map them to requirements.

For each issue, I'll suggest requirements based on keywords and labels.
You can confirm, modify, or skip.
```

For each selected issue:

**Step 7a: Suggest Requirements**

Analyze issue title and body for keywords that match requirement categories:

```text
Issue #42: Add dark mode toggle
Labels: feature, ui

Suggested requirements (based on keywords and labels):
- UI-01: System shall support theming
- UI-02: System shall remember user preferences

Map to these requirements?

1. Yes - Accept suggestions
2. Edit - Modify the mapping
3. Skip - No requirements for this issue
4. View all - See all available requirements

Enter choice:
```

**Step 7b: Edit Mapping**

If user selects "Edit":

```text
## Edit Requirements for Issue #42

Current mapping: UI-01, UI-02

Available requirements:
| ID | Text | Category |
|----|------|----------|
| CORE-01 | User login functionality | Core |
| CORE-02 | User registration | Core |
| UI-01 | Support theming | UI |
| UI-02 | Remember user preferences | UI |
| UI-03 | Responsive design | UI |
| PERF-01 | Page load under 2s | Performance |

Enter requirement IDs (comma-separated):
Example: "UI-01,UI-02,PERF-01"

Enter selection:
```

**Step 7c: View All Requirements**

If user selects "View all":

Display full requirements list grouped by category, then return to mapping prompt.

Store mappings for each issue:

```json
{
  "number": 42,
  "title": "Add dark mode toggle",
  "requirements": ["UI-01", "UI-02"]
}
```

**Batch Mode Option:**

For releases with many issues, offer batch mapping:

```text
## Batch Mapping Mode

You have 10 issues to map. Would you like to:

1. Map each individually - Go through each issue one by one
2. Auto-map all - Accept suggested mappings for all issues
3. Skip all - No requirement mapping (can add later)

Enter choice:
```

### Step 8: Create Release File

Build and write the release file to `.tiki/releases/<version>.json`:

```text
Ensure .tiki/releases directory exists:
```

```bash
mkdir -p .tiki/releases
```

Build release data structure:

```json
{
  "version": "v1.1",
  "createdAt": "2026-01-18T10:00:00Z",
  "status": "active",
  "requirementsEnabled": true,
  "githubMilestone": null,
  "issues": [
    {
      "number": 42,
      "title": "Add dark mode toggle",
      "status": "not_planned",
      "requirements": ["UI-01", "UI-02"],
      "currentPhase": null,
      "totalPhases": null,
      "completedAt": null
    },
    {
      "number": 38,
      "title": "Fix login redirect loop",
      "status": "not_planned",
      "requirements": ["AUTH-03"],
      "currentPhase": null,
      "totalPhases": null,
      "completedAt": null
    }
  ],
  "requirements": {
    "total": 3,
    "implemented": 0,
    "verified": 0
  }
}
```

Write the file using the Write tool.

### Step 9: GitHub Milestone Sync (if --sync-github)

If `--sync-github` flag was provided:

**Step 9a: Check for Existing Milestone**

```bash
gh api repos/:owner/:repo/milestones --jq '.[] | select(.title=="'${VERSION}'")'
```

**If milestone exists:**

```text
## Existing Milestone Found

A GitHub milestone "{version}" already exists:
- Number: {number}
- State: {open|closed}
- Open issues: {count}
- Closed issues: {count}
- URL: {url}

What would you like to do?

1. Link to existing - Use this milestone for the release
2. Create new - Create a new milestone (add suffix like "v1.1-2")
3. Skip - Don't link to any milestone

Enter choice:
```

**If no milestone exists, create one:**

```bash
gh api repos/:owner/:repo/milestones -f title="${VERSION}" -f state="open" -f description="Release ${VERSION}"
```

**Step 9b: Assign Issues to Milestone**

```bash
for issue_number in ${ISSUE_NUMBERS}; do
  gh issue edit ${issue_number} --milestone "${VERSION}"
done
```

Track success/failure:

```text
## Milestone Sync Results

Milestone: {version} ({url})

Issue assignment:
| Issue | Status |
|-------|--------|
| #42 | Assigned |
| #38 | Assigned |
| #45 | Failed: Already assigned to v1.0 |
| #52 | Assigned |

4/5 issues assigned successfully.

Note: Issue #45 is already assigned to milestone v1.0.
To reassign, first remove from existing milestone.
```

Update release file with milestone info:

```json
{
  "githubMilestone": {
    "number": 5,
    "url": "https://github.com/owner/repo/milestone/5"
  }
}
```

### Step 10: Display Summary

Display a comprehensive summary of what was created:

```text
## Release Created

### Release: {version}

| Field | Value |
|-------|-------|
| Version | {version} |
| Status | active |
| Created | {timestamp} |
| Issues | {count} |
| Requirements Enabled | {yes/no} |
| GitHub Milestone | {url or "None"} |

### Issues Included

| # | Title | Requirements |
|---|-------|--------------|
| 42 | Add dark mode toggle | UI-01, UI-02 |
| 38 | Fix login redirect loop | AUTH-03 |
| 45 | Implement SSO | AUTH-01, AUTH-02 |
| 52 | Improve search performance | PERF-01 |
| 50 | Update API documentation | DOC-01 |

**Total: 5 issues**

{If requirementsEnabled:}
### Requirements Coverage

| Category | Total | In Release | Coverage |
|----------|-------|------------|----------|
| AUTH | 5 | 3 | 60% |
| UI | 3 | 2 | 67% |
| PERF | 2 | 1 | 50% |
| DOC | 4 | 1 | 25% |

**Overall: 7/14 requirements (50%) addressed in this release**

{If multiple active releases exist:}
### Note: Multiple Active Releases

You have multiple active releases:
- v1.0 (3 issues remaining)
- v1.1 (5 issues) <- just created

This is supported. Use `/tiki:release-status <version>` to view a specific release.

### Next Steps

1. **Start working on an issue:**
   ```
   /tiki:get-issue 38
   /tiki:plan-issue
   ```

2. **View release status:**
   ```
   /tiki:release-status
   ```

3. **Add more issues:**
   ```
   /tiki:release-add <issue-number>
   ```

4. **When ready to ship:**
   ```
   /tiki:release-ship {version}
   ```

---

Release file saved to: `.tiki/releases/{version}.json`
```

## Edge Cases

### No Open Issues

```text
## No Open Issues

No open issues found in this repository.

Created empty release {version}. Add issues manually:
  /tiki:release-add <issue-number>

Or create new issues first:
  gh issue create
```

### GitHub CLI Not Available

```text
## GitHub CLI Unavailable

Cannot fetch issues - GitHub CLI (gh) not available or not authenticated.

Options:
1. Create empty release (add issues manually later)
2. Cancel and set up GitHub CLI first

Note: --sync-github flag will be ignored.
```

Proceed with empty release if user chooses option 1.

### Multiple Active Releases

This is supported. When displaying any release information, note the existence of other active releases:

```text
Note: You have 2 active releases:
- v1.0: 3 issues (2 in progress, 1 not started)
- v1.1: 5 issues <- current

Use `/tiki:release-status <version>` to switch context.
```

### Invalid Issue Numbers in Selection

```text
## Invalid Selection

The following issue numbers were not found: #99, #100

Valid issues: 38, 41, 42, 44, 45, 47, 48, 50, 51, 52, 53, 55

Please re-enter your selection:
```

### Requirement Mapping with No Matches

```text
## Issue #47: Investigate flaky test

No requirement suggestions found based on keywords.

Options:
1. Enter requirements manually
2. Skip - No requirements for this issue
3. View all requirements

Enter choice:
```
