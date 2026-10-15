"""Adjudicate the frozen continuous-route diagnostic; zero new World steps."""
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
os.environ.setdefault('MPLCONFIGDIR','/tmp/run-reachability-matplotlib')
os.environ.setdefault('XDG_CACHE_HOME','/tmp/run-reachability-cache')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root=Path('data/reviews/current/second-level-reachability')
prior=Path('data/reviews/current/second-level-access')
def read(path):
    with gzip.open(path) as f:return json.load(f)
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def frame(r,t):return next(f for f in r['frames'] if f['t']==t)
def speed(b):return math.hypot(b['vel']['x'],b['vel']['y'])
def dist(a,b):return math.hypot(a['x']-b['x'],a['y']-b['y'])
def events(r,kind):return [e for e in r['events'] if e['type']==kind]
def selected_rep(f,defender,blocker=None):
    return next((e for e in f['beforeReps'] if e['d']==defender and (blocker is None or e['b']==blocker)),None)
base_packet=read(prior/'current.json.gz')
base=next(r for r in base_packet['rows'] if r['id']=='A030')
plan=json.loads((root/'search-plan.json').read_text())
packets={name:read(root/(name+'.json.gz')) for name in ['dl-upfield','keeper-backfield','keeper-acquired','opening']}
rows={name:p['rows'][0] for name,p in packets.items()}
interventions={name:read(root/(name+'-intervention.json.gz')) for name in ['dl-upfield','keeper-backfield','keeper-acquired']}
receipts={name:json.loads((root/'receipts'/(name+'.json')).read_text()) for name in packets}
assert len(plan['routes'])==2
for name,p in packets.items():
    r=p['rows'][0]; receipt=receipts[name]
    assert r['inputSha256']==plan['inputSha256']
    assert r['source']==plan['runtimeSource']==receipt['sourceSha256']
    assert receipt['flags']==base_packet['receipt']['flags']
    assert receipt['worldDefaults']==base_packet['receipt']['worldDefaults']
    assert receipt['node']=='v22.23.3' and receipt['exitCode']==0 and receipt['inputsUnchanged']
    assert r['initial']==base['initial'] and len(r['initial'])==22
    assert [f for f in r['frames'] if f['t']<.85]==[f for f in base['frames'] if f['t']<.85]
    assert frame(r,.85)['before']==frame(base,.85)['before']
    assert events(r,'block_climb')[:2]==events(base,'block_climb')[:2]
    if name!='opening':
        assert p['receipt']['intervention']['diagnosticOnly']
        assert interventions[name]['planSha256']==sha(root/'search-plan.json')
        first=frame(r,.85)
        assert [i for i in range(22) if first['raw'][i]!=frame(base,.85)['raw'][i]]==[2]
    else:
        assert r['frames']==[f for f in base['frames'] if f['t']<.9]
        assert r['phase']=='live' and r['endTime']==.9

summary_rows=[]
for name,r in [('accepted',base)]+[(n,rows[n]) for n in interventions]:
    los=next((f for f in r['frames'] if f['before'][6]['pos']['x']>=35),None)
    joined=next((f['t'] for f in r['frames'] if selected_rep(f,15,2)),None)
    loads=[{'t':f['t'],'hands':e['hands'],'control':e['control']} for f in r['frames']
           if (e:=selected_rep(f,15,2)) and e['hands'] and math.hypot(e['hands'].get('normal',0),e['hands'].get('tangent',0))>1e-6]
    contacts=events(r,'carrier_contact');wraps=events(r,'tackle_wrap')
    impacts=[{'t':f['t'],**c} for f in r['frames'] for c in f['report']['contacts'] if c['i']<11 and c['j']<11]
    common=frame(r,2.75)
    summary_rows.append({'id':name,'nativeEnd':r['endTime'],'yards':r['yards'],'RT_LB_repFirst':joined,
        'RT_LB_firstRecordedLoad':loads[0] if loads else None,
        'nativeBlockEvents':[e for e in events(r,'block_contact') if e.get('a')==2 and e.get('b')==15],
        'firstCarrierContact':contacts[0] if contacts else None,'firstWrap':wraps[0] if wraps else None,
        'LB_M_carrierContacts':[e for e in contacts if e.get('b')==15],
        'LB_M_wraps':[e for e in wraps if e.get('a')==15],
        'RB_firstLOSTime':los['t'],'RB_firstLOSSpeed':speed(los['before'][6]),'RB_firstLOSPosition':los['before'][6]['pos'],
        'common275':{'RT':common['before'][2],'LB':common['before'][15],'RB':common['before'][6],
            'RB_raw':common['raw'][6],'RB_preSpacing':common['preSpacing'][6],'RB_final':common['final'][6]},
        'offensiveImpacts':impacts,'RT_LB_loadsThrough320':[x for x in loads if x['t']<=3.2]})
