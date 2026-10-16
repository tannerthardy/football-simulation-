"""Reduce saved current-Duo tapes. No simulation, new observation or RNG."""
import copy
import gzip
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/reviews/current/current-protection-access'
RAW = ROOT / 'out/current-protection-access'

def read(path):
    return json.loads(gzip.decompress(path.read_bytes()))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def dump(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2) + '\n')

def dist(a, b):
    return math.hypot(a['x'] - b['x'], a['y'] - b['y'])

def frame(row, t):
    return next(f for f in row['frames'] if f['t'] == t)

def event(row, kind, actor=None):
    return next((e for e in row['events'] if e['type'] == kind
                 and (actor is None or e.get('a') == actor)), None)

def compact_body(body):
    return {k: v for k, v in body.items() if k != 'profile'}

manifest = json.loads((OUT / 'inputs.json').read_bytes())
reference = read(RAW / 'current/trace.json.gz')
diagnostic = read(RAW / 'detour/trace.json.gz')
assert reference['receipt']['sourceSha256'] == manifest['source']
assert reference['receipt']['collectorSha256'] == diagnostic['receipt']['collectorSha256']
assert reference['receipt']['inputManifestSha256'] == sha(OUT / 'inputs.json')
assert reference['receipt']['flags'] == diagnostic['receipt']['flags']
assert reference['receipt']['worldDefaults'] == diagnostic['receipt']['worldDefaults']
assert reference['receipt']['node'] == diagnostic['receipt']['node'] == 'v22.23.3'
assert len(reference['receipt']['flags']) == 44
assert [r['id'] for r in reference['rows']] == ['D06', 'D02', 'DuoUnder']

base, alternate = reference['rows'][0], diagnostic['rows'][0]
assert base['initial'] == alternate['initial']
assert base['inputSha256'] == alternate['inputSha256']
assert [f for f in base['frames'] if f['t'] < 1.8] == [f for f in alternate['frames'] if f['t'] < 1.8]
assert frame(base, 1.8)['before'] == frame(alternate, 1.8)['before']
for key in ['reads', 'calls', 'joined']:
    assert [x for x in base[key] if x['t'] < 1.8] == [x for x in alternate[key] if x['t'] < 1.8]
assert [x for x in base['reads'] if x['t'] == 1.8 and x['context'] == 'joined-security'] == [
    x for x in alternate['reads'] if x['t'] == 1.8 and x['context'] == 'joined-security']
assert event(base, 'block_climb', 1)['t'] == 2.55
assert event(alternate, 'block_climb', 1)['t'] == 1.8
assert event(base, 'carrier_contact')['t'] == event(alternate, 'carrier_contact')['t'] == 2.9
assert not any(e['type'] == 'block_contact' and e.get('a') == 1 and e.get('b') == 15
               for r in [base, alternate] for e in r['events'])

