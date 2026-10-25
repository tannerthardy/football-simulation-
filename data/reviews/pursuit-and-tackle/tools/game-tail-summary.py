import json,gzip,hashlib,statistics,math
from pathlib import Path
from collections import defaultdict
p=Path('out/tackle-breakthrough/games-final-tail-audit.json.gz')
r=json.load(gzip.open(p,'rt'))
plays=[]
for game in r['rows']:
 for play in game['log']:
  plays.append({**play,'gameIndex':game['gameIndex'],'league':game['league'],'gameSeed':game['seed'],'home':game['home']['abbr'],'away':game['away']['abbr']})
official=[x for x in plays if x['kind']in ['run','pass']and not x.get('nullified')]
runs=[x for x in official if x['kind']=='run']
passes=[x for x in official if x['kind']=='pass']
def finite(x):return isinstance(x,(int,float))and not isinstance(x,bool)and math.isfinite(x)
def q(xs,p):
 if not xs:return None
 s=sorted(xs);at=(len(s)-1)*p;return s[int(at)]+(s[min(int(at)+1,len(s)-1)]-s[int(at)])*(at-int(at))
def dist(xs):
 xs=[x for x in xs if finite(x)];return {'n':len(xs),'mean':statistics.fmean(xs)if xs else None,'median':q(xs,.5),'p90':q(xs,.9),'p95':q(xs,.95),'max':max(xs)if xs else None,'total':sum(xs)}
def summary(xs):
 natural=[x for x in xs if x.get('outcome')!='timeout'];st=[x['stats']for x in xs];gains=[x['yards']for x in xs]
 return {'n':len(xs),'naturalEnds':len(natural),'censors':sum(x.get('outcome')=='timeout'for x in xs),'yards':dist(gains),'naturalGain':dist([x['yards']for x in natural]),'stuffs':sum(x['yards']<=0 for x in natural),'gain10':sum(x['yards']>=10 for x in natural),'gain20':sum(x['yards']>=20 for x in natural),'gain40':sum(x['yards']>=40 for x in natural),'touchdownTextFlags':sum('TOUCHDOWN' in x['text'] for x in xs),'offensiveTouchdownTextFlags':sum('TOUCHDOWN' in x['text'] and not bool((x.get('nativeInput') or {}).get('raw',{}).get('turnover')) for x in xs),'YBCproxy':dist([s.get('yardsBeforeContact')for s in st]),'missed':sum(s['missedTackles']for s in st),'broken':sum(s['brokenTackles']for s in st),'fumbleLostFlags':sum(bool(s.get('fumbleLost'))for s in st),'withAtLeastOneMissOrBroken':sum(s['missedTackles']+s['brokenTackles']>0 for s in st)}
def group(xs,key):
 buckets=defaultdict(list)
 for x in xs:buckets[str(key(x))].append(x)
 return {k:summary(v)for k,v in sorted(buckets.items())}
def compact(x):
 inp=x.get('nativeInput')or{};carrier=next((a for a in inp.get('players',[])if a['team']=='O'and a['id']==x.get('stats',{}).get('rusher')),None)
 return {k:x.get(k)for k in ['gameIndex','league','gameSeed','home','away','index','quarter','clock','offense','down','distance','yardline','call','defense','yards','outcome','duration','stats','plan','nullified','foul','text']}|{'snapSeed':inp.get('seed'),'nativeSnapIndex':inp.get('nativeSnapIndex'),'raw':inp.get('raw'),'runner':carrier}
