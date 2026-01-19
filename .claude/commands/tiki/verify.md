---
type: prompt
name: tiki:verify
description: Run UAT verification for a completed issue. Use when you want to validate all phase verification items before shipping.
allowed-tools: Read, Bash, Glob, Grep, Write, AskUserQuestion
argument-hint: <issue-number> [--report] [--phase <n>]
---

# Verify

Run structured User Acceptance Testing (UAT) verification for a completed or in-progress issue. This command extracts verification items from the plan file, attempts automated checks where possible, and guides manual verification with interactive prompts.

## Usage

```
/tiki:verify 34              # Verify issue #34
/tiki:verify 34 --report     # Generate UAT report file
/tiki:verify 34 --phase 2    # Verify specific phase only
```

## Instructions

### Step 1: Load Plan File

Read the plan file to extract verification items:

```bash
cat .tiki/plans/issue-<number>.json
```

If no plan file exists:
```
No plan found for issue #<number>.

Create a plan first with `/tiki:plan-issue <number>`
```

Extract the following from the plan:
- `issue`: Issue metadata (number, title, url)
- `phases`: Array of phases, each containing a `verification` array
- `successCriteria`: Overall success criteria for context

Build a consolidated verification checklist by iterating through all phases:

```javascript
const verificationItems = [];

for (const phase of plan.phases) {
  for (const item of phase.verification || []) {
    verificationItems.push({
      phaseNumber: phase.number,
      phaseTitle: phase.title,
      phaseStatus: phase.status,
      text: item,
      type: 'pending',  // Will be classified in Step 3
      status: null,
      verifiedAt: null,
      notes: null
    });
  }
}
```

If `--phase <n>` flag is provided, filter to only include items from that phase:

```javascript
const filteredItems = verificationItems.filter(
  item => item.phaseNumber === targetPhase
);
```

### Step 2: Display Verification Checklist

Show all verification items grouped by phase:

```
## Verification Checklist for Issue #34

Issue: Add user authentication
Status: in_progress (Phase 3 of 3)

### Phase 1: Setup database models (completed)

1. [ ] User model exists in src/models/user.ts
2. [ ] Session model has proper relationships
3. [ ] Migrations run without errors

### Phase 2: Add authentication endpoints (completed)

4. [ ] POST /auth/login returns JWT token
5. [ ] POST /auth/logout invalidates session
6. [ ] Tests pass for auth endpoints

### Phase 3: Frontend integration (in_progress)

7. [ ] Login form submits correctly
8. [ ] Auth state persists on refresh
9. [ ] Logout clears local storage

---

Total: 9 verification items across 3 phases
```

### Step 3: Run Automated Verifications

For each verification item, attempt to classify and automatically verify:

#### Classification Rules

Analyze the verification text to determine if it can be automated:

```javascript
function classifyVerification(text) {
  const lowerText = text.toLowerCase();

  // File existence checks
  if (lowerText.includes('exists') && (lowerText.includes('file') || lowerText.match(/\.(ts|js|md|json|tsx|jsx)$/))) {
    return { type: 'file_exists', automatable: true };
  }

  // Content checks
  if (lowerText.includes('contains') || lowerText.includes('includes') || lowerText.includes('has')) {
    return { type: 'content_check', automatable: true };
  }

  // Test execution
  if (lowerText.includes('tests pass') || lowerText.includes('test passes')) {
    return { type: 'run_tests', automatable: true };
  }

  // Command output
  if (lowerText.includes('command') && lowerText.includes('output')) {
    return { type: 'command_check', automatable: true };
  }

  // Build checks
  if (lowerText.includes('builds') || lowerText.includes('compiles')) {
    return { type: 'build_check', automatable: true };
  }

  // Default to manual
  return { type: 'manual', automatable: false };
}
```

#### Automated Verification Execution

For each automatable item, run the appropriate check:

**File Existence:**
```javascript
// Extract file path from text like "File X exists" or "X.ts exists"
const match = text.match(/([^\s]+\.(ts|js|md|json|tsx|jsx|py|go|rs))/i);
if (match) {
  const filePath = match[1];
  // Use Glob to check
  const exists = await glob(filePath);
  return exists.length > 0 ? 'PASS' : 'FAIL';
}
```

**Content Check:**
```javascript
// Extract file and content from "X contains Y" or "X includes Y"
const match = text.match(/(.+?)\s+(contains|includes|has)\s+(.+)/i);
if (match) {
  const file = match[1].trim();
  const content = match[3].trim();
  // Use Grep to check
  const found = await grep(content, file);
  return found ? 'PASS' : 'FAIL';
}
```

