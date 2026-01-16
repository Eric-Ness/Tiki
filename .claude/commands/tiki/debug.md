---
type: prompt
name: tiki:debug
description: Start systematic debugging session with hypothesis tracking. Use when investigating bugs, failures, or unexpected behavior.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion
argument-hint: [issue-number | "symptom description"] [--resume]
---

# Debug

Start a systematic debugging session with hypothesis tracking and solution documentation.

## Usage

```
/tiki:debug                          # Debug current active issue
/tiki:debug 42                       # Debug specific issue
/tiki:debug "API returns 500 error"  # Debug untracked symptom
/tiki:debug --resume                 # Resume existing debug session
/tiki:debug 42 --resume              # Resume specific issue's debug session
/tiki:debug list                     # List all debug sessions
/tiki:debug show <session>           # Show specific session details
/tiki:debug --search "keyword"       # Search past debug sessions
/tiki:debug --search "error" --status resolved    # Search with status filter
/tiki:debug --search "auth" --file "login.ts"     # Search with file filter
```

## Instructions

### Step 0: Check for Similar Past Sessions

Before starting a new debug session, check if similar issues have been debugged before. This step runs automatically when starting a new session (not when resuming, listing, or showing).

#### 0a. Load Debug Index

```bash
# Check if index exists
if [ -f .tiki/debug/index.json ]; then
  # Read and parse the index
  cat .tiki/debug/index.json
fi
```

If no index exists or no sessions exist, skip to Step 1.

#### 0b. Extract Search Terms

From the current context, extract terms to match against past sessions:

1. **From issue (if issue-linked):**
   - Issue title words
   - Error messages in issue body
   - File paths mentioned

2. **From symptom description (if untracked):**
   - Key words from the description
   - Error patterns (e.g., "500", "undefined", "timeout")

3. **From error output (if provided):**
   - Error type (TypeError, Error, etc.)
   - Error message
   - First line of stack trace

#### 0c. Calculate Similarity Scores

For each session in the index, calculate a relevance score:

| Match Type | Points |
|------------|--------|
| Exact error message match | +10 |
| Partial error pattern match | +5 |
| Same affected file | +3 per file |
| Keyword overlap | +2 per keyword |
| Same linked issue | +8 |
| Resolved session bonus | +2 |
| Recent session bonus (< 30 days) | +1 |
| Archived session penalty | -3 |

**Minimum threshold:** 5 points to be considered "similar"

#### 0d. Display Similar Sessions

If similar sessions are found (score >= 5), display them before proceeding:

```text
## Related Past Debug Sessions Found

Before starting a new session, you may want to review these similar past debug sessions:

### 1. issue-42-api-500-error (Score: 17) [RESOLVED]
   **Root Cause:** Connection pool exhausted due to leak in error handler
   **Solution:** Added finally block for connection cleanup
   **Matching:** Error pattern "500", file "api/users.ts"
   View: `/tiki:debug show issue-42-api-500-error`

### 2. issue-23-null-check-missing (Score: 8) [RESOLVED]
   **Root Cause:** Missing null check after API call
   **Solution:** Added defensive null checks
   **Matching:** Keyword "undefined"
   View: `/tiki:debug show issue-23-null-check-missing`

---

**Options:**
1. Review a past session first (enter session name)
2. Continue with new debug session
3. Cancel

Enter your choice:
```

#### 0e. Handle User Choice

Based on user response:

- **Session name entered:** Run `/tiki:debug show <session-name>` and end
- **"Continue" or "2":** Proceed to Step 1 (start new session)
- **"Cancel" or "3":** End command

If no similar sessions found, proceed directly to Step 1 without prompting.

#### 0f. Skip Conditions

Skip Step 0 (similar session check) when:

- `--resume` flag is present (resuming existing session)
- `list` argument (listing sessions)
- `show <name>` argument (viewing specific session)
- `--search` argument (searching sessions)
- No index file exists
- Index has no sessions

### Step 1: Parse Arguments

Determine the debugging mode from the arguments:

| Input | Mode | Description |
|-------|------|-------------|
| (no args) | Current Issue | Debug the currently active issue |
| `N` or `#N` | Specific Issue | Debug issue number N |
| `"text..."` | Untracked | Debug a symptom without a linked issue |
| `--resume` | Resume | Continue an existing debug session |
| `list` | List Sessions | Show all existing debug sessions |
| `show <name>` | Show Session | Display details of a specific session |
| `--search "query"` | Search | Search past debug sessions by keyword |

#### 1a. Current Issue Mode

If no arguments provided:

1. Read `.tiki/state/current.json`
2. Get `activeIssue` number
3. If no active issue:
   ```
   No active issue found.

   Start a debug session with:
   - `/tiki:debug 42` - Debug specific issue
   - `/tiki:debug "Description of the problem"` - Debug untracked symptom
   ```

#### 1b. Specific Issue Mode

If argument is a number (with or without `#`):

1. Parse the issue number
2. Proceed with that issue as context

#### 1c. Untracked Symptom Mode

If argument is a quoted string:

1. Use the string as the initial symptom description
2. Session will be stored as `.tiki/debug/untracked-{timestamp}.md`

#### 1d. Resume Mode

If `--resume` flag is present:

1. Look for existing debug sessions
2. If multiple sessions exist, list them and ask which to resume
3. Load the session document and continue

#### 1e. List Sessions Mode

If argument is `list`:

1. Find all debug session files in `.tiki/debug/`
2. Parse each file to extract session info
3. Display formatted list:

```
## Debug Sessions

### Active Sessions (In Progress)
| Session | Issue | Started | Last Updated | Hypotheses |
|---------|-------|---------|--------------|------------|
| issue-42-api-500-error | #42 | 2026-01-15 | 2026-01-16 | 3 tested |
| untracked-login-timeout | - | 2026-01-14 | 2026-01-14 | 1 tested |

### Resolved Sessions
| Session | Issue | Resolved | Root Cause |
|---------|-------|----------|------------|
| issue-15-cache-stale | #15 | 2026-01-13 | Redis TTL misconfigured |

### Abandoned Sessions
| Session | Issue | Abandoned | Reason |
|---------|-------|-----------|--------|
| issue-10-flaky-test | #10 | 2026-01-10 | Cannot reproduce |

---
To resume: `/tiki:debug --resume` or `/tiki:debug show <session-name>`
```

4. **End command execution** - do not proceed to debugging workflow

#### 1f. Show Session Mode

If argument starts with `show`:

1. Extract the session name from the argument
2. Find the matching session file:
   - Try exact match: `.tiki/debug/{session-name}.md`
   - Try with `issue-` prefix: `.tiki/debug/issue-{session-name}.md`
   - Try with `untracked-` prefix: `.tiki/debug/untracked-{session-name}.md`
3. If not found, show error with available sessions:

```
Session "{session-name}" not found.

Available sessions:
- issue-42-api-500-error
- issue-15-cache-stale
- untracked-login-timeout

Try: `/tiki:debug show issue-42-api-500-error`
```

4. If found, display the full session document with summary:

```
## Debug Session: issue-42-api-500-error

**Status:** In Progress
**Issue:** #42 - API returns 500 error
**Started:** 2026-01-15 14:30
**Last Updated:** 2026-01-16 09:15

### Progress Summary
- Hypotheses tested: 3
- Current status: Testing H4
- Time invested: ~2 hours

### Hypotheses
1. [REJECTED] H1: Database service not running
2. [REJECTED] H2: Connection string misconfigured
3. [INCONCLUSIVE] H3: Connection pool exhausted
4. [TESTING] H4: Wrong port configuration

### Actions
- Resume this session: `/tiki:debug 42 --resume`
- Abandon session: `/tiki:debug 42` then choose "Abandon"
```

5. **End command execution** - do not proceed to debugging workflow

#### 1g. Search Mode

If argument contains `--search`:

1. Parse the search query and optional filters:
   - `--search "query"` - Required: keywords to search
   - `--status <status>` - Optional: filter by "resolved", "active", or "abandoned"
   - `--file <filename>` - Optional: filter by affected file

2. Load the debug index from `.tiki/debug/index.json`

3. If no index exists:

```text
No debug history found.

The debug index will be created when you start your first debug session.
Start debugging: `/tiki:debug 42` or `/tiki:debug "symptom description"`
```

4. Search the index:
   - Split query into keywords
   - For each session, calculate match score:
     - Keyword in `keywords` array: +2 per match
     - Keyword in `title`: +3
     - Keyword in `rootCause`: +4
     - Keyword in `errorPatterns`: +5
   - Apply filters if specified:
     - `--status`: only include sessions with matching status
     - `--file`: only include sessions where `affectedFiles` contains the file

5. Sort results by score (descending) and display:

```text
## Debug History Search Results

Query: "connection timeout"
Filters: status=resolved

### Results (3 found)

| # | Session | Status | Score | Root Cause |
|---|---------|--------|-------|------------|
| 1 | issue-42-api-500-error | Resolved | 12 | Connection pool exhausted |
| 2 | issue-15-db-timeout | Resolved | 10 | Database connection timeout |
| 3 | untracked-slow-api | Resolved | 6 | Network latency issues |

---

**Actions:**
- View session details: `/tiki:debug show <session-name>`
- Start new debug session: `/tiki:debug "connection timeout"`
```

6. If no results:

```text
## Debug History Search Results

Query: "foobar widget"
Filters: none

No matching debug sessions found.

Try:
- Different keywords
- Remove filters
- Start a new debug session: `/tiki:debug "foobar widget"`
```

7. **End command execution** - do not proceed to debugging workflow

### Step 2: Session Initialization/Resume

#### 2a. Check for Existing Session

Look for existing debug documents:

```bash
# For issue-based debugging
ls .tiki/debug/issue-{N}-*.md 2>/dev/null

# For untracked debugging
ls .tiki/debug/untracked-*.md 2>/dev/null
```

#### 2b. Handle Existing Session

If a session exists and `--resume` was NOT specified:

```
Found existing debug session for Issue #42:
  File: .tiki/debug/issue-42-api-500-error.md
  Started: 2026-01-15 14:30
  Status: In Progress
  Hypotheses tested: 3

Options:
1. Continue this session
2. Start fresh (archive existing)

Which would you prefer?
```

If user chooses to continue, load the existing document and skip to hypothesis workflow (Phase 2).

