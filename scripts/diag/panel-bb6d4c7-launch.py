#!/usr/bin/env python3
"""One authorized current arm; hard 60s launcher ceiling, never retry."""
import json
import os
from pathlib import Path
import signal
import subprocess
import time

root = Path(__file__).resolve().parents[2]
os.chdir(root)
out = root/'out/accepted-broad-audit'
marker = out/'one-arm-attempt.json'
if marker.exists() or (out/'cases').exists() or (out/'summary.json').exists():
    raise SystemExit('Existing attempt/evidence preserved; no automatic second arm or retry.')
manifest = json.loads((out/'manifest.json').read_text())
assert len(manifest['cases']) == 48
assert manifest['provenance']['acceptedCommit'] == 'bb6d4c73948d53ba841dd9338dd240146c739f8c'
cmd = ['/workspace/.football-tools/node-v22.23.3-linux-x64/bin/node', 'scripts/baseline.mjs',
       '--candidate', '--receipt', 'out/accepted-broad-audit/run-receipt.json', '--',
       'node', '--import', 'tsx', 'scripts/diag/accepted-broad-audit.ts', '--run', '--checkpoint',
       'Rank recurring visible football problems on one accepted build across preselected ordinary runs and passes before another feature wave']
receipt = {'schema': 'one-arm-60s-launcher-v1', 'command': cmd, 'maxSeconds': 60,
           'maxAttempts': 48, 'retry': False, 'innerBatchMs': 50000, 'caseMs': 5000,
           'manifestSha256': manifest['manifestSha256'], 'startedAtUnix': time.time()}
marker.write_text(json.dumps(receipt, indent=2)+'\n')
start = time.monotonic()
p = subprocess.Popen(cmd, start_new_session=True)
exhausted = False
try:
    code = p.wait(timeout=60)
except subprocess.TimeoutExpired:
    exhausted = True
    os.killpg(p.pid, signal.SIGKILL)
    code = p.wait()
receipt.update(exitCode=code, hardBudgetExhausted=exhausted,
               launcherWallSeconds=time.monotonic()-start)
summary_path = out/'summary.json'
if summary_path.exists():
    summary = json.loads(summary_path.read_text())
    receipt['preservedSummary'] = {k: summary[k] for k in ('status', 'attempted', 'complete', 'partial', 'skipped')}
if exhausted:
    # Inner tick-boundary caps normally retain complete partial state. A hard
    # process stop cannot recover an unsaved in-memory tick: state this gap.
    known = sorted(p.stem.split('.')[0] for p in (out/'cases').glob('*.json'))
    remainder = [c['id'] for c in manifest['cases'] if c['id'] not in known]
    receipt['hardStopTail'] = {'savedCaseIds': known, 'remainingIds': remainder,
                             'limit': 'First remaining ID may have been in progress; remaining native state unavailable after hard kill. No backfill or retry.'}
marker.write_text(json.dumps(receipt, indent=2)+'\n')
print(json.dumps(receipt), flush=True)
raise SystemExit(1 if exhausted else code)
