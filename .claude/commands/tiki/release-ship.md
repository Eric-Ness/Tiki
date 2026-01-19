---
type: prompt
name: tiki:release-ship
description: Ship a release (close issues, create tag, archive)
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
argument-hint: <version>
---

# Release Ship

Ship and archive a completed release. Performs comprehensive verification, closes GitHub milestone, archives the release, and optionally creates a git tag.

## Usage

```text
/tiki:release-ship v1.1
```

**Arguments:**
- `<version>` (required): Version identifier to ship (e.g., v1.1, 2.0.0-beta)

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
      "status": "completed",
      "requirements": ["AUTH-01", "AUTH-02"],
      "currentPhase": null,
      "totalPhases": 3,
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

## Instructions

### Step 1: Parse Arguments

Parse the arguments to extract the version:

```text
Arguments: $ARGUMENTS
Expected format: <version>

Extract:
- version: The version string to ship (e.g., "v1.1", "2.0.0-beta")
```

If version is missing:

```text
## Missing Version

Usage: /tiki:release-ship <version>

Example:
  /tiki:release-ship v1.1

To see available releases:
  /tiki:release-status
```

### Step 2: Load Release

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
  /tiki:release-new {version}
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
  /tiki:release-new <new-version>
```

### Step 3: Pre-Ship Verification - Check GitHub Issue States

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

### Step 4: Block if Issues Not Closed

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
   /tiki:release-ship {version}
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
  /tiki:release-ship {version}
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
- Remove each open issue from the release (filter out from issues array)
- Continue to next verification step

If declined:
- Exit with "Ship cancelled."

**Option 3: Cancel**

Exit with "Ship cancelled."

### Step 5: Pre-Ship Verification - Requirements Check (if enabled)

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

### Step 6: Interactive Verification Flow (for unverified requirements)

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

### Step 7: Close GitHub Milestone (if synced)

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

### Step 8: Archive Release

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

### Step 9: Optional Git Tag Creation

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

### Step 10: Display Ship Summary

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
  /tiki:release-status {nextVersion}

{If no other active releases:}
**No other active releases.**

Create a new release:
  /tiki:release-new <version>

View shipped releases:
  ls .tiki/releases/archive/

---

Congratulations on shipping {version}!
```

## Error Handling

### Release Not Found

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
  /tiki:release-new <version>
```

### GitHub API Errors

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

### Git Tag Errors

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

### Archive Directory Permission Error

```text
## Archive Error

Unable to create archive directory or write archive file.

Error: {error message}

Check permissions:
  ls -la .tiki/releases/

Create directory manually:
  mkdir -p .tiki/releases/archive

Then retry:
  /tiki:release-ship {version}
```

### Release File Corrupted

```text
## Release File Error

Unable to parse release file: .tiki/releases/{version}.json

Error: {parse error}

The file may be corrupted. Options:

1. **View raw file:** cat .tiki/releases/{version}.json
2. **Restore from backup:** If you have a backup
3. **Recreate release:** /tiki:release-new {version}

Note: Recreating will lose issue assignments. Add them back with:
  /tiki:release-add <issue-numbers> --to {version}
```

## Edge Cases

### Empty Release

If trying to ship a release with no issues:

```text
## Cannot Ship Empty Release

Release "{version}" has no issues.

A release must have at least one completed issue to ship.

Options:
1. Add issues: /tiki:release-add <issue> --to {version}
2. Delete empty release: rm .tiki/releases/{version}.json
```

### All Issues Already Removed

If all issues were removed during the ship process:

```text
## All Issues Removed

All issues have been removed from the release.

Release "{version}" is now empty and cannot be shipped.

Options:
1. Add new issues and retry
2. Delete the release: rm .tiki/releases/{version}.json
```

### Concurrent Ship Attempts

If release file is modified during ship:

```text
## Concurrent Modification

The release file was modified during the ship process.

This may indicate another process is working on this release.

Please verify the release state and retry:
  /tiki:release-status {version}
```

### Requirements File Missing (when enabled)

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
