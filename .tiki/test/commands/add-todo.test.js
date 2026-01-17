/**
 * TDD Tests for /tiki:add-todo command
 * Issue #25: Add /tiki:add-todo and /tiki:list-todos for backlog management
 *
 * These tests verify that add-todo.md contains the required sections and patterns
 * for a todo management command.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ADD_TODO_PATH = path.join(__dirname, '../../../.claude/commands/tiki/add-todo.md');

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
  content = fs.readFileSync(ADD_TODO_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read add-todo.md: ${error.message}`);
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

  test('should have name: tiki:add-todo', () => {
    const hasName = /^---[\s\S]*?name:\s*tiki:add-todo[\s\S]*?---/m.test(content);
    assert.ok(hasName, 'Missing "name: tiki:add-todo" in YAML frontmatter');
  });

  test('should have description field', () => {
    const hasDescription = /^---[\s\S]*?description:[\s\S]*?---/m.test(content);
    assert.ok(hasDescription, 'Missing "description" in YAML frontmatter');
  });

  test('should have allowed-tools including Read, Write, Bash', () => {
    const hasAllowedTools = /^---[\s\S]*?allowed-tools:[\s\S]*?(Read|Write|Bash)[\s\S]*?---/m.test(content);
    assert.ok(hasAllowedTools, 'Missing "allowed-tools" with Read, Write, or Bash in YAML frontmatter');
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

  test('should show example with description argument', () => {
    const hasExampleWithArg = /\/tiki:add-todo\s*["'][^"']+["']/i.test(content);
    assert.ok(hasExampleWithArg, 'Should show example with description argument');
  });

  test('should show example without argument', () => {
    const hasExampleNoArg = /\/tiki:add-todo\s*($|\n|`)/m.test(content);
    assert.ok(hasExampleNoArg, 'Should show example without argument');
  });

  test('should show example with priority flag', () => {
    const hasPriorityExample = /--priority\s*(high|medium|low)/i.test(content);
    assert.ok(hasPriorityExample, 'Should show example with --priority flag');
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

  test('should handle case when no argument provided', () => {
    const hasNoArgHandling = /no\s*(input|argument|description)\s*(provided)?|prompt.*description|ask.*description/i.test(content);
    assert.ok(hasNoArgHandling, 'Should handle case when no argument is provided');
  });

  test('should parse priority flag from argument', () => {
    const hasPriorityParsing = /--priority|priority\s*flag|parse.*priority/i.test(content);
    assert.ok(hasPriorityParsing, 'Should parse priority flag from argument');
  });
});

// ============================================================================
// Test Suite: Todos JSON File Format
// ============================================================================

describe('Todos JSON File Format', () => {
  test('should reference todos.json file path', () => {
    const hasTodosPath = /\.tiki\/todos\.json/i.test(content);
    assert.ok(hasTodosPath, 'Should reference .tiki/todos.json file path');
  });

  test('should specify todo object structure with id field', () => {
    const hasIdField = /"id":|id\s*field|todo-\d{3}/i.test(content);
    assert.ok(hasIdField, 'Should specify todo object with id field');
  });

  test('should specify todo object structure with description field', () => {
    const hasDescField = /"description":/i.test(content);
    assert.ok(hasDescField, 'Should specify todo object with description field');
  });

  test('should specify todo object structure with status field', () => {
    const hasStatusField = /"status":\s*"pending"/i.test(content);
    assert.ok(hasStatusField, 'Should specify todo object with status field set to pending');
  });

  test('should specify todo object structure with priority field', () => {
    const hasPriorityField = /"priority":/i.test(content);
    assert.ok(hasPriorityField, 'Should specify todo object with priority field');
  });

  test('should specify todo object structure with createdAt field', () => {
    const hasCreatedAtField = /"createdAt":/i.test(content);
    assert.ok(hasCreatedAtField, 'Should specify todo object with createdAt field');
  });

  test('should specify todo object structure with completedAt field', () => {
    const hasCompletedAtField = /"completedAt":/i.test(content);
    assert.ok(hasCompletedAtField, 'Should specify todo object with completedAt field');
  });

  test('should specify todo object structure with convertedToIssue field', () => {
    const hasConvertedField = /"convertedToIssue":/i.test(content);
    assert.ok(hasConvertedField, 'Should specify todo object with convertedToIssue field');
  });
});

// ============================================================================
// Test Suite: Auto-Incrementing IDs
// ============================================================================

describe('Auto-Incrementing IDs', () => {
  test('should generate auto-incrementing IDs', () => {
    const hasAutoIncrement = /auto[-\s]?increment|next.*id|todo-\d{3}|id.*increment|generate.*id/i.test(content);
    assert.ok(hasAutoIncrement, 'Should describe auto-incrementing ID generation');
  });

  test('should use format todo-NNN', () => {
    const hasIdFormat = /todo-\d{3}|todo-001|todo-002/i.test(content);
    assert.ok(hasIdFormat, 'Should use todo-NNN format (e.g., todo-001)');
  });
});

// ============================================================================
// Test Suite: File Creation
// ============================================================================

describe('File Creation', () => {
  test('should create todos.json if it does not exist', () => {
    const hasCreateFile = /create.*todos\.json|if.*not\s*exist|doesn.*exist.*create|initialize.*todos/i.test(content);
    assert.ok(hasCreateFile, 'Should describe creating todos.json if it does not exist');
  });

  test('should initialize with empty todos array', () => {
    const hasEmptyInit = /"todos":\s*\[\]|empty.*array|initialize.*\[\]/i.test(content);
    assert.ok(hasEmptyInit, 'Should initialize with empty todos array');
  });
});

// ============================================================================
// Test Suite: Confirmation Output
// ============================================================================

describe('Confirmation Output', () => {
  test('should confirm creation with todo ID', () => {
    const hasIdConfirm = /confirm.*id|created.*todo-|todo.*id.*created|display.*id/i.test(content);
    assert.ok(hasIdConfirm, 'Should confirm creation with todo ID');
  });

  test('should show description in confirmation', () => {
    const hasDescConfirm = /confirm.*description|show.*description|display.*description|description.*confirm/i.test(content);
    assert.ok(hasDescConfirm, 'Should show description in confirmation');
  });
});

// ============================================================================
// Test Suite: Priority Handling
// ============================================================================

describe('Priority Handling', () => {
  test('should support high, medium, low priority values', () => {
    const hasHighPriority = /high/i.test(content);
    const hasMediumPriority = /medium/i.test(content);
    const hasLowPriority = /low/i.test(content);
    assert.ok(hasHighPriority && hasMediumPriority && hasLowPriority, 'Should support high, medium, and low priority values');
  });

  test('should default to medium priority if not specified', () => {
    const hasDefaultPriority = /default.*medium|medium.*default|priority.*medium.*if\s*not/i.test(content);
    assert.ok(hasDefaultPriority, 'Should default to medium priority if not specified');
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
