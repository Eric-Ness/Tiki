# Starting a New Project

This guide walks you through using `/tiki:new-project` to initialize a greenfield project from scratch.

## Overview

Tiki is designed around GitHub issues, but what if you don't have any issues yet? The `/tiki:new-project` command bridges this gap by guiding you from initial idea to GitHub issues ready for execution.

**The Flow:**

```
Idea → Deep Questioning → Research → Requirements → GitHub Issues → /tiki:yolo
```

## Quick Start

```bash
/tiki:new-project
```

That's it. The command will guide you through each phase interactively.

## What Happens

### Phase 1: Setup

Tiki checks your environment:

- **Existing PROJECT.md?** — Offers to view, overwrite, or cancel
- **Existing code detected?** — Offers to run `/tiki:map-codebase` first (recommended for brownfield projects)
- **Git repo?** — Initializes one if needed

### Phase 2: Deep Questioning

Unlike a rigid questionnaire, Tiki follows a conversational approach:

1. **Opens with:** "What do you want to build?"
2. **Follows threads** from your response
3. **Challenges vagueness** — pushes abstract ideas into concrete scenarios
4. **Surfaces assumptions** — uncovers hidden decisions
5. **Finds edges** — explores what's explicitly NOT in scope

**Example conversation:**

```
Claude: What do you want to build?

You: A task management app for teams.

Claude: When someone opens this app, what's the first thing they do?

You: They see their assigned tasks.

Claude: What makes a task "assigned" to them? Is there a team structure,
        or is it more like a shared list where anyone can grab tasks?

You: Teams with managers who assign work.

Claude: So there's a hierarchy — managers assign to team members. Can team
        members reassign to each other, or only managers can assign?
...
```

The goal is to gather enough context to write a clear PROJECT.md.

### Phase 3: Generate PROJECT.md

Based on the conversation, Tiki creates:

- `PROJECT.md` — Human-readable project context
- `.tiki/project-config.json` — Structured data for tooling

**PROJECT.md includes:**

- Vision statement
- Core problem being solved
- Target users and their needs
- Technical constraints
- Initial requirements (as hypotheses)
- Success criteria
- Explicit non-goals

### Phase 4: Research (Optional)

If you're entering an unfamiliar domain, research helps you avoid common mistakes.

**What happens:**

Tiki spawns 4 parallel research agents:

| Agent | Question | Output |
|-------|----------|--------|
| Stack | What's the standard tech stack for this domain? | STACK.md |
| Features | What features do users expect? | FEATURES.md |
| Architecture | How are similar systems structured? | ARCHITECTURE.md |
| Pitfalls | What mistakes do teams commonly make? | PITFALLS.md |

Research is saved to `.tiki/research/project/` with a `SUMMARY.md` synthesizing key findings.

**Skip research if:**

- You know the domain well
- You have strong tech stack preferences
- You want to move fast (use `--skip-research` flag)

### Phase 5: Requirements Scoping

This phase transforms ideas into structured requirements.

**If research exists:**

Features are presented by category:

```
## Authentication

**Table stakes (users expect these):**
- Sign up with email/password
- Password reset
- Session management

**Differentiators (nice to have):**
- Magic link login
- OAuth (Google, GitHub)
- 2FA

Which features are in v1? [multi-select]
```

**If no research:**

Requirements are gathered conversationally, then categorized.

**Output:**

- `.tiki/requirements.json` — Structured requirements with REQ-IDs
- `.tiki/REQUIREMENTS.md` — Human-readable requirements

**REQ-ID Format:** `[CATEGORY]-[NUMBER]` (e.g., AUTH-01, CORE-02)

### Phase 6: Issue Generation (Optional)

The final step converts requirements into GitHub issues.

**What happens:**

1. Requirements are grouped logically (related features together)
2. Each group becomes a GitHub issue with:
   - Clear title
   - Requirements listed in body
   - Acceptance criteria
   - Labels based on category
   - Dependency references
3. Optionally creates a v1 milestone

**Skip issue generation if:**

- You want to review requirements first
- You prefer creating issues manually
- Use `--skip-issues` flag

## Command Options

