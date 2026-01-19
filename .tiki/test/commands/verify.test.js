/**
 * Tests for UAT Verification Command
 * Issue #23: Implement /tiki:verify command for structured UAT verification
 *
 * This test file verifies that verify.md contains all required sections
 * including verification flow steps, AskUserQuestion usage, and report schema.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const VERIFY_PATH = path.join(__dirname, '../../../.claude/commands/tiki/verify.md');

let verifyContent = '';
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
  verifyContent = fs.readFileSync(VERIFY_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read verify.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test 1: File Existence and Basic Structure
// ============================================================================

describe('Test 1: File Existence and Basic Structure', () => {
  test('verify.md should exist', () => {
    assert.ok(
      fs.existsSync(VERIFY_PATH),
      'verify.md should exist at .claude/commands/tiki/verify.md'
    );
  });

  test('verify.md should not be empty', () => {
    assert.ok(
      verifyContent.length > 0,
      'verify.md should not be empty'
    );
  });
});

// ============================================================================
// Test 2: Required YAML Frontmatter Fields
// ============================================================================

describe('Test 2: Required YAML Frontmatter Fields', () => {
  test('should have YAML frontmatter', () => {
    const hasFrontmatter = /^---\n[\s\S]*?\n---/m.test(verifyContent);
    assert.ok(
      hasFrontmatter,
      'verify.md should have YAML frontmatter'
    );
  });

  test('should have type: prompt field', () => {
    const hasType = /type:\s*prompt/i.test(verifyContent);
    assert.ok(
      hasType,
      'verify.md should have type: prompt field'
    );
  });

  test('should have name field with tiki:verify', () => {
    const hasName = /name:\s*tiki:verify/i.test(verifyContent);
    assert.ok(
      hasName,
      'verify.md should have name: tiki:verify field'
    );
  });

  test('should have description field', () => {
    const hasDescription = /description:\s*.+/i.test(verifyContent);
    assert.ok(
      hasDescription,
      'verify.md should have description field'
    );
  });

  test('should have allowed-tools field', () => {
    const hasAllowedTools = /allowed-tools:\s*.+/i.test(verifyContent);
    assert.ok(
      hasAllowedTools,
      'verify.md should have allowed-tools field'
    );
  });

  test('allowed-tools should include AskUserQuestion', () => {
    const includesAskUser = /allowed-tools:.*AskUserQuestion/i.test(verifyContent);
    assert.ok(
      includesAskUser,
      'allowed-tools should include AskUserQuestion for interactive prompts'
    );
  });
});

// ============================================================================
// Test 3: Verification Flow Steps (Steps 1-7)
// ============================================================================

describe('Test 3: Verification Flow Steps (Steps 1-7)', () => {
  test('should have Step 1: Load Plan File', () => {
    const hasStep1 = /###\s*Step\s*1[:\s]*Load\s*Plan\s*File/i.test(verifyContent);
    assert.ok(
      hasStep1,
      'verify.md should have Step 1: Load Plan File'
    );
  });

  test('should have Step 2: Display Verification Checklist', () => {
    const hasStep2 = /###\s*Step\s*2[:\s]*Display\s*Verification\s*Checklist/i.test(verifyContent);
    assert.ok(
      hasStep2,
      'verify.md should have Step 2: Display Verification Checklist'
    );
  });

  test('should have Step 3: Run Automated Verifications', () => {
    const hasStep3 = /###\s*Step\s*3[:\s]*Run\s*Automated\s*Verifications/i.test(verifyContent);
    assert.ok(
      hasStep3,
      'verify.md should have Step 3: Run Automated Verifications'
    );
  });

  test('should have Step 4: Interactive Manual Verification', () => {
    const hasStep4 = /###\s*Step\s*4[:\s]*Interactive\s*Manual\s*Verification/i.test(verifyContent);
    assert.ok(
      hasStep4,
      'verify.md should have Step 4: Interactive Manual Verification'
    );
  });

  test('should have Step 5: Track Verification Results', () => {
    const hasStep5 = /###\s*Step\s*5[:\s]*Track\s*Verification\s*Results/i.test(verifyContent);
    assert.ok(
      hasStep5,
      'verify.md should have Step 5: Track Verification Results'
    );
  });

  test('should have Step 6: Display Summary', () => {
    const hasStep6 = /###\s*Step\s*6[:\s]*Display\s*Summary/i.test(verifyContent);
    assert.ok(
      hasStep6,
      'verify.md should have Step 6: Display Summary'
    );
  });

  test('should have Step 7: Generate UAT Report', () => {
    const hasStep7 = /###\s*Step\s*7[:\s]*Generate\s*UAT\s*Report/i.test(verifyContent);
    assert.ok(
      hasStep7,
      'verify.md should have Step 7: Generate UAT Report'
    );
  });
});

// ============================================================================
// Test 4: AskUserQuestion Usage Documentation
// ============================================================================

describe('Test 4: AskUserQuestion Usage Documentation', () => {
  test('should document AskUserQuestion in Step 4', () => {
    const step4Section = verifyContent.match(/###\s*Step\s*4[:\s]*Interactive\s*Manual\s*Verification[\s\S]*?(?=###\s*Step\s*5|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    const hasAskUserQuestion = /AskUserQuestion/i.test(step4Section[0]);
    assert.ok(
      hasAskUserQuestion,
      'Step 4 should document AskUserQuestion usage'
    );
  });

  test('should document Pass option for verification', () => {
    const hasPassOption = /["']?Pass["']?.*Verified\s*working|Pass.*description/i.test(verifyContent);
    assert.ok(
      hasPassOption,
      'verify.md should document Pass option for AskUserQuestion'
    );
  });

  test('should document Fail option for verification', () => {
    const hasFailOption = /["']?Fail["']?.*Issue\s*found|Fail.*description/i.test(verifyContent);
    assert.ok(
      hasFailOption,
      'verify.md should document Fail option for AskUserQuestion'
    );
  });

  test('should document Skip option for verification', () => {
    const hasSkipOption = /["']?Skip["']?.*Cannot\s*verify|Skip.*description/i.test(verifyContent);
    assert.ok(
      hasSkipOption,
      'verify.md should document Skip option for AskUserQuestion'
    );
  });

  test('should document Need Info option for verification', () => {
    const hasNeedInfoOption = /["']?Need\s*Info["']?|Need\s*Info.*description|Requires\s*clarification/i.test(verifyContent);
    assert.ok(
      hasNeedInfoOption,
      'verify.md should document Need Info option for AskUserQuestion'
    );
  });

  test('should show example interaction flow', () => {
    const hasExampleFlow = /Example\s*Interaction\s*Flow|\[User\s*selects:/i.test(verifyContent);
    assert.ok(
      hasExampleFlow,
      'verify.md should show example interaction flow'
    );
  });
});

// ============================================================================
// Test 5: Report Schema Documentation (--report flag)
// ============================================================================

describe('Test 5: Report Schema Documentation', () => {
  test('Step 7 should document --report flag', () => {
    const step7Section = verifyContent.match(/###\s*Step\s*7[:\s]*Generate\s*UAT\s*Report[\s\S]*?(?=###\s*Step\s*8|##\s*Examples|$)/i);
    assert.ok(step7Section, 'Could not find Step 7 section');

    const hasReportFlag = /--report/i.test(step7Section[0]);
    assert.ok(
      hasReportFlag,
      'Step 7 should document --report flag'
    );
  });

  test('should document report file path (.tiki/reports/uat-issue-<number>.json)', () => {
    const hasReportPath = /\.tiki\/reports\/uat-issue|uat-issue-.*\.json/i.test(verifyContent);
    assert.ok(
      hasReportPath,
      'verify.md should document report file path'
    );
  });

  test('should include JSON schema example for report', () => {
    const hasJsonSchema = /```json[\s\S]*?"issue"[\s\S]*?"summary"[\s\S]*?"phases"[\s\S]*?```/i.test(verifyContent);
    assert.ok(
      hasJsonSchema,
      'verify.md should include JSON schema example for report'
    );
  });

  test('report schema should include issue metadata', () => {
    const hasIssueMetadata = /"issue"[\s\S]*?"number"[\s\S]*?"title"/i.test(verifyContent);
    assert.ok(
      hasIssueMetadata,
      'Report schema should include issue metadata (number, title)'
    );
  });

  test('report schema should include summary with pass/fail/skip counts', () => {
    const hasSummaryCounts = /"summary"[\s\S]*?"total"[\s\S]*?"passed"[\s\S]*?"failed"[\s\S]*?"skipped"/i.test(verifyContent);
    assert.ok(
      hasSummaryCounts,
      'Report schema should include summary with pass/fail/skip counts'
    );
  });

  test('report schema should include passRate', () => {
    const hasPassRate = /"passRate"/i.test(verifyContent);
    assert.ok(
      hasPassRate,
      'Report schema should include passRate'
    );
  });

  test('report schema should include phases array with items', () => {
    const hasPhasesArray = /"phases"[\s\S]*?\[[\s\S]*?"items"[\s\S]*?\]/i.test(verifyContent);
    assert.ok(
      hasPhasesArray,
      'Report schema should include phases array with items'
    );
  });
});

// ============================================================================
// Test 6: Classification Rules for Automated Verification
// ============================================================================

describe('Test 6: Classification Rules for Automated Verification', () => {
  test('should document classification rules in Step 3', () => {
    const hasClassificationRules = /Classification\s*Rules|classifyVerification/i.test(verifyContent);
    assert.ok(
      hasClassificationRules,
      'verify.md should document classification rules'
    );
  });

  test('should document file existence check type', () => {
    const hasFileExists = /file_exists|file\s*existence/i.test(verifyContent);
    assert.ok(
      hasFileExists,
      'verify.md should document file existence check type'
    );
  });

  test('should document content check type', () => {
    const hasContentCheck = /content_check|contains.*includes/i.test(verifyContent);
    assert.ok(
      hasContentCheck,
      'verify.md should document content check type'
    );
  });

  test('should document test execution type', () => {
    const hasRunTests = /run_tests|tests\s*pass/i.test(verifyContent);
    assert.ok(
      hasRunTests,
      'verify.md should document test execution type'
    );
  });

  test('should document manual fallback type', () => {
    const hasManualType = /type:\s*['"]?manual['"]?|manual.*automatable.*false/i.test(verifyContent);
    assert.ok(
      hasManualType,
      'verify.md should document manual fallback type'
    );
  });
});

// ============================================================================
// Test 7: Summary Display with Pass/Fail/Skip/Pending Counts
// ============================================================================

describe('Test 7: Summary Display', () => {
  test('Step 6 should show summary table format', () => {
    const step6Section = verifyContent.match(/###\s*Step\s*6[:\s]*Display\s*Summary[\s\S]*?(?=###\s*Step\s*7|$)/i);
    assert.ok(step6Section, 'Could not find Step 6 section');

    const hasTable = /\|\s*Status\s*\|\s*Count\s*\|/i.test(step6Section[0]);
    assert.ok(
      hasTable,
      'Step 6 should show summary table format'
    );
  });

  test('summary should include Passed count', () => {
    const hasPassed = /\|\s*Passed\s*\|/i.test(verifyContent);
    assert.ok(
      hasPassed,
      'Summary should include Passed count'
    );
  });

  test('summary should include Failed count', () => {
    const hasFailed = /\|\s*Failed\s*\|/i.test(verifyContent);
    assert.ok(
      hasFailed,
      'Summary should include Failed count'
    );
  });

  test('summary should include Skipped count', () => {
    const hasSkipped = /\|\s*Skipped\s*\|/i.test(verifyContent);
    assert.ok(
      hasSkipped,
      'Summary should include Skipped count'
    );
  });

  test('summary should include Pending count', () => {
    const hasPending = /\|\s*Pending\s*\|/i.test(verifyContent);
    assert.ok(
      hasPending,
      'Summary should include Pending count'
    );
  });

  test('summary should display pass rate percentage', () => {
    const hasPassRate = /Pass\s*Rate.*%/i.test(verifyContent);
    assert.ok(
      hasPassRate,
      'Summary should display pass rate percentage'
    );
  });
});

// ============================================================================
// Test 8: Result Tracking Structure
// ============================================================================

describe('Test 8: Result Tracking Structure', () => {
  test('should document result object structure in Step 5', () => {
    const step5Section = verifyContent.match(/###\s*Step\s*5[:\s]*Track\s*Verification\s*Results[\s\S]*?(?=###\s*Step\s*6|$)/i);
    assert.ok(step5Section, 'Could not find Step 5 section');

    const hasResultStructure = /const\s*results\s*=|Result\s*Object\s*Structure/i.test(step5Section[0]);
    assert.ok(
      hasResultStructure,
      'Step 5 should document result object structure'
    );
  });

  test('result tracking should include verifiedAt timestamp', () => {
    const hasVerifiedAt = /verifiedAt.*timestamp|verifiedAt.*ISO|new\s*Date\(\)\.toISOString/i.test(verifyContent);
    assert.ok(
      hasVerifiedAt,
      'Result tracking should include verifiedAt timestamp'
    );
  });

  test('result tracking should include notes field', () => {
    const hasNotes = /notes:\s*null|notes:\s*["']|item\.notes/i.test(verifyContent);
    assert.ok(
      hasNotes,
      'Result tracking should include notes field for user comments'
    );
  });
});

// ============================================================================
// Test 9: Examples Section
// ============================================================================

describe('Test 9: Examples Section', () => {
  test('should have Examples section', () => {
    const hasExamples = /##\s*Examples/i.test(verifyContent);
    assert.ok(
      hasExamples,
      'verify.md should have Examples section'
    );
  });

  test('should include example with all passing verifications', () => {
    const hasAllPassingExample = /All\s*verifications\s*passed|100%.*pass/i.test(verifyContent);
    assert.ok(
      hasAllPassingExample,
      'verify.md should include example with all passing verifications'
    );
  });

  test('should include example with failures', () => {
    const hasFailureExample = /Verification\s*with\s*Failures|\[FAIL\]/i.test(verifyContent);
    assert.ok(
      hasFailureExample,
      'verify.md should include example with failures'
    );
  });

  test('should include example with --report flag', () => {
    const hasReportExample = /Example.*Generate\s*Report|\/tiki:verify.*--report/i.test(verifyContent);
    assert.ok(
      hasReportExample,
      'verify.md should include example with --report flag'
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
