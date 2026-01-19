---
type: prompt
name: tiki:release
description: Manage releases with subcommands: new, status, add, remove, ship, yolo, sync. Group issues into versions and track progress.
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion, Skill, Task
argument-hint: <subcommand> [args...] (new <version> | status [version] | add <issue> [--to <version>] | remove <issue> | ship <version> | yolo <version> | sync <version>)
---

# Release

Manage releases by grouping GitHub issues into versions and tracking implementation progress.

## Usage

```text
/tiki:release new v1.1              # Create a new release
/tiki:release status                # Show status of active release
/tiki:release status v1.1           # Show status of specific release
/tiki:release add 34                # Add issue #34 to active release
/tiki:release add 34 --to v1.2      # Add issue #34 to specific release
/tiki:release remove 34             # Remove issue #34 from its release
/tiki:release ship v1.1             # Ship a release (close, tag, archive)
/tiki:release yolo v1.1             # Automated execution of entire release
/tiki:release yolo v1.1 --dry-run   # Preview what yolo would do
/tiki:release yolo v1.1 --continue  # Resume paused yolo execution
/tiki:release sync v1.1             # Sync Tiki release state to GitHub milestone
/tiki:release sync v1.1 --pull      # Pull GitHub milestone state to Tiki
/tiki:release sync v1.1 --two-way   # Bidirectional sync (merge both)
```

## State File Schemas

### Active Release Schema

Location: `.tiki/releases/<version>.json`

Active releases are stored in the releases directory and track ongoing work.

```json
{
  "version": "v1.1",
  "createdAt": "2026-01-10T10:00:00Z",
  "status": "active",
  "requirementsEnabled": true,
  "githubMilestone": {
    "number": 1,
    "url": "https://github.com/owner/repo/milestone/1"
  },
  "issues": [
    {
      "number": 34,
      "title": "Add user authentication",
      "status": "not_planned",
      "requirements": ["AUTH-01", "AUTH-02"],
      "currentPhase": null,
      "totalPhases": null,
      "completedAt": null
    },
    {
      "number": 35,
      "title": "Fix login redirect",
      "status": "in_progress",
      "requirements": ["AUTH-03"],
      "currentPhase": 2,
      "totalPhases": 3,
      "completedAt": null
    },
    {
      "number": 36,
      "title": "Update docs",
      "status": "completed",
      "requirements": ["DOC-01"],
      "currentPhase": null,
      "totalPhases": 2,
      "completedAt": "2026-01-12T15:30:00Z"
    }
  ],
  "requirements": {
    "total": 5,
    "implemented": 2,
    "verified": 1
  }
}
```

#### Active Release Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Version identifier (e.g., "v1.1", "2.0.0-beta") |
| `createdAt` | string | ISO 8601 timestamp when release was created |
| `status` | string | Always "active" for active releases |
| `requirementsEnabled` | boolean | Whether requirements tracking is enabled for this release |
| `githubMilestone` | object\|null | Associated GitHub milestone (number and URL) or null |
| `issues` | array | Array of issue tracking objects |
| `requirements` | object | Requirements tracking summary |

#### Issue Tracking Object

| Field | Type | Description |
|-------|------|-------------|
| `number` | number | GitHub issue number |
| `title` | string | Issue title |
| `status` | string | One of: "not_planned", "planned", "in_progress", "completed" |
| `requirements` | array | Array of requirement IDs this issue addresses |
| `currentPhase` | number\|null | Current phase number if in progress, null otherwise |
| `totalPhases` | number\|null | Total phases if planned, null if not planned |
| `completedAt` | string\|null | ISO 8601 timestamp when completed, null if not done |

### Archived Release Schema

Location: `.tiki/releases/archive/<version>.json`

Archived releases contain all active release fields plus additional shipping metadata.

```json
{
  "version": "v1.1",
  "createdAt": "2026-01-10T10:00:00Z",
  "status": "shipped",
  "requirementsEnabled": true,
  "githubMilestone": {
    "number": 1,
    "url": "https://github.com/owner/repo/milestone/1"
  },
  "issues": [
    {
      "number": 34,
      "title": "Add user authentication",
      "status": "completed",
      "requirements": ["AUTH-01", "AUTH-02"],
      "currentPhase": null,
      "totalPhases": 3,
      "completedAt": "2026-01-14T10:00:00Z"
    }
  ],
  "requirements": {
    "total": 5,
    "implemented": 5,
    "verified": 5
  },
  "shippedAt": "2026-01-15T12:00:00Z",
  "shippedBy": "ericn",
  "gitTag": "v1.1.0",
  "summary": {
    "issuesCompleted": 5,
    "requirementsImplemented": 5,
    "requirementsVerified": 5,
    "durationDays": 7
  }
}
```

#### Additional Archived Release Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always "shipped" for archived releases |
| `shippedAt` | string | ISO 8601 timestamp when release was shipped |
| `shippedBy` | string | Username who shipped the release |
| `gitTag` | string\|null | Git tag created for this release, or null if no tag |
| `summary` | object | Summary statistics for the release |

#### Summary Object

| Field | Type | Description |
|-------|------|-------------|
| `issuesCompleted` | number | Total number of issues completed in this release |
| `requirementsImplemented` | number | Number of requirements implemented |
| `requirementsVerified` | number | Number of requirements verified |
| `durationDays` | number | Days from creation to shipping |

## Instructions

### Step 1: Parse Subcommand

Parse the argument to determine which subcommand to execute:

```text
$ARGUMENTS -> split by whitespace -> first token is subcommand
```

Valid subcommands:
- `new` - Create a new release
- `status` - Show release status
- `add` - Add an issue to a release
- `remove` - Remove an issue from a release
- `ship` - Ship and archive a release
- `yolo` - Automated release execution (plan, execute, ship all issues)
- `sync` - Synchronize release state with GitHub milestone

If no subcommand or invalid subcommand:
```text
## Release Management

Usage: /tiki:release <subcommand> [args...]

Subcommands:
  new <version>              Create a new release
  status [version]           Show release status (default: active release)
  add <issue> [--to version] Add issue to release
  remove <issue>             Remove issue from release
  ship <version>             Ship and archive release
  yolo <version>             Automated release execution
  sync <version>             Synchronize with GitHub milestone

Examples:
  /tiki:release new v1.2
  /tiki:release status
  /tiki:release add 34
  /tiki:release ship v1.1
  /tiki:release yolo v1.1
  /tiki:release sync v1.1
```

### Step 2: Route to Subcommand Handler

Based on the parsed subcommand, execute the appropriate handler:

#### Subcommand: new

```text
Arguments: new <version>
```

1. Validate version format using `validateVersion()`
2. Check if release already exists using `loadRelease()`
3. Create new release file with initial schema
4. Optionally create/link GitHub milestone

See detailed flow in "new" section below.

#### Subcommand: status

```text
Arguments: status [version]
```

1. If version provided, load specific release
2. If no version, find active release
3. Display release status with issue progress

See detailed flow in "status" section below.

#### Subcommand: add

```text
Arguments: add <issue> [--to <version>]
```

1. Parse issue number and optional target version
2. Find or validate target release
3. Fetch issue details from GitHub
4. Add issue to release

See detailed flow in "add" section below.

#### Subcommand: remove

```text
Arguments: remove <issue>
```

1. Find which release contains the issue
2. Remove issue from release
3. Update release file

See detailed flow in "remove" section below.

#### Subcommand: ship

```text
Arguments: ship <version>
```

1. Load and validate release
2. Verify all issues are complete
3. Create git tag (optional)
4. Archive release file
5. Close GitHub milestone (optional)

See detailed flow in "ship" section below.

#### Subcommand: yolo

```text
Arguments: yolo <version> [--skip-verify] [--no-tag] [--dry-run] [--continue] [--from <issue>]
```

1. Load release and validate
2. Display pre-flight check (issues, dependencies, TDD status)
3. If --dry-run, show execution plan and exit
4. If --continue, load saved state and resume
5. Process each issue in dependency order:
   - Plan if not planned
   - Execute all phases
   - Ship the issue
6. Verify requirements (unless --skip-verify)
7. Ship the release (create tag unless --no-tag)

See detailed flow in "yolo" section below.

#### Subcommand: sync

```text
Arguments: sync <version> [--pull] [--two-way]
```

1. Load release and validate
2. Check/create GitHub milestone
3. Detect changes between Tiki and GitHub
4. Display diff before applying
5. Apply changes based on direction flag:
   - Default: Push Tiki state to GitHub
   - --pull: Pull GitHub state to Tiki
   - --two-way: Merge both directions

See detailed flow in "sync" section below.

## Helper Functions

The following helper functions are used across subcommands. These are implemented inline in each handler.

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

## Subcommand: new

Create a new release version with interactive issue selection.

### Usage

```text
/tiki:release new v1.1
/tiki:release new v1.1 --sync-github
/tiki:release new 2.0.0-beta
```

**Arguments:**
- `<version>` (required): Version identifier (e.g., v1.1, 2.0.0-beta)
- `--sync-github` (optional): Create and sync GitHub milestone

### Flow

#### Step 1: Parse and Validate Arguments

Parse the arguments to extract version and flags:

```text
Arguments: $ARGUMENTS
Expected format: new <version> [--sync-github]

Extract:
- version: The version string (e.g., "v1.1", "2.0.0-beta")
- syncGithub: true if --sync-github flag is present
```

Validate the version format:

```javascript
function validateVersion(version) {
  // Accept: v1.0.0, v1.1, 2.0.0-beta, v1.0.0-rc.1
  const pattern = /^v?\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?$/;
  return pattern.test(version);
}
```

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
  /tiki:release new v1.2
  /tiki:release new v2.0.0-beta --sync-github
