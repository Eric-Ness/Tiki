# Tiki Command Optimization Guide

## Context for Future Sessions

This document captures the analysis and strategy for optimizing Tiki command files to reduce token consumption and improve LLM performance. Pass this to any new context window working on issues #44-50.

---

## The Problem

### Current State (Baseline Captured 2026-01-19)

| Command | Lines | Tokens | % of 200K Context |
|---------|-------|--------|-------------------|
| execute.md | 2,690 | 20,634 | 10.3% |
| plan-issue.md | 1,778 | 12,823 | 6.4% |
| define-requirements.md | 1,986 | 13,048 | 6.5% |
| research.md | 1,854 | 11,770 | 5.9% |
| debug.md | 1,695 | 10,714 | 5.4% |
| release-yolo.md | 1,617 | 9,190 | 4.6% |
| **TOTAL** | **11,620** | **78,179** | **39.1%** |

Baseline data saved in: `.tiki/context-baseline.json`

### Research-Based Thresholds

From `.tiki/research/command-file-organization/research.md`:

| Metric | Recommendation | Source |
|--------|----------------|--------|
| AI instruction files | 60-100 lines ideal, **300 max** | HumanLayer, Anthropic |
| General documentation | 300-500 lines default | ESLint, industry standards |
| Maximum manageable | 1000-2000 lines | Rule of 30, Code Complete |

**Key insight**: LLM attention degrades in the middle of long prompts. Instructions at the beginning and end get more attention than those in the middle.

---

## Critical Insight: Token Billing

### What DOESN'T Save Tokens

**Moving content to sub-agents via Task tool does NOT reduce total token consumption.**

```
Before: Main context loads 20,000 tokens
After:  Main context loads 5,000 tokens
        Sub-agent loads 15,000 tokens

Total billed: Still 20,000 tokens
```

Sub-agents get fresh context windows (good for attention), but you still pay for all tokens.

### What DOES Save Tokens

1. **Trimming content** - Remove verbose examples, redundant explanations
2. **Conditional loading** - Don't load TDD instructions when TDD is disabled
3. **Reference instead of inline** - Point to schema files instead of documenting formats

---

## Two-Pronged Strategy

### 1. Content Audit and Trimming (Primary Savings)

For each section in a command file, ask:

| Question | Action |
|----------|--------|
| Is this executed or just documentation? | Trim documentation |
| Is this always needed or conditional? | Make conditional |
| Is this repeated elsewhere? | Remove duplicate |
| Could this be shorter and still work? | Condense |
| Is this an example or an instruction? | Prefer instructions |
| Would the LLM figure this out anyway? | Remove obvious content |
| Is this schema documentation? | Reference schema file instead |

### 2. Conditional Loading (Secondary Savings)

Load content only when the code path requires it:

```markdown
## Phase Execution

If config.testing.createTests is "before":
  Read .tiki/prompts/execute/tdd-workflow.md
  Include in sub-agent prompt

If phase fails:
  Read .tiki/prompts/execute/autofix-strategies.md
  Spawn recovery sub-agent
```

---

## Target Architecture

### Directory Structure

```
.claude/commands/tiki/
  execute.md                    # Lean orchestrator (~1,500 tokens)
  plan-issue.md                 # Lean orchestrator (~1,800 tokens)
  ...

.tiki/prompts/
  execute/
    tdd-workflow.md             # Load only if TDD enabled
    autofix-strategies.md       # Load only if phase fails
    subtask-execution.md        # Load only if subtasks exist
  plan/
    research-integration.md     # Load only if research exists
    release-integration.md      # Load only if issue in release
    assumption-generation.md    # Load only if no prior review
  requirements/
    interactive-refinement.md   # Load only if --interactive
    from-issues-mode.md         # Load only if --from-issues
  research/
    dimensions.md               # Reference file for agents
    agent-template.md           # Single template, not repeated
    synthesis.md                # Load after agents complete
  debug/
    session-modes.md            # Load only for list/show/search
    resolution-flow.md          # Load only when root cause found
  release/
    yolo-verification.md        # Load only if requirements enabled
    yolo-resume.md              # Load only if --continue
```

### Orchestrator Pattern

Each lean orchestrator should:

