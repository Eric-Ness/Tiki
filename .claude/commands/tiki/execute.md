---
type: prompt
name: tiki:execute
description: Execute a planned issue by spawning sub-agents for each phase. Use when ready to implement an issue that has been planned with /plan-issue.
allowed-tools: Bash, Read, Write, Glob, Grep, Task, Edit
argument-hint: <issue-number> [--from <phase>] [--dry-run] [--tdd|--no-tdd]
---

# Execute

Execute a planned issue by spawning sub-agents for each phase. Each phase runs in a fresh context via the Task tool.

## Usage

```text
/tiki:execute 34
/tiki:execute 34 --from 2    # Resume from phase 2
/tiki:execute 34 --dry-run   # Preview what would run without executing
/tiki:execute 34 --tdd       # Force TDD mode (tests before implementation)
/tiki:execute 34 --no-tdd    # Skip TDD for this execution
```

## Instructions

### Step 1: Validate the Plan Exists

```bash
# Check plan file exists
cat .tiki/plans/issue-<number>.json
```

If no plan exists:

```text
No plan found for issue #<number>.
Create one first with `/tiki:plan-issue <number>`
```

### Step 2: Read Project Context and Configuration

Read `CLAUDE.md` (if it exists) to pass to sub-agents:

```bash
cat CLAUDE.md 2>/dev/null || echo "No CLAUDE.md found"
```

Read `.tiki/config.json` for testing preferences:

```bash
cat .tiki/config.json 2>/dev/null || echo "{}"
```

Extract TDD settings:

- `testing.createTests`: "before" | "after" | "ask" | "never" (default: "ask")
- `testing.testFramework`: framework name or "auto-detect" (default: "auto-detect")

Extract auto-fix settings:

- `autoFix.enabled`: true | false | "prompt" (default: "prompt")
- `autoFix.maxAttempts`: max fix attempts per phase (default: 3)
- `autoFix.strategies`: array of ["direct", "diagnostic-agent"] (default: both)

If `autoFix.enabled` is "prompt", the user will be asked on first verification failure whether to enable auto-fix.

If `createTests` is "ask", prompt the user:

```text
How would you like to handle testing during execution?

1. **before** (TDD) - Write failing tests first, then implement each phase
2. **after** - Implement each phase, then write tests
3. **never** - Skip test creation for this execution

Your choice (1/2/3):
```

#### Auto-Fix Prompt (when autoFix.enabled is "prompt")

If `autoFix.enabled` is "prompt" and a verification failure occurs, prompt the user to attempt auto-fix?

```text
Phase verification failed. Would you like to enable auto-fix?

Auto-fix will:
- Analyze the error using known patterns
- Attempt up to {maxAttempts} automatic fixes
- Report what was tried if fixes fail

Options:
1. **yes** - Enable auto-fix for this execution
2. **no** - Manual intervention only (pause and suggest /tiki:heal)
3. **always** - Enable and save preference to config

Your choice (1/2/3):
```

Store the choice in execution state for consistency during this execution. If the user chooses "always", update `.tiki/config.json` to set `autoFix.enabled: true`.

### Step 3: Initialize Execution State

Create or update `.tiki/state/current.json`:

```json
{
  "activeIssue": 34,
  "currentPhase": 1,
  "status": "in_progress",
  "startedAt": "2026-01-10T10:00:00Z",
  "lastActivity": "2026-01-10T10:00:00Z",
  "pausedAt": null,
  "completedPhases": []
}
```

Update the plan status to `in_progress`.

### Step 4: Execute Each Phase

For each phase in order (respecting dependencies):

#### 4a. Check Dependencies

If phase has `dependencies: [1, 2]`, verify phases 1 and 2 are completed before starting.

#### 4b. Update State

Set current phase to `in_progress` in both:

- `.tiki/state/current.json` (activePhase)
- `.tiki/plans/issue-N.json` (phase status)

#### 4c. TDD Workflow (if enabled)

If `testing.createTests` is "before" (TDD mode):

**Red Phase - Write Failing Tests:**

Spawn a test-creator sub-agent via Task tool:

```text
Task tool call:
- subagent_type: "general-purpose"
- prompt: <TDD test creation prompt - see below>
- description: "TDD: Write failing tests for phase N of issue #X"
```

The test-creator analyzes the phase description and writes tests that:

- Define expected behavior for the phase
- Import modules/functions that will be created
- Cover edge cases and error conditions

Run the tests to confirm they fail:

```bash
# Framework-specific test command
npx jest <test-file> --no-coverage 2>&1 | head -50
# or: npx vitest run <test-file>
# or: pytest <test-file> -v
# or: go test ./... -v
```

Verify tests fail as expected (module not found, function undefined, etc.)

If tests unexpectedly pass or have syntax errors, report and pause:

```text
TDD Setup Issue: Tests did not fail as expected.
- Expected: Tests should fail (module/function not yet implemented)
- Actual: <actual result>

Please review the test file and fix before proceeding.
```

**TDD Test Creation Prompt Template:**

```text
You are creating TDD tests for Phase {phase_number} of Issue #{issue_number}: {issue_title}

## Phase to Test
{phase_title}

{phase_content}

## Instructions
1. Analyze what functionality this phase will implement
2. Write tests that define the expected behavior BEFORE implementation
3. Tests should import modules/functions that DON'T EXIST YET
4. Cover: basic functionality, edge cases, error handling
5. Use the project's test framework: {test_framework}
6. Follow existing test file conventions in the project

## Test File Location
Create tests following project conventions:
- Jest/Vitest: `__tests__/` or `*.test.ts`
- Pytest: `tests/` or `test_*.py`
- Go: `*_test.go` in same package

## Output Format
After creating tests, run them and report:
- Test file path created
- Number of tests written
- Test run output (should show failures)

SUMMARY: Created N failing tests for <functionality>
```

#### 4d. Build Sub-Agent Prompt

Construct the prompt for the Task tool. If TDD is enabled, include test context:

```text
You are executing Phase <N> of <total> for Issue #<number>: <title>

## Project Context
<contents of CLAUDE.md or "No project context file found">

## Previous Phase Summaries
<For each completed phase>
- Phase <N>: <title> - <summary>
</For each>

## Current Phase: <phase title>

<phase content from plan>

## Files You May Need to Modify
<files array from phase>

## Verification Checklist
<verification array from phase>

## TDD Context (if testing.createTests is "before")
**Mode: Test-Driven Development (Red-Green-Refactor)**

Failing tests have been created for this phase:
- Test file: <path to test file created in step 4c>
- Tests written: <number of tests>
- Framework: <detected test framework>

Your goal is to make these tests pass (GREEN phase).

After implementation, run:
<test command for framework>

All tests must pass before this phase is considered complete.

## Instructions
1. Execute this phase completely - make actual code changes
2. If TDD is enabled: implement code to make the failing tests pass
3. Run tests to verify your changes pass
4. If you discover issues needing future attention, clearly note them at the end with "DISCOVERED:" prefix
5. When done, provide a summary starting with "SUMMARY:" that describes what you accomplished
```

#### 4e. Spawn Sub-Agent

Use the Task tool to spawn a sub-agent:

```text
Task tool call:
- subagent_type: "general-purpose"
- prompt: <constructed prompt from 4d>
- description: "Execute phase N of issue #X"
```

#### 4f. Verify Tests Pass (TDD Green Phase)

If `testing.createTests` is "before", verify the tests now pass:

```bash
# Run the tests created in step 4c
npx jest <test-file> 2>&1 | tail -20
# or: npx vitest run <test-file>
# or: pytest <test-file> -v
# or: go test ./... -v
```

**If tests pass:** Continue to step 4h (Green phase complete).

**If tests fail:** Check autoFix.enabled before pausing execution:

1. **If `autoFix.enabled` is `true`:** Proceed to Step 4f-auto to attempt automatic fix
2. **If `autoFix.enabled` is `"prompt"`:** Ask user whether to enable auto-fix using the Auto-Fix Prompt (see Step 2), then proceed accordingly
3. **If `autoFix.enabled` is `false`:** Report failure and pause execution (see below)

When auto-fix is disabled or declined, report the failure:

```text
## TDD Verification Failed

Phase <N> implementation did not pass tests.

### Test Results
<test output showing failures>

### Options
- Review and fix implementation, then retry: `/tiki:execute <number> --from <N>`
- Skip TDD verification: `/tiki:skip-phase <N>`
- Get automatic fix suggestions: `/tiki:heal <N>`
```

#### 4f-auto. Auto-Fix Attempt (if enabled)

