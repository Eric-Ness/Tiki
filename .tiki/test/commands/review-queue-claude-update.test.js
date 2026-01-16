/**
 * TDD Tests for Phase 3: Implement CLAUDE.md update from convention triggers
 * Issue #15: Create draft system for pending ADRs and Claude updates
 *
 * These tests verify that review-queue.md contains the required sections for
 * updating CLAUDE.md from convention triggers, including section mapping,
 * convention formatting, section creation, edit/dismiss actions, and trigger removal.
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
// Test Suite: Update CLAUDE.md Action Handler
// ============================================================================

describe('Update CLAUDE.md Action Handler', () => {
  test('should document reading existing CLAUDE.md', () => {
    const hasReadClaudemd = /read.*CLAUDE\.md|CLAUDE\.md.*read|existing\s*CLAUDE\.md/i.test(content);
    assert.ok(hasReadClaudemd, 'Should document reading existing CLAUDE.md');
  });

  test('should handle case when CLAUDE.md does not exist', () => {
    const hasCreateIfMissing = /create.*CLAUDE\.md.*if.*doesn.*exist|CLAUDE\.md.*missing|doesn.*exist.*create|prepare\s*to\s*create.*if.*doesn.*exist/i.test(content);
    assert.ok(hasCreateIfMissing, 'Should handle case when CLAUDE.md does not exist');
  });

  test('should determine section based on triggerType', () => {
    const hasSectionMapping = /triggerType|trigger.*type.*section|section.*based\s*on.*type|determine.*section/i.test(content);
    assert.ok(hasSectionMapping, 'Should determine section based on triggerType');
  });

  test('should remove trigger from pending.json after update', () => {
    const hasRemoval = /remove.*trigger.*pending|trigger.*removed|convention.*trigger.*processed/i.test(content);
    assert.ok(hasRemoval, 'Should remove trigger from pending.json after CLAUDE.md update');
  });

  test('should confirm update with details', () => {
    const hasConfirmation = /confirm.*update|update.*confirm|convention.*added|appended.*CLAUDE\.md/i.test(content);
    assert.ok(hasConfirmation, 'Should confirm update with details');
  });
});

// ============================================================================
// Test Suite: Section Mapping by Trigger Type
// ============================================================================

describe('Section Mapping by Trigger Type', () => {
  test('should map naming triggerType to Code Conventions or Naming Conventions section', () => {
    const hasNamingMapping = /naming.*code\s*conventions|naming.*naming\s*conventions|'naming'.*conventions/i.test(content);
    assert.ok(hasNamingMapping, 'Should map naming triggerType to Code Conventions or Naming Conventions section');
  });

  test('should map structure triggerType to File Organization or Project Structure section', () => {
    const hasStructureMapping = /structure.*file\s*organization|structure.*project\s*structure|'structure'.*organization|'structure'.*structure/i.test(content);
    assert.ok(hasStructureMapping, 'Should map structure triggerType to File Organization or Project Structure section');
  });

  test('should map pattern triggerType to Patterns or Code Conventions section', () => {
    const hasPatternMapping = /pattern.*patterns|pattern.*code\s*conventions|'pattern'.*patterns|'pattern'.*conventions/i.test(content);
    assert.ok(hasPatternMapping, 'Should map pattern triggerType to Patterns or Code Conventions section');
  });

  test('should map practice triggerType to Best Practices or Development Practices section', () => {
    const hasPracticeMapping = /practice.*best\s*practices|practice.*development\s*practices|'practice'.*practices/i.test(content);
    assert.ok(hasPracticeMapping, 'Should map practice triggerType to Best Practices or Development Practices section');
  });
});

// ============================================================================
// Test Suite: Convention Entry Formatting
// ============================================================================

describe('Convention Entry Formatting', () => {
  test('should format convention with pattern description', () => {
    const hasPatternFormat = /<pattern\s*description>|pattern.*description|description.*pattern/i.test(content);
    assert.ok(hasPatternFormat, 'Should format convention with pattern description');
  });

  test('should include Rationale in convention entry', () => {
    const hasRationale = /Rationale:.*<rationale>|rationale.*convention|convention.*rationale/i.test(content);
    assert.ok(hasRationale, 'Should include Rationale in convention entry');
  });

  test('should include Examples in convention entry', () => {
    const hasExamples = /Examples:.*<example|example.*convention|convention.*example|`<example/i.test(content);
    assert.ok(hasExamples, 'Should include Examples in convention entry with backtick formatting');
  });

  test('should include Source reference with Issue and Phase', () => {
    const hasSource = /Source:.*Issue\s*#|source.*issue.*phase|Issue\s*#<issue>.*Phase\s*<phase>/i.test(content);
    assert.ok(hasSource, 'Should include Source reference with Issue # and Phase');
  });

  test('should use markdown list format for convention entry', () => {
    const hasListFormat = /-\s*<pattern|bullet.*convention|convention.*-\s*Rationale/i.test(content);
    assert.ok(hasListFormat, 'Should use markdown list format for convention entry');
  });
});

// ============================================================================
// Test Suite: Section Detection and Creation
// ============================================================================

describe('Section Detection and Creation', () => {
  test('should use grep/search to find existing sections in CLAUDE.md', () => {
    const hasSectionSearch = /grep|search.*section|find.*section|existing\s*section|section.*detection/i.test(content);
    assert.ok(hasSectionSearch, 'Should use grep/search to find existing sections in CLAUDE.md');
  });

  test('should create section if it does not exist', () => {
    const hasSectionCreate = /create.*section|section.*if\s*(needed|doesn.*exist)|append.*section|add.*section.*if/i.test(content);
    assert.ok(hasSectionCreate, 'Should create section if it does not exist');
  });

  test('should append to appropriate section', () => {
    const hasAppend = /append.*section|add.*to.*section|append.*appropriate/i.test(content);
    assert.ok(hasAppend, 'Should append to appropriate section');
  });
});

// ============================================================================
// Test Suite: Create CLAUDE.md if Missing
// ============================================================================

describe('Create CLAUDE.md if Missing', () => {
  test('should use minimal template if CLAUDE.md does not exist', () => {
    const hasMinimalTemplate = /minimal\s*template|template.*if.*doesn.*exist|create.*template|basic.*template/i.test(content);
    assert.ok(hasMinimalTemplate, 'Should use minimal template if CLAUDE.md does not exist');
  });

  test('should document handling of missing CLAUDE.md file', () => {
    const hasMissingHandling = /CLAUDE\.md.*missing|missing.*CLAUDE\.md|if.*file.*doesn.*exist|doesn.*exist.*CLAUDE\.md/i.test(content);
    assert.ok(hasMissingHandling, 'Should document handling of missing CLAUDE.md file');
  });
});

// ============================================================================
// Test Suite: Edit Action for Convention Triggers
// ============================================================================

describe('Edit Action for Convention Triggers', () => {
  test('should document Edit action for convention triggers', () => {
    const hasEditAction = /\[Edit\].*convention|Edit.*convention.*trigger|edit.*pattern.*before/i.test(content);
    assert.ok(hasEditAction, 'Should document Edit action for convention triggers');
  });

  test('should allow editing pattern/rationale before adding', () => {
    const hasEditWorkflow = /edit.*pattern|modify.*pattern|update.*pattern.*before|editing.*pattern/i.test(content);
    assert.ok(hasEditWorkflow, 'Should allow editing pattern/rationale before adding');
  });

  test('should show current pattern value during edit', () => {
    const hasCurrentPattern = /current.*pattern|pattern.*current|editing.*trigger.*pattern/i.test(content);
    assert.ok(hasCurrentPattern, 'Should show current pattern value during edit');
  });

  test('should show Ready for Update CLAUDE.md after edit', () => {
    const hasReadyState = /ready.*Update\s*CLAUDE\.md|Updated\s*trigger.*ready|after.*edit.*Update\s*CLAUDE\.md/i.test(content);
    assert.ok(hasReadyState, 'Should show Ready for Update CLAUDE.md after edit');
  });
});

// ============================================================================
// Test Suite: Dismiss Action for Convention Triggers
// ============================================================================

describe('Dismiss Action for Convention Triggers', () => {
  test('should document Dismiss action for convention triggers', () => {
    const hasDismissAction = /\[Dismiss\]|dismiss.*convention|convention.*dismiss/i.test(content);
    assert.ok(hasDismissAction, 'Should document Dismiss action for convention triggers');
  });

  test('should remove trigger without updating CLAUDE.md when dismissed', () => {
    const hasDismissWithoutUpdate = /dismiss.*without.*updat|remove.*without.*CLAUDE\.md|dismissed.*trigger/i.test(content);
    assert.ok(hasDismissWithoutUpdate, 'Should remove trigger without updating CLAUDE.md when dismissed');
  });

  test('should confirm dismissal of convention trigger', () => {
    const hasConfirmation = /dismissed.*trigger|confirm.*dismiss|dismissal.*confirm/i.test(content);
    assert.ok(hasConfirmation, 'Should confirm dismissal of convention trigger');
  });
});

// ============================================================================
// Test Suite: Trigger Removal After CLAUDE.md Update
// ============================================================================

describe('Trigger Removal After CLAUDE.md Update', () => {
  test('should remove convention trigger from pending.json after update', () => {
    const hasRemoval = /remove.*trigger|trigger.*removed.*pending|convention.*trigger.*removed/i.test(content);
    assert.ok(hasRemoval, 'Should remove convention trigger from pending.json after update');
  });

  test('should track processed convention triggers', () => {
    const hasProcessed = /processed.*convention|convention.*trigger.*processed|action.*convention/i.test(content);
    assert.ok(hasProcessed, 'Should track processed convention triggers');
  });

  test('should include processedAt timestamp for convention trigger', () => {
    const hasTimestamp = /processedAt|processed.*timestamp|timestamp.*processed/i.test(content);
    assert.ok(hasTimestamp, 'Should include processedAt timestamp for convention trigger');
  });
});

// ============================================================================
// Test Suite: Update CLAUDE.md Workflow Integration
// ============================================================================

describe('Update CLAUDE.md Workflow Integration', () => {
  test('should document complete Update CLAUDE.md workflow', () => {
    const hasWorkflow = /Update\s*CLAUDE\.md.*workflow|update.*CLAUDE\.md.*convention|Adding\s*convention\s*to\s*CLAUDE\.md/i.test(content);
    assert.ok(hasWorkflow, 'Should document complete Update CLAUDE.md workflow');
  });

  test('should show example output for convention added', () => {
    const hasOutput = /\[Convention\s*added|convention\s*added\s*to\s*CLAUDE\.md|Appended\s*to\s*CLAUDE\.md/i.test(content);
    assert.ok(hasOutput, 'Should show example output for convention added');
  });

  test('should show trigger removal confirmation after CLAUDE.md update', () => {
    const hasRemovalConfirm = /\[Trigger\s*removed|trigger\s*removed\s*from|removed\s*from\s*triggers\s*file/i.test(content);
    assert.ok(hasRemovalConfirm, 'Should show trigger removal confirmation after CLAUDE.md update');
  });
});

// ============================================================================
// Test Suite: Convention Formatting Example
// ============================================================================

describe('Convention Formatting Example', () => {
  test('should show formatted convention example with API Error Format', () => {
    const hasAPIExample = /API\s*Error\s*Format|error.*format.*convention|All\s*API\s*errors\s*return/i.test(content);
    assert.ok(hasAPIExample, 'Should show formatted convention example with API Error Format');
  });

  test('should show example with error: string, code: number structure', () => {
    const hasStructureExample = /error.*string.*code.*number|\{\s*error.*code.*\}/i.test(content);
    assert.ok(hasStructureExample, 'Should show example with error: string, code: number structure');
  });

  test('should show example with 404 error code', () => {
    const has404Example = /404|Not\s*found.*404/i.test(content);
    assert.ok(has404Example, 'Should show example with 404 error code');
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
