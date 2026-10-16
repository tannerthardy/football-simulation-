"""Reduce existing all-player native recordings; executes no simulation."""
import gzip
import hashlib
import json
import math
import shutil
from pathlib import Path

ROOT = Path('data/reviews/current/combo-strike-access')
OUT = Path('out/combo-strike')
OLD = Path('/workspace/football-duo-transfer')
REF = Path('/workspace/football-combo-strike-reference/out/combo-strike')
SOURCE = 'bed54d7389957f713c4a8a61e899fff1ea707f2545bd275e1fb8ff814e65bf37'
BASE = 'dcebbee42fbe4cd64f603740d9b20bdf521ae424ad94e084eb46b30478b297e3'
sha = lambda b: hashlib.sha256(b).hexdigest()
load = lambda p: json.loads(gzip.decompress(p.read_bytes()))
write = lambda name, value: (ROOT / name).write_text(json.dumps(value, indent=2) + '\n')
manifest_bytes = (ROOT / 'inputs.json').read_bytes()
manifest = json.loads(manifest_bytes)
inputs = {r['id']: r for r in manifest['rows']}
receipts, originals, candidate = [], {}, {}

def accept(path, source, mapping, exact_manifest=False):
    data = load(path)
    rec = data['receipt']
    assert rec['sourceSha256'] == source
    assert rec['flags'] == manifest['settings']['flags']
    assert rec['worldDefaults'] == manifest['settings']['worldDefaults']
    assert rec['node'] == 'v22.23.3'
    if exact_manifest:
        assert rec['inputManifestSha256'] == sha(manifest_bytes)
    for row in data['rows']:
        assert row['source'] == source
        assert row['inputSha256'] == inputs[row['id']]['inputSha256']
        mapping[row['id']] = row
    receipts.append({'path': str(path), 'sha256': sha(path.read_bytes()), 'receipt': rec})
    return data

for batch in ['initial', 'controls', 'power-transfer']:
    accept(OUT / batch / 'trace.json.gz', SOURCE, candidate, True)
old_path = OLD / 'out/duo-transfer/current/trace.json.gz'
old_data = accept(old_path, BASE, originals)
assert old_data['receipt']['inputManifestSha256'] == sha((OLD / 'data/reviews/current/duo-transfer/inputs.json').read_bytes())
for name in ['candidate-a030.json.gz', 'candidate-controls.json.gz', 'under-candidate.json.gz']:
    accept(OLD / 'data/reviews/current/duo-transfer/reused' / name, BASE, originals)

def frame(row, t):
    return next(f for f in row['frames'] if abs(f['t'] - t) < 1e-8)

def slot(row, i):
    return row['initial'][i]['slot']

def force(f, b, d):
    return max((math.hypot(r['hands']['normal'] or 0, r['hands']['tangent'] or 0)
                for r in f['afterReps'] if r['b'] == b and r['d'] == d and r['hands']), default=0)

def compact_body(b):
    keys = ['pos', 'vel', 'facing', 'spin', 'energy', 'squeeze']
    result = {k: b[k] for k in keys if k in b}
    if b.get('support'):
        result['support'] = {k: b['support'].get(k) for k in ['state', 'posture', 'load', 'felt', 'xi', 'lean']}
    return result

def compact(row):
    return {**{k: row[k] for k in ['id', 'source', 'inputSha256', 'initial', 'events', 'phase', 'endTime', 'censor']},
            'result': {k: row['result'].get(k) for k in ['outcome', 'offenseYards', 'time']},
            'frames': [{**{k: f[k] for k in ['t', 'raw', 'final', 'afterReps', 'rng']},
                        'contacts': f['report']['contacts'],
                        'after': [{k: b[k] for k in ['pos', 'vel', 'facing']} for b in f['after']]}
                       for f in row['frames']],
            'collectionCalls': [{k: v for k, v in c.items() if k != 'body'} for c in row['calls']
                                if c['method'] in ['leaveCombination', 'plannedClimb', 'startDeparture']],
            'collectionCues': [r for r in row['reads'] if 'leaveCombination' in r['context']]}