When verification fails and auto-fix is enabled (or user accepts when prompted), attempt automatic repair before pausing for manual intervention.

##### Step 1: Classify Error Type

Analyze the error output to classify the error type. Use the following table to map error patterns to error types:

| Error Pattern | Error Type | Fix Strategy Hint |
|--------------|------------|-------------------|
| `Property 'X' does not exist on type 'Y'` | type-error | Add property to type definition or fix property name |
| `Cannot find module 'X'` | import-error | Install package or fix import path |
| `Type 'X' is not assignable to type 'Y'` | type-error | Fix type mismatch or add type assertion |
| `Expected X but received Y` | test-failure | Fix implementation logic or update test expectation |
| `Timeout` | async-error | Increase timeout or fix async handling |
| `Module not found` | import-error | Install missing dependency or fix path |
| `SyntaxError: Unexpected token` | syntax-error | Fix syntax issue in source file |
| `ENOENT: no such file or directory` | runtime-error | Create missing file or fix file path |
| `ECONNREFUSED` | runtime-error | Start required service or mock connection |
| `Cannot read property 'X' of undefined` | runtime-error | Add null check or initialize object |
| `assertion failed` | test-failure | Fix implementation to match expected behavior |

Extract key information from the error:
- **Error message**: The primary error text
- **Error file**: The file path where the error originated
- **Error line**: Line number if available
- **Stack trace**: Relevant call stack for context

##### Step 2: Check Previous Fix Attempts

Before attempting a fix, check the phase's fixAttempts array from the plan file to understand what has already been tried:

1. Read the phase's `fixAttempts` array from `.tiki/plans/issue-N.json`
2. Count current attempts: `attemptCount = fixAttempts.length`
3. Compare attempt count to `autoFix.maxAttempts` from config

**If `attemptCount >= maxAttempts`:**

When the maxAttempts limit is hit (maxAttempts reached), skip auto-fix and fall through to manual intervention:

```text
## Auto-Fix Limit Reached

Phase <N> has exhausted all {maxAttempts} automatic fix attempts.
No more automatic fixes will be attempted.

### Previous Attempts
<list previous fix attempts with their strategies and outcomes>

### Manual Intervention Required
- Review the error and fix manually: `/tiki:execute <number> --from <N>`
- Get diagnostic help: `/tiki:heal <N>`
- Skip this phase: `/tiki:skip-phase <N>`
```

**Strategy Selection and Escalation:**

When auto-fix is still allowed, select the fix strategy:

1. **First attempt**: Use "direct" strategy (simple, inline fix without spawning sub-agent)
2. **If direct strategy failed previously** on the same error type: Escalate to "diagnostic-agent" strategy
3. **Avoid repeating the same strategy** that failed on an identical error

The "direct" strategy attempts a simple fix inline based on the error classification. It's fast but may miss complex issues.

The "diagnostic-agent" strategy spawns a sub-agent via the Task tool to perform deeper analysis. Use this when direct fixes have failed, as it can identify root causes that simple pattern matching misses.

##### Step 3: Check Debug History

Before applying a fix, check if similar errors have been successfully resolved in past debug sessions:

1. Read `.tiki/debug/index.json` if it exists
2. Search for sessions matching:
   - Error message keywords from the current error
   - The affected file name or path
   - The classified error type
3. Filter to resolved sessions only (status: "resolved")

Resolved sessions contain proven solutions that worked for similar problems in the past. Applying solutions from resolved sessions increases the likelihood of a successful fix.

If matching resolved sessions are found:
- Reference the past solution approach in the fix strategy
- Set `relatedDebugSession` field in the fix attempt record
- Apply or adapt the solution that worked before

Example search logic:
```text
For each session in debug/index.json:
  - Check if session.status === "resolved"
  - Check if session.errorKeywords overlap with current error keywords
  - Check if session.affectedFiles includes the current error file
  - Rank matches by relevance (more keyword matches = higher rank)
```

After gathering all context (error type, previous attempts, debug history), proceed to apply the selected fix strategy. Record the attempt in the phase's fixAttempts array regardless of outcome.

##### Step 4: Generate and Apply Fix

Based on the selected strategy, generate and apply a fix for the error.

**Strategy: Direct Fix** (for pattern-matched errors)

Direct fix applies simple, inline corrections based on error classification without spawning a sub-agent. Use this strategy first for common, well-understood errors.

