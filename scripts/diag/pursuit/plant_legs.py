"""The plant, NFL vs ours, one operator on tracks (open-census play format through the end of the play; bench tracks of plant_bench.mts).
  python3 -I scripts/diag/pursuit/plant_legs.py NFLCATCH.jsonl.gz NFLRUN.jsonl.gz SIM=SIMFULL...,SIMRUNS... [--bench plant-bench.jsonl.gz] [--out report.md]
Defenders (side D) after the catch or handoff, no other body within 1 yd (any player) from 0.3 s before to 0.9 s after the thing measured, within 25 yd of the carrier.
Speed = the centred 0.2 s displacement; along-track acceleration = the centred 0.4 s speed difference; heading rate = the 0.4 s centred displacement direction change; a_n = speed x heading rate.
Leg 1, braking: a turn of 60 degrees or more (turn_speed.py's finder, seeded 0.3 rad/s) whose speed before it is 4.75 yd/s or more; the brake runs from b = the last frame at or before the turn's start where he is still within 3% of his
fastest speed in the second before, to the lowest speed in b .. e+8; mean deceleration = (v_b - v_min) / time, peak = the largest 0.4 s centred deceleration inside; kept when v_min <= 0.75 v_b.
Leg 2, the low-speed redirect: frames inside turns of 45 degrees or more with speed 1-3.5 yd/s: heading rate and a_n, p50 / p90 / p99, and the combined acceleration |a| = hypot(a_t, a_n)
by how much of it is braking (share of |a| along the track, braking only: under 1/3, 1/3-2/3, over 2/3): the friction-circle test is whether the p99 of |a| stays near one value across those shares.
Leg 3, re-acceleration: after a turn of 60 degrees or more whose lowest speed (m) is under 3.5 yd/s: the time and speed after 2 and 4 yd of path from m.
Composite: at a frame f0 where he has run steadily (speed within 15% over 0.5 s, heading within 15 degrees) at 4.75-9.5 yd/s, the first frame within 4.5 s where he is at range d +-0.75 yd from where he was at f0 and at bearing +-15 degrees of 90 or 120 degrees
off his heading then; time and path; frames f0 at least 1 s apart per player; no other body within 1 yd from 0.5 s before f0 to 0.3 s after the arrival. (A sample of what defenders chose to do: the fast tail, not the mean, is the comparison to the bench's best strategy.)"""
import gzip, json, sys, math, collections
import numpy as np
argv = sys.argv[1:]
def opt(n):
    if n in argv:
        i = argv.index(n); v = argv[i + 1]; del argv[i:i + 2]; return v
OUT = opt('--out'); BENCH = opt('--bench')
nfl = [a for a in argv if '=' not in a]
sims = {a.split('=', 1)[0]: a.split('=', 1)[1].split(',') for a in argv if '=' in a}
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
def spd(X, Y, f, nf, h=1):
    a, b = max(0, f - h), min(nf - 1, f + h)
    return math.hypot(X[b] - X[a], Y[b] - Y[a]) / ((b - a) / 10.0)
def hd(X, Y, f, nf):
    a, b = max(0, f - 2), min(nf - 1, f + 2)
    return math.atan2(Y[b] - Y[a], X[b] - X[a])
SEED, KEEP = 0.3, 0.15
def turns(X, Y, lo, hi):
    nf = len(X); rate = [0.0] * nf; out = []
    for f in range(3, nf - 3):
        a, b = (X[f] - X[f - 2], Y[f] - Y[f - 2]), (X[f + 2] - X[f], Y[f + 2] - Y[f])
        rate[f] = wrap(math.atan2(b[1], b[0]) - math.atan2(a[1], a[0])) / 0.4 if math.hypot(*a) > 0.4 and math.hypot(*b) > 0.4 else 0.0
    f = 3
    while f < nf - 3:
        if abs(rate[f]) < SEED: f += 1; continue
        sg = 1 if rate[f] > 0 else -1; s = e = f
        while s - 1 >= 3 and rate[s - 1] * sg >= KEEP: s -= 1
        g = e + 1
        while g < nf - 3 and g - e <= 2:
            if rate[g] * sg >= KEEP: e = g
            g += 1
        f = e + 1
        if not (lo <= s < hi) or s < 12 or e + 14 >= nf: continue
        ang = abs(math.degrees(wrap(hd(X, Y, e + 1, nf) - hd(X, Y, s - 1, nf))))
        if ang >= 20: out.append((s, e, ang, rate))
    return out
