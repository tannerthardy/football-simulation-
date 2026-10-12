"""Compact current-run receipt; 96 steps is a comparison, never ground truth.
python3 -I scripts/diag/tackle/phase-refinement-report.py out/phase-recovery
Reads the baseline, final phase runs, and the explicitly failed source trial.
"""
import gzip
import hashlib
import json
import math
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/phase-recovery')


def read(path):
    with gzip.open(path, 'rt') as stream:
        return json.load(stream)


def distance(a, b, key):
    if key == 'support':
        a, b = a['support']['xi'], b['support']['xi']
    else:
        a, b = a[key], b[key]
    return math.hypot(a['x'] - b['x'], a['y'] - b['y'])


def compare(coarse, fine):
    assert coarse['initial'] == fine['initial']
    assert coarse['decisions'] == fine['decisions']
    assert coarse['profiles'] == fine['profiles']
    assert len(coarse['reports']) == len(fine['reports'])
    errors = [max(distance(x, y, 'pos') for x, y in zip(a['poses'], b['poses']))
              for a, b in zip(coarse['reports'], fine['reports'])]
    times = {round(r['t'] + r['h'], 8): r for r in fine['trace']}
    first = {}
    for row in coarse['trace']:
        t = row['t'] + row['h']
        reference = times.get(round(t, 8))
        if reference is None:
            continue
        for i, (a, b) in enumerate(zip(row['end'], reference['end'])):
            error = distance(a, b, 'support')
            if error > .002 and 'support' not in first:
                first['support'] = dict(t=t, body=i, difference=error)
            if a['support']['state'] != b['support']['state'] and 'state' not in first:
                first['state'] = dict(t=t, body=i, coarse=a['support']['state'], fine=b['support']['state'])
    return dict(maxPositionDifference=max(errors), finalPositionDifference=errors[-1], first=first,
                comparison='matched 20 Hz endpoints; first markers at common achieved boundaries')


summary = dict(schema='reconstructed-recovery-phase-v1', productionChange=False,
               provenance='f8ba412 committed runner/evidence recovered; missing uncommitted experiment reconstructed',
               source=read(root / 'inputs.json.gz')['source'], matrix=[], sourceTrial=[], artifacts=[],
               limits=['96 steps is not ground truth.',
                       'Source trial is rejected; do not impute incomplete runs as successful outcomes.',
                       'The phase kernel freezes radial direction and input loads over each interval.',
                       'Only dive transitions are deferred to achieved boundaries; other fall timing remains unchanged.',
                       'Law/work closure and local crossing accuracy do not establish tackle convergence.'])
baseline_manifest = root / 'manifest-full.json.gz'
if not baseline_manifest.exists():
    baseline_manifest = root / 'manifest.json.gz'
for manifest in [baseline_manifest, root / 'final/manifest-phase-phase-timing.json.gz',
                 root / 'manifest-phase-source.json.gz']:
    packet = read(manifest)
    assert packet['source'] == summary['source']
    folder = manifest.parent
    for run in packet['runs']:
        path = folder / run['file']
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        assert actual == run['sha256'], str(path)
    summary['artifacts'].append(dict(path=str(manifest), sha256=hashlib.sha256(manifest.read_bytes()).hexdigest(),
                                     collectors=packet['collectors'], runs=len(packet['runs'])))

for mode in ['center', 'patch']:
    for side in [1, -1]:
        for variant in ['full', 'phase', 'phase-timing']:
            folder = root if variant == 'full' else root / 'final'
            fine = read(folder / f'{mode}-{side}-{variant}-96.json.gz')
            for n in ([12, 24, 48] if variant == 'full' else [12, 24, 48, 15, 35]):
                coarse = read(folder / f'{mode}-{side}-{variant}-{n}.json.gz')
                summary['matrix'].append(dict(mode=mode, side=side, variant=variant, n=n,
                                               **compare(coarse, fine)))
            del fine

manifest = read(root / 'manifest-phase-source.json.gz')
for run in manifest['runs']:
    if run.get('status') == 'failed':
        error = json.loads(run['message'].removeprefix('Error: '))
        a = error['candidateInput']
        summary['sourceTrial'].append(dict(mode=run['mode'], side=run['side'], n=run['n'], status='failed',
            t=error['time'], body=error['body'], input=a,
            insideBoundaryRate=-a['w'] * a['rb'] - a['loadVelocity'],
            outsideBoundaryRate=-a['speed'] * min(a['outsideFor']/a['latency'], 1) - a['loadVelocity'],
            file=run['file']))
    else:
        summary['sourceTrial'].append(dict(mode=run['mode'], side=run['side'], n=run['n'],
                                           status='completed', final=run['final'], file=run['file']))

rear = read(root / 'final/center-1-phase-timing-12.json.gz')
row = next(r for r in rear['trace'] if abs(r['t'] - 2.125) < 1e-7)
update = next(u for u in row['supportUpdates'] if u['i'] == 1)
phase = update['phase']
a = phase['input']
initial = update['before']['support']['xi']['x']
displacement = phase['delta']['x']
force = -a['loadVelocity'] + displacement/a['h']
crossing = math.log((force-a['w']*initial)/(force-a['w']*a['rb']))/a['w']
summary['firstRearCrossing'] = dict(provenance='reconstructed frozen-input phase-timing interval',
    time=row['t'], body=1, input=a, initial=initial, continuousDisplacement=displacement,
    continuousForce=force, crossingAfter=crossing, expectedOutsideClock=a['h']-crossing,
    phaseClock=phase['candidate']['outsideFor'], phaseEnd=update['after']['support']['xi']['x'])
(root / 'first-rear-crossing.json').write_text(json.dumps(summary['firstRearCrossing'], indent=2)+'\n')
output = root / 'summary.json'
output.write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(dict(out=str(output), comparisons=len(summary['matrix']),
                      failedSourceRuns=sum(r['status'] == 'failed' for r in summary['sourceTrial']))))
