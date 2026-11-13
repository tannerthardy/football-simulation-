"""Reduce retained native film and the two bounded positioning interventions.

python3 scripts/diag/trench/keeper-position-summary.py out/run-game-contact OUTPUT
No new simulations, late-frame clamping or proximity contact labels.
"""
import gc
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

spec = importlib.util.spec_from_file_location('contact_summary', Path(__file__).with_name('contact-summary.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
root, output = map(Path, sys.argv[1:])
ids = {i['id'] for i in json.loads(Path('data/reviews/run-game-contact/input-manifest-positioning.json').read_text())['inputs']}
native = {}
receipts = {}


def read(name):
    path = root / (name + '.json')
    data = json.loads(path.read_text())
    receipts[name] = {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                      'provenance': data['provenance']}
    return data


def compact(rep):
    row = module.digest(rep)
    for key in ['commands', 'movement', 'snapshots', 'episodes']:
        row.pop(key)
    return row


for arm in ['baseline', 'offense']:
    for name in ['focus-' + arm, 'fresh-' + arm]:
        data = read(name)
        for rep in data['panel']:
            if rep['input']['id'] in ids:
                native.setdefault(rep['input']['id'], {})[arm] = compact(rep)
        del data
        gc.collect()

interventions = {}
for mode in ['one-beat-runoff', 'omit-rg-track']:
    name = 'keeper-' + mode
    data = read(name)
    interventions[mode] = json.loads((root / (name + '.json.interventions.json')).read_text())
    for rep in data['panel']:
        row = compact(rep)
        old = native[rep['input']['id']]['offense']
        base = native[rep['input']['id']]['baseline']
        assert row['input'] == old['input'] == base['input']
        assert row['capacityHash'] == old['capacityHash'] == base['capacityHash']
        assert row['initialHash'] == old['initialHash'] == base['initialHash']
        assert row['observerNeutral']
        different = next((i for i, (a, b) in enumerate(zip(old['hashes'], row['hashes'])) if a != b), None)
        row['firstStateDifferenceFromOffense'] = None if different is None else rep['frames'][different]['t']
        row['identicalBaselineFullState'] = row['hashes'] == base['hashes']
        row['crossPair'] = [{'t': f['t'], 'after': f['after'], **c}
            for f in rep['frames'] for c in f['contacts'] if {c['i'], c['j']} == {4, 14}]
        row['falls'] = [e for e in rep['events'] if e['type'] == 'fall']
        native[rep['input']['id']][mode] = row
    del data
    gc.collect()

timeline = {}
for arm, name in [('baseline', 'control-loaded'), ('offense', 'regression-loaded')]:
    data = read(name)
    rep = data['panel'][0]
    rows = []
    for f in rep['frames']:
        if f['t'] not in [.75, 1.1, 1.35, 1.6, 1.85, 2.1, 2.25, 2.45]:
            continue
        rows.append({'t': f['t'], 'after': f['after'],
            'actorsAfterStep': [{k: a.get(k) for k in ['slot', 'pos', 'vel', 'facing', 'applied', 'blocker', 'zone']}
                for a in f['agents'] if a['slot'] in ['LG', 'RG', 'DT_S', 'DT_W', 'RB']],
            'consumedBeforeStep': [e for e in f['contactEvents'] if e['phase'] == 'movement' and e['blocker'] in [4, 5]],
            'contactsDuringStep': [c for c in f['contacts'] if c['i'] in [4, 5, 13, 14] and c['j'] in [4, 5, 13, 14]]})
    timeline[arm] = {'rows': rows,
        'climbs': [e for e in rep['events'] if e['type'] == 'block_climb'],
        'keeperNeighborCues': [c for f in rep['frames'] for c in f['cues'] if c['defender'] == 4 and c['opponent'] == 14],
        'firstShed': {slot: next(({'t': f['t'], 'cue': next(c for c in f['cues'] if c['defender'] == idx and c['opponent'] == 6)}
            for f in rep['frames'] if any(a['id'] == idx and 'shed-attempt' in a['tags'] for a in f['agents'])), None)
            for slot, idx in [('DT_S', 13), ('DT_W', 14)]},
        'firstCrossPair': next(({'t': f['t'], 'after': f['after'], **c}
            for f in rep['frames'] for c in f['contacts'] if {c['i'], c['j']} == {4, 14}), None)}
    del data
    gc.collect()

for arms in native.values():
    for row in arms.values():
        row.pop('hashes')
        # Retain first encounter, not a full post-fall pile-up transcript.
        if 'crossPair' in row:
            row['firstCrossPair'] = next(iter(row.pop('crossPair')), None)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps({'schema': 'keeper-position-v1', 'receipts': receipts,
    'cases': native, 'timeline': timeline, 'interventions': interventions,
    'limits': ['Retained original source and matched input/profile hashes; native defense/runner reactions continue.',
               'Wrapper records both the recorded and plain execution; duplicated interventions are intentional.',
               'Actor poses are post-step; consumed requests and support are pre-step; impacts occur within that interval.',
               'Cross contact requires a native collision impulse; grip/LOS times use the existing contact summary operator.',
               'No modified production policy or physics. One-beat phase retention is a causal probe, not an optimized policy.']},
    separators=(',', ':')) + '\n')
print(output)
