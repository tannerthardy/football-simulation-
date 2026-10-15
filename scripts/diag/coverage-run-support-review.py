"""Saved-only paired support review. BASE CAND BASE CAND OUTPUT; no engine."""
import gzip, hashlib, json, math, sys
from pathlib import Path

def read(p): return json.loads(gzip.decompress(Path(p).read_bytes()))
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def view(body):
    return {**{k:body[k] for k in ['pos','vel','facing','energy']},
            'supportState':(body.get('support') or {}).get('state')}
def ident(p,i): return {k:p['players'][i][k] for k in ['idx','id','slot','team']}
def rb_cue(p,row,request):
    return next((c['picture'] for c in reversed(row['cues'][request['cueStart']:request['cueEnd']])
                 if p['players'][c['target']]['slot']=='RB'),None)
def entry(p,row,q):
    idx=q['actor'];rb=next(x['idx'] for x in p['players'] if x['slot']=='RB')
    d=row['world']['after'][idx];r=row['world']['after'][rb]
    return {'defender':ident(p,idx),'before':{**q['before'],'body':view(q['before']['body'])},'afterJob':q['after']['job'],
            'requested':q['request'],'acquiredRB':rb_cue(p,row,q),
            'achievedAfter':view(d),'runnerAfter':view(r),
            'gapAfterYd':math.hypot(d['pos']['x']-r['pos']['x'],d['pos']['y']-r['pos']['y']),
            'downfieldLeadAfterYd':d['pos']['x']-r['pos']['x']}

def selected(play,t,slot):
    if play==45:
        return (slot=='LB_W' and t in [1.65,1.7,2.5,2.95]
                or slot=='LB_M' and t in [1.35,1.55,1.65])
    return (slot=='FS' and t in [1.6,2,3.45]
            or slot=='LB_W' and t in [1.7,3.45]
            or slot=='SS' and t==3.45)

args=sys.argv[1:];out=Path(args[-1]);assert len(args)==5 and not out.exists()
packet={'schema':'coverage-run-support-review-v1','operatorSha256':sha(__file__),'nativeExecutions':0,'pairs':[],
 'limits':['Native openings are reenactments of fixed post-constructor bodies/RNG, not exact original games.',
           'Both windows are unfinished; no completed tackle, run gain or YAC improvement is inferred.',
           'Achieved runner/defender bodies are audit facts, never controller future inputs.',
           'The earlier LB_M fall precedes the failed reassignment; the repair does not prevent that fall.']}
for base_path,cand_path in [(args[0],args[1]),(args[2],args[3])]:
    b,c=read(base_path),read(cand_path)
    # The candidate adds a diagnostic-only field to CoverageDefender, which
    # changes the serialized private-behavior hash. Compare shared observable
    # installation and physical state directly; retain both private hashes.
    assert b['players']==c['players']
    assert b['rows'][0]['world']['before']==c['rows'][0]['world']['before']
    assert b['rows'][0]['requests']==c['rows'][0]['requests']
    assert len(b['rows'])==len(c['rows'])
    for k in ['inputSha256','worldSha256','flags','worldDefaults','node','lockSha256']:
        assert b['provenance'][k]==c['provenance'][k],k
    assert b['observerNeutral'] and c['observerNeutral']
    assert b['provenance']['sourceSha256']=='7ea3e00e2504271133a4384fbdbf1931e8ac8bf352861ee9e812f1372a0bf42b'
    assert c['provenance']['sourceSha256']=='257c603e417ec491b04ae911688c319bb9b60aa9ab9845f77147f562482b0f3d'
    row={'play':b['play'],'call':b['call'],'coverage':b['coverage'],
         'baseline':{'path':base_path,'sha256':sha(base_path),'provenance':b['provenance'],'signature':b['signature']},
         'candidate':{'path':cand_path,'sha256':sha(cand_path),'provenance':c['provenance'],'signature':c['signature']},
         'initialIncomingBodiesProfilesAndRequestsExact':True,
         'initialPrivateStateSha256':{'baseline':b['initialSha256'],'candidate':c['initialSha256']},
         'privateInitialStateEqualityClaimed':False,
         'firstRequestFork':None,'samples':[],'end':[]}
    for br,cr in zip(b['rows'],c['rows']):
        assert br['t']==cr['t'] and br['world'] is not None and cr['world'] is not None
        bm={q['actor']:q for q in br['requests']};cm={q['actor']:q for q in cr['requests']}
        assert bm.keys()==cm.keys()
        changed=[idx for idx in bm if bm[idx]['request']!=cm[idx]['request']]
        if row['firstRequestFork'] is None:
            assert br['world']['before']==cr['world']['before']
            if changed:
                row['firstRequestFork']={'t':br['t'],'allIncomingBodiesExact':True,
                    'actors':[{'baseline':entry(b,br,bm[i]),'candidate':entry(c,cr,cm[i])} for i in changed]}
        for i in bm:
            if selected(b['play'],br['t'],b['players'][i]['slot']):
                row['samples'].append({'t':br['t'],'sameIncomingOwnBody':br['world']['before'][i]==cr['world']['before'][i],
                    'baseline':entry(b,br,bm[i]),'candidate':entry(c,cr,cm[i])})
    for arm,p in [('baseline',b),('candidate',c)]:
        row['end'].append({'arm':arm,'end':p['end'],'censored':p['censored'],'outcome':p['outcome'],
            'events':[e for e in p['events'] if e['type'] in ['handoff','fall','carrier_contact','tackle_wrap','tackle','broken_tackle','missed_tackle']],
            'allBodiesAfter':[{**ident(p,i),**view(body)} for i,body in enumerate(p['rows'][-1]['world']['after'])]})
    packet['pairs'].append(row)
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(packet,separators=(',',':'),allow_nan=False)+'\n')
print(json.dumps({'out':str(out),'sha256':sha(out),'bytes':out.stat().st_size,'nativeExecutions':0}))
