---
type: prompt
name: tiki:define-requirements
description: Interactively define/update project requirements. Analyzes codebase and issues to propose requirements.
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
argument-hint: [--from-issues] [--refresh] [--category <name>]
---

# Define Requirements

Interactively define or update project requirements through guided analysis. This command analyzes the codebase, existing project context, and open GitHub issues to help create a structured `.tiki/REQUIREMENTS.md` document with a machine-readable `.tiki/requirements.json` backing file.

## Usage

```
/tiki:define-requirements
/tiki:define-requirements --from-issues
/tiki:define-requirements --refresh
/tiki:define-requirements --category "Security"
```

**Flags:**
- `--from-issues` - Seed requirements from open GitHub issues
- `--refresh` - Force re-analysis even if requirements exist
- `--category <name>` - Focus on a specific category (e.g., Security, Performance, UX)

## Instructions

### Step 0: Parse Arguments

Parse the command arguments to determine mode and options:

```
Arguments provided: $ARGUMENTS

Parse the following flags:
- --from-issues: boolean (default: false)
  If present, fetch GitHub issues to seed requirements

- --refresh: boolean (default: false)
  If present, force re-analysis even if .tiki/REQUIREMENTS.md exists

- --category: string (default: null)
  If provided, focus on the specified category only

Store parsed values:
- fromIssues = true if --from-issues present
- refresh = true if --refresh present
- category = value after --category, or null if not provided
```

### Step 1: Check Existing Requirements

Check if requirements files already exist in the project:

```bash
# Check for .tiki/REQUIREMENTS.md
if [ -f ".tiki/REQUIREMENTS.md" ]; then echo "REQUIREMENTS_MD_EXISTS"; else echo "REQUIREMENTS_MD_NOT_FOUND"; fi

# Check for .tiki/requirements.json
if [ -f ".tiki/requirements.json" ]; then echo "REQUIREMENTS_JSON_EXISTS"; else echo "REQUIREMENTS_JSON_NOT_FOUND"; fi
```

**If .tiki/REQUIREMENTS.md exists AND --refresh is NOT set:**

Use AskUserQuestion to prompt the user:

```
Existing requirements found in this project:
- .tiki/REQUIREMENTS.md: [EXISTS/NOT FOUND]
- .tiki/requirements.json: [EXISTS/NOT FOUND]

What would you like to do?

1. Update existing - Add new requirements while keeping existing ones
2. View existing - Display current requirements
3. Overwrite - Start fresh (existing will be backed up)
4. Cancel - Exit without changes
```

Handle each option:
- **Update existing**: Continue to Step 2, but load existing requirements first
- **View existing**: Display the contents of .tiki/REQUIREMENTS.md and exit
- **Overwrite**: Backup existing files and continue to Step 2
  ```bash
  # Backup existing files
  cp .tiki/REQUIREMENTS.md .tiki/REQUIREMENTS.md.backup.$(date +%Y%m%d%H%M%S) 2>/dev/null
  cp .tiki/requirements.json .tiki/requirements.json.backup.$(date +%Y%m%d%H%M%S) 2>/dev/null
  ```
- **Cancel**: Exit with message "No changes made."

**If --refresh IS set:**

Skip the prompt and proceed to backup and regenerate:

```bash
# Backup existing files before refresh
cp .tiki/REQUIREMENTS.md .tiki/REQUIREMENTS.md.backup.$(date +%Y%m%d%H%M%S) 2>/dev/null
cp .tiki/requirements.json .tiki/requirements.json.backup.$(date +%Y%m%d%H%M%S) 2>/dev/null
```

### Step 2: Load Context Files

Load available project context to inform requirements analysis:

#### 2a: Read PROJECT.md (if exists)

```bash
cat PROJECT.md 2>/dev/null && echo "PROJECT_MD_FOUND" || echo "PROJECT_MD_NOT_FOUND"
```

If PROJECT.md exists, extract:
- Project vision and goals
- Target users and their needs
- Technical constraints
- Success criteria
- Non-goals / out of scope

Store as `projectContext` for later use.

#### 2b: Read CLAUDE.md (if exists)

```bash
cat CLAUDE.md 2>/dev/null && echo "CLAUDE_MD_FOUND" || echo "CLAUDE_MD_NOT_FOUND"
```

If CLAUDE.md exists, extract:
- Project conventions and patterns
- Architecture notes
- Testing approach
- Development guidelines

Store as `claudeContext` for later use.

#### 2c: Read .tiki/STACK.md (if exists)

```bash
cat .tiki/STACK.md 2>/dev/null && echo "STACK_MD_FOUND" || echo "STACK_MD_NOT_FOUND"
```

If STACK.md exists, extract:
- Languages and versions
- Frameworks and libraries
- Testing tools
- DevOps configuration

Store as `stackContext` for later use.

#### 2d: Summarize Loaded Context

After loading, summarize what was found:

```
## Context Loaded

| Source | Status | Key Information |
|--------|--------|-----------------|
| PROJECT.md | Found/Not Found | [summary of vision/goals if found] |
| CLAUDE.md | Found/Not Found | [summary of conventions if found] |
| .tiki/STACK.md | Found/Not Found | [summary of stack if found] |

This context will inform requirement suggestions.
```

---

## Flag: --from-issues

When the `--from-issues` flag is present, the command operates in issue-seeding mode:

### Behavior Changes

1. **Skip Codebase Analysis**: Step 4 (codebase analysis) is completely skipped
2. **Focus on Issues Only**: Requirements are generated exclusively from open GitHub issues
3. **Direct Mapping**: Each issue becomes a pending requirement

### Issue-to-Requirement Mapping

```
For each open GitHub issue:
  1. Use issue title as requirement text
     - Prefix with "System shall " if not already present
     - Example: "Add dark mode" -> "System shall add dark mode functionality"

  2. Map issue labels to categories:
     | Label | Category |
     |-------|----------|
     | bug, defect, fix | QUAL |
     | enhancement, feature, feat | CORE |
     | docs, documentation | DOC |
     | security, auth | SEC |
     | performance, perf, speed | PERF |
     | (no matching label) | CORE |

  3. Auto-generate verification from issue body:
     - Look for "Acceptance Criteria" section -> use as verification
     - Look for "Expected behavior" section -> use as verification
     - Look for checkbox items (- [ ]) -> combine as verification steps
     - If none found -> generate: "Verify {issue title} works as described"

  4. Set status to "pending"
  5. Set implementedBy to [issue_number]
```

### Example Output

