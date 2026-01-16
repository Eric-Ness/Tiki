# Test Specification: /tiki:yolo

This document defines test scenarios for the `/tiki:yolo` skill. Since Tiki skills are markdown prompt files (not executable code), these tests serve as a specification for expected behavior that can be manually verified.

## Overview

The `/tiki:yolo` command orchestrates the complete Tiki workflow:
1. Fetch issue from GitHub
2. Create execution plan
3. Audit plan for issues
4. Execute all phases (with TDD by default)
5. Review queue items

## Test Scenarios

### Scenario 1: Valid Issue Number - Full Workflow Success

**Description:** Execute yolo with a valid issue number that completes all steps successfully.

**Setup:**
- A GitHub issue exists (e.g., #42)
- No existing plan file for the issue
- Codebase is in a valid state for planning

**Input:**
```text
/tiki:yolo 42
```

**Expected Behavior:**

1. **Step 1 - Fetch Issue:**
   - Output shows: `[1/5] Fetching issue... OK`
   - Issue title and metadata displayed
   - Issue details fetched via `gh issue view`

2. **Step 2 - Create Plan:**
   - Output shows: `[2/5] Creating plan... OK`
   - Plan file created at `.tiki/plans/issue-42.json`
   - Phases listed with titles

3. **Step 3 - Audit Plan:**
   - Output shows: `[3/5] Auditing plan... OK`
   - No blocking errors reported

4. **Step 4 - Execute Phases:**
   - Output shows: `[4/5] Executing phases (TDD: enabled)...`
   - Each phase shows progress and completion
   - TDD mode is active (tests created before implementation)

5. **Step 5 - Review Queue:**
   - Output shows: `[5/5] Reviewing queue...`
   - Queue items (if any) are displayed
   - Completion summary shown

**Verification Commands:**
```bash
# Check plan file was created
cat .tiki/plans/issue-42.json | jq '.status'
# Expected: "completed"

# Check state file
cat .tiki/state/current.json | jq '.status'
# Expected: "idle" (execution complete)

# Check queue file exists
cat .tiki/queue/pending.json
# Expected: Valid JSON (may be empty or have items)
```

**Pass Criteria:**
- All 5 steps complete with OK status
- Plan file exists with status "completed"
- State file shows "idle" status
- Final summary displays all phase summaries

---

### Scenario 2: Invalid Issue Number

**Description:** Execute yolo with an issue number that doesn't exist.

**Input:**
```text
/tiki:yolo 99999
```

**Expected Behavior:**

1. **Step 1 - Fetch Issue:**
   - Output shows: `[1/5] Fetching issue... FAILED`
   - Error message: `Issue #99999 not found.`
   - Execution stops immediately

**Expected Output Format:**
```text
## YOLO Mode: Issue #99999

[1/5] Fetching issue... FAILED

Issue #99999 not found.

Verify the issue number exists:
  gh issue list

Or check if you're in the correct repository.
```

**Verification Commands:**
```bash
# Verify no plan file was created
ls .tiki/plans/issue-99999.json 2>&1
# Expected: File not found error

# State file should not have this issue as active
cat .tiki/state/current.json | jq '.activeIssue'
# Expected: null
```

**Pass Criteria:**
- Error displayed at step 1
- No plan file created
- No state changes made
- Clear guidance provided to user

---

### Scenario 3: Issue With No Existing Plan

**Description:** Execute yolo on an issue that has never been planned before.

**Setup:**
- A GitHub issue exists (e.g., #50)
- No file at `.tiki/plans/issue-50.json`

**Input:**
```text
/tiki:yolo 50
```

**Expected Behavior:**

1. Step 1 completes successfully (issue fetched)
2. **Step 2 - Create Plan:**
   - Analyzes issue content
   - Explores codebase to understand context
   - Creates phases based on issue requirements
   - Creates `.tiki/plans/issue-50.json`
   - Output shows phase breakdown

**Verification Commands:**
```bash
# Verify plan file was created
cat .tiki/plans/issue-50.json | jq '.phases | length'
# Expected: >= 1 (at least one phase)

# Verify plan has required structure
cat .tiki/plans/issue-50.json | jq 'keys'
# Expected: ["issue", "created", "status", "phases", "queue", "metadata"]
```

**Pass Criteria:**
- Plan file created with valid structure
- At least one phase defined
- Each phase has title, content, files, verification

---

### Scenario 4: Audit With Blocking Errors

**Description:** Execute yolo on an issue where the generated plan has blocking errors (e.g., circular dependencies).

**Setup:**
- Create a plan file with known issues:
  - Circular dependency
  - Reference to non-existent file (not marked as new)

**Simulated Plan (for manual testing):**
```json
{
  "issue": { "number": 60, "title": "Test issue" },
  "phases": [
    {
      "number": 1,
      "title": "Phase 1",
      "dependencies": [2],
      "files": ["src/nonexistent.ts"]
    },
    {
      "number": 2,
      "title": "Phase 2",
      "dependencies": [1]
    }
  ]
}
```

**Expected Behavior:**

1. Steps 1-2 complete (issue fetched, plan created/loaded)
2. **Step 3 - Audit Plan:**
   - Output shows: `[3/5] Auditing plan... BLOCKED`
   - Errors listed:
     - Circular dependency detected
     - Non-existent file reference
   - Execution stops
   - Suggests running `/tiki:plan-issue` to revise

**Expected Output Format:**
```text
[3/5] Auditing plan... BLOCKED

The plan has blocking issues that prevent execution:

Errors:
- Circular dependency: Phase 1 -> Phase 2 -> Phase 1
- Phase 1 references non-existent file: src/nonexistent.ts

Resolution required. Run `/tiki:plan-issue 60` to revise the plan.
```

**Pass Criteria:**
- Audit identifies blocking errors
- Execution stops at step 3
- Step 4 (execute) is never started
- Clear error messages and resolution steps provided

---

### Scenario 5: Execution Failure (Phase Fails)

**Description:** Execute yolo where one of the phases fails during execution.

**Setup:**
- Valid issue with valid plan
- Execution environment that will cause a failure (e.g., TypeScript error, test failure)

**Expected Behavior:**

1. Steps 1-3 complete successfully
2. **Step 4 - Execute Phases:**
   - One or more phases complete
   - A phase fails (sub-agent reports error)
   - Output shows: `[4/5] Executing phases... FAILED at Phase N`
   - Error details provided
   - Execution stops
   - Step 5 (queue review) is skipped

**Expected Output Format:**
```text
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

**Verification Commands:**
```bash
# Check state file shows partial completion
cat .tiki/state/current.json | jq '.status'
# Expected: "in_progress" or similar (not "completed")

cat .tiki/state/current.json | jq '.currentPhase'
# Expected: The failed phase number

# Check plan file shows which phases completed
cat .tiki/plans/issue-<number>.json | jq '.phases[] | {number, status}'
# Expected: Some "completed", some "pending" or "failed"
```

**Pass Criteria:**
- Failure reported with specific error
- State file preserves progress
- Recovery options provided (heal, manual fix, skip)
- Queue review explicitly skipped
- Completed phases are saved

---

### Scenario 6: --no-tdd Flag

**Description:** Execute yolo with TDD disabled.

**Input:**
```text
/tiki:yolo 42 --no-tdd
```

**Expected Behavior:**

1. Header shows: `Mode: TDD disabled`
2. **Step 4 - Execute Phases:**
   - Output shows: `[4/5] Executing phases (TDD: disabled)...`
   - Phases execute without creating tests first
   - No RED-GREEN-REFACTOR cycle
   - Phase summaries do not include test counts

**Expected Output Differences:**
```text
## YOLO Mode: Issue #42

Mode: TDD disabled

[1/5] Fetching issue... OK
...
[4/5] Executing phases (TDD: disabled)...
      Phase 1/2: Update documentation... DONE
      Phase 2/2: Add examples... DONE

[5/5] Reviewing queue... OK (0 items)

---

## YOLO Complete!

Issue #42: Update API documentation
All 2 phases completed successfully.
TDD: disabled
Queue: Empty
```

**Verification:**
- No test files created for this execution
- Phase output does not include "Tests: N passing"
- Completion summary shows "TDD: disabled"

**Pass Criteria:**
- Flag correctly parsed
- TDD mode disabled in execution
- Output reflects disabled TDD state
- No test creation sub-agents spawned

---

### Scenario 7: Queue Empty After Execution

**Description:** Execute yolo where no queue items are discovered during execution.

**Setup:**
- Valid issue with valid plan
- Sub-agents do not report any "DISCOVERED:" items

**Expected Behavior:**

1. Steps 1-4 complete successfully
2. **Step 5 - Review Queue:**
   - Output shows: `[5/5] Reviewing queue... OK (0 items)`
   - No queue items listed
   - Completion summary shows "Queue: Empty"

**Expected Output:**
```text
[5/5] Reviewing queue... OK (0 items)

---

## YOLO Complete!

Issue #42: <title>
All <N> phases completed successfully.
TDD: enabled
Queue: Empty

### Phase Summaries
- Phase 1: <summary>
- Phase 2: <summary>

### Next Steps
- Close the issue: `gh issue close 42`
- View state: `/tiki:state`
```

**Verification Commands:**
```bash
# Check queue file
cat .tiki/queue/pending.json | jq '.items | length'
# Expected: 0
```

**Pass Criteria:**
- Step 5 completes even with empty queue
- Output indicates empty queue
- Next steps provided without queue review suggestion

---

### Scenario 8: Missing Issue Number

**Description:** Execute yolo without providing an issue number.

**Input:**
```text
/tiki:yolo
```

**Expected Behavior:**

- Immediate error shown
- Usage instructions displayed
- No workflow steps executed

**Expected Output:**
```text
YOLO mode requires an issue number.

Usage: /tiki:yolo <issue-number> [--no-tdd]

Example: /tiki:yolo 34
```

**Pass Criteria:**
- Clear error message
- Usage example provided
- No state files modified

---

### Scenario 9: TDD Test Failure (Green Phase Fails)

**Description:** Execute yolo in TDD mode where tests pass in RED phase but fail after implementation (GREEN phase verification fails).

**Setup:**
- TDD mode enabled (default)
- Sub-agent implementation does not make tests pass

**Expected Behavior:**

1. Steps 1-3 complete successfully
2. **Step 4 - Execute Phases (TDD):**
   - RED phase: Tests created and verified to fail
   - GREEN phase: Implementation attempted
   - Verification: Tests still fail
   - Output shows: `[4/5] Executing phases... FAILED at Phase N (TDD verification)`

**Expected Output:**
```text
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

**Pass Criteria:**
- TDD verification failure clearly identified
- Test results displayed
- Recovery options provided
- Distinction made between TDD failure and general execution failure

---

## Integration Points

### Sub-Skill Dependencies

The `/tiki:yolo` skill integrates with the following sub-skills:

| Step | Sub-Skill | Purpose |
|------|-----------|---------|
| 1 | `/tiki:get-issue` | Fetch GitHub issue data |
| 2 | `/tiki:plan-issue` | Create phased execution plan |
| 3 | `/tiki:audit-plan` | Validate plan before execution |
| 4 | `/tiki:execute` | Execute phases with sub-agents |
| 5 | `/tiki:review-queue` | Process discovered items |

### State File Dependencies

| File | Purpose | Created/Modified |
|------|---------|-----------------|
| `.tiki/plans/issue-N.json` | Execution plan | Step 2 (create), Step 4 (update) |
| `.tiki/state/current.json` | Active execution state | Step 4 (create/update) |
| `.tiki/queue/pending.json` | Discovered items | Step 4 (append) |
| `.tiki/config.json` | TDD configuration | Read in Step 4 |

### Error Propagation

Errors propagate through the pipeline as follows:

```text
Step 1 (Fetch) FAIL
  -> Stop immediately
  -> No state changes
  -> Display: "Issue not found"

Step 2 (Plan) FAIL
  -> Stop immediately
  -> No state changes
  -> Display: "Could not generate plan"
  -> Suggest: `/tiki:plan-issue` manually

Step 3 (Audit) FAIL
  -> Stop immediately
  -> Plan file exists but not executed
  -> Display: Blocking errors
  -> Suggest: `/tiki:plan-issue` to revise

Step 4 (Execute) FAIL
  -> Stop at failed phase
  -> State preserved (partial completion)
  -> Display: Phase error details
  -> Suggest: `/tiki:heal`, `/tiki:execute --from N`, `/tiki:skip-phase`
  -> Step 5 skipped

Step 5 (Queue) cannot fail
  -> Always completes (even if empty)
```

### Flag Propagation

The `--no-tdd` flag flows through the pipeline:

```text
/tiki:yolo 42 --no-tdd
  -> Parsed in Step 0
  -> Displayed in header: "Mode: TDD disabled"
  -> Passed to Step 4: /tiki:execute equivalent runs with --no-tdd
  -> Displayed in completion: "TDD: disabled"
```

---

## Manual Testing Checklist

Use this checklist when manually testing the `/tiki:yolo` skill:

### Basic Functionality
- [ ] Valid issue number completes all 5 steps
- [ ] Invalid issue number fails at step 1 with clear error
- [ ] Missing issue number shows usage instructions
- [ ] Progress indicators show at each step ([N/5])

### TDD Mode
- [ ] Default execution shows "TDD: enabled"
- [ ] `--no-tdd` flag shows "TDD: disabled"
- [ ] TDD mode creates tests before implementation
- [ ] TDD verification runs after implementation

### Error Handling
- [ ] Audit blocking errors stop execution at step 3
- [ ] Phase failures stop execution with recovery options
- [ ] TDD verification failures provide test output
- [ ] All errors suggest appropriate next steps

### State Management
- [ ] Plan file created at correct location
- [ ] State file updated during execution
- [ ] Queue file updated with discovered items
- [ ] Partial completion preserved on failure

### Output Quality
- [ ] Issue details displayed after fetch
- [ ] Phase list shown after planning
- [ ] Progress shown during execution
- [ ] Completion summary includes all phase summaries
- [ ] Queue item count displayed
- [ ] Next steps suggested at completion

---

## Notes

- This test specification should be reviewed whenever the `/tiki:yolo` skill is modified
- Manual testing should cover at least scenarios 1, 2, 5, and 6 before releasing changes
- Edge cases (scenarios 4, 8, 9) should be tested when time permits
- Integration with sub-skills should be verified after changes to any dependent skill
