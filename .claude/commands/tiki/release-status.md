---
type: prompt
name: tiki:release-status
description: Display release status and progress
allowed-tools: Bash, Read, Glob, Grep
argument-hint: [version]
---

# Release Status

Display release status and progress. Shows all active releases when no version is specified, or detailed view of a specific release.

## Usage

```text
/tiki:release-status           # Show all active releases summary
/tiki:release-status v1.1      # Show detailed status of specific release
```

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

Parse the arguments to determine if a specific version is requested:

```text
Arguments: $ARGUMENTS
Expected format: [version]

Extract:
- version: Optional version string (e.g., "v1.1", "2.0.0-beta")
```

### Step 2: Route to Appropriate View

If a version is specified, show single release detailed view.
If no version is specified, show all releases summary view.

---

## All Releases View (no version specified)

When no version is provided, display a summary of all active releases.

### Step A1: Scan for Active Releases

```bash
# List all active release files
ls .tiki/releases/*.json 2>/dev/null || echo "NO_RELEASES"
```

### Step A2: Handle No Releases Case

If no release files found:

```text
## No Active Releases

No active releases found.

To create a new release:
  /tiki:release-new <version>

To view archived releases:
  ls .tiki/releases/archive/
```

### Step A3: Load and Process Each Release

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

### Step A4: Display All Releases Summary

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

- View detailed status: `/tiki:release-status <version>`
- Add issue to release: `/tiki:release-add <issue> --to <version>`
- Ship completed release: `/tiki:release-ship <version>`
```

### Step A5: Identify Ready-to-Ship Releases

Check if any releases are at 100% completion:

```text
{If any release has 100% issue completion:}

### Ready to Ship

The following releases appear ready to ship:

| Version | Issues | Requirements |
|---------|--------|--------------|
| v1.1    | 5/5 complete | 8/8 verified |

Ship with: `/tiki:release-ship v1.1`
```

---

## Single Release View (version specified)

When a specific version is provided, display detailed release information.

### Step S1: Load the Specified Release

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

### Step S2: Handle Release Not Found

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
  /tiki:release-new {version}
```

### Step S3: Update Issue Status from External Sources

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

### Step S4: Calculate Progress Metrics

```javascript
const total = release.issues.length;
const completed = release.issues.filter(i => i.status === 'completed').length;
const inProgress = release.issues.filter(i => i.status === 'in_progress').length;
const planned = release.issues.filter(i => i.status === 'planned').length;
const notPlanned = release.issues.filter(i => i.status === 'not_planned').length;
const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
```

### Step S5: Build Visual Progress Bar

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

### Step S6: Display Release Header

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

### Step S7: Display Progress Overview

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

### Step S8: Display Issues Table with Timeline

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

### Step S9: Display Requirements Coverage Table (if enabled)

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

### Step S10: Display Timeline Visualization

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

### Step S11: Suggest Next Action

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
      command: `/tiki:release-ship ${release.version}`
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
      command: `/tiki:release-add <issue-number> --to ${release.version}`
    };
  }

  return {
    action: 'review',
    message: 'Review the release status.',
    command: `/tiki:release-status ${release.version}`
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
/tiki:release-ship {version}
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
/tiki:release-add <issue-number> --to {version}
```
```

### Step S12: Display Full Status Output

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

## Error Handling

### Release Not Found

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
  /tiki:release-new <version>

{If version looks like a typo, suggest closest match:}
Did you mean: {closest_version}?
```

### No Releases Exist

```text
## No Releases

No active or archived releases found.

To create your first release:
  /tiki:release-new <version>

Example:
  /tiki:release-new v1.0
```

### GitHub CLI Unavailable

If `gh` commands fail during status resolution:

```text
## GitHub Status Unavailable

Could not fetch latest issue states from GitHub.
Showing cached status from release file.

Note: Issue states may be outdated. To refresh:
1. Ensure GitHub CLI is installed and authenticated
2. Run `/tiki:release-status {version}` again

Continuing with cached data...
```

Then proceed with display using only cached data from the release file.

### Empty Release

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
  /tiki:release-add <issue-number> --to {version}

To view available issues:
  gh issue list --state open
```
