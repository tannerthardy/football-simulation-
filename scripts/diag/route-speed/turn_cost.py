"""Speed change over 0.5 s by entry speed x heading rate, open field, one positions operator for NFL tracking and sim (common-format xy at 0.1 s,
rounded to 0.1 yd; all 22 players; run and pass plays from the snap).
  python3 -I scripts/diag/route-speed/turn_cost.py NFL.jsonl.gz SIM.jsonl.gz [--json OUT]
Velocity = central difference over 0.4 s (k-2..k+2). A window is k0..k0+5 (0.5 s), non-overlapping per player. Entry speed = speed at k0 (4-10 yd/s, 1 yd/s bins);
heading rate = |heading(k0+5) - heading(k0)| / 0.5 s, wrapped (net turn); the player stays above 2 yd/s through the window (a heading exists) and no other player is
within 1.5 yd at any frame of it (open field: no contact, no blocker or tackler). Sim rows also carry `req`, the velocity the controller asked for that tick
(sim.intents): requested speed at the window's end (mean over its last 0.2 s) against the entry speed, and the shortfall exit speed - requested exit speed."""
import gzip, json, sys, math
import numpy as np

SB = [(4, 5), (5, 6), (6, 7), (7, 8), (8, 9), (9, 10)]
HB = [(0, 20), (20, 40), (40, 60), (60, 100), (100, 1e9)]


def windows(raw, has_req):
    xy = np.array([[np.nan if v is None else v for v in row] for row in raw['xy']], dtype=float)
    F = xy.shape[0]
    if F < 12:
        return []
    n = xy.shape[1] // 2
    P = xy.reshape(F, n, 2)
    V = np.full((F, n, 2), np.nan)
    V[2:F - 2] = (P[4:] - P[:-4]) / 0.4
    S = np.hypot(V[..., 0], V[..., 1]); TH = np.arctan2(V[..., 1], V[..., 0])
    if has_req:
        R = np.array(raw['req'], dtype=float).reshape(F, n, 2); RS = np.hypot(R[..., 0], R[..., 1])
    out = []
    for k0 in range(2, F - 7, 5):
        k1 = k0 + 5
        sl = slice(k0, k1 + 1)
        D = np.linalg.norm(P[sl][:, :, None, :] - P[sl][:, None, :, :], axis=3)  # frames, n, n
        D[:, np.arange(n), np.arange(n)] = np.inf
        near = D.min(axis=(0, 2))
        smin = S[sl].min(axis=0)
        for i in range(n):
            s0 = S[k0, i]
            if not (4 <= s0 < 10) or not (smin[i] >= 2.0) or not (near[i] > 1.5) or np.isnan(S[k1, i]):
                continue
            hr = abs((TH[k1, i] - TH[k0, i] + math.pi) % (2 * math.pi) - math.pi) / 0.5 * 180 / math.pi
            row = [s0, S[k1, i] - s0, hr]
            if has_req:
                rq = RS[k1 - 1:k1 + 1, i].mean(); row += [rq - s0, S[k1, i] - rq]
            out.append(row)
    return out


def scan(path, has_req):
    rows = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') not in ('run', 'pass'):
            continue
        rows += windows(raw, has_req)
    return np.array(rows)


def cells(a, col=1):
    out = {}
    for si, (slo, shi) in enumerate(SB):
        for hi, (hlo, hhi) in enumerate(HB):
            m = (a[:, 0] >= slo) & (a[:, 0] < shi) & (a[:, 2] >= hlo) & (a[:, 2] < hhi)
            v = a[m, col]
            out[(si, hi)] = (len(v), v.mean() if len(v) else float('nan'), v.std(ddof=1) / math.sqrt(len(v)) if len(v) > 1 else float('nan'))
    return out


if __name__ == '__main__':
    nfl, sim = scan(sys.argv[1], False), scan(sys.argv[2], True)
    cn, cs, cr, cq = cells(nfl), cells(sim), cells(sim, 3), cells(sim, 4)
    print(f"windows: NFL {len(nfl)}, ours {len(sim)}")
    print('Delta speed over 0.5 s (yd/s), NFL | ours (n NFL/ours); * = differs by > 2 combined SE; ours requested-minus-entry and achieved-minus-requested below each ours')
    print('entry\\turn deg/s ' + ' | '.join(f"{lo}-{hi if hi < 1e8 else '+'}".ljust(30) for lo, hi in HB))
    for si, (slo, shi) in enumerate(SB):
        line = f"{slo}-{shi}".ljust(15)
        for hi in range(len(HB)):
            (n1, m1, e1), (n2, m2, e2) = cn[(si, hi)], cs[(si, hi)]
            flag = '*' if n1 >= 30 and n2 >= 30 and abs(m1 - m2) > 2 * math.hypot(e1, e2) else ' '
            line += f"{m1:+.2f} | {m2:+.2f}{flag} ({n1}/{n2})".ljust(33)
        print(line)
        line = ' ' * 15
        for hi in range(len(HB)):
            line += f"req {cr[(si, hi)][1]:+.2f} short {cq[(si, hi)][1]:+.2f}".ljust(33)
        print(line)
    if '--json' in sys.argv:
        json.dump({f'{a}-{b}': dict(nfl=cn[(a, b)], ours=cs[(a, b)], req=cr[(a, b)], short=cq[(a, b)]) for a in range(len(SB)) for b in range(len(HB))}, open(sys.argv[sys.argv.index('--json') + 1], 'w'))
