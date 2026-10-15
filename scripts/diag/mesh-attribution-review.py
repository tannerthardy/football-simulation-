"""Reduce only the named saved/captured mesh evidence. Zero simulations."""
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/mesh-attribution')
read = lambda p: json.loads(gzip.open(p).read()) if str(p).endswith('.gz') else json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
round_js = lambda x, n: math.floor(x * 10 ** n + .5) / 10 ** n
saved_path = root / 'flex-windows.json.gz'
assert sha(saved_path) == '11637c8ff81b32b06faa21f87995fc870e37ff089d4f03496717856b5eb05191'
saved = read(saved_path)
compatibility = []
comparison = []
for c in saved['cases']:
    case_id = c['caseId']
    baseline = read(root / 'bend-v1' / f'{case_id}-accepted.json.gz')
    candidate = read(root / ('bend-v1' if case_id == 'A008' else 'bend-v2') / f'{case_id}-bend.json.gz')
    ticks = {k['t']: k for k in baseline['ticks']}
    checked = []
    errors = []
    for r in c['rows']:
        if r['t'] not in ticks:
            continue
        k = ticks[r['t']]
        checked.append(r['t'])
        for a in r['agents']:
            idx = a['idx']
            b = k['agents'][idx]
            cmd = k['commands'][idx]
            pairs = [
                ('position', r['frame']['agents'][idx*3:idx*3+2], [round_js(b['pos'][q], 1) for q in ['x','y']]),
                ('velocity', a['achievedVelocity'], [round_js(b['vel'][q], 2) for q in ['x','y']]),
                ('request', a['finalIntent']['velocity'], [round_js(cmd['vel'][q], 2) for q in ['x','y']]),
            ]
            errors.extend({'t': r['t'], 'actor': idx, 'field': name, 'saved': x, 'current': y} for name,x,y in pairs if x != y)
    # Exclude the ending clock: some native events use enclosing tick time,
    # others use the post-physics interval boundary. Interior event bytes match.
    cutoff = baseline['stoppedAt']
    old_events = [e for e in c['events'] if e['t'] < cutoff]
    new_events = [e for e in baseline['events'] if e['t'] < cutoff]
    compatibility.append({'caseId': case_id, 'rawSha256': c['rawSha256'], 'inputSha256': c['inputSha256'],
        'checkedFrameClocks': checked, 'actorFrames': len(checked)*22, 'fieldDifferences': errors,
        'interiorNativeEventsEqual': old_events == new_events,
        'limit': 'Positions at0.1yd, velocities/requests at0.01yd/s only; not a bit-exact full-state claim.'})
    assert not errors and old_events == new_events
    def impacts(d):
        return [{'tick': k['t'], **p} for k in d['ticks'] for p in k['contacts'] if p['i'] == 15 and p['j'] == 21]
    def summary(d):
        return {'stoppedAt': d['stoppedAt'], 'outcome': d['outcome'], 'changes': len(d['changes']),
            'firstChangedTick': d['changes'][0]['t'] if d['changes'] else None,
            'SS_LBM_contacts': impacts(d),
            'footballEvents': [e for e in d['events'] if e['type'] in ['throw','catch','carrier_contact','tackle_wrap','tackle']
                or e['type']=='block_contact' and e.get('a')==9 and e.get('b')==17],
            'zeroSSRequests': [k['t'] for k in d['ticks'] if k['commands'][21]['vel']=={'x':0,'y':0}],
            'SS_H_gaps': {str(k['t']): math.dist(list(k['agents'][21]['pos'].values()),list(k['agents'][10]['pos'].values()))
                for k in d['ticks'] if k['t'] in [2.25,2.4,2.5,2.7,2.9,3.35,3.7,5.]}}
    comparison.append({'caseId':case_id,'accepted':summary(baseline),'rejectedBend':summary(candidate),
        'allTicksEqual':baseline['ticks']==candidate['ticks'], 'allEventsEqual':baseline['events']==candidate['events']})
neutral = read(root/'capture-v1/summary.json')
assert all(r['neutral'] for r in neutral['rows'])
receipts = [p for p in root.glob('*receipt.json')] + [root/'typecheck.json',root/'observer-tests.json',root/'final-typecheck.json']
# Retain failed/intermediate receipts; sum costs, never relabel a failure.
costs = [{'path':str(p),'exitCode':d['exitCode'],'seconds':sum(c['elapsedSeconds'] for c in d['commands'])}
    for p in receipts if p.exists() for d in [read(p)] if 'commands' in d]
if (root/'final-typecheck-pass.json').exists():
    p=root/'final-typecheck-pass.json';d=read(p)
    costs.append({'path':str(p),'exitCode':d['exitCode'],'seconds':sum(c['elapsedSeconds'] for c in d['commands'])})
summary = {'schema':'mesh-attribution-review-v1','savedRuntime':saved['acceptedRuntime'],'savedSourceSha256':saved['sourceSha256'],
    'acceptedBase':'90edc52530caa71efdebf257f17d954a8a629ea0','diagnosticSourceSha256':neutral['provenance']['sourceSha256'],
    'savedWindowSha256':sha(saved_path),'compatibility':compatibility,'observerNeutrality':neutral['rows'],'coupledComparison':comparison,
    'decision':'Reject bend behavior; submit passive attribution diagnostic only. Specific release/forecast limitation remains.',
    'nativeExecutions':20,'maxNativeClock':5.6,'fullGames':0,'generatedRosters':0,
    'costs':costs,'totalRecordedLauncherSeconds':sum(c['seconds'] for c in costs),
    'files':{str(p.relative_to(root)):sha(p) for p in root.rglob('*') if p.is_file() and p.name!='review.json'}}
(root/'review.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'savedActorFrames':sum(r['actorFrames'] for r in compatibility),'differences':0,
    'observerNeutralPairs':4,'nativeExecutions':20,'recordedLauncherSeconds':summary['totalRecordedLauncherSeconds']}))
