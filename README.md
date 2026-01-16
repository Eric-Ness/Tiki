# Tiki - Task Iteration & Knowledge Interface

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

### 2. Review the Issue (Optional)

```
/tiki:review-issue 34
```

Analyzes the issue before planning to identify concerns, alternatives, and clarifying questions. Helps catch scope issues or missing dependencies early.

### 3. Plan the Issue

```
/tiki:plan-issue 34
```

Creates a phased execution plan. If the issue is too large for one context window, it breaks it into multiple phases. Plans are stored in `.tiki/plans/issue-34.json`.

### 4. Audit the Plan (Optional)

```
/tiki:audit-plan 34
```

Validates the plan: checks phase sizes, dependencies, file conflicts, and verification steps.

### 5. Execute

```
/tiki:execute 34
```

Runs each phase sequentially by spawning sub-agents. Each sub-agent gets:
- Fresh context
- Phase instructions
- Summaries from completed phases

### 6. Review Discoveries

```
/tiki:review-queue
```

Review items discovered during execution (potential issues, questions, blockers). Create GitHub issues or dismiss items.

## Commands Reference

### Core Workflow

| Command | Description |
|---------|-------------|
| `/tiki:add-issue [title]` | Create a new issue with intelligent prompting |
| `/tiki:get-issue <number>` | Fetch and display a GitHub issue |
| `/tiki:review-issue <number>` | Review an issue before planning (identify concerns, alternatives) |
| `/tiki:research <topic>` | Research unfamiliar domains before planning |
| `/tiki:plan-issue <number>` | Create a phased execution plan with success criteria, backward planning, and research integration |
| `/tiki:execute <number>` | Execute a planned issue phase by phase |
| `/tiki:ship <number>` | Complete an issue: commit, push, and close |
| `/tiki:yolo [number]` | Full automated workflow: get → review → plan → audit → execute |
| `/tiki:whats-next` | Show current status and suggested next action |

### Execution Control

| Command | Description |
|---------|-------------|
| `/tiki:pause` | Save current state mid-execution |
| `/tiki:resume` | Resume paused work with full context |
| `/tiki:skip-phase <number>` | Skip a phase and move to the next |
| `/tiki:redo-phase <number>` | Re-execute a completed phase |
| `/tiki:heal` | Auto-diagnose and fix a failed phase |
| `/tiki:debug [issue\|session]` | Start systematic debugging session with hypothesis tracking |
| `/tiki:debug --search "query"` | Search past debug sessions by keyword, status, or file |

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

### Testing

| Command              | Description                                                         |
|----------------------|---------------------------------------------------------------------|
| `/tiki:test-creator` | Create tests following TDD workflow (before/after/ask/never modes)  |

### Utilities

| Command              | Description                                              |
|----------------------|----------------------------------------------------------|
| `/tiki:cleanup`      | Remove temporary file artifacts (tmpclaude-*, nul, etc.) |
| `/tiki:update-tiki`  | Self-update Tiki to the latest version                   |

## Typical Workflow

```
User: /tiki:get-issue 34

Claude: Issue #34: Add user authentication
        Priority: High
        Labels: feature, backend

        [Issue description...]

User: /tiki:plan-issue 34

Claude: Extracting success criteria from issue...
        Found 3 explicit criteria, generating 2 additional criteria.

        Working backward from criteria to derive phases...

        Created plan with 3 phases:

        Phase 1: Setup auth middleware
        Phase 2: Add login endpoint
        Phase 3: Add protected routes

        Criteria coverage: 5/5 (100%)
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

## Debugging Workflow

```
User: /tiki:debug #42

Claude: ## Related Past Debug Sessions Found

        Before starting a new session, you may want to review:

        1. issue-15-login-encoding (Resolved) - URL encoding issue in auth
           View: /tiki:debug show issue-15-login-encoding

        Continue with new session? [Yes/Review/Cancel]

User: Continue

Claude: Starting debug session for Issue #42: Login fails for some users

        What symptoms are you seeing?

User: POST /api/login returns 500 for users with + in email

Claude: Recorded symptoms. Based on this, here are possible hypotheses:
        1. Email encoding issue in request parsing
        2. Database query not escaping special characters
        3. Validation regex rejecting valid emails

        Which would you like to test first?

User: 1

Claude: Testing: Email encoding issue
        [Runs diagnostic tests...]

        Result: Email is correctly decoded in request body.
        Marking as NOT THE CAUSE.

        Next hypothesis?

User: 2

