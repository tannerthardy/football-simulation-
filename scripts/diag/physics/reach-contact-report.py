"""Reduce actual force-bearing contact intervals, preserving censored outcomes.
python3 scripts/diag/physics/reach-contact-report.py out/reach-contact OUTPUT
Raw histories stay under out/; the small receipt pins source, inputs and tools.
"""
import collections
import gzip
import hashlib
import json
import math
import re
from pathlib import Path
import statistics
import sys

root, output = map(Path, sys.argv[1:])
files = {}


def read(name):
    path = root / name
    raw = path.read_bytes()
    files[str(path)] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw)


def median(values):
    values = [v for v in values if v is not None]
    return statistics.median(values) if values else None


def key(row):
    return [row['o'], row['d']] + [row['result'][k] for k in ['angle', 'speed', 'cut', 'side', 'seed']]


def norm(v):
    return math.hypot(v['x'], v['y'])


def marker(frame):
    if frame is None:
        return None
    c, d = frame['before']['c'], frame['before']['d']
    dx, dy = d['pos']['x'] - c['pos']['x'], d['pos']['y'] - c['pos']['y']
    distance = math.hypot(dx, dy)
    return {'intervalStart': frame['t'], 'intervalEnd': frame['after'],
            'distance': distance, 'runnerSpeed': norm(c['vel']),
            'closing': ((c['vel']['x'] - d['vel']['x']) * dx
                        + (c['vel']['y'] - d['vel']['y']) * dy) / distance}


def metrics(row):
    frames = row['frames']
    acquired = next((f for f in frames if f['acquired']), None)
    torso = next((f for f in frames if norm(f['channels']['torso']) > 1e-9), None)
    load = next((f for f in frames if f['positiveGrasp'] or norm(f['channels']['torso']) > 1e-9), None)
    curves = {}
    for off in [.2, .4, .8]:
        for clock, start in [('load', load), ('torso', torso)]:
            at = None if start is None else next((f for f in frames if abs(f['after'] - start['t'] - off) < 1e-8), None)
            curves[f'{clock}+{off}'] = {'sampled': at is not None,
                'speedChange': None if at is None else norm(at['end']['c']['vel']) - norm(start['before']['c']['vel'])}
    early = [] if load is None else [f for f in frames if load['t'] - 1e-8 <= f['t'] < load['t'] + .2 - 1e-8]
    return {'input': key(row), 'finish': row['result']['finish'], 'endWhy': row['result']['endWhy'],
        'advanceAfterGrip': row['result']['advanceAfterGrip'],
        'acquisition': marker(acquired), 'firstLoad': marker(load), 'firstTorso': marker(torso), 'curves': curves,
        'first02TorsoImpulse': sum(h['impulse'] for f in early for h in f['body']),
        'first02CarrierChannels': {channel: {axis: sum(f['channels'][channel][axis] for f in early)
            for axis in ['x', 'y']} for channel in ['torso', 'grasp', 'other']},
        'maxMomentumResidual': max(f['residual'] for f in frames)}


def aggregate(rows):
    curves = {k: {'samples': sum(r['curves'][k]['sampled'] for r in rows), 'denominator': len(rows),
                  'medianSpeedChange': median(r['curves'][k]['speedChange'] for r in rows)}
              for k in rows[0]['curves']}
    return {'n': len(rows), 'finishes': dict(collections.Counter(r['finish'] for r in rows)),
        'acquired': sum(r['acquisition'] is not None for r in rows),
        'loaded': sum(r['firstLoad'] is not None for r in rows),
        'torsoLoaded': sum(r['firstTorso'] is not None for r in rows),
        'firstLoadMedianDistance': median(r['firstLoad']['distance'] for r in rows if r['firstLoad']),
        'firstLoadMedianClosing': median(r['firstLoad']['closing'] for r in rows if r['firstLoad']),
        'first02MedianTorsoImpulse': median(r['first02TorsoImpulse'] for r in rows if r['firstLoad']),
        'maxMomentumResidual': max(r['maxMomentumResidual'] for r in rows), 'curves': curves}


arms = ['default', 'finish', 'reach', 'reach-finish', 'acquire-finish',
        'fresh-finish', 'fresh-reach-finish', 'fresh-acquire-finish']
