import json,gzip,hashlib
from pathlib import Path
root=Path('out/acquired-qb-contract'); audit=root/'audit/out/accepted-game-deep-audit-2026-10-16'
teams=json.loads((root/'frozen-game-inputs.json').read_text())['fixtures']
strong={r['id']:r['firstAway'] for r in json.loads((audit/'cross-system/scramble-continuity.json').read_text())['rows'] if r['firstAway'] and r['id'] in {'G1-P086','G1-P127','G2-P174','G3-P093','G4-P173','G4-P177'}}
ids=['G4-P177','G1-P086','G1-P127','G2-P174','G3-P093','G4-P173','G1-P027','G2-P057','G3-P073'];cases=[]
for id in ids:
 g=int(id[1]);native=root/f'{id}-native.json.gz'; raw=gzip.decompress(native.read_bytes());p=json.loads(raw);r=p['replay']
 observations=[json.loads(l) for l in (root/f'G{g}-observations.jsonl').read_text().splitlines()]
 matches=[o for o in observations if o['gameState']['quarter']==p['quarter'] and abs(o['gameState']['clock']-p['clock'])<=.51 and o['call']['label']==p['call']]
 assert len(matches)==1,(id,len(matches));o=matches[0]
 if id in strong:t=strong[id]['t'];i=strong[id]['i']
 else:
  pairs=[(f,a,i) for f in r['telemetry']['frames'] if f['t']>=.6 for i,a in enumerate(f['agents']) if a['kind']=='man' and a.get('belief',{}).get('read')!='run' and any(v['a']==i and v['b']==0 and v.get('carrying') is True for v in f.get('perception',[]))]
  f,a,i=pairs[0];t=f['t']
 tf=next(f for f in r['telemetry']['frames'] if f['t']==t);pf=next(f for f in r['frames'] if f['t']==t);ag=tf['agents'][i]
 roster={pl['id']:pl for team in teams[g-1]['teams'].values() for pl in team['roster']}
 offense={x['slot']:roster[x['id']] for x in o['initialPlayers'] if x['team']=='O'}
 defense={x['slot']:roster[x['id']] for x in o['initialPlayers'] if x['team']=='D'}
 setup=dict(offense=offense,defense=defense,offCall=o['call'],defCall=o['defense'],los=r['los'],ballY=o['gameState']['ballY'],firstDownX=r['firstDownX'],seed=o['seedState']['key'],audibles=False,down=o['gameState']['down'])
 cues=[q for q in tf.get('perception',[]) if q['a']==i and q['source']=='see']
 assert any(q['b']==0 for q in cues)
 cases.append(dict(id=id,strong=id in strong,rawSha256=hashlib.sha256(raw).hexdigest(),setup=setup,t=t,actor=i,target=ag['target'],job=ag['job'],man=ag['man'],runFit=ag['runFit'],positions=pf['agents'],bodies=[a['body'] for a in tf['agents']],cues=cues,terminal=dict(outcome=p['outcome'],yards=p['yards'],duration=p['duration'])))
out=dict(schema='acquired-qb-saved-scenes-v1',source='9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941',evidence='b9b9c17597970ddc87aa4a4e271fc4cfeef71909',audit='23d5f6d4f7e88fdd3225a49cc74ae5582a52522e',limits='Saved rounded scenes, own recorded technique flags and consumed pictures; local controller/one-body replay, not full runtime checkpoint or changed-game outcome.',cases=cases)
p=Path('test/fixtures/acquired-qb-scenes.json.gz');p.parent.mkdir(exist_ok=True)
with gzip.open(p,'wt') as f:json.dump(out,f,separators=(',',':'))
print('prepared',len(cases),'saved scenes',p.stat().st_size,'bytes')
