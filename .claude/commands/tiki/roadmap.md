---
type: prompt
name: tiki:roadmap
description: Generate a high-level project visualization across multiple releases, showing project progress, cross-issue relationships, and requirement coverage.
allowed-tools: Read, Bash, Glob, Write
argument-hint: [--output] [--include-archived] [--releases <versions>] [--format ascii|table]
---

# /tiki:roadmap - Project Roadmap Visualization

Generate a high-level view of the project across multiple releases. Shows progress, cross-issue relationships, requirement coverage, and overall project trajectory.

## Usage

```
/tiki:roadmap                           # Default view - show active releases
/tiki:roadmap --output                  # Generate ROADMAP.md file
/tiki:roadmap --include-archived        # Include shipped/archived releases
/tiki:roadmap --releases v1.1,v1.2      # Filter to specific releases
/tiki:roadmap --format ascii            # ASCII art timeline (default)
/tiki:roadmap --format table            # Table-based view
```

### Flags

| Flag | Description |
|------|-------------|
| `--output` | Write output to ROADMAP.md instead of displaying |
| `--include-archived` | Include releases from archive directory |
| `--releases <versions>` | Comma-separated list of versions to include |
| `--format ascii\|table` | Output format (default: ascii) |

## Instructions

### Step 1: Parse Arguments

Extract flags from `$ARGUMENTS`:

```javascript
const args = "$ARGUMENTS".split(/\s+/).filter(Boolean);

const flags = {
  output: args.includes('--output'),
  includeArchived: args.includes('--include-archived'),
  releases: null,
  format: 'ascii'
};

// Parse --releases flag
const releasesIdx = args.indexOf('--releases');
if (releasesIdx !== -1 && args[releasesIdx + 1]) {
  flags.releases = args[releasesIdx + 1].split(',').map(v => v.trim());
}

// Parse --format flag
const formatIdx = args.indexOf('--format');
if (formatIdx !== -1 && args[formatIdx + 1]) {
  const fmt = args[formatIdx + 1].toLowerCase();
  if (fmt === 'ascii' || fmt === 'table') {
    flags.format = fmt;
  }
}
```

### Step 2: Load Release Files

Load release data from the filesystem:

1. **Active Releases**: `.tiki/releases/*.json`
2. **Archived Releases** (if `--include-archived`): `.tiki/releases/archive/*.json`

Use Glob to find release files:
- Pattern for active: `.tiki/releases/*.json`
- Pattern for archived: `.tiki/releases/archive/*.json`

For each found file, use Read to load the JSON content.

If `--releases` flag is provided, filter to only include versions matching the specified list.

### Step 3: Sort and Organize Releases

Sort releases by version using semver-aware comparison (see Helper Functions below).

Group releases by status:
- **Active**: Releases currently being worked on
- **Upcoming**: Planned releases not yet started
- **Completed**: Shipped releases (if --include-archived)

### Step 4: Generate Output

Based on `--format` flag, generate either ASCII or table output.

If `--output` flag is set, write to ROADMAP.md. Otherwise, display directly.

## Helper Functions

### Version Parsing and Comparison

```javascript
function parseVersion(versionString) {
  const normalized = versionString.replace(/^v/, '');
  const [main, prerelease] = normalized.split('-');
  const parts = main.split('.').map(n => parseInt(n, 10));
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    prerelease: prerelease || null
  };
}

function compareVersions(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  if (va.patch !== vb.patch) return va.patch - vb.patch;
  if (!va.prerelease && vb.prerelease) return 1;
  if (va.prerelease && !vb.prerelease) return -1;
  if (va.prerelease && vb.prerelease) {
    return va.prerelease.localeCompare(vb.prerelease);
  }
  return 0;
}
```

### Status Symbol Mapping

```javascript
function getStatusSymbol(status) {
  const symbols = {
    'completed': '✓',
    'in_progress': '◐',
    'planned': '○',
    'not_planned': '·'
  };
  return symbols[status] || '?';
}
```

### Progress Calculation

