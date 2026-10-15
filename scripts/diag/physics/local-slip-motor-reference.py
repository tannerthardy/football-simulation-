"""Independent Decimal reference for the saved fixed-frame motor/slip event.
No engine imports. Bisection selects force and event time; the candidate may
instead use piecewise-linear/quadratic roots. The ground motor is the bounded
continuous limit of clamp(targetSpin-spin + handLoad/inertia, +/-cap*dt).
"""
import json,sys,hashlib,copy
from decimal import Decimal as D,getcontext
from pathlib import Path
getcontext().prec=int(sys.argv[2]) if len(sys.argv)>2 else 70
ZERO=D(0);ONE=D(1);TWO=D(2);EPS=D(10)**(-getcontext().prec+12)
path=Path('config/local-slip-work.json');packet=json.loads(path.read_text(),parse_float=D,parse_int=D)
def clamp(x,lo,hi):return max(lo,min(hi,x))
def root(f,a,b):
    va=f(a)
    for _ in range(4*getcontext().prec):
        mid=(a+b)/2;v=f(mid)
        if v==0:return mid
        if (v>0)==(va>0):a=mid;va=v
        else:b=mid
    return (a+b)/2

def solve(field):
    bs=json.loads(json.dumps(field,default=str),parse_float=D,parse_int=D)
    # Convert all Decimal strings in this independent state copy.
    def num(x):return {k:num(v) for k,v in x.items()} if isinstance(x,dict) else [num(v) for v in x] if isinstance(x,list) else D(x) if isinstance(x,str) else x
    bs=num(bs)['bodies'];T=field['duration'];remaining=field['remaining'];t=field['tangent'];arms=field['arms'];cap=field['forceLimit']
    lin=sum(t[c]**2 for c in ('x','y'))*sum(1/b['mass'] for b in bs)
    external=sum((bs[1]['groundAcceleration'][c]-bs[0]['groundAcceleration'][c])*t[c] for c in ('x','y'))
    initialE=sum(b['mass']*sum(b['velocity'][c]**2 for c in ('x','y'))/2+b['inertia']*b['spin']**2/2 for b in bs)
    elapsed=J=M=amount=W=ZERO;G=[ZERO,ZERO];GM=[ZERO,ZERO];GA=[ZERO,ZERO];GW=[ZERO,ZERO];LW=[ZERO,ZERO];phases=[]
    while elapsed<T:
        assert len(phases)<12
        r=remaining-elapsed;left=T-elapsed
        u=sum((bs[1]['velocity'][c]-bs[0]['velocity'][c])*t[c] for c in ('x','y'))-sum(a*b['spin'] for a,b in zip(arms,bs))
        directions=[]
        for b in bs:
            y=b.get('yaw')
            if y is None:directions.append(0);continue
            error=y['targetHeading']-b['facing'];d=clamp(error/r,-y['turnRate'],y['turnRate'])-b['spin']
            directions.append(0 if abs(d)<EPS else 1 if d>0 else -1)
        def motors(force):
            return [ZERO if 'yaw' not in b else D(s)*b['yaw']['accelerationLimit'] if s else clamp(a*force/b['inertia'],-b['yaw']['accelerationLimit'],b['yaw']['accelerationLimit']) for b,a,s in zip(bs,arms,directions)]
        def rate(force):return external+lin*force-sum(a*(g-a*force/b['inertia']) for b,a,g in zip(bs,arms,motors(force)))
        if cap==0:force=ZERO
        elif abs(u)>EPS:force=-cap if u>0 else cap
        elif rate(-cap)>=0:force=-cap
        elif rate(cap)<=0:force=cap
        else:force=root(rate,-cap,cap)
        ground=motors(force);alpha=[g-a*force/b['inertia'] for b,a,g in zip(bs,arms,ground)]
        event=left;events=[]
        du=rate(force)
        if abs(u)>EPS and u*du<0:
            hit=-u/du
            if hit>EPS and hit<event:event=hit
        for b,a in zip(bs,alpha):
            if not a or 'yaw' not in b:continue
            y=b['yaw'];e=y['targetHeading']-b['facing'];q=e-r*b['spin']
            def qAt(d):return q-a*(r*d-d*d/2)
            if abs(q)>EPS and q*qAt(left)<=0:
                hit=root(qAt,ZERO,left);spin=b['spin']+a*hit
                if hit>EPS and abs(spin)<=y['turnRate']+EPS:event=min(event,hit)
            for s in (-1,1):
                hit=(s*y['turnRate']-b['spin'])/a
                if hit>EPS and hit<=left:
                    want=(e-b['spin']*hit-a*hit*hit/2)/(r-hit)
                    if D(s)*want>=y['turnRate']-EPS:event=min(event,hit)
        assert event>0
        phaseW=force*(u*event+du*event*event/2)
        J+=force*event;amount+=abs(force)*event;M+=force*event*(T-elapsed-event/2);W+=phaseW
        for i,(b,a,g,aa) in enumerate(zip(bs,arms,ground,alpha)):
            sign=D(-1 if i==0 else 1);angle=b['spin']*event+aa*event*event/2
            for c in ('x','y'):
                accel=b['groundAcceleration'][c]+sign*t[c]*force/b['mass']
                travel=b['velocity'][c]*event+accel*event*event/2
                LW[i]+=b['mass']*b['groundAcceleration'][c]*travel
                b['position'][c]+=travel;b['velocity'][c]+=accel*event
            torque=b['inertia']*g;G[i]+=torque*event;GA[i]+=abs(torque)*event;GM[i]+=torque*event*(T-elapsed-event/2);GW[i]+=torque*angle
            b['facing']+=angle;b['spin']+=aa*event
        phases.append({'duration':event,'force':force,'groundAcceleration':ground,'slipBefore':u,'slipAfter':u+du*event,'work':phaseW})
        elapsed+=event
    finalE=sum(b['mass']*sum(b['velocity'][c]**2 for c in ('x','y'))/2+b['inertia']*b['spin']**2/2 for b in bs)
    residual=finalE-initialE-W-sum(GW)-sum(LW)
    assert abs(residual)<D('1e-50'),residual
    return {'after':[{k:b[k] for k in ('position','velocity','facing','spin')} for b in bs],'phases':phases,'impulse':J,'temporalMoment':M,'absoluteImpulse':amount,'handWork':W,'groundYawImpulse':G,'groundYawTemporalMoment':GM,'absoluteGroundYawImpulse':GA,'groundYawWork':GW,'legWork':LW,'energyChange':finalE-initialE,'workResidual':residual}
fields={key:packet[key]['field'] for key in ('nextField','selected','slidingControl')}
fields['noHandControl']=copy.deepcopy(fields['nextField']);fields['noHandControl']['forceLimit']=ZERO
result={'protocol':'decimal-local-slip-motor-v1','precision':getcontext().prec,'input':{'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()},'law':'Continuous bounded limit of the existing heading/remaining-tick motor. Frozen tangent/arms/leg forces and yaw/tangent capacities. Actual phases, no projection.','cases':{key:solve(f) for key,f in fields.items()}}
Path(sys.argv[1]).write_text(json.dumps(result,indent=2,default=str)+'\n')
for key,r in result['cases'].items():print(key,'phases',len(r['phases']),'events',[(str(p['duration']),str(p['force']),[str(g) for g in p['groundAcceleration']]) for p in r['phases']],'W',r['handWork'])
