"""Speed gain after the catch (or the handoff), NFL vs ours, positions only (open-census play format through the end of the play).
  python3 -I scripts/diag/census/post_catch_accel.py NFL.jsonl.gz LABEL=SIM.jsonl.gz [LABEL=SIM2.jsonl.gz ...] [--out report.md] [--control NFLRUN.jsonl.gz LABEL=SIMRUN.jsonl.gz]

Per completion the receiver is followed from the catch frame c. Speed s(f) = the centred 0.2 s difference of position (f-1 .. f+1; one-sided at the ends), the same code on both sides. Rows need the next 2.0 s of the play (20 frames) and an open field: no defender within 1.5 yd of him
from the catch to c + 20. Speed at the catch s0 in bins 0-2 / 2-4 / 4-6 / 6+ yd/s. How much he must turn = the angle between his velocity at the catch and his velocity 1.0 s later (under 30 / 30-90 / over 90 degrees).
Gains: s(c + k) - s0 at 0.5 / 1.0 / 1.5 / 2.0 s. Peak acceleration = the largest (s(f + 3) - s(f - 3)) / 0.6 s for f in c+3 .. c+17; time to 90% of the top speed reached from the catch to c + 20 (seconds after the catch).
Receiver groups: back (RB / FB / HB), TE, WR (slot and wide). Control: the same for the ball carrier after a handoff (the first frame the carrier has the ball; his own start), from run plays in the same format."""
import gzip, json, sys, math, collections
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] not in ('--out', '--shift')]
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
CONTROL = '--control' in sys.argv
BACK = {'RB', 'FB', 'HB'}

SHIFT = int(sys.argv[sys.argv.index('--shift') + 1]) if '--shift' in sys.argv else 0  # sim arms only: the frame of the catch moved back by this many frames (the securing window: the ball is in his hands before the catch is logged)
def rows_of(path, key='catch', shift=0):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        c, r = p.get(key), p.get('recv')
        if c is not None: c -= shift
        if c is None or r is None or r < 0: continue
        X, Y = np.array(p['x']), np.array(p['y']); nf = X.shape[1]
        if c + 20 >= nf - 1 or c < 6: continue
        pl = p['players']; ds = [i for i, q in enumerate(pl) if q['side'] == 'D']
        # open field from the catch to c + 20
        dmin = min(math.hypot(X[i, f] - X[r, f], Y[i, f] - Y[r, f]) for i in ds for f in range(c, c + 21))
        if dmin < 1.5: continue
        def vel(f):
            a, b = max(0, f - 1), min(nf - 1, f + 1); dt = (b - a) / 10.0
            return ((X[r, b] - X[r, a]) / dt, (Y[r, b] - Y[r, a]) / dt)
        V = [vel(f) for f in range(c, c + 21)]; S = np.array([math.hypot(*v) for v in V])
        PRE = [math.hypot(*vel(f)) for f in range(c - 5, c)]
        a0 = math.atan2(V[0][1], V[0][0]); a1 = math.atan2(V[10][1], V[10][0]); turn = abs(math.degrees(math.atan2(math.sin(a1 - a0), math.cos(a1 - a0))))
        if S[0] < 0.5: turn = 0.0 if S[10] < 0.5 else turn
        acc = max((S[f + 3] - S[f - 3]) / 0.6 for f in range(3, 18))
        top = S.max(); t90 = next((k / 10.0 for k in range(0, 21) if S[k] >= 0.9 * top), 2.0)
        pos = pl[r]['pos']; grp = 'back' if pos in BACK else 'TE' if pos == 'TE' else 'WR'
        out.append(dict(s0=float(S[0]), turn=turn, g={h: float(S[int(round(h * 10))] - S[0]) for h in (0.5, 1.0, 1.5, 2.0)}, acc=float(acc), t90=t90, top=float(top), grp=grp, traj=PRE + [float(x) for x in S], hr=(float(S[10] - S[0]) / float(top - S[0]) if top - S[0] > 1.0 else None)))
    return out
