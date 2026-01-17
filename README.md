# Tiki

A GitHub-issue-centric workflow framework for Claude Code. Break large issues into phases, execute them with fresh context windows, and track progress automatically.

**Version:** 1.0.6

## Why Tiki?

When working with Claude Code on complex tasks, context windows fill up. Tiki solves this by:

- **Breaking issues into phases** - Each phase is small enough to complete in one context window
- **Spawning sub-agents** - Each phase runs with fresh context, carrying only summaries forward
- **Tracking state** - Progress is saved to `.tiki/` so you can pause, resume, and pick up where you left off
- **Managing discoveries** - Items found during execution are queued for batch review

## Installation

Copy the `.claude/commands/tiki/` folder into your project's `.claude/commands/` directory:

```
your-project/
├── .claude/
│   └── commands/
│       └── tiki/           # Tiki command files
├── .tiki/                  # Tiki state (auto-created)
└── ...
```

## Quick Start

### The Simple Way: YOLO Mode

```
/tiki:yolo 34
```

Runs the complete workflow automatically: fetch → review → plan → audit → execute → ship.

### The Step-by-Step Way

```bash
/tiki:get-issue 34      # Fetch the issue
/tiki:plan-issue 34     # Create a phased plan
/tiki:execute 34        # Run each phase
/tiki:ship              # Commit, push, close
```

## Commands

### Core Workflow

| Command | Description |
|---------|-------------|
| `/tiki:yolo <number>` | Full automated workflow (recommended) |
| `/tiki:get-issue <number>` | Fetch and display a GitHub issue |
| `/tiki:plan-issue <number>` | Create a phased execution plan |
| `/tiki:execute <number>` | Execute phases with sub-agents |
| `/tiki:ship` | Commit, push, and close the issue |
| `/tiki:whats-next` | Show status and suggested next action |

### Issue Discovery

| Command | Description |
|---------|-------------|
| `/tiki:pick-issue` | Analyze open issues and recommend which to work on next |
| `/tiki:add-issue [title]` | Create a new GitHub issue with guided prompts |
| `/tiki:review-issue <number>` | Analyze issue for concerns before planning |

### Backlog Management

| Command | Description |
|---------|-------------|
| `/tiki:add-todo [description]` | Add a todo item for later (not a GitHub issue yet) |
| `/tiki:list-todos` | View and manage todos (complete, convert to issue, delete) |

### Execution Control

| Command | Description |
|---------|-------------|
| `/tiki:pause` | Save current state mid-execution |
| `/tiki:resume` | Resume paused work with full context |
| `/tiki:skip-phase <number>` | Skip a phase and continue |
| `/tiki:redo-phase <number>` | Re-execute a completed phase |
| `/tiki:heal` | Auto-diagnose and fix a failed phase |

### Planning & Review

| Command | Description |
|---------|-------------|
| `/tiki:audit-plan <number>` | Validate a plan before execution |
| `/tiki:discuss-phases <number>` | Interactively adjust phase boundaries |
| `/tiki:review-queue` | Review items discovered during execution |
| `/tiki:create-issues` | Batch create GitHub issues from queue |
| `/tiki:state` | View current Tiki state |

### Research & Debugging

| Command | Description |
|---------|-------------|
| `/tiki:research <topic>` | Research unfamiliar domains before planning |
| `/tiki:debug [issue]` | Start systematic debugging with hypothesis tracking |

### Code Quality

| Command | Description |
|---------|-------------|
| `/tiki:assess-code` | Comprehensive codebase health assessment |
| `/tiki:map-codebase` | Generate STACK.md and CONCERNS.md |

### Documentation

| Command | Description |
|---------|-------------|
| `/tiki:adr "title"` | Create an Architecture Decision Record |
| `/tiki:update-claude` | Update CLAUDE.md with learned patterns |
| `/tiki:commit` | Create a Tiki-aware git commit |

### Project Setup

| Command | Description |
|---------|-------------|
| `/tiki:new-project` | Initialize a new project with PROJECT.md |

### Utilities

| Command | Description |
|---------|-------------|
| `/tiki:test-creator` | Create tests (TDD before/after modes) |
| `/tiki:cleanup` | Remove temporary artifacts |
| `/tiki:update-tiki` | Self-update to latest version |

## Typical Workflow

```
/tiki:pick-issue                    # What should I work on?
  → Recommends Issue #34

/tiki:yolo 34                       # Do everything automatically
  → Fetches issue
  → Reviews for concerns
  → Creates 3-phase plan
  → Executes each phase with TDD
  → Reviews queue (0 items)
  → Commits, pushes, closes issue
  → Bumps version

Done! Ready for next issue.
```

Or step by step:

```
/tiki:get-issue 34                  # View the issue
/tiki:plan-issue 34                 # Create phases
/tiki:execute 34 --tdd              # Run with TDD
/tiki:review-queue                  # Handle discoveries
/tiki:ship                          # Wrap up
```

## YOLO Mode Options

```bash
/tiki:yolo 34                  # Full workflow with TDD
/tiki:yolo 34 --no-tdd         # Skip test-driven development
/tiki:yolo 34 --skip-review    # Skip pre-planning review
/tiki:yolo 34 --no-ship        # Don't auto-commit/push/close
/tiki:yolo 34 --force-review   # Continue despite blocking concerns
```

## Todo System

Capture "back burner" items that aren't ready to be GitHub issues:

```bash
/tiki:add-todo "Refactor auth module"
/tiki:add-todo "Consider caching" --priority high

/tiki:list-todos                    # View all todos
/tiki:list-todos --pending          # Only pending
/tiki:list-todos --complete 1       # Mark #1 as done
/tiki:list-todos --convert 2        # Convert #2 to GitHub issue
/tiki:list-todos --delete 3         # Remove #3
```

## State Storage

All state lives in `.tiki/`:

```
.tiki/
├── config.json          # Project settings
├── todos.json           # Todo items
├── plans/               # Phase plans (issue-N.json)
├── state/               # Execution state
├── queue/               # Discovered items
├── context/             # Saved context for resume
├── adr/                 # Architecture Decision Records
├── debug/               # Debug session history
└── research/            # Domain research documents
```

## Configuration

Optional `.tiki/config.json`:

```json
{
  "testing": {
    "createTests": "before",
    "testFramework": "auto-detect"
  },
  "workflow": {
    "showNextStepMenu": true
  }
}
```

**Testing modes:** `"before"` (TDD), `"after"`, `"ask"`, `"never"`

## Requirements

- [Claude Code](https://claude.ai/code)
- [GitHub CLI](https://cli.github.com/) (`gh`)
- Git repository with GitHub remote

## License

MIT
