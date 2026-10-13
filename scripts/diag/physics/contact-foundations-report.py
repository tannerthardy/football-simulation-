"""Reduce the source-matched contact receipts; raw traces remain in out/."""
import json
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/contact-foundations')
output = Path(sys.argv[2] if len(sys.argv) > 2 else root / 'summary.json')
intervals = json.loads((root / 'intervals.json').read_text())
angular = {mode: json.loads((root / f'{mode}-angular.json').read_text()) for mode in ('center', 'patch')}
gate = json.loads((root / 'patch-gate.json').read_text())
if not all(r['sourceBefore'] == r['sourceAfter'] == intervals['source'] for r in angular.values()):
    raise ValueError('Contact receipts describe different runtime sources')

cases = []
native_cases = []
mirror_error = 0.
for c in intervals['cases']:
    native = c['native']
    row = {k: c[k] for k in ('name', 'cell', 'mode', 'side', 'seed', 'time', 'checkpoint', 'endpoint', 'observerParity')}
    row['native'] = {k: native[k] for k in ('ending', 'endWhy', 'finish', 'firstGrip', 'afterContact', 'contactToEnd', 'carrierState')}
    native_cases.append({k: v for k, v in row.items() if k != 'variants'})
    if c['side'] < 0:
        positive = next(p for p in intervals['cases'] if p['side'] == 1 and p['name'] == c['name'] and p['mode'] == c['mode'])
        assert len(positive['trials']) == len(c['trials'])
        for p, n in zip(positive['trials'], c['trials']):
            assert (p['variant'], p['partitions']) == (n['variant'], n['partitions'])
            for i, (pb, nb) in enumerate(zip(p['end'], n['end'])):
                ps, ns = p['start'][i], n['start'][i]
                mirror_error = max(mirror_error,
                    abs((pb['pos']['x'] - ps['pos']['x']) - (nb['pos']['x'] - ns['pos']['x'])),
                    abs((pb['pos']['y'] - ps['pos']['y']) + (nb['pos']['y'] - ns['pos']['y'])),
                    abs((pb['spin'] - ps['spin']) + (nb['spin'] - ns['spin'])),
                    abs((pb['facing'] - ps['facing']) + (nb['facing'] - ns['facing'])))
        continue
    row = {k: row[k] for k in ('name', 'mode', 'seed', 'time')}
    row['variants'] = []
    for variant in ('full', 'ground-only', 'grip-only'):
        trials = [t for t in c['trials'] if t['variant'] == variant]
        finest = trials[-1]
        rows = []
        for t in trials:
            if t['partitions'] not in (1, 8, 256):
                continue
            rows.append(dict(partitions=t['partitions'],
                spinError=max(abs(b['spin'] - finest['end'][i]['spin']) for i, b in enumerate(t['end'])),
                facingError=max(abs(b['facing'] - finest['end'][i]['facing']) for i, b in enumerate(t['end'])),
                positionError=max(((b['pos']['x'] - finest['end'][i]['pos']['x'])**2
                    + (b['pos']['y'] - finest['end'][i]['pos']['y'])**2)**.5 for i, b in enumerate(t['end'])),
                momentumError=t['momentumError'], energyError=t['energyError']))
        reference = next(r['reference'] for r in c['references'] if r['variant'] == variant)
        estimate = None
        if reference is not None:
            i = c['ids'].index(reference['holderIndex'])
            estimate = {k: reference[k] for k in ('forceCapExit', 'impulse', 'transport', 'forceTransportFraction', 'initialSlip', 'finalSlip')}
            estimate.update({'coarseSpin': trials[0]['end'][i]['spin'],
                'finestSpin': finest['end'][i]['spin'], 'coarseFacing': trials[0]['end'][i]['facing'],
                'finestFacing': finest['end'][i]['facing'],
                'referenceFacingError': abs(reference['holderFacing'] - finest['end'][i]['facing']),
                'referenceSpinError': abs(reference['holderSpin'] - finest['end'][i]['spin'])})
            if reference['impulse'] == 0:
                estimate = None
        row['variants'].append(dict(variant=variant, refinement=rows, reference=estimate))
    cases.append(row)

failures = [a['fullName'] for r in gate['testResults'] for a in r['assertionResults'] if a['status'] == 'failed']
assert len(failures) == gate['numFailedTests']
result = {k: intervals[k] for k in ('source', 'commit', 'node', 'toolHash', 'profile', 'flags', 'worldOptions')}
result.update(note='Unchanged runtime. Frozen-frame reference tests force timing; it is not a repaired native World or an NFL capacity validation.',
    angular={mode: {k: r[k] for k in ('caseCount', 'lawConserved', 'summary')} for mode, r in angular.items()},
    patchGate=dict(total=gate['numTotalTests'], passed=gate['numPassedTests'], failed=gate['numFailedTests'], failures=failures),
    nativeCount=len(native_cases), nativeCompleted=sum(c['native']['ending'] != 'censored' for c in native_cases),
    nativeCensored=sum(c['native']['ending'] == 'censored' for c in native_cases),
    mirrorMaxMotionDifference=mirror_error, native=native_cases, intervals=cases)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2) + '\n')
print(f'{output}: {len(native_cases)} mirrored inputs; patch gate {gate["numPassedTests"]}/{gate["numTotalTests"]}')
