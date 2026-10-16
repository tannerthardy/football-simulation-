"""Static plot from saved native tapes; no simulation or outcome fitting."""
import gzip
import json
import math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = Path('data/reviews/current/combo-strike-access')
pair = next(r for r in json.loads(gzip.decompress((root / 'paired-tapes.json.gz').read_bytes()))
            if r['candidate']['id'] == 'A018')
colors = {'RG': '#e69f00', 'RT': '#0072b2', 'DT_S': '#666666', 'LB_M': '#d55e00', 'RB': '#009e73'}
fig, axes = plt.subplots(2, 2, figsize=(12, 9), gridspec_kw={'width_ratios': [1, 1.25]})
for row, arm in enumerate(['reference', 'candidate']):
    data, ax = pair[arm], axes[row, 0]
    actors = {a['slot']: a['idx'] for a in data['initial']}
    frames = [f for f in data['frames'] if 1.05 <= f['t'] <= 3.4]
    arrival = next(f for f in frames if abs(f['t'] - 2.6) < 1e-8)
    for name, color in colors.items():
        i = actors[name]
        x = [f['after'][i]['pos']['y'] for f in frames]
        y = [f['after'][i]['pos']['x'] for f in frames]
        ax.plot(x, y, color=color, lw=2, label=name)
        pos = arrival['after'][i]['pos']
        ax.scatter(pos['y'], pos['x'], s=65, c=color, edgecolors='white', zorder=4)
        offset = {'RG': (5, -12), 'RT': (-18, 7), 'DT_S': (-12, -15), 'LB_M': (6, 10), 'RB': (-22, 5)}[name]
        ax.annotate(name, (pos['y'], pos['x']), xytext=offset, textcoords='offset points', color=color, fontsize=9)
    ax.axhline(35, color='#999999', lw=1, ls='--')
    ax.set(xlim=(22.2, 28.5), ylim=(31.0, 41.0), xlabel='Across field (yd)', ylabel='Upfield (yd)',
           title=('Accepted: no RG/Mike block' if arm == 'reference' else 'Candidate: RG/Mike load; RT keeps DT'))
    ax.set_aspect('equal', adjustable='box')
    ax.grid(alpha=.15)
    ax = axes[row, 1]
    for b, d, label, color in [('RG', 'LB_M', 'RG → Mike', colors['RG']), ('RT', 'DT_S', 'RT → DT', colors['RT'])]:
        i, j = actors[b], actors[d]
        def force(f):
            return max((math.hypot(r['hands'].get('normal') or 0, r['hands'].get('tangent') or 0)
                        for r in f['afterReps'] if r['b'] == i and r['d'] == j and r['hands']), default=0)
        ax.plot([f['t'] + .05 for f in frames], [force(f) for f in frames], color=color, label=label, lw=2)
    ax.axvline(2.65, color='#333333', ls='--', label='Runner reaches LOS')
    ax.axvspan(2.30, 2.35, color=colors['RG'], alpha=.15)
    ax.set(xlim=(1.05, 3.4), ylim=(0, 1300), xlabel='Achieved time after World step (s)',
           ylabel='Actual hand-force magnitude (engine units)', title='Existing contact law; no extra force budget')
    ax.grid(alpha=.2)
    ax.legend(loc='upper right', fontsize=9)
fig.suptitle('A018 — same release, bodies, acquired information and physical laws', fontsize=15)
fig.text(.5, .018, 'Dots: runner line-arrival state at 2.65 s. Paths continue to 3.45 s. Force alone is not protection: '
         'first runner contact changes Mike 3.30 s → safety 3.40 s.', ha='center', fontsize=10)
fig.tight_layout(rect=(0, .045, 1, .96))
fig.savefig(root / 'a018-protection.png', dpi=155)
