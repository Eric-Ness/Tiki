## Summary

Add the core release management system that enables grouping GitHub issues into releases, mapping them to requirements, and tracking progress. This builds on the requirements system to provide a middle layer between individual issues and project-level planning.

## Motivation

After implementing requirements definition (see dependency), we need a way to:
- Group related issues into named releases (e.g., "v1.1")
- Map issues to the requirements they address
- Track progress across a release
- Integrate with existing Tiki workflow (`plan-issue`, `ship`)
- Optionally sync with GitHub milestones

## New Command: `/tiki:release`

### Subcommands

| Subcommand | Purpose |
|------------|---------|
| `new <version>` | Create a new release |
| `status [version]` | Show release status/roadmap |
| `add <issue> [--to <version>]` | Add issue to a release |
| `remove <issue>` | Remove issue from a release |
| `ship <version>` | Ship a completed release |

### Usage Examples

```bash
/tiki:release new v1.1                    # Create new release
/tiki:release new v1.1 --sync-github      # Also create GitHub milestone
/tiki:release status                      # Show all releases
/tiki:release status v1.1                 # Show specific release
/tiki:release add 34 --to v1.1            # Add issue to release
/tiki:release add 35 36 37 --to v1.1      # Add multiple issues
/tiki:release remove 34                   # Remove issue from its release
/tiki:release ship v1.1                   # Ship the release
```

---

## Subcommand Details

### `/tiki:release new <version>`

Create a new release and interactively select issues to include.

#### Interactive Flow

```
/tiki:release new v1.1

Creating release v1.1...

## Open Issues (12 total)

I found 12 open issues. Here they are grouped by theme:

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

### Other (2 issues)
- #28: Add /tiki:changelog command
- #30: Standardize command naming conventions

---

Which issues should be in v1.1?

Options:
1. Select by category (e.g., "Multi-Issue Management + Quality")
2. Select individually (e.g., "20, 21, 22, 36")
3. Let me recommend based on dependencies
4. Select all
```

#### After Issue Selection

```
Selected 5 issues for v1.1: #20, #21, #22, #34, #36

## Requirements Mapping

Based on REQUIREMENTS.md, here's how these issues map to requirements:

| Issue | Title | Requirements |
|-------|-------|--------------|
| #20 | Define requirements | MULTI-01, MULTI-03 |
| #21 | Roadmap | MULTI-02 |
| #22 | Milestone management | MULTI-01, MULTI-03 |
| #34 | Diagnostic docs | (none - suggest DOC-01?) |
| #36 | JSON schema | QUAL-01 |

Issue #34 doesn't map to any requirement. Options:
1. Create new requirement DOC-01: "Diagnostic documentation exists"
2. Skip requirement mapping for this issue
3. Remove issue from release

> Create DOC-01

---

## Release v1.1 Created

**Issues:** 5
**Requirements addressed:** MULTI-01, MULTI-02, MULTI-03, QUAL-01, DOC-01

Files created:
- `.tiki/releases/v1.1.json`

### Sync to GitHub?

Create a GitHub milestone "v1.1" and assign these issues?

1. Yes, sync to GitHub
2. No, keep Tiki-only
```

#### `--sync-github` Flag

When provided, automatically creates GitHub milestone without prompting:

```
/tiki:release new v1.1 --sync-github

[... issue selection flow ...]

Syncing to GitHub...
Created milestone "v1.1": https://github.com/owner/repo/milestone/1
Assigned 5 issues to milestone
```

---

### `/tiki:release status [version]`

Show release progress and roadmap.

#### All Releases View

