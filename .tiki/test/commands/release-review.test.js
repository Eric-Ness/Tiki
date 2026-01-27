/**
 * Tests for /tiki:release-review command
 *
 * Verifies that release-review.md contains required sections and patterns
 * for deep review workflow of all issues in a release.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const COMMAND_PATH = path.join(__dirname, '../../../.claude/commands/tiki/release-review.md');
const PROMPTS_DIR = path.join(__dirname, '../../prompts/release-review');

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
  content = fs.readFileSync(COMMAND_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read release-review.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite: Command Structure
// ============================================================================

describe('Command Structure', () => {
  test('should have correct YAML frontmatter', () => {
    const hasFrontmatter = /^---\s*\n[\s\S]*?type:\s*prompt[\s\S]*?name:\s*tiki:release-review[\s\S]*?---/m.test(content);
    assert.ok(hasFrontmatter, 'Missing or incorrect YAML frontmatter');
  });

  test('should have description in frontmatter', () => {
    const hasDescription = /description:.*review.*issues.*release/i.test(content);
    assert.ok(hasDescription, 'Missing description in frontmatter');
  });

  test('should have allowed-tools including Task', () => {
    const hasTask = /allowed-tools:.*Task/i.test(content);
    assert.ok(hasTask, 'allowed-tools should include Task for spawning sub-agents');
  });

  test('should have argument-hint', () => {
    const hasArgHint = /argument-hint:.*version/i.test(content);
    assert.ok(hasArgHint, 'Missing argument-hint');
  });
});

// ============================================================================
// Test Suite: Usage Section
// ============================================================================

describe('Usage Section', () => {
  test('should have Usage section', () => {
    const hasUsage = /##\s*Usage/i.test(content);
    assert.ok(hasUsage, 'Missing Usage section');
  });

  test('should show version argument example', () => {
    const hasVersionExample = /release-review\s+v\d/i.test(content);
    assert.ok(hasVersionExample, 'Should show version argument example');
  });

  test('should document --quiet flag', () => {
    const hasQuiet = /--quiet/i.test(content);
    assert.ok(hasQuiet, 'Should document --quiet flag');
  });

  test('should document --no-comment flag', () => {
    const hasNoComment = /--no-comment/i.test(content);
    assert.ok(hasNoComment, 'Should document --no-comment flag');
  });
});

// ============================================================================
// Test Suite: Step 1 - Parse Arguments
// ============================================================================

describe('Step 1: Parse Arguments', () => {
  test('should have Step 1 for parsing arguments', () => {
    const hasStep1 = /###\s*Step\s*1[:\s]*Parse\s*Arguments/i.test(content);
    assert.ok(hasStep1, 'Missing Step 1: Parse Arguments');
  });

  test('should parse version from arguments', () => {
    const parsesVersion = /version|release\s*version/i.test(content);
    assert.ok(parsesVersion, 'Should parse version from arguments');
  });
});

// ============================================================================
// Test Suite: Step 2 - Load Release
// ============================================================================

describe('Step 2: Load Release', () => {
  test('should have Step 2 for loading release', () => {
    const hasStep2 = /###\s*Step\s*2[:\s]*Load\s*Release/i.test(content);
    assert.ok(hasStep2, 'Missing Step 2: Load Release');
  });

  test('should load from .tiki/releases/', () => {
    const loadsRelease = /\.tiki\/releases/i.test(content);
    assert.ok(loadsRelease, 'Should load from .tiki/releases/');
  });

  test('should handle active release if no version specified', () => {
    const handlesActive = /active\s*release|status.*active/i.test(content);
    assert.ok(handlesActive, 'Should handle active release if no version specified');
  });
});

// ============================================================================
// Test Suite: Step 4 - Review Loop
// ============================================================================

describe('Step 4: Review Loop', () => {
  test('should have Step 4 for review loop', () => {
    const hasStep4 = /###\s*Step\s*4[:\s]*Review\s*Loop/i.test(content);
    assert.ok(hasStep4, 'Missing Step 4: Review Loop');
  });

  test('should iterate through each issue', () => {
    const iterates = /for\s*each\s*issue|each\s*issue\s*in/i.test(content);
    assert.ok(iterates, 'Should iterate through each issue');
  });

  test('should run review-issue via Task tool', () => {
    const usesTask = /Task\s*tool|spawn.*sub-agent|review-issue/i.test(content);
    assert.ok(usesTask, 'Should run review-issue via Task tool');
  });

  test('should use --yolo flag for structured output', () => {
    const usesYolo = /--yolo/i.test(content);
    assert.ok(usesYolo, 'Should use --yolo flag for structured output');
  });

  test('should parse REVIEW_RESULT JSON', () => {
    const parsesResult = /REVIEW_RESULT|verdict/i.test(content);
    assert.ok(parsesResult, 'Should parse REVIEW_RESULT JSON');
  });

  test('should handle clean verdict', () => {
    const handlesClean = /clean|verdict.*clean/i.test(content);
    assert.ok(handlesClean, 'Should handle clean verdict');
  });

  test('should handle warnings verdict', () => {
    const handlesWarnings = /warnings|verdict.*warnings/i.test(content);
    assert.ok(handlesWarnings, 'Should handle warnings verdict');
  });

  test('should handle blocked verdict', () => {
    const handlesBlocked = /blocked|verdict.*blocked/i.test(content);
    assert.ok(handlesBlocked, 'Should handle blocked verdict');
  });
});

// ============================================================================
// Test Suite: Step 5 - Deep Dive
// ============================================================================

describe('Step 5: Deep Dive', () => {
  test('should have Step 5 for deep dive', () => {
    const hasStep5 = /###\s*Step\s*5[:\s]*Deep\s*Dive/i.test(content);
    assert.ok(hasStep5, 'Missing Step 5: Deep Dive');
  });

  test('should only trigger on warnings or blocked', () => {
    const conditional = /warnings.*blocked|blocked.*warnings|verdict.*warnings|verdict.*blocked/i.test(content);
    assert.ok(conditional, 'Deep dive should only trigger on warnings or blocked');
  });

  test('should load deep-dive.md prompt', () => {
    const loadsPrompt = /deep-dive\.md|prompts\/release-review/i.test(content);
    assert.ok(loadsPrompt, 'Should load deep-dive.md prompt');
  });
});

// ============================================================================
// Test Suite: Step 6 - Post GitHub Comment
// ============================================================================

describe('Step 6: Post GitHub Comment', () => {
  test('should have Step 6 for posting comment', () => {
    const hasStep6 = /###\s*Step\s*6[:\s]*Post\s*GitHub\s*Comment/i.test(content);
    assert.ok(hasStep6, 'Missing Step 6: Post GitHub Comment');
  });

  test('should use gh issue comment', () => {
    const usesGh = /gh\s*issue\s*comment/i.test(content);
    assert.ok(usesGh, 'Should use gh issue comment');
  });

  test('should respect --no-comment flag', () => {
    const respectsFlag = /--no-comment|skip.*comment/i.test(content);
    assert.ok(respectsFlag, 'Should respect --no-comment flag');
  });
});

// ============================================================================
// Test Suite: Step 8 - Display Summary
// ============================================================================

describe('Step 8: Display Summary', () => {
  test('should have Step 8 for summary', () => {
    const hasStep8 = /###\s*Step\s*8[:\s]*Display\s*Summary/i.test(content);
    assert.ok(hasStep8, 'Missing Step 8: Display Summary');
  });

  test('should display summary table', () => {
    const hasTable = /summary\s*table|\|\s*Issue/i.test(content);
    assert.ok(hasTable, 'Should display summary table');
  });

  test('should show counts for each verdict type', () => {
    const showsCounts = /clean.*warnings.*blocked|reviewed.*clean|warnings.*blocked/i.test(content);
    assert.ok(showsCounts, 'Should show counts for each verdict type');
  });

  test('should suggest next steps', () => {
    const hasNextSteps = /next\s*steps|release-yolo/i.test(content);
    assert.ok(hasNextSteps, 'Should suggest next steps');
  });
});

// ============================================================================
// Test Suite: Conditional Prompts Exist
// ============================================================================

describe('Conditional Prompts', () => {
  test('deep-dive.md prompt file should exist', () => {
    const exists = fs.existsSync(path.join(PROMPTS_DIR, 'deep-dive.md'));
    assert.ok(exists, 'Missing deep-dive.md prompt file');
  });

  test('github-comment.md prompt file should exist', () => {
    const exists = fs.existsSync(path.join(PROMPTS_DIR, 'github-comment.md'));
    assert.ok(exists, 'Missing github-comment.md prompt file');
  });

  test('summary-table.md prompt file should exist', () => {
    const exists = fs.existsSync(path.join(PROMPTS_DIR, 'summary-table.md'));
    assert.ok(exists, 'Missing summary-table.md prompt file');
  });
});

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

describe('Error Handling', () => {
  test('should have Error Handling section', () => {
    const hasSection = /##\s*Error\s*Handling/i.test(content);
    assert.ok(hasSection, 'Missing Error Handling section');
  });

  test('should handle release not found', () => {
    const handlesNotFound = /release\s*not\s*found|not\s*found.*release/i.test(content);
    assert.ok(handlesNotFound, 'Should handle release not found');
  });

  test('should handle gh CLI errors', () => {
    const handlesGhError = /gh\s*CLI|CLI\s*error|gh.*error/i.test(content);
    assert.ok(handlesGhError, 'Should handle gh CLI errors');
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