If user chooses fresh, rename existing to `.tiki/debug/archive/` and proceed.

#### 2c. Resume Mode

If `--resume` flag was specified:

1. Find the most recent debug session (or the one matching the issue number)
2. Read the session document
3. Display current state:

```
## Resuming Debug Session

**Issue:** #42 - API returns 500 error
**Started:** 2026-01-15 14:30
**Status:** In Progress

### Current State
- Symptoms documented: Yes
- Hypotheses tested: 3
- Current hypothesis: H4 - Database connection timeout

### Tested Hypotheses
1. [REJECTED] H1: Invalid request format
2. [REJECTED] H2: Auth token expired
3. [REJECTED] H3: Rate limiting

Ready to continue testing H4 or formulate new hypothesis?
```

4. Continue with hypothesis workflow (Phase 2)

#### 2d. Create New Session

If no existing session or starting fresh:

1. Create `.tiki/debug/` directory if it doesn't exist
2. Initialize debug index if it doesn't exist (see "Debug History Index" section)
3. Generate session filename:
   - Issue-based: `issue-{N}-{kebab-title}.md`
   - Untracked: `untracked-{timestamp}.md`
4. Create initial document structure (see below)
5. Add initial entry to index with status "active"

### Step 3: Create Debug Document

Create the debug session document with this structure:

```markdown
# Debug Session: {Title}

## Session Info

| Field | Value |
|-------|-------|
| Started | {YYYY-MM-DD HH:MM} |
| Issue | #{N} (or "Untracked") |
| Status | In Progress |
| Last Updated | {YYYY-MM-DD HH:MM} |

## Symptoms

{To be filled during symptom gathering}

## Environment

{To be filled during symptom gathering}

## Hypotheses

{Will be populated during debugging - Phase 2}

## Investigation Log

{Chronological log of debugging steps - Phase 2}

## Root Cause

{Filled when issue is resolved}

## Solution Applied

{Filled when issue is resolved}

## Lessons Learned

{Filled when resolved - what could prevent this in the future}

## Related

- {Links to issues, files, documentation}
```

### Step 4: Gather Symptoms

Ask the user to describe the problem in detail.

#### 4a. Initial Questions

```
## Symptom Gathering

Let's document what you're experiencing.

**1. What is failing or behaving unexpectedly?**
(Describe the symptom in your own words)
```

Wait for response, then continue:

```
**2. What error messages or output are you seeing?**
(Paste any error messages, stack traces, or unexpected output)
```

Wait for response, then continue:

```
**3. When did this start happening?**
(After a specific change, deployment, or seemingly random?)
```

Wait for response, then continue:

```
**4. Can you reproduce it consistently?**
(Always, sometimes, only under certain conditions?)
```

#### 4b. Auto-Detect Environment

Gather relevant environment details automatically:

```bash
# Check for common project files to determine stack
ls package.json Cargo.toml go.mod requirements.txt pyproject.toml 2>/dev/null

# Get git status
git status --short

# Check recent commits
git log --oneline -5

# Check for any running processes (if relevant)
# Check for environment variables (if relevant)
```

#### 4c. Document in Session File

Update the debug document with gathered information:

```markdown
## Symptoms

### Description
API endpoint `/api/users` returns HTTP 500 error when called with valid authentication.

### Error Output
```
Error: ECONNREFUSED 127.0.0.1:5432
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1141:16)
```

### Reproduction
- **Frequency:** Always reproducible
- **Since:** After deploying commit abc123
- **Steps:**
  1. Start the server with `npm start`
  2. Call `GET /api/users` with valid JWT
  3. Observe 500 error

## Environment

| Component | Value |
|-----------|-------|
| Node.js | v18.17.0 |
| OS | macOS 14.0 |
| Database | PostgreSQL 15 |
| Last Deploy | 2026-01-15 14:00 |
| Recent Commits | abc123: "Add user endpoint" |
```

### Step 5: Initial Analysis

After gathering symptoms, provide initial observations:

```
## Initial Analysis

Based on the symptoms, here are some initial observations:

### Error Type
Database connection error (ECONNREFUSED)

### Likely Areas
1. Database service not running
2. Connection string misconfigured
3. Port conflict or firewall
4. Connection pool exhausted

### Suggested First Hypothesis
**H1: Database service is not running**

Shall I start testing this hypothesis, or do you have a different theory to explore first?
```

At this point, transition to the hypothesis-test-record workflow.

### Step 6: Form Hypotheses

Based on the symptoms and initial analysis, generate 2-4 testable hypotheses.

#### 6a. Generate Hypotheses

Analyze the gathered information and formulate hypotheses:

```
## Forming Hypotheses

Based on the symptoms, I've identified the following potential causes:

### H1: [Most Likely Hypothesis]
**Rationale:** [Why this could be the cause based on symptoms/error messages]
**Test approach:** [How we'll verify this]

### H2: [Second Hypothesis]
**Rationale:** [Why this could be the cause]
**Test approach:** [How we'll verify this]

### H3: [Third Hypothesis]
**Rationale:** [Why this could be the cause]
**Test approach:** [How we'll verify this]

---

**Which hypothesis would you like to test first?**

1. H1: [Brief description]
2. H2: [Brief description]
3. H3: [Brief description]
4. Other - I have a different theory

Enter your choice (1/2/3/4):
```

