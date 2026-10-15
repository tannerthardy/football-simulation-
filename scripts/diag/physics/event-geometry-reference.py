"""Independent moving-geometry ledger for an already recorded force history.

No engine imports and no new event selection. Native force/ground-torque tapes
come from the preserved Decimal reference, not the candidate's endpoint.
The moving-point replay is a diagnostic ablation: it must NOT be treated as a
passive solver, since it deliberately does not reselect the recorded forces.
"""
import copy
import hashlib
import json
import sys
from decimal import Decimal as D, getcontext
from pathlib import Path

getcontext().prec = int(sys.argv[2]) if len(sys.argv) > 2 else 70
ZERO = D(0)
EPS = D(10) ** (-getcontext().prec + 18)
INPUT = Path('config/local-slip-work.json')
TAPE = Path('config/local-slip-motor-reference.json')
packet = json.loads(INPUT.read_text(), parse_float=D, parse_int=D)


def numbers(x):
    if isinstance(x, dict):
        return {k: numbers(v) for k, v in x.items()}
    if isinstance(x, list):
        return [numbers(v) for v in x]
    return D(x) if isinstance(x, str) else x


tape = numbers(json.loads(TAPE.read_text(), parse_float=D, parse_int=D)['cases'])
assert json.loads(TAPE.read_text())['input']['sha256'] == hashlib.sha256(INPUT.read_bytes()).hexdigest()


def cross(a, b):
    return a['x'] * b['y'] - a['y'] * b['x']


def relative(bs, key):
    return {c: bs[1][key][c] - bs[0][key][c] for c in ('x', 'y')}


def angular(bs):
    return sum(b['mass'] * cross(b['position'], b['velocity']) + b['inertia'] * b['spin'] for b in bs)


def energy(bs):
    return sum((b['mass'] * sum(v * v for v in b['velocity'].values()) + b['inertia'] * b['spin'] ** 2) / 2 for b in bs)


def integral(poly, duration):
    return sum(v * duration ** (i + 1) / (i + 1) for i, v in enumerate(poly))


def multiply(a, b):
    out = [ZERO] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return out


def replay(field, phases, *, moving=False, weights=(D(1),)):
    bs = copy.deepcopy(field['bodies'])
    before_l, before_e = angular(bs), energy(bs)
    t, arms = field['tangent'], field['arms']
    c0 = cross(relative(bs, 'position'), t) - sum(arms)
    c1 = cross(relative(bs, 'velocity'), t)
    c2 = cross(relative(bs, 'groundAcceleration'), t)
    external = work = hand_work = elapsed = j = it = itt = ZERO
    observations = []
    for phase in phases:
        for weight in weights:
            d, force = phase['duration'] * weight, phase['force']
            # Normal separation is quadratic: tangent forces cannot change it.
            span = [cross(relative(bs, 'position'), t), cross(relative(bs, 'velocity'), t), c2 / 2]
            rotational_slip = [ZERO] * 6
            tangent_slip = [sum(relative(bs, 'velocity')[c] * t[c] for c in ('x', 'y')),
                            sum(relative(bs, 'groundAcceleration')[c] * t[c] for c in ('x', 'y'))
                            + force * sum(t[c] ** 2 for c in ('x', 'y')) * sum(1 / b['mass'] for b in bs)]
            for i, b in enumerate(bs):
                g, inertia = b['groundAcceleration'], b['inertia']
                arm = [v * arms[i] / sum(arms) for v in span] if moving else [arms[i]]
                alpha = [-force * v / inertia for v in arm]
                alpha[0] += phase['groundAcceleration'][i]
                omega = [b['spin']] + [v / (k + 1) for k, v in enumerate(alpha)]
                angle = integral(omega, d)
                torque = phase['groundAcceleration'][i] * inertia
                # External torque/work at the trajectory's actual positions.
                accel = {c: g[c] + (1 if i else -1) * t[c] * force / b['mass'] for c in ('x', 'y')}
                mean_position = {c: b['position'][c] * d + b['velocity'][c] * d * d / 2 + accel[c] * d ** 3 / 6 for c in ('x', 'y')}
                external += cross(mean_position, {c: b['mass'] * g[c] for c in ('x', 'y')}) + torque * d
                work += torque * angle
                for c in ('x', 'y'):
                    travel = b['velocity'][c] * d + accel[c] * d * d / 2
                    work += b['mass'] * g[c] * travel
                    b['position'][c] += travel
                    b['velocity'][c] += accel[c] * d
                for k, value in enumerate(multiply(arm, omega)):
                    rotational_slip[k] += value
                b['facing'] += angle
                b['spin'] += integral(alpha, d)
            slip = [-v for v in rotational_slip]
            for k, v in enumerate(tangent_slip):
                slip[k] += v
            phase_work = force * integral(slip, d)
            hand_work += phase_work
            observations.append({'force': force, 'duration': d, 'slipBefore': slip[0],
                                 'slipAfter': sum(v * d ** k for k, v in enumerate(slip)),
                                 'handWork': phase_work})
            j += force * d
            it += force * (elapsed * d + d * d / 2)
            itt += force * (elapsed * elapsed * d + elapsed * d * d + d ** 3 / 3)
            elapsed += d
    residue = angular(bs) - before_l - external
    geometric = c0 * j + c1 * it + c2 * itt / 2
    energy_residue = energy(bs) - before_e - work - hand_work
    assert abs(residue if moving else residue - geometric) < EPS
    assert abs(energy_residue) < EPS
    return {'after': bs, 'angularResidual': residue, 'geometricResidual': geometric,
            'externalAngularImpulse': external, 'workResidual': energy_residue,
            'handWork': hand_work, 'impulse': j, 'timeImpulse': it,
            'midpointTimeImpulse': elapsed * j / 2,
            'chordGeometryContribution': j*(c0+c1*elapsed/2+c2*elapsed*elapsed/4),
            'firstMomentAngularContribution': c1*(it-j*elapsed/2),
            'accelerationAngularContribution': c2*(itt-j*elapsed*elapsed/2)/2,
            'phases': observations}


