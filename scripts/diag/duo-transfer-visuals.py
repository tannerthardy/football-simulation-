"""Static charts from the saved reduction. No simulation."""
import gzip
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle

root = Path('data/reviews/current/duo-transfer')
summary = json.loads((root / 'summary.json').read_bytes())
manifest = json.loads((root / 'inputs.json').read_bytes())
data = json.load(gzip.open(root / 'paired-tapes.json.gz', 'rt'))
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10, 'axes.spines.top': False,
                     'axes.spines.right': False, 'figure.facecolor': '#fafaf7', 'axes.facecolor': '#fafaf7'})
duo = [r for r in summary['rows'] if r['concept'] == 'duo']
labels = []
for r in duo:
    form = {'ace_11': 'Ace', 'ace_trips_11': 'Trips', 'gun_doubles_11': 'Gun'}[r['formation']]
    labels.append(f"{r['id']}  {form} / {r['front']} / {'left' if r['flip'] else 'right'}"
                  + (' / elusive' if r['matchup'] != 'ordinary' else ''))
fig, axes = plt.subplots(1, 3, figsize=(15, 7.4), gridspec_kw={'width_ratios': [2.4, 1.2, 2.4]})
for i, r in enumerate(duo):
    old, new = r['reference'], r['current']
    axes[0].plot([old['losSpeed'], new['losSpeed']], [i, i], color='#a4aaa9', lw=2)
    axes[0].scatter(old['losSpeed'], i, color='#7e858b', s=45, zorder=3, label='Before #84' if i == 0 else None)
    axes[0].scatter(new['losSpeed'], i, color='#007f8b', s=35, zorder=4, label='Accepted #84' if i == 0 else None)
    old_load = sum(j['loadedBeforeLos'] for j in old['jobs'])
    new_load = sum(j['loadedBeforeLos'] for j in new['jobs'])
    axes[1].text(.5, i, f'{old_load}  →  {new_load}', ha='center', va='center', fontsize=11)
    names = {'LB_M': 'Mike', 'LB_W': 'Will', 'DE_S': 'End', 'SS': 'SS', 'FS': 'FS'}
    a, b = old['firstContact'], new['firstContact']
    axes[2].text(.02, i, f"{names[a['defenderSlot']]} {a['t']:.2f} → {names[b['defenderSlot']]} {b['t']:.2f}",
                 va='center', color='#962e2a' if r['id'] == 'D06' else '#263535')
for ax in axes:
    ax.set_ylim(len(duo) - .4, -.6)
    ax.set_yticks(range(len(duo)))
    ax.grid(axis='y', color='#e3e4df', lw=.6)
axes[0].set_yticklabels(labels)
axes[0].set_xlabel('Runner speed at line arrival, yd/s')
axes[0].legend(loc='upper left', bbox_to_anchor=(0, -.12), frameon=False, ncol=2)
axes[1].set_title('Released jobs with actual\nLB load by line arrival', fontsize=11)
axes[2].set_title('First defender reaching the runner\n(native event seconds)', fontsize=11)
for ax in axes[1:]:
    ax.set_xlim(0, 1); ax.set_xticks([]); ax.set_yticklabels([])
    for spine in ax.spines.values(): spine.set_visible(False)
fig.suptitle('Duo transfers in some situations; the same rule does not ensure useful collection', fontsize=16, x=.02, ha='left')
fig.text(.02, .025, '12 predeclared paired cases • fixed players and seeds • gray before / teal accepted • no yards target\n'
         'Load is evidence of contact, not proof of route protection. Call orientations are not identical mirrored athletes.', fontsize=9, color='#4a5556')
fig.subplots_adjust(left=.29, right=.98, top=.88, bottom=.19, wspace=.23)
fig.savefig(root / 'variety.png', dpi=150)
plt.close(fig)

fig, axes = plt.subplots(2, 2, figsize=(11.5, 10), sharex=True, sharey=True)
colors = {3: '#7355a4', 4: '#007f8b', 1: '#317ab8', 14: '#bb503d', 13: '#bb503d',
          16: '#b7841c', 15: '#b7841c', 6: '#172e37'}
for ri, case in enumerate(['D05', 'D06']):
    inp = next(r for r in manifest['rows'] if r['id'] == case)
    ids = [3, 4, 14, 16, 6] if case == 'D05' else [1, 4, 13, 15, 6]
    for ci, arm in enumerate(['reference', 'current']):
        row = next(r for r in data[arm] if r['id'] == case)
        ax = axes[ri, ci]
        frames = [f for f in row['frames'] if .95 <= f['t'] <= 2.65]
        side = 1 if inp['flip'] else -1
        project = lambda b: ((b['pos']['y'] - inp['setup']['ballY']) * side,
                             b['pos']['x'] - inp['setup']['los'])
        ax.axhline(0, color='#a1aaa5', lw=1, linestyle=':')
        for actor in ids:
            positions = [project(f['agents'][actor]) for f in frames]
            x, y = zip(*positions)
            ax.plot(x, y, color=colors[actor], lw=2.4 if actor == 6 else 1.6,
                    linestyle='--' if actor == 6 else '-', label=row['slots'][actor])
            ax.scatter(x[0], y[0], s=16, color=colors[actor])
            ax.add_patch(Circle((x[-1], y[-1]), .25 if actor == 6 else .28,
                                fill=False, edgecolor=colors[actor], lw=1.5))
            ax.text(x[-1] + .1, y[-1] + .1, row['slots'][actor], fontsize=9, color=colors[actor])
        ax.set_title(f"{case} {'right' if not inp['flip'] else 'left'} Over — {'before' if arm == 'reference' else 'accepted'}", loc='left')
        ax.set_xlim(-4, 5); ax.set_ylim(-6, 4.7)
        ax.set_aspect('equal'); ax.grid(alpha=.2)
        if case == 'D05':
            message = 'C climbs; no Will load' if arm == 'reference' else 'LG loads Will; C keeps tackle'
        else:
            message = 'LT leaves 1.55; Mike still unloaded here' if arm == 'reference' else 'LT leaves 2.55; Mike contacts RB 2.75'
        ax.text(.02, .03, message, transform=ax.transAxes, fontsize=9,
                bbox={'facecolor': '#fafaf7', 'edgecolor': 'none', 'alpha': .9})
        if ci == 0: ax.set_ylabel('Downfield from line, yd')
        if ri == 1: ax.set_xlabel('Across the field toward called side, yd')
fig.suptitle('Same roster, Over front: a useful transfer and its adverse opposing case', fontsize=15)
fig.text(.05, .025, 'Actual all-player native continuations; selected paths shown from 0.95 through World tick 2.65. Circles mark final shown positions.\n'
         'RB follows its own changing reads. D06 first changes at backside C 0.95; contact execution draws also change.', fontsize=9)
fig.tight_layout(rect=[0, .07, 1, .95])
fig.savefig(root / 'paths.png', dpi=150)
plt.close(fig)
print('Wrote two static charts from saved tapes; zero native steps.')
