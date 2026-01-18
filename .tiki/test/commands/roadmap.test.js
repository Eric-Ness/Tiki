/**
 * Tests for /tiki:roadmap command
 * Issue #43: Multi-release planning and roadmap visualization
 *
 * These tests verify that roadmap.md contains all required sections for
 * generating project roadmap visualizations.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROADMAP_PATH = path.join(__dirname, '../../../.claude/commands/tiki/roadmap.md');

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
  content = fs.readFileSync(ROADMAP_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read roadmap.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite 1: YAML Frontmatter Tests
// ============================================================================

describe('1. YAML Frontmatter Tests', () => {
  test('should have valid frontmatter with --- delimiters', () => {
    const hasFrontmatter = /^---\n[\s\S]*?\n---/m.test(content);
    assert.ok(hasFrontmatter, 'Missing YAML frontmatter with --- delimiters');
  });

  test('should have type: prompt', () => {
    const hasTypePrompt = /type:\s*prompt/i.test(content);
    assert.ok(hasTypePrompt, 'Missing "type: prompt" in frontmatter');
  });

  test('should have name: tiki:roadmap', () => {
    const hasName = /name:\s*tiki:roadmap/i.test(content);
    assert.ok(hasName, 'Missing "name: tiki:roadmap" in frontmatter');
  });

  test('should have allowed-tools including Read, Bash, Glob, Write', () => {
    const hasRead = /allowed-tools:.*Read/i.test(content);
    const hasBash = /allowed-tools:.*Bash/i.test(content);
    const hasGlob = /allowed-tools:.*Glob/i.test(content);
    const hasWrite = /allowed-tools:.*Write/i.test(content);
    assert.ok(hasRead && hasBash && hasGlob && hasWrite, 'Missing required tools in allowed-tools');
  });

  test('should have argument-hint with flags documented', () => {
    const hasArgumentHint = /argument-hint:.*--output.*--include-archived.*--releases.*--format/i.test(content);
    assert.ok(hasArgumentHint, 'Missing argument-hint with all flags');
  });
});

// ============================================================================
// Test Suite 2: Core Structure Tests
// ============================================================================

describe('2. Core Structure Tests', () => {
  test('should have Usage section with flag examples', () => {
    const hasUsage = /##\s*Usage/i.test(content);
    const hasExamples = /\/tiki:roadmap\s+--output|\/tiki:roadmap\s+--include-archived|\/tiki:roadmap\s+--releases|\/tiki:roadmap\s+--format/i.test(content);
    assert.ok(hasUsage && hasExamples, 'Missing Usage section with flag examples');
  });

  test('should have Instructions section with Step 1-7 documented', () => {
    const hasInstructions = /##\s*Instructions/i.test(content);
    const hasStep1 = /###\s*Step\s*1/i.test(content);
    const hasStep2 = /###\s*Step\s*2/i.test(content);
    const hasStep3 = /###\s*Step\s*3/i.test(content);
    const hasStep4 = /###\s*Step\s*4/i.test(content);
    const hasStep5 = /###\s*Step\s*5/i.test(content);
    const hasStep6 = /###\s*Step\s*6/i.test(content);
    const hasStep7 = /###\s*Step\s*7/i.test(content);
    assert.ok(hasInstructions && hasStep1 && hasStep2 && hasStep3 && hasStep4 && hasStep5 && hasStep6 && hasStep7,
      'Missing Instructions section with Steps 1-7');
  });

  test('should have Helper Functions section', () => {
    const hasHelperFunctions = /##\s*Helper\s*Functions/i.test(content);
    assert.ok(hasHelperFunctions, 'Missing Helper Functions section');
  });
});

// ============================================================================
// Test Suite 3: Version Handling Tests
// ============================================================================

describe('3. Version Handling Tests', () => {
  test('should have parseVersion function', () => {
    const hasParseVersion = /function\s+parseVersion/i.test(content);
    assert.ok(hasParseVersion, 'Missing parseVersion function');
  });

  test('should have compareVersions function for semver sorting', () => {
    const hasCompareVersions = /function\s+compareVersions/i.test(content);
    assert.ok(hasCompareVersions, 'Missing compareVersions function');
  });

  test('should handle version formats like v1.0, v1.1.0, v2.0.0-beta', () => {
    const hasVersionNormalization = /replace.*\^v|v1\.0|v1\.1\.0|v2\.0\.0-beta|prerelease/i.test(content);
    assert.ok(hasVersionNormalization, 'Missing version format handling');
  });
});

// ============================================================================
// Test Suite 4: Status Symbol Tests
// ============================================================================

describe('4. Status Symbol Tests', () => {
  test('should have getStatusSymbol function', () => {
    const hasGetStatusSymbol = /function\s+getStatusSymbol/i.test(content);
    assert.ok(hasGetStatusSymbol, 'Missing getStatusSymbol function');
  });

  test('should map completed to checkmark symbol', () => {
    const hasCompletedSymbol = /'completed':\s*'✓'|completed.*✓/i.test(content);
    assert.ok(hasCompletedSymbol, 'Missing completed -> checkmark mapping');
  });

  test('should map in_progress to half-circle symbol', () => {
    const hasInProgressSymbol = /'in_progress':\s*'◐'|in_progress.*◐/i.test(content);
    assert.ok(hasInProgressSymbol, 'Missing in_progress -> half-circle mapping');
  });

  test('should map planned to circle symbol', () => {
    const hasPlannedSymbol = /'planned':\s*'○'|planned.*○/i.test(content);
    assert.ok(hasPlannedSymbol, 'Missing planned -> circle mapping');
  });

  test('should map not_planned to dot symbol', () => {
    const hasNotPlannedSymbol = /'not_planned':\s*'·'|not_planned.*·/i.test(content);
    assert.ok(hasNotPlannedSymbol, 'Missing not_planned -> dot mapping');
  });
});

// ============================================================================
// Test Suite 5: Empty State Handling Tests
// ============================================================================

describe('5. Empty State Handling Tests', () => {
  test('should have empty state message when no releases', () => {
    const hasEmptyState = /##\s*Empty\s*State\s*Handling|No\s*Releases\s*Found|no\s*releases\s*have\s*been\s*created/i.test(content);
    assert.ok(hasEmptyState, 'Missing empty state handling section');
  });

  test('should suggest /tiki:release new command', () => {
    const hasSuggestion = /\/tiki:release\s+new/i.test(content);
    assert.ok(hasSuggestion, 'Missing suggestion for /tiki:release new command');
  });

  test('should mention /tiki:state as alternative', () => {
    const hasTikiState = /\/tiki:state/i.test(content);
    assert.ok(hasTikiState, 'Missing mention of /tiki:state as alternative');
  });
});

// ============================================================================
// Test Suite 6: ASCII Timeline Format Tests
// ============================================================================

describe('6. ASCII Timeline Format Tests', () => {
  test('should have ASCII timeline output format section', () => {
    const hasASCIISection = /##\s*ASCII\s*Timeline\s*Format/i.test(content);
    assert.ok(hasASCIISection, 'Missing ASCII Timeline Format section');
  });

  test('should show tree characters', () => {
    const hasTreeChars = /├──|└──/i.test(content);
    assert.ok(hasTreeChars, 'Missing tree characters (├── └──)');
  });

  test('should include Legend with status symbols', () => {
    const hasLegend = /Legend:.*✓.*completed.*◐.*in_progress.*○.*planned.*·.*not_planned/i.test(content);
    assert.ok(hasLegend, 'Missing Legend with status symbols');
  });

  test('should have progress percentage calculation', () => {
    const hasProgressCalc = /calculateProgress|progress.*%|percent/i.test(content);
    assert.ok(hasProgressCalc, 'Missing progress percentage calculation');
  });
});

// ============================================================================
// Test Suite 7: Requirements Coverage Tests
// ============================================================================

describe('7. Requirements Coverage Tests', () => {
  test('should have requirements coverage section', () => {
    const hasRequirementsCoverage = /##\s*Requirements\s*Coverage/i.test(content);
    assert.ok(hasRequirementsCoverage, 'Missing Requirements Coverage section');
  });

  test('should handle missing requirements.json gracefully', () => {
    const hasGracefulHandling = /requirements\.json.*doesn't\s*exist|requirements\s*tracking\s*is\s*not\s*configured|catch|null/i.test(content);
    assert.ok(hasGracefulHandling, 'Missing graceful handling for missing requirements.json');
  });

  test('should show coverage table format', () => {
    const hasCoverageTable = /Requirements\s*Coverage\s*by\s*Release|\|\s*Requirement\s*\|\s*Description/i.test(content);
    assert.ok(hasCoverageTable, 'Missing coverage table format');
  });

  test('should mention /tiki:define-requirements', () => {
    const hasDefineReqs = /\/tiki:define-requirements/i.test(content);
    assert.ok(hasDefineReqs, 'Missing mention of /tiki:define-requirements');
  });
});

// ============================================================================
// Test Suite 8: Output Flags Tests
// ============================================================================

describe('8. Output Flags Tests', () => {
  test('should document --output flag for ROADMAP.md generation', () => {
    const hasOutputFlag = /--output.*ROADMAP\.md|ROADMAP\.md.*--output/i.test(content);
    assert.ok(hasOutputFlag, 'Missing --output flag documentation');
  });

  test('should document --include-archived flag', () => {
    const hasArchivedFlag = /--include-archived.*archive|archive.*--include-archived/i.test(content);
    assert.ok(hasArchivedFlag, 'Missing --include-archived flag documentation');
  });

  test('should document --releases filter flag', () => {
    const hasReleasesFlag = /--releases.*filter|filter.*--releases|--releases\s*<versions>/i.test(content);
    assert.ok(hasReleasesFlag, 'Missing --releases filter flag documentation');
  });

  test('should document --format ascii|table flag', () => {
    const hasFormatFlag = /--format\s*ascii\|table|--format.*ascii.*table/i.test(content);
    assert.ok(hasFormatFlag, 'Missing --format ascii|table flag documentation');
  });
});

// ============================================================================
// Test Suite 9: Table Format Tests
// ============================================================================

describe('9. Table Format Tests', () => {
  test('should have table format section', () => {
    const hasTableSection = /##\s*Table\s*Format/i.test(content);
    assert.ok(hasTableSection, 'Missing Table Format section');
  });

  test('should show release summary table', () => {
    const hasSummaryTable = /\|\s*Release\s*\|\s*Status\s*\|\s*Issues\s*\|\s*Progress/i.test(content);
    assert.ok(hasSummaryTable, 'Missing release summary table');
  });

  test('should show issue details table', () => {
    const hasDetailsTable = /###\s*Issue\s*Details|\|\s*#\s*\|\s*Title\s*\|\s*Status/i.test(content);
    assert.ok(hasDetailsTable, 'Missing issue details table');
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
