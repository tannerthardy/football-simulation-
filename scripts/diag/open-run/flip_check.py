# Is `o` flipped (180 deg) for some players/plays? Pre-snap check: offense faces downfield, defense faces the offense.
import csv, sys, math, collections as C
S = 'out/open-run'
D = 'data/raw/bdb2025/big-data-bowl-data'
W = sys.argv[1].split(',')
POS = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
PL = {(r['gameId'], r['playId']): (r['isDropback'] in ('TRUE', 'True'), r['possessionTeam']) for r in csv.DictReader(open(f'{D}/plays.csv'))}
ang = lambda a, b: min(abs(a - b) % 360, 360 - abs(a - b) % 360)
pre = C.defaultdict(list)   # (g,p,i) -> pre-snap o, last frames
post = C.defaultdict(list)  # (g,p,i) -> (o, dir, s) after snap, s>=5
meta = {}
for w in W:
    seen_snap = {}
    last = C.defaultdict(list)
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId']); 
        if k not in PL or not PL[k][0] or r['displayName'] == 'football': continue
        if r['frameType'] == 'BEFORE_SNAP':
            if r['o'] not in ('', 'NA'): last[(k, r['nflId'])].append(float(r['o']))
            meta[(k, r['nflId'])] = (r['club'], r['playDirection'])
        else:
            if r['o'] in ('', 'NA') or r['dir'] in ('', 'NA'): continue
            if float(r['s']) >= 5: post[(k, r['nflId'])].append((float(r['o']), float(r['dir']), float(r['s'])))
    for kk, v in last.items(): pre[kk] = v[-8:]
# expected pre-snap facing: offense downfield (right=90, left=270); defense toward the offense (opposite)
res = C.defaultdict(lambda: [0, 0])
flipped = set()
for (k, i), v in pre.items():
    club, pdir = meta[(k, i)]; off = club == PL[k][1]
    pos = POS.get(i, '?')
    if pos not in ('WR', 'TE', 'RB', 'CB', 'SS', 'FS'): continue
    down = 90 if pdir == 'right' else 270
    exp = down if off else (down + 180) % 360
    o = sorted(v)[len(v) // 2] if v else None
    if o is None: continue
    e = ang(o, exp)
    g = 'S' if pos in ('SS', 'FS') else pos
    res[g][0] += 1
    if e > 120: res[g][1] += 1; flipped.add((k, i))
print('pre-snap shoulders pointing the wrong way (>120 deg from expected), by group: n, share')
for g, (n, f) in res.items(): print(f'  {g}: n {n} wrong-way {f} ({f/max(n,1):.3f})')
# of the high-speed turned frames, how many are from wrong-way (likely flipped) player-plays?
def inbin(o, d, lo, hi): a = ang(o, d); return lo <= a < hi
for grp, poss, lo, hi in (('WR', ('WR',), 105, 135), ('WR', ('WR',), 150, 180), ('CB', ('CB',), 75, 105), ('TE', ('TE',), 105, 135), ('RB', ('RB',), 105, 135)):
    tot = fl = 0; sp_all = []; sp_ok = []
    for (k, i), v in post.items():
        if POS.get(i) not in poss: continue
        for o, d, s in v:
            if inbin(o, d, lo, hi):
                tot += 1; sp_all.append(s)
                if (k, i) in flipped: fl += 1
                else: sp_ok.append(s)
    q = lambda a, p: sorted(a)[int(p * (len(a) - 1))] if a else float('nan')
    print(f'{grp} frames at {lo}-{hi} deg, s>=5: n {tot}, from flagged-flipped player-plays {fl} ({fl/max(tot,1):.2f}); p95 all {q(sp_all,.95):.1f} -> p95 without flagged {q(sp_ok,.95):.1f}')
import json
json.dump(sorted(f'{k[0]}|{k[1]}|{i}' for (k, i) in flipped), open(S + '/flagged.json', 'w'))