```
/tiki:release status

## Release Status

### Active Releases

#### v1.1 (In Progress)
**Progress:** 2/5 issues (40%)
**Requirements:** 2/5 implemented

| # | Title | Status | Requirements |
|---|-------|--------|--------------|
| #34 | Diagnostic docs | Done | DOC-01 |
| #36 | JSON schema | Done | QUAL-01 |
| #20 | Define requirements | Phase 2/4 | MULTI-01, MULTI-03 |
| #21 | Roadmap | Planned | MULTI-02 |
| #22 | Milestone mgmt | Not planned | MULTI-01, MULTI-03 |

#### v1.2 (Planned)
**Progress:** 0/3 issues (0%)
3 issues assigned, none started

---

### Requirements Coverage (v1.1)

| Requirement | Description | Status | Issue |
|-------------|-------------|--------|-------|
| MULTI-01 | Group issues into releases | Pending | #20, #22 |
| MULTI-02 | View roadmap | Pending | #21 |
| MULTI-03 | Track release progress | Pending | #20, #22 |
| QUAL-01 | Schema validation | Implemented | #36 |
| DOC-01 | Diagnostic documentation | Implemented | #34 |

---

### Suggested Next Action
Continue with #20 (in progress) or plan #21 next.
```

#### Single Release View

```
/tiki:release status v1.1

## Release v1.1

**Created:** 2026-01-15
**GitHub Milestone:** https://github.com/owner/repo/milestone/1
**Progress:** 2/5 issues complete (40%)

### Issues

| # | Title | Status | Phases | Requirements |
|---|-------|--------|--------|--------------|
| #34 | Diagnostic docs | Done | 2/2 | DOC-01 |
| #36 | JSON schema | Done | 3/3 | QUAL-01 |
| #20 | Define requirements | In Progress | 2/4 | MULTI-01, MULTI-03 |
| #21 | Roadmap | Planned | 0/3 | MULTI-02 |
| #22 | Milestone mgmt | Not Planned | - | MULTI-01, MULTI-03 |

### Requirements Status

| ID | Description | Status |
|----|-------------|--------|
| DOC-01 | Diagnostic documentation | Implemented |
| QUAL-01 | Schema validation | Implemented |
| MULTI-01 | Group issues | Pending |
| MULTI-02 | View roadmap | Pending |
| MULTI-03 | Track progress | Pending |

### Timeline

```
#34 ████████████████████ Done (Jan 16)
#36 ████████████████████ Done (Jan 17)
#20 ██████████░░░░░░░░░░ Phase 2/4
#21 ░░░░░░░░░░░░░░░░░░░░ Planned
#22 ░░░░░░░░░░░░░░░░░░░░ Not planned
```
```

---

### `/tiki:release add <issue> [--to <version>]`

Add issue(s) to a release.

```
/tiki:release add 38 --to v1.1

Adding issue #38 to release v1.1...

Issue #38: Review large command files for potential splitting

## Requirements Mapping

This issue doesn't map to any existing requirement.

Options:
1. Create new requirement (suggest: QUAL-02)
2. Map to existing requirement
3. Add without requirement mapping

> 1

Creating QUAL-02: "Large command files are reviewed and split when appropriate"
Verification: Code review - No command file exceeds 500 lines

Added #38 to v1.1
- Requirements: QUAL-02
- Release progress: 2/6 issues (33%)
```

#### Multiple Issues

```
/tiki:release add 23 24 25 --to v1.2

Adding 3 issues to v1.2...

| # | Title | Suggested Requirements |
|---|-------|----------------------|
| #23 | Add /tiki:verify | QUAL-03 (new) |
| #24 | Parallel execution | EXEC-01 (new) |
| #25 | Improve error handling | QUAL-04 (new) |

Accept these requirement mappings? [Y/edit/skip]
```

---

### `/tiki:release remove <issue>`

Remove an issue from its current release.

```
/tiki:release remove 38

Removing issue #38 from release v1.1...

Issue #38 was mapped to requirement QUAL-02.

Options:
1. Remove issue, keep requirement (for future use)
2. Remove issue and delete requirement QUAL-02
3. Cancel

> 1

Removed #38 from v1.1
- Release progress: 2/5 issues (40%)
- QUAL-02 remains in REQUIREMENTS.md (unassigned)
```

---

### `/tiki:release ship <version>`

Ship a completed release with verification.

