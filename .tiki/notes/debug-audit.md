# Debug.md Content Audit

## Overview

**File:** `.claude/commands/tiki/debug.md`
**Audit Date:** 2026-01-19
**Purpose:** Identify content for extraction/trimming to reduce context window usage

## Baseline Measurements

| Metric | Value |
|--------|-------|
| Total Lines | 1,696 |
| Total Characters | ~61,500 |
| Estimated Tokens | ~15,375 (chars/4) |

## Section-by-Section Analysis

### Frontmatter and Header (Lines 1-27)
| Metric | Value |
|--------|-------|
| Lines | 27 |
| Characters | ~800 |
| Tokens | ~200 |
| **Classification** | **Orchestrator (keep)** |

**Notes:** Essential command metadata and usage examples. Keep as-is for routing.

---

### Step 0: Similar Session Check (Lines 28-132)
| Metric | Value |
|--------|-------|
| Lines | 105 |
| Characters | ~4,800 |
| Tokens | ~1,200 |
| **Classification** | **Conditional (extract)** |

**Substeps:**
- 0a. Load Debug Index (~200 chars, ~50 tokens)
- 0b. Extract Search Terms (~800 chars, ~200 tokens)
- 0c. Calculate Similarity Scores (~700 chars, ~175 tokens) - includes table
- 0d. Display Similar Sessions (~1,200 chars, ~300 tokens) - verbose example
- 0e. Handle User Choice (~500 chars, ~125 tokens)
- 0f. Skip Conditions (~500 chars, ~125 tokens)

**Rationale:** Only runs when starting a NEW session (not resume, list, show, search). Can be loaded conditionally.

---

### Step 1: Parse Arguments (Lines 133-337)
| Metric | Value |
|--------|-------|
| Lines | 205 |
| Characters | ~8,400 |
| Tokens | ~2,100 |
| **Classification** | **Mixed - Split orchestrator/conditional** |

**Substeps Analysis:**

| Substep | Lines | Chars | Tokens | Classification |
|---------|-------|-------|--------|----------------|
| 1a. Current Issue Mode | ~20 | ~500 | ~125 | Orchestrator (keep) |
| 1b. Specific Issue Mode | ~10 | ~250 | ~63 | Orchestrator (keep) |
| 1c. Untracked Symptom Mode | ~10 | ~300 | ~75 | Orchestrator (keep) |
| 1d. Resume Mode | ~12 | ~300 | ~75 | Orchestrator (keep) |
| 1e. List Sessions Mode | ~40 | ~1,500 | ~375 | Conditional (extract) |
| 1f. Show Session Mode | ~60 | ~2,500 | ~625 | Conditional (extract) |
| 1g. Search Mode | ~80 | ~3,000 | ~750 | Conditional (extract) |

**Recommendation:** Keep routing table and basic mode detection. Extract list/show/search into conditional prompts.

---

### Step 2: Session Initialization/Resume (Lines 339-415)
| Metric | Value |
|--------|-------|
| Lines | 77 |
| Characters | ~3,200 |
| Tokens | ~800 |
| **Classification** | **Conditional (extract)** |

**Substeps:**
- 2a. Check for Existing Session (~300 chars, ~75 tokens)
- 2b. Handle Existing Session (~800 chars, ~200 tokens)
- 2c. Resume Mode (~1,200 chars, ~300 tokens) - verbose example
- 2d. Create New Session (~600 chars, ~150 tokens)

**Rationale:** Only needed when actually starting/resuming a debug session. Load when entering interactive mode.

---

### Step 3: Create Debug Document (Lines 417-465)
| Metric | Value |
|--------|-------|
| Lines | 49 |
| Characters | ~1,400 |
| Tokens | ~350 |
| **Classification** | **Conditional (extract)** |

**Notes:** Template for new session document. Load only when creating new session.

---

### Step 4: Gather Symptoms (Lines 467-553)
| Metric | Value |
|--------|-------|
| Lines | 87 |
| Characters | ~3,000 |
| Tokens | ~750 |
| **Classification** | **Conditional (extract)** |

