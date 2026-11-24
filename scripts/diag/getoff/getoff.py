"""Receivers' get-off (Flex, 2026-11-24; Integration: "receivers get off the line late"). One operator for NFL tracking and
our engine: for every route runner, distance downfield of the line and speed at 0.5 / 1.0 / 1.5 / 2.0 / 3.0 s after the
snap, by alignment at the snap (wide = the widest receiver on his side, slot = any other detached, inline = within 4.5 yd of
the ball) and route family (quick: slant, hitch, flat, screen, angle; intermediate: out, in, cross, dig, drag; vertical: go,
post, corner, wheel, seam, fade). Two cuts: every route, and only while the ball is still held (no pass yet) at that time.
Plus the time to 10 and 20 yd downfield (verticals).

  NFL:  python3 -I scripts/diag/getoff/getoff.py nfl data/raw/bdb2025/big-data-bowl-data 1 2 > out/getoff-nfl.json
  ours: python3 -I scripts/diag/getoff/getoff.py sim SIM.jsonl.gz [...] > out/getoff-sim.json
  table: python3 -I scripts/diag/getoff/getoff.py table out/getoff-nfl.json LABEL out/getoff-sim.json [LABEL ...]
"""
import csv, gzip, json, math, sys
from collections import defaultdict

TIMES = (0.5, 1.0, 1.5, 2.0, 3.0)
QUICK = ('SLANT', 'HITCH', 'FLAT', 'SCREEN', 'ANGLE', 'STICK', 'QUICK_OUT', 'BUBBLE', 'SPEED_OUT', 'WHIP')
INTER = ('OUT', 'IN', 'CROSS', 'DIG', 'DRAG', 'OVER', 'SHALLOW', 'CURL', 'COMEBACK', 'SIT')
VERT = ('GO', 'POST', 'CORNER', 'WHEEL', 'SEAM', 'FADE', 'STREAK', 'VERT')


def family(route):
    r = (route or '').upper().replace('-', '_')
    if ':' in r: r = r.split(':', 1)[1]
    for fam, keys in (('quick', QUICK), ('vertical', VERT), ('intermediate', INTER)):
        if any(r == k or r.startswith(k + '_') or r.endswith('_' + k) or k in r.split('_') for k in keys): return fam
    return None


def align_of(rows):
    """rows: [(key, x0, y_off, is_te)] for one play's route runners at the snap (y_off: lateral from the ball)."""
    out = {}
    for side in (1, -1):
        on = [r for r in rows if r[2] * side > 0]
        on.sort(key=lambda r: -abs(r[2]))
        for i, (k, _, yo, te) in enumerate(on):
            out[k] = 'inline' if abs(yo) < 4.5 else 'wide' if i == 0 else 'slot'
    for k, _, yo, _ in rows: out.setdefault(k, 'inline')
    return out


def sample(path_x, path_s, dt, held_until):
    """path_x[i]: downfield (yd) at frame i after the snap; path_s: speed (yd/s). Returns per time (x, s, held)."""
    res = {}
    for t in TIMES:
        i = int(round(t / dt))
        if i < len(path_x): res[t] = (path_x[i], path_s[i], held_until is None or t < held_until)
    reach = {}
    for d in (10, 20):
        i = next((i for i, x in enumerate(path_x) if x >= d), None)
        if i is not None: reach[d] = i * dt
    return res, reach


