/**
 * TDD Tests for Phase 5: Integrate with Audit-Plan
 * Issue #11: Add goal-backward planning to /plan-issue with success criteria
 *
 * These tests verify that audit-plan.md contains the required sections for
 * success criteria coverage validation (Check 6).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const AUDIT_PLAN_PATH = path.join(__dirname, '../../../.claude/commands/tiki/audit-plan.md');

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
  content = fs.readFileSync(AUDIT_PLAN_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read audit-plan.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite: Check 6 - Criteria Coverage Validation Section
// ============================================================================

describe('Check 6: Criteria Coverage Validation Section', () => {
  test('should have Check 6: Criteria Coverage Validation section', () => {
    const hasCheck6 = /####\s*Check\s*6[:\s]*Criteria\s*Coverage\s*Validation/i.test(content);
    assert.ok(hasCheck6, 'Missing "Check 6: Criteria Coverage Validation" section');
  });

  test('Check 6 should appear after Check 5 (Referenced Files Exist)', () => {
    const check5Match = content.search(/####\s*Check\s*5[:\s]*Referenced\s*Files\s*Exist/i);
    const check6Match = content.search(/####\s*Check\s*6[:\s]*Criteria\s*Coverage\s*Validation/i);

    assert.ok(check5Match >= 0, 'Check 5 not found');
    assert.ok(check6Match >= 0, 'Check 6 not found');
    assert.ok(check5Match < check6Match, 'Check 6 should come after Check 5');
  });

  test('Check 6 should be within Step 2: Run Validation Checks', () => {
    const step2Match = content.search(/###\s*Step\s*2[:\s]*Run\s*Validation\s*Checks/i);
    const step3Match = content.search(/###\s*Step\s*3[:\s]*Generate\s*Report/i);
    const check6Match = content.search(/####\s*Check\s*6[:\s]*Criteria\s*Coverage\s*Validation/i);

    assert.ok(step2Match >= 0, 'Step 2 not found');
    assert.ok(check6Match >= 0, 'Check 6 not found');
    assert.ok(step3Match >= 0, 'Step 3 not found');
    assert.ok(step2Match < check6Match, 'Check 6 should come after Step 2');
    assert.ok(check6Match < step3Match, 'Check 6 should come before Step 3');
  });
});

// ============================================================================
// Test Suite: Check 6 - Error for Uncovered Criteria
// ============================================================================

describe('Check 6: Error for Uncovered Criteria', () => {
  test('should flag error if any criterion has no mapped tasks', () => {
    const hasUncoveredError = /error.*criteri(on|a).*no\s*(mapped|associated)\s*tasks|criteri(on|a).*not\s*(covered|addressed).*error|errors\.push.*uncovered\s*criteri(a|on)|errors\.push.*no\s*tasks\s*address/i.test(content);
    assert.ok(hasUncoveredError, 'Check 6 should flag error when criterion has no mapped tasks');
  });

  test('should document error condition for zero coverage', () => {
    const hasZeroCoverageDoc = /criteri(on|a).*zero\s*coverage|no\s*phases?\s*address|criteri(on|a).*not\s*addressed\s*by\s*any/i.test(content);
    assert.ok(hasZeroCoverageDoc, 'Should document error condition for zero coverage');
  });

  test('error message should mention which criterion is uncovered', () => {
    const hasSpecificCriterion = /error.*criteri(on|a).*["']|criteri(on|a)\s*["'][^"']+["']\s*.*not\s*(covered|addressed)|errors\.push.*\$\{.*criteri/i.test(content);
    assert.ok(hasSpecificCriterion, 'Error message should specify which criterion is uncovered');
  });

  test('should include code example showing error push for uncovered criteria', () => {
    // Look for JavaScript code showing error handling
    const hasCodeExample = /```javascript[\s\S]*?errors\.push[\s\S]*?criteri[\s\S]*?```/i.test(content);
    assert.ok(hasCodeExample, 'Should include code example showing errors.push for uncovered criteria');
  });
});

// ============================================================================
// Test Suite: Check 6 - Warning for Weak Coverage
// ============================================================================

describe('Check 6: Warning for Weak Coverage', () => {
  test('should flag warning if criterion has weak coverage (only 1 task)', () => {
    const hasWeakWarning = /warning.*weak\s*coverage|warning.*only\s*(1|one)\s*task|warnings\.push.*weak|warnings\.push.*(1|one)\s*task|single\s*task.*warning/i.test(content);
    assert.ok(hasWeakWarning, 'Check 6 should flag warning for weak coverage (only 1 task)');
  });

  test('should document warning condition for single task coverage', () => {
    const hasSingleTaskDoc = /single\s*task\s*coverage|only\s*(1|one)\s*task\s*addresses|criteri(on|a).*addressed\s*by\s*only\s*(1|one)|weak.*single/i.test(content);
    assert.ok(hasSingleTaskDoc, 'Should document warning condition for single task coverage');
  });

  test('should distinguish between error (0 tasks) and warning (1 task)', () => {
    // Look for both error and warning conditions being different
    const hasErrorCondition = /error.*no\s*(mapped\s*)?tasks|0\s*tasks.*error|zero\s*coverage.*error/i.test(content);
    const hasWarningCondition = /warning.*(1|one)\s*task|single\s*task.*warning|weak\s*coverage.*warning/i.test(content);
    assert.ok(hasErrorCondition && hasWarningCondition, 'Should distinguish between error (0 tasks) and warning (1 task)');
  });

  test('warning message should suggest stronger coverage', () => {
    const hasSuggestion = /consider\s*(adding\s*)?more\s*tasks|strengthen.*coverage|additional\s*task|more\s*coverage/i.test(content);
    assert.ok(hasSuggestion, 'Warning should suggest strengthening coverage');
  });
});

// ============================================================================
// Test Suite: Criteria Coverage Section in Audit Report
// ============================================================================

describe('Criteria Coverage Section in Audit Report', () => {
  test('Step 3 report should include criteria coverage status', () => {
    const step3Section = content.match(/###\s*Step\s*3[:\s]*Generate\s*Report[\s\S]*?(?=###|##\s*[^#]|$)/i);
    assert.ok(step3Section, 'Could not find Step 3 section');

    const hasCriteriaCoverage = /criteri(a|on)\s*coverage|coverage.*criteri(a|on)|all\s*criteri(a|on).*covered/i.test(step3Section[0]);
    assert.ok(hasCriteriaCoverage, 'Step 3 report should include criteria coverage status');
  });

  test('report output example should show criteria coverage line', () => {
    const reportExample = content.match(/```[\s\S]*?Plan\s*Audit[\s\S]*?```/i);
    assert.ok(reportExample, 'Could not find audit report example');

    const hasCoverageLine = /criteri(a|on)\s*coverage|\d+\/\d+\s*criteri(a|on)|all\s*criteri(a|on)\s*(are\s*)?covered/i.test(reportExample[0]);
    assert.ok(hasCoverageLine, 'Report example should show criteria coverage line');
  });

  test('should show checkmark/warning/error symbol for criteria coverage', () => {
    // Look for symbols (checkmark, warning, error) in context of criteria coverage
    const hasSymbol = /([\u2713\u2717]|checkmark|warning|\{checkmark\}|\{warning\}|\\u2713|\\u2717)[\s\S]*?criteri(a|on)|criteri(a|on)[\s\S]*?([\u2713\u2717]|checkmark|warning|\{checkmark\}|\{warning\})/i.test(content);
    assert.ok(hasSymbol, 'Report should use checkmark/warning/error symbols for criteria coverage');
  });

  test('criteria coverage should be a distinct line in the audit summary', () => {
    // Look for criteria coverage as a separate check in the summary format
    const hasSummaryLine = /(\n|\r)[\s\S]*?([\u2713]|checkmark|\{checkmark\})[\s\S]*?criteri(a|on)/i.test(content) ||
                          /Criteria\s*Coverage.*:/i.test(content);
    assert.ok(hasSummaryLine, 'Criteria coverage should be a distinct line in audit summary');
  });
});

// ============================================================================
// Test Suite: Criteria Coverage in Validation Details
// ============================================================================

describe('Criteria Coverage in Validation Details', () => {
  test('should include criteria coverage in Validation Details section', () => {
    const validationSection = content.match(/##\s*Validation\s*Details[\s\S]*?(?=##\s*[^#]|$)/i);
    assert.ok(validationSection, 'Could not find Validation Details section');

    const hasCriteriaValidation = /criteri(a|on)\s*coverage|coverage\s*validation|criteri(a|on)/i.test(validationSection[0]);
    assert.ok(hasCriteriaValidation, 'Validation Details should include criteria coverage information');
  });

  test('should define coverage thresholds (0 = error, 1 = warning, 2+ = good)', () => {
    const hasThresholds = /(0|zero).*error.*(1|one).*warning|threshold.*coverage|coverage.*guideline/i.test(content) ||
                         /\|\s*0\s*\|.*error|\|\s*1\s*\|.*warning/i.test(content);
    assert.ok(hasThresholds, 'Should define coverage thresholds (0 = error, 1 = warning, 2+ = good)');
  });
});

// ============================================================================
// Test Suite: Criteria Validation Examples
// ============================================================================

describe('Examples Show Criteria Validation', () => {
  test('Example 1 (Clean Plan) should show criteria coverage passing', () => {
    const example1Section = content.match(/###\s*Example\s*1[:\s]*Clean\s*Plan[\s\S]*?(?=###|##\s*[^#]|$)/i);
    assert.ok(example1Section, 'Could not find Example 1 section');

    const hasCriteriaPassing = /criteri(a|on)\s*coverage|all\s*criteri(a|on).*covered|[\u2713].*criteri/i.test(example1Section[0]);
    assert.ok(hasCriteriaPassing, 'Example 1 should show criteria coverage passing');
  });

  test('Example 2 (Plan with Warnings) should show criteria warning if applicable', () => {
    const example2Section = content.match(/###\s*Example\s*2[:\s]*Plan\s*with\s*Warnings[\s\S]*?(?=###|##\s*[^#]|$)/i);
    assert.ok(example2Section, 'Could not find Example 2 section');

    // Should either show criteria passing or show a criteria warning
    const hasCriteriaStatus = /criteri(a|on)|coverage/i.test(example2Section[0]);
    assert.ok(hasCriteriaStatus, 'Example 2 should show criteria coverage status');
  });

  test('Example 3 (Plan with Errors) should show criteria error scenario', () => {
    const example3Section = content.match(/###\s*Example\s*3[:\s]*Plan\s*with\s*Errors[\s\S]*?(?=###|##\s*[^#]|$)/i);
    assert.ok(example3Section, 'Could not find Example 3 section');

    // Should show criteria-related error or at least mention criteria
    const hasCriteriaError = /criteri(a|on).*not\s*covered|uncovered\s*criteri|[\u2717].*criteri|criteri(a|on).*error/i.test(example3Section[0]) ||
                            /criteri(a|on)/i.test(example3Section[0]);
    assert.ok(hasCriteriaError, 'Example 3 should include criteria coverage status');
  });

  test('at least one example should demonstrate criteria coverage warning', () => {
    // Look for warning symbol with criteria in any example
    const hasWarningExample = /[\u26A0].*weak\s*coverage|[\u26A0].*criteri(a|on)|warning.*criteri(a|on).*only\s*(1|one)/i.test(content) ||
                             /weak\s*coverage|only\s*(1|one)\s*task\s*covers/i.test(content);
    assert.ok(hasWarningExample, 'At least one example should demonstrate criteria coverage warning');
  });

  test('at least one example should demonstrate uncovered criteria error', () => {
    // Look for error related to uncovered criteria
    const hasErrorExample = /[\u2717].*criteri(a|on).*not\s*covered|[\u2717].*uncovered|error.*criteri(a|on)|criteri(a|on).*has\s*no\s*coverage/i.test(content);
    assert.ok(hasErrorExample, 'At least one example should demonstrate uncovered criteria error');
  });
});

// ============================================================================
// Test Suite: Verbose Output with Criteria Coverage
// ============================================================================

describe('Verbose Output with Criteria Coverage', () => {
  test('Example 4 (Verbose) should include detailed criteria coverage', () => {
    const example4Section = content.match(/###\s*Example\s*4[:\s]*Verbose[\s\S]*?(?=###|##\s*[^#]|$)/i);
    assert.ok(example4Section, 'Could not find Example 4 section');

    const hasDetailedCoverage = /criteri(a|on)\s*coverage|coverage\s*matrix|criteri(a|on).*analysis/i.test(example4Section[0]);
    assert.ok(hasDetailedCoverage, 'Example 4 (Verbose) should include detailed criteria coverage');
  });

  test('verbose output should show which phases address which criteria', () => {
    const example4Section = content.match(/###\s*Example\s*4[:\s]*Verbose[\s\S]*?(?=###|##\s*[^#]|$)/i);
    assert.ok(example4Section, 'Could not find Example 4 section');

    const hasPhaseCriteriaMapping = /phase.*criteri(a|on)|criteri(a|on).*phase|addresses\s*criteri/i.test(example4Section[0]);
    assert.ok(hasPhaseCriteriaMapping, 'Verbose output should show phase-to-criteria mapping');
  });
});

// ============================================================================
// Test Suite: Integration with Existing Checks
// ============================================================================

describe('Integration with Existing Checks', () => {
  test('criteria coverage check should be listed with other checks', () => {
    // Look for Check 6 in the same format as Checks 1-5
    const checksList = content.match(/####\s*Check\s*1[\s\S]*?####\s*Check\s*5/i);
    assert.ok(checksList, 'Could not find checks list');

    const check6After5 = content.search(/####\s*Check\s*5/) < content.search(/####\s*Check\s*6/);
    assert.ok(check6After5, 'Check 6 should be listed after Check 5');
  });

  test('should mention reading successCriteria from plan JSON', () => {
    const hasSuccessCriteriaRead = /plan\.successCriteria|successCriteria|read.*criteri(a|on)\s*from\s*plan/i.test(content);
    assert.ok(hasSuccessCriteriaRead, 'Should mention reading successCriteria from plan JSON');
  });

  test('should mention reading addressesCriteria from phases', () => {
    const hasAddressesCriteriaRead = /addressesCriteria|phase.*addresses|phases?\.addressesCriteria/i.test(content);
    assert.ok(hasAddressesCriteriaRead, 'Should mention reading addressesCriteria from phases');
  });

  test('should mention reading coverageMatrix if available', () => {
    const hasCoverageMatrixRead = /coverageMatrix|plan\.coverageMatrix|coverage\s*matrix/i.test(content);
    assert.ok(hasCoverageMatrixRead, 'Should mention reading coverageMatrix if available');
  });
});

// ============================================================================
// Test Suite: Criteria Coverage Logic Code Example
// ============================================================================

describe('Criteria Coverage Logic Code Example', () => {
  test('should include JavaScript code example for criteria validation', () => {
    const hasCodeBlock = /```javascript[\s\S]*?criteri[\s\S]*?```/i.test(content);
    assert.ok(hasCodeBlock, 'Should include JavaScript code example for criteria validation');
  });

  test('code example should iterate over successCriteria', () => {
    const hasIteration = /for.*successCriteria|successCriteria\.forEach|successCriteria\.map|for.*criteri(on|a)\s*of/i.test(content);
    assert.ok(hasIteration, 'Code example should iterate over successCriteria');
  });

  test('code example should check coverage count for each criterion', () => {
    const hasCoverageCount = /coverage.*count|count.*coverage|\.length|phases\.filter|addressesCriteria\.includes/i.test(content);
    assert.ok(hasCoverageCount, 'Code example should check coverage count for each criterion');
  });

  test('code example should push to errors array for zero coverage', () => {
    const hasErrorPush = /errors\.push[\s\S]*?(criteri|coverage|not\s*covered|zero)/i.test(content);
    assert.ok(hasErrorPush, 'Code example should push to errors array for zero coverage');
  });

  test('code example should push to warnings array for weak coverage', () => {
    const hasWarningPush = /warnings\.push[\s\S]*?(weak|only\s*(1|one)|single)/i.test(content);
    assert.ok(hasWarningPush, 'Code example should push to warnings array for weak coverage');
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
