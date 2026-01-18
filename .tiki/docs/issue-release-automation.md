## Summary

Add release automation features and integrate release context into existing Tiki commands. This builds on the core release management system to enable automated release execution and provide release awareness throughout the workflow.

## Motivation

After implementing core release management (see dependency), we need:
- Automated release execution (`/tiki:release yolo`) for hands-off release completion
- GitHub milestone synchronization (`/tiki:release sync`)
- Release context in `state` and `whats-next` commands
- Seamless workflow that keeps users aware of release progress

## New Subcommands for `/tiki:release`

### `/tiki:release yolo <version>`

Automated release execution that plans, executes, and ships all issues in a release sequentially.

#### Purpose
For users who want to execute an entire release with minimal interaction. The command handles the full workflow:
1. Plans all unplanned issues
2. Executes each issue sequentially
3. Ships each issue as it completes
4. Verifies requirements
5. Ships the release

#### Usage

```bash
/tiki:release yolo v1.1                   # Full automated workflow
/tiki:release yolo v1.1 --skip-verify     # Skip requirement verification
/tiki:release yolo v1.1 --no-tag          # Don't create git tag
/tiki:release yolo v1.1 --dry-run         # Show what would happen
```

#### Workflow

```
/tiki:release yolo v1.1

## Release YOLO: v1.1

### Pre-Flight Check

Release v1.1 contains 5 issues:
- #34: Diagnostic docs (not planned)
- #36: JSON schema (not planned)
- #20: Define requirements (not planned)
- #21: Roadmap (not planned)
- #22: Milestone mgmt (not planned)

Issues will be processed in dependency order:
1. #34 (no dependencies)
2. #36 (no dependencies)
3. #20 (no dependencies)
4. #21 (depends on #20)
5. #22 (depends on #20, #21)

TDD Mode: enabled (from .tiki/config.json)

Proceed with YOLO execution? [Y/n]

> Y

---

## Executing Release v1.1

### Issue 1/5: #34 - Diagnostic docs

Planning issue #34...
Created plan: 2 phases

Executing phase 1/2: Add diagnostic section...
Phase 1 complete.

Executing phase 2/2: Add examples...
Phase 2 complete.

Shipping issue #34...
Issue #34 shipped. DOC-01 marked as implemented.

Release progress: 1/5 (20%)

---

### Issue 2/5: #36 - JSON schema

Planning issue #36...
Created plan: 3 phases

Executing phase 1/3: Define schemas...
Phase 1 complete.

Executing phase 2/3: Add validation...
Phase 2 complete.

Executing phase 3/3: Add tests...
Phase 3 complete.

Shipping issue #36...
Issue #36 shipped. QUAL-01 marked as implemented.

Release progress: 2/5 (40%)

---

[... continues for remaining issues ...]

---

### Issue 5/5: #22 - Milestone management

Planning issue #22...
Created plan: 4 phases

Executing phase 1/4...
[... execution ...]

Shipping issue #22...
Issue #22 shipped. MULTI-01, MULTI-03 marked as implemented.

Release progress: 5/5 (100%)

---

## All Issues Complete

### Requirement Verification

5 requirements to verify:

1. **DOC-01**: Diagnostic documentation exists
   *Verify: Manual test* - Documentation section exists in execute.md
   Auto-verified: Found section in file.

2. **QUAL-01**: JSON schema validation
   *Verify: Automated test* - Schema validation passes
   Auto-verified: Tests passing.

3. **MULTI-01**: Group issues into releases
   *Verify: Manual test* - Cannot auto-verify

4. **MULTI-02**: View roadmap
   *Verify: Manual test* - Cannot auto-verify

5. **MULTI-03**: Track release progress
   *Verify: Manual test* - Cannot auto-verify

---

3 requirements need manual verification.

Options:
1. Verify now (interactive)
2. Ship without verification (--skip-verify behavior)
3. Pause and verify later

> 1

[... interactive verification flow ...]

---

## Release v1.1 Shipped!

### Summary
- **Duration:** 45 minutes
- **Issues completed:** 5
- **Phases executed:** 14
- **Requirements verified:** 5/5

### Actions Taken
- Planned 5 issues
- Executed 14 phases
- Shipped 5 issues
- Verified 5 requirements
- Closed GitHub milestone
- Created git tag v1.1.0
- Archived release

Congratulations! Release v1.1 is complete.
```

#### Flags

| Flag | Description |
|------|-------------|
| `--skip-verify` | Skip requirement verification at ship time |
| `--no-tag` | Don't create git tag when shipping |
| `--dry-run` | Show execution plan without running |
| `--continue` | Resume a paused YOLO execution |
| `--from <issue>` | Start from a specific issue (skip earlier ones) |

#### Dry Run Output

