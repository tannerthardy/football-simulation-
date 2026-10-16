"""Prepare the one rejected diagnostic in an isolated host; simulate only with --run."""
import argparse
import io
import json
import shutil
import subprocess
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = 'bb6d4c73948d53ba841dd9338dd240146c739f8c'
ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument('--host', type=Path, default=ROOT / 'out/current-protection-access/repro-host')
ap.add_argument('--run', action='store_true', help='Execute one D06 native continuation, max5 simulated seconds.')
args = ap.parse_args()
host = args.host.resolve()
if host.exists():
    raise SystemExit(f'Refusing to overwrite existing host: {host}')
host.mkdir(parents=True)
archive = subprocess.check_output(['git', 'archive', BASE, 'src', 'config',
    'scripts/source-version.ts', 'scripts/baseline.mjs', 'package.json', 'package-lock.json'], cwd=ROOT)
with tarfile.open(fileobj=io.BytesIO(archive)) as tf:
    tf.extractall(host, filter='data')
(host / 'scripts/diag').mkdir()
shutil.copyfile(ROOT / 'scripts/diag/current-protection-capture.mjs', host / 'scripts/diag/current-protection-capture.mjs')
path = host / 'src/sim/behaviors/blocking.ts'
text = path.read_text()
old = "if (sim.offCall.run?.scheme === 'duo' && route.exit) {"
assert text.count(old) == 1
path.write_text(text.replace(old, "if (sim.offCall.run?.scheme === 'duo' && route.exit\n"
    "    && !(observer.idx === 1 && combo.members.some(a => a.idx === 4) && sim.t >= 1.8)) {"))
(host / 'node_modules').symlink_to((ROOT / 'node_modules').resolve(), target_is_directory=True)
# The unchanged passive collector reads HEAD for provenance. Give an external
# host the same read-only Git metadata access it gets under ROOT/out; runtime
# compatibility is the explicit archived BASE and actual source fingerprint.
git_dir = subprocess.check_output(['git', 'rev-parse', '--absolute-git-dir'], cwd=ROOT, text=True).strip()
(host / '.git').write_text('gitdir: ' + git_dir + '\n')
subprocess.run(['git', 'rev-parse', '--verify', 'HEAD'], cwd=host, check=True, capture_output=True)
command = ['node', 'scripts/baseline.mjs', '--candidate', '--flag', 'RUN_CONTACT_COMPONENTS=1', '--',
    'node', '--import', 'tsx', 'scripts/diag/current-protection-capture.mjs', 'run',
    'out/rejected-diagnostic', 'D06', '5', str(ROOT / 'data/reviews/current/current-protection-access/inputs.json')]
print(json.dumps({'base': BASE, 'host': str(host), 'productionEdits': 0,
    'diagnostic': 'LT-only opposite-half veto bypass from1.80; other security and route logic remain native',
    'command': command, 'newNativeExecutions': int(args.run)}, indent=2))
if args.run:
    subprocess.run(command, cwd=host, check=True, timeout=15)
