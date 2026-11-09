"""COV-1 step 2: how fast a zone defender gives ground over a vertical receiver, by cushion.
Every frame in the 1.0 s before the throw (zone pass plays): pairs of a zone defender (3+ yd off the
ball at the snap, not rushing) and the nearest eligible receiver within 4 yd who is running downfield
> 4 yd/s and is shallower than the defender. By cushion band (defender x - receiver x), alignment
(wide = more than 9 yd from the QB at the snap) and receiver depth (under/over 10 yd): n, defender
downfield speed p50, pace ratio p50 (defender vx / receiver vx), and the share matching (ratio > 0.8).
usage: carrypace.py FILE..."""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
CUSH = ((0, 1), (1, 2), (2, 3), (3, 5))
for path in sys.argv[1:]:
    g = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass': continue
        ev = raw.get('events') or {}; t0 = ev.get('pass_forward')
        if t0 is None or coverage_family((raw.get('cell') or {}).get('coverage')) != 'zone': continue
        p = Play(raw); k0 = p.k(t0)
        qbs = p.who('O', 'QB'); qy = p.pos(qbs[0], 0)[1] if qbs else None
        if qy is None: continue
        recv = [o for o in p.who('O') if p.players[o].get('group') not in ('OL', 'QB')]
        defs = []
        for d in p.who('D'):
            x0, x1 = p.pos(d, 0)[0], p.pos(d, p.k(1))[0]
            if x0 is None or x1 is None or x0 < 3 or x1 < x0 - .5: continue
            defs.append((d, abs(p.pos(d, 0)[1] - qy) > 9))
        for k in range(max(1, k0 - 10), k0 + 1):
            for d, wide in defs:
                dx, dy = p.pos(d, k)
                if dx is None: continue
                near = [(p.dist(d, o, k), o) for o in recv if p.pos(o, k)[0] is not None]
                near = [x for x in near if x[0] < 4]
                if not near: continue
                _, o = min(near); ovx = p.velocity(o, k)[0]; rx = p.pos(o, k)[0]
                cush = dx - rx
                if ovx <= 4 or cush <= 0 or cush >= 5: continue
                band = next(b for b in CUSH if b[0] <= cush < b[1])
                key = ('wide' if wide else 'box', 'rcv<10' if rx < 10 else 'rcv10+', band)
                vx = p.velocity(d, k)[0]
                o_ = g.setdefault(key, ([], []))
                o_[0].append(vx); o_[1].append(vx / ovx)
    print(path.split('/')[-1][:30])
    for key in sorted(g):
        vx, ratio = g[key]
        print(f"  {key[0]:4s} {key[1]:6s} cushion {key[2][0]}-{key[2][1]}: n {len(vx):6d} D vx {q(vx)} pace {q(ratio)} matching {sum(r > .8 for r in ratio) / len(ratio):.2f}")
