# Custom Commands

This directory is for project-specific custom command files. However, there are important notes about how Claude Code resolves custom commands.

## Command Resolution

Claude Code custom commands follow this resolution order:

### 1. Core Tiki Commands (`.claude/commands/tiki/`)

The primary Tiki workflow commands live here. These are the `/tiki:*` commands like:
- `/tiki:execute`
- `/tiki:plan-issue`
- `/tiki:ship`

### 2. Project-Specific Commands (`.claude/commands/project/`)

For automatic resolution of project-specific commands, place them in `.claude/commands/project/`. Commands here are available as `/project:command-name`.

Example:
```
.claude/commands/project/deploy.md  ->  /project:deploy
```

### 3. This Directory (`.tiki/commands/`)

Commands in this directory are NOT auto-resolved by Claude Code. This directory exists for:

- **Documentation**: Storing command templates or examples
- **Sharing**: Commands that can be copied to `.claude/commands/`
- **Reference**: Project-specific command ideas

To use a command from this directory, either:
1. Copy it to `.claude/commands/project/` for auto-resolution
2. Reference it by full file path when needed

## Configuration

Custom commands can be enabled/disabled in `.tiki/config.json`:

```json
{
  "extensions": {
    "customCommands": {
      "enabled": true,
      "directory": ".tiki/commands"
    }
  }
}
```

Note: Even when configured, the directory path here is informational. For Claude Code to automatically discover commands, they must be in `.claude/commands/`.

## Creating Custom Commands

Custom commands are markdown files with YAML frontmatter:

```markdown
---
type: prompt
name: project:my-command
description: What this command does
allowed-tools: Read, Bash, Write
argument-hint: [optional-args]
---

# My Command

Instructions for Claude...
```

See existing commands in `.claude/commands/tiki/` for examples.
