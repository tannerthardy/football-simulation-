"""Backs' FLAT routes, NFL (BDB 2025 weeks 1-3, read in place): non-PA drop-backs. Depth past the line (+ downfield)
and width outward from the ball (toward his release side) at 0.5 / 1.0 / 1.5 / 2.0 / 2.5 s, split by chip (blocked a
defender: blockedPlayerNFLId1 set) and by alignment depth. Plus the earliest-cue table: for every back on a
route or in protection, the first time his outward displacement from his snap spot reaches 0.5 / 1.0 / 1.5 yd with
outward speed over 1.0 / 1.5 yd/s, and the share of those firings whose route is FLAT / OUT / WHEEL / SCREEN /
ANGLE / other / no route (false alarms = not a flat-side release).
usage: python3 -I back_flat_nfl.py ARCHIVE.zip"""
import sys, csv, io, zipfile, math, collections as C
z = zipfile.ZipFile(sys.argv[1]); D = 'big-data-bowl-data/'
rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(D + n), encoding='utf-8'))
plays = {(r['gameId'], r['playId']) for r in rd('plays.csv') if r['isDropback'] in ('TRUE', 'True', '1') and r['playAction'] not in ('TRUE', 'True', '1') and r['playNullifiedByPenalty'] != 'Y'}
pos = {r['nflId']: r['position'] for r in rd('players.csv')}
who = {}
for r in rd('player_play.csv'):
    k = (r['gameId'], r['playId'])
    if k in plays and pos.get(r['nflId']) in ('RB', 'FB'):
        who[(k, r['nflId'])] = (r['routeRan'] if r['wasRunningRoute'] in ('1', 'TRUE', 'True') and r['routeRan'] not in ('', 'NA') else 'none', r['blockedPlayerNFLId1'] not in ('', 'NA'))
keys = {k for k, _ in who}
tr = C.defaultdict(dict); snap = {}
for w in (1, 2, 3):
    for r in rd(f'tracking_week_{w}.csv'):
        k = (r['gameId'], r['playId'])
        if k not in keys: continue
        if r['displayName'] == 'football':
            if r['event'] == 'ball_snap': snap[k] = (float(r['x']), float(r['y']), int(r['frameId']), 1 if r['playDirection'] == 'right' else -1)
            continue
        if (k, r['nflId']) in who: tr[(k, r['nflId'])][int(r['frameId'])] = (float(r['x']), float(r['y']))
TS = (0.5, 1.0, 1.5, 2.0, 2.5)
rows = C.defaultdict(lambda: C.defaultdict(list)); cues = C.defaultdict(lambda: C.defaultdict(list))
q = lambda v: '-' if len(v) < 5 else '/'.join(f'{sorted(v)[int(f * (len(v) - 1))]:.1f}' for f in (.25, .5, .75))
for (k, i), T in tr.items():
    if k not in snap: continue
    lx, ly, f0, sg = snap[k]
    if f0 not in T: continue
    route, chip = who[(k, i)]
    x0, y0 = T[f0]
    end = T.get(f0 + 25) or T[max(T)]
    side = 1 if end[1] - y0 >= 0 else -1
    dep = lambda p: (p[0] - lx) * sg
    wid = lambda p: (p[1] - ly) * side
    if route == 'FLAT':
        lab = ('chip' if chip else 'no chip') + (', from the gun side (within 1.5 yd of the QB depth)' if dep((x0, y0)) > -6 else ', deep (pistol/I)')
        for t in TS:
            p = T.get(f0 + round(t * 10))
            if p: rows[lab][t].append((dep(p), wid(p)))
    # earliest cue: outward displacement and speed (0.2 s difference)
    for dmin in (0.5, 1.0, 1.5):
        for vmin in (1.0, 1.5):
            for f in sorted(T):
                if f <= f0 + 1 or f - 2 not in T: continue
                p, pp = T[f], T[f - 2]
                outd = (p[1] - y0) * side; v = (p[1] - pp[1]) * side / 0.2
                if outd >= dmin and v >= vmin:
                    cues[(dmin, vmin)][route].append((f - f0) / 10); break
print('== NFL backs on FLAT, non-PA drop-backs, weeks 1-3: depth past the line / width outward, p25/50/75')
for lab, R in sorted(rows.items()):
    print(f'   {lab}: n {len(R[1.0])}')
    for t in TS: print(f'      {t:.1f} s depth {q([d for d, w in R[t]])} width {q([w for d, w in R[t]])}')
print('== earliest cue (outward from the snap spot, toward his eventual side): time fired p25/50/75 and who fired')
for key, R in sorted(cues.items()):
    n = sum(len(v) for v in R.values()); fl = sum(len(R[r]) for r in ('FLAT', 'OUT', 'WHEEL', 'SCREEN'))
    print(f'   out >= {key[0]} yd, speed >= {key[1]} yd/s: fired {n}, flat-side release {fl} ({fl / max(1, n):.2f}); FLAT fired at {q(R["FLAT"])} s; others: ' + ', '.join(f'{r} {len(v)} ({q(v)})' for r, v in sorted(R.items(), key=lambda x: -len(x[1])) if r not in ('FLAT',)))
