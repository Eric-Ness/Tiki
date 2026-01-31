---
type: prompt
name: bump-version
description: Manually bump version.json with optional changelog entry
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
argument-hint: "[major|minor|patch] [changelog entry]"
---

# Bump Version

Manually update version.json with version bump and optional changelog entry.

**Usage:**
- `/bump-version` - Interactive mode, asks for bump type
- `/bump-version patch` - Bump patch version (1.2.3 -> 1.2.4)
- `/bump-version minor` - Bump minor version (1.2.3 -> 1.3.0)
- `/bump-version major` - Bump major version (1.2.3 -> 2.0.0)
- `/bump-version 1.15.0` - Set specific version
- `/bump-version patch "Added feature X"` - Bump with changelog entry

## Instructions

### Step 1: Parse Arguments

Parse argument: `$ARGUMENTS`

Extract:
- **bumpType**: "major", "minor", "patch", or specific version (e.g., "1.15.0")
- **changelogEntry**: Optional text after bump type

If no arguments, use AskUserQuestion to ask for bump type.

### Step 2: Read Current Version

```bash
cat version.json
```

Extract current version string.

### Step 3: Calculate New Version

Based on bumpType:
- **patch**: Increment third number (1.2.3 -> 1.2.4)
- **minor**: Increment second number, reset patch (1.2.3 -> 1.3.0)
- **major**: Increment first number, reset others (1.2.3 -> 2.0.0)
- **specific**: Use the provided version directly

### Step 4: Update version.json

Update using Node.js:

```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('version.json', 'utf8'));
const newVersion = '${NEW_VERSION}';
const today = new Date().toISOString().split('T')[0];

data.version = newVersion;
data.releaseDate = today;

// Add changelog entry if provided
const changelogEntry = '${CHANGELOG_ENTRY}';
if (changelogEntry) {
  const existingEntry = data.changelog.find(e => e.version === newVersion);
  if (!existingEntry) {
    data.changelog.unshift({
      version: newVersion,
      date: today,
      changes: [changelogEntry]
    });
  } else {
    existingEntry.changes.push(changelogEntry);
  }
}

fs.writeFileSync('version.json', JSON.stringify(data, null, 2) + '\n');
console.log('Updated to version ' + newVersion);
"
```

### Step 5: Update README.md

```bash
sed -i "s/\*\*Version:\*\* [0-9]*\.[0-9]*\.[0-9]*/\*\*Version:\*\* ${NEW_VERSION}/" README.md
```

### Step 6: Show Summary

Display:
- Previous version
- New version
- Changelog entry (if added)
- Files modified

Remind user to commit and push:
```
git add version.json README.md
git commit -m "chore: Bump version to ${NEW_VERSION}"
git push
```
