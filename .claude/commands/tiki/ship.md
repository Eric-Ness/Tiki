---
type: prompt
name: tiki:ship
description: Close out a completed issue by committing, pushing, and closing the GitHub issue. Use when you're done with an issue.
allowed-tools: Read, Bash, Glob, Write, AskUserQuestion, Skill
argument-hint: [--no-push] [--no-close]
---

# Ship

Wrap up a completed issue: commit any remaining changes, push to remote, and close the GitHub issue.

## Usage

```
/tiki:ship
/tiki:ship --no-push    # Commit but don't push
/tiki:ship --no-close   # Commit and push but don't close the issue
```

## Instructions

### Step 1: Check Tiki State

Read `.tiki/state/current.json` to get the active issue:

```json
{
  "activeIssue": 34,
  "currentPhase": 3,
  "status": "in_progress"
}
```

If no active issue:
```
No active Tiki issue found.

Use /tiki:get-issue to start working on an issue first.
```

Also read the plan file `.tiki/plans/issue-<N>.json` to get issue details and verify all phases are complete.

### Step 2: Verify Phase Completion

Check that all phases are marked as completed in the plan file.

If any phases are not complete:
```
## Incomplete Phases

The following phases are not yet complete:
- Phase 2: Add login endpoint (in_progress)
- Phase 3: Add tests (pending)

Complete all phases before shipping, or use /tiki:skip-phase to skip remaining work.
```

### Step 3: Check for Uncommitted Changes

```bash
git status --porcelain
```

If there are uncommitted changes:

```
## Uncommitted Changes Detected

The following files have changes:
 M src/routes/auth.ts
 M tests/auth.test.ts
 A src/middleware/jwt.ts

Stage and commit these changes? [Y/n]
```

If user confirms, stage and commit with a closing message:

```bash
git add .
git commit -m "$(cat <<'EOF'
feat: Complete issue #34 - Add user authentication

Final changes for issue completion.
- <summary of remaining changes>

Closes #34
EOF
)"
```

If no changes to commit, skip to Step 4.

### Step 4: Push to Remote

Unless `--no-push` flag is present:

```bash
git push
```

Report result:
```
Pushed to origin/main
```

If push fails:
```
Push failed. You may need to pull first:
  git pull --rebase origin main

Then run /tiki:ship again.
```

### Step 5: Close GitHub Issue

Unless `--no-close` flag is present:

```bash
gh issue close <issue-number> --comment "Completed and shipped! 🚀"
```

If `gh` is not available or fails:
```
Could not close issue automatically.
Please close issue #34 manually at:
https://github.com/<owner>/<repo>/issues/34
```

### Step 6: Bump Version (Tiki repo only)

**This step only applies when working on the Tiki project itself** (i.e., the repo containing `.claude/commands/tiki/`).

Check if this is the Tiki repo by verifying `.claude/commands/tiki/ship.md` exists in the project root. If not, skip this step.

If this IS the Tiki repo, read `version.json` from the project root and increment the patch version:

```json
{
  "version": "1.0.0",  // becomes "1.0.1"
  "releaseDate": "2026-01-14",  // update to today
  "changelog": [...]
}
```

1. Parse the current version (e.g., "1.0.0")
2. Increment the patch number: "1.0.0" → "1.0.1"
3. Update `releaseDate` to today's date
4. Add a changelog entry for this issue:

```json
{
  "version": "1.0.1",
  "date": "2026-01-15",
  "changes": [
    "Issue #34: Add user authentication"
  ]
}
```

Write the updated `version.json` back to the file.

If version.json doesn't exist, create it with version "0.0.1".

**For other projects using Tiki:** This version bump step is skipped. Projects can add their own versioning logic if desired.

### Step 6.5: Update Release Progress (Optional)

This step updates release and requirements tracking when the shipped issue is part of a release. **This step is purely informational and should NEVER cause ship to fail.**

#### Check if Issue is in a Release

First, check if the plan file has a `release` field:

```javascript
// From plan file loaded in Step 1
const planRelease = plan.release; // { version: "v1.1", milestone: "..." } or undefined
```

If no release field, also scan active release files:

