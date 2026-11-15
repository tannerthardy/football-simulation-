"""Tools' signed off-chest angle (claude/route-speed-diag f6521776, scripts/diag/route-speed/signed_off.py), ported line for
line to the exported play format so the same definition reads NFL plays (out/mechanics/nfl-plays.jsonl.gz) and sim exports
(EXPORT_FACING=1, EXPORT_SHOULDERS=1 for the shoulders).

usage: python3 -I scripts/diag/pass-operators/signed-off.py <plays.jsonl.gz> [...]

Frames 0.8-3.4 s after the snap on pass plays; a tackle (NFL: the outermost OL each side, the export has no position T;
sim: slot LT / RT) with speed <= 3 yd/s and a defender within 1.5 yd (the nearest is "the man"); the QB at least 20 deg off
the tackle-to-man line. d = wrap(bearing(tackle -> man) - o); the QB side qside = wrap(bearing(tackle -> QB) - bearing(tackle
-> man)); away = -d if qside > 0 else d. SIGN (Tools'): POSITIVE = his chest points toward the QB's side of the man's centre
(the inside half); NEGATIVE = toward the man's outside half. The result is the same in compass or atan2 angles (d and qside
both flip). Rows split by which side the QB is on, so a compass-constant bias (which flips between them) separates from a
real offset (same sign in both).
"""
import sys, os, json, gzip, math, statistics as st, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
wrap = lambda a: (a + 180) % 360 - 180
for path in sys.argv[1:]:
    res = C.defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy') or not raw.get('o'): continue
        p = Play(raw); o = raw['o']; by = raw['ball_y']
        OL = [i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None]
        slots = [pl.get('slot') for pl in p.players]
        if any(s in ('LT', 'RT') for s in slots): tackles = [i for i in OL if slots[i] in ('LT', 'RT')]
        elif len(OL) >= 2: tackles = [min(OL, key=lambda i: p.pos(i, 0)[1]), max(OL, key=lambda i: p.pos(i, 0)[1])]
        else: continue
        qbs = p.who('O', 'QB')
        if not qbs: continue
        q = qbs[0]; D = p.who('D')
        for k in range(min(p.k(0.8), p.frames - 1), min(p.k(3.4), p.frames - 1, len(o) - 1) + 1):
            if p.pos(q, k)[0] is None: continue
            qx, qy = p.pos(q, k)
            for t in tackles:
                if p.pos(t, k)[0] is None or o[k][t] is None or p.speed(t, k) > 3: continue
                tx, ty = p.pos(t, k)
                best = None
                for j in D:
                    if p.pos(j, k)[0] is None: continue
                    dd = p.dist(t, j, k)
                    if dd < 1.5 and (best is None or dd < best[0]): best = (dd, j)
                if not best: continue
                mx, my = p.pos(best[1], k)
                brg = math.degrees(math.atan2(my - ty, mx - tx))
                d = wrap(brg - o[k][t])
                qside = wrap(math.degrees(math.atan2(qy - ty, qx - tx)) - brg)
                if abs(qside) < 20: continue
                away = -d if qside > 0 else d
                res['QB on one side' if qside > 0 else 'QB on the other side'].append(away)
    print(f"== {os.path.basename(path)}")
    for lr, v in sorted(res.items()):
        v = sorted(v); print(f"   {lr:22s} n {len(v):6d} signed (chest on the QB side of the man = +) median {v[len(v)//2]:+.1f} mean {st.mean(v):+.1f} p25/p75 {v[len(v)//4]:+.1f}/{v[3*len(v)//4]:+.1f}")
