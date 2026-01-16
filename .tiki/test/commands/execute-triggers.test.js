/**
 * Tests for Phase 3: Add tests for trigger detection
 * Issue #14: Detect ADR and Update-Claude triggers during phase execution
 *
 * These tests verify that execute.md contains the required sections for
 * ADR and convention trigger detection during phase execution.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const EXECUTE_PATH = path.join(__dirname, '../../../.claude/commands/tiki/execute.md');

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
  content = fs.readFileSync(EXECUTE_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read execute.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite: ADR_TRIGGER Instruction Presence
// ============================================================================

describe('ADR_TRIGGER Instruction Presence', () => {
  test('should contain ADR_TRIGGER instruction text', () => {
    const hasADRTrigger = /ADR_TRIGGER:/i.test(content);
    assert.ok(hasADRTrigger, 'Missing "ADR_TRIGGER:" instruction in execute.md');
  });

  test('ADR_TRIGGER should include JSON schema example', () => {
    const hasADRSchema = /ADR_TRIGGER:\s*\{.*triggerType.*decision.*rationale/is.test(content);
    assert.ok(hasADRSchema, 'ADR_TRIGGER should include JSON schema with triggerType, decision, rationale');
  });

  test('ADR_TRIGGER should list trigger types (architecture, technology, library, pattern)', () => {
    const hasADRTypes = /ADR_TRIGGER[\s\S]*?(architecture|technology|library|pattern)/i.test(content);
    assert.ok(hasADRTypes, 'ADR_TRIGGER should list valid trigger types');
  });

  test('should explain when to emit ADR triggers', () => {
    const hasADRGuidance = /Emit ADR trigger/i.test(content);
    assert.ok(hasADRGuidance, 'Should explain when to emit ADR triggers');
  });
});

// ============================================================================
// Test Suite: CONVENTION_TRIGGER Instruction Presence
// ============================================================================

describe('CONVENTION_TRIGGER Instruction Presence', () => {
  test('should contain CONVENTION_TRIGGER instruction text', () => {
    const hasConventionTrigger = /CONVENTION_TRIGGER:/i.test(content);
    assert.ok(hasConventionTrigger, 'Missing "CONVENTION_TRIGGER:" instruction in execute.md');
  });

  test('CONVENTION_TRIGGER should include JSON schema example', () => {
    const hasConventionSchema = /CONVENTION_TRIGGER:\s*\{.*triggerType.*pattern.*rationale/is.test(content);
    assert.ok(hasConventionSchema, 'CONVENTION_TRIGGER should include JSON schema with triggerType, pattern, rationale');
  });

  test('CONVENTION_TRIGGER should list trigger types (naming, structure, pattern, practice)', () => {
    const hasConventionTypes = /CONVENTION_TRIGGER[\s\S]*?(naming|structure|pattern|practice)/i.test(content);
    assert.ok(hasConventionTypes, 'CONVENTION_TRIGGER should list valid trigger types');
  });

  test('should explain when to emit CONVENTION triggers', () => {
    const hasConventionGuidance = /Emit CONVENTION trigger/i.test(content);
    assert.ok(hasConventionGuidance, 'Should explain when to emit CONVENTION triggers');
  });
});

// ============================================================================
// Test Suite: Step 4h Trigger Extraction
// ============================================================================

describe('Step 4h: Trigger Extraction in Process Sub-Agent Response', () => {
  test('step 4h should mention extracting trigger markers', () => {
    // Find step 4h section
    const step4hSection = content.match(/####\s*4h\.?\s*Process\s*Sub-Agent\s*Response[\s\S]*?(?=####|###|##\s*[^#]|$)/i);
    assert.ok(step4hSection, 'Could not find Step 4h section');

    const hasTriggerExtraction = /extract\s*trigger|trigger\s*marker/i.test(step4hSection[0]);
    assert.ok(hasTriggerExtraction, 'Step 4h should mention extracting trigger markers');
  });

  test('step 4h should mention ADR_TRIGGER extraction', () => {
    const step4hSection = content.match(/####\s*4h\.?\s*Process\s*Sub-Agent\s*Response[\s\S]*?(?=####|###|##\s*[^#]|$)/i);
    assert.ok(step4hSection, 'Could not find Step 4h section');

    const hasADRExtraction = /ADR_TRIGGER/i.test(step4hSection[0]);
    assert.ok(hasADRExtraction, 'Step 4h should mention ADR_TRIGGER extraction');
  });

  test('step 4h should mention CONVENTION_TRIGGER extraction', () => {
    const step4hSection = content.match(/####\s*4h\.?\s*Process\s*Sub-Agent\s*Response[\s\S]*?(?=####|###|##\s*[^#]|$)/i);
    assert.ok(step4hSection, 'Could not find Step 4h section');

    const hasConventionExtraction = /CONVENTION_TRIGGER/i.test(step4hSection[0]);
    assert.ok(hasConventionExtraction, 'Step 4h should mention CONVENTION_TRIGGER extraction');
  });

  test('step 4h should mention adding triggers to pending', () => {
    const step4hSection = content.match(/####\s*4h\.?\s*Process\s*Sub-Agent\s*Response[\s\S]*?(?=####|###|##\s*[^#]|$)/i);
    assert.ok(step4hSection, 'Could not find Step 4h section');

    const hasTriggerStorage = /trigger.*pending|pending.*trigger|\.tiki\/triggers/i.test(step4hSection[0]);
    assert.ok(hasTriggerStorage, 'Step 4h should mention adding triggers to pending storage');
  });
});

// ============================================================================
// Test Suite: Trigger Storage Reference (.tiki/triggers/)
// ============================================================================

describe('Trigger Storage Reference (.tiki/triggers/)', () => {
  test('should reference .tiki/triggers/ directory', () => {
    const hasTriggerDir = /\.tiki\/triggers\//i.test(content);
    assert.ok(hasTriggerDir, 'Should reference .tiki/triggers/ directory');
  });

  test('should reference pending.json for trigger storage', () => {
    const hasPendingJson = /\.tiki\/triggers\/pending\.json/i.test(content);
    assert.ok(hasPendingJson, 'Should reference .tiki/triggers/pending.json for trigger storage');
  });

  test('should document trigger schema', () => {
    const hasTriggerSchema = /Trigger\s*Schema|### Trigger Schema/i.test(content);
    assert.ok(hasTriggerSchema, 'Should document trigger schema');
  });

  test('trigger schema should include required fields', () => {
    // Check for presence of required schema fields
    const hasIdField = /"id".*trg-/i.test(content);
    const hasTriggerTypeField = /"triggerType"/i.test(content);
    const hasCategoryField = /"category".*adr.*convention/is.test(content);
    const hasSourceField = /"source".*issue.*phase/is.test(content);

    assert.ok(hasIdField, 'Trigger schema should include id field with trg- format');
    assert.ok(hasTriggerTypeField, 'Trigger schema should include triggerType field');
    assert.ok(hasCategoryField, 'Trigger schema should include category field (adr/convention)');
    assert.ok(hasSourceField, 'Trigger schema should include source field with issue and phase');
  });
});

// ============================================================================
// Test Suite: Trigger Detection Section in Sub-Agent Prompt
// ============================================================================

describe('Trigger Detection Section in Sub-Agent Prompt', () => {
  test('should have Trigger Detection section in sub-agent prompt template', () => {
    const hasTriggerDetectionSection = /##\s*Trigger\s*Detection/i.test(content);
    assert.ok(hasTriggerDetectionSection, 'Should have "## Trigger Detection" section in sub-agent prompt');
  });

  test('Trigger Detection section should appear in sub-agent prompt template', () => {
    // Find the Sub-Agent Prompt Template section - it contains a ```text code block
    // that includes the Trigger Detection section within it
    const promptTemplateSection = content.match(/##\s*Sub-Agent\s*Prompt\s*Template[\s\S]*?```text[\s\S]*?```/i);
    assert.ok(promptTemplateSection, 'Could not find Sub-Agent Prompt Template section with text block');

    const hasTriggerInPrompt = /##\s*Trigger\s*Detection/i.test(promptTemplateSection[0]);
    assert.ok(hasTriggerInPrompt, 'Trigger Detection should be within Sub-Agent Prompt Template text block');
  });

  test('should include confidence levels documentation', () => {
    const hasConfidenceLevels = /Confidence\s*Levels|confidence.*high.*medium.*low/is.test(content);
    assert.ok(hasConfidenceLevels, 'Should include confidence levels documentation');
  });
});

// ============================================================================
// Test Suite: Trigger Items Section
// ============================================================================

describe('Trigger Items Section', () => {
  test('should have Trigger Items section documenting storage format', () => {
    const hasTriggerItemsSection = /##\s*Trigger\s*Items/i.test(content);
    assert.ok(hasTriggerItemsSection, 'Should have "## Trigger Items" section');
  });

  test('should show trigger JSON example with all required fields', () => {
    const hasTriggersArray = /"triggers"\s*:\s*\[/i.test(content);
    assert.ok(hasTriggersArray, 'Should show triggers array in JSON example');
  });

  test('should document Trigger ID Generation', () => {
    const hasTriggerIdSection = /Trigger\s*ID\s*Generation|trg-NNN/i.test(content);
    assert.ok(hasTriggerIdSection, 'Should document Trigger ID Generation with trg-NNN format');
  });

  test('should document Processing Triggers workflow', () => {
    const hasProcessingSection = /###\s*Processing\s*Triggers/i.test(content);
    assert.ok(hasProcessingSection, 'Should document Processing Triggers workflow');
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
