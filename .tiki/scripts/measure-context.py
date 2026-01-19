#!/usr/bin/env python
"""
Measure context window usage for Tiki commands.

Run this before and after refactoring to measure improvement.

Usage:
    python .tiki/scripts/measure-context.py
    python .tiki/scripts/measure-context.py --json  # Output as JSON for comparison
"""

import tiktoken
import os
import json
import sys
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

def measure_commands():
    """Measure all large commands."""
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
        results[name] = {
            'path': path,
            'tokens': tokens,
            'lines': lines,
            'pct_of_200k': round(tokens / 200000 * 100, 2)
        }

    return results

def measure_execute_invocation():
    """Simulate a typical /tiki:execute invocation."""
    exec_tokens, _ = count_tokens('.claude/commands/tiki/execute.md')
    claude_tokens, _ = count_tokens('CLAUDE.md')

    # Estimates for things we can't directly measure
    components = {
        'claude_code_system_prompt': 3000,  # Estimate
        'execute_md': exec_tokens,
        'claude_md': claude_tokens,
        'plan_file': 1500,  # Estimate
        'prev_summaries': 500,  # Estimate
    }

    total = sum(components.values())

    return {
        'components': components,
        'total_tokens': total,
        'remaining': 200000 - total,
        'pct_used': round(total / 200000 * 100, 2)
    }

def measure_prompt_files():
    """Measure extracted prompt files (after refactoring)."""
    prompt_dirs = [
        '.tiki/prompts/execute',
        '.tiki/prompts/plan',
        '.tiki/prompts/requirements',
        '.tiki/prompts/research',
        '.tiki/prompts/debug',
        '.tiki/prompts/release',
    ]

    results = {}
    for dir_path in prompt_dirs:
        if os.path.exists(dir_path):
            dir_results = {}
            for filename in os.listdir(dir_path):
                if filename.endswith('.md'):
                    filepath = os.path.join(dir_path, filename)
                    tokens, lines = count_tokens(filepath)
                    dir_results[filename] = {
                        'tokens': tokens,
                        'lines': lines
                    }
            if dir_results:
                results[dir_path] = dir_results

    return results

def main():
    output_json = '--json' in sys.argv

    timestamp = datetime.now().isoformat()

    data = {
        'timestamp': timestamp,
        'commands': measure_commands(),
        'execute_invocation': measure_execute_invocation(),
        'prompt_files': measure_prompt_files(),
    }

    # Calculate totals
    data['totals'] = {
        'all_large_commands_tokens': sum(c['tokens'] for c in data['commands'].values()),
        'all_large_commands_lines': sum(c['lines'] for c in data['commands'].values()),
    }

    if output_json:
        print(json.dumps(data, indent=2))
        return

    # Pretty print
    print('=' * 70)
    print(f'TIKI COMMAND CONTEXT USAGE - {timestamp[:10]}')
    print('=' * 70)
    print()

    print('LARGE COMMANDS')
    print('-' * 70)
    print(f'{"Command":<30} {"Lines":>10} {"Tokens":>12} {"% of 200K":>12}')
    print('-' * 70)

    for name, info in data['commands'].items():
        print(f'{name:<30} {info["lines"]:>10,} {info["tokens"]:>12,} {info["pct_of_200k"]:>11.1f}%')

    print('-' * 70)
    print(f'{"TOTAL":<30} {data["totals"]["all_large_commands_lines"]:>10,} {data["totals"]["all_large_commands_tokens"]:>12,} {data["totals"]["all_large_commands_tokens"]/200000*100:>11.1f}%')
    print()

    print('TYPICAL /tiki:execute INVOCATION')
    print('-' * 70)
    inv = data['execute_invocation']
    print(f'{"Component":<40} {"Tokens":>12}')
    print('-' * 70)
    for name, tokens in inv['components'].items():
        print(f'{name:<40} {tokens:>12,}')
    print('-' * 70)
    print(f'{"TOTAL before work begins":<40} {inv["total_tokens"]:>12,}')
    print(f'{"Remaining for actual work":<40} {inv["remaining"]:>12,}')
    print(f'{"Context used":<40} {inv["pct_used"]:>11.1f}%')
    print()

    if data['prompt_files']:
        print('EXTRACTED PROMPT FILES (sub-agent context)')
        print('-' * 70)
        for dir_path, files in data['prompt_files'].items():
            print(f'\n{dir_path}/')
            for filename, info in files.items():
                print(f'  {filename:<35} {info["lines"]:>6} lines  {info["tokens"]:>8,} tokens')
    else:
        print('No extracted prompt files found yet (run after refactoring)')

    print()
    print('=' * 70)
    print('To save baseline: python .tiki/scripts/measure-context.py --json > .tiki/context-baseline.json')
    print('=' * 70)

if __name__ == '__main__':
    main()
