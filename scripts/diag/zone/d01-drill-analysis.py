"""D01 saved-production geometry and spacing reduction; never calls simulation."""
import gzip
import hashlib
import json
import math
import time
from pathlib import Path

START = time.perf_counter()
PACKET = Path('data/reviews/current/ace-production-observations.json.gz')
packet = json.loads(gzip.decompress(PACKET.read_bytes()))
G = 9.80665 / .9144

def vec(v):
    return (v['x'], v['y'])

def sub(a,b):
    return tuple(x-y for x,y in zip(a,b))

def dot(a,b):
    return sum(x*y for x,y in zip(a,b))

def length(a):
    return math.hypot(*a)

def fatigue(energy):
    x = (1 - max(0,min(1,energy))) * 4096
    k = math.floor(x)
    if k >= 4096: return .86
    table = lambda j: 1-.14*(j/4096)**1.4
    return table(k)+(table(k+1)-table(k))*(x-k)

def follow(body,profile,a,skill,capacity=1):
    speed = length(vec(body['vel']))
    fat = fatigue(body['energy'])
    mag = length(a)
    if mag < 1e-12: return (0,0)
    drive = max(0,(profile['vmax']*fat-speed)/profile['tau'])*fat
    if speed < .35:
        cap = max(drive,profile['brake']*.5)*capacity
        return tuple(v*min(1,cap/mag) for v in a)
    tx,ty = (v/speed for v in vec(body['vel']))
    at,an = a[0]*tx+a[1]*ty,-a[0]*ty+a[1]*tx
    At=(max(drive,.01) if at>=0 else profile['brake']*(.85+.15*fat))*capacity
    An=profile['lateral']*skill*(1-.2*max(0,min(1,speed/profile['vmax'])))*(.85+.15*fat)*capacity
    k=(at/max(At,1e-9))**2+(an/max(An,1e-9))**2
    scale=min(1,1/math.sqrt(k))
    return ((at*tx-an*ty)*scale,(at*ty+an*tx)*scale)

def nominal_geometry(rt,de,rb,profiles):
    # A static circular center corridor is a geometry measurement, not an
    # attainable route forecast or a contact/hand solve. All quantities use
    # the simultaneous saved bodies. No future path enters a controller.
    de_pos,rt_pos,rb_pos=map(lambda a:vec(a['pos']),(de,rt,rb))
    corridor=sub(rb_pos,de_pos)
    rel=sub(rt_pos,de_pos)
    v2=dot(corridor,corridor)
    u=max(0,min(1,dot(rel,corridor)/max(1e-12,v2)))
    closest=tuple(de_pos[i]+u*corridor[i] for i in range(2))
    clear=length(sub(rt_pos,closest))
    radius=.9*(profiles[2]['radius']+profiles[12]['radius'])
    return {'rtToDeDistance':length(rel),'deToRbDistance':length(corridor),
            'rtRelativeToDe':{'x':rel[0],'y':rel[1]},
            'projectionFractionOnDeToRbSegment':u,'nominalDeCenterCorridorClearanceFromRt':clear-radius,
            'nominalClearanceRadius':radius,'deToRbNominalTouch':.9*(profiles[12]['radius']+profiles[6]['radius']),
            'runnerSideProjectionOfRtFromDe':dot(rel,corridor)/max(1e-12,length(corridor))}

def spacing_fold(frame,profiles):
    movements=[x for x in frame['contactPhases'] if x['phase']=='movement' and x['rep']['blocker']==2 and x['rep']['defender']==12]
    if not movements: return None
    body=next(a for a in frame['before'] if a['idx']==2)
    support=body['support']; profile=profiles[2]
    base=(.11+.05*profile['balance']+.04*max(0,min(1,(profile['massKg']-90)/60)))*(.75+.5*support['posture'])
    assert length(vec(support['xi']))<=base, 'Current reduction only handles fully available saved support'
    raw=movements[-1]['data']['command']
    v=vec(raw['vel']);steps=[]
    cues={x['target']:x['seen'] for x in frame['consumed'] if x['actor']==2 and x['target']!=12}
    # Shared packet preserves RG/RB/Y/H pictures, not every spacing call.
    # With these loaded/second-level jobs, their calledMotion is null in the
    # visible source. Omitted peers are retained as an explicit capture gap.
    for peer in sorted(cues):
        seen=cues[peer]; rel=sub(vec(seen['pos']),vec(body['pos']));d=length(rel)
        if d<1e-6: continue
        nx,ny=(x/d for x in rel);touch=.9*(profile['radius']+profiles[peer]['radius']);gap=d-touch
        brake=follow(body,profile,(-nx*1000,-ny*1000),raw.get('cutSkill',1))
        decel=max(.1,-brake[0]*nx-brake[1]*ny)
        current=max(0,dot(sub(vec(body['vel']),vec(seen['vel'])),(nx,ny)))
        stopping=current*.3+current*current/(2*decel)
        if gap>max(1.2,stopping):continue
        relative=sub(v,vec(seen['vel']));closing=dot(relative,(nx,ny));speed2=dot(relative,relative)
        closest=max(0,dot(rel,relative)/speed2) if speed2>1e-9 else 0
        closest_distance=length(tuple(rel[k]-relative[k]*closest for k in range(2)))
        if gap>0 and closest_distance>touch:continue
        allowed=math.sqrt((decel*.3)**2+2*decel*max(0,gap))-decel*.3
        if closing>allowed:
            before=v;cut=closing-allowed;v=(v[0]-nx*cut,v[1]-ny*cut)
            steps.append({'peer':peer,'seenAge':seen['age'],'seen':seen,'headway':gap,'deceleration':decel,
                          'closingRequest':closing,'allowedClosure':allowed,'straightClosestDistance':closest_distance,
                          'nominalTouch':touch,'before':before,'after':v})
    final=next(x for x in frame['afterBodies'] if x['idx']==2)
    delivered=vec(frame['delivered'][2]['vel'])
    return {'rawContactRequest':raw,'savedPicturePartialFold':v,'worldInput':delivered,'foldError':length(sub(v,delivered)),
            'achievedVelocity':final['vel'],'steps':steps,'availability':1,'capturedSpacingPeers':sorted(cues),
            'interpretation':'Pure arithmetic with saved pictures; omitted far spacing calls/hidden body fields are not reconstructed.'}