```
/tiki:release yolo v1.1 --dry-run

## Release YOLO: v1.1 (Dry Run)

### Execution Plan

1. **#34: Diagnostic docs**
   - Status: Not planned
   - Action: Plan → Execute → Ship
   - Requirements: DOC-01

2. **#36: JSON schema**
   - Status: Not planned
   - Action: Plan → Execute → Ship
   - Requirements: QUAL-01

3. **#20: Define requirements**
   - Status: Not planned
   - Action: Plan → Execute → Ship
   - Requirements: MULTI-01, MULTI-03

4. **#21: Roadmap**
   - Status: Not planned
   - Depends on: #20
   - Action: Plan → Execute → Ship
   - Requirements: MULTI-02

5. **#22: Milestone management**
   - Status: Not planned
   - Depends on: #20, #21
   - Action: Plan → Execute → Ship
   - Requirements: MULTI-01, MULTI-03

### Post-Execution

- Verify 5 requirements
- Close GitHub milestone
- Create git tag v1.1.0
- Archive release

---

No changes made (dry run). Run without --dry-run to execute.
```

#### Error Handling

```
## Issue 3/5: #20 - Define requirements

Executing phase 2/4: Implement requirements parser...

ERROR: Phase failed
- TypeScript compilation error
- File: src/requirements/parser.ts

### Recovery Options

1. **Auto-heal**: Run `/tiki:heal` to attempt automatic fix
2. **Manual fix**: Fix the issue, then `/tiki:release yolo v1.1 --continue`
3. **Skip issue**: Continue with remaining issues (not recommended)
4. **Abort**: Stop YOLO execution

> 1

Running heal...
[... heal attempts ...]

Heal successful. Resuming execution...
```

#### State Persistence

YOLO execution state is saved to allow resumption:

```json
// .tiki/state/yolo.json
{
  "release": "v1.1",
  "status": "in_progress",
  "startedAt": "2026-01-20T10:00:00Z",
  "currentIssue": 20,
  "completedIssues": [34, 36],
  "failedIssues": [],
  "flags": {
    "skipVerify": false,
    "noTag": false
  }
}
```

---

### `/tiki:release sync <version>`

Synchronize release state with GitHub milestone.

#### Purpose
Keep GitHub milestone in sync with Tiki release state. Useful when:
- Issues were added/removed locally
- Issue statuses changed outside Tiki
- Milestone got out of sync

#### Usage

```bash
/tiki:release sync v1.1              # Sync Tiki → GitHub
/tiki:release sync v1.1 --pull       # Sync GitHub → Tiki
/tiki:release sync v1.1 --two-way    # Bidirectional sync
```

#### Sync Flow (Tiki → GitHub)

```
/tiki:release sync v1.1

## Syncing Release v1.1 to GitHub

### Changes Detected

| Change | Issue | Action |
|--------|-------|--------|
| Added locally | #38 | Add to milestone |
| Removed locally | #35 | Remove from milestone |
| Status changed | #36 | Update (closed → closed) |

### Sync Actions

- Add #38 to milestone "v1.1"
- Remove #35 from milestone "v1.1"

Proceed? [Y/n]

> Y

Synced:
- Added #38 to milestone
- Removed #35 from milestone

GitHub milestone: https://github.com/owner/repo/milestone/1
```

#### Pull Flow (GitHub → Tiki)

```
/tiki:release sync v1.1 --pull

## Syncing GitHub Milestone to v1.1

### Changes on GitHub

| Change | Issue | Action |
|--------|-------|--------|
| Added on GitHub | #40 | Add to release |
| Closed on GitHub | #34 | Mark as completed |

### Sync Actions

- Add #40 to release v1.1
- Mark #34 as completed in release

Proceed? [Y/n]

> Y

Synced:
- Added #40 to release
- Updated #34 status

Note: #40 has no requirements mapping. Run `/tiki:release add 40 --to v1.1` to map requirements.
```

---

## Integration with Existing Commands

### Changes to `/tiki:state`

Add release context to state display.

#### Updated Output

```
/tiki:state

## Tiki State

### Active Work
**Issue #20:** Define requirements
- Status: in_progress
- Progress: Phase 2 of 4 (50%)
- Current phase: Implement requirements parser
- Started: 2 hours ago

### Active Release: v1.1
**Progress:** 2/5 issues complete (40%)

| # | Title | Status |
|---|-------|--------|
| #34 | Diagnostic docs | Done |
| #36 | JSON schema | Done |
| #20 | Define requirements | In Progress (Phase 2/4) |
| #21 | Roadmap | Planned |
| #22 | Milestone mgmt | Not Planned |

Requirements: 2/5 implemented
GitHub: https://github.com/owner/repo/milestone/1

### Context Budget (Next Phase)
[... existing context budget display ...]

### Queue
**2 items** pending review

---
**Next:** Continue with `/tiki:execute 20` or check release with `/tiki:release status v1.1`
```

