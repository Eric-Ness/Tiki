---
type: prompt
name: tiki:new-project
description: Initialize a new project with vision, goals, and technical context. Creates PROJECT.md for greenfield projects.
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
argument-hint: [--name "Project Name"]
---

# New Project

Initialize a new project by gathering project vision, goals, and technical context through an interactive questionnaire. Creates a `PROJECT.md` file that informs all subsequent planning.

## Usage

```
/tiki:new-project
/tiki:new-project --name "My App"
```

## Instructions

### Step 1: Check for Existing PROJECT.md

First, check if a PROJECT.md already exists:

```bash
cat PROJECT.md 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

**If PROJECT.md exists:**

Use AskUserQuestion to confirm:

```
A PROJECT.md already exists in this project.

Options:
1. View existing - Display current PROJECT.md content
2. Overwrite - Create a new PROJECT.md (existing will be backed up)
3. Cancel - Keep existing and exit
```

If user selects "Overwrite", backup the existing file:

```bash
cp PROJECT.md PROJECT.md.backup.$(date +%Y%m%d%H%M%S)
```

If user selects "View existing" or "Cancel", display content or exit accordingly.

### Step 2: Project Vision and Goals

Gather the core project vision using AskUserQuestion:

```
Let's define your project's vision and goals.

**Question 1: Project Name**
What should this project be called?

**Question 2: Vision Statement**
In 1-2 sentences, what is this project trying to achieve? What's the big picture goal?

**Question 3: Core Goals**
What are the 3-5 main goals this project should accomplish? (List them briefly)
```

Example response format:
```
Project: TaskFlow
Vision: A streamlined task management app that helps small teams stay organized without the complexity of enterprise tools.
Goals:
- Simple, intuitive task creation and organization
- Team collaboration with real-time updates
- Integration with calendar apps
- Mobile-first responsive design
```

### Step 3: Target Users

Understand who will use this project:

```
**Question 4: Primary Users**
Who are the main users of this project? Describe their roles and what they need.

**Question 5: User Needs**
What specific problems or needs do these users have that this project addresses?
```

Example response format:
```
Primary Users: Small team leads and individual contributors (5-20 person teams)
User Needs:
- Quick way to create and assign tasks without ceremony
- Visibility into what teammates are working on
- Mobile access for on-the-go updates
```

### Step 4: Technical Constraints

Gather technical requirements and constraints:

```
**Question 6: Technical Constraints**
Are there any hard technical constraints? Consider:
- Must run on specific platforms (web, mobile, desktop)?
- Performance requirements (response time, concurrent users)?
- Security requirements (compliance, data handling)?
- Deployment constraints (self-hosted, cloud, specific providers)?

Answer with specific constraints or "No specific constraints" if flexible.
```

Example response format:
```
Technical Constraints:
- Must work offline with sync when connected
- GDPR compliant for EU users
- Deploy to AWS (existing infrastructure)
- Support 1000+ concurrent users
```

### Step 5: Tech Preferences

Gather technology preferences:

```
**Question 7: Language/Framework Preferences**
What's your preferred tech stack? Consider:
- Programming language (TypeScript, Python, Go, etc.)
- Framework (React, Next.js, FastAPI, etc.)
- Database (PostgreSQL, MongoDB, SQLite, etc.)

Answer with preferences or "No preference - recommend based on goals" if flexible.

**Question 8: Patterns and Conventions**
Any specific architectural patterns or conventions you want to follow?
- Monorepo vs separate repos
- REST vs GraphQL
- Specific testing approach
- Code style preferences
```

Example response format:
```
Tech Stack:
- Language: TypeScript
- Frontend: React with Vite
- Backend: Node.js with Express
- Database: PostgreSQL
- Testing: Vitest for unit, Playwright for E2E

Patterns:
- Monorepo with pnpm workspaces
- REST API with OpenAPI spec
- Feature-based folder structure
```

### Step 6: Success Criteria

Define what success looks like:

```
**Question 9: Success Criteria**
How will you know this project has succeeded? List 3-5 measurable criteria.

These should be specific and verifiable, like:
- "Users can complete core workflow in under 2 minutes"
- "Page load time under 3 seconds on 3G"
- "Zero critical security vulnerabilities"
```

Example response format:
```
Success Criteria:
- [ ] User can create, assign, and complete a task in under 30 seconds
- [ ] App works fully offline with automatic sync
- [ ] Passes WCAG 2.1 AA accessibility audit
- [ ] 90%+ Lighthouse performance score on mobile
- [ ] Zero high/critical security findings in penetration test
```

### Step 7: Non-Goals / Out of Scope

Clarify what the project is NOT:

```
**Question 10: Non-Goals**
What is explicitly OUT of scope for this project? This helps prevent scope creep.

Consider:
- Features you've decided NOT to build
- User segments you're NOT targeting
- Technical approaches you're avoiding
```

Example response format:
```
Non-Goals:
- Enterprise features (SSO, audit logs, admin dashboards)
- Native mobile apps (web-only for v1)
- Public API for third-party integrations
- AI/ML features
- Multi-language support (English only for v1)
```

### Step 8: Generate PROJECT.md

Create PROJECT.md with all gathered information:

```markdown
# {Project Name}

## Vision

{Vision statement from Step 2}

## Goals

{Goals list from Step 2, formatted as bullet points}

## Target Users

{User descriptions from Step 3}

### User Needs

{User needs from Step 3}

## Technical Constraints

{Constraints from Step 4, formatted as bullet points}

## Tech Stack Preferences

{Stack preferences from Step 5, formatted as structured list}