Claude: Testing: Database query escaping
        [Examines query code, runs test...]

        FOUND IT! The query uses string interpolation without escaping.

        Resolution: Use parameterized query.

        Mark as resolved?

User: yes

Claude: Session resolved. Summary saved to .tiki/debug/issue-42-login-500.md
        Debug index updated.
```

### Debug History Features

- **Auto-detect similar sessions**: When starting a new debug session, Tiki checks for past sessions with similar error patterns and offers to show relevant solutions
- **Search history**: Use `/tiki:debug --search "query"` to search past sessions by keyword, status, or affected file
- **Integration with heal/execute**: When a phase fails, related debug history is shown to help diagnose the issue faster
- **Index**: Debug sessions are indexed in `.tiki/debug/index.json` for fast lookup

```
# Search examples
/tiki:debug --search "connection timeout"
/tiki:debug --search "auth" --status resolved
/tiki:debug --search "500" --file "api.ts"
```

Resume previous sessions with `/tiki:debug --resume` or `/tiki:debug show session-name`.

## Research Workflow

Use `/tiki:research` to investigate unfamiliar technologies or domains before planning.

### Usage

```bash
/tiki:research react-query                    # Research a topic
/tiki:research #42                            # Research topics from an issue
/tiki:research "authentication for Next.js"  # Free-form query
/tiki:research topic --refresh                # Force refresh existing research
/tiki:research topic --quick                  # Quick mode (fewer dimensions)
```

### Research Dimensions

| Dimension             | Full Mode | Quick Mode     |
|-----------------------|-----------|----------------|
| Ecosystem Analysis    | ✓         | ✓ (condensed)  |
| Architecture Patterns | ✓         | -              |
| Best Practices        | ✓         | ✓              |
| Common Pitfalls       | ✓         | -              |
| Recommendations       | ✓         | ✓              |

### Output

Research is saved to `.tiki/research/[topic]/research.md` with:

- Executive summary
- Detailed findings per dimension
- Sources with confidence levels
- Specific recommendations for your project

### Example

```text
User: /tiki:research "GraphQL vs REST for mobile app"

Claude: Researching: GraphQL vs REST for mobile app

        Spawning research agents...
        [1/5] Ecosystem Analysis... Done
        [2/5] Architecture Patterns... Done
        [3/5] Best Practices... Done
        [4/5] Common Pitfalls... Done
        [5/5] Recommendations... Done

        Research complete. Saved to:
        .tiki/research/graphql-vs-rest-mobile-app/research.md

        Key Recommendations:
        - GraphQL recommended for mobile due to reduced over-fetching
        - Use Apollo Client for caching and offline support
        - Consider hybrid approach: GraphQL for complex queries, REST for simple CRUD
```

### Integration with Planning

Research is automatically integrated into the planning workflow:

1. **Auto-detection**: `/plan-issue` scans the issue for technology keywords and matches against your research library

2. **Context injection**: Relevant recommendations and pitfalls are included in the plan context

3. **Phase guidance**: Phase descriptions reference research findings where applicable

4. **Freshness warnings**: Stale research (>30 days old) triggers a refresh suggestion

#### Planning with Research Context

```text
User: /tiki:plan-issue 42

Claude:
## Plan for Issue #42: Add React Query caching

### Research Context

Relevant research found:
- **react-query** (researched 3 days ago)

#### Key Recommendations
- Use React Query for server state management
- Implement stale-while-revalidate pattern
- Avoid: Mixing server and client state

### Phases
...
```

#### Skipping Research Integration

Use `--no-research` to plan without research context:

```
/tiki:plan-issue 42 --no-research
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
├── learned/             # Patterns for CLAUDE.md updates
│   └── patterns.json
├── debug/               # Debug session documents
│   ├── index.json       # Searchable index of all sessions
│   ├── issue-42-login-500.md
│   └── archive/         # Archived sessions
└── research/            # Domain research documents
    ├── index.json       # Research index for lookup
    └── react-query/
        └── research.md
