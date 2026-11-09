#!/usr/bin/env python3
"""On dropbacks with a mug at the snap (a non-lineman on the line inside the guards), who rushes: muggers rushing (0/1/2),
linemen dropping, total rushers, and the coverage behind (pff_manZone / pff_passCoverage family). 2022 snap extract
(wasInitialPassRusher). Package by DBs. usage: mugrush.py nfl-snap.csv.gz"""
import csv, gzip, sys, collections
OL = {'T', 'G', 'C'}; DLP = {'DE', 'DT', 'NT'}; DBP = {'CB', 'SS', 'FS', 'DB', 'S'}
def plays(path):
    cur, key = [], None
    with gzip.open(path, 'rt', newline='') as f:
        for r in csv.DictReader(f):
            k = (r['gameId'], r['playId'])
            if k != key and cur: yield cur; cur = []
            key = k; cur.append(r)
    if cur: yield cur
C = collections.defaultdict(collections.Counter); N = collections.Counter()
for P in plays(sys.argv[1]):
    if P[0]['isDropback'] != 'TRUE': continue
    O = [r for r in P if r['side'] == 'O']; D = [r for r in P if r['side'] == 'D']
    ol = sorted(float(r['y']) for r in O if r['position'] in OL)
    if len(ol) != 5: continue
    by = float(P[0]['ball_y']); gl, gr = ol[1] - by, ol[3] - by
    mug = [r for r in D if r['position'] not in DLP and 0 <= float(r['x']) < 2 and gl - .5 <= float(r['y']) - by <= gr + .5]
    if any(r['wasInitialPassRusher'] in ('', 'NA') for r in D): continue
    rush = lambda r: r['wasInitialPassRusher'] in ('1', 'TRUE')
    dbs = sum(r['position'] in DBP for r in D); pkg = 'nickel' if dbs == 5 else 'dime' if dbs >= 6 else 'base'
    k = (pkg, 'double' if len(mug) >= 2 else 'single' if mug else 'no mug')
    N[k] += 1
    mr = sum(rush(r) for r in mug); dld = sum(not rush(r) for r in D if r['position'] in DLP); tot = sum(rush(r) for r in D)
    C[k][f'muggers rush {mr}/{len(mug)}'] += 1; C[k][f'DL drop {dld}'] += 1; C[k][f'rush {tot}'] += 1
    cov = P[0]['pff_passCoverage'] or '?'; C[k][f"cov {P[0]['pff_manZone']}"] += 1
for k in sorted(N):
    n = N[k]; c = C[k]
    print(f"{k[0]:6} {k[1]:6} mug dropbacks n {n}")
    for pre in ('muggers rush', 'DL drop', 'rush ', 'cov '):
        print('   ' + '  '.join(f"{kk} {100*v/n:.0f}%" for kk, v in sorted(c.items()) if kk.startswith(pre)))