def describe(row):
    rb = next(a['idx'] for a in row['initial'] if a['slot'] == 'RB')
    los = inputs[row['id']]['setup']['los']
    line = next((f for f in row['frames'] if f['after'][rb]['pos']['x'] >= los), None)
    contact = next((e for e in row['events'] if e['type'] == 'carrier_contact'), None)
    jobs = []
    for e in row['events']:
        if e['type'] != 'block_climb':
            continue
        loads = [f for f in row['frames'] if f['t'] >= e['t'] and force(f, e['a'], e['b']) > 1e-6]
        calls = [c for c in row['calls'] if c['a'] == e['a'] and c['t'] >= e['t'] and c['method'] == 'plannedClimb']
        jobs.append({'release': e['t'], 'climber': slot(row, e['a']), 'backer': slot(row, e['b']),
                     'firstPlanner': calls[0]['t'] if calls else None,
                     'firstLoadedTick': loads[0]['t'] if loads else None,
                     'nativeContactEvent': next((x['t'] for x in row['events'] if x['type'] == 'block_contact'
                                                and x.get('a') == e['a'] and x.get('b') == e['b'] and x['t'] >= e['t']), None)})
    impacts = [{'t': f['t'], **c} for f in row['frames'] for c in f['report']['contacts']
               if c['i'] < 11 and c['j'] < 11 and c['impulse'] > 1e-6]
    return {'phase': row['phase'], 'endTime': row['endTime'], 'censor': row['censor'],
            'finalYards': row['yards'] if row['phase'] != 'live' else None,
            'liveRunnerX': row['frames'][-1]['after'][rb]['pos']['x'] if row['phase'] == 'live' else None,
            'lineArrivalTick': line['t'] if line else None,
            'lineArrivalSpeed': math.hypot(*line['after'][rb]['vel'].values()) if line else None,
            'firstCarrierContact': {**contact, 'defender': slot(row, contact['b'])} if contact else None,
            'jobs': jobs, 'offensiveImpacts': impacts,
            'offensiveImpactsBeforeFirstContact': [i for i in impacts if contact and i['t'] <= contact['t']],
            'offensiveImpactsThroughLineArrival': [i for i in impacts if line and i['t'] <= line['t']]}

def compare(old, new):
    assert old['initial'] == new['initial']
    first = next(((a, b) for a, b in zip(old['frames'], new['frames']) if a != b), None)
    change = None
    if first:
        a, b = first
        change = {'t': b['t'], 'enteringBodiesEqual': a['before'] == b['before'],
                  'postControllerPreWorldRepresentationsEqual': a['beforeReps'] == b['beforeReps'],
                  'rawActors': [i for i in range(22) if a['raw'][i] != b['raw'][i]],
                  'finalActors': [i for i in range(22) if a['final'][i] != b['final'][i]],
                  'afterWorldRngEqual': a['rng'] == b['rng']}
    return {'firstDifference': change, 'fullFramesEqual': old['frames'] == new['frames'],
            'fullResultEqual': old['result'] == new['result'], 'eventsEqual': old['events'] == new['events']}

ids = ['A018', 'A030', 'DuoUnder', 'D05', 'D06', 'D07', 'A027', 'POWER']
rows, tapes = [], []
for key in ids:
    old, new = originals[key], candidate[key]
    row = {'id': key, **{k: inputs[key][k] for k in ['concept', 'front', 'formation', 'flip', 'inputSha256']},
           'reference': describe(old), 'candidate': describe(new), 'comparison': compare(old, new)}
    rows.append(row)
    tapes.append({'reference': compact(old), 'candidate': compact(new)})
    print(key, 'contact', row['reference']['firstCarrierContact']['defender'], row['candidate']['firstCarrierContact']['defender'],
          'yards', row['reference']['finalYards'], row['candidate']['finalYards'],
          'exact frames/result', row['comparison']['fullFramesEqual'], row['comparison']['fullResultEqual'])

