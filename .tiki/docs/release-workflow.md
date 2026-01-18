# Release Workflow Guide

This document describes the step-by-step workflow for managing releases in Tiki.

## Scenario: Legacy Project with Open Issues

You have an existing project with multiple open GitHub issues and want to group some into a release.

---

## Step-by-Step Workflow

### Step 1: Define Requirements (One-Time Setup)

Since this is a legacy project without requirements, you'd first establish them:

```
/tiki:define-requirements
```

**What happens:**
1. LLM reads existing codebase, CLAUDE.md, open issues
2. LLM proposes requirements based on what already exists + open issues
3. You refine and approve
4. Creates `REQUIREMENTS.md` + `.tiki/requirements.json`

**Example output:**

```markdown
# Requirements

## v1 Requirements (Current - Already Implemented)

### Core Workflow
- **CORE-01**: User can fetch GitHub issue details ✓
- **CORE-02**: User can break issue into phases ✓
- **CORE-03**: User can execute phases via sub-agents ✓
- **CORE-04**: User can ship completed work ✓

### Planning
- **PLAN-01**: Backward planning from success criteria ✓
- **PLAN-02**: Research integration before planning ✓
- **PLAN-03**: Plan audit before execution ✓

## v1.1 Requirements (Next Release)

### Multi-Issue Management
- **MULTI-01**: User can group issues into releases
- **MULTI-02**: User can view roadmap across releases
- **MULTI-03**: User can track release progress

### Quality
- **QUAL-01**: JSON schema validation for state files
- **QUAL-02**: Large command files reviewed for splitting

## v2 Requirements (Future)
- **PARALLEL-01**: Parallel task execution within phases
- ...
```

> **Note:** For a legacy project, many v1 requirements are already implemented. The LLM marks these as complete based on code analysis.

---

### Step 2: Create a Release

Now you create a release and assign issues to it:

```
/tiki:release new v1.1
```

**Interactive flow:**

```
Creating release v1.1...

I found 12 open issues. Let me categorize them:

## Open Issues

### Multi-Issue Management (3 issues)
- #20: Add /tiki:define-requirements for requirements scoping
- #21: Add /tiki:roadmap for multi-issue project planning
- #22: Add milestone management commands

### Quality & Tech Debt (3 issues)
- #36: Add JSON schema validation for .tiki/ state files
- #38: Review large command files for potential splitting
- #34: Add Diagnostic Agent documentation to execute.md

### New Features (4 issues)
- #24: Add parallel task execution within phases
- #23: Add /tiki:verify for structured user acceptance testing
- #26: Expand /tiki:map-codebase to generate additional documentation
- #27: Add phase assumptions listing to planning workflow

### Other (2 issues)
- #28: Add /tiki:changelog command
- #30: Standardize command naming conventions

─────────────────────────────────────────

Which issues should be included in v1.1?

Options:
1. Select by category (e.g., "Multi-Issue Management + Quality")
2. Select individually (e.g., "20, 21, 22, 36, 34")
3. Let me recommend based on dependencies and priorities
```

**You respond:**

```
Include 20, 21, 22, 36, and 34
```

**LLM continues:**

```
Got it. Adding 5 issues to v1.1:
- #20: Add /tiki:define-requirements
- #21: Add /tiki:roadmap
- #22: Add milestone management commands
- #36: Add JSON schema validation
- #34: Add Diagnostic Agent documentation

## Requirements Mapping

Which requirements do these issues address?

Based on my analysis:
- #20 → MULTI-01 (grouping), MULTI-03 (tracking)
- #21 → MULTI-02 (roadmap)
- #22 → MULTI-01 (grouping), MULTI-03 (tracking)
- #36 → QUAL-01 (schema validation)
- #34 → (documentation, no requirement - should I create one?)

Should I:
1. Accept this mapping
2. Adjust the mapping
3. Create new requirements for uncovered issues
```

**You respond:**

```
Accept, and yes create a DOC-01 requirement for documentation
```

**LLM creates the release:**

```
## Release v1.1 Created

**Issues:** 5
**Requirements addressed:** 4 (MULTI-01, MULTI-02, MULTI-03, QUAL-01, DOC-01)

Files created:
- `.tiki/releases/v1.1.json`
- Updated `REQUIREMENTS.md`

### Sync to GitHub?

Would you like to create a GitHub milestone "v1.1" and assign these issues to it?

Options:
1. Yes, sync to GitHub
2. No, keep local only
```

**You respond:**

```
Yes, sync to GitHub
```

**Result:**

```
✓ Created GitHub milestone "v1.1"
✓ Assigned issues #20, #21, #22, #34, #36 to milestone

View milestone: https://github.com/owner/repo/milestone/1
```

---

### Step 3: View Release Status (Anytime)

```
/tiki:release status
```

**Output:**

```
## Release Status

### v1.1 (Active)
**Progress:** 0/5 issues complete (0%)
**Requirements:** 0/5 implemented

| # | Title | Status | Phases | Requirements |
|---|-------|--------|--------|--------------|
| 20 | Define requirements | Not planned | - | MULTI-01, MULTI-03 |
| 21 | Roadmap | Not planned | - | MULTI-02 |
| 22 | Milestone management | Not planned | - | MULTI-01, MULTI-03 |
| 34 | Diagnostic docs | Not planned | - | DOC-01 |
| 36 | JSON schema | Not planned | - | QUAL-01 |

### Requirements Coverage
| ID | Description | Status | Issue |
|----|-------------|--------|-------|
| MULTI-01 | Group issues into releases | ⏳ Pending | #20, #22 |
| MULTI-02 | View roadmap | ⏳ Pending | #21 |
| MULTI-03 | Track release progress | ⏳ Pending | #20, #22 |
| QUAL-01 | Schema validation | ⏳ Pending | #36 |
| DOC-01 | Diagnostic documentation | ⏳ Pending | #34 |

### Suggested Next Step
Start with #34 (documentation) - smallest scope, quick win.
Or start with #20 (requirements) - enables the rest.

`/tiki:plan-issue 34` or `/tiki:plan-issue 20`
```

