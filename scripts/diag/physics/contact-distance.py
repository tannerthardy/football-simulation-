"""After a run's first contact: center distance between the carrier and the
nearest defender, and their closing speed along that line, at +0.0..+0.4 s,
NFL vs sim, same operator. Bodies in central torso contact sit near 0.8 yd
apart (sim touch distance 0.9 x radii sum); arm's-length holds near 1.2-1.5.
python3 -I scripts/diag/physics/contact-distance.py NFL.jsonl.gz SIM.jsonl.gz [...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play

OFFS = (0.0, 0.1, 0.2, 0.3, 0.4)


def measure(paths):
    rows = []
    for path in paths:
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line)
            if raw['kind'] != 'run' or raw.get('carrier') is None:
                continue
            p = Play(raw)
            t0 = p.events.get('first_contact')
            if t0 is None or not p.live(t0 + .4):
                continue
            c, k0 = raw['carrier'], p.k(t0)
            if p.pos(c, k0)[0] is None or p.speed(c, k0) < 2:
                continue
            d = min((d for d in p.who('D') if p.pos(d, k0)[0] is not None), key=lambda d: p.dist(c, d, k0), default=None)
            if d is None:
                continue
            row = []
            for dt in OFFS:
                k = p.k(t0 + dt)
                dist = p.dist(c, d, k)
                (cx, cy), (dx, dy) = p.pos(c, k), p.pos(d, k)
                if cx is None or dx is None:
                    row.append(None); continue
                L = math.hypot(dx - cx, dy - cy) or 1
                (cvx, cvy), (dvx, dvy) = p.velocity(c, k), p.velocity(d, k)
                closing = -((dvx - cvx) * (dx - cx) + (dvy - cvy) * (dy - cy)) / L
                row.append((dist, closing))
            rows.append(row)
    return rows


def q(v, f):
    v = sorted(v)
    return v[int(f * (len(v) - 1))] if v else float('nan')


nfl, sim = measure([sys.argv[1]]), measure(sys.argv[2:])
print(f'runs: NFL {len(nfl)}, sim {len(sim)}')
print('  +s    distance p25/p50/p75 NFL          sim                 | closing p50 NFL / sim | share within 1.0 yd NFL / sim')
for j, dt in enumerate(OFFS):
    a = [r[j] for r in nfl if r[j]]; b = [r[j] for r in sim if r[j]]
    da, db = [x for x, _ in a], [x for x, _ in b]
    print(f'  {dt:.1f}   {q(da,.25):.2f}/{q(da,.5):.2f}/{q(da,.75):.2f}    {q(db,.25):.2f}/{q(db,.5):.2f}/{q(db,.75):.2f}         | {q([c for _, c in a],.5):+.2f} / {q([c for _, c in b],.5):+.2f}       | '
          f'{sum(x < 1.0 for x in da)/len(da):.2f} / {sum(x < 1.0 for x in db)/len(db):.2f}')
