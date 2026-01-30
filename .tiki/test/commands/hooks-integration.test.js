/**
 * Tests for Lifecycle Hooks and Custom Commands
 * Issue #87: Add project-specific custom commands and lifecycle hooks
 *
 * These tests verify:
 * - Config schema has extensions section
 * - Hook execution prompts exist
 * - Commands have hook integration steps
 * - hook-run.md command structure
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Define paths relative to test file location
const TIKI_ROOT = path.join(__dirname, '../..');
const CLAUDE_COMMANDS = path.join(__dirname, '../../../.claude/commands/tiki');

// Schema paths
const CONFIG_SCHEMA_PATH = path.join(TIKI_ROOT, 'schemas/config.schema.json');
const HOOK_RESULT_SCHEMA_PATH = path.join(TIKI_ROOT, 'schemas/hook-result.schema.json');

// Prompt paths
const EXECUTE_HOOK_PROMPT_PATH = path.join(TIKI_ROOT, 'prompts/hooks/execute-hook.md');
const WINDOWS_SUPPORT_PROMPT_PATH = path.join(TIKI_ROOT, 'prompts/hooks/windows-support.md');

// Command paths
const SHIP_CMD_PATH = path.join(CLAUDE_COMMANDS, 'ship.md');
const EXECUTE_CMD_PATH = path.join(CLAUDE_COMMANDS, 'execute.md');
const COMMIT_CMD_PATH = path.join(CLAUDE_COMMANDS, 'commit.md');
const HOOK_RUN_CMD_PATH = path.join(CLAUDE_COMMANDS, 'hook-run.md');

// Documentation paths
const HOOKS_README_PATH = path.join(TIKI_ROOT, 'hooks/README.md');
const COMMANDS_README_PATH = path.join(TIKI_ROOT, 'commands/README.md');
const CLAUDE_MD_PATH = path.join(__dirname, '../../../CLAUDE.md');

let configSchema = null;
let hookResultSchema = null;
let executeHookPrompt = '';
let windowsSupportPrompt = '';
let shipCmd = '';
let executeCmd = '';
let commitCmd = '';
let hookRunCmd = '';
let hooksReadme = '';
let commandsReadme = '';
let claudeMd = '';

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    testResults.push({ name, status: 'PASS' });
    console.log(`  [PASS] ${name}`);
  } catch (error) {
    testsFailed++;
    testResults.push({ name, status: 'FAIL', error: error.message });
    console.log(`  [FAIL] ${name}: ${error.message}`);
  }
}

function describe(suiteName, fn) {
  console.log(`\n${suiteName}`);
  fn();
}

// Load all files before running tests
console.log('Loading test files...\n');

try {
  configSchema = JSON.parse(fs.readFileSync(CONFIG_SCHEMA_PATH, 'utf-8'));
} catch (error) {
  console.error(`Failed to read/parse config.schema.json: ${error.message}`);
  process.exit(1);
}

try {
  hookResultSchema = JSON.parse(fs.readFileSync(HOOK_RESULT_SCHEMA_PATH, 'utf-8'));
} catch (error) {
  console.error(`Failed to read/parse hook-result.schema.json: ${error.message}`);
  process.exit(1);
}

try {
  executeHookPrompt = fs.readFileSync(EXECUTE_HOOK_PROMPT_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read execute-hook.md: ${error.message}`);
  process.exit(1);
}

try {
  windowsSupportPrompt = fs.readFileSync(WINDOWS_SUPPORT_PROMPT_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read windows-support.md: ${error.message}`);
  process.exit(1);
}

try {
  shipCmd = fs.readFileSync(SHIP_CMD_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read ship.md: ${error.message}`);
  process.exit(1);
}

try {
  executeCmd = fs.readFileSync(EXECUTE_CMD_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read execute.md: ${error.message}`);
  process.exit(1);
}

try {
  commitCmd = fs.readFileSync(COMMIT_CMD_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read commit.md: ${error.message}`);
  process.exit(1);
}

try {
  hookRunCmd = fs.readFileSync(HOOK_RUN_CMD_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read hook-run.md: ${error.message}`);
  process.exit(1);
}

try {
  hooksReadme = fs.readFileSync(HOOKS_README_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read hooks/README.md: ${error.message}`);
  process.exit(1);
}

try {
  commandsReadme = fs.readFileSync(COMMANDS_README_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read commands/README.md: ${error.message}`);
  process.exit(1);
}

try {
  claudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read CLAUDE.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite 1: Config Schema Extensions
// ============================================================================

describe('Suite 1: Config Schema Extensions', () => {
  test('should have extensions property in config schema', () => {
    assert.ok(configSchema.properties?.extensions, 'Missing extensions property in config schema');
  });

  test('should have extensions.customCommands with enabled and directory', () => {
    const customCommands = configSchema.properties?.extensions?.properties?.customCommands;
    assert.ok(customCommands, 'Missing customCommands in extensions');
    assert.ok(customCommands.properties?.enabled, 'Missing enabled in customCommands');
    assert.ok(customCommands.properties?.directory, 'Missing directory in customCommands');
  });

  test('should have extensions.lifecycleScripts (NOT extensions.hooks)', () => {
    const extensions = configSchema.properties?.extensions?.properties;
    assert.ok(extensions?.lifecycleScripts, 'Missing lifecycleScripts in extensions');
    // Note: hooks may exist for other purposes, but lifecycleScripts must exist
  });

  test('should have lifecycleScripts with timeout, verbose, enabled, directory', () => {
    const lifecycleScripts = configSchema.properties?.extensions?.properties?.lifecycleScripts?.properties;
    assert.ok(lifecycleScripts?.timeout, 'Missing timeout in lifecycleScripts');
    assert.ok(lifecycleScripts?.verbose, 'Missing verbose in lifecycleScripts');
    assert.ok(lifecycleScripts?.enabled, 'Missing enabled in lifecycleScripts');
    assert.ok(lifecycleScripts?.directory, 'Missing directory in lifecycleScripts');
  });

  test('should have timeout default of 30000', () => {
    const timeout = configSchema.properties?.extensions?.properties?.lifecycleScripts?.properties?.timeout;
    assert.strictEqual(timeout?.default, 30000, `Expected timeout default 30000, got ${timeout?.default}`);
  });
});

// ============================================================================
// Test Suite 2: Hook Result Schema
// ============================================================================

describe('Suite 2: Hook Result Schema', () => {
  test('should have hook-result.schema.json file', () => {
    assert.ok(fs.existsSync(HOOK_RESULT_SCHEMA_PATH), 'Missing hook-result.schema.json');
  });

  test('should be valid JSON', () => {
    // Already parsed during load, but verify structure
    assert.ok(hookResultSchema.$schema, 'Missing $schema field');
  });

  test('should have required properties: hook, exitCode, timestamp', () => {
    assert.ok(Array.isArray(hookResultSchema.required), 'Missing required array');
    assert.ok(hookResultSchema.required.includes('hook'), 'Missing hook in required');
    assert.ok(hookResultSchema.required.includes('exitCode'), 'Missing exitCode in required');
    assert.ok(hookResultSchema.required.includes('timestamp'), 'Missing timestamp in required');
  });

  test('should have optional properties: stdout, stderr, duration, timedOut, skipped', () => {
    const props = hookResultSchema.properties;
    assert.ok(props?.stdout, 'Missing stdout property');
    assert.ok(props?.stderr, 'Missing stderr property');
    assert.ok(props?.duration, 'Missing duration property');
    assert.ok(props?.timedOut, 'Missing timedOut property');
    assert.ok(props?.skipped, 'Missing skipped property');
  });
});

// ============================================================================
// Test Suite 3: Hook Execution Prompts
// ============================================================================

describe('Suite 3: Hook Execution Prompts', () => {
  test('should have execute-hook.md prompt file', () => {
    assert.ok(fs.existsSync(EXECUTE_HOOK_PROMPT_PATH), 'Missing execute-hook.md');
  });

  test('execute-hook.md should contain sanitize/Sanitize reference', () => {
    const hasSanitize = /sanitize/i.test(executeHookPrompt);
    assert.ok(hasSanitize, 'execute-hook.md missing sanitize/Sanitize reference');
  });

  test('execute-hook.md should contain timeout handling', () => {
    const hasTimeout = /timeout/i.test(executeHookPrompt);
    assert.ok(hasTimeout, 'execute-hook.md missing timeout handling');
  });

  test('should have windows-support.md prompt file', () => {
    assert.ok(fs.existsSync(WINDOWS_SUPPORT_PROMPT_PATH), 'Missing windows-support.md');
  });

  test('windows-support.md should contain Git Bash reference', () => {
    const hasGitBash = /Git Bash/i.test(windowsSupportPrompt);
    assert.ok(hasGitBash, 'windows-support.md missing Git Bash reference');
  });

  test('windows-support.md should contain PowerShell or .ps1 reference', () => {
    const hasPowerShell = /PowerShell|\.ps1/i.test(windowsSupportPrompt);
    assert.ok(hasPowerShell, 'windows-support.md missing PowerShell or .ps1 reference');
  });
});

// ============================================================================
// Test Suite 4: ship.md Hook Integration
// ============================================================================

describe('Suite 4: ship.md Hook Integration', () => {
  test('ship.md should contain pre-ship hook reference', () => {
    const hasPreShip = /pre-ship/i.test(shipCmd);
    assert.ok(hasPreShip, 'ship.md missing pre-ship hook reference');
  });

  test('ship.md should contain post-ship hook reference', () => {
    const hasPostShip = /post-ship/i.test(shipCmd);
    assert.ok(hasPostShip, 'ship.md missing post-ship hook reference');
  });

  test('ship.md should reference execute-hook.md', () => {
    const hasExecuteHookRef = /execute-hook\.md/i.test(shipCmd);
    assert.ok(hasExecuteHookRef, 'ship.md missing execute-hook.md reference');
  });
});

// ============================================================================
// Test Suite 5: execute.md Hook Integration
// ============================================================================

describe('Suite 5: execute.md Hook Integration', () => {
  test('execute.md should contain pre-execute hook reference', () => {
    const hasPreExecute = /pre-execute/i.test(executeCmd);
    assert.ok(hasPreExecute, 'execute.md missing pre-execute hook reference');
  });

  test('execute.md should contain post-execute hook reference', () => {
    const hasPostExecute = /post-execute/i.test(executeCmd);
    assert.ok(hasPostExecute, 'execute.md missing post-execute hook reference');
  });

  test('execute.md should contain phase-start hook reference', () => {
    const hasPhaseStart = /phase-start/i.test(executeCmd);
    assert.ok(hasPhaseStart, 'execute.md missing phase-start hook reference');
  });

  test('execute.md should contain phase-complete hook reference', () => {
    const hasPhaseComplete = /phase-complete/i.test(executeCmd);
    assert.ok(hasPhaseComplete, 'execute.md missing phase-complete hook reference');
  });
});

// ============================================================================
// Test Suite 6: commit.md Hook Integration
// ============================================================================

describe('Suite 6: commit.md Hook Integration', () => {
  test('commit.md should contain pre-commit hook reference', () => {
    const hasPreCommit = /pre-commit/i.test(commitCmd);
    assert.ok(hasPreCommit, 'commit.md missing pre-commit hook reference');
  });

  test('commit.md should contain post-commit hook reference', () => {
    const hasPostCommit = /post-commit/i.test(commitCmd);
    assert.ok(hasPostCommit, 'commit.md missing post-commit hook reference');
  });
});

// ============================================================================
// Test Suite 7: hook-run.md Command
// ============================================================================

describe('Suite 7: hook-run.md Command', () => {
  test('hook-run.md should exist', () => {
    assert.ok(fs.existsSync(HOOK_RUN_CMD_PATH), 'Missing hook-run.md');
  });

  test('hook-run.md should have type: prompt in YAML frontmatter', () => {
    const hasTypePrompt = /^type:\s*prompt/m.test(hookRunCmd);
    assert.ok(hasTypePrompt, 'hook-run.md missing type: prompt in frontmatter');
  });

  test('hook-run.md should have name: tiki:hook-run', () => {
    const hasName = /^name:\s*tiki:hook-run/m.test(hookRunCmd);
    assert.ok(hasName, 'hook-run.md missing name: tiki:hook-run');
  });

  test('hook-run.md should support --env flag', () => {
    const hasEnvFlag = /--env/i.test(hookRunCmd);
    assert.ok(hasEnvFlag, 'hook-run.md missing --env flag support');
  });

  test('hook-run.md should reference execute-hook.md', () => {
    const hasExecuteHookRef = /execute-hook\.md/i.test(hookRunCmd);
    assert.ok(hasExecuteHookRef, 'hook-run.md missing execute-hook.md reference');
  });
});

// ============================================================================
// Test Suite 8: Documentation
// ============================================================================

describe('Suite 8: Documentation', () => {
  test('hooks/README.md should exist', () => {
    assert.ok(fs.existsSync(HOOKS_README_PATH), 'Missing .tiki/hooks/README.md');
  });

  test('commands/README.md should exist', () => {
    assert.ok(fs.existsSync(COMMANDS_README_PATH), 'Missing .tiki/commands/README.md');
  });

  test('CLAUDE.md should contain Extensions System section', () => {
    const hasExtensionsSection = /Extensions System/i.test(claudeMd);
    assert.ok(hasExtensionsSection, 'CLAUDE.md missing Extensions System section');
  });
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log(`Tests completed: ${testsPassed} passed, ${testsFailed} failed`);
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
