---
type: prompt
name: tiki:list-todos
description: View and manage todo items in the backlog. Supports filtering by status and actions like complete, convert to issue, and delete.
allowed-tools: Read, Write, Bash, Glob
argument-hint: [--pending] [--completed] [--all] [--complete <id>] [--convert <id>] [--delete <id>] [--force]
---

# List Todos

View all todos in your backlog with filtering and action support.

## Usage

```
/tiki:list-todos
/tiki:list-todos --pending              # Only show pending todos
/tiki:list-todos --completed            # Only show completed todos
/tiki:list-todos --all                  # Show everything (default)
/tiki:list-todos --complete <id>        # Mark todo as complete
/tiki:list-todos --convert <id>         # Convert todo to GitHub issue
/tiki:list-todos --delete <id>          # Remove todo from list
/tiki:list-todos --delete <id> --force  # Delete without confirmation
```

## Instructions

### Step 1: Parse Arguments

Parse the arguments to determine the action mode:

**Filter Flags:**
- `--pending` - Only show pending todos
- `--completed` - Only show completed todos
- `--all` - Show all todos (default if no filter specified)

**Action Flags:**

- `--complete <id>` - Mark a specific todo as complete (e.g., `--complete todo-001` or `--complete 1`)
- `--convert <id>` - Convert a todo to a GitHub issue
- `--delete <id>` - Remove a todo from the list
- `--force` - Skip confirmation prompts (use with `--delete`)

**ID Format Support:**

Both full ID format (`todo-001`) and numeric shorthand (`1`) are supported:

- `--complete todo-001` and `--complete 1` are equivalent
- The numeric format is converted internally by padding to 3 digits: `1` becomes `todo-001`

If an action flag is provided, execute the action first, then display the updated list.

### Step 2: Read Todos File

Read the todos file from `.tiki/todos.json`:

```bash
cat .tiki/todos.json 2>/dev/null || echo '{"todos": []}'
```

If the file does not exist or is empty, handle gracefully with empty state message.

**Expected file structure:**
```json
{
  "todos": [
    {
      "id": "todo-001",
      "description": "Fix the login bug later",
      "status": "pending",
      "priority": "medium",
      "createdAt": "2026-01-17T10:30:00Z",
      "completedAt": null,
      "convertedToIssue": null
    }
  ]
}
```

### Step 3: Execute Action (if requested)

#### Action: --complete <id>

Mark a todo as complete.

**Step-by-step implementation:**

1. **Normalize the ID format:**

   ```javascript
   // Support both 'todo-001' and '1' formats
   function normalizeId(input) {
     if (/^\d+$/.test(input)) {
       // Numeric input: pad to 3 digits
       return `todo-${input.padStart(3, '0')}`;
     }
     return input; // Already in full format
   }
   const targetId = normalizeId(providedId);
   ```

2. **Find the todo by ID:**

   ```javascript
   const todo = data.todos.find(t => t.id === targetId);
   if (!todo) {
     // ID not found - display error with available IDs
     throw new Error(`Todo ${targetId} not found`);
   }
   ```

3. **Check if already completed:**

   ```javascript
   if (todo.status === 'completed') {
     console.log(`Note: [${todo.id}] was already completed on ${todo.completedAt}`);
     return; // Nothing to do
   }
   ```

4. **Update status and timestamp:**

   ```javascript
   todo.status = "completed";
   todo.completedAt = new Date().toISOString();
   ```

5. **Write updated todos.json:**

   ```javascript
   fs.writeFileSync('.tiki/todos.json', JSON.stringify(data, null, 2));
   ```

6. **Display confirmation:**

   ```text
   Completed: [todo-001] "Fix the login bug later"
   ```

**Full implementation example:**

```javascript
function completeTodo(data, providedId) {
  const targetId = normalizeId(providedId);
  const todo = data.todos.find(t => t.id === targetId);

  if (!todo) {
    console.error(`Error: Todo [${targetId}] not found.`);
    listAvailableTodos(data);
    return false;
  }

  if (todo.status === 'completed') {
    console.log(`Note: [${todo.id}] "${todo.description}" was already completed.`);
    return true;
  }

  todo.status = "completed";
  todo.completedAt = new Date().toISOString();
  fs.writeFileSync('.tiki/todos.json', JSON.stringify(data, null, 2));

  console.log(`Completed: [${todo.id}] "${todo.description}"`);
  return true;
}
```

#### Action: --convert <id>

Convert a todo to a GitHub issue.

**Step-by-step implementation:**

