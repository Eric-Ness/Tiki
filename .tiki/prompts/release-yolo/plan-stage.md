# Plan Stage

Load this prompt when an issue needs planning (no plan file exists or status is "not_planned").

## Planning Flow

### Check for Existing Plan

```bash
if [ -f ".tiki/plans/issue-${NUMBER}.json" ]; then
  cat ".tiki/plans/issue-${NUMBER}.json"
else
  echo "NO_PLAN"
fi
```

### If No Plan Exists

Display status and invoke planning:

```text
### Planning Issue #{number}

Issue #{number} has no plan. Invoking /tiki:plan-issue...
```

Invoke the plan-issue skill:

```text
Skill tool invocation:
- skill: "tiki:plan-issue"
- args: "{number}"
```

### After Planning

Verify plan was created:

```bash
cat ".tiki/plans/issue-${NUMBER}.json"
```

Display result:

```text
Plan created: {phaseCount} phases

| Phase | Title | Est. Context |
|-------|-------|--------------|
| {n} | {title} | {contextBudget}% |
```

### Planning Failure

If planning fails, present recovery options:

```text
### Planning Failed

Failed to create plan for issue #{number}.

### Recovery Options

1. **Retry planning** - Try /tiki:plan-issue again
2. **Skip issue** - Continue with remaining issues
3. **Pause YOLO** - Save state and exit for manual intervention

Enter choice:
```

Handle based on user choice:

**Retry**: Re-invoke plan-issue skill

**Skip**:
- Add issue to failedIssues with reason "planning_failed"
- Continue to next issue

**Pause**:
Update `.tiki/state/yolo.json`:

1. Read current yolo.json
2. Set `status` to `"paused"`
3. Set `lastActivity` to current ISO timestamp
4. Add entry to `errorHistory` array:
   - `issue`: current issue number
   - `error`: "planning_failed"
   - `timestamp`: current ISO timestamp
   - `resolved`: `false`

Exit execution.

## State Updates

After successful planning, update `.tiki/state/yolo.json`:

1. Read current yolo.json
2. Set `currentIssue` to the issue number
3. Set `lastActivity` to current ISO timestamp