def nfl(root, weeks):
    routes = {}
    with open(f'{root}/player_play.csv', newline='') as f:
        for r in csv.DictReader(f):
            rr = r.get('routeRan') or ''
            if rr and rr != 'NA': routes[(r['gameId'], r['playId'], r['nflId'])] = rr
    pos = {}
    with open(f'{root}/players.csv', newline='') as f:
        for r in csv.DictReader(f): pos[r['nflId']] = r['position']
    out = []
    for w in weeks:
        cur, rows = None, []
        def flush():
            if not rows: return
            snap = next((int(r['frameId']) for r in rows if r['frameType'] == 'SNAP'), None)
            if snap is None: return
            ball = {int(r['frameId']): (float(r['x']), float(r['y'])) for r in rows if r['displayName'] == 'football'}
            if snap not in ball: return
            los, by = ball[snap]
            d = 1 if rows[0]['playDirection'] == 'right' else -1
            fwd = next((int(r['frameId']) for r in rows if r['event'] in ('pass_forward', 'pass_shovel') and int(r['frameId']) >= snap), None)
            held = (fwd - snap) / 10 if fwd is not None else None
            per = defaultdict(dict)
            for r in rows:
                key = (r['gameId'], r['playId'], r['nflId'])
                if key in routes and int(r['frameId']) >= snap: per[key][int(r['frameId']) - snap] = ((float(r['x']) - los) * d, float(r['s']), (float(r['y']) - by) * d)
            at0 = [(k, v[0][0], v[0][2], pos.get(k[2]) == 'TE') for k, v in per.items() if 0 in v]
            al = align_of(at0)
            for k, v in per.items():
                n = max(v) + 1
                if any(i not in v for i in range(n)): continue
                xs, ss = [v[i][0] for i in range(n)], [v[i][1] for i in range(n)]
                res, reach = sample(xs, ss, 0.1, held)
                out.append({'fam': family(routes[k]), 'route': routes[k], 'align': al.get(k), 'at': {str(t): v for t, v in res.items()}, 'reach': reach})
            rows.clear()
        with open(f'{root}/tracking_week_{w}.csv', newline='') as f:
            for r in csv.DictReader(f):
                key = (r['gameId'], r['playId'])
                if key != cur:
                    flush(); cur = key
                rows.append(r)
            flush()
    return out


def sim(paths):
    out = []
    for path in paths:
        for line in gzip.open(path, 'rt'):
            p = json.loads(line)
            if p.get('kind') != 'pass': continue
            dt, xy, by = p['dt'], p['xy'], p['ball_y']
            held = p.get('events', {}).get('pass_forward')
            pl = p['players']
            idx = [i for i, q in enumerate(pl) if q['side'] == 'O' and q.get('route') and not str(q.get('route')).startswith('back')]
            at0 = [(i, xy[0][2 * i], xy[0][2 * i + 1] - by, pl[i].get('group') == 'TE' or pl[i].get('slot') == 'Y') for i in idx]
            al = align_of(at0)
            for i in idx:
                xs = [f[2 * i] for f in xy]
                ss = [0.0] + [math.hypot(xy[k][2 * i] - xy[k - 1][2 * i], xy[k][2 * i + 1] - xy[k - 1][2 * i + 1]) / dt for k in range(1, len(xy))]
                res, reach = sample(xs, ss, dt, held)
                out.append({'fam': family(pl[i]['route']), 'route': pl[i]['route'], 'align': al.get(i), 'at': {str(t): v for t, v in res.items()}, 'reach': reach})
    return out


def table(groups):
    print('| sample | align | family | n | ' + ' | '.join(f'{t:g}s yd (held) / speed' for t in TIMES) + ' | t to 10 / 20 yd |')
    print('|---|---|---|---|' + '---|' * len(TIMES) + '---|')
    for al in ('wide', 'slot'):
        for fam in ('quick', 'intermediate', 'vertical'):
            for lab, rows in groups:
                R = [r for r in rows if r['align'] == al and r['fam'] == fam]
                if not R: continue
                cells = []
                for t in TIMES:
                    v = [r['at'][str(t)] for r in R if str(t) in r['at']]
                    h = [x for x, s, held in v if held]
                    med = lambda a: sorted(a)[len(a) // 2] if a else float('nan')
                    cells.append(f"{med([x for x, _, _ in v]):.1f} ({med(h):.1f}, n{len(h)}) / {med([s for _, s, _ in v]):.1f}")
                reached = lambda d: sorted(r['reach'][str(d)] for r in R if str(d) in r['reach'])
                r10, r20 = reached(10), reached(20)
                m = lambda a: f"{a[len(a) // 2]:.2f}" if a else '-'
                print(f"| {lab} | {al} | {fam} | {len(R)} | " + ' | '.join(cells) + f" | {m(r10)} / {m(r20)} |")


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'nfl': json.dump(nfl(sys.argv[2], [int(w) for w in sys.argv[3:]]), sys.stdout)
    elif mode == 'sim': json.dump(sim(sys.argv[2:]), sys.stdout)
    else:
        a = sys.argv[2:]
        table([('NFL', json.load(open(a[0])))] + [(a[i], json.load(open(a[i + 1]))) for i in range(1, len(a), 2)])