#### 6b. Handle User Selection

Based on user response:

- **Option 1-3:** Proceed with selected hypothesis
- **Option 4:** Ask user to describe their hypothesis:

```
What's your hypothesis? Describe what you think might be causing this issue:
```

Then formulate it as a proper hypothesis entry.

#### 6c. Record Selected Hypothesis

Update the debug document with the selected hypothesis:

```markdown
## Hypotheses

### H1: Database service is not running [TESTING]
**Rationale:** The ECONNREFUSED error suggests the database port is not accepting connections. This is the most common cause of this error.
**Test approach:** Check if PostgreSQL service is running and listening on the expected port.
**Status:** Testing in progress...
```

### Step 7: Test Hypothesis

Execute targeted tests to verify or refute the current hypothesis.

#### 7a. Determine Test Strategy

Based on the hypothesis type, select appropriate test methods:

| Hypothesis Type | Test Approach |
|----------------|---------------|
| Service not running | Check process list, service status |
| Configuration error | Read config files, check env vars |
| Code bug | Add logging, trace execution path |
| Data issue | Query database, inspect state |
| Network issue | Check connectivity, ports, firewall |
| Permission issue | Check file/directory permissions |
| Dependency issue | Check versions, compatibility |

#### 7b. Execute Tests

Run the appropriate tests using available tools:

```bash
# Example: Testing if database service is running
# Check if PostgreSQL process exists
ps aux | grep postgres

# Check if port is listening
netstat -an | grep 5432

# Try connecting directly
pg_isready -h localhost -p 5432
```

Or for code-related hypotheses:

```bash
# Add temporary logging
# Run specific test
npm test -- --grep "user endpoint"

# Check specific code path
```

Use tools as needed:
- **Bash:** Run commands, check services, execute tests
- **Read:** Inspect configuration files, source code
- **Grep:** Search for patterns, error messages, configuration values
- **Glob:** Find relevant files

#### 7c. Capture Results

Document what the test revealed:

```
## Test Results for H1

**Commands executed:**
```bash
pg_isready -h localhost -p 5432
```

**Output:**
```
localhost:5432 - accepting connections
```

**Observation:** Database IS running and accepting connections. This rules out H1.
```

### Step 8: Record Outcome

Update the hypothesis entry with the test results and conclusion.

#### 8a. Update Debug Document

Edit the hypothesis entry to reflect findings:

```markdown
### H1: Database service is not running [REJECTED]
**Rationale:** The ECONNREFUSED error suggests the database port is not accepting connections.
**Test:** Checked PostgreSQL service status with `pg_isready -h localhost -p 5432`
**Result:** Database is running and accepting connections on port 5432
**Conclusion:** NOT THE CAUSE - Service is healthy, issue lies elsewhere
```

#### 8b. Add to Investigation Log

Append to the chronological investigation log:

```markdown
## Investigation Log

### 2026-01-15 15:30 - Tested H1: Database service status
- Ran `pg_isready -h localhost -p 5432`
- Result: Database accepting connections
- Conclusion: Ruled out - moving to H2
```

#### 8c. Outcome Categories

Mark the hypothesis with one of these outcomes:

| Outcome | Meaning | Next Action |
|---------|---------|-------------|
| NOT THE CAUSE | Hypothesis disproven | Test next hypothesis |
| ROOT CAUSE FOUND | Issue identified | Proceed to solution |
| PARTIALLY CONFIRMED | Related but not root cause | Refine hypothesis |
| INCONCLUSIVE | Test was not definitive | Try different test approach |

#### 8d. Present Outcome to User

```
## Hypothesis H1 Result: NOT THE CAUSE

The database service is running normally.

**What we learned:** The issue is not with the database service availability.

**Did this test reveal any useful information?**
- Yes, proceed to next hypothesis
- No, let me explain what I observed
- I want to try a different test for this hypothesis

Enter your choice:
```

### Step 9: Iterate or Resolve

Based on the outcome, either continue testing or move to resolution.

#### 9a. Root Cause NOT Found - Continue Testing

If the hypothesis was rejected:

```
## Next Steps

H1 has been ruled out. Based on what we've learned, here are the remaining hypotheses:

### Remaining Hypotheses
1. **H2:** Connection string misconfigured [Untested]
2. **H3:** Connection pool exhausted [Untested]

### New Hypothesis (based on findings)
4. **H4:** Application connecting to wrong port

**Which hypothesis would you like to test next?**

1. H2: Connection string misconfigured
2. H3: Connection pool exhausted
3. H4: Wrong port configuration (new)
4. Other - I have a different theory
5. Take a break - Save progress and pause

Enter your choice:
```

#### 9b. Root Cause Found

If the hypothesis is confirmed:

```
## Root Cause Identified!

**Hypothesis H3 confirmed:** Connection pool exhausted

The application is running out of database connections because:
1. Pool max size is set to 5
2. Connections are not being properly released
3. Under load, all connections are consumed

### Root Cause Summary
The database connection pool is exhausted due to connection leak in the `/api/users` handler.
Connections opened in the try block are not closed when an exception is thrown.

Shall I proceed to documenting the solution, or would you like to investigate further?

1. Document solution and mark as resolved
2. Investigate further to understand the full scope
3. Create a fix and test it

Enter your choice:
```

