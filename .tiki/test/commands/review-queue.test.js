/**
 * Comprehensive Tests for review-queue.md trigger processing functionality
 * Issue #15: Create draft system for pending ADRs and Claude updates
 *
 * This consolidated test file verifies that review-queue.md contains all required
 * sections for trigger processing, including:
 * - Phase 1: Loading and displaying triggers
 * - Phase 2: ADR creation from triggers
 * - Phase 3: CLAUDE.md updates from convention triggers
 * - Phase 4: Batch operations for triggers
 *
 * Run: node .tiki/test/commands/review-queue.test.js
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

console.log('Comprehensive Review Queue Trigger Processing Tests');
console.log('='.repeat(60));

// ============================================================================
// TEST SUITE 1: Trigger Loading (Phase 1)
// ============================================================================

describe('1. Trigger File Loading', () => {
  test('should instruct to load .tiki/triggers/pending.json', () => {
    const hasTriggerLoadInstruction = /\.tiki\/triggers\/pending\.json/i.test(content);
    assert.ok(hasTriggerLoadInstruction, 'Missing instruction to load .tiki/triggers/pending.json');
  });

  test('should load triggers file in Step 1', () => {
    const step1Section = content.match(/###\s*Step\s*1[\s\S]*?(?=###\s*Step|$)/i);
    assert.ok(step1Section, 'Could not find Step 1 section');
    const hasTriggerInStep1 = /triggers|pending\.json/i.test(step1Section[0]);
    assert.ok(hasTriggerInStep1, 'Step 1 should mention loading triggers');
  });

  test('should show expected triggers file structure with triggerType field', () => {
    const hasTriggersStructure = /"triggers"\s*:\s*\[/i.test(content);
    const hasTriggerType = /triggerType/i.test(content);
    assert.ok(hasTriggersStructure && hasTriggerType, 'Should show triggers structure with triggerType field');
  });

  test('should handle empty triggers with fallback structure', () => {
    const hasEmptyStructure = /create\s*(empty|default)|if\s*(doesn\'t|does\s*not)\s*exist|empty.*triggers.*\[\]/i.test(content);
    assert.ok(hasEmptyStructure, 'Should handle empty triggers with fallback structure');
  });
});

// ============================================================================
// TEST SUITE 2: ADR Triggers Display (Phase 1)
// ============================================================================

describe('2. ADR Triggers Display Section', () => {
  test('should have ADR Triggers section header with count', () => {
    const hasADRSection = /###\s*ADR\s*Triggers\s*\(/i.test(content);
    assert.ok(hasADRSection, 'Missing "### ADR Triggers (#)" section header');
  });

  test('ADR trigger display should show Type, Source, Confidence, and Details fields', () => {
    const hasType = /\*\*Type:\*\*/i.test(content);
    const hasSource = /\*\*Source:\*\*/i.test(content);
    const hasConfidence = /\*\*Confidence:\*\*/i.test(content);
    const hasDetails = /\*\*Details:\*\*/i.test(content);
    assert.ok(hasType && hasSource && hasConfidence && hasDetails, 'ADR trigger should display Type, Source, Confidence, Details fields');
  });

  test('ADR triggers should have [Create ADR], [Edit], and [Dismiss] actions', () => {
    const hasCreateADR = /\[Create\s*ADR\]/i.test(content);
    const hasEdit = /\[Edit\]/i.test(content);
    const hasDismiss = /\[Dismiss\]/i.test(content);
    assert.ok(hasCreateADR && hasEdit && hasDismiss, 'ADR triggers should have Create ADR, Edit, Dismiss actions');
  });
});

// ============================================================================
// TEST SUITE 3: Convention Triggers Display (Phase 1)
// ============================================================================