```

#### Step 2: Check for Existing Release

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
- **View existing**: Run status subcommand and exit
- **Overwrite**: Backup existing file, then continue with creation
  ```bash
  mv .tiki/releases/${VERSION}.json .tiki/releases/${VERSION}.json.backup.$(date +%Y%m%d%H%M%S)
  ```
- **Cancel**: Exit with message "No changes made."

#### Step 3: Check Requirements Configuration

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

#### Step 4: Fetch Open GitHub Issues

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

#### Step 5: Group Issues by Theme

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

#### Step 6: Interactive Issue Selection

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

#### Step 7: Requirements Mapping Flow (if enabled)

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

#### Step 8: Create Release File

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

#### Step 9: GitHub Milestone Sync (if --sync-github)

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

#### Step 10: Display Summary

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

This is supported. Use `/tiki:release status <version>` to view a specific release.

### Next Steps

1. **Start working on an issue:**
   ```
   /tiki:get-issue 38
   /tiki:plan-issue
   ```

2. **View release status:**
   ```
   /tiki:release status
   ```

3. **Add more issues:**
   ```
   /tiki:release add <issue-number>
   ```

4. **When ready to ship:**
   ```
   /tiki:release ship {version}
   ```

---

Release file saved to: `.tiki/releases/{version}.json`
```

### Edge Cases

#### No Open Issues

```text
## No Open Issues

No open issues found in this repository.

Created empty release {version}. Add issues manually:
  /tiki:release add <issue-number>

Or create new issues first:
  gh issue create
```

#### GitHub CLI Not Available

```text
## GitHub CLI Unavailable

Cannot fetch issues - GitHub CLI (gh) not available or not authenticated.

Options:
1. Create empty release (add issues manually later)
2. Cancel and set up GitHub CLI first

Note: --sync-github flag will be ignored.
```

Proceed with empty release if user chooses option 1.

#### Multiple Active Releases

This is supported. When displaying any release information, note the existence of other active releases:

```text
Note: You have 2 active releases:
- v1.0: 3 issues (2 in progress, 1 not started)
- v1.1: 5 issues <- current

Use `/tiki:release status <version>` to switch context.
```

#### Invalid Issue Numbers in Selection

```text
## Invalid Selection

The following issue numbers were not found: #99, #100

Valid issues: 38, 41, 42, 44, 45, 47, 48, 50, 51, 52, 53, 55

Please re-enter your selection:
```

#### Requirement Mapping with No Matches

```text
## Issue #47: Investigate flaky test

No requirement suggestions found based on keywords.

Options:
1. Enter requirements manually
2. Skip - No requirements for this issue
3. View all requirements

Enter choice:
```

## Subcommand: status

Display release status and progress. Shows all active releases when no version is specified, or detailed view of a specific release.

### Usage

```text
/tiki:release status           # Show all active releases summary
/tiki:release status v1.1      # Show detailed status of specific release
```

### Flow

#### Step 1: Parse Arguments

Parse the arguments to determine if a specific version is requested:

```text
Arguments: $ARGUMENTS
Expected format: status [version]

Extract:
- version: Optional version string (e.g., "v1.1", "2.0.0-beta")
```

#### Step 2: Route to Appropriate View

If a version is specified, show single release detailed view.
If no version is specified, show all releases summary view.

---

### All Releases View (no version specified)

When no version is provided, display a summary of all active releases.

#### Step A1: Scan for Active Releases

```bash
# List all active release files
ls .tiki/releases/*.json 2>/dev/null || echo "NO_RELEASES"
```

#### Step A2: Handle No Releases Case

If no release files found:

```text
## No Active Releases

No active releases found.

To create a new release:
  /tiki:release new <version>

To view archived releases:
  ls .tiki/releases/archive/
```

#### Step A3: Load and Process Each Release

For each release file found, read the JSON and calculate metrics:

```javascript
for (const releaseFile of releaseFiles) {
  const release = readJSON(releaseFile);

  // Calculate issue completion
  const total = release.issues.length;
  const completed = release.issues.filter(i => i.status === 'completed').length;
  const issuePercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Calculate requirements implementation (if enabled)
  let reqPercent = null;
  if (release.requirementsEnabled && release.requirements) {
    reqPercent = release.requirements.total > 0
      ? Math.round((release.requirements.implemented / release.requirements.total) * 100)
      : 0;
  }

  releases.push({
    version: release.version,
    createdAt: release.createdAt,
    issueTotal: total,
    issueCompleted: completed,
    issuePercent: issuePercent,
    requirementsEnabled: release.requirementsEnabled,
    reqTotal: release.requirements?.total || 0,
    reqImplemented: release.requirements?.implemented || 0,
    reqPercent: reqPercent
  });
}
```

#### Step A4: Display All Releases Summary

```text
## Active Releases

| Version | Issues | Progress | Requirements | Created |
|---------|--------|----------|--------------|---------|
| v1.2    | 3/8    | ████░░░░░░ 38% | 5/12 (42%) | 2026-01-15 |
| v1.1    | 5/5    | ██████████ 100% | 8/8 (100%) | 2026-01-10 |

### Progress Bars Legend

```text
██████████ = Completed percentage
░░░░░░░░░░ = Remaining percentage
```

### Quick Actions

- View detailed status: `/tiki:release status <version>`
- Add issue to release: `/tiki:release add <issue> --to <version>`
- Ship completed release: `/tiki:release ship <version>`
```

#### Step A5: Identify Ready-to-Ship Releases

Check if any releases are at 100% completion:

```text
{If any release has 100% issue completion:}

### Ready to Ship

The following releases appear ready to ship:

| Version | Issues | Requirements |
|---------|--------|--------------|
| v1.1    | 5/5 complete | 8/8 verified |

Ship with: `/tiki:release ship v1.1`
```

---

### Single Release View (version specified)

When a specific version is provided, display detailed release information.

#### Step S1: Load the Specified Release

```text
release = loadRelease(version)
```

Check active releases first:
```bash
VERSION="v1.1"  # normalized version
cat .tiki/releases/${VERSION}.json 2>/dev/null
```

If not found in active, check archive:
```bash
cat .tiki/releases/archive/${VERSION}.json 2>/dev/null
```

#### Step S2: Handle Release Not Found

If release not found in either location:

```text
## Release Not Found

Release "{version}" not found.

{List available releases if any exist:}
Available releases:
- v1.2 (active)
- v1.1 (active)
- v1.0 (shipped)

Create a new release:
  /tiki:release new {version}
```

#### Step S3: Update Issue Status from External Sources

For each issue in the release, refresh status from:

1. **GitHub Issue State** - Check if issue is closed:
   ```bash
   gh issue view <number> --json state --jq '.state'
   ```

2. **Tiki Plan File** - Check phase progress:
   ```bash
   cat .tiki/plans/issue-<number>.json 2>/dev/null
   ```

3. **Tiki State File** - Check active execution:
   ```bash
   cat .tiki/state/current.json 2>/dev/null
   ```

**Status Resolution Logic:**

```javascript
function resolveIssueStatus(issueNumber, release) {
  const issueInRelease = release.issues.find(i => i.number === issueNumber);

  // Check GitHub state
  const ghState = execSync(`gh issue view ${issueNumber} --json state --jq '.state'`).trim();

  // Check for plan file
  const planPath = `.tiki/plans/issue-${issueNumber}.json`;
  const plan = fileExists(planPath) ? readJSON(planPath) : null;

  // Check current state
  const statePath = '.tiki/state/current.json';
  const currentState = fileExists(statePath) ? readJSON(statePath) : null;

  // Determine status
  if (ghState === 'CLOSED') {
    return {
      status: 'completed',
      currentPhase: null,
      totalPhases: plan?.phases?.length || issueInRelease.totalPhases,
      completedAt: issueInRelease.completedAt || new Date().toISOString()
    };
  }

  if (currentState?.activeIssue === issueNumber) {
    return {
      status: 'in_progress',
      currentPhase: currentState.currentPhase,
      totalPhases: plan?.phases?.length || issueInRelease.totalPhases,
      completedAt: null
    };
  }

  if (plan) {
    const completedPhases = plan.phases.filter(p => p.status === 'completed').length;
    const totalPhases = plan.phases.length;

    if (completedPhases === totalPhases) {
      return { status: 'completed', currentPhase: null, totalPhases, completedAt: plan.completedAt };
    } else if (completedPhases > 0) {
      return { status: 'in_progress', currentPhase: completedPhases + 1, totalPhases, completedAt: null };
    } else {
      return { status: 'planned', currentPhase: null, totalPhases, completedAt: null };
    }
  }

  return {
    status: 'not_planned',
    currentPhase: null,
    totalPhases: null,
    completedAt: null
  };
}
```

#### Step S4: Calculate Progress Metrics

```javascript
const total = release.issues.length;
const completed = release.issues.filter(i => i.status === 'completed').length;
const inProgress = release.issues.filter(i => i.status === 'in_progress').length;
const planned = release.issues.filter(i => i.status === 'planned').length;
const notPlanned = release.issues.filter(i => i.status === 'not_planned').length;
const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
```

#### Step S5: Build Visual Progress Bar

Create an ASCII progress bar (10 characters wide):

```javascript
function buildProgressBar(percent) {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// Example outputs:
// 0%   -> ░░░░░░░░░░
// 30%  -> ███░░░░░░░
// 75%  -> ████████░░
// 100% -> ██████████
```

#### Step S6: Display Release Header

```text
## Release {version}

| Field | Value |
|-------|-------|
| Status | {active / shipped} |
| Created | {createdAt formatted} |
{if shipped:}| Shipped | {shippedAt formatted} |
{if shipped:}| Shipped By | {shippedBy} |
{if shipped:}| Git Tag | {gitTag or "None"} |
| Milestone | {milestone url or "None"} |
| Requirements | {Enabled / Disabled} |
```

