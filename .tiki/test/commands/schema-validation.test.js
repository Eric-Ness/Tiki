/**
 * Schema Validation Tests for Tiki State Files
 * Issue #36: Add JSON schema validation for .tiki/ state files
 *
 * These tests validate existing state files against their JSON schemas.
 * Uses a simple validation approach without external dependencies like ajv.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Paths
const TIKI_ROOT = path.join(__dirname, '../..');
const SCHEMAS_DIR = path.join(TIKI_ROOT, 'schemas');
const PLANS_DIR = path.join(TIKI_ROOT, 'plans');
const STATE_DIR = path.join(TIKI_ROOT, 'state');

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
// Simple Schema Validator
// ============================================================================

/**
 * Validates a value against a JSON schema type definition
 * @param {any} value - Value to validate
 * @param {object} schema - JSON schema definition
 * @param {string} path - Current path for error messages
 * @returns {string[]} Array of error messages
 */
function validateValue(value, schema, path = 'root') {
  const errors = [];

  // Handle oneOf
  if (schema.oneOf) {
    let matched = false;
    for (const subSchema of schema.oneOf) {
      const subErrors = validateValue(value, subSchema, path);
      if (subErrors.length === 0) {
        matched = true;
        break;
      }
    }
    if (!matched) {
      errors.push(`${path}: value does not match any of oneOf options`);
    }
    return errors;
  }

  // Handle null type
  if (schema.type === 'null') {
    if (value !== null) {
      errors.push(`${path}: expected null, got ${typeof value}`);
    }
    return errors;
  }

  // Handle type checking
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    // Special case: null is valid for nullable fields
    if (value === null) {
      // null is only valid if schema explicitly allows it
      return errors;
    }

    if (schema.type === 'integer') {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        errors.push(`${path}: expected integer, got ${actualType}`);
        return errors;
      }
    } else if (schema.type === 'number') {
      if (typeof value !== 'number') {
        errors.push(`${path}: expected number, got ${actualType}`);
        return errors;
      }
    } else if (schema.type !== actualType) {
      errors.push(`${path}: expected ${schema.type}, got ${actualType}`);
      return errors;
    }
  }

  // Validate enum values
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: value '${value}' not in enum [${schema.enum.join(', ')}]`);
  }

  // Validate string constraints
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push(`${path}: string length ${value.length} is less than minLength ${schema.minLength}`);
    }
  }

  // Validate integer constraints
  if ((schema.type === 'integer' || schema.type === 'number') && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: value ${value} is less than minimum ${schema.minimum}`);
    }
  }

  // Validate array items
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) {
      errors.push(`${path}: array length ${value.length} is less than minItems ${schema.minItems}`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateValue(item, schema.items, `${path}[${index}]`));
      });
    }
  }

  // Validate object properties
  if (schema.type === 'object' && typeof value === 'object' && value !== null) {
    // Check required properties
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in value)) {
          errors.push(`${path}: missing required property '${requiredProp}'`);
        }
      }
    }

    // Validate defined properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in value) {
          errors.push(...validateValue(value[propName], propSchema, `${path}.${propName}`));
        }
      }
    }
  }

  return errors;
}

