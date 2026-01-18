## Summary

Add a requirements definition system that allows projects to formally define, track, and verify requirements. This establishes the foundation for release management by creating a structured way to document what the project needs to accomplish.

## Motivation

Tiki currently operates at two levels:
- **Issue level**: `plan-issue`, `execute`, `ship`
- **Project level**: `new-project` (creates PROJECT.md)

There is no formal way to define **requirements** - the high-level goals and capabilities that issues should implement. This feature adds:
- Formal requirements with IDs (`CATEGORY-NN` format)
- Verification criteria for each requirement
- Status tracking (pending, implemented, verified)
- Support for both new and legacy projects

## New Command: `/tiki:define-requirements`

### Purpose
Interactive command to establish or update project requirements.

### Usage
```
/tiki:define-requirements                    # Initial setup or interactive update
/tiki:define-requirements --from-issues      # Seed requirements from open GitHub issues
/tiki:define-requirements --refresh          # Update status based on current codebase
```

### Workflow

#### For New Projects
1. LLM reads PROJECT.md (if exists), CLAUDE.md, and open GitHub issues
2. LLM proposes initial requirements organized by category
3. User refines, adds, removes, or reorganizes requirements
4. Creates `REQUIREMENTS.md` + `.tiki/requirements.json`

#### For Legacy Projects
1. LLM analyzes existing codebase to identify implemented functionality
2. LLM reads open issues to identify planned functionality
3. LLM proposes requirements, marking existing functionality as "implemented"
4. User refines and approves
5. Creates files with accurate status

### Interactive Flow Example

```
/tiki:define-requirements

Analyzing project...

I found:
- CLAUDE.md with project context
- 15 open GitHub issues
- Existing codebase with authentication, API, and testing patterns

## Proposed Requirements

### Core Workflow (from existing code)
- **CORE-01**: User can fetch GitHub issue details
  *Verify: Manual test* - Run `/tiki:get-issue` and confirm output
  *Status: Implemented* (found: get-issue.md)

- **CORE-02**: User can break issue into phases
  *Verify: State check* - Plan file contains phases array
  *Status: Implemented* (found: plan-issue.md)

### Quality (from open issues)
- **QUAL-01**: JSON schema validation for state files
  *Verify: Automated test* - Schema validation passes for all .tiki/*.json
  *Status: Pending* (from issue #36)

---

Options:
1. Accept these requirements
2. Edit a requirement (e.g., "edit CORE-01")
3. Add a new requirement
4. Remove a requirement
5. Change categories
6. Regenerate with different focus
```

### Requirement Properties

Each requirement has:

| Property | Description | Example |
|----------|-------------|---------|
| `id` | Unique identifier in `CATEGORY-NN` format | `CORE-01`, `QUAL-03` |
| `text` | Human-readable description | "User can fetch GitHub issue details" |
| `verification.type` | How to verify | `manual_test`, `automated_test`, `state_check`, `code_review`, `documentation` |
| `verification.description` | Specific verification steps | "Run /tiki:get-issue and confirm output" |
| `status` | Current state | `pending`, `implemented`, `verified` |
| `implementedBy` | Issue numbers that implement this | `[12, 15]` |
| `verifiedAt` | Timestamp of verification | `"2026-01-10T..."` |

### Verification Types

| Type | When to Use | Example |
|------|-------------|---------|
| `manual_test` | UX flows, subjective quality | "Run command and verify output format" |
| `automated_test` | Testable behavior | "Unit tests pass for auth module" |
| `state_check` | Data structure requirements | "Plan file contains phases array" |
| `code_review` | Patterns, conventions | "All commands follow frontmatter format" |
| `documentation` | Docs exist and are accurate | "README includes setup instructions" |

### Category Conventions

Standard categories (can be customized):
- `CORE` - Core functionality
- `PLAN` - Planning features
- `EXEC` - Execution features
- `QUAL` - Quality and validation
- `DOC` - Documentation
- `PERF` - Performance
- `SEC` - Security

## File Structures

### `REQUIREMENTS.md` (Human-readable, project root)

```markdown
# Requirements

## Coverage Summary

The current requirements cover core workflow, planning, and quality.
No gaps detected for v1 scope.

## v1 Requirements

### Core Workflow
- **CORE-01**: User can fetch GitHub issue details
  - *Verify: Manual test* - Run `/tiki:get-issue` and confirm output
  - *Implemented by: #12*

- **CORE-02**: User can break issue into phases
  - *Verify: State check* - Plan file contains phases array
  - *Implemented by: #14*

### Quality
- **QUAL-01**: JSON schema validation for state files
  - *Verify: Automated test* - Schema validation passes

## v2 Requirements (Future)

### Parallel Execution
- **PARALLEL-01**: Independent tasks can run concurrently
  - *Verify: Manual test* - Multiple sub-agents execute simultaneously

## Out of Scope
- Enterprise features (SSO, team management)
- Non-GitHub issue trackers
- GUI/web interface
```