1. Parse arguments
2. Check conditions (config, flags, state)
3. Load conditional prompts only when needed
4. Delegate to sub-agents with minimal context
5. Manage state
6. Handle completion

---

## Per-Command Analysis

### execute.md (20,634 tokens → ~1,500 target)

**Unconditionally loaded content to make conditional:**

| Section | Tokens | Condition | Action |
|---------|--------|-----------|--------|
| TDD workflow (Step 3) | ~800 | TDD enabled | Extract to tdd-workflow.md |
| Autofix strategies (Steps 5-6) | ~2,400 | Phase fails | Extract to autofix-strategies.md |
| Subtask execution | ~600 | Phase has subtasks | Extract to subtask-execution.md |
| Output examples | ~1,600 | Never needed | Remove entirely |
| Verbose explanations | ~1,500 | Redundant | Condense |

**Savings: ~6,900 tokens conditional + trimmed**

### plan-issue.md (12,823 tokens → ~1,800 target)

**Unconditionally loaded content to make conditional:**

| Section | Tokens | Condition | Action |
|---------|--------|-----------|--------|
| Research matching (Step 2.25) | ~1,200 | Research exists, no --no-research | Extract |
| Release context (Step 2.3) | ~600 | Issue in release | Extract |
| Assumption generation (Step 2.4) | ~800 | No prior review | Extract |
| Requirements mapping (Step 5.7) | ~500 | Release has requirements | Extract |
| JavaScript code blocks | ~400 | Verbose | Trim to patterns |
| Plan display templates | ~600 | Verbose | Condense |

**Savings: ~4,100 tokens conditional + trimmed**

### define-requirements.md (13,048 tokens → ~2,000 target)

**Unconditionally loaded content to make conditional:**

| Section | Tokens | Condition | Action |
|---------|--------|-----------|--------|
| Interactive refinement (Step 6) | ~1,600 | --interactive flag | Extract |
| --from-issues handling | ~800 | --from-issues flag | Extract |
| --refresh handling | ~500 | --refresh flag | Extract |
| Category examples | ~1,000 | Reference material | Trim to one per category |
| Verification type explanations | ~600 | Verbose | Table format |

**Savings: ~4,500 tokens conditional + trimmed**

### research.md (11,770 tokens → ~1,800 target)

**Unconditionally loaded content to make conditional:**

| Section | Tokens | Condition | Action |
|---------|--------|-----------|--------|
| Dimension definitions (Step 4) | ~1,800 | Reference material | Extract, load into agents only |
| Agent prompts (Step 5) | ~1,500 | Repetitive | Single template |
| Synthesis instructions (Step 7) | ~1,200 | Verbose | Condense |
| --refresh handling | ~400 | --refresh flag | Make conditional |
| Output examples | ~600 | Reference material | Trim |

**Savings: ~5,500 tokens conditional + trimmed**

### debug.md (10,714 tokens → ~1,600 target)

**Unconditionally loaded content to make conditional:**

| Section | Tokens | Condition | Action |
|---------|--------|-----------|--------|
| List/show/search modes | ~800 | Mode-specific | Extract to session-modes.md |
| Resolution flow (Step 11) | ~1,400 | Root cause found | Extract to resolution-flow.md |
| Hypothesis testing examples | ~1,000 | Reference material | Remove |
| Exit/abandon flows | ~600 | On exit | Include in resolution-flow.md |
| Index management | ~500 | Verbose | Condense |

**Savings: ~4,300 tokens conditional + trimmed**

### release-yolo.md (9,190 tokens → ~1,500 target)

**Unconditionally loaded content to make conditional:**

| Section | Tokens | Condition | Action |
|---------|--------|-----------|--------|
| Requirement verification (Step 8) | ~1,600 | Requirements enabled | Extract |
| --continue/resume logic | ~500 | --continue flag | Extract |
| Auto-verification strategies | ~800 | During verification | Include in verification file |
| Manual verification flow | ~600 | Manual verification needed | Include in verification file |
| Error recovery examples | ~700 | Reference material | Trim |

**Savings: ~4,200 tokens conditional + trimmed**

---

## Projected Savings Summary

