"""Plot saved diagnostic measurements; no simulation. Requires matplotlib."""
import argparse
import csv
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report', type=Path, required=True)
args = parser.parse_args()
summary = json.loads((args.report/'summary.json').read_text())
rows = list(csv.DictReader((args.report/'timeline.csv').open()))
colors = {'parent': '#596579', 'candidate': '#007d85'}
labels = {'parent': 'PR #50', 'candidate': 'Gather experiment'}
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10,
                     'axes.spines.top': False, 'axes.spines.right': False})
fig, axs = plt.subplots(2, 2, figsize=(11, 7), layout='constrained')
fig.suptitle('Combination departure: measure the keeper as well as the climber', fontsize=15, weight='bold')
for arm in ['parent', 'candidate']:
    weak = [r for r in rows if r['case'] == 'weak-H' and r['arm'] == arm]
    contacts = [r for r in weak if float(r['climberDownImpulse']) > 1e-8]
    offset = -.009 if arm == 'parent' else .009
    axs[0, 0].bar([float(r['entry'])+offset for r in contacts],
        [float(r['climberDownImpulse']) for r in contacts], width=.017, color=colors[arm], label=labels[arm])
    axs[0, 1].plot([float(r['boundary']) for r in weak], [float(r['keeper_x'])-40 for r in weak], color=colors[arm], label=labels[arm], lw=2)
    inside = [r for r in rows if r['case'] == 'inside-zone' and r['arm'] == arm]
    axs[1, 0].plot([float(r['entry']) for r in inside],
        [sum(float(s['climberDownImpulse']) for s in inside if float(s['entry']) <= float(r['entry'])) for r in inside],
        color=colors[arm], label=labels[arm], lw=2)
    axs[1, 1].plot([float(r['boundary']) for r in weak], [float(r['assignedBackerDistance']) for r in weak], color=colors[arm], label=labels[arm], lw=2)
axs[0, 0].set(title='Weak zone: RT / DT_S torso impacts', xlabel='Entry time (s)', ylabel='Impulse (kg·yd/s)', xlim=(.86, 1.1))
axs[0, 0].text(.98, .93, 'Total: 124.01 → 87.19\nAssigned LB_S load: zero in both', transform=axs[0, 0].transAxes, ha='right', va='top', fontsize=9)
axs[0, 0].legend(loc='center right', frameon=False)
axs[0, 1].set(title='Weak zone: achieved RG keeper depth', xlabel='Boundary time (s)', ylabel='Downfield from LOS (yd)', xlim=(.85, 3))
axs[0, 1].axhline(0, color='#ccc', lw=1)
axs[0, 1].annotate('New RG–Y impact\n78.88 kg·yd/s', xy=(2.9, -1.74), xytext=(1.35, -1.7), arrowprops={'arrowstyle': '->', 'color': '#9c3a28'}, color='#9c3a28', fontsize=9)
axs[1, 0].set(title='Inside zone: C / DT_W cumulative torso impulse', xlabel='Entry time (s)', ylabel='Cumulative impulse (kg·yd/s)', xlim=(.95, 1.5))
axs[1, 0].text(.04, .95, 'First impact: 67.49 → 45.74\nTotal: 310.63 → 315.49', transform=axs[1, 0].transAxes, va='top', fontsize=9)
axs[1, 1].set(title='Weak zone: RT distance from assigned LB_S', xlabel='Boundary time (s)', ylabel='COM separation (yd)', xlim=(.85, 3))
axs[1, 1].text(.04, .95, 'No collection improvement\nNo assigned LB contact through 3 s', transform=axs[1, 1].transAxes, va='top', fontsize=9)
for ax in axs.flat:
    ax.grid(axis='y', color='#e8e8e8', lw=.7)
    ax.set_axisbelow(True)
fig.savefig(args.report/'departure-comparison.png', dpi=160, facecolor='white')
fig.savefig(args.report/'departure-comparison.svg', facecolor='white')
svg = args.report/'departure-comparison.svg'
svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines())+'\n')
