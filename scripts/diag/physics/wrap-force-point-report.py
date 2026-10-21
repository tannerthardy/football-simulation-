"""Reduce the force-point split, paid retry and isolated gait/recovery checks."""
import collections
import hashlib
import json
import math
from pathlib import Path
import subprocess

files = {}


def read(path):
    raw = Path(path).read_bytes()
    files[path] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw)


def key(r):
    return [r['o'], r['d']] + [r['result'][k] for k in ['angle', 'speed', 'cut', 'side', 'seed']]


def end_x(r):
    x = r['result']
    return x['firstGrip']['x'] + x['advanceAfterGrip'] if x['firstGrip'] else None


def summary(p):
    return {'source': p['source'], 'flags': p['flags'], 'n': len(p['rows']),
            'finishes': dict(collections.Counter(r['result']['finish'] for r in p['rows'])),
            'observerNeutral': all(r['observerNeutral'] for r in p['rows'])}


def compare(p, q):
    changes, adverse = [], []
    assert len(p['rows']) == len(q['rows'])
    for a, b in zip(p['rows'], q['rows']):
        assert key(a) == key(b) and a['initial'] == b['initial'] and a['profiles'] == b['profiles']
        x, y = a['result'], b['result']
        done_a, done_b = x['ending'] == 'tackled', y['ending'] == 'tackled'
        if x['finish'] != y['finish']:
            changes.append({'input': key(a), 'before': x['finish'], 'after': y['finish'],
                            'lost': done_a and not done_b, 'gained': done_b and not done_a})
        xa, xb = end_x(a), end_x(b)
        if done_a and done_b and xa is not None and xb is not None and xb > xa + .1:
            adverse.append({'input': key(a), 'beforeEndX': xa, 'afterEndX': xb})
    return {'lost': sum(c['lost'] for c in changes), 'gained': sum(c['gained'] for c in changes),
            'changes': changes, 'adverseCompletedAdvances': adverse}


paths = {'base-matched': 'out/reach-transition/finish.json', 'base-touch-matched': 'out/reach-transition/touch.json',
         'base-fresh': 'out/reach-contact/fresh-finish.json', 'base-touch-fresh': 'out/reach-transition/fresh-touch.json'}
for name in ['gait-matched', 'gait-touch-matched', 'gait-fresh', 'gait-touch-fresh',
             'base-new', 'base-touch-new', 'gait-new', 'gait-touch-new']:
    paths[name] = 'out/wrap-force-point/' + name + '.json'
panels = {k: read(p) for k, p in paths.items()}
comparisons = {a + '_to_' + b: compare(panels[a], panels[b]) for a, b in [
    ('base-matched', 'gait-matched'), ('base-fresh', 'gait-fresh'), ('base-new', 'gait-new'),
    ('gait-matched', 'gait-touch-matched'), ('gait-fresh', 'gait-touch-fresh'), ('gait-new', 'gait-touch-new'),
    ('base-touch-matched', 'gait-touch-matched'), ('base-touch-fresh', 'gait-touch-fresh')]}
assert all(r['observerNeutral'] for p in panels.values() for r in p['rows'])
factorial = read('out/wrap-force-point/factorial.json')
zero = read('out/wrap-force-point/gait-zero-factorial.json')
gait_factorial = read('out/wrap-force-point/gait-factorial.json')
assert factorial['cases'] == zero['cases']

retry = {}
for kind, before in [('rear', 'out/slow-rear/native-rear.json'), ('shallow', 'out/slow-rear/early-rear.json'),
                     ('fresh', 'out/reach-transition/fresh-final.json'), ('small', 'out/reach-transition/small-final.json')]:
    p = read(before)
    q = read('out/wrap-force-point/retry-' + kind + '.json')
    retry[kind] = {'comparison': compare(p, q), 'summary': summary(q),
        'rows': [{'input': key(r), 'finish': r['result']['finish'], 'interventions': r['interventions'],
                  'attempts': [{k: a.get(k) for k in ['t', 'kind', 'legs', 'capacity']} for a in r['result']['attempts']]}
                 for r in q['rows']]}

native = {k: read('out/wrap-force-point/' + k + '.json') for k in [
    'gait-gains', 'gait-gains-native-48', 'gait-gains-native-96',
    'zero-gains-native-48', 'zero-gains-native-96', 'continued-native-12', 'continued-native-96']}
fine_comparison = {str(n): compare(native['zero-gains-native-' + str(n)], native['gait-gains-native-' + str(n)])
                   for n in [48, 96]}
refinement = read('out/wrap-force-point/gait-gain-refinement.json')
assert all(c['runs'][0]['maxPositionVsNative'] < 1e-7 for c in refinement['cases'])

intervals = {k: read('out/wrap-force-point/' + p + '.json') for k, p in [
    ('legacy-raw', 'loaded-interval'), ('continued-raw', 'continued-interval'),
    ('legacy-witness', 'witness-legacy'), ('continued-witness', 'witness-continued')]}
for p in intervals.values():
    assert len({r['incomingSha256'] for r in p['runs']}) == 1
    assert all(abs(f['workResidual']) < 1e-8 for r in p['runs'] for f in r['results'])
for name in ['legacy', 'continued']:
    # Compact witness reproduces actual state; format/provenance metadata may differ.
    assert intervals[name + '-raw']['runs'] == intervals[name + '-witness']['runs']