```bash
/tiki:new-project                   # Full guided flow
/tiki:new-project --skip-research   # Skip domain research phase
/tiki:new-project --skip-issues     # Skip GitHub issue creation
```

## Output Summary

After completion, you'll have:

| Artifact | Location | Purpose |
|----------|----------|---------|
| Project context | `PROJECT.md` | Vision, users, constraints |
| Config | `.tiki/project-config.json` | Structured project data |
| Research | `.tiki/research/project/` | Domain research (if selected) |
| Requirements | `.tiki/REQUIREMENTS.md` | What to build |
| Requirements data | `.tiki/requirements.json` | Machine-readable requirements |
| GitHub Issues | GitHub | Ready for `/tiki:yolo` |

## What's Next?

After `/tiki:new-project` completes:

```bash
/tiki:pick-issue          # See which issue to start with
/tiki:yolo [number]       # Execute an issue end-to-end
/tiki:plan-issue [number] # Or plan manually first
```

## Tips

### For True Greenfield Projects

Start with research enabled. Even if you think you know the domain, research often surfaces:

- Libraries you didn't know existed
- Patterns that prevent common mistakes
- Features users expect (table stakes)

### For Brownfield Projects

If you have existing code:

1. Run `/tiki:map-codebase` first
2. Then run `/tiki:new-project`

Tiki will detect the existing codebase and incorporate it into the project context.

### Iterating on Requirements

Requirements aren't set in stone. After initial creation:

- Edit `.tiki/REQUIREMENTS.md` directly
- Run `/tiki:define-requirements --refresh` to sync status
- Convert todos to requirements as you discover them

### When to Skip Research

- Small utility projects
- Learning exercises
- When you're the domain expert
- Time-sensitive prototypes

### When to Skip Issue Generation

- You want team input on requirements first
- You prefer a different issue structure
- You're exploring before committing

## Example Walkthrough

Here's a complete example of starting a new project:

```
> /tiki:new-project

## Setup

No existing PROJECT.md found.
No existing code detected.
Git repo initialized.

## Deep Questioning

What do you want to build?

> A CLI tool for managing dotfiles across multiple machines

[... conversation about syncing, conflict handling, platforms ...]

Ready to create PROJECT.md? [Create / Keep exploring]

> Create

## PROJECT.md Created

**Project:** Dotfile Manager
**Vision:** Sync dotfiles across machines with git, handling conflicts gracefully

## Research Decision

Research the domain ecosystem before defining requirements?
[Research first (Recommended) / Skip research]

> Research first

Spawning 4 research agents...
[1/4] Stack Analysis ✓
[2/4] Features Research ✓
[3/4] Architecture Patterns ✓
[4/4] Pitfalls Analysis ✓

## Key Findings

**Stack:** Rust or Go for CLI, Git for sync backend
**Table Stakes:** init, add, sync, status commands
**Watch Out For:** Symlink handling varies by OS

## Requirements Scoping

### Core Commands
Which features are in v1? [multi-select]
☑ init - Initialize dotfile repo
☑ add - Add file to tracking
☑ sync - Push/pull changes
☐ status - Show sync status
☐ diff - Show pending changes

[... more categories ...]

## Requirements Defined

12 requirements across 4 categories
- v1: 8 requirements
- v2: 4 requirements

## Issue Generation

Create GitHub issues from requirements?
[Create issues (Recommended) / Skip for now]

> Create issues

## Issues Created

| # | Title | Requirements |
|---|-------|--------------|
| 1 | Initialize dotfile repository | CORE-01, CORE-02 |
| 2 | Add files to tracking | CORE-03 |
| 3 | Sync changes with remote | CORE-04, CORE-05 |
| 4 | Cross-platform symlink handling | COMPAT-01 |

## Project Initialized ✓

Next steps:
- /tiki:pick-issue — See which issue to start with
- /tiki:yolo 1 — Start with issue #1
```

## Troubleshooting

### "GitHub CLI not authenticated"

Run `gh auth login` to authenticate before using `/tiki:new-project`.

### Research agents timing out

Try `--skip-research` and research specific topics later with `/tiki:research <topic>`.

### Want to restart

Delete `PROJECT.md` and `.tiki/project-config.json`, then run `/tiki:new-project` again.
