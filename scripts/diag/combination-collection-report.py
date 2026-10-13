"""Compact bounded receipt; reuse actual 4ded6b6 inputs, never run a census."""
import gzip
import hashlib
import json
from pathlib import Path

root = Path('out/combination-collection')
manifest = json.loads(Path('docs/reviews/combination-collection-inputs.json').read_text())
candidate = json.loads(gzip.decompress((root / 'controls-on.json.gz').read_bytes()))
native = json.loads((root / 'candidate-native.json').read_text())
ids = {i['id'] for i in manifest['inputs']}
baseline = {}
for shard in range(6):
    packet = json.loads(gzip.decompress(Path(f'out/run-hand-coherence/baseline-{shard:02}.json.gz').read_bytes()))
    assert packet['provenance']['commit'] == manifest['comparisonCommit']
    for play in packet['panel']:
        if play['input']['id'] in ids:
            baseline[play['input']['id']] = play
assert set(baseline) == ids


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def metrics(play):
    rb = next(a['id'] for a in play['players'] if a['slot'] == 'RB')
    slots = {a['id']: a['slot'] for a in play['players']}
    contact = next((e for e in play['events'] if e['type'] == 'carrier_contact' and rb in (e.get('a'), e.get('b'))), None)
    crossing = next((f['after'] for f in play['frames'] if f.get('carrier') == rb and f['agents'][rb]['pos']['x'] >= 40), None)
    first = contact['t'] if contact else play['endTime']
    load = {}
    for frame in play['frames']:
        for block in frame['blocks']:
            hand = block.get('hands')
            if slots[block['defender']].startswith('LB') and hand and abs(hand['normal']) + abs(hand['tangent']) > 1e-6:
                load.setdefault(slots[block['defender']], frame['t'])
    return dict(gain=play['gain'], endTime=play['endTime'], censored=play['live'], outcome=play['outcome'],
                firstContact=contact, crossing=crossing,
                loadedBackersBeforeRunner={k: v for k, v in load.items() if v < first},
                climbs=[dict(t=e['t'], climber=slots[e['a']], backer=slots[e['b']], note=e['note'])
                        for e in play['events'] if e['type'] == 'block_climb'])


rows = []
for after in candidate['panel']:
    before = baseline[after['input']['id']]
    assert after['observerNeutral'] and before['observerNeutral']
    assert after['input'] == before['input'] and after['initial'] == before['initial']
    assert [a['profile'] for a in after['players']] == [a['profile'] for a in before['players']]
    # Policy bookkeeping is real state. Do not relabel physical equality as
    # complete state/RNG parity: acquired extra checks change combination state.
    def physics(play):
        return [dict(t=f['t'], physics=f['physicsInput']) for f in play['frames']]
    bm, am = metrics(before), metrics(after)
    rows.append(dict(input=after['input'], before=bm, after=am,
                     fullHistoryExact=before['hashes'] == after['hashes'],
                     worldHistoryExact=physics(before) == physics(after),
                     gainDifference=after['gain']-before['gain'],
                     beforeHistorySha256=digest(before['hashes']), afterHistorySha256=digest(after['hashes'])))

failed = next(p for p in candidate['panel'] if p['input']['id'] == 'new-wz_strong-s23')
failed_before = baseline[failed['input']['id']]
peer = json.loads(gzip.decompress((root/'keeper-peer.json.gz').read_bytes()))
assert len(peer['panel']) == 1 and peer['panel'][0]['observerNeutral']
assert peer['panel'][0]['hashes'] == failed['hashes'], 'Peer observation changed the failed witness'
failed = peer['panel'][0]
def compact_frame(play, t):
    f = next(f for f in play['frames'] if f['t'] == t)
    agents = []
    for a in f['agents']:
        if a['id'] not in [2, 6, 7, 12, 17]:
            continue
        q = dict(a)
        q['support'] = {k:v for k,v in q['support'].items() if k in
                        ['state','xi','posture','lean','load','felt','out','feetVel','feetLock']}
        if q.get('work'):
            q['work'] = {k:v for k,v in q['work'].items() if k in ['kind','target','drive','climbTo','departure']}
        agents.append(q)
    cues = {}
    for c in f['cues']:
        if c.get('defender') not in [2,7,12,17] or c.get('opponent') not in [0,2,6,7,12,17]:
            continue
        key = json.dumps(c, sort_keys=True)
        if key not in cues:
            cues[key] = dict(c, calls=0)
        cues[key]['calls'] += 1
    return dict(t=t, agents=agents,
                blocks=[b for b in f['blocks'] if b['defender'] == 12],
                cues=list(cues.values()),
                contactEvents=[c for c in f['contactEvents'] if c['defender'] == 12])
details = dict(input=failed['input'], baseline=metrics(failed_before), candidate=metrics(failed),
               label='Saved native controller/contact trace, not a future-path oracle',
               before=[compact_frame(failed_before,t) for t in [1.2,1.3,1.65,2.5]],
               after=[compact_frame(failed,t) for t in [1.2,1.3,1.65,2.5]])
Path('docs/reviews/combination-keeper-trace.json').write_text(json.dumps(details, indent=2)+'\n')
arms = []
for r in native['rows']:
    loads = [f['t'] for f in r['frames'] if any(e['blocker']=='RG' and e['defender']=='LB_W' and e['force']>1e-6 for e in f['engagements'])]
    arms.append({k:r[k] for k in ['id','historySha256','gain','outcome','endTime','censored']} | {
        'helperFirstBackerLoad': min(loads) if loads else None,
        'events':[e for e in r['events'] if e['type'] in ['block_climb','carrier_contact','fall']]})
receipt = dict(protocol='combination-collection-bounded-results-v1', comparisonCommit=manifest['comparisonCommit'],
               trialCommit='4074038', trialSourceSha256=candidate['provenance']['sourceSha256'],
               finalRuntimeSourceSha256='09c65f70ff3835dba17fb08487582d65f49eaea827f4e6e48f396f93210b773c',
               disposition='Withdrawn: loses first-level protection in one preserved WZ control; no expansion or promotion.',
               manifest=manifest, candidateProvenance=candidate['provenance'],
               launcher=json.loads((root/'controls-on-receipt.json').read_text()),
               nativeInput=native['input'], nativeSourceSha256=native['sourceSha256'],
               nativeMethod='One reconstructed game prefix; graph clones must reproduce saved complete history; each arm observed/plain exact. Candidate installed only on named snap; prefix uses default flags.',
               nativeArms=arms, controls=rows, observedPlainPairs=len(arms)+len(rows),
               keeperLawWitness='combination-keeper-world-witness.json',
               peerCueProvenance=peer['provenance'],
               peerCueLauncher=json.loads((root/'keeper-peer-receipt.json').read_text()),
               keeperReplay=json.loads((root/'keeper-replay-receipt.json').read_text()))
if (root/'native-pin.json').exists():
    pin = json.loads((root/'native-pin.json').read_text())
    assert pin['rows'][0]['historySha256'] == native['rows'][0]['historySha256']
    receipt['nativePin'] = {'input':pin['input'], 'sourceSha256':pin['sourceSha256'],
                           'historySha256':pin['rows'][0]['historySha256'],
                           'launcher':json.loads((root/'native-pin-receipt.json').read_text())}
Path('docs/reviews/combination-collection-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(dict(worldExact=sum(r['worldHistoryExact'] for r in rows),
                      fullExact=sum(r['fullHistoryExact'] for r in rows),pairs=receipt['observedPlainPairs'],
                      controls=[dict(id=r['input']['id'],delta=r['gainDifference'],worldExact=r['worldHistoryExact']) for r in rows]),indent=2))
