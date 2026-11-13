"""Read-only C/final comparison; reuse published common metrics and native limits."""
import argparse, gzip, hashlib, importlib.util, json, math
from pathlib import Path

def module(path,name):
    spec=importlib.util.spec_from_file_location(name,path); result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result
COMMON=module(Path('scripts/diag/combo-attention-compare.py'),'cutoff_common_metrics')
LIMITS=module(Path('scripts/diag/compare-combo-transfer.py'),'cutoff_native_limits')
C_SOURCE='246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469'
COLLECTOR='1e6180d476b3a8ff5476badcf02309cf8706adcf0e954d9e475c4cce5f3685f6'
def load(path):
    with gzip.open(path,'rt') as f:return json.load(f)
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def require(value,message):
    if not value:raise ValueError(message)
def common_sidecar_initial(sidecar,cached):
    require(sidecar['players']==cached['players'],'Four witness initial players/body/mind/profile changed')
    rows={r['slot']:r for r in cached['ownership']}
    for r in sidecar['ownership']:
        old=rows[r['slot']]
        require(r['engagement']==old['engagement'] and r['tags']==old['tags'],'Four witness initial ownership changed')
        if not r['plan']:require(not old['plan'],'Initial absent plan changed');continue
        for key,value in r['plan'].items():
            if key=='contactFit':continue # Explicitly new intended installation, retained separately.
            prior=old['plan'][key]
            if key=='combination' and value and prior:
                prior={k:v for k,v in prior.items() if k not in ('secureSince','nextRead')}
            require(value==prior,f'Four initial common job field changed: {r["slot"]}/{key}')

def reconstructed_scope(trial):
    """Known planner predicate from recorded initial facts; not recorded contactFit."""
    players={a['slot']:a for a in trial['initialProjection']['players']}; answer=[]
    for r in trial['initialProjection']['ownership']:
        p=r['plan'];b=players[r['slot']]
        if r['slot'] not in ('LT','LG','C','RG','RT') or not p or p['kind']!='cutoff' or not p['target'] or p['combination']:continue
        d=players[p['target']];side=math.copysign(1,p['drive']['y']) if p['drive']['y'] else 0
        bp=b['body']['pos'];dp=d['body']['pos'];radius=b['profile']['radius']+d['profile']['radius']
        if dp['x']-40>=2 or abs(dp['y']-26.666666666666668)>=9 or (bp['y']-26.666666666666668)*side>=0 or (bp['y']-dp['y'])*side<=radius:continue
        length=math.hypot(-.3,p['drive']['y']*.6)
        answer.append({'slot':r['slot'],'target':p['target'],'axis':{'x':-.3/length,'y':p['drive']['y']*.6/length},'sealTarget':0,
            'recordingStatus':'installation predicate reconstructed from recorded common initial facts; actual contactFit omitted by unchanged panel'})
    return answer

parser=argparse.ArgumentParser();parser.add_argument('candidate',type=Path);parser.add_argument('four',type=Path);parser.add_argument('expected_source');parser.add_argument('output',type=Path);args=parser.parse_args()
base_path=Path('data/reviews/physics-world/combo-attention/candidate.json.gz');base=load(base_path);after=load(args.candidate);four=load(args.four)
require(base['sourceBefore']==base['sourceAfter']==C_SOURCE,'Cached promoted C source mismatch')
for r in (after,four):require(r['sourceBefore']==r['sourceAfter']==args.expected_source,'Final source changed or wrong frozen source')
require(base['collectorSha256']==after['collectorSha256']==COLLECTOR and base['cohort']==after['cohort'],'Common panel collector/cohort changed')
require(len(base['trials'])==len(after['trials'])==160 and len(base['supplementalTrials'])==len(after['supplementalTrials'])==2,'Panel population changed')
old={t['id']:t for t in base['trials']+base['supplementalTrials']};new={t['id']:t for t in after['trials']+after['supplementalTrials']};require(old.keys()==new.keys(),'Input IDs changed')
pairs=[];supplemental=[]
for id,b in old.items():
    a=new[id];require(b['initialProjection']==a['initialProjection'] and b['initialSha256']==a['initialSha256'] and b['profileSha256']==a['profileSha256'],f'Common initial input changed: {id}')
    for r in (b,a):require(r['observerVerified'] and r['observedSignature']==r['plainSignature'],f'Observer perturbed {id}')
    p=COMMON.pair(b,a);p['declaredCutoffScope']=reconstructed_scope(a);p['attribution']='combined cutoff and delayed QB/zone visual cues; RB source restored to C; no isolated per-repair causal attribution'
    (pairs if id in {x['id'] for x in base['trials']} else supplemental).append(p)
