---
type: prompt
name: tiki:review-queue
description: Review and process items discovered during execution. Use when there are queue items to review, create issues from, or dismiss.
allowed-tools: Read, Write, Bash, Glob
argument-hint: [--create-all] [--dismiss-all] [--approve-all-docs] [--dismiss-all-adr] [--dismiss-all-claude] [--issues] [--docs] [--adr] [--claude]
---

# Review Queue

Review items that accumulated during phase execution. These are potential issues, questions, and notes discovered by sub-agents during their work.

## Usage

```
/tiki:review-queue
/tiki:review-queue --create-all    # Create issues for all items
/tiki:review-queue --dismiss-all   # Clear all items
/tiki:review-queue --issues        # Only queue items (issues, questions, notes)
/tiki:review-queue --docs          # Only triggers (ADR + convention)
/tiki:review-queue --adr           # Only ADR triggers
/tiki:review-queue --claude        # Only convention triggers
/tiki:review-queue --approve-all-docs   # Create all ADRs + update CLAUDE.md for all conventions
/tiki:review-queue --dismiss-all-adr    # Dismiss all ADR triggers
/tiki:review-queue --dismiss-all-claude # Dismiss all convention triggers
```

## Instructions

### Step 1: Read Queue and Triggers

Load `.tiki/queue/pending.json`:

```json
{
  "items": [
    {
      "id": "q-001",
      "type": "potential-issue",
      "title": "Add rate limiting to login endpoint",
      "description": "During Phase 2, noticed no rate limiting on auth endpoints. Could be vulnerable to brute force attacks.",
      "source": {
        "issue": 34,
        "phase": 2
      },
      "priority": "medium",
      "labels": ["security", "enhancement"],
      "createdAt": "2026-01-10T11:00:00Z"
    },
    {
      "id": "q-002",
      "type": "question",
      "title": "Should password reset require email verification?",
      "description": "Implementing password reset flow - unclear if we need email verification or if a simple reset link is sufficient.",
      "source": {
        "issue": 34,
        "phase": 2
      },
      "createdAt": "2026-01-10T11:30:00Z"
    }
  ]
}
```

Also load `.tiki/triggers/pending.json`. If it doesn't exist, create empty structure:

```json
{
  "triggers": []
}
```

Expected triggers file structure with ADR and Convention triggers:

```json
{
  "triggers": [
    {
      "id": "t-001",
      "triggerType": "adr",
      "title": "Use JWT for authentication",
      "decision": "Chose JWT over session-based auth for stateless API",
      "rationale": "Enables horizontal scaling without session store",
      "confidence": "high",
      "source": {
        "issue": 34,
        "phase": 2
      },
      "createdAt": "2026-01-10T12:00:00Z"
    },
    {
      "id": "t-002",
      "triggerType": "convention",
      "title": "Error response format",
      "pattern": "All API errors return { error: string, code: number }",
      "examples": ["{ error: 'Not found', code: 404 }"],
      "confidence": "medium",
      "source": {
        "issue": 34,
        "phase": 3
      },
      "createdAt": "2026-01-10T13:00:00Z"
    }
  ]
}
```

If both queue and triggers are empty:
```
## Queue Empty

No items or triggers pending review.

Use `/tiki:state` to see current status.
```

If queue is empty but triggers present, skip to the triggers display sections.
If triggers are empty but queue items present, show queue items and note "No triggers pending."

### Step 1.5: Apply Filters

Parse filter flags from arguments:

```javascript
const showIssues = args.includes('--issues');
const showDocs = args.includes('--docs');
const showAdr = args.includes('--adr');
const showClaude = args.includes('--claude');

// If no filter specified, show all
const noFilter = !showIssues && !showDocs && !showAdr && !showClaude;
```

Apply filters:

- `--issues`: Show only queue items, hide all triggers
- `--docs`: Show only triggers (both ADR and convention), hide queue items
- `--adr`: Show only ADR triggers, hide queue items and convention triggers
- `--claude`: Show only convention triggers, hide queue items and ADR triggers
- No filter: Show everything (current behavior)

When displaying (Step 2), skip sections based on active filter:

- If `showIssues` and not `noFilter`: Skip "ADR Triggers" and "Convention Triggers" sections
- If `showDocs` and not `noFilter`: Skip "Potential Issues", "Questions", "Notes" sections
- If `showAdr` and not `noFilter`: Show only "ADR Triggers" section
- If `showClaude` and not `noFilter`: Show only "Convention Triggers" section

