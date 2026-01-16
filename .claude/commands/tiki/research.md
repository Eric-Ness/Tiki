---
type: prompt
name: tiki:research
description: Research unfamiliar domains before planning. Use when you need to understand a technology, library, or pattern before implementing.
allowed-tools: Read, Write, Bash, Glob, Grep, Task, WebSearch, WebFetch, AskUserQuestion
argument-hint: <topic|#issue|query> [--refresh] [--quick]
---

# Research

Research unfamiliar domains before planning to ensure implementations follow current best practices and patterns.

## Usage

```
/tiki:research react-query                              # Research a topic
/tiki:research #42                                      # Research topics from issue
/tiki:research "authentication patterns for Next.js"   # Free-form query
/tiki:research react-query --refresh                   # Force refresh existing research
/tiki:research react-query --quick                     # Quick mode (fewer agents)
```

## Instructions

### Step 1: Parse Arguments

Determine the research mode and target from the arguments.

#### 1a. Extract Input Type

Analyze the input to determine the research target:

| Input Pattern | Type | Description |
|---------------|------|-------------|
| `#N` or `N` (number) | Issue | Extract research topics from GitHub issue |
| `"quoted text"` | Query | Free-form research query |
| `unquoted-text` | Topic | Single topic/technology name |
| (no args) | Error | Show usage instructions |

#### 1b. Detect Flags

Check for optional flags:

```
--refresh    Force refresh even if cached research exists
--quick      Quick mode - spawn fewer agents, shallower research
```

#### 1c. Parse Issue Mode

If input is an issue number (e.g., `#42` or `42`):

1. Parse the issue number (strip `#` if present)
2. Fetch the issue using GitHub CLI:

```bash
gh issue view {N} --json title,body,labels
```

3. Extract research topics from:
   - Issue title (key technologies/patterns mentioned)
   - Issue body (look for technology references, unfamiliar terms)
   - Labels (e.g., `react`, `auth`, `database`)

4. If no issue found:

```
Error: Issue #{N} not found.

Check the issue number and try again.
Available issues: gh issue list
```

5. Present extracted topics for confirmation:

```
## Research Topics from Issue #{N}

Issue: {title}

I identified these topics that may need research:

1. react-query (mentioned in description)
2. optimistic updates (mentioned in description)
3. cache invalidation (related pattern)

Research all of these? [Yes/Select/Add more/Cancel]
```

#### 1d. Parse Query Mode

If input is a quoted string:

1. Use the entire quoted content as the research query
2. Generate a kebab-case folder name from key terms

```
Input: "authentication patterns for Next.js"
Query: authentication patterns for Next.js
Folder: auth-patterns-nextjs
```

#### 1e. Parse Topic Mode

If input is an unquoted string:

1. Use as the topic name
2. Convert to kebab-case for folder name

```
Input: ReactQuery
Folder: react-query

Input: React Query
Folder: react-query

Input: next-auth
Folder: next-auth
```

#### 1f. Normalize Folder Name

Convert any topic to a valid kebab-case folder name:

```javascript
function toKebabCase(input) {
  return input
    .replace(/([a-z])([A-Z])/g, '$1-$2')  // camelCase to kebab
    .replace(/[\s_]+/g, '-')               // spaces/underscores to dashes
    .replace(/[^a-zA-Z0-9-]/g, '')         // remove special chars
    .toLowerCase()
    .replace(/-+/g, '-')                   // collapse multiple dashes
    .replace(/^-|-$/g, '');                // trim dashes
}
```

#### 1g. Handle No Arguments

If no arguments provided:

```
## Research

Research unfamiliar domains before planning.

**Usage:**
  /tiki:research <topic>        Research a specific topic
  /tiki:research #42            Research topics from an issue
  /tiki:research "query"        Research a free-form query

**Options:**
  --refresh                     Force refresh cached research
  --quick                       Quick mode (faster, less depth)

**Examples:**
  /tiki:research react-query
  /tiki:research "state management patterns for React"
  /tiki:research #42 --refresh

Start by providing a topic, issue number, or query to research.
```

#### 1h. Handle Invalid Flags

If unrecognized flags are provided:

```
Unknown flag: --{flag}

Valid flags:
  --refresh    Force refresh existing research
  --quick      Quick mode (fewer agents, faster)

Usage: /tiki:research <topic> [--refresh] [--quick]
```

### Step 2: Check for Existing Research (Caching)

Before starting new research, check if cached research exists.

#### 2a. Locate Research Cache

Research is cached at: `.tiki/research/{topic}/research.md`

```bash
# Check if research directory and file exist
if [ -d ".tiki/research/{topic}" ] && [ -f ".tiki/research/{topic}/research.md" ]; then
  echo "Research cache found"
fi
```

#### 2b. Parse Cache Metadata

If research exists, read the metadata section from the file:

```markdown
---
topic: react-query
researched_at: 2026-01-15T14:30:00Z
expires_at: 2026-01-22T14:30:00Z
mode: full
sources_count: 12
agents_used: 3
---
```

Extract:
- `researched_at`: When research was conducted
- `expires_at`: When research should be refreshed (default: 7 days)
- `mode`: `full` or `quick`

#### 2c. Calculate Research Age

