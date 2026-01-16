/**
 * TDD Tests for Phase 2: Document fixAttempts schema for plan files
 * Issue #12: Add auto-fix infrastructure for verification failures
 *
 * These tests verify that execute.md contains:
 * 1. "Fix Attempt Tracking" section after "State File Updates"
 * 2. Complete fixAttempts schema documentation with all required fields
 * 3. Fix ID naming convention documentation (NN-fix-NN format)
 * 4. Persistence explanation (stored in plan files)
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
// Test Suite: Fix Attempt Tracking Section Exists
// ============================================================================

describe('Fix Attempt Tracking Section', () => {
  test('execute.md should have "Fix Attempt Tracking" section', () => {
    const hasSection = /##\s*Fix\s*Attempt\s*Tracking/i.test(executeContent);
    assert.ok(
      hasSection,
      'execute.md is missing "## Fix Attempt Tracking" section'
    );
  });

  test('Fix Attempt Tracking section should appear after State File Updates section', () => {
    const stateFileUpdatesMatch = executeContent.search(/##\s*State\s*File\s*Updates/i);
    const fixAttemptTrackingMatch = executeContent.search(/##\s*Fix\s*Attempt\s*Tracking/i);

    assert.ok(stateFileUpdatesMatch >= 0, 'State File Updates section not found');
    assert.ok(fixAttemptTrackingMatch >= 0, 'Fix Attempt Tracking section not found');
    assert.ok(
      stateFileUpdatesMatch < fixAttemptTrackingMatch,
      'Fix Attempt Tracking section should come after State File Updates section'
    );
  });
});

// ============================================================================
// Test Suite: fixAttempts Schema Example
// ============================================================================

describe('fixAttempts Schema Documentation', () => {
  test('execute.md should contain fixAttempts schema example', () => {
    const hasFixAttempts = /fixAttempts\s*:\s*\[/i.test(executeContent) ||
                           /"fixAttempts"\s*:\s*\[/i.test(executeContent);
    assert.ok(
      hasFixAttempts,
      'execute.md should contain fixAttempts array schema example'
    );
  });

  test('fixAttempts should be shown as an array in JSON example', () => {
    // Look for JSON block containing fixAttempts as array
    const hasJsonArray = /```json[\s\S]*?"fixAttempts"\s*:\s*\[[\s\S]*?\][\s\S]*?```/i.test(executeContent);
    assert.ok(
      hasJsonArray,
      'fixAttempts should be shown as an array in a JSON code block'
    );
  });
});

// ============================================================================
// Test Suite: fixAttempts Schema - Required Field: id
// ============================================================================

describe('fixAttempts Schema Field: id', () => {
  test('fixAttempts schema should document "id" field', () => {
    // Look for id field in context of fixAttempts
    const hasIdField = /"id"\s*:/i.test(executeContent) &&
                       /fixAttempts[\s\S]*?"id"/i.test(executeContent);
    assert.ok(
      hasIdField,
      'fixAttempts schema should document "id" field'
    );
  });

  test('id field should show example value in NN-fix-NN format', () => {
    // Look for id value like "01-fix-01" or similar pattern
    const hasIdFormat = /"\d{2}-fix-\d{2}"/i.test(executeContent);
    assert.ok(
      hasIdFormat,
      'id field should show example value in NN-fix-NN format (e.g., "01-fix-01")'
    );
  });
});

// ============================================================================
// Test Suite: fixAttempts Schema - Required Field: attemptNumber
// ============================================================================

describe('fixAttempts Schema Field: attemptNumber', () => {
  test('fixAttempts schema should document "attemptNumber" field', () => {
    const hasAttemptNumber = /"attemptNumber"\s*:/i.test(executeContent);
    assert.ok(
      hasAttemptNumber,
      'fixAttempts schema should document "attemptNumber" field'
    );
  });

  test('attemptNumber should be shown as a number in schema', () => {
    // Look for attemptNumber with numeric value
    const hasNumericValue = /"attemptNumber"\s*:\s*\d+/i.test(executeContent);
    assert.ok(
      hasNumericValue,
      'attemptNumber should be shown as a number in schema example'
    );
  });
});

// ============================================================================
// Test Suite: fixAttempts Schema - Required Field: errorType
// ============================================================================

describe('fixAttempts Schema Field: errorType', () => {
  test('fixAttempts schema should document "errorType" field', () => {
    const hasErrorType = /"errorType"\s*:/i.test(executeContent);
    assert.ok(
      hasErrorType,
      'fixAttempts schema should document "errorType" field'
    );
  });

  test('errorType should show example value (e.g., test-failure, syntax-error)', () => {
    // Look for errorType with string value
    const hasErrorTypeValue = /"errorType"\s*:\s*"[^"]+"/i.test(executeContent);
    assert.ok(
      hasErrorTypeValue,
      'errorType should show example string value'
    );
  });
});

// ============================================================================
// Test Suite: fixAttempts Schema - Required Field: errorMessage
// ============================================================================

describe('fixAttempts Schema Field: errorMessage', () => {
  test('fixAttempts schema should document "errorMessage" field', () => {
    const hasErrorMessage = /"errorMessage"\s*:/i.test(executeContent);
    assert.ok(
      hasErrorMessage,
      'fixAttempts schema should document "errorMessage" field'
    );
  });

  test('errorMessage should show example error string', () => {
    // Look for errorMessage with string value
    const hasErrorMessageValue = /"errorMessage"\s*:\s*"[^"]+"/i.test(executeContent);
    assert.ok(
      hasErrorMessageValue,
      'errorMessage should show example error string'
    );
  });
});

// ============================================================================
// Test Suite: fixAttempts Schema - Required Field: strategy
// ============================================================================

describe('fixAttempts Schema Field: strategy', () => {
  test('fixAttempts schema should document "strategy" field', () => {
    const hasStrategy = /"strategy"\s*:/i.test(executeContent);
    assert.ok(
      hasStrategy,
      'fixAttempts schema should document "strategy" field'
    );
  });

  test('strategy should show valid strategy value (direct or diagnostic-agent)', () => {
    // Look for strategy with valid value
    const hasValidStrategy = /"strategy"\s*:\s*"(direct|diagnostic-agent)"/i.test(executeContent);
    assert.ok(
      hasValidStrategy,
      'strategy should show valid value: "direct" or "diagnostic-agent"'
    );
  });
});

// ============================================================================
// Test Suite: fixAttempts Schema - Required Field: fixApplied
// ============================================================================

describe('fixAttempts Schema Field: fixApplied', () => {
  test('fixAttempts schema should document "fixApplied" field', () => {
    const hasFixApplied = /"fixApplied"\s*:/i.test(executeContent);
    assert.ok(
      hasFixApplied,
      'fixAttempts schema should document "fixApplied" field'
    );
  });

  test('fixApplied should describe the fix that was attempted', () => {
    // Look for fixApplied with descriptive string value
    const hasFixAppliedValue = /"fixApplied"\s*:\s*"[^"]+"/i.test(executeContent);
    assert.ok(
      hasFixAppliedValue,
      'fixApplied should show example description of the fix attempted'
    );
  });
});

// ============================================================================
// Test Suite: fixAttempts Schema - Required Field: verificationResult
// ============================================================================

describe('fixAttempts Schema Field: verificationResult', () => {
  test('fixAttempts schema should document "verificationResult" field', () => {
    const hasVerificationResult = /"verificationResult"\s*:/i.test(executeContent);
    assert.ok(
      hasVerificationResult,
      'fixAttempts schema should document "verificationResult" field'
    );
  });

  test('verificationResult should show valid outcome (success or failure)', () => {
    // Look for verificationResult with valid value
    const hasValidResult = /"verificationResult"\s*:\s*"(success|failure|passed|failed)"/i.test(executeContent);
    assert.ok(
      hasValidResult,
      'verificationResult should show valid outcome value'
    );
  });
});

// ============================================================================
// Test Suite: fixAttempts Schema - Required Field: timestamp
// ============================================================================

describe('fixAttempts Schema Field: timestamp', () => {
  test('fixAttempts schema should document "timestamp" field', () => {
    const hasTimestamp = /"timestamp"\s*:/i.test(executeContent);
    assert.ok(
      hasTimestamp,
      'fixAttempts schema should document "timestamp" field'
    );
  });

  test('timestamp should show ISO 8601 format example', () => {
    // Look for timestamp with ISO 8601 format
    const hasIsoTimestamp = /"timestamp"\s*:\s*"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/i.test(executeContent);
    assert.ok(
      hasIsoTimestamp,
      'timestamp should show ISO 8601 format example (e.g., "2026-01-10T10:00:00Z")'
    );
  });
});

// ============================================================================
// Test Suite: Fix ID Naming Convention Documentation
// ============================================================================

describe('Fix ID Naming Convention', () => {
  test('execute.md should document the Fix ID naming convention', () => {
    // Look for documentation of the NN-fix-NN format
    const hasNamingConvention = /fix\s*id\s*(naming\s*)?convention|naming\s*convention.*fix\s*id|NN-fix-NN|\d{2}-fix-\d{2}\s*format/i.test(executeContent);
    assert.ok(
      hasNamingConvention,
      'execute.md should document the Fix ID naming convention'
    );
  });

  test('Fix ID format should be explained (phase-fix-attempt)', () => {
    // Look for explanation of the format components
    const hasFormatExplanation = /phase.*fix.*attempt|NN-fix-NN|01-fix-01.*01-fix-02/i.test(executeContent) ||
                                  /fix\s*id.*format|format.*phase[-\s]number.*attempt[-\s]number/i.test(executeContent);
    assert.ok(
      hasFormatExplanation,
      'Fix ID format should explain the phase-fix-attempt pattern'
    );
  });

  test('Fix ID documentation should show sequential numbering', () => {
    // Look for examples showing sequential numbering
    const hasSequentialExample = /01-fix-01[\s\S]*?01-fix-02|02-fix-01/i.test(executeContent) ||
                                  /sequential|increment/i.test(executeContent);
    assert.ok(
      hasSequentialExample,
      'Fix ID documentation should show sequential numbering examples'
    );
  });
});

// ============================================================================
// Test Suite: Persistence Explanation (Stored in Plan Files)
// ============================================================================

describe('fixAttempts Persistence in Plan Files', () => {
  test('execute.md should explain fixAttempts are stored in plan files', () => {
    // Look for explanation that fixAttempts are persisted in plan files
    const hasPersistenceExplanation = /fixAttempts.*plan\s*file|plan\s*file.*fixAttempts|store.*fixAttempts|persist.*fixAttempts/i.test(executeContent);
    assert.ok(
      hasPersistenceExplanation,
      'execute.md should explain that fixAttempts are stored in plan files'
    );
  });

  test('should mention fixAttempts stored at phase level in plan', () => {
    // Look for explanation that fixAttempts are per-phase
    const hasPhaseLevel = /phase.*fixAttempts|fixAttempts.*phase|per[-\s]phase.*fix/i.test(executeContent);
    assert.ok(
      hasPhaseLevel,
      'Should mention that fixAttempts are stored at the phase level in plan files'
    );
  });

  test('should reference plan file location in context of fixAttempts', () => {
    // Look for reference to plan file path specifically in context of fixAttempts or Fix Attempt Tracking
    const fixAttemptSection = executeContent.match(/##\s*Fix\s*Attempt\s*Tracking[\s\S]*?(?=##\s*[A-Z]|$)/i);
    assert.ok(fixAttemptSection, 'Fix Attempt Tracking section not found');

    const hasPlanFilePath = /\.tiki\/plans\/issue|plans\/issue.*\.json|plan\s*file/i.test(fixAttemptSection[0]);
    assert.ok(
      hasPlanFilePath,
      'Fix Attempt Tracking section should reference plan file location'
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

  console.log('\nSUMMARY: Created 26 failing tests for Phase 2 fixAttempts schema');
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
  console.log('\nSUMMARY: All 26 tests passing for Phase 2 fixAttempts schema');
  process.exit(0);
}
