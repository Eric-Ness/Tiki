---
type: prompt
name: tiki:pick-issue
description: Analyze open GitHub issues and recommend which one to work on next, with reasoning.
allowed-tools: Bash, Read, AskUserQuestion
argument-hint: [--limit N]
---

# Pick Issue

Analyze open GitHub issues and recommend which one to work on next based on priority, dependencies, and age. This helps you decide what to tackle when you have multiple issues competing for attention.

## Usage

```
/tiki:pick-issue
/tiki:pick-issue --limit 15
```

## Instructions

### Step 1: Parse Arguments

Extract the `--limit` value from arguments:
- If `--limit N` is provided, use N as the fetch limit
- Default to 25 if not specified

### Step 2: Read Configuration

Read `.tiki/config.json` for `pickIssue` settings:

```json
{
  "pickIssue": {
    "preferLabels": ["high-priority", "critical", "urgent"],
    "deferLabels": ["backlog", "someday", "low-priority"],
    "excludeLabels": ["wontfix", "duplicate", "invalid"],
    "maxIssues": 25
  }
}
```

If config doesn't exist or `pickIssue` section is missing, use defaults:
- `preferLabels`: `["high-priority", "critical"]`
- `deferLabels`: `["backlog", "someday"]`
- `excludeLabels`: `["wontfix", "duplicate"]`
- `maxIssues`: 25

### Step 3: Fetch Open Issues

Fetch open issues using GitHub CLI:

```bash
gh issue list --state open --limit <N> --json number,title,labels,body,createdAt
```

Filter out issues with any `excludeLabels`.

### Step 4: Build Dependency Map

Scan each issue body for dependency patterns:

| Pattern | Meaning |
|---------|---------|
| `blocked by #N`, `depends on #N`, `requires #N` | This issue is blocked by issue N |
| `blocks #N`, `unblocks #N` | This issue enables/unblocks issue N |

Build a map of:
- `blockedBy[issueNum]` = list of issues blocking this one
- `enables[issueNum]` = list of issues this one unblocks

### Step 5: Score Each Issue

Calculate a score for each issue using this formula:

| Factor | Points | Description |
|--------|--------|-------------|
| Preferred label | +3 | Has any label from `preferLabels` |
| "blocking" label | +2 | Has a label containing "blocking" |
| Enables others | +2 per issue | For each issue this unblocks |
| Age bonus | +0.5 per week | Max 2 points (caps at 4 weeks old) |
| Blocked | -5 | If blocked by any open issue |
| Deferred label | -3 | Has any label from `deferLabels` |

**Score calculation:**
```
score = 0
if has_preferred_label: score += 3
if has_blocking_label: score += 2
score += (issues_this_enables * 2)
score += min(2, weeks_old * 0.5)
if is_blocked: score -= 5
if has_defer_label: score -= 3
```

### Step 6: Sort and Categorize

Sort issues by score descending, then separate into:
- **Recommended**: Top 3 non-blocked, non-deferred issues
- **Deferred**: Issues with defer labels (sorted by score)
- **Blocked**: Issues blocked by other open issues

### Step 7: Output Recommendations

Display the analysis results with reasoning for each recommendation.

## Output Format

```
## Pick Issue Analysis

Analyzed 12 open issues.

### Top Recommendations

#### 1. Issue #45: Add rate limiting to API
**Score: 7** | Labels: high-priority, security
- +3 preferred label (high-priority)
- +2 blocking label
- +2 unblocks: #48, #52

This is a good first pick because it's high priority and unblocks two other issues.

#### 2. Issue #42: Fix memory leak in worker process
**Score: 5** | Labels: bug, critical
- +3 preferred label (critical)
- +2 age (3 weeks old)

Long-standing critical bug that should be addressed.

#### 3. Issue #38: Update user profile endpoint
**Score: 3** | Labels: enhancement
- +2 age (4 weeks old)
- +1 enables: #50

Older issue with downstream benefits.

---

### Deferred (2 issues)
| Issue | Title | Why Deferred |
|-------|-------|--------------|
| #30 | Refactor config system | backlog label |
| #28 | Explore new framework | someday label |

### Blocked (1 issue)
| Issue | Title | Blocked By |
|-------|-------|------------|
| #48 | Add rate limit headers | #45 (open) |

---

**Suggested next step:**
```
/tiki:get-issue 45
```
```

## Configuration

The `pickIssue` section in `.tiki/config.json` controls behavior:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `preferLabels` | string[] | `["high-priority", "critical"]` | Labels that boost priority (+3) |
| `deferLabels` | string[] | `["backlog", "someday"]` | Labels that reduce priority (-3) |
| `excludeLabels` | string[] | `["wontfix", "duplicate"]` | Labels that exclude issues entirely |
| `maxIssues` | number | 25 | Maximum issues to fetch and analyze |

### Example Configuration

```json
{
  "pickIssue": {
    "preferLabels": ["high-priority", "critical", "urgent", "P0", "P1"],
    "deferLabels": ["backlog", "someday", "low-priority", "icebox"],
    "excludeLabels": ["wontfix", "duplicate", "invalid", "stale"],
    "maxIssues": 50
  }
}
```

## Error Handling

### No Issues Found

```
## Pick Issue Analysis

No open issues found in this repository.

To create a new issue:
```bash
gh issue create
```
```

### GitHub CLI Errors

```
## Pick Issue Analysis

Error: Unable to fetch issues from GitHub.

Possible causes:
- GitHub CLI (gh) is not installed
- Not authenticated: run `gh auth login`
- Not in a git repository
- No remote repository configured

Check your setup and try again.
```

### No Recommended Issues

```
## Pick Issue Analysis

Analyzed 5 open issues, but none are recommended:
- 3 issues are blocked by other open issues
- 2 issues are deferred (backlog)

### Blocked Issues
[list blocked issues with what blocks them]

### Deferred Issues
[list deferred issues]

Consider resolving blockers or promoting a deferred issue.
```

## Comparison with /tiki:whats-next

| Aspect | `/tiki:pick-issue` | `/tiki:whats-next` |
|--------|-------------------|-------------------|
| **Purpose** | Decide which GitHub issue to start | See current Tiki state and next action |
| **Data source** | GitHub issues (external) | Tiki state files (internal) |
| **When to use** | Starting fresh, no active work | Resuming work, checking progress |
| **Considers** | Labels, dependencies, age | Plans, execution state, queue |
| **Output** | Ranked issue recommendations | Status summary with suggestions |

**Use `/tiki:pick-issue`** when you need to choose what to work on from GitHub issues.
**Use `/tiki:whats-next`** when you want to see what's already in progress in Tiki.

## Notes

- This command is read-only - it never modifies state or issues
- Dependency detection uses simple text pattern matching
- Score formula can be adjusted by modifying this command file
- Works best with consistent labeling practices
- Combine with `/tiki:review-issue` to evaluate the top pick before planning
