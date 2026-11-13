"""The backside end on zone flow away, NFL (mirror of scripts/diag/concepts/backside-end.ts on rules/pa-boot).
Plays: zone runs (pff run concept inside / outside zone) and play-action passes, split by dropback type (traditional
drop vs designed rollout = boot). Play side: runs, the carrier's lateral move over the first 1.0 s after the handoff;
play action, the back's lateral move over the first 0.6 s (the fake's direction). The backside end: the defender on
the line (within 1.5 yd of it at the snap) widest on the side away from the play. At 0.5 / 1.0 / 1.5 s after the
snap: his move toward the play side (yd), depth gained into the backfield (yd), distance to the QB, speed; share
chasing (>= 1.5 yd toward the play by 1.5 s) and share rushing (>= 2 yd deep by 1.5 s). Boots: also where he is when
the QB crosses 4 yd wide of the ball toward him (distance to QB, depth, still wider than the QB or not).
usage: python3 -I scripts/diag/pass-operators/backside_end.py name=a.jsonl.gz ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
def q(v, f='{:.1f}'):
    v = sorted(x for x in v if x is not None); return '-' if len(v) < 5 else '/'.join(f.format(v[int(p*(len(v)-1))]) for p in (.25,.5,.75))
for arg in sys.argv[1:]:
    name, paths = arg.split('='); R = C.defaultdict(list); B = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {}); cell = raw.get('cell') or {}
            kind = raw.get('kind'); concept = (cell.get('concept') or '').upper()
            pa = str(cell.get('playAction')).upper() in ('TRUE', '1')
            if kind == 'run' and 'ZONE' not in concept: continue
            if kind == 'pass' and not pa: continue
            if kind not in ('run', 'pass'): continue
            p = Play(raw); by = raw.get('ball_y', 26.65)
            qb = next((i for i, pl in enumerate(p.players) if pl.get('side') == 'O' and pl.get('group') == 'QB'), None)
            if qb is None or p.pos(qb, 0)[0] is None: continue
            if kind == 'run':
                c = raw.get('carrier'); kh = p.k(ev.get('handoff', 0))
                if c is None or p.pos(c, kh)[0] is None: continue
                k1 = min(p.k(p.end), kh + round(1.0 / p.dt))
                if p.pos(c, k1)[0] is None: continue
                side = 1 if p.pos(c, k1)[1] - p.pos(c, kh)[1] > 0 else -1
                lab = 'zone run'
            else:
                rb = next((i for i, pl in enumerate(p.players) if pl.get('side') == 'O' and pl.get('group') == 'RB'), None)
                k6 = round(0.6 / p.dt)
                if rb is None or p.pos(rb, 0)[0] is None or p.pos(rb, k6)[0] is None: continue
                dy = p.pos(rb, k6)[1] - p.pos(rb, 0)[1]
                if abs(dy) < 0.5: continue
                side = 1 if dy > 0 else -1
                dt_ = str(cell.get('dropbackType') or '')
                lab = 'PA boot' if 'ROLLOUT' in dt_ else 'PA drop'
            line_ = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and abs(p.pos(d, 0)[0]) < 1.5]
            back = [d for d in line_ if (p.pos(d, 0)[1] - by) * side < 0]
            if not back: continue
            end = max(back, key=lambda d: abs(p.pos(d, 0)[1] - by)); x0, y0 = p.pos(end, 0)
            row = {}
            for T in (0.5, 1.0, 1.5):
                k = round(T / p.dt)
                if k > p.k(p.end) or p.pos(end, k)[0] is None or p.pos(qb, k)[0] is None: break
                x, y = p.pos(end, k)
                row[T] = ((y - y0) * side, -(x - x0), math.hypot(x - p.pos(qb, k)[0], y - p.pos(qb, k)[1]), p.speed(end, k))
            if 1.5 not in row: continue
            R[lab].append(row)
            if lab == 'PA boot':
                kc = next((k for k in range(len(p.xy) if hasattr(p, 'xy') else 60) if p.pos(qb, k)[0] is not None and (p.pos(qb, k)[1] - by) * -side >= 4), None)
                if kc is not None and p.pos(end, kc)[0] is not None:
                    ex, ey = p.pos(end, kc); qx, qy = p.pos(qb, kc)
                    B.append((kc * p.dt, math.hypot(ex - qx, ey - qy), -(ex - x0), (ey - qy) * -side > 0))
    print(f'== {name}: backside end (widest on the line away from the play), toward play / depth / to QB / speed at 0.5, 1.0, 1.5 s')
    for lab in ('zone run', 'PA drop', 'PA boot'):
        X = R[lab]
        if len(X) < 10: print(f'  {lab}: n {len(X)}'); continue
        cells = ' | '.join(f"{T}s: {q([r[T][0] for r in X])} / {q([r[T][1] for r in X])} / {q([r[T][2] for r in X])} / {q([r[T][3] for r in X])}" for T in (0.5, 1.0, 1.5))
        chase = 100 * sum(r[1.5][0] >= 1.5 for r in X) / len(X); rush = 100 * sum(r[1.5][1] >= 2 for r in X) / len(X)
        print(f'  {lab:8} n {len(X):4}: {cells}\n           chasing by 1.5 s {chase:.0f}%, rushing (2+ yd deep) {rush:.0f}%')
    if B:
        print(f'  boots, when the QB is 4 yd wide toward him (n {len(B)}): at {q([b[0] for b in B], "{:.2f}")} s, end to QB {q([b[1] for b in B])} yd, end depth {q([b[2] for b in B])} yd, end still outside the QB {100*sum(b[3] for b in B)/len(B):.0f}%')