**Test Execution:**
```javascript
// Read test config from .tiki/config.json
const config = await readConfig();
const testFramework = config.testing?.testFramework || 'auto-detect';

let testCommand;
if (testFramework === 'auto-detect') {
  // Check for common test runners
  if (await fileExists('package.json')) {
    testCommand = 'npm test';
  } else if (await fileExists('Cargo.toml')) {
    testCommand = 'cargo test';
  } else if (await fileExists('go.mod')) {
    testCommand = 'go test ./...';
  }
}

const result = await bash(testCommand);
return result.exitCode === 0 ? 'PASS' : 'FAIL';
```

**Build Check:**
```javascript
// Similar to test, but run build command
let buildCommand;
if (await fileExists('package.json')) {
  buildCommand = 'npm run build';
} else if (await fileExists('Cargo.toml')) {
  buildCommand = 'cargo build';
}

const result = await bash(buildCommand);
return result.exitCode === 0 ? 'PASS' : 'FAIL';
```

#### Display Automated Results

Update the checklist display with results:

```
## Automated Verification Results

### Phase 1: Setup database models

1. [PASS] User model exists in src/models/user.ts
   Checked: File found at src/models/user.ts

2. [PASS] Session model has proper relationships
   Checked: Found "belongsTo" in src/models/session.ts

3. [MANUAL] Migrations run without errors
   Reason: Requires manual execution to verify

### Phase 2: Add authentication endpoints

4. [MANUAL] POST /auth/login returns JWT token
   Reason: API endpoint testing requires manual verification

5. [MANUAL] POST /auth/logout invalidates session
   Reason: API endpoint testing requires manual verification

6. [PASS] Tests pass for auth endpoints
   Checked: npm test exited with code 0

---

Automated: 3 PASS, 0 FAIL
Manual: 3 items require manual verification
```

### Step 4: Interactive Manual Verification

For each item classified as MANUAL (items that could not be automatically verified), prompt the user using AskUserQuestion.

#### Prompt Format

Display the verification context before each prompt:

```
## Verification: {phase_title}

**Item:** {verification_text}

Options:
1. Pass - Verified working correctly
2. Fail - Issue found (will prompt for details)
3. Skip - Cannot verify now
4. Need Info - Requires clarification
```

#### Using AskUserQuestion

For each manual item, call AskUserQuestion with these options:
- "Pass" (description: "Verified working correctly")
- "Fail" (description: "Issue found - will prompt for details")
- "Skip" (description: "Cannot verify now")
- "Need Info" (description: "Requires clarification before verifying")

#### Handling User Responses

**If user selects "Pass":**
- Mark item status as `pass`
- Set `verifiedAt` to current ISO timestamp
- Proceed to next manual item

**If user selects "Fail":**

Prompt for failure details using AskUserQuestion with a text input:
```
Please describe the issue found:
```

- Mark item status as `fail`
- Set `verifiedAt` to current ISO timestamp
- Store the failure description in `notes`
- Proceed to next manual item

**If user selects "Skip":**

Optionally prompt for skip reason:
```
(Optional) Why are you skipping this item?
```

- Mark item status as `skip`
- Set `verifiedAt` to current ISO timestamp
- Store any provided reason in `notes`
- Proceed to next manual item

**If user selects "Need Info":**

Prompt for clarification needed:
```
What clarification do you need for this item?
```

- Mark item status as `pending`
- Store the question in `notes`
- Item will appear in summary as needing clarification
- Proceed to next manual item

#### Example Interaction Flow

```
## Verification: Add authentication endpoints

**Item:** POST /auth/login returns JWT token

Options:
1. Pass - Verified working correctly
2. Fail - Issue found (will prompt for details)
3. Skip - Cannot verify now
4. Need Info - Requires clarification

[User selects: Fail]

Please describe the issue found:
> "Returns 500 error when password contains special characters"

[Stored in notes, proceeding to next item]

## Verification: Add authentication endpoints

**Item:** POST /auth/logout invalidates session

Options:
1. Pass - Verified working correctly
2. Fail - Issue found (will prompt for details)
3. Skip - Cannot verify now
4. Need Info - Requires clarification

[User selects: Pass]

[Proceeding to next item...]
```

### Step 5: Track Verification Results

Build a results object tracking all verifications. This step consolidates results from both automated checks (Step 3) and manual verifications (Step 4).

#### Result Object Structure

```javascript
const results = {
  issue: {
    number: plan.issue.number,
    title: plan.issue.title,
    url: plan.issue.url
  },
  verifiedAt: new Date().toISOString(),  // Overall verification timestamp
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    pending: 0
  },
  phases: []
};
```