sb = lambda s: '0-2' if s < 2 else '2-4' if s < 4 else '4-6' if s < 6 else '6+'
tb = lambda t: '<30' if t < 30 else '30-90' if t < 90 else '>90'
def mean(v): return f'{np.mean(v):+.2f}' if len(v) else '-'
lines = []; P = lambda s='': lines.append(s)
data = {}
data['NFL'] = rows_of(args[0])
for a in args[1:]:
    lab, path = a.split('=', 1); data[lab] = rows_of(path, shift=SHIFT)
P('## Speed gain after the catch, NFL vs ours (positions only; open field, 2 s of play after the catch)\n')
P('Rows: ' + ', '.join(f'{k} {len(v)}' for k, v in data.items()) + '.\n')
def table(title, key, vals, sel=lambda r: True):
    P(f'### {title}\n'); P('| ' + key + ' | sample | n | s0 mean | gain 0.5 s | 1.0 s | 1.5 s | 2.0 s | peak accel (yd/s2) | time to 90% of top (s) | top speed | headroom closed by 1.0 s |'); P('|---|---|---|---|---|---|---|---|---|---|---|---|')
    for v in vals:
        for lab, rows in data.items():
            R = [r for r in rows if sel(r) and (v is None or (r[key] if key in ('grp',) else (sb(r['s0']) if key == 's0 bin' else tb(r['turn']))) == v)]
            if len(R) < 8: P(f'| {v} | {lab} | {len(R)} | | | | | | | | | |'); continue
            P(f'| {v} | {lab} | {len(R)} | {np.mean([r["s0"] for r in R]):.1f} | ' + ' | '.join(mean([r['g'][h] for r in R]) for h in (0.5, 1.0, 1.5, 2.0)) + f' | {np.mean([r["acc"] for r in R]):.1f} | {np.mean([r["t90"] for r in R]):.2f} | {np.mean([r["top"] for r in R]):.1f} | {np.mean([r["hr"] for r in R if r["hr"] is not None]):.2f} |')
def traj_table(title, sel=lambda r: True):
    P(f'### {title}\n'); P('| sample | n | -0.5 s | -0.3 s | -0.1 s | 0 | +0.2 s | +0.3 s | +0.5 s | +1.0 s | +1.5 s | +2.0 s |'); P('|---|---|---|---|---|---|---|---|---|---|---|---|')
    for lab, rows in data.items():
        R = [r for r in rows if sel(r)]
        if len(R) < 8: continue
        T = np.mean([r['traj'] for r in R], axis=0)  # index 0 = c-5, 5 = c
        P(f'| {lab} | {len(R)} | ' + ' | '.join(f'{T[5 + k]:.2f}' for k in (-5, -3, -1, 0, 2, 3, 5, 10, 15, 20)) + ' |')
    P('')
traj_table('Mean speed around the catch, all open-field catches (yd/s; 0 = the catch frame, the sim\'s moved back by --shift frames)')
traj_table('Mean speed around the catch, caught at 2-6 yd/s', lambda r: 2 <= r['s0'] < 6)
table('By speed at the catch (all groups)', 's0 bin', ['0-2', '2-4', '4-6', '6+'])
table('By how much he must turn (all speeds)', 'turn bin', ['<30', '30-90', '>90'])
for sbin in ('0-2', '2-4'):
    table(f'Caught slow ({sbin} yd/s), by turn', 'turn bin', ['<30', '30-90', '>90'], lambda r, sbin=sbin: sb(r['s0']) == sbin)
table('By position group (all speeds)', 'grp', ['back', 'TE', 'WR'])
table('Caught slow (under 4 yd/s), by position group', 'grp', ['back', 'TE', 'WR'], lambda r: r['s0'] < 4)
if CONTROL:
    ci = sys.argv.index('--control'); ctl = [a for a in sys.argv[ci + 1:] if not a.startswith('--')]
    data = {'NFL handoff': rows_of(ctl[0])}
    for a in ctl[1:]:
        lab, path = a.split('=', 1); data[lab + ' handoff'] = rows_of(path)
    P('## Control: the ball carrier after a handoff\n')
    P('Rows: ' + ', '.join(f'{k} {len(v)}' for k, v in data.items()) + '.\n')
    table('By speed at the handoff', 's0 bin', ['0-2', '2-4', '4-6', '6+'])
    table('By how much he must turn', 'turn bin', ['<30', '30-90', '>90'])
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
