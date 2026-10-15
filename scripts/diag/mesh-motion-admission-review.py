"""Review the two named continuations and the single opening diagnostic. No sims."""
import gzip
import hashlib
import json
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv)>1 else 'out/motion-admission')
saved_root = Path('data/reviews/current/mesh-command-attribution')
def read(p):
    return json.loads(gzip.open(p).read()) if str(p).endswith('.gz') else json.loads(p.read_text())
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
old_windows = read(saved_root/'flex-windows.json.gz')
first_old = read(root/'reference-opening/A044.json.gz')
first_new = read(root/'native-v1/A044.json.gz')
lookup = {(s['t'],s['actor'],s['stage']):s for s in first_old['stages'] if s['stage'] in ['behavior','spacing']}
fork = None
for s in first_new['stages']:
    key=(s['t'],s['actor'],s['stage']);old=lookup.get(key)
    if old and old['command']!=s['command']:
        raw=lookup[(s['t'],s['actor'],'behavior')]
        fork={'tick':s['t'],'actor':s['actor'],'stage':s['stage'],'raw':raw['command'],'old':old['command'],'broadVariant':s['command'],
            'body':raw['body'],'consumedPeers':[p for p in first_old['stages'] if p['t']==s['t'] and p['actor']==s['actor'] and p['stage']=='spacing-picture']}
        break
assert fork['tick']==.3 and fork['actor']==7 and fork['stage']=='spacing'
rows=[]
for name in ['A044','A008']:
    old=read(saved_root/f'bend-v1/{name}-accepted.json.gz');new=read(root/f'native-v2/{name}.json.gz')
    old_ticks={t['t']:t for t in old['ticks']};differences={};compared=0
    for t in new['ticks']:
        o=old_ticks.get(t['t'])
        if not o:continue
        compared+=1
        for idx,(a,b) in enumerate(zip(t['agents'],o['agents'])):
            if a!=b or t['commands'][idx]!=o['commands'][idx]:differences.setdefault(str(idx),[]).append(t['t'])
    old_case=next(c for c in old_windows['cases'] if c['caseId']==name)
    loads=[];new_ticks={t['t']:t for t in new['ticks']}
    for r in old_case['rows']:
        if r['t'] not in new_ticks:continue
        for b in r['blocks']:
            if b['a']==9 and b['b']==17:
                n=new_ticks[r['t']]['zCornerBlock'];ok=len(n)==1 and all(n[0][k]==b['hands'][k] for k in ['normalForce','tangentForce'])
                loads.append({'tick':r['t'],'normal':b['hands']['normalForce'],'tangent':b['hands']['tangentForce'],'exact':ok})
    assert all(l['exact'] for l in loads)
    rows.append({'caseId':name,'comparedFrames':compared,'actorDifferenceClocks':differences,'eventsExactlyEqual':old['events']==new['events'],
        'mainRngExactlyEqual':old['rng']==new['rng'],'zCornerLoad':loads,'summary':next(r for r in read(root/'native-v2/summary.json')['rows'] if r['caseId']==name)})
assert rows[1]['actorDifferenceClocks']=={} and rows[1]['eventsExactlyEqual'] and rows[1]['mainRngExactlyEqual']
assert all(k not in rows[0]['actorDifferenceClocks'] for k in ['9','10','17','21'])
receipts=[]
for p in sorted(root.glob('*.json')):
    d=read(p)
    if 'commands' in d:receipts.append({'file':p.name,'sourceSha256':d['sourceSha256'],'exitCode':d['exitCode'],
        'seconds':sum(c['elapsedSeconds'] for c in d['commands'])})
report={'candidate':'f27456b5f4cd7e5d628417662a77e4ede5b85bfc','acceptedBase':'90edc52530caa71efdebf257f17d954a8a629ea0',
    'priorEvidence':'cb3823ee749a50ab51e4024b3cdc0dd4ce45341c','sourceSha256':'6f7d2e7d51ab3aa32accfb03c408d8665ab84eb27a4b9e874f43a8ec3b6a4571',
    'decision':'Narrow admission correction is reviewable; A044 navigation benefit is unproved. Broader low-speed variant rejected.',
    'broaderVariantFirstFork':fork,'comparisons':rows,'nativeExecutions':5,'maxNativeClock':5.6,'newRosters':0,'fullGames':0,
    'receipts':receipts,'launcherSeconds':sum(r['seconds'] for r in receipts),
    'nativeLauncherSeconds':sum(r['seconds'] for r in receipts if r['file'] in ['native-receipt.json','narrow-native-receipt.json','reference-opening-receipt.json']),
    'files':{str(p.relative_to(root)):sha(p) for p in root.rglob('*') if p.is_file() and p.name!='review.json'}}
(root/'review.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'launcherSeconds':report['launcherSeconds'],'nativeLauncherSeconds':report['nativeLauncherSeconds'],
    'blockLoadSamples':len(rows[0]['zCornerLoad']),'A008Exact':True,'A044ManReceiverBlockActorsExact':True,'nativeExecutions':5}))