```javascript
function calculateProgress(release) {
  const issues = release.issues || [];
  if (issues.length === 0) return 0;

  const completed = issues.filter(i => i.status === 'completed').length;
  return Math.round((completed / issues.length) * 100);
}
```

## Empty State Handling

If no release files are found, display:

```
## No Releases Found

No releases have been created yet.

**Getting Started:**
1. Create a release: `/tiki:release-new v1.0`
2. Add issues to it: `/tiki:release-add <issue-number>`
3. View roadmap: `/tiki:roadmap`

---
*Tip: Use `/tiki:state` to see current work outside of releases.*
```

## ASCII Timeline Format (Default)

The ASCII timeline provides a visual representation of the project roadmap with clear status indicators for each issue within each release.

### Output Structure

```
## Project Roadmap

### Timeline

v1.0 (shipped 2026-01-10)
├── #12: Core execution framework ✓
├── #14: Auto-fix infrastructure ✓
└── #15: Trigger processing ✓

v1.1 (active - 40% complete)
├── #20: Feature A ◐
├── #21: Feature B ○
└── #22: Feature C ·

v2.0 (planned)
├── #30: Future feature ·
└── #31: Another feature ·

Legend: ✓ completed | ◐ in_progress | ○ planned | · not_planned
```

### Release Status Line Logic

Determine the release status line based on the release's current state:

| Condition | Format | Example |
|-----------|--------|---------|
| `status === 'shipped'` | `{version} (shipped {shippedAt.substring(0,10)})` | `v1.0 (shipped 2026-01-10)` |
| `status === 'active'` | `{version} (active - {calculateProgress(release)}% complete)` | `v1.1 (active - 40% complete)` |
| No work started | `{version} (planned)` | `v2.0 (planned)` |

### Issue Tree Formatting

Format each issue within a release as a tree structure:

1. **Tree Characters**:
   - Use `├──` for all issues except the last one in the release
   - Use `└──` for the last issue in the release

2. **Issue Line Format**: `{tree_char} #{number}: {title} {status_symbol}`

3. **Title Truncation**: Truncate titles longer than 50 characters with "..."

```javascript
function truncateTitle(title, maxLength = 50) {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + '...';
}

function formatIssueLine(issue, isLast) {
  const treeChar = isLast ? '└──' : '├──';
  const symbol = getStatusSymbol(issue.status);
  const title = truncateTitle(issue.title);
  return `${treeChar} #${issue.number}: ${title} ${symbol}`;
}
```

### Step 5: Generate ASCII Timeline

For each release (sorted by version):

```
1. Determine release status line:
   - If status === 'shipped': "{version} (shipped {shippedAt.substring(0,10)})"
   - If status === 'active': "{version} (active - {calculateProgress(release)}% complete)"
   - Else: "{version} (planned)"

2. For each issue in release:
   - Get symbol: getStatusSymbol(issue.status)
   - Format line: "{tree_char} #{issue.number}: {truncate(issue.title, 50)} {symbol}"
   - tree_char is '├──' for all but last, '└──' for last

3. Append the legend at the bottom
```

Implementation pseudo-code:

```javascript
function generateASCIITimeline(releases) {
  let output = '## Project Roadmap\n\n### Timeline\n\n';

  const sortedReleases = releases.sort((a, b) => compareVersions(a.version, b.version));

  for (const release of sortedReleases) {
    // Generate release header
    let statusLine;
    if (release.status === 'shipped') {
      statusLine = `${release.version} (shipped ${release.shippedAt.substring(0, 10)})`;
    } else if (release.status === 'active') {
      const progress = calculateProgress(release);
      statusLine = `${release.version} (active - ${progress}% complete)`;
    } else {
      statusLine = `${release.version} (planned)`;
    }
    output += `${statusLine}\n`;

    // Generate issue tree
    const issues = release.issues || [];
    issues.forEach((issue, index) => {
      const isLast = index === issues.length - 1;
      output += formatIssueLine(issue, isLast) + '\n';
    });

    output += '\n';
  }

  // Append legend
  output += 'Legend: ✓ completed | ◐ in_progress | ○ planned | · not_planned\n';

  return output;
}
```

### Summary Section

After the timeline, include a summary showing totals:

```
### Summary