#### Pre-Ship Verification

```
/tiki:release ship v1.1

## Shipping Release v1.1

### Pre-Ship Checklist

Issues:
- [x] #34: Diagnostic docs (closed)
- [x] #36: JSON schema (closed)
- [x] #20: Define requirements (closed)
- [x] #21: Roadmap (closed)
- [x] #22: Milestone mgmt (closed)

Requirements:
- [x] DOC-01: Implemented, Verified
- [x] QUAL-01: Implemented, Verified
- [x] MULTI-01: Implemented, Verified
- [x] MULTI-02: Implemented, NOT VERIFIED
- [x] MULTI-03: Implemented, NOT VERIFIED

### Unverified Requirements (2)

- **MULTI-02**: User can view roadmap across releases
  *Verify: Manual test* - Run `/tiki:release status` and confirm it shows all releases

- **MULTI-03**: User can track release progress
  *Verify: Manual test* - Verify progress updates when issues are completed

Options:
1. Verify now (interactive)
2. Ship anyway (mark as "implemented but unverified")
3. Cancel
```

#### Interactive Verification

```
> 1

### Verifying MULTI-02

Test: Run `/tiki:release status` and confirm it shows all releases with issues.

Did it work as expected?
1. Yes, verified
2. No, there's an issue
3. Skip this requirement

> 1

MULTI-02 verified.

### Verifying MULTI-03

Test: Complete an issue and verify release progress updates.

Did it work as expected?
1. Yes, verified
2. No, there's an issue
3. Skip this requirement

> 1

MULTI-03 verified.

---

All requirements verified. Proceeding with ship...
```

#### Ship Actions

```
## Release v1.1 Shipped!

### Summary
- **Issues closed:** 5/5
- **Requirements implemented:** 5/5
- **Requirements verified:** 5/5

### Actions Taken
- [x] Closed GitHub milestone "v1.1"
- [x] Archived release to `.tiki/releases/archive/v1.1.json`
- [x] Updated REQUIREMENTS.md (marked requirements as verified)
- [x] Updated `.tiki/requirements.json`

### Create Git Tag?

Create tag `v1.1.0` for this release?
1. Yes, create tag
2. No, skip tagging

> 1

Created tag v1.1.0

### What's Next?

7 open issues remain.
- `/tiki:release new v1.2` to create next release
- `/tiki:whats-next` for suggestions
```

---

## Integration with Existing Commands

### Changes to `plan-issue`

After generating phases, prompt for requirements mapping:

```
/tiki:plan-issue 34

[... normal planning flow ...]

## Requirements Mapping

This issue is in release v1.1. Which requirements does it address?

From REQUIREMENTS.md:
- [ ] MULTI-01: Group issues into releases
- [ ] MULTI-02: View roadmap across releases
- [x] DOC-01: Diagnostic documentation exists (suggested)

Confirm mapping? [Y/edit]

> Y

Plan saved with requirements mapping:
- addressesRequirements: ["DOC-01"]
- release: "v1.1"
```

The plan file now includes:

```json
{
  "issue": { "number": 34, "title": "..." },
  "addressesRequirements": ["DOC-01"],
  "release": "v1.1",
  "phases": [...]
}
```

### Changes to `ship`

After shipping an issue, update release progress:

```
/tiki:ship

[... normal ship flow ...]

## Release Progress Updated

Issue #34 was part of release v1.1.

- Requirement DOC-01 marked as "implemented"
- Release v1.1 progress: 3/5 issues (60%)

Remaining in v1.1:
- #21: Roadmap (planned)
- #22: Milestone mgmt (not planned)
```

---

## File Structures

### `.tiki/releases/<version>.json`

