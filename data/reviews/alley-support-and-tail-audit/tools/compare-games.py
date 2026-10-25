#!/usr/bin/env python3
"""Saved-only whole-game guard; conditional generated call distributions, not NFL estimates."""
import gzip,json,sys,hashlib,statistics,math
from pathlib import Path

def file_sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.load(gzip.open(p))
def summary(p):
 d=load(p); assert d['sourceBefore']==d['sourceAfter']; assert len(d['rows'])==8
 allrows=[dict(r,id=f"G{g['gameIndex']}-P{r['index']:03d}",game=g['gameIndex']) for g in d['rows'] for r in g['log']]
 plays=[r for r in allrows if r['kind'] in ('run','pass') and not r.get('nullified')]
 runs=[r for r in plays if r['kind']=='run']
 passes=[r for r in plays if r['kind']=='pass']
 catches=[r for r in passes if r.get('stats',{}).get('completed') and not r.get('stats',{}).get('interceptedBy') and isinstance(r['stats'].get('yac'),(int,float))]
 def group(rs):
  gains=sorted(r['yards'] for r in rs)
  return dict(n=len(rs),yards=sum(gains),mean=statistics.mean(gains),median=statistics.median(gains),p95=gains[math.ceil(.95*len(gains))-1],stuffs=sum(x<=0 for x in gains),tenPlus=sum(x>=10 for x in gains),twentyPlus=sum(x>=20 for x in gains),missingYBC=sum('yardsBeforeContact' not in r.get('stats',{}) for r in rs))
 groups={}
 for key in ['concept','coverage','front']:
  names=sorted(set(r.get('plan',{}).get(key,'unknown') for r in runs));groups[key]={n:group([r for r in runs if r.get('plan',{}).get(key,'unknown')==n]) for n in names}
 gains=sorted((r['yards'] for r in runs),reverse=True)
 yac=[r['stats']['yac'] for r in catches]
 return dict(source=d['sourceBefore'],inputSha256=file_sha(p),games=8,plays=len(plays),pointsPerTeam=sum(sum(g['score'].values()) for g in d['rows'])/16,runs=group(runs),top10RunYardsShare=sum(gains[:10])/sum(gains),YAC=dict(n=len(yac),mean=statistics.mean(yac),median=statistics.median(yac)),missedBrokenPerPlay=sum(r.get('stats',{}).get('missedTackles',0)+r.get('stats',{}).get('brokenTackles',0) for r in plays)/len(plays),attempts=sum(bool(r.get('stats',{}).get('attempted')) for r in passes),interceptions=sum(bool(r.get('stats',{}).get('interceptedBy')) for r in passes),groups=groups,topRuns=[{k:r.get(k) for k in ['id','yards','plan','stats']} for r in sorted(runs,key=lambda r:r['yards'],reverse=True)[:12]],topYAC=[{k:r.get(k) for k in ['id','yards','plan','stats']} for r in sorted(catches,key=lambda r:r['stats']['yac'],reverse=True)[:12]],scores=[g['score'] for g in d['rows']])
if len(sys.argv)!=4:raise SystemExit('Usage: compare-games.py BASELINE_INDEX.gz CANDIDATE_INDEX.gz OUTPUT.json')
b,f=map(load,sys.argv[1:3]); assert b['seed']==f['seed']==7 and b['leagues']==f['leagues']==2
assert b['leagueInputs']==f['leagueInputs']
for x,y in zip(b['rows'],f['rows']):
 for k in ['gameIndex','league','seed','home','away','beforeRosterSha256']:assert x[k]==y[k],k
result=dict(schema='saved-eight-game-guard-v1',toolSha256=file_sha(__file__),baseline=summary(sys.argv[1]),candidate=summary(sys.argv[2]),matchedInitialGeneratedLeagues=True,matchedEightGameSeedsAndRosters=True,limits=['Games share starting rosters, game seeds and league selection, but changed plays alter future calls, fatigue, RNG consumption and snap populations. They are outcome guards, not paired causal experiments.','Only official non-nullified called run/pass scrimmage rows enter play denominator; called-run YPC excludes pass-call scrambles. YAC requires a field-bearing completed nonintercepted pass.','Concept/front/coverage rates reflect generated players and playcalling; no NFL population calibration. MissingYBC is an absent contact field, not an automatically proved no-contact play.','Game scores and long tails are not physical-force calibration targets.'])
Path(sys.argv[3]).write_text(json.dumps(result,indent=2)+'\n')
for phase in ['baseline','candidate']:
 r=result[phase];print(phase,{k:r[k] for k in ['source','plays','pointsPerTeam','runs','YAC','missedBrokenPerPlay','attempts','interceptions']})