### Step 2: Display Items

Show all queue items grouped by type. When filters are active (from Step 1.5), skip sections that don't match the filter criteria:

```
## Queue Review

**5 items** pending review

### Potential Issues (3)

#### 1. Add rate limiting to login endpoint
- **Source:** Issue #34, Phase 2
- **Priority:** medium
- **Labels:** security, enhancement
- **Description:** No rate limiting on auth endpoints. Could be vulnerable to brute force attacks.

**Actions:** [Create Issue] [Dismiss] [Edit]

#### 2. Consider adding refresh tokens
- **Source:** Issue #34, Phase 2
- **Priority:** low
- **Labels:** enhancement
- **Description:** Current JWT implementation uses single tokens. Refresh tokens would improve security.

**Actions:** [Create Issue] [Dismiss] [Edit]

#### 3. Password strength validation needed
- **Source:** Issue #34, Phase 3
- **Priority:** medium
- **Labels:** security
- **Description:** No password strength requirements currently enforced.

**Actions:** [Create Issue] [Dismiss] [Edit]

---

### Questions (1)

#### 4. Should password reset require email verification?
- **Source:** Issue #34, Phase 2
- **Description:** Implementing password reset - unclear if email verification needed.

**Actions:** [Answer] [Convert to Issue] [Dismiss]

---

### Notes (1)

#### 5. Auth service architecture note
- **Source:** Issue #34, Phase 1
- **Description:** The auth service is tightly coupled to the user service. Consider extracting to separate module in future.

**Actions:** [Convert to Issue] [Add to CONCERNS.md] [Dismiss]

---

### ADR Triggers (2)

#### 6. Use JWT for authentication
- **Type:** technology-choice
- **Source:** Issue #34, Phase 2
- **Confidence:** high
- **Details:** Chose JWT over session-based auth for stateless API. Enables horizontal scaling without session store.

**Actions:** [Create ADR] [View] [Edit] [Dismiss]

#### 7. PostgreSQL for primary database
- **Type:** technology-choice
- **Source:** Issue #34, Phase 1
- **Confidence:** high
- **Details:** Selected PostgreSQL for ACID compliance and JSON support.

**Actions:** [Create ADR] [View] [Edit] [Dismiss]

---

### Convention Triggers (1)

#### 8. Error response format
- **Type:** code-pattern
- **Source:** Issue #34, Phase 3
- **Confidence:** medium
- **Pattern:** All API errors return { error: string, code: number }
- **Examples:** { error: 'Not found', code: 404 }, { error: 'Unauthorized', code: 401 }

**Actions:** [Update CLAUDE.md] [View] [Edit] [Dismiss]

---

**Summary:** Total items and triggers pending review: 5 queue items + 2 ADR triggers + 1 convention trigger = **8 total**

**Batch Actions:**
- Create all issues: `/tiki:review-queue --create-all`
- Dismiss all: `/tiki:review-queue --dismiss-all`

Or process individually below.
```

### Step 3: Process Items

Handle each item based on user input:

#### Create Issue

When user wants to create a GitHub issue:

```bash
gh issue create --title "Add rate limiting to login endpoint" --body "## Background
Discovered during implementation of Issue #34 (Add user authentication), Phase 2.

## Description
No rate limiting on auth endpoints. Could be vulnerable to brute force attacks.

## Suggested Priority
Medium

---
*Created from Tiki queue*" --label "security" --label "enhancement"
```

After creation:
```
Created Issue #37: Add rate limiting to login endpoint
Labels: security, enhancement

[Item removed from queue]
```

#### Dismiss Item

Remove from queue without action:

```
Dismissed: Add rate limiting to login endpoint

[Item removed from queue]
```

#### Answer Question

For question type items:

```
User: "Yes, password reset should require email verification"

Noted. Adding to project context.

Options:
1. Create issue to implement email verification
2. Add note to CLAUDE.md
3. Just dismiss (answer recorded in conversation)
```

#### Convert Note to Issue

For notes that should become tracked work:

```bash
gh issue create --title "Decouple auth service from user service" --body "..."
```

#### Add to CONCERNS.md

For architectural notes:

```
Added to CONCERNS.md:
- Auth service is tightly coupled to user service (consider extracting)

[Item removed from queue]
```

### Step 3b: Process Triggers

Handle trigger actions:

#### Create ADR (for ADR Triggers)

When user selects [Create ADR], generate ADR file from trigger data directly:

**Creating ADR from trigger workflow:**

1. **Find next ADR number**: Read `.tiki/adr/` directory to find the highest numbered ADR. Use the same numbering logic as `/tiki:adr` - if no ADRs exist, NNN starts at 001. Increment from the highest existing number.

   ```bash
   # Find highest numbered ADR in .tiki/adr/
   ls .tiki/adr/*.md | sort -V | tail -1
   ```

2. **Generate ADR file from trigger**: Use the trigger details to populate the ADR template below.

3. **Save to .tiki/adr/<NNN>-<kebab-case-title>.md**: Convert <trigger title> to kebab-case (lowercase, hyphens between words).

   Example: "Use JWT for authentication" becomes `0005-use-jwt-for-authentication.md`

4. **Remove trigger from pending.json**: After successful ADR creation.

5. **Confirm creation with file path**.

**ADR Template from Trigger:**

```markdown
# ADR-<NNN>: <trigger title>

## Status

Accepted

## Date

<current date YYYY-MM-DD>

## Context

During implementation of Issue #<issue> (Phase <phase>), this decision was made.

<trigger rationale>

## Decision

<trigger decision>

## Alternatives Considered

For each alternative in trigger.details.alternatives (if present):

### <alternative name>
- Pros: <alternative pros>
- Cons: <alternative cons>

If no alternatives in trigger, include:

*No alternatives were formally documented during the decision.*

## Consequences

Based on the decision, consider the positive and negative impacts:

### Positive
- <inferred positive consequence from decision>

### Negative
- <inferred negative consequence or trade-off>

## Related

- Issue #<issue>: <issue title>
- Phase <phase> of execution
- Generated from Tiki trigger via `/tiki:adr show <NNN>`
```

**Example output:**

```
Creating ADR from trigger...

Reading .tiki/adr/ to find next number... (highest: 004)
Next ADR number: 005

Generating ADR file from trigger data:
- Title: Use JWT for authentication
- Decision: Chose JWT over session-based auth for stateless API
- Rationale: Enables horizontal scaling without session store

Saving to .tiki/adr/0005-use-jwt-for-authentication.md (kebab-case filename)...

[ADR created: .tiki/adr/0005-use-jwt-for-authentication.md]
[Trigger removed from triggers file]
```

#### Update CLAUDE.md (for Convention Triggers)

When user selects [Update CLAUDE.md], add the convention to CLAUDE.md following this workflow:

**Adding convention to CLAUDE.md workflow:**

