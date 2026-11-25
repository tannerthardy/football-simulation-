"""Top speed and the speed distribution by position, NFL vs ours, one operator (open-census play format).
  python3 -I scripts/diag/body/top_speed.py NFL_PLAYS.jsonl.gz SIM_PLAYS.jsonl.gz NFL_CATCHES.jsonl.gz SIM_FULL.jsonl.gz [--out report.md]
Speed = the 0.2 s centred difference of position on the 0.1 s grid. Samples:
  A) dropbacks, snap to release (NFL_PLAYS / SIM_PLAYS): every player, frames with speed >= 1.5 yd/s, open movement (nobody within 1.5 yd) and all movement;
  B) completions to the end of the play (NFL_CATCHES / SIM_FULL): the frames from the catch to the end for the carrier (`recv`) and for every defender (pursuit), and the frames before the catch for everybody.
Tables: p50 / p90 / p99 speed by position group; the same in the pursuit frames (after the catch); time to reach 90% of the group's p99 from the first frame at 3 yd/s (players who get there: n and share), seconds; and on completions where the carrier runs 15+ yd after the catch, the carrier's p90 speed over the carry and
the mean of the three fastest defenders' p90 speeds over the same frames (the ratio is the pursuit speed advantage), plus the share of such plays in which a defender is faster than the carrier. Position groups: QB, RB (RB FB HB), WR, TE, OL, DL (DE DT NT DL), LB, CB (CB NB DB), S (S FS SS)."""
import gzip, json, sys, math
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] != '--out']
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
G = {}
for g, ps in {'QB': ['QB'], 'RB': ['RB', 'FB', 'HB'], 'WR': ['WR'], 'TE': ['TE'], 'OL': ['T', 'G', 'C', 'OT', 'OG'], 'DL': ['DE', 'DT', 'NT', 'DL'], 'LB': ['LB', 'ILB', 'OLB', 'MLB'], 'CB': ['CB', 'NB', 'DB'], 'S': ['S', 'FS', 'SS']}.items():
    for p in ps: G[p] = g
ORDER = ['WR', 'TE', 'RB', 'QB', 'OL', 'DL', 'LB', 'CB', 'S']
def speeds(X, Y):
    s = np.full(X.shape, np.nan); s[:, 1:-1] = np.hypot(X[:, 2:] - X[:, :-2], Y[:, 2:] - Y[:, :-2]) / 0.2; return s
def load(path, full):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x'], float); Y = np.array(p['y'], float)
        if not full and p.get('rel') is not None: X, Y = X[:, :p['rel'] + 1], Y[:, :p['rel'] + 1]
        if X.shape[1] < 12: continue
        n = X.shape[0]; D = np.hypot(X[:, None, :] - X[None, :, :], Y[:, None, :] - Y[None, :, :]); D[np.arange(n), np.arange(n), :] = np.inf
        out.append(dict(X=X, Y=Y, S=speeds(X, Y), open=D.min(axis=1) > 1.5, grp=[G.get(r['pos']) for r in p['players']], side=[r['side'] for r in p['players']], catch=p.get('catch'), recv=p.get('recv'), qb=p.get('qb')))
    return out
q = lambda v, p: float(np.percentile(v, p)) if len(v) else float('nan')
L = []; P = L.append
names = ['NFL', 'ours']
A = [load(args[0], False), load(args[1], False)]; B = [load(args[2], True), load(args[3], True)]
P('## Speed by position, NFL vs ours (0.2 s centred difference; frames at 1.5 yd/s and over)\n')
for title, sel in (('dropbacks to the release, open movement', 'A'), ('after the catch, the carrier and the defenders (completions, to the end of the play)', 'B')):
    P(f'### {title}\n'); P('| group | NFL n | NFL p50 / p90 / p99 / max | ours n | ours p50 / p90 / p99 / max | p99 ours - NFL |'); P('|---|---|---|---|---|---|')
    for g in ORDER:
        c = []
        for d in (A if sel == 'A' else B):
            v = []
            for p in d:
                for i, gi in enumerate(p['grp']):
                    if gi != g: continue
                    if sel == 'A': m = (p['S'][i] >= 1.5) & p['open'][i]; v.extend(p['S'][i][m & ~np.isnan(p['S'][i])])
                    else:
                        k0 = p['catch']
                        if k0 is None: continue
                        carrier = (p['recv'] == i)
                        if g in ('WR', 'TE', 'RB') and not carrier: continue
                        if p['side'][i] == 'O' and not carrier: continue
                        seg = p['S'][i][k0:]; v.extend(seg[(seg >= 1.5) & ~np.isnan(seg)])
            c.append(np.array(v))
        if len(c[0]) < 100 and len(c[1]) < 100: continue
        f = lambda v: f'{len(v)} | {q(v, 50):.1f} / {q(v, 90):.1f} / {q(v, 99):.1f} / {v.max():.1f}' if len(v) else '0 | '
        P(f'| {g} | {f(c[0])} | {f(c[1])} | {q(c[1], 99) - q(c[0], 99):+.1f} |')
    P('')
