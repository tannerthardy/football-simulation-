"""The back's flat path at equal time after the snap, NFL vs sim, same quantities: every back running a flat (NFL
routeRan FLAT, BDB 2025; sim players[].route back:back_flat in the common export), at 0.5 s steps until the ball is
thrown: depth past the LOS, distance from his start toward the flat side, distance from the sideline he runs to.
   python3 -I scripts/diag/backs/flat_path.py nfl=<bdb2025 dir>:1,2  sim-name=<export.jsonl.gz> ..."""
import csv, sys, gzip, json
from collections import defaultdict
STEPS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5]
def q(v):
    v = sorted(v); return f"{v[len(v)//4]:.1f}/{v[len(v)//2]:.1f}/{v[3*len(v)//4]:.1f} n{len(v)}" if len(v) >= 8 else f'n{len(v)}'
def report(name, paths):
    print(f'== {name}: {len(paths)} flats')
    for t in STEPS:
        X = [p[t] for p in paths if t in p]
        print(f'  {t:.1f} s  depth {q([x[0] for x in X])} | toward the flat {q([x[1] for x in X])} | from the sideline {q([x[2] for x in X])}')
def nfl(root, weeks):
    pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{root}/players.csv'))}
    runners = defaultdict(set)
    for r in csv.DictReader(open(f'{root}/player_play.csv')):
        if r['routeRan'] == 'FLAT' and pos.get(r['nflId']) in ('RB', 'FB'): runners[(r['gameId'], r['playId'])].add(r['nflId'])
    tr = defaultdict(lambda: defaultdict(dict)); ev = defaultdict(dict); meta = {}
    for w in weeks:
        for r in csv.DictReader(open(f'{root}/tracking_week_{w}.csv')):
            k = (r['gameId'], r['playId'])
            if k not in runners: continue
            f = int(r['frameId'])
            if r['displayName'] == 'football':
                if r['event'] in ('ball_snap', 'pass_forward') and r['event'] not in ev[k]: ev[k][r['event']] = f
                if r['event'] == 'ball_snap': meta[k] = (float(r['x']), 1 if r['playDirection'] == 'right' else -1)
            elif r['nflId'] in runners[k]: tr[k][r['nflId']][f] = (float(r['x']), float(r['y']))
    out = []
    for k, ps in tr.items():
        if k not in meta or 'ball_snap' not in ev[k]: continue
        sx, d = meta[k]; f0 = ev[k]['ball_snap']; fe = ev[k].get('pass_forward', 10 ** 9)
        for pid, P in ps.items():
            if f0 not in P: continue
            x0, y0 = P[f0]; path = {}
            for t in STEPS:
                f = f0 + round(t * 10)
                if f > fe or f not in P: continue
                x, y = P[f]
                side = 1 if (P.get(min(fe, f0 + 30), P[f])[1] - y0) > 0 else -1
                path[t] = ((x - sx) * d, (y - y0) * side, (53.33 - y) if side > 0 else y)
            out.append(path)
    return out
def sim(path):
    sys.path.insert(0, '/home/user/fb-back/scripts/mechanics')
    from metrics import Play
    out = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if raw.get('kind') != 'pass': continue
        fe = ev.get('pass_forward', 99)
        p = None
        for j, pl in enumerate(raw['players']):
            if pl.get('route') != 'back:back_flat': continue
            p = p or Play(raw)
            x0, y0 = p.pos(j, 0)
            if x0 is None: continue
            k3 = p.k(min(fe, 3.0)); y3 = p.pos(j, k3)[1]
            side = 1 if (y3 if y3 is not None else y0) - y0 > 0 else -1
            P = {}
            for t in STEPS:
                if t > fe: continue
                x, y = p.pos(j, p.k(t))
                if x is None: continue
                P[t] = (x, (y - y0) * side, (53.33 - y) if side > 0 else y)
            out.append(P)
    return out
for arg in sys.argv[1:]:
    name, src = arg.split('=', 1)
    if name == 'nfl':
        root, weeks = src.rsplit(':', 1); report('NFL FLAT (routeRan)', nfl(root, [int(w) for w in weeks.split(',')]))
    else: report(f'sim {name}', sim(src))
