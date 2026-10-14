"""Reuse saved law comparison; reduce two neutral provenance prefixes offline."""
import gzip
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
from functools import lru_cache

ROOT = Path('out/ace-protection')
LAW = Path(sys.argv[1] if len(sys.argv) > 1 else '../football-contact-law-isolation/out/contact-isolation')
OLD = Path(sys.argv[2] if len(sys.argv) > 2 else '../football-under-center-zone/out/under-center-zone')


@lru_cache(maxsize=None)
def read(path):
    b = path.read_bytes()
    return json.loads(gzip.decompress(b) if path.suffix == '.gz' else b)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def digest(x):
    return hashlib.sha256(json.dumps(x, separators=(',', ':'), sort_keys=True).encode()).hexdigest()


native = read(LAW / 'protection.json.gz')
old_rows = read(OLD / 'carrier-design.json.gz')['panel'] + read(OLD / 'carrier-design-weak.json.gz')['panel']
probe = read(ROOT / 'delivery.json.gz')
retention = read(ROOT / 'retention.json')
prior = read(Path('data/reviews/current/contact-law-isolation.json'))


def joints(f, pair, output=False, old=False):
    field = f['physicsInput'] if old else f['worldInput']
    key = 'jointOutputs' if old and output else 'jointOutputsAtWorldEnd' if output else 'jointInputs'
    return next((j for j in field[key] if (j['a'], j['b']) == pair and j['kind'] == 'hands'), None)


def frame(row, t):
    return next(f for f in row['frames'] if f['t'] == t)


def pair_motion(f, pair, request=None, old=False):
    q = f['physicsInput'] if old else f['worldInput']
    a, b = [q['beforeBodies'][i] for i in pair]
    delta = {k: b['pos'][k] - a['pos'][k] for k in ['x', 'y']}
    distance = math.hypot(*delta.values())
    n = {k: delta[k] / distance for k in delta}
    request = request or q['intents'][pair[0]]['vel']
    other = q['intents'][pair[1]]['vel']
    return dict(distance=distance, requestedClosing=sum((request[k] - other[k]) * n[k] for k in n),
                actualClosing=sum((a['vel'][k] - b['vel'][k]) * n[k] for k in n))


def point(f, i, old=False):
    q = f['physicsInput'] if old else f['worldInput']
    b = q['beforeBodies'][i]
    return dict(slot=f['agents'][i]['slot'], **{k: b[k] for k in ['pos', 'vel', 'facing', 'spin']},
                support=b['support']['state'], intent=q['intents'][i])


