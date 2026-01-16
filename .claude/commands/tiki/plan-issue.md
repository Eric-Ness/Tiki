---
type: prompt
name: tiki:plan-issue
description: Break a GitHub issue into executable phases. Use when planning work on an issue, creating a phased implementation plan, or before executing an issue.
allowed-tools: Bash, Read, Write, Glob, Grep
argument-hint: <issue-number> [additional-numbers...] [--no-research]
---

# Plan Issue

Take a GitHub issue and create a phased execution plan. Each phase should be small enough to complete in one context window.

## Usage

```
/tiki:plan-issue 34
/tiki:plan-issue 34 45    # Plan multiple issues together
/tiki:plan-issue 34 --no-research  # Skip research integration
```

## Instructions

### Step 1: Fetch the Issue

```bash
gh issue view <number> --json number,title,body,state,labels,assignees,milestone
```

### Step 2: Analyze the Issue

Read the issue content and understand:
- What is the goal?
- What files will likely need to change?
- What are the dependencies?
- How complex is this task?

### Step 2.25: Check for Relevant Research

**Skip this step if `--no-research` flag is provided.**

Check if any existing research is relevant to this issue and incorporate key insights into the planning process.

#### 2.25a. Check Research Index

Read the research index at `.tiki/research/index.json` if it exists:

```javascript
async function checkResearchIndex() {
  const indexPath = '.tiki/research/index.json';

  try {
    const content = await readFile(indexPath);
    return JSON.parse(content);
  } catch (error) {
    // No research index exists yet
    return null;
  }
}
```

#### 2.25b. Extract Keywords from Issue

Extract technology names, patterns, and keywords from the issue title and body:

```javascript
function extractKeywords(issue) {
  const keywords = new Set();
  const text = `${issue.title} ${issue.body}`.toLowerCase();

  // Common technology patterns
  const patterns = [
    /\b(react|vue|angular|svelte)\b/gi,
    /\b(next\.?js|nuxt|gatsby|remix)\b/gi,
    /\b(typescript|javascript)\b/gi,
    /\b(prisma|drizzle|typeorm|sequelize)\b/gi,
    /\b(react-query|tanstack|swr|rtk-query)\b/gi,
    /\b(tailwind|styled-components|css-modules)\b/gi,
    /\b(jest|vitest|playwright|cypress)\b/gi,
    /\b(auth|authentication|oauth|jwt)\b/gi,
    /\b(graphql|rest|trpc|grpc)\b/gi,
    /\b([a-z]+-[a-z]+(?:-[a-z]+)*)\b/g,  // kebab-case terms
  ];

  patterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(m => keywords.add(m.toLowerCase()));
  });

  // Also extract from labels
  (issue.labels || []).forEach(label => {
    keywords.add(label.name.toLowerCase());
  });

  return Array.from(keywords);
}
```

#### 2.25c. Normalize Keywords for Matching

Convert keywords to kebab-case for matching against research topics:

```javascript
function toKebabCase(input) {
  return input
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeKeywords(keywords) {
  return keywords.map(k => toKebabCase(k)).filter(k => k.length > 2);
}
```

#### 2.25d. Match Against Research Index

Match extracted keywords against both topic folder names AND aliases in the index:

```javascript
function findMatchingResearch(keywords, index) {
  if (!index || !index.topics) return [];

  const matches = [];
  const normalizedKeywords = normalizeKeywords(keywords);

  for (const [topic, data] of Object.entries(index.topics)) {
    // Direct topic match
    if (normalizedKeywords.includes(topic)) {
      matches.push({ topic, ...data, matchType: 'direct' });
      continue;
    }

    // Alias match
    const aliases = (data.aliases || []).map(a => toKebabCase(a));
    const matchedAlias = normalizedKeywords.find(k => aliases.includes(k));
    if (matchedAlias) {
      matches.push({ topic, ...data, matchType: 'alias', matchedAlias });
    }
  }

  return matches;
}
```

#### 2.25e. Check Research Freshness

For each matched research, check if it's stale (older than 30 days):

