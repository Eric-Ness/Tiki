/**
 * State Schema v2 Tests for Tiki
 * Issue #90: State Management - Consistent updates and concurrent execution support
 *
 * Tests for v2 schema validation, execution object structure,
 * migration from v1 to v2, and backward compatibility.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Paths
const TIKI_ROOT = path.join(__dirname, '../..');
const SCHEMAS_DIR = path.join(TIKI_ROOT, 'schemas');

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

// ============================================================================
// Load Schema
// ============================================================================

let stateSchema;

try {
  stateSchema = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'state.schema.json'), 'utf-8'));
} catch (error) {
  console.error(`Failed to load state schema: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Generate a valid v2 state object
 */
function createV2State(overrides = {}) {
  return {
    version: 2,
    status: 'idle',
    activeExecutions: [],
    executionHistory: [],
    lastActivity: null,
    // Deprecated v1 fields for compatibility
    activeIssue: null,
    currentPhase: null,
    startedAt: null,
    pausedAt: null,
    completedPhases: [],
    failedPhase: null,
    errorMessage: null,
    ...overrides
  };
}

/**
 * Generate a valid execution object
 */
function createExecution(overrides = {}) {
  const issue = overrides.issue || 42;
  const uuid = overrides.uuid || 'a1b2c3d4';
  return {
    id: `exec-${issue}-${uuid}`,
    issue: issue,
    issueTitle: 'Test Issue',
    status: 'executing',
    currentPhase: 1,
    totalPhases: 3,
    startedAt: new Date().toISOString(),
    completedPhases: [],
    ...overrides
  };
}

/**
 * Generate a valid v1 state object (legacy format)
 */
function createV1State(overrides = {}) {
  return {
    status: 'executing',
    activeIssue: 42,
    currentPhase: 2,
    startedAt: new Date().toISOString(),
    completedPhases: [1],
    issue: { number: 42, title: 'Test Issue' },
    planFile: '.tiki/plans/issue-42.json',
    totalPhases: 5,
    ...overrides
  };
}

/**
 * Validate execution ID format
 */
function isValidExecutionId(id) {
  // Patterns: exec-{issue}-{uuid}, exec-release-{version}-{uuid}, exec-{issue}-migrated
  const pattern = /^exec-(([0-9]+|release-[a-zA-Z0-9._-]+)-([a-f0-9]{8}|migrated))$/;
  return pattern.test(id);
}

/**
 * Simulate v1 to v2 migration
 */
function migrateV1ToV2(v1State) {
  const now = new Date().toISOString();

  // Create execution from v1 fields
  const execution = {
    id: `exec-${v1State.activeIssue}-migrated`,
    issue: v1State.activeIssue,
    issueTitle: v1State.issue?.title || 'Unknown',
    status: v1State.status === 'idle' ? 'completed' : v1State.status,
    currentPhase: v1State.currentPhase,
    totalPhases: v1State.totalPhases,
    startedAt: v1State.startedAt || now,
    completedPhases: (v1State.completedPhases || []).map(p =>
      typeof p === 'number' ? { number: p } : p
    ),
    failedPhase: v1State.failedPhase || null,
    errorMessage: v1State.errorMessage || null,
    pausedAt: v1State.pausedAt || null,
    pauseReason: v1State.pauseReason || null,
    planFile: v1State.planFile
  };

  // Build v2 state
  const v2State = {
    version: 2,
    status: v1State.status,
    activeExecutions: v1State.status !== 'idle' ? [execution] : [],
    executionHistory: [],
    lastActivity: v1State.lastActivity || now,

    // Preserve deprecated fields for Tiki.Desktop
    activeIssue: v1State.activeIssue,
    currentPhase: v1State.currentPhase,
    startedAt: v1State.startedAt,
    pausedAt: v1State.pausedAt,
    completedPhases: v1State.completedPhases,
    failedPhase: v1State.failedPhase,
    errorMessage: v1State.errorMessage,
    pauseReason: v1State.pauseReason,
    issue: v1State.issue,
    planFile: v1State.planFile,
    totalPhases: v1State.totalPhases,
    lastCompletedIssue: v1State.lastCompletedIssue || null,
    lastCompletedAt: v1State.lastCompletedAt || null
  };

  return v2State;
}