#### 9c. Update Debug Document - Root Cause Section

When root cause is found, update the document:

```markdown
## Root Cause

**Identified:** 2026-01-15 16:45
**Hypothesis:** H3 - Connection pool exhausted

### Summary
Database connections are leaking in the user endpoint handler. The connection acquired in the try block
is not released when an exception occurs, causing the pool to eventually be exhausted.

### Evidence
- Connection pool max: 5
- Active connections: 5 (all busy)
- No connections returned to pool in error path
- Issue reproduces under load, works initially

### Affected Code
- `src/handlers/user.js:42-58` - Missing connection.release() in catch block
```

#### 9d. Handle "Inconclusive" Results

If a test is inconclusive:

```
## Test Result: INCONCLUSIVE

The test didn't give us a clear answer.

**Options:**
1. Try a different approach to test this hypothesis
2. Mark as inconclusive and move to next hypothesis
3. Add more logging and reproduce the issue

What would you like to do?
```

### Step 10: Loop Control

Manage the debugging iteration until resolution or user decision to stop.

#### 10a. Continue Loop

After each hypothesis test:

1. Check if root cause was found -> Go to resolution (Phase 3)
2. Check if user wants to stop -> Save and pause session
3. Otherwise -> Return to Step 6 (form new hypotheses if needed) or Step 7 (test next hypothesis)

#### 10b. Progress Summary

After every 2-3 hypotheses tested, provide a summary:

```
## Debugging Progress

**Session Duration:** 45 minutes
**Hypotheses Tested:** 3 of 4

### Tested
- [REJECTED] H1: Database service not running
- [REJECTED] H2: Connection string misconfigured
- [INCONCLUSIVE] H3: Connection pool exhausted

### Untested
- H4: Wrong port configuration

### Patterns Emerging
- Database connectivity seems fine at service level
- Issue may be application-level configuration

**Continue testing or take a different approach?**
```

#### 10c. Stuck Detection

If 4+ hypotheses have been rejected without progress:

```
## Debugging Checkpoint

We've tested 4 hypotheses without finding the root cause. Let's step back:

**Recap of what we've ruled out:**
1. Database service issues
2. Configuration problems
3. Connection pooling
4. Network connectivity

**Suggestions:**
1. Re-examine the original symptoms - did we miss something?
2. Try to reproduce with minimal code
3. Add comprehensive logging to trace the exact failure point
4. Check if the issue is environmental (works elsewhere?)
5. Consider if multiple factors are combining

What would you like to do?

1. Add detailed logging and reproduce
2. Review symptoms again
3. Try a completely different approach
4. Pause session and return later with fresh eyes

Enter your choice:
```

#### 10d. Save Progress

At any point user can save progress:

```
## Session Saved

Your debug session has been saved to:
`.tiki/debug/issue-42-api-500-error.md`

**Current state:**
- Hypotheses tested: 3
- Last hypothesis: H3 (INCONCLUSIVE)
- Next suggested: H4 - Wrong port configuration

Resume anytime with:
`/tiki:debug --resume` or `/tiki:debug 42 --resume`
```

### Step 11: Resolution Flow

When the root cause is identified and confirmed, guide the user through complete resolution documentation.

#### 11a. Record Root Cause

After confirming the root cause hypothesis:

```
## Root Cause Confirmed

**Hypothesis H3 is the ROOT CAUSE**

Please provide a detailed explanation of the root cause:

1. **What is broken?** (The specific component/logic that failed)
2. **Why did it break?** (The underlying reason)
3. **What triggers it?** (Conditions that cause the failure)

Enter your explanation:
```

Wait for user response, then update the debug document:

```markdown
## Root Cause

**Identified:** 2026-01-15 16:45
**Hypothesis:** H3 - Connection pool exhausted

### What is broken
Database connections in the user endpoint handler are not being released back to the pool.

### Why it broke
The try-catch block acquires a connection but only releases it in the success path.
When an exception is thrown, the connection remains held indefinitely.

### Trigger conditions
- High request volume (>10 requests/second)
- Any error in the user lookup logic
- Combination of the above exhausts the 5-connection pool
```

#### 11b. Record Solution

Prompt the user to describe or implement the solution:

```
## Solution

Now let's document how to fix this issue.

**Options:**
1. I'll describe the solution (you document it)
2. I'll implement the fix now (with your help)
3. The fix is already applied (just document what was done)

Enter your choice (1/2/3):
```

Based on choice:

**Option 1 - User describes:**
```
Describe the solution to fix this root cause:
```

**Option 2 - Implement together:**
```
Let's implement the fix. Based on the root cause analysis:

**Affected files:**
- `src/handlers/user.js:42-58`

**Suggested fix:**
Add connection.release() in a finally block to ensure cleanup.

Shall I make this change, or would you prefer to implement it differently?
```

**Option 3 - Already fixed:**
```
Describe what was changed to fix the issue:
```

Update the debug document:

```markdown
## Solution Applied

**Applied:** 2026-01-15 17:00
**Type:** Code fix

### Changes Made
1. Added `finally` block to ensure connection.release() is always called
2. Wrapped database operations in proper try-catch-finally pattern
3. Added connection pool monitoring for early warning

### Files Modified
- `src/handlers/user.js` - Added finally block for connection cleanup
- `src/utils/db.js` - Added pool exhaustion warning at 80% capacity

### Verification
- Ran load test with 100 concurrent requests
- Monitored connection pool - stays at 2-3 connections
- No more 500 errors under load
```

#### 11c. Capture Lessons Learned

Prompt for lessons learned to prevent future issues:

```
## Lessons Learned

What can we learn from this debugging session?

**Consider:**
- What could have prevented this issue?
- What made it hard to find?
- What would help catch this earlier?
- Any patterns to watch for?

Enter your thoughts:
```

Update the document:

```markdown
## Lessons Learned

### Prevention
- Always use try-catch-finally for resource management
- Add connection pool monitoring and alerting
- Code review checklist item for resource cleanup

### Detection
- Add pool exhaustion metrics to monitoring
- Set up alerts for connection count > 80% of max

### Process Improvements
- Load testing should be part of PR review for database-touching code
- Consider using a connection wrapper that auto-releases
```

#### 11d. Mark Session Resolved

Update the session info and status:

```markdown
## Session Info

| Field | Value |
|-------|-------|
| Started | 2026-01-15 14:30 |
| Issue | #42 |
| Status | **Resolved** |
| Last Updated | 2026-01-15 17:15 |
| Resolved | 2026-01-15 17:15 |
| Duration | 2h 45m |
```

**Update the debug index:**

1. Read `.tiki/debug/index.json`
2. Find session entry by id
3. Update fields:
   - `status`: "resolved"
   - `resolvedAt`: current timestamp
   - `rootCause`: summary from Root Cause section
   - `solution`: summary from Solution Applied section
   - `keywords`: re-extract including root cause terms
4. Write updated index

Display completion message:

```
## Debug Session Complete

**Issue #42 resolved!**

### Summary
- **Root Cause:** Connection pool exhausted due to leak in error handler
- **Solution:** Added finally block for connection cleanup
- **Time to Resolution:** 2h 45m
- **Hypotheses Tested:** 3

### Session saved to:
`.tiki/debug/issue-42-api-500-error.md`

### Suggested Next Steps
1. Update Issue #42 with findings: `/tiki:update-issue 42`
2. Commit the fix: `/tiki:commit`
3. Close the issue: `/tiki:ship`

Great debugging session!
```

### Step 12: Clean Exit Options

Provide clear exit paths at any decision point during debugging.

#### 12a. Exit Menu

When user indicates wanting to stop, or at natural breakpoints:

```
## Session Options

How would you like to proceed?

1. **Continue debugging** - Keep testing hypotheses
2. **Mark as resolved** - Root cause found, document solution
3. **Pause for later** - Save progress and exit
4. **Abandon session** - Stop without resolution

Enter your choice (1/2/3/4):
```

#### 12b. Mark as Resolved

If user chooses "Mark as resolved" (Option 2):

1. Confirm they have identified the root cause
2. Proceed to Step 11 (Resolution Flow)

```
Before marking as resolved, let's confirm:

**Have you identified the root cause?**
If yes, we'll document it along with the solution.
If no, consider "Pause for later" instead.

Proceed with resolution? (yes/no):
```

#### 12c. Pause for Later

If user chooses "Pause for later" (Option 3):

1. Save current state with timestamp
2. Update "Last Updated" in session info
3. Display resume instructions

```
## Session Paused

Your progress has been saved.

**Current state:**
- Status: In Progress (Paused)
- Hypotheses tested: 3
- Last activity: Testing H4 - Wrong port configuration
- Notes: Need to check config file tomorrow

**Resume with:**
`/tiki:debug --resume`

Or for this specific session:
`/tiki:debug 42 --resume`

See you next time!
```

Update the session document:

```markdown
## Session Info

| Field | Value |
|-------|-------|
| Started | 2026-01-15 14:30 |
| Issue | #42 |
| Status | In Progress (Paused) |
| Last Updated | 2026-01-15 17:30 |
| Paused At | H4 - Wrong port configuration |
```

#### 12d. Abandon Session

If user chooses "Abandon session" (Option 4):

1. Ask for reason
2. Record the abandonment
3. Optionally archive the session

```
## Abandoning Session

Please provide a brief reason for abandoning:

**Common reasons:**
- Cannot reproduce the issue
- Issue resolved itself
- No longer relevant
- Blocked by external factors
- Will address differently

Enter reason:
```

After user provides reason:

```
## Session Abandoned

**Reason:** Cannot reproduce - issue stopped occurring after server restart

The session has been marked as abandoned but preserved for reference.

**File:** `.tiki/debug/issue-42-api-500-error.md`

If the issue returns, you can:
1. Start a new session: `/tiki:debug 42`
2. Review this session: `/tiki:debug show issue-42-api-500-error`
```

Update the session document:

```markdown
## Session Info

| Field | Value |
|-------|-------|
| Started | 2026-01-15 14:30 |
| Issue | #42 |
| Status | **Abandoned** |
| Last Updated | 2026-01-15 17:30 |
| Abandoned | 2026-01-15 17:30 |
| Reason | Cannot reproduce - issue stopped occurring after server restart |

## Abandonment Notes

This session was abandoned because the issue could not be reproduced after a server restart.
If the issue recurs, the hypotheses and investigation log above may still be useful.
```

