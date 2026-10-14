"""Reduce existing Ace traces; no simulation, new perception or RNG calls."""
import gzip
import hashlib
import json
import math
from functools import lru_cache
from pathlib import Path
import sys

root = Path('out/contact-isolation')
baseline_root = Path(sys.argv[1] if len(sys.argv) > 1 else '../football-under-center-zone/out/under-center-zone')


@lru_cache(maxsize=None)
def read(path):
    data = path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix == '.gz' else data)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


baseline_paths = [baseline_root / f for f in ['carrier-design.json.gz', 'carrier-design-weak.json.gz']]
baseline = [(path, p) for path in baseline_paths for p in read(path)['panel']]
native = read(root / 'protection.json.gz')
original = read(root / 'native.json.gz')
mechanics = read(root / 'mechanics.json')
first = read(root / 'first.json')
previous = read(Path('data/reviews/current/keeper-contact-law.json'))
checks = {p.name: read(p) for p in root.glob('*checks.json')}
successful = [v for v in checks.values() if v['exitCode'] == 0]
assert len({c['sourceSha256'] for c in successful}) == 1
assert len({json.dumps(c['flags'], sort_keys=True) for c in successful}) == 1
assert all(c['inputsUnchanged'] for c in successful)
assert native['worldSha256'] == sha(Path('src/physics/world.ts'))
assert native['manifestSha256'] == sha(Path('config/keeper-contact-law.json'))
assert mechanics['witnessSha256'] == sha(Path('docs/reviews/under-center-zone-keeper-world-witness.json'))


def snapshot(frame, slots, old=False):
    result = []
    for a in frame['agents']:
        if a['slot'] not in slots:
            continue
        body = a if old else a['body']
        result.append(dict(slot=a['slot'], **{k: body[k] for k in ['pos', 'vel', 'facing', 'spin', 'support']},
                           requested=a['requested'], delivered=a['applied'] if old else a['delivered']))
    return result


rows = []
for p in native['panel']:
    path, b = next((path, b) for path, b in baseline if b['input']['id'] == p['input']['id'])
    prior = next(q for q in original['panel'] if q['input']['id'] == p['input']['id'])
    assert p['hashes'] == prior['hashes'] and p['observerNeutral']
    old_receipt = next(r for r in previous['rows'] if r['id'] == p['input']['id'])
    assert digest(b['hashes']) == old_receipt['historySha256']
    assert b['input'] == p['input'] and b['initial'] == p['initial']
    assert [q['profile'] for q in b['players']] == p['profiles']
    common_flags = checks['native-checks.json']['flags']
    assert all(read(path)['provenance']['flags'][k] == v for k, v in common_flags.items())
    index = next(i for i, (x, y) in enumerate(zip(b['hashes'], p['hashes'])) if x != y)
    bf, cf = b['frames'][index], p['frames'][index]
    assert index == 8 and bf['t'] == .4 and cf['after'] == .45
    assert bf['physicsInput']['beforeBodies'] == cf['worldInput']['beforeBodies']
    assert bf['physicsInput']['intents'] == cf['worldInput']['intents']
    assert bf['physicsInput']['jointInputs'] == cf['worldInput']['jointInputs']
    assert [(q['t'], q['defender'], q['opponent'], q['seen']) for q in bf['cues']] == [
        (q['t'], q['actor'], q['target'], q['seen']) for q in cf['cues']]
    assert not cf['report']['contacts'] and not cf['report']['strikes']
    first_delivery = first_request = first_velocity_request = None
    for x, y in zip(b['frames'], p['frames']):
        for a, c in zip(x['agents'], y['agents']):
            if first_delivery is None and a['applied'] != c['delivered']:
                first_delivery = dict(t=x['t'], slot=a['slot'], baseline=a['applied'], isolated=c['delivered'])
            if first_request is None and a['requested'] != c['requested']:
                first_request = dict(t=x['t'], slot=a['slot'], baseline=a['requested'], isolated=c['requested'])
            if first_velocity_request is None and a['applied']['vel'] != c['delivered']['vel']:
                first_velocity_request = dict(t=x['t'], slot=a['slot'], baseline=a['applied'], isolated=c['delivered'])
    f = next(f for f in p['frames'] if f['t'] == p['firstContact']['t'])
    chosen = (['RT', 'Y', 'DE_S', 'RB'] if p['input']['id'] == 'uc12-wz-s3' else
              ['RG', 'RT', 'H', 'DT_S', 'DE_S', 'RB'] if p['input']['flip'] else ['LT', 'H', 'DE_W', 'LB_M', 'RB'])
    joints = f['worldInput']['jointOutputsAtWorldEnd']
    slot = lambda i: f['agents'][i]['slot']
    hands = [dict(j, a=slot(j['a']), b=slot(j['b'])) for j in joints if j['kind'] == 'hands']
    checkpoints = []
    for t in ([1.25, 2, 2.1, 2.3, 2.35] if p['input']['id'] == 'uc12-wz-s3' else
              [1.7, 2.3, 2.4] if p['input']['flip'] else [1.25, 2.3, 2.4, 2.85]):
        at = next(q for q in p['frames'] if q['t'] == t)
        old = next(q for q in b['frames'] if q['t'] == t)
        checkpoints.append(dict(t=t, isolated=snapshot(at, chosen), baseline=snapshot(old, chosen, True),
                                deliveredHands=at['worldInput']['jointOutputsAtWorldEnd']))
    row = dict(id=p['input']['id'], input=p['input'], baselineRawSha256=sha(path),
               baselineFullHistorySha256=digest(b['hashes']), isolatedFullHistorySha256=digest(p['hashes']),
               baselineEvidenceCompatible=True, unchangedHashPrefixTicks=index, unchangedUntil=.4,
               firstDifference=dict(t=.4, after=.45, exactBeforeBodies=True, exactDeliveredRequests=True,
                                    exactJointInputs=True, exactConsumedCues=True, bodyContacts=0, strikes=0,
                                    jointSlots=[[slot(j['a']), slot(j['b'])] for j in cf['worldInput']['jointInputs']]),
               firstDeliveredRequestDifference=first_delivery, firstDeliveredVelocityDifference=first_velocity_request,
               firstOriginalControllerRequestDifference=first_request,
               baseline=old_receipt['arms'][0], fullPatch=old_receipt['arms'][1],
               isolated={k: p[k] for k in ['endTime', 'outcome', 'censored', 'crossing', 'gain', 'firstContact', 'limits']},
               firstContactDeliveredHands=hands, firstContactBodies=snapshot(f, chosen),
               firstContactBodyImpulses=f['report']['contacts'], checkpoints=checkpoints,
               baselineClimbs=[e for e in b['events'] if e['type'] == 'block_climb'],
               isolatedClimbs=[e for e in p['events'] if e['type'] == 'block_climb'])
    rows.append(row)

