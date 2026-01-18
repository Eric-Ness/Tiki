/**
 * TDD Tests for Issue #29: Add Context Window Status Display
 * Phase 2: Add context budget tracking to execute.md during phase execution
 *
 * These tests verify that execute.md contains the required sections for
 * context budget tracking during phase execution.
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
// Test Suite: Pre-Phase Context Estimation
// ============================================================================

describe('Pre-Phase Context Estimation', () => {
  test('should show context estimate before each phase execution', () => {
    const hasContextEstimate = /context\s*estimate|estimate.*context.*phase|context.*budget.*phase/i.test(content);
    assert.ok(hasContextEstimate, 'Missing context estimate before phase execution');
  });

  test('should include token estimation formula', () => {
    const hasTokenFormula = /token|characters?\s*[\/÷]\s*4|\/\s*4/i.test(content);
    assert.ok(hasTokenFormula, 'Missing token estimation formula');
  });
});

// ============================================================================
// Test Suite: Phase Context Warning
// ============================================================================

describe('Phase Context Warning', () => {
  test('should include warning for phases exceeding 40K token threshold', () => {
    const has40KWarning = /40K|40,?000.*token|large\s*phase.*warning|warning.*large\s*phase/i.test(content);
    assert.ok(has40KWarning, 'Missing warning for phases exceeding 40K tokens');
  });
});

// ============================================================================
// Test Suite: Summary Growth Tracking
// ============================================================================

describe('Summary Growth Tracking During Execution', () => {
  test('should track summary growth after phase completion', () => {
    const hasSummaryTracking = /summary\s*(growth|length|size|token)|track.*summar(y|ies)|cumulative\s*summar(y|ies)/i.test(content);
    assert.ok(hasSummaryTracking, 'Missing summary growth tracking');
  });
});

// ============================================================================
// Test Suite: Cumulative Context Tracking
// ============================================================================

describe('Cumulative Context Tracking', () => {
  test('should include cumulative context tracking in progress reports', () => {
    const hasCumulativeTracking = /cumulative|running.*context|context.*used|context.*total/i.test(content);
    assert.ok(hasCumulativeTracking, 'Missing cumulative context tracking in progress reports');
  });
});

// ============================================================================
// Test Suite: Context Budget Overview
// ============================================================================

describe('Pre-Execution Context Budget Overview', () => {
  test('should show context budget overview at start of execution', () => {
    const hasOverview = /context\s*budget\s*overview|budget.*overview|overview.*context/i.test(content);
    assert.ok(hasOverview, 'Missing context budget overview at execution start');
  });
});

// ============================================================================
// Test Suite: Completion Context Summary
// ============================================================================

describe('Context Usage Summary at Completion', () => {
  test('should show context usage summary at execution completion', () => {
    const hasCompletionSummary = /context.*summary|summary.*context|usage\s*summary/i.test(content);
    assert.ok(hasCompletionSummary, 'Missing context usage summary at completion');
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