#### Step S7: Display Progress Overview

```text
### Progress

{progressBar} {progress}%

{completed}/{total} issues complete

| Status | Count | Visual |
|--------|-------|--------|
| Completed | {completed} | {'●'.repeat(completed)} |
| In Progress | {inProgress} | {'◐'.repeat(inProgress)} |
| Planned | {planned} | {'○'.repeat(planned)} |
| Not Planned | {notPlanned} | {'·'.repeat(notPlanned)} |
```

#### Step S8: Display Issues Table with Timeline

```text
### Issues

| # | Title | Status | Phase | Progress |
|---|-------|--------|-------|----------|
| 34 | Add user authentication | ✓ completed | 3/3 | ██████████ |
| 35 | Fix login redirect | ◐ in_progress | 2/3 | ██████░░░░ |
| 36 | Implement dark mode | ○ planned | 0/4 | ░░░░░░░░░░ |
| 37 | Update API docs | · not_planned | - | - |
```

**Status Icons:**
- `✓` = completed
- `◐` = in_progress
- `○` = planned
- `·` = not_planned

**Phase Progress Bar:**

For issues with phase information, show mini progress bar:

```javascript
function buildIssueProgressBar(currentPhase, totalPhases, status) {
  if (status === 'completed') return '██████████';
  if (status === 'not_planned' || !totalPhases) return '-';

  const phasePercent = Math.round((currentPhase / totalPhases) * 100);
  return buildProgressBar(phasePercent);
}
```

#### Step S9: Display Requirements Coverage Table (if enabled)

If `release.requirementsEnabled` is true, show requirements status:

**Load Requirements:**

```bash
cat .tiki/requirements.json 2>/dev/null
```

**Build Coverage Matrix:**

```javascript
function buildRequirementsCoverage(release, requirements) {
  const coverage = {};

  // Initialize all requirements as not covered
  for (const category of requirements.categories) {
    for (const req of category.requirements) {
      coverage[req.id] = {
        id: req.id,
        text: req.text,
        category: category.name,
        issues: [],
        status: 'not_covered'
      };
    }
  }

  // Map issues to requirements
  for (const issue of release.issues) {
    for (const reqId of issue.requirements || []) {
      if (coverage[reqId]) {
        coverage[reqId].issues.push({
          number: issue.number,
          status: issue.status
        });

        // Update requirement status based on issue status
        if (issue.status === 'completed') {
          coverage[reqId].status = 'implemented';
        } else if (coverage[reqId].status !== 'implemented') {
          coverage[reqId].status = 'in_progress';
        }
      }
    }
  }

  return coverage;
}
```

**Display Requirements Table:**

```text
### Requirements Coverage

| ID | Requirement | Status | Addressed By |
|----|-------------|--------|--------------|
| AUTH-01 | User login | ✓ implemented | #34 |
| AUTH-02 | Session management | ✓ implemented | #34 |
| AUTH-03 | Password reset | ◐ in_progress | #35 |
| UI-01 | Dark mode support | ○ planned | #36 |
| UI-02 | Responsive layout | · not_covered | - |

**Summary:**
- Total requirements: {total}
- Implemented: {implemented} ({implementedPercent}%)
- In Progress: {inProgress}
- Not Covered: {notCovered}
```

**Requirements Status Icons:**
- `✓` = implemented (addressed by completed issue)
- `◐` = in_progress (addressed by in-progress issue)
- `○` = planned (addressed by planned issue)
- `·` = not_covered (no issue addresses this)

#### Step S10: Display Timeline Visualization

Show an ASCII timeline of issue progress:

```text
### Timeline

Issue Progress:
#34 ████████████████████████████████████████ ✓
#35 ████████████████████████░░░░░░░░░░░░░░░░ 60%
#36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%
#37 ---------------------------------------- not planned
```

**Timeline Bar Logic:**

```javascript
function buildTimelineBar(issue) {
  const width = 40;

  if (issue.status === 'completed') {
    return '█'.repeat(width) + ' ✓';
  }

  if (issue.status === 'not_planned') {
    return '-'.repeat(width) + ' not planned';
  }

  if (issue.status === 'planned') {
    return '░'.repeat(width) + ' 0%';
  }

  // In progress - calculate based on phases
  if (issue.currentPhase && issue.totalPhases) {
    const percent = Math.round((issue.currentPhase / issue.totalPhases) * 100);
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percent}%`;
  }

  return '░'.repeat(width) + ' 0%';
}
```

#### Step S11: Suggest Next Action

Based on the release state, suggest the most appropriate next step:

```javascript
function suggestNextAction(release) {
  const completed = release.issues.filter(i => i.status === 'completed').length;
  const total = release.issues.length;
  const inProgress = release.issues.filter(i => i.status === 'in_progress');
  const notPlanned = release.issues.filter(i => i.status === 'not_planned');
  const planned = release.issues.filter(i => i.status === 'planned');

  // All complete - suggest shipping
  if (completed === total && total > 0) {
    return {
      action: 'ship',
      message: 'All issues complete! Ready to ship.',
      command: `/tiki:release ship ${release.version}`
    };
  }

  // Has in-progress work - suggest continuing
  if (inProgress.length > 0) {
    const current = inProgress[0];
    return {
      action: 'continue',
      message: `Continue working on issue #${current.number}`,
      command: `/tiki:get-issue ${current.number}`
    };
  }

  // Has planned but not started - suggest starting
  if (planned.length > 0) {
    const next = planned[0];
    return {
      action: 'start',
      message: `Start the next planned issue #${next.number}`,
      command: `/tiki:get-issue ${next.number}\n/tiki:execute`
    };
  }

  // Has not-planned issues - suggest planning
  if (notPlanned.length > 0) {
    const next = notPlanned[0];
    return {
      action: 'plan',
      message: `Plan the next issue #${next.number}`,
      command: `/tiki:get-issue ${next.number}\n/tiki:plan-issue`
    };
  }

  // Empty release - suggest adding issues
  if (total === 0) {
    return {
      action: 'add',
      message: 'Release has no issues. Add some to get started.',
      command: `/tiki:release add <issue-number> --to ${release.version}`
    };
  }

  return {
    action: 'review',
    message: 'Review the release status.',
    command: `/tiki:release status ${release.version}`
  };
}
```

**Display Suggested Action:**

```text
### Suggested Next Action

{Based on release state:}

{If ready to ship:}
**Ready to Ship!**
All issues in this release are complete.

```
/tiki:release ship {version}
```

{If in-progress work exists:}
**Continue In-Progress Work**
Issue #{number}: {title} is currently in progress (phase {current}/{total}).

```
/tiki:get-issue {number}
```

{If planned issues exist but none in progress:}
**Start Next Planned Issue**
Issue #{number}: {title} is planned and ready to start.

```
/tiki:get-issue {number}
/tiki:execute
```

{If unplanned issues exist:}
**Plan Next Issue**
Issue #{number}: {title} needs planning before execution.

```
/tiki:get-issue {number}
/tiki:plan-issue
```

{If release is empty:}
**Add Issues to Release**
This release has no issues. Add issues to track progress.

```
/tiki:release add <issue-number> --to {version}
```
```

#### Step S12: Display Full Status Output

Combine all sections into the complete output:

```text
## Release {version}

| Field | Value |
|-------|-------|
| Status | active |
| Created | 2026-01-10 |
| Milestone | https://github.com/owner/repo/milestone/1 |
| Requirements | Enabled |

---

### Progress

██████░░░░ 60%

3/5 issues complete

| Status | Count | Visual |
|--------|-------|--------|
| Completed | 3 | ●●● |
| In Progress | 1 | ◐ |
| Planned | 1 | ○ |
| Not Planned | 0 | |

---

### Issues

| # | Title | Status | Phase | Progress |
|---|-------|--------|-------|----------|
| 34 | Add user authentication | ✓ completed | 3/3 | ██████████ |
| 35 | Fix login redirect | ◐ in_progress | 2/3 | ██████░░░░ |
| 36 | Implement dark mode | ✓ completed | 4/4 | ██████████ |
| 37 | Update API docs | ✓ completed | 2/2 | ██████████ |
| 38 | Add export feature | ○ planned | 0/3 | ░░░░░░░░░░ |

---

### Timeline

Issue Progress:
#34 ████████████████████████████████████████ ✓
#35 ████████████████████████░░░░░░░░░░░░░░░░ 67%
#36 ████████████████████████████████████████ ✓
#37 ████████████████████████████████████████ ✓
#38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%

---

### Requirements Coverage

| ID | Requirement | Status | Addressed By |
|----|-------------|--------|--------------|
| AUTH-01 | User login | ✓ implemented | #34 |
| AUTH-02 | Session management | ✓ implemented | #34 |
| AUTH-03 | Password reset | ◐ in_progress | #35 |
| UI-01 | Dark mode support | ✓ implemented | #36 |
| DOC-01 | API documentation | ✓ implemented | #37 |

**Summary:** 4/5 requirements implemented (80%)

---

### Suggested Next Action

**Continue In-Progress Work**
Issue #35: Fix login redirect is currently in progress (phase 2/3).

```
/tiki:get-issue 35
```
```

### Error Handling

#### Release Not Found

```text
## Release Not Found

Release "{version}" not found.

{Scan for available releases:}
Available releases:
{For each active release:}
- {version} (active) - {completed}/{total} issues complete
{For each archived release:}
- {version} (shipped on {shippedAt})

{If no releases exist:}
No releases found. Create one with:
  /tiki:release new <version>

{If version looks like a typo, suggest closest match:}
Did you mean: {closest_version}?
```

#### No Releases Exist

```text
## No Releases

No active or archived releases found.

To create your first release:
  /tiki:release new <version>

Example:
  /tiki:release new v1.0
```

#### GitHub CLI Unavailable

If `gh` commands fail during status resolution:

```text
## GitHub Status Unavailable

