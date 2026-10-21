import gzip,json,math,hashlib
from pathlib import Path
input_path=Path('data/reviews/physics-world/zone-reach/after-film.json.gz')
x=json.load(gzip.open(input_path,'rt')); rows=[]; summaries=[]
for p in x['plays']:
 profiles={a['slot']:a['profile'] for a in p['players']}; indexes={a['slot']:i for i,a in enumerate(p['players'])}; instances={}
 for tick in p['trace']:
  for u in tick['updates']:
   own=u['beforeBody']; c=own['plan'].get('combination') if own['plan'] else None
   if not c:continue
   ca=u['oldCombinationAfter']
   if not ca or ca['nextRead']==c['nextRead']:continue
   e=own['engagement']; q=instances.setdefault(c['id'],{'members':c['members'],'defender':c['defender'],'backer':c['backer'],'reads':0,'bothAttachedReads':0,'helperVetoWhilePrimaryGood':0,'earnedClimb':None})
   q['reads']+=1
   if u['classification']=='earned-climb':q['earnedClimb']=tick['t']
   before={v['slot']:v for v in tick['before']}
   before.update({v['observer']:v['beforeBody'] for v in tick['updates'] if v['observer'] not in before})
   attached=e and all(before.get(slot,{}).get('engagement',{} ) and before[slot]['engagement']['defender']==c['defender'] for slot in c['members'])
   if not attached:continue
   q['bothAttachedReads']+=1
   keeper=before[e['blocker']]; helper_slots=e['helpers']; geo=u['targetGeometry']; d=geo['actualPosition']
   drive=e['drive']; axis=e['surfaceAxis'] or {'x':-drive['x'],'y':-drive['y']}; lat={'x':-axis['y'],'y':axis['x']}
   rb=.11+.05*profiles[keeper['slot']]['balance']+.04*max(0,min(1,(profiles[keeper['slot']]['massKg']-90)/60))
   # This only certifies availability=1 in its flat region. Outside that region left unknown.
   radius=rb*(.75+.5*max(0,min(1,keeper['support']['posture'])))
   xi=math.hypot(keeper['support']['xi']['x'],keeper['support']['xi']['y'])
   availability_one=keeper['support']['state']=='up' and xi<=radius
   primary_good=e['control']>-.066 and abs(e['phi'])<.55 and availability_one
   helpers=[]
   for hs in helper_slots:
    h=before[hs]; delta={'x':h['pos']['x']-d['x'],'y':h['pos']['y']-d['y']}; dd=math.hypot(*delta.values())
    angle=max(0,min(1,(delta['x']*axis['x']+delta['y']*axis['y'])/(dd or 1)))
    # A mature helper cannot exceed angle, even at perfect establishment/fatigue.
    helpers.append({'slot':hs,'position':h['pos'],'velocity':h['vel'],'distance':dd,'maxSupportFromGeometry':angle,'state':h['support']['state']})
   veto=primary_good and any(h['maxSupportFromGeometry']<.25 for h in helpers)
   q['helperVetoWhilePrimaryGood']+=veto
   load=next((v for v in tick['deliveredStep'] if v['slot']==keeper['slot']),None)
   frame=min(p['result']['frames'],key=lambda f:abs(f['t']-tick['t'])) if p['result']['frames'] else None
   backer=frame['agents'][3*indexes[c['backer']]:3*indexes[c['backer']]+2] if frame and c['backer'] else None
   row={'play':p['id'],'t':tick['t'],'observer':u['observer'],'combo':c,'keeper':keeper['slot'],'keeperPosition':keeper['pos'],'defenderPosition':d,'keeperControl':e['control'],'keeperPhi':e['phi'],'keeperXi':xi,'keeperBaseFlatRadius':radius,'keeperAvailabilityOne':availability_one,'primaryGoodConservative':primary_good,'helpers':helpers,'helperVetoWhilePrimaryGood':veto,'afterSecureSince':ca['secureSince'],'consumedTargets':[v['target'] for v in u['consumedImages']],'keeperDeliveredArmImpulse':load['armImpulse'] if load else None,'keeperLiveHands':load['liveHandsAfterPhysics'] if load else None,'backerActualRoundedFrame':backer,'backerActualRoundedFrameT':frame['t'] if frame else None,'helperActualDistanceToBackerRounded':[{ 'slot':h['slot'],'distance':math.hypot(h['position']['x']-backer[0],h['position']['y']-backer[1])} for h in helpers] if backer else [],'events':u['events']}
   rows.append(row)
 summaries.append({'play':p['id'],'run':p['run'],'front':p['front'],'side':'L' if p['flip'] else 'R','combos':list(instances.values())})
report={'schema':'saved-combo-audit-v1','source':x['sourceAfter'],'input':str(input_path),'inputSha256':hashlib.sha256(input_path.read_bytes()).hexdigest(),'scope':'12 fixed film clips only, original-zone diagnostics plus installed controls','definitions':{'primaryGoodConservative':'control > -.066 exceeds every current urgency threshold; abs stored phi<.55; keeper up with xi inside actual posture-scaled support radius proves availability1. Does not certify a correct single-player fit or safe release.','helperVeto':'At least one helper has current dot(keeper contact axis, helper-to-defender) <.25. This is an upper bound on current helperSupport; fatigue and establishment only reduce it.','backer':'Actual rounded replay frame, not consumed vision. Failed original reads do not consume LB images.','nativeUnits':'force kg*yd/s^2, impulse kg*yd/s. Delivered arm impulse player-wide; live paired hands are independent proof of load.'},'summaries':summaries,'rows':rows,'totals':{'readRowsBothAttached':len(rows),'helperVetoWhilePrimaryGood':sum(r['helperVetoWhilePrimaryGood'] for r in rows),'combosWithVeto':sum(any(r['helperVetoWhilePrimaryGood'] and r['play']==s['play'] and r['combo']['id']==c['id'] for r in rows) for s in summaries for c in ({**c,'id':i+1} for i,c in enumerate(s['combos']))),'vetoRowsWithoutBackerRead':sum(r['helperVetoWhilePrimaryGood'] and r['combo']['backer'] not in r['consumedTargets'] for r in rows)}}
Path('out/universal-ol/combo-saved-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report['totals'],indent=2))
for s in summaries:
 print(s['play'],s['combos'])
print('Witnesses')
for r in rows:
 if r['helperVetoWhilePrimaryGood'] and r['play'] in ['ZR-R1-iz_strong-over-R-S3','ZR-R1-duo-odd-R-S11'] and r['t'] in [.85,1.05,1.25,2.25]:print(json.dumps(r))
