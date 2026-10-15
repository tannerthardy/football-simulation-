"""Measure saved combination-departure comparisons; no simulation imports.

Inputs are the decoded PR #50 final captures and this branch's native captures.
The parent inside-zone packet is the one predeclared same-roster transfer.
This measures contact/protection evidence, not successful blocks from load alone.
"""
import argparse
import csv
import gzip
import hashlib
import json
from pathlib import Path
import time


def read(path):
    return json.loads(gzip.decompress(path.read_bytes()))


def digest(value):
    return hashlib.sha256(json.dumps(value, separators=(',', ':')).encode()).hexdigest()


def distance(a, b):
    return ((a['x']-b['x'])**2+(a['y']-b['y'])**2)**.5


def arm(case, climber, down, keeper, backer):
    contacts = [{'entry': f['t'], **c} for f in case['frames'] for c in f['report']['contacts']
                if {c['i'], c['j']} == {climber, down} and c['impulse'] > 1e-8]
    teammate = [{'entry': f['t'], **c} for f in case['frames'] for c in f['report']['contacts']
                if case['actors'][c['i']]['team'] == case['actors'][c['j']]['team'] and c['impulse'] > 1e-8]
    loads = {}
    for f in case['frames']:
        for j in f['jointOutputs']:
            if j['kind'] != 'hands':
                continue
            n, t = abs(j.get('normalForce') or 0), abs(j.get('tangentForce') or 0)
            if max(n, t) <= 1e-8:
                continue
            for i, k in [(j['a'], j['b']), (j['b'], j['a'])]:
                if i not in [climber, keeper] or k < 11:
                    continue
                key = f'{i}:{k}'
                record = loads.setdefault(key, {'normalImpulse': 0, 'tangentImpulse': 0,
                    'firstEntry': f['t'], 'lastBoundary': f['after']})
                record['normalImpulse'] += n*f['dt']
                record['tangentImpulse'] += t*f['dt']
                record['lastBoundary'] = f['after']
    nearest = min((distance(f['afterBodies'][climber]['pos'], f['afterBodies'][backer]['pos']), f['after'])
                  for f in case['frames'])
    reports = [f['report'] for f in case['frames']]
    return {'handoffAt': case['handoffAt'], 'end': case['end'], 'censored': case['censored'],
        'releaseEvents': [e for e in case['events'] if e['type'] == 'block_climb'],
        'climberDownContacts': contacts, 'climberDownImpulse': sum(c['impulse'] for c in contacts),
        'firstClimberDownImpulse': contacts[0]['impulse'] if contacts else 0,
        'teammateImpacts': teammate, 'handLoadsByActualPair': loads,
        'assignedBackerNearest': {'distance': nearest[0], 'boundary': nearest[1]},
        'runnerContacts': [{'entry': f['t'], **c} for f in case['frames'] for c in f['report']['contacts'] if 6 in [c['i'], c['j']]],
        'runnerFinalPosition': case['frames'][-1]['afterBodies'][6]['pos'],
        'keeperFinalPosition': case['frames'][-1]['afterBodies'][keeper]['pos'],
        'downFinalPosition': case['frames'][-1]['afterBodies'][down]['pos'],
        'maxAbsWorkResidual': max(abs(r['work']['residual']) for r in reports),
        'maxPenetration': max(r['maxPenetration'] for r in reports),
        'supportIntegrationFailures': sum(r['supportIntegrationFailures'] for r in reports),
        'maxArmImpulseOverLimit': max(x-l for r in reports for x, l in zip(r['armImpulse'], r['armImpulseLimit'])),
        'maxArmWorkOverLimit': max(x-l for r in reports for x, l in zip(r['armWork'], r['armWorkLimit']))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ['parent', 'candidate', 'candidate-h', 'parent-tite', 'candidate-tite', 'transfer-parent', 'transfer-candidate']:
        parser.add_argument('--'+flag, type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    started = time.perf_counter()
    caps = {name: read(getattr(args, name.replace('-', '_'))) for name in
            ['parent', 'candidate', 'candidate-h', 'parent-tite', 'candidate-tite', 'transfer-parent', 'transfer-candidate']}
    pairs = [('strong-Y', 'parent', 'candidate', 'uc12-wz-s3', 4, 14, 1, 15),
             ('strong-H', 'parent', 'candidate-h', 'uc12-wz-s3-mirror', 3, 14, 4, 15),
             ('weak-H', 'parent', 'candidate', 'uc12-wz-weak-s3', 2, 13, 5, 17),
             ('Tite', 'parent-tite', 'candidate-tite', 'uc12-wz-s3-tite-fresh', 3, 13, 5, 17),
             ('inside-zone', 'transfer-parent', 'transfer-candidate', 'uc12-iz-s3-transfer', 3, 14, 4, 16)]
    result = {'protocol': 'combination-departure-report-v1', 'captures': {}, 'cases': []}
    rows, witnesses = [], []
    for name, cap in caps.items():
        path = getattr(args, name.replace('-', '_'))
        result['captures'][name] = {k: cap[k] for k in ['revision', 'sourceSha256', 'flags', 'worldDefaults',
            'initialization', 'manifestSha256', 'collectorSha256', 'lockSha256', 'node', 'newWorldSteps', 'elapsedSeconds']}
        result['captures'][name]['packetSha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    for label, old_name, new_name, case_id, climber, down, keeper, backer in pairs:
        old_cap, new_cap = caps[old_name], caps[new_name]
        assert old_cap['flags'] == new_cap['flags'] and old_cap['worldDefaults'] == new_cap['worldDefaults']
        old, new = [next(c for c in cap['panel'] if c['input']['id'] == case_id) for cap in [old_cap, new_cap]]
        assert old['input'] == new['input'] and len(old['frames']) == len(new['frames'])
        assert old['initializedInformation'] == new['initializedInformation']
        for a, b in zip(old['actors'], new['actors']):
            for key in ['idx', 'slot', 'player', 'profile', 'initialBody']:
                assert a[key] == b[key], (label, key)
        case = {'label': label, 'input': old['input'], 'climber': climber, 'down': down,
            'keeper': keeper, 'assignedBacker': backer, 'arms': {}}
        for name, cap in [('parent', old), ('candidate', new)]:
            case['arms'][name] = arm(cap, climber, down, keeper, backer)
            for f in cap['frames']:
                c = f['afterBodies'][climber]
                rows.append({'case': label, 'arm': name, 'entry': f['t'], 'boundary': f['after'],
                    'raw_vx': f['requested'][climber]['vel']['x'], 'raw_vy': f['requested'][climber]['vel']['y'],
                    'final_vx': f['final'][climber]['vel']['x'], 'final_vy': f['final'][climber]['vel']['y'],
                    'entry_vx': f['beforeBodies'][climber]['vel']['x'], 'entry_vy': f['beforeBodies'][climber]['vel']['y'],
                    'achieved_vx': c['vel']['x'], 'achieved_vy': c['vel']['y'],
                    'achieved_x': c['pos']['x'], 'achieved_y': c['pos']['y'],
                    'posture': c['support']['posture'], 'support': c['support']['state'],
                    'runner_x': f['afterBodies'][6]['pos']['x'], 'runner_y': f['afterBodies'][6]['pos']['y'],
                    'keeper_x': f['afterBodies'][keeper]['pos']['x'], 'keeper_y': f['afterBodies'][keeper]['pos']['y'],
                    'down_x': f['afterBodies'][down]['pos']['x'], 'down_y': f['afterBodies'][down]['pos']['y'],
                    'assignedBackerDistance': distance(c['pos'],f['afterBodies'][backer]['pos']),
                    'climberDownImpulse': sum(c['impulse'] for c in f['report']['contacts'] if {c['i'], c['j']} == {climber, down})})
        changed = [(a, b) for a, b in zip(old['frames'], new['frames']) if a['final'] != b['final']]
        case['identicalExecutedBodiesAndFinalCommands'] = all(a['afterBodies'] == b['afterBodies'] and a['final'] == b['final'] for a, b in zip(old['frames'], new['frames']))
        case['firstChangedFinalCommand'] = changed[0][0]['t'] if changed else None
        case['maxRunnerSeparation'] = max(distance(a['afterBodies'][6]['pos'], b['afterBodies'][6]['pos']) for a, b in zip(old['frames'], new['frames']))
        case['firstChangedRunnerRawRequest'] = next((a['t'] for a, b in zip(old['frames'], new['frames']) if a['requested'][6] != b['requested'][6]), None)
        if changed:
            a, b = changed[0]
            case['equalBodiesBeforeFirstChange'] = a['beforeBodies'] == b['beforeBodies']
            if 'observerState' in a:
                case['equalObserverBeforeFirstChange'] = a['observerState'] == b['observerState']
                case['equalRngBeforeFirstChange'] = a['rngBefore'] == b['rngBefore']
            # Portable all-player first-action witness, with consumed pictures.
            witnesses.append({'label': label, 'input': old['input'], 'actors': old['actors'],
                'parentRevision': old_cap['revision'], 'candidateRevision': new_cap['revision'],
                'sameEntryBodies': case['equalBodiesBeforeFirstChange'],
                'parent': {'frame': a, 'cues': [c for c in old['cues'] if c['t'] == a['t']]},
                'candidate': {'frame': b, 'cues': [c for c in new['cues'] if c['t'] == b['t']]}})
        assert case['arms']['parent']['releaseEvents'] == case['arms']['candidate']['releaseEvents'], label
        assert case['arms']['parent']['handoffAt'] == case['arms']['candidate']['handoffAt'], label
        result['cases'].append(case)
    result.update({'newWorldSteps': 0, 'elapsedSeconds': time.perf_counter()-started,
        'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()})
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out/'summary.json').write_text(json.dumps(result, indent=2)+'\n')
    (args.out/'first-actions.json.gz').write_bytes(gzip.compress(json.dumps(witnesses, separators=(',', ':')).encode(), mtime=0))
    with (args.out/'timeline.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator='\n'); writer.writeheader(); writer.writerows(rows)
    print(json.dumps({'newWorldSteps': 0, 'elapsedSeconds': result['elapsedSeconds'],
        'cases': [{k: c[k] for k in ['label', 'identicalExecutedBodiesAndFinalCommands', 'firstChangedFinalCommand', 'maxRunnerSeparation']} for c in result['cases']]}))


if __name__ == '__main__':
    main()
