---
type: prompt
name: tiki:execute
description: Execute a planned issue by spawning sub-agents for each phase. Use when ready to implement an issue that has been planned with /plan-issue.
allowed-tools: Bash, Read, Write, Glob, Grep, Task, Edit, TaskOutput
argument-hint: <issue-number> [--from <phase>] [--dry-run] [--tdd|--no-tdd] [--subtask <id>]
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
/tiki:execute 34 --from 2 --subtask 2b  # Retry specific subtask within phase
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
- `autoFix.strategies`: array of ["direct", "contextual-analysis", "approach-review"] (default: all three)

Auto-fix uses progressive escalation through three strategies:

1. **direct**: Pattern-matched inline fix (fast, no sub-agent)
2. **contextual-analysis**: Diagnostic agent with git/dependency context
3. **approach-review**: Full issue context, can signal fundamental approach issues

Each strategy provides deeper analysis than the previous one. When a fix attempt fails, the next strategy in the sequence is tried until all configured strategies are exhausted.

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

### Step 2.5: Display Context Budget Overview

Before beginning execution, calculate and display a context budget overview for all phases.

#### Context Estimation Formula

For each phase, estimate token usage:

```javascript
// Per-phase estimation
phaseContentTokens = phase.content.length / 4
filesEstimate = phase.files.length * 500  // ~500 tokens per file read
verificationTokens = phase.verification.join('\n').length / 4
claudeMdTokens = claudeMdContent.length / 4

// For phase N, cumulative summaries from phases 1 to N-1
previousSummariesTokens = estimatedSummaryTokens * (phaseNumber - 1)
// Use 400 tokens as default summary estimate

totalPhaseEstimate = phaseContentTokens + filesEstimate + verificationTokens + claudeMdTokens + previousSummariesTokens
```

#### Display Format

```text
### Context Budget Overview
| Phase | Est. Tokens | Cumulative |
|-------|-------------|------------|
| 1 | ~4,500 | ~4,500 |
| 2 | ~8,200 | ~5,300* |
| 3 | ~6,100 | ~6,100* |

*Cumulative includes prior summaries, not full prior phases
```

#### Large Phase Warning

If any phase exceeds 40K tokens, display a warning:

```text
⚠️ Large phase detected: Phase 2 (~45K tokens)
   Consider: Sub-agent may need to break work into smaller steps
```

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

#### 4a-sub. Check for Subtasks (Parallel Execution)

Before executing a phase, check if it contains subtasks that can be parallelized:

```javascript
// Check if phase has subtasks array
if (phase.subtasks && phase.subtasks.length > 0) {
  // Use parallel execution flow
  const executionWaves = groupTasksByDependency(phase.subtasks);
  // Execute each wave in parallel (see Parallel Task Grouping section)
} else {
  // No subtasks - continue with standard single-agent execution (backward compatible)
}
```

**Backward Compatibility:**
- If no `subtasks` array exists, continue with existing single-agent execution
- Empty `subtasks` array (`[]`) also falls back to normal execution
- Single subtask executes normally without parallelization overhead

**Subtask State Tracking:**

During parallel execution, track subtask status in the phase object:

```json
{
  "number": 2,
  "title": "Implement authentication module",
  "subtasks": [
    {
      "id": "2a",
      "title": "Create JWT utility functions",
      "status": "pending",
      "dependencies": [],
      "startedAt": null,
      "completedAt": null,
      "summary": null
    },
    {
      "id": "2b",
      "title": "Implement token validation",
      "status": "in_progress",
      "dependencies": ["2a"],
      "startedAt": "2026-01-18T10:30:00Z",
      "completedAt": null,
      "summary": null
    }
  ],
  "subtaskExecution": {
    "currentWave": 1,
    "totalWaves": 2,
    "waveProgress": {
      "wave1": ["2a", "2c"],
      "wave2": ["2b", "2d"]
    }
  }
}
```

**Subtask Status Values:**
- `pending`: Not yet started
- `in_progress`: Currently executing
- `completed`: Successfully finished
- `failed`: Execution failed

When all subtasks complete successfully, the phase is marked as completed and execution continues to the next phase.

#### 4a. Display Phase Context Estimate

Before starting each phase, display a brief context estimate:

```text
## Phase 2/3: Add login endpoint
Context estimate: ~8,500 tokens (Low)
```

Usage levels:
- **Low**: < 30K tokens
- **Medium**: 30K-60K tokens
- **High**: 60K-80K tokens
- **Critical**: > 80K tokens

If the phase exceeds 40K tokens, add a warning:

```text
⚠️ Large phase context (~45K tokens)
   Consider: Phase may need manual intervention if context runs low
```

#### 4b. Check Dependencies

If phase has `dependencies: [1, 2]`, verify phases 1 and 2 are completed before starting.

#### 4c. Update State

Set current phase to `in_progress` in both:

- `.tiki/state/current.json` (activePhase)
- `.tiki/plans/issue-N.json` (phase status)

#### 4d. TDD Workflow (if enabled)

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

#### 4e. Build Sub-Agent Prompt

Construct the prompt for the Task tool. If TDD is enabled, include test context.

**Filter Phase-Relevant Assumptions:**

Before building the prompt, filter assumptions from the plan that affect the current phase:

1. Read the `assumptions` array from the plan file
2. For each assumption, check if `affectsPhases` includes the current phase number
3. Group filtered assumptions by confidence level (high, medium, low)

```javascript
// Filter assumptions for current phase
const phaseAssumptions = plan.assumptions.filter(a =>
  a.affectsPhases.includes(currentPhaseNumber)
);

// Group by confidence
const highConfidence = phaseAssumptions.filter(a => a.confidence === 'high');
const mediumConfidence = phaseAssumptions.filter(a => a.confidence === 'medium');
const lowConfidence = phaseAssumptions.filter(a => a.confidence === 'low');
```

**Build Prompt:**

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

## Relevant Assumptions

The following assumptions were made during planning and affect this phase. If any assumption appears incorrect during implementation, flag it using the format:
`ASSUMPTION_INVALID: {assumption_id} - {reason why it's incorrect}`

### High Confidence
<For each high-confidence assumption affecting this phase>
- **[{id}]** {assumption} (source: {source})
</For each>

### Medium Confidence
<For each medium-confidence assumption affecting this phase>
- **[{id}]** {assumption} (source: {source})
</For each>

### Low Confidence
<For each low-confidence assumption affecting this phase>
- **[{id}]** {assumption} (source: {source})
</For each>

<!-- Omit empty confidence sections. If no assumptions affect this phase, omit entire section. -->

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
4. If any assumption appears incorrect, flag it with: `ASSUMPTION_INVALID: {id} - {reason}`
5. If you discover issues needing future attention, clearly note them at the end with "DISCOVERED:" prefix
6. When done, provide a summary starting with "SUMMARY:" that describes what you accomplished
```

#### 4f. Spawn Sub-Agent

Use the Task tool to spawn a sub-agent:

```text
Task tool call:
- subagent_type: "general-purpose"
- prompt: <constructed prompt from 4d>
- description: "Execute phase N of issue #X"
```

#### 4f-parallel. Spawn Parallel Subtasks

When a phase has subtasks (detected in Step 4a-sub), use parallel execution instead of the standard single-agent approach.

**Step 1: Group Subtasks into Waves**

Use the `groupTasksByDependency` algorithm (see Parallel Task Grouping section) to organize subtasks:

```javascript
const { waves, error } = groupTasksByDependency(phase.subtasks);