---

### Step 4: Plan and Execute Issues (Normal Tiki Flow)

Now you work through issues using normal Tiki commands:

```
/tiki:plan-issue 34
```

The plan file now includes requirement references:

```json
{
  "issue": { "number": 34, "title": "Add Diagnostic Agent documentation" },
  "addressesRequirements": ["DOC-01"],
  "release": "v1.1",
  "phases": [...]
}
```

```
/tiki:execute 34
```

When complete:

```
/tiki:ship 34
```

**Ship updates release status:**

```
✓ Issue #34 closed
✓ Requirement DOC-01 marked as implemented
✓ Release v1.1 progress: 1/5 issues (20%)
```

---

### Step 5: Check Progress Mid-Release

```
/tiki:release status v1.1
```

```
## Release v1.1

**Progress:** 2/5 issues complete (40%)
**Requirements:** 2/5 implemented, 1/5 verified

| # | Title | Status | Requirements |
|---|-------|--------|--------------|
| 34 | Diagnostic docs | ✅ Done | DOC-01 ✓ |
| 36 | JSON schema | ✅ Done | QUAL-01 ✓ |
| 20 | Define requirements | 🔄 Phase 2/4 | MULTI-01, MULTI-03 |
| 21 | Roadmap | 📋 Planned | MULTI-02 |
| 22 | Milestone management | 📋 Planned | MULTI-01, MULTI-03 |

### Remaining Work
- 3 issues to complete
- 3 requirements to implement
- Estimated: 8 phases remaining
```

---

### Step 6: Ship the Release

When all issues are done:

```
/tiki:release ship v1.1
```

**Interactive flow:**

```
## Shipping Release v1.1

### Pre-Ship Checklist
✓ All 5 issues closed
✓ All 5 requirements implemented
⚠ 3/5 requirements verified (2 need verification)

### Unverified Requirements
- MULTI-02: View roadmap - Verify: Manual test
- MULTI-03: Track release progress - Verify: Manual test

Options:
1. Ship anyway (mark unverified as "implemented but unverified")
2. Verify now (I'll guide you through verification)
3. Cancel and verify first
```

**You choose to verify:**

```
Let's verify MULTI-02: "User can view roadmap across releases"

Test: Run `/tiki:release status` and confirm it shows all releases with issues.

Did it work as expected?
1. Yes, verified
2. No, there's an issue
```

After verification:

```
## Release v1.1 Shipped!

### Summary
- **Issues closed:** 5
- **Requirements implemented:** 5
- **Requirements verified:** 5

### Actions Taken
✓ Closed GitHub milestone "v1.1"
✓ Archived release to `.tiki/releases/archive/v1.1.json`
✓ Updated REQUIREMENTS.md (marked v1.1 requirements as complete)
✓ Created git tag `v1.1.0` (optional - you approved)

### What's Next?
7 open issues remain. Create the next release?

`/tiki:release new v1.2`
```

---

## Visual Summary of the Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      LEGACY PROJECT START                        │
│                      (12 open issues, no requirements)           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: /tiki:define-requirements                              │
│  - LLM analyzes codebase + issues                               │
│  - Proposes requirements (existing + new)                       │
│  - Creates REQUIREMENTS.md                                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: /tiki:release new v1.1                                 │
│  - Select issues to include (5 of 12)                           │
│  - Map issues to requirements                                   │
│  - Optionally sync to GitHub milestone                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3-4: Normal Tiki workflow (repeat per issue)              │
│  /tiki:plan-issue 34  →  phases link to requirements            │
│  /tiki:execute 34     →  normal execution                       │
│  /tiki:ship 34        →  updates release progress               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: /tiki:release status (anytime)                         │
│  - See progress across all issues in release                    │
│  - See requirements coverage                                    │
│  - Get suggestions for next issue                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: /tiki:release ship v1.1                                │
│  - Verify requirements                                          │
│  - Close GitHub milestone                                       │
│  - Archive release                                              │
│  - Tag release (optional)                                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next: /tiki:release new v1.2                                   │
│  (7 remaining issues available)                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## YOLO Mode for Releases

For rapid release execution, use:

```
/tiki:release yolo v1.1
```

This runs the full workflow with minimal prompts:
1. Plans all unplanned issues in the release
2. Executes each issue sequentially (with TDD if configured)
3. Ships each issue as it completes
4. Ships the release when all issues are done

Flags:
- `--skip-verify` - Skip requirement verification at ship time
- `--no-tag` - Don't create git tag
- `--dry-run` - Show what would happen without executing

---

## Key Concepts

1. **Requirements come first** - Even for legacy projects, establish requirements before creating releases. The LLM does the heavy lifting by analyzing existing code.

2. **Releases group issues** - A release is a named collection of issues + their requirement mappings.

3. **Normal Tiki flow continues** - `plan-issue`, `execute`, `ship` work exactly as before, but now they update release progress.

4. **GitHub sync is optional** - Everything works locally; GitHub milestone is a visibility layer.

5. **Requirements drive verification** - At ship time, you verify that requirements are actually satisfied.