### `.tiki/requirements.json` (Machine-readable)

```json
{
  "version": "1.0",
  "createdAt": "2026-01-18T10:00:00Z",
  "updatedAt": "2026-01-18T15:30:00Z",
  "categories": [
    {
      "id": "core",
      "name": "Core Workflow",
      "requirements": [
        {
          "id": "CORE-01",
          "text": "User can fetch GitHub issue details",
          "verification": {
            "type": "manual_test",
            "description": "Run /tiki:get-issue and confirm output"
          },
          "status": "implemented",
          "implementedBy": [12],
          "verifiedAt": null
        },
        {
          "id": "CORE-02",
          "text": "User can break issue into phases",
          "verification": {
            "type": "state_check",
            "description": "Plan file contains phases array"
          },
          "status": "verified",
          "implementedBy": [14],
          "verifiedAt": "2026-01-15T10:00:00Z"
        }
      ]
    },
    {
      "id": "qual",
      "name": "Quality",
      "requirements": [
        {
          "id": "QUAL-01",
          "text": "JSON schema validation for state files",
          "verification": {
            "type": "automated_test",
            "description": "Schema validation passes for all .tiki/*.json"
          },
          "status": "pending",
          "implementedBy": [],
          "verifiedAt": null
        }
      ]
    }
  ],
  "versions": {
    "v1": ["CORE-01", "CORE-02", "QUAL-01"],
    "v2": ["PARALLEL-01"]
  },
  "outOfScope": [
    "Enterprise features (SSO, team management)",
    "Non-GitHub issue trackers"
  ]
}
```

## Flags and Options

| Flag | Description |
|------|-------------|
| `--from-issues` | Seed initial requirements by analyzing open GitHub issues |
| `--refresh` | Re-analyze codebase and update requirement statuses |
| `--category <name>` | Focus on a specific category |
| `--export` | Export requirements to standalone markdown |

## Edge Cases

### No Existing Requirements
- Create fresh `REQUIREMENTS.md` and `.tiki/requirements.json`
- LLM proposes initial structure based on codebase analysis

### Existing Requirements File
- Load existing requirements
- Offer to update, add, or reorganize
- Preserve existing IDs and statuses

### Conflicting Information
- If codebase shows feature exists but requirement says "pending", prompt user
- If issue is closed but requirement not marked implemented, prompt user

### Empty Project
- Minimal requirements based on PROJECT.md goals
- Suggest common starting categories

## Acceptance Criteria

### Command Functionality
- [ ] `/tiki:define-requirements` command file exists at `.claude/commands/tiki/define-requirements.md`
- [ ] Command analyzes codebase to identify existing functionality
- [ ] Command reads open GitHub issues to identify planned work
- [ ] LLM proposes categorized requirements with `CATEGORY-NN` format
- [ ] User can interactively refine requirements (edit, add, remove, reorganize)
- [ ] Command creates `REQUIREMENTS.md` in project root
- [ ] Command creates `.tiki/requirements.json` with full metadata

### Requirement Properties
- [ ] Each requirement has unique ID in `CATEGORY-NN` format
- [ ] Each requirement has verification type and description
- [ ] Each requirement has status (pending, implemented, verified)
- [ ] Implemented requirements track which issues implemented them
- [ ] Verified requirements track verification timestamp

### Legacy Project Support
- [ ] For existing codebases, LLM marks existing functionality as "implemented"
- [ ] Analysis matches code patterns to potential requirements
- [ ] User confirms or adjusts auto-detected statuses

### File Formats
- [ ] `REQUIREMENTS.md` follows the specified markdown format
- [ ] `.tiki/requirements.json` follows the specified JSON schema
- [ ] Both files stay in sync (changes to one update the other on next run)

### Flags
- [ ] `--from-issues` seeds requirements from open GitHub issues
- [ ] `--refresh` updates statuses based on current codebase state

## Dependencies

- None (this is the foundation for release management)

## Future Integration Points

This feature will be extended by subsequent issues:
- **Release management** will group issues by which requirements they address
- **plan-issue** will prompt for requirement mapping
- **ship** will update requirement status to "implemented"

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ID format | `CATEGORY-NN` | Self-documenting, easier to discuss, supports growth |
| Verification types | 5 types | Covers manual, automated, structural, and documentation verification |
| Dual file format | MD + JSON | Human-readable for review, machine-readable for tooling |
| LLM-driven | Yes | LLM analyzes codebase, proposes requirements, user refines |
| Legacy support | Auto-detect | Makes adoption easy for existing projects |

## References

- Parent issue: #39 (Add unified release management with requirements traceability)
- Workflow documentation: `.tiki/docs/release-workflow.md`
