"""Reuse saved first-45-play witnesses. No simulation or new observations."""
import gzip,json,math,hashlib,pathlib
source=pathlib.Path('/workspace/run-entry-cues/out/run-entry-cues/reproduction/witnesses.json.gz')
p=json.loads(gzip.decompress(source.read_bytes()))
selected=[];audit=[];inputs=[]
for g in p['games']:
 for e in g['selected']:
  if g['id']!='zone-reference' or e['index'] not in (14,18,31,44):continue
  inputs.append({'play':e['index']+1,'los':e['los'],'state':e['state'],'ballY':e['input']['agents'][3]['initialBody']['pos']['y'],'input':e['input']})
  rows=[]
  for f in e['frames']:
   a=f['before'][6];raw=math.hypot(*f['raw'][6]['vel'].values());final=math.hypot(*f['final'][6]['vel'].values())
   if f['t']>=1 and raw>2 and final<raw*.6:rows.append({'t':f['t'],'raw':raw,'final':final,'speed':math.hypot(*a['vel'].values())})
  audit.append({'play':e['index']+1,'call':e['input']['call']['label'],'spacingReducedFrames':rows,'meshAtLastSavedFrame':e['frames'][-1].get('behavior',[None]*7)[6]})
  for t in {14:[2.6],18:[1.55,2.05],31:[1.7,2.7],44:[]}[e['index']]:
   f=min(e['frames'],key=lambda f:abs(f['t']-t));cues={}
   for c in e['cues']:
    if abs(c['t']-f['t'])<1e-7 and c['observer']==6 and c['target']<11 and c['kind']=='see':cues[c['target']]=c['picture']
   assert len(cues)==10,(e['index'],t,len(cues))
   before=[{**b,'profile':e['input']['agents'][i]['profile']} for i,b in enumerate(f['before'])]
   selected.append({'id':f'P{e["index"]+1:03d}-{t:.2f}','t':f['t'],'actors':[{k:a[k] for k in ('idx','team','slot','player','profile')} for a in e['input']['agents']],
    'bodies':before,'raw':f['raw'],'recordedFinal':f['final'],'pictures':cues,'joints':f.get('joints',[]),'recordedReport':f['report']})
base=pathlib.Path('out/rb-local-traffic');base.mkdir(exist_ok=True,parents=True)
packet={'schema':'rb-local-traffic-saved-v1','sourceCommit':'e8a76a7f7cdc19dece85288f93a8d1e1273be0db','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'scope':'Four varied saved first-45 plays; six local states use only already consumed see pictures. These are mechanical forks, not full original game replays.','audit':audit,'states':selected,'inputs':inputs}
(base/'saved.json.gz').write_bytes(gzip.compress(json.dumps(packet).encode(),mtime=0))
print(json.dumps({'states':[s['id'] for s in selected],'audit':[{'play':a['play'],'call':a['call'],'reducedFrames':len(a['spacingReducedFrames'])} for a in audit]}))