```json
{
  "id": "CORE-01",
  "text": "System shall add dark mode toggle",
  "category": "CORE",
  "verification": {
    "type": "manual_test",
    "description": "Toggle switches between light and dark themes"
  },
  "status": "pending",
  "implementedBy": [42],
  "evidence": ["Issue #42: Add dark mode toggle"]
}
```

### Workflow

```
1. Parse --from-issues flag
2. Fetch open GitHub issues (Step 3)
3. Skip to Step 5 (Generate Proposed Requirements)
4. Map each issue directly to a requirement
5. Continue with Step 6 (Interactive Refinement)
```

---

## Flag: --refresh

When the `--refresh` flag is present, the command synchronizes requirements with current codebase and issue state.

### Behavior Changes

1. **Load Existing Requirements**: Read `.tiki/requirements.json` as the starting point
2. **Re-run Codebase Analysis**: Execute full Step 4 analysis
3. **Status Verification**: Check each requirement against current state
4. **Issue Sync**: Verify closed issues and update requirement statuses

### Refresh Process

```
1. Load existing .tiki/requirements.json
   - If file doesn't exist, show error and exit
   - If file is corrupted, offer recovery options

2. Re-run codebase analysis (Step 4)
   - Detect implemented features
   - Map to existing requirements

3. For each "pending" requirement:
   a. Check if matching functionality now exists in code
   b. If found with high confidence (>80%):
      - Update status to "implemented"
      - Add evidence from codebase scan
   c. If partially found (50-80%):
      - Update status to "partial"
      - Add partial evidence

4. For each "implemented" requirement:
   a. Verify code still exists
   b. If code removed or refactored:
      - Flag for review
      - Optionally revert to "pending"

5. Check implementedBy issue status:
   - For each issue number in implementedBy:
     - Run: gh issue view {number} --json state
     - If state == "closed" AND requirement is "pending":
       - Update status to "implemented"
     - If state == "open" AND requirement is "implemented":
       - Flag for review

6. Generate diff summary
7. Write updated files
```

### Diff Output

After refresh, display what changed:

```
## Refresh Complete

### Status Changes

| Requirement | Previous | Current | Reason |
|-------------|----------|---------|--------|
| CORE-03 | pending | implemented | Code detected in src/auth.ts |
| SEC-01 | implemented | pending | Code removed in refactor |
| QUAL-02 | pending | implemented | Issue #45 closed |

### New Evidence Found

| Requirement | Evidence Added |
|-------------|----------------|
| CORE-03 | POST /api/auth/login (src/auth.ts:42) |

### Issues Synced

| Issue | Status | Linked Requirements |
|-------|--------|---------------------|
| #42 | closed | CORE-04 |
| #45 | closed | QUAL-02 |
| #48 | open | SEC-02 |

### Summary

- 2 requirements upgraded to implemented
- 1 requirement reverted to pending
- 3 issues synced
- 0 new gaps detected
```

---

### Step 3: Fetch Open GitHub Issues

If `--from-issues` flag is present OR if no context files were found, fetch GitHub issues:

```bash
# Fetch open issues with details
gh issue list --state open --json number,title,body,labels --limit 50
```

**If gh command fails:**

```
GitHub CLI not available or not authenticated.
Run 'gh auth login' to authenticate, or continue without issue seeding.

Continue without issues? [y/n]
```

**If successful:**

Parse the JSON response and categorize issues by their labels or content:

- **Feature requests**: Issues with labels like "feature", "enhancement", "request"
- **Bug reports**: Issues with labels like "bug", "defect", "fix"
- **Technical debt**: Issues with labels like "tech-debt", "refactor", "cleanup"
- **Documentation**: Issues with labels like "docs", "documentation"
- **Other**: Issues without matching labels

Store as `issueContext`:

```json
{
  "totalIssues": 15,
  "categories": {
    "feature": [
      {"number": 42, "title": "Add dark mode", "labels": ["feature", "ui"]}
    ],
    "bug": [
      {"number": 38, "title": "Login fails on mobile", "labels": ["bug", "critical"]}
    ],
    "techDebt": [],
    "documentation": [],
    "other": []
  },
  "fetchedAt": "2026-01-18T10:30:00Z"
}
```

Display summary:

```
## GitHub Issues Loaded

Found 15 open issues:
- 5 Feature requests
- 3 Bug reports
- 2 Tech debt items
- 1 Documentation task
- 4 Other/uncategorized

These will be used to seed requirement suggestions.
```

---

### Step 4: Analyze Codebase for Existing Functionality

Scan the codebase to detect implemented features and map them to potential requirements. This creates an inventory of what already exists.

#### 4a: Detect Existing Commands (for Tiki-like projects)

For projects that use command patterns (CLI tools, Claude Code commands, etc.):

```
# Find command files in .claude/commands/ directory
Glob: .claude/commands/**/*.md

# Find CLI command definitions
Glob: **/commands/*.ts, **/commands/*.js, **/cmd/*.go

# Find npm scripts in package.json
Read: package.json -> extract "scripts" section
```

Map discovered commands to potential requirements:

```json
{
  "commands": [
    {"file": ".claude/commands/tiki/execute.md", "name": "execute", "type": "tiki-command"},
    {"file": "src/cli/build.ts", "name": "build", "type": "cli-command"}
  ]
}
```

#### 4b: Detect API Endpoints

Search for common API route patterns:

```
# Express/Koa style routes
Grep: "app\.(get|post|put|delete|patch)\s*\(" --type ts --type js

# NestJS/decorator style routes
Grep: "@(Get|Post|Put|Delete|Patch)\s*\(" --type ts

# FastAPI style routes (Python)
Grep: "@(app|router)\.(get|post|put|delete)\s*\(" --type py

# Go HTTP handlers
Grep: "HandleFunc\s*\(|Handle\s*\(" --type go

# Next.js API routes
Glob: **/pages/api/**/*.ts, **/app/api/**/route.ts
```

Extract route patterns for API requirements:

```json
{
  "apiEndpoints": [
    {"method": "GET", "path": "/api/users", "file": "src/routes/users.ts", "line": 15},
    {"method": "POST", "path": "/api/auth/login", "file": "src/routes/auth.ts", "line": 42}
  ]
}
```

#### 4c: Detect Test Coverage

Identify tested functionality to understand what's verified:

```
# Find test files
Glob: **/*.test.ts, **/*.spec.ts, **/*.test.js, **/*.spec.js
Glob: **/__tests__/**/*.ts, **/__tests__/**/*.js
Glob: **/test/**/*.py, **/*_test.go

# Count test files by area
# Group by directory to identify well-tested vs under-tested areas

# Check for coverage reports
Read: coverage/coverage-summary.json (if exists)
Read: coverage/lcov-report/index.html (if exists)
```

Map tested functionality:

```json
{
  "testCoverage": {
    "totalTestFiles": 24,
    "byArea": {
      "src/api": {"testFiles": 8, "sourceFiles": 12},
      "src/services": {"testFiles": 10, "sourceFiles": 10},
      "src/utils": {"testFiles": 6, "sourceFiles": 15}
    },
    "underTested": ["src/utils", "src/legacy"]
  }
}
```

#### 4d: Detect Authentication/Authorization

Search for auth-related patterns:

```
# Auth patterns
Grep: "(auth|authenticate|authorization)" -i --type ts --type js

# Login/logout functionality
Grep: "(login|logout|signIn|signOut|session)" -i --type ts --type js

# JWT/token patterns
Grep: "(jwt|token|bearer)" -i --type ts --type js

# Middleware auth patterns
Grep: "(requireAuth|isAuthenticated|authMiddleware|@Authorized)" --type ts --type js

# OAuth patterns
Grep: "(oauth|passport|provider)" -i --type ts --type js

# Permission/role patterns
Grep: "(permission|role|access|canAccess)" -i --type ts --type js
```

Map authentication features:

```json
{
  "authFeatures": {
    "hasAuth": true,
    "patterns": ["jwt", "session"],
    "endpoints": [
      {"path": "/api/auth/login", "file": "src/routes/auth.ts"},
      {"path": "/api/auth/logout", "file": "src/routes/auth.ts"}
    ],
    "middleware": ["src/middleware/auth.ts"],
    "roles": ["admin", "user", "guest"]
  }
}
```

#### 4e: Build Functionality Map

Combine all detected patterns into a structured functionality map:

```json
{
  "functionalityMap": {
    "implemented": [
      {
        "category": "Authentication",
        "features": [
          {"name": "User login", "evidence": ["POST /api/auth/login", "src/routes/auth.ts"], "tested": true},
          {"name": "User logout", "evidence": ["POST /api/auth/logout", "src/routes/auth.ts"], "tested": true},
          {"name": "JWT token refresh", "evidence": ["POST /api/auth/refresh", "src/routes/auth.ts"], "tested": false}
        ]
      },
      {
        "category": "User Management",
        "features": [
          {"name": "List users", "evidence": ["GET /api/users", "src/routes/users.ts"], "tested": true},
          {"name": "Create user", "evidence": ["POST /api/users", "src/routes/users.ts"], "tested": true}
        ]
      },
      {
        "category": "Commands",
        "features": [
          {"name": "execute command", "evidence": [".claude/commands/tiki/execute.md"], "tested": false},
          {"name": "plan-issue command", "evidence": [".claude/commands/tiki/plan-issue.md"], "tested": true}
        ]
      }
    ],
    "pending": [
      {
        "category": "Features from Issues",
        "features": [
          {"name": "Dark mode", "source": "Issue #42", "labels": ["feature", "ui"]},
          {"name": "Export to PDF", "source": "Issue #38", "labels": ["feature"]}
        ]
      }
    ],
    "metadata": {
      "analyzedAt": "2026-01-18T10:30:00Z",
      "totalImplemented": 7,
      "totalPending": 2,
      "totalTested": 5
    }
  }
}
```

Display the functionality map summary:

```
## Codebase Analysis Complete

### Implemented Functionality

| Category | Features | Tested |
|----------|----------|--------|
| Authentication | 3 features | 2/3 (67%) |
| User Management | 2 features | 2/2 (100%) |
| Commands | 2 features | 1/2 (50%) |

### Pending (from Issues)

| Feature | Source | Labels |
|---------|--------|--------|
| Dark mode | Issue #42 | feature, ui |
| Export to PDF | Issue #38 | feature |

### Coverage Gaps

- JWT token refresh: Implemented but not tested
- execute command: Implemented but not tested
```

#### 4f: Match Issues to Detected Functionality

Cross-reference open GitHub issues with detected patterns to identify:

1. Issues that describe already-implemented functionality
2. Issues that enhance existing functionality
3. Truly new functionality requests

```
For each open issue from Step 3:
  1. Extract keywords from issue title and body
  2. Search functionalityMap.implemented for matches
  3. If match found with >70% confidence:
     - Flag as "potentially implemented"
     - Include evidence (file paths, endpoints)
  4. If partial match found:
     - Flag as "enhancement to existing"
     - Link to related implemented feature
  5. If no match:
     - Flag as "new functionality"
```

Build issue-to-functionality mapping:

```json
{
  "issueAnalysis": [
    {
      "issue": {"number": 42, "title": "Add dark mode toggle"},
      "status": "new",
      "matchedFeatures": [],
      "confidence": 0,
      "recommendation": "New feature - add to requirements"
    },
    {
      "issue": {"number": 45, "title": "Fix login button not working"},
      "status": "potentiallyImplemented",
      "matchedFeatures": [
        {"name": "User login", "file": "src/routes/auth.ts", "tested": true}
      ],
      "confidence": 0.85,
      "recommendation": "Bug fix for existing feature - investigate before adding"
    },
    {
      "issue": {"number": 48, "title": "Add password reset"},
      "status": "enhancement",
      "matchedFeatures": [
        {"name": "User login", "category": "Authentication"}
      ],
      "confidence": 0.60,
      "recommendation": "Enhancement to Authentication - add to that category"
    }
  ]
}
```

Display issue analysis results:

```
## Issue-to-Functionality Analysis

### Potentially Already Implemented (Review Needed)

| Issue | Title | Matched Feature | Confidence |
|-------|-------|-----------------|------------|
| #45 | Fix login button not working | User login (auth.ts) | 85% |

**Action:** These issues may describe existing functionality. Review before adding as requirements.

### Enhancements to Existing Features

| Issue | Title | Related Feature | Confidence |
|-------|-------|-----------------|------------|
| #48 | Add password reset | Authentication system | 60% |

**Action:** Add as requirements under related category.

### New Functionality

| Issue | Title | Suggested Category |
|-------|-------|-------------------|
| #42 | Add dark mode toggle | UI/Theming |
| #38 | Export to PDF | Data Export |

**Action:** Add as new requirement categories.
```

---

### Step 5: Generate Proposed Requirements

