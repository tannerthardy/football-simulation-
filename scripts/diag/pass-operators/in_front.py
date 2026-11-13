"""Catches live at +1 s with no defender downfield of the catcher within 10 yd, by target group and wide/middle; of those, the share that become open, the nearest defender and the catcher path (same code NFL and sim).
usage: python3 -I scripts/diag/pass-operators/in_front.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
for arg in sys.argv[1:]:
    name, paths = arg.split('='); S = {}; R = C.Counter(); N = C.Counter(); O = C.Counter()
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
            if raw.get('kind') != 'pass' or 'catch' not in ev or raw.get('target') is None: continue
            p = Play(raw); c = raw['target']; k0 = p.k(ev['catch']); kl = p.k(p.end)
            if p.pos(c, k0)[0] is None or (kl - k0) * p.dt < 1.0: continue
            cx, cy = p.pos(c, k0); km = k0 + round(0.5 / p.dt)
            # "in front": a defender downfield of the catcher (x greater) within 10 yd, or between him and the near sideline within 10 yd
            pl = p.players[c]; grp = 'RB' if pl.get('group') == 'RB' or pl.get('pos') in ('RB', 'FB') else 'WR/TE'
            wide = 'wide' if min(cy, 53.33 - cy) < 10 else 'middle'
            D = [d for d in p.who('D') if p.pos(d, k0)[0] is not None]
            front = any(p.pos(d, k0)[0] > cx and p.dist(d, c, k0) <= 10 for d in D)
            kw = min(kl, k0 + round(3 / p.dt))
            mn = min(min((p.dist(d, c, k) for k in range(k0, kw + 1) if p.pos(d, k)[0] is not None and p.pos(c, k)[0] is not None), default=99) for d in D)
            if not front:
                ds = sorted((p.dist(d, c, k0), d) for d in D); d1 = ds[0][1]; k1 = min(kl, k0 + round(1 / p.dt))
                if p.pos(d1, k1)[0] is not None and p.pos(c, k1)[0] is not None:
                    cx1 = p.pos(c, k1)[0]; ang = math.degrees(math.atan2(p.velocity(c, k1)[1], p.velocity(c, k1)[0]))
                    S.setdefault((grp, wide), []).append((ds[0][0], ds[0][0] - p.dist(d1, c, k1), p.speed(c, k0), p.speed(c, k1), abs(ang), cx1 - cx, mn > 2))
            key = (grp, wide); N[key] += 1; R[key] += not front; O[key] += (not front) and mn > 2
    print(f'== {name}: catches live at +1 s with no defender downfield of the catcher within 10 yd (share; and of those, open)')
    for key in sorted(N): print(f"  {'/'.join(key):14} n {N[key]:4}: nobody in front {100*R[key]/N[key]:4.1f}%, open of those {100*O[key]/max(1,R[key]):3.0f}%")
    def q(v, f='{:.1f}'):
        v = sorted(x for x in v if x is not None); return '-' if len(v) < 5 else '/'.join(f.format(v[int(p*(len(v)-1))]) for p in (.25,.5,.75))
    for key, X in sorted(S.items()):
        print(f"   nobody in front {'/'.join(key):13} n {len(X):3}: nearest {q([x[0] for x in X])} yd, he closes {q([x[1] for x in X])} yd in 1 s; catcher speed {q([x[2] for x in X])} -> {q([x[3] for x in X])}, heading at +1 s off straight downfield {q([x[4] for x in X], '{:.0f}')} deg, downfield gain 1 s {q([x[5] for x in X])}")