rows = []
for p in probe['panel']:
    n = next(r for r in native['panel'] if r['input']['id'] == p['input']['id'])
    b = next(r for r in old_rows if r['input']['id'] == p['input']['id'])
    assert p['hashes'] == n['hashes'][:49] and p['prefixExact']
    assert b['input'] == n['input'] and b['initial'] == n['initial']
    assert [a['profile'] for a in b['players']] == n['profiles']
    earlier = next(r for r in prior['rows'] if r['id'] == p['input']['id'])
    assert digest(b['hashes']) == earlier['baselineFullHistorySha256']
    is_y = not p['input']['flip']
    pair = (2, 12) if is_y else (5, 13)
    first_joint = next(f['t'] for f in n['frames'] if joints(f, pair))
    first_acquired = next(f['t'] for f in n['frames'] if joints(f, pair) and joints(f, pair)['push'] > 0)
    first_loaded = next(f['t'] for f in n['frames'] if joints(f, pair, True) and
                        math.hypot(joints(f, pair, True).get('normalForce', 0), joints(f, pair, True).get('tangentForce', 0)) > 1e-8)
    checkpoints = []
    for t in ([1.25, 1.5, 1.65, 1.8, 1.95, 2, 2.05, 2.3, 2.35] if is_y else [2.15, 2.2, 2.25, 2.3, 2.35, 2.4]):
        f, of, pf = frame(n, t), frame(b, t), frame(p, t)
        raw = next(w for w in p['writes'] if w['t'] == t and w['actor'] == pair[0] and
                   ('helperIntents' in w['caller'] if is_y else 'stepRunRep' in w['caller']))
        rep = next(r for r in pf['reps'] if r['defender'] == pair[1])
        pts = [2, 7, 12, 6] if is_y else [5, 13, 2, 12, 6]
        cp = dict(t=t, nominalRep=rep, rawContactRequest=raw['intent'],
                  movement=pair_motion(f, pair), rawMovement=pair_motion(f, pair, raw['intent']['vel']),
                  deliveredHands=joints(f, pair, True), requestedHands=joints(f, pair),
                  bodies=[point(f, i) for i in pts], baselineMovement=pair_motion(of, pair, old=True),
                  baselineHands=joints(of, pair, True, True), baselineBodies=[point(of, i, True) for i in pts],
                  bodyContacts=f['report']['contacts'])
        if is_y:
            h = next(a for a in pf['agents'] if a['id'] == 2)
            d = next(a for a in pf['agents'] if a['id'] == 12)
            cp['helperAcquisitionReach'] = h['bodyProfile']['radius'] + d['bodyProfile']['radius'] + h['armIn'] / 36 * .3
            cp['helperFunctionalReach'] = h['bodyProfile']['radius'] + d['bodyProfile']['radius'] + .1 + h['armIn'] / 36 * .45
            cues = [q for q in p['cues'] if q['t'] == t and q['actor'] == 2 and 'helperFit' in q['caller']]
            cp['consumedHelperPictures'] = cues
            if cues:
                seen = next(q['seen'] for q in cues if q['target'] == 12)
                axis = rep['axis']
                cp['observedSurfaceDepth'] = sum((h['pos'][k] - seen['pos'][k]) * axis[k] for k in axis)
                cp['actualSurfaceDepth'] = sum((h['pos'][k] - d['pos'][k]) * axis[k] for k in axis)
        else:
            q = next(c for c in p['contacts'] if c['t'] == t and c['phase'] == 'movement' and c['rep']['blocker'] == 5)
            cp['consumedContactController'] = {k: q['data'].get(k) for k in ['anchored', 'forward', 'lateral', 'defensiveAim', 'declared', 'fit']}
        checkpoints.append(cp)
    if is_y:
        normal = [joints(f, pair, True).get('normalForce', 0) for f in n['frames'] if f['t'] <= 2.35 and joints(f, pair, True)]
        assert max(map(abs, normal)) == 0
        assert first_acquired == first_loaded == 1.5
        assert joints(frame(n, 1.95), pair)['steer'] > 0 and joints(frame(n, 2), pair)['steer'] == 0
        earlier_acquired = next(f for f in b['frames'] if joints(f, pair, old=True) and joints(f, pair, old=True)['push'] > 0)
        basej = joints(earlier_acquired, pair, old=True)
        h = next(a for a in frame(p, 1.5)['agents'] if a['id'] == 2)
        sep = n['profiles'][2]['radius'] + n['profiles'][12]['radius']
        base_control = 2 * (basej['extension'] - sep) / (h['armIn'] / 36 * .3) - 1
        exchange = dict(isolatedAt=1.5, isolatedControl=next(r for r in frame(p, 1.5)['reps'] if r['defender'] == 12)['helpers'][0]['control'],
                        baselineAt=earlier_acquired['t'], baselineActor=basej['actor'], baselineControl=base_control,
                        scope='Control inferred from native joint parameters for baseline; native probe reads acquired control directly. Hand-exchange timing/control differ; no locked-RNG attribution or new technique trial.')
    else:
        exchange = None
    traffic = []
    for label, trace, old in [('isolated', n, False), ('baseline', b, True)]:
        hits = [(f['t'], q['impulse']) for f in trace['frames'] for q in (f['physicsInput']['report'] if old else f['report'])['contacts']
                if {q['i'], q['j']} == {5, 12} and q['impulse'] > 1e-8]
        traffic.append(dict(arm=label, first=hits[0] if hits else None))
    rows.append(dict(id=p['input']['id'], input=p['input'], hashesExact=49, firstJoint=first_joint,
                     firstAcquired=first_acquired, firstLoaded=first_loaded, handExchange=exchange,
                     runnerArrival=n['firstContact'], crossing=n['crossing'], endTime=n['endTime'], gain=n['gain'],
                     firstRGEndCollision=traffic, checkpoints=checkpoints))

