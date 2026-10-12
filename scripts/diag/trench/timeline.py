"""Trench timeline: the same operator on NFL tracking and sim exports.

For designed runs by concept family, over 0.5-3.0 s after the snap:
  - lateral flow toward the play side for OL, box DL and second-level LB
  - OL lateral speed split by engaged (a box defender within ENGAGED_YD) and free
  - engaged DL depth (positive = driven back past the line)
  - first block duration (first OL-DL contact episode that starts by 1.0 s)
  - double teams: how often, how long, and when one blocker leaves
  - pullers (an OL more than 1.5 yd play side and behind the line by 1.0 s):
    peak lateral speed, time to the point of attack, depth there
Play side is the carrier's lateral direction from the snap to the moment he
crosses the line (or 2.5 s). It is measured the same way on both sides; a
cutback can flip it, which affects both equally.

python3 -I scripts/diag/trench/timeline.py NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...]
"""
import gzip, json, math, sys
from collections import defaultdict
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, ENGAGED_YD, Play

TIMES = (0.5, 1.0, 1.5, 2.0, 2.5, 3.0)
FAMILIES = ('outside_zone', 'inside_zone', 'gap_pull', 'man_duo')


def second_level(p):
    by = p.raw['ball_y']
    return [i for i in p.who('D') if 2.0 < (p.pos(i, 0)[0] or -9) <= 7.0 and abs(p.pos(i, 0)[1] - by) <= 6.5]


def play_side(p):
    c = p.raw.get('carrier')
    if c is None:
        return None
    k_end = p.k(2.5)
    for k in range(p.frames):
        x, _ = p.pos(c, k)
        if x is not None and x > 0:
            k_end = k
            break
    y0, y1 = p.pos(c, 0)[1], p.pos(c, min(k_end, p.frames - 1))[1]
    if y0 is None or y1 is None or abs(y1 - y0) < .3:
        return None
    return 1 if y1 > y0 else -1


def tracked(p, ids, k):
    return [i for i in ids if p.pos(i, k)[0] is not None and p.pos(i, 0)[0] is not None]


def measure(path, out):
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw['kind'] != 'run' or raw.get('carrier') is None:
            continue
        fam = CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept'))
        if fam not in FAMILIES:
            continue
        p = Play(raw)
        s = play_side(p)
        if s is None or p.frames < 16:
            continue
        o = out[fam]
        o['plays'].append(1)
        ol, dl, lb = p.who('O', 'OL'), p.box_defenders(), second_level(p)
        if len(ol) < 5 or not dl:
            continue
        end = p.k(p.end)
        for t in TIMES:
            k = p.k(t)
            if k > end:
                continue
            for name, ids in (('OL', ol), ('DL', dl), ('LB', lb)):
                ids = tracked(p, ids, k)
                if ids:
                    o[f'lat {name} {t:.1f}'].append(sum((p.pos(i, k)[1] - p.pos(i, 0)[1]) * s for i in ids) / len(ids))
            eng = [d for d in tracked(p, dl, k) if any(p.dist(b, d, k) <= ENGAGED_YD for b in ol)]
            if eng:
                o[f'engaged DL depth {t:.1f}'].append(sum(p.pos(d, k)[0] for d in eng) / len(eng))
        # Engaged vs free OL lateral speed toward the play side, 0.5-2.0 s.
        for k in range(p.k(.5), min(p.k(2.0), end) + 1):
            for b in tracked(p, ol, k):
                v = p.velocity(b, k)[1] * s
                engaged = any(p.dist(b, d, k) <= ENGAGED_YD for d in dl + lb)
                o['OL lat speed engaged' if engaged else 'OL lat speed free'].append(v)
        # First contact episode per OL starting by 1.0 s, and doubles.
        for b in ol:
            start, partner = None, None
            for k in range(0, min(p.k(1.0), end) + 1):
                near = [d for d in dl if p.dist(b, d, k) <= ENGAGED_YD]
                if near:
                    start, partner = k, min(near, key=lambda d: p.dist(b, d, k))
                    break
            if start is None:
                continue
            k = start
            while k <= end and p.dist(b, partner, k) <= ENGAGED_YD:
                k += 1
            o['first block duration s'].append((k - start) * p.dt)
        doubled = 0
        for d in dl:
            ks = [k for k in range(0, min(p.k(3.0), end) + 1) if sum(1 for b in ol if p.dist(b, d, k) <= ENGAGED_YD) >= 2]
            if len(ks) >= 3:
                doubled += 1
                o['double start s'].append(ks[0] * p.dt)
                # Duration of the first continuous double episode.
                run = 1
                while run < len(ks) and ks[run] == ks[0] + run:
                    run += 1
                o['double duration s'].append(run * p.dt)
        o['doubles per play'].append(doubled)
        # Pullers: an OL 2+ yd play side by 2.0 s who stayed behind the line
        # at 1.0 s (speed-independent, so slow pullers are still found).
        if 'handoff' in p.events:
            o['handoff s'].append(p.events['handoff'])
        if fam == 'gap_pull':
            k1, k2 = p.k(1.0), p.k(2.0)
            poa = max((p.pos(b, 0)[1] - p.raw['ball_y']) * s for b in ol) + 1.0
            for b in ol:
                if k2 > end or p.pos(b, k2)[0] is None or p.pos(b, k1)[0] is None:
                    continue
                if (p.pos(b, k2)[1] - p.pos(b, 0)[1]) * s < 2.0 or p.pos(b, k1)[0] >= 0:
                    continue
                o['pullers per play'].append(1)
                for t in (0.5, 1.0, 1.5, 2.0):
                    o[f'puller lat {t:.1f}'].append((p.pos(b, p.k(t))[1] - p.pos(b, 0)[1]) * s)
                o['puller peak lateral speed'].append(max(p.velocity(b, k)[1] * s for k in range(0, min(p.k(2.0), end) + 1)))
                for k in range(0, end + 1):
                    y = p.pos(b, k)[1]
                    if y is not None and (y - p.raw['ball_y']) * s >= poa:
                        o['puller time to point of attack'].append(k * p.dt)
                        o['puller depth at point of attack'].append(p.pos(b, k)[0])
                        break


def q(v, f):
    v = sorted(v)
    return v[int(f * (len(v) - 1))] if v else float('nan')


def main():
    nfl, sims = sys.argv[1], sys.argv[2:]
    a, b = defaultdict(lambda: defaultdict(list)), defaultdict(lambda: defaultdict(list))
    measure(nfl, a)
    for s in sims:
        measure(s, b)
    for fam in FAMILIES:
        print(f'\n== {fam}: NFL {len(a[fam]["plays"])} runs, sim {len(b[fam]["plays"])} runs   (median [p25, p75])')
        keys = sorted(set(a[fam]) | set(b[fam]), key=lambda k: (k.split(' ')[0] != 'lat', k))
        for k in keys:
            if k == 'plays':
                continue
            na, nb = a[fam][k], b[fam][k]
            if k.endswith('per play'):
                fa = f'{sum(na) / max(1, len(a[fam]["plays"])):.2f}'
                fb = f'{sum(nb) / max(1, len(b[fam]["plays"])):.2f}'
                print(f'  {k:34s} NFL {fa:>18s} | sim {fb:>18s}')
                continue
            fmt = lambda v: f'{q(v, .5):+.2f} [{q(v, .25):+.2f},{q(v, .75):+.2f}]' if v else '-'
            print(f'  {k:34s} NFL {fmt(na):>18s} | sim {fmt(nb):>18s}')


if __name__ == '__main__':
    main()