ordered=sorted(runs,key=lambda x:x['yards'],reverse=True);total=sum(x['yards']for x in runs)
completions=[x for x in passes if x['stats'].get('attempted')and x['stats'].get('completed')and not x['stats'].get('interceptedBy')]
cal={'scrimmagePlays':len(official),'pointsPerTeamGame':sum(sum(g['score'].values())for g in r['rows'])/16,'rushAtt':len(runs),'rushYds':total,'YPC':total/len(runs),'stuffPct':100*sum(x['yards']<=0 for x in runs)/len(runs),'run10Pct':100*sum(x['yards']>=10 for x in runs)/len(runs),'YBC':statistics.fmean(s['stats']['yardsBeforeContact']for s in runs if finite(s['stats'].get('yardsBeforeContact'))),'YAC':statistics.fmean(x['stats']['yac']for x in completions if finite(x['stats'].get('yac')))}
expected={'scrimmagePlays':997,'pointsPerTeamGame':41.88,'YPC':7.27,'stuffPct':17.38,'run10Pct':15.24,'YBC':1.49,'YAC':10.61}
checks={k:(cal[k]==v if k=='scrimmagePlays'else f'{cal[k]:.2f}'==f'{v:.2f}')for k,v in expected.items()}
assert all(checks.values()),(cal,checks)
result={'schema':'game-tail-stats-summary-v1','source':r['sourceBefore'],'toolSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'input':{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()},'calibration':cal,'matchesPriorPlainLogPrintedPrecision':checks,'rosterInputs':[{'league':x['league'],'rosterSha256':x['rosterSha256']}for x in r['leagueInputs']],'gameInputs':[{'gameIndex':g['gameIndex'],'league':g['league'],'seed':g['seed'],'home':g['home'],'away':g['away'],'beforeRosterSha256':g['beforeRosterSha256'],'afterRosterSha256':g['afterRosterSha256'],'logSignature':g['signature']}for g in r['rows']],'ordinaryRuns':summary(runs),'runsByConcept':group(runs,lambda x:(x.get('plan')or{}).get('concept')),'runsByExactRunID':group(runs,lambda x:(x.get('nativeInput')or{}).get('offCall',{}).get('run',{}).get('id')),'runsByCarrier':group(runs,lambda x:(x['league'],x['offense'],x['stats'].get('rusher'))),'runsByLeague':group(runs,lambda x:x['league']),'runsByGame':group(runs,lambda x:x['gameIndex']),'runsByFormation':group(runs,lambda x:(x.get('plan')or{}).get('formation')),'runsByFront':group(runs,lambda x:(x.get('plan')or{}).get('front')),'runsByCover':group(runs,lambda x:(x.get('plan')or{}).get('coverage')),'runBand':{'below10':summary([x for x in runs if x['yards']<10]),'10to19.99':summary([x for x in runs if 10<=x['yards']<20]),'20to39.99':summary([x for x in runs if 20<=x['yards']<40]),'40plus':summary([x for x in runs if x['yards']>=40])},'tailContribution':[{'largestCount':n,'sumYards':sum(x['yards']for x in ordered[:n]),'shareTotalYards':sum(x['yards']for x in ordered[:n])/total,'remainingMeanYards':statistics.fmean(x['yards']for x in ordered[n:])}for n in [1,5,10,20]],'largestRuns':[compact(x)for x in ordered[:30]],'noMissBrokenLongRuns':[compact(x)for x in ordered if x['yards']>=20 and x['stats']['missedTackles']+x['stats']['brokenTackles']==0],'passYAC':dist([x['stats'].get('yac')for x in completions]),'nullifiedRunCount':sum(x['kind']=='run' and bool(x.get('nullified')) for x in plays),'officialInputMappingCount':sum(bool(x.get('nativeInput'))for x in official),'limits':r['limits']+['Outcome-conditioned calls identify witness priorities, not their first bad instruction or causal population rates.','Stats/counts cannot certify that a long play was legitimate or diagnose a specific instruction; inspect its reproduced native movement next.','Yards-minus-YBC is a proxy and official foul enforcement can differ from raw movement.']}
Path('out/tackle-breakthrough/games-final-tail-summary.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:result[k]for k in ['source','calibration','matchesPriorPlainLogPrintedPrecision','ordinaryRuns','runsByConcept','runBand','tailContribution']},indent=2))
