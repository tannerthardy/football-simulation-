"""Reduce pinned opening evidence and validate same-tick comparisons. Zero World steps."""
import csv
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import time
os.environ.setdefault('MPLCONFIGDIR','/tmp/wide-zone-opening-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

start=time.perf_counter()
out=Path('docs/reviews/wide-zone-opening');out.mkdir(parents=True,exist_ok=True)
read=lambda p:json.loads(gzip.decompress(Path(p).read_bytes()))
sha=lambda b:hashlib.sha256(b).hexdigest()
root=Path('out/wide-zone-opening')
data={k:read(root/(k+'.json.gz')) for k in ['awareness','awareness-tail','bypass','bypass-tail']}
accepted_tail=read('/workspace/football-wide-zone-opening-baseline/out/wide-zone-opening/accepted-tail.json.gz')
accepted_weak=read('/workspace/football-wide-zone-opening-baseline/out/wide-zone-opening/accepted-weak-opening.json.gz')
old=read('/tmp/wide-zone-opening-reference/baseline-first-divergence.json.gz')
official=read('/tmp/wide-zone-opening-reference/candidate-outcomes.json.gz')
reference=read('data/reviews/current/ace-production-observations.json.gz')
probe=json.loads(Path('/tmp/rt-opening-clearance.json').read_text())
checks={};rows=[];summaries=[];first=[];free_count=0;free_residual=0

def actor(e):return e.get('agent') if isinstance(e,dict) else e
def combined(arm,row):
    tail=next((r for r in data[arm+'-tail']['panel'] if r['input']==row['input']),None)
    if tail:
        assert tail['informationHashes'][:20]==row['informationHashes']
        return row['frames']+tail['frames']
    return row['frames']

for native,bypass in zip(data['awareness']['panel'],data['bypass']['panel']):
    assert native['input']==bypass['input']
    ident=native['input']['id'];side=-1 if 'weak' not in ident else 1
    actors=native['actors'];ol=[a['idx'] for a in actors if a['slot'] in {'LT','LG','C','RG','RT'}]
    assert len(ol)==5
    f,g=native['frames'][1],bypass['frames'][1]
    assert native['informationHashes'][0]==bypass['informationHashes'][0]
    assert f['beforeBodies']==g['beforeBodies'] and f['observerState']==g['observerState'] and f['rngBefore']==g['rngBefore']
    if 'weak' in ident:assert native['informationHashes']==bypass['informationHashes']
    else:
        prior=next(r for r in official['panel'] if r['input']==native['input'])
        assert native['hashes']==prior['legacyStateRngHashes'][:20]
        assert native['informationHashes']==prior['completeStateHashes'][:20]
    accepted=next(r for r in accepted_tail['panel'] if r['input']==native['input'])
    original=next(r for r in reference['panel'] if r['input']==native['input'])
    assert accepted['hashes']==original['hashes'][:20]
    if 'weak' in ident:
        prefix=accepted_weak['panel'][0]['frames']
    else:
        prefix=[]
        saved=next(r for r in old['panel'] if r['input']==native['input'])
        assert saved['legacyStateRngHashes']==original['hashes'][:10]
        for f0 in saved['frames']:
            prefix.append({**f0,'requested':f0['requestedBehavior'],'final':f0['finalWorldIntents'],
                'behavior':[a['initialBehavior'] for a in original['actors']]})
    baseline_frames=prefix+accepted['frames'];assert len(baseline_frames)==20
    for arm,frames in [('accepted',baseline_frames),('awareness',native['frames']),('bypass',bypass['frames'])]:
        assert [f['t'] for f in frames]==[i/20 for i in range(20)]
        for f in frames:
            assert len(f['beforeBodies'])==len(f['afterBodies'])==22
            assert abs(f['after']-f['t']-.05)<1e-12
            for i in ol:
                a=actors[i];before,after=f['beforeBodies'][i],f['afterBodies'][i]
                raw,final=f['requested'][i],f['final'][i]
                memberships=[e for e in f['engagements'] if actor(e['blocker'])==i or i in [actor(h) for h in e['helpers']]]
                joints=[j for j in f['jointInputs'] if j['a']==i or j['b']==i]
                status='free' if not memberships else 'owner' if any(actor(e['blocker'])==i for e in memberships) else 'helper'
                slot=a['slot'];plan=f['behavior'][i]['plan']
                rows.append({'arm':arm,'case':ident,'entry':f['t'],'after':f['after'],'slot':slot,
                    'assignment':plan['kind'],'target':actor(plan.get('target')),'status':status,
                    'raw_vx':raw['vel']['x'],'raw_vy':raw['vel']['y'],'final_vx':final['vel']['x'],'final_vy':final['vel']['y'],
                    'entry_vx':before['vel']['x'],'entry_vy':before['vel']['y'],'post_vx':after['vel']['x'],'post_vy':after['vel']['y'],
                    'dx':after['pos']['x']-before['pos']['x'],'dy':after['pos']['y']-before['pos']['y'],
                    'facing_before':before['facing'],'facing_after':after['facing'],
                    'playside_progress':side*(after['pos']['y']-a['initialBody']['pos']['y']),
                    'nominal_technique': 'first-level zone/half-man fit' if plan['kind'] in {'reach','combo','cutoff'} else plan['kind'],
                    'target_limit':'Exact requests and consumed cues retained; local approach landmark/placement error is not directly instrumented.'})
                # Independent foot accounting only where contacts/joints cannot contribute.
                touches=any(c['i']==i or c['j']==i for c in f['report']['contacts'])
                outputs=any(j['a']==i or j['b']==i for j in f['jointOutputs'])
                if not joints and not outputs and not touches and not f['report']['strikes']:
                    impulse=f['report']['groundImpulse'][i];m=before['profile']['massKg']
                    residual=math.hypot(after['vel']['x']-before['vel']['x']-impulse['x']/m,
                                        after['vel']['y']-before['vel']['y']-impulse['y']/m)
                    free_residual=max(free_residual,residual);free_count+=1
    pair=[]
    for arm,row in [('awareness',native),('bypass',bypass)]:
        frames=combined(arm,row);last=frames[-1];i=2
        hand=[(f['t'],j) for f in frames for j in f['jointOutputs'] if j['kind']=='hands' and i in [j['a'],j['b']]]
        teammate=[{'t':f['t'],'i':c['i'],'j':c['j'],'impulse':c['impulse']} for f in frames for c in f['report']['contacts']
                  if c['impulse']>0 and actors[c['i']]['team']==actors[c['j']]['team']]
        pair.append({'arm':arm,'end':last['after'],'censored':True,'RTforwardFromSnap':last['afterBodies'][i]['pos']['x']-actors[i]['initialBody']['pos']['x'],
            'RTplaysideProgress':side*(last['afterBodies'][i]['pos']['y']-actors[i]['initialBody']['pos']['y']),
            'meanOLAbsLateral':sum(abs(last['afterBodies'][j]['pos']['y']-actors[j]['initialBody']['pos']['y']) for j in ol)/5,
            'firstRTNormalLoad':next((t for t,j in hand if abs(j.get('normalForce') or 0)>1e-8),None),
            'firstRTTangentLoad':next((t for t,j in hand if abs(j.get('tangentForce') or 0)>1e-8),None),'teammateImpacts':teammate})
    summaries.append({'case':ident,'comparison':pair,'firstBeatMatchedBodiesInformationRNG':True,
                      'weakFullOpeningIdentical':native['informationHashes']==bypass['informationHashes']})
    first.append({'input':native['input'],'initializedInformationSha256':native['initializedInformationSha256'],
        'frame':native['frames'][1],'actors':actors,
        'consumed':[c for c in native['cues'] if c['t']==.05],
        'writes':[w for w in native['writes'] if w['t']==.05],
        'methods':[m for m in native['methods'] if m['t']==.05],
        'restoreLimit':'Diagnostic World inputs and information evidence, not serialized PlaySim. Native comparisons must start from snap.'})

assert free_residual<1e-12
checks.update({'accepted_60_prefix_hashes':True,'awareness_40_legacy_and_owned_prefix_hashes':True,
 'tail_prefix_identity':True,'matched_first_action_all22_bodies_information_RNG':True,'weak_full_opening_exact':True,
 'all300_OL_rows_per_arm_exact_tick_alignment':True,'unloaded_linear_feet_accounting':{'intervals':free_count,'maxResidual':free_residual}})
with (out/'timeline.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
(out/'comparison.json').write_text(json.dumps({'checks':checks,'cases':summaries},indent=2)+'\n')
(out/'first-breakdown.json.gz').write_bytes(gzip.compress(json.dumps({'protocol':'wide-zone-opening-first-breakdown-v1',
    'runtime':data['awareness']['sourceSha256'],'flags':data['awareness']['flags'],'worldDefaults':data['awareness']['worldDefaults'],
    'initialization':data['awareness']['initialization'],'cases':first},separators=(',',':')).encode(),mtime=0))
(out/'forecast-probe.json').write_text(json.dumps(probe,indent=2)+'\n')

plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False})
fig,axes=plt.subplots(3,2,figsize=(13,11));colors=['#2463a0','#c45429','#168172','#8064a2','#c39624']
for n,native in enumerate(data['awareness']['panel']):
    ident=native['input']['id'];side=-1 if 'weak' not in ident else 1
    ax=axes[n,0]
    for i,color in zip([1,2,3,4,5],colors):
        a=native['actors'][i];ys=[side*(f['afterBodies'][i]['pos']['y']-a['initialBody']['pos']['y']) for f in native['frames']]
        ax.plot([0]+[f['after'] for f in native['frames']],[0]+ys,label=a['slot'],color=color,lw=2)
    for i in [7,10]:
        a=native['actors'][i];ax.plot([0]+[f['after'] for f in native['frames']],
            [0]+[side*(f['afterBodies'][i]['pos']['y']-a['initialBody']['pos']['y']) for f in native['frames']],
            color='#666',ls='--' if i==7 else ':',label=a['slot'])
    ax.set(title=ident+' · native unit opening',xlabel='Executed boundary, seconds',ylabel='Signed playside progress, yd');ax.grid(alpha=.2)
    if n==0:ax.legend(ncol=7,fontsize=8,loc='upper left')
    ax=axes[n,1]
    for arm,row,style in [('awareness',native,'-'),('bypass',data['bypass']['panel'][n],'--')]:
        frames=combined(arm,row);ts=[0]+[f['after'] for f in frames]
        ys=[0]+[side*(f['afterBodies'][2]['pos']['y']-row['actors'][2]['initialBody']['pos']['y']) for f in frames]
        xs=[0]+[f['afterBodies'][2]['pos']['x']-row['actors'][2]['initialBody']['pos']['x'] for f in frames]
        ax.plot(ts,ys,color='#2463a0',ls=style,label=arm+' sideways',lw=2)
        ax.plot(ts,xs,color='#c45429',ls=style,label=arm+' upfield',lw=2)
    ax.axvspan(.05,.25,color='#999',alpha=.12);ax.set(title='RT: four-tick diagnostic bypass vs native',xlabel='Executed boundary, seconds',ylabel='Movement from snap, yd');ax.grid(alpha=.2)
    if n==0:ax.legend(fontsize=8)
