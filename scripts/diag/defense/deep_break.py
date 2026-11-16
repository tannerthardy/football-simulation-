# Deep defenders breaking on a throw (Defense, task 127 (a)). One operator over the common play format (xy at 10 Hz,
# offence attacks +x; optional per-frame facing 'o' in degrees, atan2 convention, 0 = +x) for the NFL and the sim.
# Population: pass plays with a forward pass; defenders at least 10 yd past the line of scrimmage (the ball's x at the
# snap) at the throw frame (events.pass_forward), moving at least 1 yd/s then.  Achieved only, both sides.
#   old line: his velocity at the throw.  new line: the direction of his displacement from +0.5 s to +1.0 s after the
#   throw (at least 1 yd).  break angle: old line to new line.  state at the throw (needs 'o'): facing off his velocity,
#   pedal (over 135 deg), half-open (45-135), turned and running (under 45).
# For each: speed along the new line at +0.25 / +0.5 / +1.0 s; speed along the old line at +0.1 .. +0.5 s; the time for
# his velocity to come within 20 deg of the new line.  Rows by break angle (under 45, 45-90, over 90), and by state.
#   python3 -I deep_break.py nfl=PLAYS.jsonl.gz sim=PLAYS.jsonl.gz
import sys, gzip, json, math, os
DMIN, DMAX = float(os.environ.get('DEPTH_MIN', 10)), float(os.environ.get('DEPTH_MAX', 1e9))  # depth band past the line at the throw (default: deep, 10+)
def jl(p):
    for l in gzip.open(p, 'rt'): yield json.loads(l)
def at(P, f, j):
    if f < 0 or f >= len(P['xy']): return None
    x, y = P['xy'][f][2 * j], P['xy'][f][2 * j + 1]
    return None if x is None or y is None else (x, y)
def vel(P, f, j):
    a, b = at(P, f - 1, j), at(P, f + 1, j)
    return None if a is None or b is None else ((b[0] - a[0]) / (2 * P['dt']), (b[1] - a[1]) / (2 * P['dt']))
def ang(a, b):
    return abs(math.degrees((math.atan2(a[1], a[0]) - math.atan2(b[1], b[0]) + math.pi) % (2 * math.pi) - math.pi))
def rows(P):
    ev = P.get('events', {})
    if P.get('kind') != 'pass' or 'pass_forward' not in ev or not P.get('bxy'): return []
    dt = P['dt']; F = int(round(ev['pass_forward'] / dt)); n = len(P['xy'])
    end = int(round(ev.get('end', 1e9) / dt)) if 'end' in ev else n - 1
    if F + 11 >= min(n, end + 1): return []
    los = P['bxy'][0][0]; out = []
    for j, pl in enumerate(P['players']):
        if pl['side'] != 'D': continue
        p0, v0 = at(P, F, j), vel(P, F, j)
        if p0 is None or v0 is None or not (DMIN <= p0[0] - los < DMAX) or math.hypot(*v0) < 1: continue
        a5, a10 = at(P, F + 5, j), at(P, F + 10, j)
        if a5 is None or a10 is None: continue
        d = (a10[0] - a5[0], a10[1] - a5[1]); L = math.hypot(*d)
        if L < 1: continue
        nl = (d[0] / L, d[1] / L); s0 = math.hypot(*v0); ol = (v0[0] / s0, v0[1] / s0)
        along = lambda f, u: (lambda v: None if v is None else v[0] * u[0] + v[1] * u[1])(vel(P, f, j))
        state = None
        if P.get('o') and P['o'][F] and P['o'][F][j] is not None:
            o = math.radians(P['o'][F][j]); fa = ang((math.cos(o), math.sin(o)), v0)
            state = 'pedal' if fa > 135 else 'half-open' if fa >= 45 else 'turned'
        t20 = None
        for f in range(F + 1, F + 11):
            v = vel(P, f, j)
            if v and math.hypot(*v) > 0.5 and ang(v, nl) < 20: t20 = (f - F) * dt; break
        n25 = [x for x in (along(F + 2, nl), along(F + 3, nl)) if x is not None]
        out.append(dict(brk=ang(v0, nl), state=state, s0=s0, n25=sum(n25) / len(n25) if n25 else None, n5=along(F + 5, nl), n10=along(F + 10, nl),
                        old=[along(F + k, ol) for k in range(1, 6)], t20=t20))
    return out
def q(v, p):
    v = sorted(x for x in v if x is not None)
    return v[min(len(v) - 1, int(p * (len(v) - 1) + .5))] if v else float('nan')
def show(lab, R):
    if not R: return
    t20 = [r['t20'] for r in R]
    print(f"  {lab:24s} n {len(R):5d} | speed at throw {q([r['s0'] for r in R], .5):4.1f} | along new line +0.25 / +0.5 / +1.0 s: "
          f"{q([r['n25'] for r in R], .5):4.1f} / {q([r['n5'] for r in R], .5):4.1f} / {q([r['n10'] for r in R], .5):4.1f} | "
          f"along old line +0.1..+0.5: " + ' '.join(f"{q([r['old'][k] for r in R], .5):4.1f}" for k in range(5)) +
          f" | within 20 deg of new line p50 {q(t20, .5):4.2f} s (never by 1 s {sum(x is None for x in t20) / len(R):.2f})")
for spec in sys.argv[1:]:
    kind, path = spec.split('=', 1)
    R = [r for P in jl(path) for r in rows(P)]
    print(f"== {kind}: {len(R)} defenders {DMIN:g}-{DMAX:g} yd past the line, 1+ yd/s, at a forward pass")
    for lab, lo, hi in (('break under 45 deg', 0, 45), ('break 45-90 deg', 45, 90), ('break over 90 deg', 90, 181)):
        show(lab, [r for r in R if lo <= r['brk'] < hi])
    if any(r['state'] for r in R):
        for st in ('pedal', 'half-open', 'turned'):
            for lab, lo, hi in (('45-90', 45, 90), ('over 90', 90, 181)):
                show(f"{st}, break {lab}", [r for r in R if r['state'] == st and lo <= r['brk'] < hi])
