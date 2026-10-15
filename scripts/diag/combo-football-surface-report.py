"""One acquired Duo release correction: saved evidence only, zero new steps."""
import gzip,hashlib,json,math,os
from pathlib import Path
os.environ.setdefault('MPLCONFIGDIR','/tmp/run-combo-matplotlib')
os.environ.setdefault('XDG_CACHE_HOME','/tmp/run-combo-cache')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path('data/reviews/current/combo-football-surface')
def read(p):
    with gzip.open(p) as f:return json.load(f)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def frame(r,t):return next(f for f in r['frames'] if f['t']==t)
def speed(b):return math.hypot(*b['vel'].values())
def events(r,kind):return [e for e in r['events'] if e['type']==kind]
packets={name:read(root/(name+'.json.gz')) for name in ['current','candidate-a030','candidate-controls','current-a018','under-baseline','under-candidate']}
base={r['id']:r for name in ['current','current-a018','under-baseline'] for r in packets[name]['rows']}
candidate={r['id']:r for name in ['candidate-a030','candidate-controls','under-candidate'] for r in packets[name]['rows']}
receipts={p.stem:json.loads(p.read_text()) for p in (root/'receipts').glob('*.json')}
assert set(base)==set(candidate)=={'A030','A018','A027','DuoUnder'}
assert receipts['old-controls-red']['exitCode']==1
assert all(r['exitCode']==0 and r['inputsUnchanged'] for k,r in receipts.items() if k!='old-controls-red')
assert all(r['flags']==receipts['focused']['flags'] and r['worldDefaults']==receipts['focused']['worldDefaults'] for r in receipts.values())
assert receipts['focused']['sourceSha256']==receipts['typecheck']['sourceSha256']=='dcebbee42fbe4cd64f603740d9b20bdf521ae424ad94e084eb46b30478b297e3'
rows=[]
for id in ['A030','A018','A027','DuoUnder']:
    b,c=base[id],candidate[id]
    assert b['inputSha256']==c['inputSha256'] and b['initial']==c['initial']
    assert b['source']=='78183dc79c6285939b80875b131584c18c4f0eda020c17bcfde6191823ace965'
    assert c['source']==receipts['focused']['sourceSha256']
    first=next(((x,y) for x,y in zip(b['frames'],c['frames']) if x!=y),None)
    row={'id':id,'inputSha256':b['inputSha256'],'exactAllFrames':b['frames']==c['frames'],'exactResult':b['result']==c['result'],
        'firstDifference':None if first is None else {'t':first[0]['t'],'sameEntering22Bodies':first[0]['before']==first[1]['before'],
            'changedRawActors':[i for i in range(22) if first[0]['raw'][i]!=first[1]['raw'][i]],'postStepRngEqual':first[0]['rng']==first[1]['rng']}}
    for label,r in [('accepted',b),('candidate',c)]:
        los=next(f for f in r['frames'] if f['before'][6]['pos']['x']>=35)
        contacts=events(r,'carrier_contact')
        offensive=[{'t':f['t'],**ct} for f in r['frames'] for ct in f['report']['contacts'] if ct['i']<11 and ct['j']<11]
        row[label]={'yards':r['yards'],'nativeEnd':r['endTime'],'phase':r['phase'],'losArrival':los['t'],
            'losBody':los['before'][6],'losSpeed':speed(los['before'][6]),'climbs':events(r,'block_climb'),
            'firstCarrierContact':contacts[0] if contacts else None,'firstWrap':events(r,'tackle_wrap')[0],
            'RG_LB_BlockEvents':[e for e in events(r,'block_contact') if e.get('a')==5 and e.get('b')==15],
            'offensiveImpacts':offensive}
    if id in ['A027','DuoUnder']:assert row['exactAllFrames'] and row['exactResult']
    if id=='A030':
        assert row['firstDifference']['t']==.85 and row['firstDifference']['sameEntering22Bodies']
        assert row['candidate']['RG_LB_BlockEvents'][0]['t']==2.6
        assert row['candidate']['losArrival']==2.65 and row['candidate']['losSpeed']>row['accepted']['losSpeed']
        for t in [1.05,2.6,2.65,2.75]:
            assert next(e for e in frame(c,t)['beforeReps'] if e['d']==13)['b']==2
        assert not row['candidate']['offensiveImpacts']
    if id=='A018':
        assert not row['candidate']['RG_LB_BlockEvents']
        assert row['candidate']['firstWrap']['a']==15
        assert not row['candidate']['offensiveImpacts']
    rows.append(row)
