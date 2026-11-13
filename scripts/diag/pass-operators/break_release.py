"""What the defender near the catch is doing at the release (same code on NFL pre_release_nfl.py cov=all and sim
pre-release-export.ts COV=all records). Observation only; tracking has no gaze, so "facing" is body orientation.
Completions. Defenders within 8 yd of the catch point at the catch, by coverage family (manzone) and by his body
orientation over the 0.5 s before the release: facing the QB (within 60 deg of him on average) / facing the receiver
(within 60 deg of the eventual catcher and more than 90 deg off the QB) / other.
At the release: closing on the eventual catch point and on the receiver's current spot (yd/s, velocity . unit vector);
onset = the first frame from -1.5 s to +0.5 s with closing on the catch point >= 1.0 yd/s for two frames, relative to
the release; the receiver's last break before the release (heading change > 45 deg over 0.3 s at >= 1.5 yd/s, or a
speed drop > 2 yd/s over 0.3 s), relative to the release; onset minus that break.
usage: python3 -I scripts/diag/pass-operators/break_release.py name=a.jsonl.gz[,b] ... [--plays N]  (N sample plays printed per side)"""
import sys, gzip, json, math, collections as C


def angdiff(a, b): return abs((a - b + math.pi) % (2 * math.pi) - math.pi)


def q(v, fs=(.25, .5, .75)):
    v = sorted(x for x in v if x is not None)
    return '-' if len(v) < 5 else '/'.join(f'{v[int(f * (len(v) - 1))]:+.1f}' for f in fs)


NP = int(sys.argv[sys.argv.index('--plays') + 1]) if '--plays' in sys.argv else 0
args = [a for a in sys.argv[1:] if '=' in a]
for arg in args:
    name, paths = arg.split('=')
    G = C.defaultdict(list); shown = 0
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            p = json.loads(line); xy, fo = p['xy'], p.get('fo'); t, qb, kr, kc = p['target'], p['qb'], p['release'], p['catch']
            if fo is None or kc is None or kr < 16 or kc + 1 >= len(xy): continue
            pos = lambda i, k: (xy[k][2 * i], xy[k][2 * i + 1]) if 0 <= k < len(xy) and xy[k][2 * i] is not None else (None, None)
            def vel(i, k):
                (a, b), (c, e) = pos(i, k - 1), pos(i, k + 1)
                return (None, None) if a is None or c is None else ((c - a) / 0.2, (e - b) / 0.2)
            cx, cy = pos(t, kc)
            if cx is None: continue
            fam = p.get('manzone') or 'Zone'
            # the receiver's last break before the release
            brk = None
            for k in range(kr, kr - 16, -1):
                (ax, ay), (bx, by_) = vel(t, k - 3), vel(t, k)
                if ax is None or bx is None: continue
                sa, sb = math.hypot(ax, ay), math.hypot(bx, by_)
                if (sa >= 1.5 and sb >= 1.5 and (ax * bx + ay * by_) / (sa * sb) < math.cos(math.radians(45))) or sa - sb > 2: brk = (k - kr) * 0.1; break
            for d, pl in enumerate(p['players']):
                if pl['side'] != 'D' or pos(d, kc)[0] is None: continue
                if math.hypot(pos(d, kc)[0] - cx, pos(d, kc)[1] - cy) > 8: continue
                def toward(k, tx, ty):
                    (x, y), (vx, vy) = pos(d, k), vel(d, k)
                    if x is None or vx is None: return None
                    L = math.hypot(tx - x, ty - y) or 1; return (vx * (tx - x) + vy * (ty - y)) / L
                cr = toward(kr, cx, cy); rx, ry = pos(t, kr)
                if cr is None or rx is None: continue
                rr = toward(kr, rx, ry)
                aq, ac = [], []
                for k in range(kr - 5, kr + 1):
                    f = fo[k][d] if k < len(fo) else None; (x, y), (qx, qy), (tx, ty) = pos(d, k), pos(qb, k), pos(t, k)
                    if f is None or x is None or qx is None or tx is None: continue
                    aq.append(math.degrees(angdiff(f, math.atan2(qy - y, qx - x)))); ac.append(math.degrees(angdiff(f, math.atan2(ty - y, tx - x))))
                if not aq: continue
                mq, mc = sum(aq) / len(aq), sum(ac) / len(ac)
                orient = 'facing QB' if mq <= 60 else 'facing receiver' if mq > 90 and mc <= 60 else 'other'
                onset = None
                for k in range(kr - 15, min(kr + 6, len(xy) - 2)):
                    a, b = toward(k, cx, cy), toward(k + 1, cx, cy)
                    if a is not None and b is not None and a >= 1 and b >= 1: onset = (k - kr) * 0.1; break
                G[(fam, orient)].append(dict(cr=cr, rr=rr, onset=onset, brk=brk, ob=(onset - brk) if onset is not None and brk is not None else None))
                if shown < NP and orient == 'facing QB' and cr >= 2:
                    shown += 1
                    print(f'   sample {name} {p["id"]}: {fam} {pl["group"]} d={d} closing on the catch point at the release {cr:+.1f}, on the receiver {rr:+.1f}; onset {onset}, receiver break {brk}; angle to QB {mq:.0f}, to catcher {mc:.0f}')
    print(f'== {name}: defenders within 8 yd of the catch, at the release (p25/p50/p75)')
    for fam in ('Zone', 'Man'):
        for o in ('facing QB', 'facing receiver', 'other'):
            V = G.get((fam, o), [])
            if len(V) < 5: continue
            tot = sum(len(G.get((fam, x), [])) for x in ('facing QB', 'facing receiver', 'other'))
            print(f'   {fam:<4} {o:<15} n {len(V):5d} ({100 * len(V) / tot:3.0f}%) | closing on the catch point {q([r["cr"] for r in V])}, > 1 yd/s {100 * sum(r["cr"] > 1 for r in V) / len(V):.0f}%'
                  f' | on the receiver {q([r["rr"] for r in V])} | onset {q([r["onset"] for r in V])} s (before the release {100 * sum(r["onset"] is not None and r["onset"] < 0 for r in V) / len(V):.0f}%)'
                  f' | receiver break {q([r["brk"] for r in V])} s (none {100 * sum(r["brk"] is None for r in V) / len(V):.0f}%) | onset - break {q([r["ob"] for r in V])} s')