```javascript
function checkFreshness(researchedAt) {
  const researchDate = new Date(researchedAt);
  const now = new Date();
  const ageMs = now - researchDate;
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  return {
    ageDays,
    isStale: ageDays > 30,
    ageText: ageDays === 0 ? 'today' :
             ageDays === 1 ? 'yesterday' :
             ageDays < 7 ? `${ageDays} days ago` :
             ageDays < 30 ? `${Math.floor(ageDays / 7)} weeks ago` :
             `${Math.floor(ageDays / 30)} months ago`
  };
}
```

#### 2.25f. Extract Key Sections from Research

For each matched research, read the research.md file and extract only key sections to manage token usage:

```javascript
async function extractKeyResearchSections(topic) {
  const researchPath = `.tiki/research/${topic}/research.md`;

  try {
    const content = await readFile(researchPath);

    // Extract specific sections only
    const sections = {
      executiveSummary: extractSection(content, 'Executive Summary'),
      suggestedApproach: extractSection(content, 'Recommendations', 'Suggested Approach'),
      mistakesToAvoid: extractSection(content, 'Common Pitfalls', 'Mistakes to Avoid', 3) // First 3 items
    };

    return {
      topic,
      path: researchPath,
      ...sections
    };
  } catch (error) {
    return null;
  }
}

function extractSection(content, mainHeader, subHeader = null, maxItems = null) {
  // Find section by header
  const headerPattern = subHeader
    ? new RegExp(`## ${mainHeader}[\\s\\S]*?### ${subHeader}\\n([\\s\\S]*?)(?=###|$)`, 'i')
    : new RegExp(`## ${mainHeader}\\n([\\s\\S]*?)(?=##|$)`, 'i');

  const match = content.match(headerPattern);
  if (!match) return null;

  let sectionContent = match[1].trim();

  // If maxItems specified, limit to first N list items
  if (maxItems) {
    const lines = sectionContent.split('\n');
    const itemLines = [];
    let itemCount = 0;

    for (const line of lines) {
      if (line.match(/^\d+\.\s|^-\s|^\*\s/)) {
        if (itemCount >= maxItems) break;
        itemCount++;
      }
      if (itemCount > 0 && itemCount <= maxItems) {
        itemLines.push(line);
      }
    }
    sectionContent = itemLines.join('\n');
  }

  return sectionContent;
}
```

#### 2.25g. Store Research Context for Later Use

Store the matched research context for use in phase generation and display:

```javascript
// This will be used in Step 4 and Step 6
const researchContext = {
  matches: [], // Array of matched research with extracted sections
  keywords: [], // Keywords extracted from issue
  hasResearch: false
};

// After finding matches:
for (const match of matchingResearch) {
  const freshness = checkFreshness(match.researched_at);
  const sections = await extractKeyResearchSections(match.topic);

  if (sections) {
    researchContext.matches.push({
      topic: match.topic,
      confidence: match.confidence,
      matchType: match.matchType,
      matchedAlias: match.matchedAlias,
      freshness,
      sections,
      path: `.tiki/research/${match.topic}/research.md`
    });
  }
}

researchContext.keywords = keywords;
researchContext.hasResearch = researchContext.matches.length > 0;
```

#### 2.25h. Display Research Discovery

If research matches are found, display them:

```
## Research Context Detected

Found {N} relevant research document(s) based on issue keywords:

Keywords extracted: {keyword1}, {keyword2}, {keyword3}...

Matched research:
- **{topic1}** ({confidence} confidence) - researched {ageText}
- **{topic2}** ({confidence} confidence) - researched {ageText} [STALE - consider refreshing]

