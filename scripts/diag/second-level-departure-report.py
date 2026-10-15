"""Read-only adjudication of one exit-ranking trial; zero simulation steps."""
import gzip
import hashlib
import json
import math
from pathlib import Path

root = Path('data/reviews/current/second-level-departure-route')
prior = Path('data/reviews/current/second-level-access')
def packet(path):
    with gzip.open(path) as f:
        return json.load(f)
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def distance(a, b):
    return math.hypot(a['x']-b['x'], a['y']-b['y'])
def first_delta(b, c, key, actor=None):
    return next((x['t'] for x, y in zip(b['frames'], c['frames'])
                 if (x[key] if actor is None else x[key][actor]) !=
                    (y[key] if actor is None else y[key][actor])), None)
def frame(row, t):
    return next(f for f in row['frames'] if f['t'] == t)
def event_time(row, kind):
    return next((e['t'] for e in row['events'] if e['type'] == kind), None)

base = {r['id']: r for r in packet(prior/'current.json.gz')['rows']}
packets = [packet(root/name) for name in ['a030.json.gz', 'a018-a027.json.gz']]
trial = {r['id']: r for p in packets for r in p['rows']}
assert set(trial) == set(base) == {'A018', 'A030', 'A027'}
manifest = json.loads((prior/'inputs.json').read_text())
receipts = [json.loads((root/'receipts'/name).read_text()) for name in ['a030.json','a018-a027.json']]
turn_receipt = json.loads((root/'receipts/turn-probe.json').read_text())
assert all(p['receipt']['commit'] == '45bc8e6a56e4b86df348ea2a11bd340eefea70c9' for p in packets)
assert all(p['receipt']['inputManifestSha256'] == digest(prior/'inputs.json') for p in packets)
assert all(p['receipt']['flags'] == packets[0]['receipt']['flags'] for p in packets)
accepted_receipt = packet(prior/'current.json.gz')['receipt']
assert packets[0]['receipt']['flags'] == accepted_receipt['flags']
assert packets[0]['receipt']['worldDefaults'] == accepted_receipt['worldDefaults']
assert all(r['sourceSha256'] == '0c9e6f3a328d8fc3bae9390d7ab1c37be955574b96ff69f7ecaae70847ce2c17' for r in receipts)
assert all(r['exitCode'] == 0 and r['inputsUnchanged'] for r in receipts)
rows = []
for id in ['A018', 'A030', 'A027']:
    b, c = base[id], trial[id]
    assert b['initial'] == c['initial']
    assert b['inputSha256'] == c['inputSha256'] == next(r['inputSha256'] for r in manifest['rows'] if r['id'] == id)
    releases = lambda r: [e for e in r['events'] if e['type'] == 'block_climb']
    assert releases(b) == releases(c), 'No earlier release or member swap'
    row = {'id': id, 'inputSha256': c['inputSha256'], 'framesExactlyEqual': b['frames'] == c['frames'],
           'resultsExactlyEqual': b['result'] == c['result'], 'releasesExactlyEqual': True,
           'firstRawRTDifference': first_delta(b,c,'raw',2), 'firstRngDifference': first_delta(b,c,'rng')}
    for label, r in [('accepted', b), ('trial', c)]:
        f = frame(r,2.75)
        impacts = [{'t': f['t'], **contact} for f in r['frames'] for contact in f['report']['contacts']
                   if contact['i'] < 11 and contact['j'] < 11]
        row[label] = {'yards':r['yards'], 'nativeEnd':r['endTime'], 'phase':r['phase'],
                      'firstCarrierContact':event_time(r,'carrier_contact'), 'firstWrap':event_time(r,'tackle_wrap'),
                      'rtLbDistanceAtCommon275':distance(f['before'][2]['pos'],f['before'][15]['pos']),
                      'rtLbBlockEvents':[e for e in r['events'] if e['type']=='block_contact' and e.get('a')==2 and e.get('b')==15],
                      'offensiveImpacts':impacts}
    rows.append(row)
assert all(r['framesExactlyEqual'] and r['resultsExactlyEqual'] for r in rows if r['id'] in ['A018','A027'])
assert rows[1]['firstRawRTDifference'] == 1.85 and rows[1]['firstRngDifference'] == 2.8
b,c = base['A030'], trial['A030']
bf,cf = frame(b,1.85),frame(c,1.85)
assert bf['before'] == cf['before'] and bf['rng'] == cf['rng']
assert [i for i in range(22) if bf['raw'][i] != cf['raw'][i]] == [2]
assert [f for f in b['frames'] if f['t']<1.85] == [f for f in c['frames'] if f['t']<1.85]
reads = lambda r: [x for x in r['reads'] if x['t']==1.85 and x['a']==2 and 'leaveCombination' in x['context']]
assert reads(b)==reads(c) and [r['b'] for r in reads(c)]==[13,5,15]
def call(r):
    return next(x for x in r['calls'] if x['t']==1.85 and x['a']==2 and x['method']=='leaveCombination')
