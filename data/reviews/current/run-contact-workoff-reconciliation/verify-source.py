#!/usr/bin/env python3
"""Read-only source reconciliation proof. Run from the repository root."""
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

packet = Path(__file__).resolve().parent
manifest = json.loads((packet / 'manifest.json').read_text())
base = manifest['acceptedBase']
run = manifest['run174']['publication']
catching = manifest['catchingReference']['commit']
reference = manifest['reconciledReference']['finalTestRevision']

def body(pin, path):
    return subprocess.check_output(['git', 'show', pin + ':' + path])

for path, expected in manifest['reconciledReference']['runtimePaths'].items():
    actual = body(reference, path)
    assert hashlib.sha256(actual).hexdigest() == expected['sha256'], path
    if path == 'src/sim/engagement.ts':
        continue
    producer = run if expected['owner'].startswith('#174') else catching
    assert actual == body(producer, path), (path, 'producer differs')

with tempfile.TemporaryDirectory(prefix='run-contact-proof-') as folder:
    files = []
    for name, pin in [('catching', catching), ('base', base), ('run', run)]:
        path = Path(folder) / (name + '.ts')
        path.write_bytes(body(pin, 'src/sim/engagement.ts'))
        files.append(str(path))
    merged = subprocess.check_output(['git', 'merge-file', '-p', *files])
    assert merged == body(reference, 'src/sim/engagement.ts'), 'not exact merge'

changed = subprocess.check_output(['git', 'diff', '--name-only', base, reference,
                                   '--', 'src'], text=True).splitlines()
assert sorted(changed) == sorted(manifest['reconciledReference']['runtimePaths'])
assert body(base, 'config/baseline.json') == body(reference, 'config/baseline.json')
source = merged.decode()
for marker in [
    'const runoffWork =',
    'forward = w * 2.4 + (1 - w)',
    'const ready = t >= e.nextMoveAt || (supportRunner && !runSheds.has(e));',
    'const exitAim = shedding && shed!.runner && supportRunner ? read.aim : undefined;',
]:
    assert source.count(marker) == 1, marker
assert not subprocess.check_output(['git', 'diff',
    manifest['reconciledReference']['runtime'], reference, '--', 'src'])
print('PASS: exact owner hunks; clean shared frame; #172 once; #185 absent; settings unchanged.')
