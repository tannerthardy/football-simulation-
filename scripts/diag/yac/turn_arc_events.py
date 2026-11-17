"""Sim-only: onsets where a body at 2-4 yd/s is asked (request vector, 0.1 s grid) more than 90 degrees off his velocity with a request of at least 5 yd/s: time until his velocity is within 30 degrees of
the request, the lowest speed in the 0.8 s after as a share of entry, and his speed 0.5 s later. By request-vs-velocity angle bin, medians. Defenders (CB S LB DB) and all other positions.
  python3 -I scripts/diag/yac/turn_arc_events.py SIM.jsonl.gz [...]"""
import gzip, json, sys, numpy as np
DEF = {'CB', 'S', 'FS', 'SS', 'LB', 'ILB', 'OLB', 'MLB', 'DB', 'NB'}
def ang(a, b): return np.degrees(np.arccos(np.clip(np.sum(a * b, -1) / (np.linalg.norm(a, axis=-1) * np.linalg.norm(b, axis=-1) + 1e-9), -1, 1)))
for path in sys.argv[1:]:
    ev = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); R = np.array(r['rows'], dtype=float)
        if R.shape[0] < 12: continue
        R = R.reshape(R.shape[0], -1, 8); T = R.shape[0]
        for i, pos in enumerate(r['pos']):
            v = R[:, i, 2:4]; q = R[:, i, 6:8]; s = np.linalg.norm(v, axis=1); qs = np.linalg.norm(q, axis=1)
            k = 0
            while k < T - 9:
                if 2 <= s[k] <= 4 and qs[k] >= 5 and ang(v[k], q[k]) > 90:
                    a0 = float(ang(v[k], q[k])); t30 = np.nan
                    for j in range(1, 9):
                        if s[k + j] > 0.3 and ang(v[k + j], q[k + j]) < 30: t30 = j / 10; break
                    ev.append((pos in DEF, a0, t30, s[k:k + 9].min() / s[k], s[k + 5], s[k])); k += 9
                else: k += 1
    E = np.array(ev, dtype=float)
    print(f'{path.split("/")[-1]}: {len(E)} events')
    for name, m in (('defenders', E[:, 0] == 1), ('others', E[:, 0] == 0)):
        for lo, hi in ((90, 135), (135, 181)):
            S = E[m & (E[:, 1] >= lo) & (E[:, 1] < hi)]
            if len(S) < 5: continue
            fin = S[:, 2][~np.isnan(S[:, 2])]
            print(f'  {name:9s} {lo:3d}-{hi:3d} deg n {len(S):4d}  within 30 deg by 0.8 s {len(fin)/len(S):.2f}  t30 median {np.median(fin) if len(fin) else np.nan:.2f}  lowest speed share {np.median(S[:,3]):.2f}  speed at +0.5 s / entry {np.median(S[:,4]/S[:,5]):.2f}')
