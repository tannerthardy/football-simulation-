#!/usr/bin/env python3
"""Plot saved native tapes only; run from the repository root. No simulations."""
import gzip
import json
import os
from pathlib import Path

os.environ.setdefault('MPLCONFIGDIR', '/tmp/strong-weak-zone-mpl')
os.environ.setdefault('XDG_CACHE_HOME', '/tmp/strong-weak-zone-cache')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

ROOT = Path(__file__).resolve().parents[3]
ARMS = [
    ('Accepted develop d682b1f', 'out/stretch-access/final-interaction.json.gz'),
    ('Unmerged #117 contact + footwork', 'out/zone-anchor/combined-native.json.gz'),
    ('Motion-read only on accepted host', 'out/strong-weak-zone/runner-only-native.json.gz'),
]
COLORS = dict(rb='#1369ab', edge='#d17b16', line='#8f99a5', defender='#903d4b')
SLOTS = ('LT', 'LG', 'C', 'RG', 'RT', 'Y', 'H')
fig, axes = plt.subplots(3, 2, figsize=(13.6, 14.5), sharex=True, sharey=True)
fig.subplots_adjust(left=.075, right=.985, top=.875, bottom=.115, hspace=.34, wspace=.11)

for row, (arm, path) in enumerate(ARMS):
    data = json.loads(gzip.decompress((ROOT / path).read_bytes()))
    for col, direction in enumerate(('strong', 'weak')):
        ax = axes[row, col]
        case = next(r for r in data['rows'] if r['id'] == f'wz-{direction}-over3')
        sign = -1 if direction == 'strong' else 1
        edge_slot = 'Y' if direction == 'strong' else 'LT'
        defender_slot = 'DE_S' if direction == 'strong' else 'DE_W'
        contact = next(e for e in case['events'] if e['type'] == 'carrier_contact')

        def points(slot, until):
            pts = [b['pos'] for f in case['frames'] if f['t'] <= until + 1e-7
                   for b in f['bodies'] if b['slot'] == slot]
            return [(p['y'] - 26.67) * sign for p in pts], [p['x'] - 40 for p in pts]

        ax.axhline(0, color='#46535f', linewidth=1.1, zorder=0)
        ax.text(12.45, .13, 'LOS', color='#46535f', fontsize=8, ha='right')
        for slot in SLOTS:
            x, y = points(slot, 2)
            focus = slot == edge_slot
            color = COLORS['edge' if focus else 'line']
            ax.plot(x, y, color=color, linewidth=2.7 if focus else 1.2,
                    alpha=1 if focus else .78, zorder=3 if focus else 1)
            ax.scatter(x[-1], y[-1], s=18 if focus else 9, color=color, zorder=4)
            offset = {'LG': (3, -11), 'RT': (-13, -10), 'C': (3, 4),
                      'H': (3, 4), 'Y': (3, 4), 'LT': (3, 4), 'RG': (3, 4)}[slot]
            if focus:
                offset = (4, -12)
            ax.annotate(slot, (x[-1], y[-1]), xytext=offset, textcoords='offset points',
                        fontsize=8, color=color, fontweight='bold' if focus else 'normal')
        x, y = points(defender_slot, 2)
        ax.plot(x, y, '--', color=COLORS['defender'], linewidth=1.7, zorder=2)
        ax.scatter(x[-1], y[-1], marker='x', s=30, color=COLORS['defender'])
        ax.annotate(defender_slot, (x[-1], y[-1]), xytext=(4, 7),
                    textcoords='offset points', color=COLORS['defender'], fontsize=8)
        x, y = points('RB', contact['t'])
        ax.plot(x, y, color=COLORS['rb'], linewidth=2.8, zorder=5)
        ax.scatter(x[0], y[0], marker='s', s=24, color=COLORS['rb'], zorder=6)
        ax.scatter(x[-1], y[-1], s=55, marker='o', facecolor='white',
                   edgecolor=COLORS['rb'], linewidth=2, zorder=6)
        ax.annotate(f"First contact {contact['t']:.2f}s", (x[-1], y[-1]),
                    xytext=(-8, 12), textcoords='offset points', ha='right',
                    color=COLORS['rb'], fontsize=8.7,
                    bbox=dict(facecolor='white', alpha=.83, edgecolor='none', pad=1.5))
        ax.set_title(f"{arm}\nEnding: {case['gain']:.2f} yd, {case['t']:.2f}s", fontsize=10.5,
                     loc='left', pad=8)
        ax.set_xlim(-5.8, 12.8)
        ax.set_ylim(-7.35, 5.5)
        ax.set_aspect('equal', adjustable='box')
        ax.grid(color='#dfe4e9', alpha=.75, linewidth=.6)
        ax.spines[['top', 'right']].set_visible(False)
        ax.tick_params(labelsize=9)
        if col == 0:
            ax.set_ylabel('Upfield from LOS (yd)', fontsize=10)
        if row == 2:
            ax.set_xlabel('Lateral toward the run side (yd from ball)', fontsize=10)

fig.suptitle('Same Ace 12 / Over 43 input, different jobs and runner routes',
             x=.075, y=.978, ha='left', fontsize=17, fontweight='bold')
fig.text(.075, .950, 'Both tight ends are attached; field-side labels do not imply closed versus open surfaces.', fontsize=11)
fig.text(.285, .925, 'STRONG · Y SIDE (−y)', ha='center', fontsize=12, fontweight='bold')
fig.text(.748, .925, 'WEAK · H SIDE (+y)', ha='center', fontsize=12, fontweight='bold')
handles = [
    Line2D([0], [0], color=COLORS['rb'], lw=2.8, label='RB: snap → first actual contact'),
    Line2D([0], [0], color=COLORS['edge'], lw=2.7, label='Primary edge blocker: through 2.00s'),
    Line2D([0], [0], color=COLORS['line'], lw=1.3, label='Other OL / TE: through 2.00s'),
    Line2D([0], [0], color=COLORS['defender'], lw=1.7, ls='--', label='Edge defender: through 2.00s'),
]
fig.legend(handles=handles, loc='lower left', bbox_to_anchor=(.068, .058),
           ncol=2, frameon=False, fontsize=9.5)
fig.text(.075, .032, 'All 22 players remain active. Paths show body centers, not modeled individual feet.\n'
         'Directions are normalized; the front, personnel and responsibilities are not geometric mirrors.\n'
         'Three exact code arms on one saved input pair: diagnostic comparison, not a success-rate study.',
         fontsize=9, color='#46535f', linespacing=1.5)
output = Path(__file__).with_name('paths.png')
fig.savefig(output, dpi=155, facecolor='white')
print(output)