Transform the functionality map and issue analysis into structured requirements with standard identifiers.

#### 5a: Define Category Conventions

Use standard requirement categories with two-letter codes:

| Category | Code | Description |
|----------|------|-------------|
| Core Functionality | CORE | Essential features that define the product |
| Planning | PLAN | Planning and preparation capabilities |
| Execution | EXEC | Runtime behavior and execution flows |
| Quality | QUAL | Testing, reliability, and code quality |
| Documentation | DOC | Documentation and help resources |
| Performance | PERF | Speed, scalability, and efficiency |
| Security | SEC | Authentication, authorization, data protection |

Custom categories can be added using a similar two-to-four letter code pattern (e.g., `UI`, `DATA`, `API`, `INTG`).

#### 5b: Map Detected Functionality to Requirements

For each detected pattern from Step 4, create a requirement:

```json
{
  "requirements": [
    {
      "id": "CORE-01",
      "text": "System shall provide user login functionality",
      "category": "CORE",
      "verification": {
        "type": "automated_test",
        "description": "Test suite validates login with valid/invalid credentials"
      },
      "status": "implemented",
      "implementedBy": [],
      "evidence": ["POST /api/auth/login", "src/routes/auth.ts:42"]
    },
    {
      "id": "SEC-01",
      "text": "System shall validate JWT tokens on protected routes",
      "category": "SEC",
      "verification": {
        "type": "automated_test",
        "description": "Test invalid/expired tokens return 401"
      },
      "status": "implemented",
      "implementedBy": [],
      "evidence": ["src/middleware/auth.ts", "authMiddleware function"]
    },
    {
      "id": "QUAL-01",
      "text": "JWT token refresh shall have automated test coverage",
      "category": "QUAL",
      "verification": {
        "type": "automated_test",
        "description": "Token refresh endpoint has passing tests"
      },
      "status": "pending",
      "implementedBy": [],
      "evidence": ["Coverage gap detected: JWT token refresh untested"]
    }
  ]
}
```

**Verification types and when to use them:**

| Type | When to Use | Example |
|------|-------------|---------|
| `manual_test` | UX flows, subjective quality | "User can complete checkout in under 30 seconds" |
| `automated_test` | Testable behavior | "API returns 200 for valid requests" |
| `state_check` | Data structure requirements | "Database schema includes audit timestamps" |
| `code_review` | Patterns, conventions | "All API endpoints use consistent error format" |
| `documentation` | Docs exist and are accurate | "README includes setup instructions" |

**Status values:**

- `implemented`: Detected in codebase with evidence
- `pending`: From issue or gap analysis, not yet implemented
- `partial`: Partially implemented (some evidence found)

#### 5c: Map Issues to Requirements

For each open GitHub issue from Step 3, create a pending requirement:

```
For each issue in issueContext:
  1. Determine category from issue labels:
     - bug, defect -> QUAL
     - feature, enhancement -> CORE
     - security -> SEC
     - performance, perf -> PERF
     - docs, documentation -> DOC
     - tech-debt, refactor -> QUAL
     - (default) -> CORE

  2. Generate requirement ID:
     - Find highest existing ID in category
     - Increment: CORE-05 -> CORE-06

  3. Create requirement entry:
     {
       "id": "CORE-06",
       "text": "System shall [derived from issue title]",
       "category": "CORE",
       "verification": {
         "type": "[inferred from issue type]",
         "description": "[derived from issue body or title]"
       },
       "status": "pending",
       "implementedBy": [42],
       "evidence": ["Issue #42: Add dark mode toggle"]
     }
```

Handle issue-to-functionality matches from Step 4f:

- **"potentiallyImplemented"**: Flag for user review, don't auto-add
- **"enhancement"**: Add as pending requirement linked to existing category
- **"new"**: Add as new pending requirement

#### 5d: Display Proposed Requirements

Present all proposed requirements in a formatted output:

```
## Proposed Requirements

### CORE - Core Functionality (4 requirements)

| ID | Requirement | Status | Verification | Source |
|----|-------------|--------|--------------|--------|
| CORE-01 | User login functionality | ✅ implemented | automated_test | codebase |
| CORE-02 | User logout functionality | ✅ implemented | automated_test | codebase |
| CORE-03 | List users | ✅ implemented | automated_test | codebase |
| CORE-04 | Dark mode toggle | ⏳ pending | manual_test | Issue #42 |

### SEC - Security (2 requirements)

| ID | Requirement | Status | Verification | Source |
|----|-------------|--------|--------------|--------|
| SEC-01 | JWT token validation | ✅ implemented | automated_test | codebase |
| SEC-02 | Password reset flow | ⏳ pending | automated_test | Issue #48 |

### QUAL - Quality (2 requirements)

| ID | Requirement | Status | Verification | Source |
|----|-------------|--------|--------------|--------|
| QUAL-01 | Token refresh test coverage | ⏳ pending | automated_test | gap analysis |
| QUAL-02 | Fix login button not working | ⏳ pending | automated_test | Issue #45 |

---

**Summary:**
- 8 total requirements proposed
- 4 implemented (50%)
- 4 pending (50%)
- Coverage gaps identified: 1

**Flagged for Review:**
- Issue #45 may describe already-implemented functionality (85% match)
```

---

### Step 6: Interactive Refinement

Allow the user to iteratively refine the proposed requirements before finalizing.

#### 6a: Present Options via AskUserQuestion

Use AskUserQuestion to present refinement options:

```
## Requirement Refinement

8 requirements proposed. What would you like to do?

1. **Accept** - Save these requirements as-is
2. **Edit** - Modify a requirement (specify ID, e.g., "Edit CORE-04")
3. **Add** - Create a new requirement
4. **Remove** - Delete a requirement (specify ID, e.g., "Remove QUAL-02")
5. **Reorganize** - Move requirements between categories or rename categories
6. **Review flagged** - Examine requirements flagged for review

Enter your choice (or type a command like "Edit SEC-01"):
```

#### 6b: Handle Edit Operation

When user selects "Edit" or types "Edit {ID}":

```
## Editing Requirement: CORE-04

Current values:
- **ID:** CORE-04
- **Text:** Dark mode toggle
- **Category:** CORE
- **Status:** pending
- **Verification:** manual_test - "User can toggle dark mode"
- **Source:** Issue #42

What would you like to change?
1. Text/description
2. Category (current: CORE)
3. Verification type/description
4. Status
5. All fields (show full edit form)
6. Cancel

Enter choice:
```

Process the edit:

```
User: 1 (Text/description)

Claude: Enter new requirement text:

User: System shall provide light/dark theme toggle with system preference detection

Claude: Updated CORE-04:
- **Text:** System shall provide light/dark theme toggle with system preference detection

[Return to main refinement menu]
```

#### 6c: Handle Add Operation

When user selects "Add":

```
## Add New Requirement

**Step 1: Category**
Select category for the new requirement:
1. CORE - Core Functionality
2. SEC - Security
3. QUAL - Quality
4. PERF - Performance
5. DOC - Documentation
6. [New category] - Create a custom category

Enter choice:

User: 1

**Step 2: Requirement Text**
Describe the requirement (use "System shall..." format):

User: System shall support SSO authentication via SAML

**Step 3: Verification**
How should this requirement be verified?
1. automated_test - Testable behavior
2. manual_test - UX flows, subjective quality
3. code_review - Patterns, conventions
4. state_check - Data structure requirements
5. documentation - Docs exist and are accurate

Enter choice and description:

User: 1 - SSO login flow returns valid session

**Step 4: Status**
1. pending (default)
2. implemented
3. partial

User: 1

---

## New Requirement Created

**CORE-05**: System shall support SSO authentication via SAML
- Category: CORE
- Verification: automated_test - "SSO login flow returns valid session"
- Status: pending

[Return to main refinement menu]
```

#### 6d: Handle Remove Operation

When user selects "Remove" or types "Remove {ID}":

```
## Remove Requirement: QUAL-02

**QUAL-02:** Fix login button not working
- Source: Issue #45
- Status: pending

Are you sure you want to remove this requirement?
1. Yes, remove it
2. No, keep it
3. Move to a different category instead

Enter choice:

User: 1

Requirement QUAL-02 removed.

Note: Other QUAL requirement IDs have been preserved (not renumbered).

[Return to main refinement menu]
```

#### 6e: Handle Reorganize Operation

When user selects "Reorganize":

```
## Reorganize Requirements

What would you like to do?
1. Move a requirement to a different category
2. Create a new category
3. Rename a category
4. Merge two categories
5. View current category breakdown
6. Cancel

Enter choice:

User: 1

Which requirement to move? Enter ID:

User: QUAL-01

Current category: QUAL (Quality)

Move to which category?
1. CORE - Core Functionality (4 requirements)
2. SEC - Security (2 requirements)
3. PERF - Performance (0 requirements)
4. DOC - Documentation (0 requirements)
5. [New category]

User: 2

Moved QUAL-01 to SEC category.

New ID: SEC-03 (renumbered to fit SEC sequence)

**SEC-03:** Token refresh test coverage
- Was: QUAL-01
- Verification: automated_test

[Return to main refinement menu]
```

#### 6f: Loop Until Accept

Continue the refinement loop until user selects "Accept":

```
Track changes during refinement:
- changesLog = []

After each operation:
- Add to changesLog: { action, requirementId, timestamp, details }

When user selects "Accept":

## Requirements Finalized

**Changes Made This Session:**
- Edited CORE-04: Updated text to include system preference detection
- Added CORE-05: SSO authentication via SAML
- Removed QUAL-02: Duplicate of implemented feature
- Moved QUAL-01 -> SEC-03: Recategorized for security focus

**Final Summary:**
- 8 total requirements (was 8)
- Categories: CORE (5), SEC (3), QUAL (1), PERF (0), DOC (0)
- Implemented: 4 (50%)
- Pending: 4 (50%)

Proceed to save requirements? [Yes / Make more changes]
```

If user confirms:

```
Writing requirements...
- Created: .tiki/REQUIREMENTS.md
- Created: .tiki/requirements.json

Requirements saved successfully.

### Next Steps

1. **Review .tiki/REQUIREMENTS.md** - Human-readable format
2. **Use in planning** - `/tiki:plan-issue` will reference requirements
3. **Track implementation** - Requirements linked to issues via `implementedBy`
4. **Update later** - `/tiki:define-requirements` to add/modify requirements
```

---

### Step 7: Generate Output Files

After the user accepts the finalized requirements, generate both output files to persist the requirements data.

#### 7a: Generate .tiki/REQUIREMENTS.md

Create a human-readable markdown file in the .tiki folder:

```markdown
# Requirements

## Coverage Summary

The current requirements cover [summary of what's covered based on categories].
[Any gaps identified from the analysis]

## v1 Requirements

### Core Functionality
- **CORE-01**: User can fetch GitHub issue details
  - *Verify: Manual test* - Run `/tiki:get-issue` and confirm output
  - *Implemented by: #12*

- **CORE-02**: User can plan issue into phases
  - *Verify: Automated test* - Plan validation passes
  - *Status: Pending*

### Security
- **SEC-01**: System validates JWT tokens on protected routes
  - *Verify: Automated test* - Invalid tokens return 401
  - *Implemented by: #8, #15*

### Quality
- **QUAL-01**: JSON schema validation for state files
  - *Verify: Automated test* - Schema validation passes
  - *Status: Pending*

## Out of Scope
- Items explicitly marked as out of scope during refinement
- Features deferred to future versions
```

**Format Rules for .tiki/REQUIREMENTS.md:**

1. **Coverage Summary**: Brief overview of what the requirements address
2. **Version Sections**: Group by version (v1, v2, etc.) if versioning is used
3. **Category Sections**: Under each version, group by category
4. **Requirement Format**:
   - `**{ID}**: {requirement text}`
   - `*Verify: {type}* - {description}`
   - If implemented: `*Implemented by: #{issue}*`
   - If pending: `*Status: Pending*`
5. **Out of Scope**: List items explicitly excluded

Generate the file using the Write tool:

```
Write .tiki/REQUIREMENTS.md with the formatted content based on finalizedRequirements from Step 6.

For each category in finalizedRequirements:
  1. Add category header: ### {categoryName}
  2. For each requirement in category:
     - Add requirement line: - **{id}**: {text}
     - Add verification line: - *Verify: {verification.type}* - {verification.description}
     - If status == "implemented" and implementedBy.length > 0:
       - Add: - *Implemented by: #{implementedBy.join(', #')}*
     - Else if status == "pending":
       - Add: - *Status: Pending*
     - Else if status == "partial":
       - Add: - *Status: Partial*
```

#### 7b: Generate .tiki/requirements.json

Create a machine-readable JSON file for programmatic access:

```json
{
  "version": "1.0",
  "createdAt": "2026-01-18T10:30:00Z",
  "updatedAt": "2026-01-18T10:30:00Z",
  "categories": [
    {
      "id": "core",
      "name": "Core Functionality",
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
          "text": "User can plan issue into phases",
          "verification": {
            "type": "automated_test",
            "description": "Plan validation passes"
          },
          "status": "pending",
          "implementedBy": [],
          "verifiedAt": null
        }
      ]
    },
    {
      "id": "sec",
      "name": "Security",
      "requirements": [
        {
          "id": "SEC-01",
          "text": "System validates JWT tokens on protected routes",
          "verification": {
            "type": "automated_test",
            "description": "Invalid tokens return 401"
          },
          "status": "implemented",
          "implementedBy": [8, 15],
          "verifiedAt": null
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
            "description": "Schema validation passes"
          },
          "status": "pending",
          "implementedBy": [],
          "verifiedAt": null
        }
      ]
    }
  ],
  "versions": {
    "v1": ["CORE-01", "CORE-02", "SEC-01", "QUAL-01"],
    "v2": []
  },
  "outOfScope": [
    "Mobile application support",
    "Offline mode"
  ]
}
```

**Schema Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Schema version for backwards compatibility |
| `createdAt` | ISO timestamp | When requirements were first created |
| `updatedAt` | ISO timestamp | Last modification time |
| `categories` | array | List of requirement categories |
| `categories[].id` | string | Lowercase category code (e.g., "core") |
| `categories[].name` | string | Human-readable category name |
| `categories[].requirements` | array | Requirements in this category |
| `requirements[].id` | string | Requirement ID (e.g., "CORE-01") |
| `requirements[].text` | string | Requirement description |
| `requirements[].verification` | object | How to verify this requirement |
| `requirements[].verification.type` | string | One of: manual_test, automated_test, state_check, code_review, documentation |
| `requirements[].verification.description` | string | Specific verification steps |
| `requirements[].status` | string | One of: pending, implemented, partial, verified |
| `requirements[].implementedBy` | array<number> | GitHub issue numbers that implement this |
| `requirements[].verifiedAt` | ISO timestamp or null | When requirement was verified |
| `versions` | object | Maps version names to requirement IDs |
| `outOfScope` | array<string> | Items explicitly excluded |

Generate the file:

```
Ensure .tiki directory exists:
  mkdir -p .tiki

Write .tiki/requirements.json with JSON.stringify(requirementsData, null, 2)

Where requirementsData is built from finalizedRequirements:
  1. Set version to "1.0"
  2. Set createdAt to current ISO timestamp (or preserve if updating)
  3. Set updatedAt to current ISO timestamp
  4. Map each category from finalizedRequirements to categories array
  5. For each requirement, ensure all fields are present:
     - id, text, verification, status, implementedBy, verifiedAt
  6. Build versions object from requirements (default all to v1)
  7. Include outOfScope items from refinement session
```

#### 7c: Sync Logic

Both files must contain equivalent requirements data. The sync process ensures consistency:

```
After writing both files, verify sync:

1. Parse requirements.json
2. For each requirement in JSON:
   - Verify corresponding entry exists in .tiki/REQUIREMENTS.md
   - Check ID, text, and status match
3. For each requirement in .tiki/REQUIREMENTS.md:
   - Verify corresponding entry exists in JSON
4. If mismatch detected:
   - Log warning: "Sync mismatch detected for {ID}"
   - Regenerate both files from the authoritative source (requirements.json)

The JSON file is the authoritative source. .tiki/REQUIREMENTS.md is a human-readable view.
```

**Update Flow:**

When requirements are updated later:

1. Load existing `.tiki/requirements.json`
2. Apply changes (add/edit/remove)
3. Update `updatedAt` timestamp
4. Regenerate both files
5. Verify sync

---

### Step 8: Display Completion Summary

After successfully writing both files, display a comprehensive summary of what was created.

#### 8a: Files Created Summary

```
## Requirements Definition Complete

### Files Created

| File | Path | Size |
|------|------|------|
| Human-readable | .tiki/REQUIREMENTS.md | 2.4 KB |
| Machine-readable | .tiki/requirements.json | 3.1 KB |
```

#### 8b: Requirements Statistics

```
### Requirements Summary

**Total Requirements:** 8

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Implemented | 4 | 50% |
| ⏳ Pending | 3 | 37.5% |
| 🔄 Partial | 1 | 12.5% |
| ✓ Verified | 0 | 0% |
```

#### 8c: Category Breakdown

```
### By Category

| Category | Code | Requirements | Implemented |
|----------|------|--------------|-------------|
| Core Functionality | CORE | 5 | 3 (60%) |
| Security | SEC | 2 | 1 (50%) |
| Quality | QUAL | 1 | 0 (0%) |

**Categories with gaps:** QUAL (0% implemented)
```

#### 8d: Version Information

```
### Version Mapping

- **v1**: 8 requirements (CORE-01 through CORE-05, SEC-01, SEC-02, QUAL-01)
- **v2**: 0 requirements (not yet planned)

### Out of Scope

- Mobile application support
- Offline mode
```

#### 8e: Next Steps

Provide actionable guidance for using the requirements:

```
### Next Steps

1. **Review Requirements**
   - Open `.tiki/REQUIREMENTS.md` to review the human-readable format
   - Verify all requirements accurately reflect project needs

2. **Link to Planning**
   - Use `/tiki:plan-issue` to reference requirements when planning work
   - Plans will auto-link to relevant requirements via `addressesCriteria`

3. **Track Implementation**
   - As issues are completed, update `implementedBy` arrays
   - Run `/tiki:define-requirements --refresh` to sync with closed issues

4. **Update Requirements**
   - Run `/tiki:define-requirements` to add or modify requirements
   - Changes will update both files automatically

5. **Verify Completion**
   - Mark requirements as `verified` once testing confirms implementation
   - Use `verifiedAt` timestamp to track verification dates

### Integration with Tiki Workflow

- `/tiki:plan-issue` - Will reference requirements for success criteria
- `/tiki:execute` - Phase completion can be tracked against requirements
- `/tiki:ship` - Can validate all requirements for an issue are met

### Useful Commands

```bash
# View requirements
cat .tiki/REQUIREMENTS.md

# Check requirement status programmatically
cat .tiki/requirements.json | jq '.categories[].requirements[] | select(.status == "pending")'

# Count by status
cat .tiki/requirements.json | jq '[.categories[].requirements[]] | group_by(.status) | map({status: .[0].status, count: length})'
```
```

#### 8f: Full Completion Output