assert summary_rows[1]['RT_LB_firstRecordedLoad'] is None
for r in summary_rows[2:]:
    assert r['RT_LB_firstRecordedLoad'] and not r['LB_M_carrierContacts'] and not r['LB_M_wraps']
    assert r['firstCarrierContact']['b']==13 and not r['offensiveImpacts']
assert summary_rows[3]['RT_LB_firstRecordedLoad']['t']==2.75
assert summary_rows[3]['RT_LB_firstRecordedLoad']['hands']['normal']==0
assert summary_rows[3]['RB_firstLOSSpeed']<summary_rows[0]['RB_firstLOSSpeed']

opening=read(root/'opening-eligibility.json.gz')['snapshots']
physical=[{'t':s['t'],**next(m for m in s['members'] if m['climber']==5)} for s in opening if s['context']=='before-joined-read']
first_valid=next(r for r in physical if not r['reasons'])
assert first_valid['t']==.7
read055=next(s for s in opening if s['context']=='before-RG-update' and s['t']==.55)
read080=next(s for s in opening if s['context']=='before-RG-update' and s['t']==.8)
assert next(m for m in read055['members'] if m['climber']==5)['reasons']
assert read080['readStates'][0]['secureSince']==.8 and read080['readStates'][1]['secureSince']==.6
assert read080['readStates'][0]['nextRead']>1.03
initial_geometry={t:{base['initial'][i]['slot']:frame(base,t)['before'][i] for i in [2,5,13,15,6]} for t in [.0,.55,.7,.85]}
summary={'schema':'second-level-continuous-reachability-result-v1','planSha256':sha(root/'search-plan.json'),
    'reportSourceSha256':sha(Path(__file__)),'matplotlib':matplotlib.__version__,
    'accepted':plan['reference'],'source':plan['runtimeSource'],'inputSha256':plan['inputSha256'],
    'decision':'Real LB contact/load is reachable via the keeper-backfield route using acquired pictures. No clean production protection improvement is established: rerouting/braking the runner materially contributes; DT wins. Stop route trials; inspect opening RT takeover readiness and member opportunity.',
    'rows':summary_rows,'upstream':{'RT_can_keep_for_RG_firstPhysicalSnapshot':first_valid,
        'RG_native055':read055,'RG_native080':read080,'openingGeometry':initial_geometry,
        'question':'Can the opening establish useful RT keeper contact for the inside guard earlier, with legitimate acquired security and without sacrificing the DT surface? Current earliest-ready outside helper leaves before RG completes its own security observation. No new delay/release timer is proposed.'},
    'settings':{'node':receipts['opening']['node'],'flags':receipts['opening']['flags'],'worldDefaults':receipts['opening']['worldDefaults']},
    'cost':{'completeNewContinuations':3,'readOnlyOpeningPrefixes':1,'fullGames':0,'newRosters':0,'fullSuiteRuns':0,
        'launcherSeconds':sum(c['elapsedSeconds'] for r in receipts.values() for c in r['commands']),
        'reuse':'Accepted A030 and all earlier control packets; no unchanged baseline or A027 rerun. Offline report/plot time additional.'},
    'limitations':['Two fixed winding routes, not exhaustive reachability or an impossibility proof.',
        'Acquired pictures suffice to follow the retrospectively selected route; route selection/commitment was not established as a defensible production decision.',
        'Blocker contact/load is distinct from runner protection. Actual runner route and speed materially change; final gain is not an adoption metric.',
        'Raw/pre-spacing/final requests establish native spacing-stage changes, not that any particular avoidance cue is wrong. Carrier/spacing ownership stays with Do-It-All.',
        'Existing contact law retained, including zero-compression lateral load; no realism certification or physical repair.']}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
# Portable packet: native initialization, actual first load/arrival and upstream eligibility.
witness={'qualification':'Diagnostic frames, not full-state hydration. Native prefix from frozen input preserves observation history; all22 must react normally.',
    'input':next(r for r in json.loads((prior/'inputs.json').read_text())['rows'] if r['id']=='A030'),
    'firstRelease':frame(base,.85),'acquiredFrames':[frame(rows['keeper-acquired'],t) for t in [2.35,2.7,2.75,3.0]],
    'interventionDescription':packets['keeper-acquired']['receipt'],'nativeGuardReads':[read055,read080]}