# Only existing consumed cue channels authorize the changed first proposal.
r=candidate['A030']; cuereads=[x for x in r['reads'] if x['t']==.85 and x['context']=='joined-security' and x['a'] in [2,3]]
rt={x['b']:x['picture'] for x in cuereads if x['a']==2}
assert rt[15]['pos']['y']>rt[13]['pos']['y'] and rt[5]['pos']['y']>rt[13]['pos']['y']
assert frame(r,.85)['before'][2]['pos']['y']<rt[13]['pos']['y']
summary={'schema':'duo-surface-release-v1','recommendation':'Recommend the narrow Duo-only correction for independent review/integration; no full run-game realism or league yardage claim.',
    'accepted':'7eb2554f5dbb497cff169f386704a5b0f4cf43fe','codeAndTests':'aebb0abb3a9e96ec6561274b9fdd4e8e76ce7173',
    'testedCodeAndTests':'8d4b868b6125270a407a2b9b1b6238508616c365',
    'sourceSha256':receipts['focused']['sourceSha256'],'reportSha256':sha(Path(__file__)),
    'flags':receipts['focused']['flags'],'worldDefaults':receipts['focused']['worldDefaults'],'node':receipts['focused']['node'],
    'rows':rows,'firstAdmissionCues':cuereads,
    'validation':{'focusedTests':66,'newTests':7,'oldSourceExpectedRed':'3 failed,4 passed; mirrored other-half cases and hidden-state hold fail on old source. Near-half/crossing controls pass.','typecheck':'pass',
        'codeExtraction':'Clean branch has blocking.ts + combo-transfer.test.ts only; byte-equal protected source/tests/settings to tested8d4b868.'},
    'cost':{'newNativeExecutions':8,'fullGames':0,'newRosters':0,'fullSuiteRuns':0,
        'nativeLauncherSeconds':sum(cmd['elapsedSeconds'] for k,v in receipts.items() if k in ['current','candidate-a030','candidate-controls','current-a018','under-baseline','under-candidate'] for cmd in v['commands']),
        'allLauncherSeconds':sum(cmd['elapsedSeconds'] for v in receipts.values() for cmd in v['commands']),
        'qualification':'Includes expected old-source red and initial five focused checks. Offline analyses/plotting additional. New current baseline needed because accepted #82 changes saved sequences; original source90 evidence retained separately.'},
    'limits':['Duo-only correction; no new wide-zone behavior claim. Two changed Wide9 Duo roster contrasts, one fresh Under opposing transfer and existing WZ control.',
        'Same admission rule also delays A030 C departure; final result is a unit interaction, not isolated RT attribution.',
        'Retaining contacts changes execution draws from the first changed World tick; exact gains are not isolated controller value or NFL estimates.',
        'A018 RG never loads LB_M; legitimate downfield LB finish remains. Some combinations can stay longer; exhaustive front/fit transfer unproved.',
        'Shared contact law unchanged; heavily rotated loaded A018 contacts remain a physics limitation/review dependency, not a grip/force adjustment.']}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
witness={'qualification':'Native setup/prefix reproducer, not complete-state hydration; all22 must react. No frozen runner future.',
    'input':next(x for x in json.loads(Path('data/reviews/current/second-level-access/inputs.json').read_text())['rows'] if x['id']=='A030'),
    'consumedCues':cuereads,'acceptedFirst':frame(base['A030'],.85),'candidateFirst':frame(candidate['A030'],.85),
    'candidateTakeover':frame(candidate['A030'],1.05),'candidateLoadedArrival':[frame(candidate['A030'],t) for t in [2.6,2.65,2.75]]}