if (error) {
  // Handle circular dependency - see error handling section
  reportCircularDependency(error);
  return;
}
```

**Step 2: Execute Each Wave**

For each wave, spawn multiple sub-agents in parallel:

```text
Wave 1 with 3 tasks:
- Task 2a: run_in_background: true
- Task 2b: run_in_background: true
- Task 2c: (last task - no run_in_background, blocks until complete)

Wave 2 with 2 tasks (after wave 1 completes):
- Task 2d: run_in_background: true
- Task 2e: (last task - no run_in_background)
```

**Parallel Spawning Pattern:**

For each task in the wave except the last:
```text
Task tool call:
- subagent_type: "general-purpose"
- run_in_background: true
- prompt: <subtask-specific prompt - see template below>
- description: "Execute subtask {id} of phase {N} for issue #{X}"
```

For the last task in the wave (synchronous, ensures wave completion):
```text
Task tool call:
- subagent_type: "general-purpose"
- prompt: <subtask-specific prompt>
- description: "Execute subtask {id} of phase {N} for issue #{X}"
```

**Step 3: Update Subtask State**

Before spawning each subtask, update its status:
```json
{
  "id": "2a",
  "status": "in_progress",
  "startedAt": "<ISO 8601 timestamp>"
}
```

**Single Subtask Optimization:**

If only one subtask exists, skip parallelization overhead:
```text
if (subtasks.length === 1) {
  // Execute single subtask directly without run_in_background
  // Use standard sub-agent execution flow
}
```

##### Subtask-Specific Prompt Template

Build a focused prompt for each subtask:

```text
You are executing Subtask {subtask_id} of Phase {phase_number} for Issue #{issue_number}: {issue_title}

## Project Context
{claude_md_contents}

## Phase Context
This subtask is part of Phase {phase_number}: {phase_title}

## Previous Phase Summaries
{previous_phase_summaries}

## Your Subtask: {subtask_title}

{subtask_content}

## Files You May Modify
{subtask_files}
<!-- Use subtask.files if specified, otherwise limit to files relevant to this subtask -->

## Dependencies Completed
{completed_dependencies_summaries}
<!-- Include summaries from subtasks this one depends on, if any -->

## Relevant Assumptions
{filtered_assumptions}
<!-- Filter assumptions to those relevant to this subtask's files/content -->

## Instructions
1. Execute ONLY this subtask - do not work on other parts of the phase
2. Focus on the specific files listed above
3. If blocked by missing work from dependencies, explain what's missing
4. If any assumption appears incorrect, flag it with: `ASSUMPTION_INVALID: {id} - {reason}`
5. If you discover issues needing future attention, note them with "DISCOVERED:" prefix
6. When done, provide a summary starting with "TASK_SUMMARY:" describing what you accomplished

Important:
- Your output MUST start with "TASK_SUMMARY:" for result collection
- Keep your summary concise (1-3 sentences)
- Report any blockers immediately
```

#### 4g-parallel. Collect and Merge Results

After all tasks in a wave complete, collect and merge their results.

**Step 1: Collect Results from Background Tasks**

Use TaskOutput to retrieve results from background tasks:

```text
For each background task in the wave:
  TaskOutput tool call:
  - task_id: <id from run_in_background task>
  - timeout: 300000  (5 minutes max wait per task)
```

The last task in the wave (executed synchronously) already has its result available.

**Step 2: Extract TASK_SUMMARY from Each Result**

Parse each task's output to extract the summary:

```javascript
function extractTaskSummary(taskOutput) {
  const match = taskOutput.match(/TASK_SUMMARY:\s*(.+?)(?=\n\n|DISCOVERED:|ASSUMPTION_INVALID:|$)/s);
  return match ? match[1].trim() : "No summary provided";
}
```

**Step 3: Collect DISCOVERED and ASSUMPTION_INVALID Items**

For each task output, also collect:
- `DISCOVERED:` items - Add to queue
- `ASSUMPTION_INVALID:` markers - Add to queue with type "invalid-assumption"

```javascript
function extractDiscoveredItems(taskOutput) {
  const items = [];
  const regex = /DISCOVERED:\s*(.+?)(?=\n|$)/g;
  let match;
  while ((match = regex.exec(taskOutput)) !== null) {
    items.push(match[1].trim());
  }
  return items;
}

function extractInvalidAssumptions(taskOutput) {
  const items = [];
  const regex = /ASSUMPTION_INVALID:\s*(\w+)\s*-\s*(.+?)(?=\n|$)/g;
  let match;
  while ((match = regex.exec(taskOutput)) !== null) {
    items.push({ id: match[1], reason: match[2].trim() });
  }
  return items;
}
```

**Step 4: Update Subtask State**

After collecting each task's result:

```json
{
  "id": "2a",
  "status": "completed",  // or "failed"
  "completedAt": "<ISO 8601 timestamp>",
  "summary": "<extracted TASK_SUMMARY>"
}
```

**Step 5: Merge into Phase Summary**

Combine all subtask summaries into a single phase summary:

```text
SUMMARY: Phase {N} completed with parallel execution:
- Task {id_1}: {summary_1}
- Task {id_2}: {summary_2}
- Task {id_3}: {summary_3}
```

This merged summary is stored in the phase's `summary` field and passed to subsequent phases.

**Step 6: Proceed to Next Wave or Complete Phase**

- If more waves remain: Continue to next wave execution
- If all waves complete successfully: Mark phase as completed, continue to next phase
- If any task failed: Handle partial failure (see below)

##### Partial Failure Handling

When one or more subtasks fail in a wave:

**Recording Partial Success:**

Track which tasks succeeded and which failed:

```json
{
  "subtasks": [
    { "id": "2a", "status": "completed", "summary": "..." },
    { "id": "2b", "status": "failed", "error": "..." },
    { "id": "2c", "status": "completed", "summary": "..." }
  ]
}
```

**All Tasks Fail:**

If all tasks in a wave fail:

```text
## Wave Execution Failed

All subtasks in wave {N} failed:
- Subtask {id_1}: {error_message_1}
- Subtask {id_2}: {error_message_2}

No progress could be made on this phase.

Options:
- Review errors and retry: `/tiki:execute {number} --from {phase}`
- Get diagnostic help: `/tiki:heal {phase}`
- Skip this phase: `/tiki:skip-phase {phase}`
```

**Some Tasks Fail (Partial Success):**

If some tasks succeed and some fail:

```text
## Partial Wave Completion

Wave {N} completed with failures:
- ✓ Subtask {id_1}: {summary}
- ✗ Subtask {id_2}: {error_message}
- ✓ Subtask {id_3}: {summary}

### Successful Tasks
{count} subtasks completed successfully.

### Failed Tasks
{count} subtasks failed and need attention.

### Blocked Tasks
The following tasks in subsequent waves are blocked:
- Subtask {id_4} (depends on: {failed_task_id})