Combine all sections into the final output:

```
=============================================
     REQUIREMENTS DEFINITION COMPLETE
=============================================

## Files Created

✓ .tiki/REQUIREMENTS.md (human-readable)
✓ .tiki/requirements.json (machine-readable)

## Summary

Total Requirements: 8

Status Breakdown:
  ✅ Implemented:  4 (50%)
  ⏳ Pending:      3 (37.5%)
  🔄 Partial:      1 (12.5%)
  ✓ Verified:      0 (0%)

Category Breakdown:
  CORE - Core Functionality:    5 requirements (3 implemented)
  SEC  - Security:              2 requirements (1 implemented)
  QUAL - Quality:               1 requirement  (0 implemented)

## Changes This Session

- Added 3 new requirements
- Updated 2 existing requirements
- Removed 1 duplicate requirement
- Reorganized 1 requirement between categories

## Next Steps

1. Review .tiki/REQUIREMENTS.md for accuracy
2. Use /tiki:plan-issue to plan work against requirements
3. Run /tiki:define-requirements to update later

=============================================
```

---

## Error Handling

This section covers all error conditions and their user-friendly messages.

### GitHub CLI Not Available

If `gh` command is not installed or not authenticated:

```
Error: GitHub CLI (gh) not installed or not authenticated.

To fix this:
1. Install GitHub CLI: https://cli.github.com/
2. Run `gh auth login` to authenticate

Options:
1. Continue without GitHub integration (manual requirements only)
2. Cancel and fix authentication first

Enter choice:
```

### Write Permission Denied

If unable to write to project directory:

```
Error: Cannot write to .tiki directory.

Reason: Permission denied for .tiki/REQUIREMENTS.md

Troubleshooting:
1. Check file permissions: ls -la .tiki/REQUIREMENTS.md
2. Check directory permissions: ls -la .tiki/
3. Ensure no file locks exist

Options:
1. Display requirements to copy manually
2. Cancel

Enter choice:
```

### Invalid JSON (Corrupted requirements.json)

If existing requirements.json cannot be parsed:

```
Error: Existing requirements.json is corrupted.

Reason: [JSON parse error details]
Backup found at: .tiki/requirements.json.backup.20260118103000

Options:
1. Start fresh - Create new requirements (corrupted file will be backed up)
2. Attempt recovery - Try to extract valid requirements from corrupted file
3. Restore backup - Revert to most recent backup
4. Cancel - Exit without changes

Enter choice:
```

Recovery attempt process:
```
Attempting recovery...
- Scanning for valid JSON fragments
- Found 6 of 8 requirements recoverable
- 2 requirements have corrupted data

Recovered requirements:
- CORE-01, CORE-02, CORE-03 (3 of 5 in CORE)
- SEC-01 (1 of 2 in SEC)
- QUAL-01 (1 of 1 in QUAL)

Missing/corrupted:
- CORE-04: Invalid verification object
- SEC-02: Truncated JSON

Continue with recovered requirements? [y/n]
```

### Interrupted Session

If session is interrupted (Ctrl+C, terminal closed, etc.):

```
Warning: Session interrupted.

Partial state may have been saved to .tiki/requirements.draft.json

To continue:
1. Run `/tiki:define-requirements` again
2. You will be prompted to resume from draft if one exists

Note: No changes were written to REQUIREMENTS.md or requirements.json
```

On next run with draft present:
```
Found interrupted session from 2026-01-18 10:30:00

Draft contains:
- 5 requirements defined
- 3 categories created
- Last action: Editing CORE-03

Options:
1. Resume from draft
2. Discard draft and start fresh
3. View draft contents

Enter choice:
```

### No GitHub Issues Found

If `--from-issues` flag is used but no open issues exist:

```
Error: No open GitHub issues found.

The repository has no open issues to seed requirements from.

Options:
1. Create issues first, then run `/tiki:define-requirements --from-issues`
2. Run without --from-issues to define requirements manually
3. Cancel

Enter choice:
```

### File Write Errors

If writing .tiki/REQUIREMENTS.md fails:
```
Error: Could not write .tiki/REQUIREMENTS.md
Reason: [error message]

Requirements could not be saved. Check directory permissions for .tiki/
```

### No Existing Requirements for Refresh

If `--refresh` is used but no requirements exist:

```
Error: No existing requirements to refresh.

The --refresh flag requires existing requirements files:
- .tiki/requirements.json (not found)
- .tiki/REQUIREMENTS.md (not found)

To create new requirements, run:
  /tiki:define-requirements

Then use --refresh to update them later.
```

### Network Errors

If GitHub API calls fail due to network issues:

```
Warning: Network error while fetching GitHub issues.

Reason: [network error details]

Options:
1. Retry (attempt 1 of 3)
2. Continue without issue data
3. Cancel

Enter choice:
```

---

## Examples

### Example 1: New Project Setup

Starting fresh with no existing requirements:

```
User: /tiki:define-requirements

Claude:
## Requirements Definition

Checking for existing requirements...
- .tiki/REQUIREMENTS.md: Not found
- .tiki/requirements.json: Not found

No existing requirements found. Starting fresh.

## Context Loaded

| Source | Status | Key Information |
|--------|--------|-----------------|
| PROJECT.md | Found | E-commerce platform for artisan goods |
| CLAUDE.md | Found | TypeScript, React, PostgreSQL |
| .tiki/STACK.md | Found | Next.js 14, Prisma, Tailwind |

## GitHub Issues Loaded

Found 8 open issues:
- 3 Feature requests
- 2 Bug reports
- 3 Other

[Proceeds to codebase analysis...]
[Proposes 12 requirements...]
[User refines and accepts...]

## Requirements Definition Complete

Files Created:
✓ .tiki/REQUIREMENTS.md (human-readable)
✓ .tiki/requirements.json (machine-readable)

Total Requirements: 12
- Implemented: 7 (58%)
- Pending: 5 (42%)
```

### Example 2: Legacy Project with Existing Code

Analyzing an established codebase:

