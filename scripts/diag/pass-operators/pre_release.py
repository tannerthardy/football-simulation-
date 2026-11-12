"""What an underneath zone defender's motion before the release follows. Same code on NFL (pre_release_nfl.py) and sim
(scripts/diag/risk/pre-release-export.ts) records. Observation only.
Population: zone completions caught 0-10 yd past the line; the underneath defender (LB/DB, 1-12 yd past the line at the
release, > 3 yd from the QB) nearest the catch point at the release; role hook (within 6 yd of the ball laterally at the
release) or curl/flat.
For him, from -0.5 s to the release: his speed toward the catcher (velocity . unit vector to the catcher's current
position; central differences, 10 Hz). Explanations:
 (a) the QB's body orientation on the catcher (within 20 deg of the QB->catcher direction), and for how long continuously
     before the release: >= 0.5 s / 0.2-0.5 s / < 0.2 s / not at the release;
 (b) the catcher is the eligible receiver nearest the defender at -0.3 s (he is the route in or entering his zone);
     and, when he is not, the defender's speed toward that nearest receiver (route matching regardless of the QB);
 (c) the QB's early look (mean orientation -1.0 to -0.6 s) to the catcher's side of the QB.
Then a least-squares fit of his mean speed toward the catcher over -0.3 s to the release on the three indicators,
with each indicator's share of the explained variance (Shapley, over subsets).
usage: python3 -I scripts/diag/pass-operators/pre_release.py name=a.jsonl.gz[,b] ..."""
import sys, gzip, json, math, itertools
import numpy as np

ELIG = ('WR', 'TE', 'RB')


def angdiff(a, b): return abs((a - b + math.pi) % (2 * math.pi) - math.pi)


def fit_r2(X, y):
    if X.shape[1] == 0: return 0.0
    A = np.column_stack([np.ones(len(y)), X]); beta, *_ = np.linalg.lstsq(A, y, rcond=None)
    res = y - A @ beta; return 1 - (res @ res) / (((y - y.mean()) ** 2).sum() or 1)


def shapley(X, y, names):
    k = X.shape[1]; out = {}
    for j in range(k):
        s = 0.0
        for r in range(k):
            for S in itertools.combinations([i for i in range(k) if i != j], r):
                w = math.factorial(r) * math.factorial(k - r - 1) / math.factorial(k)
                s += w * (fit_r2(X[:, list(S) + [j]], y) - fit_r2(X[:, list(S)], y))
        out[names[j]] = s
    return out