| Error Type | Fix Pattern | Action |
|------------|-------------|--------|
| type-error | Property does not exist on type | Add property to interface or extend type definition |
| type-error | Type not assignable | Fix type mismatch or add type assertion |
| import-error | Cannot find module | Install package (`npm install`) or fix import path |
| import-error | Module not found | Check file path, fix relative/absolute path |
| syntax-error | Unexpected token | Fix syntax issue at indicated line |
| test-failure | Expected X but received Y | Fix implementation logic to return expected value |
| test-failure | Assertion failed | Update implementation to match expected behavior |
| runtime-error | Cannot read property of undefined | Add null check or initialize object before access |
| runtime-error | ENOENT no such file | Create missing file or fix file path reference |

For direct fix:
1. Parse the error message to identify the specific issue
2. Locate the error file and line
3. Apply the appropriate fix pattern inline
4. Document the fix applied for recording in Step 5

**Strategy: Diagnostic Agent** (for complex errors)

When direct fixes have failed or the error is complex, spawn a diagnostic sub-agent via the Task tool to perform deeper analysis.

Task tool call format:
```text
Task tool call:
- subagent_type: "general-purpose"
- prompt: <Diagnostic Agent Prompt - see template below>
- description: "Auto-fix: Diagnose and fix {error_type} in phase N of issue #X"
```

**Diagnostic Agent Prompt Template:**

```text
You are a diagnostic agent fixing a verification failure for Phase {phase_number} of Issue #{issue_number}.

## Error Context
- **Error Type**: {error_type}
- **Error Message**: {error_message}
- **Error File**: {error_file}
- **Error Line**: {error_line} (if available)

## Stack Trace
{stack_trace}

## Phase Context
{phase_title}
{phase_content}

## Previous Fix Attempts
{previous_attempts_summary}

## Related Debug Sessions
{related_debug_sessions}

## Instructions
1. Analyze the error and its root cause
2. Consider why previous fix attempts failed (if any)
3. Apply a fix to resolve the error
4. Verify the fix works locally if possible

## Output Format
When complete, provide:

AUTOFIX_RESULT: success | failure
AUTOFIX_ACTION: <description of what fix was applied>
AUTOFIX_FILES: <comma-separated list of files modified>

If the fix fails, explain why and what additional context would help.
```

The diagnostic agent has access to all file tools (Read, Write, Edit, Grep, Glob) and can perform comprehensive analysis to identify root causes that simple pattern matching might miss.

##### Step 5: Record Fix Attempt

After applying a fix (whether successful or not), record the attempt in the phase's fixAttempts array. This creates an audit trail and enables learning from past attempts.

Update the phase in `.tiki/plans/issue-N.json`:

1. Read the current plan file
2. Find the current phase object
3. Initialize `fixAttempts` array if not present
4. Append a new fix attempt record with all required fields:

```json
{
  "id": "{NN}-fix-{MM}",
  "attemptNumber": {current_attempt_count + 1},
  "errorType": "{classified_error_type}",
  "errorMessage": "{error_message}",
  "errorFile": "{error_file_path}",
  "strategy": "{direct|diagnostic-agent}",
  "fixApplied": "{description_of_fix}",
  "verificationResult": "{pending}",
  "relatedDebugSession": "{session_id_or_null}",
  "timestamp": "{ISO_8601_timestamp}"
}
```

Generate the fix ID using the NN-fix-NN convention:
- Phase number zero-padded to 2 digits
- "fix" literal
- Attempt number zero-padded to 2 digits

Example: Phase 3, attempt 2 = `03-fix-02`

##### Step 6: Verify Fix

After applying the fix, run the appropriate verification command to check if the error is resolved.

| Error Type | Verification Command |
|------------|---------------------|
| typescript, type-error | `npx tsc --noEmit` |
| test-failure | Framework-specific: `npx jest <file>`, `npx vitest run <file>`, `pytest <file>` |
| test-* | Re-run the specific test that failed |
| build | `npm run build` or project-specific build command |
| runtime-error | Re-run the phase's verification steps from the plan |
| syntax-error | `npx tsc --noEmit` or linter check |
| import-error | `npx tsc --noEmit` or attempt to import module |

Run the verification command and capture the output:

```bash
# Example for TypeScript errors
npx tsc --noEmit 2>&1

# Example for test failures
npx jest <test-file> --no-coverage 2>&1 | tail -30

# Example for build errors
npm run build 2>&1 | tail -30
```

Analyze the output to determine if the error is resolved:
- **Success**: No errors, tests pass, or build succeeds
- **Failure**: Same or different error persists

##### Step 7: Handle Result

Based on the verification outcome, take the appropriate action.

**Success Path:**

When the fix succeeds and verification passes:

1. Update the fixAttempts record with `verificationResult: "success"`
2. Clear the error state from the phase
3. Log the successful fix:
   ```text
   Auto-fix successful (attempt {N}, strategy: {strategy})
   Fix applied: {fix_description}
   ```
4. Continue to step 4h to complete the phase

**Failure Path with Retry:**

When the fix fails but attempts remain:

1. Update the fixAttempts record with `verificationResult: "failure"`
2. Increment the attempt counter
3. Escalate strategy if appropriate:
   - If "direct" strategy failed → try "diagnostic-agent" on next attempt
   - If same error persists with same strategy → escalate to diagnostic-agent
4. Loop back to Step 2 (Check Previous Fix Attempts) to retry with the new strategy
5. Log the retry:
   ```text
   Auto-fix attempt {N} failed. Escalating to {next_strategy} strategy.
   Retrying... (attempt {N+1} of {maxAttempts})
   ```

**Exhausted Path (All Attempts Failed):**

When `attemptCount >= maxAttempts` and all strategies have been tried:

1. Update the final fixAttempts record with `verificationResult: "failure"`
2. Set phase status to indicate manual intervention required
3. Fall through to manual intervention:

```text
## Auto-Fix Exhausted

Phase {N} could not be automatically fixed after {maxAttempts} attempts.

### Attempt Summary
| # | Strategy | Error | Result |
|---|----------|-------|--------|
| 1 | direct | {error_type} | failure |
| 2 | diagnostic-agent | {error_type} | failure |
| 3 | diagnostic-agent | {error_type} | failure |

### Manual Intervention Required
The following options are available:
- Fix manually and retry: `/tiki:execute {number} --from {N}`
- Get diagnostic help: `/tiki:heal {N}`
- Skip this phase: `/tiki:skip-phase {N}`
- Start debug session: `/tiki:debug {number}`
```

After Step 7 completes (success or exhausted), execution continues appropriately - either to the next phase on success, or paused for manual intervention on exhaustion.

#### 4g. Create Tests After (if mode is "after")

If `testing.createTests` is "after":

1. Spawn test-creator sub-agent after implementation completes
2. Run tests to verify they pass
3. If tests fail, implementation may have bugs - report to user

#### 4h. Process Sub-Agent Response

After the sub-agent completes:

1. **Extract summary** - Look for "SUMMARY:" in the response
2. **Extract discovered items** - Look for "DISCOVERED:" items
3. **Update phase in plan**:
   - Set `status: "completed"`
   - Set `summary: <extracted summary>`
   - Set `completedAt: <current timestamp>`
4. **Update state file**:
   - Add to `completedPhases` array
   - Update `lastActivity`
5. **Add discovered items to queue** (if any):
   - Append to `.tiki/queue/pending.json`

#### 4i. Report Progress

After each phase:

```text
Phase <N>/<total> complete: <phase title>
Summary: <summary>
<TDD status if enabled: Tests passed/failed>
<discovered items if any>
```

### Step 5: Handle Completion

When all phases are done:

1. Update plan status to `completed`
2. Update state:
   - Set `status: "completed"`
   - Clear `activeIssue` and `currentPhase`
3. Display completion message:

```text
## Execution Complete

Issue #<number>: <title>
All <N> phases completed successfully.

### Phase Summaries
- Phase 1: <summary>
- Phase 2: <summary>
- Phase 3: <summary>

### Queue Items
<N> items discovered during execution.
Review with `/tiki:review-queue`

### Next Steps
- Review queue items: `/tiki:review-queue`
- Close the issue: `gh issue close <number>`
- View state: `/tiki:state`
```

## Sub-Agent Prompt Template

