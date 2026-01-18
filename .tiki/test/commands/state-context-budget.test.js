/**
 * TDD Tests for Issue #29: Add Context Window Status Display
 * Phase 1: Add context budget estimation and display to state.md
 *
 * These tests verify that state.md contains the required sections for
 * context budget estimation and display.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const STATE_PATH = path.join(__dirname, '../../../.claude/commands/tiki/state.md');

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
  content = fs.readFileSync(STATE_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read state.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite: Context Budget Step
// ============================================================================

describe('Context Budget Estimation Step', () => {
  test('should have a Context Budget or Estimate Context step in Instructions', () => {
    const hasContextBudgetStep = /###\s*Step\s*[\d.]+[:\s]*.*Context\s*Budget|###\s*Step\s*[\d.]+[:\s]*Estimate\s*Context/i.test(content);
    assert.ok(hasContextBudgetStep, 'Missing Context Budget step in state.md');
  });

  test('should include token estimation formula using characters / 4', () => {
    const hasTokenFormula = /characters?\s*[\/÷]\s*4|\/\s*4.*token|token.*estimate|4\s*characters?\s*per\s*token/i.test(content);
    assert.ok(hasTokenFormula, 'Missing token estimation formula (characters / 4)');
  });

  test('should read phase content for estimation', () => {
    const hasPhaseContent = /phase\.content|phase\s*content\s*(length|size)|phaseContentTokens/i.test(content);
    assert.ok(hasPhaseContent, 'Should mention reading phase content for estimation');
  });

  test('should include CLAUDE.md in estimation', () => {
    const hasClaudeMd = /CLAUDE\.md|claudeMd|project\s*context/i.test(content);
    assert.ok(hasClaudeMd, 'Should include CLAUDE.md in token estimation');
  });

  test('should include previous summaries in estimation', () => {
    const hasSummaries = /previous\s*summar(y|ies)|completedPhases|phase\s*summar(y|ies)/i.test(content);
    assert.ok(hasSummaries, 'Should include previous summaries in token estimation');
  });
});

// ============================================================================
// Test Suite: Visual Usage Indicator
// ============================================================================

describe('Visual Usage Indicator', () => {
  test('should show visual progress bar style indicator', () => {
    const hasProgressBar = /█|░|▓|progress\s*bar|usage.*bar|bar.*usage/i.test(content);
    assert.ok(hasProgressBar, 'Missing visual progress bar indicator');
  });

  test('should define usage level thresholds (Low/Medium/High)', () => {
    const hasLowThreshold = /low/i.test(content);
    const hasMediumThreshold = /medium/i.test(content);
    const hasHighThreshold = /high|critical/i.test(content);
    assert.ok(hasLowThreshold && hasMediumThreshold && hasHighThreshold,
      'Should define Low/Medium/High usage thresholds');
  });

  test('should mention token count thresholds', () => {
    const hasThresholdNumbers = /30K|40K|60K|80K|30,?000|40,?000|60,?000|80,?000|100K|100,?000/i.test(content);
    assert.ok(hasThresholdNumbers, 'Should mention specific token count thresholds');
  });
});

// ============================================================================
// Test Suite: Warning Display
// ============================================================================

describe('Warning Display for Large Phases', () => {
  test('should include warning for phases exceeding ~40K tokens', () => {
    const hasLargePhaseWarning = /warning.*40K|warn.*large\s*phase|⚠.*phase|large\s*phase.*warning/i.test(content);
    assert.ok(hasLargePhaseWarning, 'Missing warning for large phases (~40K tokens)');
  });

  test('should have warning symbol or format', () => {
    const hasWarningFormat = /⚠|Warning:|WARN|caution/i.test(content);
    assert.ok(hasWarningFormat, 'Should have warning symbol or format');
  });
});

// ============================================================================
// Test Suite: Summary Growth Tracking
// ============================================================================

describe('Summary Growth Tracking', () => {
  test('should track summary growth across phases', () => {
    const hasSummaryGrowth = /summary\s*growth|summar(y|ies).*grow|track.*summar(y|ies)|cumulative\s*summar(y|ies)/i.test(content);
    assert.ok(hasSummaryGrowth, 'Missing summary growth tracking');
  });

  test('should mention average summary size or comparison', () => {
    const hasAverageComparison = /average|avg|per\s*phase|across.*phases/i.test(content);
    assert.ok(hasAverageComparison, 'Should mention average or per-phase summary metrics');
  });
});

// ============================================================================
// Test Suite: Context Budget Display Output
// ============================================================================

describe('Context Budget Display Output', () => {
  test('should have Context Budget section in display format', () => {
    const hasContextBudgetSection = /###?\s*Context\s*Budget|Context\s*Budget.*:|Budget.*Next\s*Phase/i.test(content);
    assert.ok(hasContextBudgetSection, 'Missing Context Budget section in display output');
  });

  test('should show component breakdown table', () => {
    const hasComponentTable = /\|\s*Component\s*\||\|\s*Phase\s*content\s*\||\|\s*Files\s*\||\|\s*Est\.\s*Tokens\s*\|/i.test(content);
    assert.ok(hasComponentTable, 'Should show component breakdown table');
  });

  test('should show total estimate', () => {
    const hasTotalEstimate = /total|Total.*~?\d/i.test(content);
    assert.ok(hasTotalEstimate, 'Should show total token estimate');
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