#### Recording Individual Item Results

Each verification item should track:
- `status`: The verification result (`pass`, `fail`, `skip`, `pending`)
- `verifiedAt`: ISO timestamp of when this specific item was verified
- `notes`: Any user-provided notes (especially for failures and skips)

```javascript
// Update each item as it is verified
function recordVerificationResult(item, status, notes = null) {
  item.status = status;
  item.verifiedAt = new Date().toISOString();
  item.notes = notes;
}
```

#### Building the Summary

After all items are verified (automated + manual), build the summary:

```javascript
// Populate from verification items
for (const item of verificationItems) {
  results.summary.total++;

  switch (item.status) {
    case 'pass': results.summary.passed++; break;
    case 'fail': results.summary.failed++; break;
    case 'skip': results.summary.skipped++; break;
    case 'pending': results.summary.pending++; break;
  }

  // Group by phase for organized reporting
  let phase = results.phases.find(p => p.number === item.phaseNumber);
  if (!phase) {
    phase = {
      number: item.phaseNumber,
      title: item.phaseTitle,
      items: []
    };
    results.phases.push(phase);
  }

  phase.items.push({
    text: item.text,
    type: item.type === 'manual' ? 'manual' : 'automated',
    status: item.status,
    verifiedAt: item.verifiedAt,
    notes: item.notes
  });
}

// Calculate pass rate
results.summary.passRate = Math.round(
  (results.summary.passed / results.summary.total) * 100
);
```

### Step 6: Display Summary

Show the final verification summary with pass/fail counts, and list any items that need attention.

#### Summary Display Format

```
## Verification Summary for Issue #34

Issue: Add user authentication
Verified at: 2026-01-18T15:30:00Z

### Results

| Status  | Count |
|---------|-------|
| Passed  | 7     |
| Failed  | 1     |
| Skipped | 1     |
| Pending | 0     |
| Total   | 9     |

Pass Rate: 78% (7/9)
```

#### Failed Items Section

List all failed items with their notes (failure descriptions from user):

```
### Failed Items

**Phase 2, Item 5:** POST /auth/logout invalidates session
- Status: FAIL
- Notes: "Session remains active after logout - needs fix"
```

#### Skipped Items Section

List all skipped items with any provided reasons:

```
### Skipped Items

**Phase 3, Item 9:** Logout clears local storage
- Status: SKIPPED
- Reason: "Cannot test without browser environment"
```

#### Pending Items Section (Need Info)

List items where the user requested clarification:

```
### Pending Clarification

**Phase 1, Item 3:** Migrations run without errors
- Status: PENDING
- Question: "Which migrations should I test - dev or production?"
```

#### Final Recommendation

Based on the results, provide a recommendation:

```
---

Recommendation: Address 1 failed item before shipping.
```

#### Pass Rate Thresholds

Provide recommendations based on pass rate:

- **100% pass rate:** "All verifications passed. Ready to ship!"
- **80-99% pass rate:** "Most verifications passed. Review failed items before shipping."
- **50-79% pass rate:** "Significant failures detected. Address issues before proceeding."
- **<50% pass rate:** "Critical issues found. Do not ship until resolved."

If there are pending items requiring clarification:
- Add note: "Note: {N} item(s) require clarification before full verification."

### Step 7: Generate UAT Report (--report flag)

If `--report` flag is provided, create a JSON report file:

```bash
mkdir -p .tiki/reports
```

Write to `.tiki/reports/uat-issue-<number>.json`:

```json
{
  "issue": {
    "number": 34,
    "title": "Add user authentication",
    "url": "https://github.com/owner/repo/issues/34"
  },
  "verifiedAt": "2026-01-18T15:30:00Z",
  "verifiedBy": "user",
  "summary": {
    "total": 9,
    "passed": 7,
    "failed": 1,
    "skipped": 1,
    "passRate": 78
  },
  "phases": [
    {
      "number": 1,
      "title": "Setup database models",
      "items": [
        {
          "text": "User model exists in src/models/user.ts",
          "type": "automated",
          "status": "pass",
          "verifiedAt": "2026-01-18T15:25:00Z",
          "notes": null
        },
        {
          "text": "Session model has proper relationships",
          "type": "automated",
          "status": "pass",
          "verifiedAt": "2026-01-18T15:25:01Z",
          "notes": null
        },
        {
          "text": "Migrations run without errors",
          "type": "manual",
          "status": "pass",
          "verifiedAt": "2026-01-18T15:26:00Z",
          "notes": "Ran migrations locally - all applied"
        }
      ]
    }
  ],
  "recommendation": "Address 1 failed item before shipping."
}
```

