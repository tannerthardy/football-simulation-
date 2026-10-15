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
    if p.name.startswith('current-'):continue
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

# Current accepted-source comparison is a separate operator and provenance.
if (root/'current-candidate/summary.json').exists():
    current_rows=[]
    for name in ['A044','A008']:
        before=read(root/'current-reference'/f'{name}.json.gz');after=read(root/'current-candidate'/f'{name}.json.gz')
        prior={t['t']:t for t in before['ticks']};delta={}
        for t in after['ticks']:
            old=prior[t['t']]
            for idx,(a,b) in enumerate(zip(t['agents'],old['agents'])):
                if a!=b or t['commands'][idx]!=old['commands'][idx]:delta.setdefault(str(idx),[]).append(t['t'])
        impacts=lambda d:[{'t':t['t'],**c} for t in d['ticks'] for c in t['contacts'] if c['i']==15 and c['j']==21]
        current_rows.append({'caseId':name,'differences':delta,'eventsExactlyEqual':before['events']==after['events'],
            'rngExactlyEqual':before['rng']==after['rng'],'oldImpacts':impacts(before),'newImpacts':impacts(after),
            'endClock':after['stoppedAt'],'events':after['events'],'firstDifference':after['firstDifference']})
    assert current_rows[0]['eventsExactlyEqual'] and current_rows[0]['oldImpacts']==current_rows[0]['newImpacts']
    assert current_rows[1]['differences']=={} and current_rows[1]['eventsExactlyEqual'] and current_rows[1]['rngExactlyEqual']
    all_receipts=[]
    for path in sorted(root.glob('*.json')):
        data=read(path)
        if 'commands' in data:all_receipts.append({'file':path.name,'exitCode':data['exitCode'],
            'seconds':sum(c['elapsedSeconds'] for c in data['commands']),'sourceSha256':data['sourceSha256']})
    current={'accepted':'7eb2554f5dbb497cff169f386704a5b0f4cf43fe','codeOnAccepted':'edad30904780523896092f592f4c30f1686cc764',
        'portableBehavior':'f27456b5f4cd7e5d628417662a77e4ede5b85bfc','reference':'bfb0d5ec4ca090b1bb8e38ac01116eb29954a8ce',
        'referenceSource':'c0c660cbad2afb0180ad773cdef8f8ecb70b6c5083409cbbdcb03e446ba028e1',
        'candidateSource':'f9573bc3ce911dfc75dee95d56b8df3b3e8937ed8db62a97659d15baf4c3e7e8','rows':current_rows,
        'newNativeExecutionsThisTask':9,'receipts':all_receipts,'allLauncherSeconds':sum(r['seconds'] for r in all_receipts),
        'allNativeLauncherSeconds':sum(r['seconds'] for r in all_receipts if r['file'] in ['native-receipt.json','narrow-native-receipt.json',
            'reference-opening-receipt.json','current-reference-receipt.json','current-native-receipt.json']),
        'fileHashes':{str(p.relative_to(root)):sha(p) for p in root.rglob('*') if p.is_file() and p.name!='current-review.json'}}
    (root/'current-review.json').write_text(json.dumps(current,indent=2)+'\n')
    print(json.dumps({'currentAccepted':current['accepted'],'totalLauncherSeconds':current['allLauncherSeconds'],
        'totalNativeLauncherSeconds':current['allNativeLauncherSeconds'],'nativeExecutions':9}))