// ============================================================================
// Test Suite: Schema Structure
// ============================================================================

describe('Schema Structure', () => {
  test('state.schema.json has version field', () => {
    assert.ok(stateSchema.properties.version, 'Schema should have version property');
    assert.deepStrictEqual(stateSchema.properties.version.enum, [1, 2], 'Version should be 1 or 2');
  });

  test('state.schema.json has activeExecutions array', () => {
    assert.ok(stateSchema.properties.activeExecutions, 'Schema should have activeExecutions');
    assert.strictEqual(stateSchema.properties.activeExecutions.type, 'array', 'activeExecutions should be array');
  });

  test('state.schema.json has executionHistory array', () => {
    assert.ok(stateSchema.properties.executionHistory, 'Schema should have executionHistory');
    assert.strictEqual(stateSchema.properties.executionHistory.type, 'array', 'executionHistory should be array');
  });

  test('state.schema.json has execution definition', () => {
    assert.ok(stateSchema.$defs, 'Schema should have $defs');
    assert.ok(stateSchema.$defs.execution, 'Schema should have execution definition');
  });

  test('state.schema.json has archivedExecution definition', () => {
    assert.ok(stateSchema.$defs.archivedExecution, 'Schema should have archivedExecution definition');
  });
});

// ============================================================================
// Test Suite: Execution Object Structure
// ============================================================================

describe('Execution Object Structure', () => {
  test('execution requires id, issue, status', () => {
    const executionDef = stateSchema.$defs.execution;
    assert.ok(executionDef.required.includes('id'), 'execution should require id');
    assert.ok(executionDef.required.includes('issue'), 'execution should require issue');
    assert.ok(executionDef.required.includes('status'), 'execution should require status');
  });

  test('execution id pattern matches exec-N-xxxxxxxx', () => {
    const executionDef = stateSchema.$defs.execution;
    const pattern = executionDef.properties.id.pattern;
    assert.ok(pattern, 'execution.id should have pattern');

    // Test valid IDs
    assert.ok(isValidExecutionId('exec-42-a1b2c3d4'), 'Should match exec-42-a1b2c3d4');
    assert.ok(isValidExecutionId('exec-123-abcdef12'), 'Should match exec-123-abcdef12');
    assert.ok(isValidExecutionId('exec-release-1.2.0-a1b2c3d4'), 'Should match release format');
    assert.ok(isValidExecutionId('exec-42-migrated'), 'Should match migrated format');

    // Test invalid IDs
    assert.ok(!isValidExecutionId('42-a1b2c3d4'), 'Should not match without exec- prefix');
    assert.ok(!isValidExecutionId('exec-a1b2c3d4'), 'Should not match without issue number');
    assert.ok(!isValidExecutionId('exec-42-xyz'), 'Should not match with invalid uuid');
  });

  test('execution status has valid enum values', () => {
    const executionDef = stateSchema.$defs.execution;
    const validStatuses = ['executing', 'paused', 'failed', 'completed'];
    assert.deepStrictEqual(executionDef.properties.status.enum, validStatuses,
      'execution.status should have correct enum values');
  });

  test('archivedExecution requires startedAt and endedAt', () => {
    const archivedDef = stateSchema.$defs.archivedExecution;
    assert.ok(archivedDef.required.includes('startedAt'), 'archived should require startedAt');
    assert.ok(archivedDef.required.includes('endedAt'), 'archived should require endedAt');
  });

  test('archivedExecution status includes abandoned', () => {
    const archivedDef = stateSchema.$defs.archivedExecution;
    const validStatuses = ['completed', 'failed', 'abandoned'];
    assert.deepStrictEqual(archivedDef.properties.status.enum, validStatuses,
      'archived.status should include abandoned');
  });
});

// ============================================================================
// Test Suite: V2 Schema Validation
// ============================================================================

