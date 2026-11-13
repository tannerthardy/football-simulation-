"""Reduce native panels, live-only game observations and fixed-tape refinement.
python3 scripts/diag/physics/wrap-binding-report.py out/wrap-binding OUTPUT
"""
import collections
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import statistics
import sys

sys.path.insert(0, 'scripts/mechanics')
from metrics import Play

root, output = map(Path, sys.argv[1:])
receipts = {}


def read(path):
    raw = path.read_bytes()
    receipts[str(path)] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw)


def median(values):
    values = [v for v in values if v is not None and math.isfinite(v)]
    return statistics.median(values) if values else None


def aggregate(rows):
    return {'n': len(rows), 'finishes': dict(collections.Counter(r['finish'] for r in rows)),
            'observedAdvanceAfterGripMedian': median(r['advanceAfterGrip'] for r in rows),
            'grips': sum(sum('grip' in a['kind'] for a in r['attempts']) for r in rows),
            'brokenGrips': sum(sum(bool(a.get('broke')) for a in r['attempts'] if 'grip' in a['kind']) for r in rows),
            'censoring': 'Time-limit/sideline/goal censored endpoints are observations, not completed tackle advances.'}


def pairs(a, b):
    assert len(a) == len(b)
    changes = []
    for old, new in zip(a, b):
        keys = ['angle', 'speed', 'cut', 'side', 'seed'] + (['o', 'd', 'rosterHash'] if 'o' in old else [])
        assert all(old[k] == new[k] for k in keys)
        if old['finish'] != new['finish'] or abs((old['advanceAfterGrip'] or 0) - (new['advanceAfterGrip'] or 0)) > 1e-8:
            changes.append({'input': {k: old[k] for k in keys}, 'before': old, 'after': new})
    return {'endingTransitions': dict(collections.Counter(x['before']['finish'] + ' -> ' + x['after']['finish'] for x in changes)),
            'lostTackles': [x for x in changes if x['before']['ending'] == 'tackled' and x['after']['ending'] != 'tackled'],
            'adverseCompletedAdvance': [x for x in changes if x['before']['ending'] == x['after']['ending'] == 'tackled'
                and x['after']['advanceAfterGrip'] is not None and x['before']['advanceAfterGrip'] is not None
                and x['after']['advanceAfterGrip'] > x['before']['advanceAfterGrip'] + .01],
            'allChanges': changes}


def reduced_change(change):
    # Detailed force/attempt tapes remain in the source-pinned native outputs.
    return {'input': change['input'], **{arm: {k: change[arm].get(k) for k in
        ['ending', 'finish', 'advanceAfterGrip', 'firstGrip', 'contactToEnd', 'carrierState']}
        for arm in ['before', 'after']}}


arms = ['baseline', 'brace', 'brace-roll', 'bind-only', 'bind-brace', 'bind-brace-roll']
panels = {arm: read(root / ('after-' + arm + '.json')) for arm in arms}
parity = {}
for arm in arms[:3]:
    before = read(root / ('before-' + arm + '.json'))
    assert before['rows'] == panels[arm]['rows']
    parity[arm] = {'rows': len(before['rows']), 'exactNativeOutcomes': True,
                   'originalSource': before['sourceBefore'], 'currentSource': panels[arm]['sourceBefore']}
source = panels['baseline']['sourceBefore']
assert all(p['sourceBefore'] == p['sourceAfter'] == source for p in panels.values())
fresh = {arm: read(root / ('fresh-' + arm + '.json')) for arm in ['baseline', 'brace-roll', 'bind-brace-roll']}
assert all(p['sourceBefore'] == p['sourceAfter'] == source for p in fresh.values())

refinement = {arm: read(root / ('refinement-' + arm) / 'summary.json') for arm in ['control', 'bind']}
for a, b in zip(refinement['control']['cases'], refinement['bind']['cases']):
    assert a['id'] == b['id'] and a['initial'] == b['initial'] and a['profiles'] == b['profiles']
    assert a['observerNeutral'] and b['observerNeutral']

