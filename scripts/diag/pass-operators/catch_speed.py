"""usage: python3 -I scripts/diag/pass-operators/catch_speed.py [--ball out/mechanics/nfl-ball.jsonl.gz] <plays.jsonl.gz> [...]

The catch at speed (same code, NFL and sim). Population: targeted passes whose ball is well placed and untouched:
 - on target by the incoming flight line (within 1.5 yd of the target at arrival, as trail.py);
 - strict: the ball at arrival within 1 yd along his running direction and 0.5 yd across of where he is (when he is
   moving >= 1 yd/s; else within 1 yd);
 - VIEW=all (default): touched or not, so drops and dislodged balls count; VIEW=untouched drops track breaks within
   0.3 s of arrival on incompletions (deep_trail.py's touch), which also removes most drops on both sides.
Completion by his speed at arrival (bands), by where the ball comes from relative to his running line (from behind
him = over the shoulder: the ball's travel within 60 deg of his running direction; across; facing it = within 60 deg of
head-on), and by the nearest defender's distance. Depth bands: short < 10 yd, deep >= 10 yd (target's x at arrival
minus his start). Control: short balls caught facing the ball."""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
BALL = {}
if '--ball' in sys.argv:
    i = sys.argv.index('--ball'); bp = sys.argv.pop(i + 1); sys.argv.pop(i)
    for l in gzip.open(bp, 'rt'):
        b = json.loads(l); BALL[b['id']] = b['b']
def ang(ax, ay, bx, by):
    na, nb = math.hypot(ax, ay), math.hypot(bx, by)
    if na < 1e-6 or nb < 1e-6: return float('nan')
    return math.degrees(math.acos(max(-1, min(1, (ax * bx + ay * by) / (na * nb)))))
for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r); ev = r['events']
        if r['kind'] != 'pass' or 'pass_forward' not in ev or r.get('target') is None: continue
        if (r.get('labels') or {}).get('throwaway'): continue
        t = r['target']; p = Play(r)
        ka = p.k(ev.get('pass_arrived', ev['end']))
        if ka < 3 or ka >= p.frames or p.pos(t, ka)[0] is None or p.pos(t, 0)[0] is None: continue
        bxy = r.get('bxy') or BALL.get(r.get('id'))
        if not bxy or ka + 4 >= len(bxy): continue
        kf0 = p.k(ev['pass_forward']); k1, k0 = max(kf0, ka - 3), max(kf0, ka - 1)
        if k0 <= k1: continue
        (ax_, ay_), (ex, ey) = bxy[k1], bxy[k0]; lx, ly = ex - ax_, ey - ay_; LL = lx * lx + ly * ly
        if LL < 0.01: continue
        cx, cy = p.pos(t, ka); u = ((cx - ax_) * lx + (cy - ay_) * ly) / LL
        if math.hypot(ax_ + u * lx - cx, ay_ + u * ly - cy) > 1.5: continue
        comp = 'catch' in ev
        def bv(k): return (bxy[k][0] - bxy[k - 1][0], bxy[k][1] - bxy[k - 1][1])
        touched = False
        if not comp:
            for k in range(max(kf0 + 2, ka), min(len(bxy) - 1, ka + 4)):
                a_, b_ = bv(k), bv(k + 1); na, nb = math.hypot(*a_), math.hypot(*b_)
                if na > 0.05 and (nb < 0.65 * na or (nb > 1e-6 and ang(a_[0], a_[1], b_[0], b_[1]) > 25)): touched = True; break
        vx, vy = p.velocity(t, ka); s = math.hypot(vx, vy)
        bx, by = bxy[ka]
        if s >= 1:
            ux, uy = vx / s, vy / s
            al = (bx - cx) * ux + (by - cy) * uy; ac = abs(-(bx - cx) * uy + (by - cy) * ux)
            if abs(al) > 1 or ac > 0.5: continue
            a = ang(lx, ly, vx, vy)
            frm = 'from behind' if a <= 60 else 'facing it' if a >= 120 else 'across'
        else:
            if math.hypot(bx - cx, by - cy) > 1: continue
            frm = 'standing'
        D = [d for d in p.who('D') if p.pos(d, ka)[0] is not None]
        dd = min((p.dist(t, d, ka) for d in D), default=99)
        depth = p.pos(t, ka)[0] - p.pos(t, 0)[0]
        rows.append(dict(touched=touched, comp=comp, s=s, frm=frm, dd=dd, deep=depth >= 10))
    allrows = rows
    view = os.environ.get('VIEW', 'all')
    rows = [o for o in allrows if not o['touched']] if view == 'untouched' else allrows
    n = len(rows)
    print(f'== {os.path.basename(path)} [{view}]: well-placed targets n {n} (touched {sum(o["touched"] for o in allrows)} of {len(allrows)}) | completion {100*sum(o["comp"] for o in rows)/max(1,n):.0f}%')
    def line(lab, v):
        if v: print(f'   {lab:34} n {len(v):5} | completion {100*sum(o["comp"] for o in v)/len(v):3.0f}%')
    for dl, dv in (('short <10', [o for o in rows if not o['deep']]), ('deep 10+', [o for o in rows if o['deep']])):
        print(f'  {dl}:')
        for lo, hi in ((0, 3), (3, 5), (5, 6.5), (6.5, 99)): line(f'speed {lo}-{hi if hi < 99 else "+"} yd/s', [o for o in dv if lo <= o['s'] < hi])
        for f in ('from behind', 'across', 'facing it', 'standing'): line(f'ball {f}', [o for o in dv if o['frm'] == f])
        for f in ('from behind', 'across'):
            for lo, hi in ((0, 5), (5, 6.5), (6.5, 99)): line(f'  {f}, speed {lo}-{hi if hi < 99 else "+"}', [o for o in dv if o['frm'] == f and lo <= o['s'] < hi])
        for lo, hi in ((0, 1), (1, 2), (2, 4), (4, 99)): line(f'nearest defender {lo}-{hi if hi < 99 else "+"} yd', [o for o in dv if lo <= o['dd'] < hi])
        for lo, hi in ((0, 2), (2, 99)):
            for lo2, hi2 in ((0, 5), (5, 99)): line(f'  defender {lo}-{hi if hi < 99 else "+"} & speed {lo2}-{hi2 if hi2 < 99 else "+"}', [o for o in dv if lo <= o['dd'] < hi and lo2 <= o['s'] < hi2])
    line('CONTROL short, facing the ball', [o for o in rows if not o['deep'] and o['frm'] == 'facing it'])
