/**
 * Tests for Parallel Task Execution within Phases
 * Issue #24: Add parallel task execution within phases
 *
 * This test file verifies that execute.md contains all required parallel execution
 * sections including subtask detection, dependency grouping, parallel spawning,
 * and result collection.
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

// Load the file contents before running tests
try {
  executeContent = fs.readFileSync(EXECUTE_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read execute.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test 1: Plan with subtasks parses correctly (schema validation)
// ============================================================================

describe('Test 1: Subtask Schema Validation', () => {
  test('execute.md should document subtasks array in phase schema', () => {
    const hasSubtasksArray = /phase\.subtasks|"subtasks":\s*\[/.test(executeContent);
    assert.ok(
      hasSubtasksArray,
      'execute.md should document subtasks array in phase schema'
    );
  });

  test('execute.md should check for subtasks before execution', () => {
    const hasSubtaskCheck = /if\s*\(phase\.subtasks\s*&&\s*phase\.subtasks\.length\s*>\s*0\)/i.test(executeContent);
    assert.ok(
      hasSubtaskCheck,
      'execute.md should check for subtasks array before execution'
    );
  });

  test('execute.md should have Step 4a-sub for subtask detection', () => {
    const hasStep4aSub = /4a-sub/i.test(executeContent);
    assert.ok(
      hasStep4aSub,
      'execute.md should have Step 4a-sub for subtask detection'
    );
  });

  test('execute.md should document subtask state tracking', () => {
    const hasSubtaskState = /subtaskState|subtask.*status/i.test(executeContent);
    assert.ok(
      hasSubtaskState,
      'execute.md should document subtask state tracking'
    );
  });
});

// ============================================================================
// Test 2: Dependency grouping identifies independent tasks
// ============================================================================

describe('Test 2: Dependency Grouping Algorithm', () => {
  test('execute.md should document groupTasksByDependency function', () => {
    const hasGroupFunction = /groupTasksByDependency/i.test(executeContent);
    assert.ok(
      hasGroupFunction,
      'execute.md should document groupTasksByDependency function'
    );
  });

  test('execute.md should document execution waves concept', () => {
    const hasWaves = /execution\s*waves?|wave\s*\d+/i.test(executeContent);
    assert.ok(
      hasWaves,
      'execute.md should document execution waves concept'
    );
  });

  test('execute.md should document topological sort (Kahn\'s algorithm)', () => {
    const hasTopoSort = /topological\s*sort|Kahn/i.test(executeContent);
    assert.ok(
      hasTopoSort,
      'execute.md should document topological sort (Kahn\'s algorithm)'
    );
  });

  test('execute.md should identify tasks with no dependencies for first wave', () => {
    const hasNoDependencies = /no\s*dependencies|dependsOn.*\[\]|dependencies.*empty/i.test(executeContent);
    assert.ok(
      hasNoDependencies,
      'execute.md should identify tasks with no dependencies for first wave'
    );
  });
});

// ============================================================================
// Test 3: Circular dependency detection works
// ============================================================================

describe('Test 3: Circular Dependency Detection', () => {
  test('execute.md should detect circular dependencies', () => {
    const hasCircularDetection = /circular\s*depend/i.test(executeContent);
    assert.ok(
      hasCircularDetection,
      'execute.md should detect circular dependencies'
    );
  });

  test('execute.md should report circular dependency errors', () => {
    const hasCircularError = /Circular\s*dependency\s*detected|circular.*error/i.test(executeContent);
    assert.ok(
      hasCircularError,
      'execute.md should report circular dependency errors'
    );
  });

  test('execute.md should prevent execution when circular dependencies exist', () => {
    const hasPrevention = /Cannot\s*execute.*circular|abort.*circular|stop.*circular/i.test(executeContent) ||
                         /circular.*detected[\s\S]*?abort|circular.*error/i.test(executeContent);
    assert.ok(
      hasPrevention,
      'execute.md should prevent execution when circular dependencies exist'
    );
  });
});

// ============================================================================
// Test 4: Empty subtasks falls back to normal execution
// ============================================================================

describe('Test 4: Fallback to Normal Execution', () => {
  test('execute.md should fall back when no subtasks array exists', () => {
    const hasFallbackNoArray = /No\s*subtasks.*continue\s*with|continue\s*with.*single-agent/i.test(executeContent);
    assert.ok(
      hasFallbackNoArray,
      'execute.md should fall back to normal execution when no subtasks array exists'
    );
  });

  test('execute.md should fall back when subtasks array is empty', () => {
    const hasFallbackEmpty = /Empty\s*subtasks.*falls\s*back|empty.*\[\].*normal/i.test(executeContent);
    assert.ok(
      hasFallbackEmpty,
      'execute.md should fall back to normal execution when subtasks array is empty'
    );
  });

  test('execute.md should maintain backward compatibility', () => {
    const hasBackwardCompat = /backward\s*compatible/i.test(executeContent);
    assert.ok(
      hasBackwardCompat,
      'execute.md should maintain backward compatibility with plans without subtasks'
    );
  });
});

// ============================================================================
// Test 5: Parallel spawning with run_in_background
// ============================================================================

describe('Test 5: Parallel Task Spawning', () => {
  test('execute.md should have Step 4f-parallel for parallel spawning', () => {
    const hasStep4fParallel = /4f-parallel/i.test(executeContent);
    assert.ok(
      hasStep4fParallel,
      'execute.md should have Step 4f-parallel for parallel spawning'
    );
  });

  test('execute.md should use run_in_background for parallel tasks', () => {
    const hasRunInBackground = /run_in_background/i.test(executeContent);
    assert.ok(
      hasRunInBackground,
      'execute.md should use run_in_background for parallel tasks'
    );
  });

  test('execute.md should spawn multiple tasks concurrently', () => {
    const hasConcurrent = /concurrent|parallel.*spawn|spawn.*parallel/i.test(executeContent);
    assert.ok(
      hasConcurrent,
      'execute.md should spawn multiple tasks concurrently'
    );
  });
});

// ============================================================================
// Test 6: Result collection with TaskOutput
// ============================================================================

describe('Test 6: Result Collection', () => {
  test('execute.md should have Step 4g-parallel for result collection', () => {
    const hasStep4gParallel = /4g-parallel/i.test(executeContent);
    assert.ok(
      hasStep4gParallel,
      'execute.md should have Step 4g-parallel for result collection'
    );
  });

  test('execute.md should use TaskOutput for collecting results', () => {
    const hasTaskOutput = /TaskOutput/i.test(executeContent);
    assert.ok(
      hasTaskOutput,
      'execute.md should use TaskOutput for collecting results'
    );
  });

  test('execute.md should require TASK_SUMMARY from subtasks', () => {
    const hasTaskSummary = /TASK_SUMMARY/i.test(executeContent);
    assert.ok(
      hasTaskSummary,
      'execute.md should require TASK_SUMMARY marker from subtasks'
    );
  });
});

// ============================================================================
// Test 7: Partial failure handling
// ============================================================================

describe('Test 7: Partial Failure Handling', () => {
  test('execute.md should handle partial wave failures', () => {
    const hasPartialFailure = /partial\s*failure|partial.*complete/i.test(executeContent);
    assert.ok(
      hasPartialFailure,
      'execute.md should handle partial wave failures'
    );
  });

  test('execute.md should preserve successful subtask work', () => {
    const hasPreserve = /preserve.*successful|successful.*preserved/i.test(executeContent);
    assert.ok(
      hasPreserve,
      'execute.md should preserve successful subtask work'
    );
  });

  test('execute.md should support --subtask retry flag', () => {
    const hasSubtaskRetry = /--subtask/i.test(executeContent);
    assert.ok(
      hasSubtaskRetry,
      'execute.md should support --subtask retry flag for individual subtask retry'
    );
  });
});

// ============================================================================
// Test 8: Documentation sections exist
// ============================================================================

describe('Test 8: Documentation Sections', () => {
  test('execute.md should have Parallel Execution Notes section', () => {
    const hasParallelNotes = /Parallel\s*Execution\s*Notes/i.test(executeContent);
    assert.ok(
      hasParallelNotes,
      'execute.md should have Parallel Execution Notes section'
    );
  });

  test('execute.md should have example execution flow with parallel execution', () => {
    const hasParallelExample = /Parallel\s*Execution.*with\s*subtasks|Parallel\s*Execution.*Wave/i.test(executeContent);
    assert.ok(
      hasParallelExample,
      'execute.md should have example execution flow with parallel execution'
    );
  });

  test('execute.md should document when to use parallel execution', () => {
    const hasWhenToUse = /when\s*to\s*use.*parallel|parallel.*independent\s*file|independent.*changes/i.test(executeContent);
    assert.ok(
      hasWhenToUse,
      'execute.md should document when to use parallel execution'
    );
  });

  test('execute.md should document parallel execution limitations', () => {
    const hasLimitations = /limitation|shared\s*file.*conflict|file.*conflict/i.test(executeContent);
    assert.ok(
      hasLimitations,
      'execute.md should document parallel execution limitations'
    );
  });
});

// ============================================================================
// Test 9: Single subtask optimization
// ============================================================================

describe('Test 9: Single Subtask Optimization', () => {
  test('execute.md should skip parallelization for single subtask', () => {
    const hasSingleSubtaskOptimization = /subtasks\.length\s*===\s*1|single\s*subtask.*skip/i.test(executeContent);
    assert.ok(
      hasSingleSubtaskOptimization,
      'execute.md should skip parallelization overhead for single subtask'
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
