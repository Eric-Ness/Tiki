# Execute.md Content Audit

## Baseline Measurement

- **Total tokens**: 20,634 (measured via tiktoken cl100k_base)
- **Total lines**: 2,691
- **Percentage of 200K context**: 10.32%
- **Measured at**: 2026-01-19

## Section-by-Section Analysis

### Orchestrator Sections (Keep)

| Section | Lines | Est. Tokens | Status |
|---------|-------|-------------|--------|
| YAML Frontmatter + Header | 1-11 | ~80 | Keep |
| Usage | 13-22 | ~120 | Keep |
| Step 1: Validate Plan | 26-38 | ~100 | Keep |
| Step 2: Read Context/Config (core) | 40-58 | ~200 | Keep |
| Step 3: Initialize State | 153-170 | ~180 | Keep |
| Step 4: Core Loop (4a-4c) | 171-274 | ~550 | Keep |
| Step 4e: Build Sub-Agent Prompt (core) | 351-376 | ~300 | Keep |
| Step 4f: Spawn Sub-Agent | 444-453 | ~100 | Keep |
| Step 4i: Process Response | 1658-1702 | ~400 | Keep |
| Step 4j: Report Progress | 1703-1714 | ~120 | Keep |
| Step 5: Handle Completion (core) | 1730-1765 | ~350 | Keep |
| State File Updates (core schema) | 2057-2096 | ~400 | Keep |
| Error Handling (essential) | 2284-2365 | ~500 | Keep |
| Options Section | 2366-2427 | ~550 | Keep |
| Notes (essential) | 2645-2663 | ~200 | Keep |

**Orchestrator Total**: ~4,150 tokens

### Conditional Sections (Extract to on-demand prompts)

| Section | Lines | Est. Tokens | Extract To | Reason |
|---------|-------|-------------|------------|--------|
| Step 2: Auto-Fix Config | 59-107 | ~450 | autofix-config.md | Only needed when autofix enabled |
| Step 2.5: Context Budget Overview | 109-152 | ~400 | context-budget.md | Optional pre-execution display |
| Step 4a-sub: Subtask/Parallel Check | 175-240 | ~600 | parallel-execution.md | Only for phases with subtasks |
| Step 4d: TDD Workflow | 275-349 | ~800 | tdd-workflow.md | Only when TDD enabled |
| Step 4e: Assumptions Section | 356-414 | ~550 | Keep inline (useful) | Part of prompt building |
| Step 4f-parallel: Spawn Parallel | 455-572 | ~1,100 | parallel-execution.md | Only for phases with subtasks |
| Step 4g-parallel: Collect Results | 574-752 | ~1,600 | parallel-execution.md | Only for phases with subtasks |
| Step 4g: TDD Green Phase | 754-789 | ~350 | tdd-workflow.md | Only when TDD enabled |
| Step 4g-auto: Auto-Fix Attempt | 790-1601 | ~7,800 | autofix-strategies.md | Only on verification failure |
| Step 4h: Tests After | 1650-1657 | ~100 | tdd-workflow.md | Only when mode is "after" |
| Step 4k: Track Summary Growth | 1715-1728 | ~150 | Keep (small) | Context tracking |
| Offer Next Steps (menu) | 1766-1784 | ~200 | completion-menu.md | Optional menu |
| Parallel Task Grouping Algorithm | 1786-1947 | ~1,500 | parallel-execution.md | Only for subtask phases |
| Sub-Agent Prompt Template | 1949-2055 | ~1,000 | Keep (core) | Essential for execution |
| Fix Attempt Tracking | 2097-2178 | ~750 | autofix-strategies.md | Only when autofix used |
| Queue Items | 2180-2200 | ~200 | Keep (small) | Core functionality |
| Trigger Items | 2202-2283 | ~750 | triggers.md | Optional feature |
| TDD Notes | 2653-2662 | ~150 | tdd-workflow.md | TDD-specific notes |
| Parallel Execution Notes | 2664-2691 | ~300 | parallel-execution.md | Parallel-specific notes |

**Conditional Total**: ~17,550 tokens (extractable)

### Trim Opportunities (Remove or Condense)

