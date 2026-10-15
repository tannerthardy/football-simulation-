"""Independent #84 byte/film reduction. No native simulation or behavior edits."""
import gzip,hashlib,json,math,pathlib,subprocess,time
start=time.perf_counter();cpu=time.process_time()
repo=pathlib.Path.cwd();saved=repo/'out/pr84-author-evidence';root=saved/'data/reviews/current/combo-football-surface'
accepted='7eb2554f5dbb497cff169f386704a5b0f4cf43fe';head='4af71ac8a8f320456e87a027579200469a0c1ee0';evidence='70ed238a2246cd89d3c4108d647245baf5ff70bb';tested='8d4b868b6125270a407a2b9b1b6238508616c365'
def git(*args):return subprocess.check_output(['git',*args])
def load(p):return json.load(gzip.open(p,'rt'))
def sha(b):return hashlib.sha256(b).hexdigest()
manifest=json.load(open(root/'artifacts.json'))
for path,expected in manifest.items():
    b=(saved/path).read_bytes();assert len(b)==expected['bytes'] and sha(b)==expected['sha256'],path
protected=['src','test','config','package.json','package-lock.json','.nvmrc','tsconfig.json','scripts/baseline.mjs']
assert git('diff','--name-only',tested,head,'--',*protected)==b''
assert git('diff','--name-only','aebb0abb3a9e96ec6561274b9fdd4e8e76ce7173',head,'--',*protected)==b''
changed=git('diff','--name-only',accepted,head,'--','src','test').decode().splitlines()
assert changed==['src/sim/behaviors/blocking.ts','test/combo-transfer.test.ts']
h=hashlib.sha256()
for path in git('ls-tree','-r','--name-only',head,'src').decode().splitlines():
    h.update(path.encode());h.update(b'\0');h.update(git('show',head+':'+path));h.update(b'\0')
assert h.hexdigest()=='dcebbee42fbe4cd64f603740d9b20bdf521ae424ad94e084eb46b30478b297e3'
packets={n:load(root/(n+'.json.gz')) for n in ['current','current-a018','under-baseline','candidate-a030','candidate-controls','under-candidate']}
base={r['id']:r for name in ['current','current-a018','under-baseline'] for r in packets[name]['rows']}
cand={r['id']:r for name in ['candidate-a030','candidate-controls','under-candidate'] for r in packets[name]['rows']}
receipts={p.stem:json.load(open(p)) for p in (root/'receipts').glob('*.json')}
flags=receipts['focused']['flags'];defaults=receipts['focused']['worldDefaults']
assert len(flags)==44 and flags['RUN_CONTACT_COMPONENTS']=='1'
for n,p in packets.items():
    assert p['receipt']['flags']==flags and p['receipt']['worldDefaults']==defaults and p['receipt']['node']=='v22.23.3'
for n,r in receipts.items():
    assert r['flags']==flags and r['worldDefaults']==defaults and r['inputsUnchanged']
    assert r['exitCode']==(1 if n=='old-controls-red' else 0)
def f(r,t):return next(x for x in r['frames'] if x['t']==t)
def impacts(r):return [{'t':x['t'],**c} for x in r['frames'] for c in x['report']['contacts'] if c['i']<11 and c['j']<11]
def events(r,k):return [e for e in r['events'] if e['type']==k]
def speed(b):return math.hypot(b['vel']['x'],b['vel']['y'])
def los(r):return next(x for x in r['frames'] if x['before'][6]['pos']['x']>=35)
rows=[]
for key in ['A030','A018','A027','DuoUnder']:
    b,c=base[key],cand[key];assert b['inputSha256']==c['inputSha256'] and b['initial']==c['initial']
    assert b['source']=='78183dc79c6285939b80875b131584c18c4f0eda020c17bcfde6191823ace965'
    assert c['source']==h.hexdigest()
    index=next((i for i,(x,y) in enumerate(zip(b['frames'],c['frames'])) if x!=y),None)
    row={'id':key,'identicalFrames':b['frames']==c['frames'],'identicalResult':b['result']==c['result']}
    if key in ['A027','DuoUnder']:
        assert row['identicalFrames'] and row['identicalResult'] and b['events']==c['events']
    if index is not None:
        a,z=b['frames'][index],c['frames'][index]
        assert a['before']==z['before']
        row['firstDifference']={'t':a['t'],'sameAll22EnteringBodies':True,'prefixFramesExact':b['frames'][:index]==c['frames'][:index],
            'rawActors':[i for i in range(22) if a['raw'][i]!=z['raw'][i]],'postStepRngEqual':a['rng']==z['rng']}
    row['candidateClimbs']=events(c,'block_climb')
    row['candidateNativeDepartures']=[{'t':x['t'],'actor':x['a'],'acquiredDeparture':x['acquiredDeparture']} for x in c['calls'] if x['method']=='startDeparture']
    row['runner']={'acceptedLos':los(b)['t'],'candidateLos':los(c)['t'],'acceptedSpeed':speed(los(b)['before'][6]),'candidateSpeed':speed(los(c)['before'][6]),'candidateOffensiveImpacts':impacts(c)}
    rows.append(row)
