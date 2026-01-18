# ADR-002: Add Release Management Layer

## Status

Accepted

## Date

2026-01-18

## Context

Tiki originally operated at the individual issue level: fetch an issue, plan it, execute it, ship it. This worked well for single-issue workflows, but as projects grew, several problems emerged:

1. **No grouping mechanism**: Related issues couldn't be tracked together toward a common release
2. **No version coordination**: Multiple issues needed for a release had no shared context
3. **Manual milestone management**: GitHub milestones existed but weren't integrated with Tiki's execution flow
4. **No release automation**: Shipping a version (tagging, changelog, closing issues) was manual

Users needed a way to say "these 5 issues make up v1.1" and have Tiki orchestrate their execution as a cohesive unit.

## Decision

We will add a release management layer (`/tiki:release`) that:

1. Groups GitHub issues into named versions (e.g., v1.1, 2.0.0-beta)
2. Tracks per-issue progress within a release (not_planned → in_progress → completed)
3. Syncs bidirectionally with GitHub milestones
4. Provides release-level YOLO automation to execute all issues in sequence
5. Handles release shipping: git tagging, changelog generation, milestone closing

The release layer sits above the issue layer:

```
Release Layer:     /tiki:release new, status, add, ship, yolo
                           ↓
Issue Layer:       /tiki:plan-issue, execute, ship
                           ↓
Phase Layer:       Sub-agent execution per phase
```

State is stored in `.tiki/releases/<version>.json` with issue tracking, requirements mapping, and GitHub milestone references.

## Alternatives Considered

### GitHub Milestones Only (Status Quo)
- Pros: Native GitHub feature, no extra state files
- Cons: No execution automation, no Tiki integration, manual tracking

### Project Boards Integration
- Pros: Visual kanban, built into GitHub
- Cons: Column-based workflow doesn't match Tiki's phase model, complex API

### Simple Issue Tags
- Pros: Lightweight, no new state
- Cons: No ordering, no progress tracking, can't automate release shipping

### External Release Tools (semantic-release, etc.)
- Pros: Mature tooling, well-tested
- Cons: Doesn't integrate with Tiki's context-aware execution, separate workflow

## Consequences

### Positive
- Issues can be coordinated toward versioned releases
- `/tiki:release yolo` automates entire release execution end-to-end
- GitHub milestone sync keeps external stakeholders informed
- Release shipping (tag, changelog, close) is automated
- Requirements tracking integrates with releases for traceability

### Negative
- Adds another layer of state (`.tiki/releases/`) to manage
- More commands to learn (/release new, add, remove, ship, yolo, sync)
- Potential state drift between Tiki releases and GitHub milestones
- Increases complexity for single-issue workflows that don't need releases

### Neutral
- Releases are optional - single-issue workflow still works as before
- GitHub milestone is optional - can use Tiki releases standalone
- Archived releases stored in `.tiki/releases/archive/` for history

## Related

- [release.md](.claude/commands/tiki/release.md): The command implementation
- [define-requirements.md](.claude/commands/tiki/define-requirements.md): Requirements system that integrates with releases
- Issue #42: Add release automation and command integration
- Issue #9771031: Add core release management system