```

## Plan File Format

Plans are stored as JSON with phase details and success criteria:

```json
{
  "issue": {
    "number": 34,
    "title": "Add user authentication",
    "url": "https://github.com/owner/repo/issues/34"
  },
  "status": "in_progress",
  "successCriteria": [
    { "category": "functional", "description": "User can log in with valid credentials" },
    { "category": "functional", "description": "Invalid credentials return appropriate error" },
    { "category": "non-functional", "description": "Login response time under 500ms" },
    { "category": "testing", "description": "Unit tests cover auth middleware functions" },
    { "category": "documentation", "description": "API docs updated with auth endpoints" }
  ],
  "phases": [
    {
      "number": 1,
      "title": "Setup auth middleware",
      "status": "completed",
      "dependencies": [],
      "files": ["src/middleware/auth.ts"],
      "addressesCriteria": ["functional-1", "functional-2", "testing-1"],
      "content": "Create the authentication middleware...",
      "verification": ["Middleware file exists", "No TypeScript errors"],
      "summary": "Created auth middleware with JWT validation"
    }
  ],
  "coverageMatrix": {
    "functional-1": { "phases": [1, 2], "tasks": [1, 3] },
    "functional-2": { "phases": [1, 3], "tasks": [2, 4] },
    "non-functional-1": { "phases": [2], "tasks": [3] },
    "testing-1": { "phases": [1], "tasks": [2] },
    "documentation-1": { "phases": [3], "tasks": [5] }
  }
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
  "hooks": {
    "testValidator": {
      "enabled": true,
      "runOn": ["phase-complete", "commit"]
    }
  },
  "adr": {
    "autoGenerate": true,
    "directory": ".tiki/adr"
  }
}
```

### Testing Configuration

| Setting | Values | Description |
|---------|--------|-------------|
| `testing.createTests` | `"before"`, `"after"`, `"ask"`, `"never"` | When to create tests (default: `"ask"`) |
| `testing.testFramework` | `"auto-detect"`, `"jest"`, `"vitest"`, `"pytest"`, `"go"`, `"mocha"`, `"cargo"` | Test framework to use (default: `"auto-detect"`) |
| `hooks.testValidator.enabled` | `true`, `false` | Run tests on phase completion/commit |
| `hooks.testValidator.runOn` | `["phase-complete", "commit"]` | When to run test validation |

### ADR Configuration

| Setting | Values | Description |
|---------|--------|-------------|
| `adr.autoGenerate` | `true`, `false` | Auto-generate ADRs for significant decisions |
| `adr.directory` | path string | Where to store ADR files (default: `".tiki/adr"`) |

## Test-Driven Development (TDD)

Tiki supports TDD workflows through the `/tiki:test-creator` command and integration with `/tiki:execute`.

### TDD Modes

| Mode | Description |
|------|-------------|
| `before` | Write failing tests first, then implement (true TDD) |
| `after` | Implement first, then write tests |
| `ask` | Prompt for preference on each task (default) |
| `never` | Skip test creation |

### Supported Test Frameworks

Tiki auto-detects your test framework:

| Framework | Language | Detection |
|-----------|----------|-----------|
| jest | JavaScript/TypeScript | `jest` in package.json |
| vitest | JavaScript/TypeScript | `vitest` in package.json |
| mocha | JavaScript/TypeScript | `mocha` in package.json |
| pytest | Python | `pytest` in pyproject.toml/requirements |
| go test | Go | `*_test.go` files |
| cargo test | Rust | `Cargo.toml` |

### Using TDD with Execute

When running `/tiki:execute`, you can enable TDD:

```bash
/tiki:execute 34 --tdd          # Enable TDD (tests before implementation)
/tiki:execute 34 --no-tdd       # Disable TDD for this execution
/tiki:execute 34                # Use config setting (default: ask)
```

### TDD Workflow Example

```text
User: /tiki:execute 34 --tdd

Claude: ## Phase 1: Add calculateTotal utility

        ### TDD: Writing Tests First

        Analyzing phase requirements...

        Creating test file: `src/utils/__tests__/calculateTotal.test.ts`
        Framework: vitest

        Tests written:
        - should sum item prices correctly
        - should apply discount when provided
        - should throw on negative prices
        - should return 0 for empty array

        Running tests to confirm failure...

        $ npx vitest run src/utils/__tests__/calculateTotal.test.ts

        FAIL  src/utils/__tests__/calculateTotal.test.ts
        Tests: 4 failed, 4 total

        ### Implementing Code

        [Spawns sub-agent to implement...]

        Created: src/utils/calculateTotal.ts

        ### Verifying Tests Pass

        $ npx vitest run src/utils/__tests__/calculateTotal.test.ts

        PASS  src/utils/__tests__/calculateTotal.test.ts
        Tests: 4 passed, 4 total

        Phase 1 complete (TDD verified)
```

### Direct Test Creation

Create tests independently with:

```bash
/tiki:test-creator                           # Use config settings
/tiki:test-creator --mode before             # Force TDD mode
/tiki:test-creator --mode after              # Force tests after implementation
/tiki:test-creator --framework pytest        # Force specific framework
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