```javascript
const researchedAt = new Date(metadata.researched_at);
const now = new Date();
const ageMs = now - researchedAt;
const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
const ageHours = Math.floor(ageMs / (1000 * 60 * 60)) % 24;
```

Format age for display:
- Less than 1 day: "X hours ago"
- 1-30 days: "X days ago"
- 30+ days: "X weeks ago" or "X months ago"

#### 2d. Handle Existing Research (No Refresh Flag)

If research exists and `--refresh` is NOT set:

```
## Existing Research Found

Research for "{topic}" already exists.

**Researched:** {age} ago ({date})
**Mode:** {full/quick}
**Sources:** {N} sources referenced

---

**Options:**
1. **View existing** - Show the cached research
2. **Refresh** - Run new research and replace
3. **Supplement** - Keep existing and add specific questions
4. **Cancel** - Exit without action

Enter your choice (1/2/3/4):
```

Handle user response:
- **Option 1 (View):** Display the cached research.md content and exit
- **Option 2 (Refresh):** Set refresh flag and continue to research
- **Option 3 (Supplement):** Ask for specific questions to research additionally
- **Option 4 (Cancel):** Exit command

#### 2e. Handle Refresh Flag

If `--refresh` flag is set:

1. Note that existing research will be archived
2. Continue to research phase

```
Refreshing research for "{topic}"...
Previous research from {date} will be archived.
```

Archive existing research:
```bash
mkdir -p .tiki/research/{topic}/archive
mv .tiki/research/{topic}/research.md .tiki/research/{topic}/archive/research-{timestamp}.md
```

#### 2f. Handle No Existing Research

If no research cache exists:

1. Create research directory structure
2. Continue to research phase

```bash
mkdir -p .tiki/research/{topic}
```

```
No existing research for "{topic}".
Starting new research session...
```

#### 2g. Research Cache Structure

Research files are stored in this structure:

```
.tiki/
  research/
    react-query/
      research.md           # Main research document
      sources.json          # Source URLs and metadata
      archive/              # Previous research versions
        research-20260115.md
    auth-patterns-nextjs/
      research.md
      sources.json
```

### Step 3: Initialize Research Session

After parsing arguments and checking cache, set up the research session.

#### 3a. Display Research Banner

```
## Research Session: {topic}

**Mode:** {full/quick}
**Target:** {topic|query|Issue #{N}}
**Cache:** {new|refresh|supplement}

---

Preparing research agents...
```

#### 3b. Create Research Document Shell

Create the initial research document structure at `.tiki/research/{topic}/research.md`:

```markdown
---
topic: {topic}
researched_at: {ISO timestamp}
expires_at: {ISO timestamp + 7 days}
mode: {full|quick}
sources_count: 0
agents_used: 0
status: in_progress
---

# Research: {Topic Title}

> Researched on {date} | Mode: {full/quick}

## Summary

{To be filled by research agents}

## Key Findings

{To be filled by research agents}

## Best Practices

{To be filled by research agents}

## Common Patterns

{To be filled by research agents}

## Gotchas & Pitfalls

{To be filled by research agents}

## Integration Notes

{To be filled by research agents}

## Sources

{To be filled by research agents}

## Research Log

### Session Started
- **Time:** {timestamp}
- **Mode:** {full/quick}
- **Target:** {topic/query/issue}
```

#### 3c. Initialize Sources File

Create `.tiki/research/{topic}/sources.json`:

```json
{
  "topic": "{topic}",
  "createdAt": "{ISO timestamp}",
  "sources": []
}
```

### Step 4: Define Research Dimensions

Based on the research mode, define the dimensions that agents will investigate.

#### 4a. Full Mode Dimensions (5 Agents)

In full mode, spawn 5 parallel research agents, each focused on a specific dimension:

| Agent | Dimension | Focus Areas |
|-------|-----------|-------------|
| 1 | **Ecosystem Analysis** | Libraries, frameworks, popularity, maintenance status, community size, GitHub stars, npm downloads, release frequency |
| 2 | **Architecture Patterns** | Common patterns, design approaches, pros/cons of each, when to use which pattern, real-world examples |
| 3 | **Implementation Best Practices** | Project structure, testing approaches, error handling, configuration, development workflow |
| 4 | **Common Pitfalls** | Mistakes to avoid, performance gotchas, security considerations, debugging tips, migration issues |
| 5 | **Recommendations** | Suggested approach for this project, rationale, alternatives considered, next steps, learning resources |

#### 4b. Quick Mode Dimensions (3 Agents)

In quick mode, spawn 3 parallel research agents with condensed focus:

| Agent | Dimension | Focus Areas |
|-------|-----------|-------------|
| 1 | **Ecosystem Overview** | Top libraries, key players, current state of the ecosystem |
| 2 | **Best Practices** | Essential best practices, key patterns, critical gotchas |
| 3 | **Recommendations** | Top recommendation, quick rationale, immediate next steps |

#### 4c. Dimension Details for Full Mode

**Dimension 1: Ecosystem Analysis Agent**

Research questions:
- What are the main libraries/frameworks in this space?
- Which are most popular (npm downloads, GitHub stars)?
- Which are actively maintained (recent commits, release dates)?
- What is the community size (Discord, Stack Overflow, Reddit)?
- Are there emerging alternatives to established solutions?
- What is the corporate backing/sponsorship situation?

