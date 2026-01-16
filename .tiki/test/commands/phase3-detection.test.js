/**
 * TDD Tests for Phase 3: Add auto-fix detection and analysis logic
 * Issue #12: Add auto-fix infrastructure for verification failures
 *
 * These tests verify that execute.md contains:
 * 1. "4f-auto" step identifier for auto-fix attempt section
 * 2. "Auto-Fix Attempt" section header
 * 3. "Classify Error Type" subsection with error classification table
 * 4. "Check Previous Fix Attempts" subsection with attempt count vs maxAttempts logic
 * 5. Strategy escalation logic (direct -> diagnostic-agent)
 * 6. "Check Debug History" subsection referencing debug/index.json
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const EXECUTE_PATH = path.join(__dirname, '../../../.claude/commands/tiki/execute.md');

let executeContent = '';
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
  executeContent = fs.readFileSync(EXECUTE_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read execute.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite: 4f-auto Step Identifier
// ============================================================================

describe('Step 4f-auto: Auto-Fix Attempt Step Exists', () => {
  test('execute.md should have "4f-auto" step identifier', () => {
    const hasStepId = /####\s*4f-auto|###\s*4f-auto|##\s*4f-auto/i.test(executeContent);
    assert.ok(
      hasStepId,
      'execute.md is missing "4f-auto" step identifier'
    );
  });

  test('4f-auto step should appear after TDD verification failed block', () => {
    // Find the TDD Verification Failed section
    const tddVerificationMatch = executeContent.search(/TDD\s*Verification\s*Failed|tests\s*fail.*Report.*failure.*pause/i);
    const autoFixMatch = executeContent.search(/4f-auto/i);

    assert.ok(tddVerificationMatch >= 0, 'TDD Verification Failed section not found');
    assert.ok(autoFixMatch >= 0, '4f-auto step not found');
    assert.ok(
      tddVerificationMatch < autoFixMatch,
      '4f-auto step should come after TDD Verification Failed section'
    );
  });

  test('4f-auto step should appear before step 4g (Create Tests After)', () => {
    const autoFixMatch = executeContent.search(/4f-auto/i);
    const step4gMatch = executeContent.search(/####\s*4g\.\s*Create\s*Tests\s*After/i);

    assert.ok(autoFixMatch >= 0, '4f-auto step not found');
    assert.ok(step4gMatch >= 0, 'Step 4g not found');
    assert.ok(
      autoFixMatch < step4gMatch,
      '4f-auto step should come before step 4g'
    );
  });
});

// ============================================================================
// Test Suite: Auto-Fix Attempt Section Header
// ============================================================================

describe('Auto-Fix Attempt Section Header', () => {
  test('execute.md should have "Auto-Fix Attempt" section header', () => {
    const hasHeader = /Auto[-\s]?Fix\s*Attempt/i.test(executeContent);
    assert.ok(
      hasHeader,
      'execute.md is missing "Auto-Fix Attempt" section header'
    );
  });

  test('Auto-Fix Attempt section should be associated with step 4f-auto', () => {
    // The section header should be near the 4f-auto step identifier
    const match = executeContent.match(/4f-auto[\s\S]{0,100}Auto[-\s]?Fix\s*Attempt|Auto[-\s]?Fix\s*Attempt[\s\S]{0,100}4f-auto/i);
    assert.ok(
      match,
      'Auto-Fix Attempt section should be associated with step 4f-auto'
    );
  });
});

// ============================================================================
// Test Suite: Step 1 - Classify Error Type
// ============================================================================

describe('Step 1: Classify Error Type', () => {
  test('execute.md should have "Classify Error Type" subsection', () => {
    const hasClassifySection = /Classify\s*Error\s*Type/i.test(executeContent);
    assert.ok(
      hasClassifySection,
      'execute.md is missing "Classify Error Type" subsection'
    );
  });

  test('Classify Error Type should be within Auto-Fix Attempt section', () => {
    // Find the Auto-Fix Attempt section and check if Classify Error Type is within it
    const autoFixSection = executeContent.match(/Auto[-\s]?Fix\s*Attempt[\s\S]*?(?=####\s*4g|###\s*Step\s*5|$)/i);
    assert.ok(autoFixSection, 'Auto-Fix Attempt section not found');

    const hasClassifyInSection = /Classify\s*Error\s*Type/i.test(autoFixSection[0]);
    assert.ok(
      hasClassifyInSection,
      'Classify Error Type should be within Auto-Fix Attempt section'
    );
  });

  test('Classify Error Type should mention "Step 1" in auto-fix flow', () => {
    const hasStep1 = /Step\s*1[:\s]*Classify\s*Error\s*Type/i.test(executeContent);
    assert.ok(
      hasStep1,
      'Should mention "Step 1: Classify Error Type" in auto-fix flow'
    );
  });
});

// ============================================================================
// Test Suite: Error Classification Table
// ============================================================================

describe('Error Classification Table', () => {
  test('execute.md should contain error classification table', () => {
    // Look for a markdown table with error patterns
    const hasTable = /\|\s*Error\s*Pattern\s*\||\|\s*Pattern\s*\|.*Error\s*Type/i.test(executeContent);
    assert.ok(
      hasTable,
      'execute.md should contain error classification table with Error Pattern column'
    );
  });

  test('error classification table should include "Property X does not exist" pattern', () => {
    const hasPropertyPattern = /Property\s*.*does\s*not\s*exist|property.*not\s*exist/i.test(executeContent);
    assert.ok(
      hasPropertyPattern,
      'Error classification table should include "Property X does not exist" pattern'
    );
  });

  test('error classification table should include "Cannot find module" pattern', () => {
    const hasModulePattern = /Cannot\s*find\s*module|cannot[-\s]find[-\s]module/i.test(executeContent);
    assert.ok(
      hasModulePattern,
      'Error classification table should include "Cannot find module" pattern'
    );
  });

  test('error classification table should include test failure patterns', () => {
    const hasTestPattern = /test\s*fail|expect.*received|assertion\s*fail/i.test(executeContent);
    assert.ok(
      hasTestPattern,
      'Error classification table should include test failure patterns'
    );
  });

  test('error classification table should include syntax error pattern', () => {
    const hasSyntaxPattern = /syntax\s*error|Unexpected\s*token|SyntaxError/i.test(executeContent);
    assert.ok(
      hasSyntaxPattern,
      'Error classification table should include syntax error pattern'
    );
  });

  test('error classification should map patterns to error types', () => {
    // Look for mapping like: pattern -> type-error, test-failure, etc.
    const hasMapping = /\|\s*.*\|\s*(type[-\s]?error|test[-\s]?failure|syntax[-\s]?error|import[-\s]?error|runtime[-\s]?error)/i.test(executeContent);
    assert.ok(
      hasMapping,
      'Error classification should map patterns to error types (type-error, test-failure, etc.)'
    );
  });
});

// ============================================================================
// Test Suite: Step 2 - Check Previous Fix Attempts
// ============================================================================

describe('Step 2: Check Previous Fix Attempts', () => {
  test('execute.md should have "Check Previous Fix Attempts" subsection', () => {
    const hasCheckSection = /Check\s*Previous\s*Fix\s*Attempts/i.test(executeContent);
    assert.ok(
      hasCheckSection,
      'execute.md is missing "Check Previous Fix Attempts" subsection'
    );
  });

  test('Check Previous Fix Attempts should mention "Step 2" in auto-fix flow', () => {
    const hasStep2 = /Step\s*2[:\s]*Check\s*Previous\s*Fix\s*Attempts/i.test(executeContent);
    assert.ok(
      hasStep2,
      'Should mention "Step 2: Check Previous Fix Attempts" in auto-fix flow'
    );
  });

  test('should document checking fixAttempts array from phase', () => {
    const hasFixAttemptsCheck = /fixAttempts\s*array|phase.*fixAttempts|read.*fixAttempts|check.*fixAttempts/i.test(executeContent);
    assert.ok(
      hasFixAttemptsCheck,
      'Should document checking fixAttempts array from phase'
    );
  });
});

// ============================================================================
// Test Suite: Attempt Count vs maxAttempts Logic
// ============================================================================

describe('Attempt Count vs maxAttempts Logic', () => {
  test('should document comparing attempt count to maxAttempts', () => {
    const hasCompare = /attempt.*count.*maxAttempts|fixAttempts\.length.*maxAttempts|compare.*attempts.*max/i.test(executeContent);
    assert.ok(
      hasCompare,
      'Should document comparing attempt count to maxAttempts'
    );
  });

  test('should document behavior when maxAttempts is reached', () => {
    const hasMaxReached = /maxAttempts\s*(reached|exceeded|limit)|exceed.*max|attempts?\s*exhausted/i.test(executeContent);
    assert.ok(
      hasMaxReached,
      'Should document behavior when maxAttempts is reached'
    );
  });

  test('should abort auto-fix if maxAttempts exceeded', () => {
    const hasAbort = /abort.*auto[-\s]?fix|stop.*auto[-\s]?fix.*max|no\s*more\s*attempts|skip\s*auto[-\s]?fix/i.test(executeContent);
    assert.ok(
      hasAbort,
      'Should document aborting auto-fix if maxAttempts exceeded'
    );
  });

  test('should provide manual intervention options when max attempts reached', () => {
    const hasManualOptions = /manual\s*intervention|heal|review.*options|user\s*intervention/i.test(executeContent);
    assert.ok(
      hasManualOptions,
      'Should provide manual intervention options when max attempts reached'
    );
  });
});

// ============================================================================
// Test Suite: Strategy Escalation Logic
// ============================================================================

describe('Strategy Escalation Logic', () => {
  test('should document strategy escalation from direct to diagnostic-agent', () => {
    const hasEscalation = /direct.*diagnostic[-\s]?agent|escalat.*strategy|strategy.*escalat/i.test(executeContent);
    assert.ok(
      hasEscalation,
      'Should document strategy escalation from direct to diagnostic-agent'
    );
  });

  test('should document "direct" as first strategy to try', () => {
    const hasDirectFirst = /first.*direct|initial.*direct|start.*direct|direct.*first/i.test(executeContent);
    assert.ok(
      hasDirectFirst,
      'Should document "direct" as first strategy to try'
    );
  });

  test('should document when to escalate to diagnostic-agent', () => {
    const hasEscalateCondition = /direct\s*fail.*diagnostic|escalate.*diagnostic|if\s*direct.*fail.*use\s*diagnostic/i.test(executeContent);
    assert.ok(
      hasEscalateCondition,
      'Should document when to escalate to diagnostic-agent'
    );
  });

  test('should explain difference between direct and diagnostic-agent strategies', () => {
    const hasStrategyDiff = /direct.*simple|diagnostic[-\s]?agent.*spawn|diagnostic[-\s]?agent.*Task\s*tool/i.test(executeContent);
    assert.ok(
      hasStrategyDiff,
      'Should explain difference between direct and diagnostic-agent strategies'
    );
  });

  test('strategy selection should consider previous failed strategies', () => {
    const hasStrategyHistory = /previous.*strateg|failed\s*strateg|avoid.*same\s*strategy|escalate.*after.*fail/i.test(executeContent);
    assert.ok(
      hasStrategyHistory,
      'Strategy selection should consider previous failed strategies'
    );
  });
});

// ============================================================================
// Test Suite: Step 3 - Check Debug History
// ============================================================================

describe('Step 3: Check Debug History', () => {
  test('execute.md should have "Check Debug History" subsection in auto-fix flow', () => {
    // Find auto-fix specific debug history check (not the one in Error Handling)
    const autoFixSection = executeContent.match(/Auto[-\s]?Fix\s*Attempt[\s\S]*?(?=####\s*4g|###\s*Step\s*5|$)/i);
    assert.ok(autoFixSection, 'Auto-Fix Attempt section not found');

    const hasCheckDebugHistory = /Check\s*Debug\s*History/i.test(autoFixSection[0]);
    assert.ok(
      hasCheckDebugHistory,
      'Auto-Fix section should have "Check Debug History" subsection'
    );
  });

  test('Check Debug History should mention "Step 3" in auto-fix flow', () => {
    const hasStep3 = /Step\s*3[:\s]*Check\s*Debug\s*History/i.test(executeContent);
    assert.ok(
      hasStep3,
      'Should mention "Step 3: Check Debug History" in auto-fix flow'
    );
  });
});

// ============================================================================
// Test Suite: Debug Index Reference
// ============================================================================

describe('Debug Index Reference in Auto-Fix', () => {
  test('Auto-Fix section should reference debug/index.json', () => {
    const autoFixSection = executeContent.match(/Auto[-\s]?Fix\s*Attempt[\s\S]*?(?=####\s*4g|###\s*Step\s*5|$)/i);
    assert.ok(autoFixSection, 'Auto-Fix Attempt section not found');

    const hasDebugIndex = /debug\/index\.json|\.tiki\/debug\/index/i.test(autoFixSection[0]);
    assert.ok(
      hasDebugIndex,
      'Auto-Fix section should reference debug/index.json'
    );
  });

  test('should document searching debug index by error keywords', () => {
    const hasKeywordSearch = /search.*error.*keyword|error.*message.*keyword|match.*keyword|keyword.*match/i.test(executeContent);
    assert.ok(
      hasKeywordSearch,
      'Should document searching debug index by error keywords'
    );
  });

  test('should document searching debug index by file name', () => {
    const hasFileSearch = /search.*file\s*name|match.*file\s*path|affected\s*file/i.test(executeContent);
    assert.ok(
      hasFileSearch,
      'Should document searching debug index by file name'
    );
  });
});

// ============================================================================
// Test Suite: Filter to Resolved Sessions
// ============================================================================

describe('Filter to Resolved Sessions', () => {
  test('should document filtering debug history to resolved sessions only', () => {
    const hasResolvedFilter = /filter.*resolved|resolved\s*sessions?\s*only|only\s*resolved|status.*resolved/i.test(executeContent);
    assert.ok(
      hasResolvedFilter,
      'Should document filtering debug history to resolved sessions only'
    );
  });

  test('should explain why only resolved sessions are relevant for auto-fix', () => {
    const hasRationale = /resolved.*solution|resolved.*learn|resolved.*apply|past.*fix.*success/i.test(executeContent);
    assert.ok(
      hasRationale,
      'Should explain why only resolved sessions are relevant for auto-fix'
    );
  });

  test('should show how to use matched debug sessions in fix attempts', () => {
    const hasUsage = /use.*debug\s*session|apply.*solution|reference.*past\s*fix|relatedDebugSession/i.test(executeContent);
    assert.ok(
      hasUsage,
      'Should show how to use matched debug sessions in fix attempts'
    );
  });
});

// ============================================================================
// Test Suite: Auto-Fix Flow Order
// ============================================================================

describe('Auto-Fix Flow Order (Step 1 -> Step 2 -> Step 3)', () => {
  test('Step 1 (Classify Error) should come before Step 2 (Check Attempts)', () => {
    const step1Match = executeContent.search(/Step\s*1[:\s]*Classify\s*Error\s*Type/i);
    const step2Match = executeContent.search(/Step\s*2[:\s]*Check\s*Previous\s*Fix\s*Attempts/i);

    assert.ok(step1Match >= 0, 'Step 1: Classify Error Type not found');
    assert.ok(step2Match >= 0, 'Step 2: Check Previous Fix Attempts not found');
    assert.ok(
      step1Match < step2Match,
      'Step 1 should come before Step 2 in auto-fix flow'
    );
  });

  test('Step 2 (Check Attempts) should come before Step 3 (Check Debug History)', () => {
    const step2Match = executeContent.search(/Step\s*2[:\s]*Check\s*Previous\s*Fix\s*Attempts/i);
    const step3Match = executeContent.search(/Step\s*3[:\s]*Check\s*Debug\s*History/i);

    assert.ok(step2Match >= 0, 'Step 2: Check Previous Fix Attempts not found');
    assert.ok(step3Match >= 0, 'Step 3: Check Debug History not found');
    assert.ok(
      step2Match < step3Match,
      'Step 2 should come before Step 3 in auto-fix flow'
    );
  });

  test('all three steps should be within Auto-Fix Attempt section', () => {
    const autoFixSection = executeContent.match(/Auto[-\s]?Fix\s*Attempt[\s\S]*?(?=####\s*4g|###\s*Step\s*5|$)/i);
    assert.ok(autoFixSection, 'Auto-Fix Attempt section not found');

    const sectionContent = autoFixSection[0];
    const hasAllSteps = /Step\s*1.*Classify/i.test(sectionContent) &&
                        /Step\s*2.*Check.*Attempts/i.test(sectionContent) &&
                        /Step\s*3.*Check.*Debug/i.test(sectionContent);
    assert.ok(
      hasAllSteps,
      'All three steps (Classify Error, Check Attempts, Check Debug History) should be within Auto-Fix Attempt section'
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

  console.log(`\nSUMMARY: Created ${testsPassed + testsFailed} failing tests for Phase 3 detection logic`);
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
  console.log(`\nSUMMARY: All ${testsPassed} tests passing for Phase 3 detection logic`);
  process.exit(0);
}
