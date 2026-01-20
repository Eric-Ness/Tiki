# Release-YOLO Content Audit

## Baseline Metrics
- **Lines**: 1,617
- **Words**: 4,773
- **Estimated Tokens**: ~9,190 tokens

## Section Classification

### Orchestrator (Keep Inline) - ~1,500 tokens target

| Section | Lines | Est. Tokens | Keep |
|---------|-------|-------------|------|
| YAML frontmatter + Usage | 1-36 | ~150 | Yes |
| Step 1: Argument parsing | 78-146 | ~300 | Yes |
| Step 3: Release loading | 207-247 | ~150 | Yes |
| Step 4: Dependency ordering | 249-299 | ~200 | Condense |
| Step 5: Pre-flight display | 300-401 | ~400 | Condense |
| Step 6: Initialize state | 402-429 | ~100 | Yes |
| Step 7: Loop structure | 431-450 | ~80 | Yes |
| Step 10: Completion summary | 1414-1477 | ~250 | Condense |

### Conditional - Plan Stage (~1,200 tokens)

| Section | Lines | Est. Tokens | Condition |
|---------|-------|-------------|-----------|
| Step 7b: Check if planning needed | 453-499 | ~200 | Issue needs planning |
| Planning invocation | - | ~150 | - |
| Planning failure handling | 500-517 | ~100 | Plan fails |
| Plan display | - | ~150 | - |

### Conditional - Execute Stage (~1,400 tokens)

| Section | Lines | Est. Tokens | Condition |
|---------|-------|-------------|-----------|
| Step 7c: Execute phases | 519-567 | ~250 | Issue needs execution |
| TDD mode check | 529-544 | ~100 | TDD enabled |
| Phase progress | 551-567 | ~150 | - |
| Step 7d: Handle failures | 569-671 | ~400 | Phase fails |
| 4-attempt escalation | 582-609 | ~200 | Auto-fix |

### Conditional - Ship Stage (~900 tokens)

| Section | Lines | Est. Tokens | Condition |
|---------|-------|-------------|-----------|
| Step 7e: Ship issue | 673-705 | ~150 | All phases complete |
| Step 7f: Update state | 707-720 | ~100 | Ship success |
| Requirement display | - | ~100 | Has requirements |

### Conditional - Error Recovery (~1,000 tokens)

| Section | Lines | Est. Tokens | Condition |
|---------|-------|-------------|-----------|
| Manual fix option | 633-646 | ~100 | User chooses manual |
| Skip issue option | 648-654 | ~50 | User chooses skip |
| Abort option | 656-671 | ~100 | User chooses abort |
| Concurrent execution | 1549-1561 | ~100 | YOLO already running |
| State corrupted | 1529-1540 | ~100 | State file error |

### Conditional - Verification (~1,600 tokens)

| Section | Lines | Est. Tokens | Condition |
|---------|-------|-------------|-----------|
| Step 8: All verification | 723-1315 | ~2,400 | requirements enabled AND !--skip-verify |

**Note**: Verification section is very large. The issue suggests combining into yolo-verification.md.

### Conditional - Resume (~500 tokens)

| Section | Lines | Est. Tokens | Condition |
|---------|-------|-------------|-----------|
| Step 2: Handle --continue | 148-204 | ~250 | --continue flag |
| Resume mismatch | 1605-1617 | ~80 | Issue removed |

### Trimmable Content

| Section | Lines | Est. Tokens | Action |
|---------|-------|-------------|--------|
| YOLO state schema | 37-75 | ~180 | Reference schema |
| Verbose pre-flight example | 300-377 | ~350 | Template only |
| Full error examples | 1479-1561 | ~400 | One brief example |
| Dependency algorithm | 253-291 | ~200 | Condense |

## Proposed Structure

### Orchestrator (~1,500 tokens)
1. Frontmatter + Usage
2. Argument parsing (condensed)
3. Mode selection: if --continue, load resume prompt
4. Release loading (condensed)
5. Dependency ordering (condensed, reference schema)
6. Pre-flight display (template)
7. Initialize state
8. Main loop: for each issue, load stage prompts
9. Post-loop: if requirements, load verification prompt
10. Ship release (brief)
11. Completion summary (condensed)

### Conditional Prompts
- `.tiki/prompts/release-yolo/plan-stage.md` - Planning workflow
- `.tiki/prompts/release-yolo/execute-stage.md` - Execution workflow
- `.tiki/prompts/release-yolo/ship-stage.md` - Shipping workflow
- `.tiki/prompts/release-yolo/error-recovery.md` - Error handling
- `.tiki/prompts/release-yolo/verification.md` - Requirement verification
- `.tiki/prompts/release-yolo/resume.md` - Resume logic

## Estimated Savings

| Scenario | Current | After | Savings |
|----------|---------|-------|---------|
| Fresh YOLO, no reqs | 9,190 | ~4,500 | 51% |
| Fresh YOLO, with reqs | 9,190 | ~6,100 | 34% |
| Resume YOLO | 9,190 | ~5,000 | 46% |
| Single issue, no errors | 9,190 | ~3,500 | 62% |

## Results

### Final Metrics

**Orchestrator (release-yolo.md):**
- Lines: 180 (was 1,617) - **89% reduction**
- Words: 596 (was 4,773) - **88% reduction**
- Estimated tokens: ~1,200 (was ~9,190) - **87% reduction**

**Conditional Prompt Files:**

| File | Lines | Est. Tokens | Budget | Status |
|------|-------|-------------|--------|--------|
| plan-stage.md | 91 | ~400 | 1,200 | Under |
| execute-stage.md | 89 | ~400 | 1,400 | Under |
| ship-stage.md | 81 | ~350 | 900 | Under |
| error-recovery.md | 106 | ~450 | 1,000 | Under |
| verification.md | 112 | ~500 | 1,600 | Under |
| resume.md | 98 | ~400 | 500 | Under |

**Total conditional content:** ~2,500 tokens

### Token Savings by Scenario

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Fresh YOLO (no reqs, no errors) | 9,190 | ~2,400 | 74% |
| Fresh YOLO (with reqs) | 9,190 | ~3,900 | 58% |
| Resume YOLO | 9,190 | ~2,600 | 72% |
| YOLO with errors | 9,190 | ~3,300 | 64% |
| Maximum (all conditionals) | 9,190 | ~4,700 | 49% |

### Functionality Preserved

All flags work:
- [x] --continue (loads resume.md)
- [x] --skip-verify (skips verification.md)
- [x] --no-tag (handled in orchestrator)
- [x] --dry-run (handled in orchestrator)
- [x] --from (handled in orchestrator)

Issue processing stages:
- [x] Plan stage (loads plan-stage.md)
- [x] Execute stage (loads execute-stage.md)
- [x] Ship stage (loads ship-stage.md)
- [x] Error recovery (loads error-recovery.md)
- [x] Verification (loads verification.md)
