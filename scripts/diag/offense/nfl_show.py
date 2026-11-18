"""What NFL offenses present (BDB 2025, all plays of the given weeks; plays.csv offenseFormation/receiverAlignment, and the
snap frame of the tracking for personnel, splits, stacks and bunches with the same thresholds as structure.ts), plus
route-label and pattern shares on dropbacks. Comparable to scripts/diag/offense/what-we-show.mts.
  python3 -I nfl_show.py <bdb2025 dir> [weeks]
"""
import csv, sys
from collections import Counter, defaultdict

BUNCH_WIDTH, STACK_WIDTH, STACK_DEPTH, REDUCED_SPLIT = 4.5, 1.6, 0.8, 9
src = sys.argv[1]
weeks = (sys.argv[2] if len(sys.argv) > 2 else '1').split(',')
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{src}/players.csv'))}
plays = {(p['gameId'], p['playId']): p for p in csv.DictReader(open(f'{src}/plays.csv'))}
pp = defaultdict(dict)
for r in csv.DictReader(open(f'{src}/player_play.csv')):
    pp[(r['gameId'], r['playId'])][r['nflId']] = r
snap = defaultdict(list)
for w in weeks:
    for f in csv.DictReader(open(f'{src}/tracking_week_{w}.csv')):
        if f['frameType'] == 'SNAP':
            snap[(f['gameId'], f['playId'])].append(f)
n = 0
c = Counter()
pers = Counter()
form = Counter()
align = Counter()
routes = Counter()
pat = Counter()
drop = 0
for k, fs in snap.items():
    p = plays.get(k)
    if not p or p['qbKneel'] == 'TRUE' or p['qbSpike'] == 'TRUE':
        continue
    ball = next((f for f in fs if f['displayName'] == 'football'), None)
    if not ball:
        continue
    off = [f for f in fs if f['club'] == p['possessionTeam']]
    by = float(ball['y'])
    dirn = 1 if fs[0]['playDirection'] == 'right' else -1
    los = float(ball['x'])
    skill = [f for f in off if pos.get(f['nflId']) in ('WR', 'TE', 'RB', 'FB')]
    pc = Counter(pos.get(f['nflId']) for f in skill)
    pers[f"{pc['RB'] + pc['FB']}{pc['TE']}"] += 1
    n += 1
    form[p['offenseFormation'] or 'NA'] += 1
    align[p['receiverAlignment'] or 'NA'] += 1
    # Receivers: on or near the line (not in the backfield behind the QB's depth), each side outside-in.
    recv = [f for f in skill if (los - float(f['x'])) * dirn < 2.5 or abs(float(f['y']) - by) > 4]
    tags = set()
    for side in (1, -1):
        s = sorted([f for f in recv if (float(f['y']) - by) * side > 0], key=lambda f: -abs(float(f['y']) - by))
        lat = [abs(float(f['y']) - by) for f in s]
        dep = [(los - float(f['x'])) * dirn for f in s]
        if len(s) >= 3 and lat[0] - lat[2] <= BUNCH_WIDTH:
            tags.add('bunch')
        for i in range(len(s)):
            for j in range(i + 1, len(s)):
                if abs(lat[i] - lat[j]) <= STACK_WIDTH and abs(dep[i] - dep[j]) >= STACK_DEPTH and lat[j] > 4:
                    tags.add('stack')
        if s and 6 <= lat[0] < REDUCED_SPLIT:
            tags.add('reduced')
        if len(s) >= 2 and lat[1] > 5.5:
            tags.add(f'det2_{side}')
    if 'det2_1' in tags and 'det2_-1' in tags and p['receiverAlignment'] == '2x2':
        tags.add('2x2_two_detached_2s')
    if p['receiverAlignment'] == '4x1':
        tags.add('quads')
    for t in tags:
        if not t.startswith('det2'):
            c[t] += 1
    if p['passResult'] not in ('', 'NA'):
        drop += 1
        rr = [r for r in pp[k].values() if r['routeRan'] not in ('', 'NA')]
        for r in rr:
            routes[r['routeRan']] += 1
        labels = Counter(r['routeRan'] for r in rr)
        if labels['WHEEL']:
            pat['wheel on the play'] += 1
        if labels['CORNER']:
            pat['corner on the play'] += 1
        if labels['CROSS'] and p['receiverAlignment'] in ('3x1', '3x2'):
            pat['trips with a cross'] += 1
        if labels['FLAT'] and labels['GO'] and p['receiverAlignment'] in ('3x1', '3x2'):
            pat['trips: flat and a go (flood/sail shape)'] += 1
        if p['playAction'] == 'TRUE':
            pat['play action'] += 1
print(f'snaps {n} (weeks {",".join(weeks)}), dropbacks {drop}')
print('personnel (RB+FB, TE):', ', '.join(f'{k} {100 * v / n:.1f}%' for k, v in pers.most_common(8)))
print('offenseFormation:', ', '.join(f'{k} {100 * v / n:.1f}%' for k, v in form.most_common()))
print('receiverAlignment:', ', '.join(f'{k} {100 * v / n:.1f}%' for k, v in align.most_common()))
print('structure:', ', '.join(f'{k} {100 * v / n:.1f}%' for k, v in c.most_common()))
tr = sum(routes.values())
print('route labels on dropbacks:', ', '.join(f'{k} {100 * v / tr:.1f}%' for k, v in routes.most_common()))
print('patterns per dropback:', ', '.join(f'{k} {100 * v / drop:.1f}%' for k, v in pat.most_common()))
