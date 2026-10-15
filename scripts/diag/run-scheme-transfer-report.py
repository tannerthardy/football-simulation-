"""Reduce matched native run captures without simulation or controller reads.

--capture label=/absolute/capture.json.gz (repeat) --out out/run-transfer/report
Playside signs come from the declared concept; force is transmitted load, not
an offensive win. Original body/profile/installed information must match.
"""
import argparse
import csv
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import time

spec=importlib.util.spec_from_file_location('opening',Path(__file__).with_name('wz-execution-report.py'))
opening=importlib.util.module_from_spec(spec);spec.loader.exec_module(opening)


def main():
    start=time.perf_counter()
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capture',action='append',required=True)
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    result={'protocol':'run-scheme-transfer-report-v1','captures':[],'cases':{},'comparisons':[]}
    canonical={};timeline=[];panels={}
    for item in args.capture:
        label,name=item.split('=',1);path=Path(name);raw=path.read_bytes();cap=json.loads(gzip.decompress(raw))
        assert cap['from']==0 and cap['stop']==3 and not cap['diagnosticBypass']
        result['captures'].append({'label':label,'revision':cap['revision'],'runtime':cap['sourceSha256'],
            'rawSha256':hashlib.sha256(raw).hexdigest(),'collectorSha256':cap['collectorSha256'],
            'manifestSha256':cap['manifestSha256'],'elapsedSeconds':cap['elapsedSeconds'],
            'nativeSteps':cap['newWorldSteps'],'shortPlays':cap['newSimulationPlays']})
        for case in cap['panel']:
            ident=case['input']['id'];panels[(label,ident)]=case
            assert case['restoredFromSnap'] and not case['actions']
            if ident in canonical:
                first=canonical[ident]
                assert first['input']==case['input'] and first['initializedInformation']==case['initializedInformation']
                for a,b in zip(first['actors'],case['actors']):
                    for key in ['idx','slot','team','profile','player','initialBody']:assert a[key]==b[key],(ident,key)
            else:canonical[ident]=case
            rows=opening.opening_rows(label,case)
            # The reused original operator is WZ-specific; normalize its two
            # signed displacement fields before any summaries or comparisons.
            desired=1 if case['input']['concept'] in ['iz_weak','counter','wz_weak','oz_weak'] else -1
            original=1 if case['input']['concept']=='wz_weak' else -1
            for row in rows:
                row['playside_progress']*=desired/original
                row['loadedPlaysideDisplacement']*=desired/original
            timeline+=rows
            hits=[{'entry':f['t'],'a':case['actors'][c['i']]['slot'],'b':case['actors'][c['j']]['slot'],
                'impulse':c['impulse']}for f in case['frames']for c in f['report']['contacts']
                if c['impulse']>1e-8 and case['actors'][c['i']]['team']==case['actors'][c['j']]['team']]
            responses=[]
            for f in case['frames']:
                for actor,behavior in zip(case['actors'],f['behavior']):
                    read=behavior.get('blockRead')
                    if read and read.get('response') and not any(v['slot']==actor['slot']for v in responses):
                        responses.append({'entry':f['t'],'slot':actor['slot'],'read':read})
            result['cases'].setdefault(ident,{'input':case['input'],'arms':{}})['arms'][label]={
                'end':case['end'],'handoffAt':case['handoffAt'],'slots':opening.summarize(rows),
                'handLoadsByOpponent':opening.hand_loads(case),'teammateImpacts':hits,'localDLResponses':responses,
                'initialJobs':[{'slot':a['slot'],'plan':a['initialBehavior']['plan']}for a in case['actors']
                    if a['initialBehavior'].get('kind')=='run-block'],'events':case['events']}
    for ident in result['cases']:
        labels=[v['label']for v in result['captures']if(v['label'],ident)in panels]
        for left,right in zip(labels,labels[1:]):
            a,b=panels[(left,ident)],panels[(right,ident)]
            first={key:None for key in ['requested','final','afterBodies','jointOutputs','report']}
            maximum={key:0 for key in ['QB','RB','OL','TE','D']}
            for x,y in zip(a['frames'],b['frames']):
                for key in first:
                    if first[key]is None and x[key]!=y[key]:first[key]=x['t']
                for actor,p,q in zip(a['actors'],x['afterBodies'],y['afterBodies']):
                    slot=actor['slot'];group=slot if slot in ['QB','RB'] else 'OL' if slot in opening.BLOCKERS[:5] else 'TE' if slot in ['Y','H'] else 'D' if actor['team']=='D' else None
                    if group:
                        distance=((p['pos']['x']-q['pos']['x'])**2+(p['pos']['y']-q['pos']['y'])**2)**.5
                        maximum[group]=max(maximum[group],distance)
            result['comparisons'].append({'case':ident,'before':left,'after':right,'firstDifferentEntry':first,'maxPositionDifferenceByGroup':maximum})
    args.out.mkdir(parents=True,exist_ok=True)
    with gzip.open(args.out/'timeline.csv.gz','wt',newline='')as stream:
        writer=csv.DictWriter(stream,fieldnames=list(timeline[0]));writer.writeheader();writer.writerows(timeline)
    result.update(newWorldSteps=0,timelineRows=len(timeline),elapsedSeconds=time.perf_counter()-start,
        scriptSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        reusedMeasurementSha256=hashlib.sha256(Path(opening.__file__).read_bytes()).hexdigest())
    (args.out/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:result[k]for k in ['timelineRows','elapsedSeconds','newWorldSteps']}))

if __name__=='__main__':main()