Options:
- Fix and retry failed task: `/tiki:execute {number} --from {phase} --subtask {failed_id}`
- Skip failed subtask: `/tiki:skip-phase {phase} --subtask {failed_id}`
- Get diagnostic help: `/tiki:heal {phase}`
```

**Task Timeout:**

If a background task doesn't complete within the timeout:

```text
## Subtask Timeout

Subtask {id} did not complete within the timeout period ({timeout}ms).

The task may still be running or may have encountered an issue.

Options:
- Wait longer: increase timeout and retry collection
- Check task status manually
- Retry the subtask: `/tiki:execute {number} --from {phase} --subtask {id}`
```

**Retry Individual Subtask:**

The `--subtask` flag can target a specific failed subtask for retry:

```text
/tiki:execute 34 --from 2 --subtask 2b
```

This re-executes only subtask 2b within phase 2, preserving the completed subtasks.

#### 4g. Verify Tests Pass (TDD Green Phase)

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

#### 4g-auto. Auto-Fix Attempt (if enabled)

When verification fails and auto-fix is enabled (or user accepts when prompted), attempt automatic repair before pausing for manual intervention.

**Notification Format:**

Before starting auto-fix, display the failure notification:

```text
✗ Verification failed: <error summary>
```

Then display the auto-fix attempt header:

```text
🔧 Auto-fix attempt {N}/{maxAttempts}:
  Issue: <error message summary>
  Strategy: <direct|contextual-analysis|approach-review>
```

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

**Detailed Error Logging:**

After classifying the error, display the detailed fix attempt header:

```text
🔧 Auto-fix attempt {N}/{maxAttempts}:
  Issue: {error_type} - {brief_error_description}
  File: {error_file}:{error_line}
  Strategy: {selected_strategy}
```

Where placeholders are:

- `{error_type}` is the classified error type (e.g., "type-error", "test-failure")
- `{brief_error_description}` is a concise summary of the error (max ~50 chars)
- `{error_file}` is the path to the file where the error originated
- `{error_line}` is the line number (use "?" if unknown)
- `{selected_strategy}` is "direct", "contextual-analysis", or "approach-review"

##### Step 2: Check Previous Fix Attempts

Before attempting a fix, check the phase's fixAttempts array from the plan file to understand what has already been tried:

1. Read the phase's `fixAttempts` array from `.tiki/plans/issue-N.json`
2. Count current attempts: `attemptCount = fixAttempts.length`
3. Compare attempt count to `autoFix.maxAttempts` from config

**If `attemptCount >= maxAttempts`:**

When the maxAttempts limit is hit (maxAttempts reached), skip auto-fix and fall through to manual intervention:

```text
## 🔧 Auto-Fix Limit Reached

Phase <N> has exhausted all {maxAttempts} automatic fix attempts.
No more automatic fixes will be attempted.

### Previous Attempts

| # | Strategy | Error | Action Taken | Result |
|---|----------|-------|--------------|--------|
| 1 | {strategy_1} | {error_type_1} | {fix_description_1} | ✗ |
| 2 | {strategy_2} | {error_type_2} | {fix_description_2} | ✗ |
| ... | ... | ... | ... | ... |

### What Was Tried

1. **Attempt 1 ({strategy_1})**: {detailed_description_of_first_fix_attempt}
2. **Attempt 2 ({strategy_2})**: {detailed_description_of_second_fix_attempt}
<!-- Continue for each attempt in fixAttempts array -->

### Manual Intervention Required

- Review the error and fix manually: `/tiki:execute <number> --from <N>`
- Get diagnostic help: `/tiki:heal <N>`
- Skip this phase: `/tiki:skip-phase <N>`
```

**Strategy Selection and Escalation:**

When auto-fix is still allowed, select the fix strategy using three-tier escalation:

1. **Attempt 1 - Direct Fix**: Use "direct" strategy (simple, inline fix without spawning sub-agent)
2. **Attempt 2 - Contextual Analysis**: Use "contextual-analysis" strategy (spawn diagnostic agent WITH additional file and test context)
3. **Attempt 3 - Approach Review**: Use "approach-review" strategy (spawn diagnostic agent with full issue context and ability to signal fundamental approach issues)

The escalation tiers provide progressively deeper analysis:

- **direct**: Pattern-matched inline fix. Fast but may miss complex issues.
- **contextual-analysis**: Spawns a sub-agent via the Task tool to analyze the error with additional context about related files and test patterns. Use when direct fixes have failed, as it can identify root causes that simple pattern matching misses.
- **approach-review**: Spawns a sub-agent with the full issue context and ability to signal that the implementation approach itself may be flawed. Use when contextual analysis has failed, suggesting the problem may be architectural rather than localized.

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

Based on the selected strategy, route to the appropriate fix approach:

- **"direct"** → Apply inline fix using pattern matching (see Strategy: Direct Fix below)
- **"contextual-analysis"** → Spawn diagnostic agent with file and test context (see Strategy: Contextual Analysis below)
- **"approach-review"** → Spawn diagnostic agent with full issue context (see Strategy: Approach Review below)

**Progress Indicators:**

Before applying the fix, display what action is being taken:

```text
⏳ Applying fix: {description_of_fix_being_applied}
```

Where `{description_of_fix_being_applied}` briefly describes the specific fix action, for example:

- "Adding null check before accessing user.id"
- "Installing missing package 'lodash'"
- "Fixing import path from './utils' to '../utils'"
- "Adding 'email' property to User interface"

After the fix is applied, display the result with what was done:

```text
✓ Fix applied: {fix_description}
```

Where `{fix_description}` confirms what change was made, for example:

- "Added null check in auth.ts:45"
- "Installed lodash@4.17.21"
- "Updated import path in handler.ts"

If the fix application fails:

```text
✗ Fix failed: {reason}
```

Where `{reason}` explains why the fix could not be applied, for example:

- "File not found: src/auth.ts"
- "Syntax error after applying change"
- "Package installation failed: network error"

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

**Strategy: Contextual Analysis** (attempt 2 - enhanced diagnostic)

When the direct fix has failed (attempt 1), spawn a diagnostic sub-agent via the Task tool to perform deeper analysis with additional context about related files, git history, and test patterns.

**Step 1: Gather Git Context**

Before spawning the diagnostic agent, gather recent changes to the error file:

```bash
# Check diff size first
diff_size=$(git diff HEAD~3 -- {error_file} 2>/dev/null | wc -l)
if [ "$diff_size" -gt 150 ]; then
    # Large diff: show stat summary + last 100 lines
    git diff HEAD~3 --stat -- {error_file}
    git diff HEAD~3 -- {error_file} | tail -100
else
    # Small diff: show full content
    git diff HEAD~3 -- {error_file}
