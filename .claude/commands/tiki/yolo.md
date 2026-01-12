---
type: prompt
name: tiki:yolo
description: Run the full Tiki workflow (get -> plan -> audit -> execute -> review) with TDD enabled by default.
allowed-tools: Bash, Read, Write, Glob, Grep, Task, Edit, Skill
argument-hint: <issue-number> [--no-tdd]
---

# YOLO Mode

Execute the complete Tiki workflow pipeline for an issue in one command. This orchestrates all steps from fetching the issue through execution and queue review.

## Usage

```text
/tiki:yolo 34
/tiki:yolo 34 --no-tdd    # Skip TDD mode
```

## Instructions

### Step 0: Validate Input

Parse the issue number and flags from user input:

```javascript
// Parse: /tiki:yolo 34 --no-tdd
const issueNumber = args[0];  // Required
const noTdd = args.includes('--no-tdd');
const tddEnabled = !noTdd;
```

If no issue number provided:
```text
YOLO mode requires an issue number.

Usage: /tiki:yolo <issue-number> [--no-tdd]

Example: /tiki:yolo 34
```

### Step 1: Display Progress Header

Show the YOLO mode header with progress tracking:

```text
## YOLO Mode: Issue #<number>

Mode: <TDD enabled | TDD disabled>

[1/5] Fetching issue...
```

### Step 2: Fetch the Issue

Use GitHub CLI to fetch the issue (same as `/tiki:get-issue`):

```bash
gh issue view <number> --json number,title,body,state,labels,assignees,milestone,createdAt,updatedAt,comments
```

**If issue not found:**
```text
[1/5] Fetching issue... FAILED

Issue #<number> not found.

Verify the issue number and try again.
```
Stop execution here.

**If successful:**
```text
[1/5] Fetching issue... OK
      Issue #<number>: <title>
      State: <open/closed>
      Labels: <labels or "None">

[2/5] Creating plan...
```

Display the issue title and key details, then continue to planning.

### Step 3: Create the Plan

Generate a phased execution plan (same as `/tiki:plan-issue`):

1. Analyze the issue content
2. Explore the codebase to understand context
3. Break into appropriately-sized phases
4. Create `.tiki/plans/issue-<number>.json`

**If planning fails:**
```text
[2/5] Creating plan... FAILED

Could not generate a plan for this issue.
Reason: <specific error>

Try running `/tiki:plan-issue <number>` manually for more control.
```
Stop execution here.

**If successful:**
```text
[2/5] Creating plan... OK
      Phases: <N>
      - Phase 1: <title>
      - Phase 2: <title>
      - ...

[3/5] Auditing plan...
```

### Step 4: Audit the Plan

Validate the plan for issues (same as `/tiki:audit-plan`):

1. Check phase sizes and complexity
2. Validate dependencies (no circular refs)
3. Detect file conflicts
4. Verify referenced files exist
5. Ensure verification steps exist

Collect errors and warnings.

**If blocking errors found:**
```text
[3/5] Auditing plan... BLOCKED

Plan has blocking issues:
- <error 1>
- <error 2>

Run `/tiki:plan-issue <number>` to revise the plan, then retry.
```
Stop execution here.

**If warnings only:**
```text
[3/5] Auditing plan... OK (with warnings)
      - <warning 1>
      - <warning 2>

      Proceeding despite warnings.

[4/5] Executing phases (TDD: <enabled/disabled>)...
```

**If clean:**
```text
[3/5] Auditing plan... OK

[4/5] Executing phases (TDD: <enabled/disabled>)...
```

### Step 5: Execute the Phases

Execute all phases sequentially (same as `/tiki:execute`):

1. Read project context (CLAUDE.md if exists)
2. Initialize execution state
3. For each phase:
   - If TDD enabled: Run Red phase (create failing tests)
   - Spawn sub-agent via Task tool
   - If TDD enabled: Verify tests pass (Green phase)
   - Extract summary and discovered items
   - Update state files
   - Report progress

Pass the TDD flag based on user input:
- Default: `--tdd` (TDD enabled)
- With `--no-tdd`: Skip TDD mode

**Progress display during execution:**
```text
[4/5] Executing phases (TDD: enabled)...
      Phase 1/3: <title>... DONE
      Phase 2/3: <title>... DONE
      Phase 3/3: <title>... DONE
```

**If execution fails:**
```text
[4/5] Executing phases... FAILED at Phase <N>

Phase <N> failed: <title>
Error: <error description>

Options:
- Fix and retry: `/tiki:execute <number> --from <N>`
- Auto-heal: `/tiki:heal <N>`
- Skip this phase: `/tiki:skip-phase <N>`
```
Stop execution here (do not proceed to queue review).

