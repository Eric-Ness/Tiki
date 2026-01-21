/**
 * Tests for Knowledge System
 * Issue #86: Add institutional knowledge system with automatic capture
 *
 * These tests verify:
 * - knowledge.md command structure and required sections
 * - Schema file validity for knowledge entries and index
 * - Conditional prompt files exist
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const KNOWLEDGE_CMD_PATH = path.join(__dirname, '../../../.claude/commands/tiki/knowledge.md');
const KNOWLEDGE_SCHEMA_PATH = path.join(__dirname, '../../schemas/knowledge.schema.json');
const KNOWLEDGE_INDEX_SCHEMA_PATH = path.join(__dirname, '../../schemas/knowledge-index.schema.json');
const ADD_ENTRY_PROMPT_PATH = path.join(__dirname, '../../prompts/knowledge/add-entry.md');
const SEARCH_DISPLAY_PROMPT_PATH = path.join(__dirname, '../../prompts/knowledge/search-display.md');

let cmdContent = '';
let knowledgeSchema = null;
let indexSchema = null;
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

// Load files before running tests
try {
  cmdContent = fs.readFileSync(KNOWLEDGE_CMD_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read knowledge.md: ${error.message}`);
  process.exit(1);
}

try {
  knowledgeSchema = JSON.parse(fs.readFileSync(KNOWLEDGE_SCHEMA_PATH, 'utf-8'));
} catch (error) {
  console.error(`Failed to read/parse knowledge.schema.json: ${error.message}`);
  process.exit(1);
}

try {
  indexSchema = JSON.parse(fs.readFileSync(KNOWLEDGE_INDEX_SCHEMA_PATH, 'utf-8'));
} catch (error) {
  console.error(`Failed to read/parse knowledge-index.schema.json: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite: Command Structure (YAML Frontmatter)
// ============================================================================

describe('Command Structure: YAML Frontmatter', () => {
  test('should have YAML frontmatter delimiters', () => {
    const hasFrontmatter = cmdContent.startsWith('---') && cmdContent.includes('---', 4);
    assert.ok(hasFrontmatter, 'Missing YAML frontmatter delimiters');
  });

  test('should have type: prompt', () => {
    const hasType = /^type:\s*prompt/m.test(cmdContent);
    assert.ok(hasType, 'Missing type: prompt in frontmatter');
  });

  test('should have name: tiki:knowledge', () => {
    const hasName = /^name:\s*tiki:knowledge/m.test(cmdContent);
    assert.ok(hasName, 'Missing name: tiki:knowledge in frontmatter');
  });

  test('should have description field', () => {
    const hasDescription = /^description:/m.test(cmdContent);
    assert.ok(hasDescription, 'Missing description in frontmatter');
  });

  test('should have allowed-tools field', () => {
    const hasTools = /^allowed-tools:/m.test(cmdContent);
    assert.ok(hasTools, 'Missing allowed-tools in frontmatter');
  });

  test('should have argument-hint field', () => {
    const hasHint = /^argument-hint:/m.test(cmdContent);
    assert.ok(hasHint, 'Missing argument-hint in frontmatter');
  });
});

// ============================================================================
// Test Suite: Required Sections
// ============================================================================

describe('Required Sections', () => {
  test('should have Usage section', () => {
    const hasUsage = /^##\s*Usage/m.test(cmdContent);
    assert.ok(hasUsage, 'Missing Usage section');
  });

  test('should have Instructions section', () => {
    const hasInstructions = /^##\s*Instructions/m.test(cmdContent);
    assert.ok(hasInstructions, 'Missing Instructions section');
  });

  test('should have Notes section', () => {
    const hasNotes = /^##\s*Notes/m.test(cmdContent);
    assert.ok(hasNotes, 'Missing Notes section');
  });

  test('should document all subcommands in Usage', () => {
    const hasAdd = /add\s*".*"/i.test(cmdContent);
    const hasEdit = /edit\s*K/i.test(cmdContent);
    const hasShow = /show\s*K/i.test(cmdContent);
    const hasList = /\blist\b/i.test(cmdContent);
    const hasSearch = /search\s*[<"]/i.test(cmdContent);
    const hasArchive = /archive\s*K/i.test(cmdContent);

    assert.ok(hasAdd, 'Missing add subcommand in Usage');
    assert.ok(hasEdit, 'Missing edit subcommand in Usage');
    assert.ok(hasShow, 'Missing show subcommand in Usage');
    assert.ok(hasList, 'Missing list subcommand in Usage');
    assert.ok(hasSearch, 'Missing search subcommand in Usage');
    assert.ok(hasArchive, 'Missing archive subcommand in Usage');
  });
});

// ============================================================================
// Test Suite: Storage Initialization
// ============================================================================

describe('Storage Initialization', () => {
  test('should document storage directory structure', () => {
    const hasStructure = /\.tiki\/knowledge\//i.test(cmdContent);
    assert.ok(hasStructure, 'Missing .tiki/knowledge/ directory documentation');
  });

  test('should document index.json initialization', () => {
    const hasIndex = /index\.json/i.test(cmdContent);
    assert.ok(hasIndex, 'Missing index.json documentation');
  });

  test('should document entries directory', () => {
    const hasEntries = /entries\//i.test(cmdContent);
    assert.ok(hasEntries, 'Missing entries/ directory documentation');
  });

  test('should handle first run (empty directory)', () => {
    const hasFirstRun = /doesn't\s*exist|create.*directory|initialize/i.test(cmdContent);
    assert.ok(hasFirstRun, 'Missing first run (empty directory) handling');
  });
});

// ============================================================================
// Test Suite: Knowledge Schema Validity
// ============================================================================

describe('Knowledge Schema Validity', () => {
  test('should have $schema field', () => {
    assert.ok(knowledgeSchema.$schema, 'Missing $schema in knowledge.schema.json');
  });

  test('should have $id field', () => {
    assert.ok(knowledgeSchema.$id, 'Missing $id in knowledge.schema.json');
  });

  test('should have required fields defined', () => {
    assert.ok(Array.isArray(knowledgeSchema.required), 'Missing required array');
    assert.ok(knowledgeSchema.required.includes('id'), 'Missing id in required');
    assert.ok(knowledgeSchema.required.includes('title'), 'Missing title in required');
    assert.ok(knowledgeSchema.required.includes('content'), 'Missing content in required');
    assert.ok(knowledgeSchema.required.includes('confidence'), 'Missing confidence in required');
    assert.ok(knowledgeSchema.required.includes('source'), 'Missing source in required');
    assert.ok(knowledgeSchema.required.includes('keywords'), 'Missing keywords in required');
  });

  test('should have confidence enum with correct values', () => {
    const confidence = knowledgeSchema.properties?.confidence;
    assert.ok(confidence, 'Missing confidence property');
    assert.ok(Array.isArray(confidence.enum), 'Confidence should have enum');
    assert.ok(confidence.enum.includes('high'), 'Confidence enum missing high');
    assert.ok(confidence.enum.includes('medium'), 'Confidence enum missing medium');
    assert.ok(confidence.enum.includes('low'), 'Confidence enum missing low');
  });

  test('should have source.type enum with correct values', () => {
    const sourceType = knowledgeSchema.properties?.source?.properties?.type;
    assert.ok(sourceType, 'Missing source.type property');
    assert.ok(Array.isArray(sourceType.enum), 'source.type should have enum');
    assert.ok(sourceType.enum.includes('issue'), 'source.type enum missing issue');
    assert.ok(sourceType.enum.includes('manual'), 'source.type enum missing manual');
    assert.ok(sourceType.enum.includes('debug-session'), 'source.type enum missing debug-session');
    assert.ok(sourceType.enum.includes('execution'), 'source.type enum missing execution');
  });

  test('should have id pattern for K### format', () => {
    const id = knowledgeSchema.properties?.id;
    assert.ok(id?.pattern, 'Missing id pattern');
    assert.ok(id.pattern.includes('K'), 'ID pattern should include K prefix');
  });
});

// ============================================================================
// Test Suite: Knowledge Index Schema Validity
// ============================================================================

describe('Knowledge Index Schema Validity', () => {
  test('should have $schema field', () => {
    assert.ok(indexSchema.$schema, 'Missing $schema in knowledge-index.schema.json');
  });

  test('should have $id field', () => {
    assert.ok(indexSchema.$id, 'Missing $id in knowledge-index.schema.json');
  });

  test('should have required fields defined', () => {
    assert.ok(Array.isArray(indexSchema.required), 'Missing required array');
    assert.ok(indexSchema.required.includes('lastUpdated'), 'Missing lastUpdated in required');
    assert.ok(indexSchema.required.includes('nextId'), 'Missing nextId in required');
    assert.ok(indexSchema.required.includes('entries'), 'Missing entries in required');
  });

  test('should have entries as object type', () => {
    const entries = indexSchema.properties?.entries;
    assert.ok(entries, 'Missing entries property');
    assert.strictEqual(entries.type, 'object', 'Entries should be object type');
  });

  test('index entry should have confidence enum', () => {
    const entryConfidence = indexSchema.properties?.entries?.additionalProperties?.properties?.confidence;
    assert.ok(entryConfidence, 'Missing confidence in index entry');
    assert.ok(Array.isArray(entryConfidence.enum), 'Index entry confidence should have enum');
  });
});

// ============================================================================
// Test Suite: Conditional Prompt Files Exist
// ============================================================================

describe('Conditional Prompt Files Exist', () => {
  test('add-entry.md prompt should exist', () => {
    assert.ok(fs.existsSync(ADD_ENTRY_PROMPT_PATH), 'Missing add-entry.md prompt file');
  });

  test('search-display.md prompt should exist', () => {
    assert.ok(fs.existsSync(SEARCH_DISPLAY_PROMPT_PATH), 'Missing search-display.md prompt file');
  });

  test('command should reference add-entry.md for add action', () => {
    const hasAddRef = /add-entry\.md/i.test(cmdContent);
    assert.ok(hasAddRef, 'Command should reference add-entry.md prompt');
  });

  test('command should reference search-display.md for search action', () => {
    const hasSearchRef = /search-display\.md/i.test(cmdContent);
    assert.ok(hasSearchRef, 'Command should reference search-display.md prompt');
  });
});

// ============================================================================
// Test Suite: Edge Cases Documented
// ============================================================================

describe('Edge Cases Documented', () => {
  test('should document pagination in list (20 entries default)', () => {
    const hasPagination = /20|max|default/i.test(cmdContent) && /list/i.test(cmdContent);
    assert.ok(hasPagination, 'Missing pagination documentation for list');
  });

  test('should document archived entries behavior', () => {
    const hasArchived = /archived.*hidden|--all.*flag|filter.*archived/i.test(cmdContent);
    assert.ok(hasArchived, 'Missing archived entries behavior documentation');
  });

  test('should document auto-generated entry marking', () => {
    const hasAutoGen = /autoGenerated/i.test(cmdContent);
    assert.ok(hasAutoGen, 'Missing autoGenerated entry documentation');
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
