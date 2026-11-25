"""Cover 2 half safety against a vertical #1 (Coverage's cell, 2026-11-24): NFL vs ours, same operator on defense-film stop rows (nfl-stop-lane.py / sim-stop-lane.mts).
  python3 -I scripts/diag/census/cover2_half.py NFL_STOP.jsonl SIM_STOP.jsonl [SIM2 ...]
Cover 2 (NFL PFF 2L/2R halves, FL/FR flats; ours deep_half_* safeties, flat_* corners), dropbacks without play action, ball not yet thrown at the time. For each half safety, #1 = the widest eligible receiver (not QB / OL) on his side of the ball at the snap
(at least 7 yd from it); the cell needs #1 vertical: his depth past the line at least 10 yd at 2.5 s. Reported at 2.0 / 2.5 / 3.0 s (p25 / p50 / p75; n): the half's depth, his distance to #1, his width vs #1 (his |y| distance from the ball minus #1's: + = he is inside #1), and the flat defender on that side (the corner)'s depth and distance to #1."""
import json, sys, math
import numpy as np
OL = {'C', 'G', 'T', 'OT', 'OG', 'OL', 'QB'}; TS = (2.0, 2.5, 3.0)
def rows(path):
    out = []
    for l in open(path):
        r = json.loads(l)
        if r['kind'] != 'pass' or r.get('pa') or r['cov']['fam'] != 'cover2': continue
        T = r['t']; thr = r.get('throw'); by = r['ballY']; pl = r['players']; src = r['src']
        def kf(t):
            k = min(range(len(T)), key=lambda i: abs(T[i] - t)); return k if abs(T[k] - t) <= 0.06 else None
        ks = {t: kf(t) for t in TS}; k0 = kf(0.0)
        if k0 is None or ks[2.5] is None or (thr is not None and thr < 2.5): continue
        P = lambda i, k: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1])
        half = [i for i, p in enumerate(pl) if p['side'] == 'D' and ((p.get('assign') in ('2L', '2R')) if src == 'nfl' else (p.get('role') or '').startswith('deep_half'))]
        flat = [i for i, p in enumerate(pl) if p['side'] == 'D' and ((p.get('assign') in ('FL', 'FR')) if src == 'nfl' else (p.get('role') or '').startswith('flat_'))]
        rec = [i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] not in OL]
        for h in half:
            s = 1 if P(h, k0)[1] >= by else -1
            side = [i for i in rec if s * (P(i, k0)[1] - by) >= 7]
            if not side: continue
            n1 = max(side, key=lambda i: s * (P(i, k0)[1] - by))
            if P(n1, ks[2.5])[0] < 10: continue
            fl = min((f for f in flat if (1 if P(f, k0)[1] >= by else -1) == s), key=lambda f: abs(P(f, k0)[1] - P(n1, k0)[1]), default=None)
            row = {}
            for t in TS:
                k = ks[t]
                if k is None or (thr is not None and t > thr): continue
                (hx, hy), (nx, ny) = P(h, k), P(n1, k)
                d = dict(hd=hx, hdist=math.hypot(hx - nx, hy - ny), hw=s * (ny - by) - s * (hy - by))
                if fl is not None:
                    fx, fy = P(fl, k); d.update(cd=fx, cdist=math.hypot(fx - nx, fy - ny))
                row[t] = d
            out.append(row)
    return out
q = lambda v, p: float(np.percentile(v, p)) if len(v) else float('nan')
def cell(R, t, key):
    v = [r[t][key] for r in R if t in r and key in r[t]]
    return f"{q(v,25):.1f} / {q(v,50):.1f} / {q(v,75):.1f} ({len(v)})" if len(v) >= 5 else f"- ({len(v)})"
print('| sample | t | half depth | half distance to #1 | half width vs #1 (+ = inside #1) | corner depth | corner distance to #1 |'); print('|---|---|---|---|---|---|---|')
for nm, path in [('NFL', sys.argv[1])] + [(a.split('/')[-1], a) for a in sys.argv[2:]]:
    R = rows(path)
    for t in TS: print(f"| {nm} | {t} | {cell(R, t, 'hd')} | {cell(R, t, 'hdist')} | {cell(R, t, 'hw')} | {cell(R, t, 'cd')} | {cell(R, t, 'cdist')} |")
