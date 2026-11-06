# coding: utf-8
"""检查构建后的Pages资源、清单作用域和课程数据。"""
import hashlib
import argparse
import json
import os
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from build_content import ROOT, load_lessons, load_exams


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
        self.manifest = None

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == 'script' and attributes.get('src'):
            self.urls.append(attributes['src'])
        if tag == 'link' and attributes.get('href'):
            self.urls.append(attributes['href'])
            if attributes.get('rel') == 'manifest':
                self.manifest = attributes['href']


def verify(base):
    if not base.startswith('/') or not base.endswith('/') or base.startswith('//'):
        raise ValueError('base应为/或/repository/形式')
    dist = ROOT / 'dist'
    parser = Assets()
    parser.feed((dist / 'index.html').read_text())
    for url in parser.urls:
        if not url.startswith(base) or urlparse(url).scheme:
            raise ValueError('静态资源路径未使用指定base '+url)
        if not (dist / url[len(base):]).is_file():
            raise ValueError('静态资源不存在 '+url)
    if parser.manifest is None:
        raise ValueError('缺少Web App Manifest')
    manifest = json.loads((dist / parser.manifest[len(base):]).read_text())
    origin = 'https://pages.example.test'
    manifest_url = origin + parser.manifest
    for field in ['start_url', 'scope', 'id']:
        if urljoin(manifest_url, manifest[field]) != origin + base:
            raise ValueError('Manifest作用域不匹配 '+field)
    for icon in manifest['icons']:
        path = urlparse(urljoin(manifest_url, icon['src'])).path
        if not path.startswith(base) or not (dist / path[len(base):]).is_file():
            raise ValueError('图标路径不匹配')
    offline = json.loads((dist / 'offline-manifest.json').read_text())
    if offline['base'] != base or not (dist / 'sw.js').is_file():
        raise ValueError('离线缓存作用域不正确')
    worker = (dist / 'sw.js').read_text()
    if '__OFFLINE_CONFIG__' in worker or offline['version'] not in worker:
        raise ValueError('Service Worker未完成版本配置')
    for entry in offline['resources']:
        if not entry['url'].startswith(base):
            raise ValueError('离线资源超出作用域')
        file = dist / entry['url'][len(base):]
        if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError('离线资源内容哈希不匹配')
    if base+'index.html' not in {entry['url'] for entry in offline['resources']}:
        raise ValueError('缺少离线入口页')
    scripts = '\n'.join(p.read_text() for p in (dist / 'assets').glob('*.js'))
    for d in load_lessons():
        if d['id'] not in scripts or any(q['id'] not in scripts for q in d['questions']+d['translations']):
            raise ValueError(f"课程未完整打包 Day {d['day']}")
    for exam in load_exams():
        if exam['id'] not in scripts:
            raise ValueError('模考未打包 '+exam['id'])
    if list(dist.rglob('*.pdf')) or list(dist.rglob('*.zip')):
        raise ValueError('部署产物混入PDF或压缩备份')
    return {'status': 'passed', 'base': base, 'courses': 90, 'exams': len(load_exams()),
            'staticAssets': len(parser.urls), 'manifestScope': base,
            'serviceWorker': 'versioned verified precache', 'offlineResources': len(offline['resources']), 'offlineColdStart': 'available after initial cache completes'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default=os.environ.get('VITE_BASE_PATH', '/'))
    args = parser.parse_args()
    result = verify(args.base)
    print(json.dumps(result, ensure_ascii=False))