**Dimension 2: Architecture Patterns Agent**

Research questions:
- What are the common architectural patterns for this domain?
- What are the pros and cons of each pattern?
- When should you use pattern A vs pattern B?
- How do these patterns scale?
- What are real-world examples of each pattern in production?
- How do patterns integrate with existing architectures?

**Dimension 3: Implementation Best Practices Agent**

Research questions:
- What is the recommended project structure?
- What testing approaches are used (unit, integration, e2e)?
- How should errors be handled?
- What configuration patterns are common?
- What is the typical development workflow?
- How should logging and monitoring be implemented?

**Dimension 4: Common Pitfalls Agent**

Research questions:
- What are the most common mistakes beginners make?
- What are performance gotchas to watch out for?
- What security considerations are important?
- What debugging techniques are useful?
- What migration issues exist between versions?
- What are edge cases that often cause problems?

**Dimension 5: Recommendations Agent**

Research questions:
- Based on the other findings, what approach is recommended?
- What is the rationale for this recommendation?
- What alternatives should be considered?
- What are the immediate next steps to get started?
- What learning resources are most valuable?
- What timeline should be expected for implementation?

#### 4d. Dimension Details for Quick Mode

**Dimension 1: Ecosystem Overview Agent**

Research questions (condensed):
- What are the top 3-5 libraries in this space?
- Which is the current community favorite?
- What is the maintenance status of the top options?

**Dimension 2: Best Practices Agent**

Research questions (condensed):
- What are the 3-5 most important best practices?
- What is the #1 pattern to follow?
- What is the #1 pitfall to avoid?

**Dimension 3: Recommendations Agent**

Research questions (condensed):
- What is the single best recommendation?
- Why is this the recommended approach?
- What is the first step to take?

### Step 5: Spawn Research Agents

Spawn parallel research agents using the Task tool.

#### 5a. Agent Prompt Template

Each research agent receives a structured prompt:

```markdown
You are a research agent investigating: {topic}

## Your Focus: {dimension_name}

Research the following aspects of {topic}:

{dimension_specific_questions}

## Research Instructions

1. **Use WebSearch** to find current information
   - Use 2026 as the current year in your searches
   - Search for recent articles, documentation, and discussions
   - Look for official documentation and reputable sources

2. **Use WebFetch** to read relevant pages
   - Fetch official documentation pages
   - Read tutorial and guide content
   - Access GitHub READMEs when relevant

3. **Evaluate Source Quality**
   - Official documentation: High confidence
   - Well-known tech blogs: Medium-High confidence
   - Stack Overflow (recent, high-voted): Medium confidence
   - Random blog posts: Low-Medium confidence
   - Outdated content (2+ years): Low confidence

4. **Note Confidence Levels**
   - **High**: Multiple authoritative sources agree
   - **Medium**: Some sources agree, or single authoritative source
   - **Low**: Limited sources, conflicting information, or inference

## Output Format

Return your findings in this exact format:

## {Dimension Name}

### Key Findings

- Finding 1 [Confidence: High/Medium/Low]
- Finding 2 [Confidence: High/Medium/Low]
- Finding 3 [Confidence: High/Medium/Low]
- (continue as needed)

### Details

{Detailed markdown content with sections as appropriate}

{Include code examples where relevant}

{Include comparisons or tables where helpful}

### Sources

| URL | Title | Confidence | Notes |
|-----|-------|------------|-------|
| https://example.com/doc1 | Documentation Title | High | Official docs |
| https://example.com/article | Article Title | Medium | Well-written tutorial |

---

End of {dimension_name} research.
```

#### 5b. Spawn Full Mode Agents (5 Parallel)

Use the Task tool to spawn 5 parallel research agents:

```
Spawning 5 research agents in parallel...

Agent 1/5: Ecosystem Analysis
Agent 2/5: Architecture Patterns
Agent 3/5: Implementation Best Practices
Agent 4/5: Common Pitfalls
Agent 5/5: Recommendations
```

**Agent 1: Ecosystem Analysis**
```markdown
You are a research agent investigating: {topic}

## Your Focus: Ecosystem Analysis

Research the following aspects of {topic}:

1. What are the main libraries/frameworks in this space?
2. Which are most popular (npm downloads, GitHub stars)?
3. Which are actively maintained (recent commits, release dates)?
4. What is the community size (Discord, Stack Overflow, Reddit)?
5. Are there emerging alternatives to established solutions?
6. What is the corporate backing/sponsorship situation?

{standard research instructions and output format}
```

**Agent 2: Architecture Patterns**
```markdown
You are a research agent investigating: {topic}

## Your Focus: Architecture Patterns

Research the following aspects of {topic}:

1. What are the common architectural patterns for this domain?
2. What are the pros and cons of each pattern?
3. When should you use pattern A vs pattern B?
4. How do these patterns scale?
5. What are real-world examples of each pattern in production?
6. How do patterns integrate with existing architectures?

{standard research instructions and output format}
```

**Agent 3: Implementation Best Practices**
```markdown
You are a research agent investigating: {topic}

## Your Focus: Implementation Best Practices

Research the following aspects of {topic}:

1. What is the recommended project structure?
2. What testing approaches are used (unit, integration, e2e)?
3. How should errors be handled?
4. What configuration patterns are common?
5. What is the typical development workflow?
6. How should logging and monitoring be implemented?

{standard research instructions and output format}
```

