"""Tables for docs/reviews/2026-11-24-ball-drag-reconciliation.md from drag_fit.py's output (per-pass 0.1 s horizontal speeds of the thrown ball, BDB 2025 weeks 1-9).
  python3 -I scripts/diag/ball/drag_tables.py out/ball/nfl-flights.json
Prints: (1) k per air-distance band with bootstrap intervals, over the whole flight (release + 0.2 s .. arrival - 0.1 s) and without the last 0.6 s; (2) the decay rate by time before arrival, completions and incompletions;
(3) the speed distribution at 0.6-0.8 / 0.3-0.5 / 0-0.2 s before arrival; (4) a point-ball trajectory with quadratic drag k and gravity, solved to cover the NFL band's median travel in its median time (to the point 0.6 s before arrival), the speeds it
predicts at the release, mid and end, beside the NFL's. k is per yard of HORIZONTAL distance from 2D tracking."""
import sys, json, math
import numpy as np
R = json.load(open(sys.argv[1])); rng = np.random.default_rng(1); g = 10.7
def slope(sp, j0, j1):
    idx = list(range(j0, j1))
    if len(idx) < 5 or min(sp[j] for j in idx) < 8: return None
    cum = np.cumsum([0] + [s * 0.1 for s in sp]); x = np.array([(cum[j] + cum[j + 1]) / 2 for j in idx]); y = np.log([sp[j] for j in idx]); x = x - x.mean()
    return float(-(x * (y - y.mean())).sum() / (x * x).sum())
def boot(v, B=2000): v = np.array(v); return np.percentile([np.mean(rng.choice(v, len(v))) for _ in range(B)], [2.5, 97.5])
BANDS = [(0, 5), (5, 10), (10, 20), (20, 35), (35, 99)]
print('## k per air-distance band (per horizontal yd), mean and 95% bootstrap interval, median\n'); print('| air yd | window | n | k mean (CI) | k median | path factor |'); print('|---|---|---|---|---|---|')
for drop, lab in ((1, 'release+0.2 s .. arrival-0.1 s'), (6, 'release+0.2 s .. arrival-0.6 s')):
    for lo, hi in BANDS:
        ks, D, T = [], [], []
        for r in R:
            if not lo <= r['air'] < hi: continue
            k = slope(r['sp'], 2, len(r['sp']) - drop)
            if k is not None: ks.append(k); D.append(r['travel']); T.append(r['T'])
        if len(ks) < 20: continue
        h = g * np.median(T) ** 2 / 8; Dm = np.median(D); pf = math.sqrt(Dm * Dm + 16 / 3 * h * h) / Dm; ci = boot(ks)
        print(f'| {lo}-{hi} | {lab} | {len(ks)} | {np.mean(ks):.4f} ({ci[0]:.4f}..{ci[1]:.4f}) | {np.median(ks):.4f} | {pf:.3f} |')
print('\n## decay rate k x1000 by time before arrival (pairs of intervals, 0.2 s apart), air >= 15 yd\n'); print('| window before arrival (s) | completions | incompletions |'); print('|---|---|---|')
def late(sp, lo_t, hi_t):
    n = len(sp); out = []
    for j in range(2, n - 2):
        ta = (n - (j + 1.5)) * 0.1
        if lo_t <= ta < hi_t and sp[j] > 8 and sp[j + 2] > 8: out.append(-math.log(sp[j + 2] / sp[j]) / ((sp[j] + sp[j + 1] + sp[j + 2]) * 0.1 / 3 * 2))
    return np.mean(out) if out else None
for lo, hi in ((1.2, 1.8), (0.6, 1.2), (0.3, 0.6), (0.0, 0.3)):
    row = []
    for res in ('C', 'I'):
        v = [late(r['sp'], lo, hi) for r in R if r['res'] == res and r['air'] >= 15 and len(r['sp']) >= 16]; v = [x for x in v if x is not None]
        row.append(f'{np.mean(v) * 1000:.1f} (n {len(v)})' if v else '-')
    print(f'| {lo}-{hi} | {row[0]} | {row[1]} |')