fi
```

Where `{error_file}` is the file path extracted from the error. If the error file cannot be determined, skip git context gathering.

**Step 2: Identify Related Files**

Use language-aware grep patterns to find files that import or depend on the error file:

For TypeScript/JavaScript files (`.ts`, `.tsx`, `.js`, `.jsx`):
```bash
# Extract basename without extension for import matching
basename=$(basename {error_file} | sed 's/\.[^.]*$//')
grep -r "from.*['\"].*${basename}['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | head -10
```

For Python files (`.py`):
```bash
# Extract module name from file path
module=$(basename {error_file} .py)
grep -r "from ${module} import\|import ${module}" --include="*.py" . 2>/dev/null | head -10
```

For other languages: Skip related files identification or use generic grep if helpful.

**Step 3: Get Phase Files Context**

Extract the list of other files from the current phase's `files` array in the plan. These are files being modified together and may have interdependencies.

**Step 4: Spawn Diagnostic Agent**

Task tool call format:
```text
Task tool call:
- subagent_type: "general-purpose"
- prompt: <Contextual Analysis Prompt - see template below>
- description: "Auto-fix: Contextual analysis of {error_type} in phase N of issue #X"
```

**Contextual Analysis Prompt Template:**

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

## Recent Changes to Error File

Consider if recent changes introduced the issue. Here are the changes from the last 3 commits:

{git_diff_output}
<!-- Output from git diff HEAD~3 command, truncated if >150 lines -->

## Files That Import This Module

Check if related files have inconsistent types or interfaces:

{related_files_output}
<!-- Output from language-aware grep command -->

## Other Files in This Phase

These files are being modified together in this phase and may have interdependencies:

{phase_files_list}
<!-- List from phase's files array in the plan -->

## Previous Fix Attempts
{previous_attempts_summary}

## Why This Escalation
{escalation_reason}
<!-- Include one of these explanations:
- "Direct fix strategy failed on attempt N. The simple pattern-based fix did not resolve the issue, suggesting a deeper root cause."
- "Multiple direct fixes have failed. Escalating to diagnostic analysis to identify underlying issues."
- "Error type '{error_type}' requires deeper analysis than pattern matching can provide."
-->

## Related Debug Sessions
{related_debug_sessions}

## Instructions

**IMPORTANT: Announce your actions as you work using these progress indicators:**

Before investigating, announce:

```text
⏳ Diagnostic analysis: <what you're investigating>
```

Examples:

- "⏳ Diagnostic analysis: Checking import paths in auth module"
- "⏳ Diagnostic analysis: Tracing undefined value through call stack"
- "⏳ Diagnostic analysis: Comparing expected vs actual types"
- "⏳ Diagnostic analysis: Reviewing recent changes for regression"
- "⏳ Diagnostic analysis: Checking type consistency across importing files"

Before making changes, announce:

```text
⏳ Applying fix: <what change you're making>
```

Examples:

- "⏳ Applying fix: Adding middleware initialization in app.ts"
- "⏳ Applying fix: Updating return type to include null case"
- "⏳ Applying fix: Fixing circular dependency between modules"
- "⏳ Applying fix: Reverting problematic change from recent commit"
- "⏳ Applying fix: Synchronizing interface across dependent files"

**Analysis Steps:**

1. Analyze the error and its root cause
2. **Consider if recent changes introduced the issue** - review the git diff output
3. **Check if related files have inconsistent types or interfaces** - review importing files
4. Consider why previous fix attempts failed (if any)
5. Look for patterns the direct fix strategy would have missed
6. Apply a fix to resolve the error
7. Verify the fix works locally if possible

## Output Format

When complete, provide:

AUTOFIX_RESULT: success | failure
AUTOFIX_ACTION: [description of what fix was applied]
AUTOFIX_FILES: [comma-separated list of files modified]

If the fix fails, explain why and what additional context would help.
```

The contextual analysis agent has access to all file tools (Read, Write, Edit, Grep, Glob) and can perform comprehensive analysis to identify root causes that simple pattern matching might miss.

**Strategy: Approach Review** (attempt 3 - fundamental review)

When contextual analysis has failed (attempt 2), spawn a diagnostic sub-agent with full issue context and the ability to signal that the implementation approach itself may need to change.

Task tool call format:
```text
Task tool call:
- subagent_type: "general-purpose"
- prompt: <Approach Review Prompt - see template below>
- description: "Auto-fix: Approach review for {error_type} in phase N of issue #X"
```

**Step 1: Gather Issue Context**

Before spawning the diagnostic agent, gather the full issue context from the plan file:

```bash
# Read the plan file to extract issue details and fix history
cat .tiki/plans/issue-{issue_number}.json
```

Extract from the plan file:
- `issue.title` - The issue title
- `issue.body` - The full issue description/requirements
- `successCriteria` - All success criteria from the plan
- Current phase's `content` - The full phase instructions
- Current phase's `fixAttempts` - All previous fix attempt records

**Step 2: Format Previous Fix Attempts**

Build a summary of all previous fix attempts from the phase's `fixAttempts` array:

```text
### Previous Fix Attempts

| # | Strategy | Error Type | Action Taken | Result |
|---|----------|------------|--------------|--------|
| 1 | {strategy_1} | {error_type_1} | {fix_applied_1} | {result_1} |
| 2 | {strategy_2} | {error_type_2} | {fix_applied_2} | {result_2} |

**Attempt 1 ({strategy_1})**: {detailed_description_from_fixApplied_field}
**Attempt 2 ({strategy_2})**: {detailed_description_from_fixApplied_field}
```

**Step 3: Spawn Diagnostic Agent**

Task tool call format:
```text
Task tool call:
- subagent_type: "general-purpose"
- prompt: <Approach Review Prompt - see template below>
- description: "Auto-fix: Approach review for {error_type} in phase N of issue #X"
```

**Approach Review Prompt Template:**