```json
{
  "version": "v1.1",
  "createdAt": "2026-01-18T10:00:00Z",
  "status": "active",
  "githubMilestone": {
    "number": 1,
    "url": "https://github.com/owner/repo/milestone/1"
  },
  "issues": [
    {
      "number": 34,
      "title": "Add Diagnostic Agent documentation",
      "status": "completed",
      "requirements": ["DOC-01"],
      "completedAt": "2026-01-19T15:30:00Z"
    },
    {
      "number": 36,
      "title": "Add JSON schema validation",
      "status": "in_progress",
      "requirements": ["QUAL-01"],
      "currentPhase": 2,
      "totalPhases": 4
    },
    {
      "number": 21,
      "title": "Add /tiki:roadmap",
      "status": "planned",
      "requirements": ["MULTI-02"]
    },
    {
      "number": 22,
      "title": "Add milestone management",
      "status": "not_planned",
      "requirements": ["MULTI-01", "MULTI-03"]
    }
  ],
  "requirements": {
    "total": 5,
    "implemented": 2,
    "verified": 1
  }
}
```

### `.tiki/releases/archive/<version>.json`

Same structure as active release, with additional fields:

```json
{
  "version": "v1.1",
  "status": "shipped",
  "shippedAt": "2026-01-25T10:00:00Z",
  "shippedBy": "user",
  "gitTag": "v1.1.0",
  "summary": {
    "issuesCompleted": 5,
    "requirementsImplemented": 5,
    "requirementsVerified": 5,
    "durationDays": 7
  },
  "issues": [...],
  "requirements": {...}
}
```

---

## Acceptance Criteria

### `/tiki:release new`
- [ ] Command creates new release with interactive issue selection
- [ ] Issues can be selected by category, individually, or via recommendation
- [ ] Prompts for requirements mapping for each issue
- [ ] Creates `.tiki/releases/<version>.json`
- [ ] `--sync-github` flag creates GitHub milestone and assigns issues

### `/tiki:release status`
- [ ] Shows all releases with progress summary when no version specified
- [ ] Shows detailed view for specific release
- [ ] Displays issue status (not planned, planned, in progress, done)
- [ ] Displays requirements coverage table
- [ ] Shows visual timeline/progress bar

### `/tiki:release add`
- [ ] Adds single issue to specified release
- [ ] Adds multiple issues at once
- [ ] Prompts for requirements mapping
- [ ] Updates release progress

### `/tiki:release remove`
- [ ] Removes issue from its release
- [ ] Offers to keep or remove orphaned requirements
- [ ] Updates release progress

### `/tiki:release ship`
- [ ] Verifies all issues are closed
- [ ] Verifies all requirements are implemented
- [ ] Interactive verification flow for unverified requirements
- [ ] Closes GitHub milestone (if synced)
- [ ] Archives release to `.tiki/releases/archive/`
- [ ] Optionally creates git tag

### Integration: `plan-issue`
- [ ] Detects if issue is in a release
- [ ] Prompts for requirements mapping
- [ ] Stores `addressesRequirements` in plan file
- [ ] Stores `release` reference in plan file

### Integration: `ship`
- [ ] Updates requirement status to "implemented"
- [ ] Updates release progress in `.tiki/releases/<version>.json`
- [ ] Displays release progress after shipping

### State Files
- [ ] `.tiki/releases/<version>.json` follows specified schema
- [ ] `.tiki/releases/archive/<version>.json` follows specified schema
- [ ] Release files track issue status, requirements, and progress

## Dependencies

- Requires: Issue for requirements definition system (must be implemented first)

## Future Integration Points

This feature will be extended by:
- **Release automation** (`/tiki:release yolo`, `/tiki:release sync`)
- **State and whats-next integration** (show release context)

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| GitHub sync optional | Yes | Works offline, GitHub is visibility layer |
| Interactive issue selection | Yes | User controls what goes in each release |
| Bidirectional linking | Yes | Issues reference requirements, requirements track issues |
| Verification at ship time | Yes | Ensures requirements are actually satisfied |
| Archive shipped releases | Yes | Preserves history, cleans active releases |

## References

- Parent issue: #39 (Add unified release management with requirements traceability)
- Depends on: Requirements definition system issue
- Workflow documentation: `.tiki/docs/release-workflow.md`
