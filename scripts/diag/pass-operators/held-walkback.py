"""How far a held interior pass rusher walks his blocker back, by their weight difference (Integration, 2026-11-15: the
anchor; "against how far a 300 lb man actually gets walked back in the NFL rows"). NFL only: the common-format export
must carry player ids (scripts/mechanics/nfl_bdb2025.py's current output), and weights come from BDB 2025 players.csv.

usage: python3 -I scripts/diag/pass-operators/held-walkback.py <nfl plays with ids .jsonl.gz> <players.csv>

Dropbacks; the three middle OL by y at the snap. A pair forms at the first frame (0.2-2.0 s, before the throw) a rusher
is within 1.2 yd of the blocker. It is held while within 1.2 yd and within 70 deg of the blocker's line to the QB
(interior-fight.py's release definition), to 2.5 s after contact. For each 0.5 s window since contact: the pair's mean
velocity toward the QB (along the rusher's line to him; + = the blocker walked back). Split by the rusher's weight
minus the blocker's: < -30 lb, -30..0, 0..+30, > +30. The same windows for all held pairs, and the blocker's weight.
"""
import sys, os, json, gzip, math, csv
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
plays_path, players_path = sys.argv[1], sys.argv[2]
weight = {}
with open(players_path, newline='') as h:
    for r in csv.DictReader(h):
        try: weight[str(r['nflId'])] = float(r['weight'])
        except ValueError: pass
W = [(0, .5), (.5, 1.0), (1.0, 1.5), (1.5, 2.5)]
BIN = [('< -30 lb', -1e9, -30), ('-30..0', -30, 0), ('0..+30', 0, 30), ('> +30', 30, 1e9)]
rows = []  # (window, diff, pair velocity toward the QB, blocker weight)
for line in gzip.open(plays_path, 'rt'):
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
        start = None; r = None
        for k in range(p.k(0.2), min(p.k(2.0), p.k(end)) + 1):
            bx, by = p.pos(b, k)
            if bx is None: continue
            near = [(math.hypot(p.pos(d, k)[0] - bx, p.pos(d, k)[1] - by), d) for d in D if p.pos(d, k)[0] is not None]
            near = [x for x in near if x[0] <= 1.2]
            if near: start = k; r = min(near)[1]; break
        if start is None: continue
        wr = weight.get(str(players[r].get('id')))
        if wr is None: continue
        diff = wr - wb; t0 = start * p.dt
        prev = None
        for k in range(start, p.k(min(end, t0 + 2.5)) + 1):
            (bx, by), (rx, ry), (qx, qy) = p.pos(b, k), p.pos(r, k), p.pos(qb, k)
            if None in (bx, rx, qx): break
            ux, uy = qx - bx, qy - by; L = math.hypot(ux, uy) or 1
            sx, sy = rx - bx, ry - by; sep = math.hypot(sx, sy)
            ang = math.degrees(math.atan2((sx * -uy + sy * ux) / L, -(sx * ux + sy * uy) / L))
            if sep > 1.2 or abs(ang) > 70: break
            if prev is not None:
                (pbx, pby), (prx, pry) = prev
                vx = ((bx - pbx) + (rx - prx)) / 2 / p.dt; vy = ((by - pby) + (ry - pry)) / 2 / p.dt
                lx, ly = qx - rx, qy - ry; ll = math.hypot(lx, ly) or 1
                dt = k * p.dt - t0
                for a, c in W:
                    if a <= dt < c: rows.append(((a, c), diff, (vx * lx + vy * ly) / ll, wb))
            prev = ((bx, by), (rx, ry))
print(f"== {os.path.basename(plays_path)}: held interior pass pairs, the pair's velocity toward the QB p50 (yd/s; + = the blocker walked back), by time since contact")
for a, c in W:
    R = [x for x in rows if x[0] == (a, c)]
    line = f"   {a:.1f}-{c:.1f} s: all {q([x[2] for x in R]):+.2f} (n {len(R)}, blocker {q([x[3] for x in R]):.0f} lb)"
    for lab, lo, hi in BIN:
        S = [x[2] for x in R if lo <= x[1] < hi]
        line += f" | rusher {lab} {q(S):+.2f} (n {len(S)})"
    print(line)