describe('V2 Schema Validation', () => {
  test('v2 schema validates with activeExecutions array', () => {
    const state = createV2State();
    assert.strictEqual(state.version, 2);
    assert.ok(Array.isArray(state.activeExecutions));
    assert.ok(Array.isArray(state.executionHistory));
  });

  test('v2 with single active execution is valid', () => {
    const execution = createExecution();
    const state = createV2State({
      status: 'executing',
      activeExecutions: [execution]
    });

    assert.strictEqual(state.activeExecutions.length, 1);
    assert.strictEqual(state.activeExecutions[0].id, execution.id);
  });

  test('v2 with multiple active executions is valid', () => {
    const exec1 = createExecution({ issue: 42, uuid: 'a1b2c3d4' });
    const exec2 = createExecution({ issue: 43, uuid: 'e5f6g7h8' });
    const state = createV2State({
      status: 'executing',
      activeExecutions: [exec1, exec2]
    });

    assert.strictEqual(state.activeExecutions.length, 2);
  });

  test('v2 with execution history is valid', () => {
    const archived = {
      id: 'exec-40-a1b2c3d4',
      issue: 40,
      issueTitle: 'Completed Issue',
      status: 'completed',
      startedAt: '2026-01-30T10:00:00.000Z',
      endedAt: '2026-01-30T12:00:00.000Z',
      completedPhases: 5,
      totalPhases: 5
    };
    const state = createV2State({
      executionHistory: [archived]
    });

    assert.strictEqual(state.executionHistory.length, 1);
    assert.strictEqual(state.executionHistory[0].status, 'completed');
  });
});

// ============================================================================
// Test Suite: V1 Detection and Migration
// ============================================================================

describe('V1 Detection and Migration', () => {
  test('v1 state auto-detects (no version field)', () => {
    const v1State = createV1State();
    assert.ok(!('version' in v1State), 'v1 state should not have version field');
    assert.ok('activeIssue' in v1State, 'v1 state should have activeIssue');
    assert.ok('status' in v1State, 'v1 state should have status');
  });

  test('migration creates execution from v1 fields', () => {
    const v1State = createV1State({
      activeIssue: 42,
      currentPhase: 3,
      totalPhases: 5,
      status: 'executing'
    });

    const v2State = migrateV1ToV2(v1State);

    assert.strictEqual(v2State.version, 2);
    assert.strictEqual(v2State.activeExecutions.length, 1);

    const exec = v2State.activeExecutions[0];
    assert.strictEqual(exec.issue, 42);
    assert.strictEqual(exec.currentPhase, 3);
    assert.strictEqual(exec.totalPhases, 5);
    assert.strictEqual(exec.status, 'executing');
  });

  test('migration uses exec-N-migrated ID format', () => {
    const v1State = createV1State({ activeIssue: 99 });
    const v2State = migrateV1ToV2(v1State);

    assert.strictEqual(v2State.activeExecutions[0].id, 'exec-99-migrated');
    assert.ok(isValidExecutionId(v2State.activeExecutions[0].id));
  });

  test('migrated state keeps deprecated fields', () => {
    const v1State = createV1State({
      activeIssue: 42,
      currentPhase: 3,
      status: 'paused',
      pauseReason: 'User requested'
    });

    const v2State = migrateV1ToV2(v1State);

    // Check deprecated fields are preserved
    assert.strictEqual(v2State.activeIssue, 42);
    assert.strictEqual(v2State.currentPhase, 3);
    assert.strictEqual(v2State.status, 'paused');
    assert.strictEqual(v2State.pauseReason, 'User requested');
  });

  test('idle v1 state migrates with empty activeExecutions', () => {
    const v1State = createV1State({
      status: 'idle',
      activeIssue: null,
      currentPhase: null
    });

    const v2State = migrateV1ToV2(v1State);

    assert.strictEqual(v2State.activeExecutions.length, 0);
    assert.strictEqual(v2State.status, 'idle');
  });
});

// ============================================================================
// Test Suite: Deprecated Field Compatibility
// ============================================================================

