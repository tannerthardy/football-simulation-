"""NFL: how far a deep target ends from straight running. Same operator as deep-arrival-sim.ts's `dev`: from the target's state 0.4 s after pass_forward (position and velocity, central difference),
the straight-line extrapolation to pass_arrived against where he is (along and across his velocity then). Ball >= 15 yd past the line at arrival, named target. Includes his route's own curvature.
usage: python3 -I deep_adjust_nfl.py [PLAYS.jsonl.gz BALL.jsonl.gz]"""
import gzip, json, math, sys
plays = sys.argv[1] if len(sys.argv) > 2 else 'out/split59/nfl-plays.jsonl.gz'; ballf = sys.argv[2] if len(sys.argv) > 2 else 'out/split59/nfl-ball.jsonl.gz'
B = {}
for l in gzip.open(ballf, 'rt'):
    r = json.loads(l); B[r['id']] = r
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
rows = []
for l in gzip.open(plays, 'rt'):
    r = json.loads(l); r = r.get('common', r)
    if r['kind'] != 'pass' or r['id'] not in B or r['target'] is None: continue
    ev = r['events']
    if 'pass_arrived' not in ev or 'pass_forward' not in ev: continue
    dt = r['dt']; k1 = round(ev['pass_arrived'] / dt); k0 = round(ev['pass_forward'] / dt); b = B[r['id']]['b']; F = len(r['xy']); t = r['target']
    if k1 + 1 >= F or len(b) != F or b[k1][0] < 15: continue
    k4 = k0 + 4
    if k4 + 2 >= k1: continue
    X = lambda k: (r['xy'][k][2 * t], r['xy'][k][2 * t + 1])
    (x0, y0), (x1, y1) = X(k4 - 1), X(k4 + 1); vx, vy = (x1 - x0) / (2 * dt), (y1 - y0) / (2 * dt); sp = math.hypot(vx, vy)
    if sp < 1: continue
    T = (k1 - k4) * dt; px, py = X(k4); ax, ay = X(k1); ddx, ddy = ax - (px + vx * T), ay - (py + vy * T); ux, uy = vx / sp, vy / sp
    rows.append((math.hypot(ddx, ddy), ddx * ux + ddy * uy, abs(-ddx * uy + ddy * ux), T, B[r['id']]['passResult'] == 'C'))
print('n', len(rows), 'median seconds from throw+0.4 to arrival', q([x[3] for x in rows]))
for name, S in (('all', rows), ('complete', [x for x in rows if x[4]]), ('incomplete', [x for x in rows if not x[4]])):
    print(f'{name:10s} n {len(S):4d} total {q([x[0] for x in S])} (p25 {q([x[0] for x in S], .25)} p75 {q([x[0] for x in S], .75)}) along {q([x[1] for x in S])} across {q([x[2] for x in S])}')
