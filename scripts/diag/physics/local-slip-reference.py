"""Independent 70-digit constant-field Coulomb solution; imports no engine.
The scalar slip acceleration is B+K*force. Its zero is the only friction event.
Coordinates follow the impulse and its first temporal moment analytically.
"""
import json, sys, hashlib
from decimal import Decimal as D, getcontext
from pathlib import Path
getcontext().prec = 70
path = Path('config/local-slip-work.json')
packet = json.loads(path.read_text(), parse_float=D, parse_int=D)
def solve(field):
    h, bodies, arms, t, cap = field['duration'], field['bodies'], field['arms'], field['tangent'], field['forceLimit']
    u = sum((bodies[1]['velocity'][c]-bodies[0]['velocity'][c])*t[c] for c in ('x','y'))-sum(r*b['spin'] for r,b in zip(arms,bodies))
    B = sum((bodies[1]['groundAcceleration'][c]-bodies[0]['groundAcceleration'][c])*t[c] for c in ('x','y'))-sum(r*b['groundYawAcceleration'] for r,b in zip(arms,bodies))
    K = sum(t[c]*t[c] for c in ('x','y'))*sum(1/b['mass'] for b in bodies)+sum(r*r/b['inertia'] for r,b in zip(arms,bodies))
    f = -cap if u>0 else cap if u<0 else max(-cap,min(cap,-B/K))
    a = B+K*f
    hit = -u/a if u*a<0 else h
    d1 = min(h,hit)
    phases=[(d1,f,u)]
    if d1<h: phases.append((h-d1,max(-cap,min(cap,-B/K)),D(0)))
    J=M=amount=W=D(0); elapsed=D(0)
    for d,force,start in phases:
        J+=force*d; amount+=abs(force)*d; M+=force*d*(h-elapsed-d/2)
        W+=force*(start*d+(B+K*force)*d*d/2); elapsed+=d
    after=[]; ground=D(0); beforeE=afterE=D(0)
    for i,(b,r) in enumerate(zip(bodies,arms)):
        sign = -1 if i==0 else 1
        v={c:b['velocity'][c]+b['groundAcceleration'][c]*h+sign*t[c]*J/b['mass'] for c in ('x','y')}
        p={c:b['position'][c]+b['velocity'][c]*h+b['groundAcceleration'][c]*h*h/2+sign*t[c]*M/b['mass'] for c in ('x','y')}
        spin=b['spin']+b['groundYawAcceleration']*h-r*J/b['inertia']
        angle=b['facing']+b['spin']*h+b['groundYawAcceleration']*h*h/2-r*M/b['inertia']
        ground+=sum(b['mass']*b['groundAcceleration'][c]*(p[c]-b['position'][c]) for c in ('x','y'))+b['inertia']*b['groundYawAcceleration']*(angle-b['facing'])
        beforeE+=sum(b['mass']*b['velocity'][c]**2/2 for c in ('x','y'))+b['inertia']*b['spin']**2/2
        afterE+=sum(b['mass']*v[c]**2/2 for c in ('x','y'))+b['inertia']*spin**2/2
        after.append({'position':p,'velocity':v,'facing':angle,'spin':spin})
    assert abs(afterE-beforeE-ground-W)<D('1e-60')
    return {'initialSlip':u,'externalSlipAcceleration':B,'mobility':K,'zeroTime':d1 if d1<h else None,'impulse':J,'temporalMoment':M,'absoluteImpulse':amount,'handWork':W,'groundWork':ground,'energyChange':afterE-beforeE,'after':after}
result={'protocol':'decimal-local-slip-reference-v1','precision':70,'inputSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'cases':{key:solve(packet[key]['field']) for key in ('selected','slidingControl')}}
Path(sys.argv[1]).write_text(json.dumps(result,indent=2,default=str)+'\n')
print(json.dumps({key:{k:str(v) for k,v in value.items() if k!='after'} for key,value in result['cases'].items()}))