panels = {a: read(a + '.json') for a in arms}
source = panels['default']['source']
assert all(p['source'] == source for p in panels.values())
assert all(r['observerNeutral'] for p in panels.values() for r in p['rows'])
reduced = {a: list(map(metrics, p['rows'])) for a, p in panels.items()}
inputs = {}
for a, p in panels.items():
    inputs[a] = [{'input': key(r), 'initial': r['initial'], 'profiles': r['profiles']} for r in p['rows']]
assert all(inputs[a] == inputs['default'] for a in arms[:5])
assert all(inputs[a] == inputs['fresh-finish'] for a in arms[5:])
parity = {}
for a in ['default', 'finish']:
    before = read('before-' + a + '.json')
    assert before['rows'] == [r['result'] for r in panels[a]['rows']]
    parity[a] = {'rows': len(before['rows']), 'exactNativeResultParity': True, 'originalSource': before['sourceBefore']}
budget_parity = {}
for a in arms:
    old = read('pre-budget-' + a + '.json')
    assert old['rows'] == panels[a]['rows']
    budget_parity[a] = {'exactResultsAndFrames': True, 'oldSource': old['source']}


def compare(old, new):
    result = []
    for a, b in zip(reduced[old], reduced[new]):
        assert a['input'] == b['input']
        done_a = a['finish'] in ['physical fall', 'stopped progress']
        done_b = b['finish'] in ['physical fall', 'stopped progress']
        if a['finish'] != b['finish'] or done_a and done_b and abs(a['advanceAfterGrip'] - b['advanceAfterGrip']) > .01:
            result.append({'input': a['input'], 'before': {k: a[k] for k in ['finish', 'advanceAfterGrip']},
                           'after': {k: b[k] for k in ['finish', 'advanceAfterGrip']},
                           'lostFinish': done_a and not done_b, 'gainedFinish': done_b and not done_a})
    return {'lostFinishes': sum(r['lostFinish'] for r in result), 'gainedFinishes': sum(r['gainedFinish'] for r in result),
            'transitions': dict(collections.Counter(r['before']['finish'] + ' -> ' + r['after']['finish'] for r in result)),
            'allChangedFinishesOrCompletedAdvance': result,
            'advanceCaveat': 'Grip acquisition happens earlier in reach arms; advanceAfterGrip clocks differ. Do not interpret as paired NFL YAC.'}


refinement = {a: read('refinement-' + a + '/summary.json') for a in ['finish', 'reach']}
assert all(p['source'] == source for p in refinement.values())
fixed = {a: read('fixed-span-' + a + '.json') for a in ['finish', 'reach-finish', 'acquire-finish']}
stages = {a: {**aggregate(list(map(metrics, p['rows']))), 'source': p['source'],
              'flags': p['flags'], 'noBrace': p['noBrace']} for a, p in fixed.items()}
representatives = []
for angle, speed in [(45, 6), (90, 6), (0, 8)]:
    selected = {a: next(r for r in panels[a]['rows'] if key(r) == [61, 62, angle, speed, False, 1, 3001])
                for a in ['finish', 'reach-finish', 'acquire-finish']}
    old = {round(f['t'], 8): f for f in selected['finish']['frames']}
    details = {}
    for a, row in selected.items():
        fs = row['frames']
        first = next(i for i, f in enumerate(fs) if f['positiveGrasp'])
        retained = [fs[i] for i in sorted({first, min(first + 2, len(fs) - 1),
            min(first + 4, len(fs) - 1), min(first + 8, len(fs) - 1), len(fs) - 1})]
        details[a] = {'result': row['result'], 'frames': retained,
            'firstRequestedDifference': next((f['t'] for f in fs if round(f['t'], 8) in old
                and f['requests'] != old[round(f['t'], 8)]['requests']), None),
            'firstAchievedDifference': next((f['t'] for f in fs if round(f['t'], 8) in old
                and f['end'] != old[round(f['t'], 8)]['end']), None)}
    representatives.append({'input': key(selected['finish']), 'arms': details})
