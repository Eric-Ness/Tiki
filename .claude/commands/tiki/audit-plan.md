---
type: prompt
name: tiki:audit-plan
description: Validate a plan before execution. Use when you want to check phase sizes, dependencies, file conflicts, and verification steps before running /execute.
allowed-tools: Read, Glob, Grep
argument-hint: [issue-number] [--verbose]
---

# Audit Plan

Validates a plan before execution to identify potential issues.

## Usage

```
/tiki:audit-plan
/tiki:audit-plan 34
/tiki:audit-plan --verbose
```

## Instructions

### Step 1: Load the Plan

If no issue number provided, check for active plan:

1. Read `.tiki/state/current.json` to find active issue
2. Read `.tiki/plans/issue-{number}.json`

If no active plan:
```
No active plan found.

Use `/tiki:plan-issue <number>` to create a plan first.
```

### Step 2: Run Validation Checks

Perform each validation check and collect results:

#### Check 1: Phase Count and Sizes

Verify phases are reasonably sized:

```javascript
// For each phase, estimate complexity
for (const phase of plan.phases) {
  const taskCount = phase.tasks?.length || 0;
  const fileCount = phase.files?.length || 0;

  // Flag if phase seems too large
  if (taskCount > 10 || fileCount > 15) {
    warnings.push(`Phase ${phase.number} may be too large (${taskCount} tasks, ${fileCount} files)`);
  }
}
```

A phase is considered reasonable if it:
- Has 1-10 discrete tasks
- Touches 1-15 files
- Can be completed in one context window (~50K tokens)
- Has clear, focused scope

#### Check 2: Dependency Validation

Check for dependency issues:

```javascript
// Check for circular dependencies
function detectCircular(phases) {
  const visited = new Set();
  const inStack = new Set();

  function dfs(phaseNum) {
    if (inStack.has(phaseNum)) return true; // Circular!
    if (visited.has(phaseNum)) return false;

    visited.add(phaseNum);
    inStack.add(phaseNum);

    const phase = phases.find(p => p.number === phaseNum);
    for (const dep of phase.dependencies || []) {
      if (dfs(dep)) return true;
    }

    inStack.delete(phaseNum);
    return false;
  }

  return phases.some(p => dfs(p.number));
}

// Check dependency ordering (deps should have lower phase numbers)
for (const phase of plan.phases) {
  for (const dep of phase.dependencies || []) {
    if (dep >= phase.number) {
      errors.push(`Phase ${phase.number} depends on Phase ${dep} which comes later`);
    }
  }
}
```

#### Check 3: File Conflict Detection

Identify phases that modify the same files:

```javascript
const fileToPhases = new Map();

for (const phase of plan.phases) {
  for (const file of phase.files || []) {
    if (!fileToPhases.has(file)) {
      fileToPhases.set(file, []);
    }
    fileToPhases.get(file).push(phase.number);
  }
}

// Report conflicts
for (const [file, phases] of fileToPhases) {
  if (phases.length > 1) {
    // Only warn if phases are not sequential
    const sequential = phases.every((p, i) => i === 0 || p === phases[i-1] + 1);
    if (!sequential) {
      warnings.push(`Phases ${phases.join(', ')} all modify ${file} - consider consolidating`);
    }
  }
}
```

#### Check 4: Verification Steps

Ensure each phase has verification:

```javascript
for (const phase of plan.phases) {
  if (!phase.verification || phase.verification.length === 0) {
    warnings.push(`Phase ${phase.number} has no verification steps`);
  }
}
```

#### Check 5: Referenced Files Exist

Check that referenced files exist in the codebase:

```javascript
for (const phase of plan.phases) {
  for (const file of phase.files || []) {
    // Skip new files (marked with [new] or similar)
    if (file.includes('[new]') || file.includes('[create]')) continue;

    // Check if file exists
    const exists = await fileExists(file);
    if (!exists) {
      errors.push(`Phase ${phase.number} references non-existent file: ${file}`);
    }
  }
}
```

#### Check 6: Criteria Coverage Validation