Research insights will be incorporated into phase planning.
```

If no research matches:

```
No relevant research found for this issue.
Consider running /tiki:research before planning if this involves unfamiliar technology.
```

### Step 2.5: Extract Success Criteria

Extract and define success criteria that will guide the implementation and verify completion.

#### Parsing Acceptance Criteria from Issue Body

1. **Parse explicit criteria** - Look for "Acceptance Criteria" sections in the issue body
   - Markdown checkboxes (`- [ ]` items)
   - Numbered lists under "Acceptance Criteria" or "Requirements" headers
   - Definition of Done sections

2. **AI-generated criteria for implicit requirements** - Analyze the issue to generate additional criteria for:
   - **Non-functional requirements**: Performance, security, accessibility, maintainability
   - **Testing requirements**: Unit tests, integration tests, edge cases to cover
   - **Edge cases**: Error handling, boundary conditions, invalid inputs

#### Criteria Categories

Categorize all extracted criteria into these four categories:

1. **Functional**
   - Functional criteria: Core behavior and feature requirements that define what the system must do
   - Examples: "User can log in", "API returns correct data", "Form validates input"

2. **Non-functional**
   - Non-functional criteria: Performance, security, and scalability quality attributes
   - Examples: "Response time under 500ms", "Passwords hashed with bcrypt", "Supports 1000 concurrent users"

3. **Testing**
   - Testing criteria: Required test coverage and edge case verification requirements
   - Examples: "Unit tests for auth module", "80% code coverage", "Edge case: empty input handled"

4. **Documentation**
   - Documentation criteria: README, API doc, and code comment requirements
   - Examples: "README updated with setup instructions", "API documentation for new endpoints", "Comments on complex algorithms"

#### User Confirmation (Optional)

After extracting criteria, optionally confirm with the user:

```text
Proceed with these criteria? [y/edit/add more]
```

This allows the user to review, edit existing criteria, or add more before planning begins.

### Step 3: Explore the Codebase (if needed)

If the issue references existing code:
- Use Glob to find relevant files
- Use Grep to understand current implementation
- Read key files to understand context

### Step 4: Break Into Phases (Backward Planning)

**Working backward from criteria...**

Instead of forward planning from the issue description to tasks, use a criteria-driven approach that works backward from success criteria. This ensures every phase has clear criterion justification and nothing is built without purpose.

Use the criteria-first workflow: start from criteria, derive changes for each criterion, then group related changes into logical phases. Each phase should address criteria and satisfy the requirements. Map tasks to success criteria using the addressesCriteria field. Ensure all criteria are covered by at least one phase.

**Backward Planning Workflow:**

1. **Start from criteria - identify code changes for each criterion**

   For each criterion, ask: "What code changes make it true?"

   Example:
   - `functional-1: User can log in` → Need login endpoint, session handling, password validation
   - `testing-1: Unit tests for auth` → Need test files, mocks, test cases
   - `non-functional-1: Response under 500ms` → Need caching, optimized queries

2. **Derive changes from each criterion**

   For each criterion, identify the specific code changes needed to satisfy the criteria:
   - Which files need to be created or modified?
   - What functions or components are required?
   - What dependencies must be added?

3. **Group related changes into logical phases**

   Combine related changes into phases that:
   - Touch the same files or components
   - Have natural dependencies on each other
   - Can be verified together

   Grouped changes become phases - phases emerge from grouped criterion changes.

4. **Ensure each phase has clear criterion justification**

   Every phase should exist because specific criteria require it. Phases are generated from criteria (criteria-derived phases), not forward from issue description:
   - Each phase's purpose is to satisfy one or more criteria
   - No phase should exist without criterion justification
   - The `addressesCriteria` field documents this traceability

**Phase Generation Principles:**

Phases are created from criteria as criteria-derived units of work:

1. **Each phase must be completable in one context window**
   - A sub-agent will execute each phase with fresh context
   - Phase should be focused and atomic

2. **Phases should be independently verifiable**
   - Include clear verification steps
   - Tests should pass after each phase

3. **Declare dependencies explicitly**
   - If Phase 3 depends on Phase 2, say so
   - Phases without dependencies can potentially run in parallel

4. **Identify files each phase will modify**
   - Helps avoid conflicts
   - If two phases modify the same file, consider splitting differently

5. **Map tasks to success criteria (addressesCriteria)**
   - Each phase should specify which success criteria it addresses
   - Use the `addressesCriteria` field to reference criteria by category and index
   - Format: `"category-N"` (e.g., `"functional-1"`, `"testing-2"`)
   - Ensure all criteria are covered by at least one phase
   - A single phase may address multiple criteria
   - Review the mapping to verify complete criteria coverage

**Contrast: Backward vs Forward Planning**

| Forward Planning (Traditional) | Backward Planning (Criteria-Driven) |
|-------------------------------|-------------------------------------|
| Start from issue description | Start from success criteria |
| Break work into logical tasks | Ask "what makes each criterion true?" |
| Hope tasks cover requirements | Derive changes needed for each criterion |
| Verify coverage after planning | Build phases from grouped criterion changes |
| May miss implicit requirements | Every phase has criterion justification |

**Incorporating Research Context (if available from Step 2.25):**

When research context is available, incorporate it into phase planning:

1. **Reference research recommendations in phase content**

   When a phase relates to a researched topic, include relevant recommendations:

   ```markdown
   Phase 2: Implement data fetching with React Query

   **Research Reference:** react-query (researched 3 days ago)

   Tasks:
   1. Install @tanstack/react-query v5
   2. Set up QueryClient with recommended defaults
   3. Create custom hooks for data fetching

   **From research - Key recommendations:**
   - Use React Query for server state, local state for UI state
   - Implement stale-while-revalidate pattern for better UX

   **From research - Avoid:**
   - Mixing server and client state in the same store
   ```

2. **Add researchReferences field to phases**

   When a phase is informed by research, add the reference:

   ```json
   {
     "number": 2,
     "title": "Implement data fetching",
     "researchReferences": ["react-query"],
     "content": "... includes research recommendations ..."
   }
   ```

3. **Consider research-informed success criteria**

   Research may suggest additional non-functional criteria:
   - Performance patterns from research → non-functional criteria
   - Security considerations from research → non-functional criteria
   - Testing patterns from research → testing criteria

4. **Handle stale research warnings**

   If matched research is stale (>30 days old):
   - Still use the recommendations but note the staleness
   - Add a phase note: "Note: Research is {N} days old. Consider refreshing before implementation."
   - Suggest `/tiki:research {topic} --refresh` in the plan output

### Step 5: Create the Plan File

Create `.tiki/plans/issue-<number>.json` with this structure:

```json
{
  "issue": {
    "number": 34,
    "title": "Issue title from GitHub",
    "url": "https://github.com/owner/repo/issues/34"
  },
  "created": "2026-01-10T10:00:00Z",
  "status": "planned",
  "successCriteria": [
    {
      "category": "functional",
      "description": "User can log in with valid credentials"
    },
    {
      "category": "functional",
      "description": "Invalid credentials return appropriate error"
    },
    {
      "category": "non-functional",
      "description": "Login response time under 500ms"
    },
    {
      "category": "testing",
      "description": "Unit tests cover all auth middleware functions"
    },
    {
      "category": "documentation",
      "description": "API documentation updated with auth endpoints"
    }
  ],
  "phases": [
    {
      "number": 1,
      "title": "Short descriptive title",
      "status": "pending",
      "priority": "high|medium|low",
      "addressesCriteria": ["functional-1", "functional-2", "testing-1"],
      "researchReferences": ["react-query"],
      "dependencies": [],
      "files": ["src/file1.ts", "src/file2.ts"],
      "content": "Detailed instructions for what to do in this phase...",
      "verification": [
        "File exists and exports correct types",
        "No TypeScript errors",
        "Tests pass"
      ],
      "summary": null,
      "completedAt": null
    }
  ],
  "researchContext": {
    "matched": ["react-query"],
    "keywords": ["react", "data-fetching", "state-management"],
    "staleWarnings": []
  },
  "coverageMatrix": {
    "functional-1": { "phases": [1, 2], "tasks": [1, 3] },
    "functional-2": { "phases": [1, 3], "tasks": [2, 4] },
    "non-functional-1": { "phases": [2], "tasks": [3] },
    "testing-1": { "phases": [1], "tasks": [2] },
    "documentation-1": { "phases": [3], "tasks": [5] }
  },
  "queue": [],
  "metadata": {
    "estimatedPhases": 3,
    "actualPhases": 3,
    "parallelizable": false
  }
}
```

### Step 5.5: Verify Criteria Coverage

After generating phases, verify that all success criteria are addressed by at least one phase.

#### Build Coverage Matrix

Create a coverage matrix mapping each criterion to the phases and tasks that address it:

```json
{
  "coverageMatrix": {
    "functional-1": { "phases": [1, 2], "tasks": [1, 3, 5] },
    "functional-2": { "phases": [1, 3], "tasks": [2, 6] },
    "non-functional-1": { "phases": [2], "tasks": [4] },
    "testing-1": { "phases": [1], "tasks": [3] },
    "documentation-1": { "phases": [3], "tasks": [7] }
  }
}
```

The coverage matrix shows which phases cover each criterion by scanning all `addressesCriteria` arrays in the plan.

#### Gap Detection

After creating the plan, check for criteria with no associated tasks (unmapped criteria):

1. Collect all criterion IDs from `successCriteria` (e.g., "functional-1", "testing-2")
2. Scan all phases' `addressesCriteria` arrays to build the coverage matrix
3. Identify criteria that appear in no phase's `addressesCriteria` - these are gaps
4. Validate complete coverage - ensure every criterion is addressed by at least one phase

#### Warning Output for Uncovered Criteria

If any criteria are not covered by any phase, display a warning:

```text
**Warning:** The following criteria are not covered by any phase:
- functional-3: User can reset password via email
- testing-2: Integration tests for API endpoints

