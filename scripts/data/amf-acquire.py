#!/usr/bin/env python3
"""Plan, or explicitly fetch, a pinned AMF manifest outside the sim repository.

Sequential curl transfers resume .part files; completed files are SHA-256
verified on reuse. Unknown source SHA-256s are recorded as first-acquisition
hashes, never described as independently provider-verified checksums.
No Git clone, archive extraction, format conversion or engine execution.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from urllib.parse import urlsplit


def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--manifest', type=Path, required=True)
    p.add_argument('--root', type=Path)
    p.add_argument('--fetch', action='store_true', help='Default is a cost/holdings plan only')
    p.add_argument('--max-bytes', type=int, help='Required cap on remaining HTTP payload before --fetch')
    a = p.parse_args()
    m = json.loads(a.manifest.read_bytes())
    root = (a.root or Path(m['storage_root'])).resolve()
    repo = Path(__file__).resolve().parents[2]
    if root == repo or repo in root.parents:
        p.error('AMF raw data must stay outside the simulation repository')
    receipt_path = root / 'acquisition-receipt.json'
    old = json.loads(receipt_path.read_text()) if receipt_path.exists() else {'files': {}}
    manifest_sha = sha(a.manifest)
    if old.get('manifest_sha256', manifest_sha) != manifest_sha:
        p.error('Receipt belongs to another manifest; keep versioned holdings separate')
    plan = []
    for e in m['files']:
        rel = Path(e['path'])
        if rel.is_absolute() or '..' in rel.parts or not isinstance(e['bytes'], int) or e['bytes'] < 0:
            p.error('Unsafe manifest path or size')
        u = urlsplit(e['url'])
        prefix = '/hudl/amf-open-data/' + m['source_commit'] + '/'
        if u.scheme != 'https' or u.netloc != 'raw.githubusercontent.com' or not u.path.startswith(prefix):
            p.error('Expected immutable Hudl GitHub raw URL')
        dst = root / rel
        if not dst.resolve().is_relative_to(root) or dst.is_symlink():
            p.error('Destination escapes storage root')
        known = e.get('sha256') or old['files'].get(e['path'], {}).get('sha256')
        if dst.exists():
            if not dst.is_file() or dst.stat().st_size != e['bytes'] or not known or sha(dst) != known:
                p.error('Existing file lacks a matching size/hash pin; preserved: ' + str(dst))
            plan.append((e, 'reuse', 0))
        else:
            part = dst.with_name(dst.name + '.part')
            binding = dst.with_name(dst.name + '.part-source.json')
            identity = {k: e.get(k) for k in ('url','bytes','etag','sha256')}
            if part.is_symlink() or binding.is_symlink():
                p.error('Partial-file symlink refused')
            n = part.stat().st_size if part.exists() else 0
            if n > e['bytes'] or (part.exists() and (not binding.exists() or json.loads(binding.read_text()) != identity)):
                p.error('Partial file is not bound to these source pins; preserved: ' + str(part))
            plan.append((e, 'resume' if n else 'download', e['bytes'] - n))
    remaining = sum(n for _, _, n in plan)
    print(json.dumps({'source_commit':m['source_commit'], 'files':len(plan),
                      'reuse_files':sum(s=='reuse' for _,s,_ in plan), 'remaining_http_payload_bytes':remaining,
                      'canonical_storage_bytes':sum(e['bytes'] for e,_,_ in plan),
                      'root':str(root), 'fetch':a.fetch}), flush=True)
    if not a.fetch:
        return
    if a.max_bytes is None or a.max_bytes < remaining:
        p.error('--max-bytes must cover the printed remaining payload; no transfers started')
    root.mkdir(parents=True, exist_ok=True)
    receipt = {'schema':'amf-acquisition-v1', 'manifest_sha256':manifest_sha,
               'source_commit':m['source_commit'], 'files':dict(old['files'])}
    for e, state, _ in plan:
        dst = root / e['path']
        if state != 'reuse':
            dst.parent.mkdir(parents=True, exist_ok=True)
            part = dst.with_name(dst.name + '.part')
            binding = dst.with_name(dst.name + '.part-source.json')
            binding.write_text(json.dumps({k:e.get(k) for k in ('url','bytes','etag','sha256')},sort_keys=True)+'\n')
            cmd = ['curl','--fail','--location','--retry','2','--connect-timeout','20',
                   '--max-time','300','--continue-at','-','--max-filesize',str(e['bytes']),
                   '--output',str(part)]
            if e.get('etag'):
                cmd += ['--header','If-Match: '+e['etag']]
            subprocess.run(cmd+[e['url']],check=True)
            digest = sha(part)
            if part.stat().st_size != e['bytes'] or (e.get('sha256') and digest != e['sha256']):
                raise ValueError('Downloaded size/hash mismatch; partial kept: '+str(part))
            part.replace(dst)
            binding.unlink()
        receipt['files'][e['path']] = {'bytes':dst.stat().st_size, 'sha256':sha(dst),
                                      'url':e['url'], 'etag':e.get('etag'),
                                      'checksum_basis':'preexisting pin' if e.get('sha256') else 'first acquisition at immutable URL'}
        temp = receipt_path.with_suffix('.tmp')
        temp.write_text(json.dumps(receipt,indent=2)+'\n')
        temp.replace(receipt_path)
        print(json.dumps({'path':e['path'],'status':state}),flush=True)


if __name__ == '__main__':
    main()