fig.suptitle('Opening trace: nominal joining and more movement do not prove useful protection',fontsize=15,y=.985)
fig.text(.06,.947,'Awareness PR #36, source60120551 · all22 native players · dashed alternative bypasses only RT spacing at0.05–0.20s',fontsize=10)
fig.text(.06,.018,'Weak LG legitimately climbs away from playside. Strong comparisons censored2s; weak1s. No bypass or production change proposed.',fontsize=9)
fig.subplots_adjust(left=.075,right=.97,top=.90,bottom=.07,hspace=.36,wspace=.22)
fig.savefig(out/'opening-comparison.png',dpi=150);fig.savefig(out/'opening-comparison.svg');plt.close(fig)

inputs=[]
for directory in [root,Path('/workspace/football-wide-zone-opening-baseline/out/wide-zone-opening')]:
    for p in sorted(directory.glob('*')):
        if p.is_file():inputs.append({'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())})
receipt={'protocol':'wide-zone-opening-report-v1','testedAccepted':data['awareness']['acceptedDevelop'],
 'testedAwareness':data['awareness']['awarenessHead'],'runtimeSource':data['awareness']['sourceSha256'],
 'flags':data['awareness']['flags'],'worldDefaults':data['awareness']['worldDefaults'],
 'collectorRuns':[{'arm':d['arm'],'revision':d['revision'],'collectorSha256':d['collectorSha256'],
   'seconds':d['elapsedSeconds'],'newWorldSteps':d['newWorldSteps'],'prefixExecutions':len(d['panel'])}
  for d in [*data.values(),accepted_tail,accepted_weak]],
 'checks':checks,'inputs':inputs,'rawNativePackets':'Local ignored; portable first-breakdown witness, manifests and from-snap collector published.',
 'nativeWorldSteps':sum(d['newWorldSteps'] for d in [*data.values(),accepted_tail,accepted_weak]),
 'nativeCollectorSeconds':sum(d['elapsedSeconds'] for d in [*data.values(),accepted_tail,accepted_weak]),
 'previewWorldSteps':probe['totalTaskWorldStepsIncludingSupersededTEIdentityPass'],
 'previewCPUSeconds':probe['totalTaskPreviewCpuSeconds'],'newFullGames':0,'newCompleteEndings':0,
 'freshTransfer':'Predeclared Under-front case unrun: no supported production correction passed the mechanism contract.',
 'productionFilesChanged':False,'sourceDefaultsCapacitiesContactUnchanged':True,
 'knownFailures':['Superseded preview used wrong H attached-TE identity; corrected output retained and all scratch cost counted.',
 'Accepted launcher initially refused historical profile/runtime mismatch before simulation; rerun in explicit candidate mode with exact accepted e5 source/flags.',
 'Diagnostic bypass rejected; H lateral progress worsens, new nominal helper contact carries zero load through2s.'],
 'reportSeconds':time.perf_counter()-start,'reportSha256':sha(Path(__file__).read_bytes())}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'checks':checks,'nativeSeconds':receipt['nativeCollectorSeconds'],'nativeWorldSteps':receipt['nativeWorldSteps'],
                  'reportSeconds':receipt['reportSeconds'],'cases':summaries}))
