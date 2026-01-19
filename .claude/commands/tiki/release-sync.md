---
type: prompt
name: tiki:release-sync
description: Synchronize release state with GitHub milestone
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
argument-hint: <version> [--pull] [--two-way]
---

# Release Sync

Synchronize release state with GitHub milestone. By default, pushes Tiki state to GitHub. Use `--pull` to pull GitHub state to Tiki, or `--two-way` for bidirectional sync.

## Usage

```text
/tiki:release-sync v1.1             # Push Tiki state to GitHub milestone
/tiki:release-sync v1.1 --pull      # Pull GitHub milestone state to Tiki
/tiki:release-sync v1.1 --two-way   # Bidirectional sync (merge changes)
```

**Arguments:**
- `<version>` (required): Version identifier to sync
- `--pull` (optional): Pull GitHub milestone state to Tiki instead of pushing
- `--two-way` (optional): Bidirectional sync, merging changes from both sources

## Helper Functions

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

## Flow

### Step 1: Parse and Validate Arguments

Parse the arguments to extract version and flags:

```text
Arguments: $ARGUMENTS
Expected format: <version> [--pull] [--two-way]

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
  /tiki:release-sync v1.1          # Push Tiki -> GitHub
  /tiki:release-sync v1.1 --pull   # Pull GitHub -> Tiki
  /tiki:release-sync v1.1 --two-way # Merge both directions
```

### Step 2: Load Release and Validate

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
  /tiki:release-new {version}
```

### Step 3: Check/Create GitHub Milestone

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
  /tiki:release-sync {version}  # This will offer to create it

Or create manually on GitHub.
```

### Step 4: Fetch GitHub Milestone Issues

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

### Step 5: Detect Changes

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

### Step 6: Display Diff

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

### Step 7: Confirm and Apply Changes

Based on the sync mode, apply the appropriate changes.

#### Default Mode (Tiki -> GitHub)

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
  /tiki:release-sync {version} --pull
```

#### Pull Mode (GitHub -> Tiki)

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
  /tiki:release-sync {version}
```

#### Two-Way Mode (Bidirectional)

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

## Error Handling

### GitHub CLI Unavailable

```text
## GitHub CLI Error

Unable to communicate with GitHub.

Sync requires GitHub CLI for milestone operations.

Please ensure `gh` is installed and authenticated:
  gh auth login
```

### Milestone API Error

```text
## Milestone Error

Failed to {action} milestone: {error}

This may be due to:
- Insufficient permissions
- Rate limiting
- Network issues

Please try again or check GitHub status.
```

### Issue Assignment Error

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

### Release File Write Error

```text
## File Write Error

Failed to update release file: {error}

No changes were applied to GitHub.

Please check file permissions and try again.
```

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

Create a new release: /tiki:release-new <version>
```

## Edge Cases

### Empty Release

```text
## Syncing Empty Release

Tiki release {version} has no issues.

{If milestone has issues:}
GitHub milestone has {count} issues.

Pull them into Tiki?
  /tiki:release-sync {version} --pull

{If milestone is also empty:}
Both Tiki release and GitHub milestone are empty.

Add issues first:
  /tiki:release-add <issue> --to {version}
```

### Milestone Has Different Name

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

### Large Number of Changes

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

### Concurrent Modification Warning

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

## Notes

- Releases are stored as JSON files in `.tiki/releases/`
- Shipped releases are moved to `.tiki/releases/archive/`
- Issue status is synced from Tiki plan files when available
- GitHub milestones can optionally be linked to releases
- Version validation accepts common semver variants with or without 'v' prefix
