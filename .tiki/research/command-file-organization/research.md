---
topic: command-file-organization
researched_at: 2026-01-18T12:00:00Z
expires_at: 2026-01-25T12:00:00Z
mode: full
sources_count: 38
agents_used: 5
status: complete
overall_confidence: high
---

# Research: Command File Organization

> Researched on 2026-01-18 | Mode: full | Confidence: high

## Executive Summary

Large Claude Code command files cannot be split into multiple files due to architectural constraints—each slash command must be a single `.md` file with no import/include mechanism. However, this research identifies effective strategies for managing necessarily monolithic files:

1. **Internal organization patterns** using tables of contents, collapsible sections, and consistent section headers can significantly improve navigation in files over 1000 lines
2. **Bash helper extraction** to `.tiki/helpers/` is viable for reducing code duplication, using the `BASH_SOURCE` pattern for reliable sourcing
3. **Size thresholds** suggest keeping command files under 300-500 lines for AI instruction quality, but files up to 2000 lines are manageable with good organization
4. **Skills offer an alternative** for complex workflows—they support directory structures with supporting files and progressive disclosure

The key finding is that file size alone isn't the problem; internal organization quality and cognitive load management matter more.

## Ecosystem Analysis

### Claude Code Command Architecture

Claude Code custom commands are standalone markdown files with no native include/import mechanism:

| Feature | Supported | Notes |
|---------|-----------|-------|
| Single-file commands | ✅ Yes | Each `/command` = one `.md` file |
| Include directives | ❌ No | No way to import shared content |
| Subdirectory namespacing | ✅ Limited | Organizational only, doesn't affect command name |
| File references (`@prefix`) | ✅ Yes | Include file contents in prompt |
| Bash output (`!prefix`) | ✅ Yes | Embed command output |
| Skills with supporting files | ✅ Yes | Alternative to commands |

### When to Use Commands vs Skills

| Use Commands When | Use Skills When |
|-------------------|-----------------|
| Explicit terminal entry point needed | Auto-apply based on context |
| Simple, single-file workflow | Rich workflow with supporting files |
| Predictable, manual trigger | Progressive disclosure needed |
| Great `/...` autocomplete needed | Domain expertise with on-demand context |

### Size Thresholds

| Metric | Threshold | Source |
|--------|-----------|--------|
| AI instruction files | 60-100 lines ideal, 300 max | HumanLayer, Anthropic |
| General documentation | 300-500 lines default | ESLint, industry standards |
| Maximum manageable | 1000-2000 lines | Rule of 30, Code Complete |
| Context window usage | 70-80% maximum | Research on LLM performance |

## Architecture Patterns

### Pattern 1: Internal Section Organization

For files that must remain monolithic, use clear section markers:

```markdown
# Command Name

## Table of Contents
- [Usage](#usage)
- [Section A](#section-a)
- [Section B](#section-b)

## Usage
...

## Section A

### Subsection A.1
...

[Back to top](#command-name)
```

**Best practices:**
- Limit heading depth to 3 levels (H1, H2, H3)
- Place TOC immediately after title
- Add "Back to top" links at section ends
- Use ATX-style (`#`) consistently

### Pattern 2: Collapsible Sections

Use HTML `<details>` for supplementary content:

```html
<details>
<summary>Click to expand detailed explanation</summary>

### Detailed Content

Extended content goes here with full markdown support.

```javascript
// Even code blocks work inside
const example = "hello";
```

</details>
```

**Tips:**
- Add blank line after `</summary>` for markdown rendering
- Use `<details open>` for default-expanded sections
- Nest `<details>` for multi-level expansion

### Pattern 3: Progressive Disclosure

For files exceeding 500 lines:

```markdown
# Main Document

## Quick Reference
[Essential information - under 100 lines]

## Detailed Sections

### Topic A
Brief overview...

<details>
<summary>Full details for Topic A</summary>
Extended content...
</details>
```

### Pattern 4: Bash Helper Extraction

Extract shared bash logic to helper files:

