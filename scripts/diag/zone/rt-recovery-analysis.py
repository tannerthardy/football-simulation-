"""Reduce two saved RT alternatives against the accepted Ace reference; zero World steps."""
import gzip
import hashlib
import json
import math
from pathlib import Path

def load(path):
    return json.loads(gzip.decompress(Path(path).read_bytes()))

root = Path('out/rt-recovery')
saved = load('data/reviews/current/ace-production-observations.json.gz')
baseline = next(r for r in saved['panel'] if r['input']['id'] == 'uc12-wz-s3-mirror')
original_profiles = [a['profile'] for a in baseline['actors']]
ref = {round(f['after'], 8): {a['idx']: a for a in f['actors']} for f in baseline['series']}

def clearance(bodies):
    rt, de, rb = [bodies[i]['pos'] for i in [2, 12, 6]]
    d = [rb[k]-de[k] for k in ['x', 'y']]
    v = [rt[k]-de[k] for k in ['x', 'y']]
    along = min(1, max(0, sum(x*y for x,y in zip(v,d))/max(1e-12, sum(x*x for x in d))))
    radius = .9*(original_profiles[2]['radius']+original_profiles[12]['radius'])
    return math.hypot(v[0]-along*d[0], v[1]-along*d[1])-radius

def difference(a, b):
    return {k: a[k]-b[k] for k in ['x','y']}