weak = native['panel'][2]
checks = {path.name: read(path) for path in ROOT.glob('*checks.json')}
failed = {name for name, c in checks.items() if c['exitCode'] != 0}
assert failed <= {'typecheck-checks.json', 'reduction-checks.json'}
assert checks['typecheck-final-checks.json']['exitCode'] == 0
assert all(c['inputsUnchanged'] for c in checks.values())
assert len({c['sourceSha256'] for c in checks.values()}) == 1
receipt = dict(protocol='ace-protection-review-v1', comparisonCommit=native['comparisonCommit'],
               historicalRuntimeSourceSha256=checks['delivery-checks.json']['sourceSha256'],
               manifest=read(Path('config/ace-protection-traces.json')), flags=checks['delivery-checks.json']['flags'],
               observedDevelopCommit=subprocess.check_output(['git', 'rev-parse', 'origin/develop'], text=True).strip(),
               developTested=False, developGate='User requires contact-retention contract settled first. Refresh develop at that checkpoint; current read-only pin is not a test result.',
               rawSha256={str(path): sha(path) for path in [LAW / 'protection.json.gz', OLD / 'carrier-design.json.gz', ROOT / 'delivery.json.gz']},
               settings=checks, recordedCommandSeconds=sum(cmd['elapsedSeconds'] for c in checks.values() for cmd in c['commands']),
               rows=rows, weakSuccessReused={k: weak[k] for k in ['input', 'endTime', 'outcome', 'crossing', 'firstContact', 'gain']},
               weakFullHistorySha256=digest(weak['hashes']),
               retentionControls=dict(inputSha256=sha(Path('docs/reviews/ace-lateral-retention-controls.json')),
                                      nativeError=retention['nativeError'], retained=retention['retained']['joints'],
                                      clearedImpulse=retention['cleared']['reports'][0]['armImpulse'],
                                      unreachableDistance=retention['unreachableDistance'], generousReach=retention['generousReach'],
                                      injectedStaleDelivery=retention['stale']['joints'],
                                      scope='Unreachable stale joint is a synthetic operator control, not a native baseline defect.'),
               correctedPriorStatement='PR17 prose claiming RT never acquired any load after joining was too broad. He acquires lateral load at1.50 through1.95, loses eligibility at2.00 and has zero load at runner arrival. No compressive load in that interval.',
               diagnosticFailures='Initial typecheck found one implicit-any callback in the new collector, corrected with a result-array type. First offline reducer correctly refused that failed validation. Both failed commands/costs are retained; runtime and native histories unchanged.',
               scope='Diagnostics only; shared runtime, solver, contact retention, capacities, roster, RB, release and hand policies unchanged. Four short observer continuations of two saved prefixes, all49 hashes exact; no new inputs/games/full suites.',
               unresolved=['Whether these rotating latched contacts remain physically retained. Zero compression alone is not a clearance rule.',
                           'Whether a feasible acquired-information helper/spacing change improves route control after the contact contract is settled.',
                           'Changed native hand-exchange control/timing are not isolated from closed-loop RNG advancement. No deterministic superiority claim.',
                           'Current develop transfer remains untested under the explicit contract-review prerequisite.'])
destination = Path('docs/reviews/ace-protection-receipt.json')
destination.write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(dict(saved=str(destination), bytes=destination.stat().st_size,
                      prefixesExact=True, commandSeconds=receipt['recordedCommandSeconds'], controllerChanges=0)))
