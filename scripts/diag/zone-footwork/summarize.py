"""Saved-tape analysis only. No simulations, NFL downloads or new observations."""
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path('out/zone-footwork')
OUT = Path('data/reviews/current/zone-reach-footwork')
OUT.mkdir(parents=True, exist_ok=True)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load(name):
    return json.loads(gzip.open(ROOT / (name + '.json.gz')).read())


def actor(row, slot):
    original = next(a for a in row['initial'] if a['slot'] == slot)
    idx = original['idx']
    side = -1 if row['id'] != 'wz-weak' else 1
    result = {}
    for t in (2, 3):
        f = next(f for f in row['frames'] if abs(f['t'] - t) < 1e-7)
        body = f['bodies'][idx]
        result[str(t)] = dict(x=body['pos']['x'], y=body['pos']['y'],
            playsideWidth=side*(body['pos']['y']-original['body']['pos']['y']),
            achievedVy=body['vel']['y'], requestedVelocity=f['commands'][idx]['vel'],
            ownSoloHands=[h for e in f['reps'] if e['blocker'] == slot and not e['helpers']
                          for h in e['hands'] if h.get('actor') == slot])
    hands = [h for f in row['frames'] for e in f['reps']
             if e['blocker'] == slot and not e['helpers'] for h in e['hands']
             if h.get('actor') == slot]
    result['sampledOwnedSoloLoad'] = dict(samples=len(hands),
        normal=sum(h['normal']*.05 for h in hands),
        absoluteTangent=sum(abs(h['tangent'])*.05 for h in hands))
    return result


def run(row):
    frames = row['frames']
    return dict(initialHash=row['initialHash'], spec=row['spec'],
        ticks=len(frames), until=row['until'], terminal=row['terminal'],
        firstContact=row['firstContact'],
        positiveOffensiveImpacts=[dict(t=f['t'], **c) for f in frames for c in f['contacts']
            if c['i'] < 11 and c['j'] < 11 and c['impulse'] > 1e-8],
        maxAbsWorkResidual=max(abs(f['work']['residual']) for f in frames),
        maxArmLimitExcess=max(max(v-cap for v, cap in zip(f['armImpulse'], f['armLimit'])) for f in frames),
        actors={s: actor(row, s) for s in ('LT', 'LG', 'C', 'RG', 'RT', 'Y', 'H', 'RB')})


comparisons = []
for before, after in [('initial-oz', 'playside-oz'), ('opposing-baseline', 'playside-controls')]:
    a, b = load(before), load(after)
    for old, new in zip(a['rows'], b['rows']):
        assert old['id'] == new['id'] and old['initialHash'] == new['initialHash']
        first = next(((i, x, y) for i, (x, y) in enumerate(zip(old['frames'], new['frames'])) if x != y), None)
        divergence = None
        if first:
            i, x, y = first
            actors = [a for a in old['initial'] if x['commands'][a['idx']] != y['commands'][a['idx']]]
            divergence = dict(postStepTime=x['t'], commandTime=x['t']-.05,
                allBodiesBeforeEqual=x['before'] == y['before'],
                changedCommands=[dict(slot=a['slot'], before=x['commands'][a['idx']],
                    after=y['commands'][a['idx']]) for a in actors])
        comparisons.append(dict(id=old['id'], beforeSource=a['source'], afterSource=b['source'],
            exactAllSavedFrames=first is None, firstDivergence=divergence,
            before=run(old), after=run(new)))

diagnostic = {}
for mode in ('baseline', 'candidate'):
    d = json.loads((ROOT / ('weak-slowdown-'+mode+'-observations.json')).read_text())
    rows = []
    for t in (1.9, 2.4):
        r = next(r for r in d['rows'] if abs(r['t']-t) < 1e-7)
        rows.append(dict(t=r['t'], ownPos=r['own']['pos'], ownVel=r['own']['vel'],
            decision=r['decision'], final=r['final'],
            acquiredLT=next(p for p in r['peers'] if p['slot'] == 'LT')))
    diagnostic[mode] = {**{k: d[k] for k in ('source', 'initialHash', 'observedTicks', 'exactSavedCommandsAndBodies')},
        'selectedRows': rows}

receipts = {}
for p in sorted(ROOT.glob('*.json')):
    d = json.loads(p.read_text())
    if 'commands' in d and 'sourceSha256' in d:
        receipts[p.name] = d

costs = {k: sum(c.get('elapsedSeconds', 0) for c in r['commands']) for k, r in receipts.items()}
manifest = [dict(path=str(p), sha256=digest(p), bytes=p.stat().st_size)
    for p in sorted(ROOT.iterdir()) if p.is_file()]
operators = [dict(path=str(p), sha256=digest(p)) for p in [
    Path('scripts/diag/zone-footwork/inputs.ts'), Path('scripts/diag/zone-footwork/native.ts'),
    Path('scripts/diag/zone-footwork/weak-slowdown.ts'), Path(__file__),
    Path('scripts/source-version.ts'), Path('package-lock.json'),
    Path('config/baseline.json'), Path('test/fixtures/planned-climb-fit.json.gz')]]

summary = dict(measurementVersion='zone-footwork-v1',
    notes=[
        'Every native arm is censored at 3s: no final gain, touchdown or post-whistle claim.',
        'Width is displacement from the individual snap position toward the called playside; Duo uses the same fixed negative-Y reporting direction only for identity.',
        'Requested velocity is not achieved velocity. Feet, contact, balance and shared capacities remain physical.',
        'Hand loads are actual last-substep force samples at 20Hz. SampledOwnedSoloLoad is a rectangular integral proxy (force times .05s), not the exact World impulse or a shedding measurement.',
        'Only solo reps with a hand joint whose actor is the named blocker enter owned-load totals. Defender-owned, helper and unknown-actor hands are excluded.',
        'Native tapes do not snapshot RNG: do not attribute later coupled force/outcome differences to a single request without a matched-state control.',
        'NFL audit f8dbdcb is hypothesis guidance, not physics calibration; no new NFL scan/download or NFL-like certification.',
        'Detailed generated tapes stay in ignored out/. Operators, exact inputs, hashes and bounded summaries are published.'
    ], comparisons=comparisons, adverseWeakDiagnostic=diagnostic,
    runtimeCommandSeconds=costs, totalCommandSeconds=sum(costs.values()),
    generatedManifest=manifest, operators=operators)
(OUT/'summary.json').write_text(json.dumps(summary, indent=2)+'\n')
Path('data/reviews/current/zone-reach-footwork-receipts.json').write_text(json.dumps(receipts, indent=2)+'\n')
print(json.dumps(dict(cases=len(comparisons), commandSeconds=sum(costs.values()),
    receipts=len(receipts), summaryBytes=(OUT/'summary.json').stat().st_size)))
