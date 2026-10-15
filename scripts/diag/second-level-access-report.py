"""Read saved selected-case packets only. No simulation or outcome selection."""
import gzip
import hashlib
import json
from pathlib import Path

root=Path('data/reviews/current/second-level-access')
load=lambda name:json.loads(gzip.decompress((root/name).read_bytes()))
reference,current,candidate,spacing=[load(n+'.json.gz') for n in ['reference','current','candidate','spacing']]
inputs=json.loads((root/'inputs.json').read_text())
result=[]
for old,now,trial in zip(reference['rows'],current['rows'],candidate['rows']):
    assert old['id']==now['id']==trial['id']
    assert old['frames']==now['frames'] and old['result']==now['result'] and old['initial']==now['initial']
    audit=next(r for r in inputs['rows']if r['id']==now['id'])['old']
    assert audit['offenseYards']==old['yards'] and audit['endX']==old['result']['endX']
    assert audit['duration']==old['endTime'] and audit['stats']==old['result']['stats']
    review=next(r for r in json.loads((root/'selected-old-review.json').read_text())if r['caseId']==now['id'])
    for event in review['phaseEvents'].values():
        if event is not None:
            assert {k:v for k,v in event.items()if k not in ['aId','bId']} in old['events']
    actor=7 if now['id']=='A027' else 2
    release=next(c for c in now['calls']if c['a']==actor and c['method']=='startDeparture')
    contact=next(e for e in now['events']if e['type']=='carrier_contact')
    def outcome(row):
        f=next(f for f in row['frames']if f['t']==contact['t'])
        a,d,r=[f['before'][i]['pos']for i in [actor,15,6]]
        distance=((a['x']-d['x'])**2+(a['y']-d['y'])**2)**.5
        impacts=[c for f in row['frames']for c in f['report']['contacts']if c['i']<11 and c['j']<11 and c['impulse']>1e-8]
        return dict(yards=row['yards'],endTime=row['endTime'],outcome=row['outcome'],
                    actorLBContact=[e['t']for e in row['events']if e['type']=='block_contact'and e['a']==actor and e['b']==15],
                    firstRunnerContact=contact['t'],actorPositionAtContact=a,LBPositionAtContact=d,RBPositionAtContact=r,
                    actorLBDistanceAtContact=distance,teammateImpulses=len(impacts),teammateImpulseKgYdPerS=sum(c['impulse']for c in impacts))
    entry=dict(id=now['id'],accepted69PhysicalRequestsRngResultExact=True,inputSha256=now['inputSha256'],
               release=dict(t=release['t'],actor=release['slot'],acquiredDeparture=release['acquiredDeparture'],
                            takeover=release['before']['combination'],actualKeeperAvailability=1),
               accepted=outcome(now),rejected=outcome(trial))
    if now['id']!='A018':assert now['frames']==trial['frames'] and now['result']==trial['result']
    else:
        first=next((a,b)for a,b in zip(now['frames'],trial['frames'])if a!=b)
        assert first[0]['t']==2.35 and first[0]['before']==first[1]['before']
        assert [i for i,(a,b)in enumerate(zip(first[0]['raw'],first[1]['raw']))if a!=b]==[4]
        a,b=[next(f for f in row['frames']if f['t']==2.4)for row in [now,trial]]
        assert all(a['before'][i]==b['before'][i]for i in [2,5,6]) and a['rng']==b['rng']
        entry['firstTrialDifference']=dict(t=2.35,actor='LG',qualification='The general post-release assessment also acts on LG; do not attribute the final spot solely to RT.')
        entry['RTFork']=dict(t=2.4,sameRTKeeperRunnerBodies=True,sameSharedRng=True,
                             acceptedRequest=a['raw'][2],rejectedRequest=b['raw'][2],delivered=b['final'][2])
        entry['freeInterceptDiagnostics']=[d for d in trial['result']['telemetry']['decisions']if d['kind']=='climb-plan'and d['a']==2 and 2.4<=d['t']<=2.6]
    result.append(entry)
assert spacing['rows'][0]['frames']==candidate['rows'][0]['frames'][:len(spacing['rows'][0]['frames'])]
receipts=[]
for p in sorted((root/'receipts').glob('*.json')):
    r=json.loads(p.read_text());assert r['inputsUnchanged']
    receipts.append(dict(file=p.name,commit=r['commit'],source=r['sourceSha256'],exitCode=r['exitCode'],
                         seconds=sum(c['elapsedSeconds']for c in r['commands'])))
summary=dict(schema='second-level-access-adjudication-v1',accepted='90edc52530caa71efdebf257f17d954a8a629ea0',
             acceptedSource=current['receipt']['sourceSha256'],priorAudit='8ca8deebe4afa91c3021bdd119bed8976cf00e47',
             rejectedCode='f1a9743',rejectedSource=candidate['receipt']['sourceSha256'],
             verdict='Park the first-strike-only candidate; no improved protection before arrival. Restore accepted controllers.',
             rows=result,spacing=json.loads((root/'spacing-attribution.json').read_text()),receipts=receipts,
             newLauncherSeconds=sum(r['seconds']for r in receipts),collectorExecutions=10,
             completedCollectorPlays=9,shortPrefix=1,fullGames=0,newRosters=0,
             nextQuestion='Can a cue-supported RT departure route chosen before 2.40 produce useful LB access by actual RB arrival, preserving the loaded RG/DT surface and runner traffic? Later free intercept already predicts 2.85 versus contact2.75; the radial RB avoidance is not proven wrong.',
             catchingContract='https://github.com/tannerthardy/football-simulation-/pull/75#issuecomment-6203244219',
             limits=['Only three preselected audit cases; no nine-defect or population claim.',
                     'Archived original raw tape is outside this executor; only three exact reference cases rerun and checked against cached audit inputs/events/results.',
                     'A027 has a real block and an exposed route; no controller or contact-law defect is inferred from its defender recovery.',
                     'Straight-ray first-strike clearance and free interception are diagnostics, not a collision-safe arrival guarantee.'])
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
(root/'artifacts.json').write_text(json.dumps({str(p.relative_to(root)):dict(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())
    for p in sorted(root.rglob('*'))if p.is_file()and p.name!='artifacts.json'},indent=2)+'\n')
print(json.dumps(dict(acceptedParity='exact, three cases',candidate='parked',seconds=summary['newLauncherSeconds'],cases=[dict(id=r['id'],before=r['accepted']['yards'],trial=r['rejected']['yards'])for r in result]),indent=2))