#### No Active Release

When no release context:

```
### Active Release
None. Assign current issue to a release with `/tiki:release add 20 --to <version>`
```

---

### Changes to `/tiki:whats-next`

Add release-aware recommendations.

#### When Issue is Part of Release

```
/tiki:whats-next

## What's Next

### Currently Active
**Issue #20:** Define requirements
- Phase 2 of 4: Implement requirements parser
- Part of release **v1.1** (2/5 issues complete)

### Suggested Action
Continue execution:
```
/tiki:execute 20
```

### Release Context
After #20, the next issue in v1.1 is:
- **#21:** Add roadmap (depends on #20)

To see full release status: `/tiki:release status v1.1`
```

#### When Release Has Next Issue Ready

```
/tiki:whats-next

## What's Next

### Just Completed
Issue #20 shipped successfully.
Release v1.1 progress: 3/5 (60%)

### Suggested Action
Continue with the next issue in v1.1:
```
/tiki:plan-issue 21
```

**#21:** Add /tiki:roadmap
- Depends on: #20 (completed)
- Requirements: MULTI-02

### Alternative
- Skip to a different issue
- Review queue (2 items pending)
- Check release status: `/tiki:release status v1.1`
```

#### Priority Ordering with Releases

Updated priority logic:

1. Failed phases (fix blockers first)
2. Paused work (resume interrupted work)
3. In-progress execution (continue what's started)
4. **Next issue in active release** (NEW - release context)
5. Queue items (clear discovered items)
6. Planned issues not in releases (by priority label)
7. No plans (suggest getting/planning issues)

---

## Acceptance Criteria

### `/tiki:release yolo`
- [ ] Command runs full automated workflow (plan → execute → ship) for all issues
- [ ] Issues are processed in dependency order
- [ ] Each issue is planned if not already planned
- [ ] Each issue is executed phase by phase
- [ ] Each issue is shipped after all phases complete
- [ ] Requirements are verified at the end (unless --skip-verify)
- [ ] GitHub milestone is closed
- [ ] Git tag is created (unless --no-tag)
- [ ] Release is archived
- [ ] `--dry-run` shows execution plan without running
- [ ] `--continue` resumes paused execution
- [ ] `--from <issue>` starts from specific issue
- [ ] State is persisted in `.tiki/state/yolo.json` for recovery
- [ ] Errors pause execution with recovery options

### `/tiki:release sync`
- [ ] Default syncs Tiki state to GitHub milestone
- [ ] `--pull` syncs GitHub milestone to Tiki state
- [ ] `--two-way` does bidirectional sync
- [ ] Shows diff before applying changes
- [ ] Handles added/removed/status-changed issues
- [ ] Creates milestone if it doesn't exist

### Integration: `/tiki:state`
- [ ] Shows active release context when issue is in a release
- [ ] Displays release progress (X/Y issues complete)
- [ ] Shows issues in release with their statuses
- [ ] Shows requirements progress
- [ ] Links to GitHub milestone if synced

### Integration: `/tiki:whats-next`
- [ ] Considers release context when suggesting next issue
- [ ] Prioritizes next issue in active release
- [ ] Shows release progress after completing issues
- [ ] Respects issue dependencies within release
- [ ] Suggests release commands when appropriate

### State Files
- [ ] `.tiki/state/yolo.json` tracks YOLO execution state
- [ ] YOLO state includes completed/failed/current issues
- [ ] YOLO state allows resumption after errors

## Dependencies

- Requires: Core release management system (must be implemented first)
- Requires: Requirements definition system (transitive dependency)

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sequential execution | Yes | Simpler, respects dependencies, easier error recovery |
| State persistence | Yes | Allows resumption after errors or breaks |
| Dry run support | Yes | Users can preview before committing |
| Sync bidirectional | Optional | Default is Tiki → GitHub, pull is explicit |
| Release in whats-next | Priority 4 | After critical items, before general planned issues |

## Error Recovery

YOLO execution can fail at various points. Recovery strategies:

| Failure Point | Recovery |
|---------------|----------|
| Planning fails | Fix issue manually, `--continue` |
| Phase fails | Auto-heal or manual fix, `--continue` |
| Ship fails | Fix git/gh issues, `--continue` |
| Verification fails | Fix and re-verify, or `--skip-verify` |

## Performance Considerations

- YOLO execution can take significant time for large releases
- Consider implementing progress notifications
- State persistence allows breaking execution across sessions
- `--from` flag allows skipping already-completed work

## References

- Parent issue: #39 (Add unified release management with requirements traceability)
- Depends on: Core release management system issue
- Depends on: Requirements definition system issue (transitive)
- Workflow documentation: `.tiki/docs/release-workflow.md`
