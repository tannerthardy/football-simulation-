"""Small receipt; full trajectories, acquired packets and control tape stay in out/."""
import hashlib
import json
import math
from pathlib import Path

root = Path('out/grip-timing-followup')
read = lambda p: json.loads(Path(p).read_text())
distance = lambda a, b: math.hypot(a['x']-b['x'], a['y']-b['y'])
current = read('data/reviews/current/grip-timing.json')
previous = read(root / 'before/native-candidate.json')
stages = {}
for name in ('before', 'xi-only', 'corrected'):
    a, b = [read(root / name / f'patch-45-8-0-3001-1-{n}.json') for n in (12, 96)]
    assert a['tapeChecksum'] == b['tapeChecksum']
    stages[name] = dict(source=a['source'], tapeChecksum=a['tapeChecksum'],
        positionGapAt800ms=max(distance(x['pos'], y['pos']) for x, y in zip(a['rows'][-1]['bodies'], b['rows'][-1]['bodies'])),
        balanceGapAt800ms=max(distance(x['support']['xi'], y['support']['xi']) for x, y in zip(a['rows'][-1]['bodies'], b['rows'][-1]['bodies'])),
        capHits={str(n): sum(r.get('integration', {}).get('limited', 0) for r in q['rows']) for n, q in ((12, a), (96, b))},
        seconds={str(n): q['seconds'] for n, q in ((12, a), (96, b))})
energy_before = [read(root / 'before' / f'energy-{n}.json')['rows'][2]['bodies'][0]['energy'] for n in (12, 96)]
energy_after = [read(root / 'corrected' / f'patch-45-8-0-3001-1-{n}.json')['rows'][2]['bodies'][0]['energy'] for n in (12, 96)]
audit = read(root / 'before/patch-45-8-0-3001-1-audit.json')['audit']
first = next(r for r in audit if r['bodyError'] <= 1 and r['xiError'] > 5e-7)
native = []
for row in current['nativePositive']:
    old = [next(r for r in previous['native'] if r['id'] == row['id'] and r['n'] == n and r['timing'] == 'resolved') for n in (12, 96)]
    new = row['runs']
    native.append(dict(name=row['name'], id=row['id'],
        previous={str(n): dict(ending=r['result']['ending'], advance=r['result']['advanceAfterGrip']) for n, r in zip((12, 96), old)},
        corrected={str(r['n']): dict(ending=r['candidate']['ending'], advance=r['candidate']['advanceAfterGrip']) for r in new},
        previousResolutionGap=abs(old[0]['result']['advanceAfterGrip']-old[1]['result']['advanceAfterGrip']),
        correctedResolutionGap=abs(new[0]['candidate']['advanceAfterGrip']-new[1]['candidate']['advanceAfterGrip'])))
fresh_baseline, fresh_candidate = [read(root / 'fresh' / f'{name}.json') for name in ('baseline', 'candidate')]
assert fresh_baseline['inputManifest'] == fresh_candidate['inputManifest']
assert fresh_baseline['flags'] == fresh_candidate['flags'] == current['flags']
assert fresh_candidate['source'] == current['source']
fresh = []
for new in fresh_candidate['rows']:
    old = next(r for r in fresh_baseline['rows'] if r['cell'] == new['cell'] and r['side'] == new['side'] and r['n'] == new['n'])
    if new['side'] > 0:
        fields = ('ending', 'finish', 'advanceAfterGrip', 'firstGrip', 'carrierState')
        fresh.append(dict(cell=new['cell'], n=new['n'],
            before={k: old['result'][k] for k in fields}, corrected={k: new['result'][k] for k in fields},
            seconds=dict(before=old['seconds'], corrected=new['seconds']), accounting=new['stats']))
    mirror = next(r for r in fresh_candidate['rows'] if r['cell'] == new['cell'] and r['side'] == -new['side'] and r['n'] == new['n'])
    assert new['result']['ending'] == mirror['result']['ending']
    assert abs(new['result']['advanceAfterGrip']-mirror['result']['advanceAfterGrip']) < 1e-8
raw_collector = Path('out/grip-timing-followup/fresh.ts').read_bytes()
assert raw_collector == Path('scripts/diag/grip-timing-fresh.ts').read_bytes()
result = dict(baseline=current['baseline'], baselineSource=current['baselineSource'], source=current['source'],
    previousTimingSource=previous['source'], rejectedBalanceAttempt='080eaa1b6bd6dcc80fb6d624722994295de1230b',
    flags=current['flags'], worldOptions=current['candidate'], node=current['node'],
    inputs=current['inputs'], inputManifest=current['inputManifest'],
    acquiredPacket=next(r for r in current['checkpoints'] if r['id'] == 'patch-45-8-0-3001-1'),
    heldControl=dict(stages=stages, energyAfter100ms=dict(before=energy_before, corrected=energy_after),
        firstOmittedBalanceComparison={k: first[k] for k in ('n', 'time', 'h', 'dose', 'bodyError', 'xiError', 'accelError')}),
    native=native, counts=current['counts'], defaultResultParity=current['defaultResultParity'],
    mirrorMaxAdvanceDifference=current['mirrorMaxAdvanceDifference'], gate=current['gate'],
    freshInputs=fresh_candidate['inputs'], freshInputManifest=fresh_candidate['inputManifest'],
    freshBaselineSource=fresh_baseline['source'], freshCollectorSha256=hashlib.sha256(raw_collector).hexdigest(),
    freshPositive=fresh, freshTacklesRetained=sum(r['result']['ending'] == 'tackled' for r in fresh_candidate['rows']),
    freshTotal=len(fresh_candidate['rows']),
    limitations=['No patch promotion or new baseline; all support/tackle experiments separate.',
        'Matched advance is measured after acquired grip, not NFL YAC or a first-contact guarantee.',
        'Fresh positive grip/torso onsets are reported as controller-tick intervals, not exact force onset.',
        'Selected 4.4-second native resolution gap remains about .242 yd; costly solver stays experimental.',
        'Timing refinement still omits continuous support memory; rejected balance-only attempt was reverted.'])
out = Path('data/reviews/current/grip-timing-effort.json')
out.write_text(json.dumps(result, indent=2)+'\n')
print(out, 'fresh retained', result['freshTacklesRetained'], '/', result['freshTotal'])
