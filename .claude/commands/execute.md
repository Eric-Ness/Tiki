---
description: Execute a planned issue by spawning sub-agents for each phase. Use when ready to implement an issue that has been planned with /plan-issue.
allowed-tools: Bash, Read, Write, Glob, Grep, Task, Edit
argument-hint: <issue-number> [--from <phase>] [--dry-run]
---

# Execute

Execute a planned issue by spawning sub-agents for each phase. Each phase runs in a fresh context via the Task tool.

## Usage

```
/execute 34
/execute 34 --from 2    # Resume from phase 2
/execute 34 --dry-run   # Preview what would run without executing
```

## Instructions

### Step 1: Validate the Plan Exists

```bash
# Check plan file exists
cat .tiki/plans/issue-<number>.json
```

If no plan exists:
```
No plan found for issue #<number>.
Create one first with `/plan-issue <number>`
```

### Step 2: Read Project Context

Read `CLAUDE.md` (if it exists) to pass to sub-agents:

```bash
cat CLAUDE.md 2>/dev/null || echo "No CLAUDE.md found"
```

### Step 3: Initialize Execution State

Create or update `.tiki/state/current.json`:

```json
{
  "activeIssue": 34,
  "currentPhase": 1,
  "status": "in_progress",
  "startedAt": "2026-01-10T10:00:00Z",
  "lastActivity": "2026-01-10T10:00:00Z",
  "pausedAt": null,
  "completedPhases": []
}
```

Update the plan status to `in_progress`.

### Step 4: Execute Each Phase

For each phase in order (respecting dependencies):

#### 4a. Check Dependencies
If phase has `dependencies: [1, 2]`, verify phases 1 and 2 are completed before starting.

#### 4b. Update State
Set current phase to `in_progress` in both:
- `.tiki/state/current.json` (activePhase)
- `.tiki/plans/issue-N.json` (phase status)

#### 4c. Build Sub-Agent Prompt

Construct the prompt for the Task tool:

```
You are executing Phase <N> of <total> for Issue #<number>: <title>

## Project Context
<contents of CLAUDE.md or "No project context file found">

## Previous Phase Summaries
<For each completed phase>
- Phase <N>: <title> - <summary>
</For each>

## Current Phase: <phase title>

<phase content from plan>

## Files You May Need to Modify
<files array from phase>

## Verification Checklist
<verification array from phase>

## Instructions
1. Execute this phase completely - make actual code changes
2. Run any relevant tests to verify your changes
3. If you discover issues needing future attention, clearly note them at the end with "DISCOVERED:" prefix
4. When done, provide a summary starting with "SUMMARY:" that describes what you accomplished
```

#### 4d. Spawn Sub-Agent

Use the Task tool to spawn a sub-agent:

```
Task tool call:
- subagent_type: "general-purpose"
- prompt: <constructed prompt from 4c>
- description: "Execute phase N of issue #X"
```

#### 4e. Process Sub-Agent Response

After the sub-agent completes:

1. **Extract summary** - Look for "SUMMARY:" in the response
2. **Extract discovered items** - Look for "DISCOVERED:" items
3. **Update phase in plan**:
   - Set `status: "completed"`
   - Set `summary: <extracted summary>`
   - Set `completedAt: <current timestamp>`
4. **Update state file**:
   - Add to `completedPhases` array
   - Update `lastActivity`
5. **Add discovered items to queue** (if any):
   - Append to `.tiki/queue/pending.json`

#### 4f. Report Progress

After each phase:
```
Phase <N>/<total> complete: <phase title>
Summary: <summary>
<discovered items if any>
```

### Step 5: Handle Completion

When all phases are done:

1. Update plan status to `completed`
2. Update state:
   - Set `status: "completed"`
   - Clear `activeIssue` and `currentPhase`
3. Display completion message:

```
## Execution Complete

Issue #<number>: <title>
All <N> phases completed successfully.

### Phase Summaries
- Phase 1: <summary>
- Phase 2: <summary>
- Phase 3: <summary>

### Queue Items
<N> items discovered during execution.
Review with `/review-queue`

### Next Steps
- Review queue items: `/review-queue`
- Close the issue: `gh issue close <number>`
- View state: `/state`
```

## Sub-Agent Prompt Template