**If successful:**
```text
[4/5] Executing phases... OK
      All <N> phases completed.

[5/5] Reviewing queue...
```

### Step 6: Review Queue

Check for items discovered during execution (same as `/tiki:review-queue`):

1. Read `.tiki/queue/pending.json`
2. Display any items found
3. Prompt user for action on each item

**If queue is empty:**
```text
[5/5] Reviewing queue... OK (0 items)

---

## YOLO Complete!

Issue #<number>: <title>
All <N> phases completed successfully.
TDD: <enabled/disabled>
Queue: Empty

### Phase Summaries
- Phase 1: <summary>
- Phase 2: <summary>
- Phase 3: <summary>

### Next Steps
- Close the issue: `gh issue close <number>`
- View state: `/tiki:state`
```

**If queue has items:**
```text
[5/5] Reviewing queue... <N> items found

### Queue Items Discovered

1. <item title>
   Source: Phase <N>
   Type: <type>

2. <item title>
   Source: Phase <N>
   Type: <type>

Actions:
- Create issues from all: `/tiki:review-queue --create-all`
- Review individually: `/tiki:review-queue`
- Dismiss all: `/tiki:review-queue --dismiss-all`

---

## YOLO Complete!

Issue #<number>: <title>
All <N> phases completed successfully.
TDD: <enabled/disabled>
Queue: <N> items pending review

### Phase Summaries
- Phase 1: <summary>
- Phase 2: <summary>
- Phase 3: <summary>

### Next Steps
- Review queue items: `/tiki:review-queue`
- Close the issue: `gh issue close <number>`
```

## Error Handling

### Issue Not Found

```text
## YOLO Mode: Issue #<number>

[1/5] Fetching issue... FAILED

Issue #<number> not found.

Verify the issue number exists:
  gh issue list

Or check if you're in the correct repository.
```

### Planning Failure

```text
## YOLO Mode: Issue #<number>

[1/5] Fetching issue... OK
[2/5] Creating plan... FAILED

Failed to create execution plan.

Possible causes:
- Issue description is unclear or empty
- Codebase analysis encountered errors

Try:
- `/tiki:plan-issue <number>` for manual planning
- Review the issue description for clarity
```

### Audit Blocking Errors

```text
## YOLO Mode: Issue #<number>

[1/5] Fetching issue... OK
[2/5] Creating plan... OK
[3/5] Auditing plan... BLOCKED

The plan has blocking issues that prevent execution:

Errors:
- Circular dependency: Phase 2 -> Phase 4 -> Phase 2
- Phase 3 references non-existent file: src/old/api.ts

Resolution required. Run `/tiki:plan-issue <number>` to revise.
```

### Execution Failure

```text
## YOLO Mode: Issue #<number>

[1/5] Fetching issue... OK
[2/5] Creating plan... OK
[3/5] Auditing plan... OK
[4/5] Executing phases... FAILED at Phase 2

Phase 2 of 3 failed: Add login endpoint

Error: TypeScript compilation error in src/routes/auth.ts

Progress saved. Phases 1 completed successfully.

Options:
- Auto-heal: `/tiki:heal` - attempts automatic fix
- Manual fix: Fix the error, then `/tiki:execute <number> --from 2`
- Skip phase: `/tiki:skip-phase 2`

Queue review skipped due to execution failure.
```

### TDD Test Failure

```text
## YOLO Mode: Issue #<number>

[1/5] Fetching issue... OK
[2/5] Creating plan... OK
[3/5] Auditing plan... OK
[4/5] Executing phases... FAILED at Phase 2 (TDD verification)

Phase 2 implementation did not pass tests.

Test Results:
  FAIL src/routes/__tests__/auth.test.ts
    - should validate JWT token (expected 401, got 500)
    - should attach user to request (undefined is not assignable)

Options:
- Auto-heal: `/tiki:heal` - attempts automatic fix
- Manual fix: Review and fix implementation, then `/tiki:execute <number> --from 2`
```

## Options

### --no-tdd

Skip Test-Driven Development mode for this execution:

```text
/tiki:yolo 34 --no-tdd
```

This executes phases without creating tests first. Use when:
- The issue is purely documentation or configuration
- Tests already exist and don't need expansion
- You want faster execution without TDD overhead

Default behavior (without flag): TDD is enabled.

## Examples

### Example 1: Successful YOLO Execution