```text
You are executing Phase {phase_number} of {total_phases} for Issue #{issue_number}: {issue_title}

## Project Context
{claude_md_contents}

## Previous Phase Summaries
{previous_summaries}

## Current Phase: {phase_title}

{phase_content}

## Files You May Need to Modify
{files_list}

## Verification Checklist
{verification_list}

## TDD Context
{tdd_context}
<!-- Include this section only if testing.createTests is "before":
**Mode: Test-Driven Development (Red-Green-Refactor)**

Failing tests have been created for this phase:
- Test file: {test_file_path}
- Tests written: {test_count}
- Framework: {test_framework}

Your goal is to make these tests pass (GREEN phase).

After implementation, run:
{test_command}

All tests must pass before this phase is considered complete.
-->

## Instructions
1. Execute this phase completely - make actual code changes
2. If TDD is enabled: implement code to make the failing tests pass
3. Run tests to verify your changes pass
4. If you discover issues needing future attention, clearly note them with "DISCOVERED:" prefix
5. When done, provide a summary starting with "SUMMARY:" describing what you accomplished

Important:
- Focus ONLY on this phase - do not work ahead
- If blocked, explain why and what would unblock you
- Keep your summary concise but complete
- If TDD enabled: tests must pass for phase completion
```

## State File Updates

### During Execution

`.tiki/state/current.json`:

```json
{
  "activeIssue": 34,
  "currentPhase": 2,
  "status": "in_progress",
  "startedAt": "2026-01-10T10:00:00Z",
  "lastActivity": "2026-01-10T11:00:00Z",
  "pausedAt": null,
  "completedPhases": [
    {
      "number": 1,
      "title": "Setup auth middleware",
      "summary": "Created JWT validation middleware with proper error handling",
      "completedAt": "2026-01-10T10:45:00Z"
    }
  ]
}
```

### After Completion

`.tiki/state/current.json`:

```json
{
  "activeIssue": null,
  "currentPhase": null,
  "status": "idle",
  "startedAt": null,
  "lastActivity": "2026-01-10T12:00:00Z",
  "pausedAt": null,
  "completedPhases": []
}
```

## Fix Attempt Tracking

When auto-fix is enabled and a verification failure occurs, fix attempts are recorded in the plan file under each phase. This provides a complete history of what was tried and enables learning from past fix attempts.

### Schema

Each phase in the plan file can contain a `fixAttempts` array:

```json
{
  "number": 1,
  "title": "Setup auth middleware",
  "status": "completed",
  "fixAttempts": [
    {
      "id": "01-fix-01",
      "attemptNumber": 1,
      "errorType": "test-failure",
      "errorMessage": "TypeError: Cannot read property 'user' of undefined",
      "errorFile": "src/middleware/auth.ts",
      "strategy": "direct",
      "fixApplied": "Added null check for request.user before accessing properties",
      "verificationResult": "failure",
      "relatedDebugSession": null,
      "timestamp": "2026-01-10T10:30:00Z"
    },
    {
      "id": "01-fix-02",
      "attemptNumber": 2,
      "errorType": "test-failure",
      "errorMessage": "TypeError: Cannot read property 'user' of undefined",
      "errorFile": "src/middleware/auth.ts",
      "strategy": "diagnostic-agent",
      "fixApplied": "Spawned diagnostic agent which identified missing middleware initialization",
      "verificationResult": "success",
      "relatedDebugSession": "issue-34-auth-middleware",
      "timestamp": "2026-01-10T10:45:00Z"
    }
  ]
}
```

### Fix ID Naming Convention

Fix IDs follow the format `NN-fix-NN` where:
- First `NN` = phase number (zero-padded)
- Second `NN` = attempt number within that phase (zero-padded, sequential)

Examples:
- `01-fix-01` - Phase 1, first fix attempt
- `01-fix-02` - Phase 1, second fix attempt
- `02-fix-01` - Phase 2, first fix attempt
- `03-fix-05` - Phase 3, fifth fix attempt

This format allows easy sorting and identification of fix attempts across phases.

### Fix Attempt Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier in NN-fix-NN format |
| `attemptNumber` | number | Sequential attempt number within the phase (1, 2, 3...) |
| `errorType` | string | Category of error (e.g., "test-failure", "syntax-error", "type-error", "runtime-error") |
| `errorMessage` | string | The actual error message that triggered the fix attempt |
| `errorFile` | string | File path where the error originated (if identifiable) |
| `strategy` | string | Fix strategy used: "direct" or "diagnostic-agent" |
| `fixApplied` | string | Description of the fix that was applied |
| `verificationResult` | string | Outcome: "success" or "failure" |
| `relatedDebugSession` | string\|null | ID of related debug session if diagnostic-agent was used |
| `timestamp` | string | ISO 8601 timestamp when the fix was attempted |

