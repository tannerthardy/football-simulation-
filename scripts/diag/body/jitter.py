"""Speed roughness of the tracks, NFL vs ours, one operator, on the 0.1 s exported grid (open-census play format; players, frames from the snap to the release).
  python3 -I scripts/diag/body/jitter.py NFL.jsonl.gz SIM.jsonl.gz [--out report.md]
Per player (receivers, defenders, QB; not linemen in contact is not separated here: open movement = nobody within 1.5 yd), frames where the player moves at 2 yd/s or more:
  s_k = |p(k+1) - p(k)| / 0.1                    (forward 0.1 s speed)
  A   = |s(k+1) - s(k)| / 0.1                    (yd/s2, the roughness at the export grid)
  B   = |s(k+1) - 2 s(k) + s(k-1)| / 0.1         (second difference: removes a steady acceleration)
  C   = A on a 0.2 s speed (centred, |p(k+1) - p(k-1)| / 0.2) stepped by 0.1 s
and the heading jitter |wrap(h(k+1) - h(k))| of the direction of travel (degrees per 0.1 s) at speed >= 3 yd/s. Quantisation: positions are 0.01 yd on both sides, which alone gives a roughness of about 0.3-0.6 yd/s2 in A at 0.1 s (printed from a noise-only series)."""
import gzip, json, sys, math
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] != '--out']
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
wrap = lambda a: (a + 180.0) % 360.0 - 180.0
def stats(path):
    A, B, C, H = [], [], [], []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x'], float); Y = np.array(p['y'], float)
        if p.get('rel') is not None: X, Y = X[:, :p['rel'] + 1], Y[:, :p['rel'] + 1]
        n, F = X.shape
        if F < 12: continue
        D = np.hypot(X[:, None, :] - X[None, :, :], Y[:, None, :] - Y[None, :, :]); D[np.arange(n), np.arange(n), :] = np.inf; opn = D.min(axis=1) > 1.5
        dx = np.diff(X, axis=1); dy = np.diff(Y, axis=1); s = np.hypot(dx, dy) / 0.1  # s[:, k] = speed over frame k..k+1
        s2 = np.hypot(X[:, 2:] - X[:, :-2], Y[:, 2:] - Y[:, :-2]) / 0.2  # centred, at frame k = 1..F-2 -> index k-1
        head = np.degrees(np.arctan2(dx, dy))
        for k in range(8, F - 3):
            ok = opn[:, k - 1:k + 3].all(axis=1) & (np.minimum(s[:, k], s[:, k - 1]) >= 2.0)
            for i in np.nonzero(ok)[0]:
                A.append(abs(s[i, k + 1] - s[i, k]) / 0.1); B.append(abs(s[i, k + 1] - 2 * s[i, k] + s[i, k - 1]) / 0.1)
                C.append(abs(s2[i, k] - s2[i, k - 1]) / 0.1)
                if min(s[i, k], s[i, k - 1]) >= 3.0: H.append(abs(wrap(head[i, k] - head[i, k - 1])))
    return [np.array(v) for v in (A, B, C, H)]
q = lambda v, p: float(np.percentile(v, p)) if len(v) else float('nan')
lines = []; P = lambda s='': lines.append(s)
# quantisation-only roughness: a constant-speed straight run (6 yd/s) rounded to 0.01 yd
t = np.arange(0, 400) * 0.1; xs = np.round(6.0137 * t + 0.3 * np.sin(0.5 * t), 2); ss = np.diff(xs) / 0.1; qa = np.abs(np.diff(ss)) / 0.1
P('## Speed roughness on the 0.1 s export grid, NFL vs ours (open movement, 2 yd/s and over)\n')
P(f'Quantisation alone (a smooth 6 yd/s run with a slow 0.15 yd/s wobble, rounded to 0.01 yd; its own A and B are not zero because the wobble accelerates a little): A p50 {q(qa, 50):.2f}, p90 {q(qa, 90):.2f} yd/s2.\n')
P('| sample | n | A p50 / p90 | B p50 / p90 | C (0.2 s speed) p50 / p90 | heading change per 0.1 s p50 / p90 (deg, 3 yd/s and over) |'); P('|---|---|---|---|---|---|')
for a in args:
    A, B, C, H = stats(a)
    P(f'| {a.split("/")[-1][:24]} | {len(A)} | {q(A, 50):.2f} / {q(A, 90):.2f} | {q(B, 50):.2f} / {q(B, 90):.2f} | {q(C, 50):.2f} / {q(C, 90):.2f} | {q(H, 50):.1f} / {q(H, 90):.1f} |')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