Validate that all success criteria from `plan.successCriteria` are adequately addressed by phases. Read `addressesCriteria` from each phase and optionally use `coverageMatrix` if available.

**Coverage thresholds:**

- **Error (0 tasks):** A criterion with no mapped tasks is an error - the plan cannot proceed until all criteria are addressed by at least one phase
- **Warning (1 task):** A single task covering a criterion produces a warning for weak coverage - consider adding more tasks to strengthen coverage
- **Good (2+ tasks):** Criterion has adequate coverage

```javascript
// Build coverage map from phases
const criterionCoverage = new Map();

// Initialize all criteria with zero coverage
for (const criterion of plan.successCriteria || []) {
  criterionCoverage.set(criterion.id, { criterion, phases: [] });
}

// Count which phases address each criterion
for (const phase of plan.phases) {
  for (const criterionId of phase.addressesCriteria || []) {
    if (criterionCoverage.has(criterionId)) {
      criterionCoverage.get(criterionId).phases.push(phase.number);
    }
  }
}

// Validate coverage for each criterion
for (const [criterionId, coverage] of criterionCoverage) {
  const count = coverage.phases.length;

  if (count === 0) {
    // Error: criterion not covered by any phase
    errors.push(`Criterion "${coverage.criterion.text}" has no coverage - not addressed by any phase`);
  } else if (count === 1) {
    // Warning: weak coverage with only 1 task
    warnings.push(`Criterion "${coverage.criterion.text}" has weak coverage - only 1 task addresses it. Consider adding more tasks for stronger coverage.`);
  }
}
```

### Step 3: Generate Report

Output the audit report:

```
Plan Audit for Issue #34
========================
{checkmark} 5 phases defined
{checkmark} Dependencies valid
{warning} Phase 3 and 4 both modify api.ts - consider splitting differently
{checkmark} All referenced files exist
{checkmark} Verification steps included
{checkmark} Criteria coverage: All criteria are covered (4/4)

Recommendation: Adjust phase boundaries before executing.
```

Use these symbols:
- `✓` - Check passed
- `⚠` - Warning (non-blocking)
- `✗` - Error (blocking)

### Step 4: Provide Recommendation

Based on results:

**All checks pass:**
```
Plan is ready for execution.

Run `/tiki:execute {issue}` to begin.
```

**Warnings only:**
```
Recommendation: Review warnings before executing.

The plan can proceed, but consider:
- [specific suggestions based on warnings]

Run `/tiki:execute {issue}` when ready, or `/tiki:plan-issue {issue}` to revise.
```

**Errors found:**
```
Plan has blocking issues that must be resolved:

- [specific errors]

Run `/tiki:plan-issue {issue}` to revise the plan.
```

## Validation Details

This section documents the validation rules including phase sizes, dependencies, file conflicts, and criteria coverage validation thresholds.

### Phase Size Guidelines

| Aspect | Good | Warning | Error |
|--------|------|---------|-------|
| Tasks | 1-7 | 8-10 | >10 |
| Files | 1-10 | 11-15 | >15 |
| Scope | Focused | Broad | Unclear |

### Dependency Rules

1. Dependencies must reference earlier phases (lower numbers)
2. No circular dependencies allowed
3. Implicit dependencies should be explicit
4. Cross-phase state must be documented

### File Conflict Severity

| Pattern | Severity | Recommendation |
|---------|----------|----------------|
| Sequential phases | Info | Expected for iterative work |
| Non-adjacent phases | Warning | Consider restructuring |
| Many phases same file | Error | Likely should consolidate |

### Criteria Coverage Validation

Criteria coverage ensures each success criterion is addressed by plan tasks.

A criterion with no mapped tasks results in an error - the plan cannot proceed until all criteria are addressed.

| Tasks Addressing | Severity | Recommendation |
|------------------|----------|----------------|
| 0 | Error | Criterion not covered - must add tasks |
| 1 | Warning | Weak coverage - consider adding more tasks |
| 2+ | Good | Adequate coverage |

## Examples

### Example 1: Clean Plan

