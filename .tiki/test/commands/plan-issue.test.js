/**
 * TDD Tests for Phase 1: Define Success Criteria Schema and Extraction
 * Issue #11: Add goal-backward planning to /plan-issue with success criteria
 *
 * These tests verify that plan-issue.md contains the required sections for
 * success criteria extraction and schema definitions.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PLAN_ISSUE_PATH = path.join(__dirname, '../../../.claude/commands/tiki/plan-issue.md');

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
  content = fs.readFileSync(PLAN_ISSUE_PATH, 'utf-8');
} catch (error) {
  console.error(`Failed to read plan-issue.md: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// Test Suite: Step 2.5 - Extract Success Criteria
// ============================================================================

describe('Step 2.5: Extract Success Criteria', () => {
  test('should have Step 2.5 Extract Success Criteria section', () => {
    const hasStep2_5 = /###\s*Step\s*2\.5[:\s]*Extract\s*Success\s*Criteria/i.test(content);
    assert.ok(hasStep2_5, 'Missing "Step 2.5: Extract Success Criteria" section');
  });

  test('Step 2.5 should appear between Step 2 (Analyze) and Step 3 (Explore)', () => {
    const step2Match = content.search(/###\s*Step\s*2[:\s]*Analyze/i);
    const step2_5Match = content.search(/###\s*Step\s*2\.5[:\s]*Extract\s*Success\s*Criteria/i);
    const step3Match = content.search(/###\s*Step\s*3[:\s]*Explore/i);

    assert.ok(step2Match >= 0, 'Step 2 not found');
    assert.ok(step2_5Match >= 0, 'Step 2.5 not found');
    assert.ok(step3Match >= 0, 'Step 3 not found');
    assert.ok(step2Match < step2_5Match, 'Step 2.5 should come after Step 2');
    assert.ok(step2_5Match < step3Match, 'Step 2.5 should come before Step 3');
  });
});

// ============================================================================
// Test Suite: Criteria Extraction Logic
// ============================================================================

describe('Criteria Extraction Logic', () => {
  test('should document parsing of Acceptance Criteria sections from issue body', () => {
    const hasAcceptanceCriteria = /acceptance\s*criteria/i.test(content);
    const hasParsingLogic = /parse|extract/i.test(content) && /issue\s*body/i.test(content);
    assert.ok(
      hasAcceptanceCriteria && hasParsingLogic,
      'Missing documentation for parsing Acceptance Criteria from issue body'
    );
  });

  test('should document AI-generated criteria for implicit requirements', () => {
    const hasAIGenerated = /AI[-\s]generated|generate.*criteria|implicit\s*requirements/i.test(content);
    assert.ok(hasAIGenerated, 'Missing documentation for AI-generated criteria');
  });

  test('should mention non-functional requirements as AI-generated criteria', () => {
    const hasNonFunctional = /non[-\s]?functional/i.test(content);
    assert.ok(hasNonFunctional, 'Missing mention of non-functional requirements');
  });

  test('should mention testing requirements as AI-generated criteria', () => {
    const hasTestingCriteria = /testing\s*(requirements|criteria)/i.test(content);
    assert.ok(hasTestingCriteria, 'Missing mention of testing requirements/criteria');
  });

  test('should mention edge cases as AI-generated criteria', () => {
    const hasEdgeCases = /edge\s*cases/i.test(content);
    assert.ok(hasEdgeCases, 'Missing mention of edge cases in criteria');
  });
});

// ============================================================================
// Test Suite: Criteria Categories
// ============================================================================

describe('Criteria Categories', () => {
  test('should define functional criteria category', () => {
    const hasFunctional = /functional\s*(criteria|category|:)/i.test(content);
    assert.ok(hasFunctional, 'Missing functional criteria category definition');
  });

  test('should define non-functional criteria category', () => {
    const hasNonFunctional = /non[-\s]?functional\s*(criteria|category|:)/i.test(content);
    assert.ok(hasNonFunctional, 'Missing non-functional criteria category definition');
  });

  test('should define testing criteria category', () => {
    const hasTesting = /testing\s*(criteria|category|:)/i.test(content);
    assert.ok(hasTesting, 'Missing testing criteria category definition');
  });

  test('should define documentation criteria category', () => {
    const hasDocumentation = /documentation\s*(criteria|category|:)/i.test(content);
    assert.ok(hasDocumentation, 'Missing documentation criteria category definition');
  });

  test('should list all four categories together', () => {
    // Check that all four categories are mentioned in close proximity (within same section)
    const categoriesPattern = /functional.*non[-\s]?functional.*testing.*documentation|categories.*functional.*non[-\s]?functional.*testing.*documentation/is;
    const hasAllCategories = categoriesPattern.test(content);
    assert.ok(hasAllCategories, 'All four criteria categories should be listed together');
  });
});

// ============================================================================
// Test Suite: User Confirmation Prompt
// ============================================================================

describe('User Confirmation Prompt', () => {
  test('should document user confirmation prompt for criteria', () => {
    const hasConfirmation = /confirm|proceed.*criteria|criteria.*proceed/i.test(content);
    assert.ok(hasConfirmation, 'Missing user confirmation prompt documentation');
  });

  test('should include y/edit/add options in confirmation prompt', () => {
    const hasYOption = /\[y|yes\]/i.test(content) || /\by\b.*edit.*add/i.test(content);
    const hasEditOption = /edit/i.test(content);
    const hasAddOption = /add\s*more/i.test(content);
    assert.ok(
      hasYOption && hasEditOption && hasAddOption,
      'Confirmation prompt should include [y/edit/add more] options'
    );
  });

  test('should mark confirmation prompt as optional', () => {
    const isOptional = /optional.*confirm|confirm.*optional/i.test(content);
    assert.ok(isOptional, 'Confirmation prompt should be marked as optional');
  });
});

// ============================================================================
// Test Suite: Plan JSON Schema - Success Criteria
// ============================================================================

describe('Plan JSON Schema - Success Criteria', () => {
  test('should include successCriteria field in plan JSON schema', () => {
    const hasSuccessCriteria = /"successCriteria"/i.test(content);
    assert.ok(hasSuccessCriteria, 'Plan JSON schema should include "successCriteria" field');
  });

  test('successCriteria should be an array in schema', () => {
    const schemaMatch = content.match(/"successCriteria"\s*:\s*\[/);
    assert.ok(schemaMatch, 'successCriteria should be defined as an array in the schema');
  });

  test('successCriteria should be at top level of plan schema', () => {
    // Look for successCriteria at the same level as "issue", "phases", etc.
    const jsonSchemaSection = content.match(/```json[\s\S]*?{[\s\S]*?"issue"[\s\S]*?}[\s\S]*?```/);
    assert.ok(jsonSchemaSection, 'Could not find plan JSON schema');

    const schemaContent = jsonSchemaSection[0];
    const hasTopLevelSuccessCriteria = /"successCriteria"\s*:/.test(schemaContent);
    assert.ok(hasTopLevelSuccessCriteria, 'successCriteria should be at top level of plan schema');
  });

  test('successCriteria items should have category field', () => {
    const hasCategoryField = /"category"\s*:/i.test(content);
    assert.ok(hasCategoryField, 'successCriteria items should include category field');
  });

  test('successCriteria items should have description/text field', () => {
    const hasDescriptionField = /"description"|"text"|"criterion"/i.test(content);
    assert.ok(hasDescriptionField, 'successCriteria items should include description/text field');
  });
});

// ============================================================================
// Test Suite: Plan Output Display
// ============================================================================

describe('Plan Output Display - Success Criteria', () => {
  test('should show success criteria in Step 6 plan output example', () => {
    // Find Step 6 section and check for criteria display
    const step6Section = content.match(/###\s*Step\s*6[:\s]*Display[\s\S]*?(?=###|##|$)/i);
    assert.ok(step6Section, 'Could not find Step 6 section');

    const hasSuccessCriteriaDisplay = /success\s*criteria|criteria/i.test(step6Section[0]);
    assert.ok(hasSuccessCriteriaDisplay, 'Step 6 should display success criteria');
  });

  test('should include criteria section in plan summary output', () => {
    const outputExample = content.match(/```[\s\S]*?##\s*Plan\s*for\s*Issue[\s\S]*?```/i);
    assert.ok(outputExample, 'Could not find plan summary output example');

    const hasCriteriaInOutput = /success\s*criteria|criteria.*:/i.test(outputExample[0]);
    assert.ok(hasCriteriaInOutput, 'Plan summary should include success criteria section');
  });
});

// ============================================================================
// Test Suite: Phase 2 - Task-to-Criteria Mapping (addressesCriteria)
// ============================================================================

describe('Phase JSON Schema - addressesCriteria Field', () => {
  test('should include addressesCriteria field in phase JSON schema', () => {
    const hasAddressesCriteria = /"addressesCriteria"/i.test(content);
    assert.ok(hasAddressesCriteria, 'Phase JSON schema should include "addressesCriteria" field');
  });

  test('addressesCriteria should be an array in the phase schema', () => {
    const schemaMatch = content.match(/"addressesCriteria"\s*:\s*\[/);
    assert.ok(schemaMatch, 'addressesCriteria should be defined as an array in the phase schema');
  });

  test('addressesCriteria should be at phase level (not top level)', () => {
    // Look for addressesCriteria within phases array context
    const phasesSection = content.match(/"phases"\s*:\s*\[[\s\S]*?\]/);
    assert.ok(phasesSection, 'Could not find phases array in schema');

    const hasAddressesCriteriaInPhase = /"addressesCriteria"\s*:/.test(phasesSection[0]);
    assert.ok(hasAddressesCriteriaInPhase, 'addressesCriteria should be inside a phase object');
  });

  test('addressesCriteria array should contain criterion references', () => {
    // Should show example like ["functional-1", "testing-1"] or similar reference format
    const hasReferenceExample = /"addressesCriteria"\s*:\s*\[\s*"[^"]+"/i.test(content);
    assert.ok(hasReferenceExample, 'addressesCriteria should contain string references to criteria');
  });
});

describe('Step 4: Task-to-Criteria Mapping Instructions', () => {
  test('Step 4 should mention mapping tasks to success criteria', () => {
    // Find Step 4 section and check for mapping instructions
    const step4Section = content.match(/###\s*Step\s*4[:\s]*Break[\s\S]*?(?=###|##|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    const hasMappingInstruction = /map.*task.*criteria|task.*addresses.*criteria|criteria.*mapping|addressesCriteria/i.test(step4Section[0]);
    assert.ok(hasMappingInstruction, 'Step 4 should include instructions for mapping tasks to criteria');
  });

  test('Step 4 should explain which criteria each phase addresses', () => {
    const step4Section = content.match(/###\s*Step\s*4[:\s]*Break[\s\S]*?(?=###|##|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    const hasAddressesExplanation = /phase.*address|address.*criteria|satisf.*criteria/i.test(step4Section[0]);
    assert.ok(hasAddressesExplanation, 'Step 4 should explain how phases address success criteria');
  });

  test('Step 4 should mention ensuring all criteria are covered', () => {
    const step4Section = content.match(/###\s*Step\s*4[:\s]*Break[\s\S]*?(?=###|##|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    const hasCoverageCheck = /all.*criteria.*covered|cover.*all.*criteria|every.*criteria|criteria.*addressed/i.test(step4Section[0]);
    assert.ok(hasCoverageCheck, 'Step 4 should mention ensuring all criteria are covered by phases');
  });
});

describe('Phase Content Guidelines - Criteria References', () => {
  test('Phase content guidelines should mention criteria references', () => {
    // Find Phase Content Guidelines section
    const guidelinesSection = content.match(/##\s*Phase\s*Content\s*Guidelines[\s\S]*?(?=##|$)/i);
    assert.ok(guidelinesSection, 'Could not find Phase Content Guidelines section');

    const hasCriteriaReference = /criteria|addressesCriteria/i.test(guidelinesSection[0]);
    assert.ok(hasCriteriaReference, 'Phase content guidelines should reference success criteria');
  });

  test('Phase content guidelines should show how tasks relate to criteria', () => {
    const guidelinesSection = content.match(/##\s*Phase\s*Content\s*Guidelines[\s\S]*?(?=##|$)/i);
    assert.ok(guidelinesSection, 'Could not find Phase Content Guidelines section');

    const hasTaskCriteriaRelation = /task.*criteria|criteria.*satisfy|address.*criteria/i.test(guidelinesSection[0]);
    assert.ok(hasTaskCriteriaRelation, 'Phase content guidelines should show task-to-criteria relationship');
  });
});

describe('Example Phase with addressesCriteria', () => {
  test('should have at least one example phase showing addressesCriteria usage', () => {
    // Look for a JSON example that includes addressesCriteria with actual values
    const exampleWithAddressesCriteria = /"addressesCriteria"\s*:\s*\[\s*"[^"]+"\s*(,\s*"[^"]+"\s*)*\]/i.test(content);
    assert.ok(exampleWithAddressesCriteria, 'Should have an example phase with addressesCriteria array populated');
  });

  test('example addressesCriteria should reference defined criteria', () => {
    // The example should reference criteria that match the defined categories
    const hasValidReferences = /addressesCriteria.*functional|addressesCriteria.*testing|addressesCriteria.*non-functional|addressesCriteria.*documentation/i.test(content);
    assert.ok(hasValidReferences, 'Example addressesCriteria should reference defined criteria categories');
  });
});

describe('Plan Output - Criteria Mapping per Phase', () => {
  test('Step 6 plan output should show which criteria each phase addresses', () => {
    const step6Section = content.match(/###\s*Step\s*6[:\s]*Display[\s\S]*?(?=###|##|$)/i);
    assert.ok(step6Section, 'Could not find Step 6 section');

    // Look for criteria mapping in phase display
    const hasCriteriaPerPhase = /phase.*addresses|addresses.*criteria|criteria.*:.*phase/i.test(step6Section[0]);
    assert.ok(hasCriteriaPerPhase, 'Step 6 output should show criteria addressed per phase');
  });

  test('plan summary example should include addressesCriteria display for phases', () => {
    // Find the markdown plan output example
    const outputExample = content.match(/```markdown[\s\S]*?##\s*Plan\s*for\s*Issue[\s\S]*?```/i);
    assert.ok(outputExample, 'Could not find plan summary markdown example');

    const hasAddressesCriteriaDisplay = /addresses|criteria.*:.*-/i.test(outputExample[0]);
    assert.ok(hasAddressesCriteriaDisplay, 'Plan summary should show criteria addressed per phase');
  });

  test('phase display should list specific criteria that phase satisfies', () => {
    // The phase display should show specific criteria items
    const outputExample = content.match(/```markdown[\s\S]*?##\s*Plan\s*for\s*Issue[\s\S]*?```/i);
    assert.ok(outputExample, 'Could not find plan summary markdown example');

    // Look for criteria listed under each phase
    const hasCriteriaList = /###\s*Phase[\s\S]*?Addresses|Addresses Criteria|Criteria:/i.test(outputExample[0]);
    assert.ok(hasCriteriaList, 'Each phase should list the criteria it addresses');
  });
});

// ============================================================================
// Test Suite: Phase 3 - Step 5.5 Verify Criteria Coverage
// ============================================================================

describe('Step 5.5: Verify Criteria Coverage', () => {
  test('should have Step 5.5 Verify Criteria Coverage section', () => {
    const hasStep5_5 = /###\s*Step\s*5\.5[:\s]*Verify\s*Criteria\s*Coverage/i.test(content);
    assert.ok(hasStep5_5, 'Missing "Step 5.5: Verify Criteria Coverage" section');
  });

  test('Step 5.5 should appear between Step 5 (Create Plan File) and Step 6 (Display)', () => {
    const step5Match = content.search(/###\s*Step\s*5[:\s]*Create\s*(the\s*)?Plan/i);
    const step5_5Match = content.search(/###\s*Step\s*5\.5[:\s]*Verify\s*Criteria\s*Coverage/i);
    const step6Match = content.search(/###\s*Step\s*6[:\s]*Display/i);

    assert.ok(step5Match >= 0, 'Step 5 not found');
    assert.ok(step5_5Match >= 0, 'Step 5.5 not found');
    assert.ok(step6Match >= 0, 'Step 6 not found');
    assert.ok(step5Match < step5_5Match, 'Step 5.5 should come after Step 5');
    assert.ok(step5_5Match < step6Match, 'Step 5.5 should come before Step 6');
  });

  test('Step 5.5 should explain its purpose after phase generation', () => {
    const step5_5Section = content.match(/###\s*Step\s*5\.5[:\s]*Verify\s*Criteria\s*Coverage[\s\S]*?(?=###|##|$)/i);
    assert.ok(step5_5Section, 'Could not find Step 5.5 section');

    const hasVerifyPurpose = /after\s*(phase|plan)|verify|coverage|matrix/i.test(step5_5Section[0]);
    assert.ok(hasVerifyPurpose, 'Step 5.5 should explain verification after phase generation');
  });
});

// ============================================================================
// Test Suite: Phase 3 - Coverage Matrix Structure
// ============================================================================

describe('Coverage Matrix Structure', () => {
  test('should document coverage matrix mapping criterion to phases', () => {
    const hasCoverageMatrix = /coverage\s*matrix/i.test(content);
    assert.ok(hasCoverageMatrix, 'Missing coverage matrix documentation');
  });

  test('coverage matrix should map criteria to phase numbers', () => {
    const hasPhaseMapping = /criterion.*phase|coverage.*phase|matrix.*phase/i.test(content);
    assert.ok(hasPhaseMapping, 'Coverage matrix should map criteria to phase numbers');
  });

  test('coverage matrix should map criteria to task numbers', () => {
    const hasTaskMapping = /criterion.*task|coverage.*task|matrix.*task/i.test(content);
    assert.ok(hasTaskMapping, 'Coverage matrix should map criteria to task numbers');
  });

  test('should show coverage matrix example structure', () => {
    // Look for JSON or table showing criterion -> [phases, tasks] structure
    const hasMatrixExample = /coverageMatrix|"coverage"|criterion.*:.*\[/i.test(content);
    assert.ok(hasMatrixExample, 'Should include coverage matrix example structure');
  });

  test('coverage matrix should show which phases cover each criterion', () => {
    const hasCriterionCoverage = /criterion.*covered\s*by|phases?\s*that\s*address|which\s*phases?\s*cover/i.test(content);
    assert.ok(hasCriterionCoverage, 'Coverage matrix should show which phases cover each criterion');
  });
});

// ============================================================================
// Test Suite: Phase 3 - Gap Detection
// ============================================================================

describe('Gap Detection Logic', () => {
  test('should document gap detection for uncovered criteria', () => {
    const hasGapDetection = /gap\s*detection|uncovered\s*criteria|missing\s*coverage|criteria.*not\s*(covered|addressed)/i.test(content);
    assert.ok(hasGapDetection, 'Missing gap detection documentation');
  });

  test('should explain identifying criteria with no mapped tasks', () => {
    const hasNoMappedTasks = /no\s*(mapped|associated)\s*tasks|criteria.*without.*tasks|unmapped\s*criteria/i.test(content);
    assert.ok(hasNoMappedTasks, 'Should explain identifying criteria with no mapped tasks');
  });

  test('should describe validation of complete criteria coverage', () => {
    const hasValidation = /validat.*coverage|check.*all.*criteria|ensure.*covered|complete\s*coverage/i.test(content);
    assert.ok(hasValidation, 'Should describe validation of complete criteria coverage');
  });

  test('gap detection should run after phase generation', () => {
    const hasPostPhaseCheck = /after\s*(generating|creating)\s*(phases|plan)|post.*generation.*check|verify.*after/i.test(content);
    assert.ok(hasPostPhaseCheck, 'Gap detection should run after phase generation');
  });
});

// ============================================================================
// Test Suite: Phase 3 - Warning Output for Uncovered Criteria
// ============================================================================

describe('Warning Output for Uncovered Criteria', () => {
  test('should document warning output for uncovered criteria', () => {
    const hasWarningOutput = /warning.*uncovered|warn.*criteria.*not\s*covered|alert.*missing\s*coverage/i.test(content);
    assert.ok(hasWarningOutput, 'Missing warning output documentation for uncovered criteria');
  });

  test('should show warning format/example', () => {
    const hasWarningFormat = /\*\*Warning\*\*|⚠|Warning:|WARN|uncovered.*:/i.test(content);
    assert.ok(hasWarningFormat, 'Should show warning format or example');
  });

  test('warning should list specific uncovered criteria', () => {
    const hasSpecificListing = /list.*uncovered|which\s*criteria.*not\s*covered|uncovered.*:\s*[-\*\d]/i.test(content);
    assert.ok(hasSpecificListing, 'Warning should list specific uncovered criteria');
  });

  test('should suggest action when criteria are uncovered', () => {
    const hasSuggestedAction = /add\s*phase|create\s*task|review\s*plan|address.*uncovered/i.test(content);
    assert.ok(hasSuggestedAction, 'Should suggest action when criteria are uncovered');
  });
});

// ============================================================================
// Test Suite: Phase 3 - Coverage Matrix in Plan JSON
// ============================================================================

describe('Coverage Matrix in Plan JSON Schema', () => {
  test('should include coverageMatrix field in plan JSON schema', () => {
    const hasCoverageMatrixField = /"coverageMatrix"/i.test(content);
    assert.ok(hasCoverageMatrixField, 'Plan JSON schema should include "coverageMatrix" field');
  });

  test('coverageMatrix should be at top level of plan schema', () => {
    // Look for coverageMatrix at the same level as "issue", "phases", etc.
    const jsonSchemaSection = content.match(/```json[\s\S]*?{[\s\S]*?"issue"[\s\S]*?}[\s\S]*?```/);
    assert.ok(jsonSchemaSection, 'Could not find plan JSON schema');

    const schemaContent = jsonSchemaSection[0];
    const hasTopLevelCoverageMatrix = /"coverageMatrix"\s*:/.test(schemaContent);
    assert.ok(hasTopLevelCoverageMatrix, 'coverageMatrix should be at top level of plan schema');
  });

  test('coverageMatrix should map criterion IDs to phase/task arrays', () => {
    const hasStructure = /"coverageMatrix"\s*:\s*\{[\s\S]*?"[^"]+"\s*:\s*\[/i.test(content);
    assert.ok(hasStructure, 'coverageMatrix should map criterion IDs to arrays');
  });

  test('coverageMatrix entries should include phase numbers', () => {
    const hasPhaseNumbers = /coverageMatrix[\s\S]*?phases?\s*:\s*\[|coverageMatrix[\s\S]*?\[\s*\d/i.test(content);
    assert.ok(hasPhaseNumbers, 'coverageMatrix entries should include phase numbers');
  });
});

// ============================================================================
// Test Suite: Phase 3 - Coverage Table in Plan Display
// ============================================================================

describe('Coverage Table in Plan Display', () => {
  test('Step 6 plan output should include coverage table', () => {
    const step6Section = content.match(/###\s*Step\s*6[:\s]*Display[\s\S]*?(?=###|##|$)/i);
    assert.ok(step6Section, 'Could not find Step 6 section');

    const hasCoverageTable = /coverage\s*table|coverage\s*matrix|criteria\s*coverage/i.test(step6Section[0]);
    assert.ok(hasCoverageTable, 'Step 6 output should include coverage table');
  });

  test('coverage table should show criterion and phases mapping', () => {
    const outputExample = content.match(/```markdown[\s\S]*?##\s*Plan\s*for\s*Issue[\s\S]*?```/i);
    assert.ok(outputExample, 'Could not find plan summary markdown example');

    const hasCriteriaPhaseMapping = /coverage|criterion.*phase|phase.*criterion/i.test(outputExample[0]);
    assert.ok(hasCriteriaPhaseMapping, 'Coverage table should show criterion-phase mapping');
  });

  test('should display coverage summary (e.g., "5/5 criteria covered")', () => {
    const hasCoverageSummary = /\d+\/\d+\s*criteria|all\s*criteria\s*covered|coverage.*100%|\d+\s*of\s*\d+\s*criteria/i.test(content);
    assert.ok(hasCoverageSummary, 'Should display coverage summary');
  });

  test('coverage table should use readable format (markdown table or list)', () => {
    const hasReadableFormat = /\|.*criterion.*\||\|.*phase.*\||coverage.*:\s*\n[-\*\d]|### Coverage/i.test(content);
    assert.ok(hasReadableFormat, 'Coverage table should use readable format');
  });

  test('should highlight uncovered criteria in display if any exist', () => {
    const hasUncoveredHighlight = /uncovered|not\s*covered|missing|gap.*highlight|⚠.*criteria/i.test(content);
    assert.ok(hasUncoveredHighlight, 'Should highlight uncovered criteria in display');
  });
});

// ============================================================================
// Test Suite: Phase 4 - Backward Planning Logic in Step 4
// ============================================================================

describe('Step 4: Backward Planning Approach', () => {
  test('Step 4 should mention working backward from criteria', () => {
    const step4Section = content.match(/###\s*Step\s*4[:\s]*Break[\s\S]*?(?=###|##|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    const hasBackwardApproach = /work(ing)?\s*backward\s*(from)?\s*criteria|backward\s*planning|criteria[-\s]first|start\s*(from|with)\s*criteria/i.test(step4Section[0]);
    assert.ok(hasBackwardApproach, 'Step 4 should mention working backward from criteria');
  });

  test('Step 4 should explain deriving changes from each criterion', () => {
    const step4Section = content.match(/###\s*Step\s*4[:\s]*Break[\s\S]*?(?=###|##|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    const hasDerivingChanges = /deriv(e|ing)\s*(code\s*)?changes\s*(from|for)\s*(each\s*)?criteri(on|a)|for\s*each\s*criteri(on|a).*identif(y|ies)\s*(what\s*)?(code\s*)?changes|criteri(on|a).*what\s*(code\s*)?changes\s*make\s*it\s*true/i.test(step4Section[0]);
    assert.ok(hasDerivingChanges, 'Step 4 should explain deriving changes from each criterion');
  });

  test('Step 4 should describe grouping related changes into phases', () => {
    const step4Section = content.match(/###\s*Step\s*4[:\s]*Break[\s\S]*?(?=###|##|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    const hasGroupingLogic = /group(ing)?\s*related\s*changes|group\s*changes\s*into\s*(logical\s*)?phases|logical\s*phases.*group|combine\s*(related\s*)?changes\s*into\s*phases/i.test(step4Section[0]);
    assert.ok(hasGroupingLogic, 'Step 4 should describe grouping related changes into logical phases');
  });

  test('Step 4 should mention criterion justification for each phase', () => {
    const step4Section = content.match(/###\s*Step\s*4[:\s]*Break[\s\S]*?(?=###|##|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    const hasCriterionJustification = /criteri(on|a)\s*justification|phase.*justification.*criteri(a|on)|each\s*phase.*clear\s*criteri(on|a)|phase.*derived\s*from\s*criteri(on|a)/i.test(step4Section[0]);
    assert.ok(hasCriterionJustification, 'Step 4 should mention criterion justification for each phase');
  });

  test('Step 4 should be criteria-driven not forward from issue description', () => {
    const step4Section = content.match(/###\s*Step\s*4[:\s]*Break[\s\S]*?(?=###|##|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    const hasCriteriaDriven = /criteria[-\s]driven|driven\s*by\s*criteria|start\s*from\s*criteria|not\s*(forward|starting)\s*from\s*issue/i.test(step4Section[0]);
    assert.ok(hasCriteriaDriven, 'Step 4 should be criteria-driven (not forward from issue description)');
  });
});

// ============================================================================
// Test Suite: Phase 4 - Backward Planning Status Message
// ============================================================================

describe('Backward Planning Status Message', () => {
  test('should document "Working backward from criteria" status message', () => {
    const hasStatusMessage = /working\s*backward\s*from\s*criteria/i.test(content);
    assert.ok(hasStatusMessage, 'Should document "Working backward from criteria" status message');
  });

  test('status message should appear in Step 4 or related planning section', () => {
    // The status message should be in context of the planning step
    const step4Section = content.match(/###\s*Step\s*4[:\s]*Break[\s\S]*?(?=###|##|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    const hasStatusInStep4 = /working\s*backward\s*from\s*criteria|status.*backward/i.test(step4Section[0]);
    assert.ok(hasStatusInStep4, 'Status message "Working backward from criteria" should appear in Step 4');
  });
});

// ============================================================================
// Test Suite: Phase 4 - Criterion-to-Change Mapping in Step 4
// ============================================================================

describe('Step 4: Criterion-to-Change Mapping', () => {
  test('Step 4 should explain identifying code changes for each criterion', () => {
    const step4Section = content.match(/###\s*Step\s*4[:\s]*Break[\s\S]*?(?=###|##|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    const hasCodeChangeIdentification = /identif(y|ies)\s*(what\s*)?(code\s*)?changes|what\s*(code\s*)?changes\s*make\s*it\s*true|code\s*changes\s*(needed|required)\s*(to\s*)?(satisf(y|ies)|make)/i.test(step4Section[0]);
    assert.ok(hasCodeChangeIdentification, 'Step 4 should explain identifying code changes for each criterion');
  });

  test('Step 4 should describe the criterion-first workflow', () => {
    const step4Section = content.match(/###\s*Step\s*4[:\s]*Break[\s\S]*?(?=###|##|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    // Should mention starting from criteria, then deriving changes, then grouping
    const hasCriterionFirstWorkflow = /start\s*(from|with)\s*criteri(a|on).*changes|criteri(a|on).*first|for\s*each\s*criteri(on|um)/i.test(step4Section[0]);
    assert.ok(hasCriterionFirstWorkflow, 'Step 4 should describe criterion-first workflow');
  });

  test('Step 4 should mention making criteria "true" through changes', () => {
    const step4Section = content.match(/###\s*Step\s*4[:\s]*Break[\s\S]*?(?=###|##|$)/i);
    assert.ok(step4Section, 'Could not find Step 4 section');

    const hasMakeTrue = /make\s*(it|criteri(on|a))\s*true|satisf(y|ies)\s*(the\s*)?criteri(on|a)|changes\s*(that\s*)?fulfill/i.test(step4Section[0]);
    assert.ok(hasMakeTrue, 'Step 4 should mention making criteria true through changes');
  });
});

// ============================================================================
// Test Suite: Phase 4 - Phase Generation from Criteria
// ============================================================================

describe('Phase Generation from Criteria', () => {
  test('phase generation should be described as criteria-derived', () => {
    const hasPhaseGeneration = /phases?\s*(are\s*)?(generated|created|derived)\s*(from\s*)?criteri(a|on)|criteri(a|on)[-\s]derived\s*phases?/i.test(content);
    assert.ok(hasPhaseGeneration, 'Phase generation should be described as criteria-derived');
  });

  test('should document phases emerging from grouped criterion changes', () => {
    const hasGroupedChanges = /phases?\s*(emerge|result|come)\s*from\s*group(ed|ing)|group(ed|ing)\s*changes\s*(become|form|create)\s*phases?/i.test(content);
    assert.ok(hasGroupedChanges, 'Should document phases emerging from grouped criterion changes');
  });

  test('should contrast backward approach with traditional forward planning', () => {
    const hasContrast = /instead\s*of\s*forward|not\s*forward|backward\s*(rather\s*than|instead\s*of)|traditional.*forward|forward.*approach.*backward/i.test(content);
    assert.ok(hasContrast, 'Should contrast backward approach with traditional forward planning');
  });
});

// ============================================================================
// Test Suite: Phase 6 - README.md Documentation Updates
// ============================================================================

const README_PATH = path.join(__dirname, '../../../README.md');

let readmeContent = '';
try {
  readmeContent = fs.readFileSync(README_PATH, 'utf-8');
} catch (error) {
  console.warn(`Warning: Could not read README.md: ${error.message}`);
}

describe('README.md - Success Criteria Documentation', () => {
  test('README.md should mention success criteria in /plan-issue description', () => {
    assert.ok(readmeContent, 'README.md file could not be read');

    // Find the plan-issue command row in the Commands Reference table
    const planIssueRow = readmeContent.match(/\|\s*`\/tiki:plan-issue[^`]*`\s*\|[^|]+\|/i);
    assert.ok(planIssueRow, 'Could not find /plan-issue in Commands Reference table');

    // Check if success criteria is mentioned in the description
    const hasCriteriaInDescription = /success\s*criteria|criteria[-\s]driven|backward\s*planning/i.test(planIssueRow[0]);
    assert.ok(hasCriteriaInDescription, '/plan-issue description in README should mention success criteria or backward planning');
  });

  test('README.md should mention backward planning feature', () => {
    assert.ok(readmeContent, 'README.md file could not be read');

    const hasBackwardPlanning = /backward\s*planning|work(ing)?\s*backward\s*(from)?\s*criteria|criteria[-\s]driven\s*planning|goal[-\s]backward/i.test(readmeContent);
    assert.ok(hasBackwardPlanning, 'README should mention backward planning or criteria-driven planning feature');
  });

  test('README.md should describe criteria extraction in plan-issue workflow', () => {
    assert.ok(readmeContent, 'README.md file could not be read');

    // Check if the typical workflow or feature description mentions criteria
    const hasWorkflowCriteria = /plan.*criteria|criteria.*plan|extract.*criteria/i.test(readmeContent);
    assert.ok(hasWorkflowCriteria, 'README should describe criteria extraction as part of plan-issue workflow');
  });
});

describe('README.md - Plan File Format Updates', () => {
  test('README Plan File Format example should include successCriteria field', () => {
    assert.ok(readmeContent, 'README.md file could not be read');

    // Find the Plan File Format section
    const planFileSection = readmeContent.match(/##\s*Plan\s*File\s*Format[\s\S]*?(?=##\s*[A-Z]|$)/i);
    assert.ok(planFileSection, 'Could not find Plan File Format section in README');

    const hasSuccessCriteria = /"successCriteria"/i.test(planFileSection[0]);
    assert.ok(hasSuccessCriteria, 'Plan File Format example should include successCriteria field');
  });

  test('README Plan File Format example should include addressesCriteria in phase', () => {
    assert.ok(readmeContent, 'README.md file could not be read');

    const planFileSection = readmeContent.match(/##\s*Plan\s*File\s*Format[\s\S]*?(?=##\s*[A-Z]|$)/i);
    assert.ok(planFileSection, 'Could not find Plan File Format section in README');

    const hasAddressesCriteria = /"addressesCriteria"/i.test(planFileSection[0]);
    assert.ok(hasAddressesCriteria, 'Plan File Format phase example should include addressesCriteria field');
  });

  test('README Plan File Format example should include coverageMatrix field', () => {
    assert.ok(readmeContent, 'README.md file could not be read');

    const planFileSection = readmeContent.match(/##\s*Plan\s*File\s*Format[\s\S]*?(?=##\s*[A-Z]|$)/i);
    assert.ok(planFileSection, 'Could not find Plan File Format section in README');

    const hasCoverageMatrix = /"coverageMatrix"/i.test(planFileSection[0]);
    assert.ok(hasCoverageMatrix, 'Plan File Format example should include coverageMatrix field');
  });
});

// ============================================================================
// Test Suite: Phase 6 - plan-issue.md Comprehensive Examples
// ============================================================================

describe('plan-issue.md - Comprehensive Example Plan JSON', () => {
  test('should have a comprehensive example showing successCriteria array', () => {
    // Check that the example JSON has a populated successCriteria array with multiple items
    const hasComprehensiveExample = /"successCriteria"\s*:\s*\[\s*\{[^}]+\}\s*,\s*\{/i.test(content);
    assert.ok(hasComprehensiveExample, 'Should have comprehensive example with multiple successCriteria items');
  });

  test('should have example showing all four criteria categories', () => {
    // The example should show functional, non-functional, testing, and documentation categories
    const hasFunctionalExample = /"category"\s*:\s*"functional"/i.test(content);
    const hasNonFunctionalExample = /"category"\s*:\s*"non-functional"/i.test(content);
    const hasTestingExample = /"category"\s*:\s*"testing"/i.test(content);
    const hasDocumentationExample = /"category"\s*:\s*"documentation"/i.test(content);

    assert.ok(hasFunctionalExample, 'Example should show functional category');
    assert.ok(hasNonFunctionalExample, 'Example should show non-functional category');
    assert.ok(hasTestingExample, 'Example should show testing category');
    assert.ok(hasDocumentationExample, 'Example should show documentation category');
  });

  test('should have example phase with addressesCriteria referencing criteria', () => {
    // Check for addressesCriteria with proper references like ["functional-1", "testing-1"]
    const hasProperReferences = /"addressesCriteria"\s*:\s*\[\s*"(functional|non-functional|testing|documentation)-\d+"/i.test(content);
    assert.ok(hasProperReferences, 'Example phase should have addressesCriteria with proper category-N references');
  });

  test('should have example coverageMatrix showing criterion to phases mapping', () => {
    // Check for coverageMatrix with proper structure
    const hasCoverageMatrixExample = /"coverageMatrix"\s*:\s*\{[\s\S]*?"(functional|non-functional|testing|documentation)-\d+"\s*:\s*\{/i.test(content);
    assert.ok(hasCoverageMatrixExample, 'Example should show coverageMatrix with criterion-to-phases mapping');
  });
});

describe('plan-issue.md - Backward Planning Workflow Documentation', () => {
  test('should document the backward planning workflow steps', () => {
    const hasWorkflowSteps = /backward\s*planning\s*workflow|criteria[-\s]first\s*workflow/i.test(content);
    assert.ok(hasWorkflowSteps, 'Should document backward planning workflow steps');
  });

  test('should show example of deriving changes from a criterion', () => {
    // Look for an example like "functional-1: User can log in → Need login endpoint..."
    const hasDerivationExample = /criterion.*→.*need|what\s*code\s*changes\s*make\s*it\s*true/i.test(content);
    assert.ok(hasDerivationExample, 'Should show example of deriving changes from a criterion');
  });

  test('should include contrast table between forward and backward planning', () => {
    const hasContrastTable = /\|\s*Forward\s*Planning.*\|\s*Backward\s*Planning|\|\s*Traditional.*\|\s*Criteria[-\s]Driven/i.test(content);
    assert.ok(hasContrastTable, 'Should include contrast table between forward and backward planning');
  });
});

describe('plan-issue.md - Criteria Categories Documentation', () => {
  test('should have dedicated Criteria Categories section', () => {
    const hasCategoriesSection = /####?\s*Criteria\s*Categories/i.test(content);
    assert.ok(hasCategoriesSection, 'Should have dedicated Criteria Categories section');
  });

  test('should describe functional criteria with examples', () => {
    const hasFunctionalDescription = /functional\s*criteria\s*:\s*[^\n]+behavior|functional\s*criteria\s*:\s*[^\n]+feature/i.test(content);
    assert.ok(hasFunctionalDescription, 'Should describe functional criteria with explanation');
  });

  test('should describe non-functional criteria with examples', () => {
    const hasNonFunctionalDescription = /non[-\s]?functional\s*criteria\s*:\s*[^\n]+(performance|security|scalability)/i.test(content);
    assert.ok(hasNonFunctionalDescription, 'Should describe non-functional criteria with examples');
  });

  test('should describe testing criteria with examples', () => {
    const hasTestingDescription = /testing\s*criteria\s*:\s*[^\n]+(test|coverage|edge\s*case)/i.test(content);
    assert.ok(hasTestingDescription, 'Should describe testing criteria with examples');
  });

  test('should describe documentation criteria with examples', () => {
    const hasDocumentationDescription = /documentation\s*criteria\s*:\s*[^\n]+(readme|api\s*doc|comment)/i.test(content);
    assert.ok(hasDocumentationDescription, 'Should describe documentation criteria with examples');
  });
});

describe('plan-issue.md - Plan Output Example with Criteria', () => {
  test('plan output example should show Success Criteria section', () => {
    const outputExample = content.match(/```markdown[\s\S]*?##\s*Plan\s*for\s*Issue[\s\S]*?```/i);
    assert.ok(outputExample, 'Could not find plan output markdown example');

    const hasSuccessCriteriaSection = /###\s*Success\s*Criteria/i.test(outputExample[0]);
    assert.ok(hasSuccessCriteriaSection, 'Plan output should show Success Criteria section');
  });

  test('plan output example should show criteria organized by category', () => {
    const outputExample = content.match(/```markdown[\s\S]*?##\s*Plan\s*for\s*Issue[\s\S]*?```/i);
    assert.ok(outputExample, 'Could not find plan output markdown example');

    const hasFunctionalSection = /\*\*Functional:\*\*|\*\*Functional\*\*|### Functional/i.test(outputExample[0]);
    assert.ok(hasFunctionalSection, 'Plan output should organize criteria by category (e.g., **Functional:**)');
  });

  test('plan output example should show Addresses Criteria for each phase', () => {
    const outputExample = content.match(/```markdown[\s\S]*?##\s*Plan\s*for\s*Issue[\s\S]*?```/i);
    assert.ok(outputExample, 'Could not find plan output markdown example');

    const hasAddressesCriteriaDisplay = /Addresses\s*Criteria\s*:/i.test(outputExample[0]);
    assert.ok(hasAddressesCriteriaDisplay, 'Plan output should show "Addresses Criteria:" for each phase');
  });

  test('plan output example should show Criteria Coverage table', () => {
    const outputExample = content.match(/```markdown[\s\S]*?##\s*Plan\s*for\s*Issue[\s\S]*?```/i);
    assert.ok(outputExample, 'Could not find plan output markdown example');

    const hasCoverageTable = /###\s*Criteria\s*Coverage|\*\*Coverage:\s*\d+\/\d+/i.test(outputExample[0]);
    assert.ok(hasCoverageTable, 'Plan output should show Criteria Coverage section with coverage summary');
  });

  test('plan output example should show criterion-to-phase mapping table', () => {
    const outputExample = content.match(/```markdown[\s\S]*?##\s*Plan\s*for\s*Issue[\s\S]*?```/i);
    assert.ok(outputExample, 'Could not find plan output markdown example');

    const hasMapping = /\|\s*Criterion\s*\|\s*Phases?\s*\|/i.test(outputExample[0]);
    assert.ok(hasMapping, 'Plan output should show criterion-to-phase mapping table');
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
