"""Analyze saved native prefixes; never launch simulations or new sensing."""
import argparse
import hashlib
import json
import math
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--research', type=Path, required=True)
p.add_argument('--portable', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
args = p.parse_args()
args.out.mkdir(parents=True, exist_ok=True)


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def actor(frame, slot):
    return next(a for a in frame['agents'] if a['slot'] == slot)


def teammate_contacts(row):
    return [dict(t=f['t'], **c) for f in row['frames'] for c in f['contacts']
            if c['impulse'] > 1e-8 and (c['i'] < 11) == (c['j'] < 11)]


def rep(row, blocker, defender):
    samples = [dict(t=f['t'], hands=b['hands']) for f in row['frames'] for b in f['blocks']
               if b['blocker'] == blocker and b['defender'] == defender and b['hands']]
    return dict(blocker=blocker, defender=defender, samples=len(samples),
                positiveNormalSamples=sum(s['hands']['normal'] > 0 for s in samples),
                maxNormal=max((s['hands']['normal'] for s in samples), default=0),
                samplesSha256=hashlib.sha256(json.dumps(samples, sort_keys=True).encode()).hexdigest())


def overview(row):
    last = row['frames'][-1]
    rb, lb = actor(last, 'RB'), actor(last, 'LB_M')
    return dict(until=row['endTime'], live=row['live'], observerNeutral=row['observerNeutral'],
                lbMToRB=math.hypot(lb['pos']['x']-rb['pos']['x'], lb['pos']['y']-rb['pos']['y']),
                actors={slot: {k: actor(last, slot).get(k) for k in
                    ('pos', 'vel', 'requested', 'applied', 'read', 'blocker')}
                    for slot in ('LB_M', 'LB_S', 'LB_W', 'RB')},
                teammateContacts=teammate_contacts(row),
                rtMike=rep(row, 5, 15), yStrongLB=rep(row, 7, 17),
                events=[e for e in row['events'] if e['type'] != 'read'])


before_paths = [args.research/'initial-reference.json', args.research/'transfer-reference.json']
references = [row for path in before_paths for row in read(path)['panel']]
candidate = read(args.portable/'portable-native.json')
comparisons = []
for old, new in zip(references, candidate['panel']):
    assert old['input'] == new['input'] and old['initial'] == new['initial']
    assert old['observerNeutral'] and new['observerNeutral']
    first = next(((i, a, b) for i, (a, b) in enumerate(zip(old['frames'], new['frames'])) if a != b), None)
    difference = None
    if first:
        i, a, b = first
        changed = [s for s in ('LB_M', 'LB_S', 'LB_W') if actor(a, s)['requested'] != actor(b, s)['requested']]
        difference = dict(commandTime=a['t'], after=a['after'],
            allPriorRecordedHashesEqual=old['hashes'][:i] == new['hashes'][:i],
            actors=[dict(slot=s, before=actor(a, s)['requested'], after=actor(b, s)['requested'],
                firstConsumedRBCue=next((c['seen'] for c in b['cues'] if c['defender'] == actor(b, s)['id']
                    and c['slot'] == 'RB' and c['stage'] == 'behavior'), None)) for s in changed])
    comparisons.append(dict(id=old['input']['id'], input=old['input'],
        exactRecordedHashes=old['hashes'] == new['hashes'], firstDifference=difference,
        runnerFramesEqual=all(actor(a, 'RB') == actor(b, 'RB') for a, b in zip(old['frames'], new['frames'])),
        before=overview(old), after=overview(new)))

receipts = {}
for group, root in [('research', args.research), ('portable', args.portable)]:
    for path in sorted(root.glob('*.json')):
        d = read(path)
        if 'commands' in d and 'sourceSha256' in d:
            receipts[group+'/'+path.name] = d
cost = {group: sum(c.get('elapsedSeconds', 0) for name, r in receipts.items()
                  if name.startswith(group+'/') for c in r['commands'])
        for group in ('research', 'portable')}

manifest = []
for group, root in [('research', args.research), ('portable', args.portable)]:
    for path in sorted(root.glob('*.json')):
        manifest.append(dict(group=group, path=path.name, bytes=path.stat().st_size, sha256=sha(path)))
operators = [dict(path=str(path), sha256=sha(path)) for path in [
    Path('scripts/diag/defense/flow-panel.ts'), Path(__file__), Path('scripts/baseline.mjs'),
    Path('config/baseline.json'), Path('package-lock.json')]]
held = read(args.research/'bounded-native.json')
summary = dict(measurementVersion='second-level-handover-v1',
    acceptedSource='bed3c36cf08407762fed67abdf0a1651fe6ed7fc8c09b43ab3d9b33f1dfd4616',
    portableSource=candidate['provenance']['sourceSha256'], comparisons=comparisons,
    heldBroaderTracker=dict(source=held['provenance']['sourceSha256'], recommendation='HOLD',
        cases=[dict(id=r['input']['id'], **overview(r)) for r in held['panel']]),
    costCommandSeconds={**cost, 'total': sum(cost.values())}, generatedManifest=manifest, operators=operators,
    limitations=[
        'Every native execution is censored live at2.8s; no final gain or full pass/coverage result is established.',
        'Each recorded case also runs an uninstrumented neutral replay; include both in native costs.',
        'Recorded hashes include bodies, controllers, RNG, perception and commands under the existing operator; they do not serialize WeakMap research state.',
        'Rep forces are actual last-substep root-joint samples in kg*yd/s²; actor/helper ownership is not recorded. They do not prove offensive grip ownership or shedding.',
        'The portable patch has no new motion memory, reads of private live state, speed/capacity/physics changes or vision/memory policy expansion.',
        'Inherited linePicture departed classification still contains private engagement state; it is untouched, not certified acquired-only. The broader tracker is not an information-interface fix.',
        'NFL audit f8dbdcb remains a qualification, not a calibration target. No NFL scan/download or NFL-like claim.',
        'Research receipts, typecheck/test failures, adverse contacts and source identities are retained separately from the portable candidate.'
    ])
(args.out/'summary.json').write_text(json.dumps(summary, indent=2)+'\n')
(args.out/'input-manifest.json').write_text(json.dumps(dict(inputs=[r['input'] for r in references],
    stop=2.8, strength=.55, los=40, ballY=26.666666666666668, firstDownX=50,
    coverage='cover3', personnel='base43', operator='scripts/diag/defense/flow-panel.ts'), indent=2)+'\n')
Path('data/reviews/current/second-level-handover-receipts.json').write_text(json.dumps(receipts, indent=2)+'\n')
print(json.dumps(dict(cases=len(comparisons), commandSeconds=cost, totalCommandSeconds=sum(cost.values()))))
