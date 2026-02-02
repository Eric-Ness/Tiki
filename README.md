# Tiki

A GitHub-issue-centric workflow framework for Claude Code. Break large issues into phases, execute them with fresh context windows, and track progress automatically.

**Version:** 1.12.7

## Why Tiki?

When working with Claude Code on complex tasks, context windows fill up. Tiki solves this by:

- **Breaking issues into phases** - Each phase is small enough to complete in one context window
- **Spawning sub-agents** - Each phase runs with fresh context, carrying only summaries forward
- **Tracking state** - Progress is saved to `.tiki/` so you can pause, resume, and pick up where you left off
- **Managing discoveries** - Items found during execution are queued for batch review
- **Backward planning from criteria** - Plans are derived from success criteria, not forward from issue description
- **Release management** - Group issues into versions and track progress across releases
- **Requirements traceability** - Define requirements and trace them through issues to implementation
- **Context-efficient architecture** - Conditional prompt loading reduces token usage by 80-90%

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
| `/tiki:plan-issue <number>` | Create a phased execution plan with success criteria |
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
| `/tiki:verify` | Run UAT verification for completed issue |

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

### Release Management

| Command | Description |
|---------|-------------|
| `/tiki:release` | Show release management help |
| `/tiki:release-new <version>` | Create a new release version |
| `/tiki:release-add <issue>` | Add issue to release (with `--to <version>` option) |
| `/tiki:release-remove <issue>` | Remove issue from its release |
| `/tiki:release-status [version]` | Display release progress and status |
| `/tiki:release-ship <version>` | Ship a release (tag, close issues, archive) |
| `/tiki:release-sync [version]` | Sync release with GitHub milestone |
| `/tiki:release-yolo <version>` | Automated release execution (plan, execute, ship all issues) |
| `/tiki:roadmap` | Generate project visualization across releases |
| `/tiki:define-requirements` | Interactively define and track project requirements |

### Code Quality

| Command | Description |
|---------|-------------|
| `/tiki:assess-code` | Comprehensive codebase health assessment |
| `/tiki:map-codebase` | Generate STACK.md, CONCERNS.md, and optional docs |

### Documentation

| Command | Description |
|---------|-------------|
| `/tiki:adr "title"` | Create an Architecture Decision Record |
| `/tiki:update-claude` | Update CLAUDE.md with learned patterns |
| `/tiki:commit` | Create a Tiki-aware git commit |
| `/tiki:changelog` | Show recent Tiki updates |

### Project Setup

| Command | Description |
|---------|-------------|
| `/tiki:new-project` | Initialize a new project with vision, research, requirements, and issues |

### Extensions & Hooks

| Command | Description |
|---------|-------------|
| `/tiki:hook-run <name>` | Manually trigger a lifecycle hook for testing |

### Utilities

| Command | Description |
|---------|-------------|
| `/tiki:test-creator` | Create tests (TDD before/after modes) |
| `/tiki:cleanup` | Remove temporary artifacts |
| `/tiki:update-tiki` | Self-update to latest version |

## Starting a New Project

For greenfield projects (starting from scratch), use `/tiki:new-project`:

```bash
/tiki:new-project                   # Full guided flow
/tiki:new-project --skip-research   # Skip domain research
/tiki:new-project --skip-issues     # Skip GitHub issue creation
```

The command guides you through:

1. **Deep Questioning** — Conversational exploration of your vision, users, constraints
2. **Domain Research** (optional) — 4 parallel agents research Stack, Features, Architecture, Pitfalls
3. **Requirements Scoping** — Interactive feature selection by category (v1 vs v2 vs out-of-scope)
4. **Issue Generation** — Creates GitHub issues from requirements, ready for `/tiki:yolo`

**Output:**

- `PROJECT.md` — Project vision and context
- `.tiki/research/project/` — Research findings (if selected)
- `.tiki/requirements.json` — Structured requirements with REQ-IDs
- GitHub issues — Ready for execution

After `/tiki:new-project`, use `/tiki:pick-issue` to see where to start, then `/tiki:yolo` to execute.

## Typical Workflow

```
/tiki:pick-issue                    # What should I work on?
  → Recommends Issue #34

/tiki:yolo 34                       # Do everything automatically
  → Fetches issue
  → Reviews for concerns
  → Extracts success criteria from issue
  → Creates 3-phase plan (backward from criteria)
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

## Release System

Group issues into releases and track progress across versions:

```bash
# Create a new release
/tiki:release-new v1.1

# Add issues to a release
/tiki:release-add 42                # Add issue #42 to active release
/tiki:release-add 43 --to v1.2      # Add to specific release

