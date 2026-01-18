/**
 * TDD Tests for Phase 5: Integrate auto-fix into execute.md flow
 * Issue #12: Add auto-fix infrastructure for verification failures
 *
 * These tests verify that execute.md contains the required sections for
 * auto-fix integration at verification failure points and exhausted handling.
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
// Test Suite: TDD Verification Failure Integration
// ============================================================================

describe('TDD Verification Failure Integration', () => {
  test('Step 4f includes conditional check for auto-fix before showing failure', () => {
    // Step 4f handles TDD verification - should check auto-fix before reporting failure
    const step4fSection = content.match(/####\s*4f\.?\s*Verify\s*Tests\s*Pass[\s\S]*?(?=####\s*4f-auto|###|##\s*[^#]|$)/i);
    assert.ok(step4fSection, 'Could not find Step 4f section');

    // Should have "If tests fail" with auto-fix check integrated
    const hasIntegratedCheck = /if\s*tests\s*fail[\s\S]*?auto[-\s]?fix|tests\s*fail[\s\S]*?check.*autoFix/i.test(step4fSection[0]);
    assert.ok(hasIntegratedCheck, 'Step 4f "If tests fail" should include auto-fix check before reporting failure');
  });

  test('Step 4f documents checking autoFix.enabled before pausing execution', () => {
    // The failure path in 4f should check autoFix.enabled
    const step4fSection = content.match(/####\s*4f\.?\s*Verify\s*Tests\s*Pass[\s\S]*?(?=####\s*4f-auto|###|##\s*[^#]|$)/i);
    assert.ok(step4fSection, 'Could not find Step 4f section');

    const hasEnabledCheck = /check.*autoFix\.enabled|if.*autoFix\.enabled|autoFix\.enabled.*true/i.test(step4fSection[0]);
    assert.ok(hasEnabledCheck, 'Step 4f should document checking autoFix.enabled before pausing');
  });

  test('Step 4f documents proceeding to Step 4f-auto when auto-fix enabled', () => {
    // TDD failure should explicitly reference 4f-auto flow when enabled
    const step4fSection = content.match(/####\s*4f\.?\s*Verify\s*Tests\s*Pass[\s\S]*?(?=####\s*4f-auto|###|##\s*[^#]|$)/i);
    assert.ok(step4fSection, 'Could not find Step 4f section');

    const hasProceedToAuto = /proceed\s*to\s*(step\s*)?4f-auto|continue\s*to\s*(step\s*)?4f-auto|go\s*to\s*(step\s*)?4f-auto|→\s*4f-auto/i.test(step4fSection[0]);
    assert.ok(hasProceedToAuto, 'Step 4f should document proceeding to Step 4f-auto when auto-fix is enabled');
  });

  test('Step 4f documents prompting user when autoFix.enabled is "prompt"', () => {
    // When autoFix.enabled is "prompt", should ask user in 4f
    const step4fSection = content.match(/####\s*4f\.?\s*Verify\s*Tests\s*Pass[\s\S]*?(?=####\s*4f-auto|###|##\s*[^#]|$)/i);
    assert.ok(step4fSection, 'Could not find Step 4f section');

    const hasPromptHandling = /"prompt".*ask|prompt.*user|if.*prompt.*mode/i.test(step4fSection[0]);
    assert.ok(hasPromptHandling, 'Step 4f should document asking user when autoFix.enabled is "prompt"');
  });
});

// ============================================================================
// Test Suite: Phase Failure Integration
// ============================================================================

describe('Phase Failure Integration', () => {
  test('Error Handling Phase Failure section integrates auto-fix check', () => {
    // Error Handling -> Phase Failure section should mention auto-fix
    const phaseFailureSection = content.match(/###\s*Phase\s*Failure[\s\S]*?(?=###\s*[A-Z]|##\s*[A-Z]|$)/i);
    assert.ok(phaseFailureSection, 'Could not find Phase Failure section');

    const hasAutoFixIntegration = /auto[-\s]?fix|check.*autoFix|if.*autoFix/i.test(phaseFailureSection[0]);
    assert.ok(hasAutoFixIntegration, 'Phase Failure section should integrate auto-fix check');
  });

  test('Phase Failure documents "If auto-fix enabled: Attempt auto-fix" step', () => {
    // Phase failure flow should include conditional auto-fix attempt step
    const phaseFailureSection = content.match(/###\s*Phase\s*Failure[\s\S]*?(?=###\s*[A-Z]|##\s*[A-Z]|$)/i);
    assert.ok(phaseFailureSection, 'Could not find Phase Failure section');

    const hasConditionalStep = /if\s*auto[-\s]?fix.*enabled|check.*auto[-\s]?fix|attempt\s*auto[-\s]?fix/i.test(phaseFailureSection[0]);
    assert.ok(hasConditionalStep, 'Phase Failure should document conditional auto-fix attempt step');
  });

  test('Phase Failure documents continuing execution after successful auto-fix', () => {
    // Phase failure section should document the success path after auto-fix
    const phaseFailureSection = content.match(/###\s*Phase\s*Failure[\s\S]*?(?=###\s*[A-Z]|##\s*[A-Z]|$)/i);
    assert.ok(phaseFailureSection, 'Could not find Phase Failure section');

    const hasContinueAfterFix = /continue.*after.*auto[-\s]?fix|auto[-\s]?fix.*success.*continue|resume.*execution/i.test(phaseFailureSection[0]);
    assert.ok(hasContinueAfterFix, 'Phase Failure should document continuing execution after successful auto-fix');
  });
});

// ============================================================================
// Test Suite: Auto-Fix Exhausted Output
// ============================================================================

describe('Auto-Fix Exhausted Output', () => {
  test('execute.md has "Auto-Fix Exhausted" output section', () => {
    // Allow optional emoji before Auto-Fix
    const hasExhaustedSection = /##\s*.*Auto[-\s]?Fix\s*Exhausted|Auto[-\s]?Fix\s*Exhausted\s*\n/i.test(content);
    assert.ok(hasExhaustedSection, 'Should have "Auto-Fix Exhausted" section');
  });

  test('exhausted output shows attempt history table with Strategy and Result columns', () => {
    // Should show a table with attempt history - look for table with Strategy column
    // Allow optional emoji before Auto-Fix
    const exhaustedSection = content.match(/##\s*.*Auto[-\s]?Fix\s*Exhausted[\s\S]*?```/i);
    assert.ok(exhaustedSection, 'Could not find Auto-Fix Exhausted section');

    // Table should have columns for #/attempt, Strategy, and Result
    const hasStrategyColumn = /\|\s*Strategy\s*\|/i.test(exhaustedSection[0]);
    const hasResultColumn = /\|\s*Result\s*\|/i.test(exhaustedSection[0]);
    assert.ok(hasStrategyColumn && hasResultColumn, 'Exhausted output should show attempt history table with Strategy and Result columns');
  });

  test('exhausted output shows error type in attempt table', () => {
    // When exhausted, should show the error type in the table
    // Allow optional emoji before Auto-Fix
    const exhaustedSection = content.match(/##\s*.*Auto[-\s]?Fix\s*Exhausted[\s\S]*?```/i);
    assert.ok(exhaustedSection, 'Could not find Auto-Fix Exhausted section');

    const hasErrorColumn = /\|\s*Error\s*\|/i.test(exhaustedSection[0]);
    assert.ok(hasErrorColumn, 'Exhausted output should show Error column in attempt table');
  });

  test('exhausted output lists /tiki:execute --from option for manual retry', () => {
    // Should list manual retry option with --from flag
    // Allow optional emoji before Auto-Fix
    const exhaustedSection = content.match(/##\s*.*Auto[-\s]?Fix\s*Exhausted[\s\S]*?```/i);
    assert.ok(exhaustedSection, 'Could not find Auto-Fix Exhausted section');

    // Accept both literal --from and {number} --from patterns
    const hasExecuteFrom = /\/tiki:execute.*--from/i.test(exhaustedSection[0]);
    assert.ok(hasExecuteFrom, 'Exhausted output should list /tiki:execute --from option');
  });

  test('exhausted output lists /tiki:heal option for diagnostic help', () => {
    // Should list heal as diagnostic help option
    // Allow optional emoji before Auto-Fix
    const exhaustedSection = content.match(/##\s*.*Auto[-\s]?Fix\s*Exhausted[\s\S]*?```/i);
    assert.ok(exhaustedSection, 'Could not find Auto-Fix Exhausted section');

    const hasHeal = /\/tiki:heal/i.test(exhaustedSection[0]);
    assert.ok(hasHeal, 'Exhausted output should list /tiki:heal option');
  });

  test('exhausted output lists /tiki:skip-phase option', () => {
    // Should list skip-phase as an option
    // Allow optional emoji before Auto-Fix
    const exhaustedSection = content.match(/##\s*.*Auto[-\s]?Fix\s*Exhausted[\s\S]*?```/i);
    assert.ok(exhaustedSection, 'Could not find Auto-Fix Exhausted section');

    const hasSkipPhase = /\/tiki:skip-phase/i.test(exhaustedSection[0]);
    assert.ok(hasSkipPhase, 'Exhausted output should list /tiki:skip-phase option');
  });
});

// ============================================================================
// Test Suite: Progress Output During Auto-Fix
// ============================================================================

describe('Progress Output During Auto-Fix', () => {
  test('execute.md has progress output showing auto-fix attempt status', () => {
    // Should document progress output during auto-fix - look for retry log text
    const hasProgressOutput = /Auto[-\s]?fix\s*attempt\s*\{?N?\}?|Retrying.*attempt|attempt.*of.*maxAttempts/i.test(content);
    assert.ok(hasProgressOutput, 'Should have progress output documentation for auto-fix attempts');
  });

  test('progress output shows attempt number / maxAttempts format', () => {
    // Should show "attempt N/M" or "attempt {N}/{maxAttempts}" format
    const hasAttemptCounter = /attempt\s*\{?\s*N\+?1?\s*\}?\s*\/\s*\{?\s*maxAttempts\s*\}?|\d+\/\d+/i.test(content);
    assert.ok(hasAttemptCounter, 'Progress output should show attempt number / maxAttempts format');
  });

  test('progress output shows strategy being used', () => {
    // Should indicate which strategy (direct or diagnostic-agent) is being used
    const hasStrategyOutput = /Escalating\s*to\s*\{?\s*next_strategy\s*\}?|strategy:\s*\{?\s*strategy\s*\}?/i.test(content);
    assert.ok(hasStrategyOutput, 'Progress output should show strategy being used');
  });

  test('Step 6 documents running verification command after fix', () => {
    // Step 6: Verify Fix should show running verification command
    const step6Section = content.match(/#{5}\s*Step\s*6[:\s]*Verify\s*Fix[\s\S]*?(?=#{5}|#{4}|#{3}|##\s*[A-Z]|$)/i);
    assert.ok(step6Section, 'Could not find Step 6: Verify Fix section');

    const hasVerificationCommand = /run.*verification|verification\s*command/i.test(step6Section[0]);
    assert.ok(hasVerificationCommand, 'Step 6 should show running verification command');
  });
});

// ============================================================================
// Test Suite: /tiki:heal as Fallback
// ============================================================================

describe('/tiki:heal as Fallback', () => {
  test('exhausted output includes /tiki:heal with diagnostic help description', () => {
    // /tiki:heal should be explicitly mentioned as diagnostic help option
    // Allow optional emoji before Auto-Fix
    const exhaustedSection = content.match(/##\s*.*Auto[-\s]?Fix\s*Exhausted[\s\S]*?```/i);
    assert.ok(exhaustedSection, 'Could not find Auto-Fix Exhausted section');

    // Look for heal with diagnostic context (either "diagnostic help" label or just the command with phase ref)
    const hasHealWithDescription = /diagnostic\s*help.*\/tiki:heal|\/tiki:heal.*\{?N\}?|Get\s*diagnostic\s*help.*\/tiki:heal/i.test(exhaustedSection[0]);
    assert.ok(hasHealWithDescription, 'Exhausted output should include /tiki:heal with diagnostic help description');
  });

  test('documents /tiki:heal in Manual Intervention Required section', () => {
    // Heal should be in the Manual Intervention section
    const hasHealInManualIntervention = /Manual\s*Intervention\s*Required[\s\S]*?\/tiki:heal/i.test(content);
    assert.ok(hasHealInManualIntervention, 'Should document /tiki:heal in Manual Intervention Required section');
  });
});

// ============================================================================
// Test Suite: Integration Flow Completeness
// ============================================================================

describe('Integration Flow Completeness', () => {
  test('Step 4f documents flow to auto-fix on test failure when enabled', () => {
    // Step 4f should document that test failure can flow to auto-fix
    const step4fSection = content.match(/####\s*4f\.?\s*Verify\s*Tests[\s\S]*?(?=####\s*4f-auto|###|##\s*[^#]|$)/i);
    assert.ok(step4fSection, 'Could not find Step 4f section');

    // Check for mention of auto-fix flow or reference to 4f-auto
    const hasAutoFixFlow = /auto[-\s]?fix|4f-auto|if.*enabled.*proceed/i.test(step4fSection[0]);
    assert.ok(hasAutoFixFlow, 'Step 4f should document flow to auto-fix when enabled on test failure');
  });

  test('Step 7 success path documents continuing to step 4h', () => {
    // Step 7: Handle Result success path should mention continuing to 4h
    // Match from Step 7 header until the next #### (4-hash section) or ##### Example
    const step7Section = content.match(/#{5}\s*Step\s*7[:\s]*Handle\s*Result[\s\S]*?(?=#{5}\s*Example|#{4}\s*4|$)/i);
    assert.ok(step7Section, 'Could not find Step 7: Handle Result section');

    const hasContinueTo4h = /continue\s*to\s*(step\s*)?4h|step\s*4h/i.test(step7Section[0]);
    assert.ok(hasContinueTo4h, 'Step 7 success path should continue to step 4h');
  });

  test('Step 7 failure path with retries documents loop back for retry', () => {
    // Step 7 should document looping back when attempts remain
    const step7Section = content.match(/#{5}\s*Step\s*7[:\s]*Handle\s*Result[\s\S]*?(?=#{4}|#{3}|##\s*[A-Z]|$)/i);
    assert.ok(step7Section, 'Could not find Step 7: Handle Result section');

    const hasRetryLoop = /loop\s*back|retry|Step\s*2/i.test(step7Section[0]);
    assert.ok(hasRetryLoop, 'Step 7 failure with retries should loop back for retry');
  });

  test('Step 7 exhausted path documents pausing for manual intervention', () => {
    // Step 7 exhausted path should pause and show manual intervention options
    // Match from Step 7 header until the next #### (4-hash section) or ##### Example
    const step7Section = content.match(/#{5}\s*Step\s*7[:\s]*Handle\s*Result[\s\S]*?(?=#{5}\s*Example|#{4}\s*4|$)/i);
    assert.ok(step7Section, 'Could not find Step 7: Handle Result section');

    const hasManualIntervention = /Manual\s*Intervention|manual\s*intervention/i.test(step7Section[0]);
    assert.ok(hasManualIntervention, 'Step 7 exhausted path should pause for manual intervention');
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
