"""Saved-only mechanism review; no simulations, imputed positions or new reads.
python3 scripts/diag/pass-defense-review.py out OUTPUT.json
"""
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys

root, output = map(Path,sys.argv[1:])
groups = {'baseline':['pass-defense-panel-baseline'],
          'entryOnly':['pass-panel-entry-only'],
          'candidate':['pass-panel-provisional-witness','pass-panel-provisional-remaining'],
          'freshBaseline':['pass-panel-fresh-baseline'],'freshCandidate':['pass-panel-fresh-candidate']}
packets, sources, artifacts, provenance = {}, {}, [], {}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for arm,folders in groups.items():
    packets[arm]={}
    for folder in folders:
        index=json.loads((root/folder/'summary.json').read_text())
        provenance[folder]={k:index[k] for k in ['sourceSha256','checkout','node','platform','arch',
                                                'operatorSha256','lockSha256','flags','worldDefaults','fixturesSha256',
                                                'maxSimulatedSeconds','batchBudgetSeconds','caseBudgetSeconds','neutral','skipped']}
        provenance[folder]['indexSha256']=sha(root/folder/'summary.json')
        sources[arm]=index['sourceSha256']
        for item in index['summaries']:
            path=root/folder/(item['fixture']['id']+'.json.gz')
            packet=json.loads(gzip.decompress(path.read_bytes()))
            assert packet['sourceSha256']==sources[arm]
            packets[arm][item['fixture']['id']]=packet
            artifacts.append(dict(path=str(path),sha256=sha(path),bytes=path.stat().st_size,
                                  arm=arm,source=packet['sourceSha256'],input=item['inputSha256']))

def summary(packet):
    s=dict(packet['summary'])
    # Original collector's first version did not exclude possession changes.
    fumble=any(e['type']=='fumble' and e['t'] >= (s['catchAt'] or 999) for e in packet['events'])
    s['scoringExclusion']='fumble after catch' if fumble else None
    if fumble: s['finalYac']=None
    s['firstLoadedGrasp']=next((dict(t=r['t'],joint=j) for r in packet['rows'] for j in r['grasps']
                               if j['b']==s['actualCatcher'] and (j['force'] or 0)>0 and not j['broken']),None)
    return s

def entry(q):
    b,c=q
    for field in ['node','platform','arch','flags','worldDefaults','lockSha256']:
        assert b[field]==c[field],field
    assert b['summary']['inputSha256']==c['summary']['inputSha256']
    assert b['summary']['initialSha256']==c['summary']['initialSha256']
    return dict(baseline=summary(b),candidate=summary(c),
                endpointEqual=b['summary']['endpointSha256']==c['summary']['endpointSha256'])

def blocked_keys(packet):
    findings=[]
    for d in range(11,22):
        previous=None;locked={}
        for row in packet['rows']:
            req=row['requests'][d] if len(row['requests'])>d else None
            rule=req['rule'] if req else None
            if not rule: continue
            mode=rule['mode']
            if mode in ['one','zoned'] and mode!=previous:
                for rd in rule['reads']:
                    if rd['release']=='block':locked[rd['target']]=(row['t'],rd,mode,None)
            for rd in rule['reads']:
                if rd['target'] in locked and rd['release'] not in ['block','none','vertical']:
                    # A real route exchange justifies its own terminal branch;
                    # it must not be attributed solely to the earlier block.
                    locked.pop(rd['target'])
                if rd['target'] in locked and rd['release']=='vertical' and mode==locked[rd['target']][2]:
                    t,block,locked_mode,first=locked[rd['target']]
                    first=first or dict(t=row['t'],picture=rd)
                    locked[rd['target']]=(t,block,locked_mode,first)
                    if rd['depth']<3:continue
                    locked.pop(rd['target'])
                    findings.append(dict(defender=d,defenderId=packet['initial'][d]['id'],rule=rule['rule'],
                                         receiver=rd['target'],receiverId=packet['initial'][rd['target']]['id'],
                                         blockAt=t,blockPicture=block,firstVertical=first,
                                         verticalAt=row['t'],verticalPicture=rd,
                                         terminalMode=mode))
            previous=mode
    return findings

