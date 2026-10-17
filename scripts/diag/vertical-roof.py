#!/usr/bin/env python3
"""Source-isolated, exact-input vertical coverage comparison; opt-in only.

Reuses #131's constructor restorer and #139's verified input capsule. It does
not reconstruct a checkpoint from film or download/regenerate game inputs.
"""
import argparse
import hashlib
import io
import json
import shutil
import subprocess
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'out/vertical-roof'
BASE = '0000e560e0dbe31905151465152d412ba838803d'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def prepare(arm):
    host = OUT / 'hosts' / arm
    assert not host.exists(), f'Preserve existing evidence: {host}'
    host.mkdir(parents=True)
    if arm == 'base':
        archive = subprocess.check_output(['git', 'archive', BASE, 'src'], cwd=ROOT)
        with tarfile.open(fileobj=io.BytesIO(archive)) as t:
            t.extractall(host, filter='data')
    else:
        shutil.copytree(ROOT / 'src', host / 'src')
    (host / 'scripts').mkdir()
    shutil.copyfile(ROOT / 'scripts/source-version.ts', host / 'scripts/source-version.ts')
    runner = ROOT / 'scripts/diag/vertical-roof.ts.template'
    shutil.copyfile(runner, host / 'scripts/vertical-roof.ts')
    shared = host / 'out/catch-opportunity-physics'
    shared.mkdir(parents=True)
    restorer = ROOT / 'out/flex-three-probes/physics/out/catch-opportunity-physics/reconstruct.ts'
    shutil.copyfile(restorer, shared / 'reconstruct.ts')
    capsule = ROOT / 'out/flex-three-probes/capsules'
    for folder in ['packet', 'audit', 'selected']:
        (shared / folder).symlink_to(capsule / folder, target_is_directory=True)
    provenance = {'arm': arm, 'base': BASE, 'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
                  'restorerSha256': sha(restorer), 'runnerSha256': sha(runner), 'preparerSha256': sha(Path(__file__)),
                  'productionChanges': subprocess.check_output(['git', 'diff', 'HEAD', '--', 'src'], cwd=ROOT, text=True)}
    (host / 'preparation.json').write_text(json.dumps(provenance, indent=2) + '\n')
    return host


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--prepare', action='store_true')
    p.add_argument('--arm', choices=['base', 'recovery-v1', 'final', 'candidate'], default='base')
    p.add_argument('--check', action='store_true')
    p.add_argument('--ids', nargs='+', required=True)
    args = p.parse_args()
    allowed = {'G1-P012', 'G1-P027', 'G1-P043', 'G1-P049', 'G1-P105', 'G1-P185', 'G1-P187', 'G1-P192',
               'G2-P067', 'G3-P089', 'G4-P156'}
    assert set(args.ids) <= allowed and len(args.ids) <= 12, 'Outside the declared diagnostic cases'
    host = prepare(args.arm) if args.prepare else OUT / 'hosts' / args.arm
    subprocess.run(['node', '--import', 'tsx', 'scripts/vertical-roof.ts', 'construct' if args.check else 'run', *args.ids],
                   cwd=host, check=True, timeout=60)


if __name__ == '__main__':
    main()