**Substeps:**
- 4a. Initial Questions (~600 chars, ~150 tokens)
- 4b. Auto-Detect Environment (~600 chars, ~150 tokens)
- 4c. Document in Session File (~1,400 chars, ~350 tokens) - verbose example

**Rationale:** Only needed during initial symptom gathering phase. Load when starting new session.

---

### Step 5: Initial Analysis (Lines 555-579)
| Metric | Value |
|--------|-------|
| Lines | 25 |
| Characters | ~900 |
| Tokens | ~225 |
| **Classification** | **Conditional (extract)** |

**Notes:** Part of new session workflow. Bundle with Step 4.

---

### Step 6: Form Hypotheses (Lines 581-643)
| Metric | Value |
|--------|-------|
| Lines | 63 |
| Characters | ~2,200 |
| Tokens | ~550 |
| **Classification** | **Conditional (extract)** |

**Substeps:**
- 6a. Generate Hypotheses (~1,000 chars, ~250 tokens)
- 6b. Handle User Selection (~500 chars, ~125 tokens)
- 6c. Record Selected Hypothesis (~500 chars, ~125 tokens)

**Rationale:** Core hypothesis workflow. Load for active debugging sessions.

---

### Step 7: Test Hypothesis (Lines 645-694)
| Metric | Value |
|--------|-------|
| Lines | 50 |
| Characters | ~1,800 |
| Tokens | ~450 |
| **Classification** | **Conditional (extract)** |

**Substeps:**
- 7a. Determine Test Strategy (~600 chars, ~150 tokens) - includes table
- 7b. Execute Tests (~700 chars, ~175 tokens)
- 7c. Capture Results (~400 chars, ~100 tokens)

**Rationale:** Core hypothesis workflow. Bundle with Step 6.

---

### Step 8: Record Outcome (Lines 696-769)
| Metric | Value |
|--------|-------|
| Lines | 74 |
| Characters | ~2,600 |
| Tokens | ~650 |
| **Classification** | **Conditional (extract)** |

**Substeps:**
- 8a. Update Debug Document (~600 chars, ~150 tokens)
- 8b. Add to Investigation Log (~500 chars, ~125 tokens)
- 8c. Outcome Categories (~500 chars, ~125 tokens) - includes table
- 8d. Present Outcome to User (~700 chars, ~175 tokens)

**Rationale:** Core hypothesis workflow. Bundle with Steps 6-7.

---

### Step 9: Iterate or Resolve (Lines 771-869)
| Metric | Value |
|--------|-------|
| Lines | 99 |
| Characters | ~3,400 |
| Tokens | ~850 |
| **Classification** | **Conditional (extract)** |

**Substeps:**
- 9a. Root Cause NOT Found (~800 chars, ~200 tokens)
- 9b. Root Cause Found (~900 chars, ~225 tokens)
- 9c. Update Debug Document (~900 chars, ~225 tokens)
- 9d. Handle Inconclusive (~500 chars, ~125 tokens)

**Rationale:** Core hypothesis workflow iteration. Bundle with Steps 6-8.

---

### Step 10: Loop Control (Lines 871-956)
| Metric | Value |
|--------|-------|
| Lines | 86 |
| Characters | ~2,800 |
| Tokens | ~700 |
| **Classification** | **Conditional (extract)** |

**Substeps:**
- 10a. Continue Loop (~300 chars, ~75 tokens)
- 10b. Progress Summary (~700 chars, ~175 tokens)
- 10c. Stuck Detection (~1,000 chars, ~250 tokens) - verbose
- 10d. Save Progress (~600 chars, ~150 tokens)

**Rationale:** Loop management for extended debugging. Bundle with hypothesis workflow.

---

### Step 11: Resolution Flow (Lines 958-1155)
| Metric | Value |
|--------|-------|
| Lines | 198 |
| Characters | ~7,200 |
| Tokens | ~1,800 |
| **Classification** | **Conditional (extract)** |

