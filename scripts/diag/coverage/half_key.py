"""The half safety's key, one operator for NFL tracking and the sim (Integration, 2026-11-18: HNFL-334's "#1 vertical:
widen and see #2; both vertical: vision & squeeze; #1 cancels: tighten and deflate #2").

Input rows (JSONL), one per half safety per play: {"cov": label, "t": [s after snap], "s": [[x, y]...] the safety,
"r1": [[x, y]...] his side's #1, "r2": [[x, y]...] his side's #2, "los": x, "dir": +1|-1 (attack direction in x),
"throw": s or null}. Field y as tracked (0..53.3). Per row at T (default 2.1 s, frames before the throw only):
  class of #1 and #2: vertical if depth past the LOS >= 8 yd and downfield speed over the last 0.3 s > 3 yd/s
  ('V'), else 'C' (cancel: break, sit or under);
  frac: the safety's lateral place between #2 (0) and #1 (1);
  wide: his lateral distance from his own snap spot toward #1's side, yd; depth: past the LOS, yd.
  python3 -I half_key.py nfl <bdb2025 dir> <out.jsonl> [weeks]
  python3 -I half_key.py table <rows.jsonl> [more.jsonl ...] [--t 2.1]
"""
import csv, json, sys, statistics as st
from collections import defaultdict

T = 2.1


def at(row, key, t):
    ts = row['t']
    for i in range(1, len(ts)):
        if ts[i] >= t:
            f = (t - ts[i - 1]) / max(1e-9, ts[i] - ts[i - 1])
            a, b = row[key][i - 1], row[key][i]
            return a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])
    return None


def cls(row, key, t):
    p, q = at(row, key, t), at(row, key, t - 0.3)
    if not p or not q:
        return None
    depth = (p[0] - row['los']) * row['dir']
    v = (p[0] - q[0]) * row['dir'] / 0.3
    return 'V' if depth >= 8 and v > 3 else 'C'


def measure(row, t):
    if row.get('throw') is not None and row['throw'] < t:
        return None
    s, a, b = at(row, 's', t), at(row, 'r1', t), at(row, 'r2', t)
    if not s or not a or not b:
        return None
    c1, c2 = cls(row, 'r1', t), cls(row, 'r2', t)
    span = a[1] - b[1]
    if abs(span) < 2:
        return None
    side = 1 if span > 0 else -1
    return {'k': c1 + c2, 'frac': (s[1] - b[1]) / span, 'wide': (s[1] - row['s'][0][1]) * side,
            'depth': (s[0] - row['los']) * row['dir'], 'cov': row['cov']}


def nfl(src, out, weeks='1'):
    plays = {}
    for p in csv.DictReader(open(f'{src}/plays.csv')):
        if p['pff_passCoverage'] in ('Cover-2',) and p['passResult'] not in ('', 'NA', 'R') and p['playAction'] == 'FALSE':
            plays[(p['gameId'], p['playId'])] = p
    halves = defaultdict(list)
    for r in csv.DictReader(open(f'{src}/player_play.csv')):
        k = (r['gameId'], r['playId'])
        if k in plays and r['pff_defensiveCoverageAssignment'] in ('2L', '2R'):
            halves[k].append(r['nflId'])
    pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{src}/players.csv'))}
    frames = defaultdict(list)
    for w in weeks.split(','):
        for f in csv.DictReader(open(f'{src}/tracking_week_{w}.csv')):
            if (f['gameId'], f['playId']) in halves:
                frames[(f['gameId'], f['playId'])].append(f)
    n = 0
    with open(out, 'w') as o:
        for k, fs in frames.items():
            p = plays[k]
            snap = next((int(f['frameId']) for f in fs if f['frameType'] == 'SNAP'), None)
            if snap is None:
                continue
            ball = next((f for f in fs if f['displayName'] == 'football' and int(f['frameId']) == snap), None)
            if not ball:
                continue
            dirn = 1 if fs[0]['playDirection'] == 'right' else -1
            los, by = float(ball['x']), float(ball['y'])
            thr = next((int(f['frameId']) for f in fs if f['event'] in ('pass_forward', 'pass_shovel')), None)
            by_id = defaultdict(list)
            for f in fs:
                if f['displayName'] != 'football' and int(f['frameId']) >= snap:
                    by_id[f['nflId']].append(f)
            for v in by_id.values():
                v.sort(key=lambda f: int(f['frameId']))
            off = [i for i, v in by_id.items() if v[0]['club'] == p['possessionTeam'] and pos.get(i) in ('WR', 'TE', 'RB', 'FB')]
            for sid in halves[k]:
                sv = by_id.get(sid)
                if not sv:
                    continue
                side = 1 if float(sv[0]['y']) > by else -1
                mine = sorted([i for i in off if (float(by_id[i][0]['y']) - by) * side > 0
                               and ((los - float(by_id[i][0]['x'])) * dirn < 2.5 or abs(float(by_id[i][0]['y']) - by) > 4)],
                              key=lambda i: -abs(float(by_id[i][0]['y']) - by))
                if len(mine) < 2:
                    continue
                L = min(len(sv), len(by_id[mine[0]]), len(by_id[mine[1]]))
                row = {'cov': 'NFL ' + p['pff_passCoverage'], 'los': los, 'dir': dirn, 'throw': (thr - snap) / 10 if thr else None,
                       't': [(int(sv[i]['frameId']) - snap) / 10 for i in range(L)],
                       's': [[float(sv[i]['x']), float(sv[i]['y'])] for i in range(L)],
                       'r1': [[float(by_id[mine[0]][i]['x']), float(by_id[mine[0]][i]['y'])] for i in range(L)],
                       'r2': [[float(by_id[mine[1]][i]['x']), float(by_id[mine[1]][i]['y'])] for i in range(L)]}
                o.write(json.dumps(row) + '\n')
                n += 1
    print(n, 'half-safety rows')


def table(paths, t):
    g = defaultdict(lambda: defaultdict(list))
    for path in paths:
        for line in open(path):
            m = measure(json.loads(line), t)
            if m:
                g[m['cov']][m['k']].append(m)
    q = lambda v: f'{st.median(v):.2f} [{st.quantiles(v, n=4)[0]:.2f}, {st.quantiles(v, n=4)[2]:.2f}]' if len(v) >= 4 else '-'
    print(f'| coverage | #1 #2 at {t:g} s | n | frac (0 = over #2, 1 = over #1) | widened, yd | depth, yd |')
    print('|---|---|---|---|---|---|')
    for cov in sorted(g):
        for k in ('VV', 'VC', 'CV', 'CC'):
            v = g[cov].get(k, [])
            if v:
                print(f"| {cov} | {k} | {len(v)} | {q([x['frac'] for x in v])} | {q([x['wide'] for x in v])} | {q([x['depth'] for x in v])} |")


if __name__ == '__main__':
    if sys.argv[1] == 'nfl':
        nfl(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else '1')
    else:
        args = [a for a in sys.argv[2:] if not a.startswith('--')]
        tt = float(sys.argv[sys.argv.index('--t') + 1]) if '--t' in sys.argv else T
        if '--t' in sys.argv:
            args.remove(sys.argv[sys.argv.index('--t') + 1])
        table(args, tt)
