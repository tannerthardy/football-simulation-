"""Edge rushers after they come off the blocker, one operator for NFL
tracking and sim common plays (definitions as scripts/diag/pass-pressure.py:
dropbacks, edge = on the line outside the tackles at the snap, engaged =
within 1.0 yd of an offensive non-QB player for 2+ frames). For each engaged
edge rusher, from his last engaged frame before the throw: his speed, his
speed toward the QB, and his distance from that last blocker at +0.0 / +0.3
/ +0.5 s, and the blocker's speed.
usage: afterrelease.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
LAGS = (0, .3, .5)
for path in sys.argv[1:]:
    o = {l: {'s': [], 'qb': [], 'gap': [], 'bs': []} for l in LAGS}; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass': continue
        ev = raw.get('events') or {}; tt = ev.get('pass_forward')
        if tt is None or ev.get('play_action') is not None: continue
        p = Play(raw); kt = p.k(tt)
        qbs = p.who('O', 'QB'); ol = p.who('O', 'OL')
        if len(qbs) != 1 or len(ol) != 5: continue
        qb = qbs[0]; ys = sorted(p.pos(i, 0)[1] for i in ol if p.pos(i, 0)[1] is not None)
        if len(ys) < 5: continue
        blockers = [i for i in p.who('O') if i != qb]
        for d in p.who('D'):
            x0, y0 = p.pos(d, 0)
            if x0 is None or x0 > 2 or ys[0] <= y0 <= ys[-1]: continue
            run, last, lastb = 0, None, None
            for k in range(0, kt):
                if p.pos(d, k)[0] is None: break
                near = min(((p.dist(d, b, k), b) for b in blockers if p.pos(b, k)[0] is not None), default=(99, None))
                if near[0] <= 1.0:
                    run += 1
                    if run >= 2: last, lastb = k, near[1]
                else: run = 0
            if last is None or last >= kt - 1: continue
            n += 1
            for l in LAGS:
                k = last + int(round(l / p.dt))
                if k >= kt or p.pos(d, k)[0] is None or p.pos(lastb, k)[0] is None: continue
                (dx, dy), (qx, qy) = p.pos(d, k), p.pos(qb, k); g = math.hypot(qx - dx, qy - dy) or 1
                vx, vy = p.velocity(d, k)
                o[l]['s'].append(math.hypot(vx, vy)); o[l]['qb'].append((vx * (qx - dx) + vy * (qy - dy)) / g)
                o[l]['gap'].append(p.dist(d, lastb, k)); o[l]['bs'].append(p.speed(lastb, k))
    print(f'{path.split("/")[-1][:26]}  edge rushers coming off a block before the throw: {n}')
    for l in LAGS:
        print(f"  +{l}s: rusher speed {q(o[l]['s'])} (toward QB {q(o[l]['qb'])}) | from his blocker {q(o[l]['gap'])} yd | blocker speed {q(o[l]['bs'])}")