```bash
# Find if issue is in any release
for file in .tiki/releases/*.json; do
  if grep -q "\"number\": $ISSUE_NUMBER" "$file" 2>/dev/null; then
    echo "$file"
    break
  fi
done
```

If the issue is not in any release, skip this step silently.

#### Update Issue Status in Release File

If issue is part of a release:

1. Load the release file (`.tiki/releases/<version>.json`)
2. Find the issue in the `issues` array
3. Update the issue's status:

```javascript
// Find and update issue in release
const issueEntry = release.issues.find(i => i.number === issueNumber);
if (issueEntry) {
  issueEntry.status = 'completed';
  issueEntry.completedAt = new Date().toISOString();
  issueEntry.currentPhase = null;  // Clear current phase since completed
}

// Recalculate totals (count completed vs total)
const completed = release.issues.filter(i => i.status === 'completed').length;
const total = release.issues.length;
```

4. Write the updated release file

**Error handling:**
- If release file doesn't exist: Log warning "Release file not found for {version}, skipping release update", continue
- If release file is invalid JSON: Log warning "Could not parse release file for {version}, skipping release update", continue
- If issue not found in release: Continue silently

#### Update Requirements Status

If the issue addresses requirements (from `plan.addressesRequirements` or release issue's `requirements` field):

1. Load `.tiki/requirements.json`
2. For each requirement ID the issue addresses:
   - Find the requirement in the categories
   - Update status to 'implemented' (if currently 'pending')
   - Add issue number to `implementedBy` array if not already present
   - Update `updatedAt` timestamp

```javascript
// For each requirement the issue addresses
for (const reqId of addressedRequirements) {
  for (const category of requirements.categories) {
    const req = category.requirements.find(r => r.id === reqId);
    if (req && req.status === 'pending') {
      req.status = 'implemented';
      if (!req.implementedBy.includes(issueNumber)) {
        req.implementedBy.push(issueNumber);
      }
    }
  }
}
requirements.updatedAt = new Date().toISOString();
```

3. Write the updated requirements.json

**Error handling:**
- If requirements.json doesn't exist: Skip silently
- If requirements.json is invalid JSON: Log warning "Could not parse requirements.json, skipping requirement update", continue
- If requirement not found: Continue silently

#### Track Updates for Summary

Store information for Step 8 summary:
- `releaseUpdated`: boolean - whether release was updated
- `releaseVersion`: string - the release version
- `releaseProgress`: { completed: number, total: number }
- `remainingIssues`: array of { number, title } for incomplete issues
- `requirementsUpdated`: array of requirement IDs that were updated

### Step 7: Clean Up Tiki State

Update `.tiki/state/current.json` to clear the active issue:

```json
{
  "activeIssue": null,
  "currentPhase": null,
  "status": "idle",
  "lastCompletedIssue": 34,
  "lastCompletedAt": "2026-01-14T15:30:00Z"
}
```

Update the plan file status:

```json
{
  "issue": 34,
  "status": "shipped",
  "shippedAt": "2026-01-14T15:30:00Z"
}
```

### Step 8: Report Results

Display a summary:

```
## Shipped! 🚀

Issue #34: Add user authentication

Summary:
- 3 phases completed
- 5 commits made
- Issue closed on GitHub
- Version: 1.0.0 → 1.0.1

Git log for this issue:
  abc1234 feat(auth): Add user model (#34)
  def5678 feat(auth): Add login endpoint (#34)
  ghi9012 test(auth): Add authentication tests (#34)
  jkl3456 feat: Complete issue #34 - Add user authentication
```

#### Release Progress (if applicable)

If release progress was updated in Step 6.5, append to the summary:

```
Release Progress:
- Requirement AUTH-01 marked as "implemented"
- Release v1.1 progress: 3/5 issues (60%)

Remaining issues in v1.1:
  #37: Add password reset
  #38: Add session management

When all issues complete, run: /tiki:release ship v1.1
```

**Display rules:**

- Only show this section if `releaseUpdated` is true from Step 6.5
- Show requirement updates only if `requirementsUpdated` array is not empty
- Calculate percentage as `Math.round((completed / total) * 100)`
- List remaining issues (those with status not "completed")
- When all issues are complete (completed === total), show:

```text
All issues in v1.1 complete!
Ready to ship release: /tiki:release ship v1.1
```

**If release update failed with warnings:**
```
Note: Could not update release tracking (see warnings above).
The issue was shipped successfully.
```

#### Offer Next Steps (if enabled)

After displaying the success report:

1. Read `.tiki/config.json`
2. If `workflow.showNextStepMenu` is `false`, skip this section entirely
3. If ship failed at any point, skip this section (keep existing error handling)

Use `AskUserQuestion` tool to present options:

- "What's next (Recommended)" (description: "See suggested next actions") → invoke Skill tool with skill "tiki:whats-next"
- "Get new issue" (description: "Start working on a specific issue") → invoke Skill tool with skill "tiki:get-issue"
- "View state" (description: "Check current Tiki status") → invoke Skill tool with skill "tiki:state"
- "Done for now" (description: "Exit without further action") → end without invoking any skill

Based on user selection, invoke the appropriate Skill tool or end if "Done for now" is selected.

---

## Examples

### Example 1: Clean Ship

```
> /tiki:ship

## Shipping Issue #34

Checking state... Active issue: #34 (Add user authentication)
Checking phases... All 3 phases complete ✓
Checking changes... Working tree clean ✓

Pushing to origin...
Pushed to origin/main ✓

Closing issue #34...
Issue #34 closed ✓

Bumping version...
1.0.0 → 1.0.1 ✓

Cleaning up state...
State cleared ✓

## Shipped! 🚀

Issue #34: Add user authentication

Summary:
- 3 phases completed
- 4 commits made
- Issue closed on GitHub

[Next step menu appears if enabled in config]
```

### Example 2: Ship with Uncommitted Changes

```
> /tiki:ship

## Shipping Issue #35

Checking state... Active issue: #35 (Fix login redirect)
Checking phases... All phases complete ✓
Checking changes... Uncommitted changes found

## Uncommitted Changes

 M src/routes/auth.ts
 M tests/redirect.test.ts

Stage and commit? [Y/n]
> Y

Committing...
Committed: xyz7890
feat: Complete issue #35 - Fix login redirect

Pushing to origin...
Pushed to origin/main ✓

Closing issue #35...
Issue #35 closed ✓

## Shipped! 🚀
```

### Example 3: Ship Without Push

```
> /tiki:ship --no-push

## Shipping Issue #36

Checking state... Active issue: #36
Checking phases... All phases complete ✓
Checking changes... Working tree clean ✓

Skipping push (--no-push flag)

Closing issue #36...
Issue #36 closed ✓

## Shipped! 🚀

Note: Changes not pushed. Run `git push` when ready.
```

### Example 4: Incomplete Phases

```
> /tiki:ship

## Shipping Issue #37

Checking state... Active issue: #37
Checking phases... INCOMPLETE

## Cannot Ship - Incomplete Phases

- Phase 1: Setup database ✓
- Phase 2: Add API endpoints (in_progress)
- Phase 3: Add tests (pending)

Options:
1. Complete remaining phases with /tiki:execute
2. Skip remaining phases with /tiki:skip-phase 2
3. Force ship anyway (not recommended)

Would you like to skip remaining phases? [y/N]
```

---

## Error Handling

### No Active Issue
```
No active Tiki issue found.

Start working on an issue first:
  /tiki:get-issue <number>
  /tiki:whats-next
```

### Push Fails
```
Push failed: rejected (non-fast-forward)

Your branch is behind origin. Options:
1. Pull and rebase: git pull --rebase origin main
2. Force push (if safe): git push --force-with-lease

After resolving, run /tiki:ship again.
```

### GitHub CLI Not Available
```
Could not close issue: GitHub CLI (gh) not found.

Install GitHub CLI: https://cli.github.com/

Or close the issue manually:
https://github.com/<owner>/<repo>/issues/34
```

### Not Authenticated
```
Could not close issue: Not authenticated with GitHub.

Run: gh auth login

Then try /tiki:ship again.
```

---

## Notes

- Ship is the final step in the Tiki workflow
- Always verifies phases are complete before shipping
- Creates a clear record of issue completion
- Cleans up state so you're ready for the next issue
- The "Closes #N" in commit messages auto-closes issues on push (GitHub feature)
