"""Rally to the runner, one operator for NFL tracking and sim common plays.
Around the run's first contact, by where it happens (yards past the line):
other defenders (not the first tackler) within 3 yd and within 5 yd of the
carrier at -0.5 s, contact and +0.5 s, by group, and their median closing
speed on the carrier at contact (defenders 3-10 yd away).
usage: runrally.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
mean = lambda v: round(sum(v) / len(v), 2) if v else None
BANDS = ((-99, 0, 'behind'), (0, 2, '0-2'), (2, 5, '2-5'), (5, 99, '5+'))
for path in sys.argv[1:]:
    g = {b[2]: {'n': 0, 'w3': {-.5: [], 0: [], .5: []}, 'w5': {-.5: [], 0: [], .5: []}, 'grp3': {'DL': [], 'LB': [], 'DB': []}, 'close': [], 'gc': {'DL': [], 'LB': [], 'DB': []}, 'gs': {'DL': [], 'LB': [], 'DB': []}} for b in BANDS}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        t = (raw.get('events') or {}).get('first_contact')
        p = Play(raw); c = raw['carrier']
        if t is None or not p.live(t) or not p.live(t + .5) or t < .5: continue
        k = p.k(t); cx = p.pos(c, k)[0]
        if cx is None: continue
        ds = [d for d in p.who('D') if p.pos(d, k)[0] is not None]
        first = min(ds, key=lambda d: p.dist(d, c, k))
        o = g[next(b[2] for b in BANDS if b[0] <= cx < b[1])]; o['n'] += 1
        others = [d for d in ds if d != first]
        for lag in (-.5, 0, .5):
            kk = p.k(t + lag)
            if p.pos(c, kk)[0] is None: continue
            dist = [p.dist(d, c, kk) for d in others if p.pos(d, kk)[0] is not None]
            o['w3'][lag].append(sum(x <= 3 for x in dist)); o['w5'][lag].append(sum(x <= 5 for x in dist))
        for grp in ('DL', 'LB', 'DB'):
            o['grp3'][grp].append(sum(1 for d in others if p.players[d]['group'] == grp and p.dist(d, c, k) <= 3))
        (vx, vy) = p.velocity(c, k)
        for d in others:
            r = p.dist(d, c, k)
            if not 3 < r <= 10: continue
            (dx, dy), (ex, ey) = p.pos(c, k), p.pos(d, k); gx, gy = dx - ex, dy - ey
            wx, wy = p.velocity(d, k)
            o['close'].append(((wx - vx) * gx + (wy - vy) * gy) / r)
            grp = p.players[d]['group']
            if grp in o['gc']: o['gc'][grp].append(((wx - vx) * gx + (wy - vy) * gy) / r); o['gs'][grp].append(math.hypot(wx, wy))
    print(path.split('/')[-1][:26])
    for b in BANDS:
        o = g[b[2]]
        if not o['n']: continue
        print(f"  contact {b[2]:6s} n {o['n']:4d} | within 3 yd -0.5/0/+0.5 s {mean(o['w3'][-.5])}/{mean(o['w3'][0])}/{mean(o['w3'][.5])}"
              f" | within 5 yd {mean(o['w5'][-.5])}/{mean(o['w5'][0])}/{mean(o['w5'][.5])}"
              f" | within 3 by group DL {mean(o['grp3']['DL'])} LB {mean(o['grp3']['LB'])} DB {mean(o['grp3']['DB'])}"
              f" | 3-10 yd closing {q(o['close'])}")
        print('      3-10 yd by group, closing (speed): ' + ' '.join(f"{gname} {q(o['gc'][gname])} ({q(o['gs'][gname])}, n {len(o['gc'][gname])})" for gname in ('DL', 'LB', 'DB')))
