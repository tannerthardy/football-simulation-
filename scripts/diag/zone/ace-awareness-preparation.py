"""Prepare two saved Ace controls and memory lineage. No engine or visibility model."""
import gzip
import hashlib
import json
import math
from pathlib import Path
import subprocess
import time

start = time.perf_counter()
base = Path('data/reviews/current/ace-production-observations.json.gz')
native_path = Path('out/run-drills/native-prefix.json.gz')
old_manifest = json.loads(Path('docs/reviews/run-drills/input-manifest.json').read_text())
sha = lambda data: hashlib.sha256(data).hexdigest()
assert sha(base.read_bytes()) == old_manifest['reference']['sha256']
assert sha(native_path.read_bytes()) == '0be4172745d5d93c9c0eab409be0718eea291c1033587cbf845bfa1f6fa9c8eb'
packet = json.loads(gzip.decompress(base.read_bytes()))
native = json.loads(gzip.decompress(native_path.read_bytes()))
prov = packet['provenance']
assert prov['developCommit'] == 'a1b16e666a9ee7d1bc1d2aecba141fc535863b24'
assert prov['sourceSha256'] == old_manifest['sourceSha256']
runtime_hash = hashlib.sha256()
for path in sorted((p for p in Path('src').rglob('*') if p.is_file()), key=str):
    runtime_hash.update(str(path).encode()); runtime_hash.update(b'\0')
    runtime_hash.update(path.read_bytes()); runtime_hash.update(b'\0')
assert runtime_hash.hexdigest() == prov['sourceSha256']
assert sha(Path('package-lock.json').read_bytes()) == prov['lockSha256']
assert prov['flags'] == old_manifest['flags'] and len(prov['flags']) == 44
assert prov['worldDefaults'] == old_manifest['worldDefaults']
assert prov['node'] == 'v22.23.3'
ids = ['uc12-wz-s3-mirror', 'uc12-wz-s3']
rows = [next(r for r in packet['panel'] if r['input']['id'] == name) for name in ids]
assert native['input'] == rows[0]['input'] and native['hashes'] == rows[0]['hashes'][:54]
for r in rows:
    assert r['summary']['complete'] and not r['summary']['censoredByBudget']
    assert sha(json.dumps(r['hashes'],separators=(',',':')).encode()) == r['summary']['fullStateRngHistorySha256']
    assert len(r['actors']) == 22 and [a['idx'] for a in r['actors']] == list(range(22))
    assert [a['profile'] for a in r['actors']] == [a['profile'] for a in rows[0]['actors']]

def near(a,b): return abs(a-b) < 1e-8
def dot(a,b): return a['x']*b['x']+a['y']*b['y']
def difference(a,b): return math.hypot(a['x']-b['x'],a['y']-b['y'])

memory = []
for f in native['frames']:
    if not any(near(f['t'],t) for t in [2.2,2.4]): continue
    read = f['behavior'][2]['zoneRead']
    assert read['target'] == 12 and read['t'] < f['t'] < read['nextRead']
    native_cues = [p for p in native['pictures'] if p['actor']==2 and p['target']==12
        and near(p['t'],read['t']) and p['seen']==read['seen']]
    shared_cues = [p for d in rows[0]['detailedFrames'] if near(d['t'],read['t'])
        for p in d['consumed'] if p['actor']==2 and p['target']==12 and p['seen']==read['seen']]
    cues = native_cues or shared_cues
    assert cues, 'Held read must link to this observer\'s actual consumed image'
    same_tick_visual = [p for p in native['pictures'] if p['actor']==2 and p['target']==12 and near(p['t'],f['t'])]
    assert not same_tick_visual
    age = read['seen']['age']
    memory.append({'observer':2,'target':12,'useEntry':f['t'],'read':read,
        'acquiredAt':read['t'],'sampledAt':read['t']-age,'storedAgeAtAcquisition':age,
        'effectiveSampleAgeAtUse':f['t']-read['t']+age,'sourceEvidence':cues,
        'freshTargetSeeAtUse':False,
        'contract':'Personally consumed baseline picture, retained in the existing zone read. Not a new observation or a global-history memory grant.',
        'visibilityQualification':'Baseline see has no visibility gate. Candidate owner must establish acquisition eligibility; later loss of visibility alone must not erase legitimately acquired memory.'})

foot = []
maximum = 0
for r in rows:
    for f in r['detailedFrames']:
        for p in f['contactPhases']:
            if p['phase']!='movement' or p['rep']['blocker']!=2 or p['rep']['defender']!=12:continue
            d=p['data']; drive,lat=d['drive'],d['lat'];v=d['forward'];l=d['lateral']
            overlap=v*dot(drive,lat) if d['stretch'] else 0
            pre={k:drive[k]*v+lat[k]*(l-overlap) for k in ['x','y']}
            residual=difference(pre,d['preAnchor'])
            command = {'x':2.4+lat['x']*l*.3,'y':lat['y']*l*.3} if d['anchored'] else pre
            command_residual=difference(command,d['command']['vel'])
            maximum=max(maximum,residual,command_residual)
            assert residual < 1e-12 and command_residual < 1e-12
            before=next(a for a in f['before'] if a['idx']==2)
            after=next(a for a in f['afterBodies'] if a['idx']==2)
            foot.append({'case':r['input']['id'],'entry':f['t'],'completed':f['after'],
                'axis':d['axis'],'lat':lat,'drive':drive,'forward':v,'lateral':l,
                'driveTangentOverlapRemoved':overlap,'computedPreAnchor':pre,'savedPreAnchor':d['preAnchor'],
                'anchored':d['anchored'],'computedCommand':command,'savedCommand':d['command'],
                'compositionResidual':residual,'commandResidual':command_residual,
                'flowFloorGateEligible':abs(lat['y'])>.5,
                'rtVelocityBefore':before['vel'],'rtVelocityAfter':after['vel'],
                'consumedTargetImages':[x for x in f['consumed'] if x['actor']==2 and x['target']==12]})
