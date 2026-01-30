# Windows Hook Support

On Windows, detect shell availability and execute hooks appropriately.

## Shell Detection Order

### 1. Git Bash (preferred for .sh files)

Check availability:
```bash
where bash
# or check common paths:
# C:\Program Files\Git\bin\bash.exe
# C:\Program Files (x86)\Git\bin\bash.exe
```

Execute:
```bash
bash -c "<script-path>"
```

### 2. PowerShell (for .ps1 files)

Check availability:
```bash
where pwsh      # PowerShell Core (preferred)
where powershell # Windows PowerShell (fallback)
```

Execute:
```powershell
pwsh -ExecutionPolicy Bypass -File "<script-path>"
# or for Windows PowerShell:
powershell -ExecutionPolicy Bypass -File "<script-path>"
```

### 3. WSL (fallback for .sh files)

Check availability:
```bash
where wsl
```

Execute:
```bash
wsl bash "<script-path>"
```

## File Extension Priority

When the hook file has no extension, check for files in this order:

1. `<hook-name>` - Unix-style (no extension), run via bash
2. `<hook-name>.sh` - Explicit shell script, run via bash
3. `<hook-name>.ps1` - PowerShell script, run via pwsh/powershell

## Environment Variable Passing

### For Bash/Git Bash

Pass environment variables inline before the command:

```bash
ISSUE_NUMBER=123 ISSUE_TITLE="Fix bug" bash -c "./hooks/pre-ship"
```

Or export them:

```bash
export ISSUE_NUMBER=123
export ISSUE_TITLE="Fix bug"
bash -c "./hooks/pre-ship"
```

### For PowerShell

Set environment variables using `$env:` syntax before execution:

```powershell
$env:ISSUE_NUMBER='123'
$env:ISSUE_TITLE='Fix bug'
pwsh -ExecutionPolicy Bypass -File "hooks/pre-ship.ps1"
```

### For WSL

Pass environment variables to WSL:

```bash
ISSUE_NUMBER=123 ISSUE_TITLE="Fix bug" wsl bash "./hooks/pre-ship"
```

## Path Conversion

When running hooks via WSL, convert Windows paths to Unix-style:

```
Windows: C:\Users\name\project\.tiki\hooks\pre-ship
WSL:     /mnt/c/Users/name/project/.tiki/hooks/pre-ship
```

Use `wslpath` if available:
```bash
wsl wslpath -u "C:\path\to\hook"
```
