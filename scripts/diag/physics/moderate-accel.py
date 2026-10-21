"""How fast players reach a moderate speed from a standstill at the snap,
NFL tracking vs sim, with the same operator. For each OL/DL/LB starting
near rest, the peak speed in the first 1.5 s is binned; the share of that
peak reached at 0.3 / 0.5 / 0.8 s is reported. Under an effort-proportional
law (accel = (wanted - v) / tau) the share is the same for every peak;
under push-hard-then-level the share is larger for slower peaks.
python3 -I scripts/diag/physics/moderate-accel.py NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...]"""
import gzip, json, sys
from collections import defaultdict
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play

BINS = ((1.5, 2.5), (2.5, 3.5), (3.5, 5.0), (5.0, 9.0))


def measure(paths):
    out = defaultdict(list)
    for path in paths:
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line)
            if raw['kind'] != 'run':
                continue
            p = Play(raw)
            if p.frames < 16:
                continue
            for g in ('OL', 'DL', 'LB'):
                for i in p.who(None, g):
                    if p.pos(i, 0)[0] is None or p.speed(i, 0) > .4:
                        continue
                    sp = [p.speed(i, k) for k in range(0, p.k(1.5) + 1)]
                    peak = max(sp)
                    kp = sp.index(peak)
                    if kp < p.k(.8):
                        continue  # still rising at 0.8 s: we want the climb to a plateau
                    for lo, hi in BINS:
                        if lo <= peak < hi:
                            out[(g, lo, hi)].append([sp[p.k(t)] / peak for t in (.3, .5, .8)])
    return out


def med(v):
    v = sorted(v)
    return v[len(v) // 2] if v else float('nan')


nfl, sim = measure([sys.argv[1]]), measure(sys.argv[2:])
print('share of the 0-1.5 s peak speed reached at 0.3 / 0.5 / 0.8 s (median)')
for g in ('OL', 'DL', 'LB'):
    for lo, hi in BINS:
        a, b = nfl[(g, lo, hi)], sim[(g, lo, hi)]
        if len(a) < 30 or len(b) < 10:
            continue
        fa = ' / '.join(f'{med([x[j] for x in a]):.2f}' for j in range(3))
        fb = ' / '.join(f'{med([x[j] for x in b]):.2f}' for j in range(3))
        print(f'  {g} peak {lo:.1f}-{hi:.1f} yd/s   NFL {fa}  (n {len(a):5d}) | sim {fb}  (n {len(b):4d})')