```text
User: /tiki:yolo 34

Claude:
## YOLO Mode: Issue #34

Mode: TDD enabled

[1/5] Fetching issue... OK
      Issue #34: Add user authentication
      State: open
      Labels: feature, high-priority

[2/5] Creating plan... OK
      Phases: 3
      - Phase 1: Setup auth middleware
      - Phase 2: Add login endpoint
      - Phase 3: Add protected routes

[3/5] Auditing plan... OK

[4/5] Executing phases (TDD: enabled)...
      Phase 1/3: Setup auth middleware... DONE
        Tests: 4 passing
      Phase 2/3: Add login endpoint... DONE
        Tests: 5 passing
        DISCOVERED: Consider adding rate limiting
      Phase 3/3: Add protected routes... DONE
        Tests: 3 passing

[5/5] Reviewing queue... 1 item found

### Queue Items Discovered

1. Consider adding rate limiting
   Source: Phase 2
   Type: potential-issue

Actions:
- Create issues from all: `/tiki:review-queue --create-all`
- Review individually: `/tiki:review-queue`

---

## YOLO Complete!

Issue #34: Add user authentication
All 3 phases completed successfully.
TDD: enabled (12 tests passing)
Queue: 1 item pending review

### Phase Summaries
- Phase 1: Created JWT validation middleware with AuthRequest type
- Phase 2: Implemented POST /api/login with password validation
- Phase 3: Applied auth middleware to /api/user routes

### Next Steps
- Review queue items: `/tiki:review-queue`
- Close the issue: `gh issue close 34`
```

### Example 2: YOLO with --no-tdd

```text
User: /tiki:yolo 42 --no-tdd

Claude:
## YOLO Mode: Issue #42

Mode: TDD disabled

[1/5] Fetching issue... OK
      Issue #42: Update API documentation
      State: open
      Labels: docs

[2/5] Creating plan... OK
      Phases: 2
      - Phase 1: Update endpoint documentation
      - Phase 2: Add code examples

[3/5] Auditing plan... OK

[4/5] Executing phases (TDD: disabled)...
      Phase 1/2: Update endpoint documentation... DONE
      Phase 2/2: Add code examples... DONE

[5/5] Reviewing queue... OK (0 items)

---

## YOLO Complete!

Issue #42: Update API documentation
All 2 phases completed successfully.
TDD: disabled
Queue: Empty

### Phase Summaries
- Phase 1: Updated OpenAPI spec with new auth endpoints
- Phase 2: Added curl examples for all endpoints

### Next Steps
- Close the issue: `gh issue close 42`
```

### Example 3: YOLO Blocked by Audit

```text
User: /tiki:yolo 15

Claude:
## YOLO Mode: Issue #15

Mode: TDD enabled

[1/5] Fetching issue... OK
      Issue #15: Refactor database layer
      State: open
      Labels: refactor

[2/5] Creating plan... OK
      Phases: 5
      - Phase 1: Extract connection pool
      - Phase 2: Add query builder
      - Phase 3: Migrate user queries
      - Phase 4: Migrate order queries
      - Phase 5: Update integration tests

[3/5] Auditing plan... BLOCKED

The plan has blocking issues that prevent execution:

Errors:
- Phase 3 depends on Phase 4 which comes later (dependency order invalid)
- Phase 2 references non-existent file: src/db/legacy-pool.ts

Resolution required. Run `/tiki:plan-issue 15` to revise the plan.
```

## Workflow Overview

```text
YOLO Mode Pipeline:

  [User Input]
       |
       v
  +------------+     +------------+     +------------+
  | GET-ISSUE  | --> | PLAN-ISSUE | --> | AUDIT-PLAN |
  +------------+     +------------+     +------------+
       |                  |                   |
       v                  v                   v
    Fetch           Analyze &            Validate
    GitHub          Create              Dependencies,
    Issue           Phases              Files, Sizes
       |                  |                   |
       +------------------+-------------------+
                          |
                          v (if no blocking errors)
                    +------------+
                    |  EXECUTE   |
                    | (with TDD) |
                    +------------+
                          |
                          v
                    +--------------+
                    | REVIEW-QUEUE |
                    +--------------+
                          |
                          v
                      [Complete]
```

## Notes

- YOLO mode is designed for confident execution when you trust the workflow
- Each step validates before proceeding to the next
- Progress is saved at each step, so partial failures don't lose work
- TDD is enabled by default to ensure quality - use `--no-tdd` only when appropriate
- If any step fails, the pipeline stops with clear instructions for recovery
- Queue review at the end ensures discovered items aren't forgotten
- State files are updated throughout, so `/tiki:state` shows accurate progress
- For more control over individual steps, use the separate commands:
  - `/tiki:get-issue` - Just fetch and display
  - `/tiki:plan-issue` - Manual planning with more options
  - `/tiki:audit-plan` - Audit with `--verbose` for details
  - `/tiki:execute` - Execute with `--from N` or `--dry-run`
  - `/tiki:review-queue` - Interactive queue management