# The targeted adverse-result recorder must not alter either native execution.
response = {}
for arm, path, base, source in [
    ('reference', REF / 'response-reference/trace.json.gz', originals['D05'], BASE),
    ('candidate', OUT / 'response-candidate/trace.json.gz', candidate['D05'], SOURCE)]:
    data = accept(path, source, {}, True)
    row = data['rows'][0]
    assert row['frames'] == base['frames'] and row['result'] == base['result']
    f = frame(row, 3.25)
    response[arm] = {'observerFramesExact': True, 'observerResultExact': True,
                     'preAttemptBodies': {str(i): compact_body(f['before'][i]) for i in [6, 21]},
                     'requests': {str(i): {'raw': f['raw'][i], 'final': f['final'][i]} for i in [6, 21]},
                     'events': [e for e in row['events'] if 3.2 <= e['t'] <= 3.9],
                     'consumedCues': [r for r in row['reads'] if (r['a'], r['b']) in [(6, 21), (21, 6)]
                                      and 3.15 <= r['t'] <= 3.3]}
ss_old, ss_new = frame(originals['D05'], 3.25), frame(candidate['D05'], 3.25)
response['preAttemptPositionDeltaYd'] = {str(i): math.dist(tuple(ss_old['before'][i]['pos'].values()),
                                                        tuple(ss_new['before'][i]['pos'].values())) for i in [6, 21]}
response['interpretation'] = ('Both safety tackle attempts occur at3.25. Reference missed_tackle; candidate initial wrap, then slip3.55. '
    'Near-identical approach and observation, not demonstrated lost lane protection. Earlier engagement changes RNG alignment; '
    'an exact probability/draw decomposition was not recorded and is not claimed.')
write('d05-response.json', response)

# First causal state is portable with all22 bodies plus the fixed native setup.
old, new = originals['A018'], candidate['A018']
fo, fn = frame(old, 2.3), frame(new, 2.3)
assert fo['before'] == fn['before']
assert [f for f in old['frames'] if f['t'] < 2.3] == [f for f in new['frames'] if f['t'] < 2.3]
cues = [r for r in new['reads'] if abs(r['t'] - 2.3) < 1e-8 and r['a'] == 5]
call = next(c for c in new['calls'] if c['a'] == 5 and abs(c['t'] - 2.3) < 1e-8 and c['method'] == 'leaveCombination')
strike = new['initial'][5]['profile']['radius'] + new['initial'][15]['profile']['radius'] + .1
strike += inputs['A018']['setup']['offense']['RG']['measurables']['armIn'] / 36 * .45
def segment_distance(p, a, b):
    dx, dy = b['x'] - a['x'], b['y'] - a['y']
    fraction = max(0, min(1, ((p['x'] - a['x'])*dx + (p['y'] - a['y'])*dy) / max(1e-12, dx*dx + dy*dy)))
    return math.hypot(p['x'] - a['x'] - fraction*dx, p['y'] - a['y'] - fraction*dy)
geometry = {'existingStrikeRangeYd': strike,
            'actualRgMikeCenterDistanceYd': math.dist(tuple(fn['before'][5]['pos'].values()), tuple(fn['before'][15]['pos'].values())),
            'thinSegmentClearancePastTorsoYd': {slot(new, i): segment_distance(fn['before'][i]['pos'], fn['before'][5]['pos'],
                 fn['before'][15]['pos']) - new['initial'][i]['profile']['radius'] for i in [2, 13]}}