| Command | Current | Orchestrator | Conditional Files | Total Savings |
|---------|---------|--------------|-------------------|---------------|
| execute.md | 20,634 | 1,500 | 3,400 | 76% |
| plan-issue.md | 12,823 | 1,800 | 2,600 | 66% |
| define-requirements.md | 13,048 | 2,000 | 2,100 | 69% |
| research.md | 11,770 | 1,800 | 2,900 | 60% |
| debug.md | 10,714 | 1,600 | 1,900 | 67% |
| release-yolo.md | 9,190 | 1,500 | 1,900 | 63% |

**Key**: Conditional files only load when needed. A simple `/tiki:execute` with no TDD and no failures loads only the orchestrator (~1,500 tokens) instead of the full command (~20,634 tokens).

---

## Measurement Tools

### Baseline

```bash
# Already captured
cat .tiki/context-baseline.json
```

### Measure Current State

```bash
python .tiki/scripts/measure-context.py
```

### Compare Before/After

```bash
python .tiki/scripts/compare-context.py
```

### Token Counting (for manual checks)

```python
import tiktoken
enc = tiktoken.get_encoding("cl100k_base")

with open("path/to/file.md", "r") as f:
    content = f.read()

tokens = len(enc.encode(content))
print(f"Tokens: {tokens}")
```

---

## Content Trimming Examples

### Before: Verbose Example (800 tokens)

```markdown
### Example Output

The phase will produce output like:

Phase 1 complete.

Summary:
- Created src/auth/middleware.ts with validateToken function
- Added AuthRequest interface to src/types/auth.ts
- Middleware properly extracts JWT from Authorization header
- Added proper error handling for missing/invalid tokens

Files modified:
- src/auth/middleware.ts (new)
- src/types/auth.ts (modified)

Verification:
✓ File exists and exports validateToken
✓ No TypeScript errors
✓ Tests pass

The summary should be concise but complete...
[continues for many more lines]
```

### After: Concise Instruction (50 tokens)

```markdown
Phase output format: status, summary (files modified, key changes), verification results.
```

### Before: Inline Schema Documentation (400 tokens)

```markdown
The state file format is:

{
  "activeIssue": 42,
  "currentPhase": 2,
  "status": "in_progress",
  "phases": [...],
  ...
}

Where:
- activeIssue: The GitHub issue number
- currentPhase: Current phase being executed
- status: One of "pending", "in_progress", "completed", "failed"
[continues with field documentation]
```

### After: Schema Reference (20 tokens)

```markdown
State file format: see `.tiki/schemas/state.schema.json`
```

### Before: Repeated Conditional Logic (200 tokens)

```markdown
If the phase fails, you should:
1. First, try a direct fix based on the error pattern
2. If that doesn't work, try contextual analysis
3. If that doesn't work, try approach review
4. If that doesn't work, invoke /tiki:heal

Each attempt should...
[detailed instructions for each attempt]
```

### After: Conditional Load (30 tokens)

```markdown
If phase fails:
  Read `.tiki/prompts/execute/autofix-strategies.md`
  Execute 4-attempt recovery pattern
```

---

## GitHub Issues

| Issue | Command | Status |
|-------|---------|--------|
| #44 | execute.md (PROTOTYPE) | Ready |
| #45 | plan-issue.md | Ready |
| #46 | define-requirements.md | Ready |
| #47 | research.md | Ready |
| #48 | debug.md | Ready |
| #49 | release-yolo.md | Ready |
| #50 | Epic (tracking) | Ready |

**Execution order**: #44 → #45 → #47 → #46 → #48 → #49

Start with #44 (execute.md) as the prototype. It's the largest command and establishes patterns for the others.

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Each orchestrator | ≤2,000 tokens |
| Conditional content per command | ≥30% of original |
| Total command tokens | ≤35,000 (55% reduction from 78,179) |
| All functionality | 100% preserved |
| Measured with compare-context.py | Yes |

---

## Questions to Answer During Implementation

1. Does the lean orchestrator maintain execution quality?
2. Does conditional loading work reliably?
3. What's the actual token savings vs projected?
4. Are there additional trimming opportunities discovered during audit?
5. Should any conditional content actually stay in orchestrator?

Document findings in each issue as implementation progresses.
