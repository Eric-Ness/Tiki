/**
 * Tests for /tiki:pick-issue command
 * Issue #32: Add /tiki:pick-issue to recommend which GitHub issue to work on next
 *
 * These tests verify that pick-issue.md contains the required sections and patterns.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PICK_ISSUE_PATH = path.join(__dirname, '../../../.claude/commands/tiki/pick-issue.md');

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
  content = fs.readFileSync(PICK_ISSUE_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read pick-issue.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite: YAML Frontmatter
// ============================================================================

describe('YAML Frontmatter', () => {
  test('should have valid YAML frontmatter', () => {
    const hasFrontmatter = /^---\n[\s\S]*?\n---/.test(content);
    assert.ok(hasFrontmatter, 'Missing YAML frontmatter');
  });

  test('should have type: prompt', () => {
    const hasType = /type:\s*prompt/.test(content);
    assert.ok(hasType, 'Missing type: prompt');
  });

  test('should have name: tiki:pick-issue', () => {
    const hasName = /name:\s*tiki:pick-issue/.test(content);
    assert.ok(hasName, 'Missing name: tiki:pick-issue');
  });

  test('should have description', () => {
    const hasDescription = /description:/.test(content);
    assert.ok(hasDescription, 'Missing description');
  });

  test('should have allowed-tools', () => {
    const hasAllowedTools = /allowed-tools:/.test(content);
    assert.ok(hasAllowedTools, 'Missing allowed-tools');
  });
});

// ============================================================================
// Test Suite: Required Sections
// ============================================================================

describe('Required Sections', () => {
  test('should have Usage section', () => {
    const hasUsage = /##\s*Usage/i.test(content);
    assert.ok(hasUsage, 'Missing Usage section');
  });

  test('should have Instructions section', () => {
    const hasInstructions = /##\s*Instructions/i.test(content);
    assert.ok(hasInstructions, 'Missing Instructions section');
  });

  test('should have Output Format section', () => {
    const hasOutputFormat = /##\s*Output\s*Format/i.test(content);
    assert.ok(hasOutputFormat, 'Missing Output Format section');
  });

  test('should have Configuration section', () => {
    const hasConfiguration = /##\s*Configuration/i.test(content);
    assert.ok(hasConfiguration, 'Missing Configuration section');
  });

  test('should have Error Handling section', () => {
    const hasErrorHandling = /##\s*Error\s*Handling/i.test(content);
    assert.ok(hasErrorHandling, 'Missing Error Handling section');
  });

  test('should have comparison with /tiki:whats-next', () => {
    const hasComparison = /whats-next|what's-next/i.test(content);
    assert.ok(hasComparison, 'Missing comparison with /tiki:whats-next');
  });
});

// ============================================================================
// Test Suite: Issue Fetching
// ============================================================================

describe('Issue Fetching', () => {
  test('should include gh issue list command', () => {
    const hasGhCommand = /gh\s+issue\s+list/i.test(content);
    assert.ok(hasGhCommand, 'Missing gh issue list command');
  });

  test('should use --json flag with required fields', () => {
    const hasJsonFields = /--json.*number.*title|--json.*title.*number/i.test(content);
    assert.ok(hasJsonFields, 'Missing --json with number and title fields');
  });

  test('should support --limit argument', () => {
    const hasLimit = /--limit/i.test(content);
    assert.ok(hasLimit, 'Missing --limit support');
  });

  test('should have default limit of 25', () => {
    const hasDefault25 = /default.*25|25.*default/i.test(content);
    assert.ok(hasDefault25, 'Missing default limit of 25');
  });
});

// ============================================================================
// Test Suite: Dependency Detection
// ============================================================================

describe('Dependency Detection', () => {
  test('should detect "blocked by #N" pattern', () => {
    const hasBlockedBy = /blocked\s*by\s*#/i.test(content);
    assert.ok(hasBlockedBy, 'Missing "blocked by #N" pattern');
  });

  test('should detect "depends on #N" pattern', () => {
    const hasDependsOn = /depends\s*on\s*#/i.test(content);
    assert.ok(hasDependsOn, 'Missing "depends on #N" pattern');
  });

  test('should detect "blocks #N" pattern', () => {
    const hasBlocks = /blocks\s*#/i.test(content);
    assert.ok(hasBlocks, 'Missing "blocks #N" pattern');
  });

  test('should document blockedBy map', () => {
    const hasBlockedByMap = /blockedBy/i.test(content);
    assert.ok(hasBlockedByMap, 'Missing blockedBy map documentation');
  });

  test('should document enables/blocks map', () => {
    const hasEnablesMap = /enables|unblocks/i.test(content);
    assert.ok(hasEnablesMap, 'Missing enables/unblocks map documentation');
  });
});

// ============================================================================
// Test Suite: Scoring Formula
// ============================================================================

describe('Scoring Formula', () => {
  test('should have +3 for preferred/high-priority label', () => {
    const hasPreferredBonus = /\+3.*prefer|prefer.*\+3|\+3.*high-priority|high-priority.*\+3/i.test(content);
    assert.ok(hasPreferredBonus, 'Missing +3 for preferred label');
  });

  test('should have +2 for blocking label', () => {
    const hasBlockingBonus = /\+2.*blocking|blocking.*\+2/i.test(content);
    assert.ok(hasBlockingBonus, 'Missing +2 for blocking label');
  });

  test('should have +2 per issue unblocked', () => {
    const hasUnblockBonus = /\+2.*per\s*issue|\+2.*enables|\+2.*unblocks/i.test(content);
    assert.ok(hasUnblockBonus, 'Missing +2 per issue unblocked');
  });

  test('should have +0.5 per week for age', () => {
    const hasAgeBonus = /\+0\.5.*week|week.*\+0\.5|age.*0\.5/i.test(content);
    assert.ok(hasAgeBonus, 'Missing +0.5 per week for age');
  });

  test('should have -5 if blocked by open issue', () => {
    const hasBlockedPenalty = /-5.*blocked|blocked.*-5/i.test(content);
    assert.ok(hasBlockedPenalty, 'Missing -5 for blocked issues');
  });

  test('should have -3 for deferred label', () => {
    const hasDeferredPenalty = /-3.*defer|defer.*-3/i.test(content);
    assert.ok(hasDeferredPenalty, 'Missing -3 for deferred label');
  });
});

// ============================================================================
// Test Suite: Output Format
// ============================================================================

describe('Output Format', () => {
  test('should show top 3 recommendations', () => {
    const hasTop3 = /top\s*3|1\.|2\.|3\./i.test(content);
    assert.ok(hasTop3, 'Missing top 3 recommendations format');
  });

  test('should include score in output', () => {
    const hasScore = /score/i.test(content);
    assert.ok(hasScore, 'Missing score in output');
  });

  test('should include reasoning for recommendations', () => {
    const hasReasoning = /why|reason|because/i.test(content);
    assert.ok(hasReasoning, 'Missing reasoning in output');
  });

  test('should suggest next command (/tiki:get-issue)', () => {
    const hasSuggestedCommand = /\/tiki:get-issue/i.test(content);
    assert.ok(hasSuggestedCommand, 'Missing suggested /tiki:get-issue command');
  });

  test('should show deferred issues section', () => {
    const hasDeferred = /deferred/i.test(content);
    assert.ok(hasDeferred, 'Missing deferred issues section');
  });

  test('should show blocked issues section', () => {
    const hasBlocked = /blocked.*issue|issue.*blocked/i.test(content);
    assert.ok(hasBlocked, 'Missing blocked issues section');
  });
});

// ============================================================================
// Test Suite: Configuration
// ============================================================================

describe('Configuration Options', () => {
  test('should document preferLabels option', () => {
    const hasPreferLabels = /preferLabels/i.test(content);
    assert.ok(hasPreferLabels, 'Missing preferLabels documentation');
  });

  test('should document deferLabels option', () => {
    const hasDeferLabels = /deferLabels/i.test(content);
    assert.ok(hasDeferLabels, 'Missing deferLabels documentation');
  });

  test('should document excludeLabels option', () => {
    const hasExcludeLabels = /excludeLabels/i.test(content);
    assert.ok(hasExcludeLabels, 'Missing excludeLabels documentation');
  });

  test('should document maxIssues option', () => {
    const hasMaxIssues = /maxIssues/i.test(content);
    assert.ok(hasMaxIssues, 'Missing maxIssues documentation');
  });

  test('should reference .tiki/config.json', () => {
    const hasConfigPath = /\.tiki\/config\.json|config\.json/i.test(content);
    assert.ok(hasConfigPath, 'Missing .tiki/config.json reference');
  });
});

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

describe('Error Handling', () => {
  test('should handle no issues found', () => {
    const hasNoIssues = /no\s*(open\s*)?issues\s*found/i.test(content);
    assert.ok(hasNoIssues, 'Missing no issues found error handling');
  });

  test('should handle GitHub CLI errors', () => {
    const hasGhError = /github\s*cli|gh\s*auth|error.*fetch/i.test(content);
    assert.ok(hasGhError, 'Missing GitHub CLI error handling');
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
