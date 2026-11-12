"""Underneath zone defenders on short catches, same code for NFL and sim common format. Observation only.
Population: zone-family completions caught 0-10 yd past the line. Underneath defenders: LB/DB group, at the throw past
the line (x >= 1) and no deeper than 12 yd, more than 3 yd from the QB (not rushing). The responsible one: nearest to the
catch point (the catcher's spot at the catch) at the throw. Role by his lateral spot at the throw: hook (within 6 yd
of the ball laterally) or curl/flat (outside it).
For him: snap depth; depth and lateral at the throw; depth past the catch point at the throw (+ = deeper than it);
backpedal speed at the throw (+ = still dropping); break delay = first time from the throw his velocity points within
45 deg of the catch point at 1.5+ yd/s (0 = already at the throw; never = not by the catch); at the catch his distance
to the catcher and whether he is moving away; YAC.
usage: python3 -I scripts/diag/pass-operators/underneath.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, statistics as st, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa


def q(v, f='{:.1f}'):
    v = sorted(x for x in v if x is not None)
    return '-' if not v else '/'.join(f.format(v[int(p * (len(v) - 1))]) for p in (.25, .5, .75))


for arg in sys.argv[1:]:
    name, paths = arg.split('=')
    R = []
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
            by = raw.get('ball_y', 26.65)
            U = []
            for d in p.who('D'):
                if p.players[d]['group'] not in ('LB', 'DB'): continue
                x, y = p.pos(d, kt)
                if x is None or not (1 <= x <= 12): continue
                if qb is not None and p.pos(qb, kt)[0] is not None and p.dist(d, qb, kt) < 3: continue
                U.append(d)
            if not U: continue
            d = min(U, key=lambda d: math.hypot(p.pos(d, kt)[0] - cx, p.pos(d, kt)[1] - cy))
            x0 = p.pos(d, 0)[0]; x, y = p.pos(d, kt); vx, vy = p.velocity(d, kt)
            brk = None
            for k in range(kt, kc + 1):
                X, Y = p.pos(d, k); VX, VY = p.velocity(d, k)
                if X is None: continue
                L = math.hypot(cx - X, cy - Y) or 1; s = math.hypot(VX, VY)
                if s >= 1.5 and (VX * (cx - X) + VY * (cy - Y)) / (L * s) >= math.cos(math.radians(45)):
                    brk = (k - kt) * p.dt; break
            dc = p.dist(d, t, kc); (X, Y), (TX, TY) = p.pos(d, kc), p.pos(t, kc); VX, VY = p.velocity(d, kc)
            away = (VX * (TX - X) + VY * (TY - Y)) < 0 and math.hypot(VX, VY) > .5
            R.append(dict(role='hook' if abs(y - by) < 6 else 'curl/flat', x0=x0, x=x, lat=abs(y - by), over=x - cx,
                          dist_t=math.hypot(x - cx, y - cy), back=vx, brk=brk, dc=dc, away=away, air=(kc - kt) * p.dt,
                          yac=(raw.get('yards') or 0) - cx, catch_x=cx))
    if not R: print(f'== {name}: none'); continue
    print(f'== {name}: zone completions caught 0-10 yd past the line with an underneath defender, n {len(R)} (p25/p50/p75)')
    for role in ('hook', 'curl/flat', None):
        X = [r for r in R if role is None or r['role'] == role]
        if not X: continue
        nb = sum(r['brk'] is None for r in X)
        print(f"   {role or 'all':9} n {len(X):4}: snap depth {q([r['x0'] for r in X])} | at the throw depth {q([r['x'] for r in X])}, lateral {q([r['lat'] for r in X])},"
              f" past the catch point {q([r['over'] for r in X], '{:+.1f}')}, from it {q([r['dist_t'] for r in X])}, backpedal {q([r['back'] for r in X], '{:+.1f}')} yd/s,"
              f" air {q([r['air'] for r in X], '{:.2f}')} s | break after the throw {q([r['brk'] for r in X], '{:.2f}')} s (already at the throw {sum(r['brk'] == 0 for r in X) / len(X):.0%}, never {nb / len(X):.0%})"
              f" | at the catch dist {q([r['dc'] for r in X])}, moving away {sum(r['away'] for r in X) / len(X):.0%} | YAC mean {st.mean(r['yac'] for r in X):.2f} p50 {st.median(r['yac'] for r in X):.1f}")
    for lo, hi in ((0, 2), (2, 4), (4, 7), (7, 99)):
        X = [r for r in R if lo <= r['dc'] < hi]
        if X: print(f"   at the catch {lo}-{hi} yd n {len(X):4} ({len(X) / len(R):.0%}): YAC mean {st.mean(r['yac'] for r in X):.2f} p50 {st.median(r['yac'] for r in X):.1f} p90 {sorted(r['yac'] for r in X)[int(.9 * (len(X) - 1))]:.1f}, 10+ {sum(r['yac'] >= 10 for r in X) / len(X):.0%}, share of all YAC {sum(r['yac'] for r in X) / max(1e-9, sum(r['yac'] for r in R)):.0%}")
