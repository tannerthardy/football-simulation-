"""Prepare pinned diagnostic sources without checking out another runtime.

intervention applies the identical center correction only to the selected
PlaySim; the prefix collector supplies that experimental boundary. No game.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile

p = argparse.ArgumentParser()
p.add_argument('mode', choices=['original', 'corrected', 'intervention'])
p.add_argument('destination', type=Path)
a = p.parse_args()
pin = 'f62511a513f2187884d74ae3b94435835e43309c'
a.destination.mkdir(parents=True, exist_ok=True)
archive = subprocess.check_output(['git', 'archive', pin, 'src', 'package.json'])
with tarfile.open(fileobj=io.BytesIO(archive)) as t:
    t.extractall(a.destination, filter='data')
if a.mode != 'original':
    f = a.destination / 'src/sim/live-gaps.ts'
    old = '  for (const g of gone) {\n    const side ='
    condition = "g.agent.slot === 'C'"
    if a.mode == 'intervention':
        condition += ' && globalThis.__gapCorrectionCases?.has(sim)'
    new = ('  for (const g of gone) {\n'
           '    // The center is already the origin of the gap count. His departure\n'
           '    // cannot insert another outward boundary and rename B as A.\n'
           f'    if ({condition}) continue;\n    const side =')
    s = f.read_text()
    assert s.count(old) == 1
    f.write_text(s.replace(old, new))
h = hashlib.sha256()
for name in sorted(str(f.relative_to(a.destination)) for f in (a.destination / 'src').rglob('*') if f.is_file()):
    h.update(name.encode() + b'\0' + (a.destination / name).read_bytes() + b'\0')
print(json.dumps({'parent': pin, 'mode': a.mode, 'sourceSha256': h.hexdigest(), 'worldSteps': 0}))