Consider adding a phase to address these uncovered criteria, or review the plan to ensure all requirements are met.
```

Suggested actions when criteria are uncovered:

- Add a new phase to address the uncovered criteria
- Create additional tasks in existing phases
- Review whether the criteria are still relevant

### Step 6: Display the Plan

After creating the plan, display a summary showing research context (if available), success criteria before phases, which criteria each phase addresses, and a criteria coverage table:

```markdown
## Plan for Issue #34: Add user authentication

**Phases:** 3
**Parallelizable:** No

### Research Context

Relevant research found:
- **react-query** (researched 3 days ago) - [View full research](.tiki/research/react-query/research.md)

#### Key Recommendations
- Use React Query for server state, local state for UI state
- Implement optimistic updates for better UX
- Avoid: Mixing server and client state in the same store

---

### Success Criteria

**Functional:**
1. User can log in with valid credentials
2. Invalid credentials return appropriate error

**Non-functional:**
1. Login response time under 500ms

**Testing:**
1. Unit tests cover all auth middleware functions

**Documentation:**
1. API documentation updated with auth endpoints

### Phase 1: Setup auth middleware (high priority)
- Files: src/middleware/auth.ts, src/types/auth.ts
- Dependencies: None
- Addresses Criteria: functional-1, functional-2, testing-1
- Verification: Middleware exports, no TS errors

