"""How the held interior pass pair's walk-back depends on the two men's weights, one operator, NFL tracking (Tools, 2026-11-16; Integration's push-contest re-diagnosis).
Pairs and hold as held-walkback.py (the three middle OL by y at the snap; a pair forms at the first frame 0.2-2.0 s, before the throw, a defender is within 1.2 yd of the blocker;
held while within 1.2 yd and within 70 deg of the blocker's line to the QB, to 2.5 s after contact). Here one value per pair and window: the pair's mean velocity toward the QB
(the mean of the two men's velocities along the rusher's line to him; + = the blocker walked back), over 0.5-1.0, 1.0-1.5 and 1.5-2.5 s since contact, for pairs held through the window.
Weights from BDB 2025 players.csv (lb). The fit is ordinary least squares, walk-back on the rusher's and the blocker's weight (per 30 lb), with a bootstrap over plays (200 resamples) for the interval,
and the p50 by rusher weight tertile and by blocker weight tertile. Strength is not in the data: weight is the only mass-or-strength proxy here.
usage: python3 -I held-walkback-fit.py <nfl plays with ids .jsonl.gz> <players.csv>"""
import sys, os, json, gzip, math, csv, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
weight = {}
with open(sys.argv[2], newline='') as h:
    for r in csv.DictReader(h):
        try: weight[str(r['nflId'])] = float(r['weight'])
        except ValueError: pass
W = [(0.5, 1.0), (1.0, 1.5), (1.5, 2.5)]
pairs = []  # (play index, wr, wb, {window: mean velocity})
for pi, line in enumerate(gzip.open(sys.argv[1], 'rt')):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'pass' or not raw.get('xy'): continue
    p = Play(raw); ev = raw.get('events', {}); fw = ev.get('pass_forward'); end = fw if fw is not None else p.end
    players = raw['players']
    OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
    qbs = p.who('O', 'QB')
    if len(OL) < 5 or not qbs: continue
    qb = qbs[0]; D = [i for i in p.who('D') if p.pos(i, 0)[0] is not None]
    for b in OL[1:4]:
        wb = weight.get(str(players[b].get('id')))
        if wb is None: continue
        start = r = None
        for k in range(p.k(0.2), min(p.k(2.0), p.k(end)) + 1):
            bx, by = p.pos(b, k)
            if bx is None: continue
            near = [(math.hypot(p.pos(d, k)[0] - bx, p.pos(d, k)[1] - by), d) for d in D if p.pos(d, k)[0] is not None]
            near = [x for x in near if x[0] <= 1.2]
            if near: start = k; r = min(near)[1]; break
        if start is None: continue
        wr = weight.get(str(players[r].get('id')))
        if wr is None: continue
        t0 = start * p.dt; prev = None; vals = {w: [] for w in W}; held_to = 0.0
        for k in range(start, p.k(min(end, t0 + 2.5)) + 1):
            (bx, by), (rx, ry), (qx, qy) = p.pos(b, k), p.pos(r, k), p.pos(qb, k)
            if None in (bx, rx, qx): break
            ux, uy = qx - bx, qy - by; L = math.hypot(ux, uy) or 1
            sx, sy = rx - bx, ry - by; sep = math.hypot(sx, sy)
            ang = math.degrees(math.atan2((sx * -uy + sy * ux) / L, -(sx * ux + sy * uy) / L))
            if sep > 1.2 or abs(ang) > 70: break
            held_to = k * p.dt - t0
            if prev is not None:
                (pbx, pby), (prx, pry) = prev
                vx = ((bx - pbx) + (rx - prx)) / 2 / p.dt; vy = ((by - pby) + (ry - pry)) / 2 / p.dt
                lx, ly = qx - rx, qy - ry; ll = math.hypot(lx, ly) or 1
                t = k * p.dt - t0
                for w in W:
                    if w[0] <= t < w[1]: vals[w].append((vx * lx + vy * ly) / ll)
            prev = ((bx, by), (rx, ry))
        pairs.append((pi, wr, wb, {w: (sum(v) / len(v) if v and held_to >= w[1] - 0.15 else None) for w, v in vals.items()}))
def ols(rows):  # y ~ 1 + (wr-300)/30 + (wb-310)/30
    X = [(1.0, (r[0] - 300) / 30, (r[1] - 310) / 30) for r in rows]; y = [r[2] for r in rows]; n = len(y)
    A = [[sum(x[i] * x[j] for x in X) for j in range(3)] for i in range(3)]; B = [sum(x[i] * yy for x, yy in zip(X, y)) for i in range(3)]
    for i in range(3):
        piv = A[i][i]
        for j in range(i, 3): A[i][j] /= piv
        B[i] /= piv
        for k in range(3):
            if k != i:
                f = A[k][i]
                for j in range(i, 3): A[k][j] -= f * A[i][j]
                B[k] -= f * B[i]
    return B
print(f"== {os.path.basename(sys.argv[1])}: {len(pairs)} held interior pairs; walk-back (pair velocity toward the QB, yd/s, + = blocker walked back)")
plays = sorted({p[0] for p in pairs}); random.seed(3)
for w in W:
    rows = [(p[1], p[2], p[3][w], p[0]) for p in pairs if p[3][w] is not None]
    if len(rows) < 30: continue
    b = ols([r[:3] for r in rows]); byplay = {}
    for r in rows: byplay.setdefault(r[3], []).append(r[:3])
    ids = list(byplay); boots = []
    for _ in range(200):
        s = [x for i in (random.choice(ids) for _ in ids) for x in byplay[i]]
        boots.append(ols(s))
    ci = lambda j: (q([x[j] for x in boots], .05), q([x[j] for x in boots], .95))
    wrs = sorted(r[0] for r in rows); wbs = sorted(r[1] for r in rows)
    tr = lambda v, lo, hi: [r[2] for r in rows if v(r) >= lo and v(r) < hi]
    t1r, t2r = wrs[len(wrs) // 3], wrs[2 * len(wrs) // 3]; t1b, t2b = wbs[len(wbs) // 3], wbs[2 * len(wbs) // 3]
    print(f"  {w[0]:.1f}-{w[1]:.1f} s n {len(rows)} (blocker {q(wbs):.0f} lb, rusher {q(wrs):.0f} lb): mean {sum(r[2] for r in rows) / len(rows):+.2f} | per +30 lb of RUSHER {b[1]:+.2f} ({ci(1)[0]:+.2f} to {ci(1)[1]:+.2f}), per +30 lb of BLOCKER {b[2]:+.2f} ({ci(2)[0]:+.2f} to {ci(2)[1]:+.2f})")
    print(f"      p50 by rusher tertile (<= {t1r:.0f}, <= {t2r:.0f}, heavier): {q(tr(lambda r: r[0], 0, t1r + .1)):+.2f} / {q(tr(lambda r: r[0], t1r + .1, t2r + .1)):+.2f} / {q(tr(lambda r: r[0], t2r + .1, 1e9)):+.2f} | by blocker tertile (<= {t1b:.0f}, <= {t2b:.0f}, heavier): {q(tr(lambda r: r[1], 0, t1b + .1)):+.2f} / {q(tr(lambda r: r[1], t1b + .1, t2b + .1)):+.2f} / {q(tr(lambda r: r[1], t2b + .1, 1e9)):+.2f}")