describe('3. Convention Triggers Display Section', () => {
  test('should have Convention Triggers section header with count', () => {
    const hasConventionSection = /###\s*Convention\s*Triggers\s*\(/i.test(content);
    assert.ok(hasConventionSection, 'Missing "### Convention Triggers (#)" section header');
  });

  test('Convention trigger display should show Pattern and Examples fields', () => {
    const hasPattern = /\*\*Pattern:\*\*/i.test(content);
    const hasExamples = /\*\*Examples:\*\*/i.test(content);
    assert.ok(hasPattern && hasExamples, 'Convention trigger should display Pattern and Examples fields');
  });

  test('Convention triggers should have [Update CLAUDE.md] action', () => {
    const hasUpdateClaudeAction = /\[Update\s*CLAUDE\.md\]/i.test(content);
    assert.ok(hasUpdateClaudeAction, 'Convention triggers should have [Update CLAUDE.md] action');
  });

  test('Convention Triggers section should come after ADR Triggers', () => {
    const adrPos = content.search(/###\s*ADR\s*Triggers/i);
    const conventionPos = content.search(/###\s*Convention\s*Triggers/i);
    assert.ok(adrPos >= 0 && conventionPos >= 0, 'Both trigger sections should exist');
    assert.ok(adrPos < conventionPos, 'Convention Triggers should come after ADR Triggers');
  });
});

// ============================================================================
// TEST SUITE 4: ADR Creation Workflow (Phase 2)
// ============================================================================

describe('4. ADR Creation from Triggers', () => {
  test('should document finding next ADR number from .tiki/adr/ directory', () => {
    const hasADRNumbering = /\.tiki\/adr\/.*next|find.*next.*number|highest.*numbered.*ADR|NNN.*start\s*at\s*001/i.test(content);
    assert.ok(hasADRNumbering, 'Should document finding next ADR number');
  });

  test('should include ADR template with Status, Date, Context, Decision, Consequences sections', () => {
    const hasStatus = /##\s*Status/i.test(content);
    const hasDate = /##\s*Date/i.test(content);
    const hasContext = /##\s*Context/i.test(content);
    const hasDecision = /##\s*Decision/i.test(content);
    const hasConsequences = /##\s*Consequences/i.test(content);
    assert.ok(hasStatus && hasDate && hasContext && hasDecision && hasConsequences,
      'ADR template should have Status, Date, Context, Decision, Consequences sections');
  });

  test('should include Alternatives Considered section in template', () => {
    const hasAlternatives = /##\s*Alternatives\s*Considered/i.test(content);
    assert.ok(hasAlternatives, 'ADR template should have Alternatives Considered section');
  });

  test('should save ADR to .tiki/adr/<NNN>-<kebab-case-title>.md', () => {
    const hasKebabCase = /kebab-case|kebab\s*case|lowercase.*hyphen/i.test(content);
    const hasSavePath = /\.tiki\/adr\/.*\.md/i.test(content);
    assert.ok(hasKebabCase && hasSavePath, 'Should save ADR with kebab-case filename');
  });

  test('should show example kebab-case filename', () => {
    const hasExample = /\d{4}-[a-z]+-[a-z]+-.*\.md/i.test(content);
    assert.ok(hasExample, 'Should show example kebab-case filename');
  });

  test('should remove trigger from pending.json after ADR creation', () => {
    const hasRemoval = /remove.*trigger|trigger\s*removed|removed\s*from\s*triggers\s*file/i.test(content);
    assert.ok(hasRemoval, 'Should remove trigger after ADR creation');
  });

  test('should confirm ADR creation with file path', () => {
    const hasConfirmation = /\[ADR\s*created|ADR\s*created.*path/i.test(content);
    assert.ok(hasConfirmation, 'Should confirm ADR creation with file path');
  });
});

// ============================================================================
// TEST SUITE 5: CLAUDE.md Update Workflow (Phase 3)
// ============================================================================

describe('5. CLAUDE.md Update from Convention Triggers', () => {
  test('should document reading existing CLAUDE.md', () => {
    const hasReadClaudemd = /read.*CLAUDE\.md|CLAUDE\.md.*read|existing\s*CLAUDE\.md/i.test(content);
    assert.ok(hasReadClaudemd, 'Should document reading existing CLAUDE.md');
  });

  test('should handle case when CLAUDE.md does not exist with minimal template', () => {
    const hasCreateIfMissing = /CLAUDE\.md.*missing|create.*if.*doesn.*exist|minimal\s*template/i.test(content);
    assert.ok(hasCreateIfMissing, 'Should handle missing CLAUDE.md with minimal template');
  });

  test('should map triggerType to appropriate CLAUDE.md section', () => {
    const hasNamingMapping = /naming.*conventions/i.test(content);
    const hasStructureMapping = /structure.*organization|structure.*project/i.test(content);
    const hasPatternMapping = /pattern.*patterns|pattern.*conventions/i.test(content);
    const hasPracticeMapping = /practice.*practices/i.test(content);
    assert.ok(hasNamingMapping || hasStructureMapping || hasPatternMapping || hasPracticeMapping,
      'Should map triggerType to CLAUDE.md section');
  });

  test('should format convention with pattern, rationale, examples, and source', () => {
    const hasPatternFormat = /pattern.*description|<pattern\s*description>/i.test(content);
    const hasRationale = /Rationale:/i.test(content);
    const hasExamples = /Examples:/i.test(content);
    const hasSource = /Source:.*Issue/i.test(content);
    assert.ok(hasPatternFormat && hasRationale && hasExamples && hasSource,
      'Convention entry should have pattern, rationale, examples, source');
  });

  test('should detect existing sections using grep/search', () => {
    const hasSectionDetection = /section\s*detection|grep|search.*section|find.*section/i.test(content);
    assert.ok(hasSectionDetection, 'Should detect existing sections');
  });

  test('should create section if it does not exist', () => {
    const hasSectionCreate = /create.*section|section.*if\s*(needed|doesn.*exist)/i.test(content);
    assert.ok(hasSectionCreate, 'Should create section if needed');
  });

  test('should append convention entry to appropriate section', () => {
    const hasAppend = /append.*section|appended.*CLAUDE\.md/i.test(content);
    assert.ok(hasAppend, 'Should append convention to appropriate section');
  });

  test('should confirm convention added to CLAUDE.md', () => {
    const hasConfirmation = /\[Convention\s*added|convention\s*added\s*to\s*CLAUDE\.md/i.test(content);
    assert.ok(hasConfirmation, 'Should confirm convention added');
  });
});

// ============================================================================
// TEST SUITE 6: Dismiss Action (Phase 2 & 3)
// ============================================================================

describe('6. Dismiss Action for Triggers', () => {
  test('should document Dismiss action workflow', () => {
    const hasDismissWorkflow = /dismiss.*trigger|dismissed.*trigger/i.test(content);
    assert.ok(hasDismissWorkflow, 'Should document Dismiss action workflow');
  });

  test('should remove trigger without creating ADR or updating CLAUDE.md', () => {
    const hasDismissWithoutAction = /dismiss.*without|remove.*without.*action/i.test(content);
    assert.ok(hasDismissWithoutAction, 'Should remove trigger without taking action');
  });

  test('should optionally capture reason for dismissal', () => {
    const hasReason = /reason.*dismiss|dismiss.*reason|already\s*documented/i.test(content);
    assert.ok(hasReason, 'Should optionally capture reason for dismissal');
  });

  test('should track dismissed triggers in processed array', () => {
    const hasProcessedDismiss = /action.*dismissed|dismissed.*processed/i.test(content);
    assert.ok(hasProcessedDismiss, 'Should track dismissed triggers in processed array');
  });
});

// ============================================================================
// TEST SUITE 7: Batch Operations (Phase 4)
// ============================================================================

describe('7. Batch Operations for Triggers', () => {
  test('should document --create-all batch operation', () => {
    const hasCreateAll = /--create-all/i.test(content);
    assert.ok(hasCreateAll, 'Should document --create-all batch operation');
  });

  test('--create-all should create ADRs for high-confidence triggers', () => {
    const createAllSection = content.match(/### --create-all[\s\S]*?(?=###|$)/);
    assert.ok(createAllSection, '--create-all section should exist');
    const hasHighConfidence = /high-confidence|high\s*confidence/i.test(createAllSection[0]);
    const hasADR = /ADR/i.test(createAllSection[0]);
    assert.ok(hasHighConfidence && hasADR, '--create-all should create ADRs for high-confidence triggers');
  });

  test('--create-all should skip low/medium confidence triggers', () => {
    const createAllSection = content.match(/### --create-all[\s\S]*?(?=###|$)/);
    assert.ok(createAllSection, '--create-all section should exist');
    const hasSkipMention = /skip|manual\s*review|low.*medium|medium.*confidence/i.test(createAllSection[0]);
    assert.ok(hasSkipMention, '--create-all should skip low/medium confidence triggers');
  });

  test('should document --dismiss-all batch operation', () => {
    const hasDismissAll = /--dismiss-all/i.test(content);
    assert.ok(hasDismissAll, 'Should document --dismiss-all batch operation');
  });

  test('--dismiss-all should clear all triggers', () => {
    const dismissAllSection = content.match(/### --dismiss-all[\s\S]*?(?=###|##[^#]|$)/);
    assert.ok(dismissAllSection, '--dismiss-all section should exist');
    const hasTriggerClear = /trigger.*remove|trigger.*clear|dismiss.*trigger/i.test(dismissAllSection[0]);
    assert.ok(hasTriggerClear, '--dismiss-all should clear all triggers');
  });

  test('batch operations should show summary counts for triggers', () => {
    const batchSection = content.match(/## Batch Operations[\s\S]*?(?=##[^#]|$)/);
    assert.ok(batchSection, 'Batch Operations section should exist');
    const hasTriggerCount = /\d+\s*(ADR\s*)?trigger/i.test(batchSection[0]);
    assert.ok(hasTriggerCount, 'Batch operations should show trigger counts');
  });
});

// ============================================================================
// TEST SUITE 8: Trigger Processing State Updates (Phase 2 & 3)
// ============================================================================

describe('8. Trigger Processing State Updates', () => {
  test('should update .tiki/triggers/pending.json after processing', () => {
    const hasUpdateInstruction = /update.*\.tiki\/triggers|\.tiki\/triggers.*update/i.test(content);
    assert.ok(hasUpdateInstruction, 'Should update triggers file after processing');
  });

  test('should track processed triggers with action type', () => {
    const hasActionTracking = /"action":\s*"created-adr"|"action":\s*"dismissed"/i.test(content);
    assert.ok(hasActionTracking, 'Should track processed triggers with action type');
  });

  test('should record processedAt timestamp', () => {
    const hasTimestamp = /processedAt/i.test(content);
    assert.ok(hasTimestamp, 'Should record processedAt timestamp');
  });

  test('should record adrPath for created ADRs', () => {
    const hasADRPath = /adrPath/i.test(content);
    assert.ok(hasADRPath, 'Should record adrPath for created ADRs');
  });
});

// ============================================================================
// TEST SUITE 9: Empty State Handling (Phase 1)
// ============================================================================

describe('9. Empty State Handling', () => {
  test('should handle case when both queue and triggers are empty', () => {
    const hasEmptyBothState = /queue.*empty|no\s*items.*trigger/i.test(content);
    assert.ok(hasEmptyBothState, 'Should handle empty queue and triggers state');
  });

  test('should suggest /tiki:state when empty', () => {
    const hasTikiStateSuggestion = /\/tiki:state/i.test(content);
    assert.ok(hasTikiStateSuggestion, 'Should suggest /tiki:state when empty');
  });

  test('should handle queue empty but triggers present', () => {
    const hasQueueEmptyTriggersPresent = /queue\s*(is\s*)?empty.*trigger|skip.*trigger/i.test(content);
    assert.ok(hasQueueEmptyTriggersPresent, 'Should handle queue empty with triggers present');
  });
});

// ============================================================================
// TEST SUITE 10: Summary Display (Phase 1 & 4)
// ============================================================================

describe('10. Summary Display with Trigger Counts', () => {
  test('should show total items including triggers in summary', () => {
    const hasTotalWithTriggers = /total.*trigger|items?\s*\+\s*triggers|including.*trigger/i.test(content);
    assert.ok(hasTotalWithTriggers, 'Summary should include total items with triggers');
  });

  test('summary should show separate counts for ADR and convention triggers', () => {
    const hasADRCount = /ADR\s*trigger/i.test(content);
    const hasConventionCount = /convention\s*trigger/i.test(content);
    assert.ok(hasADRCount && hasConventionCount, 'Summary should show ADR and convention trigger counts');
  });

  test('Step 5 summary should include trigger processing results', () => {
    const step5Section = content.match(/###\s*Step\s*5[\s\S]*?(?=##\s*Queue\s*Item|$)/i);
    assert.ok(step5Section, 'Step 5 section should exist');
    const hasTriggerSummary = /triggers?\s*processed|ADR\s*triggers?\s*processed|convention\s*trigger\s*processed/i.test(step5Section[0]);
    assert.ok(hasTriggerSummary, 'Step 5 should summarize trigger processing');
  });
});

// ============================================================================
// TEST SUITE 11: Edit Action (Phase 2 & 3)
// ============================================================================

describe('11. Edit Action for Triggers', () => {
  test('should document Edit action for modifying trigger details', () => {
    const hasEditAction = /\[Edit\].*trigger|Edit.*trigger|edit.*before.*creat/i.test(content);
    assert.ok(hasEditAction, 'Should document Edit action for triggers');
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
// TEST SUITE 12: Trigger Type Differentiation
// ============================================================================

describe('12. Trigger Type Differentiation', () => {
  test('should distinguish between adr and convention triggerTypes', () => {
    const hasADRType = /"triggerType":\s*"adr"/i.test(content);
    const hasConventionType = /"triggerType":\s*"convention"/i.test(content);
    assert.ok(hasADRType && hasConventionType, 'Should distinguish adr and convention triggerTypes');
  });

  test('ADR triggers should have decision and rationale fields', () => {
    const hasDecision = /decision.*ADR|trigger.*decision/i.test(content);
    const hasRationale = /rationale.*trigger|trigger.*rationale/i.test(content);
    assert.ok(hasDecision && hasRationale, 'ADR triggers should have decision and rationale');
  });

  test('Convention triggers should have pattern and examples fields', () => {
    const hasPattern = /pattern.*convention|convention.*pattern/i.test(content);
    const hasExamples = /examples.*convention|convention.*examples/i.test(content);
    assert.ok(hasPattern || hasExamples, 'Convention triggers should have pattern and examples');
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