**Agent 4: Common Pitfalls**
```markdown
You are a research agent investigating: {topic}

## Your Focus: Common Pitfalls

Research the following aspects of {topic}:

1. What are the most common mistakes beginners make?
2. What are performance gotchas to watch out for?
3. What security considerations are important?
4. What debugging techniques are useful?
5. What migration issues exist between versions?
6. What are edge cases that often cause problems?

{standard research instructions and output format}
```

**Agent 5: Recommendations**
```markdown
You are a research agent investigating: {topic}

## Your Focus: Recommendations

Based on research of {topic}, provide recommendations:

1. What approach is recommended for this project?
2. What is the rationale for this recommendation?
3. What alternatives should be considered?
4. What are the immediate next steps to get started?
5. What learning resources are most valuable?
6. What timeline should be expected for implementation?

{standard research instructions and output format}
```

#### 5c. Spawn Quick Mode Agents (3 Parallel)

Use the Task tool to spawn 3 parallel research agents:

```
Spawning 3 research agents in parallel (quick mode)...

Agent 1/3: Ecosystem Overview
Agent 2/3: Best Practices
Agent 3/3: Recommendations
```

**Agent 1: Ecosystem Overview**
```markdown
You are a research agent investigating: {topic}

## Your Focus: Ecosystem Overview (Quick Mode)

Research the following (focus on key points only):

1. What are the top 3-5 libraries in this space?
2. Which is the current community favorite?
3. What is the maintenance status of the top options?

Keep your research focused and concise. Aim for quality over quantity.

{standard research instructions and output format}
```

**Agent 2: Best Practices**
```markdown
You are a research agent investigating: {topic}

## Your Focus: Best Practices (Quick Mode)

Research the following (focus on essentials only):

1. What are the 3-5 most important best practices?
2. What is the #1 pattern to follow?
3. What is the #1 pitfall to avoid?

Keep your research focused and concise. Aim for quality over quantity.

{standard research instructions and output format}
```

**Agent 3: Recommendations**
```markdown
You are a research agent investigating: {topic}

## Your Focus: Recommendations (Quick Mode)

Provide focused recommendations:

1. What is the single best recommendation?
2. Why is this the recommended approach?
3. What is the first step to take?

Keep your research focused and concise. Aim for quality over quantity.

{standard research instructions and output format}
```

#### 5d. Display Progress During Research

Show real-time progress as agents complete their research:

**Full Mode Progress Display:**
```
## Researching: {topic}

Mode: Full (5 agents)
Started: {timestamp}

Progress:
[1/5] Ecosystem Analysis      ████████████████████ Done (2m 15s)
[2/5] Architecture Patterns   ████████████░░░░░░░░ In Progress...
[3/5] Best Practices          ████████░░░░░░░░░░░░ In Progress...
[4/5] Common Pitfalls         ██░░░░░░░░░░░░░░░░░░ In Progress...
[5/5] Recommendations         ░░░░░░░░░░░░░░░░░░░░ Waiting...

Completed: 1/5 | Elapsed: 2m 30s | Est. Remaining: ~3m
```

**Quick Mode Progress Display:**
```
## Researching: {topic}

Mode: Quick (3 agents)
Started: {timestamp}

Progress:
[1/3] Ecosystem Overview      ████████████████████ Done (1m 05s)
[2/3] Best Practices          ████████████░░░░░░░░ In Progress...
[3/3] Recommendations         ████░░░░░░░░░░░░░░░░ In Progress...

Completed: 1/3 | Elapsed: 1m 20s | Est. Remaining: ~1m
```

#### 5e. Task Tool Invocation Pattern

When spawning agents, use the Task tool with clear descriptions:

```javascript
// Spawn all agents in parallel using Task tool
// Each Task invocation should include:
// - Clear task description
// - The full agent prompt
// - Allowed tools: WebSearch, WebFetch

// Example Task invocation structure:
Task({
  description: "Research agent: Ecosystem Analysis for {topic}",
  prompt: ecosystemAgentPrompt,
  allowedTools: ["WebSearch", "WebFetch"]
})

// All 5 (or 3) agents should be spawned simultaneously
// for parallel execution
```

### Step 6: Collect Agent Results

After spawning agents, collect and process their results.

#### 6a. Wait for Agent Completion

Monitor agent status and wait for all agents to complete:

```
Waiting for research agents to complete...

[✓] Ecosystem Analysis - Complete
[✓] Architecture Patterns - Complete
[✓] Best Practices - Complete
[✓] Common Pitfalls - Complete
[○] Recommendations - Running (45s)...

4/5 agents complete. Waiting for remaining agents...
```

When all agents complete:

```
All research agents completed!

Agent Results:
- Ecosystem Analysis: 8 findings, 6 sources
- Architecture Patterns: 12 findings, 9 sources
- Best Practices: 10 findings, 7 sources
- Common Pitfalls: 7 findings, 5 sources
- Recommendations: 5 findings, 4 sources

Total: 42 findings, 31 sources
Time: 4m 32s

Proceeding to synthesis...
```

#### 6b. Handle Agent Failures

If an agent fails or times out, handle gracefully:

