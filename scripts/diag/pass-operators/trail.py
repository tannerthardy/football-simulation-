"""usage: python3 -I scripts/diag/pass-operators/trail.py [--ball out/mechanics/nfl-ball.jsonl.gz] <plays.jsonl.gz> [...]

The trailing defender's late play (same code, NFL and sim): on-target throws whose nearest defender at arrival is
1-2 yd from the target, behind him along his run (trailing, along < -0.5) and running with him (in phase: speed >= 3
yd/s, heading within 45 deg of the receiver's). Tracking has no arms: proxies over the last 0.3 s before arrival:
 - closing on the catch point C (the target at arrival): (|D(t-0.3) - C| - |D(t) - C|) / 0.3, against his own speed;
 - his speed change over those 0.3 s (decelerating into it vs running through);
 - his final gap to C.
Outcome: completion; for catches, YAC (carrier's last x - x at arrival) and time to first contact, split by whether
he closed hard (top third of closing) or stayed on the hip (bottom two thirds)."""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
BALL = {}
if '--ball' in sys.argv:
    i = sys.argv.index('--ball'); bp = sys.argv.pop(i + 1); sys.argv.pop(i)
    for l in gzip.open(bp, 'rt'):
        b = json.loads(l); BALL[b['id']] = b['b']
def rows(path):
    out = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r); ev = r['events']
        if r['kind'] != 'pass' or 'pass_forward' not in ev or r.get('target') is None: continue
        if (r.get('labels') or {}).get('throwaway'): continue
        t = r['target']; p = Play(r)
        ka = p.k(ev.get('pass_arrived', ev['end'])); kb = ka - 3; ke = min(p.k(ev['end']), p.frames - 1)
        if kb < 1 or ka >= p.frames or p.pos(t, ka)[0] is None: continue
        bxy = r.get('bxy') or BALL.get(r.get('id'))
        if not bxy or ka >= len(bxy): continue
        # On target from the incoming flight line (the ball 0.3 s and 0.1 s before arrival) at closest approach to
        # the target at arrival, not the ball at the arrival frame: a caught ball is already in his hands there and
        # a missed one is not, which would keep the sim's catches and drop its misses.
        kf0 = p.k(ev['pass_forward']); k1, k0 = max(kf0, ka - 3), max(kf0, ka - 1)
        if k0 <= k1: continue
        (ax_, ay_), (ex, ey) = bxy[k1], bxy[k0]; lx, ly = ex - ax_, ey - ay_; LL = lx * lx + ly * ly
        if LL < 0.01: continue
        tx0, ty0 = p.pos(t, ka); u = ((tx0 - ax_) * lx + (ty0 - ay_) * ly) / LL
        if math.hypot(ax_ + u * lx - tx0, ay_ + u * ly - ty0) > 1.5: continue  # on target
        D = [d for d in p.who('D') if p.pos(d, ka)[0] is not None and p.pos(d, kb)[0] is not None]
        if not D: continue
        d = min(D, key=lambda x: p.dist(t, x, ka)); dist = p.dist(t, d, ka)
        if not (1 <= dist < 2): continue
        vx, vy = p.velocity(t, ka); s = math.hypot(vx, vy)
        if s < 2: continue
        ux, uy = vx / s, vy / s
        (cx, cy), (dx, dy) = p.pos(t, ka), p.pos(d, ka)
        along = (dx - cx) * ux + (dy - cy) * uy
        dvx, dvy = p.velocity(d, ka); ds = math.hypot(dvx, dvy)
        if along > -0.5 or ds < 3 or (dvx * ux + dvy * uy) / ds < math.cos(math.radians(45)): continue
        (bx_, by_) = p.pos(d, kb)
        close = (math.hypot(bx_ - cx, by_ - cy) - math.hypot(dx - cx, dy - cy)) / 0.3
        dsb = p.speed(d, kb)
        comp = 'catch' in ev
        o = dict(close=close, ds=ds, dsb=dsb, gap=dist, comp=comp, rs=s)
        if comp:
            xe = next((p.pos(t, k)[0] for k in range(ke, ka - 1, -1) if p.pos(t, k)[0] is not None), None)
            o['yac'] = (xe - cx) if xe is not None else None
            kf = p.k(ev['first_contact']) if 'first_contact' in ev and p.k(ev['first_contact']) >= ka else None
            o['tfc'] = (kf - ka) * p.dt if kf is not None else None
        out.append(o)
    return out
for path in sys.argv[1:]:
    v = rows(path)
    if not v: continue
    cut = q([o['close'] for o in v], 2 / 3)
    hard = [o for o in v if o['close'] >= cut]; hip = [o for o in v if o['close'] < cut]
    print(f"== {os.path.basename(path)}: trailing in-phase defender 1-2 yd at arrival, on-target throws n {len(v)} | completion {100*sum(o['comp'] for o in v)/len(v):.0f}%")
    print(f"   last 0.3 s: closing on the catch point p50 {q([o['close'] for o in v]):.1f} yd/s (p75 {q([o['close'] for o in v], .75):.1f}) vs his speed {q([o['ds'] for o in v]):.1f}; "
          f"speed change {q([o['ds'] - o['dsb'] for o in v]):+.1f} yd/s; receiver speed {q([o['rs'] for o in v]):.1f}; final gap {q([o['gap'] for o in v]):.2f}")
    for lab, w in ((f'closed hard (>= {cut:.1f})', hard), ('on the hip', hip)):
        c = [o for o in w if o['comp']]
        print(f"   {lab:22} n {len(w):4} | completion {100*len(c)/max(1,len(w)):.0f}% | after catches: YAC p50 {q([o['yac'] for o in c if o.get('yac') is not None]):.1f} (p75 {q([o['yac'] for o in c if o.get('yac') is not None], .75):.1f}), first contact p50 {q([o['tfc'] for o in c if o.get('tfc') is not None]):.2f} s, no contact {100*sum(o.get('tfc') is None for o in c)/max(1,len(c)):.0f}%")