(root/'A030-access-and-traffic-witness.json.gz').write_bytes(gzip.compress(json.dumps(witness,separators=(',',':')).encode(),mtime=0))

colors={2:'#0072B2',5:'#666666',13:'#D55E00',15:'#AA4499',6:'#009E73'}
labels={2:'RT',5:'RG keeper',13:'DT_S',15:'LB_M',6:'RB'}
fig,axes=plt.subplots(1,2,figsize=(12,5.6),sharex=True,sharey=True)
for ax,(title,r) in zip(axes,[('Accepted A030 Duo',base),('Diagnostic backfield route — acquired cues',rows['keeper-acquired'])]):
    frames=[f for f in r['frames'] if .85<=f['t']<=3.0]
    for x in range(29,40):ax.axvline(x,color='#e7e9eb',lw=.65,zorder=0)
    ax.axvline(35,color='#999999',ls='--',lw=1.0,zorder=0)
    for i in [5,13,15,2,6]:
        xx=[f['before'][i]['pos']['x'] for f in frames];yy=[f['before'][i]['pos']['y'] for f in frames]
        ax.plot(xx,yy,color=colors[i],lw=2.2 if i in [2,6] else 1.5,label=labels[i])
        ax.scatter(xx[0],yy[0],s=30,facecolors='white',edgecolors=colors[i],zorder=5)
        ax.scatter(xx[-1],yy[-1],s=25,color=colors[i],zorder=5)
        a,b=frame(r,2.2)['before'][i]['pos'],frame(r,2.35)['before'][i]['pos']
        ax.annotate('',xy=(b['x'],b['y']),xytext=(a['x'],a['y']),arrowprops={'arrowstyle':'->','color':colors[i],'lw':1.5})
    los=next(f for f in r['frames'] if f['before'][6]['pos']['x']>=35)
    rb=los['before'][6]
    ax.scatter(rb['pos']['x'],rb['pos']['y'],marker='D',color=colors[6],s=48,zorder=6)
    ax.text(.02,.03,f"RB at LOS: {los['t']:.2f}s, {speed(rb):.2f} yd/s",transform=ax.transAxes,fontsize=10,bbox={'facecolor':'white','edgecolor':'none','alpha':.9})
    ax.set_title(title,fontsize=11,pad=10);ax.set_xlim(28.7,39.6);ax.set_ylim(22.6,27.1);ax.set_aspect('equal')
    ax.set_xlabel('Downfield x (yards); dashed line = LOS')
    ax.spines[['top','right']].set_visible(False)
rt=frame(rows['keeper-acquired'],2.75)['before'][2]['pos']
axes[1].scatter(rt['x'],rt['y'],marker='*',color=colors[2],edgecolors='white',s=150,zorder=7)
axes[1].annotate('RT–LB load by 2.75s',xy=(rt['x'],rt['y']),xytext=(32.0,26.5),fontsize=10,
    arrowprops={'arrowstyle':'->','color':colors[2]},color=colors[2])
axes[0].set_ylabel('Across field y (yards)')
handles,labels_ = axes[0].get_legend_handles_labels();fig.legend(handles,labels_,ncol=5,loc='lower center',bbox_to_anchor=(.5,.065),frameon=False)
fig.suptitle('Physical access exists; traffic cost remains',fontsize=15,y=.96)
fig.text(.5,.02,'Actual paths 0.85–3.00s. Hollow markers: identical release. All 22 players react; only selected actors shown. Diagnostic, not a proposed controller.',ha='center',fontsize=9)
fig.tight_layout(rect=[0,.11,1,.91]);fig.savefig(root/'paths.png',dpi=170,facecolor='white');plt.close(fig)
paths=sorted(p for p in root.rglob('*') if p.is_file() and p.name!='artifacts.json')
(root/'artifacts.json').write_text(json.dumps({str(p):{'sha256':sha(p),'bytes':p.stat().st_size} for p in paths},indent=2)+'\n')
print(json.dumps({'decision':summary['decision'],'cost':summary['cost'],'firstRTPhysicalKeeperEligibility':first_valid['t'],'chart':str(root/'paths.png')},indent=2))