def rows(paths):
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            p = json.loads(line); xy = p['xy']; P = p['players']; rel, cat, t, qb = p['release'], p['catch'], p['target'], p['qb']
            pos = lambda i, k: (xy[k][2 * i], xy[k][2 * i + 1]) if 0 <= k < len(xy) and xy[k][2 * i] is not None else (None, None)
            if rel < 11 or rel + 1 >= len(xy): continue
            cx, cy = pos(t, cat)
            if cx is None or not (0 <= cx <= 10): continue
            qx, qy = pos(qb, rel)
            U = [d for d, a in enumerate(P) if a['side'] == 'D' and a['group'] in ('LB', 'DB') and pos(d, rel)[0] is not None
                 and 1 <= pos(d, rel)[0] <= 12 and (qx is None or math.hypot(pos(d, rel)[0] - qx, pos(d, rel)[1] - qy) > 3)]
            if not U: continue
            d = min(U, key=lambda d: math.hypot(pos(d, rel)[0] - cx, pos(d, rel)[1] - cy))
            def vel(i, k):
                (a, b), (c, e) = pos(i, k - 1), pos(i, k + 1)
                return (None, None) if a is None or c is None else ((c - a) / 0.2, (e - b) / 0.2)
            def toward(i, k):
                (x, y), (tx, ty), (vx, vy) = pos(d, k), pos(i, k), vel(d, k)
                if x is None or tx is None or vx is None: return None
                L = math.hypot(tx - x, ty - y) or 1; return (vx * (tx - x) + vy * (ty - y)) / L
            vC = {o: toward(t, rel - o) for o in (5, 3, 0)}
            if any(v is None for v in vC.values()): continue
            mean03 = np.mean([toward(t, rel - o) for o in (3, 2, 1, 0) if toward(t, rel - o) is not None])
            # (a) QB orientation on the catcher, continuous run ending at the release
            def on(k):
                f = p['qbf'][k] if k < len(p['qbf']) else None; (x, y), (tx, ty) = pos(qb, k), pos(t, k)
                return None if f is None or x is None or tx is None else angdiff(f, math.atan2(ty - y, tx - x)) <= math.radians(20)
            def ang(k):
                f = p['qbf'][k] if 0 <= k < len(p['qbf']) else None; (x, y), (tx, ty) = pos(qb, k), pos(t, k)
                return None if f is None or x is None or tx is None else math.degrees(angdiff(f, math.atan2(ty - y, tx - x)))
            run = 0
            while rel - run >= 0 and on(rel - run): run += 1
            a_cat = 'not at the release' if run == 0 else '< 0.2 s' if run <= 2 else '0.2-0.5 s' if run <= 5 else '>= 0.5 s'
            # (b) nearest eligible receiver to him at -0.3 s
            k3 = rel - 3; dx, dy = pos(d, k3)
            E = [i for i, a in enumerate(P) if a['side'] == 'O' and a['group'] in ELIG and pos(i, k3)[0] is not None]
            near = min(E, key=lambda i: math.hypot(pos(i, k3)[0] - dx, pos(i, k3)[1] - dy)) if E else None
            b = near == t
            vN = None if b or near is None else np.mean([v for v in (toward(near, rel - 3), toward(near, rel)) if v is not None] or [np.nan])
            # (c) the QB's early look to the catcher's side
            fs = [p['qbf'][k] for k in range(max(0, rel - 10), rel - 5) if k < len(p['qbf']) and p['qbf'][k] is not None]
            c = None
            if fs and qx is not None:
                lat = np.mean([math.sin(f) for f in fs]); c = (lat > 0) == ((pos(t, rel)[1] - qy) > 0)
            # (d) the catcher's route break: between -0.8 s and the release his heading turned > 45 deg (both at >= 1.5 yd/s)
            # or his speed fell by > 2 yd/s.
            (ax, ay), (bx, by_) = vel(t, rel - 8), vel(t, rel - 1)
            brk = None
            if ax is not None and bx is not None:
                sa, sb = math.hypot(ax, ay), math.hypot(bx, by_)
                brk = (sa >= 1.5 and sb >= 1.5 and (ax * bx + ay * by_) / (sa * sb) < math.cos(math.radians(45))) or sa - sb > 2
            # (e) his own orientation over the last 0.5 s: facing the QB (within 60 deg of the direction to him, on
            # average) / turned to the catcher and away from the QB (> 90 deg off the QB, within 60 deg of the catcher)
            # / other. (f) the catcher settled (< 2 yd/s at -0.3 s) or still running.
            orient = None
            if 'fo' in p:
                aq, ac = [], []
                for k in range(rel - 5, rel + 1):
                    f = p['fo'][k][d] if k < len(p['fo']) else None; (x, y), (qx2, qy2), (tx, ty) = pos(d, k), pos(qb, k), pos(t, k)
                    if f is None or x is None or qx2 is None or tx is None: continue
                    aq.append(math.degrees(angdiff(f, math.atan2(qy2 - y, qx2 - x)))); ac.append(math.degrees(angdiff(f, math.atan2(ty - y, tx - x))))
                if aq:
                    mq, mc = sum(aq) / len(aq), sum(ac) / len(ac)
                    orient = 'facing the QB' if mq <= 60 else 'to the catcher, away from the QB' if mq > 90 and mc <= 60 else 'other'
            cvx, cvy = vel(t, rel - 3); settled = None if cvx is None else math.hypot(cvx, cvy) < 2
            dyb = pos(d, rel)[1] - p['ball_y']
            yield dict(role='hook' if abs(dyb) < 6 else 'curl/flat', vC5=vC[5], vC3=vC[3], vC0=vC[0], m03=mean03, a=a_cat,
                       a_on=run >= 2, b=b, ang3=ang(rel - 3), ang0=ang(rel), rise=vC[0] - vC[5], brk=brk, orient=orient, settled=settled, vN=vN, c=c, dist5=math.hypot(pos(t, rel - 5)[0] - pos(d, rel - 5)[0], pos(t, rel - 5)[1] - pos(d, rel - 5)[1])
                       if pos(t, rel - 5)[0] is not None and pos(d, rel - 5)[0] is not None else None)


def m(v): v = [x for x in v if x is not None and x == x]; return f'{np.mean(v):+.2f}' if v else '   -'