for report in (base,after):
    limits=LIMITS.physics_limits(report);require(all(v<=1e-8 for k,v in limits.items() if k!='observedNativeTicks'),'Native shared budget exceeds bound')
summaries=[]
for play in four['plays']:
    id=play['id'].replace('CA-','CT-',1);b=old[id];a=new[id]
    require(play['observerVerified'] and play['observedSignature']==play['plainSignature'],'Four native observer mismatch')
    require(play['naturalEnd'],'Four natural finish censored')
    common_sidecar_initial(play['initialProjection'],b['initialProjection']);require(play['profileSha256']==b['profileSha256'],'Four common profile hash mismatch')
    require(play['result']['yards']==a['result']['offenseYards'] and play['result']['duration']==a['result']['duration'] and play['result']['events']==a['result']['events'],'Four run differs from generic final input')
    install=play['surfaceInstallation'];slot=install['blocker'];target=install['defender'];side=math.copysign(1,install['plan']['drive']['y'])
    live=[];budget={'armImpulseExcess':0.,'armWorkExcess':0.,'supportMotorWorkExcess':0.,'groundTractionExcess':0.};max_residual=0;unsolved_retained_hands=0;no_delivered_arm_load=0
    for tick in play['ticks']:
        for r in tick['cutoffLoads']:
            for key,actual,limit in [('armImpulseExcess','armImpulse','armImpulseLimit'),('armWorkExcess','armWork','armWorkLimit'),('supportMotorWorkExcess','supportMotorWork','supportMotorWorkLimit')]:budget[key]=max(budget[key],r[actual]-r[limit])
            budget['groundTractionExcess']=max(budget['groundTractionExcess'],math.hypot(r['groundImpulse']['x'],r['groundImpulse']['y'])-r['groundTractionLimit'])
        if tick['workLedger']:max_residual=max(max_residual,abs(tick['workLedger']['residual']))
        body=tick['afterCutoff'];e=body['engagement']
        if not e or e['blocker']!=slot or e['defender']!=target:continue
        j=e['hands']
        if not j or not j['live'] or math.hypot(j['state'].get('normalForce',0),j['state'].get('tangentForce',0))<=1e-6:continue
        delivered=next((r for r in tick['cutoffLoads'] if r['slot']==slot),None)
        # A joint can survive an unsolved whistle tick with its previous forces.
        # Only an actual current World report plus delivered actor arm load proves
        # a newly loaded contact sample; never count that retained value twice.
        if not tick['workLedger'] or delivered is None:
            unsolved_retained_hands+=1;continue
        if delivered['armImpulse']<=1e-6:
            no_delivered_arm_load+=1;continue
        bp=body['physical']['pos'];dp=tick['afterInstalledTarget']['physical']['pos'];member=next(m for m in e['members'] if m['slot']==slot)
        live.append({'completedAt':tick['completedAt'],'handsId':j['id'],'normalForce':j['state'].get('normalForce',0),'tangentForce':j['state'].get('tangentForce',0),
            'actualSolvedTick':True,'deliveredArmImpulse':delivered['armImpulse'],'deliveredArmWork':delivered['armWork'],
            'actualPhi':member['surfacePhi'],'controllerPhi':e['phi'],'control':e['control'],'support':member['supportAvailability'],
            'insideSeparation':(bp['y']-dp['y'])*side,'towardInstalledInsideLane':(26.666666666666668-bp['y'])*side,
            'position':bp,'defenderPosition':dp,'axis':e['axis'],'drive':e['drive']})
    require(all(v<=1e-8 for v in budget.values()) and max_residual<=1e-8,'Four actual physics budget/residual fail')
    initial_fit=install['plan']['contactFit'];oldhands=next((r for r in b['olMetrics'][slot]['firstHands'] if r['other']==target),None)
    own_sheds=[e for e in play['result']['events'] if e['type']=='shed' and e.get('b')==next(r['idx'] if 'idx' in r else i for i,r in enumerate(play['initialProjection']['players']) if r['slot']==slot)]
    summaries.append({'id':id,'recordedNewInstalledSurface':initial_fit,'initialCommonInputsExact':True,'profileSha256':play['profileSha256'],
        'baselineYards':b['result']['offenseYards'],'afterYards':a['result']['offenseYards'],'baselineFirstLoadedHands':oldhands,
        'firstAfterLoadedHands':live[0] if live else None,'lastAfterLoadedHands':live[-1] if live else None,'loadedTicks':len(live),
        'localJointIds':sorted({r['handsId'] for r in live}),'minimumActualInsideSeparation':min((r['insideSeparation'] for r in live),default=None),
        'unsolvedRetainedHandsRowsExcluded':unsolved_retained_hands,'noDeliveredActorArmLoadRowsExcluded':no_delivered_arm_load,
        'minimumOrderingToInstalledInsideLane':min((r['towardInstalledInsideLane'] for r in live),default=None),
        'minimumActualSupport':min((r['support'] for r in live),default=None),'maxActualAbsPhi':max((abs(r['actualPhi']) for r in live),default=None),
        'ownShedEvents':own_sheds,'nativeBudgetMaximumExcess':budget,'maxWorkResidual':max_residual,
        'commonWholeEventsExactAgainstCachedC':b['result']['events']==a['result']['events'],
        'afterLoadedHandsRows':live,'attribution':'combined final source; independent cutoff-only dd4c proof preserved separately'})
