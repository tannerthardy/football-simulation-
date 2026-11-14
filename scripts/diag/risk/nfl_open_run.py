# How fast NFL players run with their shoulders turned off their running line (BDB 2025 week files; `o` = shoulder-pad
# orientation, `dir` = travel). Frames from the snap to the pass's arrival on drop-back passes, by position group, in
# 15 deg bins of |o - dir|: the p95 and p99 of speed, as a share of that player's own p99 speed over the same frames.
# The sim's facing cap (kinematics.ts directionalSpeedFactor) is the ratio this answers for a turned run.
#   python3 -I scripts/diag/risk/nfl_open_run.py data/raw/bdb2025/big-data-bowl-data 1
import csv, sys, os, collections as C
D = sys.argv[1]; weeks = sys.argv[2].split(',')
POS = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
DROP = {(r['gameId'], r['playId']) for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE', 'True')}
rows = C.defaultdict(list)  # (pos, bin) -> [(nflId, s)]
own = C.defaultdict(list)
for w in weeks:
    state = {}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in DROP or r['displayName'] == 'football': continue
        ev = r['event']
        st = state.setdefault(k, {'on': False})
        if ev == 'ball_snap': st['on'] = True
        if ev in ('pass_arrived', 'pass_outcome_caught', 'pass_outcome_incomplete', 'qb_sack', 'run'): st['on'] = False
        if not st['on'] or r['o'] in ('', 'NA') or r['dir'] in ('', 'NA'): continue
        pos = POS.get(r['nflId'], '?')
        if pos not in ('WR', 'TE', 'CB', 'SS', 'FS', 'RB'): continue
        g = 'S' if pos in ('SS', 'FS') else pos
        d = abs(float(r['o']) - float(r['dir'])) % 360; d = min(d, 360 - d)
        s = float(r['s']); own[r['nflId']].append(s)
        rows[(g, int(d // 15))].append((r['nflId'], s))
vmax = {}
for i, v in own.items():
    v.sort()
    if len(v) >= 50: vmax[i] = v[int(0.99 * (len(v) - 1))]
def qq(v, p): v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')
print('group | shoulder angle off the running line (deg) : n, p95 / p99 speed share of his own p99 speed (and p95 speed yd/s)')
for g in ('WR', 'TE', 'RB', 'CB', 'S'):
    out = []
    for b in range(12):
        R = [(s / vmax[i], s) for i, s in rows.get((g, b), []) if i in vmax and vmax[i] > 0]
        if len(R) < 30: continue
        out.append(f"{b*15}-{b*15+15}: n {len(R)} {qq([x[0] for x in R], .95):.2f}/{qq([x[0] for x in R], .99):.2f} ({qq([x[1] for x in R], .95):.1f})")
    print(f'{g}: ' + ' | '.join(out))