write('a018-first-difference.json', {'clock': 'Tick2.30 executes [2.30,2.35]; native block_contact is2.35.',
    'setupFixture': 'test/fixtures/combo-strike-access.json.gz', 'setupInputSha256': inputs['A018']['inputSha256'],
    'beforeAll22': fn['before'], 'allEarlierFramesExact': True,
    'referencePostControllerPreWorldReps': fo['beforeReps'], 'candidatePostControllerPreWorldReps': fn['beforeReps'],
    'beforeController': call['before'], 'consumedCues': cues,
    'geometry': geometry, 'referenceRaw': fo['raw'], 'referenceFinal': fo['final'],
    'candidateRaw': fn['raw'], 'candidateFinal': fn['final'],
    'referenceAchieved': fo['after'], 'candidateAchieved': fn['after'],
    'candidateLoadThroughRunnerArrival': [{'t': f['t'], 'rgMikeForce': force(f, 5, 15), 'rtDtForce': force(f, 2, 13),
        'reps': [r for r in f['afterReps'] if (r['b'], r['d']) in [(5, 15), (2, 13)]]}
        for f in new['frames'] if 2.3 <= f['t'] <= 2.7],
    'qualification': 'Exact native prefix reproduction, not an arbitrary-state hydrator. Thin segment clearance rules out obvious intervening torso crossing; not a new anatomical law.'})

max_residual, max_excess = 0, 0
for row in candidate.values():
    for f in row['frames']:
        for b in f['after']:
            for value in [*b['pos'].values(), *b['vel'].values(), b['facing']]:
                assert math.isfinite(value)
        max_residual = max(max_residual, abs(f['report']['work']['residual']))
        max_excess = max(max_excess, max((a-b for a,b in zip(f['report']['armImpulse'], f['report']['armImpulseLimit'])), default=0))
assert max_excess <= 1e-8
write('native-integrity.json', {'finitePositionsVelocitiesFacing': True,
    'maxRepresentedWorkResidual': max_residual, 'maxArmImpulseOverExistingLimit': max_excess,
    'qualification': 'Recorded numerical accounting checks under unchanged accepted law; no certification of all anatomical realism.'})

launchers = list(OUT.glob('*.json')) + list(REF.glob('*.json'))
costs, command_seconds, native_command_seconds = [], 0, 0
(ROOT / 'receipts').mkdir(exist_ok=True)
for path in sorted(launchers):
    value = json.loads(path.read_bytes())
    if 'commands' not in value:
        continue
    seconds = sum(c['elapsedSeconds'] for c in value['commands'])
    is_native = any('scripts/diag/combo-strike-' in ' '.join(c['command']) for c in value['commands'])
    command_seconds += seconds
    native_command_seconds += seconds if is_native else 0
    name = path.name if path.parent == OUT else 'reference-' + path.name
    shutil.copyfile(path, ROOT / 'receipts' / name)
    costs.append({'file': 'receipts/' + name, 'exitCode': value['exitCode'], 'seconds': seconds,
                  'native': is_native, 'commit': value['commit'], 'source': value['sourceSha256']})
write('summary.json', {'schema': 'combo-strike-access-review-v1', 'base': '86250bb4f0c6f421878c204161864d523c3e30b6',
    'queuePin': 'ef214373f9dd101a044b5246879c7e5007c8fb55', 'referenceSource': BASE, 'candidateSource': SOURCE,
    'inputManifestSha256': sha(manifest_bytes), 'clock': 'Frame t is World[t,t+.05]. Block contact event=t+.05. Other native event clocks retained.',
    'newNativeExecutions': 10, 'newNativeCommandSeconds': native_command_seconds,
    'allLauncherCommandSecondsIncludingFailures': command_seconds, 'costs': costs,
    'rawReceiptsAndHashes': receipts, 'rows': rows})
(ROOT / 'paired-tapes.json.gz').write_bytes(gzip.compress(json.dumps(tapes, separators=(',', ':')).encode(), mtime=0))
print('geometry', geometry)
print('D05 attempt pre-state delta', response['preAttemptPositionDeltaYd'])
print('cost', native_command_seconds, command_seconds)
