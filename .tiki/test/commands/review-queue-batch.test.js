/**
 * Tests for review-queue.md batch operations with triggers
 * Phase 4 of Issue #15: Add batch operations for triggers
 *
 * Tests verify that review-queue.md contains the required batch operation
 * patterns for processing triggers alongside queue items.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REVIEW_QUEUE_PATH = path.join(__dirname, '..', '..', '..', '.claude', 'commands', 'tiki', 'review-queue.md');

let reviewQueueContent;

// Load the file once before all tests
try {
  reviewQueueContent = fs.readFileSync(REVIEW_QUEUE_PATH, 'utf8');
} catch (err) {
  console.error(`Failed to read review-queue.md: ${err.message}`);
  process.exit(1);
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}

console.log('\nReview Queue Batch Operations Tests\n');
console.log('=' .repeat(50));

// =============================================================================
// Test Group 1: --create-all batch operation includes triggers
// =============================================================================

console.log('\n1. --create-all batch operation with triggers\n');

test('--create-all section mentions creating ADRs for triggers', () => {
  // The --create-all section should document that it creates ADRs for high-confidence ADR triggers
  const createAllSection = reviewQueueContent.match(/### --create-all[\s\S]*?(?=###|$)/);
  assert.ok(createAllSection, '--create-all section should exist');

  const sectionContent = createAllSection[0];
  assert.ok(
    sectionContent.includes('ADR') && sectionContent.includes('trigger'),
    '--create-all section should mention creating ADRs for triggers'
  );
});

test('--create-all documents high-confidence trigger processing', () => {
  // Should specify that only high-confidence ADR triggers are auto-created
  const createAllSection = reviewQueueContent.match(/### --create-all[\s\S]*?(?=###|$)/);
  assert.ok(createAllSection, '--create-all section should exist');

  const sectionContent = createAllSection[0];
  assert.ok(
    sectionContent.includes('high-confidence') || sectionContent.includes('high confidence'),
    '--create-all should specify high-confidence ADR triggers are processed'
  );
});

test('--create-all shows count of triggers processed', () => {
  // The output example should show trigger counts
  const createAllSection = reviewQueueContent.match(/### --create-all[\s\S]*?(?=###|$)/);
  assert.ok(createAllSection, '--create-all section should exist');

  const sectionContent = createAllSection[0];
  // Should show counts for both issues and ADRs created
  assert.ok(
    sectionContent.includes('ADR') && (sectionContent.includes('created') || sectionContent.includes('Created')),
    '--create-all output should show ADR creation count'
  );
});

// =============================================================================
// Test Group 2: --dismiss-all batch operation includes triggers
// =============================================================================

console.log('\n2. --dismiss-all batch operation with triggers\n');

test('--dismiss-all section mentions dismissing triggers', () => {
  // The --dismiss-all section should document that it also dismisses triggers
  const dismissAllSection = reviewQueueContent.match(/### --dismiss-all[\s\S]*?(?=###|##[^#]|$)/);
  assert.ok(dismissAllSection, '--dismiss-all section should exist');

  const sectionContent = dismissAllSection[0];
  assert.ok(
    sectionContent.includes('trigger'),
    '--dismiss-all section should mention dismissing triggers'
  );
});

test('--dismiss-all shows counts for both items and triggers', () => {
  // Output should include separate counts for queue items and triggers
  const dismissAllSection = reviewQueueContent.match(/### --dismiss-all[\s\S]*?(?=###|##[^#]|$)/);
  assert.ok(dismissAllSection, '--dismiss-all section should exist');

  const sectionContent = dismissAllSection[0];
  assert.ok(
    sectionContent.includes('item') && sectionContent.includes('trigger'),
    '--dismiss-all output should show both item and trigger counts'
  );
});

// =============================================================================
// Test Group 3: Batch confirmation messages include trigger counts
// =============================================================================

console.log('\n3. Batch confirmation messages with trigger counts\n');

test('batch operations document that they affect both queue items and triggers', () => {
  // There should be documentation explaining batch operations affect both
  const batchSection = reviewQueueContent.match(/## Batch Operations[\s\S]*?(?=##[^#]|$)/);
  assert.ok(batchSection, 'Batch Operations section should exist');

  const sectionContent = batchSection[0];
  assert.ok(
    sectionContent.includes('trigger') && sectionContent.includes('item'),
    'Batch Operations section should document that both items and triggers are affected'
  );
});

test('confirmation messages show separate counts for items and triggers', () => {
  // Look for confirmation message patterns that show both counts
  const batchSection = reviewQueueContent.match(/## Batch Operations[\s\S]*?(?=##[^#]|$)/);
  assert.ok(batchSection, 'Batch Operations section should exist');

  const sectionContent = batchSection[0];
  // Should have output examples showing counts
  const hasItemCount = /\d+\s*(item|issue)/i.test(sectionContent);
  const hasTriggerCount = /\d+\s*(trigger|ADR)/i.test(sectionContent);

  assert.ok(
    hasItemCount && hasTriggerCount,
    'Confirmation messages should show counts for both items and triggers'
  );
});

// =============================================================================
// Test Group 4: Processed tracking for triggers
// =============================================================================

console.log('\n4. Processed tracking for triggers\n');

test('triggers processing is tracked in pending.json', () => {
  // The file should document tracking processed triggers
  assert.ok(
    reviewQueueContent.includes('processed') &&
    reviewQueueContent.includes('trigger') &&
    reviewQueueContent.includes('.tiki/triggers/pending.json'),
    'Should document tracking processed triggers in triggers/pending.json'
  );
});

test('trigger processing outcomes are recorded', () => {
  // Should show the processed array format with trigger actions
  const triggerProcessedExample = reviewQueueContent.includes('"action": "created-adr"') ||
    reviewQueueContent.includes('"action": "updated-claude-md"') ||
    reviewQueueContent.includes('action.*adr');

  assert.ok(
    triggerProcessedExample,
    'Should document recording trigger processing outcomes (created-adr, updated-claude-md, dismissed)'
  );
});

// =============================================================================
// Test Group 5: Summary output includes trigger counts
// =============================================================================

console.log('\n5. Summary output with trigger counts\n');

test('summary output includes ADR trigger counts', () => {
  // Look for summary section that includes trigger statistics
  const summarySection = reviewQueueContent.match(/## Queue Processing Complete[\s\S]*?(?=##|$)/) ||
    reviewQueueContent.match(/### Step 5: Summary[\s\S]*?(?=##|$)/);

  assert.ok(summarySection, 'Summary section should exist');

  const sectionContent = summarySection[0];
  assert.ok(
    sectionContent.includes('ADR') && sectionContent.includes('trigger'),
    'Summary should include ADR trigger processing counts'
  );
});

test('summary output includes convention trigger counts', () => {
  // Look for summary section that includes convention trigger statistics
  const summarySection = reviewQueueContent.match(/## Queue Processing Complete[\s\S]*?(?=##|$)/) ||
    reviewQueueContent.match(/### Step 5: Summary[\s\S]*?(?=##|$)/);

  assert.ok(summarySection, 'Summary section should exist');

  const sectionContent = summarySection[0];
  assert.ok(
    sectionContent.includes('convention') || sectionContent.includes('CLAUDE.md'),
    'Summary should include convention trigger processing counts'
  );
});

// =============================================================================
// Test Group 6: Batch operation specific patterns for triggers
// =============================================================================

console.log('\n6. Trigger-specific batch operation patterns\n');

test('--create-all handles ADR triggers separately from queue items', () => {
  // The create-all should have distinct handling for ADR triggers vs queue items
  const createAllSection = reviewQueueContent.match(/### --create-all[\s\S]*?(?=###|$)/);
  assert.ok(createAllSection, '--create-all section should exist');

  const sectionContent = createAllSection[0];
  // Should mention both issue creation AND ADR creation as separate actions
  const mentionsIssues = sectionContent.includes('issue') || sectionContent.includes('Issue');
  const mentionsADRs = sectionContent.includes('ADR');

  assert.ok(
    mentionsIssues && mentionsADRs,
    '--create-all should handle both queue items (issues) and ADR triggers separately'
  );
});

test('batch operations respect trigger confidence levels', () => {
  // Only high-confidence triggers should be auto-processed in batch
  assert.ok(
    reviewQueueContent.includes('high-confidence') ||
    reviewQueueContent.includes('high confidence') ||
    reviewQueueContent.includes('confidence: high'),
    'Batch operations should respect trigger confidence levels (only process high-confidence)'
  );
});

// =============================================================================
// Results Summary
// =============================================================================

console.log('\n' + '=' .repeat(50));
console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\nSUMMARY: Created 12 failing tests for Phase 4 batch operations functionality');
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
  process.exit(0);
}
