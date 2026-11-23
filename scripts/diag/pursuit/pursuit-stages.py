"""What each pursuit stage requests (2026-11-23), from pursuit-assume.mts output (pursuit-tap.mts frames). For the first
defender (nearest at the catch), every tick from the catch to the beat (beaten / missed) or to contact (stopped), by the
stage that set his request (meeting spot, on-top point, close gather, tackle bond, or none = still his coverage behaviour):
 - aim: the request's angle to the bearing to the carrier (at the man) and to the constant-velocity intercept;
 - run with him: the request's and his achieved velocity along the carrier's travel, against the carrier's speed;
 - where he is: along (+ ahead) and lateral offset from the carrier.
Usage: python3 -I pursuit-stages.py ROWS.json"""
import json, math, sys, collections, importlib.util, os
spec = importlib.util.spec_from_file_location('pa', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pursuit-an.py'))
pa = importlib.util.module_from_spec(spec); spec.loader.exec_module(pa)
def q(v, p):
    v = sorted(x for x in v if x is not None); return v[min(len(v) - 1, int(p * len(v)))] if v else float('nan')
def sang(a, b):
    return math.degrees(math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]))
def angd(v, b):
    return abs(math.degrees(math.atan2(v[0] * b[1] - v[1] * b[0], v[0] * b[0] + v[1] * b[1])))
R = json.load(open(sys.argv[1]))
acc = collections.defaultdict(list); handoff = collections.defaultdict(list)
plays = collections.Counter()
for r in R:
    F = r['frames']
    if len(F) < 3: continue
    row = {'src': 'sim', 'key': r['key'], 'man': False, 'end': 'other', 'car': [[f['t'], *f['car']] for f in F],
           'defs': {k: [[f['t'], *f['d'][k]['pos'], 0] for f in F if k in f['d']] for k in F[0]['d']},
           'offs': {k: [[f['t'], *f['o'][k]] for f in F if k in f.get('o', {})] for k in F[0].get('o', {})}}
    a = pa.analyse(row)
    if not isinstance(a, dict): continue
    if a['cls'] and (a['cls'].startswith('old angle') or a['cls'].startswith('overrun')): grp, tend = 'old angle / overrun', a['beat_t']
    elif a['cls']: grp, tend = 'other failure', a['beat_t']
    elif a['outcome'].startswith('stopped') and a['contact_t'] is not None: grp, tend = 'stopped', a['contact_t']
    else: continue
    plays[grp] += 1
    k = a['d1']
    # Hand-off: the first tick his request comes from a pursuit stage after one from coverage; the angle between the two.
    prev = None
    for f in F:
        d = f['d'][k]; rq = d.get('cmd') or d.get('req')
        if prev is not None and d['stage'] and not prev[0] and rq and prev[1] and math.hypot(*rq) > 1 and math.hypot(*prev[1]) > 1:
            handoff[grp].append(angd(rq, prev[1])); break
        if rq: prev = (d['stage'], rq)
    for f in F:
        if f['t'] > tend + 1e-9: break
        d = f['d'][k]; c = f['car']; cs = math.hypot(c[2], c[3])
        if cs < 1: continue
        u = (c[2] / cs, c[3] / cs)
        req = d.get('cmd') or d.get('req')
        if not req or math.hypot(*req) < 0.5: continue
        b = (c[0] - d['pos'][0], c[1] - d['pos'][1]); dist = math.hypot(*b)
        if dist < 1.0: continue
        ic = pa.cv_intercept(d['pos'][0], d['pos'][1], max(1.0, math.hypot(d['pos'][2], d['pos'][3])), c[0], c[1], c[2], c[3])
        along = -(b[0] * u[0] + b[1] * u[1])
        stage = d['stage'] or ('none: ' + (d.get('kind') or '?') + ('[' + ','.join(sorted(d.get('tags') or [])) + ']' if d.get('tags') is not None else ''))
        # Lead (Rules' tackle_geometry.py convention): angle off his line of sight, + toward the carrier's travel; against
        # the lead a constant-velocity intercept at his current speed needs. For his request and for his achieved velocity.
        sgn = 1 if (b[0] * c[3] - b[1] * c[2]) >= 0 else -1
        need = sgn * sang(b, ic[0]) if ic else None
        vel = (d['pos'][2], d['pos'][3])
        lead_req = sgn * sang(b, req); lead_ach = sgn * sang(b, vel) if math.hypot(*vel) > 1 else None
        acc[(grp, stage)].append(dict(need=need, dreq=(lead_req - need) if need is not None else None, dach=(lead_ach - need) if need is not None and lead_ach is not None else None,
                                      at_man=angd(req, b), at_ic=angd(req, ic[0]) if ic else None, req_along=req[0] * u[0] + req[1] * u[1],
                                      vel_along=d['pos'][2] * u[0] + d['pos'][3] * u[1], cs=cs, along=along, dist=dist))
print('plays by first-defender group:', dict(plays))
for g, v in handoff.items():
    print(f"  hand-off re-aim (coverage request -> first pursuit request), {g}: n {len(v)}, p50 {q(v, .5):.0f} deg, p75 {q(v, .75):.0f}, > 45 deg {100 * sum(x > 45 for x in v) / len(v):.0f}%")
for grp in ('old angle / overrun', 'other failure', 'stopped'):
    G = {s: v for (g, s), v in acc.items() if g == grp}
    tot = sum(len(v) for v in G.values())
    if not tot: continue
    print(f'\n{grp}: {tot} ticks')
    for s, v in sorted(G.items(), key=lambda kv: -len(kv[1])):
        print(f"  {s:<26} {100 * len(v) / tot:4.0f}% | request at the man (< 10 deg) {100 * sum(x['at_man'] < 10 for x in v) / len(v):3.0f}%, angle to the man p50 {q([x['at_man'] for x in v], .5):3.0f}, to the intercept p50 {q([x['at_ic'] for x in v], .5):3.0f}"
              f" | lead vs needed: request under by >30 deg {100 * sum(1 for x in v if x['dreq'] is not None and x['dreq'] < -30) / max(1, sum(1 for x in v if x['dreq'] is not None)):3.0f}%, achieved {100 * sum(1 for x in v if x['dach'] is not None and x['dach'] < -30) / max(1, sum(1 for x in v if x['dach'] is not None)):3.0f}% (needed p50 {q([x['need'] for x in v], .5):+.0f}, request-minus-needed p50 {q([x['dreq'] for x in v], .5):+.0f}, achieved-minus-needed p50 {q([x['dach'] for x in v], .5):+.0f})"
              f" | along his path: request p50 {q([x['req_along'] for x in v], .5):+.1f}, achieved {q([x['vel_along'] for x in v], .5):+.1f}, carrier {q([x['cs'] for x in v], .5):.1f} yd/s | position along p50 {q([x['along'] for x in v], .5):+.1f}, distance {q([x['dist'] for x in v], .5):.1f}")
