/**
 * TDD Tests for Phase 1: Add auto-fix configuration schema and reading logic
 * Issue #12: Add auto-fix infrastructure for verification failures
 *
 * These tests verify that:
 * 1. config.json contains the autoFix section with proper fields
 * 2. execute.md documents reading autoFix settings
 * 3. execute.md includes user prompt for "prompt" mode
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const CONFIG_PATH = path.join(__dirname, '../../../.tiki/config.json');
const EXECUTE_PATH = path.join(__dirname, '../../../.claude/commands/tiki/execute.md');

let configContent = '';
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

// Load the file contents before running tests
try {
  configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read config.json: ${error.message}`);
  process.exit(1);
}

try {
  executeContent = fs.readFileSync(EXECUTE_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read execute.md: ${error.message}`);
  process.exit(1);
}

// Parse config as JSON for structural checks
let config = {};
try {
  config = JSON.parse(configContent);
} catch (error) {
  console.error(`Failed to parse config.json as JSON: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite: config.json - autoFix Section Exists
// ============================================================================

describe('config.json: autoFix Section', () => {
  test('should have autoFix section in config.json', () => {
    assert.ok(
      config.hasOwnProperty('autoFix'),
      'config.json is missing "autoFix" section'
    );
  });

  test('autoFix section should be an object', () => {
    assert.ok(
      typeof config.autoFix === 'object' && config.autoFix !== null,
      'autoFix should be an object, not ' + typeof config.autoFix
    );
  });
});

// ============================================================================
// Test Suite: config.json - autoFix.enabled Field
// ============================================================================

describe('config.json: autoFix.enabled Field', () => {
  test('autoFix should have "enabled" field', () => {
    assert.ok(
      config.autoFix && config.autoFix.hasOwnProperty('enabled'),
      'autoFix is missing "enabled" field'
    );
  });

  test('autoFix.enabled should be a valid value (true, false, or "prompt")', () => {
    const validValues = [true, false, 'prompt'];
    assert.ok(
      config.autoFix && validValues.includes(config.autoFix.enabled),
      `autoFix.enabled should be true, false, or "prompt", got: ${config.autoFix?.enabled}`
    );
  });
});

// ============================================================================
// Test Suite: config.json - autoFix.maxAttempts Field
// ============================================================================

describe('config.json: autoFix.maxAttempts Field', () => {
  test('autoFix should have "maxAttempts" field', () => {
    assert.ok(
      config.autoFix && config.autoFix.hasOwnProperty('maxAttempts'),
      'autoFix is missing "maxAttempts" field'
    );
  });

  test('autoFix.maxAttempts should be a positive number', () => {
    assert.ok(
      config.autoFix && typeof config.autoFix.maxAttempts === 'number' && config.autoFix.maxAttempts > 0,
      `autoFix.maxAttempts should be a positive number, got: ${config.autoFix?.maxAttempts}`
    );
  });
});

// ============================================================================
// Test Suite: config.json - autoFix.strategies Field
// ============================================================================

describe('config.json: autoFix.strategies Field', () => {
  test('autoFix should have "strategies" field', () => {
    assert.ok(
      config.autoFix && config.autoFix.hasOwnProperty('strategies'),
      'autoFix is missing "strategies" field'
    );
  });

  test('autoFix.strategies should be an array', () => {
    assert.ok(
      config.autoFix && Array.isArray(config.autoFix.strategies),
      `autoFix.strategies should be an array, got: ${typeof config.autoFix?.strategies}`
    );
  });

  test('autoFix.strategies should contain at least one strategy', () => {
    assert.ok(
      config.autoFix && Array.isArray(config.autoFix.strategies) && config.autoFix.strategies.length > 0,
      'autoFix.strategies should contain at least one strategy'
    );
  });
});

// ============================================================================
// Test Suite: execute.md - autoFix.enabled Documentation
// ============================================================================

describe('execute.md: autoFix.enabled Documentation', () => {
  test('execute.md should document autoFix.enabled setting', () => {
    const hasAutoFixEnabled = /autoFix\.enabled/i.test(executeContent);
    assert.ok(
      hasAutoFixEnabled,
      'execute.md should document "autoFix.enabled" setting extraction'
    );
  });

  test('execute.md should explain autoFix.enabled values (true/false/prompt)', () => {
    const hasEnabledValues = /autoFix\.enabled.*true|autoFix\.enabled.*false|autoFix\.enabled.*prompt/i.test(executeContent) ||
                             /enabled.*true.*false.*prompt/i.test(executeContent);
    assert.ok(
      hasEnabledValues,
      'execute.md should explain autoFix.enabled values (true, false, or "prompt")'
    );
  });
});

// ============================================================================
// Test Suite: execute.md - autoFix.maxAttempts Documentation
// ============================================================================

describe('execute.md: autoFix.maxAttempts Documentation', () => {
  test('execute.md should document autoFix.maxAttempts setting', () => {
    const hasMaxAttempts = /autoFix\.maxAttempts|maxAttempts/i.test(executeContent);
    assert.ok(
      hasMaxAttempts,
      'execute.md should document "autoFix.maxAttempts" setting extraction'
    );
  });

  test('execute.md should describe maxAttempts as retry limit', () => {
    const hasRetryDescription = /maxAttempts.*retr|maxAttempts.*attempt|retry.*maxAttempts|attempts.*limit/i.test(executeContent);
    assert.ok(
      hasRetryDescription,
      'execute.md should describe maxAttempts as retry/attempt limit'
    );
  });
});

// ============================================================================
// Test Suite: execute.md - User Prompt for "prompt" Mode
// ============================================================================

describe('execute.md: User Prompt for "prompt" Mode', () => {
  test('execute.md should include user prompt section for autoFix "prompt" mode', () => {
    // Look for a user prompt/confirmation section specific to auto-fix
    const hasAutoFixPrompt = /autoFix.*prompt.*user|prompt.*auto[-\s]?fix|auto[-\s]?fix.*ask|verification\s*fail.*prompt/i.test(executeContent);
    assert.ok(
      hasAutoFixPrompt,
      'execute.md should include user prompt section for autoFix "prompt" mode'
    );
  });

  test('execute.md should show prompt options for auto-fix (yes/no/skip)', () => {
    // Look for options in the auto-fix prompt
    const hasPromptOptions = /auto[-\s]?fix.*\[.*y.*\]|auto[-\s]?fix.*yes.*no|attempt.*auto.*fix.*\?/i.test(executeContent);
    assert.ok(
      hasPromptOptions,
      'execute.md should show prompt options for auto-fix decision'
    );
  });

  test('execute.md should document when prompt is shown (verification failure)', () => {
    // The prompt should be shown when verification fails
    const hasVerificationContext = /verif(y|ication).*fail.*auto[-\s]?fix|auto[-\s]?fix.*verif(y|ication).*fail/i.test(executeContent);
    assert.ok(
      hasVerificationContext,
      'execute.md should document that prompt is shown on verification failure'
    );
  });
});

// ============================================================================
// Test Suite: execute.md - Step 2 Configuration Extraction
// ============================================================================

describe('execute.md: Step 2 autoFix Settings Extraction', () => {
  test('Step 2 should mention extracting autoFix settings', () => {
    // Find Step 2 section and check for autoFix extraction
    const step2Section = executeContent.match(/###\s*Step\s*2[:\s]*Read\s*Project\s*Context[\s\S]*?(?=###|$)/i);
    assert.ok(step2Section, 'Could not find Step 2 section');

    const hasAutoFixExtraction = /autoFix/i.test(step2Section[0]);
    assert.ok(
      hasAutoFixExtraction,
      'Step 2 should mention extracting autoFix settings from config'
    );
  });

  test('Step 2 should list autoFix settings alongside TDD settings', () => {
    // autoFix settings should be documented similarly to TDD settings
    const step2Section = executeContent.match(/###\s*Step\s*2[:\s]*Read\s*Project\s*Context[\s\S]*?(?=###|$)/i);
    assert.ok(step2Section, 'Could not find Step 2 section');

    const hasBothSettings = /testing\./i.test(step2Section[0]) && /autoFix\./i.test(step2Section[0]);
    assert.ok(
      hasBothSettings,
      'Step 2 should list both testing and autoFix settings'
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