costs = {k: dict(commit=v['commit'], sourceSha256=v['sourceSha256'], validationSha256=v['validationSha256'],
                 seconds=sum(c['elapsedSeconds'] for c in v['commands']), exitCode=v['exitCode'],
                 commands=v['commands']) for k, v in checks.items()}
result = dict(protocol='contact-law-isolation-review-v1', comparisonCommit=native['comparisonCommit'],
              testedRuntimeSourceSha256=checks['native-checks.json']['sourceSha256'],
              sourceUnchangedAcrossEvidence=True, worldSha256=native['worldSha256'],
              witnessSha256=mechanics['witnessSha256'], manifest=json.loads(Path('config/keeper-contact-law.json').read_text()),
              isolatedSelection=native['worldSelection'], flags=checks['native-checks.json']['flags'],
              testedRevisions=costs, totalRecordedCommandSeconds=sum(c['seconds'] for c in costs.values()),
              rawSha256={name: sha(root / name) for name in ['native.json.gz', 'protection.json.gz', 'mechanics.json', 'first.json']},
              portableFirstInputsSha256=sha(Path('docs/reviews/contact-law-isolation-first-contact.json')),
              firstIntervals=first['rows'], nativeWitnessError=mechanics['nativeError'],
              freeMaximumAngularChange=max(abs(c['angularChange']) for c in mechanics['controls']),
              focusedTestsPassed=89, rows=rows,
              scope='Separate existing common-point contact package from ground/facing/planning. Defaults, profiles, RB policy, grip timing and release heuristics unchanged. No promotion.',
              limitations=['Three declared Ace inputs, not a calibrated population.',
                           'Local 12/48 refinement attributes the first interval, not convergence of complete football endings.',
                           'Common-point package retains its matched torso ordering and grasp Jacobians; not an inconsistent hand-torque-only intervention.',
                           'Mechanical conservation and budget closure do not alone certify a realistic defensive win.',
                           'Native grasp acquisition is distinct from delivered torso impulse and from maintained lane protection.',
                           'Legacy mirror is TE placement; weak call is not a true geometric reflection.'],
              initialFailedCheck='First witness command passed mechanical assertions but failed to save because the output directory was absent; retained in cost. No correctness blocker.')
result['interruptedOfflineReduction'] = 'Initial reducer repeatedly decoded the same saved packets during flag comparisons. Interrupted and cached packet reads; no native simulation or mechanical test was interrupted. Cost retained.'
target = Path('data/reviews/current/contact-law-isolation.json')
target.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(dict(saved=str(target), bytes=target.stat().st_size, rows=len(rows),
                      seconds=result['totalRecordedCommandSeconds'], earliest=.4, focused=89)))