```text
You are a diagnostic agent performing an approach review for Phase {phase_number} of Issue #{issue_number}.

This is the third-tier analysis strategy, used after direct fixes and contextual analysis have both failed. You have access to the full issue context and can determine if the implementation approach itself is fundamentally wrong.

## Original Issue Requirements

### Issue Title
{issue_title}

### Issue Description
{issue_body}
<!-- Full issue body/description from plan file -->

### Success Criteria
{success_criteria}
<!-- All success criteria from the plan, formatted as a list:
- [functional] Criterion 1
- [functional] Criterion 2
- [testing] Criterion 3
- etc.
-->

## Current Phase Context

### Phase Title
{phase_title}

### Phase Intent
{phase_content}
<!-- Full phase content/instructions from the plan -->

### Files Being Modified
{phase_files_list}

## Error Context

- **Error Type**: {error_type}
- **Error Message**: {error_message}
- **Error File**: {error_file}
- **Error Line**: {error_line} (if available)

### Stack Trace
{stack_trace}

## Previous Fix Attempts

The following fixes have already been attempted and failed:

| # | Strategy | Error Type | Action Taken | Result |
|---|----------|------------|--------------|--------|
{fix_attempts_table}

### Detailed Attempt History

{fix_attempts_details}
<!-- For each attempt:
**Attempt N ({strategy})**: {fixApplied description}
- Error: {errorMessage}
- File: {errorFile}
- Result: {verificationResult}
-->

## Why This Escalation

Both direct fix and contextual analysis strategies have failed. This suggests the problem may be:
- Architectural rather than localized
- A conflict between the implementation approach and the requirements
- A fundamental misunderstanding of what needs to be built

## Instructions

**IMPORTANT: Consider whether the implementation approach is fundamentally wrong.**

Before attempting another fix, review:
1. Do the original issue requirements align with what was implemented?
2. Are the fix attempts failing for the same root cause repeatedly?
3. Would a different architectural approach solve this more cleanly?
4. Is there a mismatch between the success criteria and the implementation strategy?

**Progress Indicators:**

Announce your analysis steps:

```text
⏳ Approach review: <what you're analyzing>
```

Examples:
- "⏳ Approach review: Comparing implementation against success criteria"
- "⏳ Approach review: Checking if architectural pattern matches requirements"
- "⏳ Approach review: Analyzing why previous fixes keep failing"
- "⏳ Approach review: Evaluating alternative implementation strategies"

## Output Format

You MUST output one of the following:

### Option 1: APPROACH_ISSUE (Fundamental Problem Detected)

If you determine the implementation approach is fundamentally wrong, output:

```text
APPROACH_ISSUE: <explanation of why the approach is wrong and what should change>
```

Use APPROACH_ISSUE when:
- The fix attempts keep failing for the same root cause
- The implementation strategy conflicts with the original requirements
- A different architectural approach is needed
- The phase content/instructions themselves may need revision
- Re-planning this phase would be more effective than more fix attempts

This will pause execution for human review rather than continuing to attempt fixes.

Example APPROACH_ISSUE outputs:
- "APPROACH_ISSUE: The phase implements synchronous file processing but the requirements call for async streaming. Need to redesign with event-based architecture."
- "APPROACH_ISSUE: Tests keep failing because the middleware is being applied after route handlers. The phase plan should be revised to apply middleware before routes are registered."
- "APPROACH_ISSUE: The current approach uses polling but the success criteria require real-time updates. Should use WebSocket or SSE instead."

### Option 2: AUTOFIX_RESULT (Fix Applied)

If you can identify and apply a fix despite the complexity, output:

```text
AUTOFIX_RESULT: success | failure
AUTOFIX_ACTION: [description of what fix was applied]
AUTOFIX_FILES: [comma-separated list of files modified]
```

Only use AUTOFIX_RESULT if you are confident the fix will resolve the issue. Given that two previous strategies have failed, be cautious about attempting another fix unless you have identified a clear root cause that was missed.

## Decision Guidance

Choose APPROACH_ISSUE when:
- You see a pattern in the failures pointing to a design issue
- The requirements and implementation seem misaligned
- More fixes would just be "whack-a-mole" without addressing root cause
- You would need to change the fundamental structure, not just fix a bug

Choose AUTOFIX_RESULT when:
- You found a clear root cause that previous attempts missed
- The fix is substantial but still within the current approach
- You are highly confident this fix will resolve the issue
```

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
  "strategy": "{direct|contextual-analysis|approach-review}",
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

**Verification Notifications:**

Before re-running verification after a fix, display:

```text
🔄 Re-running verification...
```

After verification completes, display the result:

```text
✓ All verifications passed
```

or:

```text
✗ Verification failed: <error summary>
```

**APPROACH_ISSUE Path (Check First):**

Before checking success or failure paths, first check if the diagnostic agent (from approach-review strategy) output an APPROACH_ISSUE marker. This indicates a fundamental problem with the implementation approach rather than a fixable bug.

When the approach-review diagnostic agent returns, scan its output for `APPROACH_ISSUE:`. If found:

1. Extract the explanation text following `APPROACH_ISSUE:`
2. Do NOT treat this as a normal fix attempt failure
3. Do NOT continue to retry with another strategy
4. Record a special fix attempt entry (see below)
5. Update the phase status to indicate approach review is needed
6. Display the special notification and pause execution

**Recording APPROACH_ISSUE in fixAttempts:**

When APPROACH_ISSUE is detected, record it in the phase's fixAttempts array with a special marker:

```json
{
  "id": "{NN}-fix-{MM}",
  "attemptNumber": {current_attempt_number},
  "errorType": "{original_error_type}",
  "errorMessage": "{original_error_message}",
  "errorFile": "{original_error_file}",
  "strategy": "approach-review",
  "fixApplied": "Diagnostic agent identified fundamental approach issue",
  "verificationResult": "approach-issue",
  "approachIssueExplanation": "{explanation from APPROACH_ISSUE output}",
  "relatedDebugSession": null,
  "timestamp": "{ISO_8601_timestamp}"
}
```

Note the special fields:
- `verificationResult` is set to `"approach-issue"` (not "success" or "failure")
- `approachIssueExplanation` contains the full explanation from the diagnostic agent

**APPROACH_ISSUE Notification:**

Display this special notification when APPROACH_ISSUE is detected:

```text
## ⚠️ Implementation Approach Issue Detected

Phase {N} may have a fundamental approach problem.

### Analysis

{explanation from APPROACH_ISSUE}

### Recommendation

The diagnostic agent suggests the implementation approach needs to change,
rather than applying more fixes to the current approach.

### Options

- Review and revise the approach, then retry: `/tiki:execute {number} --from {N}`
- Get more details: `/tiki:debug {number}`
- Re-plan this phase: `/tiki:discuss-phases {number}`
- Skip this phase: `/tiki:skip-phase {N}`
```

After displaying this notification, pause execution. Do not proceed to the success or failure paths.

**Success Path:**

When the fix succeeds and verification passes:

1. Update the fixAttempts record with `verificationResult: "success"`
2. Clear the error state from the phase
3. Log the successful fix:

   ```text
   ✓ Auto-fix successful (attempt {N}/{maxAttempts}, strategy: {strategy})
   ```

4. Display continuation indicator:

   ```text
   → Continuing to Phase {N+1}
   ```

5. Continue to step 4h to complete the phase

**Failure Path with Retry:**

When the fix fails but attempts remain:

1. Update the fixAttempts record with `verificationResult: "failure"`
2. Increment the attempt counter
3. Escalate strategy if appropriate:
   - If "direct" strategy failed (attempt 1) → try "contextual-analysis" on attempt 2
   - If "contextual-analysis" strategy failed (attempt 2) → try "approach-review" on attempt 3
4. Log the retry attempt:

   ```text
   ✗ Auto-fix attempt {N}/{maxAttempts} failed
   🔧 Auto-fix attempt {N+1}/{maxAttempts}:
     Issue: <error message summary>
     Strategy: <escalated strategy>
   ```

5. Loop back to Step 2 (Check Previous Fix Attempts) to retry with the new strategy

**Exhausted Path (All Attempts Failed):**

When `attemptCount >= maxAttempts` and all strategies have been tried:

1. Update the final fixAttempts record with `verificationResult: "failure"`
2. Set phase status to indicate manual intervention required
3. Fall through to manual intervention:

```text
## 🔧 Auto-Fix Exhausted

Phase {N} could not be automatically fixed after {maxAttempts} attempts.

### Attempt Summary

| # | Strategy | Error | Action Taken | Result |
|---|----------|-------|--------------|--------|
| 1 | direct | {error_type} | {fix_description_1} | ✗ |
| 2 | contextual-analysis | {error_type} | {fix_description_2} | ✗ |
| 3 | approach-review | {error_type} | {fix_description_3} | ✗ |

### What Was Tried

1. **Attempt 1 (direct)**: {detailed_description_of_first_fix_attempt}
2. **Attempt 2 (contextual-analysis)**: {detailed_description_of_second_fix_attempt}
3. **Attempt 3 (approach-review)**: {detailed_description_of_third_fix_attempt}

### Manual Intervention Required

The following options are available:
- Fix manually and retry: `/tiki:execute {number} --from {N}`
- Get diagnostic help: `/tiki:heal {N}`
- Skip this phase: `/tiki:skip-phase {N}`
- Start debug session: `/tiki:debug {number}`
```

After Step 7 completes (success or exhausted), execution continues appropriately - either to the next phase on success, or paused for manual intervention on exhaustion.

##### Example: Complete Auto-Fix Notification Flow

The following example shows the full notification output during an auto-fix cycle:

```text
✓ Phase 01 execution complete

✗ Verification failed: Test auth.test.ts failed - Token undefined in test

🔧 Auto-fix attempt 1/3:
  Issue: test-failure - Token undefined when accessing user.authToken
  File: src/middleware/auth.test.ts:45
  Strategy: direct

⏳ Applying fix: Adding token initialization in test setup
✓ Fix applied: Added authToken mock in beforeEach block

🔄 Re-running verification...
✗ Verification failed: Test auth.test.ts failed - Token still undefined

✗ Auto-fix attempt 1/3 failed
🔧 Auto-fix attempt 2/3:
  Issue: test-failure - Token still undefined after mock setup
  File: src/middleware/auth.test.ts:45
  Strategy: contextual-analysis

⏳ Diagnostic analysis: Tracing token value through middleware chain
⏳ Diagnostic analysis: Checking mock injection timing
⏳ Applying fix: Moving token setup before middleware initialization
✓ Fix applied: Reordered test setup to initialize token before middleware

🔄 Re-running verification...
✓ All verifications passed

✓ Auto-fix successful (attempt 2/3, strategy: contextual-analysis)

→ Continuing to Phase 02
```

**Emoji Reference:**

- ✓ = success/passed/complete
- ✗ = failure/error
- 🔧 = fix/repair operation starting
- ⏳ = in progress/executing
- 🔄 = retry/re-run verification
- → = continue/proceed to next phase

#### 4h. Create Tests After (if mode is "after")

If `testing.createTests` is "after":

1. Spawn test-creator sub-agent after implementation completes
2. Run tests to verify they pass
3. If tests fail, implementation may have bugs - report to user

#### 4i. Process Sub-Agent Response

After the sub-agent completes:

1. **Extract summary** - Look for "SUMMARY:" in the response
2. **Extract discovered items** - Look for "DISCOVERED:" items
3. **Extract trigger markers** - Look for "ADR_TRIGGER:" and "CONVENTION_TRIGGER:" markers
   - Parse the JSON content following each trigger marker
   - Validate the JSON contains required fields (triggerType, decision/pattern, rationale, confidence)
4. **Extract invalid assumption markers** - Look for "ASSUMPTION_INVALID:" markers
   - Parse each marker: `ASSUMPTION_INVALID: {id} - {reason}`
   - Extract the assumption ID and the reason for invalidity
   - Create queue items for each invalid assumption (see step 8 below)
5. **Update phase in plan**:
   - Set `status: "completed"`
   - Set `summary: <extracted summary>`
   - Set `completedAt: <current timestamp>`
6. **Update state file**:
   - Add to `completedPhases` array
   - Update `lastActivity`
7. **Add discovered items to queue** (if any):
   - Append to `.tiki/queue/pending.json`
8. **Add invalid assumptions to queue** (if any):
   - For each ASSUMPTION_INVALID marker found, create a queue item:

   ```json
   {
     "id": "q-NNN",
     "type": "invalid-assumption",
     "title": "Assumption {id} found to be incorrect",
     "description": "{reason from ASSUMPTION_INVALID marker}",
     "source": {
       "issue": <issue_number>,
       "phase": <phase_number>,
       "assumptionId": "{id}"
     },
     "createdAt": "<ISO 8601 timestamp>"
   }
   ```

   - Append to `.tiki/queue/pending.json`
9. **Add triggers to pending triggers** (if any):
   - Create `.tiki/triggers/` directory if it doesn't exist
   - Append to `.tiki/triggers/pending.json` with enriched schema (see Trigger Items section below)

#### 4j. Report Progress

After each phase, report progress with context tracking:

```text
Phase <N>/<total> complete: <phase title>
Summary: <summary>
Context used: ~12K tokens (cumulative summaries: ~800 tokens)
<TDD status if enabled: Tests passed/failed>
<discovered items if any>
```

#### 4k. Track Summary Growth

After each phase completes, track summary growth:

1. Calculate the summary token count for the just-completed phase: `summaryTokens = summary.length / 4`
2. Compare to average of previous summaries
3. If current summary > 2x average, flag it:

```text
📈 Summary length: 1,200 tokens (avg: 400)
   Note: Consider condensing for future phases
```

This helps identify when summaries are getting too detailed, which can consume context in later phases.

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

### Context Usage Summary
- Total phases: 3
- Avg phase context: ~6,300 tokens
- Total summary tokens: 1,200 (avg 400/phase)
- Largest phase: Phase 2 (~8,200 tokens)

### Queue Items
<N> items discovered during execution.
Review with `/tiki:review-queue`

### Next Steps
- Review queue items: `/tiki:review-queue`
- Close the issue: `gh issue close <number>`
- View state: `/tiki:state`
```

#### Offer Next Steps (if enabled)

After displaying the completion summary for successful execution:

Check if menus are enabled:

1. Read `.tiki/config.json`
2. If `workflow.showNextStepMenu` is `false`, skip this section
3. If any phase failed, skip this section (keep existing recovery options text)

Use `AskUserQuestion` to present options:

- "Ship it (Recommended)" (description: "Commit, push, close issue") → invoke Skill with tiki:ship
- "Review queue" (description: "Process discovered items") → invoke Skill with tiki:review-queue
- "View state" (description: "Check current status") → invoke Skill with tiki:state
- "Done for now" (description: "Exit without further action") → end

Based on user selection, invoke the appropriate Skill tool.

## Parallel Task Grouping

When a phase contains subtasks with dependencies, the dependency grouping algorithm organizes them into "execution waves" that can run in parallel.

### Algorithm: groupTasksByDependency

```javascript
function groupTasksByDependency(subtasks) {
  // Step 1: Build dependency graph
  const graph = new Map();
  const inDegree = new Map();

  subtasks.forEach(task => {
    graph.set(task.id, []);
    inDegree.set(task.id, 0);
  });

  // Map dependencies
  subtasks.forEach(task => {
    task.dependencies.forEach(depId => {
      graph.get(depId).push(task.id);
      inDegree.set(task.id, inDegree.get(task.id) + 1);
    });
  });

  // Step 2: Detect circular dependencies (Kahn's algorithm)
  const visited = new Set();
  const waves = [];

  while (visited.size < subtasks.length) {
    // Find all tasks with no unmet dependencies (in-degree 0)
    const currentWave = subtasks
      .filter(t => !visited.has(t.id) && inDegree.get(t.id) === 0)
      .map(t => t.id);

    // Circular dependency detected if no tasks can be executed
    if (currentWave.length === 0) {
      const remaining = subtasks.filter(t => !visited.has(t.id));
      return {
        error: "circular_dependency",
        cycle: remaining.map(t => t.id),
        message: `Circular dependency detected among: ${remaining.map(t => t.id).join(', ')}`
      };
    }

    // Add wave and update dependencies
    waves.push(currentWave);
    currentWave.forEach(taskId => {
      visited.add(taskId);
      graph.get(taskId).forEach(dependentId => {
        inDegree.set(dependentId, inDegree.get(dependentId) - 1);
      });
    });
  }

  return { waves, error: null };
}
```

### Execution Waves

The algorithm returns an array of execution waves:

```javascript
// Example input subtasks
[
  { id: "2a", dependencies: [] },           // No deps - wave 1
  { id: "2b", dependencies: ["2a"] },       // Depends on 2a - wave 2
  { id: "2c", dependencies: [] },           // No deps - wave 1
  { id: "2d", dependencies: ["2a", "2c"] }  // Depends on 2a,2c - wave 2
]

