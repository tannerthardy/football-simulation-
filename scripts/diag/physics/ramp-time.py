"""How quickly players get going after the snap, NFL vs sim, same operator.
For players near rest at the snap: the time from first reaching 0.5 yd/s to
first reaching 2.0 (and 3.0) yd/s within 2.5 s, by group and by the peak speed
they reach in the first 2.5 s (so slow ramps toward a moderate speed are not
normalized away, unlike a share-of-peak measure).
python3 -I scripts/diag/physics/ramp-time.py NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...]"""
import gzip, json, sys
from collections import defaultdict
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play

BINS = ((2.0, 3.0), (3.0, 4.5), (4.5, 9.0))


def measure(paths):
    out = defaultdict(list)
    for path in paths:
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line)
            if raw['kind'] not in ('run', 'pass'):
                continue
            p = Play(raw)
            end = min(p.k(2.5), p.k(p.end), p.frames - 1)
            for i, pl in enumerate(p.players):
                g = pl['group']
                if g not in ('OL', 'DL', 'LB', 'DB', 'WR', 'RB'):
                    continue
                if p.pos(i, 0)[0] is None or p.speed(i, 0) > .5:
                    continue
                sp = [p.speed(i, k) for k in range(end + 1)]
                peak = max(sp) if sp else 0
                b = next((b for b in BINS if b[0] <= peak < b[1]), None)
                if b is None:
                    continue
                k05 = next((k for k, v in enumerate(sp) if v >= .5), None)
                k20 = next((k for k, v in enumerate(sp) if v >= 2.0), None)
                if k05 is None or k20 is None:
                    continue
                out[(raw['kind'], g, b)].append((k20 - k05) * p.dt)
                k30 = next((k for k, v in enumerate(sp) if v >= 3.0), None)
                if k30 is not None:
                    out[(raw['kind'], g, b, '3')].append((k30 - k05) * p.dt)
    return out


def q(v, f):
    v = sorted(v)
    return v[int(f * (len(v) - 1))] if v else float('nan')


nfl, sim = measure([sys.argv[1]]), measure(sys.argv[2:])
print('seconds from 0.5 to 2.0 yd/s (0.5 to 3.0), median [p25,p75], by peak speed in the first 2.5 s')
for kind in ('run', 'pass'):
    for g in ('OL', 'DL', 'LB', 'DB', 'WR', 'RB'):
        for b in BINS:
            a, s = nfl.get((kind, g, b), []), sim.get((kind, g, b), [])
            if len(a) < 30 or len(s) < 10:
                continue
            a3, s3 = nfl.get((kind, g, b, '3'), []), sim.get((kind, g, b, '3'), [])
            t3 = f' | to 3.0 NFL {q(a3, .5):.2f} sim {q(s3, .5):.2f}' if len(a3) >= 30 and len(s3) >= 10 else ''
            print(f'  {kind:4s} {g:2s} peak {b[0]:.1f}-{b[1]:.1f}: n {len(a):6d}/{len(s):5d}  NFL {q(a, .5):.2f} [{q(a, .25):.2f},{q(a, .75):.2f}]  sim {q(s, .5):.2f} [{q(s, .25):.2f},{q(s, .75):.2f}]{t3}')
