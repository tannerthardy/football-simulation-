"""Share of moving intervals (2 yd/s and over, 0.1 s grid) with a speed step (|accel| over 4.1 yd/s2) or a heading step (over 8 degrees at 3 yd/s and over), by position group, NFL vs ours, same operator, dropbacks snap to release.
  python3 -I scripts/diag/body/step_rates.py NFL_PLAYS.jsonl.gz STEPS_0.json [STEPS_1.json ...]   (ours from sim_steps.mts)"""
import gzip, json, sys, collections, math
import numpy as np
PG = {}
for g, ps in {'WR': ['WR'], 'TE': ['TE'], 'RB': ['RB', 'FB', 'HB'], 'QB': ['QB'], 'OL': ['T', 'G', 'C', 'OT', 'OG'], 'DL': ['DE', 'DT', 'NT', 'DL'], 'LB': ['LB', 'ILB', 'OLB', 'MLB'], 'CB': ['CB', 'NB', 'DB'], 'S': ['S', 'FS', 'SS']}.items():
    for p in ps: PG[p] = g
nfl = collections.defaultdict(lambda: [0, 0, 0]); wrap = lambda a: (a + 180.0) % 360.0 - 180.0
for l in gzip.open(sys.argv[1], 'rt'):
    p = json.loads(l); X = np.array(p['x'], float); Y = np.array(p['y'], float)
    if p.get('rel') is not None: X, Y = X[:, :p['rel'] + 1], Y[:, :p['rel'] + 1]
    n, F = X.shape
    if F < 12: continue
    dx = np.diff(X, axis=1); dy = np.diff(Y, axis=1); s = np.hypot(dx, dy) / 0.1; h = np.degrees(np.arctan2(dx, dy))
    for i, r in enumerate(p['players']):
        g = PG.get(r['pos'])
        if g is None: continue
        for k in range(1, F - 2):
            if min(s[i, k - 1], s[i, k]) < 2: continue
            c = nfl[g]; c[0] += 1
            if abs(s[i, k] - s[i, k - 1]) / 0.1 > 4.1: c[1] += 1
            if min(s[i, k - 1], s[i, k]) >= 3 and abs(wrap(h[i, k] - h[i, k - 1])) > 8: c[2] += 1
ours = collections.defaultdict(lambda: collections.Counter())
for f in sys.argv[2:]:
    for g, t in json.load(open(f)).items():
        for k, v in t.items(): ours[g.replace('pos ', '') if g.startswith('pos ') else g][k] += v
C = ['request jumped', 'request moved smoothly', 'request jumped within the 0.4 s before (response)', 'contact or joint', 'neither: body response']
print('| group | NFL moving intervals | NFL speed step | NFL heading step | ours moving | ours speed step | ours heading step | speed steps by cause: ' + ' / '.join(C) + ' | heading steps by cause |'); print('|---|---|---|---|---|---|---|---|---|')
for g in ('WR', 'TE', 'RB', 'QB', 'OL', 'DL', 'LB', 'CB', 'S'):
    a = nfl[g]; o = ours[g]
    if not a[0] or not o['moving intervals']: continue
    ss = o['speed step'] or 1; hs = o['heading step'] or 1
    print(f"| {g} | {a[0]} | {a[1] / a[0]:.3f} | {a[2] / a[0]:.3f} | {o['moving intervals']} | {o['speed step'] / o['moving intervals']:.3f} | {o['heading step'] / o['moving intervals']:.3f} | "
          + ' / '.join(f"{o['speed step: ' + c] / ss:.2f}" for c in C) + ' | ' + ' / '.join(f"{o['heading step: ' + c] / hs:.2f}" for c in C) + ' |')
print()
print('Steps whose request moved, by the controller (behaviour kind group) that was running (share of the request-driven steps):\n')
print('| controller | speed steps (jumped / smooth) | heading steps (jumped / smooth) |'); print('|---|---|---|')
ctrls = sorted({g for g in ours if g.startswith('ctrl ')})
ts = sum(ours[g][f'speed step: {c}'] for g in ctrls for c in C[:2]) or 1; th = sum(ours[g][f'heading step: {c}'] for g in ctrls for c in C[:2]) or 1
for g in sorted(ctrls, key=lambda g: -(ours[g]['heading step: request jumped'] + ours[g]['heading step: request moved smoothly'])):
    o = ours[g]
    print(f"| {g[5:]} | {o['speed step: request jumped'] / ts:.3f} / {o['speed step: request moved smoothly'] / ts:.3f} | {o['heading step: request jumped'] / th:.3f} / {o['heading step: request moved smoothly'] / th:.3f} |")