```
Plan Audit for Issue #42
========================
✓ 3 phases defined
✓ Phase sizes appropriate
✓ Dependencies valid
✓ No file conflicts
✓ All referenced files exist
✓ Verification steps included
✓ Criteria coverage: All criteria are covered (3/3)

Plan is ready for execution.

Run `/tiki:execute 42` to begin.
```

### Example 2: Plan with Warnings

```
Plan Audit for Issue #18
========================
✓ 4 phases defined
⚠ Phase 2 has 12 tasks - consider splitting
✓ Dependencies valid
⚠ Phases 1 and 3 both modify src/config.ts
✓ All referenced files exist
✓ Verification steps included
⚠ Criteria coverage: "Performance improves by 20%" has weak coverage - only 1 task addresses it

Recommendation: Review warnings before executing.

The plan can proceed, but consider:
- Split Phase 2 into two smaller phases
- Move config.ts changes to Phase 1 or consolidate in Phase 3
- Add more tasks to strengthen coverage for performance criterion

Run `/tiki:execute 18` when ready, or `/tiki:plan-issue 18` to revise.
```

### Example 3: Plan with Errors

```
Plan Audit for Issue #7
========================
✓ 5 phases defined
✗ Circular dependency: Phase 2 -> Phase 4 -> Phase 2
✗ Phase 3 references non-existent file: src/legacy/old-api.ts
⚠ Phase 4 has no verification steps
✗ Criteria coverage: "Security audit passes" is not covered - not addressed by any phase

Plan has blocking issues that must be resolved:

1. Fix circular dependency between phases 2 and 4
2. Verify src/legacy/old-api.ts path or update phase 3
3. Add tasks to address the "Security audit passes" criterion

Run `/tiki:plan-issue 7` to revise the plan.
```

### Example 4: Verbose Output

With `--verbose` flag, show additional details including criteria coverage analysis and which phases address which criteria:

```
Plan Audit for Issue #34 (Verbose)
==================================

## Phase Analysis

### Phase 1: Setup database models
- Tasks: 4
- Files: 3 (src/models/user.ts, src/models/session.ts, src/db/migrations/001.ts)
- Dependencies: none
- Verification: ✓ (2 steps)
- Addresses Criteria: C1 (Database schema defined), C2 (Migrations work)
- Estimated complexity: Low

### Phase 2: Add authentication endpoints
- Tasks: 6
- Files: 5
- Dependencies: Phase 1
- Verification: ✓ (3 steps)
- Addresses Criteria: C3 (Auth endpoints respond), C4 (Sessions persist)
- Estimated complexity: Medium

[... more phases ...]

## Dependency Graph

Phase 1 (Setup)
    └── Phase 2 (Auth endpoints)
        └── Phase 3 (Frontend integration)
            └── Phase 4 (Testing)
                └── Phase 5 (Documentation)

## File Modification Map

src/models/user.ts: Phase 1
src/routes/auth.ts: Phase 2, Phase 3 ⚠
src/middleware/auth.ts: Phase 2
src/components/Login.tsx: Phase 3

## Criteria Coverage Analysis

| Criterion | Coverage | Phases |
|-----------|----------|--------|
| C1: Database schema defined | ✓ Good (2) | Phase 1, Phase 4 |
| C2: Migrations work | ✓ Good (2) | Phase 1, Phase 4 |
| C3: Auth endpoints respond | ✓ Good (3) | Phase 2, Phase 3, Phase 4 |
| C4: Sessions persist | ⚠ Weak (1) | Phase 2 |

## Summary

✓ 5 phases defined
✓ Dependencies valid
⚠ Phase 2 and 3 both modify src/routes/auth.ts
✓ All referenced files exist
✓ Verification steps included
⚠ Criteria coverage: 3/4 criteria have good coverage, 1 has weak coverage

Recommendation: Adjust phase boundaries before executing.
```

## Notes

- Run audit before every `/tiki:execute` to catch issues early
- Warnings don't block execution but should be reviewed
- Errors must be resolved before execution can proceed
- Use `--verbose` for detailed analysis of complex plans
- The audit is read-only - it never modifies the plan
