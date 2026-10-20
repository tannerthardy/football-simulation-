"""Data-only possession conservation. python scripts/checkpoint-turnover-audit.py OUT
The native segment history supplies every possession transition; newer explicit
fumble ledgers supply opponent-endzone losses without a recovering segment.
The previous accepted box is preserved, including any historical mismatch.
"""
import json,sys
from pathlib import Path
out=Path(sys.argv[1]);ledger=json.loads((out/'batch-ledger.json').read_text())
r={'schema':'matched-game-possession-audit-v1','inputSha256':ledger['inputSha256'],'games':[],'candidateFailures':[],'historicalBaselineFailures':[],
'contract':'Count each achieved change of team possession after official enforcement, even when the original offense regains the ball. A final-possession Boolean cannot replace this history.',
'oldSource':'2c98bed94adad8087c65f381d4090444ad283985:src/game/game.ts:998 (if(r.turnover) team.turnovers++)',
'newSource':'PR188 src/game/possession-stats.ts deriveOfficialPossessionStats; src/game/game.ts recordStats applies O and D credits separately',
'limitations':['Only scrimmage box turnovers are reconciled; native generated kick possession changes do not carry equivalent player box statistics.','Historical missing return-fumbler singular fields are unavailable, not evidence that an achieved D→O change did not occur.','Use explicit officialCredit segments/stats when supplied. An uncredited raw nullified ending never supplies an official takeaway.']}
for row in ledger['games']:
 if row['status']=='unrun':continue
 if row['status']!='complete':
  (r['candidateFailures']if row['arm']=='candidate'else r['historicalBaselineFailures']).append({'game':row['arm']+'/'+row['id'],'reason':'Game incomplete'});continue
 s=json.loads(Path(row['summary']).read_text());abbr=[t['abbr']for t in s['teams']];other=lambda a:abbr[1-abbr.index(a)];expected={a:0 for a in abbr};witnesses=[]
 for p in s['log']:
  if p['kind']not in ('run','pass'):continue
  oc=p.get('officialCredit')
  if oc:
   if not oc.get('playCharged'):continue
   segments=oc.get('segments',[]);stats=oc.get('stats',{})
  else:
   if p.get('nullified'):continue
   segments=p.get('segments',[]);stats=p.get('stats',{})
  prior='O';previous=None;transitions=[]
  for z in segments:
   if z['team']!=prior:
    from_abbr=p['offense']if prior=='O'else other(p['offense']);expected[from_abbr]+=1
    transitions.append({'from':prior,'to':z['team'],'losingTeam':from_abbr,'gainingPlayer':z['carrier'],'how':z['how'],'fumbler':previous['carrier']if previous and(previous['end']=='fumble'or z['how']=='recovery')else None,'matchedFumble':False});prior=z['team']
   previous=z
  extras=[]
  for f in stats.get('fumbles',[]):
   if not f.get('lost'):continue
   match=next((t for t in transitions if not t['matchedFumble']and t['from']==f['team']and t['how']!='interception'and(t['fumbler']==f['playerId']or t['gainingPlayer']==f.get('recoveredBy'))),None)
   if match:match['matchedFumble']=True
   else:
    team=p['offense']if f['team']=='O'else other(p['offense']);expected[team]+=1;extras.append({'team':team,'nativeFumble':f,'reason':'Explicit lost-fumble fact without possession segment, e.g. opponent-endzone touchback'})
  if transitions or extras:witnesses.append({'index':p['index'],'call':p['call'],'offense':p['offense'],'rawOutcome':p.get('outcome'),'officialTreatment':oc.get('treatment')if oc else'historical physical','transitions':transitions,'nativeLedgerExtras':extras,'segments':segments,'historicalSingular':{k:stats.get(k)for k in ['interceptedBy','fumbledBy','fumbleLost','fumbleRecoveredBy']}})
 actual={t['abbr']:t['box']['turnovers']for t in s['teams']};player={t['abbr']:sum(x['int']+x['fumblesLost']for x in t['players'])for t in s['teams']}
 game={'game':row['arm']+'/'+row['id'],'commit':s['provenance']['commit'],'expectedByPossessionHistory':expected,'boxTurnovers':actual,'playerInterceptionsPlusLostFumbles':player,'historyMatchesBox':expected==actual,'witnesses':witnesses}
 if expected!=actual:
  failure={'game':game['game'],'reason':'Team turnover box omits achieved possession changes','expected':expected,'actual':actual,'delta':{a:expected[a]-actual[a]for a in abbr},'preservedOriginal':True}
  (r['candidateFailures']if row['arm']=='candidate'else r['historicalBaselineFailures']).append(failure)
 r['games'].append(game)
r['candidatePassed']=not r['candidateFailures'];r['historicalBaselinePassed']=not r['historicalBaselineFailures'];r['status']='candidate-pass-with-historical-baseline-failures'if r['candidatePassed']and not r['historicalBaselinePassed']else'pass'if r['candidatePassed']else'candidate-failure'
(out/'turnover-audit.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({'status':r['status'],'candidateFailures':r['candidateFailures'],'historicalBaselineFailures':r['historicalBaselineFailures'],'games':[{k:g[k]for k in ['game','expectedByPossessionHistory','boxTurnovers','playerInterceptionsPlusLostFumbles','historyMatchesBox']}for g in r['games']]}))
if not r['candidatePassed']:sys.exit(1)
