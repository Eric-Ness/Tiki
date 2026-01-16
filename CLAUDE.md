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
