"""Reduce saved native tapes. No simulations, sensing or controller edits."""
import gzip
import hashlib
import json
import math
import subprocess
from pathlib import Path

ROOT = Path('data/reviews/current/duo-transfer')
manifest = json.loads((ROOT / 'inputs.json').read_bytes())
current_file = Path('out/duo-transfer/current/trace.json.gz')
reference_file = Path('out/duo-transfer/reference/trace.json.gz')
sha = lambda data: hashlib.sha256(data).hexdigest()
read = lambda p: json.loads(gzip.decompress(p.read_bytes()))
current_data, reference_data = read(current_file), read(reference_file)
current = {r['id']: r for r in current_data['rows']}
reference = {r['id']: r for r in reference_data['rows']}
sources = {'current': 'dcebbee42fbe4cd64f603740d9b20bdf521ae424ad94e084eb46b30478b297e3',
           'reference': '78183dc79c6285939b80875b131584c18c4f0eda020c17bcfde6191823ace965'}
for arm, data in [('current', current_data), ('reference', reference_data)]:
    receipt = data['receipt']
    assert receipt['sourceSha256'] == sources[arm]
    assert receipt['flags'] == manifest['settings']['flags']
    assert receipt['worldDefaults'] == manifest['settings']['worldDefaults']
    assert receipt['node'] == 'v22.23.3'
    assert receipt['inputManifestSha256'] == sha((ROOT / 'inputs.json').read_bytes())
reuse = {}
for inp in manifest['rows']:
    cached = inp.get('cached')
    if not cached:
        continue
    for arm, field in [('current', 'candidate'), ('reference', 'reference')]:
        path = ROOT / 'reused' / cached[field]
        if str(path) not in reuse:
            if not path.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(subprocess.check_output(['git', 'show',
                    f"{manifest['cachedEvidence']}:data/reviews/current/combo-football-surface/{cached[field]}"]))
            reuse[str(path)] = read(path)
        data = reuse[str(path)]
        assert data['receipt']['sourceSha256'] == sources[arm]
        assert data['receipt']['flags'] == manifest['settings']['flags']
        assert data['receipt']['worldDefaults'] == manifest['settings']['worldDefaults']
        assert data['receipt']['node'] == 'v22.23.3'
        row = next(r for r in data['rows'] if r['id'] == inp['id'])
        (current if arm == 'current' else reference)[inp['id']] = row


def load_of(frame, blocker, defender):
    reps = [e for e in frame['afterReps'] if e['b'] == blocker and e['d'] == defender and e['hands']]
    return max((math.hypot(e['hands']['normal'] or 0, e['hands']['tangent'] or 0) for e in reps), default=0)


def actor_name(row, idx):
    return next((a['slot'] for a in row['initial'] if a['idx'] == idx), '?')


def summary(row, inp):
    assert row['source'] == sources['current'] or row['source'] == sources['reference']
    assert row['inputSha256'] == inp['inputSha256']
    frames, los = row['frames'], inp['setup']['los']
    rb = next(a['idx'] for a in row['initial'] if a['slot'] == 'RB')
    line = next((f for f in frames if f['after'][rb]['pos']['x'] >= los), None)
    contact = next((e for e in row['events'] if e['type'] == 'carrier_contact'), None)
    climbs = [e for e in row['events'] if e['type'] == 'block_climb']
    jobs = []
    for event in climbs:
        a, b = event['a'], event['b']
        loaded = [f for f in frames if f['t'] >= event['t'] and load_of(f, a, b) > 1e-6]
        first = loaded[0] if loaded else None
        closest = min((math.hypot(f['after'][a]['pos']['x'] - f['after'][b]['pos']['x'],
                                  f['after'][a]['pos']['y'] - f['after'][b]['pos']['y']) for f in frames
                       if f['t'] >= event['t'] and (not contact or f['t'] <= contact['t'])), default=None)
        jobs.append({'release': event['t'], 'climber': a, 'climberSlot': actor_name(row, a),
                     'backer': b, 'backerSlot': actor_name(row, b), 'note': event.get('note'),
                     'firstLoadedTick': first['t'] if first else None,
                     'loadedBeforeLos': bool(first and line and first['t'] <= line['t']),
                     'loadedBeforeFirstContact': bool(first and contact and first['t'] <= contact['t']),
                     'closestBeforeContact': closest,
                     'backerFirstCarrierContact': bool(contact and contact['b'] == b)})
    impacts = [{'t': f['t'], **c} for f in frames for c in f['report']['contacts']
               if c['i'] < 11 and c['j'] < 11 and c['impulse'] > 1e-6]
    combos = {}
    for a in row['initial']:
        c = a['plan']['combination'] if a['plan'] else None
        if c:
            key = str(sorted(c['members']))
            combos[key] = {'members': [actor_name(row, i) for i in c['members']],
                           'defender': actor_name(row, c['defender']), 'backer': actor_name(row, c['backer'])}
    return {'yards': row['yards'], 'end': row['endTime'], 'censor': row['censor'],
            'losTick': line['t'] if line else None,
            'losSpeed': math.hypot(*line['after'][rb]['vel'].values()) if line else None,
            'losY': line['after'][rb]['pos']['y'] if line else None,
            'firstContact': {**contact, 'defenderSlot': actor_name(row, contact['b'])} if contact else None,
            'jobs': jobs, 'offensiveImpacts': impacts, 'installedCombos': list(combos.values()),
            'nativeElapsedSeconds': row['elapsedSeconds']}