Could not fetch latest issue states from GitHub.
Showing cached status from release file.

Note: Issue states may be outdated. To refresh:
1. Ensure GitHub CLI is installed and authenticated
2. Run `/tiki:release status {version}` again

Continuing with cached data...
```

Then proceed with display using only cached data from the release file.

#### Empty Release

If a release has no issues:

```text
## Release {version}

| Field | Value |
|-------|-------|
| Status | active |
| Created | {createdAt} |
| Issues | 0 |

### No Issues

This release has no issues assigned.

To add issues:
  /tiki:release add <issue-number> --to {version}

To view available issues:
  gh issue list --state open
```

## Subcommand: add

Add one or more issues to a release with optional requirements mapping.

### Usage

```text
/tiki:release add 34                    # Add single issue to active release
/tiki:release add 34 --to v1.2          # Add single issue to specific release
/tiki:release add 23 24 25              # Add multiple issues to active release
/tiki:release add 23 24 25 --to v1.2    # Add multiple issues to specific release
```

**Arguments:**
- `<issue>` (required): One or more issue numbers (space-separated)
- `--to <version>` (optional): Target release version (defaults to most recent active release)

### Flow

#### Step 1: Parse Arguments

Parse the arguments to extract issue numbers and optional version flag:

```text
Arguments: $ARGUMENTS
Expected format: add <issue> [<issue>...] [--to <version>]