| Section | Lines | Current | Target | Savings | Notes |
|---------|-------|---------|--------|---------|-------|
| Auto-Fix Prompt Template (Step 2) | 87-105 | ~180 | ~50 | 130 | Inline prompt can be condensed |
| Diagnostic Agent Prompt Template | 1061-1167 | ~1,000 | ~300 | 700 | Move to extracted file |
| Approach Review Prompt Template | 1223-1369 | ~1,400 | ~400 | 1,000 | Move to extracted file |
| Error Classification Table | 813-826 | ~200 | ~80 | 120 | Can be more concise |
| Direct Fix Table | 986-997 | ~150 | ~60 | 90 | Duplicate info |
| Verification Command Table | 1408-1416 | ~100 | ~40 | 60 | Can condense |
| Example Execution Flow (Standard) | 2431-2470 | ~400 | ~150 | 250 | Reduce verbosity |
| Example Execution Flow (TDD) | 2472-2526 | ~500 | ~200 | 300 | Reduce verbosity |
| Example Execution Flow (Parallel) | 2528-2582 | ~500 | ~200 | 300 | Reduce verbosity |
| Example Execution Flow (Partial Fail) | 2584-2621 | ~350 | ~150 | 200 | Reduce verbosity |
| Cleanup Section | 2623-2643 | ~200 | ~80 | 120 | Over-documented |
| Code Examples (redundant) | Various | ~800 | ~400 | 400 | Many inline examples redundant |

**Trim Savings**: ~3,670 tokens

## Classification Summary

| Classification | Token Count | Percentage |
|----------------|-------------|------------|
| Orchestrator (keep in main) | ~4,150 | 20.1% |
| Conditional (extract) | ~17,550 | 85.1% |
| Trim (remove/condense) | ~3,670 | 17.8% |
| **Reduction Potential** | **~10,700** | **51.9%** |

Note: There is overlap between Conditional and Trim categories (e.g., verbose examples within conditional sections).

## Proposed Extraction Targets

### 1. autofix-strategies.md (~8,800 tokens)
- Step 4g-auto complete (error classification, direct fix, diagnostic agent, approach review)
- Fix Attempt Tracking schema and examples
- Auto-fix config section from Step 2

### 2. parallel-execution.md (~3,500 tokens)
- Step 4a-sub: Subtask detection
- Step 4f-parallel: Spawning parallel tasks
- Step 4g-parallel: Collecting and merging results
- Parallel Task Grouping algorithm
- Parallel Execution Notes

### 3. tdd-workflow.md (~1,400 tokens)
- Step 4d: TDD Red Phase
- Step 4g: TDD Green Phase
- Step 4h: Tests After
- TDD Notes section

### 4. triggers.md (~800 tokens)
- Trigger Items schema and examples
- Trigger detection instructions (from sub-agent prompt)

### 5. completion-menu.md (~200 tokens)
- Offer Next Steps menu (when enabled)

### 6. context-budget.md (~400 tokens)
- Step 2.5: Context Budget Overview

## Token Reduction Summary

| Approach | Tokens Removed | New execute.md Size |
|----------|----------------|---------------------|
| Extract autofix-strategies | ~8,800 | ~11,834 |
| Extract parallel-execution | ~3,500 | ~8,334 |
| Extract tdd-workflow | ~1,400 | ~6,934 |
| Trim verbose examples | ~1,500 | ~5,434 |
| **Total Reduction** | **~15,200** | **~5,434** |

## Minimum Conditional/Trimmable Content

The phase requirement is 6,000+ tokens identified as conditional or trimmable.

**Identified Total: ~10,700 tokens** (exceeds requirement by 4,700 tokens)

Breakdown:
- Auto-fix strategies (conditional): ~8,800 tokens
- Parallel execution (conditional): ~3,500 tokens
- TDD workflow (conditional): ~1,400 tokens
- Verbose examples (trimmable): ~1,500 tokens
- Triggers (conditional): ~800 tokens

## Recommended Priority Order

1. **Extract autofix-strategies.md** - Largest single section, only loaded on failure
2. **Extract parallel-execution.md** - Only loaded when phase has subtasks
3. **Trim verbose examples** - Universal improvement
4. **Extract tdd-workflow.md** - Only loaded when TDD enabled
5. **Extract triggers.md** - Optional feature, rarely used

## Notes for Phase 2-7

- Phase 2: Should focus on autofix-strategies extraction (highest impact)
- Phase 3: Parallel execution extraction
- Phase 4: TDD workflow and triggers
- Phase 5: Verbose example trimming
- Phase 6: Implement loader mechanism
- Phase 7: Integration testing

## File Locations for Reference

- Main file: `.claude/commands/tiki/execute.md`
- Baseline: `.tiki/context-baseline.json`
- Measurement script: `.tiki/scripts/measure-context.py`
