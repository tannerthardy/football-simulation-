"""Plot all controlled loads, including overload escape; no trajectory edits.
MPLCONFIGDIR=/tmp/football-mpl python3 -I scripts/diag/tackle/continued-recovery-plot.py
"""
import json
import sys
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/continued-recovery/final')
data = json.loads((root / 'one-body.json').read_text())
fig, axes = plt.subplots(1, 3, figsize=(12, 3.4), constrained_layout=True)
for load in [0, 100, 600, 1000, 1500]:
    r = next(r for r in data['sustained'] if r['load'] == load)
    axes[0].plot([v['t'] for v in r['rows']], [v['state']['xi']['x'] for v in r['rows']], label=str(load))
axes[0].set(xlabel='Time (s)', ylabel='Capture deviation (yd, log scale)', title='Constant load from a reacted step', yscale='log')
axes[0].legend(title='Opposing load', fontsize=8)
r = data['changing'][1]
axes[1].plot([v['t'] for v in r['rows']], [v['state']['xi']['x'] for v in r['rows']], color='#1565c0')
axes[1].set(xlabel='Time (s)', ylabel='Capture deviation (yd)', title='Increase, hold, remove at 0.6 s')
for ax in axes[:2]:
    ax.axhline(data['params']['rb'], color='#c43b3b', ls='--', lw=1)
    ax.axhline(data['params']['rb']/2, color='#666666', ls=':', lw=1)
    ax.grid(alpha=.18)
axes[1].axvline(.6, color='#888888', ls='--', lw=1)
axes[2].plot([v['t'] for v in r['rows']], [v['flow']['peakCommandForce'] for v in r['rows']], color='#1565c0', label='Active step force')
axes[2].step([v['t']-v['h'] for v in r['rows']], [v['load'] for v in r['rows']], where='post', color='#cc8800', label='Opposing load')
axes[2].axhline(data['params']['capacity'], color='#c43b3b', ls='--', lw=1, label='Existing force capacity')
axes[2].set(xlabel='Time (s)', ylabel='Force (existing engine units)', title='One common force budget')
axes[2].grid(alpha=.18)
axes[2].legend(fontsize=8)
fig.suptitle('Diagnostic reduced recovery response; same capabilities, no World substeps', fontsize=11)
fig.savefig(root / 'one-body-response.svg')
fig.savefig(root / 'one-body-response.png', dpi=170)
print(root / 'one-body-response.png')
