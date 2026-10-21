"""Read-only saved-native policy/physics receipts; does not simulate."""
import gzip, hashlib, json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FILES = ROOT / 'counterfactual'

def load(path):
    with gzip.open(path, 'rt') as f:
        return json.load(f)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def maxdiff(before, after):
    return max((math.dist(a['body']['pos'].values(), b['body']['pos'].values())
                for a, b in zip(before['agents'], after['agents'])), default=0)

def accounting(row):
    max_work = max_momentum = max_arm = max_arm_work = max_motor = 0
    max_ground_absolute_ratio = 0
    min_motor_work = 0
    report_count = 0
    for s in row['samples']:
        r = s['report']; report_count += 1
        max_work = max(max_work, abs(r['work']['residual']))
        delta = {'x':0, 'y':0}
        for i, (a,b) in enumerate(zip(s['before']['agents'], s['after']['agents'])):
            mass = a['body']['profile']['massKg']
            for axis in ['x','y']:
                delta[axis] += mass * (b['body']['vel'][axis] - a['body']['vel'][axis]) - r['groundImpulse'][i][axis]
            max_ground_absolute_ratio = max(max_ground_absolute_ratio,
                math.hypot(*r['groundImpulse'][i].values()) / (1.1 * mass * (9.80665 / .9144) * s['dt']))
        max_momentum = max(max_momentum, math.hypot(*delta.values()))
        for used, bound in [('armImpulse','armImpulseLimit'), ('armWork','armWorkLimit'), ('supportMotorWork','supportMotorWorkLimit')]:
            excess = max((a-b for a,b in zip(r[used],r[bound])), default=0)
            if used == 'armImpulse': max_arm = max(max_arm,excess)
            elif used == 'armWork': max_arm_work=max(max_arm_work,excess)
            else: max_motor=max(max_motor,excess)
        min_motor_work=min(min_motor_work,min(r['supportMotorWork'],default=0))
    return {'reports':report_count,'maxWorkResidual':max_work,'maxMomentumResidual':max_momentum,
            'maxArmImpulseExcess':max_arm,'maxArmWorkExcess':max_arm_work,'maxSupportMotorWorkExcess':max_motor,
            'minimumSignedSupportMotorWork':min_motor_work,'maxAbsolute1_1mgGroundEnvelopeRatio':max_ground_absolute_ratio,
            'limits':['Actual saved tick reports only; shared engine caps unchanged.',
                      'Absolute1.1mg traction envelope is not proof of every instantaneous support-reduced substep bound.',
                      'Negative signed motor work is dissipative, not unexplained positive work.',
                      'pairImpulse tap misses lower-grasp supportImpulse; empty grasp rows do not establish zero force.']}

rows=[]
for id in ['G4-P127','G3-P099','G4-P012','G2-P188']:
    bp,cp=FILES/f'{id}-baseline.json.gz',FILES/f'{id}-candidate.json.gz'
    if not bp.exists() or not cp.exists(): continue
    base,cand=load(bp),load(cp); a,b=base['row'],cand['row']
    first_tick=next(((x,y) for x,y in zip(a['ticks'],b['ticks']) if x!=y),None)
    ac={(c['t'],c['a']):c for c in a['commands']}; bc={(c['t'],c['a']):c for c in b['commands']}
    first_requests=[]
    for key,x in ac.items():
        y=bc.get(key)
        if y and x['command']!=y['command']:
            first_requests.append({'t':key[0],'a':key[1],'slot':x['slot'],'before':x['command'],'after':y['command']})
    earliest=min((x['t'] for x in first_requests),default=None)
    first_requests=[x for x in first_requests if x['t']==earliest]
    initial=b['fullInitial']['agents']
    fs=next(x for x in initial if x['slot']=='FS')
    fs_target=(fs['behavior'].get('target') or {}).get('agent')
    fs_role={'idx':fs['idx'],'kind':fs['behavior'].get('kind'),'target':fs_target,
             'targetSlot':next((x['slot'] for x in initial if x['idx']==fs_target),None),
             'fit':fs['agentFields'].get('runFit')}
    rows.append({'id':id,'baselineFileSha256':digest(bp),'candidateFileSha256':digest(cp),
        'scope':cand.get('scope'),'candidateSource':cand.get('candidateSource'),
        'nativePrefixExact':a['priorLogSha256']==b['priorLogSha256'] and a['seedsThroughTarget']==b['seedsThroughTarget'],
        'initialStateExact':a['initialSha256']==b['initialSha256'] and a['fullInitialSha256']==b['fullInitialSha256'],
        'observerPlainBothVerified':a['observerVerified'] and b['observerVerified'],
        'completeExecutionExact':a['fullFinalSha256']==b['fullFinalSha256'] and a['resultSha256']==b['resultSha256'] and a['ticks']==b['ticks'] and a['nextRng']==b['nextRng'],
        'firstTickFork':{'t':first_tick[0]['t'],'beforeExact':first_tick[0]['before']==first_tick[1]['before']} if first_tick else None,
        'firstRequestFork':first_requests,'fsInitialRole':fs_role,
        'baseline':{'gain':a['rawOutcome']['offenseYards'],'outcome':a['rawOutcome']['outcome'],'duration':a['rawOutcome']['duration'],'stats':a['rawOutcome']['stats'],'accounting':accounting(a)},
        'candidate':{'gain':b['rawOutcome']['offenseYards'],'outcome':b['rawOutcome']['outcome'],'duration':b['rawOutcome']['duration'],'stats':b['rawOutcome']['stats'],'accounting':accounting(b)},
        'candidateFitDecisions':[d for d in b['result']['telemetry']['decisions'] if d['kind']=='coverage-run-fit'],
        'candidateContactTimeline':[e for e in b['rawOutcome']['events'] if e['type'] in ['handoff','carrier_contact','tackle_wrap','missed_tackle','broken_tackle','fall','tackle','touchdown']]})

packet={'schema':'saved-selected-alley-policy-receipt-v1','toolSha256':digest(Path(__file__)),
        'scope':'Baseline601 native Game prefix and constructor; only selected candidate ManCoverage.update. Not a complete candidate game or NFL rate experiment.',
        'selectionSha256':digest(ROOT/'counterfactual-selection.json'),'rows':rows}
(ROOT/'counterfactual-analysis.json').write_text(json.dumps(packet,indent=2))
print(json.dumps({'cases':len(rows),'rows':[{'id':r['id'],'FS':r['fsInitialRole'],'gains':[r['baseline']['gain'],r['candidate']['gain']],'completeExecutionExact':r['completeExecutionExact'],'firstTickFork':r['firstTickFork']} for r in rows]}))
