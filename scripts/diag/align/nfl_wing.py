"""Wing width at the snap, 2022 tracking (BDB2025). Observation only.
For each attached TE (on the line, 0.8-3.0 yd outside his tackle) find an offensive
player off the line (1.0-3.0 yd behind the ball) within 0.3-4 yd outside the TE:
a wing. Report his lateral offset from the TE and depth, plus the 9-tech / end man
defender's lateral offset from the TE on that side. Streams the tracking (snap frames only); weeks 1-6 take about 3 minutes.
usage: python3 -I scripts/diag/align/nfl_wing.py [weeks...]   (default 1-6)"""
import csv, sys, statistics as st, collections
from pathlib import Path
D = Path(__file__).resolve().parents[3] / "data/raw/bdb2025/big-data-bowl-data"
weeks = [int(w) for w in sys.argv[1:]] or list(range(1, 7))
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['playNullifiedByPenalty'] != 'Y'}
wings, ends, formations = [], [], collections.Counter()
for w in weeks:
    cur, frame = None, []
    def flush(key, frame):
        p = plays.get(key)
        if not p or not frame: return
        ball = [r for r in frame if r['club'] == 'football']
        if not ball: return
        right = frame[0]['playDirection'] == 'right'
        bx, by = float(ball[0]['x']), float(ball[0]['y'])
        def rel(r):
            x, y = float(r['x']), float(r['y'])
            return ((x - bx) if right else (bx - x)), ((by - y) if right else (y - by))  # depth fwd(+), lateral (+ = offense's left)
        off = [(pos.get(r['nflId'], ''), *rel(r)) for r in frame if r['club'] == p['possessionTeam']]
        de = [(pos.get(r['nflId'], ''), *rel(r)) for r in frame if r['club'] == p['defensiveTeam']]
        ol = [o for o in off if o[0] in ('T', 'G', 'C')]
        if len(ol) < 5: return
        for side in (1, -1):
            tackle = max((o[2] * side for o in ol), default=None)
            if tackle is None: continue
            tes = [o for o in off if o[0] == 'TE' and -1.6 < o[1] < 0 and 0.8 < o[2] * side - tackle < 3.0]
            if len(tes) != 1: continue
            te = tes[0]; tey = te[2] * side
            cands = [o for o in off if o is not te and o[0] in ('TE', 'WR', 'FB', 'RB') and -3.2 < o[1] < -1.0 and 0.3 < o[2] * side - tey < 4.0]
            if len(cands) != 1: continue
            wg = cands[0]
            wings.append((wg[2] * side - tey, -wg[1], -te[1], wg[0]))
            formations[p['offenseFormation']] += 1
            # Defensive end man on that side: the widest defender within 1.5 yd of the line, inside 5 yd outside the wing.
            line = [d for d in de if 0 < d[1] < 1.6 and d[2] * side > tackle - 0.5 and d[2] * side < wg[2] * side + 5]
            if line and wg[2] * side - tey < 2.5:
                widest = sorted(line, key=lambda d: d[2] * side)
                # offsets from the TE, widest last; plus the widest one's offset from the wing and its depth
                ends.append((tuple(round(d[2] * side - tey, 2) for d in widest[-3:]), round(widest[-1][2] * side - wg[2] * side, 2), round(widest[-1][1], 2), widest[-1][0], wg[2] * side - tey))
    with open(f'{D}/tracking_week_{w}.csv', newline='') as fh:
        for r in csv.DictReader(fh):
            if r['frameType'] != 'SNAP': continue
            key = (r['gameId'], r['playId'])
            if key != cur:
                flush(cur, frame); cur, frame = key, []
            frame.append(r)
        flush(cur, frame)
q = lambda xs, p: sorted(xs)[int(p * (len(xs) - 1))]
lat = [w[0] for w in wings]; dep = [w[1] for w in wings]
print('wings', len(wings), 'weeks', weeks, 'by position', collections.Counter(w[3] for w in wings).most_common(), 'formation', formations.most_common(5))
print('wing lateral outside TE: p10/p25/p50/p75/p90', [round(q(lat, p), 2) for p in (.1, .25, .5, .75, .9)], 'mean', round(st.mean(lat), 2))
print('wing depth behind ball:  p10/p25/p50/p75/p90', [round(q(dep, p), 2) for p in (.1, .25, .5, .75, .9)])
print('TE depth behind ball p50', round(st.median(w[2] for w in wings), 2))
hist = collections.Counter(round(x * 2) / 2 for x in lat); print('lateral histogram (0.5 yd bins)', sorted(hist.items()))
tw = [e for e in ends]
print('true wings (<2.5 yd outside the TE):', len(tw), 'their lateral p50', round(st.median(e[4] for e in tw), 2))
w1 = [e[1] for e in tw]; print('widest defender on the line, offset from the WING: p10/p25/p50/p75/p90', [round(q(w1, p), 2) for p in (.1,.25,.5,.75,.9)], 'depth p50', round(st.median(e[2] for e in tw), 2), collections.Counter(e[3] for e in tw).most_common(4))
w2 = [e[0][-2] for e in tw if len(e[0]) > 1]; print('next defender in, offset from the TE: p10/p25/p50/p75/p90', [round(q(w2, p), 2) for p in (.1,.25,.5,.75,.9)])
w3 = [e[0][-3] for e in tw if len(e[0]) > 2]; print('third, offset from the TE: p25/p50/p75', [round(q(w3, p), 2) for p in (.25,.5,.75)])
gap12 = [e[0][-1]-e[0][-2] for e in tw if len(e[0]) > 1]; print('spacing between the two widest (yd): p10/p25/p50', [round(q(gap12, p), 2) for p in (.1,.25,.5)])
