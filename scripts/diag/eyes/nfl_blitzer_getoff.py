"""How fast NFL blitzers come off the ball (BDB 2025 wk1-3, dropback, no PA, 5+ initial rushers).
Run: python3 -I nfl_blitzer_getoff.py [datadir] [outdir]"""
import csv, sys, os, math, collections, json
import os
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')), 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')), 'out', 'eyes')
os.makedirs(OUT, exist_ok=True)
WEEKS = (1, 2, 3); TS = (0, 2, 4, 6, 8, 10, 12); DL = {'DE', 'DT', 'NT'}
games = {r['gameId'] for r in csv.DictReader(open(f'{D}/games.csv')) if int(r['week']) in WEEKS}
plays = {(r['gameId'], r['playId']): r['possessionTeam'] for r in csv.DictReader(open(f'{D}/plays.csv'))
         if r['gameId'] in games and r['isDropback'] == 'TRUE' and r['playAction'] == 'FALSE'}
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
rush, qb, qbpos = collections.defaultdict(list), {}, {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k not in plays: continue
    if r['wasInitialPassRusher'] in ('1', 'TRUE'): rush[k].append(r['nflId'])
    if r['hadDropback'] == '1': qb[k] = r['nflId']
    if pos.get(r['nflId']) == 'QB' and r['teamAbbr'] == plays[k]: qbpos[k] = r['nflId']
nqb_fallback = sum(k not in qb and k in qbpos for k in plays)
for k, v in qbpos.items(): qb.setdefault(k, v)
sel = {k: set(v) for k, v in rush.items() if len(v) >= 5 and k in qb}
need = {k: v | {qb[k], 'NA'} for k, v in sel.items()}
T = collections.defaultdict(dict)
for w in WEEKS:
    with open(f'{D}/tracking_week_{w}.csv') as f:
        rd = csv.reader(f); h = next(rd); ix = {c: i for i, c in enumerate(h)}
        g, p, n, fi, pd, x, y, s, e = (ix[c] for c in ('gameId', 'playId', 'nflId', 'frameId', 'playDirection', 'x', 'y', 's', 'event'))
        for row in rd:
            k = (row[g], row[p])
            if k in need and row[n] in need[k]:
                T[k][(row[n], int(row[fi]))] = (float(row[x]), float(row[y]), float(row[s]), row[e], row[pd])
recs, drops = [], collections.Counter()
for k, rs in sel.items():
    P = T.get(k, {})
    sf = [f for (n, f), v in P.items() if n == 'NA' and v[3] == 'ball_snap']
    if not sf: drops['no_snap'] += 1; continue
    s0 = min(sf); b = P[('NA', s0)]; sg = 1 if b[4] == 'right' else -1; los = b[0]
    for d in rs:
        if pos.get(d) in DL: continue
        p0 = P.get((d, s0))
        if not p0: drops['no_rusher_track'] += 1; continue
        depth = sg * (p0[0] - los)
        r = dict(pos=pos.get(d), depth=depth, edge=pos.get(d) == 'OLB' and abs(depth) <= 1.5, t={}, t3=None)
        for f in range(s0, s0 + 31):
            v = P.get((d, f))
            if v and v[2] >= 3: r['t3'] = (f - s0) / 10; break
        for t in TS:
            a, m, c, Q = P.get((d, s0 + t - 1)), P.get((d, s0 + t)), P.get((d, s0 + t + 1)), P.get((qb[k], s0 + t))
            if not (a and m and c and Q): continue
            dq = math.hypot(Q[0] - m[0], Q[1] - m[1]); vx, vy = (c[0] - a[0]) / .2, (c[1] - a[1]) / .2
            r['t'][t] = dict(s=m[2], close=(vx * (Q[0] - m[0]) + vy * (Q[1] - m[1])) / dq if dq else 0,
                             disp=-sg * (m[0] - p0[0]), dq=dq)
        recs.append(r)
json.dump(recs, open(f'{OUT}/nfl_blitzer_getoff.json', 'w'))
def q(v, p):
    v = sorted(v); i = (len(v) - 1) * p; lo = int(i); return v[lo] + (v[min(lo + 1, len(v) - 1)] - v[lo]) * (i - lo)
mi = lambda v: f'{q(v,.5):.1f} [{q(v,.25):.1f},{q(v,.75):.1f}]' if v else '-'
M = (('s', 'speed'), ('close', 'closing→QB'), ('disp', 'disp→LOS'), ('dq', 'dist QB'))
L = [f"Blitz plays {len(sel)} (drops {dict(drops)}; QB from hadDropback, else the possession team's QB: fallback on {nqb_fallback} dropbacks); non-DL blitzers {len(recs)}: {dict(collections.Counter(r['pos'] for r in recs).most_common())}; edge OLB {sum(r['edge'] for r in recs)}"]
G = [('All non-DL blitzers', recs), ('Non-DL excl. edge OLB', [r for r in recs if not r['edge']]), ('Edge OLB (|depth|≤1.5)', [r for r in recs if r['edge']])]
for nm, rs in G:
    L += [f'\n**{nm}** (n={len(rs)}; snap depth p50 {q([r["depth"] for r in rs],.5):.1f} yd), median [IQR]', '| t s | n | ' + ' | '.join(m[1] for m in M) + ' |', '|---|---|---|---|---|---|']
    for t in TS:
        h = [r['t'][t] for r in rs if t in r['t']]
        L.append(f'| {t/10} | {len(h)} | ' + ' | '.join(mi([x[kk] for x in h]) for kk, _ in M) + ' |')
DB = [('≤2', -99, 2), ('2-5', 2, 5), ('>5', 5, 99)]
L += ['\n**Non-DL by snap depth** (medians: speed / closing / disp; n at t=0)', '| t s | ' + ' | '.join(f'depth {b} (n={sum(lo<r["depth"]<=hi for r in recs)})' for b, lo, hi in DB) + ' |', '|---|---|---|---|']
for t in TS:
    cells = []
    for b, lo, hi in DB:
        h = [r['t'][t] for r in recs if lo < r['depth'] <= hi and t in r['t']]
        cells.append('/'.join(f'{q([x[kk] for x in h],.5):.1f}' for kk in ('s', 'close', 'disp')) if h else '-')
    L.append(f'| {t/10} | ' + ' | '.join(cells) + ' |')
L += ['\n**Time to first reach 3 yd/s** (within 3 s; p25/p50/p75, n reached/n)', '| group | t3 |', '|---|---|']
for nm, rs in G + [(f'non-DL depth {b}', [r for r in recs if lo < r['depth'] <= hi]) for b, lo, hi in DB]:
    v = [r['t3'] for r in rs if r['t3'] is not None]
    L.append(f'| {nm} | {q(v,.25):.1f}/{q(v,.5):.1f}/{q(v,.75):.1f} s ({len(v)}/{len(rs)}) |')
txt = '\n'.join(L); print(txt); open(f'{OUT}/nfl_blitzer_getoff.md', 'w').write(txt + '\n')
