#!/usr/bin/env python3
"""Read saved native records only. No engine calls or inferred contact forces."""
import gzip,json,sys,hashlib,math
from pathlib import Path
path=Path(sys.argv[1]); doc=json.load(gzip.open(path)); rows=[]
for row in doc['rows']:
    helpers=[]
    first_seen={}
    for step in row['steps']:
        for helper in step['helpers']:
            key=(helper['helper'],helper['defender'],helper['start'])
            first_seen.setdefault(key,step['t'])
            actual=next((p for p in step['actualHandImpulses'] if p['i']==helper['helper'] and p['j']==helper['defender']),None)
            body_contact=[p for p in step['report']['contacts'] if set((p['i'],p['j']))==set((helper['helper'],helper['defender']))]
            hs=helper['helperBody']['body']['support']
            item={'t':step['t'],'helper':helper['helperSlot'],'main':helper['blockerSlot'],'defender':helper['defenderSlot'],'surfaceDot':helper['helperSurfaceDot'],'functionalSupport':helper['helperSupport'],'joinedForAtLeast':step['t']-first_seen[key],'configuredHands':helper['hands'],'actualHandImpulseOnDefender':actual['onB'] if actual else None,'bodyContact':body_contact,'position':helper['helperBody']['body']['pos'],'velocity':helper['helperBody']['body']['vel'],'supportState':hs['state'],'supportDeviation':hs['xi'],'supportLoad':hs['load'],'supportFelt':hs['felt'],'supportLean':hs['lean'],'available':helper['helperBody']['available'],'submitted':helper['submitted'],'executed':helper['executed'],'personallyConsumedCues':[c for c in step['consumed'] if c['observer']==helper['helper']],'actualAimDecisions':[c for c in step['aims'] if c['actor']==helper['helper']]}
            if helper['helperSurfaceDot']<=0:helpers.append(item)
    events=row['result']['events']
    final_frame=row['result']['telemetry']['frames'][-1]
    carrier=next((f.get('carrier') for f in reversed(row['result']['frames']) if f.get('carrier') is not None and f['carrier']>=0),None)
    finish={'t':final_frame['t'],'carrier':carrier,'body':final_frame['agents'][carrier].get('body') if carrier is not None else None,'tackle':final_frame.get('tackle'),'fallsAndDowns':[{'t':step['t'],'falls':step['report']['falls'],'downs':step['report']['downs']} for step in row['steps'] if step['report']['falls'] or step['report']['downs']]}
    rows.append({'id':row['id'],'gain':row['result']['offenseYards'],'outcome':row['result']['outcome'],'duration':row['result'].get('duration'),'initialSha256':row['physicalInitialSha256'],'observerVerified':row['observerVerified'],'observedSignature':row['observed']['sha256'],'plainSignature':row['plain']['sha256'],'nextRng':row['observed']['nextRng'],'wrongSurfaceTicks':len(helpers),'firstWrongSurface':helpers[0] if helpers else None,'firstMatureWrongSurface':next((h for h in helpers if h['joinedForAtLeast']>=.14999),None),'wrongSurfaceTimeline':helpers,'physicalFinish':finish,'physicalEvents':[e for e in events if e['type'] in ['block_contact','shed','carrier_contact','tackle_wrap','fall','tackle','handoff']]})
out={'schema':'native-helper-surface-saved-audit-v1','source':doc['sourceBefore'],'packetSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'method':'Read-only native exact vectors, actual signed hand-channel impulses and body contacts. Helper-surface projection is used only to describe geometry, never to infer directional load. Joining age is a conservative sampled age, not an inaccessible helperSince value. Initial establishing zero support on the correct surface is not counted as a geometry error.','rows':rows}
target=Path(sys.argv[2]);target.write_text(json.dumps(out,indent=2)); print(json.dumps({'output':str(target),'rows':[{'id':r['id'],'gain':r['gain'],'wrongSurfaceTicks':r['wrongSurfaceTicks'],'firstWrong':None if r['firstWrongSurface'] is None else r['firstWrongSurface']['t'],'firstMatureWrong':None if r['firstMatureWrongSurface'] is None else r['firstMatureWrongSurface']['t']} for r in rows]}))