def free(P, i, lo, hi, X, Y, n):
    lo, hi = max(0, lo), min(X.shape[1], hi)
    return not any(np.hypot(X[j, lo:hi] - X[i, lo:hi], Y[j, lo:hi] - Y[i, lo:hi]).min() < 1.0 for j in range(n) if j != i)
ENT = [(4.75, 6.25, '5.5'), (6.25, 7.75, '7'), (7.75, 9.5, '8.5')]
entb = lambda v: next((l for lo, hi, l in ENT if lo <= v < hi), None)
def analyse(X, Y, lo, hi, near=None):
    """per-track measurements for one body (X, Y lists): brake events, low-speed frames, re-acceleration"""
    nf = len(X); res = dict(brake=[], low=[], reacc=[])
    clear = lambda a, b: near is None or not any(near[max(0, a):min(nf, b)])
    for s, e, ang, rate in turns(X, Y, lo, hi):
        sp = [spd(X, Y, f, nf) for f in range(nf)]
        if not clear(s - 12, e + 14): continue
        if ang >= 60:
            pre = max(sp[s - 10:s + 1]); 
            if pre >= 4.75:
                b = s
                while b > s - 10 and sp[b] < 0.97 * pre: b -= 1
                mm = min(range(b, min(nf - 1, e + 9)), key=lambda q: sp[q]); vb, vm = sp[b], sp[mm]
                if vm <= 0.75 * vb and mm > b and entb(vb):
                    dec = [(sp[q - 2] - sp[q + 2]) / 0.4 for q in range(max(b, 2), min(mm + 1, nf - 2))]
                    res['brake'].append(dict(ent=entb(vb), vb=vb, vm=vm, mean=(vb - vm) / ((mm - b) / 10.0), peak=max(dec) if dec else float('nan'), t=(mm - b) / 10.0, ang=ang, dist=sum(math.hypot(X[q + 1] - X[q], Y[q + 1] - Y[q]) for q in range(b, mm))))
            mm = min(range(max(s - 3, 0), min(nf - 1, e + 9)), key=lambda q: sp[q])
            if sp[mm] < 3.5:
                cum = 0.0; t2 = t4 = v2 = v4 = None
                for q in range(mm, min(nf - 1, mm + 40)):
                    cum += math.hypot(X[q + 1] - X[q], Y[q + 1] - Y[q])
                    if t2 is None and cum >= 2.0: t2, v2 = (q + 1 - mm) / 10.0, sp[q + 1]
                    if t4 is None and cum >= 4.0: t4, v4 = (q + 1 - mm) / 10.0, sp[q + 1]; break
                if t4 is not None: res['reacc'].append(dict(vm=sp[mm], t2=t2, v2=v2, t4=t4, v4=v4))
        if ang >= 45:
            for q in range(s, e + 1):
                if 1.0 <= sp[q] < 3.5 and 2 <= q < nf - 2:
                    w = abs(wrap(hd(X, Y, q + 1, nf) - hd(X, Y, q - 1, nf))) / 0.2
                    at = (sp[q + 2] - sp[q - 2]) / 0.4; an = sp[q] * w
                    res['low'].append((sp[q], w, an, at))
    return res
def composite(X, Y, lo, hi, near=None):
    nf = len(X); out = []; f0 = max(lo, 6)
    while f0 < min(hi, nf - 46):
        sp0 = spd(X, Y, f0, nf)
        if entb(sp0):
            win = [spd(X, Y, q, nf) for q in range(f0 - 5, f0 + 1)]
            h = [hd(X, Y, q, nf) for q in range(f0 - 5, f0 + 1)]
            if min(win) >= 0.85 * sp0 and max(win) <= 1.15 * sp0 and max(abs(math.degrees(wrap(x - h[-1]))) for x in h) < 15:
                h0 = h[-1]; x0, y0 = X[f0], Y[f0]; done = set(); path = 0.0
                for q in range(f0, f0 + 46):
                    path += math.hypot(X[q + 1] - X[q], Y[q + 1] - Y[q]) if q > f0 else 0.0
                    dx, dy = X[q] - x0, Y[q] - y0; r = math.hypot(dx, dy); b = abs(math.degrees(wrap(math.atan2(dy, dx) - h0)))
                    for d in (6, 9, 12):
                        for th in (90, 120):
                            if (d, th) not in done and abs(r - d) <= 0.75 and abs(b - th) <= 15 and q - f0 >= 3 and (near is None or not any(near[f0 - 5:q + 3])): done.add((d, th)); out.append(dict(ent=entb(sp0), v0=sp0, d=d, th=th, T=(q - f0) / 10.0, path=path))
                f0 += 10; continue
        f0 += 1
    return out
