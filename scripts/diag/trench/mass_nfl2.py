"""NFL 2022 weeks 1-4, tighter controls.
Runs: DL with exactly one OL within 1.5 yd and no other OL within 2.5 yd (true single
block); backward x displacement over the next 1.0 s while that single block holds;
split by concept family. Pass pro: PFF-labeled OL->DL pairs; rusher depth into the
backfield at 2.0 s (live plays only) by weight ratio."""
import csv, sys, math
from collections import defaultdict
D = 'data/raw/bdb2025/big-data-bowl-data/'
W = {}; POS = {}
for r in csv.DictReader(open(D + 'players.csv')): W[r['nflId']] = float(r['weight']); POS[r['nflId']] = r['position']
FAM = {'INSIDE ZONE': 'zone', 'OUTSIDE ZONE': 'zone', 'POWER': 'gap', 'COUNTER': 'gap', 'TRAP': 'gap', 'PULL LEAD': 'gap', 'MAN': 'man'}
plays = {}
for r in csv.DictReader(open(D + 'plays.csv')):
    if r['playNullifiedByPenalty'] == 'Y': continue
    k = (r['gameId'], r['playId'])
    if r['isDropback'] == 'TRUE': plays[k] = ('pass', r['possessionTeam'], None)
    elif r['rushLocationType'] not in ('NA', ''): plays[k] = ('run', r['possessionTeam'], FAM.get(r['pff_runConceptPrimary']))
pairs = defaultdict(list)
for r in csv.DictReader(open(D + 'player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays and plays[k][0] == 'pass' and POS.get(r['nflId']) in ('T', 'G', 'C') and r['blockedPlayerNFLId1'] not in ('NA', '') and r['blockedPlayerNFLId2'] in ('NA', ''):
        pairs[k].append((r['nflId'], r['blockedPlayerNFLId1']))
run_bins = defaultdict(list); pass_bins = defaultdict(list)
binr = lambda x: round(min(max(x, 0.85), 1.35) * 20) / 20
def flush(key, rows):
    kind, off, fam = plays[key]
    tr = defaultdict(dict); snap = None; ends = []
    for r in rows:
        f = int(r[4])
        if r[5] == 'SNAP': snap = f
        if r[17] in ('tackle', 'out_of_bounds', 'qb_sack', 'pass_forward', 'touchdown', 'fumble'): ends.append(f)
        if r[2] == 'NA': continue
        x = float(r[10]); y = float(r[11])
        if r[9] == 'left': x, y = 120 - x, 53.33 - y
        tr[r[2]][f] = (x, y, r[8] == off)
    if snap is None: return
    end = min([e for e in ends if e > snap], default=snap + 60)
    if kind == 'run':
        ol = [i for i in tr if POS.get(i) in ('T', 'G', 'C') and tr[i].get(snap, (0, 0, False))[2]]
        for d in (i for i in tr if POS.get(i) in ('DE', 'DT', 'NT') and not tr[i].get(snap, (0, 0, True))[2]):
            f = snap + 5
            while f + 10 <= min(end, snap + 30):
                if f not in tr[d] or f + 10 not in tr[d]: break
                dist = sorted((math.dist(tr[o][f][:2], tr[d][f][:2]), o) for o in ol if f in tr[o])
                if len(dist) >= 1 and dist[0][0] <= 1.5 and (len(dist) < 2 or dist[1][0] > 2.5):
                    o = dist[0][1]
                    if f + 10 in tr[o] and math.dist(tr[o][f + 10][:2], tr[d][f + 10][:2]) <= 1.5:
                        run_bins[(fam, binr(W[o] / W[d]))].append(tr[d][f + 10][0] - tr[d][f][0])
                f += 10
    else:
        if end < snap + 20: return
        for o, d in pairs.get(key, ()):
            if d in tr and snap in tr[d] and snap + 20 in tr[d] and POS.get(d) in ('DE', 'DT', 'NT', 'OLB'):
                los = tr[d][snap][0]  # defender's own start; depth gained toward the QB
                lane = 'interior' if POS.get(d) in ('DT', 'NT') and POS.get(o) in ('G', 'C') else 'edge' if POS.get(o) == 'T' else 'other'
                pass_bins[(lane, binr(W[o] / W[d]))].append(los - tr[d][snap + 20][0])
for week in (1, 2, 3, 4, 5, 6):
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
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))]
print('NFL runs, true single blocks: defender backward movement over 1 s while blocked (yd; + = driven back)')
for fam in ('zone', 'gap', 'man'):
    print(f'  {fam}:  ' + '  '.join(f"{b:.2f}: {q(v,.5):+.2f}/{q(v,.9):+.2f} (n={len(v)})" for (f_, b), v in sorted(run_bins.items(), key=lambda kv: (str(kv[0][0]), kv[0][1])) if f_ == fam and len(v) >= 40))
print('NFL dropbacks, PFF-labeled single blocks: rusher depth gained by 2.0 s (yd; median/p90)')
for lane in ('interior', 'edge'):
    print(f'  {lane}: ' + '  '.join(f"{b:.2f}: {q(v,.5):.2f}/{q(v,.9):.2f} (n={len(v)})" for (l, b), v in sorted(pass_bins.items()) if l == lane and len(v) >= 40))