Extract:
- issueNumbers: Array of issue numbers (e.g., [38, 39, 40])
- targetVersion: Optional version string from --to flag
```

**Parsing Logic:**

```javascript
function parseAddArguments(args) {
  const tokens = args.split(/\s+/).filter(t => t && t !== 'add');
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

Usage: /tiki:release add <issue> [<issue>...] [--to <version>]

Examples:
  /tiki:release add 38                    # Add single issue
  /tiki:release add 38 39 40              # Add multiple issues
  /tiki:release add 38 --to v1.2          # Add to specific release
  /tiki:release add 38 39 40 --to v1.2    # Add multiple to specific release
```

#### Step 2: Determine Target Release

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
  /tiki:release new {version}
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

  /tiki:release new <version>

Example:
  /tiki:release new v1.1
```

#### Step 3: Validate Issues

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

#### Step 4: Single Issue Flow

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

#### Step 5: Multiple Issues Flow

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

#### Step 6: Update Release File

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

#### Step 7: GitHub Milestone Sync

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

#### Step 8: Display Updated Progress

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

### Error Handling

#### Issue Not Found on GitHub

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

#### Issue Already Closed

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

#### Issue Already in Target Release

```text
## Issue Already in Release

Issue #{number} "{title}" is already in release {version}.

Current status in release: {status}

No action needed. Use `/tiki:release status {version}` to view release details.
```

#### No Active Releases Exist

```text
## No Active Release

Cannot add issues - no active releases found.

Create a release first:
  /tiki:release new <version>

Example:
  /tiki:release new v1.1
  /tiki:release add {issueNumbers.join(' ')} --to v1.1
```

#### Requirements File Not Found (when release has requirements enabled)

```text
## Requirements File Missing

Release {version} has requirements enabled, but no requirements file found.

Options:
1. **Continue without mapping** - Add issues without requirement mapping
2. **Define requirements** - Run /tiki:define-requirements first
3. **Cancel** - Exit without changes

Enter choice:
```

## Subcommand: remove

Remove an issue from a release with optional handling of orphaned requirements.

### Usage

```text
/tiki:release remove 34
```

**Arguments:**
- `<issue>` (required): Single issue number to remove

### Flow

#### Step 1: Parse Arguments

Parse the arguments to extract the issue number:

```text
Arguments: $ARGUMENTS
Expected format: remove <issue>

Extract:
- issueNumber: The issue number to remove
```

If no issue number provided:

```text
## Missing Issue Number

Usage: /tiki:release remove <issue>

Example:
  /tiki:release remove 34

To see which release an issue belongs to:
  /tiki:release status
```

#### Step 2: Find Issue's Release

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

**Implementation:**

```javascript
function findReleaseForIssue(issueNumber) {
  const releaseFiles = glob('.tiki/releases/*.json');

  for (const file of releaseFiles) {
    const release = readJSON(file);
    const issue = release.issues.find(i => i.number === issueNumber);
    if (issue) {
      return {
        release,
        version: release.version,
        issue,
        filePath: file
      };
    }
  }

  return null;
}
```

If issue not found in any release:

```text
## Issue Not in Any Release

Issue #{number} is not assigned to any release.

To add it to a release:
  /tiki:release add {number}
  /tiki:release add {number} --to <version>

To view all releases:
  /tiki:release status
```

#### Step 3: Display Issue Details

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

#### Step 4: Handle Orphaned Requirements

If the issue is mapped to requirements, check if removing it would leave requirements orphaned (not addressed by any other issue):

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

#### Step 5: Confirm Removal

```text
Confirm removal of issue #{number} from release {version}? [y/N]
```

If user confirms, proceed to Step 6.

If user declines:

```text
## Cancelled

Issue #{number} was not removed from release {version}.
```

#### Step 6: Update Release File

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

#### Step 7: GitHub Milestone Sync

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

#### Step 8: Display Updated Progress

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
  /tiki:release add <issue-number>

### Next Steps

{If release still has issues:}
View updated release status:
  /tiki:release status {version}

{If release is now empty:}
Release {version} is now empty.

Add issues:
  /tiki:release add <issue-number> --to {version}

Or delete the release:
  rm .tiki/releases/{version}.json
```

### Error Handling

#### Issue Not Found in Any Release

```text
## Issue Not in Release

Issue #{number} is not assigned to any active release.

{If issue exists on GitHub:}
Issue #{number} exists on GitHub but is not in any Tiki release.

To add it to a release:
  /tiki:release add {number}

{If issue doesn't exist on GitHub:}
Issue #{number} was not found on GitHub either.
Please verify the issue number.
```

#### Release File Corrupted

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
  /tiki:release new {version}
```

#### Permission Error

If unable to write to release file:

```text
## Permission Error

Unable to update release file: .tiki/releases/{version}.json

Check file permissions and try again:
  ls -la .tiki/releases/
```

## Subcommand: ship

Ship and archive a completed release. Performs comprehensive verification, closes GitHub milestone, archives the release, and optionally creates a git tag.

### Usage

```text
/tiki:release ship v1.1
```

**Arguments:**
- `<version>` (required): Version identifier to ship (e.g., v1.1, 2.0.0-beta)

### Flow

#### Step 1: Parse Arguments

Parse the arguments to extract the version:

```text
Arguments: $ARGUMENTS
Expected format: ship <version>

Extract:
- version: The version string to ship (e.g., "v1.1", "2.0.0-beta")
```

If version is missing:

```text
## Missing Version

Usage: /tiki:release ship <version>

Example:
  /tiki:release ship v1.1

To see available releases:
  /tiki:release status
```

#### Step 2: Load Release

Load the release file using the normalized version:

```bash
# Normalize version (add 'v' prefix if missing)
VERSION="${version}"
if [[ ! "$VERSION" =~ ^v ]]; then
  VERSION="v${VERSION}"
fi

# Check active releases
if [ -f ".tiki/releases/${VERSION}.json" ]; then
  cat ".tiki/releases/${VERSION}.json"
else
  # Check if already archived
  if [ -f ".tiki/releases/archive/${VERSION}.json" ]; then
    echo "ALREADY_SHIPPED"
  else
    echo "NOT_FOUND"
  fi
fi
```

**If release not found:**

```text
## Release Not Found

Release "{version}" not found.

{Scan for available releases:}
Available releases:
{For each active release:}
- {version} (active) - {completed}/{total} issues complete
{For each archived release:}
- {version} (shipped on {shippedAt})

Did you mean one of the above?

To create a new release:
  /tiki:release new {version}
```

**If release already shipped:**

```text
## Already Shipped

Release "{version}" has already been shipped.

Shipped on: {shippedAt}
Shipped by: {shippedBy}

To view the archived release:
  cat .tiki/releases/archive/{version}.json

To create a new version:
  /tiki:release new <new-version>
```

#### Step 3: Pre-Ship Verification - Check GitHub Issue States

For each issue in the release, verify its current state on GitHub:

```bash
# For each issue, check GitHub state
gh issue view <number> --json state,closedAt --jq '{state: .state, closedAt: .closedAt}'
```

**Build Pre-Ship Checklist:**

```javascript
async function buildPreShipChecklist(release) {
  const checklist = {
    issues: [],
    allIssuesClosed: true,
    openIssues: [],
    requirements: {
      enabled: release.requirementsEnabled,
      total: 0,
      implemented: 0,
      verified: 0,
      unverified: []
    }
  };

  // Check each issue's GitHub state
  for (const issue of release.issues) {
    try {
      const ghState = await exec(`gh issue view ${issue.number} --json state --jq '.state'`);
      const isClosed = ghState.trim() === 'CLOSED';

      checklist.issues.push({
        number: issue.number,
        title: issue.title,
        releaseStatus: issue.status,
        githubClosed: isClosed,
        passed: isClosed
      });

      if (!isClosed) {
        checklist.allIssuesClosed = false;
        checklist.openIssues.push(issue);
      }
    } catch (e) {
      // GitHub API error - mark as unknown
      checklist.issues.push({
        number: issue.number,
        title: issue.title,
        releaseStatus: issue.status,
        githubClosed: null,
        passed: false,
        error: e.message
      });
      checklist.allIssuesClosed = false;
      checklist.openIssues.push(issue);
    }
  }

  return checklist;
}
```

**Display Pre-Ship Checklist:**

```text
## Pre-Ship Verification

### Issue Status Check

| # | Title | Release Status | GitHub | Check |
|---|-------|----------------|--------|-------|
| 34 | Add user auth | completed | CLOSED | PASS |
| 35 | Fix login redirect | completed | CLOSED | PASS |
| 36 | Update docs | completed | OPEN | FAIL |
| 37 | Dark mode toggle | completed | CLOSED | PASS |

{If all passed:}
**All {count} issues verified closed on GitHub.**

{If any failed:}
**{failCount} issue(s) failed verification.**
```

#### Step 4: Block if Issues Not Closed

If any issues are not closed on GitHub, block the ship and offer options:

```text
## Cannot Ship - Open Issues

The following issues are not closed on GitHub:

| # | Title | GitHub State |
|---|-------|--------------|
| 36 | Update docs | OPEN |

A release cannot be shipped until all issues are closed.

**Options:**

1. **Close issues first** - Close the open issues on GitHub, then retry
   ```
   gh issue close 36
   /tiki:release ship {version}
   ```

2. **Remove open issues** - Remove open issues from release and proceed
   This will ship without these issues.

3. **Cancel** - Exit without shipping

Enter choice:
```

**Handle Options:**

**Option 1: Close issues first**

```text
## Close Issues First

Close the open issues using GitHub CLI:

{For each open issue:}
  gh issue close {number}

Then retry shipping:
  /tiki:release ship {version}
```

Exit without shipping.

**Option 2: Remove open issues**

Use AskUserQuestion to confirm:

```text
## Confirm Issue Removal

Remove the following issues from release {version}?

| # | Title |
|---|-------|
| 36 | Update docs |

These issues will be removed from the release but will remain open on GitHub.
You can add them to a future release.

Confirm removal? [y/N]
```

If confirmed:
- Remove each open issue from the release (same logic as `remove` subcommand)
- Continue to next verification step

If declined:
- Exit with "Ship cancelled."

**Option 3: Cancel**

Exit with "Ship cancelled."

#### Step 5: Pre-Ship Verification - Requirements Check (if enabled)

If `release.requirementsEnabled` is true, verify requirements implementation status:

```bash
# Load requirements file
cat .tiki/requirements.json 2>/dev/null
```

**Build Requirements Verification:**

```javascript
function buildRequirementsVerification(release, requirementsData) {
  const verification = {
    total: 0,
    implemented: 0,
    verified: 0,
    unverified: [],
    notImplemented: []
  };

  // Get all requirement IDs addressed by issues in this release
  const addressedReqs = new Set();
  const implementedReqs = new Set();

  for (const issue of release.issues) {
    for (const reqId of issue.requirements || []) {
      addressedReqs.add(reqId);
      if (issue.status === 'completed') {
        implementedReqs.add(reqId);
      }
    }
  }

  verification.total = addressedReqs.size;
  verification.implemented = implementedReqs.size;

  // Check verification status from requirements.json
  if (requirementsData?.categories) {
    for (const category of requirementsData.categories) {
      for (const req of category.requirements) {
        if (addressedReqs.has(req.id)) {
          if (req.verified) {
            verification.verified++;
          } else if (implementedReqs.has(req.id)) {
            verification.unverified.push({
              id: req.id,
              text: req.text,
              category: category.name
            });
          }
        }
      }
    }
  }

  // Requirements implemented but not in requirements.json
  for (const reqId of implementedReqs) {
    const inRequirementsFile = requirementsData?.categories?.some(c =>
      c.requirements.some(r => r.id === reqId)
    );
    if (!inRequirementsFile) {
      // Treat as verified (custom requirement)
      verification.verified++;
    }
  }

  return verification;
}
```

**Display Requirements Verification:**

```text
### Requirements Verification

| ID | Requirement | Status | Verified |
|----|-------------|--------|----------|
| AUTH-01 | User login | implemented | YES |
| AUTH-02 | Session mgmt | implemented | YES |
| AUTH-03 | Password reset | implemented | NO |
| UI-01 | Dark mode | implemented | YES |
| DOC-01 | API docs | implemented | NO |

**Summary:**
- Total requirements: {total}
- Implemented: {implemented}
- Verified: {verified}
- Unverified: {unverifiedCount}

{If all verified:}
**All requirements verified.**

{If unverified exist:}
**{unverifiedCount} requirement(s) need verification.**
```

#### Step 6: Interactive Verification Flow (for unverified requirements)

If there are unverified requirements, offer interactive verification:

```text
### Verify Requirements

The following requirements are implemented but not yet verified:

| ID | Requirement | Addressed By |
|----|-------------|--------------|
| AUTH-03 | Password reset capability | #35 |
| DOC-01 | API documentation complete | #36 |

Would you like to verify these requirements now?

1. **Verify interactively** - Review and verify each requirement
2. **Mark all verified** - Trust implementation, mark all as verified
3. **Skip verification** - Ship without verifying (not recommended)
4. **Cancel** - Exit and verify manually before shipping

Enter choice:
```

**Option 1: Verify Interactively**

For each unverified requirement:

```text
## Verify Requirement: {reqId}

**Requirement:** {req.text}
**Category:** {category}
**Addressed by:** Issue #{issueNumber} - {issueTitle}

Has this requirement been properly implemented and tested?

1. **Yes** - Mark as verified
2. **No** - Leave unverified (will block ship)
3. **Skip** - Skip this requirement for now
4. **View issue** - Show issue details before deciding

Enter choice:
```

**Option 1.1: Yes - Mark as verified**

Update requirements.json to mark requirement as verified:

```javascript
// Find and update requirement in requirements.json
for (const category of requirementsData.categories) {
  const req = category.requirements.find(r => r.id === reqId);
  if (req) {
    req.verified = true;
    req.verifiedAt = new Date().toISOString();
    req.verifiedBy = getCurrentUser();
    break;
  }
}
// Save updated requirements.json
```

Continue to next unverified requirement.

**Option 1.2: No - Leave unverified**

```text
Requirement {reqId} left unverified.

Note: Shipping will be blocked until all requirements are verified or you choose to skip verification.
```

Continue to next unverified requirement.

**Option 1.3: Skip**

Move to next requirement without changing status.

**Option 1.4: View issue**

Display issue details:

```bash
gh issue view {issueNumber}
```

Then re-prompt for verification decision.

**After interactive verification completes:**

If any requirements are still unverified:

```text
## Verification Incomplete

The following requirements are still unverified:

| ID | Requirement |
|----|-------------|
| DOC-01 | API documentation complete |

Options:

1. **Continue anyway** - Ship with unverified requirements
2. **Cancel** - Exit and complete verification later

Enter choice:
```

**Option 2: Mark all verified**

```text
## Confirm Batch Verification

Mark all {count} unverified requirements as verified?

| ID | Requirement |
|----|-------------|
| AUTH-03 | Password reset capability |
| DOC-01 | API documentation complete |

This trusts that the implementations are correct.

Confirm? [y/N]
```

If confirmed, mark all as verified in requirements.json.

**Option 3: Skip verification**

Proceed to ship without verifying requirements. Add warning:

```text
## Warning: Unverified Requirements

Proceeding without requirement verification.

The following requirements are not verified:
- AUTH-03: Password reset capability
- DOC-01: API documentation complete

This may indicate incomplete testing. Consider verifying before shipping in production.

Continue? [y/N]
```

**Option 4: Cancel**

Exit with "Ship cancelled. Verify requirements and retry."

#### Step 7: Close GitHub Milestone (if synced)

If the release has a linked GitHub milestone, close it:

```bash
# Check if milestone is linked
MILESTONE_NUMBER="${release.githubMilestone?.number}"

if [ -n "${MILESTONE_NUMBER}" ]; then
  # Close the milestone
  gh api repos/:owner/:repo/milestones/${MILESTONE_NUMBER} -X PATCH -f state="closed"
fi
```

**Handle Milestone Closure:**

```javascript
async function closeMilestone(release) {
  if (!release.githubMilestone?.number) {
    return { closed: false, reason: 'no_milestone' };
  }

  try {
    await exec(`gh api repos/:owner/:repo/milestones/${release.githubMilestone.number} -X PATCH -f state="closed"`);
    return { closed: true, number: release.githubMilestone.number };
  } catch (e) {
    return { closed: false, reason: 'api_error', error: e.message };
  }
}
```

**Report Milestone Status:**

```text
{If milestone was closed:}
### Milestone Closed

GitHub milestone "{version}" (#{number}) has been closed.
URL: {release.githubMilestone.url}

{If no milestone linked:}
### Milestone

No GitHub milestone linked to this release.

{If API error:}
### Milestone Warning

Failed to close GitHub milestone: {error}

You may need to close it manually:
  gh api repos/:owner/:repo/milestones/{number} -X PATCH -f state="closed"
```

#### Step 8: Archive Release

Move the release from active to archive with shipping metadata:

**Step 8a: Build Archived Release Data**

```javascript
function buildArchivedRelease(release, gitTag, currentUser) {
  const shippedAt = new Date().toISOString();
  const createdAt = new Date(release.createdAt);
  const shipped = new Date(shippedAt);
  const durationMs = shipped - createdAt;
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  return {
    ...release,
    status: 'shipped',
    shippedAt,
    shippedBy: currentUser,
    gitTag: gitTag || null,
    summary: {
      issuesCompleted: release.issues.length,
      requirementsImplemented: release.requirements?.implemented || 0,
      requirementsVerified: release.requirements?.verified || 0,
      durationDays
    }
  };
}
```

**Step 8b: Get Current User**

```bash
# Get current git user or system user
git config user.name 2>/dev/null || whoami
```

**Step 8c: Ensure Archive Directory Exists**

```bash
mkdir -p .tiki/releases/archive
```

**Step 8d: Write Archived Release and Remove Active**

```bash
# Write to archive
cat > ".tiki/releases/archive/${VERSION}.json" << 'EOF'
{archived release JSON}
EOF

# Remove active release file
rm ".tiki/releases/${VERSION}.json"
```

**Update Requirements File (if enabled):**

If requirements were verified during ship, save the updated requirements.json:

```bash
cat > ".tiki/requirements.json" << 'EOF'
{updated requirements JSON}
EOF
```

#### Step 9: Optional Git Tag Creation

Prompt user for git tag creation:

```text
### Git Tag

Would you like to create a git tag for this release?

Tag name: {version}

1. **Yes** - Create tag and push to remote
2. **Yes (local only)** - Create tag but don't push
3. **No** - Skip tag creation

Enter choice:
```

**Option 1: Create and push tag**

```bash
# Create annotated tag
git tag -a "${VERSION}" -m "Release ${VERSION}"

# Push tag to remote
git push origin "${VERSION}"
```

Handle errors:

```javascript
async function createGitTag(version, pushToRemote) {
  try {
    // Create tag
    await exec(`git tag -a "${version}" -m "Release ${version}"`);

    if (pushToRemote) {
      try {
        await exec(`git push origin "${version}"`);
        return { created: true, pushed: true };
      } catch (e) {
        return { created: true, pushed: false, pushError: e.message };
      }
    }

    return { created: true, pushed: false };
  } catch (e) {
    return { created: false, error: e.message };
  }
}
```

**Report Tag Status:**

```text
{If tag created and pushed:}
### Git Tag Created

Tag: {version}
Status: Created and pushed to remote

{If tag created but not pushed:}
### Git Tag Created (Local)

Tag: {version}
Status: Created locally

To push later:
  git push origin {version}

{If tag creation failed:}
### Git Tag Warning

Failed to create git tag: {error}

Common causes:
- Tag already exists: git tag -d {version} && git tag -a {version} -m "Release {version}"
- Not in a git repository
- Uncommitted changes

You can create the tag manually later.

{If push failed:}
### Git Tag Created (Push Failed)

Tag: {version}
Status: Created locally, push failed: {pushError}

To push manually:
  git push origin {version}
```

**Option 2: Create local only**

Create tag but skip push.

**Option 3: Skip**

No tag created. Set `gitTag: null` in archived release.

#### Step 10: Display Ship Summary

Show comprehensive summary of the ship operation:

```text
## Release Shipped!

### Release Summary

| Field | Value |
|-------|-------|
| Version | {version} |
| Shipped At | {shippedAt formatted} |
| Shipped By | {shippedBy} |
| Duration | {durationDays} days (from {createdAt} to {shippedAt}) |

---

### Issues Completed

| # | Title | Completed At |
|---|-------|--------------|
| 34 | Add user authentication | 2026-01-12 |
| 35 | Fix login redirect | 2026-01-13 |
| 36 | Update API documentation | 2026-01-14 |
| 37 | Implement dark mode | 2026-01-15 |

**Total: {issuesCompleted} issues**

---

{If requirementsEnabled:}
### Requirements

| Metric | Value |
|--------|-------|
| Implemented | {requirementsImplemented} |
| Verified | {requirementsVerified} |

{If all verified:}
**All requirements verified.**

{If some unverified:}
**Note:** {unverifiedCount} requirements shipped without verification.

---

### Actions Taken

| Action | Status |
|--------|--------|
| Issues verified | {issueCount} closed on GitHub |
| Release archived | .tiki/releases/archive/{version}.json |
{If milestone:}| Milestone closed | #{milestoneNumber} |
{If gitTag:}| Git tag created | {gitTag} |
{If gitTag pushed:}| Tag pushed | origin/{gitTag} |

---

### Files Updated

- **Archived:** `.tiki/releases/archive/{version}.json`
- **Removed:** `.tiki/releases/{version}.json`
{If requirements updated:}- **Updated:** `.tiki/requirements.json`

---

### What's Next?

{If other active releases exist:}
**Continue with other releases:**

| Version | Progress | Issues |
|---------|----------|--------|
{For each active release:}
| {version} | {progressBar} {percent}% | {completed}/{total} |

Work on next release:
  /tiki:release status {nextVersion}

{If no other active releases:}
**No other active releases.**

Create a new release:
  /tiki:release new <version>

View shipped releases:
  ls .tiki/releases/archive/

---

Congratulations on shipping {version}!
```

### Error Handling

#### Release Not Found

```text
## Release Not Found

Release "{version}" not found.

{List available releases if any exist:}
Available releases:
- v1.2 (active) - 3/8 issues complete
- v1.1 (active) - 5/5 issues complete
- v1.0 (shipped on 2026-01-01)

{If no releases exist:}
No releases found.

Create a new release:
  /tiki:release new <version>
```

#### GitHub API Errors

If GitHub API calls fail during verification:

```text
## GitHub API Error

Unable to verify issue states from GitHub.

Error: {error message}

Possible causes:
- GitHub CLI (gh) not authenticated
- Network connectivity issues
- GitHub API rate limit exceeded

Options:

1. **Retry** - Try verification again
2. **Skip verification** - Ship without GitHub verification (not recommended)
3. **Cancel** - Exit and fix the issue

Enter choice:
```

If user chooses to skip:

```text
## Warning: Skipping GitHub Verification

Shipping without verifying GitHub issue states.

This means some issues may still be open on GitHub.

Continue anyway? [y/N]
```

#### Git Tag Errors

If git tag creation fails:

```text
## Git Tag Error

Failed to create git tag "{version}": {error}

Common issues:
- **Tag already exists:** Delete and recreate
  ```
  git tag -d {version}
  git tag -a {version} -m "Release {version}"
  ```
- **Dirty working directory:** Commit or stash changes first
- **Not a git repository:** Initialize git or skip tagging

The release has been archived. You can create the tag manually later.

Continue without tag? [Y/n]
```

Tag errors should not block the ship - report but continue.

#### Archive Directory Permission Error

```text
## Archive Error

Unable to create archive directory or write archive file.

Error: {error message}

Check permissions:
  ls -la .tiki/releases/

Create directory manually:
  mkdir -p .tiki/releases/archive

Then retry:
  /tiki:release ship {version}
```

#### Release File Corrupted

```text
## Release File Error

Unable to parse release file: .tiki/releases/{version}.json

Error: {parse error}

The file may be corrupted. Options:

1. **View raw file:** cat .tiki/releases/{version}.json
2. **Restore from backup:** If you have a backup
3. **Recreate release:** /tiki:release new {version}

Note: Recreating will lose issue assignments. Add them back with:
  /tiki:release add <issue-numbers> --to {version}
```

### Edge Cases

#### Empty Release

If trying to ship a release with no issues:

```text
## Cannot Ship Empty Release

Release "{version}" has no issues.

A release must have at least one completed issue to ship.

Options:
1. Add issues: /tiki:release add <issue> --to {version}
2. Delete empty release: rm .tiki/releases/{version}.json
```

#### All Issues Already Removed

If all issues were removed during the ship process:

```text
## All Issues Removed

All issues have been removed from the release.

Release "{version}" is now empty and cannot be shipped.

Options:
1. Add new issues and retry
2. Delete the release: rm .tiki/releases/{version}.json
```

#### Concurrent Ship Attempts

If release file is modified during ship:

```text
## Concurrent Modification

The release file was modified during the ship process.

This may indicate another process is working on this release.

Please verify the release state and retry:
  /tiki:release status {version}
```

#### Requirements File Missing (when enabled)

If release has `requirementsEnabled: true` but requirements.json is missing:

```text
## Requirements File Missing

Release has requirements tracking enabled but no requirements file found.

Options:
1. **Continue without requirements** - Ship without requirement verification
2. **Define requirements** - Run /tiki:define-requirements first
3. **Disable requirements** - Update release to disable requirement tracking
4. **Cancel** - Exit without shipping

Enter choice:
```

## Subcommand: yolo

Automated release execution that plans, executes, and ships all issues in a release sequentially with minimal interaction.

### Usage

```text
/tiki:release yolo v1.1                   # Full automated workflow
/tiki:release yolo v1.1 --skip-verify     # Skip requirement verification
/tiki:release yolo v1.1 --no-tag          # Don't create git tag
/tiki:release yolo v1.1 --dry-run         # Show what would happen
/tiki:release yolo v1.1 --continue        # Resume paused execution
/tiki:release yolo v1.1 --from 42         # Start from specific issue
```

**Arguments:**
- `<version>` (required): Version identifier to execute (e.g., v1.1, 2.0.0-beta)

**Flags:**

| Flag | Description |
|------|-------------|
| `--skip-verify` | Skip requirement verification at ship time |
| `--no-tag` | Don't create git tag when shipping the release |
| `--dry-run` | Show execution plan without running |
| `--continue` | Resume a paused YOLO execution |
| `--from <issue>` | Start from a specific issue (skip earlier ones) |

### YOLO State File Schema

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

#### YOLO State Fields

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

### Flow

#### Step 1: Parse and Validate Arguments

Parse the arguments to extract version and flags:

```text
Arguments: $ARGUMENTS
Expected format: yolo <version> [--skip-verify] [--no-tag] [--dry-run] [--continue] [--from <issue>]

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
  const tokens = args.split(/\s+/).filter(t => t && t !== 'yolo');
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

Usage: /tiki:release yolo <version> [flags]

Flags:
  --skip-verify   Skip requirement verification at ship time
  --no-tag        Don't create git tag when shipping
  --dry-run       Show execution plan without running
  --continue      Resume a paused YOLO execution
  --from <issue>  Start from a specific issue

Examples:
  /tiki:release yolo v1.1
  /tiki:release yolo v1.1 --dry-run
  /tiki:release yolo v1.1 --skip-verify --no-tag
```

#### Step 2: Handle --continue Flag

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
  /tiki:release yolo <version>

To see available releases:
  /tiki:release status
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

#### Step 3: Load and Validate Release

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
  /tiki:release new {version}
```

**If release has no issues:**

```text
## Empty Release

Release {version} has no issues to execute.

Add issues first:
  /tiki:release add <issue-number> --to {version}
```

#### Step 4: Calculate Issue Dependency Order

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

#### Step 5: Display Pre-Flight Check

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
- Action: {Plan → Execute → Ship | Execute → Ship | Ship | Already complete}
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

#### Step 6: Initialize YOLO State

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

#### Step 7: Issue Processing Loop

For each issue in dependency order (starting from --from position if provided):

##### Step 7a: Update State - Start Issue

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

##### Step 7b: Check if Planning Needed

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

##### Step 7c: Execute Issue Phases

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

##### Step 7d: Handle Execution Failures

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

1. **Manual fix** - Pause YOLO, fix manually, then `/tiki:release yolo {version} --continue`
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
  /tiki:release yolo {version} --continue

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
  /tiki:release yolo {version} --from {failedIssueNumber}
```

##### Step 7e: Ship Completed Issue

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

##### Step 7f: Update State - Complete Issue

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

#### Step 8: Requirement Verification (unless --skip-verify)

After all issues complete, verify requirements before shipping the release.

##### Step 8a: Check for --skip-verify Flag

**If --skip-verify flag is present:**

```text
## Skipping Requirement Verification

--skip-verify flag provided. Proceeding to ship release.
```

Skip to Step 9.

##### Step 8b: Load Requirements

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

##### Step 8c: Identify Requirements to Verify

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

##### Step 8d: Display Verification Overview

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

##### Step 8e: Auto-Verification Phase

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

##### Step 8f: Auto-Verification Summary

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

##### Step 8g: Manual Verification Flow

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

Note: Run `/tiki:release verify {version}` later to verify these requirements.
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
  /tiki:release yolo {version} --continue

To skip verification and ship:
  /tiki:release yolo {version} --continue --skip-verify
```

Exit execution.

##### Step 8h: Verification Summary

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

##### Step 8i: Update Requirements File

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

#### Step 9: Ship the Release

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

#### Step 10: Display Completion Summary

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
  /tiki:release status

{If no other releases:}
Create a new release:
  /tiki:release new <version>
```

### Error Handling

#### Release Not Found

```text
## Release Not Found

Release "{version}" not found.

Available active releases:
{List releases}

To create a new release:
  /tiki:release new {version}
```

#### GitHub CLI Unavailable

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

#### Circular Dependencies

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

#### State File Corrupted

```text
## YOLO State Corrupted

Unable to read YOLO state file: .tiki/state/yolo.json

Options:
1. **Start fresh** - Delete state and start new YOLO
2. **Restore** - Attempt to reconstruct state from release file
3. **Cancel** - Exit without changes

Enter choice:
```

#### Concurrent YOLO Execution

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

### Edge Cases

#### Empty Release

```text
## Cannot YOLO Empty Release

Release {version} has no issues.

Add issues first:
  /tiki:release add <issue-number> --to {version}
```

#### All Issues Already Completed

```text
## All Issues Already Complete

All {count} issues in release {version} are already completed.

Proceeding directly to requirement verification and shipping.
```

#### Single Issue Release

Handle normally but skip dependency analysis:

```text
## Release YOLO: {version}

### Pre-Flight Check

Release contains 1 issue:
- #{number}: {title}

Proceed with YOLO execution? [Y/n]
```

#### Resume After Issue Removal

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

## Subcommand: sync

Synchronize release state with GitHub milestone. By default, pushes Tiki state to GitHub. Use `--pull` to pull GitHub state to Tiki, or `--two-way` for bidirectional sync.

### Usage

```text
/tiki:release sync v1.1             # Push Tiki state to GitHub milestone
/tiki:release sync v1.1 --pull      # Pull GitHub milestone state to Tiki
/tiki:release sync v1.1 --two-way   # Bidirectional sync (merge changes)
```

**Arguments:**
- `<version>` (required): Version identifier to sync
- `--pull` (optional): Pull GitHub milestone state to Tiki instead of pushing
- `--two-way` (optional): Bidirectional sync, merging changes from both sources

### Flow

#### Step 1: Parse and Validate Arguments

Parse the arguments to extract version and flags:

```text
Arguments: $ARGUMENTS
Expected format: sync <version> [--pull] [--two-way]

Extract:
- version: The version string (e.g., "v1.1")
- pullMode: true if --pull flag is present
- twoWayMode: true if --two-way flag is present
```

If both --pull and --two-way are specified:

```text
## Invalid Flags

Cannot use both --pull and --two-way flags together.

Usage:
  /tiki:release sync v1.1          # Push Tiki -> GitHub
  /tiki:release sync v1.1 --pull   # Pull GitHub -> Tiki
  /tiki:release sync v1.1 --two-way # Merge both directions
```

#### Step 2: Load Release and Validate

Load the release file:

```bash
VERSION="v1.1"
RELEASE_FILE=".tiki/releases/${VERSION}.json"

if [ ! -f "$RELEASE_FILE" ]; then
  echo "RELEASE_NOT_FOUND"
fi
```

If release not found:

```text
## Release Not Found

Release "{version}" not found.

Available active releases:
{List releases}

To create a new release:
  /tiki:release new {version}
```

#### Step 3: Check/Create GitHub Milestone

Check if a GitHub milestone exists for this version:

```bash
# Get repository info
REPO=$(gh repo view --json owner,name --jq '"\(.owner.login)/\(.name)"')

# Look for existing milestone
MILESTONE=$(gh api "repos/${REPO}/milestones" --jq ".[] | select(.title == \"${VERSION}\")")
```

**If milestone exists:**

Extract milestone number and issues:

```bash
MILESTONE_NUMBER=$(echo "$MILESTONE" | jq -r '.number')
MILESTONE_URL=$(echo "$MILESTONE" | jq -r '.html_url')
```

**If milestone does not exist (default push mode):**

Use AskUserQuestion to prompt:

```text
## Milestone Not Found

No GitHub milestone found for {version}.

Options:

1. **Create milestone** - Create milestone "{version}" on GitHub
2. **Skip milestone** - Sync without milestone (local tracking only)
3. **Cancel** - Exit without changes

Enter choice:
```

**Option 1 - Create milestone:**

```bash
# Create milestone
gh api "repos/${REPO}/milestones" \
  -X POST \
  -f title="${VERSION}" \
  -f description="Release ${VERSION}" \
  -f state="open"
```

**If milestone does not exist (--pull mode):**

```text
## Milestone Not Found

Cannot pull from GitHub - no milestone found for {version}.

To create a milestone:
  /tiki:release sync {version}  # This will offer to create it

Or create manually on GitHub.
```

#### Step 4: Fetch GitHub Milestone Issues

Get all issues assigned to the milestone:

```bash
MILESTONE_ISSUES=$(gh api "repos/${REPO}/issues?milestone=${MILESTONE_NUMBER}&state=all" \
  --jq '[.[] | {number: .number, title: .title, state: .state}]')
```

Parse the results:

```javascript
// GitHub issues from milestone
const githubIssues = JSON.parse(MILESTONE_ISSUES).map(issue => ({
  number: issue.number,
  title: issue.title,
  closed: issue.state === 'closed'
}));

// Tiki issues from release file
const tikiIssues = release.issues.map(issue => ({
  number: issue.number,
  title: issue.title,
  completed: issue.status === 'completed'
}));
```

#### Step 5: Detect Changes

Compare Tiki and GitHub states to identify differences:

```javascript
function detectChanges(tikiIssues, githubIssues) {
  const changes = {
    tikiOnly: [],      // Issues in Tiki but not in GitHub milestone
    githubOnly: [],    // Issues in GitHub milestone but not in Tiki
    statusMismatch: [] // Issues with different completion status
  };

  const tikiNumbers = new Set(tikiIssues.map(i => i.number));
  const githubNumbers = new Set(githubIssues.map(i => i.number));

  // Issues only in Tiki
  for (const issue of tikiIssues) {
    if (!githubNumbers.has(issue.number)) {
      changes.tikiOnly.push(issue);
    }
  }

  // Issues only in GitHub
  for (const issue of githubIssues) {
    if (!tikiNumbers.has(issue.number)) {
      changes.githubOnly.push(issue);
    }
  }

  // Status mismatches (in both, but different state)
  for (const tikiIssue of tikiIssues) {
    const githubIssue = githubIssues.find(i => i.number === tikiIssue.number);
    if (githubIssue) {
      const tikiClosed = tikiIssue.completed;
      const githubClosed = githubIssue.closed;
      if (tikiClosed !== githubClosed) {
        changes.statusMismatch.push({
          number: tikiIssue.number,
          title: tikiIssue.title,
          tikiStatus: tikiClosed ? 'completed' : 'in_progress',
          githubStatus: githubClosed ? 'closed' : 'open'
        });
      }
    }
  }

  return changes;
}
```

#### Step 6: Display Diff

**If no changes detected:**

```text
## Release {version} In Sync

No differences found between Tiki and GitHub milestone.

Local issues: {tikiCount}
Milestone issues: {githubCount}

State is synchronized.
```

**If changes detected:**

```text
## Sync Diff: {version}

Comparing Tiki release with GitHub milestone #{milestoneNumber}

{If tikiOnly.length > 0:}
### Issues in Tiki (not in GitHub milestone)

| Issue | Title | Status |
|-------|-------|--------|
{For each tikiOnly issue:}
| #{number} | {title} | {status} |

{If githubOnly.length > 0:}
### Issues in GitHub (not in Tiki release)

| Issue | Title | State |
|-------|-------|-------|
{For each githubOnly issue:}
| #{number} | {title} | {state} |

{If statusMismatch.length > 0:}
### Status Mismatches

| Issue | Title | Tiki Status | GitHub State |
|-------|-------|-------------|--------------|
{For each statusMismatch issue:}
| #{number} | {title} | {tikiStatus} | {githubStatus} |

### Summary

| Change Type | Count |
|-------------|-------|
| Tiki-only issues | {tikiOnly.length} |
| GitHub-only issues | {githubOnly.length} |
| Status mismatches | {statusMismatch.length} |
| Total changes | {total} |
```

#### Step 7: Confirm and Apply Changes

Based on the sync mode, apply the appropriate changes.

##### Default Mode (Tiki -> GitHub)

Push Tiki state to GitHub:

```text
### Applying Changes: Tiki -> GitHub

This will:
{If tikiOnly.length > 0:}
- Add {tikiOnly.length} issues to GitHub milestone
{If githubOnly.length > 0:}
- (GitHub-only issues will remain in milestone)
{If statusMismatch.length > 0:}
- Update {statusMismatch.length} issue states on GitHub

Proceed? [Y/n]
```

**Apply changes:**

For each Tiki-only issue (add to milestone):

```bash
gh issue edit {number} --milestone "{VERSION}"
```

For each status mismatch (update GitHub to match Tiki):

```bash
# If Tiki says completed but GitHub is open, close the issue
if [ "{tikiStatus}" = "completed" ] && [ "{githubStatus}" = "open" ]; then
  gh issue close {number}
fi

# If Tiki says not completed but GitHub is closed, reopen
if [ "{tikiStatus}" != "completed" ] && [ "{githubStatus}" = "closed" ]; then
  gh issue reopen {number}
fi
```

**Display result:**

```text
## Sync Complete: Tiki -> GitHub

### Actions Taken

{For each tikiOnly issue:}
- Added #{number} to milestone {VERSION}
{For each status change:}
- {Closed/Reopened} #{number} to match Tiki status

### Final State

| Source | Issues |
|--------|--------|
| Tiki release | {tikiCount} |
| GitHub milestone | {newGithubCount} |

{If githubOnly.length > 0:}
**Note:** {githubOnly.length} issues exist in GitHub milestone but not in Tiki:
{List them}

To pull these into Tiki:
  /tiki:release sync {version} --pull
```

##### Pull Mode (GitHub -> Tiki)

Pull GitHub state to Tiki:

```text
### Applying Changes: GitHub -> Tiki

This will:
{If githubOnly.length > 0:}
- Add {githubOnly.length} issues to Tiki release
{If tikiOnly.length > 0:}
- (Tiki-only issues will remain in release)
{If statusMismatch.length > 0:}
- Update {statusMismatch.length} issue statuses in Tiki

Proceed? [Y/n]
```

**Apply changes:**

For each GitHub-only issue (add to Tiki):

```javascript
// Fetch full issue details from GitHub
const issueDetails = await gh(`issue view ${number} --json number,title,state,labels`);

// Add to release file
release.issues.push({
  number: issueDetails.number,
  title: issueDetails.title,
  status: issueDetails.state === 'closed' ? 'completed' : 'not_planned',
  requirements: [],
  currentPhase: null,
  totalPhases: null,
  completedAt: issueDetails.state === 'closed' ? new Date().toISOString() : null
});
```

For each status mismatch (update Tiki to match GitHub):

```javascript
const tikiIssue = release.issues.find(i => i.number === number);
if (githubClosed && !tikiIssue.completed) {
  tikiIssue.status = 'completed';
  tikiIssue.completedAt = new Date().toISOString();
} else if (!githubClosed && tikiIssue.completed) {
  tikiIssue.status = 'in_progress';
  tikiIssue.completedAt = null;
}
```

Save the updated release file:

```bash
# Write updated release file
cat > ".tiki/releases/${VERSION}.json" << EOF
${JSON.stringify(release, null, 2)}
EOF
```

**Display result:**

```text
## Sync Complete: GitHub -> Tiki

### Actions Taken

{For each githubOnly issue:}
- Added #{number} ({title}) to release
{For each status change:}
- Updated #{number} status to {newStatus}

### Final State

| Source | Issues |
|--------|--------|
| Tiki release | {newTikiCount} |
| GitHub milestone | {githubCount} |

{If tikiOnly.length > 0:}
**Note:** {tikiOnly.length} issues exist in Tiki but not in GitHub milestone:
{List them}

To push these to GitHub:
  /tiki:release sync {version}
```

##### Two-Way Mode (Bidirectional)

Merge changes from both directions:

```text
### Applying Changes: Two-Way Sync

This will:
{If tikiOnly.length > 0:}
- Add {tikiOnly.length} Tiki issues to GitHub milestone
{If githubOnly.length > 0:}
- Add {githubOnly.length} GitHub issues to Tiki release
{If statusMismatch.length > 0:}
- Resolve {statusMismatch.length} status conflicts (Tiki wins by default)

Proceed? [Y/n]
```

**Handle status conflicts:**

If there are status mismatches, prompt for each:

```text
### Status Conflict: #{number}

Issue: {title}
- Tiki status: {tikiStatus}
- GitHub status: {githubStatus}

Which status should win?

1. **Tiki** - Update GitHub to match Tiki ({tikiStatus})
2. **GitHub** - Update Tiki to match GitHub ({githubStatus})
3. **Skip** - Leave both unchanged

Enter choice [1]:
```

Default to Tiki winning (option 1) if user just presses Enter.

**Apply changes:**

1. Add Tiki-only issues to GitHub milestone (same as default mode)
2. Add GitHub-only issues to Tiki release (same as pull mode)
3. Resolve status conflicts based on user choices

**Display result:**

```text
## Sync Complete: Two-Way

### Actions Taken

**Tiki -> GitHub:**
{For each tikiOnly:}
- Added #{number} to milestone
{For each conflict where Tiki won:}
- {Closed/Reopened} #{number} on GitHub

**GitHub -> Tiki:**
{For each githubOnly:}
- Added #{number} to release
{For each conflict where GitHub won:}
- Updated #{number} status in Tiki

### Final State

| Source | Issues |
|--------|--------|
| Tiki release | {tikiCount} |
| GitHub milestone | {githubCount} |

Both sources are now synchronized.
```

### Error Handling

#### GitHub CLI Unavailable

```text
## GitHub CLI Error

Unable to communicate with GitHub.

Sync requires GitHub CLI for milestone operations.

Please ensure `gh` is installed and authenticated:
  gh auth login
```

#### Milestone API Error

```text
## Milestone Error

Failed to {action} milestone: {error}

This may be due to:
- Insufficient permissions
- Rate limiting
- Network issues

Please try again or check GitHub status.
```

#### Issue Assignment Error

```text
## Issue Assignment Error

Failed to assign issue #{number} to milestone {version}:
{error}

The issue may:
- Not exist
- Be in a different repository
- Already be assigned to another milestone

Skipping this issue. Continue with remaining issues? [Y/n]
```

#### Release File Write Error

```text
## File Write Error

Failed to update release file: {error}

No changes were applied to GitHub.

Please check file permissions and try again.
```

### Edge Cases

#### Empty Release

```text
## Syncing Empty Release

Tiki release {version} has no issues.

{If milestone has issues:}
GitHub milestone has {count} issues.

Pull them into Tiki?
  /tiki:release sync {version} --pull

{If milestone is also empty:}
Both Tiki release and GitHub milestone are empty.

Add issues first:
  /tiki:release add <issue> --to {version}
```

#### Milestone Has Different Name

If milestone exists with slightly different name (e.g., "v1.1.0" vs "v1.1"):

```text
## Milestone Name Mismatch

Found similar milestone: "{foundName}" (expecting "{version}")

Options:

1. **Use existing** - Sync with "{foundName}"
2. **Create new** - Create new milestone "{version}"
3. **Cancel** - Exit without changes

Enter choice:
```

#### Large Number of Changes

If more than 10 changes detected:

```text
## Large Sync Detected

This sync will modify {count} items:
- {tikiOnlyCount} issues to add to GitHub
- {githubOnlyCount} issues to add to Tiki
- {mismatchCount} status changes

This is a significant change. Please review the diff above carefully.

Are you sure you want to proceed? [y/N]
```

(Note: Default to "N" for large syncs)

#### Concurrent Modification Warning

If the release file was modified since loading:

```text
## Concurrent Modification

The release file has been modified since sync started.

Another process may have updated it.

Options:

1. **Reload and retry** - Load fresh data and recalculate diff
2. **Force apply** - Apply changes anyway (may lose updates)
3. **Cancel** - Exit without changes

Enter choice:
```

## Error Handling

### Invalid Version Format

```text
Invalid version format: "{input}"

Version must follow semver-like format:
- v1.0.0 (full version with prefix)
- v1.1 (major.minor with prefix)
- 2.0.0-beta (with prerelease identifier)
- v1.0.0-rc.1 (release candidate)

Examples of valid versions:
  v1.0, v2.1.0, 1.0.0, 2.0.0-alpha, v3.0.0-beta.2
```

### Release Not Found

```text
Release "{version}" not found.

Available releases:
- v1.0 (active)
- v0.9 (shipped)

Create a new release: /tiki:release new <version>
```

### No Active Release

```text
No active release found.

To create a new release:
  /tiki:release new <version>

To view archived releases:
  ls .tiki/releases/archive/
```

### Issue Not Found

```text
Issue #{number} not found on GitHub.

Verify the issue exists:
  gh issue view {number}
```

## Notes

- Releases are stored as JSON files in `.tiki/releases/`
- Shipped releases are moved to `.tiki/releases/archive/`
- Issue status is synced from Tiki plan files when available
- GitHub milestones can optionally be linked to releases
- Requirements tracking can be enabled per-release
- Version validation accepts common semver variants with or without 'v' prefix