games = {}
for arm in ['baseline', 'brace-roll', 'bind-brace-roll']:
    cohort = []
    for seed in [211, 212]:
        native = read(root / 'games' / f'{arm}-{seed}.review.json')
        assert native['sourceBefore'] == native['sourceAfter'] == source
        rows = [r for r in native['plays'] if r['kind'] == 'run' and not r.get('nullified')]
        common = {r['id']: r for r in map(json.loads, gzip.open(root / 'games' / f'{arm}-{seed}.jsonl.gz', 'rt'))}
        contacts = []
        missing = 0
        for r in rows:
            raw = common.get(r['id'])
            if raw is None or raw.get('carrier') is None:
                missing += 1
                continue
            carrier = raw['carrier']
            handoff = next((e for e in r['events'] if e['type'] in ['handoff', 'pitch_catch']), None)
            contact = next((e for e in r['events'] if e['type'] == 'carrier_contact' and e.get('a') == carrier
                            and (not handoff or e['t'] >= handoff['t'])), None)
            if not contact:
                continue
            p = Play(raw)
            t = contact['t']
            if not p.live(t) or t > (len(raw['xy']) - 1) * p.dt + 1e-9:
                missing += 1
                continue
            first = p.k(t)
            if p.speed(carrier, first) < 2:
                continue
            fall = next((e for e in r['events'] if e['type'] == 'fall' and e.get('a') == carrier and e['t'] >= t), None)
            # An absent fall is not inferred from a generic tackle label.
            samples = {}
            for off in [.2, .4, .8, 1.0]:
                live = p.live(t + off) and t + off <= (len(raw['xy']) - 1) * p.dt + 1e-9
                samples[str(off)] = {'live': live, 'speed': p.speed(carrier, p.k(t + off)) if live else None}
            contacts.append({'id': r['id'], 't': t, 'kind': contact.get('note'),
                             'speed': p.speed(carrier, first), 'samples': samples,
                             'firstFallAfterContact': None if not fall else fall['t'] - t,
                             'ending': r['outcome'], 'gain': r['yards']})
        cohort.append({'seed': seed, 'rosterHash': native['cohort']['rosterSha256'],
            'runSnaps': len(rows), 'yardsPerRun': statistics.mean(r['yards'] for r in rows),
            'games': native['games'], 'movingActualContactRuns': len(contacts), 'unsupportedOrMissing': missing,
            'contactCurves': {str(off): {'live': sum(r['samples'][str(off)]['live'] for r in contacts),
                'denominator': len(contacts), 'speedSamples': sum(r['samples'][str(off)]['speed'] is not None for r in contacts),
                'medianLiveSpeed': median(r['samples'][str(off)]['speed'] for r in contacts)} for off in [.2, .4, .8, 1.0]},
            'carrierFalls': sum(r['firstFallAfterContact'] is not None for r in contacts), 'contactRows': contacts})
    games[arm] = cohort
for i in range(2):
    assert len({games[a][i]['rosterHash'] for a in games}) == 1


def checks(name):
    path = root / name
    value = path.read_text()
    receipts[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    line = next((s.strip() for s in value.splitlines() if re.search(r'^\s*Tests\s+\d', s)), None)
    return {'result': line, 'failures': [s.strip() for s in value.splitlines() if s.startswith(' FAIL ')],
            'lastLines': value.splitlines()[-16:]}


matched = pairs(panels['brace-roll']['rows'], panels['bind-brace-roll']['rows'])
fresh_changes = pairs(fresh['brace-roll']['rows'], fresh['bind-brace-roll']['rows'])
for comparison in [matched, fresh_changes]:
    for key in ['allChanges', 'lostTackles', 'adverseCompletedAdvance']:
        comparison[key] = [reduced_change(c) for c in comparison[key]]
result = {'schema': 'force-transmitted-wrap-binding-v1', 'source': source,
    'originalBranchCommit': '5a1888743fada76a1534571843072df88574aefb',
    'originalPhysicsSource': parity['baseline']['originalSource'],
    'defaults': {'WRAP_BIND': False, 'LEG_BRACE': False, 'TACKLE_ROLL': False, 'RUN_READ': False, 'RUN_READ_TURN': False},
    'existingArmParity': parity, 'panel': {a: aggregate(p['rows']) for a, p in panels.items()},
    'matchedBindingComparison': matched,
    'freshPanel': {a: aggregate(p['rows']) for a, p in fresh.items()},
    'freshBindingComparison': fresh_changes,
    'refinement': refinement, 'freshGames': games,
    'checks': {name: checks(name) for name in ['tests-all.log', 'tests-data.log', 'binding-laws.log',
        'enabled-controls.log', 'prior-enabled-scenario.log', 'patch-default-controls.log',
        'patch-enabled-controls.log', 'typecheck.log', 'build.log']},
    'limits': ['The security-to-coupling map is a reduced-model hypothesis, not measured limb/wrap geometry.',
        'Current prototype arms use the same source and inputs; baseline pre/post outcomes are exactly preserved.',
        'Frozen tapes within each arm isolate numerical refinement; 96 steps is not ground truth.',
        'Game rosters/seeds match at initialization; later calls, situations and RNG diverge.',
        'Game curves use canonical carrier_contact after possession, live-only 0.1-second tracking and smoothed derived speeds.',
        'Grip acquisition can initially transmit zero force. Native panel first-attempt markers are not NFL first contact.',
        'Observed advances in censored panel plays are not completed tackle distances.',
        'Thirty new force/geometry/work assertions pass; existing Tite and enabled roll mirror failures remain unchanged.'],
    'receipts': receipts}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, separators=(',', ':')) + '\n')
print(output)
