"""Offline Counter evidence reduction; no simulations or new observations.
Run after explicit collector runs. Original tapes stay in ignored out/.
"""
import argparse,gc,gzip,hashlib,importlib.util,json
try:
 import ijson
except ImportError:
 raise SystemExit("Offline reporting requires ijson==3.6.0; install into an isolated report-tools directory.")
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--root',default='out/counter-second-level');p.add_argument('--out',default='out/counter-second-level/report');p.add_argument('--film-arm',default='memory');args=p.parse_args()
root=Path(args.root);out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('puller_reduce',Path(__file__).with_name('puller-coordination-report.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
result={};film={};cost=0;count=0
for folder in sorted(root.iterdir()):
 trace=folder/'trace.json.gz'
 if not trace.is_file():continue
 with gzip.open(trace,'rb')as stream:receipt=next(ijson.items(stream,'receipt',use_float=True))
 rows=[]
 stream=gzip.open(trace,'rb')
 for r in ijson.items(stream,'rows.item',use_float=True):
  q=mod.reduce(r,True);slots={a['idx']:a['slot']for a in r['initial']};work={};torso={};transitions=[];last={}
  for f in r['frames']:
   for e in f['afterReps']:
    if e['hands']and abs(e['hands']['normal'])+abs(e['hands']['tangent'])>1:
     for i in[e['b'],*e['helpers']]:work.setdefault((slots[i],slots[e['d']]),[]).append(round(f['t'],2))
   for c in f['report']['contacts']:
    if c['impulse']>1e-6 and (c['i']<11)!=(c['j']<11):
     b,d=sorted([c['i'],c['j']]);torso.setdefault((slots[b],slots[d]),[]).append((round(f['t'],2),c['impulse']))
   for a in r['initial']:
    body=f['before'][a['idx']];state=body.get('support',{}).get('state')
    if last.get(a['idx'])!=state:transitions.append({'t':round(f['t'],2),'slot':a['slot'],'state':state,'cause':body.get('support',{}).get('cause')});last[a['idx']]=state
  q['allTorsoPairs']=[{'blocker':b,'defender':d,'first':ts[0][0],'last':ts[-1][0],'reportedPositiveImpulseSum':sum(v[1]for v in ts),'samples':ts}for(b,d),ts in torso.items()]
  q['supportTransitions']=transitions
  q['allLoadedPairs']=[{'blocker':b,'defender':v,'first':min(ts),'last':max(ts),'sampledSeconds':len(ts)*.05}for(b,v),ts in work.items()]
  if folder.name!=args.film_arm:q['timeline']=[f for f in q['timeline']if f['t']in[.5,1,1.5,2,2.5,3,3.5,4]]
  for f in q['timeline']:
   for b in f['bodies'].values():
    for key in['before','after']:
     if b[key].get('support')is not None:b[key]['support']={k:v for k,v in b[key]['support'].items()if k in['state','posture','xi','feetLock','feetVel','out']}
  rows.append(q)
  if folder.name==args.film_arm:film[r['id']]={'id':r['id'],'slots':slots,'frames':[{'t':f['t'],'bodies':[{'pos':b['pos'],'vel':b['vel'],'facing':b['facing']}for b in f['before']],'loads':f['afterReps'],'raw':f['raw'],'final':f['final']}for f in r['frames']],'firstContact':r['firstContact'],'censor':r['censor']}
 result[folder.name]={'receipt':receipt,'traceSha256':hashlib.sha256(trace.read_bytes()).hexdigest(),'rows':rows};cost+=receipt['elapsedSeconds'];count+=len(rows);stream.close();gc.collect()
with gzip.open(out/'summary.json.gz','wt')as f:json.dump({'schema':'counter-second-level-v1','arms':result,'newNativeContinuations':count,'newNativeSeconds':cost,'qualification':'Offline only. Load samples are tick-end values labeled by tick start, not force integrals or proof of protection. GT and GH are different calls.'},f,separators=(',',':'))
with gzip.open(out/'film-frames.json.gz','wt')as f:json.dump(film,f,separators=(',',':'))
print(json.dumps({'offlineSimulations':0,'cases':count,'originalCollectorSeconds':cost,'output':str(out)}))
