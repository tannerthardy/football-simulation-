"""Realized rush rate of non-linemen by snap alignment (BDB 2025 wk1-3, dropback, no PA): the classes BLITZ_READ's prior
uses (depth from the ball, width from the ball): line off-ball depth<=1.5 & wide<=9.5; box depth<=6 & wide<=5.5;
edge depth<=2.5 & wide<=9.5; else. Split by position group (OLB separately: in the sim, edge rushers are linemen).
Run: python3 -I nfl_rush_by_align.py [datadir] [outdir]"""
import csv, sys, os, collections, json
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'out', 'eyes')
os.makedirs(OUT, exist_ok=True)
WEEKS = (1, 2, 3)
games = {r['gameId'] for r in csv.DictReader(open(f'{D}/games.csv')) if int(r['week']) in WEEKS}
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv'))
         if r['gameId'] in games and r['isDropback'] == 'TRUE' and r['playAction'] == 'FALSE'}
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
rush = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays: rush[(k, r['nflId'])] = r['wasInitialPassRusher'] in ('1', 'TRUE')
snap = collections.defaultdict(list)
for w in WEEKS:
    with open(f'{D}/tracking_week_{w}.csv') as f:
        rd = csv.reader(f); h = next(rd); ix = {c: i for i, c in enumerate(h)}
        g, p, n, cl, pd, x, y, e = (ix[c] for c in ('gameId', 'playId', 'nflId', 'club', 'playDirection', 'x', 'y', 'event'))
        for row in rd:
            if row[e] != 'ball_snap': continue
            k = (row[g], row[p])
            if k in plays: snap[k].append((row[n], row[cl], float(row[x]), float(row[y]), row[pd]))
DL = {'DE', 'DT', 'NT'}
def cls(dep, wide):
    if dep <= 1.5 and wide <= 9.5: return 'line'
    if dep <= 6 and wide <= 5.5: return 'box'
    if dep <= 2.5 and wide <= 9.5: return 'edge'
    return 'else'
grp = lambda p: 'OLB' if p == 'OLB' else 'LB' if p in ('ILB', 'MLB', 'LB') else 'DB'
C = collections.defaultdict(lambda: [0, 0])
for k, rows in snap.items():
    b = [r for r in rows if r[1] == 'football']
    if not b: continue
    bx, by = b[0][2], b[0][3]; sg = 1 if b[0][4] == 'right' else -1; off = plays[k]['possessionTeam']
    for r in rows:
        if r[1] in (off, 'football') or pos.get(r[0]) in DL: continue
        c = cls(sg * (r[2] - bx), abs(r[3] - by)); g_ = grp(pos.get(r[0]))
        v = rush.get((k, r[0]), False)
        for key in ((c, g_), (c, 'all'), (c, 'all-but-OLB') if g_ != 'OLB' else None):
            if key: C[key][0] += v; C[key][1] += 1
L = ['| class | prior | all | all but OLB | OLB | LB | DB |', '|---|---|---|---|---|---|---|']
PR = {'line': 0.45, 'box': 0.25, 'edge': 0.3, 'else': 0.03}
cell = lambda k: f'{100*C[k][0]/C[k][1]:.0f}% ({C[k][1]})' if C[k][1] else '-'
for c in ('line', 'box', 'edge', 'else'):
    L.append(f'| {c} | {PR[c]:.2f} | ' + ' | '.join(cell((c, g)) for g in ('all', 'all-but-OLB', 'OLB', 'LB', 'DB')) + ' |')
open(f'{OUT}/nfl_rush_by_align.md', 'w').write('\n'.join(L) + '\n')
json.dump({f'{a}|{b}': v for (a, b), v in C.items()}, open(f'{OUT}/nfl_rush_by_align.json', 'w'))
print('\n'.join(L))