def difference(old, new):
    assert old['initial'] == new['initial'], 'Paired initial physical/job inputs'
    old_frames = {f['t']: f for f in old['frames']}
    first = None
    for f in new['frames']:
        if f['t'] not in old_frames:
            break
        prev = old_frames[f['t']]
        if f != prev:
            raw = [i for i in range(22) if f['raw'][i] != prev['raw'][i]]
            final = [i for i in range(22) if f['final'][i] != prev['final'][i]]
            moved = [i for i in range(22) if f['after'][i] != prev['after'][i]]
            first = {'tick': f['t'], 'enteringBodiesEqual': f['before'] == prev['before'],
                     'rawActors': raw, 'finalActors': final, 'achievedActors': moved,
                     'enteringRepsEqual': f['beforeReps'] == prev['beforeReps'],
                     'afterStepMainRngEqual': f['rng'] == prev['rng']}
            break
    return {'firstPhysicalOrRequestDifference': first,
            'fullFramesEqual': old['frames'] == new['frames'],
            'fullResultEqual': old['result'] == new['result'], 'eventsEqual': old['events'] == new['events']}


rows = []
for inp in manifest['rows']:
    item = {k: inp[k] for k in ['id', 'matchup', 'concept', 'front', 'formation', 'flip', 'inputSha256']}
    item['current'] = summary(current[inp['id']], inp)
    if inp['id'] in reference:
        item['reference'] = summary(reference[inp['id']], inp)
        item['comparison'] = difference(reference[inp['id']], current[inp['id']])
    rows.append(item)
    print(inp['id'], 'old', round(item.get('reference', {}).get('yards', 0), 2),
          'new', item['current']['yards'], 'LOS', item['current']['losTick'],
          round(item['current']['losSpeed'], 2) if item['current']['losSpeed'] else None,
          'contact', item['current']['firstContact']['defenderSlot'] if item['current']['firstContact'] else None,
          'climbs', [(j['climberSlot'], j['backerSlot'], j['release'], j['firstLoadedTick']) for j in item['current']['jobs']],
          'firstdiff', item.get('comparison', {}).get('firstPhysicalOrRequestDifference'),
          'impacts', len(item['current']['offensiveImpacts']))

receipt = {'schema': 'duo-transfer-reduction-v1', 'planSha256': sha((ROOT / 'inputs.json').read_bytes()),
           'currentSource': sources['current'], 'referenceSource': sources['reference'],
           'currentNativeReceipt': current_data['receipt'], 'referenceNativeReceipt': reference_data['receipt'],
           'newExecutions': len(current_data['rows']) + len(reference_data['rows']),
           'rawTraceSha256': {str(current_file): sha(current_file.read_bytes()),
                              str(reference_file): sha(reference_file.read_bytes())},
           'reusedFiles': {p: sha(Path(p).read_bytes()) for p in reuse},
           'clock': 'Frame tick t labels achieved state after World interval [t,t+.05]. Native block_contact events use t+.05; native carrier contact and block_climb use t. Tables compare frame clocks consistently.',
           'rows': rows}
