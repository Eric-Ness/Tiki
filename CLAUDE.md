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
| roadmap.md | --output flag | .tiki/prompts/roadmap/file-output.md |
| roadmap.md | --format table | .tiki/prompts/roadmap/table-format.md |
| roadmap.md | Default or --format ascii | .tiki/prompts/roadmap/ascii-format.md |
| yolo.md | Review enabled (no --skip-review) | .tiki/prompts/yolo/review-stage.md |
| yolo.md | Ship enabled (no --no-ship) | .tiki/prompts/yolo/ship-stage.md |
| yolo.md | TDD enabled (no --no-tdd) | .tiki/prompts/yolo/tdd-handling.md |
| yolo.md | Stage failure | .tiki/prompts/yolo/error-recovery.md |
| release-ship.md | Milestone exists on release | .tiki/prompts/release-ship/milestone-sync.md |
| release-ship.md | --changelog flag | .tiki/prompts/release-ship/changelog-generation.md |
| release-ship.md | Ship step fails | .tiki/prompts/release-ship/rollback-instructions.md |
| review-queue.md | User selects create/convert action | .tiki/prompts/review-queue/create-issue.md |
| review-queue.md | Batch flag provided | .tiki/prompts/review-queue/batch-operations.md |
| release-new.md | --sync-github flag | .tiki/prompts/release-new/milestone-creation.md |
| release-new.md | Issues to select | .tiki/prompts/release-new/issue-selection.md |
| release-new.md | requirements.json exists | .tiki/prompts/release-new/requirements-mapping.md |
| release-add.md | Multiple issues specified | .tiki/prompts/release-add/batch-mode.md |
| release-add.md | requirements.json exists | .tiki/prompts/release-add/requirements-linking.md |
| release-add.md | Milestone exists on release | .tiki/prompts/release-add/milestone-sync.md |
| release-status.md | Single version specified | .tiki/prompts/release-status/detailed-view.md |
| release-status.md | requirements.json exists | .tiki/prompts/release-status/requirements-coverage.md |
| release-status.md | Multiple versions specified | .tiki/prompts/release-status/comparison-mode.md |
| verify.md | Manual steps in plan | .tiki/prompts/verify/manual-verification.md |
| verify.md | Tests/checks in plan | .tiki/prompts/verify/automated-tests.md |
| verify.md | Verification failures | .tiki/prompts/verify/failure-handling.md |
| list-todos.md | --complete or --delete flag | .tiki/prompts/list-todos/actions.md |
| list-todos.md | --convert flag | .tiki/prompts/list-todos/convert-to-issue.md |
| release-sync.md | Differences found | .tiki/prompts/release-sync/sync-operations.md |
| release-sync.md | Conflicts in two-way mode | .tiki/prompts/release-sync/conflict-resolution.md |
| test-creator.md | mode=before (TDD) | .tiki/prompts/test-creator/tdd-before.md |
| test-creator.md | mode=after | .tiki/prompts/test-creator/after-mode.md |
| test-creator.md | Framework templates needed | .tiki/prompts/test-creator/framework-patterns.md |
| assess-code.md | Generating full report | .tiki/prompts/assess-code/detailed-findings.md |
| assess-code.md | Previous assessment exists | .tiki/prompts/assess-code/historical-comparison.md |
| assess-code.md | --create-issues flag | .tiki/prompts/assess-code/issue-creation.md |

Prompts are read by the orchestrator and passed to sub-agents via Task tool only when needed. This pattern reduced execute.md from ~20,000 tokens to ~1,700 tokens (91% reduction for happy-path execution), debug.md from ~15,400 tokens to ~1,300 tokens (92% reduction for list/show/search operations), map-codebase.md from ~5,865 tokens to ~710 tokens (88% reduction for core STACK.md/CONCERNS.md generation), review-issue.md from ~5,073 tokens to ~1,150 tokens (77% reduction for standard issue reviews), roadmap.md from ~4,748 tokens to ~600 tokens (87% reduction for roadmap visualization), yolo.md from ~4,743 tokens to ~650 tokens (86% reduction for YOLO workflow execution), release-ship.md from ~4,072 tokens to ~650 tokens (84% reduction for basic ship operations), review-queue.md from ~3,866 tokens to ~650 tokens (83% reduction for interactive queue review), release-new.md from ~3,599 tokens to ~575 tokens (84% reduction for release creation), release-add.md from ~3,155 tokens to ~1,200 tokens (62% reduction for single-issue add operations), release-status.md from ~3,355 tokens to ~1,200 tokens (64% reduction for all-releases summary view), verify.md from ~3,352 tokens to ~1,200 tokens (64% reduction for standard verification), list-todos.md from ~2,949 tokens to ~1,200 tokens (59% reduction for listing todos without actions), release-sync.md from ~2,902 tokens to ~1,200 tokens (59% reduction for in-sync state checks), test-creator.md from ~2,771 tokens to ~900 tokens (68% reduction for basic mode selection), and assess-code.md from ~2,641 tokens to ~1,150 tokens (56% reduction for standard assessments).

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