1. **Normalize the ID format** (same as --complete):

   ```javascript
   const targetId = normalizeId(providedId);
   ```

2. **Find the todo by ID:**

   ```javascript
   const todo = data.todos.find(t => t.id === targetId);
   if (!todo) {
     console.error(`Error: Todo [${targetId}] not found.`);
     listAvailableTodos(data);
     return false;
   }
   ```

3. **Check if already converted:**

   ```javascript
   if (todo.convertedToIssue) {
     console.log(`Note: [${todo.id}] was already converted to Issue #${todo.convertedToIssue.number}`);
     console.log(`  URL: ${todo.convertedToIssue.url}`);
     return true;
   }
   ```

4. **Build the issue body with context:**

   ```javascript
   const issueBody = `${todo.description}

   ---

   Converted from Tiki todo item

   - Original ID: ${todo.id}
   - Priority: ${todo.priority || 'medium'}
   - Created: ${todo.createdAt}

   ---
   Converted via /tiki:list-todos --convert`;
   ```

5. **Create the GitHub issue using `gh` CLI:**

   ```bash
   gh issue create --title "Fix the login bug later" --body "$(cat <<'EOF'
   Description of the todo...

   ---

   Converted from Tiki todo item

   - Original ID: todo-001
   - Priority: medium
   - Created: 2026-01-17T10:30:00Z

   ---
   Converted via /tiki:list-todos --convert
   EOF
   )"
   ```

   The `gh issue create` command returns output like:

   ```text
   https://github.com/owner/repo/issues/42
   ```

6. **Parse the issue number and URL from the output:**

   ```javascript
   // Parse the URL returned by gh issue create
   const issueUrl = output.trim();
   const issueNumber = parseInt(issueUrl.split('/').pop(), 10);
   ```

7. **Update the todo with conversion details:**

   ```javascript
   todo.convertedToIssue = {
     number: issueNumber,
     url: issueUrl,
     convertedAt: new Date().toISOString()
   };
   todo.status = "completed";
   todo.completedAt = new Date().toISOString();
   ```

8. **Write updated todos.json:**

   ```javascript
   fs.writeFileSync('.tiki/todos.json', JSON.stringify(data, null, 2));
   ```

9. **Display confirmation with issue link:**

   ```text
   Creating GitHub issue...

   Converted: [todo-001] "Fix the login bug later" -> Issue #42
   URL: https://github.com/owner/repo/issues/42
   ```

**Full implementation example:**

```javascript
async function convertTodo(data, providedId) {
  const targetId = normalizeId(providedId);
  const todo = data.todos.find(t => t.id === targetId);

  if (!todo) {
    console.error(`Error: Todo [${targetId}] not found.`);
    listAvailableTodos(data);
    return false;
  }

  if (todo.convertedToIssue) {
    console.log(`Note: [${todo.id}] was already converted to Issue #${todo.convertedToIssue.number}`);
    console.log(`  URL: ${todo.convertedToIssue.url}`);
    return true;
  }

  console.log('Creating GitHub issue...');

  // Build issue body
  const issueBody = buildIssueBody(todo);

  // Execute gh issue create
  const result = execSync(`gh issue create --title "${todo.description}" --body "${issueBody}"`, {
    encoding: 'utf-8'
  });

  // Parse result
  const issueUrl = result.trim();
  const issueNumber = parseInt(issueUrl.split('/').pop(), 10);

  // Update todo
  todo.convertedToIssue = {
    number: issueNumber,
    url: issueUrl,
    convertedAt: new Date().toISOString()
  };
  todo.status = "completed";
  todo.completedAt = new Date().toISOString();

  fs.writeFileSync('.tiki/todos.json', JSON.stringify(data, null, 2));

  console.log(`Converted: [${todo.id}] "${todo.description}" -> Issue #${issueNumber}`);
  console.log(`URL: ${issueUrl}`);
  return true;
}
```

**Error handling for gh CLI:**

If the `gh` command is not available or fails, display a helpful error:

```text
Error: Failed to create GitHub issue.

Possible causes:
- GitHub CLI (gh) is not installed. Install from: https://cli.github.com/
- Not authenticated. Run: gh auth login
- Not in a git repository with a GitHub remote