def measured(row):
    climb = 2 if row['id'] == 'DuoUnder' else 1
    keeper, down = (7, 12) if climb == 2 else (4, 13)
    arrival = event(row, 'carrier_contact')['t']
    rows = []
    for f in row['frames']:
        t = f['t']
        if t > arrival:
            break
        before = f['before']
        rep = next((e for e in f['beforeReps'] if e['d'] == 15 and e['b'] == climb), None)
        keeper_rep = next((e for e in f['beforeReps'] if e['d'] == down
                           and keeper in [e['b'], *e['helpers']]), None)
        call = next((c for c in row['calls'] if c['a'] == climb and c['t'] == t
                     and c['method'] == 'update' and c['depth'] == 0), None)
        rows.append({'t': t, 'kind': call['after']['kind'] if call and 'after' in call else None,
                     'departure': bool(call and call.get('after', {}).get('departure')),
                     'raw': f['raw'][climb], 'preSpacing': f['preSpacing'][climb] if f['preSpacing'] else None,
                     'final': f['final'][climb], 'before': compact_body(before[climb]),
                     'after': compact_body(f['after'][climb]),
                     'actualBacker': compact_body(before[15]), 'actualRunner': compact_body(before[6]),
                     'backerGap': dist(before[climb]['pos'], before[15]['pos']),
                     'afterWorldBackerGap': dist(f['after'][climb]['pos'], f['after'][15]['pos']),
                     'rep': rep, 'keeperRep': keeper_rep,
                     'downRunnerGap': dist(before[down]['pos'], before[6]['pos'])})
    own = next(x for x in manifest['rows'] if x['id'] == row['id'])['setup']['offense'][row['initial'][climb]['slot']]
    strike = row['initial'][climb]['profile']['radius'] + row['initial'][15]['profile']['radius'] + .1 + own['measurables']['armIn'] / 36 * .45
    first_load = next((x['t'] for x in rows if x['rep'] and x['rep'].get('hands')
                       and math.hypot(x['rep']['hands'].get('normal') or 0,
                                      x['rep']['hands'].get('tangent') or 0) > 1e-6), None)
    first_plan = next((x['t'] for x in row['calls'] if x['a'] == climb and x['method'] == 'plannedClimb'), None)
    release = event(row, 'block_climb', climb)
    teammate = [(f['t'], c) for f in row['frames'] if f['t'] <= arrival
                for c in f['report']['contacts'] if c['i'] < 11 and c['j'] < 11]
    peak = max(teammate, key=lambda p: p[1]['impulse'], default=None)
    summary = {'id': row['id'], 'source': row['source'], 'inputSha256': row['inputSha256'],
               'climber': climb, 'keeper': keeper, 'down': down,
               'installedPlan': row['initial'][climb]['plan'], 'release': release,
               'strikeRadius': strike, 'firstBackerLoadBeforeContact': first_load,
               'firstPlannedClimb': first_plan, 'firstRunnerContact': event(row, 'carrier_contact'),
               'lineArrivalBeforeWorldSample': next((f['t'] for f in row['frames'] if f['before'][6]['pos']['x'] >= 35), None),
               'minBackerGapBeforeContact': min(x['backerGap'] for x in rows if x['t'] >= release['t']),
               'atRunnerContactTick': rows[-1], 'teammateContactSamplesThroughContactTick': len(teammate),
               'peakTeammateContactBeforeContact': peak,
               'phase': row['phase'], 'endTime': row['endTime'], 'ending': row['outcome'],
               'yardsDescriptiveOnly': row['yards']}
    return summary, rows

summaries = []
tapes = []
for row in [*reference['rows'], alternate]:
    assert row['phase'] == 'dead' and row['endTime'] <= 5
    assert len(row['initial']) == 22
    assert all(len(f['before']) == len(f['after']) == 22 for f in row['frames'])
    summary, timeline = measured(row)
    summaries.append(summary)
    # All22 bodies/commands/RNG/contact records retain coupling. Profiles are
    # stored once at initialisation. Only irrelevant duplicated call bodies
    # and other actors' private behavior-cache observations are omitted.
    compact = {k: copy.deepcopy(row[k]) for k in ['id', 'source', 'inputSha256', 'initial', 'events', 'result']}
    compact['frames'] = []
    for f in row['frames']:
        v = copy.deepcopy(f)
        for k in ['before', 'after']:
            v[k] = [compact_body(b) for b in v[k]]
        compact['frames'].append(v)
    actors = {summary['climber'], summary['keeper']}
    compact['calls'] = [{k: (compact_body(v) if k == 'body' else v) for k, v in c.items()}
                        for c in row['calls'] if c['a'] in actors]
    compact['reads'] = [r for r in row['reads'] if r['a'] in actors]
    compact['joined'] = row['joined']
    compact['timeline'] = timeline
    tapes.append(compact)

assert summaries[2]['firstBackerLoadBeforeContact'] == 1.8
assert summaries[0]['firstBackerLoadBeforeContact'] is None
assert summaries[1]['firstBackerLoadBeforeContact'] is None
assert summaries[3]['firstBackerLoadBeforeContact'] is None
release_cue = next(c['acquiredDeparture'] for c in alternate['calls']
                   if c['a'] == 1 and c['method'] == 'startDeparture')
seen = {r['b']: r['picture'] for r in base['reads']
        if r['a'] == 1 and r['t'] == 1.8 and r['context'] == 'joined-security'}
start = frame(base, 1.8)['before'][1]['pos']
backer = seen[15]['pos']
distance = dist(start, backer)
ratio = max(0, distance - summaries[0]['strikeRadius']) / distance
near = {k: start[k] + ratio * (backer[k] - start[k]) for k in ['x', 'y']}
lane = {k: near[k] - start[k] for k in ['x', 'y']}
obstructions = []
for idx in [13, 4]:
    relative = {k: seen[idx]['pos'][k] - start[k] for k in ['x', 'y']}
    length2 = sum(v*v for v in lane.values())
    along = max(0, min(1, sum(relative[k]*lane[k] for k in lane) / max(1e-12, length2)))
    nearest = math.hypot(*(relative[k] - along*lane[k] for k in lane))
    radius = base['initial'][1]['profile']['radius'] + base['initial'][idx]['profile']['radius']
    initial = math.hypot(*relative.values())
    obstructions.append({'actor': idx, 'initialObservedGap': initial,
        'requiredBodyGap': radius, 'nearestObservedGapOnFirstStrikeSegment': nearest,
        'clearanceMarginAllowingExistingOverlap': nearest - min(radius, initial)})
