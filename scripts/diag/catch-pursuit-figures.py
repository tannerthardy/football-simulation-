"""Export saved-only film and schematic calls; no simulator measurements."""
import gzip
import json
import os
import subprocess
from pathlib import Path

os.environ.setdefault('MPLCONFIGDIR', '/tmp/football-mpl')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = Path('out/catch-pursuit')
wanted = ['R3101-S1001-P58', 'R3101-S1001-P173', 'R4202-S2001-P95', 'R4202-S2001-P67']
clips = {}
for cohort in (3101, 4202):
    with gzip.open(root / f'trace{cohort}.json.gz', 'rt') as f:
        packet = json.load(f)
    clips.update({c['id']: c for c in packet['clips'] if c['id'] in wanted})
    del packet

fig, axes = plt.subplots(2, 2, figsize=(13, 9), constrained_layout=True)
for ax, ident in zip(axes.flat, wanted):
    c = clips[ident]
    catch = next(e for e in c['result']['events'] if e['type'] == 'catch')
    ri, t = catch['a'], catch['t']
    rows = [r for r in c['rows'] if t - .6 <= r['t'] <= t + 2]
    first_load = next((g for r in rows for g in r['world']['grasps']
                       if r['pre']['catchAt'] >= 0 and r['pre']['carrier'] == ri
                       and ri in (g['a'], g['b']) and g.get('force', 0) > 0), None)
    d = first_load['a'] if first_load and first_load['b'] == ri else first_load['b'] if first_load else None
    at = next(r for r in rows if r['t'] >= t)
    def distance(i):
        a, b = at['world']['after'][i]['pos'], at['world']['after'][ri]['pos']
        return (a['x']-b['x'])**2 + (a['y']-b['y'])**2
    nearest = min((p['idx'] for p in c['players'] if p['team'] == 'D'), key=distance)
    actors = [(ri, '#137a4d', 'Catcher'), (nearest, '#2966b0', 'Nearest at catch')]
    if d is not None and d != nearest:
        actors.append((d, '#d77216', 'First loaded defender'))
    for i, color, role in actors:
        player = c['players'][i]
        points = [r['world']['after'][i]['pos'] for r in rows]
        ax.plot([p['x'] for p in points], [p['y'] for p in points], color=color, lw=2,
                label=f"{role}: {player['slot']} {player['id']}")
        p = at['world']['after'][i]['pos']
        ax.scatter(p['x'], p['y'], color=color, marker='o', s=50, zorder=5)
        ax.scatter(points[-1]['x'], points[-1]['y'], color=color, marker='>', s=40)
    for r in rows:
        loaded = r['pre']['catchAt'] >= 0 and r['pre']['carrier'] == ri and any(
            ri in (g['a'], g['b']) and g.get('force', 0) > 0 for g in r['world']['grasps'])
        if loaded:
            p = r['world']['after'][ri]['pos']
            ax.scatter(p['x'], p['y'], color='#d77216', marker='x', s=30, alpha=.7)
    ax.set_title(f"{ident}\nFull play: {c['result']['outcome']}, YAC {c['result']['stats']['yac']:.2f} yd")
    ax.set_xlabel('Downfield coordinate (yards)')
    ax.set_ylabel('Lateral coordinate (yards)')
    ax.grid(alpha=.18)
    ax.legend(fontsize=8, loc='best')
fig.suptitle('Unchanged 4ded6b6 runtime: catch −0.6 s to catch +2.0 s\nCircles = catch boundary; orange crosses = positive solved grasp load; full outcomes come from full traces', fontsize=12)
fig.savefig(root / 'contact-control-film.svg')
fig.savefig(root / 'contact-control-film.png', dpi=140)
plt.close(fig)

routes = json.loads(subprocess.check_output(['node', '--import', 'tsx', '--input-type=module', '-e',
    "import {ROUTES} from './src/playbook/routes.ts'; console.log(JSON.stringify(ROUTES));"], text=True))
designs = json.loads((root / 'custom.json').read_text())['designs']
fig, axes = plt.subplots(2, 2, figsize=(13, 10), constrained_layout=True)
starts = {'S1': 20, 'S2': 11, 'S3': 4, 'W1': -20, 'W2': -10, 'B': 3}
colors = ['#2966b0', '#d77216', '#137a4d', '#9952a0', '#cc4e63', '#547f7b']
for ax, design in zip(axes.flat, designs):
    call = design['call']
    mapping = {**{f'S{k}': v for k, v in call['strong'].items()},
               **{f'W{k}': v for k, v in call['weak'].items()}, 'B': call['back']}
    if design['formation'] == 'gun_doubles_11':
        mapping.pop('S3', None)
    for (ref, route), color in zip(mapping.items(), colors):
        if route in ('block', 'check'):
            continue
        start = starts[ref]
        sign = -1 if ref.startswith('W') else 1
        points = [{'d': 0, 'l': 0}, *routes[route]['points']]
        x = [start + p['l'] * sign for p in points]
        y = [min(p['d'], 35) for p in points]
        ax.plot(x, y, color=color, lw=2, label=f'{ref}: {route}')
        ax.scatter(x[0], 0, color=color, s=40)
        ax.annotate('', xy=(x[-1], y[-1]), xytext=(x[-2], y[-2]), arrowprops={'arrowstyle': '->', 'color': color})
    ax.axhline(0, color='#666', lw=1)
    ax.set_xlim(-35, 35)
    ax.set_ylim(-3, 36)
    ax.set_title(f"{call['name']}\nRequested attack: {design['attack']} / adverse control: {design['control']}")
    ax.set_xlabel('Schematic lateral yards from center')
    ax.set_ylabel('Route depth from LOS (yards)')
    ax.grid(alpha=.15)
    ax.legend(fontsize=8, loc='upper left')
fig.suptitle('Lab-only NFL-style combinations from installed routes\nSchematics show the call, not achieved paths; native formation checks may change the effective coverage', fontsize=12)
fig.savefig(root / 'route-conflicts.svg')
fig.savefig(root / 'route-conflicts.png', dpi=140)
plt.close(fig)
print('Exported contact-control-film and route-conflicts as SVG/PNG.')