**Update the debug index:**

1. Read `.tiki/debug/index.json`
2. Find session entry by id
3. Update fields:
   - `status`: "abandoned"
   - `rootCause`: null (or keep any partial findings)
4. Write updated index

### Step 13: Session Naming Convention

Generate descriptive, consistent session filenames.

#### 13a. Issue-Linked Sessions

Format: `issue-N-short-description.md`

Generate short description:
1. Take issue title or primary symptom
2. Convert to kebab-case
3. Limit to 30 characters
4. Remove filler words (the, a, an, is, are)

Examples:
- Issue #42 "API returns 500 error on user endpoint" -> `issue-42-api-500-error-user.md`
- Issue #15 "Login page shows blank after OAuth" -> `issue-15-login-blank-oauth.md`

#### 13b. Untracked Sessions

Format: `untracked-short-description.md`

Generate from initial symptom:
1. Take first meaningful phrase from symptom description
2. Convert to kebab-case
3. Limit to 30 characters

Examples:
- "The build keeps failing with memory errors" -> `untracked-build-memory-errors.md`
- "Users report slow page loads" -> `untracked-slow-page-loads.md`

#### 13c. Filename Generation Logic

```
function generateSessionFilename(issue, symptom):
    if issue:
        base = "issue-" + issue.number
        description = toKebabCase(issue.title)
    else:
        base = "untracked"
        description = toKebabCase(symptom)

    # Clean up description
    description = removeFillerWords(description)
    description = truncate(description, 30)
    description = removeTrailingDash(description)

    return base + "-" + description + ".md"
```

### Step 14: Integration Points

Connect debugging findings with other Tiki workflows.

#### 14a. GitHub Issue Integration

If the debug session is linked to a GitHub issue:

```
## GitHub Issue Integration

Would you like to update Issue #42 with the debugging findings?

This will add a comment with:
- Root cause summary
- Solution applied
- Lessons learned

Update issue? (yes/no):
```

If yes, suggest comment format:

```markdown
## Debugging Complete

**Root Cause:** Connection pool exhausted due to connection leak in error handler

**Solution:** Added finally block in `src/handlers/user.js` to ensure connection cleanup

**Lessons Learned:**
- Always use try-catch-finally for resource management
- Added pool monitoring for early warning

Debug session: `.tiki/debug/issue-42-api-500-error.md`
```

#### 14b. Heal Pattern Integration

If the solution involves code changes that could be automated:

```
## Code Fix Pattern

The fix you applied could be automated for similar issues.

Would you like to:
1. Apply fix manually (already done)
2. Use `/tiki:heal` pattern to apply similar fixes elsewhere
3. Skip - no automation needed

Enter your choice:
```

If option 2:
```
The `/tiki:heal` command can help apply similar fixes.

**Pattern identified:**
- Issue: Missing resource cleanup in catch blocks
- Fix: Add finally block with cleanup call

Run `/tiki:heal` to scan for similar patterns?
```

#### 14c. Queue Integration

If debugging reveals additional issues:

```
## Additional Issues Discovered

During debugging, we found related problems:

1. **Similar leak in /api/orders endpoint** - Same pattern as root cause
2. **Missing error logging** - Errors were swallowed silently
3. **No connection pool metrics** - Made diagnosis harder

Add these to the discovery queue? (yes/no):
```

If yes:
```
Added 3 items to discovery queue.

View queue: `/tiki:review-queue`
Create issues: `/tiki:create-issues`
```

#### 14d. Session Cross-Reference

When debugging reveals connection to other sessions:

```
## Related Debug Sessions

This issue appears related to a previous debugging session:

**issue-15-intermittent-timeouts.md** (Resolved 2026-01-10)
- Root cause: Connection pool configuration
- May share underlying cause

View related session? `/tiki:debug show issue-15-intermittent-timeouts`
```

## Directory Structure

Debug sessions are stored in:

```
.tiki/
  debug/
    issue-42-api-500-error.md      # Active session for issue 42
    issue-15-login-failure.md       # Active session for issue 15
    untracked-20260115-143022.md   # Untracked debug session
    archive/                        # Archived sessions
      issue-42-stale-cache.md      # Previous session for issue 42
```

## Session States

| Status | Meaning |
|--------|---------|
| In Progress | Active debugging session |
| Resolved | Root cause found and fixed |
| Abandoned | Session stopped without resolution |
| Transferred | Converted to GitHub issue |

## Integration with Tiki

### From Failed Phase

When a phase fails during `/tiki:execute`, suggest:

```
Phase 2 failed with error: ECONNREFUSED

Options:
- `/tiki:heal` - Attempt automatic fix
- `/tiki:debug` - Start systematic debugging session
- `/tiki:skip-phase 2` - Skip and continue
```

### From Heal

When `/tiki:heal` cannot automatically fix:

```
Automatic healing unsuccessful.

The error appears to require investigation.
Start a debug session? `/tiki:debug`
```

### Creating Issue from Debug

If debugging an untracked symptom leads to a significant bug:

```
This appears to be a significant bug.

Create a GitHub issue from this debug session?
The session findings will be included in the issue description.
```

## Debug History Index

