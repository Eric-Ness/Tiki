#!/usr/bin/env python
"""
Compare context window usage before and after refactoring.

Usage:
    python .tiki/scripts/compare-context.py

Requires .tiki/context-baseline.json to exist (from measure-context.py --json)
"""

import tiktoken
import os
import json
from datetime import datetime

enc = tiktoken.get_encoding('cl100k_base')

def count_tokens(filepath):
    """Count tokens and lines in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        return len(enc.encode(content)), len(content.split('\n'))
    except:
        return 0, 0

def load_baseline():
    """Load baseline measurements."""
    try:
        with open('.tiki/context-baseline.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("ERROR: No baseline found. Run first:")
        print("  python .tiki/scripts/measure-context.py --json > .tiki/context-baseline.json")
        return None

def measure_current():
    """Measure current state."""
    commands = [
        ('execute.md', '.claude/commands/tiki/execute.md'),
        ('plan-issue.md', '.claude/commands/tiki/plan-issue.md'),
        ('define-requirements.md', '.claude/commands/tiki/define-requirements.md'),
        ('research.md', '.claude/commands/tiki/research.md'),
        ('debug.md', '.claude/commands/tiki/debug.md'),
        ('release-yolo.md', '.claude/commands/tiki/release-yolo.md'),
    ]

    results = {}
    for name, path in commands:
        tokens, lines = count_tokens(path)
        results[name] = {'tokens': tokens, 'lines': lines}

    return results

def measure_prompt_files():
    """Measure extracted prompt files."""
    prompt_dirs = [
        '.tiki/prompts/execute',
        '.tiki/prompts/plan',
        '.tiki/prompts/requirements',
        '.tiki/prompts/research',
        '.tiki/prompts/debug',
        '.tiki/prompts/release',
    ]

    total_tokens = 0
    total_lines = 0
    files = []

    for dir_path in prompt_dirs:
        if os.path.exists(dir_path):
            for filename in os.listdir(dir_path):
                if filename.endswith('.md'):
                    filepath = os.path.join(dir_path, filename)
                    tokens, lines = count_tokens(filepath)
                    total_tokens += tokens
                    total_lines += lines
                    files.append({
                        'path': os.path.join(dir_path, filename),
                        'tokens': tokens,
                        'lines': lines
                    })

    return {
        'total_tokens': total_tokens,
        'total_lines': total_lines,
        'files': files
    }

def main():
    baseline = load_baseline()
    if not baseline:
        return

    current = measure_current()
    prompts = measure_prompt_files()

    print('=' * 80)
    print('CONTEXT WINDOW USAGE COMPARISON')
    print(f'Baseline: {baseline["timestamp"][:10]}')
    print(f'Current:  {datetime.now().strftime("%Y-%m-%d")}')
    print('=' * 80)
    print()

    print('COMMAND SIZE CHANGES')
    print('-' * 80)
    print(f'{"Command":<25} {"Baseline":>12} {"Current":>12} {"Change":>12} {"% Change":>12}')
    print('-' * 80)

    total_baseline = 0
    total_current = 0

    for name, curr in current.items():
        base = baseline['commands'].get(name, {})
        base_tokens = base.get('tokens', 0)
        curr_tokens = curr['tokens']

        total_baseline += base_tokens
        total_current += curr_tokens

        change = curr_tokens - base_tokens
        pct_change = (change / base_tokens * 100) if base_tokens > 0 else 0

        indicator = '✓' if change < 0 else ('•' if change == 0 else '✗')

        print(f'{name:<25} {base_tokens:>12,} {curr_tokens:>12,} {change:>+12,} {pct_change:>+11.1f}% {indicator}')

    print('-' * 80)
    total_change = total_current - total_baseline
    total_pct = (total_change / total_baseline * 100) if total_baseline > 0 else 0
    print(f'{"TOTAL":<25} {total_baseline:>12,} {total_current:>12,} {total_change:>+12,} {total_pct:>+11.1f}%')
    print()

    if prompts['files']:
        print('EXTRACTED PROMPT FILES (load into sub-agent context)')
        print('-' * 80)
        for f in prompts['files']:
            print(f'  {f["path"]:<50} {f["lines"]:>6} lines  {f["tokens"]:>8,} tokens')
        print('-' * 80)
        print(f'  {"TOTAL":<50} {prompts["total_lines"]:>6} lines  {prompts["total_tokens"]:>8,} tokens')
        print()

    # Calculate effective savings for execute invocation
    exec_baseline = baseline['commands']['execute.md']['tokens']
    exec_current = current['execute.md']['tokens']

    print('EFFECTIVE SAVINGS FOR /tiki:execute')
    print('-' * 80)
    print(f'{"Metric":<40} {"Before":>15} {"After":>15}')
    print('-' * 80)

    # Before
    before_total = 3000 + exec_baseline + 1115 + 1500 + 500  # system + execute + claude.md + plan + summaries

    # After (execute.md is smaller, prompt files load into sub-agent)
    after_total = 3000 + exec_current + 1115 + 1500 + 500

    print(f'{"Main context tokens":<40} {before_total:>15,} {after_total:>15,}')
    print(f'{"Context remaining for work":<40} {200000-before_total:>15,} {200000-after_total:>15,}')

    savings = before_total - after_total
    print('-' * 80)
    print(f'{"TOKENS SAVED":<40} {savings:>+15,}')
    print(f'{"REDUCTION":<40} {savings/before_total*100:>+14.1f}%')
    print()

    if savings > 0:
        print('✓ Refactoring is saving context!')
    elif savings == 0:
        print('• No change yet (refactoring not started or not complete)')
    else:
        print('✗ Context usage increased (unexpected)')

    print()
    print('=' * 80)

if __name__ == '__main__':
    main()
