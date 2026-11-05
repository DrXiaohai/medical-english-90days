# coding: utf-8
"""按明确清单导出待上传仓库。不会上传或创建远程仓库。"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path
from pages_security import inspect_repository

ROOT = Path(__file__).resolve().parents[1]
DIRECTORIES = ['src', 'public', 'tests', 'curriculum', 'exams', 'vocabulary', 'translation', 'cases', 'content_review', '.github']
FILES = ['package.json', 'package-lock.json', 'vite.config.ts', 'index.html', 'tsconfig.json', '.gitignore', 'STUDY_PLAN.md', 'DEPLOYMENT.md',
         'scripts/build_content.py', 'scripts/validate_content.py', 'scripts/pages_security.py', 'scripts/verify_pages.py',
         'scripts/prepare_pages_repository.py', 'scripts/browser_check.cjs', 'docs/PUBLIC_README.txt']


def prepare(output):
    if output.exists() and any(output.iterdir()):
        raise ValueError('目标目录非空，请指定一个新的空目录')
    output.mkdir(parents=True, exist_ok=True)
    selected = [ROOT / name for name in FILES]
    for name in DIRECTORIES:
        selected += [p for p in (ROOT / name).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name != '.DS_Store']
    for source in selected:
        if source.is_symlink():
            raise ValueError('发布清单出现符号链接 '+str(source.relative_to(ROOT)))
        target = output / source.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    shutil.copyfile(ROOT/'docs/PUBLIC_README.txt', output/'README.md')
    package_file = output/'package.json'
    package = json.loads(package_file.read_text())
    for name in ['pdf', 'build:pdf', 'validate:pdf']:
        package['scripts'].pop(name, None)
    package_file.write_text(json.dumps(package, ensure_ascii=False, indent=2)+'\n')
    review = inspect_repository(output)
    review['files'] = {str(p.relative_to(output)): hashlib.sha256(p.read_bytes()).hexdigest()
                       for p in sorted(output.rglob('*')) if p.is_file()}
    review['excluded'] = ['output/', 'pdf_output/', 'tmp/', 'node_modules/', 'dist/', 'scripts/authoring/', 'PDF scripts and local reports', 'local README replaced with public README']
    review['publication'] = 'pending repository, authorization, and user confirmation of reviewed files'
    (ROOT/'publish_output').mkdir(exist_ok=True)
    (ROOT/'publish_output/publication-review.json').write_text(json.dumps(review, ensure_ascii=False, indent=2))
    if review['findings']:
        raise ValueError('发布清单有待复核项，见publish_output/publication-review.json')
    print(json.dumps({'repositoryDirectory': str(output), 'files': len(review['files']), 'scan': review['status'], 'uploaded': False}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output')
    args = parser.parse_args()
    destination = Path(args.output).expanduser().resolve() if args.output else ROOT/'publish_output/repository'
    if not args.output:
        counter = 1
        while destination.exists() and any(destination.iterdir()):
            counter += 1
            destination = ROOT/'publish_output'/f'repository-{counter}'
    if destination == ROOT or ROOT in destination.parents and destination.parts[len(ROOT.parts)] not in {'publish_output', 'tmp'}:
        raise ValueError('项目内导出目录须位于publish_output或tmp，避免覆盖课程源')
    prepare(destination)