The debug history index (`.tiki/debug/index.json`) enables fast lookup and similarity matching of past debug sessions. This index is automatically maintained when sessions are created, updated, or resolved.

### Index Schema

```json
{
  "version": "1.0",
  "generatedAt": "2026-01-16T16:00:00Z",
  "sessions": [
    {
      "id": "issue-42-api-500-error",
      "filename": "issue-42-api-500-error.md",
      "issue": 42,
      "title": "API returns 500 error on user endpoint",
      "type": "issue-linked",
      "status": "resolved",
      "createdAt": "2026-01-15T14:30:00Z",
      "resolvedAt": "2026-01-15T17:15:00Z",
      "rootCause": "Connection pool exhausted due to leak in error handler",
      "keywords": ["api", "500", "error", "database", "connection", "pool", "leak"],
      "errorPatterns": ["ECONNREFUSED", "connection pool exhausted"],
      "affectedFiles": ["src/handlers/user.js", "src/utils/db.js"],
      "solution": "Added finally block for connection cleanup",
      "archived": false
    }
  ]
}
```

### Index Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique session identifier (filename without .md) |
| `filename` | string | Full filename of the session document |
| `issue` | number\|null | Linked GitHub issue number, or null for untracked |
| `title` | string | Session title (from issue title or symptom) |
| `type` | string | "issue-linked" or "untracked" |
| `status` | string | "active", "resolved", or "abandoned" |
| `createdAt` | ISO date | When the session was created |
| `resolvedAt` | ISO date\|null | When resolved (null if not resolved) |
| `rootCause` | string\|null | Root cause summary (null if not resolved) |
| `keywords` | string[] | Extracted keywords for search |
| `errorPatterns` | string[] | Error messages/patterns from symptoms |
| `affectedFiles` | string[] | Files mentioned in the session |
| `solution` | string\|null | Solution summary (null if not resolved) |
| `archived` | boolean | Whether session is in archive folder |

### Index Management

#### Initialization

When `.tiki/debug/` directory is first created:

```bash
# Create index if it doesn't exist
if [ ! -f .tiki/debug/index.json ]; then
  echo '{"version":"1.0","generatedAt":"'$(date -Iseconds)'","sessions":[]}' > .tiki/debug/index.json
fi
```

#### Updating the Index

**When to update:**
- After creating a new session (Step 3)
- After resolving a session (Step 11d)
- After abandoning a session (Step 12d)
- After archiving a session (Step 2b)

**Update procedure:**

1. Read current index from `.tiki/debug/index.json`
2. Extract metadata from the session document:
   - Parse Session Info table for status, dates
   - Extract keywords from Symptoms section
   - Extract error patterns from Error Output
   - Find affected files from code references
   - Get root cause and solution if resolved
3. Update or add the session entry in index
4. Write updated index back to file

#### Keyword Extraction

Extract keywords from session documents:

1. **From Symptoms section:**
   - Error messages (e.g., "ECONNREFUSED", "undefined", "null")
   - HTTP status codes (e.g., "500", "404", "401")
   - Technical terms (e.g., "connection", "timeout", "memory")

2. **From Root Cause section:**
   - Key nouns and verbs
   - Technical identifiers

3. **Normalization:**
   - Lowercase all keywords
   - Remove common words (the, a, is, are, etc.)
   - Deduplicate

Example extraction:
```
Input: "API endpoint /api/users returns HTTP 500 error when called with valid authentication"
Keywords: ["api", "endpoint", "users", "500", "error", "authentication"]
```

#### Error Pattern Extraction

Extract error patterns from Error Output:

1. Look for common error formats:
   - `Error: <message>`
   - `TypeError: <message>`
   - Exception names
   - Error codes

2. Capture first line of stack traces
3. Store as patterns for matching

#### Affected Files Extraction

Find file references:

1. Look for file paths in backticks: `` `src/file.js` ``
2. Extract from "Affected Code" sections
3. Extract from "Files Modified" sections
4. Normalize paths (remove line numbers)

### Index Validation

If the index becomes corrupted or out of sync:

```
## Index Repair

The debug index appears to be missing or corrupted.

Options:
1. Rebuild index from existing session files
2. Start with empty index

Rebuilding will scan all .md files in `.tiki/debug/` and regenerate the index.

Proceed with rebuild? (yes/no):
```

**Rebuild procedure:**

1. Find all `.md` files in `.tiki/debug/` (including archive/)
2. Parse each file to extract metadata
3. Build new index entries
4. Write fresh index file

```bash
# Find all debug session files
find .tiki/debug -name "*.md" -type f
```

### Using the Index

The index is used by:
- **Similar session detection** (Step 0) - Find sessions with matching keywords/errors
- **Search functionality** (`--search`) - Query by keyword, status, or file
- **List sessions** (`list`) - Fast listing without parsing all files
- **Cross-references** - Find related sessions during debugging

## Notes

- Debug sessions persist across Claude conversations
- Use `--resume` to continue where you left off
- Each hypothesis should be atomic and testable
- Document everything - your future self will thank you
- Don't skip the symptom gathering - it often reveals the answer
- If stuck, try explaining the problem out loud (rubber duck debugging)
- The debug index is automatically maintained - no manual updates needed
- If index gets out of sync, use rebuild option to regenerate