```
User: /tiki:define-requirements

Claude:
## Requirements Definition

Checking for existing requirements...
- .tiki/REQUIREMENTS.md: Not found
- .tiki/requirements.json: Not found

## Context Loaded

| Source | Status | Key Information |
|--------|--------|-----------------|
| PROJECT.md | Not Found | - |
| CLAUDE.md | Found | Python Flask API |
| .tiki/STACK.md | Not Found | - |

## Codebase Analysis Complete

### Implemented Functionality

| Category | Features | Tested |
|----------|----------|--------|
| Authentication | 4 features | 3/4 (75%) |
| User Management | 6 features | 4/6 (67%) |
| API Endpoints | 15 features | 10/15 (67%) |
| Background Jobs | 3 features | 1/3 (33%) |

### Coverage Gaps

- Password reset: Implemented but not tested
- Email notifications: Partially implemented
- Rate limiting: Referenced but not found

## Proposed Requirements

Based on codebase analysis, proposing 28 requirements:
- 22 implemented (detected in code)
- 6 pending (from issues and gaps)

[User reviews and refines...]
```

### Example 3: Using --from-issues Flag

Seeding requirements directly from GitHub issues:

```
User: /tiki:define-requirements --from-issues

Claude:
## Requirements Definition (Issue-Seeding Mode)

Fetching open GitHub issues...

Found 15 open issues.

## Issue-to-Requirement Mapping

| Issue | Title | Category | Verification |
|-------|-------|----------|--------------|
| #42 | Add dark mode toggle | CORE | Manual test |
| #45 | Fix login timeout | QUAL | Automated test |
| #48 | Add password reset | SEC | Automated test |
| #51 | Improve load time | PERF | Manual test |
| #53 | Update README | DOC | Documentation |

Skipping codebase analysis (--from-issues mode).

## Proposed Requirements

15 requirements generated from issues:
- CORE: 8 requirements
- QUAL: 3 requirements
- SEC: 2 requirements
- PERF: 1 requirement
- DOC: 1 requirement

All requirements set to "pending" status.

[User can refine categories and verification methods...]
```

### Example 4: Using --refresh Flag

Synchronizing requirements with current state:

```
User: /tiki:define-requirements --refresh

Claude:
## Requirements Refresh

Loading existing requirements...
- Found .tiki/requirements.json (18 requirements)
- Last updated: 2026-01-15T14:30:00Z

## Re-analyzing Codebase...

Scanning for implemented features...

## Status Changes Detected

| Requirement | Previous | Current | Reason |
|-------------|----------|---------|--------|
| CORE-05 | pending | implemented | Code found in src/dark-mode.ts |
| SEC-02 | pending | implemented | Issue #48 closed |
| PERF-01 | implemented | pending | Code removed in refactor |

## Issues Synced

| Issue | Status | Action |
|-------|--------|--------|
| #42 | closed | CORE-05 -> implemented |
| #48 | closed | SEC-02 -> implemented |
| #51 | open | No change |

## Refresh Summary

- 2 requirements upgraded to implemented
- 1 requirement reverted to pending
- 3 issues synced

Updated files:
✓ .tiki/REQUIREMENTS.md
✓ .tiki/requirements.json
```

### Example 5: Editing Requirements Interactively

Making changes during refinement:

```
User: /tiki:define-requirements

[After initial analysis...]

Claude:
## Requirement Refinement

12 requirements proposed. What would you like to do?

1. Accept - Save these requirements as-is
2. Edit - Modify a requirement
3. Add - Create a new requirement
4. Remove - Delete a requirement
5. Reorganize - Move requirements between categories
6. Review flagged - Examine flagged requirements

User: Edit CORE-03

Claude:
## Editing Requirement: CORE-03

Current values:
- **ID:** CORE-03
- **Text:** User can reset password
- **Category:** CORE
- **Status:** pending
- **Verification:** automated_test - "Password reset flow completes"

What would you like to change?
1. Text/description
2. Category
3. Verification
4. Status
5. All fields
6. Cancel

User: 2

Claude:
Move CORE-03 to which category?
1. CORE - Core Functionality (5 requirements)
2. SEC - Security (2 requirements)
3. QUAL - Quality (1 requirement)
4. [New category]

User: 2

Claude:
Moved CORE-03 to SEC category.

New ID: SEC-03
**SEC-03:** User can reset password
- Was: CORE-03
- Category: Security

[Returns to refinement menu...]

User: Add

Claude:
## Add New Requirement

Step 1: Select category:
1. CORE  2. SEC  3. QUAL  4. PERF  5. DOC  6. [New]

User: 6

Claude:
Enter new category code (2-4 letters):

User: INTG

Claude:
Enter category name:

User: Integrations

Claude:
Created category: INTG - Integrations

Step 2: Requirement text (use "System shall..." format):

User: System shall integrate with Stripe for payment processing

Claude:
Step 3: Verification type:
1. automated_test  2. manual_test  3. code_review  4. state_check  5. documentation

User: 1 - Stripe test mode transactions succeed

Claude:
## New Requirement Created

**INTG-01:** System shall integrate with Stripe for payment processing
- Category: INTG - Integrations
- Verification: automated_test - "Stripe test mode transactions succeed"
- Status: pending

[Returns to refinement menu...]
```

---

## Notes

### File Purposes

- **.tiki/REQUIREMENTS.md** is designed to be human-readable and editable. It can be reviewed in GitHub, included in documentation, and manually updated if needed.

- **requirements.json** is for tooling integration. It provides structured data for automated workflows, reporting, and integration with other Tiki commands.

### Future Integration

The requirements system will integrate with other Tiki commands:

- **`/tiki:plan-issue`** - Will prompt for requirement mapping when creating phase plans. Each phase can reference which requirements it addresses via the `addressesCriteria` field.

- **`/tiki:execute`** - Phase completion summaries can note which requirements were advanced.

- **`/tiki:ship`** - Will update requirement status to "implemented" for requirements linked to the completed issue. Can optionally validate that all linked requirements have been addressed.

### Best Practices

1. **Start with issues**: If you have existing GitHub issues, use `--from-issues` to bootstrap requirements quickly.

2. **Run refresh regularly**: After completing work, run `--refresh` to keep requirements in sync with codebase state.

3. **Use meaningful categories**: The default categories (CORE, SEC, QUAL, PERF, DOC) work for most projects. Create custom categories only when needed.

4. **Link requirements to issues**: Always populate `implementedBy` to track which issues contribute to each requirement.

5. **Verify before closing**: Mark requirements as "verified" only after testing confirms the implementation is complete and correct.

### Schema Versioning

The `requirements.json` file includes a `version` field for forward compatibility. Current version is "1.0". Future versions may add fields but will remain backward compatible.

### Manual Editing

Both files can be manually edited:

- Edit `.tiki/REQUIREMENTS.md` for quick text changes
- Edit `requirements.json` for structural changes (adding fields, bulk updates)
- Run `/tiki:define-requirements` afterward to validate and sync both files