### Phase 2: Add login endpoint (high priority)
- Files: src/routes/auth.ts, src/services/auth.ts
- Dependencies: Phase 1
- Addresses Criteria: functional-1, non-functional-1
- Research: react-query (data fetching patterns)
- Verification: POST /api/login works, tests pass

### Phase 3: Add protected routes (medium priority)
- Files: src/routes/user.ts
- Dependencies: Phase 1, 2
- Addresses Criteria: functional-2, documentation-1
- Verification: 401 without auth, 200 with auth

### Criteria Coverage

**Coverage: 5/5 criteria covered (100%)**

| Criterion | Phases |
|-----------|--------|
| functional-1 | Phase 1, 2 |
| functional-2 | Phase 1, 3 |
| non-functional-1 | Phase 2 |
| testing-1 | Phase 1 |
| documentation-1 | Phase 3 |

---
Plan saved to `.tiki/plans/issue-34.json`

Ready to execute? Use `/tiki:execute 34`
Want to adjust phases? Use `/tiki:discuss-phases 34`
```

#### Research Context Display Rules

**When research is found:**

Display the Research Context section as shown above, including:
1. List of matched research topics with:
   - Topic name (bold)
   - Age ("researched X days ago")
   - Link to full research file
   - Stale warning if >30 days old: `[STALE - consider refreshing with /tiki:research {topic} --refresh]`

2. Key Recommendations section with:
   - Executive summary highlights (1-2 lines)
   - Suggested approach (1-2 lines)
   - Top 3 pitfalls to avoid (prefixed with "Avoid:")

**When research is stale (>30 days):**

```markdown
### Research Context