// Returns:
{
  waves: [
    ["2a", "2c"],  // Wave 1: Independent tasks (run in parallel)
    ["2b", "2d"]   // Wave 2: Depends on wave 1 (run in parallel after wave 1)
  ],
  error: null
}
```

### Wave Execution Flow

For each execution wave:

1. **Spawn all tasks in the wave simultaneously** using multiple Task tool calls
2. **Wait for all tasks in the wave to complete**
3. **Collect summaries** from all completed tasks
4. **Update subtask status** (completed/failed)
5. **Proceed to next wave** if all tasks succeeded

```text
Wave 1: [2a, 2c]
  ├── Task 2a → spawned → completed
  └── Task 2c → spawned → completed
       ↓ (wait for all)
Wave 2: [2b, 2d]
  ├── Task 2b → spawned → completed
  └── Task 2d → spawned → completed
       ↓ (wait for all)
Phase complete
```

### Error Handling

**Circular Dependency Detection:**

If circular dependencies are detected, report the error and halt phase execution:

```text
## Circular Dependency Detected

Phase 2 contains circular dependencies that prevent execution:
- Subtasks involved: 2a → 2b → 2c → 2a

This indicates a planning issue. Please review the subtask dependencies.

Options:
- Review and fix dependencies: `/tiki:discuss-phases <number>`
- Skip this phase: `/tiki:skip-phase 2`
```

**Subtask Failure Handling:**

If any subtask in a wave fails:

1. Mark the failed subtask as `failed`
2. Continue executing other tasks in the current wave (they may succeed)
3. After wave completes, check for failures
4. If any task failed, pause and report which tasks failed
5. Tasks in subsequent waves that depend on failed tasks cannot proceed

```text
## Subtask Execution Failed

Wave 1 completed with failures:
- ✓ Subtask 2a: Create JWT utility functions - completed
- ✗ Subtask 2c: Implement rate limiter - failed

Error: <error message from failed subtask>

Tasks blocked by this failure:
- Subtask 2d (depends on: 2c)