```
.tiki/
  helpers/
    bootstrap.sh      # Core setup, sourced first
    log.sh            # Logging utilities
    file.sh           # File operations
    validation.sh     # Common validation
```

**Sourcing pattern:**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/helpers/bootstrap.sh"
source "${SCRIPT_DIR}/helpers/log.sh"
```

## Implementation Best Practices

### Markdown Organization

1. **Use F-Pattern reading awareness**
   - Place critical information at the beginning of sections
   - Front-load important terms in headings

2. **Keep paragraphs scannable**
   - 3-7 lines per paragraph
   - Use lists liberally for related items
   - Tables for structured comparisons

3. **Code examples organization**
   - Fenced blocks with language identifiers
   - Precede code with context
   - Use collapsible sections for lengthy examples

### Bash Helper Best Practices

1. **Naming conventions**
   - Use snake_case for function names
   - Prefix functions by category: `log_info`, `log_error`, `file_exists`

2. **Function structure**
   ```bash
   #######################################
   # Brief description of function.
   # Globals:
   #   VAR_NAME - Description
   # Arguments:
   #   $1 - First argument description
   # Outputs:
   #   Writes to stdout/stderr
   # Returns:
   #   0 on success, non-zero on error
   #######################################
   function_name() {
     local arg1="$1"
     # implementation
   }
   ```

3. **Defensive programming**
   ```bash
   set -o errexit   # Exit on command failure
   set -o nounset   # Exit on unbound variable
   set -o pipefail  # Pipeline fails if any command fails
   ```

4. **Prevent double-sourcing**
   ```bash
   [[ -n "${_MODULE_LOADED:-}" ]] && return
   readonly _MODULE_LOADED=1
   ```

### IDE Navigation

Essential shortcuts for large file management:
- **VS Code Go to Symbol**: `Ctrl+Shift+O` (group by `:`)
- **VS Code Breadcrumbs**: `Ctrl+Shift+.` to focus
- **VS Code Outline**: Explorer sidebar
- **Code Folding**: Collapse sections not being edited

## Common Pitfalls

### Mistakes to Avoid

1. **Splitting when you can't** [Confidence: High]
   - Claude Code commands cannot be split into multiple files
   - The only sharing mechanism is file references (`@prefix`)
   - **How to avoid**: Use Skills for complex multi-file workflows

2. **Ignoring cognitive load** [Confidence: High]
   - AI instruction following degrades as instruction count increases
   - Dense attention maps in the middle of prompts cause generic responses
   - **How to avoid**: Keep critical instructions at beginning and end; use progressive disclosure

3. **Over-engineering organization** [Confidence: Medium]
   - Complex nesting and excessive collapsible sections add overhead
   - **How to avoid**: Use the minimum structure needed; 3 heading levels max

4. **Inconsistent formatting** [Confidence: High]
   - Inconsistent patterns make navigation harder
   - **How to avoid**: Establish and follow formatting conventions throughout

5. **Missing TOC in large files** [Confidence: High]
   - Files over 300 lines without TOC are hard to navigate
   - **How to avoid**: Add TOC for any file over 200-300 lines

### Performance Considerations

- **Context window pressure**: Command content competes with conversation history
- **Attention limits**: LLMs bias toward edges of input; middle content gets less attention
- **Token economy**: Every word costs tokens and potentially dilutes attention

## Recommendations

### Primary Recommendation

**Keep command files monolithic but well-organized.** Given the architectural constraint that Claude Code commands must be single files, focus on internal organization quality rather than splitting:

1. **For files under 500 lines**: Use clear section headers and a TOC
2. **For files 500-1500 lines**: Add collapsible sections for detailed content
3. **For files over 1500 lines**: Consider if the command should become a Skill instead

### Specific Recommendations for Issue #38

Based on the current file sizes:

| File | Lines | Recommendation |
|------|-------|----------------|
| `release.md` | 6,325 | Consider converting to Skill; alternatively, add collapsible sections and verify subcommands are well-organized |
| `execute.md` | 2,690 | Add TOC; extract auto-fix strategies to collapsible sections; keep as command |
| `define-requirements.md` | 1,986 | Add TOC; use collapsible sections for examples |
| `research.md` | 1,854 | Already has good structure; verify TOC is present |
| `plan-issue.md` | 1,778 | Add TOC; use collapsible sections for detailed schemas |
| `debug.md` | 1,695 | Add TOC; hypothesis tracking could use collapsible detail |

### Alternative Approaches

1. **Convert largest commands to Skills**
   - Skills support directory structures with supporting files
   - Progressive disclosure loads content on-demand
   - Example: `release/` directory with `SKILL.md` and subcommand docs

2. **Extract bash helpers to `.tiki/helpers/`**
   - Create `log.sh`, `validation.sh`, `git.sh`
   - Source in command bash blocks
   - Reduces duplication across commands

3. **Use file references for shared content**
   - Store common patterns in `.tiki/shared/`
   - Reference with `@.tiki/shared/pattern-name.md`

### Next Steps

1. Review each large file for internal organization quality
2. Add TOCs to files missing them
3. Identify candidates for collapsible sections
4. Document decision for each file (well-organized vs needs restructuring)
5. Consider Skills conversion for `release.md` if internal organization isn't sufficient

## Sources

### High Confidence

| # | Source | Title | Relevance |
|---|--------|-------|-----------|
| 1 | [Claude Code Docs](https://code.claude.com/docs/en/slash-commands) | Slash commands | Command architecture |
| 2 | [Claude Skills Docs](https://code.claude.com/docs/en/skills) | Agent Skills | Skills alternative |
| 3 | [Anthropic Engineering](https://www.anthropic.com/engineering/claude-code-best-practices) | Best Practices | Official guidance |
| 4 | [Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html) | Shell Style Guide | Bash patterns |
| 5 | [Microsoft Style Guide](https://learn.microsoft.com/en-us/style-guide/scannable-content/) | Scannable content | F-pattern reading |
| 6 | [GitHub Docs](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections) | Collapsed sections | Collapsible patterns |
| 7 | [HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md) | Writing a good CLAUDE.md | AI instruction files |

### Medium-High Confidence

| # | Source | Title | Relevance |
|---|--------|-------|-----------|
| 8 | [Gruntwork bash-commons](https://github.com/gruntwork-io/bash-commons) | bash-commons | Production helper patterns |
| 9 | [ESLint max-lines](https://eslint.org/docs/latest/rules/max-lines) | max-lines Rule | Size thresholds |
| 10 | [Java Code Geeks](https://www.javacodegeeks.com/2012/12/rule-of-30-when-is-a-method-class-or-subsystem-too-big.html) | Rule of 30 | Size metrics |
| 11 | [Fluid Topics](https://www.fluidtopics.com/blog/industry-insights/technical-documentation-trends-2026/) | Documentation Trends 2026 | Modular architecture |
| 12 | [DEV Community](https://dev.to/superorange0707/prompt-length-vs-context-window-the-real-limits-behind-llm-performance-3h20) | Prompt Length vs Context Window | LLM performance |

### Medium Confidence

| # | Source | Title | Relevance |
|---|--------|-------|-----------|
| 13 | [Effective Shell](https://effective-shell.com/part-4-shell-scripting/useful-patterns-for-shell-scripts/) | Useful Patterns | Shell patterns |
| 14 | [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | Community Resources | Organization patterns |
| 15 | [Addy Osmani](https://addyosmani.com/blog/good-spec/) | Good Spec for AI Agents | Modular prompts |

## Research Log

- **Session:** command-file-organization
- **Started:** 2026-01-18T12:00:00Z
- **Completed:** 2026-01-18T12:30:00Z
- **Mode:** full
- **Agents:** 5 completed, 0 failed
  - Internal Organization Patterns
  - Bash Helper Extraction
  - Claude Code Architecture
  - Monolithic File Management
  - Documentation Modularity
- **Findings:** 38 total (18 high, 15 medium, 5 low confidence)
- **Sources:** 38 unique sources
