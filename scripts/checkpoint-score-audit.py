"""Reconcile saved Game score against credited points; no engine execution.
python scripts/checkpoint-score-audit.py OUT
Box offensive TD/FG/XP totals are cross-checked with qualified native scoring
logs. Defensive scores use actual segment team; ambiguous kick/try facts remain
explicit manual review, never silently invented from final score.
"""
import json,sys,re
from pathlib import Path
out=Path(sys.argv[1]);ledger=json.loads((out/'batch-ledger.json').read_text())
result={'schema':'matched-game-score-audit-v1','inputSha256':ledger['inputSha256'],'games':[],'hardFailures':[],'reviewItems':[]}
for row in ledger['games']:
    if row['status']=='unrun':continue
    key=row['arm']+'/'+row['id']
    if row['status']!='complete':result['hardFailures'].append({'game':key,'reason':'Game incomplete'});continue
    s=json.loads(Path(row['summary']).read_text());abbrs=[t['abbr'] for t in s['teams']];other=lambda a:abbrs[1-abbrs.index(a)]
    expected={a:0 for a in abbrs};components={a:{'offensiveTD':0,'fieldGoals':0,'extraPoints':0,'defensiveTD':0,'kickTD':0,'twoPoint':0,'safety':0} for a in abbrs}
    for t in s['teams']:
        a=t['abbr'];ps=t['players'];c=components[a]
        c['offensiveTD']=sum(p['rushTD']+p['passTD'] for p in ps);c['fieldGoals']=sum(p['fgm'] for p in ps);c['extraPoints']=sum(p['xpm'] for p in ps)
    qualified_td={a:0 for a in abbrs};canceled=[];ambiguous=[];scoring_log=[]
    for p in s['log']:
        a=p['offense'];text=p.get('text','');kind=p['kind'];oc=p.get('officialCredit')
        physical=(oc.get('treatment')=='physical' and oc.get('playCharged')) if oc else not p.get('nullified')
        if kind in ('run','pass') and p.get('outcome')=='touchdown':
            if not physical:canceled.append({'index':p['index'],'call':p['call'],'officialCredit':oc,'official':p.get('official')});continue
            endteam=(p.get('segments')or[{'team':'O'}])[-1]['team'];scoring=a if endteam=='O' else other(a)
            if endteam=='O':qualified_td[a]+=1
            else:components[scoring]['defensiveTD']+=1
            scoring_log.append({'index':p['index'],'kind':'scrimmageTD','team':scoring,'points':6,'officialTreatment':oc.get('treatment') if oc else 'historical physical'})
        if kind in ('kickoff','punt') and re.search(r'touchdown|\bTD\b',text,re.I) and not p.get('nullified'):
            # Generated ordinary native kick returns in this checkpoint score R;
            # supplied hooks/ambiguous kicking-team touchdown descriptions need facts.
            if re.search(r'returned.*touchdown|return.*\bTD\b',text,re.I):
                components[other(a)]['kickTD']+=1;scoring_log.append({'index':p['index'],'kind':'kickReturnTD','team':other(a),'points':6})
            else:ambiguous.append({'index':p['index'],'reason':'Kick score requires explicit possession facts','text':text})
        if kind=='two' and not p.get('nullified'):
            if 'one-point safety' in text:ambiguous.append({'index':p['index'],'reason':'One-point safety team not serialized','text':text})
            elif 'defensive two points' in text:components[other(a)]['twoPoint']+=2
            elif re.search(r': GOOD(?:$| — penalty declined)',text):components[a]['twoPoint']+=2
            elif 'FAILED' not in text and 're-Try' not in text:ambiguous.append({'index':p['index'],'reason':'Try score needs explicit ruling facts','text':text})
        if kind in ('run','pass') and re.search(r'\bSAFETY\b',text):
            if not p.get('nullified'):
                endteam=(p.get('segments')or[{'team':'O'}])[-1]['team'];award=other(a) if endteam=='O' else a;components[award]['safety']+=2
            elif p.get('official') and all(f.get('team')==p.get('fouls',[{}])[0].get('team') for f in p.get('fouls',[])) and p.get('fouls'):
                components[other(p['fouls'][0]['team'])]['safety']+=2
            else:ambiguous.append({'index':p['index'],'reason':'Penalty safety team requires explicit ruling facts','text':text})
    for a,c in components.items():
        expected[a]=6*(c['offensiveTD']+c['defensiveTD']+c['kickTD'])+3*c['fieldGoals']+c['extraPoints']+c['twoPoint']+c['safety']
        if c['offensiveTD']!=qualified_td[a]:result['hardFailures'].append({'game':key,'reason':'Credited offensive TD count differs from qualified raw scoring log','team':a,'box':c['offensiveTD'],'log':qualified_td[a]})
    actual={abbrs[0]:s['score']['home'],abbrs[1]:s['score']['away']}
    if not ambiguous and expected!=actual:result['hardFailures'].append({'game':key,'reason':'Point conservation mismatch','expected':expected,'actual':actual})
    result['reviewItems'] += [{'game':key,**x} for x in ambiguous]
    top=sum(t['box']['timeOfPossession'] for t in s['teams']);quarter=s['finalState']['quarter'];clock=s['finalState']['clock']
    top_limit='Regular-season complete regulation should account for3600 game seconds. OT uses a600-second native period.'
    if quarter==4:top_expected=3600
    elif quarter>=5:top_expected=3600+(quarter-5)*600+600-clock
    else:top_expected=None
    if top_expected is not None and abs(top-top_expected)>1e-5:result['hardFailures'].append({'game':key,'reason':'Time-of-possession conservation mismatch','actual':top,'expected':top_expected,'quarter':quarter,'clock':clock})
    # Snapshot increments are cumulative; XP log entries are created after the
    # made kick, so a TD-to-XP transition can already contain seven points.
    increments=[];prev={'home':0,'away':0}
    for p in s['log']+[{'index':'final','kind':'final','score':s['score']}]:
        delta={k:p['score'][k]-prev[k] for k in prev}
        if any(delta.values()):increments.append({'atIndex':p['index'],'kind':p['kind'],'delta':delta})
        if any(v<0 or int(v)!=v for v in delta.values()):result['hardFailures'].append({'game':key,'reason':'Invalid cumulative score increment','delta':delta,'index':p['index']})
        prev=p['score']
    result['games'].append({'game':key,'components':components,'qualifiedRawOffensiveTD':qualified_td,'expectedPoints':expected,'actualPoints':actual,'canceledRawTouchdowns':canceled,'scoringLog':scoring_log,'scoreIncrements':increments,'timeOfPossession':top,'expectedTime':top_expected,'timeLimit':top_limit,'ambiguous':ambiguous})
result['passed']=not result['hardFailures'] and not result['reviewItems']
(out/'score-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'passed':result['passed'],'games':len(result['games']),'hardFailures':result['hardFailures'],'reviewItems':result['reviewItems'],'scores':[{'game':g['game'],'expected':g['expectedPoints'],'actual':g['actualPoints'],'TOP':g['timeOfPossession']}for g in result['games']]}))
if not result['passed']:sys.exit(1)
