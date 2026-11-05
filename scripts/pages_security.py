# coding: utf-8
"""发布前检查。只报告位置和规则名，避免把疑似凭据写入日志。"""
import argparse
import json
import re
from pathlib import Path

SKIP_DIRECTORIES = {'node_modules', '.git', '__pycache__', '.venv', '.venv-pdf', 'dist'}
PRIVATE_DIRECTORIES = {'output', 'pdf_output', 'tmp', 'publish_output', '.codex', '.aws', '.ssh'}
PRIVATE_SUFFIXES = {'.pem', '.key', '.p12', '.pfx', '.sqlite', '.db', '.zip', '.pdf', '.docx', '.xlsx'}
RULES = {
    'private_key': re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
    'github_token': re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b'),
    'aws_access_key': re.compile(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
    'api_secret': re.compile(r'\bsk-[A-Za-z0-9_-]{24,}\b'),
    'assigned_secret': re.compile(r'''(?i)\b(?:password|api_key|access_token|client_secret)\s*[:=]\s*["'][^"'\s]{8,}["']'''),
    'personal_email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'),
    'identity_number': re.compile(r'(?<![A-Za-z0-9])\d{17}[0-9Xx](?![A-Za-z0-9])'),
    'phone_number': re.compile(r'(?<!\d)1[3-9]\d{9}(?!\d)'),
    'named_patient': re.compile(r'(?:患者姓名|病人姓名|住院号|门诊号)\s*[:：=]\s*\S+'),
}
HOME_MARKER = '/' + 'Users' + '/'


def inspect_repository(root):
    findings = []
    count = 0
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if any(part in SKIP_DIRECTORIES for part in relative.parts):
            continue
        if path.is_symlink():
            findings.append({'file': str(relative), 'rule': 'symbolic_link'})
            continue
        if not path.is_file():
            continue
        count += 1
        if any(part in PRIVATE_DIRECTORIES for part in relative.parts) or path.name.startswith('.env') or path.suffix.lower() in PRIVATE_SUFFIXES:
            findings.append({'file': str(relative), 'rule': 'private_artifact'})
            continue
        if path.suffix.lower() == '.csv' and str(relative) != 'vocabulary/core_vocabulary.csv':
            findings.append({'file': str(relative), 'rule': 'unreviewed_dataset'})
            continue
        if path.suffix.lower() in {'.png', '.jpg', '.ico'}:
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            findings.append({'file': str(relative), 'rule': 'unreviewed_binary'})
            continue
        for number, line in enumerate(text.splitlines(), 1):
            for name, pattern in RULES.items():
                if pattern.search(line):
                    findings.append({'file': str(relative), 'line': number, 'rule': name})
            if HOME_MARKER in line:
                findings.append({'file': str(relative), 'line': number, 'rule': 'local_home_path'})
        if path.suffix == '.json':
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                continue
            if isinstance(data, dict) and {'version', 'days', 'words'} <= data.keys():
                findings.append({'file': str(relative), 'rule': 'learning_progress_backup'})
    return {'filesInspected': count, 'findings': findings,
            'status': 'passed' if not findings else 'review_required',
            'scope': 'pattern scan and publication allowlist; clinical vignettes require provenance review'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repository', default='.')
    parser.add_argument('--report')
    args = parser.parse_args()
    result = inspect_repository(Path(args.repository).resolve())
    if args.report:
        Path(args.report).write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps(result, ensure_ascii=False))
    if result['findings']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