cases=[]
for row in packet['panel']:
    profiles={a['idx']:a['profile'] for a in row['actors']}
    slots={a['idx']:a['slot'] for a in row['actors']}
    series=[]
    for f in row['series']:
        actors={a['idx']:a for a in f['actors']}
        hands=[j for j in f['handsAtWorldEnd'] if j['kind']=='hands' and {j['a'],j['b']}=={2,12}]
        series.append({'controllerT':f['t'],'worldEnd':f['after'],
                       'geometry':nominal_geometry(actors[2],actors[12],actors[6],profiles),
                       'actors':{slots[i]:actors[i] for i in [2,6,12]},'handsAtWorldEnd':hands,
                       'rtDeBodyContacts':[x for x in f['bodyContacts'] if {x['i'],x['j']}=={2,12}],
                       'rtDePictureCalls':[x for x in f['pictureCallCounts'] if x[0]==2 and x[1]==12],
                       'reps':[x for x in f['beforeReps'] if x['defender']==12],
                       'events':[x for x in f['events'] if x['type'] in ['carrier_contact','block_climb','missed_tackle']]})
    detailed=[]
    for f in row['detailedFrames']:
        if not (1.4<=f['t']<=3.7):continue
        actors={a['idx']:a for a in f['before']}
        detailed.append({'controllerT':f['t'],'worldEnd':f['after'],
                         'beforeGeometry':nominal_geometry(actors[2],actors[12],actors[6],profiles),
                         'bodiesBefore':{slots[i]:actors[i] for i in [2,6,12]},
                         'consumedRtDeRb':[x for x in f['consumed'] if x['actor'] in [2,6,12] and x['target'] in [2,6,10,12]],
                         'keeperPhase':[x for x in f['contactPhases'] if x['rep']['defender']==12],
                         'spacing':spacing_fold(f,profiles),'worldReport':{'work':f['report']['work'],
                         'groundImpulseRt':f['report']['groundImpulse'][2],'groundImpulseDe':f['report']['groundImpulse'][12]}})
    cases.append({'input':row['input'],'profiles':{slots[i]:profiles[i] for i in [2,6,12]},
                  'installedJobs':{a['slot']:{'behavior':a['initialBehavior'],'runFit':a['initialRunFit']}
                                   for a in row['actors'] if a['idx'] in [2,6,7,10,12]},'summary':row['summary'],
                  'setupSha256':row['summary']['setupSha256'],'selectedActorsSha256':row['summary']['selectedActorsSha256'],
                  'fullStateRngHistorySha256':row['summary']['fullStateRngHistorySha256'],
                  'series':series,'detailed':detailed})
report={'protocol':'d01-offline-keeper-protection-v1','packetPath':str(PACKET),
        'packetSha256':hashlib.sha256(PACKET.read_bytes()).hexdigest(),'provenance':packet['provenance'],
        'manifest':packet['manifest'],'cases':cases,'runtimeSeconds':time.perf_counter()-START,
        'newPlays':0,'newWorldSteps':0,'limits':['Nominal circular corridor geometry is not earliest attainable interception.',
        'Detailed contact/cues sampled, not all frames. No full joint/bodies/motor replay.',
        'Center-law force vectors/torques unavailable; numerical law legitimacy not certified.']}
output=Path('out/run-drills/d01-analysis.json');output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'runtimeSeconds':report['runtimeSeconds'],'newPlays':0,'newWorldSteps':0,'output':str(output)}))
for case in cases:
    print(case['input']['id'],case['summary']['firstContact'])
    for f in case['detailed']:
        if f['spacing'] and f['controllerT']>=2.3 and f['controllerT']<=2.65:
            print(f['controllerT'],'foldError',f['spacing']['foldError'],'cuts',[(x['peer'],x['closingRequest'],x['allowedClosure']) for x in f['spacing']['steps']])