The todo has NOT been modified.
```

#### Action: --delete <id>

Remove a todo from the list permanently.

**Step-by-step implementation:**

1. **Normalize the ID format** (same as --complete):

   ```javascript
   const targetId = normalizeId(providedId);
   ```

2. **Find the todo by ID:**

   ```javascript
   const todoIndex = data.todos.findIndex(t => t.id === targetId);
   if (todoIndex === -1) {
     console.error(`Error: Todo [${targetId}] not found.`);
     listAvailableTodos(data);
     return false;
   }
   const todo = data.todos[todoIndex];
   ```

3. **Check for --force flag to skip confirmation:**

   ```javascript
   const forceDelete = args.includes('--force');
   ```

4. **Prompt for confirmation (unless --force is provided):**

   If `--force` is NOT provided, ask the user for confirmation before deleting:

   ```text
   Are you sure you want to delete [todo-001] "Fix the login bug later"?
   This action cannot be undone.

   Reply with "yes" to confirm, or anything else to cancel.
   ```

   If the user does not confirm, cancel the operation:

   ```text
   Cancelled: Todo [todo-001] was NOT deleted.
   ```

5. **Remove the todo from the array:**

   ```javascript
   const removed = data.todos.splice(todoIndex, 1)[0];
   ```

6. **Write updated todos.json:**

   ```javascript
   fs.writeFileSync('.tiki/todos.json', JSON.stringify(data, null, 2));
   ```

7. **Display confirmation:**

   ```text
   Deleted: [todo-001] "Fix the login bug later"
   ```

**Full implementation example:**

```javascript
function deleteTodo(data, providedId, forceDelete) {
  const targetId = normalizeId(providedId);
  const todoIndex = data.todos.findIndex(t => t.id === targetId);

  if (todoIndex === -1) {
    console.error(`Error: Todo [${targetId}] not found.`);
    listAvailableTodos(data);
    return false;
  }

  const todo = data.todos[todoIndex];

  // If not force delete, confirm with user
  if (!forceDelete) {
    console.log(`Are you sure you want to delete [${todo.id}] "${todo.description}"?`);
    console.log('This action cannot be undone.');
    console.log('');
    console.log('Reply with "yes" to confirm, or anything else to cancel.');
    // Wait for user confirmation...
    // If not confirmed:
    // console.log(`Cancelled: Todo [${todo.id}] was NOT deleted.`);
    // return false;
  }

  // Remove the todo
  const removed = data.todos.splice(todoIndex, 1)[0];
  fs.writeFileSync('.tiki/todos.json', JSON.stringify(data, null, 2));

  console.log(`Deleted: [${removed.id}] "${removed.description}"`);
  return true;
}
```

**Using --force to skip confirmation:**

```text
User: /tiki:list-todos --delete todo-001 --force

Claude:
Deleted: [todo-001] "Fix the login bug later"
```

### Step 4: Apply Filters

Filter the todos based on the flag provided:

```javascript
let filteredTodos = data.todos;

if (args.includes('--pending')) {
  filteredTodos = data.todos.filter(t => t.status === 'pending');
} else if (args.includes('--completed')) {
  filteredTodos = data.todos.filter(t => t.status === 'completed');
}
// --all or no filter: show all todos
```

### Step 5: Handle Empty State

If no todos exist (or none match the filter), display a helpful message:

```
## Todos

No todos found.

Get started by adding your first todo:
  /tiki:add-todo "Your task description"
```

### Step 6: Display Todos

Format and display the todos grouped by status:

```
## Todos

### Pending (2)
1. [todo-001] Fix the login bug later (medium priority)
2. [todo-003] Research caching options (low priority)

### Completed (1)
3. [todo-002] Update README (completed 2h ago)

---

**Summary:** 3 total | 2 pending | 1 completed

**Actions:**
- Complete a todo: `/tiki:list-todos --complete <id>`
- Convert to issue: `/tiki:list-todos --convert <id>`
- Delete a todo: `/tiki:list-todos --delete <id>`
```

**Display format for each todo:**

For pending todos:
```
N. [todo-NNN] Description (priority priority)
```

For completed todos:
```
N. [todo-NNN] Description (completed Xh ago)
```

**Time formatting:**
- Less than 1 hour ago: "Xm ago"
- Less than 24 hours ago: "Xh ago"
- Less than 7 days ago: "Xd ago"
- Older: Show date (e.g., "Jan 10")

### Step 7: Show Summary Counts

Display summary counts at the bottom:

```javascript
const pending = data.todos.filter(t => t.status === 'pending').length;
const completed = data.todos.filter(t => t.status === 'completed').length;
const total = data.todos.length;

console.log(`**Summary:** ${total} total | ${pending} pending | ${completed} completed`);
```

## Examples

### Example 1: List All Todos (Default)

```
User: /tiki:list-todos

Claude:
## Todos

### Pending (2)
1. [todo-001] Fix the login bug later (medium priority)
2. [todo-003] Research caching options (low priority)

