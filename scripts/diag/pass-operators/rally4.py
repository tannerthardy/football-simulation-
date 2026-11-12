"""The rally from 4+ yd on short zone catches, same code for NFL and sim common format. Observation only.
Population (underneath.py's): zone-family completions caught 0-10 yd past the line, where the underneath LB/DB nearest
the catch point at the throw is 4+ yd from the catcher at the catch. The first and second defender: the two defenders
nearest the catcher at the catch (any group). For each, every 0.2 s from the catch to +1.4 s while the play is live: his
distance, speed, closing speed (velocity toward the catcher), and the catcher's speed; his time to within 1 yd (never
by +2.0 s); closing-speed curve against distance. Achieved motion only (requests are in rally4.mts, sim only).
usage: python3 -I scripts/diag/pass-operators/rally4.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, statistics as st
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa
MARKS = (0, .2, .4, .6, .8, 1.0, 1.2, 1.4)


def q(v, f='{:.1f}'):
    v = sorted(x for x in v if x is not None)
    return '-' if not v else '/'.join(f.format(v[int(p * (len(v) - 1))]) for p in (.25, .5, .75))


for arg in sys.argv[1:]:
    name, paths = arg.split('=')
    rows = {1: [], 2: []}; yac = []; reach = {1: [], 2: []}; curve = {1: {}, 2: {}}
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
            if raw.get('kind') != 'pass' or 'catch' not in ev or 'pass_forward' not in ev or raw.get('target') is None: continue
            if coverage_family((raw.get('cell') or {}).get('coverage')) != 'zone': continue
            p = Play(raw); t = raw['target']
            if p.players[t]['side'] != 'O': continue
            kt, kc, kl = p.k(ev['pass_forward']), p.k(ev['catch']), p.k(p.end)
            cx, cy = p.pos(t, kc)
            if cx is None or not (0 <= cx <= 10): continue
            qb = next((i for i, a in enumerate(p.players) if a['side'] == 'O' and a['group'] == 'QB'), None)
            U = [d for d in p.who('D') if p.players[d]['group'] in ('LB', 'DB') and p.pos(d, kt)[0] is not None
                 and 1 <= p.pos(d, kt)[0] <= 12 and not (qb is not None and p.pos(qb, kt)[0] is not None and p.dist(d, qb, kt) < 3)]
            if not U: continue
            u = min(U, key=lambda d: math.hypot(p.pos(d, kt)[0] - cx, p.pos(d, kt)[1] - cy))
            if p.dist(u, t, kc) < 4: continue
            D = sorted((d for d in p.who('D') if p.pos(d, kc)[0] is not None), key=lambda d: p.dist(d, t, kc))[:2]
            yac.append((raw.get('yards') or 0) - cx)
            for rank, d in enumerate(D, 1):
                hit = None
                for k in range(kc, min(kl, kc + round(2.0 / p.dt)) + 1):
                    if p.pos(d, k)[0] is not None and p.pos(t, k)[0] is not None and p.dist(d, t, k) <= 1.0: hit = (k - kc) * p.dt; break
                reach[rank].append(hit)
                for m in MARKS:
                    k = kc + round(m / p.dt)
                    if k > kl or p.pos(d, k)[0] is None or p.pos(t, k)[0] is None: continue
                    dist = p.dist(d, t, k)
                    if m > 0 and dist <= 1.0: continue
                    (x, y), (tx, ty) = p.pos(d, k), p.pos(t, k); vx, vy = p.velocity(d, k)
                    clo = (vx * (tx - x) + vy * (ty - y)) / (dist or 1)
                    cvx, cvy = p.velocity(t, k); away = (cvx * (tx - x) + cvy * (ty - y)) / (dist or 1)
                    # the angle between his velocity and the line to the catcher (0 = straight at him)
                    s_ = math.hypot(vx, vy); aim = math.degrees(math.acos(max(-1, min(1, clo / s_)))) if s_ > .5 else None
                    rows[rank].append((m, dist, s_, clo, p.speed(t, k), away, aim))
                    curve[rank].setdefault(min(int(dist), 8), []).append(clo)
    n = len(yac)
    if not n: print(f'== {name}: none'); continue
    print(f'== {name}: zone catches 0-10 yd, responsible underneath defender 4+ yd at the catch, n {n}; YAC mean {st.mean(yac):.2f} p50 {st.median(yac):.1f}, 10+ {sum(y >= 10 for y in yac) / n:.0%}')
    for rank in (1, 2):
        R = reach[rank]; got = [r for r in R if r is not None]
        print(f'   defender {rank}: within 1 yd by +2.0 s {len(got) / len(R):.0%}, time p25/p50/p75 {q(got, "{:.2f}")} s')
        for m in MARKS:
            X = [r for r in rows[rank] if r[0] == m]
            if len(X) >= 5:
                print(f'      +{m:.1f} s n {len(X):4}: dist {q([x[1] for x in X])} | speed {q([x[2] for x in X])} | closing {q([x[3] for x in X], "{:+.1f}")} | catcher speed {q([x[4] for x in X])}, away from him {q([x[5] for x in X], "{:+.1f}")} | his angle off the catcher {q([x[6] for x in X], "{:.0f}")} deg')
        print('      closing p50 by distance: ' + ', '.join(f'{k}-{k + 1}' + (f'+' if k == 8 else '') + f' yd {st.median(v):+.1f} (n {len(v)})' for k, v in sorted(curve[rank].items()) if len(v) >= 10))
