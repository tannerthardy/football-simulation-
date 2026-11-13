"""Compact receipts for the integration pass; raw histories remain in out/."""
import hashlib
import json
import statistics
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/run-game-integration')
destination = Path(sys.argv[2] if len(sys.argv) > 2 else root / 'receipt.json')
artifacts = {}


def read(name):
    path = root / (name + '.json')
    raw = path.read_bytes()
    artifacts[path.name] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw)


def mean(values):
    return statistics.mean(values) if values else None


def contact(row):
    return next((f for f in row['frames'] if f['positiveGrasp'] or
                 sum(c['impulse'] for c in f['body']) > 0), None)


def sample(row, clock):
    return next((f for f in row['frames'] if abs(f['after'] - clock) < 1e-7), None)


def physics_key(row):
    r = row['result']
    return tuple(row[k] for k in ('o', 'd')) + tuple(r[k] for k in ('angle', 'speed', 'cut', 'side', 'seed'))


def physics_pair(base_name, candidate_name):
    b, c = read(base_name), read(candidate_name)
    assert b['source'] == c['source'] and b['flags'] == c['flags']
    cases = []
    for old, new in zip(b['rows'], c['rows'], strict=True):
        assert old['observerNeutral'] and new['observerNeutral']
        assert physics_key(old) == physics_key(new)
        assert old['initial'] == new['initial'] and old['profiles'] == new['profiles']
        first = contact(old)
        clocks = {} if first is None else {str(dt): round(first['after'] + dt, 8) for dt in (.2, .8)}
        arms = {}
        for label, row in [('baseline', old), ('candidate', new)]:
            r = row['result']
            loaded = contact(row)
            early = sample(row, clocks['0.2']) if clocks else None
            alive = sample(row, clocks['0.8']) if clocks else None
            arms[label] = {
                'ending': r['ending'], 'finish': r['finish'], 'endWhy': r['endWhy'],
                'endTime': row['frames'][-1]['after'], 'endX': row['frames'][-1]['end']['c']['pos']['x'],
                'advanceAfterGrip': r['advanceAfterGrip'], 'firstGrip': r['firstGrip'],
                'firstPhysicalContact': None if loaded is None else {
                    'interval': [loaded['t'], loaded['after']],
                    'depthAfterInterval': loaded['end']['c']['pos']['x'] - 40},
                'speedAtBaselineContactPlus02': None if early is None else
                    (early['end']['c']['vel']['x'] ** 2 + early['end']['c']['vel']['y'] ** 2) ** .5,
                'liveAtBaselineContactPlus08': None if not clocks else bool(alive and alive['end']['c']['state'] == 'up'),
                'maxMomentumResidual': max(f['residual'] for f in row['frames']),
                'workAndArmSupportBudgetsAssertedDuringCollection': True,
            }
        cases.append({'input': physics_key(old), 'profiles': old['profiles'], 'clocks': clocks, **arms})
    return {'source': b['source'], 'flags': b['flags'], 'candidateHelpers': c['recoverySourcesSha256'],
            'n': len(cases), 'baselineFinishes': sum(x['baseline']['ending'] == 'tackled' for x in cases),
            'candidateFinishes': sum(x['candidate']['ending'] == 'tackled' for x in cases),
            'cases': cases}


def refinement(coarse_name, fine_name):
    coarse, fine = read(coarse_name), read(fine_name)
    assert coarse['source'] == fine['source'] and coarse['flags'] == fine['flags']
    lookup = {physics_key(r): r for r in coarse['rows']}
    cases = []
    for row in fine['rows']:
        old = lookup[physics_key(row)]
        assert row['observerNeutral'] and old['observerNeutral']
        assert row['initial'] == old['initial'] and row['profiles'] == old['profiles']
        positions = []
        first = None
        for f in old['frames']:
            g = sample(row, f['after'])
            if g is None:
                continue
            error = max(((f['end'][a]['pos']['x'] - g['end'][a]['pos']['x']) ** 2 +
                         (f['end'][a]['pos']['y'] - g['end'][a]['pos']['y']) ** 2) ** .5 for a in ('c', 'd'))
            positions.append(error)
            if first is None and error > .1:
                first = {'time': f['after'], 'coarse': f['end'], 'fine': g['end'],
                         'coarseRequest': f['requests'], 'fineRequest': g['requests'],
                         'coarseGrips': f['acquired'], 'fineGrips': g['acquired']}
        cases.append({'input': physics_key(row), 'coarseEnding': old['result']['ending'],
                      'fineEnding': row['result']['ending'], 'maxCommonBoundaryPathDifference': max(positions),
                      'firstPathDifferenceOver01': first})
    return {'source': coarse['source'], 'cases': cases}