(ROOT / 'summary.json').write_text(json.dumps(receipt, indent=2) + '\n')

# Re-evaluate only the already-computed pure corridor/admission predicates.
# This is not a physical continuation or a new observer history.
states = []
for case in ['D05', 'D06', 'A018']:
    row = current[case]
    for joined in row['joined']:
        t = joined['t']
        if t > 2.6:
            continue
        f = next(f for f in row['frames'] if f['t'] == t)
        for c in joined['after']:
            for index, actor in enumerate(c['members']):
                personal = c.get('reads', [])
                if not personal or personal[index]['readAt'] != t:
                    continue
                keeper = next(a for a in c['members'] if a != actor)
                seen = {r['b']: r['picture'] for r in row['reads']
                        if r['t'] == t and r['a'] == actor and r['context'] == 'joined-security'}
                if not all(i in seen for i in [keeper, c['defender'], c['backer']]):
                    continue
                dt = personal[index]['nextRead'] - t
                states.append({'case': case, 't': t, 'actor': actor,
                    'actorSlot': actor_name(row, actor), 'keeperSlot': actor_name(row, keeper),
                    'backerSlot': actor_name(row, c['backer']), 'dt': dt,
                    'a': {'pos': f['before'][actor]['pos'], 'profile': f['before'][actor]['profile'],
                          'mind': {'decisionInterval': dt}},
                    'defender': {'profile': f['before'][c['defender']]['profile']},
                    'partner': {'profile': f['before'][keeper]['profile']},
                    'down': seen[c['defender']], 'covered': seen[keeper], 'backer': seen[c['backer']],
                    'runnerPicture': seen.get(6),
                    'nativeProposal': personal[index]['proposal']})
(ROOT / 'route-states.json').write_text(json.dumps(states, separators=(',', ':')) + '\n')

stages = []
for case in ['A030', 'A018', 'D05', 'D07']:
    row = current[case]
    departure = [c for c in row['calls'] if c['a'] == 5 and c['method'] == 'leaveCombination']
    interception = [c for c in row['calls'] if c['a'] == 5 and c['method'] == 'plannedClimb']
    entry = {'case': case,
             'departureFirstLast': [departure[0]['t'], departure[-1]['t']] if departure else None,
             'firstPlannedInterception': interception[0]['t'] if interception else None,
             'firstRunnerContact': next((e for e in row['events'] if e['type'] == 'carrier_contact'), None)}
    if case == 'A018':
        f = next(f for f in row['frames'] if f['t'] == 2.5)
        entry['sample2_50'] = {'raw': f['raw'][5], 'final': f['final'][5],
                               'achievedPosition': f['after'][5]['pos'], 'achievedVelocity': f['after'][5]['vel'],
                               'bodySupport': f['after'][5]['support'],
                               'departureRead': next(c for c in departure if c['t'] == 2.5)['after']['departureRead']}
    stages.append(entry)
(ROOT / 'collection-stages.json').write_text(json.dumps(stages, indent=2) + '\n')

# Publish compact all-player tapes; full source-state captures stay in out/.
def thin(row):
    return {'id': row['id'], 'source': row['source'], 'inputSha256': row['inputSha256'],
            'slots': [a['slot'] for a in row['initial']], 'events': row['events'],
            'frames': [{'t': f['t'], 'agents': [{'pos': b['pos'], 'vel': b['vel'], 'facing': b['facing'],
                'support': {k: b.get('support', {}).get(k) for k in ['state', 'posture', 'xi', 'lean', 'load']}}
                for b in f['after']], 'raw': f['raw'], 'preSpacing': f['preSpacing'], 'final': f['final'],
                'afterReps': f['afterReps'], 'contacts': f['report']['contacts'], 'rng': f['rng']}
                for f in row['frames']]}
compact = {'clock': receipt['clock'], 'reference': [thin(r) for r in reference.values()],
           'current': [thin(r) for r in current.values()]}
with gzip.GzipFile(filename=str(ROOT / 'paired-tapes.json.gz'), mode='wb', mtime=0) as dest:
    dest.write(json.dumps(compact, separators=(',', ':')).encode())