old,new = call(b),call(c)
assert old['before']==new['before'] and old['body']==new['body']
choices = {}
for label, r, f in [('accepted',old,bf),('trial',new,cf)]:
    read = r['after']['departureRead']; pos = r['body']['pos']
    close = {k:r['returned']['vel'][k]-read['flow'][k] for k in ['x','y']}
    choices[label] = {'body':r['body'], 'exit':read['exit'], 'flow':read['flow'],
        'approximateTwoSegmentDistance':distance(pos,read['exit'])+distance(read['exit'],read['backer']['pos']),
        'effectiveClosingComponent':close, 'raw':f['raw'][2], 'preSpacing':f['preSpacing'][2],
        'final':f['final'][2], 'after':f['after'][2]}
    assert f['raw'][2]['vel']==f['final'][2]['vel'], 'Spacing does not cause this first divergence'
    assert all(abs(close[k]+read['flow'][k]-r['returned']['vel'][k])<1e-12 for k in close)
assert choices['trial']['approximateTwoSegmentDistance']<choices['accepted']['approximateTwoSegmentDistance']
turn = packet(root/'turn-probe.json.gz')
assert turn['receipt']['intervention']['productionCandidate'] is False
assert turn_receipt['sourceSha256'] == accepted_receipt['sourceSha256']
assert turn_receipt['flags'] == receipts[0]['flags']
assert turn_receipt['exitCode']==0 and turn_receipt['inputsUnchanged']
tb,tc=base['A030'],turn['rows'][0]
assert [f for f in tb['frames'] if f['t']<1.6] == [f for f in tc['frames'] if f['t']<1.6]
assert frame(tb,1.6)['before']==frame(tc,1.6)['before']
assert frame(tb,1.6)['rng']==frame(tc,1.6)['rng']
assert [i for i in range(22) if frame(tb,1.6)['raw'][i]!=frame(tc,1.6)['raw'][i]]==[2]
turn_action=json.loads((root/'turn-action.json').read_text())
assert turn_action['prior']['t']==1.35
assert all(check['margin']>0 and check['opens'] for check in turn_action['checks'])
assert first_delta(tb,tc,'rng')==2.8
assert not [e for e in tc['events'] if e['type']=='block_contact' and e.get('a')==2 and e.get('b')==15]
assert not [a for f in tc['frames'] for a in f['report']['contacts'] if a['i']<11 and a['j']<11]
turn_summary={'decision':'One read of prior clear arc direction does not produce RT/LB contact. No continuity policy is certified or ruled out.',
    'testedCommit':turn_receipt['commit'],'runtimeSource':turn_receipt['sourceSha256'],
    'firstAction':1.6,'sameFull22PrefixAndRng':True,'firstChangedRng':2.8,
    'resumesNativeChoiceAt':1.85,'yards':tc['yards'], 'firstCarrierContact':event_time(tc,'carrier_contact'),
    'rtLbDistanceAtCommon275':distance(frame(tc,2.75)['before'][2]['pos'],frame(tc,2.75)['before'][15]['pos']),
    'offensiveImpacts':0}
witness = {'schema':'acquired-exit-ranking-witness-v1', 'id':'A030','t':1.85,
    'qualification':'Full22 frame is diagnostic, not a hydration format. Reproduce native prefix from frozen setup to preserve mind/perception history and normal reactions; no future runner path is frozen.',
    'input':next(r for r in manifest['rows'] if r['id']=='A030'), 'consumedCues':reads(c),
    'sameControllerStateBefore':old['before'], 'sameFrameBefore':bf['before'], 'choices':choices,
    'acceptedFrame':bf,'trialFrame':cf}
with gzip.open(root/'A030-first-choice.json.gz','wt') as f:
    json.dump(witness,f,separators=(',',':'))
summary = {'schema':'second-level-departure-review-v1', 'decision':'Reject exit-distance ranking; restore accepted controller. No demonstrated timely alternative.',
    'accepted':'90edc52530caa71efdebf257f17d954a8a629ea0','trial':'45bc8e6a56e4b86df348ea2a11bd340eefea70c9',
    'trialSource':receipts[0]['sourceSha256'], 'node':receipts[0]['node'],
    'flags':packets[0]['receipt']['flags'],'worldDefaults':packets[0]['receipt']['worldDefaults'],
    'rows':rows, 'firstChoice':choices,'oneReadTurnProbe':turn_summary,
    'cost':{'newCollectorExecutions':4,'fullGames':0,'newRosters':0,'fullSuiteRuns':0,
            'launcherSeconds':sum(c['elapsedSeconds'] for r in receipts+[turn_receipt] for c in r['commands']),
            'noAdditionalCodeTests':'Runtime trial rejected for no protection benefit; publication restores accepted source/tests byte-for-byte. Offline report has assertions; compatible baseline evidence reused.'},
    'limitations':['Two-segment distance ignores turning, acceleration and onward obstacles; not a feasible-intercept proof.',
       'A030 first changed geometry precedes changed execution draws; exact final-yardage attribution not isolated.',
       'One-read action resumes native decisions at1.85, not a persistent-side policy; no opposing screen paid for an action with no demonstrated protection benefit.',
       'No claim that all other routes fail, that RB caused the miss or that spacing is wrong.',
       'Known shared contact-law limitations remain; no physical law or default changed.']}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
paths = sorted(p for p in root.rglob('*') if p.is_file() and p.name!='artifacts.json')
(root/'artifacts.json').write_text(json.dumps({str(p):{'sha256':digest(p),'bytes':p.stat().st_size} for p in paths},indent=2)+'\n')
print(json.dumps({'decision':summary['decision'],'cases':[{k:r[k] for k in ['id','framesExactlyEqual','resultsExactlyEqual','firstRawRTDifference','firstRngDifference']} for r in rows], 'cost':summary['cost']},indent=2))