def flow(name):
    p = read(name)
    groups = {}
    for concept, g in p['groups'].items():
        groups[concept] = {'n': g['n'], 'unchanged': g['unchanged'], 'arms': g['arms']}
    return {'baseline': p['baselineProvenance'], 'candidate': p['candidateProvenance'], 'groups': groups,
            'cases': [{'id': c['id'], 'unchanged': c['unchanged'], 'firstDivergence': c['firstDivergence'],
                       **{arm: {k: c[arm][k] for k in ('endTime', 'rightCensored', 'observedGain', 'firstRBContact')}
                          for arm in ('baseline', 'candidate')}} for c in p['cases']]}


receipt = {'protocol': 'run-game-integration-v1',
           'measurement': 'Native paired inputs; actual positive grasp load or body impulse. Fixed live boundaries; no final-frame substitution. NFL averages are not tuning targets.'}
live, final = read('default-live-gaps'), read('default-final')
assert live['inputs'] == final['inputs']
assert all(b['hashes'] == c['hashes'] for b, c in zip(live['panel'], final['panel'], strict=True))
receipt['defaults'] = {'n': len(final['panel']), 'allStateAndRngFingerprintsMatch': True,
                       'archiveBranch': 'claude/live-gaps', 'archiveCommit': 'b50fa37a',
                       'archiveSource': live['provenance']['sourceSha256'], 'finalSource': final['provenance']['sourceSha256'],
                       'note': 'Archive collector used the host repository for its parent commit label; archive bytes and source hash identify the actual baseline.'}
receipt['flow'] = {name: flow(name + '-pull-summary') for name in ('fresh', 'new')}
receipt['flow']['shared'] = flow('pull-summary')
receipt['physics'] = {name: physics_pair(*pair) for name, pair in {
    'matched12': ('recovery-base-12', 'recovery-candidate-12'),
    'matched48': ('recovery-base-48', 'recovery-candidate-48'),
    'new12': ('recovery-new-base-12', 'recovery-new-candidate-12'),
    'patch12': ('recovery-patch-base-12', 'recovery-patch-candidate-12'),
    'patch48': ('recovery-patch-base-48', 'recovery-patch-candidate-48'),
}.items()}
receipt['refinement'] = {'candidate': refinement('recovery-candidate-12', 'recovery-candidate-48'),
                         'baseline': refinement('recovery-base-12', 'recovery-base-48'),
                         'patchCandidate': refinement('recovery-patch-candidate-12', 'recovery-patch-candidate-48')}
hands, recovery = read('hands-motor'), read('hands-recovery')
assert hands['source'] == recovery['source'] and hands['flags'] == recovery['flags']
receipt['hands'] = {'source': hands['source'], 'flags': hands['flags'], 'nMirroredDrillsPerArm': len(hands['rows']),
                    'cases': [{'mode': b['mode'], 'drill': b['drill'], 'baseline': b['measurements'],
                               'candidate': c['measurements'], 'maxMirrorDifference': max(b['mirror'], c['mirror'])}
                              for b, c in zip(hands['rows'], recovery['rows'], strict=True)]}
receipt['crossPair'] = {name: {k: p[k] for k in ('source', 'inputSha256', 'recoveryExperiment', 'substeps',
                       'nativeFullStepMaxDifference', 'reducedFalls', 'residual', 'pairResidual', 'requested')}
                       for name in ('cross-pair-base-12', 'cross-pair-candidate-12', 'cross-pair-candidate-48')
                       for p in [read(name)]}
rejected = read('recovery-journal-rejected')
receipt['measurementRepair'] = {'retainedFailedCaptures': len(rejected['rows']),
                               'reason': 'Live-body impulse observer missed accepted scratch-World impulses; trial-local journals now follow acceptance. No physical law or guard relaxed.'}
receipt['artifactsSha256'] = artifacts
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(receipt, separators=(',', ':')) + '\n')
if len(sys.argv) > 3:
    compact = json.loads(json.dumps(receipt))
    for stage in compact['flow'].values():
        for g in stage['groups'].values():
            for arm in g['arms'].values():
                arm['linebackers'] = {k: v for k, v in arm['linebackers'].items() if k in ('2', '3')}
        for row in stage['cases']:
            for name in ('baseline', 'candidate'):
                c = row[name]['firstRBContact']
                if c is not None:
                    row[name]['firstRBContact'] = {k: c[k] for k in ('timeInterval', 'depthAfterStep')}
    path = Path(sys.argv[3])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(compact, separators=(',', ':')) + '\n')
    print(path, path.stat().st_size, 'bytes (compact receipt)')
print(destination, destination.stat().st_size, 'bytes')
for name, p in receipt['physics'].items():
    print(name, p['n'], 'finishes', p['baselineFinishes'], '->', p['candidateFinishes'])
for row in receipt['refinement']['candidate']['cases']:
    print('refinement', row['input'], row['coarseEnding'], row['fineEnding'], row['maxCommonBoundaryPathDifference'])
