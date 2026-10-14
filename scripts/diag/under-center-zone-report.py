"""Offline reduction of three declared under-center plays; never runs simulations.

Use the native, pin and components packets/launcher receipts under the chosen
output directory. The committed compact receipt retains each exact input and
history digest so a later collector can check it without the original film.
"""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', nargs='?', default='out/under-center-zone')
args = parser.parse_args()
root = Path(args.directory)


def read(path):
    return json.loads(Path(path).read_text())


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def packet(name):
    return json.loads(gzip.decompress((root / f'{name}.json.gz').read_bytes()))


def metrics(play):
    slots = {a['id']: a['slot'] for a in play['players']}
    rb = next(i for i, s in slots.items() if s == 'RB')
    first = next((e for e in play['events'] if e['type'] == 'carrier_contact'
                  and rb in [e.get('a'), e.get('b')]), None)
    crossing = next((f['after'] for f in play['frames'] if f.get('carrier') == rb
                     and f['agents'][rb]['pos']['x'] >= 40), None)
    approach = 'ended-unreached' if crossing is None else 'clean' if not first or first['t'] > crossing \
        else 'same-step-uncertain' if first['t'] >= crossing - .05 - 1e-8 else 'interrupted'
    loaded = {}
    limits = dict(armImpulseExcess=0, armWorkExcess=0, supportWorkExcess=0, workResidual=0)
    projection = {}
    for frame in play['frames']:
        pi = frame['physicsInput']
        report = pi['report']
        limits['workResidual'] = max(limits['workResidual'], abs(report['work']['residual']))
        for key, actual, limit in [('armImpulseExcess', 'armImpulse', 'armImpulseLimit'),
                                   ('armWorkExcess', 'armWork', 'armWorkLimit'),
                                   ('supportWorkExcess', 'supportMotorWork', 'supportMotorWorkLimit')]:
            limits[key] = max(limits[key], *[a-b for a, b in zip(report[actual], report[limit])])
        for joint in pi['jointOutputs']:
            if joint['kind'] != 'hands':
                continue
            force = math.hypot(joint.get('normalForce', 0), joint.get('tangentForce', 0))
            if force > 1:  # Report substantive loading; do not count a numerical trace as collection.
                pair = slots[joint['a']] + '/' + slots[joint['b']]
                row = loaded.setdefault(pair, dict(first=frame['after'], last=frame['after'], maxForce=0))
                row['last'] = frame['after']
                row['maxForce'] = max(row['maxForce'], force)
        for event in frame['contactEvents']:
            if event['phase'] == 'movement' and event['stretch'] and not event['anchored']:
                vel, lat = event['preAnchor'], event['lat']
                error = abs(vel['x']*lat['x'] + vel['y']*lat['y'] - event['lateral'])
                pair = slots[event['blocker']] + '/' + slots[event['defender']]
                projection.setdefault(pair, []).append(error)
    assert max(limits.values()) < 1e-8, limits
    assert play['observerNeutral'] and not play['live'] and play['censoring'] is None
    assert not any('fit-pull-runner-cue' in a['tags'] for f in play['frames'] for a in f['agents'])
    assert not any(abs(j.get('drive', 0)) > 1e-10 for f in play['frames']
                   for j in f['physicsInput']['jointRequests'] if j['kind'] == 'hands')
    installed = []
    for agent in play['frames'][0]['agents']:
        work = agent.get('work')
        if not work:
            continue
        combo = work.get('combination')
        target = work.get('target')
        installed.append(dict(slot=agent['slot'], kind=work['kind'],
                              target=slots[target['agent']] if target else None,
                              backer=slots[combo['backer']['agent']] if combo and combo.get('backer') else None))
    return dict(id=play['input']['id'], input=play['input'], side=play['side'],
                inputSha256=digest(play['input']), initialSha256=digest(play['initial']),
                profilesSha256=digest([a['profile'] for a in play['players']]),
                stateRngHistorySha256=digest(play['hashes']), ticks=len(play['hashes']),
                endTime=play['endTime'], gain=play['gain'], outcome=play['outcome'], censored=False,
                crossingBoundary=crossing, firstContact=first['t'] if first else None,
                firstOpponent=slots[first['b'] if first['a'] == rb else first['a']] if first else None,
                approach=approach, loadedPairs=loaded, installed=installed, limits=limits,
                climbs=[e for e in play['events'] if e['type'] == 'block_climb'],
                projection={k: dict(count=len(v), mean=sum(v)/len(v), maximum=max(v))
                            for k, v in projection.items()})


checks = {name: read(root / f'{name}-checks.json') for name in
          ['native', 'weak', 'pin', 'pin-weak', 'components', 'components-weak', 'keeper-replay']}
