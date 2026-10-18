"""Render zone-lab film: a grid of frames for one play, end-zone view with the
play side to the right. Offense blue, defense red, carrier gold; solid lines
are engagements (width by blocker win: thin = winning), dashed grey lines are
blocker -> current target.
python -I scripts/diag/zone-lab/film.py RUN.jsonl.gz CASE_ID OUT.png [t0,t1,...]
"""
import gzip, json, sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

path, cid, out = sys.argv[1:4]
times = [float(x) for x in sys.argv[4].split(',')] if len(sys.argv) > 4 else None
row = next(json.loads(l) for l in gzip.open(path, 'rt') if json.loads(l)['id'] == cid)
fr = row['frames']; los, by, ps, d = row['los'], row['ballY'], row['ps'], row['adir']
slots, team = row['slots'], row['team']
if times is None:
    end = fr[-1]['t']; start = fr[0]['t']
    times = [start + i * 0.4 for i in range(int((end - start) / 0.4) + 1)][:12] + [end]
pick = [min(fr, key=lambda f: abs(f['t'] - t)) for t in times]
n = len(pick); cols = 4; rows = (n + cols - 1) // cols
fig, axes = plt.subplots(rows, cols, figsize=(cols * 4.2, rows * 4.2))
axes = axes.flatten() if n > 1 else [axes]
X = lambda p: (p[1] - by) * ps          # lateral, play side +
Y = lambda p: (p[0] - los) * d          # downfield
for ax, f in zip(axes, pick):
    P = f['p']
    ax.axhline(0, color='#999', lw=.8)
    for b, tgt, kind in f['tg']:
        if tgt >= 0:
            ax.plot([X(P[b]), X(P[tgt])], [Y(P[b]), Y(P[tgt])], ls=':', color='#888', lw=.7)
    for b, de, win, helpers in f['e']:
        ax.plot([X(P[b]), X(P[de])], [Y(P[b]), Y(P[de])], color='k', lw=1 + 2.5 * max(0, min(1, win)))
        for h in helpers:
            ax.plot([X(P[h]), X(P[de])], [Y(P[h]), Y(P[de])], color='purple', lw=1)
    for i, p in enumerate(P):
        if abs(X(p)) > 14 or Y(p) > 14: continue
        col = '#f2b400' if i == f['c'] else ('#2b6cb0' if team[i] == 'O' else '#c53030')
        ax.add_patch(plt.Circle((X(p), Y(p)), .3, color=col, alpha=.5 if p[3] else 1))
        ax.text(X(p), Y(p) + .38, slots[i].replace('_', ''), fontsize=6, ha='center')
    ax.set_xlim(-10, 12); ax.set_ylim(-8, 9); ax.set_aspect('equal')
    ax.set_title(f"t={f['t']:.2f}", fontsize=9); ax.tick_params(labelsize=6)
for ax in axes[n:]: ax.axis('off')
fc = row.get('firstContact') or {}
fig.suptitle(f"{cid}  gain {row['gain']}  first contact {fc.get('by')} @ {fc.get('t')} ({fc.get('x')} yd)  handoff {row['handoff']}", fontsize=10)
fig.tight_layout(); fig.savefig(out, dpi=80)
print(out)
