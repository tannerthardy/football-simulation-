"""NFL pullers' hip/shoulder turn out of the stance (BDB2025 tracking 'o').
Pullers: OL on POWER/COUNTER/TRAP runs who get >= 2 yd lateral by 1.0 s after the snap
while staying within 0.5 yd of their snap depth downfield. Per puller: orientation change
toward the pull side over time, time to open 45 and 90 degrees, peak turn rate, speed."""
import csv, math, sys, statistics as st, collections
D = sys.argv[1]; weeks = sys.argv[2:] or ['1', '2']
plays = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['isDropback'] == 'FALSE' and r['pff_runConceptPrimary'] in ('POWER', 'COUNTER', 'TRAP'):
        plays[(r['gameId'], r['playId'])] = r['pff_runConceptPrimary']
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
OL = {'G', 'T', 'C', 'OG', 'OT'}
track = collections.defaultdict(list)
for w in weeks:
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in plays or pos.get(r['nflId']) not in OL: continue
        track[(k, r['nflId'])].append(r)
res = []
for (k, pid), rows in track.items():
    rows.sort(key=lambda r: int(r['frameId']))
    snap = next((i for i, r in enumerate(rows) if r['frameType'] == 'SNAP' or r['event'] == 'ball_snap'), None)
    if snap is None or snap + 12 > len(rows): continue
    flip = rows[0]['playDirection'] == 'left'
    def xy(r):
        x, y = float(r['x']), float(r['y'])
        return (-x, -y) if flip else (x, y)
    def ori(r):  # NGS: 0 deg = +y, clockwise; convert to math angle in normalized frame
        o = float(r['o']) if r['o'] not in ('', 'NA') else float('nan')
        a = math.radians(90 - o)
        return a + math.pi if flip else a
    x0, y0 = xy(rows[snap]); x10, y10 = xy(rows[snap + 10])
    if abs(y10 - y0) < 2 or x10 - x0 > 0.5: continue
    side = 1 if y10 > y0 else -1
    pull = math.atan2(side, 0)  # direction of the pull (lateral)
    a0 = ori(rows[snap])
    def turned(i):  # how far the shoulders have opened toward the pull since the snap (rad)
        d = math.atan2(math.sin(ori(rows[i]) - a0), math.cos(ori(rows[i]) - a0))
        return d * (1 if math.atan2(math.sin(pull - a0), math.cos(pull - a0)) > 0 else -1)
    tr = [turned(snap + j) for j in range(0, 11)]
    t45 = next((j * .1 for j, v in enumerate(tr) if v >= math.radians(45)), None)
    t90 = next((j * .1 for j, v in enumerate(tr) if v >= math.radians(90)), None)
    rate = max((tr[j + 1] - tr[j - 1]) / .2 for j in range(1, 10))
    sp = [math.dist(xy(rows[snap + j + 1]), xy(rows[snap + j - 1])) / .2 for j in range(1, 10)]
    t05 = next((j * .1 for j, v in enumerate(sp, 1) if v >= .5), None)
    res.append(dict(t45=t45, t90=t90, rate=rate, open03=tr[3], open05=tr[5], start=math.degrees(abs(math.atan2(math.sin(pull - a0), math.cos(pull - a0)))), t05=t05, v5=sp[4]))
m = lambda v: round(st.median([x for x in v if x is not None]), 2)
print('NFL pullers', len(res), '| start facing off the pull (deg)', m([r['start'] for r in res]),
      '| opened by 0.3 s / 0.5 s (deg)', round(math.degrees(m([r['open03'] for r in res])), 0), round(math.degrees(m([r['open05'] for r in res])), 0),
      '| t to open 45 / 90 deg', m([r['t45'] for r in res]), m([r['t90'] for r in res]), f"(reach 90: {sum(r['t90'] is not None for r in res)}/{len(res)})",
      '| peak turn rate rad/s', m([r['rate'] for r in res]), 'p90', round(sorted(r['rate'] for r in res)[int(.9 * len(res))], 2),
      '| 0.5 yd/s at', m([r['t05'] for r in res]), '| speed 0.5 s', m([r['v5'] for r in res]))