print('\n## the ball\'s horizontal speed before arrival (yd/s), by air distance\n'); print('| air yd | n | 0.6-0.8 s before p50 / share over 24 | 0.3-0.5 s before | last 0.2 s |'); print('|---|---|---|---|---|')
for lo, hi in ((0, 10), (10, 20), (20, 35), (35, 99)):
    S = [r['sp'] for r in R if lo <= r['air'] < hi and len(r['sp']) >= 9]; cells = []
    for a, b in ((-8, -6), (-5, -3), (-3, -1)):
        v = np.array([np.mean(sp[a:b]) for sp in S]); cells.append(f'{np.median(v):.1f} / {np.mean(v > 24):.2f}')
    print(f'| {lo}-{hi} | {len(S)} | ' + ' | '.join(cells) + ' |')
def fly(vx, vz, k, T, dt=0.002, z0=1.8):
    out = []; x = 0; z = z0; t = 0
    while t < T + 1e-9:
        out.append((t, vx)); v = math.hypot(vx, vz); vx += -k * v * vx * dt; vz += (-g - k * v * vz) * dt; x += vx * dt; z += vz * dt; t += dt
    return out, x, z
def solve(D, T, zc, k):
    vx, vz = D / T, (zc - 1.8) / T + g * T / 2
    for _ in range(40):
        out, x, z = fly(vx, vz, k, T); e = (x - D, z - zc)
        if abs(e[0]) < 1e-4 and abs(e[1]) < 1e-4: break
        h = 1e-3; _, x1, z1 = fly(vx + h, vz, k, T); _, x2, z2 = fly(vx, vz + h, k, T)
        J = [[(x1 - x) / h, (x2 - x) / h], [(z1 - z) / h, (z2 - z) / h]]; det = J[0][0] * J[1][1] - J[0][1] * J[1][0]
        vx -= (e[0] * J[1][1] - e[1] * J[0][1]) / det; vz -= (-e[0] * J[1][0] + e[1] * J[0][0]) / det
    return fly(vx, vz, k, T)[0]
at = lambda out, t: min(out, key=lambda o: abs(o[0] - t))[1]
print('\n## point-ball model against the NFL: speeds at the release (0.1 s), mid and the end point (0.6 s before arrival), model solved for the same travel in the same time\n')
print('| air yd | n | travel / time to the point | NFL rel / mid / end | k=0.003 | k=0.0045 | k=0.006 | k=0.0095 |'); print('|---|---|---|---|---|---|---|---|')
for lo, hi in ((10, 20), (20, 35), (35, 99)):
    S = [r for r in R if lo <= r['air'] < hi and len(r['sp']) >= 12]
    dl = [sum(r['sp'][:len(r['sp']) - 6]) * 0.1 for r in S]; tl = [(len(r['sp']) - 6) * 0.1 for r in S]
    D = np.median(dl); T = np.median(tl); T0 = np.median([len(r['sp']) * 0.1 for r in S]); vz0 = (1.3 - 1.8) / T0 + g * T0 / 2; zc = 1.8 + vz0 * T - g * T * T / 2
    rel = np.median([np.mean(r['sp'][0:2]) for r in S]); mid = np.median([np.mean(r['sp'][(len(r['sp']) - 6) // 2 - 1:(len(r['sp']) - 6) // 2 + 1]) for r in S]); end = np.median([np.mean(r['sp'][len(r['sp']) - 8:len(r['sp']) - 6]) for r in S])
    cells = []
    for k in (0.003, 0.0045, 0.006, 0.0095):
        o = solve(D, T, zc, k); cells.append(f'{at(o, 0.1):.1f} / {at(o, T / 2):.1f} / {at(o, T - 0.1):.1f}')
    print(f'| {lo}-{hi} | {len(S)} | {D:.1f} yd / {T:.2f} s | {rel:.1f} / {mid:.1f} / {end:.1f} | ' + ' | '.join(cells) + ' |')