P('### Time to reach 90% of the group\'s p99 from the first frame at 3 yd/s (dropbacks, snap to release, any movement), seconds\n')
P('| group | NFL: n starts / reach 90% | NFL median time | ours: n / reach | ours median time | 90% of p99 (NFL / ours, yd/s) |'); P('|---|---|---|---|---|---|')
for g in ORDER:
    cols = []; thr = []
    for d in A:
        allv = np.concatenate([p['S'][i][~np.isnan(p['S'][i])] for p in d for i, gi in enumerate(p['grp']) if gi == g] or [np.array([])])
        p99 = q(allv, 99); thr.append(0.9 * p99); ts = []; n = 0
        for p in d:
            for i, gi in enumerate(p['grp']):
                if gi != g: continue
                s = p['S'][i]; k3 = next((k for k in range(1, len(s)) if s[k] >= 3.0 and (np.isnan(s[k - 1]) or s[k - 1] < 3.0)), None)
                if k3 is None: continue
                n += 1; k9 = next((k for k in range(k3, len(s)) if s[k] >= 0.9 * p99), None)
                if k9 is not None: ts.append((k9 - k3) / 10.0)
        cols.append((n, len(ts), q(ts, 50)))
    if cols[0][0] < 30 and cols[1][0] < 30: continue
    P(f'| {g} | {cols[0][0]} / {cols[0][1]} | {cols[0][2]:.1f} | {cols[1][0]} / {cols[1][1]} | {cols[1][2]:.1f} | {thr[0]:.1f} / {thr[1]:.1f} |')
P('')
P('### Pursuit speed against the carrier on completions with a 15+ yd run after the catch\n'); P('| sample | plays | carry length median (yd) | carrier p90 speed over the carry | mean of the three fastest defenders\' p90 speeds (same frames, defenders that started within 15 yd) | ratio defender / carrier (median) | share of plays a defender\'s p90 beats the carrier\'s |'); P('|---|---|---|---|---|---|---|')
for nm, d in zip(names, B):
    rows = []
    for p in d:
        k0 = p['catch']; r = p['recv']
        if k0 is None or r is None or r < 0: continue
        F = p['X'].shape[1]
        if F - k0 < 12: continue
        carry = np.hypot(p['X'][r, -1] - p['X'][r, k0], p['Y'][r, -1] - p['Y'][r, k0])
        if p['X'][r, -1] - p['X'][r, k0] < 15: continue
        cs = p['S'][r][k0:]; cs = cs[~np.isnan(cs)]; cp = q(cs, 90)
        dp = []
        for i, sd in enumerate(p['side']):
            if sd != 'D': continue
            if np.hypot(p['X'][i, k0] - p['X'][r, k0], p['Y'][i, k0] - p['Y'][r, k0]) > 15: continue
            ss = p['S'][i][k0:]; ss = ss[~np.isnan(ss)]
            if len(ss) > 5: dp.append(q(ss, 90))
        if len(dp) < 3: continue
        dp = sorted(dp, reverse=True)[:3]; rows.append((float(p['X'][r, -1] - p['X'][r, k0]), cp, float(np.mean(dp)), dp[0]))
    if not rows: continue
    R = np.array(rows)
    P(f'| {nm} | {len(R)} | {np.median(R[:, 0]):.0f} | {np.mean(R[:, 1]):.2f} | {np.mean(R[:, 2]):.2f} | {np.median(R[:, 2] / R[:, 1]):.2f} | {np.mean(R[:, 3] > R[:, 1]):.2f} |')
txt = '\n'.join(L)
if OUT: open(OUT, 'w').write(txt)
print(txt)
