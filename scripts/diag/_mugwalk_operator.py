"""NFL mugs and edge walk-downs at the snap frame, by package (DBs on field: <=4 base, 5 nickel, 6+ dime) and
situation (plays.csv down/yardsToGo). Mug: a non-DL defender 0..1.6 yd off the ball inside the guards' outer edge
(|y - OL centre| < guard y + 0.5). Edge walk-down: a non-DL 0..1.6 yd off the ball outside the tackles, within 3.5 yd
of the tackle. Shares of plays with >=1 (and >=2 mugs). usage: mugwalk.py nfl-plays.jsonl.gz plays.csv"""
import sys, gzip, json, csv, collections
P = {}
if len(sys.argv) > 2:
    for r in csv.DictReader(open(sys.argv[2])):
        P[f"{r['gameId']}-{r['playId']}"] = (int(r['down']), int(r['yardsToGo']))
R = collections.defaultdict(lambda: collections.Counter())
for line in (gzip.open(sys.argv[1], 'rt') if sys.argv[1].endswith('.gz') else open(sys.argv[1])):
    if not line.startswith('{'): continue
    p = json.loads(line); s = P.get(p['id']) or ((p['down'], p['togo']) if 'down' in p else None)
    if not s or not p['xy']: continue
    pl = p['players']; n = len(pl); xy = [(p['xy'][0][2*i], p['xy'][0][2*i+1]) for i in range(n)]
    ol = sorted(xy[i][1] for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] == 'OL')
    if len(ol) != 5: continue
    cy = sum(ol) / 5; gw = max(abs(ol[1] - cy), abs(ol[3] - cy)) + .5
    dbs = sum(q['side'] == 'D' and q['group'] == 'DB' for q in pl)
    pkg = 'base' if dbs <= 4 else 'nickel' if dbs == 5 else 'dime'
    d, togo = s; sit = '1st' if d == 1 else '2nd' if d == 2 else '3/4 short' if togo < 4 else '3/4 long'
    mugs = edgeLB = edgeDB = 0
    for i, q in enumerate(pl):
        if q['side'] != 'D' or q['group'] == 'DL': continue
        x, y = xy[i]
        if not (0 <= x <= 1.6): continue
        if abs(y - cy) < gw: mugs += 1
        elif (y < ol[0] or y > ol[4]) and min(abs(y - ol[0]), abs(y - ol[4])) <= 3.5:
            if q['group'] == 'LB': edgeLB += 1
            else: edgeDB += 1
    k = (pkg, sit); c = R[k]; c['n'] += 1; c['mug1'] += mugs >= 1; c['mug2'] += mugs >= 2; c['edgeLB'] += edgeLB >= 1; c['edgeDB'] += edgeDB >= 1
    R[(pkg, 'all')].update({'n': 1, 'mug1': mugs >= 1, 'mug2': mugs >= 2, 'edgeLB': edgeLB >= 1, 'edgeDB': edgeDB >= 1})
for pkg in ('base', 'nickel', 'dime'):
    for sit in ('1st', '2nd', '3/4 short', '3/4 long', 'all'):
        c = R[(pkg, sit)]
        if c['n']: print(f"{pkg:6} {sit:9} n {c['n']:5}  mug>=1 {100*c['mug1']/c['n']:4.1f}%  mug>=2 {100*c['mug2']/c['n']:4.1f}%  edge LB {100*c['edgeLB']/c['n']:4.1f}%  edge DB {100*c['edgeDB']/c['n']:4.1f}%")