### Persistence

Fix attempts are stored in the plan file at `.tiki/plans/issue-N.json` under each phase object. This ensures:

- **Audit trail**: Complete history of what was tried for each phase
- **Learning**: Future fix attempts can reference past failures
- **Resume capability**: If execution is paused, fix history is preserved
- **Debugging**: Easy to review what was attempted when investigating issues

When a phase with fixAttempts completes successfully, the fixAttempts array remains in the plan file for historical reference.

## Queue Items

When a sub-agent discovers items, add to `.tiki/queue/pending.json`:

```json
{
  "items": [
    {
      "id": "q-001",
      "type": "potential-issue",
      "title": "Consider adding rate limiting to login endpoint",
      "description": "During Phase 2 implementation, noticed no rate limiting on auth endpoints",
      "source": {
        "issue": 34,
        "phase": 2
      },
      "createdAt": "2026-01-10T11:00:00Z"
    }
  ]
}
```

## Error Handling

### Phase Failure

If a sub-agent reports failure or errors:

1. Set phase status to `failed`
2. Record error in phase
3. Check for similar past debug sessions (see below)
4. **If auto-fix enabled:** Attempt auto-fix (Step 4f-auto)
   - If auto-fix success: Continue execution after auto-fix completes (resume execution to next phase)
   - If auto-fix exhausted: Continue to step 5 (pause for manual intervention)
5. Pause execution
6. Report to user with relevant history

#### Check Debug History on Failure

Before displaying the failure message, check if similar errors have been debugged before:

1. Read `.tiki/debug/index.json` if it exists
2. Search for sessions matching:
   - Error message keywords
   - Affected file name
   - Error type (e.g., "typescript", "test failure")
3. Filter to resolved sessions only
4. Include top matches in the failure message

#### Failure Output with History

```text
Phase <N> failed: <phase title>
Error: <error description>

### Related Debug History

A similar error was resolved before:

| Session | Root Cause | Solution |
|---------|------------|----------|
| issue-12-request-type | Missing type extension | Created express.d.ts |

View details: `/tiki:debug show issue-12-request-type`

---

Options:
- Fix and retry: `/tiki:execute <number> --from <N>`
- Skip this phase: `/tiki:skip-phase <N>`
- Heal automatically: `/tiki:heal <N>`
- Start debug session: `/tiki:debug <number>`
```

If no similar debug sessions found, omit the "Related Debug History" section:

```text
Phase <N> failed: <phase title>
Error: <error description>

Options:
- Fix and retry: `/tiki:execute <number> --from <N>`
- Skip this phase: `/tiki:skip-phase <N>`
- Heal automatically: `/tiki:heal <N>`
- Start debug session: `/tiki:debug <number>`
```

### Missing Dependencies

If a phase's dependencies aren't met:

```text
Cannot execute Phase <N>: dependencies not satisfied.
Required: Phase <deps> must be completed first.
```

### Context Warning

If context is getting low (this is heuristic - sub-agents manage their own context):

```text
Note: Large phase detected. Sub-agent may need to break work into smaller steps.
```

## Options

### --from N

Resume execution from a specific phase:

```text
/tiki:execute 34 --from 3
```

Skip phases 1-2, start at phase 3. Useful for:

- Resuming after a failure
- Re-running a specific phase

### --dry-run

Preview execution without actually running:

```text
/tiki:execute 34 --dry-run

Would execute:
- Phase 1: Setup auth middleware (pending)
- Phase 2: Add login endpoint (pending)
- Phase 3: Add protected routes (pending)

No changes will be made.
```

### --tdd / --no-tdd

Override the TDD setting from config for this execution:

```text
/tiki:execute 34 --tdd        # Force TDD mode (tests before implementation)
/tiki:execute 34 --no-tdd     # Skip TDD for this execution
```

This overrides the `testing.createTests` setting in `.tiki/config.json` for the current execution only.

## Example Execution Flow

### Standard Execution