def run(paths):
    R = dict(brake=[], low=[], reacc=[], comp=[], compall=[])
    for path in paths:
        for l in gzip.open(path, 'rt'):
            p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); c = p.get('catch'); r = p.get('recv')
            if c is None or r is None or r < 0: continue
            nf = X.shape[1]; n = len(p['players'])
            for i, q in enumerate(p['players']):
                if q['side'] != 'D': continue
                if np.hypot(X[i, c:] - X[r, c:], Y[i, c:] - Y[r, c:]).min() > 25: continue
                xs, ys = X[i].tolist(), Y[i].tolist()
                near = np.zeros(nf, bool)
                for j in range(n):
                    if j != i: near |= np.hypot(X[j] - X[i], Y[j] - Y[i]) < 1.0
                near = near.tolist()
                a = analyse(xs, ys, c, nf, near)
                # keep only events with no other body within 1 yd around them; brake / reacc events carry their frames loosely: use the whole turn window
                for key in ('brake', 'reacc'):
                    for ev in a[key]: R[key].append(ev)
                R['low'] += a['low']
                R['comp'] += composite(xs, ys, c, nf, near); R['compall'] += composite(xs, ys, c, nf, None)
    return R
m = lambda v: float(np.mean(v)) if len(v) else float('nan')
q = lambda v, k: float(np.percentile(v, k)) if len(v) else float('nan')
data = {'NFL': run(nfl)}
for lab, ps in sims.items(): data[lab] = run(ps)
bench = None
if BENCH:
    bench = dict(brake=[], low=[], reacc=[], comp=[])
    for l in gzip.open(BENCH, 'rt'):
        p = json.loads(l); X = p['x'][0]; Y = p['y'][0]; a = analyse(X, Y, p['t0'] - 2, len(X))
        for ev in a['brake']: ev['strategy'] = p['strategy']; bench['brake'].append(ev)
        for ev in a['reacc']: ev['strategy'] = p['strategy']; bench['reacc'].append(ev)
        bench['low'] += a['low']
        if p['strategy'] == 'brake':
            sp = [spd(X, Y, f, len(X)) for f in range(len(X))]; t0 = p['t0']; vb = sum(sp[t0 - 3:t0]) / 3
            mm = min(range(t0, len(X) - 2), key=lambda q: sp[q]); dec = [(sp[f - 2] - sp[f + 2]) / 0.4 for f in range(max(t0, 2), mm)]
            bench['brake'].append(dict(ent=entb(vb), vb=vb, vm=sp[mm], mean=(vb - sp[mm]) / max(0.1, (mm - t0) / 10.0), peak=max(dec), t=(mm - t0) / 10.0, ang=0, dist=0, strategy='brake (to rest)'))
lines = []; P = lambda s='': lines.append(s)
P('## The plant, NFL vs ours (no other body within 1 yd; defenders within 25 yd of the carrier after the catch or handoff)\n')
P('### Leg 1: braking into a redirect of 60 degrees or more (speed before it 4.75 yd/s or more; the brake ends at the lowest speed)\n')
P('| entry | sample | n | speed before | lowest speed | mean decel (yd/s2) | peak decel (yd/s2, p50 / p90 / p99) | brake time (s) | brake distance (yd) |'); P('|---|---|---|---|---|---|---|---|---|')
for ent in ('5.5', '7', '8.5'):
    for lab, R in data.items():
        S = [e for e in R['brake'] if e['ent'] == ent]
        if len(S) >= 8: P(f'| {ent} | {lab} | {len(S)} | {m([e["vb"] for e in S]):.1f} | {m([e["vm"] for e in S]):.1f} | {m([e["mean"] for e in S]):.1f} | {q([e["peak"] for e in S], 50):.1f} / {q([e["peak"] for e in S], 90):.1f} / {q([e["peak"] for e in S], 99):.1f} | {m([e["t"] for e in S]):.2f} | {m([e["dist"] for e in S]):.1f} |')
    if bench:
        for name, sel in (('bench plant (to 3.5 or 1.5 yd/s, then a new heading)', lambda e: e.get('strategy', '').startswith('plant')), ('bench brake to rest', lambda e: e.get('strategy', '').startswith('brake'))):
            S = [e for e in bench['brake'] if e['ent'] == ent and sel(e)]
            if S: P(f'| {ent} | {name} | {len(S)} | {m([e["vb"] for e in S]):.1f} | {m([e["vm"] for e in S]):.1f} | {m([e["mean"] for e in S]):.1f} | {q([e["peak"] for e in S], 50):.1f} / {q([e["peak"] for e in S], 90):.1f} / {q([e["peak"] for e in S], 99):.1f} | {m([e["t"] for e in S]):.2f} | {m([e["dist"] for e in S]):.1f} |')
