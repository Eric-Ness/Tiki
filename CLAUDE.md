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
├── adr/                # Architecture Decision Records
└── knowledge/          # Institutional knowledge entries
```

#### Multi-Execution Model (Schema v2)

The state schema v2 supports multiple concurrent executions. Files without a `version` field are treated as v1 (legacy single-execution format).

**v2 State Structure:**
```json
{
  "version": 2,
  "status": "executing",
  "activeExecutions": [
    {
      "id": "exec-42-a1b2c3d4",
      "issue": 42,
      "issueTitle": "Feature implementation",
      "status": "executing",
      "currentPhase": 3,
      "totalPhases": 5,
      "startedAt": "2026-01-30T10:00:00.000Z",
      "completedPhases": [
        { "number": 1, "title": "Setup", "completedAt": "...", "summary": "..." },
        { "number": 2, "title": "Core", "completedAt": "...", "summary": "..." }
      ],
      "planFile": ".tiki/plans/issue-42.json"
    }
  ],
  "executionHistory": [],
  "lastActivity": "2026-01-30T12:00:00.000Z",
  "activeIssue": 42,
  "currentPhase": 3
}
```

**Execution ID Format:**
- Standard issues: `exec-{issue}-{8-char-uuid}` (e.g., `exec-42-a1b2c3d4`)
- Release workflows: `exec-release-{version}-{uuid}` (e.g., `exec-release-1.2.0-abcd1234`)
- Migrated from v1: `exec-{issue}-migrated` (e.g., `exec-42-migrated`)

**Execution Status Values:**
- `executing` - Phase work in progress
- `paused` - User paused execution
- `failed` - Phase verification failed
- `completed` - All phases finished (moved to history)

**Archived Executions:** Completed/failed executions move to `executionHistory` with `endedAt` timestamp and summary.

**Deprecated v1 Fields:** For Tiki.Desktop compatibility, v2 state maintains deprecated top-level fields (`activeIssue`, `currentPhase`, `status`, `startedAt`, `completedPhases`, etc.) synced from the first active execution. When `activeExecutions` is empty, deprecated fields are set to `null`.

**Migration:** V1 state (no `version` field) is auto-detected and migrated on first write. The migration creates an execution object from v1 fields using `exec-{issue}-migrated` ID format. See `.tiki/prompts/state/migration.md` for implementation details.

**Stale Execution Detection:** Executions inactive for extended periods are flagged with `isStale: true` and `staledAt` timestamp for cleanup.

### Knowledge System

Institutional knowledge is automatically captured and surfaced:

**Storage:** `.tiki/knowledge/`

- `index.json` - Fast lookup with keywords
- `entries/KNNN.json` - Individual knowledge entries

**Automatic Capture:**

- During execute: Sub-agents emit `KNOWLEDGE:` markers for non-obvious solutions
- After ship: Synthesized entry from phase summaries (if enabled in config)

**Manual Commands:** `/tiki:knowledge add|edit|show|list|search|archive`

**Configuration:** `.tiki/config.json` `knowledge.autoCapture`, `knowledge.captureOnShip`, `knowledge.minPhasesForCapture`

**Retrieval:** Surfaces during `/tiki:plan-issue` and `/tiki:review-issue` when related entries exist

### Extensions System

Tiki supports project-specific extensibility through custom commands and lifecycle hooks.

**Configuration:** `.tiki/config.json`
```json
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
```

**Lifecycle Hooks:** Shell scripts in `.tiki/hooks/` that auto-run at workflow points:

| Hook | Trigger | Env Vars |
|------|---------|----------|
| pre-ship | Before ship commits | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE |
| post-ship | After ship completes | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE, TIKI_COMMIT_SHA |
| pre-execute | Before execution starts | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE, TIKI_TOTAL_PHASES |
| post-execute | After all phases | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE, TIKI_PHASES_COMPLETED |
| pre-commit | Before commit | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE, TIKI_PHASE_NUMBER |
| post-commit | After commit | TIKI_ISSUE_NUMBER, TIKI_ISSUE_TITLE, TIKI_PHASE_NUMBER, TIKI_COMMIT_SHA |
| phase-start | Before each phase | TIKI_ISSUE_NUMBER, TIKI_PHASE_NUMBER, TIKI_PHASE_TITLE |
| phase-complete | After each phase | TIKI_ISSUE_NUMBER, TIKI_PHASE_NUMBER, TIKI_PHASE_STATUS |

**Windows Support:** Hooks can be `.sh` (Git Bash) or `.ps1` (PowerShell). Git Bash auto-detected.

**Manual Trigger:** `/tiki:hook-run <name> [--env KEY=VALUE]`

**Custom Commands:** Place command files in `.tiki/commands/` following Claude Code command format.

### Schema Validation

JSON Schema files in `.tiki/schemas/` document the expected structure of state files:

| Schema | Validates | Purpose |
|--------|-----------|---------|
| `config.schema.json` | `.tiki/config.json` | Project settings |
| `plan.schema.json` | `.tiki/plans/issue-N.json` | Phased execution plans |
| `state.schema.json` | `.tiki/state/current.json` | Active execution state |
| `queue.schema.json` | `.tiki/queue/pending.json` | Discovered items |
| `todos.schema.json` | `.tiki/todos.json` | Backlog items |
| `knowledge.schema.json` | `.tiki/knowledge/entries/KNNN.json` | Knowledge entries |
| `knowledge-index.schema.json` | `.tiki/knowledge/index.json` | Knowledge index |

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
| execute.md | KNOWLEDGE markers found | .tiki/prompts/execute/knowledge-capture.md |
| execute.md | Hook exists | .tiki/prompts/hooks/execute-hook.md |
| execute.md | Windows platform | .tiki/prompts/hooks/windows-support.md |
| debug.md | Starting new session | .tiki/prompts/debug/start-session.md |
| debug.md | Hypothesis workflow | .tiki/prompts/debug/hypothesis-tracking.md |
| debug.md | Marking resolved/abandoned | .tiki/prompts/debug/resolution-recording.md |
| debug.md | After session changes | .tiki/prompts/debug/index-management.md |
| map-codebase.md | --conventions or --all-docs | .tiki/prompts/map-codebase/conventions-doc.md |
| map-codebase.md | --testing or --all-docs | .tiki/prompts/map-codebase/testing-doc.md |
| map-codebase.md | --integrations or --all-docs | .tiki/prompts/map-codebase/integrations-doc.md |
| map-codebase.md | --update-claude | .tiki/prompts/map-codebase/claude-update.md |
| review-issue.md | Knowledge index exists | .tiki/prompts/review-issue/knowledge-context.md |
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
| audit-plan.md | --verbose flag | .tiki/prompts/audit-plan/detailed-explanations.md |
| audit-plan.md | Audit issues found | .tiki/prompts/audit-plan/fix-suggestions.md |
| ship.md | Tiki repo version bump | .tiki/prompts/ship/version-bump.md |
| ship.md | Issue in release | .tiki/prompts/ship/release-progress.md |
| ship.md | Knowledge capture enabled | .tiki/prompts/ship/knowledge-synthesis.md |
| ship.md | Hook exists | .tiki/prompts/hooks/execute-hook.md |
| ship.md | Windows platform | .tiki/prompts/hooks/windows-support.md |
| new-project.md | Phase 2: Deep questioning | .tiki/prompts/new-project/deep-questioning.md |
| new-project.md | Phase 3: Template generation | .tiki/prompts/new-project/project-templates.md |
| new-project.md | Phase 4: Research selected | .tiki/prompts/new-project/research-agents.md |
| new-project.md | Phase 5: Requirements scoping | .tiki/prompts/new-project/feature-scoping.md |
| new-project.md | Phase 6: Issue generation | .tiki/prompts/new-project/issue-generation.md |
| new-project.md | Brownfield detection | .tiki/prompts/new-project/tech-stack-analysis.md |
| whats-next.md | Output format templates | .tiki/prompts/whats-next/state-suggestions.md |
| add-issue.md | Issue type detection | .tiki/prompts/add-issue/label-suggestions.md |
| add-issue.md | Clarifying questions | .tiki/prompts/add-issue/question-templates.md |
| add-todo.md | Todo format and ID generation | .tiki/prompts/add-todo/todo-format.md |
| add-todo.md | Usage examples | .tiki/prompts/add-todo/examples.md |
| adr.md | Creating new ADR | .tiki/prompts/adr/create-workflow.md |
| adr.md | List/show/update operations | .tiki/prompts/adr/list-show-update.md |
| adr.md | Auto-generation during execution | .tiki/prompts/adr/auto-generation.md |
| create-issues.md | --from-assessment flag | .tiki/prompts/create-issues/from-assessment.md |
| heal.md | Error diagnosis | .tiki/prompts/heal/error-handlers.md |
| heal.md | Fix approach selection | .tiki/prompts/heal/strategies.md |
| hook-run.md | Auto-populating context | .tiki/prompts/hooks/manual-trigger.md |
| knowledge.md | add subcommand | .tiki/prompts/knowledge/add-entry.md |
| knowledge.md | search/list subcommand | .tiki/prompts/knowledge/search-display.md |
| release-remove.md | Helper function implementations | .tiki/prompts/release-remove/helper-functions.md |
| release-remove.md | Orphaned requirements handling | .tiki/prompts/release-remove/orphaned-requirements.md |
| discuss-phases.md | Phase adjustment operations | .tiki/prompts/discuss-phases/operations.md |
| redo-phase.md | Edge cases and examples | .tiki/prompts/redo-phase/examples-and-edge-cases.md |
| skip-phase.md | Validation checks | .tiki/prompts/skip-phase/validation-checks.md |
| skip-phase.md | State updates | .tiki/prompts/skip-phase/state-updates.md |
| skip-phase.md | Examples and edge cases | .tiki/prompts/skip-phase/examples-and-edge-cases.md |
| pick-issue.md | Scoring and dependency detection | .tiki/prompts/pick-issue/scoring-algorithm.md |
| pick-issue.md | Output formatting | .tiki/prompts/pick-issue/output-formats.md |
| plan-issue.md | Knowledge index exists | .tiki/prompts/plan-issue/knowledge-retrieval.md |
| resume.md | Context verification | .tiki/prompts/resume/context-verification.md |
| resume.md | Execution continuation | .tiki/prompts/resume/execution-options.md |
| resume.md | Edge cases | .tiki/prompts/resume/edge-cases.md |
| state.md | Release context lookup | .tiki/prompts/state/release-context.md |
| state.md | Context budget estimation | .tiki/prompts/state/context-budget.md |
| state.md | Output formatting | .tiki/prompts/state/output-formats.md |
| update-claude.md | Gathering patterns | .tiki/prompts/update-claude/pattern-detection.md |
| update-claude.md | Applying changes | .tiki/prompts/update-claude/section-updates.md |
| update-claude.md | --interactive flag | .tiki/prompts/update-claude/interactive-mode.md |
| commit.md | Message format needed | .tiki/prompts/commit/message-format.md |
| commit.md | Staging workflow | .tiki/prompts/commit/staging-workflow.md |
| commit.md | Examples requested | .tiki/prompts/commit/examples.md |
| commit.md | Hook exists | .tiki/prompts/hooks/execute-hook.md |
| commit.md | Windows platform | .tiki/prompts/hooks/windows-support.md |
| update-tiki.md | Update workflow | .tiki/prompts/update-tiki/update-workflow.md |
| update-tiki.md | Error handling | .tiki/prompts/update-tiki/error-handling.md |
| update-tiki.md | Example outputs | .tiki/prompts/update-tiki/example-outputs.md |
| release-review.md | Warnings/blockers found | .tiki/prompts/release-review/deep-dive.md |
| release-review.md | After deep-dive | .tiki/prompts/release-review/github-comment.md |
| release-review.md | All issues reviewed | .tiki/prompts/release-review/summary-table.md |

Prompts are read by the orchestrator and passed to sub-agents via Task tool only when needed. This pattern reduced execute.md from ~20,000 tokens to ~1,700 tokens (91% reduction for happy-path execution), debug.md from ~15,400 tokens to ~1,300 tokens (92% reduction for list/show/search operations), map-codebase.md from ~5,865 tokens to ~710 tokens (88% reduction for core STACK.md/CONCERNS.md generation), review-issue.md from ~5,073 tokens to ~1,150 tokens (77% reduction for standard issue reviews), roadmap.md from ~4,748 tokens to ~600 tokens (87% reduction for roadmap visualization), yolo.md from ~4,743 tokens to ~650 tokens (86% reduction for YOLO workflow execution), release-ship.md from ~4,072 tokens to ~650 tokens (84% reduction for basic ship operations), review-queue.md from ~3,866 tokens to ~650 tokens (83% reduction for interactive queue review), release-new.md from ~3,599 tokens to ~575 tokens (84% reduction for release creation), release-add.md from ~3,155 tokens to ~1,200 tokens (62% reduction for single-issue add operations), release-status.md from ~3,355 tokens to ~1,200 tokens (64% reduction for all-releases summary view), verify.md from ~3,352 tokens to ~1,200 tokens (64% reduction for standard verification), list-todos.md from ~2,949 tokens to ~1,200 tokens (59% reduction for listing todos without actions), release-sync.md from ~2,902 tokens to ~1,200 tokens (59% reduction for in-sync state checks), test-creator.md from ~2,771 tokens to ~900 tokens (68% reduction for basic mode selection), assess-code.md from ~2,641 tokens to ~1,150 tokens (56% reduction for standard assessments), audit-plan.md from ~2,444 tokens to ~850 tokens (65% reduction for basic audits), ship.md from ~2,389 tokens to ~700 tokens (71% reduction for basic shipping), new-project.md from ~2,176 tokens to ~1,800 tokens (orchestrator with 4 conditional prompts for deep questioning, research agents, feature scoping, and issue generation), whats-next.md from ~1,963 tokens to ~700 tokens (64% reduction for status display), state.md from ~1,910 tokens to ~700 tokens (63% reduction for state display), add-issue.md from ~1,911 tokens to ~700 tokens (63% reduction for issue creation), adr.md from ~1,875 tokens to ~650 tokens (65% reduction for ADR management), add-todo.md from ~600 tokens to ~350 tokens (42% reduction for todo management), create-issues.md from ~1,653 tokens to ~500 tokens (70% reduction for batch issue creation), heal.md from ~1,578 tokens to ~600 tokens (62% reduction for auto-healing), release-remove.md from ~1,553 tokens to ~600 tokens (61% reduction for issue removal), discuss-phases.md from ~1,534 tokens to ~600 tokens (61% reduction for phase discussion), redo-phase.md from ~1,514 tokens to ~550 tokens (64% reduction for phase redo), skip-phase.md from ~949 tokens to ~500 tokens (47% reduction for phase skipping), pick-issue.md from ~985 tokens to ~500 tokens (49% reduction for issue picking), resume.md from ~969 tokens to ~500 tokens (48% reduction for resume workflow), update-claude.md from ~1,938 tokens to ~400 tokens (79% reduction for CLAUDE.md updates), commit.md from ~876 tokens to ~450 tokens (49% reduction for Tiki-aware commits), and update-tiki.md from ~529 tokens to ~300 tokens (43% reduction for Tiki updates).

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
