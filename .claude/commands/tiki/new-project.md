---
type: prompt
name: tiki:new-project
description: Initialize a new project with vision, goals, and technical context. Creates PROJECT.md for greenfield projects.
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
argument-hint: [--name "Project Name"]
---

# New Project

Initialize a project by gathering vision, goals, and technical context through an interactive questionnaire. Creates `PROJECT.md` for subsequent planning.

## Usage

```
/tiki:new-project
/tiki:new-project --name "My App"
```

## Instructions

### Step 1: Check for Existing PROJECT.md

```bash
cat PROJECT.md 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

If exists, use AskUserQuestion with options: View existing, Overwrite (backup first), Cancel.

### Step 2: Project Vision and Goals

Ask via AskUserQuestion:

- **Project Name** - What should this project be called?
- **Vision Statement** - In 1-2 sentences, what is this project trying to achieve?
- **Core Goals** - What are the 3-5 main goals?

### Step 3: Target Users

Ask:

- **Primary Users** - Who are the main users? Describe their roles.
- **User Needs** - What specific problems does this project address?

### Step 4: Technical Constraints

Ask about hard constraints:

- Platforms (web, mobile, desktop)
- Performance requirements
- Security/compliance requirements
- Deployment constraints

### Step 5: Tech Preferences

Ask:

- **Language/Framework** - Programming language, framework, database preferences
- **Patterns** - Architectural patterns, monorepo vs separate repos, REST vs GraphQL, testing approach

If user says "No preference - recommend based on goals" AND existing files present, read `.tiki/prompts/new-project/tech-stack-analysis.md` to detect and suggest.

### Step 6: Success Criteria

Ask for 3-5 measurable criteria. Guide user toward specific, verifiable items like:

- "Users can complete core workflow in under 2 minutes"
- "Page load under 3 seconds on 3G"

### Step 7: Non-Goals / Out of Scope

Ask what is explicitly NOT in scope to prevent scope creep.

### Step 8: Generate PROJECT.md

Read `.tiki/prompts/new-project/project-templates.md` for template structure.

Create PROJECT.md using the gathered responses. Use the minimal template for experiments/learning projects.

### Step 9: Store Raw Responses

Ensure `.tiki/` directory exists, then write responses to `.tiki/project-config.json`.

See `.tiki/prompts/new-project/project-templates.md` for JSON structure.

### Step 10: Display Completion Summary

Show:

- Project name
- Files created: `PROJECT.md`, `.tiki/project-config.json`
- Quick summary: Vision (1 line), goals count, criteria count, tech stack
- Next steps: Review PROJECT.md, create issues with `/tiki:add-issue`, start planning

## Notes

- PROJECT.md is human-readable and editable; update it directly as project evolves
- Keep questionnaire conversational, 2-4 questions per section
- For experiments, use the minimal template format
- `/plan-issue` automatically loads PROJECT.md when present