read('data/reviews/current/loaded-wrap-prefix-witness.json')
agreement = []
for a, b in zip(native['continued-native-12']['rows'], native['continued-native-96']['rows']):
    assert key(a) == key(b) and a['initial'] == b['initial'] and a['profiles'] == b['profiles']
    by_time = {round(f['t'], 6): f for f in b['frames']}
    assert len(a['frames']) == len(b['frames'])
    distances = [math.hypot(f['end'][actor]['pos']['x'] - by_time[round(f['t'], 6)]['end'][actor]['pos']['x'],
                            f['end'][actor]['pos']['y'] - by_time[round(f['t'], 6)]['end'][actor]['pos']['y'])
                 for f in a['frames'] for actor in ['c', 'd']]
    agreement.append({'input': key(a), 'maxPositionDifference': max(distances),
        'advance12': a['result']['advanceAfterGrip'], 'advance96': b['result']['advanceAfterGrip'],
        'holdDepthRanges': [[min(f['before']['joint']['legs'] for f in r['frames'] if f['before']['joint']),
                            max(f['before']['joint']['legs'] for f in r['frames'] if f['before']['joint'])] for r in [a, b]]})

validation = {}
for name in ['typecheck', 'build', 'gait-focused']:
    path = 'out/wrap-force-point/' + name + '.log'
    raw = Path(path).read_bytes()
    assert b'error TS' not in raw
    if name == 'gait-focused':
        assert b'97 passed' in raw and b'6 passed' in raw
    files[path] = hashlib.sha256(raw).hexdigest()
    validation[name] = {'path': path, 'sha256': files[path]}

def compact_factorial(p):
    columns = ['mode', 'steps', 'firstCarrierFall', 'endState', 'maxPositionVs96',
               'maxTripSource', 'maxBelowKneeShare', 'minHeightRatio']
    return [{'input': c['input'], 'label': c['label'], 'initialDepth': c['initialDepth'],
             'targetDepth': c['targetDepth'], 'interventionAt': c['interventionAt'],
             'columns': columns, 'runs': [[r[k] for k in columns] for r in c['runs']]} for c in p['cases']]


report = {'protocol': 'wrap-force-point-review-v1', 'parentCommit': '23de24f',
    'engineSource': factorial['source'], 'gaitSource': zero['source'],
    'isolation': {'base': '23de24f', 'borrowedFile': 'src/physics/kinematics.ts', 'borrowedFrom': '839bf3b',
                  'borrowedFileSha256': hashlib.sha256(subprocess.check_output(
                      ['git', 'show', '839bf3b:src/physics/kinematics.ts'])).hexdigest(),
                  'controllerUpdatesImported': False, 'gaitOffExactFactorialParity': True},
    'panels': {k: summary(p) for k, p in panels.items()}, 'comparisons': comparisons,
    'factorial': compact_factorial(factorial), 'gaitFactorial': compact_factorial(gait_factorial),
    'paidRetry': retry,
    'nativeRefinement': {k: {'source': p['source'], 'flags': p['flags'], 'substeps': p.get('substeps', 'adaptive'),
        'recoveryExperiment': p.get('recoveryExperiment'), 'recoverySourcesSha256': p.get('recoverySourcesSha256'),
        'rows': [{'input': key(r), 'result': {k: r['result'][k] for k in
                  ['finish', 'ending', 'endWhy', 'firstGrip', 'advanceAfterGrip', 'carrierState']},
                 'observerNeutral': r['observerNeutral']}
                 for r in p['rows']]} for k, p in native.items()},
    'nativeFineComparisons': fine_comparison, 'frozenRefinement': refinement, 'continuedNativeAgreement': agreement,
    'rawAndCompactWitnessStateParity': True,
    'samePrefix': {k: {'source': p['source'], 'continued': p.get('continued', k.startswith('continued')),
        'runs': [{'steps': r['steps'], 'incomingSha256': r['incomingSha256'],
                  'incomingCarrierXi': r['incoming']['bodies'][1]['support']['xi'],
                  'boundaries': [{'after': f['after'], 'carrierXi': f['carrier']['support']['xi'],
                                  'carrierState': f['carrier']['support']['state'], 'workResidual': f['workResidual']}
                                 for f in r['results']]} for r in p['runs']]} for k, p in intervals.items() if k.endswith('witness')},
    'validation': validation,
    'limits': ['Height substitution crosses the knee transition; it is not a physical re-grab.',
        'Paid retry uses existing reach, miss/fumble draws and 0.5 s attempt cooldown; anatomical hand motion is not resolved.',
        '30 matched/30 fresh/12 new completed spots advance >0.1 yd with gait; retain them.',
        'Coarse gait gain count is not robust: two inputs remain censored at 48/96 and one changes category.',
        'At fine resolution the 90-degree straight gain is already a finish without gait.',
        'Continued-recovery uses unchanged primary diagnostic code; native comparison covers one mirrored input only.',
        'Within each same-prefix variant, all forks share incoming state; legacy and continued prefixes intentionally differ.',
        'No production engine file or default changed; no full-game or new blind NFL claim.']}
for path in ['src/physics/kinematics.ts', 'src/physics/world.ts', 'scripts/diag/physics/wrap-force-point.ts',
             'scripts/diag/physics/loaded-wrap-interval.ts', 'scripts/diag/physics/reach-transition.ts',
             'scripts/diag/physics/reach-transition-refinement.ts', 'scripts/diag/physics/reach-contact-panel.ts',
             'scripts/diag/physics/wrap-force-point-report.py', 'scripts/diag/tackle/grip-refinement.ts',
             'scripts/diag/tackle/continued-recovery.ts', 'scripts/diag/tackle/continued-recovery-world.ts']:
    files[path] = hashlib.sha256(Path(path).read_bytes()).hexdigest()
report['filesSha256'] = files
Path('out/wrap-force-point/receipt.json').parent.mkdir(parents=True, exist_ok=True)
Path('out/wrap-force-point/receipt.json').write_text(json.dumps(report, indent=2) + '\n')
print('out/wrap-force-point/receipt.json')