| Status | Count |
|--------|-------|
| Completed | 3 |
| In Progress | 1 |
| Planned | 2 |
| Not Planned | 1 |
| **Total** | **7** |

Progress: 3/7 issues complete (43%)
```

Implementation:

```javascript
function generateSummary(releases) {
  const counts = {
    completed: 0,
    in_progress: 0,
    planned: 0,
    not_planned: 0
  };

  // Count all issues across all releases
  for (const release of releases) {
    for (const issue of (release.issues || [])) {
      if (counts.hasOwnProperty(issue.status)) {
        counts[issue.status]++;
      }
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const progressPercent = total > 0 ? Math.round((counts.completed / total) * 100) : 0;

  let output = '### Summary\n\n';
  output += '| Status | Count |\n';
  output += '|--------|-------|\n';
  output += `| Completed | ${counts.completed} |\n`;
  output += `| In Progress | ${counts.in_progress} |\n`;
  output += `| Planned | ${counts.planned} |\n`;
  output += `| Not Planned | ${counts.not_planned} |\n`;
  output += `| **Total** | **${total}** |\n\n`;
  output += `Progress: ${counts.completed}/${total} issues complete (${progressPercent}%)\n`;

  return output;
}
```

## Requirements Coverage View

This section displays how requirements are covered across releases. Requirements provide traceability from high-level project goals to specific implementation releases.

### Step 6: Load Requirements

Check if requirements file exists and load it:

```javascript
// Read requirements from .tiki/requirements.json if it exists
// Schema follows define-requirements.md format:
// {
//   "requirements": [
//     {
//       "id": "REQ-01",
//       "category": "functional",
//       "description": "Short description",
//       "priority": "must-have",
//       "status": "implemented"
//     }
//   ]
// }

async function loadRequirements() {
  try {
    const content = await readFile('.tiki/requirements.json');
    return JSON.parse(content);
  } catch {
    return null; // Requirements file doesn't exist
  }
}
```

### Step 7: Build Requirements Coverage Matrix

Map requirements to releases based on issue-requirement links:

```javascript
function buildCoverageMatrix(releases, requirements) {
  // Create a map of requirement ID -> release versions where it's addressed
  const matrix = {};

  for (const req of requirements.requirements) {
    matrix[req.id] = {
      description: req.description,
      releases: {} // version -> status ('implemented' or 'planned')
    };
  }

  // Scan each release's issues for requirement mappings
  for (const release of releases) {
    for (const issue of (release.issues || [])) {
      const issueReqs = issue.requirements || [];
      for (const reqId of issueReqs) {
        if (matrix[reqId]) {
          // Determine if implemented or planned based on issue status
          const status = issue.status === 'completed' ? 'implemented' : 'planned';
          // Only set if not already implemented (implemented takes precedence)
          if (matrix[reqId].releases[release.version] !== 'implemented') {
            matrix[reqId].releases[release.version] = status;
          }
        }
      }
    }
  }

  return matrix;
}
```

### Requirements Coverage Output

When requirements.json exists, generate this table:

```markdown
### Requirements Coverage by Release

| Requirement | Description | v1.0 | v1.1 | v1.2 |
|-------------|-------------|------|------|------|
| EXEC-01 | Phase execution | ✓ | | |
| MULTI-01 | Release grouping | | ✓ | |
| MULTI-02 | Roadmap view | | | ○ |

Coverage: v1.0 (3/3 - 100%), v1.1 (2/4 - 50%), v1.2 (0/2 - 0%)
```

Symbols:
- `✓` - Requirement implemented (linked issue is completed)
- `○` - Requirement planned (linked issue is planned/in_progress)
- Empty cell - Requirement not linked to any issue in that release
- `-` - Release has no requirements mapping at all

Implementation:

```javascript
function generateRequirementsCoverage(releases, requirements) {
  if (!requirements || !requirements.requirements || requirements.requirements.length === 0) {
    return generateNoRequirementsMessage();
  }

  const matrix = buildCoverageMatrix(releases, requirements);
  const versions = releases.map(r => r.version).sort(compareVersions);

  let output = '### Requirements Coverage by Release\n\n';

  // Table header
  output += '| Requirement | Description |';
  for (const v of versions) {
    output += ` ${v} |`;
  }
  output += '\n';

  // Table separator
  output += '|-------------|-------------|';
  for (const v of versions) {
    output += '------|';
  }
  output += '\n';

  // Table rows
  for (const reqId of Object.keys(matrix).sort()) {
    const req = matrix[reqId];
    output += `| ${reqId} | ${truncateTitle(req.description, 30)} |`;

    for (const v of versions) {
      const status = req.releases[v];
      if (status === 'implemented') {
        output += ' ✓ |';
      } else if (status === 'planned') {
        output += ' ○ |';
      } else {
        output += ' |';
      }
    }
    output += '\n';
  }

  // Coverage summary line
  output += '\nCoverage: ';
  const coverageParts = [];
  for (const v of versions) {
    const release = releases.find(r => r.version === v);
    const releaseReqs = new Set();
    const implementedReqs = new Set();

    for (const issue of (release.issues || [])) {
      for (const reqId of (issue.requirements || [])) {
        releaseReqs.add(reqId);
        if (issue.status === 'completed') {
          implementedReqs.add(reqId);
        }
      }
    }

    const total = releaseReqs.size;
    const implemented = implementedReqs.size;
    const percent = total > 0 ? Math.round((implemented / total) * 100) : 0;
    coverageParts.push(`${v} (${implemented}/${total} - ${percent}%)`);
  }
  output += coverageParts.join(', ') + '\n';

  return output;
}
```

### No Requirements Configured

When requirements.json doesn't exist, display this message:

```markdown
### Requirements

Requirements tracking is not configured for this project.

To enable requirements tracking:
1. Run `/tiki:define-requirements` to create requirements
2. Link issues to requirements via `/tiki:release-add <issue> --requirements REQ-01,REQ-02`

---
*Requirements coverage will appear here once configured.*
```

Implementation:

```javascript
function generateNoRequirementsMessage() {
  return `### Requirements

Requirements tracking is not configured for this project.

To enable requirements tracking:
1. Run \`/tiki:define-requirements\` to create requirements
2. Link issues to requirements via \`/tiki:release-add <issue> --requirements REQ-01,REQ-02\`

---
*Requirements coverage will appear here once configured.*
`;
}
```

### Handling Releases with No Requirement Mappings

For releases where no issues have requirements linked, show `-` in all requirement columns:

```javascript
function releaseHasNoRequirements(release) {
  for (const issue of (release.issues || [])) {
    if (issue.requirements && issue.requirements.length > 0) {
      return false;
    }
  }
  return true;
}

// In the table generation, check for unmapped releases:
// If releaseHasNoRequirements(release), show '-' in all cells for that release column
```

## Table Format (--format table)

The table format provides a compact, structured view of the roadmap suitable for quick scanning and project status reports.

### Table Output Structure

```markdown
## Project Roadmap

| Release | Status | Issues | Progress | Requirements |
|---------|--------|--------|----------|--------------|
| v1.0 | shipped | 3 | 100% | 3/3 |
| v1.1 | active | 5 | 40% | 2/4 |
| v2.0 | planned | 3 | 0% | 0/2 |

### Issue Details

#### v1.1 (active - 40% complete)
| # | Title | Status | Requirements |
|---|-------|--------|--------------|
| 20 | Feature A | ◐ in_progress | MULTI-01 |
| 21 | Feature B | ○ planned | MULTI-02, MULTI-03 |
| 22 | Feature C | · not_planned | - |
```

### Table Format Implementation

```javascript
function generateTableFormat(releases) {
  const sortedReleases = releases.sort((a, b) => compareVersions(a.version, b.version));

  let output = '## Project Roadmap\n\n';

  // Release summary table
  output += '| Release | Status | Issues | Progress | Requirements |\n';
  output += '|---------|--------|--------|----------|--------------|.\n';

  for (const release of sortedReleases) {
    const issueCount = (release.issues || []).length;
    const progress = calculateProgress(release);
    const reqCoverage = calculateRequirementsCoverage(release);

    output += `| ${release.version} | ${release.status} | ${issueCount} | ${progress}% | ${reqCoverage} |\n`;
  }

  output += '\n### Issue Details\n';

  // Issue details for each release
  for (const release of sortedReleases) {
    // Skip shipped releases in detailed view (they're in archive)
    if (release.status === 'shipped') continue;

    const progress = calculateProgress(release);
    output += `\n#### ${release.version} (${release.status} - ${progress}% complete)\n`;
    output += '| # | Title | Status | Requirements |\n';
    output += '|---|-------|--------|--------------|\n';

    for (const issue of (release.issues || [])) {
      const symbol = getStatusSymbol(issue.status);
      const title = truncateTitle(issue.title, 40);
      const reqs = (issue.requirements && issue.requirements.length > 0)
        ? issue.requirements.join(', ')
        : '-';

      output += `| ${issue.number} | ${title} | ${symbol} ${issue.status} | ${reqs} |\n`;
    }
  }

  return output;
}

function calculateRequirementsCoverage(release) {
  const allReqs = new Set();
  const implementedReqs = new Set();

  for (const issue of (release.issues || [])) {
    for (const reqId of (issue.requirements || [])) {
      allReqs.add(reqId);
      if (issue.status === 'completed') {
        implementedReqs.add(reqId);
      }
    }
  }

  const total = allReqs.size;
  if (total === 0) return '-';

  return `${implementedReqs.size}/${total}`;
}
```

### Table Format Selection

In Step 4, route to the appropriate format generator:

```javascript
function generateOutput(releases, flags) {
  if (flags.format === 'table') {
    return generateTableFormat(releases);
  } else {
    // Default to ASCII timeline
    return generateASCIITimeline(releases) + '\n' + generateSummary(releases);
  }
}
```

## ROADMAP.md Generation (--output)

When the `--output` flag is used, generate a `ROADMAP.md` file in the project root instead of displaying output directly.

### ROADMAP.md File Format

The generated file follows this structure:

```markdown
# Project Roadmap

Generated: 2026-01-18
Releases: 4 (2 shipped, 1 active, 1 planned)

## Overview

[ASCII timeline content here]

## Release Details

### v1.0 - Foundation (Shipped 2026-01-10)
- 3 issues completed
- Requirements: EXEC-01, EXEC-02, QUAL-01

### v1.1 - Release Management (Active - 40% complete)
- 2/5 issues completed
- Requirements: MULTI-01, MULTI-02

### v1.2 - Visualization (Planned)
- 0/3 issues started
- Target requirements: VIZ-01, VIZ-02

## Requirements Traceability Matrix

[Requirements coverage table here]

---
*Generated by Tiki `/tiki:roadmap --output`*
```

### Implementation

```javascript
function writeROADMAP(releases, requirements) {
  const today = new Date().toISOString().substring(0, 10);

  // Count releases by status
  const statusCounts = {
    shipped: releases.filter(r => r.status === 'shipped').length,
    active: releases.filter(r => r.status === 'active').length,
    planned: releases.filter(r => r.status === 'planned').length
  };

  const totalReleases = releases.length;
  const statusSummary = [];
  if (statusCounts.shipped > 0) statusSummary.push(`${statusCounts.shipped} shipped`);
  if (statusCounts.active > 0) statusSummary.push(`${statusCounts.active} active`);
  if (statusCounts.planned > 0) statusSummary.push(`${statusCounts.planned} planned`);

  let content = `# Project Roadmap

Generated: ${today}
Releases: ${totalReleases} (${statusSummary.join(', ')})

## Overview

`;

  // Add ASCII timeline content
  content += generateASCIITimeline(releases);

  // Add release details section
  content += '\n## Release Details\n';

  const sortedReleases = releases.sort((a, b) => compareVersions(a.version, b.version));

  for (const release of sortedReleases) {
    const issues = release.issues || [];
    const completedCount = issues.filter(i => i.status === 'completed').length;

    // Build status string
    let statusStr;
    if (release.status === 'shipped') {
      statusStr = `Shipped ${release.shippedAt.substring(0, 10)}`;
    } else if (release.status === 'active') {
      const progress = calculateProgress(release);
      statusStr = `Active - ${progress}% complete`;
    } else {
      statusStr = 'Planned';
    }

    // Collect requirements for this release
    const releaseReqs = new Set();
    for (const issue of issues) {
      for (const reqId of (issue.requirements || [])) {
        releaseReqs.add(reqId);
      }
    }
    const reqsList = Array.from(releaseReqs).sort();

    // Build release section
    const releaseName = release.name || release.version;
    content += `\n### ${release.version} - ${releaseName} (${statusStr})\n`;

    if (release.status === 'shipped') {
      content += `- ${completedCount} issues completed\n`;
    } else if (release.status === 'active') {
      content += `- ${completedCount}/${issues.length} issues completed\n`;
    } else {
      content += `- 0/${issues.length} issues started\n`;
    }

    if (reqsList.length > 0) {
      const reqLabel = release.status === 'planned' ? 'Target requirements' : 'Requirements';
      content += `- ${reqLabel}: ${reqsList.join(', ')}\n`;
    }
  }

  // Add requirements traceability matrix if requirements exist
  if (requirements && requirements.requirements && requirements.requirements.length > 0) {
    content += '\n## Requirements Traceability Matrix\n\n';
    content += generateRequirementsCoverage(releases, requirements);
  }

  // Add footer
  content += `\n---
*Generated by Tiki \`/tiki:roadmap --output\`*
`;

  return content;
}
```

### Writing the File

Use the Write tool to create `ROADMAP.md` in the project root:

```javascript
// Generate content
const roadmapContent = writeROADMAP(releases, requirements);

// Write to project root
await writeFile('./ROADMAP.md', roadmapContent);
```

### Success Message

After successfully writing the file, display:

```text
ROADMAP.md generated successfully.

Location: ./ROADMAP.md
Releases: 3 (1 shipped, 1 active, 1 planned)
Issues: 12 total

View at: file://path/to/ROADMAP.md
```

Implementation:

```javascript
function displaySuccessMessage(releases, projectPath) {
  const statusCounts = {
    shipped: releases.filter(r => r.status === 'shipped').length,
    active: releases.filter(r => r.status === 'active').length,
    planned: releases.filter(r => r.status === 'planned').length
  };

  const totalReleases = releases.length;
  const statusParts = [];
  if (statusCounts.shipped > 0) statusParts.push(`${statusCounts.shipped} shipped`);
  if (statusCounts.active > 0) statusParts.push(`${statusCounts.active} active`);
  if (statusCounts.planned > 0) statusParts.push(`${statusCounts.planned} planned`);

  const totalIssues = releases.reduce((sum, r) => sum + (r.issues || []).length, 0);

  console.log(`ROADMAP.md generated successfully.

Location: ./ROADMAP.md
Releases: ${totalReleases} (${statusParts.join(', ')})
Issues: ${totalIssues} total

View at: file://${projectPath}/ROADMAP.md`);
}
```

## Including Archived Releases (--include-archived)

When the `--include-archived` flag is set, the roadmap includes releases from the archive directory in addition to active releases.

### Archive Directory Structure

Archived releases are stored in `.tiki/releases/archive/`:

```text
.tiki/releases/
├── v1.1.json          # Active release
├── v1.2.json          # Planned release
└── archive/
    ├── v1.0.json      # Shipped release
    └── v0.9.json      # Earlier shipped release
```

### Loading Archived Releases

When `--include-archived` is true:

1. Load active releases from `.tiki/releases/*.json`
2. Also load archived releases from `.tiki/releases/archive/*.json`
3. Mark shipped releases with their ship date in the output

```javascript
async function loadAllReleases(includeArchived) {
  const releases = [];

  // Load active releases
  const activeFiles = await glob('.tiki/releases/*.json');
  for (const file of activeFiles) {
    const content = await readFile(file);
    releases.push(JSON.parse(content));
  }

  // Load archived releases if flag is set
  if (includeArchived) {
    const archivedFiles = await glob('.tiki/releases/archive/*.json');
    for (const file of archivedFiles) {
      const content = await readFile(file);
      const release = JSON.parse(content);
      release.isArchived = true; // Mark as archived for display purposes
      releases.push(release);
    }
  }

  return releases;
}
```

### Shipped Release Display

Shipped releases are marked with their ship date in the output:

```text
v0.9 (shipped 2025-12-15)
├── #5: Initial setup ✓
├── #6: Basic commands ✓
└── #7: Core framework ✓

v1.0 (shipped 2026-01-10)
├── #12: Core execution framework ✓
├── #14: Auto-fix infrastructure ✓
└── #15: Trigger processing ✓

v1.1 (active - 40% complete)
├── #20: Feature A ◐
├── #21: Feature B ○
└── #22: Feature C ·
```

### Sorting with Archived Releases

All releases (active and archived) are sorted together by version:

```javascript
function sortAllReleases(releases) {
  return releases.sort((a, b) => compareVersions(a.version, b.version));
}
```

This ensures the timeline shows a complete, chronological view of the project from earliest to latest release.

## Filtering Releases (--releases)

The `--releases` flag allows filtering the roadmap to show only specific versions.

### Filter Usage

```bash
/tiki:roadmap --releases v1.1,v1.2
```

This filters the output to only include the specified releases.

### Filtered Output Format

When filtering is active, the output header indicates the filter:

```text
## Project Roadmap (Filtered)

Showing 2 of 4 releases: v1.1, v1.2

v1.1 (active - 40% complete)
├── #20: Feature A ◐
├── #21: Feature B ○
└── #22: Feature C ·

v1.2 (planned)
├── #30: Future feature ·
└── #31: Another feature ·

Legend: ✓ completed | ◐ in_progress | ○ planned | · not_planned
```

### Filter Implementation

```javascript
function filterReleases(releases, requestedVersions) {
  if (!requestedVersions || requestedVersions.length === 0) {
    return { filtered: releases, warnings: [] };
  }

  const warnings = [];
  const availableVersions = releases.map(r => r.version);

  // Check for invalid version requests
  for (const requested of requestedVersions) {
    if (!availableVersions.includes(requested)) {
      warnings.push(requested);
    }
  }

  // Filter to only matching releases
  const filtered = releases.filter(r => requestedVersions.includes(r.version));

  return { filtered, warnings };
}
```

### Validation and Warnings

If a requested version is not found, display a warning with available releases:

```text
Warning: Release 'v1.3' not found.

Available releases:
- v1.0 (shipped)
- v1.1 (active)
- v1.2 (planned)

Showing matching releases only.
```

Implementation:

```javascript
function displayFilterWarnings(warnings, allReleases) {
  if (warnings.length === 0) return;

  for (const version of warnings) {
    console.log(`Warning: Release '${version}' not found.`);
  }

  console.log('\nAvailable releases:');
  for (const release of allReleases.sort((a, b) => compareVersions(a.version, b.version))) {
    const statusLabel = release.status === 'shipped'
      ? 'shipped'
      : release.status === 'active'
        ? 'active'
        : 'planned';
    console.log(`- ${release.version} (${statusLabel})`);
  }

  console.log('\nShowing matching releases only.');
}
```

### Combining with Other Flags

The `--releases` filter can be combined with other flags:

```bash
# Filter releases and include archived
/tiki:roadmap --releases v1.0,v1.1 --include-archived

# Filter releases and generate file
/tiki:roadmap --releases v1.1,v1.2 --output

# Filter releases with table format
/tiki:roadmap --releases v1.1 --format table
```

When combined with `--include-archived`, the filter applies to both active and archived releases.