def error(a, b):
    return max(abs(a[i][key][c] - b[i][key][c]) for i in range(2) for key in ('position', 'velocity') for c in ('x', 'y'))


def equivalent(field, phases, base):
    split = replay(field, phases, weights=(D('.23'), D('.41'), D('.36')))
    assert error(base['after'], split['after']) < EPS
    for i in range(2):
        for k in ('spin', 'facing'):
            assert abs(base['after'][i][k] - split['after'][i][k]) < EPS
    assert abs(base['angularResidual'] - split['angularResidual']) < EPS
    mirrored, mirrored_phases = copy.deepcopy(field), copy.deepcopy(phases)
    for b in mirrored['bodies']:
        for key in ('position', 'velocity', 'groundAcceleration'):
            b[key]['x'] = -b[key]['x']
        b['spin'], b['facing'] = -b['spin'], -b['facing']
    mirrored['tangent']['y'] = -mirrored['tangent']['y']
    for p in mirrored_phases:
        p['force'] = -p['force']
        p['groundAcceleration'] = [-v for v in p['groundAcceleration']]
    mirror = replay(mirrored, mirrored_phases)
    assert abs(base['angularResidual'] + mirror['angularResidual']) < EPS
    assert abs(base['handWork'] - mirror['handWork']) < EPS
    translated = copy.deepcopy(field)
    for b in translated['bodies']:
        b['position']['x'] += 100
        b['position']['y'] -= 75
    shifted = replay(translated, phases)
    assert abs(base['angularResidual'] - shifted['angularResidual']) < EPS
    return {'unequalPhasePartitionResidual': abs(base['angularResidual'] - split['angularResidual']),
            'mirrorResidual': abs(base['angularResidual'] + mirror['angularResidual']),
            'originTranslationResidual': abs(base['angularResidual'] - shifted['angularResidual'])}