**Substeps:**
- 11a. Record Root Cause (~1,200 chars, ~300 tokens)
- 11b. Record Solution (~2,400 chars, ~600 tokens) - very verbose with 3 options
- 11c. Capture Lessons Learned (~1,200 chars, ~300 tokens)
- 11d. Mark Session Resolved (~2,000 chars, ~500 tokens) - includes index update

**Rationale:** Only needed when root cause is found and session is being resolved. Load on resolution path.

---

### Step 12: Clean Exit Options (Lines 1157-1303)
| Metric | Value |
|--------|-------|
| Lines | 147 |
| Characters | ~5,200 |
| Tokens | ~1,300 |
| **Classification** | **Conditional (extract)** |

**Substeps:**
- 12a. Exit Menu (~500 chars, ~125 tokens)
- 12b. Mark as Resolved (~400 chars, ~100 tokens)
- 12c. Pause for Later (~1,200 chars, ~300 tokens)
- 12d. Abandon Session (~2,500 chars, ~625 tokens) - very verbose

**Rationale:** Exit handling paths. Load when user requests exit or at natural breakpoints.

---

### Step 13: Session Naming Convention (Lines 1305-1353)
| Metric | Value |
|--------|-------|
| Lines | 49 |
| Characters | ~1,600 |
| Tokens | ~400 |
| **Classification** | **Trim (condense)** |

**Notes:** Detailed naming logic with examples. Can be condensed to essentials.

---

### Step 14: Integration Points (Lines 1355-1457)
| Metric | Value |
|--------|-------|
| Lines | 103 |
| Characters | ~3,600 |
| Tokens | ~900 |
| **Classification** | **Conditional (extract)** |

**Substeps:**
- 14a. GitHub Issue Integration (~700 chars, ~175 tokens)
- 14b. Heal Pattern Integration (~700 chars, ~175 tokens)
- 14c. Queue Integration (~600 chars, ~150 tokens)
- 14d. Session Cross-Reference (~500 chars, ~125 tokens)

**Rationale:** Integration features only needed at specific points. Load conditionally.

---

### Directory Structure and States (Lines 1459-1481)
| Metric | Value |
|--------|-------|
| Lines | 23 |
| Characters | ~700 |
| Tokens | ~175 |
| **Classification** | **Trim (condense)** |

**Notes:** Reference information. Condense or move to comments.

---

### Integration with Tiki (Lines 1483-1517)
| Metric | Value |
|--------|-------|
| Lines | 35 |
| Characters | ~1,000 |
| Tokens | ~250 |
| **Classification** | **Trim (remove)** |

**Notes:** Cross-command reference. Can be removed - covered by help system.

---

### Debug History Index Section (Lines 1519-1685)
| Metric | Value |
|--------|-------|
| Lines | 167 |
| Characters | ~6,400 |
| Tokens | ~1,600 |
| **Classification** | **Conditional (extract)** |

**Substeps:**
- Index Schema (~1,200 chars, ~300 tokens)
- Index Fields table (~800 chars, ~200 tokens)
- Index Management (~2,000 chars, ~500 tokens)
- Keyword/Error/File Extraction (~1,400 chars, ~350 tokens)
- Index Validation (~800 chars, ~200 tokens)
- Using the Index (~400 chars, ~100 tokens)

**Rationale:** Index management details only needed when actually updating/querying index. Load conditionally.

---

### Notes Section (Lines 1687-1696)
| Metric | Value |
|--------|-------|
| Lines | 10 |
| Characters | ~600 |
| Tokens | ~150 |
| **Classification** | **Trim (condense)** |

**Notes:** General tips. Condense to essential reminders.

---

## Classification Summary

### Orchestrator (Keep in Main File)
| Section | Tokens |
|---------|--------|
| Frontmatter and Header | 200 |
| Step 1 routing table + basic modes (1a-1d) | ~340 |
| **Orchestrator Total** | **~540** |

