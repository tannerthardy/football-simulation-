#!/usr/bin/env python3
"""Read sampled native force/work budgets; this is not whole-step coverage."""
import gzip,json,math,hashlib
from pathlib import Path
paths=[Path('data/reviews/run-fit-and-recovery/runs/final.json.gz'),Path('out/helper-fit/runs-final.json.gz')]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
phases=[]
for p in paths:
 j=json.load(gzip.open(p));worst={k:None for k in ['armImpulse','armWork','groundImpulse','supportMotorWork']};samples=0
 for r in j['trials']+j['supplementalTrials']:
  seen=set();loads=[(u['t'],l) for u in r['updates'] for l in u['deliveredStep']]
  loads += [(c['t'],c['nativeLoad']) for m in r['olMetrics'].values() for c in m['firstContacts']+m['firstHands']]
  for t,l in loads:
   key=(t,l['slot'])
   if key in seen:continue
   seen.add(key);samples+=1
   for k in worst:
    v=math.hypot(l['groundImpulse']['x'],l['groundImpulse']['y'])-l['groundTractionLimit'] if k=='groundImpulse' else l[k]-l[k+'Limit']
    if worst[k] is None or v>worst[k]['difference']:
     worst[k]={'difference':v,'id':r['id'],'t':t,'slot':l['slot']}
 phases.append({'input':str(p),'sha256':sha(p),'source':j['sourceBefore'],'uniqueRetainedOLLoadSamples':samples,'maximumSignedUsedMinusLimit':worst})
report={'schema':'sampled-native-budget-screen-v1','toolSha256':sha(Path(__file__)),'phases':phases,'limits':['Deduplicated retained OL first-contact/hand and combination-read reports only; no unseen timestep or other-player budget claim.','Negative difference means slack, not a budget failure. Signed negative support work is retained.','Arm impulse discrepancy1.42e−14 is numerical roundoff in native units.','Physical/movement limits and work/momentum accounting are separate from correct football decisions or visual evidence discipline.','No engine imports, observation calls, simulations or new force settings.']}
Path('out/helper-fit/early-contact/run-load-budget-screen.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
