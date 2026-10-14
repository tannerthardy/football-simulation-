"""Static handoff from compatible recordings; zero simulations/observations."""
from pathlib import Path
import json, gzip, hashlib, subprocess, datetime

ROOT = Path('out/option-agreement')
load = lambda p: json.loads(Path(p).read_text())
digest = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
panels = {name: load(ROOT / name / 'summary.json') for name in [
    'baseline-initial', 'receiver-initial', 'combined-initial', 'final-initial',
    'baseline-fresh', 'final-fresh', 'draw-control', 'fresh-draw-control', 'interception-draw-control']}
profile = load('config/baseline.json')
inputs = load('data/reviews/current/option-agreement-inputs.json')
expected_inputs = {r['id']:r for r in inputs['rows']}
for name,panel in panels.items():
    assert panel['provenance']['flags'] == profile['flags']
    assert panel['provenance']['worldDefaults'] == profile['worldDefaults']
    for row in panel['rows']:
        assert row['setupSha256'] == hashlib.sha256(json.dumps(expected_inputs[row['id']]['setup'],
            separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
        assert row['result']['outcome'] != 'timeout'
        assert digest(row['film']['path']) == row['film']['sha256']

def film(row):
    with gzip.open(row['film']['path']) as f:
        result=json.load(f)
    assert result['signature']==row['signature']
    return result

def summary(row):
    f=film(row)
    choices={}
    for s in f['steps']:
        for r in s['routesAfter']:
            if r['decision'] and r['i'] not in choices:
                choices[r['i']]={'t':s['t'],'actor':r['id'],'slot':r['slot'],
                    'beforePosition':s['before'][r['i']]['pos'],
                    'achievedVelocityAfter':s['after'][r['i']]['vel'],'decision':r['decision']}
    throw=next((e for e in row['result']['events'] if e['type'] in ['throw','throwaway']),None)
    boundary=next((s for s in f['steps'] if throw and s['t']==throw['t']),None)
    catch=next((e for e in row['result']['events'] if e['type']=='catch'),None)
    target=next((a for a in row['players'] if throw and a['i']==throw.get('b')),None)
    catcher=next((a for a in row['players'] if catch and a['i']==catch['a']),None)
    return {'id':row['id'],'setupSha256':row['setupSha256'],'signature':row['signature'],
        'film':row['film'],'result':row['result'],'choices':list(choices.values()),
        'throw':throw,'intendedActor':{k:target[k] for k in ['i','id','slot']} if target else None,
        'actualCatcher':{k:catcher[k] for k in ['i','id','slot']} if catcher else None,
        'qbAtRelease':boundary['qb'] if boundary else None}

baselines={r['id']:r for name in ['baseline-initial','baseline-fresh'] for r in panels[name]['rows']}
candidates={r['id']:r for name in ['final-initial','final-fresh'] for r in panels[name]['rows']}
assert set(baselines)==set(candidates)==set(expected_inputs)
for name,panel in panels.items():
    for r in panel['rows']:
        assert r['players']==baselines[r['id']]['players'],'Capabilities/identities must stay frozen'
assert baselines['unaffected-verts']['signature']==candidates['unaffected-verts']['signature']

receipts=[]
for p in sorted(ROOT.glob('*receipt.json')):
    x=load(p);assert x['inputsUnchanged'];assert x['flags']==profile['flags']
    receipts.append({'path':p.as_posix(),'sha256':digest(p),'receipt':x})
final_checks=load(ROOT/'isolated-contracts-receipt.json')
typecheck=load(ROOT/'final-typecheck-receipt.json')
build=load(ROOT/'build-receipt.json')
candidate_sha=panels['final-initial']['provenance']['sourceSha256']
assert candidate_sha==panels['final-fresh']['provenance']['sourceSha256']
assert all(x['sourceSha256']==candidate_sha and x['exitCode']==0 for x in [final_checks,typecheck,build])
source=hashlib.sha256()
for p in sorted(Path('src').rglob('*'),key=lambda p:p.as_posix()):
    if p.is_file():source.update(p.as_posix().encode()+b'\0'+p.read_bytes()+b'\0')
assert source.hexdigest()==candidate_sha

def compact_contest(path):
    x=load(path)
    return {k:v for k,v in x.items() if k!='samples'} | {'samples':[
        {k:v for k,v in s.items() if k!='agents'} | {'agents':[a for a in s['agents'] if a['i'] in [8,10,18,21]]}
        for s in x['samples'] if s['opportunities'] or s['events']]}

report={'schema':'observed-stick-agreement-review-v1','publishedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'reportCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
    'analysisSha256':digest(__file__),'baselineIntegration':'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
    'baselineSourceSha256':profile['sourceSha256'],'candidateSourceSha256':candidate_sha,
    'flags':profile['flags'],'worldDefaults':profile['worldDefaults'],
    'inputs':{'path':'data/reviews/current/option-agreement-inputs.json','sha256':digest('data/reviews/current/option-agreement-inputs.json')},
    'research':{'path':'data/research/option-agreement-sources.json','sha256':digest('data/research/option-agreement-sources.json')},
    'comparisons':[{'id':i,'baseline':summary(baselines[i]),'candidate':summary(candidates[i])} for i in baselines],
    'intermediateStages':{name:{'provenance':panels[name]['provenance'],'rows':[summary(r) for r in panels[name]['rows']]}
        for name in ['receiver-initial','combined-initial']},
    'drawControls':{name:{'provenance':panels[name]['provenance'],
        'rows':[summary(r) for r in panels[name]['rows']], 'control':load(ROOT/name/'draw-control.json')}
        for name in ['draw-control','fresh-draw-control','interception-draw-control']},
    'ballContest':{'baseline':compact_contest(ROOT/'interception-contest-baseline.json'),
        'candidateWithLegacyDraws':compact_contest(ROOT/'interception-contest-candidate.json')},
    'recordingNeutrality':[{'stage':name,'id':r['id'],'signature':r['signature'],'plain':r['neutral']}
        for name,p in panels.items() for r in p['rows'] if r['neutral']],
    'launchReceipts':receipts,
    'cost':{'launcherSeconds':sum(sum(c['elapsedSeconds'] for c in r['receipt']['commands']) for r in receipts),
        'newFullDiagnosticRuns':sum(p['newSimulations'] for p in panels.values())+2,
        'distinctInputs':8,'freshInputs':4,'newGames':0,'fullSuites':0,
        'focusedDistinctContracts':54,'optionContracts':19,'censoredFullPlays':0,
        'localChecks':'Staged information/release controls and real eight-step press drill are not full-play outcomes.'},
    'failedEvidence':[
        {'receipt':'out/option-agreement/combined-checks-first-failed-receipt.json',
         'reason':'The initial before-cut anticipation test expected one yard of lateral displacement at .8 s while starting farther before the stem. A 1.2-s delivery horizon preserves the distance assertion and physically reaches the out leg; no speed/capability change.'},
        {'receipt':'out/option-agreement/out-leg-long-failed-receipt.json',
         'reason':'A short .4-s preview masked a return-to-stem defect through momentum. At 1.2 s it failed; geometric inference of the observed route leg repaired it without the private index.'}],
    'decision':{'status':'First Stick candidate ready for isolated owner review; no integration or default promotion.',
        'demonstrated':'Observed receiver read; separate QB expectation; legitimate anticipation, stale disagreement and visible correction; no private Stick path/branch at evaluation/release; frozen physical capabilities; fresh agreement/motion transfer.',
        'adverse':'Initial/fresh touchdowns depend on changed execution stream. Fresh interception-to-drop and its aligned completion are retained; route timing changes competing catches with a narrow original reach margin.',
        'limits':['No population-wide disagreement/error rate or NFL calibration.',
            'Native selected option throws in this small panel agree; thrown disagreement remains staged contract evidence.',
            'Nearest observed underneath key and compact movement cues are a bounded two-way install, not every NFL option route.',
            'Nominal forecast omits future contact and assumes full nominal energy; it cannot guarantee a correct break.',
            'QB uses existing 50-ms teammate latency and clear-look cone; receiver gaze/occlusion and explicit communication remain coarse.',
            'Legacy Hook, other QB/protection information debt, helper/YAC and World work stay separate.',
            'Original competing-catch margin is only .0081 yd; robust NFL catch/landing fidelity is not established by this candidate.'],
        'next':'Integration owner reviews exact source with the other candidates and runs the preserved combined suite. Before expanding option families, inspect a naturally selected disagreement or a prescribed late key rotation with actual receiver execution/ball contests, retaining the crossing slant/Stick control.'}}
dest=Path('data/reviews/current/option-agreement-review.json');dest.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'out':dest.as_posix(),'source':candidate_sha,'cost':report['cost'],'newSimulations':0}))
