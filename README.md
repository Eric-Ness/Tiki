# Tiki

A GitHub-issue-centric workflow framework for Claude Code. Tiki helps you break large issues into phases, execute them with fresh context windows, and track progress automatically.

## Why Tiki?

When working with Claude Code on complex tasks, context windows fill up. Tiki solves this by:

- **Breaking issues into phases** - Each phase is small enough to complete in one context window
- **Spawning sub-agents** - Each phase runs with fresh context, carrying only summaries forward
- **Tracking state** - Progress is saved to `.tiki/` so you can pause, resume, and pick up where you left off
- **Managing discoveries** - Items found during execution are queued for batch review

## Installation

1. Copy the `.claude/commands/tiki/` folder into your project's `.claude/commands/` directory
2. Ensure you have a `.tiki/` folder in your project root (created automatically on first use)

```
your-project/
├── .claude/
│   └── commands/
│       └── tiki/           # Tiki command files
│           ├── execute.md
│           ├── plan-issue.md
│           └── ...
├── .tiki/                  # Tiki state (auto-created)
│   ├── plans/
│   ├── state/
│   └── queue/
└── ...
```

## Quick Start

### 1. Get an Issue

```
/tiki:get-issue 34
```

Fetches GitHub issue #34 and displays it with context.

### 2. Plan the Issue

```
/tiki:plan-issue 34
```

Creates a phased execution plan. If the issue is too large for one context window, it breaks it into multiple phases. Plans are stored in `.tiki/plans/issue-34.json`.

### 3. Review the Plan (Optional)

```
/tiki:audit-plan 34
```

Validates the plan: checks phase sizes, dependencies, file conflicts, and verification steps.

### 4. Execute

```
/tiki:execute 34
```

Runs each phase sequentially by spawning sub-agents. Each sub-agent gets:
- Fresh context
- Phase instructions
- Summaries from completed phases

### 5. Review Discoveries

```
/tiki:review-queue
```

Review items discovered during execution (potential issues, questions, blockers). Create GitHub issues or dismiss items.

## Commands Reference

### Core Workflow

| Command | Description |
|---------|-------------|
| `/tiki:get-issue <number>` | Fetch and display a GitHub issue |
| `/tiki:plan-issue <number>` | Create a phased execution plan |
| `/tiki:execute <number>` | Execute a planned issue phase by phase |
| `/tiki:whats-next` | Show current status and suggested next action |

### Execution Control

| Command | Description |
|---------|-------------|
| `/tiki:pause` | Save current state mid-execution |
| `/tiki:resume` | Resume paused work with full context |
| `/tiki:skip-phase <number>` | Skip a phase and move to the next |
| `/tiki:redo-phase <number>` | Re-execute a completed phase |
| `/tiki:heal` | Auto-diagnose and fix a failed phase |

### Planning & Review

| Command | Description |
|---------|-------------|
| `/tiki:audit-plan <number>` | Validate a plan before execution |
| `/tiki:discuss-phases <number>` | Review and adjust phase boundaries |
| `/tiki:state` | View current Tiki state |
| `/tiki:review-queue` | Review items discovered during execution |
| `/tiki:create-issues` | Batch create GitHub issues from queue |

### Code Quality

| Command | Description |
|---------|-------------|
| `/tiki:assess-code` | Comprehensive codebase health assessment with scoring |
| `/tiki:map-codebase` | Generate STACK.md and CONCERNS.md |

### Documentation

| Command | Description |
|---------|-------------|
| `/tiki:adr "title"` | Create an Architecture Decision Record |
| `/tiki:update-claude` | Update CLAUDE.md with learned patterns |
| `/tiki:commit` | Create a Tiki-aware git commit |

## Typical Workflow

```
User: /tiki:get-issue 34

Claude: Issue #34: Add user authentication
        Priority: High
        Labels: feature, backend

        [Issue description...]

User: /tiki:plan-issue 34

Claude: Created plan with 3 phases:

        Phase 1: Setup auth middleware
        Phase 2: Add login endpoint
        Phase 3: Add protected routes

        Stored in .tiki/plans/issue-34.json

User: /tiki:execute 34

Claude: [Spawns sub-agent for Phase 1...]
        Phase 1 complete: Created auth middleware with JWT validation

        [Spawns sub-agent for Phase 2...]
        Phase 2 complete: Implemented /api/login endpoint

        [Spawns sub-agent for Phase 3...]
        Phase 3 complete: Applied middleware to user routes

        All phases complete. 2 items in queue for review.

User: /tiki:review-queue

Claude: Queue items:
        1. Consider adding rate limiting to login endpoint
        2. Add password strength validation

        Create issues? [Yes/No/Select]

User: Yes

Claude: Created issues #35 and #36
```

## State Storage

All Tiki state is stored in the `.tiki/` folder:

```
.tiki/
├── config.json          # Project settings
├── plans/               # Phase plans for issues
│   └── issue-34.json
├── state/               # Current execution state
│   └── current.json
├── queue/               # Items needing review
│   └── pending.json
├── context/             # Saved context for resume
│   └── issue-34-phase-2.json
├── adr/                 # Architecture Decision Records
│   └── 001-use-jwt.md
└── learned/             # Patterns for CLAUDE.md updates
    └── patterns.json
```

## Plan File Format

Plans are stored as JSON with phase details:

```json
{
  "issue": {
    "number": 34,
    "title": "Add user authentication",
    "url": "https://github.com/owner/repo/issues/34"
  },
  "status": "in_progress",
  "phases": [
    {
      "number": 1,
      "title": "Setup auth middleware",
      "status": "completed",
      "dependencies": [],
      "files": ["src/middleware/auth.ts"],
      "content": "Create the authentication middleware...",
      "verification": ["Middleware file exists", "No TypeScript errors"],
      "summary": "Created auth middleware with JWT validation"
    }
  ]
}
```

**Phase statuses:** `pending`, `in_progress`, `completed`, `failed`, `skipped`

## Configuration

Optional `.tiki/config.json` for project-level settings:

```json
{
  "testing": {
    "createTests": "ask",
    "testFramework": "auto-detect"
  },
  "adr": {
    "autoGenerate": true,
    "directory": ".tiki/adr"
  }
}
```

## Code Assessment

Run `/tiki:assess-code` for a comprehensive health check:

| Dimension | Weight | What it evaluates |
|-----------|--------|-------------------|
| Architecture & Structure | 15% | Layering, separation of concerns |
| Code Quality | 15% | Duplication, complexity, dead code |
| Testability | 15% | Coverage, patterns, mockability |
| Security | 20% | OWASP concerns, auth, validation |
| Error Handling | 10% | Exception patterns, logging |
| Documentation | 10% | README, inline docs, API docs |
| Dependencies | 10% | Package health, versions |
| Interfaces | 5% | DI readiness, abstractions |

Generates a scored report in `docs/CODE_QUALITY_ASSESSMENT.md` with score history tracking.

## Philosophy

Tiki takes a lightweight approach compared to heavier frameworks:

| Aspect | Tiki | Traditional |
|--------|------|-------------|
| Work definition | GitHub issues | Local PROJECT.md |
| Phase tracking | `.tiki/plans/` | ROADMAP.md |
| State persistence | `.tiki/state/` | STATE.md |
| Documentation | CLAUDE.md + optional | 10+ markdown files |

**Core principle:** GitHub issues are the source of truth. Minimize local documentation overhead.

## Requirements

- [Claude Code CLI](https://claude.com/code)
- GitHub CLI (`gh`) for issue operations
- Git repository with GitHub remote

## License

MIT
