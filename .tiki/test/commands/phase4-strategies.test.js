/**
 * TDD Tests for Phase 4: Add fix execution strategies and verification
 * Issue #12: Add auto-fix infrastructure for verification failures
 *
 * These tests verify that execute.md contains:
 * 1. "Strategy: Direct Fix" section with specific patterns
 * 2. "Strategy: Diagnostic Agent" section with Task tool prompt template
 * 3. Step 5: Record Fix Attempt
 * 4. Step 6: Verify Fix with command table
 * 5. Step 7: Handle Result with success/failure paths
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
// Test Suite 1: Strategy: Direct Fix Section
// ============================================================================

describe('Strategy: Direct Fix Section', () => {
  test('execute.md should have "Strategy: Direct Fix" section', () => {
    const hasSection = /Strategy:\s*Direct\s*Fix|##### Step 4.*Direct Fix/i.test(executeContent);
    assert.ok(
      hasSection,
      'execute.md is missing "Strategy: Direct Fix" section'
    );
  });

  test('Direct Fix section should be within Auto-Fix Attempt section', () => {
    const autoFixSection = executeContent.match(/4f-auto[\s\S]*?(?=####\s*4g|(?<![#])###\s*Step\s*5\s*:|$)/i);
    assert.ok(autoFixSection, 'Auto-Fix Attempt section not found');

    const hasDirectFix = /Strategy:\s*Direct\s*Fix|Step\s*4[:\s].*Direct/i.test(autoFixSection[0]);
    assert.ok(
      hasDirectFix,
      'Direct Fix strategy should be within Auto-Fix Attempt section'
    );
  });
});

// ============================================================================
// Test Suite 2: Direct Fix Patterns for TypeScript Errors
// ============================================================================

describe('Direct Fix Patterns for TypeScript Errors', () => {
  test('Direct Fix section should document fix patterns for type errors', () => {
    // Must be in a "Direct Fix" section specifically
    const directFixSection = executeContent.match(/Strategy:\s*Direct\s*Fix[\s\S]*?(?=Strategy:\s*Diagnostic|##### Step 5|$)/i);
    assert.ok(directFixSection, 'Strategy: Direct Fix section not found');

    const hasTypeErrorFix = /type[-\s]?error|add\s*property.*type|type\s*assertion/i.test(directFixSection[0]);
    assert.ok(
      hasTypeErrorFix,
      'Direct Fix section should document patterns for fixing type errors'
    );
  });

  test('Direct Fix section should document fix for "Property does not exist" errors', () => {
    const directFixSection = executeContent.match(/Strategy:\s*Direct\s*Fix[\s\S]*?(?=Strategy:\s*Diagnostic|##### Step 5|$)/i);
    assert.ok(directFixSection, 'Strategy: Direct Fix section not found');

    const hasPropertyFix = /property.*add|add.*interface|extend.*type/i.test(directFixSection[0]);
    assert.ok(
      hasPropertyFix,
      'Direct Fix section should document fix for "Property does not exist" errors'
    );
  });

  test('Direct Fix section should document fix for import errors', () => {
    const directFixSection = executeContent.match(/Strategy:\s*Direct\s*Fix[\s\S]*?(?=Strategy:\s*Diagnostic|##### Step 5|$)/i);
    assert.ok(directFixSection, 'Strategy: Direct Fix section not found');

    const hasImportFix = /import.*fix|install.*package|fix.*path/i.test(directFixSection[0]);
    assert.ok(
      hasImportFix,
      'Direct Fix section should document fix for import errors'
    );
  });
});

// ============================================================================
// Test Suite 3: Direct Fix Patterns for Test Errors
// ============================================================================

describe('Direct Fix Patterns for Test Errors', () => {
  test('Direct Fix section should document fix patterns for test failures', () => {
    const directFixSection = executeContent.match(/Strategy:\s*Direct\s*Fix[\s\S]*?(?=Strategy:\s*Diagnostic|##### Step 5|$)/i);
    assert.ok(directFixSection, 'Strategy: Direct Fix section not found');

    const hasTestFix = /test[-\s]?failure|implementation\s*logic|expected.*actual/i.test(directFixSection[0]);
    assert.ok(
      hasTestFix,
      'Direct Fix section should document patterns for fixing test failures'
    );
  });

  test('Direct Fix section should document fix for assertion failures', () => {
    const directFixSection = executeContent.match(/Strategy:\s*Direct\s*Fix[\s\S]*?(?=Strategy:\s*Diagnostic|##### Step 5|$)/i);
    assert.ok(directFixSection, 'Strategy: Direct Fix section not found');

    const hasAssertionFix = /assertion|match.*expected|return\s*value/i.test(directFixSection[0]);
    assert.ok(
      hasAssertionFix,
      'Direct Fix section should document fix for assertion failures'
    );
  });
});

// ============================================================================
// Test Suite 4: Strategy: Diagnostic Agent Section
// ============================================================================

describe('Strategy: Diagnostic Agent Section', () => {
  test('execute.md should have "Strategy: Diagnostic Agent" section', () => {
    const hasSection = /Strategy:\s*Diagnostic[-\s]?Agent|##### Step 4.*Diagnostic/i.test(executeContent);
    assert.ok(
      hasSection,
      'execute.md is missing "Strategy: Diagnostic Agent" section'
    );
  });

  test('Diagnostic Agent section should be within Auto-Fix Attempt section', () => {
    const autoFixSection = executeContent.match(/4f-auto[\s\S]*?(?=####\s*4g|(?<![#])###\s*Step\s*5\s*:|$)/i);
    assert.ok(autoFixSection, 'Auto-Fix Attempt section not found');

    const hasDiagnosticAgent = /Strategy:\s*Diagnostic[-\s]?Agent|diagnostic[-\s]?agent\s*strategy/i.test(autoFixSection[0]);
    assert.ok(
      hasDiagnosticAgent,
      'Diagnostic Agent strategy should be within Auto-Fix Attempt section'
    );
  });
});

// ============================================================================
// Test Suite 5: Task Tool Call Format for Diagnostic Agent
// ============================================================================

describe('Task Tool Call Format for Diagnostic Agent', () => {
  test('Diagnostic Agent section should show Task tool call format', () => {
    const diagnosticSection = executeContent.match(/Strategy:\s*Diagnostic[-\s]?Agent[\s\S]*?(?=##### Step 5|##### Step 6|$)/i);
    assert.ok(diagnosticSection, 'Strategy: Diagnostic Agent section not found');

    const hasTaskCall = /Task\s*tool|spawn.*sub[-\s]?agent/i.test(diagnosticSection[0]);
    assert.ok(
      hasTaskCall,
      'Diagnostic Agent section should show Task tool call format'
    );
  });

  test('Diagnostic Agent section should specify subagent_type', () => {
    const diagnosticSection = executeContent.match(/Strategy:\s*Diagnostic[-\s]?Agent[\s\S]*?(?=##### Step 5|##### Step 6|$)/i);
    assert.ok(diagnosticSection, 'Strategy: Diagnostic Agent section not found');

    const hasSubagentType = /subagent_type|general[-\s]?purpose/i.test(diagnosticSection[0]);
    assert.ok(
      hasSubagentType,
      'Diagnostic Agent section should specify subagent_type for the Task tool call'
    );
  });
});

// ============================================================================
// Test Suite 6: Fix Agent Prompt Template
// ============================================================================

describe('Fix Agent Prompt Template', () => {
  test('Diagnostic Agent section should include a prompt template', () => {
    const diagnosticSection = executeContent.match(/Strategy:\s*Diagnostic[-\s]?Agent[\s\S]*?(?=##### Step 5|##### Step 6|$)/i);
    assert.ok(diagnosticSection, 'Strategy: Diagnostic Agent section not found');

    const hasPromptTemplate = /prompt[\s\S]*?error|You are.*fix|template/i.test(diagnosticSection[0]);
    assert.ok(
      hasPromptTemplate,
      'Diagnostic Agent section should include a prompt template'
    );
  });

  test('Diagnostic Agent prompt template should include error context placeholder', () => {
    const diagnosticSection = executeContent.match(/Strategy:\s*Diagnostic[-\s]?Agent[\s\S]*?(?=##### Step 5|##### Step 6|$)/i);
    assert.ok(diagnosticSection, 'Strategy: Diagnostic Agent section not found');

    const hasErrorContext = /\{error_message\}|\{error_output\}|error.*context|<error/i.test(diagnosticSection[0]);
    assert.ok(
      hasErrorContext,
      'Diagnostic Agent prompt template should include error context placeholder'
    );
  });

  test('Diagnostic Agent prompt template should include file context', () => {
    const diagnosticSection = executeContent.match(/Strategy:\s*Diagnostic[-\s]?Agent[\s\S]*?(?=##### Step 5|##### Step 6|$)/i);
    assert.ok(diagnosticSection, 'Strategy: Diagnostic Agent section not found');

    const hasFileContext = /\{error_file\}|affected.*file|<file|file.*path/i.test(diagnosticSection[0]);
    assert.ok(
      hasFileContext,
      'Diagnostic Agent prompt template should include file context'
    );
  });

  test('Diagnostic Agent prompt template should request fix actions', () => {
    const diagnosticSection = executeContent.match(/Strategy:\s*Diagnostic[-\s]?Agent[\s\S]*?(?=##### Step 5|##### Step 6|$)/i);
    assert.ok(diagnosticSection, 'Strategy: Diagnostic Agent section not found');

    const hasFixRequest = /fix.*error|apply.*fix|make.*pass|resolve/i.test(diagnosticSection[0]);
    assert.ok(
      hasFixRequest,
      'Diagnostic Agent prompt template should request specific fix actions'
    );
  });
});

// ============================================================================
// Test Suite 7: AUTOFIX_RESULT Marker
// ============================================================================

describe('AUTOFIX_RESULT Marker', () => {
  test('execute.md should document AUTOFIX_RESULT marker', () => {
    const hasMarker = /AUTOFIX_RESULT/i.test(executeContent);
    assert.ok(
      hasMarker,
      'execute.md should document AUTOFIX_RESULT marker for sub-agent responses'
    );
  });

  test('AUTOFIX_RESULT should indicate fix outcome', () => {
    const hasOutcome = /AUTOFIX_RESULT.*success|AUTOFIX_RESULT.*fail|AUTOFIX_RESULT.*outcome/i.test(executeContent);
    assert.ok(
      hasOutcome,
      'AUTOFIX_RESULT marker should indicate fix outcome (success/failure)'
    );
  });
});

// ============================================================================
// Test Suite 8: AUTOFIX_ACTION Marker
// ============================================================================

describe('AUTOFIX_ACTION Marker', () => {
  test('execute.md should document AUTOFIX_ACTION marker', () => {
    const hasMarker = /AUTOFIX_ACTION/i.test(executeContent);
    assert.ok(
      hasMarker,
      'execute.md should document AUTOFIX_ACTION marker for describing fix actions'
    );
  });

  test('AUTOFIX_ACTION should describe what fix was applied', () => {
    const hasDescription = /AUTOFIX_ACTION.*describe|AUTOFIX_ACTION.*what.*fix|AUTOFIX_ACTION.*applied/i.test(executeContent);
    assert.ok(
      hasDescription,
      'AUTOFIX_ACTION marker should describe what fix was applied'
    );
  });
});

// ============================================================================
// Test Suite 9: Step 5 - Record Fix Attempt
// ============================================================================

describe('Step 5: Record Fix Attempt', () => {
  test('execute.md should have Step 5 for recording fix attempts', () => {
    const hasStep5 = /Step\s*5[:\s].*Record\s*Fix|Record\s*Fix\s*Attempt|##### Step 5/i.test(executeContent);
    assert.ok(
      hasStep5,
      'execute.md should have "Step 5: Record Fix Attempt" subsection'
    );
  });

  test('Step 5 should be within Auto-Fix Attempt section', () => {
    const autoFixSection = executeContent.match(/4f-auto[\s\S]*?(?=####\s*4g|(?<![#])###\s*Step\s*5\s*:|$)/i);
    assert.ok(autoFixSection, 'Auto-Fix Attempt section not found');

    const hasStep5InSection = /Step\s*5.*Record|Record\s*Fix\s*Attempt/i.test(autoFixSection[0]);
    assert.ok(
      hasStep5InSection,
      'Step 5 (Record Fix Attempt) should be within Auto-Fix Attempt section'
    );
  });

  test('Step 5 should document updating fixAttempts array', () => {
    const hasArrayUpdate = /update.*fixAttempts|add.*fixAttempts|append.*fixAttempts|fixAttempts.*push/i.test(executeContent);
    assert.ok(
      hasArrayUpdate,
      'Step 5 should document updating the fixAttempts array'
    );
  });

  test('Step 5 should document recording all required fields', () => {
    const hasFieldsDoc = /record.*id.*errorType|record.*strategy.*fix|all\s*fields|required\s*fields/i.test(executeContent) ||
                         /errorType[\s\S]*?errorMessage[\s\S]*?strategy/i.test(executeContent);
    assert.ok(
      hasFieldsDoc,
      'Step 5 should document recording all required fields (id, errorType, strategy, etc.)'
    );
  });
});

// ============================================================================
// Test Suite 10: Step 6 - Verify Fix
// ============================================================================

describe('Step 6: Verify Fix', () => {
  test('execute.md should have Step 6 for verifying fixes', () => {
    const hasStep6 = /Step\s*6[:\s].*Verify\s*Fix|Verify\s*Fix|##### Step 6/i.test(executeContent);
    assert.ok(
      hasStep6,
      'execute.md should have "Step 6: Verify Fix" subsection'
    );
  });

  test('Step 6 should be within Auto-Fix Attempt section', () => {
    const autoFixSection = executeContent.match(/4f-auto[\s\S]*?(?=####\s*4g|(?<![#])###\s*Step\s*5\s*:|$)/i);
    assert.ok(autoFixSection, 'Auto-Fix Attempt section not found');

    const hasStep6InSection = /Step\s*6.*Verify|Verify\s*Fix/i.test(autoFixSection[0]);
    assert.ok(
      hasStep6InSection,
      'Step 6 (Verify Fix) should be within Auto-Fix Attempt section'
    );
  });
});

// ============================================================================
// Test Suite 11: Verification Command Table
// ============================================================================

describe('Verification Command Table', () => {
  test('Step 6 should include verification command table', () => {
    const hasTable = /\|\s*Error\s*Type\s*\|\s*Verification\s*Command|\|\s*Type\s*\|.*Command/i.test(executeContent);
    assert.ok(
      hasTable,
      'Step 6 should include a verification command table'
    );
  });

  test('Verification table should include TypeScript verification', () => {
    const hasTypescript = /typescript|tsc|type[-\s]?check|npx\s*tsc/i.test(executeContent);
    assert.ok(
      hasTypescript,
      'Verification table should include TypeScript verification command'
    );
  });

  test('Verification table should include test verification', () => {
    const hasTest = /test.*verification|run\s*tests|jest|vitest|pytest/i.test(executeContent);
    assert.ok(
      hasTest,
      'Verification table should include test verification command'
    );
  });

  test('Verification table should include build verification', () => {
    const hasBuild = /build.*verification|npm\s*run\s*build|build\s*command/i.test(executeContent);
    assert.ok(
      hasBuild,
      'Verification table should include build verification command'
    );
  });

  test('Verification table should include runtime verification', () => {
    const hasRuntime = /runtime.*verification|runtime[-\s]?error|node\s*.*script/i.test(executeContent);
    assert.ok(
      hasRuntime,
      'Verification table should include runtime verification'
    );
  });
});

// ============================================================================
// Test Suite 12: Step 7 - Handle Result
// ============================================================================

describe('Step 7: Handle Result', () => {
  test('execute.md should have Step 7 for handling results', () => {
    const hasStep7 = /Step\s*7[:\s].*Handle\s*Result|Handle\s*Result|##### Step 7/i.test(executeContent);
    assert.ok(
      hasStep7,
      'execute.md should have "Step 7: Handle Result" subsection'
    );
  });

  test('Step 7 should be within Auto-Fix Attempt section', () => {
    const autoFixSection = executeContent.match(/4f-auto[\s\S]*?(?=####\s*4g|(?<![#])###\s*Step\s*5\s*:|$)/i);
    assert.ok(autoFixSection, 'Auto-Fix Attempt section not found');

    const hasStep7InSection = /Step\s*7.*Handle|Handle\s*Result/i.test(autoFixSection[0]);
    assert.ok(
      hasStep7InSection,
      'Step 7 (Handle Result) should be within Auto-Fix Attempt section'
    );
  });
});

// ============================================================================
// Test Suite 13: Success Path Behavior
// ============================================================================

describe('Success Path Behavior', () => {
  test('Step 7 should document success path after fix', () => {
    const step7Section = executeContent.match(/Step\s*7[:\s].*Handle[\s\S]*?(?=##### Step 8|####\s*4g|$)/i);
    assert.ok(step7Section, 'Step 7: Handle Result section not found');

    const hasSuccessPath = /success.*continue|pass.*continue|success.*proceed|fix.*succeed/i.test(step7Section[0]);
    assert.ok(
      hasSuccessPath,
      'Step 7 should document success path (continue execution after fix succeeds)'
    );
  });

  test('Success path should update fixAttempts with success result', () => {
    const step7Section = executeContent.match(/Step\s*7[:\s].*Handle[\s\S]*?(?=##### Step 8|####\s*4g|$)/i);
    assert.ok(step7Section, 'Step 7: Handle Result section not found');

    const hasSuccessUpdate = /verificationResult.*success|update.*success|record.*success/i.test(step7Section[0]);
    assert.ok(
      hasSuccessUpdate,
      'Success path should update fixAttempts with success result'
    );
  });

  test('Success path should continue to next phase or complete', () => {
    const step7Section = executeContent.match(/Step\s*7[:\s].*Handle[\s\S]*?(?=##### Step 8|####\s*4g|$)/i);
    assert.ok(step7Section, 'Step 7: Handle Result section not found');

    const hasContinue = /continue.*phase|proceed|complete|resume/i.test(step7Section[0]);
    assert.ok(
      hasContinue,
      'Success path should continue to next phase or mark phase complete'
    );
  });
});

// ============================================================================
// Test Suite 14: Failure Path with Retry
// ============================================================================

describe('Failure Path with Retry', () => {
  test('Step 7 should document failure path with retry logic', () => {
    const step7Section = executeContent.match(/Step\s*7[:\s].*Handle[\s\S]*?(?=##### Step 8|####\s*4g|$)/i);
    assert.ok(step7Section, 'Step 7: Handle Result section not found');

    const hasFailurePath = /fail.*retry|failure.*attempt|retry.*fix/i.test(step7Section[0]);
    assert.ok(
      hasFailurePath,
      'Step 7 should document failure path with retry logic'
    );
  });

  test('Failure path should update fixAttempts with failure result', () => {
    const step7Section = executeContent.match(/Step\s*7[:\s].*Handle[\s\S]*?(?=##### Step 8|####\s*4g|$)/i);
    assert.ok(step7Section, 'Step 7: Handle Result section not found');

    const hasFailureUpdate = /verificationResult.*failure|update.*failure|record.*failure/i.test(step7Section[0]);
    assert.ok(
      hasFailureUpdate,
      'Failure path should update fixAttempts with failure result'
    );
  });

  test('Failure path should loop back to Step 2 for retry', () => {
    const step7Section = executeContent.match(/Step\s*7[:\s].*Handle[\s\S]*?(?=##### Step 8|####\s*4g|$)/i);
    assert.ok(step7Section, 'Step 7: Handle Result section not found');

    const hasLoopBack = /loop.*Step\s*2|return.*Step\s*2|back.*Step\s*2|retry.*Step\s*2/i.test(step7Section[0]);
    assert.ok(
      hasLoopBack,
      'Failure path should loop back to Step 2 for retry'
    );
  });
});

// ============================================================================
// Test Suite 15: Strategy Escalation on Failure
// ============================================================================

describe('Strategy Escalation on Failure', () => {
  test('Step 7 should document strategy escalation when fix fails', () => {
    const step7Section = executeContent.match(/Step\s*7[:\s].*Handle[\s\S]*?(?=##### Step 8|####\s*4g|$)/i);
    assert.ok(step7Section, 'Step 7: Handle Result section not found');

    const hasEscalation = /escalat.*strategy|strategy.*escalat|direct.*diagnostic/i.test(step7Section[0]);
    assert.ok(
      hasEscalation,
      'Step 7 should document strategy escalation when fix fails'
    );
  });

  test('Step 7 should escalate from direct to diagnostic-agent on failure', () => {
    const step7Section = executeContent.match(/Step\s*7[:\s].*Handle[\s\S]*?(?=##### Step 8|####\s*4g|$)/i);
    assert.ok(step7Section, 'Step 7: Handle Result section not found');

    const hasDirectToDiagnostic = /direct.*diagnostic|escalate.*diagnostic|try.*diagnostic/i.test(step7Section[0]);
    assert.ok(
      hasDirectToDiagnostic,
      'Step 7 should document escalation from direct to diagnostic-agent on failure'
    );
  });

  test('Step 7 should document fallback to manual intervention after all strategies fail', () => {
    const step7Section = executeContent.match(/Step\s*7[:\s].*Handle[\s\S]*?(?=##### Step 8|####\s*4g|$)/i);
    assert.ok(step7Section, 'Step 7: Handle Result section not found');

    const hasFallback = /manual\s*intervention|all.*strategies.*fail|exhaust.*strateg|fall.*manual/i.test(step7Section[0]);
    assert.ok(
      hasFallback,
      'Step 7 should document fallback to manual intervention after all strategies fail'
    );
  });
});

// ============================================================================
// Test Suite: Auto-Fix Flow Order (Steps 4-7)
// ============================================================================

describe('Auto-Fix Flow Order (Steps 4 -> 5 -> 6 -> 7)', () => {
  test('Step 4 (Execute Fix) should come before Step 5 (Record)', () => {
    const step4Match = executeContent.search(/Step\s*4[:\s].*(?:Direct|Diagnostic|Execute|Apply)/i);
    const step5Match = executeContent.search(/Step\s*5[:\s].*Record/i);

    // Only run ordering test if both exist
    if (step4Match >= 0 && step5Match >= 0) {
      assert.ok(
        step4Match < step5Match,
        'Step 4 should come before Step 5 in auto-fix flow'
      );
    } else {
      assert.ok(false, 'Step 4 and/or Step 5 not found - cannot verify order');
    }
  });

  test('Step 5 (Record) should come before Step 6 (Verify)', () => {
    const step5Match = executeContent.search(/Step\s*5[:\s].*Record/i);
    const step6Match = executeContent.search(/Step\s*6[:\s].*Verify/i);

    // Only run ordering test if both exist
    if (step5Match >= 0 && step6Match >= 0) {
      assert.ok(
        step5Match < step6Match,
        'Step 5 should come before Step 6 in auto-fix flow'
      );
    } else {
      assert.ok(false, 'Step 5 and/or Step 6 not found - cannot verify order');
    }
  });

  test('Step 6 (Verify) should come before Step 7 (Handle Result)', () => {
    const step6Match = executeContent.search(/Step\s*6[:\s].*Verify/i);
    const step7Match = executeContent.search(/Step\s*7[:\s].*Handle/i);

    // Only run ordering test if both exist
    if (step6Match >= 0 && step7Match >= 0) {
      assert.ok(
        step6Match < step7Match,
        'Step 6 should come before Step 7 in auto-fix flow'
      );
    } else {
      assert.ok(false, 'Step 6 and/or Step 7 not found - cannot verify order');
    }
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

  console.log(`\nSUMMARY: Created ${testsPassed + testsFailed} failing tests for Phase 4 fix strategies`);
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
  console.log(`\nSUMMARY: All ${testsPassed} tests passing for Phase 4 fix strategies`);
  process.exit(0);
}
