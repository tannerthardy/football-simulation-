"""Verify current receipts and reduce the diagnostic into a compact handoff.
python3 -I scripts/diag/tackle/continued-recovery-report.py out/continued-recovery/final
96 steps is a numerical comparison, not ground truth or a successful ending.
"""
import gzip
import hashlib
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/continued-recovery/final')
baseline = Path(sys.argv[2] if len(sys.argv) > 2 else 'out/phase-recovery')


def read(path):
    with (gzip.open(path, 'rt') if path.suffix == '.gz' else path.open()) as stream:
        return json.load(stream)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def distance(a, b, key='pos'):
    if key == 'support':
        a, b = a['support']['xi'], b['support']['xi']
    else:
        a, b = a[key], b[key]
    return math.hypot(a['x'] - b['x'], a['y'] - b['y'])


def compare(a, b):
    for key in ['initial', 'decisions', 'profiles']:
        assert a[key] == b[key], key
    assert len(a['reports']) == len(b['reports'])
    errors = [max(distance(x, y) for x, y in zip(c['poses'], f['poses']))
              for c, f in zip(a['reports'], b['reports'])]
    times = {round(r['t'] + r['h'], 8): r for r in b['trace']}
    first = {}
    for row in a['trace']:
        t = row['t'] + row['h']
        fine = times.get(round(t, 8))
        if fine is None:
            continue
        for i, (c, f) in enumerate(zip(row['end'], fine['end'])):
            for key, threshold in [('support', .002), ('pos', .01), ('spin', .1), ('facing', .01)]:
                error = distance(c, f, key) if key in ['support', 'pos'] else abs(c[key] - f[key])
                if error > threshold and key not in first:
                    first[key] = dict(t=t, body=i, difference=error)
            if c['support']['state'] != f['support']['state'] and 'state' not in first:
                first['state'] = dict(t=t, body=i, coarse=c['support']['state'], fine=f['support']['state'])
    return dict(maxPositionDifference=max(errors), finalPositionDifference=errors[-1], first=first)


manifest_path = root / 'manifest-continued-recovery.json.gz'
manifest = read(manifest_path)
baseline_manifest = baseline / 'manifest-full.json.gz'
if not baseline_manifest.exists():
    baseline_manifest = baseline / 'manifest.json.gz'
old_manifest = read(baseline_manifest)
assert manifest['source'] == old_manifest['source']
assert manifest['inputDigest'] == old_manifest['inputDigest']
assert len(manifest['runs']) == 24 and not any(r.get('status') == 'failed' for r in manifest['runs'])
for collector in manifest['collectors']:
    assert sha(Path('scripts/diag/tackle') / collector['file']) == collector['sha256'], collector['file']
for run in manifest['runs']:
    assert sha(root / run['file']) == run['sha256'], run['file']

summary = dict(schema='continued-recovery-v1', productionChange=False, source=manifest['source'],
               inputDigest=manifest['inputDigest'], collectors=manifest['collectors'], matrix=[], mirrors=[],
               physical=[], artifacts=[dict(path=str(manifest_path), sha256=sha(manifest_path))],
               limits=['Diagnostic only; bounded ankle target changes unheld behavior in the outer half of the base.',
                       'The ankle target is a reduced-model assumption, not an anatomical or measured COP model.',
                       '96 steps is a comparison, not ground truth.',
                       'Local motor work/heat closure does not certify a full vertical-body energy model.',
                       'No grip capacity, ratings, inertia, default resolution or native controller changed.',
                       'Rear native holds do not finish; angled native endings and trajectories still disagree.',
                       'Two legacy hashes and six existing patch football controls still fail. No promotion.'])
for mode in ['center', 'patch']:
    for side in [1, -1]:
        fine = read(root / f'{mode}-{side}-continued-recovery-96.json.gz')
        for n in [12, 24, 48, 15, 35]:
            coarse = read(root / f'{mode}-{side}-continued-recovery-{n}.json.gz')
            summary['matrix'].append(dict(mode=mode, side=side, n=n, **compare(coarse, fine)))
        del fine
    for n in [12, 24, 48, 96, 15, 35]:
        a = read(root / f'{mode}-1-continued-recovery-{n}.json.gz')
        b = read(root / f'{mode}--1-continued-recovery-{n}.json.gz')
        assert a['profiles'] == b['profiles'] and len(a['reports']) == len(b['reports'])
        mirror_position = mirror_support = mirror_spin = 0
        for ar, br in zip(a['reports'], b['reports']):
            for x, y in zip(ar['poses'], br['poses']):
                mirror_position = max(mirror_position, math.hypot(x['pos']['x']-y['pos']['x'], x['pos']['y']+y['pos']['y']-160/3))
                mirror_support = max(mirror_support, math.hypot(x['support']['xi']['x']-y['support']['xi']['x'], x['support']['xi']['y']+y['support']['xi']['y']))
                mirror_spin = max(mirror_spin, abs(x['spin']+y['spin']))
        summary['mirrors'].append(dict(mode=mode, n=n, position=mirror_position, support=mirror_support, spin=mirror_spin))
        for side, packet in [(1, a), (-1, b)]:
            desired = achieved = command_excess = force_excess = energy_error = coupling = 0
            iterations = 0
            for row in packet['trace']:
                coupling = max(coupling, row['coupling']['residual'])
                iterations = max(iterations, row['coupling']['iterations'])
                for u in row['supportUpdates']:
                    flow, foot = u['phase']['continued'], u['before']['support'].get('foot')
                    energy_error = max(energy_error, abs(flow['commandWork']-flow['work']-flow['dissipation']))
                    assert flow['peakAnkleTarget'] <= u['phase']['input']['rb'] + 1e-8
                    if foot is None:
                        continue
                    desired = max(desired, math.hypot(foot['desired']['x']-flow['requested']['x']/u['h'], foot['desired']['y']-flow['requested']['y']/u['h']))
                    achieved = max(achieved, math.hypot(foot['achieved']['x']-flow['achieved']['x']/u['h'], foot['achieved']['y']-flow['achieved']['y']/u['h']))
                    force_excess = max(force_excess, flow['peakCommandForce']-foot['capacity'])
                    command_excess = max(command_excess, flow['commandWork']-foot['capacity']*u['recovery']*u['h'])
            entry = dict(mode=mode, side=side, n=n, requestedMismatch=desired, achievedMismatch=achieved,
                         commandForceExcess=force_excess, commandWorkExcess=command_excess,
                         motorEnergyResidual=energy_error, couplingResidual=coupling, maxTrials=iterations)
            assert desired <= 1e-8 and achieved <= 1e-8 and coupling <= 1e-9, entry
            assert force_excess <= 1e-8 and command_excess <= 1e-7 and energy_error <= 1e-7, entry
            summary['physical'].append(entry)