Also output a markdown summary to the terminal:

```
## UAT Report Generated

Report saved to: .tiki/reports/uat-issue-34.json

| Metric      | Value |
|-------------|-------|
| Issue       | #34   |
| Total Items | 9     |
| Passed      | 7     |
| Failed      | 1     |
| Skipped     | 1     |
| Pass Rate   | 78%   |

View full report: cat .tiki/reports/uat-issue-34.json
```

### Step 8: Offer Next Steps (if enabled)

Check if menus are enabled:

1. Read `.tiki/config.json`
2. If `workflow.showNextStepMenu` is `false`, skip this step

**If all verifications passed (100%):**

Use `AskUserQuestion`:
- "Ship (Recommended)" (description: "Issue is verified, ready to ship") -> invoke Skill tool with `skill: "tiki:ship"`
- "Re-verify" (description: "Run verification again") -> invoke Skill tool with `skill: "tiki:verify"` with same args
- "Done for now" (description: "Exit without further action") -> end

**If some verifications failed:**

Use `AskUserQuestion`:
- "View failures" (description: "See detailed failure information") -> display failed items
- "Re-verify" (description: "Run verification again after fixes") -> invoke Skill tool with `skill: "tiki:verify"` with same args
- "Ship anyway" (description: "Proceed despite failures (not recommended)") -> invoke Skill tool with `skill: "tiki:ship"`
- "Done for now" (description: "Exit without further action") -> end

---

## Examples

### Example 1: Full Verification with All Passing

```
> /tiki:verify 34

## Verification Checklist for Issue #34

Issue: Add user authentication
Status: completed (3/3 phases)

Running automated verifications...

### Phase 1: Setup database models (completed)

1. [PASS] User model exists in src/models/user.ts
2. [PASS] Session model has proper relationships
3. [PASS] Migrations run without errors

### Phase 2: Add authentication endpoints (completed)

4. [PASS] POST /auth/login returns JWT token
5. [PASS] POST /auth/logout invalidates session
6. [PASS] Tests pass for auth endpoints

### Phase 3: Frontend integration (completed)

7. [PASS] Login form submits correctly
8. [PASS] Auth state persists on refresh
9. [PASS] Logout clears local storage

---

## Verification Summary

Pass Rate: 100% (9/9)

All verifications passed. Ready to ship!
```

### Example 2: Verification with Failures

```
> /tiki:verify 35

## Verification Checklist for Issue #35

Issue: Add password reset flow

Running automated verifications...

### Phase 1: Email service setup

1. [PASS] Email config exists
2. [FAIL] Email service connects successfully
   Error: Connection timeout to SMTP server

### Phase 2: Reset endpoint

3. [PASS] POST /auth/reset-password endpoint exists
4. [MANUAL] Reset email is sent correctly

[Manual verification prompt appears]

---

## Verification Summary

| Status  | Count |
|---------|-------|
| Passed  | 2     |
| Failed  | 1     |
| Manual  | 1     |

Pass Rate: 67% (2/3 verified)

### Failed Items

**Phase 1, Item 2:** Email service connects successfully
- Error: Connection timeout to SMTP server

Recommendation: Address 1 failed item before shipping.
```

### Example 3: Single Phase Verification

```
> /tiki:verify 34 --phase 2

## Verification for Issue #34 - Phase 2 Only

Issue: Add user authentication
Phase: 2 - Add authentication endpoints

### Verification Items

1. [PASS] POST /auth/login returns JWT token
2. [PASS] POST /auth/logout invalidates session
3. [PASS] Tests pass for auth endpoints

---

Phase 2 Pass Rate: 100% (3/3)

All phase 2 verifications passed.
```

### Example 4: Generate Report

```
> /tiki:verify 34 --report

## Verification Checklist for Issue #34

[... verification runs ...]

## UAT Report Generated

Report saved to: .tiki/reports/uat-issue-34.json

| Metric      | Value |
|-------------|-------|
| Issue       | #34   |
| Total Items | 9     |
| Passed      | 8     |
| Failed      | 0     |
| Skipped     | 1     |
| Pass Rate   | 89%   |

View full report: cat .tiki/reports/uat-issue-34.json
```

---

## Notes

- Run `/tiki:verify` after completing all phases but before `/tiki:ship`
- Automated verification is best-effort and may not catch all issues
- Manual verification items require user interaction
- UAT reports are stored for audit trail and can be reviewed later
- Use `--phase` flag to focus verification on specific phase during development
- Verification items come directly from the plan's `phase.verification` arrays
