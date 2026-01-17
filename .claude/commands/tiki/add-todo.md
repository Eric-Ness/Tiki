---
type: prompt
name: tiki:add-todo
description: Add a todo item to the backlog for later tracking. Quick capture of tasks without creating a full GitHub issue.
allowed-tools: Read, Write, Bash
argument-hint: ["description"] [--priority high|medium|low]
---

# Add Todo

Add a quick todo item to your backlog. Use this for capturing tasks that don't yet warrant a full GitHub issue, or as a staging area before creating issues.

## Usage

```
/tiki:add-todo
/tiki:add-todo "Fix the login bug later"
/tiki:add-todo "Refactor auth module" --priority high
/tiki:add-todo "Update README" --priority low
```

## Instructions

### Step 1: Parse Input

Check what the user provided:

- **No input provided:** Prompt the user to provide a description for the todo item
- **Description provided:** Extract the description text (in quotes)
- **Priority flag provided:** Parse the `--priority` flag value (high, medium, or low)

If no priority is specified, default to medium priority.

**Priority parsing:**
```
--priority high   -> high
--priority medium -> medium
--priority low    -> low
(no flag)         -> medium (default)
```

### Step 2: Read Existing Todos

Read the todos file from `.tiki/todos.json`:

```bash
cat .tiki/todos.json 2>/dev/null || echo '{"todos": []}'
```

If the file does not exist, create it with an empty todos array:

```json
{
  "todos": []
}
```

### Step 3: Generate Todo ID

Generate an auto-incrementing ID in the format `todo-NNN`:

- Read existing todos to find the highest ID number
- Increment by 1 for the new todo
- If no todos exist, start with `todo-001`

Example IDs: `todo-001`, `todo-002`, `todo-003`

### Step 4: Create Todo Object

Create the new todo object with this structure:

```json
{
  "id": "todo-001",
  "description": "Fix the login bug later",
  "status": "pending",
  "priority": "medium",
  "createdAt": "2026-01-17T10:30:00Z",
  "completedAt": null,
  "convertedToIssue": null
}
```

**Fields:**
- `id`: Auto-incrementing ID (todo-001, todo-002, etc.)
- `description`: The task description provided by the user
- `status`: Always starts as "pending"
- `priority`: "high", "medium", or "low" (defaults to "medium" if not specified)
- `createdAt`: ISO 8601 timestamp of when the todo was created
- `completedAt`: null (set when todo is completed)
- `convertedToIssue`: null (set when todo is converted to a GitHub issue)

### Step 5: Save Updated Todos

Add the new todo to the todos array and write back to `.tiki/todos.json`:

```javascript
const fs = require('fs');

// Read existing or initialize
let data;
try {
  data = JSON.parse(fs.readFileSync('.tiki/todos.json', 'utf8'));
} catch {
  data = { todos: [] };
}

// Generate next ID
const maxId = data.todos.reduce((max, t) => {
  const num = parseInt(t.id.replace('todo-', ''), 10);
  return num > max ? num : max;
}, 0);
const nextId = `todo-${String(maxId + 1).padStart(3, '0')}`;

// Create new todo
const newTodo = {
  id: nextId,
  description: userDescription,
  status: "pending",
  priority: userPriority || "medium",
  createdAt: new Date().toISOString(),
  completedAt: null,
  convertedToIssue: null
};

// Add and save
data.todos.push(newTodo);
fs.writeFileSync('.tiki/todos.json', JSON.stringify(data, null, 2));
```

### Step 6: Confirm Creation

Display a confirmation message that shows:
- The todo ID that was created
- Show the description that was added
- The priority level

```
Added todo-001: "Fix the login bug later"
Priority: medium

Next steps:
- View todos: /tiki:list-todos
- Add another: /tiki:add-todo "description"
```

## Examples

### Example 1: Simple Todo

```
User: /tiki:add-todo "Review PR #42"

Claude: Added todo-001: "Review PR #42"
Priority: medium

Next steps:
- View todos: /tiki:list-todos
- Add another: /tiki:add-todo "description"
```

### Example 2: High Priority Todo

```
User: /tiki:add-todo "Fix production bug in auth" --priority high

Claude: Added todo-002: "Fix production bug in auth"
Priority: high

Next steps:
- View todos: /tiki:list-todos
- Add another: /tiki:add-todo "description"
```

### Example 3: No Argument Provided

```
User: /tiki:add-todo

Claude: What would you like to add to your todo list? Please provide a description.

User: Clean up deprecated API endpoints

Claude: Added todo-003: "Clean up deprecated API endpoints"
Priority: medium

Next steps:
- View todos: /tiki:list-todos
- Add another: /tiki:add-todo "description"
```

### Example 4: Low Priority Todo

```
User: /tiki:add-todo "Update documentation" --priority low

Claude: Added todo-004: "Update documentation"
Priority: low

Next steps:
- View todos: /tiki:list-todos
- Add another: /tiki:add-todo "description"
```

## Error Handling

- **Empty description:** Prompt the user to provide a description
- **Invalid priority:** Default to medium and continue (or warn user)
- **File write error:** Report error and suggest checking `.tiki/` directory permissions

## Notes

- Todos are stored locally in `.tiki/todos.json` - they are not synced to GitHub
- Use `/tiki:list-todos` to view all todos
- Todos can later be converted to GitHub issues with `/tiki:convert-todo`
- The `.tiki/todos.json` file is created automatically if it does not exist