# View release status
/tiki:release-status                # Show current release
/tiki:release-status v1.1           # Show specific release

# Sync with GitHub milestones
/tiki:release-sync v1.1             # Two-way sync with milestone

# Ship a release
/tiki:release-ship v1.1             # Tag, close issues, archive

# Automated release execution
/tiki:release-yolo v1.1             # Plan, execute, and ship all issues

# View project roadmap
/tiki:roadmap                       # ASCII timeline view
/tiki:roadmap --format table        # Table view
/tiki:roadmap --output              # Generate ROADMAP.md file
```

Release files are stored in `.tiki/releases/` with shipped releases archived to `.tiki/releases/archive/`.

## Requirements Tracking

Define and track project requirements with traceability to issues:

```bash
# Define requirements interactively
/tiki:define-requirements

# Seed requirements from GitHub issues
/tiki:define-requirements --from-issues

# Refresh requirements status
/tiki:define-requirements --refresh
```

Creates `.tiki/REQUIREMENTS.md` (human-readable) and `.tiki/requirements.json` (machine-readable).

Requirements are linked to releases and traced through issues to implementation.

## Codebase Documentation

Generate comprehensive documentation about your codebase:

```bash
# Generate default docs (STACK.md + CONCERNS.md)
/tiki:map-codebase

# Generate all available documentation
/tiki:map-codebase --all-docs

# Generate specific docs
/tiki:map-codebase --conventions      # Code style and naming patterns
/tiki:map-codebase --testing          # Test framework and patterns
/tiki:map-codebase --integrations     # External services and APIs