(root/'A030-protection-witness.json.gz').write_bytes(gzip.compress(json.dumps(witness,separators=(',',':')).encode(),mtime=0))
colors={2:'#0072B2',5:'#E69F00',13:'#D55E00',15:'#AA4499',6:'#009E73'}
labels={2:'RT',5:'RG',13:'DT_S',15:'LB_M',6:'RB'}
fig,axes=plt.subplots(1,2,figsize=(12,5.5),sharex=True,sharey=True)
for ax,title,case in zip(axes,['Accepted: outside tackle leaves','Candidate: tackle keeps, guard climbs'],[base['A030'],candidate['A030']]):
    frames=[f for f in case['frames'] if .85<=f['t']<=3]
    for x in range(29,40):ax.axvline(x,color='#e6e9eb',lw=.6,zorder=0)
    ax.axvline(35,color='#999999',ls='--',lw=1,zorder=0)
    for i in [13,15,2,5,6]:
        xx=[f['before'][i]['pos']['x'] for f in frames]; yy=[f['before'][i]['pos']['y'] for f in frames]
        ax.plot(xx,yy,color=colors[i],lw=2,label=labels[i]);ax.scatter(xx[0],yy[0],s=25,facecolors='white',edgecolors=colors[i]);ax.scatter(xx[-1],yy[-1],s=22,color=colors[i])
        a,b=frame(case,2.2)['before'][i]['pos'],frame(case,2.35)['before'][i]['pos']
        ax.annotate('',xy=(b['x'],b['y']),xytext=(a['x'],a['y']),arrowprops={'arrowstyle':'->','color':colors[i],'lw':1.3})
    los=next(f for f in case['frames'] if f['before'][6]['pos']['x']>=35);rb=los['before'][6]
    ax.scatter(rb['pos']['x'],rb['pos']['y'],marker='D',s=40,color=colors[6])
    ax.text(.02,.03,f"RB at LOS: {los['t']:.2f}s, {speed(rb):.2f} yd/s",transform=ax.transAxes,fontsize=10,bbox={'facecolor':'white','edgecolor':'none','alpha':.9})
    ax.set_title(title,fontsize=11);ax.set_xlim(28.7,39.6);ax.set_ylim(21.5,27.2);ax.set_aspect('equal');ax.set_xlabel('Downfield x (yards); dashed = LOS');ax.spines[['top','right']].set_visible(False)
axes[0].set_ylabel('Across field y (yards)')
g=frame(candidate['A030'],2.6)['before'][5]['pos'];axes[1].scatter(g['x'],g['y'],marker='*',s=140,color=colors[5],edgecolors='white',zorder=7)
axes[1].annotate('Loaded RG–LB block\nRT keeps DT inside',xy=(g['x'],g['y']),xytext=(31.0,26.3),fontsize=10,arrowprops={'arrowstyle':'->','color':'#775000'})
handles,legend=axes[0].get_legend_handles_labels();fig.legend(handles,legend,ncol=5,loc='lower center',bbox_to_anchor=(.5,.065),frameon=False)
fig.suptitle('Duo: develop the surface, then climb the acquired backer’s half',fontsize=14,y=.97)
fig.text(.5,.02,'Actual 0.85–3.00s paths. Same starting state, capabilities and contact law. All22 react; selected actors shown. Final gains are not calibrated expectations.',ha='center',fontsize=8.5)
fig.tight_layout(rect=[0,.11,1,.91]);fig.savefig(root/'protection-paths.png',dpi=170,facecolor='white');plt.close(fig)
(root/'artifacts.json').write_text(json.dumps({str(p):{'sha256':sha(p),'bytes':p.stat().st_size} for p in sorted(root.rglob('*')) if p.is_file() and p.name!='artifacts.json'},indent=2)+'\n')
print(json.dumps({'recommendation':summary['recommendation'],'cases':[{k:r[k] for k in ['id','exactAllFrames','exactResult']} for r in rows],'cost':summary['cost']},indent=2))