results = {}
for key in ('nextField', 'selected', 'slidingControl', 'noHandControl'):
    field = copy.deepcopy(packet['nextField' if key == 'noHandControl' else key]['field'])
    phases = tape[key]['phases']
    frozen = replay(field, phases)
    moving = replay(field, phases, moving=True)
    original = tape[key]['after']
    endpoint_error = max(error(frozen['after'], original),
                         *(abs(a[k]-b[k]) for a,b in zip(frozen['after'],original) for k in ('spin','facing')))
    assert endpoint_error < D('1e-60')
    results[key] = {'frozen': frozen, 'checks': equivalent(field, phases, frozen),
                    'preservedReferenceEndpointResidual': endpoint_error,
                    'movingPointPrescribedTape': moving}

# No normal motion: a frozen arm can be the real common point throughout.
field = copy.deepcopy(packet['nextField']['field'])
t = field['tangent']; n = {'x': t['y'], 'y': -t['x']}; nn = sum(v*v for v in n.values())
a, b = field['bodies']; span = sum(field['arms'])
b['position'] = {c: a['position'][c] + n[c] * span / nn for c in ('x', 'y')}
closing = cross(relative(field['bodies'], 'velocity'), t)
for c in ('x', 'y'):
    b['velocity'][c] -= closing * n[c] / nn
for b in field['bodies']:
    b['groundAcceleration'] = {'x': ZERO, 'y': ZERO}
    b.pop('yaw', None)
u = sum(relative(field['bodies'], 'velocity')[c] * t[c] for c in ('x', 'y')) - sum(r*b['spin'] for r,b in zip(field['arms'],field['bodies']))
force = -field['forceLimit'] if u > 0 else field['forceLimit']
du = force * (nn * sum(1 / b['mass'] for b in field['bodies']) + sum(r*r / b['inertia'] for r,b in zip(field['arms'], field['bodies'])))
hit = -u / du
assert ZERO < hit < field['duration']
phases = [{'duration':hit,'force':force,'groundAcceleration':[ZERO,ZERO]},
          {'duration':field['duration']-hit,'force':ZERO,'groundAcceleration':[ZERO,ZERO]}]
control = replay(field, phases)
assert abs(control['angularResidual']) < EPS and control['handWork'] < 0
results['stationaryNormalControl'] = {'frozen':control,'checks':equivalent(field,phases,control)}

# Exact causal witness: same impulse, different timing, no ground or recovery.
# Midpoint span is exactly 1; only the force's first temporal moment changes.
simple = {'duration':D('.004'),'tangent':{'x':ZERO,'y':D(1)},'arms':[D('.6'),D('.4')],
          'bodies':[{'mass':D(m),'inertia':D(i),'position':{'x':D(x),'y':ZERO},
                     'velocity':{'x':D(v),'y':ZERO},'facing':ZERO,'spin':ZERO,
                     'groundAcceleration':{'x':ZERO,'y':ZERO}}
                    for m,i,x,v in [('100','4','0','0'),('120','5','1.004','-2')]]}
uniform = [{'duration':D('.004'),'force':D(50),'groundAcceleration':[ZERO,ZERO]}]
reversal = [{'duration':D('.001'),'force':D(-100),'groundAcceleration':[ZERO,ZERO]},
            {'duration':D('.003'),'force':D(100),'groundAcceleration':[ZERO,ZERO]}]
one, two = replay(simple, uniform), replay(simple, reversal)
assert one['impulse'] == two['impulse'] == D('.2')
assert abs(one['angularResidual']) < EPS
assert abs(two['angularResidual'] - D('-.0006')) < EPS
assert abs(two['angularResidual'] + 2*(two['timeImpulse']-two['midpointTimeImpulse'])) < EPS
results['sameImpulseTimingControl'] = {'uniform':one,'reversal':two,
                                     'checks':equivalent(simple,reversal,two)}

out = {'protocol':'decimal-event-geometry-v1','precision':getcontext().prec,
       'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
       'inputs':[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in (INPUT,TAPE)],
       'scope':'Prescribed tape ledger, not event selection or a new physical solver',
       'cases':results,'worldIntegrated':False,'adoptionReady':False}
Path(sys.argv[1]).write_text(json.dumps(out,indent=2,default=str)+'\n')
for key, r in results.items():
    f = r.get('frozen',r.get('reversal'))
    print(key,'angularResidual',f['angularResidual'],'workResidual',f['workResidual'])
