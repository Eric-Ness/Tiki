/**
 * Comprehensive Tests for Auto-Fix Infrastructure
 * Issue #12: Add auto-fix infrastructure for verification failures
 *
 * This test file verifies that execute.md contains all required auto-fix sections
 * including configuration, schema, steps, strategies, and integration points.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const EXECUTE_PATH = path.join(__dirname, '../../../.claude/commands/tiki/execute.md');
const CONFIG_PATH = path.join(__dirname, '../../../.tiki/config.json');

let executeContent = '';
let configContent = '';
let config = {};
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

// Load the file contents before running tests
try {
  executeContent = fs.readFileSync(EXECUTE_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read execute.md: ${error.message}`);
  process.exit(1);
}

try {
  configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
  config = JSON.parse(configContent);
} catch (error) {
  console.error(`Failed to read or parse config.json: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test 1: Auto-fix config documentation exists
// ============================================================================

describe('Test 1: Auto-fix Configuration Documentation', () => {
  test('execute.md should document autoFix.enabled setting', () => {
    const hasAutoFixEnabled = /autoFix\.enabled/i.test(executeContent);
    assert.ok(
      hasAutoFixEnabled,
      'execute.md should document "autoFix.enabled" setting'
    );
  });

  test('execute.md should document autoFix.maxAttempts setting', () => {
    const hasMaxAttempts = /autoFix\.maxAttempts/i.test(executeContent);
    assert.ok(
      hasMaxAttempts,
      'execute.md should document "autoFix.maxAttempts" setting'
    );
  });

  test('config.json should have autoFix section with enabled and maxAttempts', () => {
    assert.ok(
      config.autoFix &&
      config.autoFix.hasOwnProperty('enabled') &&
      config.autoFix.hasOwnProperty('maxAttempts'),
      'config.json should have autoFix section with enabled and maxAttempts fields'
    );
  });
});

// ============================================================================
// Test 2: Fix attempt schema is documented
// ============================================================================

describe('Test 2: Fix Attempt Schema Documentation', () => {
  test('execute.md should have Fix Attempt Tracking section', () => {
    const hasFixAttemptSection = /##\s*Fix\s*Attempt\s*Tracking/i.test(executeContent);
    assert.ok(
      hasFixAttemptSection,
      'execute.md should have "Fix Attempt Tracking" section'
    );
  });

  test('execute.md should document fixAttempts array schema', () => {
    const hasFixAttempts = /fixAttempts/i.test(executeContent);
    assert.ok(
      hasFixAttempts,
      'execute.md should document "fixAttempts" array'
    );
  });

  test('execute.md should document fix attempt fields table', () => {
    // Check for the fields table with key fields
    const hasFieldsTable = /\|\s*Field\s*\|\s*Type\s*\|/i.test(executeContent) &&
                          /attemptNumber/i.test(executeContent) &&
                          /errorType/i.test(executeContent) &&
                          /verificationResult/i.test(executeContent);
    assert.ok(
      hasFieldsTable,
      'execute.md should document fix attempt fields in a table'
    );
  });
});

// ============================================================================
// Test 3: Step 4f-auto exists
// ============================================================================

describe('Test 3: Step 4f-auto Auto-Fix Attempt Section', () => {
  test('execute.md should have 4f-auto step identifier', () => {
    const has4fAuto = /4f-auto/i.test(executeContent);
    assert.ok(
      has4fAuto,
      'execute.md should have "4f-auto" step identifier'
    );
  });

  test('execute.md should have Auto-Fix Attempt section header', () => {
    const hasAutoFixSection = /Auto-Fix\s*Attempt/i.test(executeContent);
    assert.ok(
      hasAutoFixSection,
      'execute.md should have "Auto-Fix Attempt" section'
    );
  });

  test('Step 4f-auto should be after 4f and contain auto-fix logic', () => {
    const step4fMatch = executeContent.search(/####\s*4f\.\s*Verify\s*Tests\s*Pass/i);
    const step4fAutoMatch = executeContent.search(/####\s*4f-auto/i);

    assert.ok(step4fMatch >= 0, 'Step 4f should exist');
    assert.ok(step4fAutoMatch >= 0, 'Step 4f-auto should exist');
    assert.ok(step4fMatch < step4fAutoMatch, 'Step 4f-auto should come after Step 4f');
  });
});

// ============================================================================
// Test 4: Error classification table exists
// ============================================================================

describe('Test 4: Error Classification Table', () => {
  test('execute.md should have Classify Error Type section', () => {
    const hasClassifyError = /Classify\s*Error\s*Type/i.test(executeContent);
    assert.ok(
      hasClassifyError,
      'execute.md should have "Classify Error Type" section'
    );
  });

  test('execute.md should document type-error pattern', () => {
    const hasTypeErrorPattern = /Property.*does\s*not\s*exist/i.test(executeContent) ||
                                /Property\s*['"]?X['"]?\s*does\s*not\s*exist/i.test(executeContent);
    assert.ok(
      hasTypeErrorPattern,
      'execute.md should document "Property X does not exist" pattern for type-error'
    );
  });

  test('execute.md should have error pattern to type mapping table', () => {
    const hasErrorTable = /\|\s*Error\s*Pattern\s*\|\s*Error\s*Type\s*\|/i.test(executeContent);
    assert.ok(
      hasErrorTable,
      'execute.md should have error pattern to error type mapping table'
    );
  });
});

// ============================================================================
// Test 5: Fix strategies documented
// ============================================================================

describe('Test 5: Fix Strategies Documentation', () => {
  test('execute.md should document Strategy: Direct Fix', () => {
    const hasDirectFix = /Strategy:\s*Direct\s*Fix/i.test(executeContent);
    assert.ok(
      hasDirectFix,
      'execute.md should document "Strategy: Direct Fix"'
    );
  });

  test('execute.md should document Strategy: Diagnostic Agent', () => {
    const hasDiagnosticAgent = /Strategy:\s*Diagnostic\s*Agent/i.test(executeContent);
    assert.ok(
      hasDiagnosticAgent,
      'execute.md should document "Strategy: Diagnostic Agent"'
    );
  });

  test('execute.md should explain strategy escalation', () => {
    const hasEscalation = /escalat/i.test(executeContent) &&
                         /direct/i.test(executeContent) &&
                         /diagnostic/i.test(executeContent);
    assert.ok(
      hasEscalation,
      'execute.md should explain strategy escalation from direct to diagnostic-agent'
    );
  });
});

// ============================================================================
// Test 6: Fix agent prompt template exists
// ============================================================================

describe('Test 6: Fix Agent Prompt Template', () => {
  test('execute.md should have AUTOFIX_RESULT marker', () => {
    const hasAutofixResult = /AUTOFIX_RESULT/i.test(executeContent);
    assert.ok(
      hasAutofixResult,
      'execute.md should have "AUTOFIX_RESULT" marker in prompt template'
    );
  });

  test('execute.md should have AUTOFIX_ACTION marker', () => {
    const hasAutofixAction = /AUTOFIX_ACTION/i.test(executeContent);
    assert.ok(
      hasAutofixAction,
      'execute.md should have "AUTOFIX_ACTION" marker in prompt template'
    );
  });

  test('execute.md should have Diagnostic Agent Prompt Template', () => {
    const hasPromptTemplate = /Diagnostic\s*Agent\s*Prompt\s*Template/i.test(executeContent);
    assert.ok(
      hasPromptTemplate,
      'execute.md should have "Diagnostic Agent Prompt Template" section'
    );
  });
});

// ============================================================================
// Test 7: Auto-fix exhausted handling exists
// ============================================================================

describe('Test 7: Auto-Fix Exhausted Handling', () => {
  test('execute.md should document Auto-Fix Exhausted path', () => {
    const hasExhausted = /Auto-Fix\s*Exhausted/i.test(executeContent);
    assert.ok(
      hasExhausted,
      'execute.md should document "Auto-Fix Exhausted" path'
    );
  });

  test('execute.md should reference /tiki:heal as fallback', () => {
    const hasHealFallback = /\/tiki:heal/i.test(executeContent);
    assert.ok(
      hasHealFallback,
      'execute.md should reference "/tiki:heal" as fallback option'
    );
  });

  test('execute.md should document maxAttempts limit handling', () => {
    const hasMaxAttemptsHandling = /maxAttempts\s*(reached|limit|exhausted)/i.test(executeContent) ||
                                   /attemptCount\s*>=\s*maxAttempts/i.test(executeContent);
    assert.ok(
      hasMaxAttemptsHandling,
      'execute.md should document what happens when maxAttempts is reached'
    );
  });
});

// ============================================================================
// Test 8: Integration points modified
// ============================================================================

describe('Test 8: Integration Points for Auto-Fix', () => {
  test('execute.md should check autoFix.enabled at TDD verification failure', () => {
    // Look for autoFix.enabled check in context of verification/test failure
    const step4fSection = executeContent.match(/####\s*4f\.\s*Verify\s*Tests\s*Pass[\s\S]*?(?=####|###|$)/i);
    assert.ok(step4fSection, 'Could not find Step 4f section');

    const hasAutoFixCheck = /autoFix\.enabled/i.test(step4fSection[0]);
    assert.ok(
      hasAutoFixCheck,
      'Step 4f should check autoFix.enabled on verification failure'
    );
  });

  test('execute.md should check autoFix.enabled at phase failure handling', () => {
    // Look for autoFix.enabled check in error handling section
    const errorSection = executeContent.match(/###\s*Phase\s*Failure[\s\S]*?(?=###|##\s*[^#]|$)/i);
    assert.ok(errorSection, 'Could not find Phase Failure section');

    const hasAutoFixCheck = /auto-fix|autoFix/i.test(errorSection[0]);
    assert.ok(
      hasAutoFixCheck,
      'Phase Failure section should reference auto-fix handling'
    );
  });

  test('execute.md should have conditional flow to 4f-auto', () => {
    // Check that there's a reference to proceed to 4f-auto when autoFix is enabled
    const hasConditionalFlow = /Proceed\s*to\s*Step\s*4f-auto|proceed\s*to.*4f-auto/i.test(executeContent) ||
                               /If.*autoFix\.enabled.*true.*4f-auto/i.test(executeContent);
    assert.ok(
      hasConditionalFlow,
      'execute.md should have conditional flow to Step 4f-auto when auto-fix is enabled'
    );
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