1. **Read existing CLAUDE.md** (or prepare to create if doesn't exist): Check if CLAUDE.md exists in the project root.

2. **Handle missing CLAUDE.md file**: If CLAUDE.md doesn't exist, create it with a minimal template:

   ```markdown
   # CLAUDE.md

   Project-specific guidance for Claude Code.

   ## Code Conventions

   <!-- Conventions will be added below -->
   ```

3. **Determine section based on triggerType**: Map the convention trigger's type to the appropriate CLAUDE.md section:
   - `'naming'` -> `## Code Conventions` or `## Naming Conventions`
   - `'structure'` -> `## File Organization` or `## Project Structure`
   - `'pattern'` -> `## Patterns` or `## Code Conventions`
   - `'practice'` -> `## Best Practices` or `## Development Practices`

4. **Section detection**: Use grep/search to find existing sections in CLAUDE.md. Look for the target section heading.

5. **Create section if needed**: If the target section doesn't exist, append it to CLAUDE.md before adding the convention.

6. **Format the convention entry**: Use markdown list format with pattern description:

   ```markdown
   - <pattern description>
     - Rationale: <rationale>
     - Examples: `<example1>`, `<example2>`
     - Source: Issue #<issue>, Phase <phase>
   ```

7. **Append to appropriate section**: Add the formatted convention entry under the target section.

8. **Remove trigger from pending.json**: After successful update.

9. **Confirm update with details**: Show what was added and where.

**Example output:**

```
Adding convention to CLAUDE.md...

Reading CLAUDE.md... (found)
Section detection: Looking for "## Code Conventions"... (found at line 42)

Formatting convention entry:
- All API errors return { error: string, code: number }
  - Rationale: Consistent error handling across all endpoints
  - Examples: `{ error: 'Not found', code: 404 }`, `{ error: 'Unauthorized', code: 401 }`
  - Source: Issue #34, Phase 3

Appended to CLAUDE.md under "## Code Conventions"

[Convention added to CLAUDE.md]
[Trigger removed from triggers file]
```

**Example when CLAUDE.md is missing:**

```
Adding convention to CLAUDE.md...

CLAUDE.md missing - creating with minimal template...
Created CLAUDE.md with basic structure.

Creating section "## Code Conventions"...

Formatting convention entry:
- All API errors return { error: string, code: number }
  - Rationale: Consistent error handling across all endpoints
  - Examples: `{ error: 'Not found', code: 404 }`, `{ error: 'Unauthorized', code: 401 }`
  - Source: Issue #34, Phase 3

Appended to CLAUDE.md under "## Code Conventions"

[Convention added to CLAUDE.md]
[Trigger removed from triggers file]
```

#### View Trigger

When user selects [View], display the full trigger content without processing:

**For ADR triggers:**

```
## Viewing ADR Trigger

**Title:** <trigger title>
**Type:** technology-choice | library-selection | architecture
**Confidence:** high | medium | low
**Source:** Issue #<issue>, Phase <phase>
**Created:** <createdAt>

### Decision
<trigger decision>

### Rationale
<trigger rationale>

### Alternatives (if present)
- <alternative 1>
- <alternative 2>

---
**Actions:** [Create ADR] [Edit] [Dismiss] [Back to list]
```

**For Convention triggers:**

```
## Viewing Convention Trigger

**Title:** <trigger title>
**Type:** naming | structure | pattern | practice
**Confidence:** high | medium | low
**Source:** Issue #<issue>, Phase <phase>
**Created:** <createdAt>

### Pattern
<trigger pattern>

### Examples
- `<example 1>`
- `<example 2>`

---
**Actions:** [Update CLAUDE.md] [Edit] [Dismiss] [Back to list]
```

The [View] action is read-only - it just displays content. User can then choose another action or go back to the list.

#### Edit Trigger

When user selects [Edit], allow modifying the trigger details before processing.

**[Edit] for ADR triggers** - Edit trigger details before creating ADR:

```
Editing trigger: Use JWT for authentication

Current trigger values:
- Title: Use JWT for authentication
- Decision: Chose JWT over session-based auth for stateless API
- Rationale: Enables horizontal scaling without session store
- Confidence: high

Update title? (press Enter to keep current)
>

Update decision? (press Enter to keep current)
> Chose JWT over session cookies for stateless API design

Update rationale? (press Enter to keep current)
>

Updated trigger. Ready for [Create ADR] or [Dismiss].
```

**[Edit] for Convention triggers** - Edit pattern before updating CLAUDE.md:

```
Editing trigger: Error response format

Current trigger values:
- Pattern: All API errors return { error: string, code: number }
- Confidence: medium

Update pattern? (press Enter to keep current)
> All API errors return { error: string, code: number, details?: string }

Updated trigger. Ready for [Update CLAUDE.md] or [Dismiss].
```

#### Dismiss Trigger

Remove trigger without creating ADR or updating CLAUDE.md:

```
Dismissed trigger: Error response format
Reason: Already documented elsewhere

[Trigger removed from triggers file]
```

### Step 4: Update Queue and Triggers

After processing each item, update `.tiki/queue/pending.json`:

Remove processed items:
```json
{
  "items": [
    // remaining items only
  ],
  "processed": [
    {
      "id": "q-001",
      "action": "created-issue",
      "issueNumber": 37,
      "processedAt": "2026-01-10T15:00:00Z"
    },
    {
      "id": "q-002",
      "action": "dismissed",
      "processedAt": "2026-01-10T15:01:00Z"
    }
  ]
}
```

Also update `.tiki/triggers/pending.json` after processing triggers:

Remove processed triggers and track actions:
```json
{
  "triggers": [
    // remaining triggers only
  ],
  "processed": [
    {
      "id": "t-001",
      "action": "created-adr",
      "adrPath": ".tiki/adr/0005-use-jwt-for-authentication.md",
      "processedAt": "2026-01-10T15:00:00Z"
    },
    {
      "id": "t-002",
      "action": "dismissed",
      "reason": "Already documented",
      "processedAt": "2026-01-10T15:01:00Z"
    }
  ]
}
```

### Step 5: Summary

After processing:

```
## Queue Processing Complete

**Processed 8 items and triggers:**
- 2 issues created (#37, #38)
- 1 question answered
- 1 note added to CONCERNS.md
- 1 item dismissed
- 2 ADR triggers processed (1 ADR created, 1 dismissed)
- 1 convention trigger processed (added to CLAUDE.md)

**Queue now empty. No triggers pending.**
```

## Queue Item Types

| Type | Description | Common Actions |
|------|-------------|----------------|
| `potential-issue` | Work that should be tracked | Create issue, Dismiss |
| `question` | Needs user input | Answer, Convert to issue |
| `note` | Observation or concern | Add to docs, Convert to issue |
| `blocker` | Something blocking progress | Investigate, Create issue |
| `tech-debt` | Code quality concern | Create issue, Add to CONCERNS.md |

## Queue Item Format

```json
{
  "id": "q-001",
  "type": "potential-issue",
  "title": "Short title",
  "description": "Detailed description of the item",
  "source": {
    "issue": 34,
    "phase": 2
  },
  "priority": "high|medium|low",
  "labels": ["label1", "label2"],
  "createdAt": "2026-01-10T11:00:00Z"
}
```

## Batch Operations

Batch operations affect both queue items and triggers. When running batch commands, both the `.tiki/queue/pending.json` items and `.tiki/triggers/pending.json` triggers are processed together. For example, if you have 5 items and 3 ADR triggers pending, batch operations will process all 8 entries.

### --create-all

Create GitHub issues for all `potential-issue` and `tech-debt` queue items, AND create ADRs for all high-confidence ADR triggers:

**What gets processed:**

- Queue items with type `potential-issue` or `tech-debt` -> GitHub Issues created
- ADR triggers with `confidence: high` -> ADRs created automatically
- Low/medium confidence ADR triggers are skipped (require manual review)
- Convention triggers are skipped (require manual review for CLAUDE.md updates)

```
Processing 3 queue items and 2 high-confidence ADR triggers...

Issues Created:
  Created #37: Add rate limiting to login endpoint
  Created #38: Consider adding refresh tokens
  Created #39: Password strength validation needed

ADRs Created:
  Created .tiki/adr/0005-use-jwt-for-authentication.md
  Created .tiki/adr/0006-postgresql-for-primary-database.md

Summary:
  3 issues created
  2 ADRs created from high-confidence triggers
  1 ADR trigger skipped (medium confidence - review manually)
  1 convention trigger skipped (requires manual review)

Queue items cleared. High-confidence ADR triggers processed.
```

### --dismiss-all

Clear all queue items and all triggers without action:

```
Dismissing 5 queue items and 3 triggers...

Dismissed:
  5 queue items removed
  2 ADR triggers removed
  1 convention trigger removed

All items and triggers cleared.
```

### --approve-all-docs

Process all triggers: create ADRs for all ADR triggers and update CLAUDE.md for all convention triggers:

```
Processing all documentation triggers...

ADRs Created:
  Created .tiki/adr/0005-use-jwt-for-authentication.md
  Created .tiki/adr/0006-postgresql-for-primary-database.md

CLAUDE.md Updates:
  Added: Error response format convention
  Added: API versioning convention

Summary:
  2 ADRs created
  2 conventions added to CLAUDE.md

All documentation triggers processed.
```

Note: This processes ALL triggers regardless of confidence level (unlike --create-all which only processes high-confidence ADR triggers).

### --dismiss-all-adr

Dismiss only ADR triggers, leaving queue items and convention triggers:

```
Dismissing all ADR triggers...

Dismissed:
  - Use JWT for authentication
  - PostgreSQL for primary database

2 ADR triggers dismissed.
Queue items and convention triggers unchanged.
```

### --dismiss-all-claude

Dismiss only convention triggers, leaving queue items and ADR triggers:

```
Dismissing all convention triggers...

Dismissed:
  - Error response format
  - API versioning convention

2 convention triggers dismissed.
Queue items and ADR triggers unchanged.
```

## Integration with Execute

The `/tiki:execute` skill adds items to the queue when sub-agents report discoveries:

```
Sub-agent output:
"DISCOVERED: Consider adding rate limiting to prevent brute force attacks"

→ Added to queue:
{
  "type": "potential-issue",
  "title": "Consider adding rate limiting",
  "description": "Prevent brute force attacks on auth endpoints",
  "source": { "issue": 34, "phase": 2 }
}
```

## Notes

- Queue items are suggestions, not requirements
- Users have full control over what becomes an issue
- Dismissed items are logged in `processed` for reference
- Queue should be reviewed after each execution completes
- The `/tiki:execute` skill suggests reviewing queue when items exist
