"""Bounded four-arm contact audit. Native impulses/grips, exact live times.

python3 scripts/diag/trench/contact-summary.py out/run-game-contact OUTPUT
Detailed bodies and pictures remain in the input traces, not this receipt.
"""
import collections
import gc
import hashlib
import json
import math
from pathlib import Path
import statistics
import sys

ARMS = ('baseline', 'offense', 'defense', 'combined')
OL = {'LT', 'LG', 'C', 'RG', 'RT'}
BOX = OL | {'DE_S', 'DT_S', 'DT_W', 'DE_W', 'LB_M', 'LB_S', 'LB_W'}
TIMES = (.5, 1, 1.5, 2, 3)


def sha(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def digest(rep):
    slots = {p['id']: p['slot'] for p in rep['players']}
    rb = next(i for i, slot in slots.items() if slot == 'RB')
    defenders = {p['id'] for p in rep['players'] if p['team'] == 'D'}
    side = rep['side']
    episodes, owners = {}, {}
    movement = collections.defaultdict(lambda: collections.Counter())
    snapshots, commands = {}, []
    first_body = None
    los = None
    wraps = [e for e in rep['events'] if e.get('b') == rb and (e['type'] == 'tackle_wrap'
             or (e['type'] == 'hit' and e.get('note') == 'diving tackle'))]
    handoff = next((e['t'] for e in rep['events'] if e['type'] == 'handoff'), None)
    for frame in rep['frames']:
        agents = {a['id']: a for a in frame['agents']}
        commands.append(sha([(a['applied']['vel'], a['applied'].get('facing')) for a in frame['agents']]))
        if handoff is not None and frame['t'] >= handoff:
            r = agents[rb]
            if los is None and r['pos']['x'] >= 40:
                los = {'t': frame['t'], 'after': frame['after'], 'y': r['pos']['y']}
            if first_body is None:
                hits = [c for c in frame['contacts'] if c['impulse'] > 0 and
                        ((c['i'] == rb and c['j'] in defenders) or (c['j'] == rb and c['i'] in defenders))]
                if hits:
                    defender = hits[0]['j'] if hits[0]['i'] == rb else hits[0]['i']
                    block = next((b for b in frame['blocks'] if b['defender'] == defender), None)
                    first_body = {'t': frame['t'], 'after': frame['after'], 'depth': r['pos']['x'] - 40,
                                  'defender': slots[defender], 'activeBlock': block is not None,
                                  'owner': slots[block['blocker']] if block else None,
                                  'loadedOwnerHands': bool(block and block['hands'] and
                                     (block['hands'].get('normal', 0) or block['hands'].get('tangent', 0)))}
        for t in TIMES:
            if abs(frame['after'] - t) < 1e-7:
                snapshots[str(t)] = {slots[i]: {'lateral': (a['pos']['y'] - rep['initial'][i]['y']) * side,
                    'requested': a['requested']['vel']['y'] * side, 'applied': a['applied']['vel']['y'] * side,
                    'achieved': a['vel']['y'] * side, 'facing': a['facing'], 'support': a['support']['state']}
                    for i, a in agents.items() if slots[i] in BOX}
        for event in frame.get('contactEvents', []):
            idx = (event['rep'], event['blocker'])
            previous = owners.get(event['rep'])
            if previous is not None and previous != idx and episodes[previous]['end'] is None:
                episodes[previous].update(end=event['t'], reason='keeper promotion / ownership transition')
            owners[event['rep']] = idx
            e = episodes.setdefault(idx, {'blocker': slots[event['blocker']], 'defender': slots[event['defender']],
                'start': event['t'], 'end': None, 'reason': 'still recorded / censored', 'firstWrongReach': None,
                'firstTorsoPast90': None, 'firstSupportFailure': None, 'firstOutsideUnloadedHands': None,
                'firstConsumedHandLoad': None})
            if event['phase'] == 'end':
                e.update(end=event['t'], reason=event['reason'])
            elif event['phase'] == 'geometry':
                if event['off'] > math.pi / 2 and e['firstTorsoPast90'] is None:
                    e['firstTorsoPast90'] = event['t']
                if event['support']['state'] != 'up' and e['firstSupportFailure'] is None:
                    e['firstSupportFailure'] = event['t']
            elif event['phase'] == 'movement' and slots[event['blocker']] in OL:
                a = agents[event['blocker']]
                kind = (a.get('work') or {}).get('kind', 'unknown')
                phase = (a.get('zone') or {}).get('phase')
                if event['helpers'] or (a.get('work') or {}).get('combination', {}).get('released') is False:
                    technique = 'combination'
                elif phase and kind == 'reach':
                    technique = 'solo-' + phase
                else:
                    technique = kind
                row = movement[technique]
                row['ticks'] += 1
                row['requested'] += event['command']['vel']['y'] * side
                row['achieved'] += a['vel']['y'] * side
                row['anchorTicks'] += int(event['anchored'])
                row['feedbackOpposesOvertake'] += int(event['feedback'] * event['lat']['y'] * side < -.5
                    and (event['blockerVel']['y'] - event['defenderVel']['y']) * side > .1)
                row['wrongReachTicks'] += int(technique == 'solo-reach' and event['command']['vel']['y'] * side < -1e-9)
                if technique == 'solo-reach' and event['command']['vel']['y'] * side < -1e-9 and e['firstWrongReach'] is None:
                    e['firstWrongReach'] = event['t']
                h = event.get('hands')
                if h and (h.get('normal', 0) or h.get('tangent', 0)) and e['firstConsumedHandLoad'] is None:
                    e['firstConsumedHandLoad'] = event['t']
                if e['firstConsumedHandLoad'] is not None and h and not event['helpers'] and not h.get('normal', 0) and not h.get('tangent', 0) and math.dist(
                        event['blockerPos'].values(), event['defenderPos'].values()) > h['extension']:
                    if e['firstOutsideUnloadedHands'] is None:
                        e['firstOutsideUnloadedHands'] = event['t']
        for end in frame.get('ends', []):
            e = episodes.get((end['rep'], end['blocker']))
            if e and e['end'] is None:
                e.update(end=end['t'], reason='outside contact updater / ownership transition')
            if e:
                e['endSupport'] = {'blocker': end['blockerBody']['support']['state'],
                                   'defender': end['defenderBody']['support']['state']}
                if e['endSupport']['blocker'] != 'up' and e['firstSupportFailure'] is None:
                    e['firstSupportFailure'] = end['t']
    first_grip = None
    if wraps:
        wrap = min(wraps, key=lambda e: e['t'])
        frame = next((f for f in rep['frames'] if abs(f['t'] - wrap['t']) < 1e-7), None)
        depth = next(a['pos']['x'] - 40 for a in frame['agents'] if a['id'] == rb) if frame else None
        first_grip = {'t': wrap['t'], 'depth': depth, 'defender': slots.get(wrap.get('a')),
                      'kind': 'dive' if wrap['type'] == 'hit' else 'wrap'}
    encounters = [x['t'] for x in (first_body, first_grip) if x]
    first = min(encounters) if encounters else None
    arrival = 'unreached-censored' if rep['live'] else 'unreached-ended'
    if los:
        arrival = 'clean' if first is None or first >= los['after'] else 'interrupted'
        if first is not None and los['t'] <= first < los['after']:
            arrival = 'same-step-uncertain'
    return {'input': rep['input'], 'side': side, 'observedGain': rep['gain'], 'endTime': rep['endTime'],
            'rightCensored': rep['live'], 'handoff': handoff, 'los': los, 'arrival': arrival,
            'firstBodyContact': first_body, 'firstGrip': first_grip, 'movement': dict(movement),
            'episodes': list(episodes.values()), 'snapshots': snapshots, 'commands': commands,
            'hashes': rep['hashes'], 'observerNeutral': rep['observerNeutral'],
            'capacityHash': sha([p.get('profile') for p in rep['players']]), 'initialHash': sha(rep['initial'])}


def cohort(root, prefix):
    arms, receipts = {}, {}
    for arm in ARMS:
        path = root / (prefix + arm + '.json')
        raw = json.loads(path.read_text())
        arms[arm] = [digest(r) for r in raw['panel']]
        receipts[arm] = {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                         'provenance': raw['provenance']}
        print(prefix + arm, len(arms[arm]), flush=True)
        del raw
        gc.collect()
    cases = []
    for rows in zip(*(arms[a] for a in ARMS)):
        assert all(r['input'] == rows[0]['input'] and r['capacityHash'] == rows[0]['capacityHash']
                   and r['initialHash'] == rows[0]['initialHash'] and r['observerNeutral'] for r in rows)
        case = {'id': rows[0]['input']['id'], 'concept': rows[0]['input']['concept'], 'arms': {}}
        baseline_commands, baseline_hashes = rows[0]['commands'], rows[0]['hashes']
        for arm, row in zip(ARMS, rows):
            first = next((i for i, (b, c) in enumerate(zip(baseline_commands, row['commands'])) if b != c), None)
            row['firstCommandDifference'] = first * .05 if first is not None else None
            row['unchanged'] = baseline_hashes == row['hashes']
            row.pop('commands'); row.pop('hashes')
            case['arms'][arm] = row
        cases.append(case)
    aggregates = {}
    for arm in ARMS:
        rows = [c['arms'][arm] for c in cases]
        by_concept = {}
        for concept in sorted({r['input']['concept'] for r in rows}):
            reps = [r for r in rows if r['input']['concept'] == concept]
            by_concept[concept] = {'n': len(reps), 'rightCensored': sum(r['rightCensored'] for r in reps),
                'observedGain': statistics.mean(r['observedGain'] for r in reps),
                'arrival': dict(collections.Counter(r['arrival'] for r in reps)),
                'unchanged': sum(r['unchanged'] for r in reps)}
        totals = collections.defaultdict(collections.Counter)
        endings = collections.Counter()
        late_ol_endings = collections.Counter()
        for r in rows:
            for technique, measures in r['movement'].items(): totals[technique].update(measures)
            for e in r['episodes']:
                endings[e['reason']] += 1
                if e['blocker'] in OL and (e['end'] if e['end'] is not None else r['endTime']) >= 1.5:
                    late_ol_endings[e['reason']] += 1
        aggregates[arm] = {'concepts': by_concept, 'movement': dict(totals), 'episodeEndReasons': dict(endings),
                           'lateLinemenEndReasons': dict(late_ol_endings)}
    witnesses = []
    for case in cases:
        if case['id'] in ('oz_strong-s3', 'wz_strong-s3-mirror', 'oz_strong-s19-mirror-fresh'):
            witnesses.append({'id': case['id'], 'arms': {arm: {k: row[k] for k in ('episodes', 'snapshots')}
                              for arm, row in case['arms'].items() if arm in ('baseline', 'offense')}})
        for row in case['arms'].values():
            row['endReasons'] = dict(collections.Counter(e['reason'] for e in row['episodes']))
            for k in ('episodes', 'snapshots', 'movement', 'input', 'capacityHash', 'initialHash'):
                row.pop(k)
    return {'receipts': receipts, 'aggregates': aggregates, 'cases': cases, 'selectedWitnesses': witnesses}


if __name__ == '__main__':
    root, output = map(Path, sys.argv[1:])
    result = {'schema': 'run-game-contact-v1', 'matched': cohort(root, ''), 'fresh': cohort(root, 'fresh-'),
        'units': {'position': 'yd', 'velocity': 'yd/s', 'time': 's'},
        'limits': ['Only identical preplay inputs are paired; resulting paths and openings respond to each arm.',
                   'Body contact requires a positive native impulse; grip is an acquired wrap or successful diving leg hold, proximity is not contact.',
                   'Clean arrival means crossing LOS before body/grip encounter; within-step ordering is uncertain.',
                   'Object lifetime and zero hand force alone do not establish protection or separation.',
                   'Five-second live stops are right censored; observed spots are not final gains.',
                   'D is the previously parked PULL_PLAN trial, not a newly promoted defensive cue fix.']}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, separators=(',', ':')) + '\n')