### Patterns and Conventions

{Patterns from Step 5}

## Success Criteria

{Criteria from Step 6, formatted as checkboxes}

## Non-Goals / Out of Scope

{Non-goals from Step 7, formatted as bullet points}

---

*Generated by `/tiki:new-project` on {date}*
*Edit this file directly to update project context.*
```

Write the file:

```bash
# Ensure the file is created in the project root
```

Use the Write tool to create PROJECT.md with the structured content.

### Step 9: Store Raw Responses

Store the raw questionnaire responses in `.tiki/project-config.json` for potential re-generation:

```json
{
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "version": 1,
  "responses": {
    "projectName": "...",
    "vision": "...",
    "goals": ["...", "..."],
    "targetUsers": "...",
    "userNeeds": ["...", "..."],
    "technicalConstraints": ["...", "..."],
    "techStack": {
      "language": "...",
      "frontend": "...",
      "backend": "...",
      "database": "...",
      "testing": "..."
    },
    "patterns": ["...", "..."],
    "successCriteria": ["...", "..."],
    "nonGoals": ["...", "..."]
  }
}
```

Ensure the `.tiki/` directory exists:

```bash
mkdir -p .tiki
```

Use the Write tool to create/update `.tiki/project-config.json`.

### Step 10: Display Completion Summary

Show a summary of what was created:

```markdown
## Project Initialized

**{Project Name}**

Created:
- `PROJECT.md` - Project context document
- `.tiki/project-config.json` - Raw responses for re-generation

### Quick Summary

**Vision:** {1-line vision}

**Goals:** {count} defined
**Success Criteria:** {count} defined
**Tech Stack:** {language} / {framework} / {database}

### Next Steps

1. **Review PROJECT.md** - Edit directly to refine any sections
2. **Create initial issues** - `/tiki:add-issue "Setup project structure"`
3. **Start planning** - `/tiki:plan-issue <number>` (PROJECT.md context will be loaded automatically)

Your PROJECT.md will inform all subsequent planning, ensuring phases align with your vision and constraints.
```

## Examples

### Example 1: New Web Application

```
User: /tiki:new-project

Claude: Let's set up your new project! I'll ask a few questions to capture the vision, goals, and technical context.

**Project Name and Vision**

What should this project be called, and what is it trying to achieve?

User: It's called "QuickInvoice" - a simple invoicing app for freelancers

Claude: Great! QuickInvoice - a simple invoicing app for freelancers.

What are the 3-5 main goals?

User:
- Create professional invoices in under a minute
- Track payment status
- Generate end-of-year reports for taxes

Claude: Who are the primary users, and what specific problems do they face?

User: Freelancers and solo consultants who find existing invoicing tools too complex

Claude: Any technical constraints?

User: Should work offline, needs to handle multiple currencies

Claude: What's your preferred tech stack?

User: TypeScript, React, maybe Supabase for backend

Claude: How will you measure success?

User:
- Invoice creation in under 60 seconds
- PDF export works offline
- 4.5+ star rating on launch

Claude: What's explicitly out of scope?

User: Team features, recurring invoices for v1, integrations with accounting software

Claude:
## Project Initialized

**QuickInvoice**

Created:
- `PROJECT.md` - Project context document
- `.tiki/project-config.json` - Raw responses

### Quick Summary

**Vision:** A simple invoicing app for freelancers
**Goals:** 3 defined
**Success Criteria:** 3 defined
**Tech Stack:** TypeScript / React / Supabase

### Next Steps

1. Review PROJECT.md
2. Create initial issues: `/tiki:add-issue "Setup project structure"`
3. Start planning with PROJECT.md context loaded automatically
```

### Example 2: Existing PROJECT.md

```
User: /tiki:new-project

Claude: A PROJECT.md already exists in this project.

[AskUserQuestion with options: View existing, Overwrite, Cancel]

User: View existing

Claude: Here's your current PROJECT.md:

[Displays content]

Would you like to keep this or start fresh?

User: Keep it

Claude: Keeping existing PROJECT.md. No changes made.

To update specific sections, edit PROJECT.md directly.
```

### Example 3: Minimal Input

```
User: /tiki:new-project --name "SideProject"

Claude: Setting up SideProject! Let me gather some details.

[Asks vision question]

User: Just a quick experiment, nothing formal

Claude: Got it - an experimental project. I'll keep the structure light.

What's the main thing you want to build or learn?

User: Want to try out HTMX

Claude: Trying out HTMX - nice! Any specific goals for the experiment?

User: Build a simple todo app to understand the basics

Claude: Any tech preferences besides HTMX?

User: Python, maybe Flask

Claude: I'll create a minimal PROJECT.md focused on learning HTMX.

## Project Initialized

**SideProject**

Created:
- `PROJECT.md` (minimal format for experiments)
- `.tiki/project-config.json`

Your PROJECT.md is intentionally lightweight since this is an experiment. Add more detail as the project evolves.
```

## Error Handling

- **Write permission denied:** "Cannot write to project directory. Check file permissions."
- **No git repo:** Works without git - PROJECT.md is useful for any project
- **Interrupted questionnaire:** "Questionnaire interrupted. Run `/tiki:new-project` again to start over."

## Notes

- PROJECT.md is designed to be human-readable and editable
- Raw responses in `.tiki/project-config.json` enable re-generation if needed
- The questionnaire adapts - skip irrelevant questions for simple projects
- Keep responses conversational, not interrogation-like
- 2-4 questions per section maximum
- `/plan-issue` automatically loads PROJECT.md when it exists