assert any(o['clearanceMarginAllowingExistingOverlap'] < -1e-6 for o in obstructions)
dump('d06-first-eligible-witness.json', {'t': 1.8, 'initialization':
    'Replay D06 frozen full setup from snap; do not restore positions or fresh observer state alone.',
    'actualAll22BodiesBeforeDecision': frame(base, 1.8)['before'],
    'nativeConsumedJoinedCues': [r for r in base['reads'] if r['a'] == 1 and r['t'] == 1.8
                                and r['context'] == 'joined-security'],
    'nativeDiagnosticDeparture': release_cue, 'firstStrikeRadius': summaries[0]['strikeRadius'],
    'firstStrikeEndpointFromAcquiredPicture': near, 'obstructionsAtCurrentPicture': obstructions,
    'qualification': 'An acquired-picture segment check, not a future physically executable route forecast.'})
dump('measurements.json', {'schema': 'current-protection-access-reduction-v1', 'rows': summaries,
     'matchedDiagnostic': {'full22Initial': True, 'allSavedStagesIdenticalBefore': 1.8,
       'enteringBodiesAndConsumedJoinedCuesIdenticalAt': 1.8,
       'firstRawActors': [i for i in range(22) if frame(base, 1.8)['raw'][i] != frame(alternate, 1.8)['raw'][i]],
       'interpretation': 'Admission bypass rejects one existing detour; no proof that every continuous route is impossible.'}})
(OUT / 'paired-tapes.json.gz').write_bytes(gzip.compress(json.dumps({'referenceReceipt': reference['receipt'],
    'diagnosticReceipt': diagnostic['receipt'], 'rows': tapes}, separators=(',', ':')).encode(), mtime=0))
for name, path in [('reference-receipt.json', RAW / 'current/receipt.json'),
                   ('diagnostic-receipt.json', RAW / 'detour/receipt.json')]:
    (OUT / name).write_bytes(path.read_bytes())
dump('raw-hashes.json', {str(p.relative_to(ROOT)): {'sha256': sha(p), 'bytes': p.stat().st_size}
    for p in [RAW / 'current/trace.json.gz', RAW / 'detour/trace.json.gz']})

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig, axes = plt.subplots(1, 2, figsize=(11, 4.7), sharex=True, sharey=True)
for ax, row, title in zip(axes, [base, alternate], ['Accepted: release 2.55 s', 'Diagnostic only: release 1.80 s']):
    window = [f for f in row['frames'] if 1.8 <= f['t'] <= 2.9]
    for idx, label, color in [(1, 'LT', '#1669a7'), (4, 'LG', '#65a8cc'), (13, 'DT', '#777777'),
                              (15, 'Mike', '#c54835'), (6, 'RB', '#5c338b')]:
        ax.plot([f['before'][idx]['pos']['x'] for f in window],
                [f['before'][idx]['pos']['y'] for f in window], label=label, color=color, lw=2)
        for t, marker in [(1.8, 'o'), (2.9, 's')]:
            b = frame(row, t)['before'][idx]
            ax.scatter(b['pos']['x'], b['pos']['y'], marker=marker, color=color, s=34)
    ax.set_title(title, fontsize=11)
    ax.set_xlabel('Upfield position (yd)')
    ax.grid(alpha=.2)
    ax.set_aspect('equal', adjustable='box')
axes[0].set_ylabel('Cross-field position (yd)')
axes[1].legend(fontsize=8, loc='upper left', ncol=2)
fig.suptitle('D06: earlier release follows the advancing surface; neither arm loads Mike', fontsize=12)
fig.text(.5, .02, 'Circles: entering 1.80 s. Squares: entering contact tick 2.90 s. All22 react normally.', ha='center', fontsize=9)
fig.tight_layout(rect=[0,.05,1,.94])
fig.savefig(OUT / 'd06-access.png', dpi=160)
print(json.dumps({'cases': len(summaries), 'newNativeRunsInReducer': 0,
                   'portableTapeBytes': (OUT / 'paired-tapes.json.gz').stat().st_size,
                   'prefixAndControlAssertions': 'pass'}))
