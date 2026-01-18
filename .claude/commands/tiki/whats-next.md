---
type: prompt
name: tiki:whats-next
description: Show current status and suggest next actions. Use when resuming work, checking progress, or deciding what to do next.
allowed-tools: Read, Glob, Bash
---

# What's Next

Display current Tiki state and provide actionable suggestions for what to do next. This is the go-to command when starting a session or resuming work.

## Usage

```
/tiki:whats-next
```

## Instructions

### Step 1: Gather State Information

Read all relevant state files:

1. **Current execution state**: `.tiki/state/current.json`
2. **All plans**: `.tiki/plans/issue-*.json`
3. **Queue items**: `.tiki/queue/pending.json`
4. **Saved context**: `.tiki/context/*.json`
5. **Active releases**: `.tiki/releases/*.json` (excluding archive/)

### Step 2: Determine Current Situation

Analyze the state to understand what's happening:

| Situation | Indicators |
|-----------|------------|
| Active execution | `current.json` has `status: "in_progress"` |
| Paused work | `current.json` has `pausedAt` set |
| Failed phase | Plan has a phase with `status: "failed"` |
| Planned but not started | Plans exist with `status: "planned"` |
| **Active release with next issue** | Release has issues with status != "completed" |
| Queue needs review | `pending.json` has items |
| Nothing in progress | No active state, no pending plans |

#### Release Context Check

When active releases exist, also determine:

1. **Is current issue part of a release?** Check if the current issue number appears in any active release's `issues` array.

2. **What's the next issue in the release?** Find the first issue in the release with:
   - `status` is "not_planned" or "planned" (not "in_progress" or "completed")
   - All dependencies are satisfied (any issues it depends on are "completed")

3. **Release progress:** Calculate from the release's `issues` array:
   - Completed: Count of issues with `status: "completed"`
   - In Progress: Count of issues with `status: "in_progress"`
   - Remaining: Count of issues with `status: "not_planned"` or `"planned"`

### Step 3: Build Recommendations

Based on the situation, provide specific actionable suggestions.

When building recommendations, consider release context:

1. **If current issue is in a release:** Include release progress in the output
2. **If just completed an issue in a release:** Suggest the next issue in the release
3. **If a release has remaining issues:** Include release-based recommendations after handling blockers

## Output Format

### When Work is In Progress

```
## What's Next

### Currently Active
**Issue #34:** Add user authentication
- Phase 2 of 3: Add login endpoint
- Status: in_progress
- Last activity: 15 minutes ago

### Suggested Action
Continue execution:
```
/tiki:execute 34
```

### Also Pending
- **Issue #35:** Fix login redirect (planned, 1 phase)
- **Queue:** 2 items need review
```

### When Work is Paused

```
## What's Next

### Paused Work
**Issue #34:** Add user authentication
- Paused at: Phase 2 of 3
- Paused: 2 hours ago
- Reason: Context limit reached

### Suggested Action
Resume where you left off:
```
/tiki:resume 34
```

Or start fresh from the current phase:
```
/tiki:execute 34 --from 2
```
```

### When a Phase Failed

```
## What's Next

### Failed Execution
**Issue #34:** Add user authentication
- Phase 2 failed: Add login endpoint
- Error: TypeScript compilation error in auth.ts

### Suggested Actions
1. **Heal automatically:**
   ```
   /tiki:heal 34
   ```

2. **Fix manually and retry:**
   ```
   /tiki:execute 34 --from 2
   ```

3. **Skip this phase:**
   ```
   /tiki:skip-phase 2
   ```
```

### When Plans Exist But Not Started

```
## What's Next

### Ready to Execute
| Issue | Title | Phases | Priority |
|-------|-------|--------|----------|
| #34 | Add user authentication | 3 | high |
| #35 | Fix login redirect | 1 | medium |

### Suggested Action
Start with the highest priority:
```
/tiki:execute 34
```

Or review the plan first:
```
/tiki:state
```
```

### When Queue Needs Attention

```
## What's Next

### Queue Items (3)
Items discovered during execution need your review:
- 1 potential new issue
- 2 questions needing input

### Suggested Action
Review and process the queue:
```
/tiki:review-queue
```
```

### When Nothing is Happening

```
## What's Next

### Current State
No active work. No planned issues.

### Suggested Actions
1. **View open GitHub issues:**
   ```bash
   gh issue list
   ```

2. **Get a specific issue:**
   ```
   /tiki:get-issue <number>
   ```

3. **Plan an issue for execution:**
   ```
   /tiki:plan-issue <number>
   ```
```

### Combined Example (Multiple Things Happening)