one = read(root / 'one-body.json')
assert one['source'] == summary['source']
assert one['kernelSha256'] == sha(Path('scripts/diag/tackle/continued-recovery.ts'))
changing = one['changing']
summary['oneBody'] = dict(sustained=[dict(load=r['load'], finalDeviation=r['state']['xi']['x'], work=r['work']) for r in one['sustained']],
    changingPartitionPositionError=max(abs(r['state']['xi']['x']-changing[0]['state']['xi']['x']) for r in changing[:3]),
    changingPartitionWorkError=max(abs(r['work']-changing[0]['work']) for r in changing[:3]),
    mirrorPositionError=max(abs(a['state']['xi']['x']+b['state']['xi']['x']) for a, b in zip(changing[:3], changing[3:])))

native = read(root / 'native-controls.json')
assert native['source'] == summary['source'] and all(r['profileParity'] for r in native['ordinary'])
summary['ordinary'] = dict(cases=len(native['ordinary']),
    sameEndings=sum(r['baseline']['ending'] == r['candidate']['ending'] for r in native['ordinary']),
    candidateEndings=dict(Counter(r['candidate']['ending'] for r in native['ordinary'])),
    adverseAdvance=[dict(mode=r['mode'], side=r['side'], angle=r['angle'], speed=r['speed'],
        ending=r['candidate']['ending'], delta=r['candidate']['advanceAfterGrip']-r['baseline']['advanceAfterGrip'])
        for r in native['ordinary'] if r['candidate']['advanceAfterGrip'] is not None and r['baseline']['advanceAfterGrip'] is not None
        and r['candidate']['advanceAfterGrip'] > r['baseline']['advanceAfterGrip']])
summary['nativeWitnesses'] = [dict(mode=r['mode'], side=r['side'], n=r['n'], ending=r['result']['ending'],
    finish=r['result']['finish'], advanceAfterGrip=r['result']['advanceAfterGrip'], carrierState=r['result']['carrierState']) for r in native['witnesses']]
summary['controls'] = {}
for mode in ['center', 'patch']:
    log = (root / f'{mode}-controls.log').read_text()
    summary['controls'][mode] = dict(failures=re.findall(r'^ FAIL  (.+)$', log, re.M),
        result=re.findall(r'^\s+Tests\s+(.+)$', log, re.M)[-1])
summary['candidateLaws'] = read(root / 'candidate-lower-law.json')['summary']
assert summary['candidateLaws']['lawPasses'] == summary['candidateLaws']['cases'] == 48
summary['worldLaws'] = {key:max(r[key] for r in manifest['runs']) for key in ['maxWorkResidual', 'maxArmExcess', 'maxSupportExcess']}
assert max(summary['worldLaws'].values()) <= 1e-7

# Preserve the first remaining angular fork, before adding another mechanism.
coarse = read(root / 'patch-1-continued-recovery-12.json.gz')
fine = read(root / 'patch-1-continued-recovery-96.json.gz')
first = compare(coarse, fine)['first']
time = first['spin']['t']
short = next(r for r in coarse['trace'] if abs(r['t']+r['h']-time) < 1e-8)
ref = next(r for r in fine['trace'] if abs(r['t']+r['h']-time) < 1e-8)
summary['firstAngledInterval'] = dict(start=short['t'], h=short['h'], markers=first,
    coarse=dict(start=short['start'], end=short['end'], grip=short['gripsStart'], groundYaw=short['groundYaw'],
                reel=short['reel'], passive=short['passive'], torso=short['torso'], supportUpdates=short['supportUpdates']),
    fine=dict(end=ref['end'], grip=ref['gripsEnd']))
for name in ['one-body.json','native-controls.json','candidate-lower-law.json','center-controls.log','patch-controls.log','research-tests.log']:
    path = root / name
    summary['artifacts'].append(dict(path=str(path), sha256=sha(path)))
(root / 'summary.json').write_text(json.dumps(summary, indent=2)+'\n')
print(json.dumps(dict(out=str(root/'summary.json'), comparisons=len(summary['matrix']), physicalRuns=len(summary['physical']),
                     oneBody=summary['oneBody'], ordinary=summary['ordinary'], laws=summary['worldLaws'])))
