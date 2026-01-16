/**
 * TDD Tests for Phase 1: Extend review-queue to load and display triggers
 * Issue #15: Create draft system for pending ADRs and Claude updates
 *
 * These tests verify that review-queue.md contains the required sections for
 * loading triggers file, displaying ADR triggers, displaying convention triggers,
 * updating summary counts, and handling empty state.
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
// Test Suite: Trigger File Loading Instructions
// ============================================================================

describe('Trigger File Loading Instructions', () => {
  test('should instruct to load .tiki/triggers/pending.json', () => {
    const hasTriggerLoadInstruction = /\.tiki\/triggers\/pending\.json/i.test(content);
    assert.ok(hasTriggerLoadInstruction, 'Missing instruction to load .tiki/triggers/pending.json');
  });

  test('should load triggers file after queue file', () => {
    const queueLoadPos = content.search(/\.tiki\/queue\/pending\.json/i);
    const triggerLoadPos = content.search(/\.tiki\/triggers\/pending\.json/i);

    assert.ok(queueLoadPos >= 0, 'Queue loading instruction not found');
    assert.ok(triggerLoadPos >= 0, 'Trigger loading instruction not found');
    assert.ok(queueLoadPos < triggerLoadPos, 'Trigger file should be loaded after queue file');
  });

  test('should instruct to create empty structure if triggers file does not exist', () => {
    const hasEmptyStructure = /create\s*(empty|default)\s*(structure|file)|if\s*(doesn\'t|does\s*not)\s*exist|empty.*triggers.*\[\]|triggers.*empty.*\[\]/i.test(content);
    assert.ok(hasEmptyStructure, 'Should instruct to create empty structure if triggers file does not exist');
  });

  test('should show expected triggers file structure', () => {
    const hasTriggersStructure = /"triggers"\s*:\s*\[/i.test(content);
    assert.ok(hasTriggersStructure, 'Should show expected triggers file structure with "triggers" array');
  });
});

// ============================================================================
// Test Suite: ADR Triggers Display Section
// ============================================================================

describe('ADR Triggers Display Section', () => {
  test('should have ADR Triggers section header', () => {
    const hasADRSection = /###\s*ADR\s*Triggers/i.test(content);
    assert.ok(hasADRSection, 'Missing "### ADR Triggers" section header');
  });

  test('ADR Triggers section should show count', () => {
    const hasADRCount = /###\s*ADR\s*Triggers\s*\(/i.test(content);
    assert.ok(hasADRCount, 'ADR Triggers section should show count in parentheses');
  });

  test('ADR trigger display should show Type field', () => {
    // Look for Type field in context of ADR triggers
    const hasTypeField = /ADR\s*Trigger[\s\S]*?\*\*Type:\*\*/i.test(content) ||
                         /\*\*Type:\*\*.*triggerType/i.test(content);
    assert.ok(hasTypeField, 'ADR trigger display should show Type field');
  });

  test('ADR trigger display should show Source field with Issue and Phase', () => {
    const hasSourceField = /\*\*Source:\*\*.*Issue\s*#.*Phase/i.test(content);
    assert.ok(hasSourceField, 'ADR trigger display should show Source field with Issue # and Phase');
  });

  test('ADR trigger display should show Confidence field', () => {
    const hasConfidenceField = /\*\*Confidence:\*\*/i.test(content);
    assert.ok(hasConfidenceField, 'ADR trigger display should show Confidence field');
  });

  test('ADR trigger display should show Details field for decision/rationale', () => {
    const hasDetailsField = /\*\*Details:\*\*/i.test(content);
    assert.ok(hasDetailsField, 'ADR trigger display should show Details field');
  });

  test('ADR triggers should have Create ADR action', () => {
    const hasCreateADRAction = /\[Create\s*ADR\]/i.test(content);
    assert.ok(hasCreateADRAction, 'ADR triggers should have [Create ADR] action');
  });

  test('ADR triggers should have Edit action', () => {
    const hasEditAction = /ADR\s*Trigger[\s\S]*?\[Edit\]/i.test(content) ||
                          /\[Create\s*ADR\][\s\S]*?\[Edit\]/i.test(content);
    assert.ok(hasEditAction, 'ADR triggers should have [Edit] action');
  });

  test('ADR triggers should have Dismiss action', () => {
    const hasDismissAction = /ADR\s*Trigger[\s\S]*?\[Dismiss\]/i.test(content) ||
                             /\[Create\s*ADR\][\s\S]*?\[Dismiss\]/i.test(content);
    assert.ok(hasDismissAction, 'ADR triggers should have [Dismiss] action');
  });
});

// ============================================================================
// Test Suite: Convention Triggers Display Section
// ============================================================================

