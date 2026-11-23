"""Is the arrival speed the residual? (2026-11-23) For the first defender (nearest at the catch), from pursuit-assume.mts
output with body limits (prof): at the catch, his velocity against the pursuit line he will need (his first pursuit
request; else the constant-velocity intercept at his speed), the velocity change that line asks for, and the time his
body needs for it at his braking capacity (|dv| / brake; a lower bound: braking and turning share one envelope), by
first-defender outcome. Usage: python3 -I pursuit-redirect.py ROWS.json"""
import json, math, sys, collections, importlib.util, os
spec = importlib.util.spec_from_file_location('pa', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pursuit-an.py'))
pa = importlib.util.module_from_spec(spec); spec.loader.exec_module(pa)
def q(v, p):
    v = sorted(x for x in v if x is not None); return v[min(len(v) - 1, int(p * len(v)))] if v else float('nan')
def angd(v, b): return abs(math.degrees(math.atan2(v[0] * b[1] - v[1] * b[0], v[0] * b[0] + v[1] * b[1])))
R = json.load(open(sys.argv[1])); out = collections.defaultdict(list)
for r in R:
    F = r['frames']
    if len(F) < 3 or 'prof' not in r: continue
    row = {'src': 'sim', 'key': r['key'], 'man': False, 'end': 'other', 'car': [[f['t'], *f['car']] for f in F],
           'defs': {k: [[f['t'], *f['d'][k]['pos'], 0] for f in F if k in f['d']] for k in F[0]['d']}, 'offs': {}}
    a = pa.analyse(row)
    if not isinstance(a, dict): continue
    grp = 'old angle / overrun' if a['cls'] and (a['cls'].startswith('old') or a['cls'].startswith('overrun')) else 'other failure' if a['cls'] else 'stopped' if a['outcome'].startswith('stopped') else None
    if not grp: continue
    k = a['d1']; d0 = F[0]['d'][k]; c0 = F[0]['car']; v = (d0['pos'][2], d0['pos'][3]); s = math.hypot(*v); pr = r['prof'][k]
    first = next((f for f in F if f['d'][k]['stage'] and (f['d'][k].get('cmd') or f['d'][k].get('req'))), None)
    if first: need = first['d'][k].get('cmd') or first['d'][k].get('req'); tfirst = first['t']
    else:
        ic = pa.cv_intercept(d0['pos'][0], d0['pos'][1], max(s, 1), c0[0], c0[1], c0[2], c0[3])
        if not ic: continue
        u = (ic[0][0] / max(1e-6, math.hypot(*ic[0])), ic[0][1] / max(1e-6, math.hypot(*ic[0]))); need = (u[0] * pr['vmax'], u[1] * pr['vmax']); tfirst = None
    dv = math.hypot(need[0] - v[0], need[1] - v[1])
    out[grp].append(dict(speed=s, turn=angd(v, need) if s > 1 else None, dv=dv, t_need=dv / max(0.5, pr['brake']), brake=pr['brake'], dist=math.hypot(d0['pos'][0] - c0[0], d0['pos'][1] - c0[1]),
                         t_contact=a['contact_t'], t_beat=a['beat_t'], tfirst=tfirst))
for g in ('stopped', 'other failure', 'old angle / overrun'):
    X = out[g]
    if not X: continue
    print(f"{g} (n {len(X)}): at the catch his speed p50 {q([x['speed'] for x in X], .5):.1f} yd/s, turn to his pursuit line p50 {q([x['turn'] for x in X], .5):.0f} deg (p75 {q([x['turn'] for x in X], .75):.0f}),"
          f" velocity change p50 {q([x['dv'] for x in X], .5):.1f} yd/s at braking {q([x['brake'] for x in X], .5):.1f} yd/s2 -> at least {q([x['t_need'] for x in X], .5):.2f} s (p75 {q([x['t_need'] for x in X], .75):.2f});"
          f" distance {q([x['dist'] for x in X], .5):.1f} yd; beaten at +{q([x['t_beat'] for x in X], .5):.1f} s")