# Also update CLAUDE.md with discovered patterns
/tiki:map-codebase --update-claude
```

All generated docs are placed in `.tiki/docs/` folder.

## Context-Efficient Architecture

Tiki uses conditional prompt loading to minimize context window usage. Instead of loading entire command files upfront, specialized prompts are loaded only when needed:

| Command | Prompts Loaded On-Demand |
|---------| ------------------------ |
| `/tiki:execute` | TDD workflow, autofix strategies, subtask execution |
| `/tiki:plan-issue` | Research integration, release integration, assumptions |
| `/tiki:debug` | Session start, hypothesis tracking, resolution recording |
| `/tiki:state` | Release context, context budget, output formats |
| `/tiki:adr` | Create workflow, list/show/update, auto-generation |
| `/tiki:resume` | Context verification, execution options, edge cases |
| `/tiki:commit` | Message format, staging workflow, examples |

**Results:**

- `execute.md`: ~20,000 → ~1,700 tokens (91% reduction)
- `debug.md`: ~15,400 → ~1,300 tokens (92% reduction)
- `update-claude.md`: ~1,938 → ~400 tokens (79% reduction)
- `state.md`: ~1,910 → ~500 tokens (74% reduction)
- `adr.md`: ~1,875 → ~650 tokens (65% reduction)
- **30+ commands refactored** with 40-90% token reductions

Prompt files are stored in `.tiki/prompts/<command>/` and loaded by the orchestrator only when specific conditions are met.

## State Storage

All state lives in `.tiki/`:

```
.tiki/
├── config.json          # Project settings
├── todos.json           # Todo items
├── REQUIREMENTS.md      # Human-readable requirements
├── requirements.json    # Machine-readable requirements
├── plans/               # Phase plans (issue-N.json)
├── state/               # Execution state (current.json)
├── queue/               # Discovered items (pending.json)
├── context/             # Saved context for resume
├── releases/            # Release definitions (v1.0.json, etc.)
│   └── archive/         # Shipped releases
├── commands/            # Custom user commands
├── hooks/               # Lifecycle hook scripts
├── docs/                # Generated documentation
├── adr/                 # Architecture Decision Records
├── debug/               # Debug session history
├── research/            # Domain research documents
│   └── index.json       # Research index for keyword matching
├── prompts/             # Conditional prompts for commands
└── schemas/             # JSON Schema files for validation
```

## Schema Validation

JSON Schema files in `.tiki/schemas/` document the expected structure of state files:

| Schema | Validates | Purpose |
|---------|-----------|---------|
| `config.schema.json` | `.tiki/config.json` | Project settings |
| `plan.schema.json` | `.tiki/plans/issue-N.json` | Phased execution plans |
| `state.schema.json` | `.tiki/state/current.json` | Active execution state |
| `queue.schema.json` | `.tiki/queue/pending.json` | Discovered items |
| `todos.schema.json` | `.tiki/todos.json` | Backlog items |
| `hook-result.schema.json` | Hook execution results | Lifecycle hook outputs |

Schemas can be used for IDE autocomplete via JSON `$schema` references.

## Plan File Format

Plans are stored in `.tiki/plans/issue-N.json`:

```json
{
  "issue": {
    "number": 34,
    "title": "Add user authentication",
    "body": "Issue description...",
    "labels": ["feature"]
  },
  "successCriteria": [
    {
      "category": "functional",
      "criteria": [
        "User can log in with email and password",
        "User can log out"
      ]
    },
    {
      "category": "testing",
      "criteria": [
        "Unit tests cover authentication logic"
      ]
    }
  ],
  "phases": [
    {
      "number": 1,
      "title": "Setup auth middleware",
      "status": "pending",
      "dependencies": [],
      "files": ["src/middleware/auth.ts"],
      "assumptions": ["Express.js middleware pattern"],
      "content": "Phase instructions...",
      "verification": "How to verify...",
      "addressesCriteria": ["functional-1", "functional-2"]
    }
  ],
  "coverageMatrix": {
    "functional-1": { "phases": [1], "tasks": [1] },
    "functional-2": { "phases": [1], "tasks": [2] },
    "testing-1": { "phases": [2], "tasks": [1] }
  },
  "release": "v1.1",
  "researchContext": []
}
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
  },
  "hooks": {
    "codeSimplifier": {
      "enabled": true,
      "mode": "silent"
    },
    "testValidator": {
      "enabled": true,
      "runOn": ["phase-complete", "commit"]
    }
  },
  "adr": {
    "autoGenerate": true,
    "directory": ".tiki/adr"
  },
  "autoFix": {
    "enabled": true,
    "maxAttempts": 3,
    "strategies": ["direct", "contextual-analysis", "approach-review"]
  },
  "pickIssue": {
    "maxIssues": 10,
    "preferLabels": ["priority:high", "good-first-issue"],
    "deferLabels": ["blocked", "needs-info"],
    "excludeLabels": ["wontfix"]
  }
}
```

### Configuration Options

**Testing modes:** `"before"` (TDD), `"after"`, `"ask"`, `"never"`

**Hook modes:**

- `codeSimplifier`: Runs after phases to simplify generated code
- `testValidator`: Validates tests at specified lifecycle points

**Auto-fix strategies:**

- `direct`: Attempt immediate fix based on error
- `contextual-analysis`: Analyze surrounding context before fixing
- `approach-review`: Review entire approach if simpler fixes fail

## Extensions System

Tiki supports project-specific extensibility through lifecycle hooks and custom commands.

### Lifecycle Hooks

Shell scripts in `.tiki/hooks/` that auto-run at workflow points:

| Hook | When it runs | Blocks on failure |
|------|--------------|-------------------|
| `pre-ship` | Before `/tiki:ship` commits | Yes |
| `post-ship` | After successful ship | No |
| `pre-execute` | Before `/tiki:execute` starts | Yes |
| `post-execute` | After all phases complete | No |
| `pre-commit` | Before `/tiki:commit` | Yes |
| `post-commit` | After commit | No |
| `phase-start` | Before each phase | Yes |
| `phase-complete` | After each phase | No |

**Example:** `.tiki/hooks/pre-ship` to auto-bump version:

```bash
#!/bin/bash
set -e
echo "Bumping version for issue #$TIKI_ISSUE_NUMBER"
npm version patch --no-git-tag-version
git add package.json package-lock.json
```

**Environment variables** passed to hooks:
- `TIKI_ISSUE_NUMBER`, `TIKI_ISSUE_TITLE` - Issue context
- `TIKI_PHASE_NUMBER`, `TIKI_PHASE_STATUS` - Phase context
- `TIKI_COMMIT_SHA` - Commit hash (post-commit, post-ship)

**Windows support:** Use `.sh` (Git Bash) or `.ps1` (PowerShell).

**Manual testing:** `/tiki:hook-run pre-ship --env TIKI_ISSUE_NUMBER=42`

### Custom Commands

Place custom command files in `.tiki/commands/` following Claude Code command format:

```markdown
---
type: prompt
name: tiki:my-command
description: What your command does
allowed-tools: ["Read", "Write", "Bash"]
---

# My Command

Instructions here...
```

### Configuration

```json
{
  "extensions": {
    "customCommands": {
      "enabled": true,
      "directory": ".tiki/commands"
    },
    "lifecycleScripts": {
      "enabled": true,
      "directory": ".tiki/hooks",
      "timeout": 30000,
      "verbose": false
    }
  }
}
```

## Requirements

- [Claude Code](https://claude.ai/code)
- [GitHub CLI](https://cli.github.com/) (`gh`)
- Git repository with GitHub remote

## License

MIT