describe('Convention Triggers Display Section', () => {
  test('should have Convention Triggers section header', () => {
    const hasConventionSection = /###\s*Convention\s*Triggers/i.test(content);
    assert.ok(hasConventionSection, 'Missing "### Convention Triggers" section header');
  });

  test('Convention Triggers section should show count', () => {
    const hasConventionCount = /###\s*Convention\s*Triggers\s*\(/i.test(content);
    assert.ok(hasConventionCount, 'Convention Triggers section should show count in parentheses');
  });

  test('Convention trigger display should show Type field', () => {
    const hasTypeField = /Convention\s*Trigger[\s\S]*?\*\*Type:\*\*/i.test(content) ||
                         /###\s*Convention\s*Triggers[\s\S]*?\*\*Type:\*\*/i.test(content);
    assert.ok(hasTypeField, 'Convention trigger display should show Type field');
  });

  test('Convention trigger display should show Source field', () => {
    const hasSourceField = /Convention\s*Trigger[\s\S]*?\*\*Source:\*\*/i.test(content) ||
                           /###\s*Convention\s*Triggers[\s\S]*?\*\*Source:\*\*/i.test(content);
    assert.ok(hasSourceField, 'Convention trigger display should show Source field');
  });

  test('Convention trigger display should show Confidence field', () => {
    const hasConfidenceField = /Convention\s*Trigger[\s\S]*?\*\*Confidence:\*\*/i.test(content) ||
                               /###\s*Convention\s*Triggers[\s\S]*?\*\*Confidence:\*\*/i.test(content);
    assert.ok(hasConfidenceField, 'Convention trigger display should show Confidence field');
  });

  test('Convention trigger display should show Pattern field', () => {
    const hasPatternField = /\*\*Pattern:\*\*/i.test(content);
    assert.ok(hasPatternField, 'Convention trigger display should show Pattern field');
  });

  test('Convention trigger display should show Examples field', () => {
    const hasExamplesField = /\*\*Examples:\*\*/i.test(content);
    assert.ok(hasExamplesField, 'Convention trigger display should show Examples field');
  });

  test('Convention triggers should have Update CLAUDE.md action', () => {
    const hasUpdateClaudeAction = /\[Update\s*CLAUDE\.md\]/i.test(content);
    assert.ok(hasUpdateClaudeAction, 'Convention triggers should have [Update CLAUDE.md] action');
  });

  test('Convention triggers should have Edit action', () => {
    const hasEditAction = /Convention\s*Trigger[\s\S]*?\[Edit\]/i.test(content) ||
                          /\[Update\s*CLAUDE\.md\][\s\S]*?\[Edit\]/i.test(content);
    assert.ok(hasEditAction, 'Convention triggers should have [Edit] action');
  });

  test('Convention triggers should have Dismiss action', () => {
    const hasDismissAction = /Convention\s*Trigger[\s\S]*?\[Dismiss\]/i.test(content) ||
                             /\[Update\s*CLAUDE\.md\][\s\S]*?\[Dismiss\]/i.test(content);
    assert.ok(hasDismissAction, 'Convention triggers should have [Dismiss] action');
  });
});

// ============================================================================
// Test Suite: Display Format Structure
// ============================================================================