### Completed (1)
3. [todo-002] Update README (completed 2h ago)

---

**Summary:** 3 total | 2 pending | 1 completed

**Actions:**
- Complete a todo: `/tiki:list-todos --complete <id>`
- Convert to issue: `/tiki:list-todos --convert <id>`
- Delete a todo: `/tiki:list-todos --delete <id>`
```

### Example 2: Filter Pending Only

```
User: /tiki:list-todos --pending

Claude:
## Todos

### Pending (2)
1. [todo-001] Fix the login bug later (medium priority)
2. [todo-003] Research caching options (low priority)

---

**Summary:** 2 pending todos shown

**Actions:**
- Complete a todo: `/tiki:list-todos --complete <id>`
- Convert to issue: `/tiki:list-todos --convert <id>`
```

### Example 3: Filter Completed Only

```
User: /tiki:list-todos --completed

Claude:
## Todos

### Completed (1)
1. [todo-002] Update README (completed 2h ago)

---

**Summary:** 1 completed todo shown
```

### Example 4: Complete a Todo

```
User: /tiki:list-todos --complete todo-001

Claude:
Completed: [todo-001] "Fix the login bug later"

## Todos

### Pending (1)
1. [todo-003] Research caching options (low priority)

### Completed (2)
2. [todo-001] Fix the login bug later (completed just now)
3. [todo-002] Update README (completed 2h ago)

---

**Summary:** 3 total | 1 pending | 2 completed
```

### Example 5: Convert to GitHub Issue

```
User: /tiki:list-todos --convert todo-003

Claude:
Creating GitHub issue...

Converted: [todo-003] "Research caching options" -> Issue #45

## Todos

### Pending (0)
No pending todos.

### Completed (3)
1. [todo-001] Fix the login bug later (completed 5m ago)
2. [todo-002] Update README (completed 2h ago)
3. [todo-003] Research caching options (converted to Issue #45)

---

**Summary:** 3 total | 0 pending | 3 completed
```

### Example 6: Delete a Todo

```
User: /tiki:list-todos --delete todo-002

Claude:
Deleted: [todo-002] "Update README"

## Todos

### Pending (1)
1. [todo-003] Research caching options (low priority)

### Completed (1)
2. [todo-001] Fix the login bug later (completed 5m ago)

---

**Summary:** 2 total | 1 pending | 1 completed
```

### Example 7: Empty State

```
User: /tiki:list-todos

Claude:
## Todos

No todos found.

Get started by adding your first todo:
  /tiki:add-todo "Your task description"
```

## Error Handling

### ID Not Found

If the specified ID does not exist, display a helpful error with available IDs:

```text
Error: Todo [todo-999] not found.

Available todos:
- todo-001: Fix the login bug later (pending)
- todo-002: Update README (completed)
- todo-003: Research caching options (pending)

Tip: You can use either the full ID (todo-001) or just the number (1).
```

**Implementation for listing available todos:**

```javascript
function listAvailableTodos(data) {
  if (data.todos.length === 0) {
    console.log('No todos exist. Create one with /tiki:add-todo');
    return;
  }

  console.log('Available todos:');
  data.todos.forEach(todo => {
    console.log(`- ${todo.id}: ${todo.description} (${todo.status})`);
  });
  console.log('');
  console.log('Tip: You can use either the full ID (todo-001) or just the number (1).');
}
```

### File Read Error

If `.tiki/todos.json` cannot be read or is corrupted:

```text
Error: Could not read todos file.

Possible causes:
- .tiki/todos.json does not exist
- File permissions issue
- Corrupted JSON

Try running /tiki:add-todo to create the first todo, which will initialize the file.
```

### gh CLI Not Available

If the `gh` command fails during --convert (see Action: --convert section for details):

```text
Error: Failed to create GitHub issue.

Possible causes:
- GitHub CLI (gh) is not installed. Install from: https://cli.github.com/
- Not authenticated. Run: gh auth login
- Not in a git repository with a GitHub remote

The todo has NOT been modified.
```

### Invalid ID Format

If the ID format is unrecognized:

```text
Error: Invalid ID format "abc123".

Expected formats:
- Full ID: todo-001, todo-042, todo-123
- Numeric shorthand: 1, 42, 123
```

## Notes

- Todos are stored locally in `.tiki/todos.json` - they are not synced to GitHub
- Use `/tiki:add-todo` to add new todos
- Converting a todo to an issue creates a GitHub issue and marks the todo as completed
- Deleting a todo permanently removes it from the list
- The `--all` flag is the default behavior when no filter is specified