assert all(c['exitCode'] == 0 and c['inputsUnchanged'] for c in checks.values())
rows = []
all_native = []
for name, pin_name, component_name in [('native', 'pin', 'components'), ('weak', 'pin-weak', 'components-weak')]:
    native, pin, component = packet(name), packet(pin_name), packet(component_name)
    assert pin['provenance']['commit'] == '4ded6b600fd3785e65034aa5623d7a9f8f3c5db1'
    assert native['inputs'] == pin['inputs'] == component['inputs']
    flags = native['provenance']['flags']
    assert flags['RUN_CONTACT_COMPONENTS'] == flags['PULL_HANDOVER'] == '0'
    assert {k: v for k, v in flags.items() if k in pin['provenance']['flags']} == pin['provenance']['flags']
    assert component['provenance']['flags'] == flags | {'RUN_CONTACT_COMPONENTS': '1'}
    assert component['provenance']['commit'] == '7a04ad6c65d9268bb332147411baacc27ebe20e0'
    for p, b, c in zip(native['panel'], pin['panel'], component['panel']):
        assert p['hashes'] == b['hashes'] and p['players'] == b['players'] and p['initial'] == b['initial']
        assert p['players'] == c['players'] and p['initial'] == c['initial']
        default, enabled = metrics(p), metrics(c)
        differences = {}
        for f, g in zip(p['frames'], c['frames']):
            assert f['t'] == g['t']
            for a, z in zip(f['agents'], g['agents']):
                difference = math.hypot(a['pos']['x']-z['pos']['x'], a['pos']['y']-z['pos']['y'])
                prior = differences.get(a['slot'])
                if prior is None or difference > prior['distance']:
                    differences[a['slot']] = dict(distance=difference, after=f['after'],
                                                 baseline=a['pos'], components=z['pos'])
        rows.append(dict(default=default, components=enabled, actualPinHistoryExact=True,
                         componentHistoryExact=p['hashes'] == c['hashes'], gainDifference=c['gain']-p['gain'],
                         biggestPositionChanges=sorted((dict(slot=k, **v) for k, v in differences.items()),
                                                      key=lambda r: -r['distance'])[:3]))
        all_native.append(p)

selected = next(p for p in all_native if p['input']['id'] == 'uc12-wz-s3-mirror')
ids = {a['slot']: a['id'] for a in selected['players']}
slots = ['RT', 'DE_S', 'H', 'LB_S', 'RB']
chosen = {ids[s] for s in slots}
frames = []
for t in [1.45, 1.7, 1.75, 2, 2.4, 2.6, 2.65]:
    f = next(f for f in selected['frames'] if f['t'] == t)
    pi = f['physicsInput']
    bodies = [{k: v for k, v in pi['beforeBodies'][ids[s]].items() if k != 'profile'} for s in slots]
    frames.append(dict(t=t, after=f['after'], slots=slots, beforeBodies=bodies,
                       agents=[f['agents'][ids[s]] for s in slots],
                       consumedCues=[c for c in f['cues'] if c['defender'] in chosen and c['opponent'] in chosen],
                       heldAims=[a for a in f['aims'] if a['defender'] in chosen],
                       contactMovement=[e for e in f['contactEvents'] if e['phase'] == 'movement'
                                        and e['blocker'] in chosen and e['defender'] in chosen],
                       deliveredIntents=[pi['intents'][ids[s]] for s in slots],
                       jointInputs=[j for j in pi['jointInputs'] if j['a'] in chosen and j['b'] in chosen],
                       jointOutputs=[j for j in pi['jointOutputs'] if j['a'] in chosen and j['b'] in chosen],
                       groundImpulse=[pi['report']['groundImpulse'][ids[s]] for s in slots]))
trace = dict(protocol='under-center-zone-consumed-native-trace-v1', input=selected['input'],
             profiles=[a for a in selected['players'] if a['id'] in chosen], frames=frames,
             labels=['Legacy mirror id is a TE-placement contrast; actual run side is -1.',
                     'Read-only native evidence, not a solver input or private future-path cue.',
                     'Engagement movement.command is the contact controller request; deliveredIntents include spacing.'])
Path('docs/reviews/under-center-zone-native-trace.json').write_text(json.dumps(trace, indent=2)+'\n')

reused = read('docs/reviews/hand-action-protection-receipt.json')
old = next(a for a in reused['arms'] if a['name'] == 'baseline')
witness = read('docs/reviews/under-center-zone-keeper-world-witness.json')
receipt = dict(protocol='under-center-zone-bounded-receipt-v1',
               comparisonCommit='4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
               reportSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
               manifests={name: read(f'docs/reviews/{name}.json') for name in
                          ['under-center-zone-inputs', 'under-center-zone-direction-inputs']},
               checks=checks, rows=rows, newObservedPlainPairs=9,
               newCommandSeconds=sum(q['elapsedSeconds'] for c in checks.values() for q in c['commands']),
               reusedAce11=[r for r in old['rows'] if r['id'] in ['wz_strong-s3', 'wz_strong-s3-mirror']],
               keeperWitness=dict(file='under-center-zone-keeper-world-witness.json', bytes=Path(
                   'docs/reviews/under-center-zone-keeper-world-witness.json').stat().st_size,
                   nativeError=witness['nativeError'], reducedError=witness['reducedError'],
                   law=witness['angularLawControl'], endpointCauseProved=False),
               disposition='Diagnostic only: first-level keeper/runner interaction remains unresolved behind a proved passive law defect. No new release or hand policy, runtime/default changes or baseline designation.',
               limitations=['Three declared development plays, not a performance sample.',
                            'Balanced formation flip is not a run-direction mirror; the weak call is not a full mirror of the asymmetric Over front.',
                            'Different TE placement affects other skill alignments; not a causal attribution to one TE rating.',
                            'Component-only endings/approach categories retain their controls, but off-ball paths and small adverse gain changes remain visible.',
                            'Positive hand load and an assigned backer do not establish timed path protection.',
                            'Known angular accounting failure is independently proved; its contribution to the football endpoint is not.'])
Path('docs/reviews/under-center-zone-receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')
print(json.dumps(dict(pairs=9, costs=receipt['newCommandSeconds'], rows=[dict(id=r['default']['id'],
                       baselineGain=r['default']['gain'], componentsGain=r['components']['gain'],
                       approach=r['default']['approach'], biggestChanges=r['biggestPositionChanges']) for r in rows]), indent=2))