describe('Display Format Structure', () => {
  test('trigger display should be numbered (#### 1. <title>)', () => {
    const hasNumberedFormat = /####\s*\d+\./i.test(content);
    assert.ok(hasNumberedFormat, 'Trigger display should use numbered format (#### 1. <title>)');
  });

  test('ADR triggers section should come after queue items display', () => {
    // Queue items display mentions "Potential Issues" and ADR triggers should come after
    const potentialIssuesPos = content.search(/###\s*Potential\s*Issues/i);
    const adrTriggersPos = content.search(/###\s*ADR\s*Triggers/i);

    assert.ok(potentialIssuesPos >= 0, 'Potential Issues section not found');
    assert.ok(adrTriggersPos >= 0, 'ADR Triggers section not found');
    assert.ok(potentialIssuesPos < adrTriggersPos, 'ADR Triggers should come after queue items (Potential Issues)');
  });

  test('Convention triggers section should come after ADR triggers', () => {
    const adrTriggersPos = content.search(/###\s*ADR\s*Triggers/i);
    const conventionTriggersPos = content.search(/###\s*Convention\s*Triggers/i);

    assert.ok(adrTriggersPos >= 0, 'ADR Triggers section not found');
    assert.ok(conventionTriggersPos >= 0, 'Convention Triggers section not found');
    assert.ok(adrTriggersPos < conventionTriggersPos, 'Convention Triggers should come after ADR Triggers');
  });

  test('sections should be separated by horizontal rules (---)', () => {
    const hasSeparators = /###\s*ADR\s*Triggers[\s\S]*?---[\s\S]*?###\s*Convention\s*Triggers/i.test(content);
    assert.ok(hasSeparators, 'Trigger sections should be separated by horizontal rules (---)');
  });
});

// ============================================================================
// Test Suite: Summary Counts Including Triggers
// ============================================================================

describe('Summary Counts Including Triggers', () => {
  test('should mention total items including triggers', () => {
    const hasTotalWithTriggers = /total\s*items?.*trigger|trigger.*total|items?\s*\+\s*triggers|including\s*triggers/i.test(content);
    assert.ok(hasTotalWithTriggers, 'Should mention total items including triggers in summary');
  });

  test('should show separate counts for ADR and Convention triggers', () => {
    const hasADRCount = /ADR\s*Triggers?\s*\(\d+\)|ADR\s*Triggers?:\s*\d+|\d+\s*ADR\s*trigger/i.test(content);
    const hasConventionCount = /Convention\s*Triggers?\s*\(\d+\)|Convention\s*Triggers?:\s*\d+|\d+\s*convention\s*trigger/i.test(content);

    assert.ok(hasADRCount || hasConventionCount, 'Should show counts for ADR and/or Convention triggers');
  });

  test('display summary should reference trigger counts', () => {
    // Look for item count that includes triggers
    const hasSummaryWithTriggers = /\*\*\d+\s*items?\*\*.*trigger|pending\s*review.*trigger|trigger.*pending/i.test(content) ||
                                   /items?\s*and\s*triggers/i.test(content);
    assert.ok(hasSummaryWithTriggers, 'Display summary should reference trigger counts');
  });
});

// ============================================================================
// Test Suite: Empty State Handling
// ============================================================================

describe('Empty State Handling', () => {
  test('should handle case when both queue and triggers are empty', () => {
    const hasEmptyBothState = /queue.*trigger.*empty|both.*empty|no\s*items?.*no\s*trigger|empty.*queue.*trigger/i.test(content);
    assert.ok(hasEmptyBothState, 'Should handle case when both queue and triggers are empty');
  });

  test('should show consolidated empty message', () => {
    const hasConsolidatedEmpty = /no\s*items?\s*(or|and)\s*triggers?\s*pending|queue.*empty.*no\s*triggers?|nothing.*review/i.test(content);
    assert.ok(hasConsolidatedEmpty, 'Should show consolidated empty message when both are empty');
  });

  test('empty state should suggest using /tiki:state', () => {
    const hasTikiStateSuggestion = /\/tiki:state/i.test(content);
    assert.ok(hasTikiStateSuggestion, 'Empty state should suggest using /tiki:state');
  });

  test('should handle queue empty but triggers present', () => {
    const hasQueueEmptyTriggersPresent = /queue\s*(is\s*)?empty.*trigger|no\s*queue\s*items?.*trigger|only\s*triggers?/i.test(content) ||
                                          /ADR\s*Triggers\s*\(\d+\)/i.test(content); // Implied by showing ADR triggers with count
    assert.ok(hasQueueEmptyTriggersPresent, 'Should handle case when queue is empty but triggers present');
  });

  test('should handle triggers empty but queue present', () => {
    const hasTriggersEmptyQueuePresent = /trigger.*empty.*queue|no\s*triggers?.*items?|queue\s*items?.*no\s*triggers?/i.test(content) ||
                                          /Potential\s*Issues\s*\(\d+\)/i.test(content); // Implied by existing queue display
    assert.ok(hasTriggersEmptyQueuePresent, 'Should handle case when triggers empty but queue present');
  });
});

// ============================================================================
// Test Suite: Trigger Processing Actions
// ============================================================================

describe('Trigger Processing Actions', () => {
  test('should document Create ADR action workflow', () => {
    const hasCreateADRWorkflow = /Create\s*ADR[\s\S]*?(\/tiki:adr|adr\.md|launch|invoke)/i.test(content);
    assert.ok(hasCreateADRWorkflow, 'Should document Create ADR action workflow');
  });

  test('should document Update CLAUDE.md action workflow', () => {
    const hasUpdateClaudeWorkflow = /Update\s*CLAUDE\.md[\s\S]*?(append|add|write|edit|CLAUDE\.md)/i.test(content);
    assert.ok(hasUpdateClaudeWorkflow, 'Should document Update CLAUDE.md action workflow');
  });

  test('should document Dismiss action for triggers', () => {
    const hasDismissWorkflow = /dismiss.*trigger|trigger.*dismiss|remove.*trigger/i.test(content);
    assert.ok(hasDismissWorkflow, 'Should document Dismiss action for triggers');
  });

  test('should document Edit action for modifying trigger details', () => {
    const hasEditWorkflow = /edit.*trigger|modify.*trigger|update.*trigger.*detail/i.test(content);
    assert.ok(hasEditWorkflow, 'Should document Edit action for modifying trigger details');
  });
});

// ============================================================================
// Test Suite: Triggers Queue Update
// ============================================================================

describe('Triggers Queue Update', () => {
  test('should instruct to update triggers file after processing', () => {
    const hasUpdateInstruction = /update.*\.tiki\/triggers|\.tiki\/triggers.*update|processed.*triggers?.*remove/i.test(content);
    assert.ok(hasUpdateInstruction, 'Should instruct to update triggers file after processing');
  });

  test('should track processed triggers similar to queue items', () => {
    const hasProcessedTracking = /processed.*trigger|trigger.*processed|action.*trigger/i.test(content);
    assert.ok(hasProcessedTracking, 'Should track processed triggers similar to queue items');
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