Relevant research found:
- **react-query** (researched 45 days ago) [STALE] - [View full research](.tiki/research/react-query/research.md)

**Warning:** This research is over 30 days old. Consider refreshing before implementation:
`/tiki:research react-query --refresh`

#### Key Recommendations (may be outdated)
...
```

**When no research is found:**

Omit the Research Context section entirely, or optionally display:

```markdown
### Research Context

No relevant research found for keywords: {keyword1}, {keyword2}, {keyword3}

Consider researching before implementation if this involves unfamiliar technology:
`/tiki:research {suggested-topic}`
```

**When --no-research flag is used:**

Omit the Research Context section entirely. Do not display any research-related content.

## Phase Content Guidelines

The `content` field for each phase should include:

1. **Clear objective** - What this phase accomplishes
2. **Specific tasks** - Step-by-step what to do
3. **Context from previous phases** - What to build on (if applicable)
4. **Code patterns to follow** - Reference existing code style
5. **Edge cases to handle** - Anything tricky to watch for
6. **Success criteria addressed** - Reference which criteria this phase helps satisfy via the `addressesCriteria` field
7. **Research recommendations** (if applicable) - Include relevant insights from matched research

Example phase content:
```
Create the authentication middleware that validates JWT tokens.

Tasks:
1. Create src/middleware/auth.ts
2. Implement validateToken() function that:
   - Extracts token from Authorization header
   - Verifies JWT signature using jsonwebtoken
   - Attaches decoded user to request object
3. Create src/types/auth.ts with AuthRequest interface
4. Export middleware for use in routes

Follow the existing middleware pattern in src/middleware/logger.ts.

Edge cases:
- Missing Authorization header → 401
- Invalid token format → 401
- Expired token → 401 with specific message
```

Example phase content with research reference:
```
Implement data fetching using React Query.

**Research Reference:** react-query (researched 3 days ago)

Tasks:
1. Install @tanstack/react-query v5
2. Set up QueryClient with recommended staleTime/cacheTime
3. Create useUserQuery hook following documented patterns

**From research - Key patterns:**
- Use query keys as arrays for proper cache invalidation
- Implement stale-while-revalidate for better UX

**From research - Avoid:**
- Mixing server state with local UI state
- Over-fetching by creating too-granular queries

See full research: .tiki/research/react-query/research.md
```

## Handling Simple vs Complex Issues

### Simple Issue (1 phase)
If the issue is small enough for one context window, create a single phase:
```json
{
  "phases": [
    {
      "number": 1,
      "title": "Complete implementation",
      "content": "Full implementation details...",
      ...
    }
  ],
  "metadata": {
    "estimatedPhases": 1,
    "actualPhases": 1,
    "parallelizable": false
  }
}
```

### Complex Issue (multiple phases)
Break into logical chunks:
- By component (auth middleware → login endpoint → protected routes)
- By layer (database → service → API → tests)
- By file (if a large file needs multiple changes)

## Error Handling

- **Issue not found:** "Issue #<number> not found. Check the issue number."
- **Issue already planned:** "Plan already exists at `.tiki/plans/issue-<number>.json`. Use `/tiki:discuss-phases` to modify or delete the file to re-plan."
- **No gh CLI:** "GitHub CLI (gh) not installed or not authenticated."

## Notes

- Plans are stored in `.tiki/plans/` directory
- Status values: `planned`, `in_progress`, `completed`, `failed`
- Phase status values: `pending`, `in_progress`, `completed`, `failed`, `skipped`
- Always suggest `/tiki:execute` as the next step after planning
- Research integration automatically matches issue keywords against `.tiki/research/index.json`
- Use `--no-research` flag to skip research integration
- Research older than 30 days is marked as stale with a refresh warning
