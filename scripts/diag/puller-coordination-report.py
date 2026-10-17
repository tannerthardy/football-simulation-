"""Offline reduction of saved all22 traces. Runs zero simulations."""
import argparse, gzip, hashlib, json
from pathlib import Path
def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def body(b):return {k:b[k] for k in ['pos','vel','facing','energy','support'] if k in b}
def reduce(r,stream_hash=False):
 slots={a['idx']:a['slot'] for a in r['initial']};pull=[]
 for a in r['initial']:
  plan=a['plan']
  if not plan or plan['kind'] not in ['pull','crack','climb']:continue
  loaded=[(f,e) for f in r['frames'] for e in f['afterReps'] if a['idx'] in [e['b'],*e['helpers']] and e['d']==plan['target'] and e['hands'] and abs(e['hands']['normal'])+abs(e['hands']['tangent'])>1]
  pull.append({'slot':a['slot'],'plan':plan,'targetSlot':slots.get(plan['target']),'firstLoaded':round(loaded[0][0]['t'],2) if loaded else None,'lastLoaded':round(loaded[-1][0]['t'],2) if loaded else None,'sampledLoadSeconds':len(loaded)*.05,'normalImpulseApprox':sum(abs(e['hands']['normal'])*.05 for f,e in loaded),'tangentImpulseApprox':sum(abs(e['hands']['tangent'])*.05 for f,e in loaded)})
 peers=[{'t':round(f['t'],2),'pair':[slots[c['i']],slots[c['j']]],'impulse':c['impulse'],'closing':c['closing']}for f in r['frames']for c in f['report']['contacts'] if c['i']<11 and c['j']<11 and c['impulse']>1e-6]
 if stream_hash:
  h=hashlib.sha256()
  for f in r['frames']:h.update(json.dumps({k:f[k]for k in ['t','before','raw','final','after','ball','rng','report']},sort_keys=True,separators=(',',':')).encode())
  h.update(json.dumps(r['events'],sort_keys=True,separators=(',',':')).encode());coupled_hash=h.hexdigest()
 else:
  coupled=[{k:f[k]for k in ['t','before','raw','final','after','ball','rng','report']}for f in r['frames']]
  coupled_hash=digest({'frames':coupled,'events':r['events']})
 observations=[]
 for f in r['frames']:
  if round(f['t']*20)%5:continue
  selected={a['idx'] for a in r['initial'] if a['plan'] and a['plan']['kind'] in ['pull','crack']}
  selected.update({6,12,13,15,17})
  observations.append({'t':round(f['t'],2),'bodies':{slots[i]:{'before':body(f['before'][i]),'raw':f['raw'][i],'final':f['final'][i],'after':body(f['after'][i]),'plan':f['plans'][i]}for i in selected},'loads':f['afterReps']})
 return {k:r[k]for k in ['id','inputSha256','source','elapsedSeconds','phase','endTime','censor','outcome','gain','firstContact']}|{'installed':[{ 'slot':a['slot'],'position':a['body']['pos'],'plan':a['plan']}for a in r['initial'] if a['plan']],'pullWork':pull,'carrierContacts':[e for e in r['events'] if e['type']=='carrier_contact'],'positiveTeammateImpulses':peers,'coupledHistoryDigest':coupled_hash,'digestAlgorithm':'frame-stream-v1' if stream_hash else 'whole-coupled-v1','timeline':observations,'runnerReads':r.get('runnerReads',[])}
def main():
 p=argparse.ArgumentParser();p.add_argument('--root',default='out/puller-coordination');p.add_argument('--out',default='data/reviews/current/puller-coordination');p.add_argument('--stream-hash',action='store_true');args=p.parse_args()
 root=Path(args.root);out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
 allarms={};native=0;elapsed=0
 for folder in sorted(root.iterdir()):
  trace=folder/'trace.json.gz'
  if not trace.is_file():continue
  d=json.load(gzip.open(trace));receipt=d['receipt'];rows=[reduce(r,args.stream_hash)for r in d['rows']]
  native+=len(rows);elapsed+=receipt['elapsedSeconds']
  allarms[folder.name]={'receipt':receipt,'traceSha256':hashlib.sha256(trace.read_bytes()).hexdigest(),'rows':rows}
  del d
 summary={'schema':'puller-coordination-reduction-v1','qualification':'Offline only; all all22 native prefixes retained. Censored gains remain null. Loaded hands are evidence of work, never alone proof of protection. Approximate impulse uses recorded end-of-tick samples, not solver integrals. Diagnostic inside/outside routes override commands and are not production policies.','newCollectedCases':native,'collectorElapsedSeconds':elapsed,'fullGames':0,'arms':allarms}
 with gzip.open(out/'summary.json.gz','wt')as f:json.dump(summary,f,separators=(',',':'))
 (out/'index.json').write_text(json.dumps({k:v for k,v in summary.items() if k!='arms'}|{'arms':{k:{'source':v['receipt']['source'],'flags':v['receipt']['flags'],'inputs':v['receipt']['cases'],'elapsedSeconds':v['receipt']['elapsedSeconds'],'traceSha256':v['traceSha256']}for k,v in allarms.items()}},indent=2)+'\n')
 print(json.dumps({'arms':len(allarms),'cases':native,'collectorSeconds':elapsed,'offlineSimulations':0,'output':str(out/'summary.json.gz')}))

if __name__=='__main__':main()