```
## What's Next

### Currently Active
**Issue #34:** Add user authentication
- Phase 2 of 3: Add login endpoint
- Status: in_progress
- Last activity: 15 minutes ago

### Queue (2 items)
Items need review after current work completes.

### Also Planned
- **Issue #35:** Fix login redirect (1 phase)
- **Issue #36:** Update documentation (2 phases)

### Suggested Action
Continue the active execution:
```
/tiki:execute 34
```

After completion, review queue items:
```
/tiki:review-queue
```
```

### When Issue is Part of Release

When the current/active issue is part of an active release, include release context:

```
## What's Next

### Currently Active
**Issue #34:** Add user authentication
- Phase 2 of 3: Add login endpoint
- Status: in_progress
- Last activity: 15 minutes ago

### Release Context
**Release v1.2** - 2 of 5 issues completed (40%)
| Issue | Title | Status |
|-------|-------|--------|
| #32 | Setup auth framework | completed |
| #33 | Add OAuth providers | completed |
| **#34** | **Add user authentication** | **in_progress** |
| #35 | Add password reset | planned |
| #36 | Add MFA support | not_planned |

### Suggested Action
Continue the active execution:
```
/tiki:execute 34
```
```

### When Release Has Next Issue Ready

When no active work but an active release has issues ready to start:

```
## What's Next

### Active Release
**Release v1.2** - 3 of 5 issues completed (60%)

### Next in Release
**Issue #35:** Add password reset
- Status: planned (ready to execute)
- Phases: 3
- Dependencies: All satisfied (#32, #33, #34 completed)
- Requirements addressed: AUTH-04, AUTH-05

### Suggested Action
Continue the release:
```
/tiki:execute 35
```

Or if not yet planned:
```
/tiki:plan-issue 35
```

### Remaining in Release
- **Issue #36:** Add MFA support (not_planned, depends on #35)
```

### Just Completed an Issue in Release

When an issue that was part of a release has just been completed:

```
## What's Next

### Just Completed
**Issue #34:** Add user authentication - completed!

### Release Progress
**Release v1.2** - 3 of 5 issues completed (60%)
+1 since last check

### Requirements Progress
- AUTH-01: Implemented (via #32)
- AUTH-02: Implemented (via #33)
- AUTH-03: Implemented (via #34) <- Just completed
- AUTH-04: Not started
- AUTH-05: Not started

### Next in Release
**Issue #35:** Add password reset
- Status: planned (ready to execute)
- Phases: 2
- Requirements addressed: AUTH-04

### Suggested Action
Continue with the next release issue:
```
/tiki:execute 35
```

Or check release status:
```
/tiki:release status v1.2
```
```

### When Release is Nearly Complete

When only one issue remains in a release:

```
## What's Next

### Active Release - Final Issue!
**Release v1.2** - 4 of 5 issues completed (80%)

### Final Issue
**Issue #36:** Add MFA support
- Status: not_planned
- This is the last issue in release v1.2!

### Suggested Action
Plan and execute the final issue:
```
/tiki:plan-issue 36
```

After completion, ship the release:
```
/tiki:release ship v1.2
```
```

## Priority Logic

When multiple things could be done, prioritize suggestions in this order:

1. **Failed phases** - Fix blockers first
2. **Paused work** - Resume interrupted work
3. **In-progress execution** - Continue what's started
4. **Next issue in active release** - Continue release progress
5. **Queue items** - Clear discovered items
6. **Planned issues not in releases** - Start new work (by priority label)
7. **No plans** - Suggest getting/planning issues

### Release Priority Details

When an active release exists with remaining issues:

- Check if any issues have all dependencies satisfied
- Prioritize issues that are already "planned" over "not_planned"
- Consider requirements coverage - issues addressing more requirements may be higher priority
- If current work is part of a release, always show release context

## State File Locations

| File | Purpose |
|------|---------|
| `.tiki/state/current.json` | Active execution state |
| `.tiki/plans/issue-*.json` | All issue plans |
| `.tiki/queue/pending.json` | Items needing review |
| `.tiki/context/*.json` | Saved context for resume |
| `.tiki/releases/*.json` | Active releases |
| `.tiki/releases/archive/*.json` | Shipped (archived) releases |

## Comparison with /tiki:state

| `/tiki:state` | `/tiki:whats-next` |
|----------|---------------|
| Shows raw state data | Interprets state and suggests actions |
| Comprehensive overview | Focused on "what should I do" |
| Read-only display | Actionable recommendations |
| For understanding status | For deciding next steps |

Use `/tiki:state` when you want to see everything. Use `/tiki:whats-next` when you want guidance.

## Notes

- This skill is read-only - it never modifies state
- Suggestions are opinionated - they guide you toward completing work
- Good for session start or after being away from the project
- Combines information from multiple state files into one view
