/**
 * TDD Tests for Phase 2: Implement ADR creation from triggers
 * Issue #15: Create draft system for pending ADRs and Claude updates
 *
 * These tests verify that review-queue.md contains the required sections for
 * creating ADRs directly from triggers, including the template, numbering logic,
 * kebab-case naming, trigger removal, and edit/dismiss actions.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REVIEW_QUEUE_PATH = path.join(__dirname, '../../../.claude/commands/tiki/review-queue.md');

let content = '';
let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    testResults.push({ name, status: 'PASS' });
    console.log(`  PASS: ${name}`);
  } catch (error) {
    testsFailed++;
    testResults.push({ name, status: 'FAIL', error: error.message });
    console.log(`  FAIL: ${name}`);
    console.log(`        ${error.message}`);
  }
}

function describe(suiteName, fn) {
  console.log(`\n${suiteName}`);
  fn();
}

// Load the file content before running tests
try {
  content = fs.readFileSync(REVIEW_QUEUE_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read review-queue.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite: ADR Creation Action Handler
// ============================================================================

describe('ADR Creation Action Handler', () => {
  test('should document reading .tiki/adr/ directory to find next ADR number', () => {
    const hasADRDirRead = /\.tiki\/adr\/.*next\s*(adr\s*)?(number|NNN)|find.*next.*number.*\.tiki\/adr|read.*\.tiki\/adr.*number|highest.*numbered.*ADR/i.test(content);
    assert.ok(hasADRDirRead, 'Should document reading .tiki/adr/ directory to find next ADR number');
  });

  test('should mention using same numbering logic as /tiki:adr', () => {
    const hasSameLogic = /same\s*(logic|as).*\/tiki:adr|\/tiki:adr.*number|adr.*number.*logic|NNN.*start\s*at\s*001/i.test(content);
    assert.ok(hasSameLogic, 'Should mention using same numbering logic as /tiki:adr or start at 001');
  });

  test('should generate ADR file from trigger data', () => {
    const hasGeneration = /generate.*ADR.*trigger|create.*ADR.*from.*trigger|ADR.*file.*trigger|trigger.*details.*ADR/i.test(content);
    assert.ok(hasGeneration, 'Should document generating ADR file from trigger data');
  });

  test('should save ADR to .tiki/adr/<NNN>-<kebab-case-title>.md path', () => {
    const hasSavePath = /\.tiki\/adr\/.*NNN.*kebab|\.tiki\/adr\/\d{3}-.*\.md|save.*\.tiki\/adr/i.test(content);
    assert.ok(hasSavePath, 'Should save ADR to .tiki/adr/<NNN>-<kebab-case-title>.md path');
  });

  test('should remove trigger from pending.json after ADR creation', () => {
    const hasRemoval = /remove.*trigger.*pending|trigger.*removed|pending\.json.*remove.*trigger/i.test(content);
    assert.ok(hasRemoval, 'Should remove trigger from pending.json after ADR creation');
  });

  test('should confirm ADR creation with file path', () => {
    const hasConfirmation = /ADR\s*created|created.*\.tiki\/adr|confirm.*creation|file\s*path/i.test(content);
    assert.ok(hasConfirmation, 'Should confirm ADR creation with file path');
  });
});

// ============================================================================
// Test Suite: ADR Template Structure
// ============================================================================

describe('ADR Template Structure', () => {
  test('should include ADR-<NNN>: <title> header format in template', () => {
    const hasHeaderFormat = /ADR-.*NNN.*title|#\s*ADR-\d{3}:|ADR-<NNN>/i.test(content);
    assert.ok(hasHeaderFormat, 'Template should include ADR-<NNN>: <title> header format');
  });

  test('should include Status section in template', () => {
    const hasStatus = /##\s*Status\s*\n|template.*Status|Status.*Accepted/i.test(content);
    assert.ok(hasStatus, 'Template should include Status section');
  });

  test('should include Date section in template', () => {
    const hasDate = /##\s*Date\s*\n|current\s*date|template.*Date/i.test(content);
    assert.ok(hasDate, 'Template should include Date section');
  });

  test('should include Context section referencing issue and phase', () => {
    const hasContext = /##\s*Context|context.*issue.*phase|during\s*implementation.*issue/i.test(content);
    assert.ok(hasContext, 'Template should include Context section referencing issue and phase');
  });

  test('should include trigger rationale in Context', () => {
    const hasRationale = /trigger.*rationale|rationale.*context|<trigger\s*rationale>/i.test(content);
    assert.ok(hasRationale, 'Template should include trigger rationale in Context');
  });

  test('should include Decision section from trigger', () => {
    const hasDecision = /##\s*Decision|trigger.*decision|<trigger\s*decision>/i.test(content);
    assert.ok(hasDecision, 'Template should include Decision section from trigger');
  });

  test('should include Alternatives Considered section from trigger details', () => {
    const hasAlternatives = /##\s*Alternatives\s*Considered|alternatives.*trigger|trigger.*alternatives/i.test(content);
    assert.ok(hasAlternatives, 'Template should include Alternatives Considered section');
  });

  test('should iterate over trigger.details.alternatives', () => {
    const hasIteration = /for\s*each.*alternative|alternatives.*loop|alternative.*trigger\.details|trigger\.details\.alternatives/i.test(content);
    assert.ok(hasIteration, 'Template should iterate over trigger.details.alternatives');
  });

  test('should include Consequences section', () => {
    const hasConsequences = /##\s*Consequences|consequences.*template/i.test(content);
    assert.ok(hasConsequences, 'Template should include Consequences section');
  });

  test('should include Related section linking to issue', () => {
    const hasRelated = /##\s*Related|Issue\s*#.*issue\s*title|related.*issue/i.test(content);
    assert.ok(hasRelated, 'Template should include Related section linking to issue');
  });

  test('should include phase reference in Related section', () => {
    const hasPhaseRef = /Phase\s*<phase>|phase.*execution|phase\s*of\s*execution/i.test(content);
    assert.ok(hasPhaseRef, 'Template should include phase reference in Related section');
  });

  test('should include Tiki generation footer', () => {
    const hasFooter = /Generated\s*from\s*Tiki|Tiki\s*trigger|\/tiki:adr\s*show/i.test(content);
    assert.ok(hasFooter, 'Template should include Tiki generation footer');
  });
});

// ============================================================================
// Test Suite: Kebab-Case Naming Logic
// ============================================================================

describe('Kebab-Case Naming Logic', () => {
  test('should document kebab-case file naming convention', () => {
    const hasKebabCase = /kebab-case|kebab\s*case|NNN-kebab-case-title|lowercase.*hyphen/i.test(content);
    assert.ok(hasKebabCase, 'Should document kebab-case file naming convention');
  });

  test('should show example of kebab-case filename', () => {
    const hasExample = /\d{3,4}-[a-z]+-[a-z]+-.*\.md|use-jwt.*\.md|use-.*-over-.*\.md/i.test(content);
    assert.ok(hasExample, 'Should show example of kebab-case filename (e.g., 0005-use-jwt-for-authentication.md)');
  });
});

// ============================================================================
// Test Suite: Trigger Removal After ADR Creation
// ============================================================================

describe('Trigger Removal After ADR Creation', () => {
  test('should update triggers file after processing', () => {
    const hasUpdateTriggers = /update.*triggers.*file|triggers.*pending\.json.*update|remove.*trigger/i.test(content);
    assert.ok(hasUpdateTriggers, 'Should update triggers file after processing');
  });

  test('should track processed triggers with action type', () => {
    const hasActionTracking = /action.*created-adr|created-adr.*action|processed.*trigger.*action/i.test(content);
    assert.ok(hasActionTracking, 'Should track processed triggers with action type "created-adr"');
  });

  test('should record ADR path in processed trigger', () => {
    const hasADRPath = /adrPath|adr.*path.*processed|processed.*\.tiki\/adr/i.test(content);
    assert.ok(hasADRPath, 'Should record ADR path in processed trigger');
  });

  test('should include processedAt timestamp', () => {
    const hasTimestamp = /processedAt|processed.*timestamp|timestamp.*processed/i.test(content);
    assert.ok(hasTimestamp, 'Should include processedAt timestamp');
  });
});

// ============================================================================
// Test Suite: Edit Action for ADR Triggers
// ============================================================================

describe('Edit Action for ADR Triggers', () => {
  test('should document Edit action for ADR triggers', () => {
    const hasEditAction = /\[Edit\].*ADR|Edit.*trigger.*ADR|edit.*before.*creating\s*ADR/i.test(content);
    assert.ok(hasEditAction, 'Should document Edit action for ADR triggers');
  });

  test('should allow editing trigger details before ADR creation', () => {
    const hasEditWorkflow = /edit.*trigger.*detail|modify.*before.*creat|update.*trigger.*ready/i.test(content);
    assert.ok(hasEditWorkflow, 'Should allow editing trigger details before ADR creation');
  });

  test('should show current values during edit', () => {
    const hasCurrentValues = /current.*pattern|current.*trigger|editing.*trigger.*current/i.test(content);
    assert.ok(hasCurrentValues, 'Should show current values during edit');
  });

  test('should allow keeping current value with Enter', () => {
    const hasKeepOption = /keep\s*current|press\s*Enter|Enter\s*to\s*keep/i.test(content);
    assert.ok(hasKeepOption, 'Should allow keeping current value with Enter');
  });
});

// ============================================================================
// Test Suite: Dismiss Action for ADR Triggers
// ============================================================================

describe('Dismiss Action for ADR Triggers', () => {
  test('should document Dismiss action for triggers', () => {
    const hasDismissAction = /\[Dismiss\]|dismiss.*trigger|trigger.*dismiss/i.test(content);
    assert.ok(hasDismissAction, 'Should document Dismiss action for triggers');
  });

  test('should remove trigger without creating ADR', () => {
    const hasDismissWithoutADR = /dismiss.*without.*creat|remove.*without.*action|dismissed.*trigger/i.test(content);
    assert.ok(hasDismissWithoutADR, 'Should remove trigger without creating ADR when dismissed');
  });

  test('should confirm dismissal', () => {
    const hasConfirmation = /dismissed.*trigger|confirm.*dismiss|dismissal.*confirm/i.test(content);
    assert.ok(hasConfirmation, 'Should confirm dismissal');
  });

  test('should optionally capture reason for dismissal', () => {
    const hasReason = /reason.*dismiss|dismiss.*reason|already\s*documented/i.test(content);
    assert.ok(hasReason, 'Should optionally capture reason for dismissal');
  });

  test('should track dismissed triggers in processed array', () => {
    const hasProcessedDismiss = /action.*dismissed|dismissed.*processed|processed.*dismiss/i.test(content);
    assert.ok(hasProcessedDismiss, 'Should track dismissed triggers in processed array');
  });
});

// ============================================================================
// Test Suite: ADR Creation Workflow Integration
// ============================================================================

describe('ADR Creation Workflow Integration', () => {
  test('should document complete Create ADR workflow', () => {
    const hasWorkflow = /Create\s*ADR.*workflow|Creating\s*ADR\s*from\s*trigger/i.test(content);
    assert.ok(hasWorkflow, 'Should document complete Create ADR workflow');
  });

  test('should show example ADR creation output', () => {
    const hasOutput = /\[ADR\s*created.*\.tiki\/adr|ADR\s*created.*path|\.tiki\/adr\/\d{4}-/i.test(content);
    assert.ok(hasOutput, 'Should show example ADR creation output with path');
  });

  test('should show trigger removal confirmation', () => {
    const hasRemovalConfirm = /\[Trigger\s*removed|trigger\s*removed\s*from|removed\s*from\s*triggers\s*file/i.test(content);
    assert.ok(hasRemovalConfirm, 'Should show trigger removal confirmation');
  });
});

// ============================================================================
// Test Suite: Template Variable Placeholders
// ============================================================================

describe('Template Variable Placeholders', () => {
  test('should include issue number placeholder', () => {
    const hasIssuePlaceholder = /<issue>|Issue\s*#<|#\{issue\}|\{issue\.number\}/i.test(content);
    assert.ok(hasIssuePlaceholder, 'Template should include issue number placeholder');
  });

  test('should include phase number placeholder', () => {
    const hasPhasePlaceholder = /<phase>|Phase\s*<|phase\s*number|\{phase\}/i.test(content);
    assert.ok(hasPhasePlaceholder, 'Template should include phase number placeholder');
  });

  test('should include title placeholder', () => {
    const hasTitlePlaceholder = /<trigger\s*title>|<title>|\{title\}|trigger\.title/i.test(content);
    assert.ok(hasTitlePlaceholder, 'Template should include title placeholder');
  });

  test('should include decision placeholder', () => {
    const hasDecisionPlaceholder = /<trigger\s*decision>|<decision>|\{decision\}|trigger\.decision/i.test(content);
    assert.ok(hasDecisionPlaceholder, 'Template should include decision placeholder');
  });

  test('should include rationale placeholder', () => {
    const hasRationalePlaceholder = /<trigger\s*rationale>|<rationale>|\{rationale\}|trigger\.rationale/i.test(content);
    assert.ok(hasRationalePlaceholder, 'Template should include rationale placeholder');
  });
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log(`Test Results: ${testsPassed} passed, ${testsFailed} failed`);
console.log('='.repeat(60));

if (testsFailed > 0) {
  console.log('\nFailed tests:');
  testResults
    .filter(t => t.status === 'FAIL')
    .forEach(t => console.log(`  - ${t.name}`));
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
  process.exit(0);
}
