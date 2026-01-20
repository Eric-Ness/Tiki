# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tiki is a GitHub-issue-centric workflow framework for Claude Code. It breaks large issues into phases, executes them with fresh context windows via sub-agents, and tracks state automatically. The framework is implemented entirely as Claude Code custom commands (`.claude/commands/tiki/*.md`).

## Architecture

### Core Concept

Tiki manages context window limitations by:
1. Breaking GitHub issues into small, completable phases via `/tiki:plan-issue`
2. Spawning sub-agents (via Task tool) for each phase during `/tiki:execute`
3. Passing only summaries between phases to preserve context
4. Tracking state in `.tiki/` for pause/resume capability

### Command Structure

All Tiki functionality lives in `.claude/commands/tiki/` as markdown prompt files. Each command follows the Claude Code custom command format with YAML frontmatter (`type: prompt`, `name`, `description`, `allowed-tools`, `argument-hint`).

**Core Workflow Commands:**
- `get-issue.md` - Fetches GitHub issues via `gh` CLI
- `plan-issue.md` - Creates phased plans with success criteria (backward planning from criteria)
- `execute.md` - Spawns sub-agents for each phase via Task tool
- `ship.md` - Commits, pushes, closes issue

**Execution Control:**
- `pause.md`, `resume.md` - Save/restore execution state
- `skip-phase.md`, `redo-phase.md` - Phase-level control
- `heal.md` - Auto-diagnose and fix failed phases

**Planning & Review:**
- `audit-plan.md` - Validates plans (6 checks including criteria coverage)
- `discuss-phases.md` - Interactive phase adjustment
- `review-issue.md` - Pre-planning issue analysis
- `research.md` - Domain research before planning

### State Management

All state lives in `.tiki/`:
```
.tiki/
├── config.json         # Project settings (TDD mode, test framework)
├── plans/              # Phase plans (issue-N.json)
├── state/current.json  # Active execution state
├── queue/pending.json  # Discovered items for review
├── context/            # Saved context for resume
├── debug/              # Debug session history + index
├── research/           # Research documents + index
└── adr/                # Architecture Decision Records
```

### Schema Validation

JSON Schema files in `.tiki/schemas/` document the expected structure of state files:

| Schema | Validates | Purpose |
|--------|-----------|---------|
| `config.schema.json` | `.tiki/config.json` | Project settings |
| `plan.schema.json` | `.tiki/plans/issue-N.json` | Phased execution plans |
| `state.schema.json` | `.tiki/state/current.json` | Active execution state |
| `queue.schema.json` | `.tiki/queue/pending.json` | Discovered items |
| `todos.schema.json` | `.tiki/todos.json` | Backlog items |

Schemas can be used for IDE autocomplete via JSON `$schema` references. Run schema validation tests: `node .tiki/test/commands/schema-validation.test.js`

### Plan File Format

Plans (`.tiki/plans/issue-N.json`) contain:
- `issue`: GitHub issue metadata
- `successCriteria`: Array of criteria by category (functional, non-functional, testing, documentation)
- `phases`: Array with `number`, `title`, `status`, `dependencies`, `files`, `content`, `verification`, `addressesCriteria`
- `coverageMatrix`: Maps criteria to phases that address them
- `projectContext`: From PROJECT.md if present
- `researchContext`: From matched research documents

### Key Patterns

**Backward Planning:** Plan-issue works backward from success criteria to derive phases, not forward from issue description. Each phase must have criterion justification via `addressesCriteria`.

**Sub-Agent Execution:** Execute spawns general-purpose sub-agents via Task tool. Each sub-agent receives:
- CLAUDE.md contents (project context)
- Previous phase summaries
- Current phase instructions
- TDD context if enabled

**TDD Integration:** Configurable via `.tiki/config.json` (`testing.createTests`: "before"/"after"/"ask"/"never"). TDD mode writes failing tests first, then implements to make them pass.

### Conditional Prompt Loading

Large commands use conditional prompt files to reduce context usage:

| Command | Condition | Prompt File |
|---------|-----------|-------------|
| execute.md | TDD enabled | .tiki/prompts/execute/tdd-workflow.md |
| execute.md | Verification fails | .tiki/prompts/execute/autofix-strategies.md |
| execute.md | Phase has subtasks | .tiki/prompts/execute/subtask-execution.md |
| debug.md | Starting new session | .tiki/prompts/debug/start-session.md |
| debug.md | Hypothesis workflow | .tiki/prompts/debug/hypothesis-tracking.md |
| debug.md | Marking resolved/abandoned | .tiki/prompts/debug/resolution-recording.md |
| debug.md | After session changes | .tiki/prompts/debug/index-management.md |
| map-codebase.md | --conventions or --all-docs | .tiki/prompts/map-codebase/conventions-doc.md |
| map-codebase.md | --testing or --all-docs | .tiki/prompts/map-codebase/testing-doc.md |
| map-codebase.md | --integrations or --all-docs | .tiki/prompts/map-codebase/integrations-doc.md |
| map-codebase.md | --update-claude | .tiki/prompts/map-codebase/claude-update.md |
| review-issue.md | Risk/security concerns found | .tiki/prompts/review-issue/risk-assessment.md |
| review-issue.md | --alternatives flag or complex issue | .tiki/prompts/review-issue/alternative-analysis.md |
| review-issue.md | Blocking issues found | .tiki/prompts/review-issue/blocking-concerns.md |

Prompts are read by the orchestrator and passed to sub-agents via Task tool only when needed. This pattern reduced execute.md from ~20,000 tokens to ~1,700 tokens (91% reduction for happy-path execution), debug.md from ~15,400 tokens to ~1,300 tokens (92% reduction for list/show/search operations), map-codebase.md from ~5,865 tokens to ~710 tokens (88% reduction for core STACK.md/CONCERNS.md generation), and review-issue.md from ~5,073 tokens to ~1,150 tokens (77% reduction for standard issue reviews).

## Testing

Tests are in `.tiki/test/commands/` as JavaScript files using Node's assert:

```bash
node .tiki/test/commands/audit-plan.test.js
node .tiki/test/commands/plan-issue.test.js
```

Tests verify that command markdown files contain required sections and patterns (e.g., Check 6 for criteria coverage validation).

## Development Notes

- Commands are prompt files, not executable code - they instruct Claude how to perform tasks
- State files use JSON; commands read/write them via Bash/Read/Write tools
- GitHub CLI (`gh`) is required for issue operations
- Research integration matches keywords against `.tiki/research/index.json`
- Debug history is indexed in `.tiki/debug/index.json` for session lookup

### Conditional Loading Guidelines

When to apply conditional loading:

- Commands exceeding ~5,000 tokens should be refactored
- Features used in <50% of executions are candidates for extraction
- Error handling, specialized workflows, and optional features load on-demand

Structuring prompt files:

- Store in `.tiki/prompts/<command>/` directory
- Each file should be self-contained (~500-1,500 tokens)
- Include clear section headers and step-by-step instructions
- Orchestrator reads files and passes content to sub-agents via Task tool

Token budget guidelines:

- Orchestrator/main command: ~1,500-2,000 tokens
- Conditional prompt files: ~500-1,500 tokens each
- Total loaded context should stay under ~5,000 tokens for typical execution
