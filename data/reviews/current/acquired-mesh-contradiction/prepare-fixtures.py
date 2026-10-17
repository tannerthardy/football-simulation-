import json,gzip,hashlib
from pathlib import Path
root=Path('out/acquired-qb-contract'); teams=json.loads((root/'frozen-game-inputs.json').read_text())['fixtures'];cases=[]
for id in ['G3-P003','G3-P087','G3-P141','G4-P142','G3-P140']:
 g=int(id[1]);raw=gzip.decompress((root/f'{id}-native.json.gz').read_bytes());p=json.loads(raw);r=p['replay'];strong=id!='G3-P140';chosen=None
 for f in r['telemetry']['frames']:
  if f['t']<1.1:continue
  candidates=sorted(enumerate(f['agents']),key=lambda x:{'insert':0,'force':1,'alley':2}.get(x[1].get('runFit',{}).get('kind'),3))
  for i,a in candidates:
   if a['kind']!='zone' or not a.get('zone') or a.get('belief',{}).get('read')!='run' or a['body']['state']!='up':continue
   cues=[v for v in f.get('perception',[]) if v['a']==i and v['source']=='see'];pics={v['b']:v for v in cues};q,b=pics.get(0),pics.get(6)
   if not q or not b or q.get('carrying') is not True or b.get('carrying') is not False:continue
   contradiction=b['position'][0]>r['los'] and b['position'][0]-q['position'][0]>2
   if strong!=contradiction:continue
   chosen=(f,i,a,cues);break
  if chosen:break
 assert chosen,id
 f,i,a,cues=chosen
 observations=[json.loads(l) for l in (root/f'G{g}-observations.jsonl').read_text().splitlines()]
 o=next(x for x in observations if x['gameState']['quarter']==p['quarter'] and abs(x['gameState']['clock']-p['clock'])<=.51 and x['call']['label']==p['call'])
 roster={pl['id']:pl for team in teams[g-1]['teams'].values() for pl in team['roster']}
 setup={side:{x['slot']:roster[x['id']] for x in o['initialPlayers'] if x['team']==team} for side,team in [('offense','O'),('defense','D')]}
 setup.update(offCall=o['call'],defCall=o['defense'],los=r['los'],ballY=o['gameState']['ballY'],firstDownX=r['firstDownX'],seed=o['seedState']['key'],audibles=False,down=o['gameState']['down'])
 pf=next(x for x in r['frames'] if x['t']==f['t'])
 cases.append(dict(id=id,strong=strong,t=f['t'],actor=i,slot=r['players'][i]['slot'],zone=a['zone'],runFit=a['runFit'],setup=setup,positions=pf['agents'],bodies=[v['body'] for v in f['agents']],cues=cues,rawSha256=hashlib.sha256(raw).hexdigest(),terminal=p['outcome']))
out=dict(schema='acquired-mesh-saved-scenes-v1',base='70b4db6a3ef53acc1a0e90cd055f1087205daa30',evidence='b9b9c17597970ddc87aa4a4e271fc4cfeef71909',limits='Rounded saved scenes; local producing-stage replay only, not full checkpoint or changed native outcome.',cases=cases)
p=Path('test/fixtures/acquired-mesh-scenes.json.gz')
with gzip.open(p,'wt') as f:json.dump(out,f,separators=(',',':'))
print([(c['id'],c['t'],c['slot'],c['zone']) for c in cases]);print(p.stat().st_size)