**Timeout Handling:**
```
[!] Agent "Architecture Patterns" timed out after 5 minutes.

Options:
1. Retry this agent
2. Skip and continue with available results
3. Cancel research

Enter choice (1/2/3):
```

**Error Handling:**
```
[!] Agent "Common Pitfalls" encountered an error:
    Error: WebSearch rate limit exceeded

Options:
1. Retry after 30 seconds
2. Skip and continue with available results
3. Cancel research

Enter choice (1/2/3):
```

**Partial Results:**
```
Research completed with partial results.

Successful agents: 4/5
Failed agents: 1 (Common Pitfalls - timeout)

The research document will note missing sections.
Continue with synthesis? [Y/n]
```

#### 6c. Collect and Validate Results

For each completed agent, collect and validate results:

```javascript
// For each agent result:
function collectAgentResult(agentName, result) {
  // 1. Parse the markdown output
  const parsed = parseAgentOutput(result);

  // 2. Validate required sections exist
  const requiredSections = ['Key Findings', 'Details', 'Sources'];
  const missingSections = requiredSections.filter(s => !parsed[s]);

  if (missingSections.length > 0) {
    console.warn(`Agent ${agentName} missing sections: ${missingSections.join(', ')}`);
  }

  // 3. Extract source URLs for validation
  const sources = parsed.sources.map(s => s.url);

  // 4. Count findings by confidence level
  const confidence = {
    high: parsed.findings.filter(f => f.confidence === 'High').length,
    medium: parsed.findings.filter(f => f.confidence === 'Medium').length,
    low: parsed.findings.filter(f => f.confidence === 'Low').length
  };

  return {
    agent: agentName,
    content: result,
    findings: parsed.findings,
    sources: parsed.sources,
    confidence: confidence,
    valid: missingSections.length === 0
  };
}
```

#### 6d. Store Raw Agent Results

Store each agent's raw output for reference:

```
.tiki/research/{topic}/
  research.md              # Final synthesized document
  sources.json             # Consolidated sources
  agents/                  # Raw agent outputs
    ecosystem-analysis.md
    architecture-patterns.md
    best-practices.md
    common-pitfalls.md
    recommendations.md
```

Create agent output files:

```markdown
---
agent: ecosystem-analysis
topic: {topic}
completed_at: {ISO timestamp}
findings_count: 8
sources_count: 6
confidence_distribution:
  high: 3
  medium: 4
  low: 1
---

{Raw agent output}
```

#### 6e. Consolidate Sources

Merge all sources into a consolidated sources.json:

```json
{
  "topic": "{topic}",
  "createdAt": "{ISO timestamp}",
  "totalSources": 31,
  "sourcesByAgent": {
    "ecosystem-analysis": 6,
    "architecture-patterns": 9,
    "best-practices": 7,
    "common-pitfalls": 5,
    "recommendations": 4
  },
  "sources": [
    {
      "url": "https://example.com/doc1",
      "title": "Official Documentation",
      "confidence": "High",
      "citedBy": ["ecosystem-analysis", "best-practices"],
      "notes": "Primary documentation source"
    },
    {
      "url": "https://example.com/article",
      "title": "Tutorial Article",
      "confidence": "Medium",
      "citedBy": ["architecture-patterns"],
      "notes": "Good pattern examples"
    }
  ]
}
```

#### 6f. Prepare for Synthesis

After collecting all results, prepare data for the synthesis phase:

```
## Agent Results Collected

Ready for synthesis with:
- 5 agent reports
- 42 total findings
- 31 unique sources
- Confidence breakdown: 15 High, 20 Medium, 7 Low

Agent outputs saved to: .tiki/research/{topic}/agents/

Proceeding to Phase 3: Synthesis...
```

### Step 7: Synthesize Research Results

Combine agent outputs into a coherent research document.

#### 7a. Parse All Agent Results

Extract structured data from each agent's output:

```javascript
function parseAgentResults(agentOutputs) {
  const results = {
    findings: [],
    sources: [],
    recommendations: [],
    pitfalls: [],
    patterns: []
  };

  for (const [agentName, output] of Object.entries(agentOutputs)) {
    // Extract key findings section
    const findings = extractSection(output, 'Key Findings');
    findings.forEach(f => {
      results.findings.push({
        ...f,
        agent: agentName,
        dimension: getDimensionFromAgent(agentName)
      });
    });

    // Extract sources table
    const sources = extractSourcesTable(output);
    results.sources.push(...sources);

    // Extract dimension-specific content
    if (agentName === 'recommendations') {
      results.recommendations = extractRecommendations(output);
    }
    if (agentName === 'common-pitfalls') {
      results.pitfalls = extractPitfalls(output);
    }
    if (agentName === 'architecture-patterns') {
      results.patterns = extractPatterns(output);
    }
  }

  return results;
}
```

#### 7b. Combine Findings by Dimension

Group and organize findings by their research dimension:

```javascript
function combineByDimension(findings) {
  const dimensions = {
    ecosystem: {
      title: 'Ecosystem Analysis',
      findings: [],
      sources: []
    },
    architecture: {
      title: 'Architecture Patterns',
      findings: [],
      sources: []
    },
    bestPractices: {
      title: 'Implementation Best Practices',
      findings: [],
      sources: []
    },
    pitfalls: {
      title: 'Common Pitfalls',
      findings: [],
      sources: []
    },
    recommendations: {
      title: 'Recommendations',
      findings: [],
      sources: []
    }
  };

  // Assign findings to dimensions
  findings.forEach(finding => {
    const dimension = finding.dimension;
    if (dimensions[dimension]) {
      dimensions[dimension].findings.push(finding);
    }
  });

  // Sort by confidence (High > Medium > Low)
  const confidenceOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
  Object.values(dimensions).forEach(dim => {
    dim.findings.sort((a, b) =>
      confidenceOrder[a.confidence] - confidenceOrder[b.confidence]
    );
  });

  return dimensions;
}
```

#### 7c. Cross-Reference and Deduplicate Sources

Merge sources from all agents and identify duplicates:

```javascript
function deduplicateSources(allSources) {
  const sourceMap = new Map();

  allSources.forEach(source => {
    const normalizedUrl = normalizeUrl(source.url);

    if (sourceMap.has(normalizedUrl)) {
      // Merge with existing source
      const existing = sourceMap.get(normalizedUrl);
      existing.citedBy = [...new Set([...existing.citedBy, source.agent])];
      // Upgrade confidence if higher
      existing.confidence = higherConfidence(existing.confidence, source.confidence);
      // Merge notes
      if (source.notes && !existing.notes.includes(source.notes)) {
        existing.notes += '; ' + source.notes;
      }
    } else {
      // Add new source
      sourceMap.set(normalizedUrl, {
        url: source.url,
        title: source.title,
        confidence: source.confidence,
        citedBy: [source.agent],
        notes: source.notes || '',
        relevance: determineRelevance(source)
      });
    }
  });

  // Convert to array and sort by confidence then citation count
  return Array.from(sourceMap.values())
    .sort((a, b) => {
      const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
      if (confDiff !== 0) return confDiff;
      return b.citedBy.length - a.citedBy.length;
    });
}

function normalizeUrl(url) {
  // Remove trailing slashes, normalize protocol, remove tracking params
  return url
    .replace(/\/$/, '')
    .replace(/^http:/, 'https:')
    .replace(/[?&](utm_\w+|ref|source)=[^&]*/g, '');
}

function higherConfidence(a, b) {
  const order = { 'High': 2, 'Medium': 1, 'Low': 0 };
  return order[a] >= order[b] ? a : b;
}
```

#### 7d. Calculate Overall Confidence Level

Determine the overall confidence of the research:

```javascript
function calculateOverallConfidence(findings, sources) {
  // Count findings by confidence
  const counts = { high: 0, medium: 0, low: 0 };
  findings.forEach(f => {
    counts[f.confidence.toLowerCase()]++;
  });

  const total = findings.length;
  const highRatio = counts.high / total;
  const lowRatio = counts.low / total;

  // Factor in source quality
  const highQualitySources = sources.filter(s => s.confidence === 'High').length;
  const sourceRatio = highQualitySources / sources.length;

  // Determine overall confidence
  if (highRatio >= 0.5 && sourceRatio >= 0.4 && lowRatio < 0.2) {
    return 'high';
  } else if (lowRatio >= 0.4 || sourceRatio < 0.2) {
    return 'low';
  } else {
    return 'medium';
  }
}

// Display confidence calculation
```
Research Confidence Analysis:

- High confidence findings: {N} ({%})
- Medium confidence findings: {N} ({%})
- Low confidence findings: {N} ({%})
- High-quality sources: {N}/{total} ({%})

Overall confidence: {HIGH/MEDIUM/LOW}
```
```

#### 7e. Generate Executive Summary

Synthesize an executive summary from all findings:

```javascript
function generateExecutiveSummary(dimensions, overallConfidence) {
  const summary = [];

  // Paragraph 1: What is this and why it matters
  const ecosystemFindings = dimensions.ecosystem.findings.slice(0, 3);
  summary.push(generateOverviewParagraph(ecosystemFindings));

  // Paragraph 2: Key patterns and best practices
  const patternFindings = dimensions.architecture.findings.slice(0, 2);
  const practiceFindings = dimensions.bestPractices.findings.slice(0, 2);
  summary.push(generatePatternsOverview(patternFindings, practiceFindings));

  // Paragraph 3: Primary recommendation
  const topRecommendation = dimensions.recommendations.findings[0];
  const keyPitfall = dimensions.pitfalls.findings[0];
  summary.push(generateRecommendationSummary(topRecommendation, keyPitfall));

  return summary.join('\n\n');
}
```

The executive summary should:
1. Open with the current state of the ecosystem (1-2 sentences)
2. Highlight the primary recommended approach (1-2 sentences)
3. Note the most critical consideration or pitfall (1 sentence)
4. Be written in clear, actionable language
5. Stay within 2-3 paragraphs total

### Step 8: Generate Research Output

Create the final research document at `.tiki/research/{topic}/research.md`.

#### 8a. Research Output Template

Generate the complete research document with this structure:

```markdown
---
topic: {topic}
researched_at: {ISO timestamp}
expires_at: {ISO timestamp + 7 days}
mode: {full|quick}
sources_count: {N}
agents_used: {N}
status: complete
overall_confidence: {high|medium|low}
---

# Research: {Topic Title}

> Researched on {date} | Mode: {full/quick} | Confidence: {high/medium/low}

## Executive Summary

{2-3 paragraph summary synthesized from all agent findings}

## Ecosystem Analysis

### Available Libraries/Frameworks

| Library | Stars/Downloads | Last Update | Status | Notes |
|---------|-----------------|-------------|--------|-------|
| lib1 | 45k stars | 2026-01 | Active | Primary recommendation |
| lib2 | 32k stars | 2026-01 | Active | Good alternative |
| lib3 | 18k stars | 2025-09 | Stable | Legacy option |

### Recommended Stack
{What most projects use, with rationale for the recommendation. Include version numbers where relevant.}

### Maintenance & Community
{Activity levels, community size, support options. Note Discord servers, GitHub discussions, Stack Overflow tag activity.}

## Architecture Patterns

### Common Patterns

| Pattern | When to Use | Pros | Cons |
|---------|-------------|------|------|
| pattern1 | For X situations | Pro1, Pro2 | Con1, Con2 |
| pattern2 | For Y situations | Pro1, Pro2 | Con1, Con2 |
| pattern3 | For Z situations | Pro1, Pro2 | Con1, Con2 |

### Pattern Comparison
{Detailed comparison of the main patterns with specific guidance on selection criteria}

### Recommended Pattern
{Specific recommendation with rationale based on common use cases}

## Implementation Best Practices

### Project Structure
```
recommended-structure/
  src/
    {recommended directory layout}
  tests/
    {test organization}
  config/
    {configuration files}
```

### Testing Approach
{Testing patterns and frameworks recommended for this domain}

### Error Handling
{Error handling patterns specific to this technology/domain}

## Common Pitfalls

### Mistakes to Avoid
1. **Pitfall 1** [Confidence: High]
   - Why it happens: {explanation}
   - How to avoid: {solution}

2. **Pitfall 2** [Confidence: High]
   - Why it happens: {explanation}
   - How to avoid: {solution}

3. **Pitfall 3** [Confidence: Medium]
   - Why it happens: {explanation}
   - How to avoid: {solution}

### Performance Gotchas
{Performance issues to watch for, with specific metrics or thresholds where applicable}

### Security Considerations
{Security concerns specific to this domain, including common vulnerabilities and mitigations}

## Recommendations

### Suggested Approach
{Primary recommendation with clear rationale, including specific libraries/patterns to use}

### Alternative Approaches
{Other valid approaches if constraints change, with notes on when each is appropriate}

### Next Steps
1. {Immediate action item}
2. {Second priority action}
3. {Third priority action}

## Sources

| # | Source | Title | Confidence | Relevance |
|---|--------|-------|------------|-----------|
| 1 | [URL](url) | Title | High | Used for ecosystem analysis |
| 2 | [URL](url) | Title | High | Primary documentation |
| 3 | [URL](url) | Title | Medium | Pattern examples |
| 4 | [URL](url) | Title | Medium | Best practices guide |
| 5 | [URL](url) | Title | Low | Community discussion |

## Research Log

- **Session:** {topic}
- **Started:** {timestamp}
- **Completed:** {timestamp}
- **Mode:** {full/quick}
- **Agents:** {N} completed, {N} failed
- **Findings:** {N} total ({N} high, {N} medium, {N} low confidence)
- **Sources:** {N} unique sources from {N} citations
```

#### 8b. Write the Research Document

Write the synthesized document to disk:

```javascript
async function writeResearchDocument(topic, synthesizedData) {
  const researchPath = `.tiki/research/${topic}/research.md`;

  // Generate document from template
  const document = generateResearchDocument({
    topic: synthesizedData.topic,
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    mode: synthesizedData.mode,
    sourcesCount: synthesizedData.sources.length,
    agentsUsed: synthesizedData.agentsCompleted,
    overallConfidence: synthesizedData.confidence,
    executiveSummary: synthesizedData.summary,
    ecosystem: synthesizedData.dimensions.ecosystem,
    architecture: synthesizedData.dimensions.architecture,
    bestPractices: synthesizedData.dimensions.bestPractices,
    pitfalls: synthesizedData.dimensions.pitfalls,
    recommendations: synthesizedData.dimensions.recommendations,
    sources: synthesizedData.sources,
    log: synthesizedData.researchLog
  });

  // Write to file
  await writeFile(researchPath, document);

  console.log(`Research document written to: ${researchPath}`);
}
```

#### 8c. Update Sources JSON

Update the `.tiki/research/{topic}/sources.json` with complete source list:

```json
{
  "topic": "{topic}",
  "createdAt": "{ISO timestamp}",
  "updatedAt": "{ISO timestamp}",
  "totalSources": {N},
  "sourcesByConfidence": {
    "high": {N},
    "medium": {N},
    "low": {N}
  },
  "sourcesByAgent": {
    "ecosystem-analysis": {N},
    "architecture-patterns": {N},
    "best-practices": {N},
    "common-pitfalls": {N},
    "recommendations": {N}
  },
  "sources": [
    {
      "id": 1,
      "url": "https://example.com/doc1",
      "title": "Official Documentation",
      "confidence": "High",
      "relevance": "Used for ecosystem analysis",
      "citedBy": ["ecosystem-analysis", "best-practices"],
      "notes": "Primary documentation source",
      "fetchedAt": "{ISO timestamp}"
    },
    {
      "id": 2,
      "url": "https://example.com/article",
      "title": "Tutorial Article",
      "confidence": "Medium",
      "relevance": "Pattern examples",
      "citedBy": ["architecture-patterns"],
      "notes": "Good pattern examples with code samples",
      "fetchedAt": "{ISO timestamp}"
    }
  ]
}
```