assert foot

inputs = {'protocol':'ace-awareness-comparison-inputs-v1',
    'question':'How does the owner\'s information-source-only repair change actual protection and traffic in D01 H versus successful Y, with legitimate observer memory preserved?',
    'acceptedDevelop':prov['developCommit'],'historicalComparison':old_manifest['comparisonBaseline'],
    'acceptedSourceSha256':prov['sourceSha256'],'node':prov['node'],'platform':prov['platform'],'arch':prov['arch'],
    'lockSha256':prov['lockSha256'],'flags':prov['flags'],'worldDefaults':prov['worldDefaults'],
    'reference':{'path':str(base),'sha256':sha(base.read_bytes()),'producerCommit':prov['collectorCommit'],
        'publication':'ba9544f23029c634cb6e22b14ecad617fcdd3470','captureScope':packet['captureScope']},
    'd01NativePrefix':{'path':str(native_path),'sha256':sha(native_path.read_bytes()),'producerCommit':native['commit'],
        'prefixHashesExact':54,'captureWindow':[2.2,2.7],'notObserverInitialization':True},
    'cases':[{'role':'D01 adverse H' if i==0 else 'Successful Y opposing control','input':r['input'],
        'setup':r['setup'],'actors':r['actors'],'baselineSummary':r['summary'],'baselineHashes':r['hashes']}
        for i,r in enumerate(rows)],
    'candidate':{'owner':'Pass/Pursuit awareness owner','commit':None,'sourceSha256':None,'settings':None,
        'observerInitializationInstructions':None,'status':'Awaiting owner; do not execute candidate, rerun references or implement another awareness layer.'},
    'preserved':['Native all22 roster/setup/call','Existing yielding and navigation equations','Movement/contact laws and capacities',
        'RT recovery variants paused; no intervention','PR32 conclusions and historical4ded6b6','Weak/withdrawn early-release/parked TE and RB evidence kept separate']}
evidence={'protocol':'ace-awareness-saved-inspection-v1','memoryWitnesses':memory,'loadedFootInspection':{
    'sampledRtIntervals':len(foot),'maximumCompositionResidual':maximum,'records':foot,
    'verdict':'No independent component-conversion or anchor arithmetic error demonstrated. Oblique flow-floor omission remains a policy question; an opposite request does not establish opposite achieved movement or a protection fix.',
    'newRecoveryTrialAuthorizedByInspection':False},
    'informationSources':{
        'teammateSee':'Current source always returns the .05-second delayed world-buffer picture, without visibility/occlusion or observer acquisition gating.',
        'calledMotion':'Magnitude is declared zone-track tempo (0,side*vmax*.45*press), not actual private requested velocity. Presence is reset each update and enabled by private zoneFlow/job/contact eligibility; audit that activation separately.',
        'heldRead':'Existing finite-cadence personally consumed picture; retain lineage and acquisition time, do not relabel it as a fresh image.',
        'ownTactile':'Own support/ground/load and actually acquired contact cues remain available; no arbitrary visual blindfold of connected contact mechanics.',
        'worldState':'All22 physical state is analyst/solver evidence, not memory initialization for every observer.'},
    'captureGaps':['Y has selected consumed pictures and all-tick key movement; it lacks an explicit complete observer-memory/visibility history.',
        'H captures exact actual held RT reads and all22 late World bodies, not every observer\'s acquisition history from snap.',
        'Existing state/RNG hash schema does not certify a future awareness owner\'s new private observer state; require a separate owner-state fingerprint.'],
    'candidateExecution':False,'newWorldSteps':0,'newPlays':0}
destination=Path('docs/reviews/ace-awareness');destination.mkdir(parents=True,exist_ok=True)
(destination/'input-manifest.json').write_text(json.dumps(inputs,indent=2)+'\n')
(destination/'saved-inspection.json').write_text(json.dumps(evidence,indent=2)+'\n')
receipt={'protocol':'ace-awareness-preparation-receipt-v1','testedRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
    'generatorSha256':sha(Path(__file__).read_bytes()),'candidateExecuted':False,'newWorldSteps':0,'newPlays':0,
    'controlsPrepared':ids,'referenceIntegrity':True,'d01Prefix54HashesExact':True,'heldMemoryLineageMatches':len(memory),
    'loadedFootIntervalsChecked':len(foot),'maximumCompositionResidual':maximum,
    'sourceAndRuntimeChanged':False,'fullSuiteOrTypecheckRun':False,
    'correctedPreparationPreflight':{'revision':'de02994','cause':'Python Path ordering compared components rather than the authoritative source helper\'s full path strings.',
        'runtimeChanged':False,'newWorldStepsBeforeFailure':0},
    'outputs':{str(destination/name):sha((destination/name).read_bytes()) for name in ['input-manifest.json','saved-inspection.json']},
    'elapsedSeconds':time.perf_counter()-start}
(destination/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