rows = []
for action, filename in [('depth-neutral', 'uc12-wz-s3-mirror-depth-neutral.json.gz' if (root/'uc12-wz-s3-mirror-depth-neutral.json.gz').exists() else 'uc12-wz-s3-mirror.json.gz'),
                         ('flow-only', 'uc12-wz-s3-mirror-flow-only.json.gz')]:
    path = root/filename
    p = load(path)
    assert p['prefixExact'] and p['prefixTicks'] == 35
    assert p['hashes'][:35] == baseline['hashes'][:35]
    assert p['input'] == baseline['input']
    assert p['flags'] == saved['provenance']['flags']
    assert p['summary']['complete'] and not p['summary']['censored']
    assert len(p['actions']) == 5 and [a['t'] for a in p['actions']] == [1.75,1.8,1.85,1.9,1.95]
    first = p['firstRead']
    assert first['read']['phase'] == 'runoff' and first['anchored'] is False
    assert p['finishedAction']['t'] == 2 and p['finishedAction']['reason'] == 'Existing zone read renewed'
    for a in p['actions']:
        assert {k:v for k,v in a['original'].items() if k != 'vel'} == {k:v for k,v in a['changed'].items() if k != 'vel'}
        assert a['consumedRead'] == first['read']
        expected_y = first['read']['seen']['vel']['y'] if action == 'depth-neutral' else min(a['original']['vel']['y'],first['read']['seen']['vel']['y'])
        assert a['changed']['vel']['y'] == expected_y
        assert a['changed']['vel']['x'] == (0 if action == 'depth-neutral' else a['original']['vel']['x'])
    maxima = dict.fromkeys(['armImpulseExcess','armWorkExcess','supportWorkExcess','workResidual','postureRateExcess','linearImpulseResidual'], 0)
    trajectories = []
    first_raw_rb = first_world_rb = first_achieved_rb = None
    open_boundary = None
    same_team_contacts = []
    for f in p['frames']:
        assert len(f['beforeBodies']) == len(f['afterBodies']) == 22
        report, dt = f['report'], f['dt']
        for i,(b,a) in enumerate(zip(f['beforeBodies'],f['afterBodies'])):
            assert b['profile'] == a['profile'] == original_profiles[i]
            maxima['armImpulseExcess'] = max(maxima['armImpulseExcess'],report['armImpulse'][i]-report['armImpulseLimit'][i])
            maxima['armWorkExcess'] = max(maxima['armWorkExcess'],report['armWork'][i]-report['armWorkLimit'][i])
            maxima['supportWorkExcess'] = max(maxima['supportWorkExcess'],report['supportMotorWork'][i]-report['supportMotorWorkLimit'][i])
            maxima['postureRateExcess'] = max(maxima['postureRateExcess'],abs(a['support']['posture']-b['support']['posture'])-2.5*dt)
            assert all(math.isfinite(a[field][axis]) for field in ['pos','vel'] for axis in ['x','y'])
        maxima['workResidual'] = max(maxima['workResidual'],abs(report['work']['residual']))
        residual = [sum(b['profile']['massKg']*(a['vel'][k]-b['vel'][k]) for b,a in zip(f['beforeBodies'],f['afterBodies']))
                    -sum(q[k] for q in report['groundImpulse']) for k in ['x','y']]
        maxima['linearImpulseResidual'] = max(maxima['linearImpulseResidual'],math.hypot(*residual))
        for q in report['contacts']:
            if q['i'] < 11 and q['j'] < 11 and q['impulse'] > 1e-9:
                same_team_contacts.append({'t':f['t'],**q})
        base = ref.get(round(f['after'],8))
        if base:
            for key, current in [('requested',f['requested'][6]),('delivered',f['intents'][6])]:
                differs = max(abs(current['vel'][k]-base[6][key]['vel'][k]) for k in ['x','y']) > 1e-10
                if differs and key == 'requested' and first_raw_rb is None: first_raw_rb = f['t']
                if differs and key == 'delivered' and first_world_rb is None: first_world_rb = f['t']
            if first_achieved_rb is None and max(abs(f['afterBodies'][6]['pos'][k]-base[6]['pos'][k]) for k in ['x','y']) > 1e-10:
                first_achieved_rb = f['after']
        screen = clearance(f['afterBodies'])
        if f['after'] >= 2.2 and screen > 0 and open_boundary is None: open_boundary = f['after']
        if f['t'] in [1.75,1.95,2,2.25,2.3,2.4,2.5,2.6,2.65,2.75,2.8]:
            movement = next((q['data'] for q in p['phases'] if q['t']==f['t'] and q['phase']=='movement'
                and q['rep']['blocker']=={'agent':2}), None)
            joints = [q for q in f['jointOutputs'] if q['kind']=='hands' and {q['a'],q['b']}=={2,12}]
            trajectories.append({'entry':f['t'],'completed':f['after'],
                'RT':f['afterBodies'][2]['pos'],'DE':f['afterBodies'][12]['pos'],'RB':f['afterBodies'][6]['pos'],
                'rtOriginalContactRequest':movement['command']['vel'] if movement else None,
                'rtWorldRequest':f['intents'][2]['vel'],'rtAchievedVelocity':f['afterBodies'][2]['vel'],
                'rbRequest':f['requested'][6]['vel'],'rbWorldRequest':f['intents'][6]['vel'],
                'rbAchievedVelocity':f['afterBodies'][6]['vel'],
                'deltaVsAccepted': {str(i):difference(f['afterBodies'][i]['pos'],base[i]['pos']) for i in [2,12,6]} if base else None,
                'staticScreenClearance':screen,'acceptedStaticScreenClearance':clearance(base) if base else None,
                'meanRtHands':[{k:j.get(k) for k in ['normalForce','tangentForce']} for j in joints]})
    assert all(v < 1e-8 for v in maxima.values()), maxima
    event_time=p['summary']['firstContact']['t']
    contact_frame=next(f for f in p['frames'] if f['t']==event_time)
    rows.append({'action':action,'testedRevision':p['commit'],'packet':str(path),
        'packetSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'packetBytes':path.stat().st_size,
        'summary':p['summary'],'firstRead':first,'prefixTicksExact':35,'actionIntervals':len(p['actions']),
        'actionEnded':p['finishedAction'],'firstChangedRbRawRequestEntry':first_raw_rb,
        'firstChangedRbWorldRequestEntry':first_world_rb,'firstChangedRbAchievedBoundary':first_achieved_rb,
        'firstStaticRayOpeningCompletedBoundary':open_boundary,
        'firstContactInterval':{'entry':contact_frame['t'],'completed':contact_frame['after'],
            'rtPositionBefore':contact_frame['beforeBodies'][2]['pos'],'rbPositionBefore':contact_frame['beforeBodies'][6]['pos'],
            'dePositionBefore':contact_frame['beforeBodies'][12]['pos'],
            'contacts':[q for q in contact_frame['report']['contacts'] if {q['i'],q['j']}=={6,12}]},
        'positiveOffenseOffenseBodyContactsAfterCapture':same_team_contacts,
        'rtRbBodyCollision':any({q['i'],q['j']}=={2,6} for q in same_team_contacts),
        'physicalChecks':maxima,'trajectories':trajectories,'internalSeconds':p['elapsedSeconds']})

out={'protocol':'rt-recovery-offline-analysis-v1','reference':baseline['summary'],
     'referenceSha256':hashlib.sha256(Path('data/reviews/current/ace-production-observations.json.gz').read_bytes()).hexdigest(),
     'rows':rows,'newWorldSteps':0,'nativeCandidatePlays':2,'referenceEndingsReplayed':0,
     'interpretationLimits':['Static screen is not a feasible interception planner or a hand-denial proof.',
        'Mean hand loads are tick averages, not continuous attachment.',
        'No angular-law validity claim.','Changed ending is not a protection metric.']}
(root/'analysis.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'nativeCandidatePlays':2,'newWorldStepsInReducer':0,
    'rows':[{k:r[k] for k in ['action','firstChangedRbRawRequestEntry','firstChangedRbWorldRequestEntry','firstChangedRbAchievedBoundary','firstStaticRayOpeningCompletedBoundary','physicalChecks','rtRbBodyCollision']} for r in rows]}))