def first_divergence(b,c,actor):
    for x,y in zip(b['rows'],c['rows']):
        if x['applied'][actor]!=y['applied'][actor]:
            br=x['requests'][actor];cr=y['requests'][actor]
            return dict(t=x['t'],sameEntry=br['before']==cr['before'],
                        baseline=br,candidate=cr,
                        baselineConsumed=[q for q in x['cues'] if q['observer']==actor],
                        candidateConsumed=[q for q in y['cues'] if q['observer']==actor])
    return None

comparisons={key:entry((packet,packets['candidate'][key])) for key,packet in packets['baseline'].items()}
fresh={key:entry((packet,packets['freshCandidate'][key])) for key,packet in packets['freshBaseline'].items()}
keys={key:blocked_keys(packet) for key,packet in packets['baseline'].items()}
witnesses={}
for key in ['R1-C01','R2-C01','R1-C06','R2-C06']:
    b=packets['baseline'][key];c=packets['candidate'][key]
    witnesses[key]={str(d):first_divergence(b,c,d) for d in [15,21]}
    if key.endswith('C01'):assert witnesses[key]['21']['sameEntry']

# Distinguish the adverse same-encounter execution from a changed approach.
b=packets['baseline']['R2-C02'];c=packets['candidate']['R2-C02']
at=lambda p,t:next(r for r in p['rows'] if r['t']==t)
bs,cs=at(b,8),at(c,8)
for i in [10,18]:
    assert all(x['bodies'][i]==y['bodies'][i] and x['applied'][i]==y['applied'][i]
               for x,y in zip(b['rows'],c['rows']) if x['t']<=8)
grip=lambda r:next(j for j in r['grasps'] if j['a']==18 and j['b']==10)
execution=dict(firstGraspTime=8,runner=10,defender=18,
               recordedBodyAndRequestsEqualThroughFirstGrasp=True,
               baselineGrip=grip(bs),candidateGrip=grip(cs),
               baselineFirstLoaded=grip(at(b,8.05)),candidateFirstLoaded=grip(at(c,8.05)),
               interpretation='Same approach and grasp time; different acquired leg-placement/grip execution. Tackle legs in this lunge branch use an RNG draw. No stronger/weaker physics law was installed.')

receipts=[]
for pattern in ['pass-defense-panel-baseline-receipt.json','pass-panel-*.json']:
    for path in sorted(root.glob(pattern)):
        r=json.loads(path.read_text())
        if 'commands' in r and 'sourceSha256' in r:
            receipts.append(dict(path=str(path),sha256=sha(path),source=r['sourceSha256'],
                                 commit=r['commit'],exitCode=r['exitCode'],flags=r['flags'],
                                 seconds=sum(c['elapsedSeconds'] for c in r['commands']),
                                 commands=r['commands'],inputsUnchanged=r['inputsUnchanged']))
assert fresh['F4']['endpointEqual'],'Preserved play-action offensive win changed'
result=dict(schema='pass-defense-review-v1',sources=sources,provenance=provenance,comparisons=comparisons,fresh=fresh,
            permanentBlockExitCases=sum(bool(v) for v in keys.values()),blockExitEvidence=keys,
            firstDecisionWitnesses=witnesses,adverseSameApproachExecution=execution,
            entryOnly={key:entry((packets['baseline'][key],p)) for key,p in packets['entryOnly'].items()},
            freshBlockExitEvidence={key:blocked_keys(p) for key,p in packets['freshBaseline'].items()},
            receipts=receipts,launcherSeconds=sum(r['seconds'] for r in receipts),rawArtifacts=artifacts,
            limitations=['Deliberately selected concept/coverage panel, not a league/NFL YAC estimate.',
                         'Exclude the R1-C10 post-catch fumble from final YAC comparisons.',
                         'Changed coverage changes target selection and random scheduling; completions are not fixed.',
                         'Native rows retain tick-level physical contact and mean grasp load; gaze/precise impact timing are unmeasured.',
                         'Raw traces remain local. Compact receipt and exact reproducer are published; prior uploads.github.com asset publication was unavailable.'])
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(dict(output=str(output),pairedCases=len(comparisons),freshPairs=len(fresh),
                      blockExitCases=result['permanentBlockExitCases'],
                      exactEndpoints=sum(c['endpointEqual'] for c in comparisons.values()),
                      launcherSeconds=result['launcherSeconds'])))