/**
 * Validates an instance against a schema
 * @param {object} instance - Object to validate
 * @param {object} schema - JSON schema
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validate(instance, schema) {
  const errors = validateValue(instance, schema);
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Load Schemas
// ============================================================================

let configSchema, planSchema, stateSchema;

try {
  configSchema = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'config.schema.json'), 'utf-8'));
  planSchema = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'plan.schema.json'), 'utf-8'));
  stateSchema = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'state.schema.json'), 'utf-8'));
} catch (error) {
  console.error(`Failed to load schemas: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite: Config Schema Validation
// ============================================================================

describe('Config Schema Validation', () => {
  const configPath = path.join(TIKI_ROOT, 'config.json');
  let config;

  test('config.json exists and is valid JSON', () => {
    const content = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(content);
    assert.ok(config, 'config.json should parse to a valid object');
  });

  test('config.json matches config.schema.json', () => {
    if (!config) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    const result = validate(config, configSchema);
    assert.ok(result.valid, `Validation errors: ${result.errors.join(', ')}`);
  });

  test('config.testing.createTests has valid enum value', () => {
    if (!config) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    if (config.testing && config.testing.createTests) {
      const validValues = ['before', 'after', 'ask', 'never'];
      assert.ok(validValues.includes(config.testing.createTests),
        `createTests value '${config.testing.createTests}' not in [${validValues.join(', ')}]`);
    }
  });

  test('config.hooks.codeSimplifier.mode has valid enum value', () => {
    if (!config) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    if (config.hooks && config.hooks.codeSimplifier && config.hooks.codeSimplifier.mode) {
      const validValues = ['silent', 'verbose', 'prompt'];
      assert.ok(validValues.includes(config.hooks.codeSimplifier.mode),
        `mode value '${config.hooks.codeSimplifier.mode}' not in [${validValues.join(', ')}]`);
    }
  });

  test('config.autoFix.maxAttempts is a positive integer', () => {
    if (!config) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    if (config.autoFix && config.autoFix.maxAttempts !== undefined) {
      assert.ok(Number.isInteger(config.autoFix.maxAttempts) && config.autoFix.maxAttempts >= 1,
        `maxAttempts should be a positive integer, got ${config.autoFix.maxAttempts}`);
    }
  });
});

// ============================================================================
// Test Suite: State Schema Validation
// ============================================================================

describe('State Schema Validation', () => {
  const statePath = path.join(STATE_DIR, 'current.json');
  let state;

  test('state/current.json exists and is valid JSON', () => {
    const content = fs.readFileSync(statePath, 'utf-8');
    state = JSON.parse(content);
    assert.ok(state, 'current.json should parse to a valid object');
  });

  test('state/current.json matches state.schema.json', () => {
    if (!state) {
      state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
    const result = validate(state, stateSchema);
    assert.ok(result.valid, `Validation errors: ${result.errors.join(', ')}`);
  });

  test('state.status has valid enum value', () => {
    if (!state) {
      state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
    const validValues = ['idle', 'executing', 'paused', 'failed'];
    assert.ok(validValues.includes(state.status),
      `status value '${state.status}' not in [${validValues.join(', ')}]`);
  });

  test('state has required status field', () => {
    if (!state) {
      state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
    assert.ok('status' in state, 'state must have status field');
  });

  test('state.completedPhases is an array if present', () => {
    if (!state) {
      state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
    if ('completedPhases' in state) {
      assert.ok(Array.isArray(state.completedPhases),
        `completedPhases should be an array, got ${typeof state.completedPhases}`);
    }
  });
});

// ============================================================================
// Test Suite: Plan Schema Validation
// ============================================================================

describe('Plan Schema Validation', () => {
  let planFiles;

  test('plans directory contains JSON files', () => {
    planFiles = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.json'));
    assert.ok(planFiles.length > 0, 'No plan files found in .tiki/plans/');
  });

  test('all plan files are valid JSON', () => {
    if (!planFiles) {
      planFiles = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.json'));
    }
    for (const planFile of planFiles) {
      const content = fs.readFileSync(path.join(PLANS_DIR, planFile), 'utf-8');
      const plan = JSON.parse(content);
      assert.ok(plan, `${planFile} should parse to a valid object`);
    }
  });

  test('all plan files match plan.schema.json', () => {
    if (!planFiles) {
      planFiles = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.json'));
    }
    for (const planFile of planFiles) {
      const content = fs.readFileSync(path.join(PLANS_DIR, planFile), 'utf-8');
      const plan = JSON.parse(content);
      const result = validate(plan, planSchema);
      assert.ok(result.valid, `${planFile} validation errors: ${result.errors.join(', ')}`);
    }
  });

  test('all plans have required issue.number and issue.title', () => {
    if (!planFiles) {
      planFiles = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.json'));
    }
    for (const planFile of planFiles) {
      const content = fs.readFileSync(path.join(PLANS_DIR, planFile), 'utf-8');
      const plan = JSON.parse(content);
      assert.ok(plan.issue, `${planFile}: missing 'issue' object`);
      assert.ok(typeof plan.issue.number === 'number', `${planFile}: issue.number must be a number`);
      assert.ok(typeof plan.issue.title === 'string' && plan.issue.title.length > 0,
        `${planFile}: issue.title must be a non-empty string`);
    }
  });

  test('all plans have at least one phase', () => {
    if (!planFiles) {
      planFiles = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.json'));
    }
    for (const planFile of planFiles) {
      const content = fs.readFileSync(path.join(PLANS_DIR, planFile), 'utf-8');
      const plan = JSON.parse(content);
      assert.ok(Array.isArray(plan.phases) && plan.phases.length > 0,
        `${planFile}: must have at least one phase`);
    }
  });

  test('all phases have required fields (number, title, status, content)', () => {
    if (!planFiles) {
      planFiles = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.json'));
    }
    for (const planFile of planFiles) {
      const content = fs.readFileSync(path.join(PLANS_DIR, planFile), 'utf-8');
      const plan = JSON.parse(content);
      for (const phase of plan.phases) {
        assert.ok(typeof phase.number === 'number' && phase.number >= 1,
          `${planFile}: phase.number must be a positive integer`);
        assert.ok(typeof phase.title === 'string' && phase.title.length > 0,
          `${planFile}: phase.title must be a non-empty string`);
        assert.ok(typeof phase.status === 'string',
          `${planFile}: phase.status must be a string`);
        assert.ok(typeof phase.content === 'string',
          `${planFile}: phase.content must be a string`);
      }
    }
  });

  test('all phase statuses have valid enum values', () => {
    if (!planFiles) {
      planFiles = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.json'));
    }
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'skipped'];
    for (const planFile of planFiles) {
      const content = fs.readFileSync(path.join(PLANS_DIR, planFile), 'utf-8');
      const plan = JSON.parse(content);
      for (const phase of plan.phases) {
        assert.ok(validStatuses.includes(phase.status),
          `${planFile}: phase ${phase.number} status '${phase.status}' not in [${validStatuses.join(', ')}]`);
      }
    }
  });
});

// ============================================================================
// Test Suite: Schema Structure Validation
// ============================================================================

describe('Schema Structure Validation', () => {
  test('config.schema.json has valid JSON Schema structure', () => {
    assert.ok(configSchema.$schema, 'config.schema.json should have $schema');
    assert.ok(configSchema.type === 'object', 'config.schema.json type should be object');
    assert.ok(configSchema.properties, 'config.schema.json should have properties');
  });

  test('plan.schema.json has valid JSON Schema structure', () => {
    assert.ok(planSchema.$schema, 'plan.schema.json should have $schema');
    assert.ok(planSchema.type === 'object', 'plan.schema.json type should be object');
    assert.ok(planSchema.required, 'plan.schema.json should have required fields');
    assert.ok(planSchema.required.includes('issue'), 'plan.schema.json should require issue');
    assert.ok(planSchema.required.includes('phases'), 'plan.schema.json should require phases');
  });

  test('state.schema.json has valid JSON Schema structure', () => {
    assert.ok(stateSchema.$schema, 'state.schema.json should have $schema');
    assert.ok(stateSchema.type === 'object', 'state.schema.json type should be object');
    assert.ok(stateSchema.required, 'state.schema.json should have required fields');
    assert.ok(stateSchema.required.includes('status'), 'state.schema.json should require status');
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
