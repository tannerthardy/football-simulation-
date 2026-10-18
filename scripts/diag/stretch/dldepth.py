"""Box defender depth and flow by alignment, one operator for NFL tracking and
sim common plays. Play side is the carrier's lateral direction (as in
trench/timeline.py). Box defenders (metrics.box_defenders) are split at the
snap into the play-side end (the widest on the play side), other play-side
defenders and backside defenders. Depth: + past the line (driven back),
- in the offense's backfield.

usage: dldepth.py FAMILY NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...]"""
import gzip, json, sys
from collections import defaultdict
sys.path.insert(0, 'scripts/mechanics')
sys.path.insert(0, 'scripts/diag/trench')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
from timeline import play_side  # noqa: E402

TIMES = (1.0, 1.5, 2.0, 2.5)


def measure(path, fam):
    o = defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw.get('common'):
            raw = raw['common']
        if raw.get('kind') != 'run' or raw.get('carrier') is None:
            continue
        if CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam:
            continue
        p = Play(raw)
        s = play_side(p)
        if s is None:
            continue
        by = raw['ball_y']
        box = p.box_defenders()
        if not box:
            continue
        lat0 = {i: (p.pos(i, 0)[1] - by) * s for i in box}
        ps = [i for i in box if lat0[i] > 0.5]
        end = max(ps, key=lambda i: lat0[i]) if ps else None
        groups = {'play end': [end] if end is not None else [], 'play inside': [i for i in ps if i != end],
                  'backside': [i for i in box if lat0[i] <= 0.5]}
        o['plays'].append(1)
        for t in TIMES:
            if not p.live(t):
                continue
            k = p.k(t)
            for g, ids in groups.items():
                for i in ids:
                    x, y = p.pos(i, k)
                    if x is None:
                        continue
                    o[f'{g} depth {t}'].append(x)
                    o[f'{g} flow {t}'].append((y - by) * s - lat0[i])
    return o


def q(v, f):
    v = sorted(v)
    return v[int(f * (len(v) - 1))] if v else float('nan')


fam = sys.argv[1]
res = [(path.split('/')[-1], measure(path, fam)) for path in sys.argv[2:]]
print(f'{fam}: plays ' + ' | '.join(f'{n} {len(o["plays"])}' for n, o in res))
for g in ('play end', 'play inside', 'backside'):
    for t in TIMES:
        cells = []
        for n, o in res:
            d, fl = o[f'{g} depth {t}'], o[f'{g} flow {t}']
            if not d:
                cells.append(f'{n[:10]:10s} -'); continue
            cells.append(f'{n[:10]:10s} depth p25/50/75 {q(d,.25):+.1f}/{q(d,.5):+.1f}/{q(d,.75):+.1f} <-0.5 {100*sum(x < -.5 for x in d)/len(d):3.0f}% flow {q(fl,.5):+.1f}')
        print(f'  {g:11s} {t:.1f}s ' + ' | '.join(cells))
