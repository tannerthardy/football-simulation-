"""Acceleration envelope fit against NFL tracking (a body-law calibration
measure, independent of play outcomes). Same operator as accelenv.py: the
speed gain over 0.3 s at each speed band, p50/p90/p97 of the frames where the
player is speeding up (gain > 0), by group. Reports each arm's mean absolute
error against NFL per group and overall, over bands 0-7 yd/s.
usage: gaitfit.py LABEL [LABEL ...]  (out/open-field/all/LABEL-common.jsonl.gz)"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
H, BANDS, GROUPS, QS = 3, [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7)], ('DL', 'LB', 'DB', 'OL', 'RB'), (.5, .9, .97)
ytg = json.load(open('out/mechanics/nfl-ytg.json'))
def env(path, nfl):
    o, n = {}, 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        if nfl and ytg.get(raw['id'], 0) < 60: continue
        n += 1
        if n > 1200: break
        p = Play(raw); end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
        for i, pl in enumerate(p.players):
            g = 'RB' if i == raw['carrier'] else pl['group']
            if g not in GROUPS: continue
            sp = [p.speed(i, k) for k in range(end + 1)]
            for k in range(end + 1 - H):
                gain = (sp[k + H] - sp[k]) / (H * p.dt)
                if gain <= 0: continue
                for lo, hi in BANDS:
                    if lo <= sp[k] < hi: o.setdefault((g, lo), []).append(gain); break
    q = lambda v, f: sorted(v)[int(f * (len(v) - 1))]
    return {k: [q(v, f) for f in QS] for k, v in o.items() if len(v) > 40}
N = env('out/mechanics/nfl-plays.jsonl.gz', True)
print('NFL speeding-up p50/p90/p97 by band: ' + ' | '.join(f"{g} " + ' '.join(f"{N[(g, lo)][1]:.1f}" for lo, _ in BANDS if (g, lo) in N) for g in GROUPS))
for label in sys.argv[1:]:
    S = env(f'out/open-field/all/{label}-common.jsonl.gz', False)
    per = {}
    for (g, lo), v in S.items():
        if (g, lo) in N: per.setdefault(g, []).extend(abs(a - b) for a, b in zip(v, N[(g, lo)]))
    allv = [x for v in per.values() for x in v]
    print(f"{label:8s} MAE {sum(allv)/len(allv):.2f} | " + ' '.join(f"{g} {sum(v)/len(v):.2f}" for g, v in per.items()) + ' | p90 by band: ' + ' | '.join(f"{g} " + ' '.join(f"{S[(g, lo)][1]:.1f}" for lo, _ in BANDS if (g, lo) in S) for g in GROUPS))
