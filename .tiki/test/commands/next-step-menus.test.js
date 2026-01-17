/**
 * Tests for next-step menu sections in Tiki commands (Issue #31)
 *
 * Verifies that all updated command files contain the required
 * next-step menu sections and patterns.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const COMMANDS_DIR = '.claude/commands/tiki';

// Commands that should have menus
const commandsWithMenus = [
  {
    file: 'get-issue.md',
    patterns: [
      'Offer Next Steps',
      'workflow.showNextStepMenu',
      'AskUserQuestion',
      'Done for now',
      'Skill'
    ]
  },
  {
    file: 'review-issue.md',
    patterns: [
      'Offer Next Steps',
      'workflow.showNextStepMenu',
      'AskUserQuestion',
      'Done for now',
      'Skill',
      'BLOCKED'  // Should skip menu on BLOCKED
    ]
  },
  {
    file: 'plan-issue.md',
    patterns: [
      'Offer Next Steps',
      'workflow.showNextStepMenu',
      'AskUserQuestion',
      'Done for now',
      'Skill'
    ]
  },
  {
    file: 'audit-plan.md',
    patterns: [
      'Offer Next Steps',
      'workflow.showNextStepMenu',
      'AskUserQuestion',
      'Done for now',
      'Skill',
      'errors'  // Should skip menu on errors
    ]
  },
  {
    file: 'execute.md',
    patterns: [
      'Offer Next Steps',
      'workflow.showNextStepMenu',
      'AskUserQuestion',
      'Done for now',
      'Skill'
    ]
  },
  {
    file: 'ship.md',
    patterns: [
      'Offer Next Steps',
      'workflow.showNextStepMenu',
      'AskUserQuestion',
      'Done for now',
      'Skill'
    ]
  }
];

// Run tests
console.log('Testing next-step menu sections in Tiki commands...\n');

let passed = 0;
let failed = 0;

for (const cmd of commandsWithMenus) {
  const filePath = path.join(COMMANDS_DIR, cmd.file);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    for (const pattern of cmd.patterns) {
      const hasPattern = content.includes(pattern);
      if (!hasPattern) {
        console.log(`FAIL: ${cmd.file} missing pattern: "${pattern}"`);
        failed++;
      } else {
        passed++;
      }
    }
  } catch (err) {
    console.log(`FAIL: Could not read ${cmd.file}: ${err.message}`);
    failed++;
  }
}

// Config check
try {
  const configPath = '.tiki/config.json';
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  assert(config.workflow, 'Config missing workflow section');
  assert(config.workflow.showNextStepMenu === true, 'showNextStepMenu should default to true');
  console.log('PASS: Config has workflow.showNextStepMenu = true');
  passed++;
} catch (err) {
  console.log(`FAIL: Config check failed: ${err.message}`);
  failed++;
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\nAll next-step menu tests passed!');