```
You are executing Phase {phase_number} of {total_phases} for Issue #{issue_number}: {issue_title}

## Project Context
{claude_md_contents}

## Previous Phase Summaries
{previous_summaries}

## Current Phase: {phase_title}

{phase_content}

## Files You May Need to Modify
{files_list}

## Verification Checklist
{verification_list}

## Instructions
1. Execute this phase completely - make actual code changes
2. Run any relevant tests to verify your changes
3. If you discover issues needing future attention, clearly note them with "DISCOVERED:" prefix
4. When done, provide a summary starting with "SUMMARY:" describing what you accomplished

Important:
- Focus ONLY on this phase - do not work ahead
- If blocked, explain why and what would unblock you
- Keep your summary concise but complete
```

## State File Updates

### During Execution

`.tiki/state/current.json`:
```json
{
  "activeIssue": 34,
  "currentPhase": 2,
  "status": "in_progress",
  "startedAt": "2026-01-10T10:00:00Z",
  "lastActivity": "2026-01-10T11:00:00Z",
  "pausedAt": null,
  "completedPhases": [
    {
      "number": 1,
      "title": "Setup auth middleware",
      "summary": "Created JWT validation middleware with proper error handling",
      "completedAt": "2026-01-10T10:45:00Z"
    }
  ]
}
```

### After Completion

`.tiki/state/current.json`:
```json
{
  "activeIssue": null,
  "currentPhase": null,
  "status": "idle",
  "startedAt": null,
  "lastActivity": "2026-01-10T12:00:00Z",
  "pausedAt": null,
  "completedPhases": []
}
```

## Queue Items

When a sub-agent discovers items, add to `.tiki/queue/pending.json`:

```json
{
  "items": [
    {
      "id": "q-001",
      "type": "potential-issue",
      "title": "Consider adding rate limiting to login endpoint",
      "description": "During Phase 2 implementation, noticed no rate limiting on auth endpoints",
      "source": {
        "issue": 34,
        "phase": 2
      },
      "createdAt": "2026-01-10T11:00:00Z"
    }
  ]
}
```

## Error Handling

### Phase Failure

If a sub-agent reports failure or errors:

1. Set phase status to `failed`
2. Record error in phase
3. Pause execution
4. Report to user:

```
Phase <N> failed: <phase title>
Error: <error description>

Options:
- Fix and retry: `/execute <number> --from <N>`
- Skip this phase: `/skip-phase <N>`
- Heal automatically: `/heal <N>`
```

### Missing Dependencies

If a phase's dependencies aren't met:

```
Cannot execute Phase <N>: dependencies not satisfied.
Required: Phase <deps> must be completed first.
```

### Context Warning

If context is getting low (this is heuristic - sub-agents manage their own context):

```
Note: Large phase detected. Sub-agent may need to break work into smaller steps.
```

## Options

### --from N

Resume execution from a specific phase:
```
/execute 34 --from 3
```

Skip phases 1-2, start at phase 3. Useful for:
- Resuming after a failure
- Re-running a specific phase

### --dry-run

Preview execution without actually running:
```
/execute 34 --dry-run

Would execute:
- Phase 1: Setup auth middleware (pending)
- Phase 2: Add login endpoint (pending)
- Phase 3: Add protected routes (pending)

No changes will be made.
```

## Example Execution Flow

```
User: /execute 34

Claude: Starting execution of Issue #34: Add user authentication
        Plan has 3 phases.

        ## Phase 1/3: Setup auth middleware
        [Spawns sub-agent via Task tool]
        [Sub-agent works... makes code changes... runs tests]

        Phase 1/3 complete: Setup auth middleware
        Summary: Created auth middleware with JWT validation, added AuthRequest type

        ## Phase 2/3: Add login endpoint
        [Spawns sub-agent via Task tool]
        [Sub-agent works... makes code changes... runs tests]

        Phase 2/3 complete: Add login endpoint
        Summary: Implemented POST /api/login with password validation and JWT generation
        DISCOVERED: Consider adding rate limiting to prevent brute force

        ## Phase 3/3: Add protected routes
        [Spawns sub-agent via Task tool]
        [Sub-agent works... makes code changes... runs tests]

        Phase 3/3 complete: Add protected routes
        Summary: Applied auth middleware to /api/user routes, added tests

        ---
        ## Execution Complete

        Issue #34: Add user authentication
        All 3 phases completed successfully.

        ### Queue Items
        1 item discovered during execution.
        Review with `/review-queue`
```

## Notes

- Each sub-agent runs with fresh context (no memory of previous phases except summaries)
- Summaries should be concise but capture key decisions and changes
- The Task tool's sub-agent has access to all file tools (Read, Write, Edit, etc.)
- If a phase is complex, the sub-agent can take multiple turns to complete it
- State is persisted after each phase, so work is not lost if execution is interrupted