for arg in sys.argv[1:]:
    name, paths = arg.split('=')
    R = list(rows(paths))
    print(f'== {name}: zone completions 0-10 yd with an underneath defender, n {len(R)}')
    for role in ('hook', 'curl/flat', None):
        V = [r for r in R if role is None or r['role'] == role]
        if not V: continue
        print(f'  [{role or "all"}] n {len(V)} | toward the catcher at -0.5 / -0.3 / 0 s: {m(r["vC5"] for r in V)} / {m(r["vC3"] for r in V)} / {m(r["vC0"] for r in V)} yd/s')
        print('    (a) QB oriented on the catcher, continuously before the release:')
        for a in ('>= 0.5 s', '0.2-0.5 s', '< 0.2 s', 'not at the release'):
            W = [r for r in V if r['a'] == a]
            print(f'        {a:<19} n {len(W):4d} ({100 * len(W) / len(V):3.0f}%) | toward the catcher -0.3 / 0 s {m(r["vC3"] for r in W)} / {m(r["vC0"] for r in W)}')
        print('    (a\') the rise toward the catcher (-0.5 s -> release), by the QB orientation\'s angle to the catcher:')
        for lab, key in (('at -0.3 s', 'ang3'), ('at the release', 'ang0')):
            cells = []
            for lo, hi in ((0, 20), (20, 45), (45, 181)):
                W = [r for r in V if r[key] is not None and lo <= r[key] < hi]; cells.append(f'{lo}-{min(hi, 180)} deg n {len(W):4d} rise {m(r["rise"] for r in W)}')
            print(f'        {lab:<15} ' + ' | '.join(cells))
        print(f'        all: rise {m(r["rise"] for r in V)} | nearest yes {m(r["rise"] for r in V if r["b"])}, no {m(r["rise"] for r in V if not r["b"])} | early look yes {m(r["rise"] for r in V if r["c"])}, no {m(r["rise"] for r in V if r["c"] is not None and not r["c"])}')
        cells = []
        for lo, hi in ((0, 5), (5, 10), (10, 99)):
            W = [r for r in V if r['dist5'] is not None and lo <= r['dist5'] < hi]; cells.append(f'{lo}-{hi} yd n {len(W):4d} rise {m(r["rise"] for r in W)}')
        print('        by his distance to the catcher at -0.5 s: ' + ' | '.join(cells))
        for bk in (True, False):
            W = [r for r in V if r['brk'] == bk]
            print(f'        (d) catcher broke in the last 0.8 s {"yes" if bk else "no "}: n {len(W):4d} ({100 * len(W) / len(V):3.0f}%) | toward the catcher -0.5 / -0.3 / 0 s {m(r["vC5"] for r in W)} / {m(r["vC3"] for r in W)} / {m(r["vC0"] for r in W)} | rise {m(r["rise"] for r in W)}')
        print('    (e) his own orientation over the last 0.5 s x (d) the catcher broke; rise toward the catcher (n):')
        for o in ('facing the QB', 'to the catcher, away from the QB', 'other'):
            cells = []
            for bk, lab in ((True, 'broke'), (False, 'no break')):
                W = [r for r in V if r['orient'] == o and r['brk'] == bk]; cells.append(f'{lab} {m(r["rise"] for r in W)} ({len(W)})')
            W = [r for r in V if r['orient'] == o]
            print(f'        {o:<33} n {len(W):4d} ({100 * len(W) / len(V):3.0f}%) | all {m(r["rise"] for r in W)} | ' + ' | '.join(cells))
        print('    (f) no-break plays: the catcher settled (< 2 yd/s at -0.3 s) or running, x (e); rise toward the catcher (n):')
        for st_, lab in ((True, 'settled'), (False, 'running')):
            cells = []
            for o in ('facing the QB', 'to the catcher, away from the QB', 'other'):
                W = [r for r in V if r['brk'] is False and r['settled'] == st_ and r['orient'] == o]; cells.append(f'{o} {m(r["rise"] for r in W)} ({len(W)})')
            W = [r for r in V if r['brk'] is False and r['settled'] == st_]
            print(f'        {lab:<8} n {len(W):4d} | all {m(r["rise"] for r in W)} | ' + ' | '.join(cells))
        print('    (b) the catcher is the receiver nearest him at -0.3 s:')
        for b in (True, False):
            W = [r for r in V if r['b'] == b]
            extra = f' | toward that nearest (non-catcher) receiver -0.3..0 s {m(r["vN"] for r in W)}' if not b else ''
            print(f'        {"yes" if b else "no ":<5} n {len(W):4d} ({100 * len(W) / len(V):3.0f}%) | toward the catcher -0.3 / 0 s {m(r["vC3"] for r in W)} / {m(r["vC0"] for r in W)}{extra}')
        print('    (a) x (b), toward the catcher mean -0.3 s to the release:')
        for a_on in (True, False):
            cells = []
            for b in (True, False):
                W = [r for r in V if r['a_on'] == a_on and r['b'] == b]; cells.append(f'nearest {"yes" if b else "no "}: n {len(W):4d} {m(r["m03"] for r in W)}')
            print(f'        QB on him >= 0.2 s {"yes" if a_on else "no "} | ' + ' | '.join(cells))
        print('    (c) the QB\'s early look (-1.0 to -0.6 s) to the catcher\'s side:')
        for c in (True, False):
            W = [r for r in V if r['c'] == c]
            print(f'        {"yes" if c else "no ":<5} n {len(W):4d} ({100 * len(W) / len(V):3.0f}%) | toward the catcher -0.3 / 0 s {m(r["vC3"] for r in W)} / {m(r["vC0"] for r in W)}')
        F = [r for r in V if r['c'] is not None]
        if len(F) >= 20:
            X = np.array([[float(r['a_on']), float(r['b']), float(r['c'])] for r in F]); y = np.array([r['m03'] for r in F])
            r2 = fit_r2(X, y); sh = shapley(X, y, ['(a) QB on him', '(b) nearest route', '(c) early-look side'])
            A = np.column_stack([np.ones(len(y)), X]); beta, *_ = np.linalg.lstsq(A, y, rcond=None)
            print(f'    fit, mean toward the catcher -0.3 s..release (n {len(F)}): R2 {r2:.3f}; coefficients (a) {beta[1]:+.2f} (b) {beta[2]:+.2f} (c) {beta[3]:+.2f} yd/s; '
                  + ', '.join(f'{k} {v / r2 * 100 if r2 > 0 else 0:.0f}% of R2' for k, v in sh.items()))
