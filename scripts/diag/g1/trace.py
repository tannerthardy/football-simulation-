"""Trace failed tackles back to the first lost opportunity (finish.ts output).
A tick is viable when, from the tackler's state, he can reach body-to-body (form) distance of the carrier's
path at constant carrier velocity within 3 s, accelerating toward that point at top speed from his current
speed along it (first-order lag tau). No turning cost: optimistic, so 'never viable' is conservative.
Control: successful initial form tackles, classified the same way.

    python3 -I scripts/diag/g1/trace.py out/g1/finish.jsonl
"""
import json, math, sys
from collections import Counter, defaultdict
P = [json.loads(l) for l in open(sys.argv[1])]

def viable(r):
    cx, cy, cvx, cvy, dx, dy, dvx, dvy, ivx, ivy, vmax, tau, form = r[8:21]
    for i in range(1, 61):
        t = i * .05
        px, py = cx + cvx * t, cy + cvy * t
        gx, gy = px - dx, py - dy
        g = math.hypot(gx, gy)
        if g <= form: return True, (gx, gy)
        s0 = max(0.0, (dvx * gx + dvy * gy) / g)
        reach = vmax * t - (vmax - s0) * tau * (1 - math.exp(-t / tau))
        if g - form <= reach: return True, (gx, gy)
    return False, None

def ang(ax, ay, bx, by):
    d = math.atan2(ay, ax) - math.atan2(by, bx)
    return abs(math.degrees(math.atan2(math.sin(d), math.cos(d))))

def classify(hist, t_event):
    if len(hist) < 3: return 'no history', None
    v = [viable(r) for r in hist]
    if not any(ok for ok, _ in v): return 'never viable (last-chance chase)', None
    if v[-1][0]: return 'viable at the attempt', None
    k = max(i for i, (ok, _) in enumerate(v) if ok)       # last viable tick
    r, nxt = hist[k], hist[min(k + 1, len(hist) - 1)]
    lead = t_event - r[0]
    cvx, cvy, ivx, ivy, vmax = r[10], r[11], r[16], r[17], r[18]
    if r[7]: return 'lost while blocked', lead
    if r[21]: return 'lost while on the ground', lead
    if r[6]: return 'lost after a whiff (recovering)', lead
    # did the carrier cut right after?
    later = [h for h in hist[k:k + 7]]
    cut = any(math.hypot(h[10], h[11]) > 1 and math.hypot(cvx, cvy) > 1 and ang(h[10], h[11], cvx, cvy) > 25 for h in later)
    if cut: return 'lost to a cut (carrier changed direction)', lead
    gx, gy = v[k][1]
    req = math.hypot(ivx, ivy)
    if req < .8 * vmax and ang(ivx, ivy, gx, gy) <= 30: return 'lost: requested speed low (gather/slow) on a good line', lead
    if ang(ivx, ivy, gx, gy) > 30: return 'lost: requested heading off the intercept', lead
    return 'lost: requested a good line at speed; body did not achieve it', lead

out = defaultdict(Counter); leads = defaultdict(list); ctrl = Counter()
for p in P:
    for h in p['holds']:
        if 'assist' in h['origin']: continue
        kind = h['origin'].split('+')[0]
        if kind == 'form' and not h['broken']:
            c, _ = classify(h['hist'], h['t']); ctrl[c] += 1; continue
        if not h['broken'] or kind not in ('lunge', 'reach', 'dive'): continue
        c, lead = classify(h['hist'], h['t']); out[f'broken {kind}'][c] += 1
        if lead is not None: leads[c].append(lead)
    for w in p.get('whiffs', []):
        if w['engaged']: continue
        c, lead = classify(w['hist'], w['t']); out[f'whiff {w["note"] or "free"}'][c] += 1
        if lead is not None: leads[c].append(lead)
for k, C in out.items():
    n = sum(C.values())
    print(f'{k} (n {n}):')
    for c, v in C.most_common(): print(f'   {100 * v / n:4.0f}%  {c}')
tot = Counter()
for C in out.values(): tot.update(C)
n = sum(tot.values())
print(f'ALL failures (n {n}):')
for c, v in tot.most_common():
    L = sorted(leads[c]); print(f'   {100 * v / n:4.0f}%  {c}' + (f'   (lost {L[len(L) // 2]:.2f} s before the attempt, p50)' if L else ''))
n = sum(ctrl.values()); print(f'CONTROL: successful form tackles (n {n}): ' + ', '.join(f'{c} {100 * v / n:.0f}%' for c, v in ctrl.most_common()))

# Detail: at the last viable tick of 'heading off' and 'speed low' failures, what was he asking for?
det = defaultdict(list)
for p in P:
    items = [(h['hist'], h['t']) for h in p['holds'] if 'assist' not in h['origin'] and h['broken'] and h['origin'].split('+')[0] in ('lunge', 'reach', 'dive')]
    items += [(w['hist'], w['t']) for w in p.get('whiffs', []) if not w['engaged']]
    for hist, t in items:
        c, lead = classify(hist, t)
        if not c.startswith('lost: requested'): continue
        v = [viable(r) for r in hist]
        k = max(i for i, (ok, _) in enumerate(v) if ok); r = hist[k]
        gx, gy = v[k][1]; nx, ny = r[8] - r[12], r[9] - r[13]
        ivx, ivy = r[16], r[17]
        det[c].append(dict(dist=r[1], toNow=ang(ivx, ivy, nx, ny), toInt=ang(ivx, ivy, gx, gy), lead=ang(nx, ny, gx, gy),
                           req=math.hypot(ivx, ivy) / r[18], spd=r[4] / r[18], cs=math.hypot(r[10], r[11]), cosA=r[5]))
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for c, L in det.items():
    print(f'\n{c} (n {len(L)}) at the last viable tick, p25/50/75:')
    for key in ('dist', 'toNow', 'toInt', 'lead', 'req', 'spd', 'cs', 'cosA'):
        print(f'   {key:6s} {q([x[key] for x in L], .25):6.2f} {q([x[key] for x in L]):6.2f} {q([x[key] for x in L], .75):6.2f}')