Options:
- Fix and retry: `/tiki:execute <number> --from <phase>`
- Skip failed subtask: `/tiki:skip-phase <phase> --subtask 2c`
```

### Single Subtask Optimization

When a phase has exactly one subtask, skip the wave grouping overhead:

```javascript
if (subtasks.length === 1) {
  // Execute single subtask directly without parallelization
  executeSubtask(subtasks[0]);
}
```

This avoids unnecessary complexity for phases that were structured with subtasks but only have one task.

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

## Relevant Assumptions
{assumptions_section}
<!-- Include this section only if there are assumptions affecting this phase.
Filter assumptions where affectsPhases includes current phase number.
Group by confidence level (high, medium, low). Omit empty groups.

Format each assumption as:
- **[{id}]** {assumption} (source: {source})

Example:
### High Confidence
- **[A1]** The application uses Express.js for HTTP handling (source: inferred from package.json)

### Medium Confidence
- **[A3]** Authentication tokens expire after 24 hours (source: issue description)

If no assumptions affect this phase, omit this entire section.
-->

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

## Trigger Detection

During execution, watch for decisions or patterns that should be captured for project knowledge.

### ADR Triggers
When you make or encounter a significant architectural or technology decision, emit:
```
ADR_TRIGGER: {"triggerType": "architecture|technology|library|pattern", "decision": "<what was decided>", "rationale": "<why this choice>", "alternatives": ["<other options considered>"], "confidence": "high|medium|low"}
```

Emit ADR triggers when:
- Choosing between competing libraries or frameworks
- Selecting architectural patterns (e.g., repository pattern, event sourcing)
- Making significant trade-off decisions
- Establishing conventions that affect multiple components

### Convention Triggers
When you discover or establish a project convention/pattern, emit:
```
CONVENTION_TRIGGER: {"triggerType": "naming|structure|pattern|practice", "pattern": "<the convention>", "rationale": "<why this is a good convention>", "examples": ["<code examples>"], "confidence": "high|medium|low"}
```

Emit CONVENTION triggers when:
- Discovering existing naming conventions in the codebase
- Establishing new patterns for consistency
- Finding implicit rules that should be documented
- Identifying best practices specific to this project

### Confidence Levels
- **high**: Clear, deliberate decision with strong rationale
- **medium**: Reasonable choice but alternatives could work
- **low**: Tentative decision that may need revisiting

## Instructions
1. Execute this phase completely - make actual code changes
2. If TDD is enabled: implement code to make the failing tests pass
3. Run tests to verify your changes pass
4. If any assumption in "Relevant Assumptions" appears incorrect, flag it with:
   `ASSUMPTION_INVALID: {id} - {reason why it's incorrect}`
5. If you discover issues needing future attention, clearly note them with "DISCOVERED:" prefix
6. When done, provide a summary starting with "SUMMARY:" describing what you accomplished

Important:
- Focus ONLY on this phase - do not work ahead
- If blocked, explain why and what would unblock you
- Keep your summary concise but complete
- If TDD enabled: tests must pass for phase completion
- Flag incorrect assumptions immediately when discovered - this helps improve future planning
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
      "strategy": "contextual-analysis",
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
| `strategy` | string | Fix strategy used: "direct", "contextual-analysis", or "approach-review" |
| `fixApplied` | string | Description of the fix that was applied |
| `verificationResult` | string | Outcome: "success" or "failure" |
| `relatedDebugSession` | string\|null | ID of related debug session if contextual-analysis or approach-review was used |
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

## Trigger Items

When a sub-agent emits ADR_TRIGGER or CONVENTION_TRIGGER markers, store them in `.tiki/triggers/pending.json`:

```json
{
  "triggers": [
    {
      "id": "trg-001",
      "triggerType": "architecture",
      "category": "adr",
      "title": "Repository pattern for data access",
      "details": {
        "decision": "Use repository pattern to abstract database operations",
        "rationale": "Enables testing with mock repositories and future database migrations",
        "alternatives": ["Direct database queries", "Active Record pattern"]
      },
      "confidence": "high",
      "source": {
        "issue": 34,
        "phase": 2
      },
      "createdAt": "2026-01-10T11:00:00Z"
    },
    {
      "id": "trg-002",
      "triggerType": "naming",
      "category": "convention",
      "title": "Use camelCase for function names",
      "details": {
        "pattern": "All exported functions use camelCase naming",
        "rationale": "Consistent with existing codebase and JavaScript conventions",
        "examples": ["getUserById", "createAuthToken", "validateRequest"]
      },
      "confidence": "high",
      "source": {
        "issue": 34,
        "phase": 3
      },
      "createdAt": "2026-01-10T12:00:00Z"
    }
  ]
}
```

### Trigger Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier in `trg-NNN` format (sequential) |
| `triggerType` | string | Subtype: "architecture", "technology", "library", "pattern" (for ADR) or "naming", "structure", "pattern", "practice" (for convention) |
| `category` | string | Either "adr" or "convention" indicating the trigger source |
| `title` | string | Brief descriptive title for the trigger |
| `details` | object | Original trigger payload containing decision/pattern, rationale, alternatives/examples |
| `confidence` | string | Confidence level: "high", "medium", or "low" |
| `source` | object | Issue number and phase where trigger was detected |
| `createdAt` | string | ISO 8601 timestamp when trigger was captured |

### Trigger ID Generation

Trigger IDs use sequential numbering with the format `trg-NNN`:
- Read existing triggers from `.tiki/triggers/pending.json`
- Find the highest existing ID number
- Increment by 1 for each new trigger
- Zero-pad to 3 digits (e.g., `trg-001`, `trg-002`, `trg-015`)

### Processing Triggers

When extracting triggers from sub-agent response:

1. Search for `ADR_TRIGGER:` followed by JSON object
2. Search for `CONVENTION_TRIGGER:` followed by JSON object
3. For each found trigger:
   - Parse the JSON payload
   - Set `category` based on marker type ("adr" for ADR_TRIGGER, "convention" for CONVENTION_TRIGGER)
   - Generate unique `id`
   - Generate `title` from the decision/pattern field
   - Store original fields in `details` object
   - Add `source` with current issue and phase
   - Add `createdAt` timestamp
4. Append all triggers to `.tiki/triggers/pending.json`

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

### --subtask ID

Retry a specific subtask within a phase (used with `--from`):

```text
/tiki:execute 34 --from 2 --subtask 2b
```

This is useful for:

- Retrying a failed subtask without re-running successful ones
- Recovering from partial failures in parallel execution
- Testing fixes for a specific subtask

When `--subtask` is specified:
1. Skip to the specified phase (via `--from`)
2. Re-run only the specified subtask
3. Preserve completed subtasks in the same phase
4. Update subtask state and resume normal execution

If the subtask has dependencies that haven't completed, an error is displayed.

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

### Parallel Execution (with subtasks)

```text
User: /tiki:execute 42

Claude: Starting execution of Issue #42: Add authentication module
        Plan has 2 phases.

        ## Phase 1/2: Create base authentication utilities

        ### Parallel Execution - Wave 1
        Subtasks with no dependencies: 1a, 1c
        [Spawns 2 sub-agents in parallel via Task tool]

        - Task 1a (run_in_background): Create JWT utility functions
        - Task 1c: Implement password hashing helpers

        Waiting for wave 1 to complete...

        ### Wave 1 Complete
        - ✓ Subtask 1a: Created sign/verify JWT functions with RS256 support
        - ✓ Subtask 1c: Added bcrypt password hashing with configurable rounds

        ### Parallel Execution - Wave 2
        Subtasks depending on wave 1: 1b, 1d
        [Spawns 2 sub-agents in parallel via Task tool]

        - Task 1b (run_in_background): Implement token validation middleware
        - Task 1d: Create user session management

        Waiting for wave 2 to complete...

        ### Wave 2 Complete
        - ✓ Subtask 1b: Added JWT validation middleware with refresh support
        - ✓ Subtask 1d: Implemented session store with Redis backing

        Phase 1/2 complete: Create base authentication utilities
        Summary: Phase 1 completed with parallel execution:
        - Task 1a: Created sign/verify JWT functions with RS256 support
        - Task 1c: Added bcrypt password hashing with configurable rounds
        - Task 1b: Added JWT validation middleware with refresh support
        - Task 1d: Implemented session store with Redis backing

        ## Phase 2/2: Integrate authentication with routes
        [Standard single-agent execution continues...]

        Phase 2/2 complete: Integrate authentication with routes
        Summary: Applied auth middleware to protected routes, added login/logout endpoints

        ---
        ## Execution Complete

        Issue #42: Add authentication module
        All 2 phases completed successfully.
```

### Parallel Execution with Partial Failure

```text
User: /tiki:execute 42

Claude: Starting execution of Issue #42: Add authentication module
        Plan has 2 phases.

        ## Phase 1/2: Create base authentication utilities

        ### Parallel Execution - Wave 1
        [Spawns 2 sub-agents in parallel]

        ### Wave 1 Complete (Partial Failure)
        - ✓ Subtask 1a: Created sign/verify JWT functions
        - ✗ Subtask 1c: TypeError - bcrypt module not found

        ## Partial Wave Completion

        Wave 1 completed with failures:
        - ✓ Subtask 1a: Created sign/verify JWT functions
        - ✗ Subtask 1c: TypeError - bcrypt module not found

        ### Successful Tasks
        1 subtask completed successfully.

        ### Failed Tasks
        1 subtask failed and needs attention.

        ### Blocked Tasks
        The following tasks in subsequent waves are blocked:
        - Subtask 1d (depends on: 1c)

        Options:
        - Fix and retry failed task: `/tiki:execute 42 --from 1 --subtask 1c`
        - Skip failed subtask: `/tiki:skip-phase 1 --subtask 1c`
        - Get diagnostic help: `/tiki:heal 1`
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

### Parallel Execution Notes

- Phases with subtasks execute in parallel using `run_in_background: true`
- Subtasks are grouped into waves based on dependencies (Kahn's topological sort)
- All tasks in a wave run concurrently; waves execute sequentially
- Task results are collected via TaskOutput tool after spawning
- Each subtask must output `TASK_SUMMARY:` for result collection
- Partial failures preserve successful subtask work
- Use `--subtask` flag to retry individual failed subtasks
- Single subtask phases skip parallelization overhead
- Circular dependencies are detected and reported before execution starts

**When to Use Parallel Execution:**

- Independent file changes that don't share state (e.g., creating separate utility files)
- Test file creation alongside implementation files
- Multiple configuration files or schemas
- Setting up independent components (e.g., database schema + auth config)
- Any tasks that operate on completely separate files

**Limitations:**

- Shared file conflicts: Subtasks that modify the same file will cause merge conflicts
- Dependency complexity: Deep dependency chains reduce parallelism benefits
- Context isolation: Subtasks cannot share runtime state or communicate
- Resource contention: Many parallel tasks may hit API rate limits or memory constraints
- Error propagation: A failed dependency blocks all downstream subtasks in later waves