assert rows[0]['firstDifference']['t']==.85 and rows[0]['firstDifference']['rawActors']==[2,3]
assert rows[0]['runner']['candidateLos']==2.65 and not rows[0]['runner']['candidateOffensiveImpacts']
assert not rows[1]['runner']['candidateOffensiveImpacts']
# A real detour is still admitted in the unchanged fresh Under front.
under=rows[3]['candidateNativeDepartures'];assert under[0]['t']==.85 and under[0]['actor']==2 and under[0]['acquiredDeparture']['exit'] is not None
# Existing controls preserve real defender wins; no required yardage recovery.
assert events(cand['DuoUnder'],'tackle_wrap')[0]['a']==15
assert events(cand['A018'],'tackle_wrap')[0]['a']==15
assert not [e for e in events(cand['A018'],'block_contact') if e.get('a')==5 and e.get('b')==15]
# The gate reads acquired DL/LB age .30 and teammate age .05 in the saved first decision.
r=cand['A030'];cues={x['b']:x['picture'] for x in r['reads'] if x['t']==.85 and x['a']==2 and x['context']=='joined-security'}
own=f(r,.85)['before'][2];dt=next(x for x in r['joined'] if x['t']==.85)['after'][0]['reads'][1]['nextRead']-.85
a=own['pos']['y']-cues[13]['pos']['y'];p=cues[5]['pos']['y']-cues[13]['pos']['y'];k=cues[15]['pos']['y']-cues[13]['pos']['y']
nk=k+(cues[15]['vel']['y']-cues[13]['vel']['y'])*dt;np=p+(cues[5]['vel']['y']-cues[13]['vel']['y'])*dt
assert a*p<0 and a*k<0 and p*k>0 and a*nk<0 and np*nk>0
assert math.isclose(cues[15]['age'],.3) and math.isclose(cues[13]['age'],.3) and cues[5]['age']==.05
# Keep/drop actual existing joint representations and later loads, not nominal jobs.
loads=[]
for t in [1.05,2.6,2.65]:
    frame=f(r,t);rt=next(e for e in frame['beforeReps'] if e['b']==2 and e['d']==13)
    lb=next((e for e in frame['beforeReps'] if e['b']==5 and e['d']==15),None)
    assert rt['hands']['normal']>0
    if t>=2.6:assert lb and lb['hands']['normal']>0 and abs(lb['hands']['tangent'])>0
    loads.append({'t':t,'RTkeepsDT':rt,'RGonLB':lb,'runner':frame['before'][6]})
assert next(e for e in events(r,'block_contact') if e.get('a')==5 and e.get('b')==15)['t']==2.6
# All retained work runs under identical existing bounds in every saved candidate frame.
max_arm_over=0.;max_residual=0.
for case in cand.values():
    for frame in case['frames']:
        report=frame['report'];max_residual=max(max_residual,abs(report['work']['residual']))
        max_arm_over=max(max_arm_over,max(x-y for x,y in zip(report['armImpulse'],report['armImpulseLimit'])))
assert max_arm_over<1e-8
out={'verdict':'accept bounded production correction for Integration review; no merge or physics authority',
 'accepted':accepted,'reviewedHead':head,'authorEvidence':evidence,'testedCandidate':tested,'sourceSha256':h.hexdigest(),
 'protectedCandidateEqualsTested':True,'newProductionFiles':changed[:1],'verifiedAuthorArtifacts':len(manifest),'rows':rows,
 'firstAcquiredGate':{'t':.85,'reader':2,'cues':cues,'ownY':own['pos']['y'],'decisionInterval':dt,'own':a,'partner':p,'key':k,'nextKey':nk,'nextPartner':np},
 'nativeLoads':loads,'savedCandidateBudgetCheck':{'maximumArmImpulseExcess':max_arm_over,'maximumAbsoluteWorkResidual':max_residual},
 'reusedAuthorChecks':{'focused':66,'newControls':7,'oldSourceExpectedFailures':3,'typecheck':'pass','nativeExecutions':8,
 'nativeLauncherSeconds':8.115281821,'allLauncherSeconds':23.393741055},
 'independentNewTests':0,'independentNewNativeExecutions':0,'independentNewGames':0,
 'whyNoNewTest':'The explicit clear-route bypass is statically preserved; mirrored near-half/crossing controls and an unchanged native Under detour resolve valid-departure risk. Existing keeper/security/attention controls are unchanged and their source receipt applies byte-for-byte.',
 'risks':['Duo-only half-surface preference, not optimal routing certification. Some contacts may remain longer.',
 'A030 includes changed C departure and immediately divergent execution RNG; final gain is not isolated controller value.',
 'A018 still misses LB collection, retains legitimate LB tackle, and existing rotated-contact limitations remain.',
 'No broad front/formation, wide-zone improvement, live mesh or physical-law claim. Integration owns combined verification/adoption.'],
 'runtime':{'independentReductionWallSeconds':time.perf_counter()-start,'independentReductionCpuSeconds':time.process_time()-cpu}}
path=repo/'data/reviews/current/pr84-independent-review/review.json';path.write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'verdict':out['verdict'],'artifacts':len(manifest),'rows':[{k:v for k,v in x.items() if k not in ['candidateNativeDepartures']} for x in rows],
 'nativeBudgets':out['savedCandidateBudgetCheck'],'runtime':out['runtime']},indent=2))