output={'schema':'combined-run-cutoff-comparison-v1','sources':{'cachedC':C_SOURCE,'combinedFinal':args.expected_source},'toolSha256':sha(__file__),
    'files':{str(p):sha(p) for p in (base_path,args.candidate,args.four)},'initialCommonInputsExact':162,
    'ordinary':{'before':COMMON.metrics(base['trials']),'after':COMMON.metrics(after['trials'])},
    'supplemental':{'before':COMMON.metrics(base['supplementalTrials']),'after':COMMON.metrics(after['supplementalTrials'])},
    'nativeLimits':{'before':LIMITS.physics_limits(base),'after':LIMITS.physics_limits(after)},
    'pairs':pairs,'supplementalPairs':supplemental,'adverse2YardPairs':[p for p in pairs if p['yardsDelta']<=-2],
    'beneficial2YardPairs':[p for p in pairs if p['yardsDelta']>=2],'fourCutoffs':summaries,
    'limitations':['160 balanced fixed concept/front snaps are not NFL frequencies or roster population rates.',
        'Generic collector omits new contactFit metadata and joined prepass states; actual installation recorded only in four sidecars.',
        'Initial common equality intentionally excludes newly installed target-bound contactFit, which is explicitly retained in four sidecars.',
        'Combined source contains cutoff and delayed QB/zone visual-cue repairs; RB source is exact C, and observed outcome changes cannot be assigned to cutoff alone.',
        'FirstHands historical fields are actual saved samples; absent prolonged historical solo hand states are not invented.',
        'Separate cutoff-only dd4c scratch evidence remains independent; its mixed/worse Power gains are not replaced.']}
args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps({k:output[k]for k in ('sources','initialCommonInputsExact','ordinary','supplemental','nativeLimits')},indent=2))
print(json.dumps({'four':[{'id':s['id'],'loadedTicks':s['loadedTicks'],'minimumActualInsideSeparation':s['minimumActualInsideSeparation'],'afterYards':s['afterYards']}for s in summaries],
    'adverse2YardPairs':len(output['adverse2YardPairs']),'beneficial2YardPairs':len(output['beneficial2YardPairs'])},indent=2))