P('')
P('### Leg 2: the low-speed redirect (frames inside turns of 45 degrees or more, speed 1-3.5 yd/s)\n')
P('| speed band | sample | frames | heading rate (rad/s, p50 / p90 / p99) | lateral accel a_n (yd/s2, p50 / p90 / p99) | combined \\|a\\| p99 by braking share: under 1/3 | 1/3-2/3 | over 2/3 |'); P('|---|---|---|---|---|---|---|---|')
def lowrows(lab, L):
    for lo, hi in ((1, 2), (2, 3), (3, 3.5)):
        S = [x for x in L if lo <= x[0] < hi]
        if len(S) < 30: continue
        def sec(a, b): 
            Z = [math.hypot(x[3], x[2]) for x in S if a <= (max(0, -x[3]) / max(1e-6, math.hypot(x[3], x[2]))) < b]
            return f'{q(Z, 99):.1f} (n {len(Z)})' if len(Z) >= 15 else '-'
        P(f'| {lo}-{hi} | {lab} | {len(S)} | {q([x[1] for x in S], 50):.1f} / {q([x[1] for x in S], 90):.1f} / {q([x[1] for x in S], 99):.1f} | {q([x[2] for x in S], 50):.1f} / {q([x[2] for x in S], 90):.1f} / {q([x[2] for x in S], 99):.1f} | {sec(0, 1/3)} | {sec(1/3, 2/3)} | {sec(2/3, 1.01)} |')
for lab, R in data.items(): lowrows(lab, R['low'])
if bench: lowrows('bench', bench['low'])
P('')
P('### Leg 3: re-acceleration out of the plant (lowest speed under 3.5 yd/s; time and speed after 2 and 4 yd of path from the lowest-speed frame)\n')
P('| sample | n | lowest speed | 2 yd: time (s) / speed | 4 yd: time (s) / speed | 4 yd, the quickest tenth: time (s) / the fastest tenth speed |'); P('|---|---|---|---|---|---|')
for lab, R in data.items():
    S = R['reacc']
    if len(S) >= 8: P(f'| {lab} | {len(S)} | {m([e["vm"] for e in S]):.1f} | {m([e["t2"] for e in S]):.2f} / {m([e["v2"] for e in S]):.1f} | {m([e["t4"] for e in S]):.2f} / {m([e["v4"] for e in S]):.1f} | {q([e["t4"] for e in S], 10):.2f} / {q([e["v4"] for e in S], 90):.1f} |')
if bench:
    for stn in ('plant1.5', 'plant3.5'):
        S = [e for e in bench['reacc'] if e.get('strategy') == stn]
        if S: P(f'| bench {stn} | {len(S)} | {m([e["vm"] for e in S]):.1f} | {m([e["t2"] for e in S]):.2f} / {m([e["v2"] for e in S]):.1f} | {m([e["t4"] for e in S]):.2f} / {m([e["v4"] for e in S]):.1f} | {q([e["t4"] for e in S], 10):.2f} / {q([e["v4"] for e in S], 90):.1f} |')
P('')
for key, title in (('compall', 'all defenders (other bodies may be near)'), ('comp', 'no other body within 1 yd')):
    P(f'### Composite, {title}: time and path to a point d yd away at 90 / 120 degrees off the heading (the first frame the defender is there; the fast tail is the comparison)\n')
    P('| entry | d | off travel | sample | n | time p10 / p25 / p50 (s) | path p25 / p50 (yd) |'); P('|---|---|---|---|---|---|---|')
    for ent in ('5.5', '7', '8.5'):
        for d in (6, 9, 12):
            for th in (90, 120):
                for lab, R in data.items():
                    S = [e for e in R[key] if e['ent'] == ent and e['d'] == d and e['th'] == th]
                    if len(S) >= 8: P(f'| {ent} | {d} | {th} | {lab} | {len(S)} | {q([e["T"] for e in S], 10):.1f} / {q([e["T"] for e in S], 25):.1f} / {q([e["T"] for e in S], 50):.1f} | {q([e["path"] for e in S], 25):.1f} / {q([e["path"] for e in S], 50):.1f} |')
    P('')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