### Conditional (Extract to Prompt Files)
| Section | Tokens | Suggested File |
|---------|--------|----------------|
| Step 0: Similar Session Check | 1,200 | `similar-sessions.md` |
| Step 1e: List Sessions Mode | 375 | `list-sessions.md` |
| Step 1f: Show Session Mode | 625 | `show-session.md` |
| Step 1g: Search Mode | 750 | `search-sessions.md` |
| Step 2: Session Init/Resume | 800 | `session-init.md` |
| Step 3: Create Debug Document | 350 | `session-init.md` (bundle) |
| Step 4: Gather Symptoms | 750 | `session-init.md` (bundle) |
| Step 5: Initial Analysis | 225 | `session-init.md` (bundle) |
| Steps 6-10: Hypothesis Workflow | 3,200 | `hypothesis-workflow.md` |
| Step 11: Resolution Flow | 1,800 | `resolution-flow.md` |
| Step 12: Clean Exit Options | 1,300 | `exit-options.md` |
| Step 14: Integration Points | 900 | `integrations.md` |
| Debug History Index | 1,600 | `index-management.md` |
| **Conditional Total** | **~13,875** |

### Trim (Remove or Condense)
| Section | Tokens | Action |
|---------|--------|--------|
| Step 13: Session Naming | 400 | Condense to ~100 tokens |
| Directory Structure/States | 175 | Condense to ~50 tokens |
| Integration with Tiki | 250 | Remove (covered by help) |
| Notes | 150 | Condense to ~50 tokens |
| **Trim Total** | **~975** | **Savings: ~775 tokens** |

---

## Reduction Target Analysis

| Category | Current Tokens | Target Tokens | Savings |
|----------|---------------|---------------|---------|
| Orchestrator | 540 | 540 | 0 |
| Conditional → Extracted | 13,875 | 0 (in main) | 13,875 |
| Trim → Condensed/Removed | 975 | 200 | 775 |
| **Total** | **~15,390** | **~740** | **~14,650** |

**Tokens identified as conditional or trimmable: ~14,850**
(Exceeds 5,000 token requirement by ~9,850 tokens)

---

## Proposed Conditional Prompt Structure

```
.tiki/prompts/debug/
├── similar-sessions.md        (~1,200 tokens) - Step 0
├── list-sessions.md           (~375 tokens) - Step 1e
├── show-session.md            (~625 tokens) - Step 1f
├── search-sessions.md         (~750 tokens) - Step 1g
├── session-init.md            (~2,125 tokens) - Steps 2-5 bundled
├── hypothesis-workflow.md     (~3,200 tokens) - Steps 6-10
├── resolution-flow.md         (~1,800 tokens) - Step 11
├── exit-options.md            (~1,300 tokens) - Step 12
├── integrations.md            (~900 tokens) - Step 14
└── index-management.md        (~1,600 tokens) - Debug History Index
```

---

## Loading Conditions Matrix

| Prompt File | Load When |
|-------------|-----------|
| similar-sessions.md | Starting NEW session (no --resume, list, show, search) |
| list-sessions.md | Argument is `list` |
| show-session.md | Argument starts with `show` |
| search-sessions.md | Argument contains `--search` |
| session-init.md | Starting or resuming a session (not list/show/search) |
| hypothesis-workflow.md | Active debugging session (in hypothesis loop) |
| resolution-flow.md | Root cause found, entering resolution |
| exit-options.md | User requests exit OR at natural breakpoint |
| integrations.md | Session complete OR user requests integration |
| index-management.md | Creating, resolving, or abandoning session |

---

## Happy Path Token Usage

For a typical "start new debug session" path:
- Orchestrator: ~540 tokens
- session-init.md: ~2,125 tokens
- hypothesis-workflow.md: ~3,200 tokens (loaded when entering loop)
- **Happy path total: ~5,865 tokens** (vs ~15,390 current = 62% reduction)

For "list sessions" path:
- Orchestrator: ~540 tokens
- list-sessions.md: ~375 tokens
- **List path total: ~915 tokens** (vs ~15,390 current = 94% reduction)

For "search sessions" path:
- Orchestrator: ~540 tokens
- search-sessions.md: ~750 tokens
- **Search path total: ~1,290 tokens** (vs ~15,390 current = 92% reduction)