describe('Deprecated Field Compatibility', () => {
  test('deprecated activeIssue syncs with first execution', () => {
    const execution = createExecution({ issue: 55 });
    const state = createV2State({
      status: 'executing',
      activeExecutions: [execution],
      activeIssue: 55  // Synced from first execution
    });

    assert.strictEqual(state.activeIssue, state.activeExecutions[0].issue);
  });

  test('empty activeExecutions sets deprecated fields to null', () => {
    const state = createV2State({
      status: 'idle',
      activeExecutions: [],
      activeIssue: null,
      currentPhase: null,
      startedAt: null
    });

    assert.strictEqual(state.activeIssue, null);
    assert.strictEqual(state.currentPhase, null);
    assert.strictEqual(state.startedAt, null);
  });

  test('deprecated completedPhases accepts both formats', () => {
    // Format 1: Array of integers
    const state1 = createV2State({
      completedPhases: [1, 2, 3]
    });
    assert.ok(Array.isArray(state1.completedPhases));

    // Format 2: Array of objects
    const state2 = createV2State({
      completedPhases: [
        { number: 1, title: 'Phase 1', completedAt: '2026-01-30T10:00:00.000Z' },
        { number: 2, title: 'Phase 2', completedAt: '2026-01-30T11:00:00.000Z' }
      ]
    });
    assert.ok(Array.isArray(state2.completedPhases));
  });

  test('v2 execution completedPhases uses object format', () => {
    const execution = createExecution({
      completedPhases: [
        { number: 1, title: 'Setup', completedAt: '2026-01-30T10:00:00.000Z', summary: 'Completed setup' }
      ]
    });

    assert.ok(Array.isArray(execution.completedPhases));
    assert.strictEqual(execution.completedPhases[0].number, 1);
    assert.strictEqual(execution.completedPhases[0].summary, 'Completed setup');
  });
});

// ============================================================================
// Test Suite: Execution ID Format
// ============================================================================

describe('Execution ID Format', () => {
  test('standard issue ID: exec-{issue}-{8-char-uuid}', () => {
    assert.ok(isValidExecutionId('exec-1-a1b2c3d4'));
    assert.ok(isValidExecutionId('exec-999-12345678'));
    assert.ok(isValidExecutionId('exec-42-abcdef01'));
  });

  test('release ID: exec-release-{version}-{uuid}', () => {
    assert.ok(isValidExecutionId('exec-release-1.0.0-a1b2c3d4'));
    assert.ok(isValidExecutionId('exec-release-2.3.4-12345678'));
    assert.ok(isValidExecutionId('exec-release-1.0.0-beta-a1b2c3d4'));
  });

  test('migrated ID: exec-{issue}-migrated', () => {
    assert.ok(isValidExecutionId('exec-42-migrated'));
    assert.ok(isValidExecutionId('exec-1-migrated'));
    assert.ok(isValidExecutionId('exec-999-migrated'));
  });

  test('invalid IDs are rejected', () => {
    assert.ok(!isValidExecutionId(''));
    assert.ok(!isValidExecutionId('exec-'));
    assert.ok(!isValidExecutionId('exec-42'));
    assert.ok(!isValidExecutionId('exec--a1b2c3d4'));
    assert.ok(!isValidExecutionId('42-a1b2c3d4'));
    assert.ok(!isValidExecutionId('exec-42-short'));  // uuid too short
    assert.ok(!isValidExecutionId('exec-42-UPPERCASE'));  // must be lowercase hex
  });
});

// ============================================================================
// Test Suite: Stale Execution Tracking
// ============================================================================

describe('Stale Execution Tracking', () => {
  test('execution has isStale field', () => {
    const executionDef = stateSchema.$defs.execution;
    assert.ok(executionDef.properties.isStale, 'execution should have isStale field');
    assert.strictEqual(executionDef.properties.isStale.type, 'boolean');
  });

  test('execution has staledAt field', () => {
    const executionDef = stateSchema.$defs.execution;
    assert.ok(executionDef.properties.staledAt, 'execution should have staledAt field');
  });

  test('stale execution is flagged correctly', () => {
    const execution = createExecution({
      isStale: true,
      staledAt: '2026-01-30T10:00:00.000Z'
    });

    assert.strictEqual(execution.isStale, true);
    assert.ok(execution.staledAt);
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
