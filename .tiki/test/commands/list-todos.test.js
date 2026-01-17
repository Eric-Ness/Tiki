/**
 * TDD Tests for /tiki:list-todos command
 * Issue #25: Add /tiki:add-todo and /tiki:list-todos for backlog management
 *
 * These tests verify that list-todos.md contains the required sections and patterns
 * for viewing and managing todos.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const LIST_TODOS_PATH = path.join(__dirname, '../../../.claude/commands/tiki/list-todos.md');

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
  content = fs.readFileSync(LIST_TODOS_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read list-todos.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite: YAML Frontmatter
// ============================================================================

describe('YAML Frontmatter', () => {
  test('should have YAML frontmatter with type: prompt', () => {
    const hasTypePrompt = /^---[\s\S]*?type:\s*prompt[\s\S]*?---/m.test(content);
    assert.ok(hasTypePrompt, 'Missing "type: prompt" in YAML frontmatter');
  });

  test('should have name: tiki:list-todos', () => {
    const hasName = /^---[\s\S]*?name:\s*tiki:list-todos[\s\S]*?---/m.test(content);
    assert.ok(hasName, 'Missing "name: tiki:list-todos" in YAML frontmatter');
  });

  test('should have description field', () => {
    const hasDescription = /^---[\s\S]*?description:[\s\S]*?---/m.test(content);
    assert.ok(hasDescription, 'Missing "description" in YAML frontmatter');
  });

  test('should have allowed-tools including Read, Write, Bash, Glob', () => {
    const hasRead = /^---[\s\S]*?allowed-tools:[\s\S]*?Read[\s\S]*?---/m.test(content);
    const hasWrite = /^---[\s\S]*?allowed-tools:[\s\S]*?Write[\s\S]*?---/m.test(content);
    const hasBash = /^---[\s\S]*?allowed-tools:[\s\S]*?Bash[\s\S]*?---/m.test(content);
    const hasGlob = /^---[\s\S]*?allowed-tools:[\s\S]*?Glob[\s\S]*?---/m.test(content);
    assert.ok(hasRead && hasWrite && hasBash && hasGlob, 'Missing "allowed-tools" with Read, Write, Bash, Glob in YAML frontmatter');
  });

  test('should have argument-hint field', () => {
    const hasArgumentHint = /^---[\s\S]*?argument-hint:[\s\S]*?---/m.test(content);
    assert.ok(hasArgumentHint, 'Missing "argument-hint" in YAML frontmatter');
  });
});

// ============================================================================
// Test Suite: Usage Section
// ============================================================================

describe('Usage Section', () => {
  test('should have Usage section', () => {
    const hasUsage = /##\s*Usage/i.test(content);
    assert.ok(hasUsage, 'Missing "## Usage" section');
  });

  test('should show example without arguments (default)', () => {
    const hasDefaultExample = /\/tiki:list-todos\s*($|\n|`)/m.test(content);
    assert.ok(hasDefaultExample, 'Should show example without arguments');
  });

  test('should document --pending filter flag', () => {
    const hasPendingFlag = /--pending/i.test(content);
    assert.ok(hasPendingFlag, 'Should document --pending filter flag');
  });

  test('should document --completed filter flag', () => {
    const hasCompletedFlag = /--completed/i.test(content);
    assert.ok(hasCompletedFlag, 'Should document --completed filter flag');
  });

  test('should document --all filter flag', () => {
    const hasAllFlag = /--all/i.test(content);
    assert.ok(hasAllFlag, 'Should document --all filter flag');
  });

  test('should document --complete action flag', () => {
    const hasCompleteFlag = /--complete\s*<id>|--complete.*id/i.test(content);
    assert.ok(hasCompleteFlag, 'Should document --complete <id> action flag');
  });

  test('should document --convert action flag', () => {
    const hasConvertFlag = /--convert\s*<id>|--convert.*id/i.test(content);
    assert.ok(hasConvertFlag, 'Should document --convert <id> action flag');
  });

  test('should document --delete action flag', () => {
    const hasDeleteFlag = /--delete\s*<id>|--delete.*id/i.test(content);
    assert.ok(hasDeleteFlag, 'Should document --delete <id> action flag');
  });
});

// ============================================================================
// Test Suite: Instructions Section
// ============================================================================

describe('Instructions Section', () => {
  test('should have Instructions section', () => {
    const hasInstructions = /##\s*Instructions/i.test(content);
    assert.ok(hasInstructions, 'Missing "## Instructions" section');
  });

  test('should reference todos.json file path', () => {
    const hasTodosPath = /\.tiki\/todos\.json/i.test(content);
    assert.ok(hasTodosPath, 'Should reference .tiki/todos.json file path');
  });

  test('should parse filter flags from arguments', () => {
    const hasFilterParsing = /parse.*flag|filter.*flag|--pending|--completed|--all/i.test(content);
    assert.ok(hasFilterParsing, 'Should describe parsing filter flags from arguments');
  });

  test('should parse action flags from arguments', () => {
    const hasActionParsing = /--complete|--convert|--delete/i.test(content);
    assert.ok(hasActionParsing, 'Should describe parsing action flags from arguments');
  });
});

// ============================================================================
// Test Suite: Display Formatting
// ============================================================================

describe('Display Formatting', () => {
  test('should group todos by status (pending/completed)', () => {
    const hasStatusGrouping = /pending|completed/i.test(content) &&
                              (/##+\s*Pending|##+\s*Completed|group.*status/i.test(content));
    assert.ok(hasStatusGrouping, 'Should group todos by status (pending/completed)');
  });

  test('should show todo ID in display', () => {
    const hasIdDisplay = /\[todo-\d{3}\]|display.*id|show.*id/i.test(content);
    assert.ok(hasIdDisplay, 'Should show todo ID in display');
  });

  test('should show priority in display', () => {
    const hasPriorityDisplay = /priority|high|medium|low/i.test(content);
    assert.ok(hasPriorityDisplay, 'Should show priority in display');
  });

  test('should show summary counts', () => {
    const hasSummaryCounts = /summary.*count|count.*todo|total|\d+\s*(pending|completed|todo)/i.test(content);
    assert.ok(hasSummaryCounts, 'Should show summary counts');
  });
});

// ============================================================================
// Test Suite: Empty State Handling
// ============================================================================

describe('Empty State Handling', () => {
  test('should handle case when no todos exist', () => {
    const hasEmptyHandling = /no\s*todos?\s*(exist|found)|empty|nothing\s*to\s*show/i.test(content);
    assert.ok(hasEmptyHandling, 'Should handle case when no todos exist');
  });

  test('should point to add-todo when empty', () => {
    const hasAddTodoPointer = /add-todo|\/tiki:add-todo/i.test(content);
    assert.ok(hasAddTodoPointer, 'Should point to /tiki:add-todo when empty');
  });
});

// ============================================================================
// Test Suite: Complete Action
// ============================================================================

describe('Complete Action', () => {
  test('should describe marking todo as complete', () => {
    const hasCompleteDescription = /mark.*complete|complete.*todo|status.*completed/i.test(content);
    assert.ok(hasCompleteDescription, 'Should describe marking todo as complete');
  });

  test('should update completedAt timestamp when completing', () => {
    const hasCompletedAt = /completedAt|completed.*timestamp|timestamp.*complet/i.test(content);
    assert.ok(hasCompletedAt, 'Should update completedAt timestamp when completing');
  });
});

// ============================================================================
// Test Suite: Convert to Issue Action
// ============================================================================

describe('Convert to Issue Action', () => {
  test('should describe converting todo to GitHub issue', () => {
    const hasConvertDescription = /convert.*issue|issue.*convert|github\s*issue/i.test(content);
    assert.ok(hasConvertDescription, 'Should describe converting todo to GitHub issue');
  });

  test('should use gh issue create command', () => {
    const hasGhCommand = /gh\s*issue\s*create/i.test(content);
    assert.ok(hasGhCommand, 'Should use gh issue create command');
  });

  test('should update convertedToIssue field', () => {
    const hasConvertedField = /convertedToIssue/i.test(content);
    assert.ok(hasConvertedField, 'Should update convertedToIssue field');
  });
});

// ============================================================================
// Test Suite: Delete Action
// ============================================================================

describe('Delete Action', () => {
  test('should describe deleting/removing todo', () => {
    const hasDeleteDescription = /delete.*todo|remove.*todo|todo.*delete|todo.*remove/i.test(content);
    assert.ok(hasDeleteDescription, 'Should describe deleting/removing todo');
  });

  test('should confirm deletion', () => {
    const hasDeleteConfirm = /confirm.*delete|deleted.*todo|removed.*todo/i.test(content);
    assert.ok(hasDeleteConfirm, 'Should confirm deletion');
  });
});

// ============================================================================
// Test Suite: Filter Behavior
// ============================================================================

describe('Filter Behavior', () => {
  test('should filter to only pending todos with --pending', () => {
    const hasPendingFilter = /--pending.*only|only.*pending|filter.*pending/i.test(content);
    assert.ok(hasPendingFilter, 'Should filter to only pending todos with --pending');
  });

  test('should filter to only completed todos with --completed', () => {
    const hasCompletedFilter = /--completed.*only|only.*completed|filter.*completed/i.test(content);
    assert.ok(hasCompletedFilter, 'Should filter to only completed todos with --completed');
  });

  test('should show all todos with --all (or default)', () => {
    const hasAllFilter = /--all.*everything|all.*default|default.*all|show.*all/i.test(content);
    assert.ok(hasAllFilter, 'Should show all todos with --all (or default)');
  });
});

// ============================================================================
// Test Suite: Examples
// ============================================================================

describe('Examples', () => {
  test('should include example of listing todos', () => {
    const hasListExample = /example|##\s*Todos|###\s*Pending|###\s*Completed/i.test(content);
    assert.ok(hasListExample, 'Should include example of listing todos');
  });

  test('should show example output format with todo items', () => {
    const hasOutputFormat = /\[todo-\d{3}\]|todo.*description|pending.*\d|completed.*\d/i.test(content);
    assert.ok(hasOutputFormat, 'Should show example output format with todo items');
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