manifest = {'protocol': 'reach-contact-inputs-v1', 'matched': inputs['default'], 'fresh': inputs['fresh-finish']}
manifest_path = Path('data/reviews/reach-contact/input-manifest.json')
manifest_path.parent.mkdir(parents=True, exist_ok=True)
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
tapes = []
for case_id in ['center-45-6-1', 'center-45-6--1', 'center-90-6-1']:
    path = root / 'refinement-reach' / (case_id + '.json.gz')
    files[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    data = json.loads(gzip.decompress(path.read_bytes()))
    assert data['source'] == source
    tapes.append({'id': case_id, 'captured': data['captured']})
tape_path = manifest_path.parent / 'closure-tapes.json.gz'
tape_path.write_bytes(gzip.compress(json.dumps({'source': source,
    'flags': refinement['reach']['flags'], 'cases': tapes}).encode(), mtime=0))
validation = {}
for name in ['test-all', 'test-data', 'typecheck', 'build', 'enabled-controls', 'final-focused']:
    path = root / (name + '.log')
    raw = path.read_bytes()
    files[str(path)] = hashlib.sha256(raw).hexdigest()
    text = raw.decode()
    if name == 'test-all':
        assert re.search(r'Tests\s+1 failed \| 1612 passed', text)
        assert 'FAIL  |core| test/zone-helper-check.test.ts' in text
    if name == 'test-data':
        assert 'Ran 141 tests' in text and '\nOK' in text
    if name in ['typecheck', 'build']:
        assert 'error TS' not in text
    if name == 'enabled-controls':
        assert re.search(r'Tests\s+2 failed \| 187 passed', text)
    validation[name] = {'path': str(path), 'sha256': files[str(path)]}
validation['preservedFailures'] = {'defaults': ['test/zone-helper-check.test.ts:440 (existing Tite)'],
    'experimentalCombined': ['test/scenario-pack.test.ts:23 (approach finish regression)',
                            'test/tackle-wait-constraints.test.ts:129 (experimental earlier acquisition changes waiting)']}
closure_replay = read('closure-replay.json')
assert closure_replay['source'] == closure_replay['recordedSource'] == source
receipt = {'protocol': 'reach-contact-review-v1', 'baseCommit': '1ac71650b6dc41812e782656792f884a669d696b',
    'source': source, 'promoted': False, 'default': 'off',
    'measurement': {'contact': 'First World interval with nonzero transmitted grip force or actual torso impulse; acquisition/proximity alone is not contact.',
        'clock': 'Speed before that force-bearing interval to actual boundary at +0.2/+0.4/+0.8 s, 20 Hz. No terminal extension or clamped samples.',
        'censoring': 'Native time-limit/sideline endpoints remain censored, not tackles. Later sample counts reflect survival.',
        'channels': 'Actual carrier velocity changes across native impulse execution; ground from StepReport. Torso scalar impulse includes real collisions only.',
        'ablation': 'acquire-finish deletes brace before World, retaining earlier standing-reach acquisition and no reel. Diagnostic only.'},
    'flags': {a: {k: panels[a][k] for k in ['flags', 'noBrace', 'fresh', 'patch', 'collector']} for a in arms},
    'disabledParity': parity, 'budgetCorrectionParity': budget_parity,
    'inputManifest': {'path': str(manifest_path), 'sha256': hashlib.sha256(manifest_path.read_bytes()).hexdigest()},
    'closureTapes': {'path': str(tape_path), 'sha256': hashlib.sha256(tape_path.read_bytes()).hexdigest(),
        'use': 'Mirrored losing native decision/body/grip tapes plus unchanged diving control; replay with the wrap-binding-refinement operator. No imposed recorded slip or compression.'},
    'matchedAndFresh': {a: aggregate(r) for a, r in reduced.items()}, 'firstFixedSpanTrial': stages,
    'comparisons': {a + '_to_' + b: compare(a, b) for a, b in [
        ('finish', 'reach-finish'), ('finish', 'acquire-finish'),
        ('fresh-finish', 'fresh-reach-finish'), ('fresh-finish', 'fresh-acquire-finish')]},
    'refinement': refinement,
    'representatives': representatives,
    'closureReplay': closure_replay, 'validation': validation,
    'sourceFiles': {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in map(Path, [
        'scripts/diag/physics/reach-contact-panel.ts', 'scripts/diag/physics/reach-contact-report.py',
        'scripts/diag/physics/reach-contact-replay.ts',
        'scripts/diag/physics/wrap-binding-refinement.ts', 'test/reach-contact.test.ts'])},
    'rawFiles': files}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(receipt, indent=2) + '\n')
for a, summary in receipt['matchedAndFresh'].items():
    print(a, summary['finishes'], summary['curves']['load+0.2'])
