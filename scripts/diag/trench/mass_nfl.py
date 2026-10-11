"""NFL 2022: does a heavier blocker drive a lighter defensive lineman back faster?
Engaged = nearest OL within 1.5 yd; backward speed from positions (0.2 s each side)."""
import csv, sys, math
from collections import defaultdict
D = 'data/raw/bdb2025/big-data-bowl-data/'
weight = {}; pos = {}
for r in csv.DictReader(open(D + 'players.csv')): weight[r['nflId']] = float(r['weight']); pos[r['nflId']] = r['position']
plays = {}
for r in csv.DictReader(open(D + 'plays.csv')):
    if r['isDropback'] == 'FALSE' and r['rushLocationType'] not in ('NA', '') and r['playNullifiedByPenalty'] != 'Y':
        plays[(r['gameId'], r['playId'])] = r['possessionTeam']
bins = defaultdict(list); cum = defaultdict(list)
def flush(key, rows):
    if key not in plays: return
    off = plays[key]; tr = defaultdict(dict); snap = None; direction = None; ball = {}
    for r in rows:
        f = int(r[4]); direction = r[9]
        if r[5] == 'SNAP': snap = f
        x = float(r[10]); y = float(r[11])
        if direction == 'left': x, y = 120 - x, 53.33 - y
        if r[2] == 'NA': ball[f] = (x, y); continue
        tr[r[2]][f] = (x, y, r[8])
    if snap is None: return
    ol = [i for i in tr if pos.get(i) in ('T', 'G', 'C') and tr[i][snap][2] == off]
    dl = [i for i in tr if pos.get(i) in ('DE', 'DT', 'NT') and tr[i][snap][2] != off]
    for d in dl:
        x0 = tr[d][snap][0]
        for f in range(snap + 5, snap + 31, 2):
            if f + 2 not in tr[d] or f - 2 not in tr[d]: break
            near = min(ol, key=lambda o: math.dist(tr[o].get(f, (999, 999))[:2], tr[d][f][:2]), default=None)
            if near is None or math.dist(tr[near][f][:2], tr[d][f][:2]) > 1.5: continue
            ratio = weight.get(near, 0) / max(1, weight.get(d, 1))
            v = (tr[d][f + 2][0] - tr[d][f - 2][0]) / 0.4
            b = round(min(max(ratio, 0.85), 1.35) * 20) / 20
            bins[b].append(v)
            if f == snap + 29: cum[b].append(tr[d][f][0] - x0)
for week in (1, 2, 3):
    with open(D + f'tracking_week_{week}.csv', newline='') as h:
        rd = csv.reader(h); next(rd); key = None; rows = []
        for r in rd:
            k = (r[0], r[1])
            if k != key:
                if rows: flush(key, rows)
                key, rows = k, []
            if r[5] != 'BEFORE_SNAP' and k in plays: rows.append(r)
        if rows: flush(key, rows)
    print('week', week, file=sys.stderr)
print('NFL: engaged DL backward speed by OL/DL weight ratio (yd/s; + = driven back)')
for b in sorted(bins):
    v = sorted(bins[b]); c = sorted(cum[b])
    q = lambda a, f: a[int(f * (len(a) - 1))] if a else float('nan')
    print(f'  ratio {b:4.2f}: n={len(v):6}  speed p50 {q(v,.5):5.2f} p90 {q(v,.9):5.2f}  share>1 {sum(x>1 for x in v)/len(v):.2f} | displacement at 3 s (n={len(c)}) p50 {q(c,.5):5.2f} p90 {q(c,.9):5.2f}')