```text
User: /tiki:execute 34

Claude: Starting execution of Issue #34: Add user authentication
        Plan has 3 phases.

        ## Phase 1/3: Setup auth middleware
        [Spawns sub-agent via Task tool]
        [Sub-agent works... makes code changes... runs tests]

        Phase 1/3 complete: Setup auth middleware
        Summary: Created auth middleware with JWT validation, added AuthRequest type

        ## Phase 2/3: Add login endpoint
        [Spawns sub-agent via Task tool]
        [Sub-agent works... makes code changes... runs tests]

        Phase 2/3 complete: Add login endpoint
        Summary: Implemented POST /api/login with password validation and JWT generation
        DISCOVERED: Consider adding rate limiting to prevent brute force

        ## Phase 3/3: Add protected routes
        [Spawns sub-agent via Task tool]
        [Sub-agent works... makes code changes... runs tests]

        Phase 3/3 complete: Add protected routes
        Summary: Applied auth middleware to /api/user routes, added tests

        ---
        ## Execution Complete

        Issue #34: Add user authentication
        All 3 phases completed successfully.

        ### Queue Items
        1 item discovered during execution.
        Review with `/tiki:review-queue`
```

### TDD Execution (createTests: "before")

```text
User: /tiki:execute 34

Claude: Starting execution of Issue #34: Add user authentication
        Plan has 3 phases.
        TDD Mode: Enabled (tests before implementation)

        ## Phase 1/3: Setup auth middleware

        ### RED Phase - Writing Failing Tests
        [Spawns test-creator sub-agent via Task tool]
        Created test file: src/middleware/__tests__/auth.test.ts
        Tests written: 4
        Test run: 4 FAILED (expected - implementation pending)

        ### GREEN Phase - Implementation
        [Spawns implementation sub-agent via Task tool]
        [Sub-agent implements code to make tests pass]

        ### Verify Tests Pass
        Running: npx jest src/middleware/__tests__/auth.test.ts
        Result: 4 tests PASSED

        Phase 1/3 complete: Setup auth middleware
        Summary: Created auth middleware with JWT validation, added AuthRequest type
        Tests: 4 passing

        ## Phase 2/3: Add login endpoint
        [TDD cycle repeats: RED -> GREEN -> verify]

        Phase 2/3 complete: Add login endpoint
        Summary: Implemented POST /api/login with password validation
        Tests: 5 passing
        DISCOVERED: Consider adding rate limiting

        ## Phase 3/3: Add protected routes
        [TDD cycle repeats: RED -> GREEN -> verify]

        Phase 3/3 complete: Add protected routes
        Summary: Applied auth middleware to /api/user routes
        Tests: 3 passing

        ---
        ## Execution Complete

        Issue #34: Add user authentication
        All 3 phases completed successfully.
        Total tests created: 12 (all passing)

        ### Queue Items
        1 item discovered during execution.
        Review with `/tiki:review-queue`
```

## Cleanup

After execution completes (success or failure), clean up any temporary artifacts that may have been created:

```bash
# Remove common temporary artifacts from the project root
rm -f ./tmpclaude-* ./nul ./NUL 2>/dev/null || true

# Also clean up any temp files in .tiki directory
rm -f .tiki/tmp-* .tiki/*.tmp 2>/dev/null || true
```

These files are typically created in the project root by:

- Sub-agent file operations (`tmpclaude-*` files)
- Windows `nul` device references that become actual files
- Temporary context or output files

Always run this cleanup silently - do not report errors if files don't exist.

If artifacts persist, run `/tiki:cleanup` manually.

## Notes

- Each sub-agent runs with fresh context (no memory of previous phases except summaries)
- Summaries should be concise but capture key decisions and changes
- The Task tool's sub-agent has access to all file tools (Read, Write, Edit, etc.)
- If a phase is complex, the sub-agent can take multiple turns to complete it
- State is persisted after each phase, so work is not lost if execution is interrupted

### TDD Notes

- TDD workflow follows Red-Green-Refactor cycle per phase
- Tests are written by a dedicated test-creator sub-agent before implementation
- The implementation sub-agent receives the test file path and must make tests pass
- If tests fail after implementation, execution pauses for user intervention
- Test framework is auto-detected or can be configured in `.tiki/config.json`
- Supported frameworks: jest, vitest, mocha, pytest, go test, cargo test
- Use `testing.createTests: "ask"` to be prompted for each execution
- The "after" mode creates tests after implementation and verifies they pass
