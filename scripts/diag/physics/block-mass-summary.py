"""Reduce the saved contact panel; run zero additional simulations."""
import hashlib
import json
from pathlib import Path

ROOT = Path('out/block-mass-response')
raw_path = ROOT / 'raw.json'
raw = json.loads(raw_path.read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(raw['input']) == raw['inputSha256']
assert sha('scripts/diag/physics/block-mass-response.ts') == raw['collectorSha256']
receipt = json.loads((ROOT / 'panel.receipt.json').read_text())
assert receipt['exitCode'] == 0 and receipt['inputsUnchanged']
assert receipt['sourceSha256'] == raw['sourceSha256']

runs = []
for r in raw['runs']:
    masses = [p['massKg'] for p in r['profiles']]
    sign = -1 if r['scene'].get('mirror') else 1
    delta = [r['final'][i]['pos']['x'] - r['initial'][i]['pos']['x'] for i in range(2)]
    com = sign * sum(m * dx for m, dx in zip(masses, delta)) / sum(masses)
    runs.append({**{k: r[k] for k in ['scene', 'inputSha256', 'profiles', 'initial', 'final', 'summary']},
                 'pairCOMAdvance': com,
                 'sampledHalfSecond': {k: r['steps'][9][k] for k in ['commands', 'ledgers']}})

by_id = {r['scene']['id']: r for r in runs}
assert abs(by_id['equal-square']['pairCOMAdvance']) < 1e-12
assert abs(by_id['equal-square-mirror']['pairCOMAdvance']) < 1e-12
assert abs(by_id['equal-square']['summary']['defenderDriven'] -
           by_id['equal-square-mirror']['summary']['defenderDriven']) < 1e-12
fine = by_id['plus15-square-fine']
ordinary = by_id['plus15-square']
refinement = {'defenderDisplacementDifference': abs(fine['summary']['defenderDriven'] - ordinary['summary']['defenderDriven']),
              'pairCOMDifference': abs(fine['pairCOMAdvance'] - ordinary['pairCOMAdvance']),
              'meaning': 'Self-refinement of this drill, not independent force-law validation.'}

checks = []
for filename in ['preliminary/panel.receipt.json', 'panel.receipt.json', 'typecheck.receipt.json']:
    p = ROOT / filename
    r = json.loads(p.read_text())
    checks.append({'path': str(p), 'sha256': sha(p), **r})

result = {'protocol': 'block-mass-response-evidence-v1', 'sourceSha256': raw['sourceSha256'],
          'testedRevision': receipt['commit'], 'runtimeChanged': False,
          'raw': {'path': str(raw_path), 'sha256': sha(raw_path)},
          'input': {'path': raw['input'], 'sha256': raw['inputSha256']},
          'collectorSha256': raw['collectorSha256'], 'reducerSha256': sha(__file__),
          'strengthChart': raw['strengthChart'], 'runs': runs, 'refinement': refinement,
          'internalSeconds': raw['elapsedSeconds'], 'receipts': checks,
          'totalCommandSeconds': sum(c['elapsedSeconds'] for r in checks for c in r['commands']),
          'limits': ['Open-loop two-active-body contact drills in the existing 22-body fixture; no runner protection or win-rate claim.',
                     'Mass-only analogues keep geometry and free mobility fixed; actual TE/DT controls keep their generated profiles.',
                     'Fixed hand control and prescribed requests are diagnostic interventions, not proposed football controllers.',
                     'Grip/ground/momentum accounting does not clear known angular-law or solver-promotion failures.',
                     'No independent push/anchor calibration target is supplied by the observational NFL weight table.',
                     'No capacity, traction, recovery, force law or default changes are proposed for adoption.']}
destination = Path('data/reviews/current/block-mass-response.json')
destination.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'destination': str(destination), 'cases': len(runs), 'refinement': refinement,
                  'totalCommandSeconds': result['totalCommandSeconds']}))
