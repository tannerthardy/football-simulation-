"""Engaged lateral speed in pass protection (Flex, 2026-11-14): the same operator on NFL tracking and sim exports.

usage: python3 -I scripts/diag/pass-operators/engaged-lateral.py <plays.jsonl.gz> [...]

Dropbacks, 0.5 s to the pass (or the play's end). An offensive lineman is engaged with a defender when within 1.2 yd
of him (the come-off operator's close distance). Per engaged frame: the lineman's and the defender's speed across the
line of scrimmage (|vy|), and the lineman's lateral acceleration (|dvy/dt|) over the next frame. Interior (the three
middle linemen by y at the snap) and tackles (the outer two).
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    rows = {'interior': [], 'tackle': []}; drops = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ol = p.who('O', 'OL'); dl = p.who('D')
        if len(ol) < 5: continue
        drops += 1
        fw = raw['events'].get('pass_forward'); tend = fw if fw is not None else p.end
        y0 = sorted(ol, key=lambda o: p.pos(o, 0)[1] if p.pos(o, 0)[1] is not None else 0)
        cls = {o: ('tackle' if i in (0, len(y0) - 1) else 'interior') for i, o in enumerate(y0)}
        k0, k1 = p.k(0.5), min(p.frames - 2, p.k(tend))
        for k in range(k0, k1):
            for o in ol:
                ox, oy = p.pos(o, k)
                if ox is None: continue
                best = None
                for d in dl:
                    dx, dy = p.pos(d, k)
                    if dx is None: continue
                    dd = math.hypot(dx - ox, dy - oy)
                    if dd <= 1.2 and (best is None or dd < best[0]): best = (dd, d)
                if not best: continue
                vo = p.velocity(o, k); vd = p.velocity(best[1], k); vo2 = p.velocity(o, k + 1)
                if None in (vo[1], vd[1], vo2[1]): continue
                rows[cls[o]].append((abs(vo[1]), abs(vd[1]), abs(vo2[1] - vo[1]) / p.dt))
    print(f"== {os.path.basename(path)}: dropbacks {drops}")
    for c, R in rows.items():
        if not R: continue
        print(f"   {c:8s} engaged frames {len(R):6d} | lineman |vy| p50/p90 {q([r[0] for r in R]):.2f}/{q([r[0] for r in R], .9):.2f} | his man |vy| p50/p90 {q([r[1] for r in R]):.2f}/{q([r[1] for r in R], .9):.2f} yd/s | lineman |ay| p50/p90 {q([r[2] for r in R]):.1f}/{q([r[2] for r in R], .9):.1f} yd/s^2")