### Step 9: Display Completion Summary

Show the user what was learned and next steps.

#### 9a. Completion Summary Format

Display a clear summary when research completes:

```
## Research Complete: {topic}

**Mode:** {full/quick}
**Sources:** {N} sources consulted
**Confidence:** {high/medium/low}

### Key Recommendations

1. {Primary recommendation from synthesis}
2. {Second recommendation}
3. {Third recommendation}

### Key Findings

- **Ecosystem:** {One-line ecosystem summary}
- **Patterns:** {One-line patterns summary}
- **Pitfalls:** {One-line pitfalls summary}

### Output Location
.tiki/research/{topic}/research.md

### Next Steps

- Review the full research: `cat .tiki/research/{topic}/research.md`
- Plan an issue using this research: `/tiki:plan-issue {N}`
- Research a related topic: `/tiki:research {related-topic}`
```

#### 9b. Generate Key Recommendations

Extract the top 3 recommendations from the synthesized data:

```javascript
function extractKeyRecommendations(dimensions) {
  const recommendations = [];

  // Get primary recommendation
  if (dimensions.recommendations.findings.length > 0) {
    const primary = dimensions.recommendations.findings[0];
    recommendations.push({
      rank: 1,
      text: primary.text,
      confidence: primary.confidence,
      source: 'recommendations'
    });
  }

  // Get top pattern recommendation
  if (dimensions.architecture.findings.length > 0) {
    const pattern = dimensions.architecture.findings
      .find(f => f.type === 'recommendation');
    if (pattern) {
      recommendations.push({
        rank: 2,
        text: pattern.text,
        confidence: pattern.confidence,
        source: 'architecture'
      });
    }
  }

  // Get top pitfall to avoid (phrased as recommendation)
  if (dimensions.pitfalls.findings.length > 0) {
    const pitfall = dimensions.pitfalls.findings[0];
    recommendations.push({
      rank: 3,
      text: `Avoid: ${pitfall.text}`,
      confidence: pitfall.confidence,
      source: 'pitfalls'
    });
  }

  return recommendations.slice(0, 3);
}
```

#### 9c. Display Progress Summary

Show research statistics:

```
### Research Statistics

| Metric | Value |
|--------|-------|
| Duration | {X}m {Y}s |
| Agents | {N} completed, {N} failed |
| Findings | {N} total |
| Sources | {N} unique |
| Confidence | {high/medium/low} |

### Confidence Breakdown

- High confidence: {N} findings ({%})
- Medium confidence: {N} findings ({%})
- Low confidence: {N} findings ({%})
```

#### 9d. Suggest Related Research

Based on the topic, suggest related areas:

```javascript
function suggestRelatedTopics(topic, findings) {
  const related = [];

  // Extract technology mentions from findings
  const mentions = extractTechnologyMentions(findings);

  // Filter to related but not researched topics
  mentions.forEach(tech => {
    if (tech !== topic && !isResearched(tech)) {
      related.push(tech);
    }
  });

  return related.slice(0, 3);
}
```

Display suggested topics:

```
### Related Topics

These related topics were mentioned in the research:

1. **{related-topic-1}** - Mentioned {N} times
2. **{related-topic-2}** - Mentioned {N} times
3. **{related-topic-3}** - Mentioned {N} times

Research a related topic: `/tiki:research {related-topic}`
```

#### 9e. Update Research Index

Maintain an index of all research at `.tiki/research/index.json`:

```json
{
  "lastUpdated": "{ISO timestamp}",
  "topics": [
    {
      "topic": "react-query",
      "researchedAt": "{ISO timestamp}",
      "expiresAt": "{ISO timestamp}",
      "mode": "full",
      "confidence": "high",
      "sourcesCount": 31,
      "path": ".tiki/research/react-query/research.md"
    },
    {
      "topic": "auth-patterns-nextjs",
      "researchedAt": "{ISO timestamp}",
      "expiresAt": "{ISO timestamp}",
      "mode": "quick",
      "confidence": "medium",
      "sourcesCount": 12,
      "path": ".tiki/research/auth-patterns-nextjs/research.md"
    }
  ]
}
```

#### 9f. Final Completion Message

After all steps complete:

```
---

Research session complete!

Your research is ready at:
  .tiki/research/{topic}/research.md

Quick commands:
  View research:    cat .tiki/research/{topic}/research.md
  Plan with research: /tiki:plan-issue {N}
  New research:     /tiki:research {another-topic}

---
```

---

## Notes

- Research is cached for 7 days by default
- Use `--refresh` to force new research
- Use `--quick` for faster but shallower research
- Research from issues extracts topics from title, body, and labels
- All research is stored in `.tiki/research/{topic}/`
- Previous research is archived, not deleted
- Full mode spawns 5 parallel agents for comprehensive research
- Quick mode spawns 3 parallel agents for faster results
- Agent failures are handled gracefully with retry/skip options
- All sources include confidence levels for reliability assessment
