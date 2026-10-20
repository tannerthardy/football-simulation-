"""Analyze the pinned compact contact matrix and draw a static chart; zero simulation."""
from pathlib import Path
import gzip
import json
import math

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle

ROOT = Path('data/reviews/current/run-contact-composition')


def read(case, arm):
    return json.loads(gzip.decompress((ROOT / f'{case}-{arm}.json.gz').read_bytes()))


def first_change(a, b):
    for off, on in zip(a['frames'], b['frames']):
        actors = [a['slots'][i] for i, (x, y) in enumerate(zip(off['final'], on['final'])) if x != y]
        if actors:
            return {'requestAt': off['t'], 'executionEnds': off['end'], 'actors': actors}
    return None


def hand_force(frame, blocker, defender):
    hand = next((h['hands'] for h in frame['handsAfter']
                 if h['b'] == blocker and h['d'] == defender), None)
    return math.hypot(hand['normal'], hand['tangent']) if hand else 0


summary = {'cases': {}, 'newNativePrefixes': 7, 'reusedNativePrefixes': 4}
for case in ['strong', 'weak', 'power']:
    names = ['baseline', 'drive', 'both'] if case == 'power' else ['baseline', 'runoff', 'drive', 'both']
    arms = {arm: read(case, arm) for arm in names}
    base = arms['baseline']
    assert all(x['setup'] == base['setup'] and x['profiles'] == base['profiles']
               and x['flags'] == base['flags'] and x['inputSha256'] == base['inputSha256']
               for x in arms.values())
    result = {'id': base['case'], 'inputSha256': base['inputSha256'], 'arms': {}}
    for arm, x in arms.items():
        rb = x['slots'].index('RB')
        events = [{**e, **{key: x['slots'][e[key]] for key in ['a', 'b'] if e.get(key) is not None}}
                  for e in x['events'] if e['type'] in ['carrier_contact', 'tackle', 'block_climb', 'fumble']]
        traffic = [{'t': f['t'], 'a': x['slots'][c['i']], 'b': x['slots'][c['j']]}
                   for f in x['frames'] for c in f['contacts'] if c['i'] < 11 and c['j'] < 11]
        phases = []
        previous = None
        for f in x['frames']:
            p = f['before'][x['slots'].index('C')]['plan']
            phase = (p.get('zoneRead') or {}).get('phase') if p else None
            if phase != previous:
                phases.append({'t': f['t'], 'phase': phase})
                previous = phase
        result['arms'][arm] = {
            'censored': x['censored'], 'end': x['frames'][-1]['end'], 'result': x['result'],
            'runnerLOS': next((f['end'] for f in x['frames'] if f['after'][rb]['pos']['x'] >= 40), None),
            'events': events, 'centerPhases': phases, 'teammateContacts': traffic,
            'budgetMaxima': x['budgetMaxima'],
        }
    result['firstChanges'] = {f'{off}->{on}': first_change(arms[off], arms[on])
                              for off, on in [('baseline', 'drive'), ('baseline', 'both'),
                                              ('runoff', 'both'), ('drive', 'both')] if off in arms}
    if case == 'power':
        result['driveBothIdentical'] = {key: arms['drive'][key] == arms['both'][key]
                                       for key in ['setup', 'profiles', 'frames', 'events', 'result']}
        result['runoffOnly'] = 'Not rerun: this contribution is inactive in Power; drive/both identity checked.'
    summary['cases'][case] = result

receipts = [json.loads(p.read_text()) for p in ROOT.glob('*-receipt.json')]
summary['newCommandSeconds'] = sum(c['elapsedSeconds'] for r in receipts for c in r['commands'])
# Keep collector and correctness-check costs distinct using their recorded filenames.
summary['newCollectorSeconds'] = sum(c['elapsedSeconds'] for p in ROOT.glob('*-receipt.json')
                                     if p.name not in ['focused-receipt.json', 'typecheck-receipt.json']
                                     for c in json.loads(p.read_text())['commands'])
(ROOT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')

fig, axes = plt.subplots(1, 3, figsize=(15, 4.6), constrained_layout=True)
colors = {'baseline': '#777777', 'runoff': '#176ba0', 'drive': '#cb722c', 'both': '#31824c'}
for arm, color in colors.items():
    x = read('strong', arm)
    fs = [f for f in x['frames'] if .8 <= f['t'] <= 3]
    axes[0].plot([f['end'] for f in fs], [hand_force(f, 'C', 'LB_M') for f in fs],
                 color=color, label=arm, lw=1.8)
    x = read('weak', arm)
    c, d = x['slots'].index('C'), x['slots'].index('DT_W')
    fs = [f for f in x['frames'] if f['end'] <= 3]
    axes[1].plot([f['end'] for f in fs],
                 [f['after'][c]['pos']['y'] - f['after'][d]['pos']['y'] for f in fs],
                 color=color, label=arm, lw=1.8)
axes[0].set(title='Strong OZ: C stays loaded on Mike', xlabel='Seconds after snap', ylabel='Actual resultant hand force (kg·yd/s²)')
axes[1].set(title='Weak WZ: C gains outside position', xlabel='Seconds after snap', ylabel='C playside margin relative to DT (yd)')
for ax in axes[:2]:
    ax.grid(alpha=.2)
    ax.legend(fontsize=8)

for arm, alpha in [('baseline', .35), ('both', 1)]:
    x = read('power', arm)
    f = next(f for f in x['frames'] if abs(f['t'] - 3.1) < 1e-7)
    for slot, color in [('LT', '#176ba0'), ('LB_W', '#31824c'), ('RB', '#cb722c')]:
        i = x['slots'].index(slot)
        p = f['before'][i]['pos']
        point = (p['y'], p['x'] - 40)
        axes[2].add_patch(Circle(point, x['profiles'][i]['radius'],
                                 facecolor=color if arm == 'both' else 'none',
                                 edgecolor=color, alpha=alpha, lw=1.5))
        if arm == 'both':
            offset = {'LT': (15, 20), 'LB_W': (-50, 5), 'RB': (-20, -30)}[slot]
            axes[2].annotate(slot, point, xytext=offset, textcoords='offset points', color=color,
                              fontsize=9, arrowprops={'arrowstyle': '-', 'color': color})
axes[2].set(title='Power: loaded LT leaves Will access at 3.10 s',
             xlabel='Lateral field position (yd)', ylabel='Depth from LOS (yd)',
             xlim=(26.1, 31), ylim=(-.7, 5.1))
axes[2].set_aspect('equal', adjustable='box')
axes[2].grid(alpha=.2)
axes[2].text(.03, .97, 'Filled: both; outline: baseline', transform=axes[2].transAxes,
             va='top', fontsize=8)
fig.suptitle('Run-contact combination: actual work, positioning and a retained defensive win', fontsize=13)
fig.savefig(ROOT / 'comparison.png', dpi=150)
fig.savefig(ROOT / 'comparison.svg')
svg = ROOT / 'comparison.svg'
svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines()) + '\n')
print(json.dumps({'newPrefixes': 7, 'reusedPrefixes': 4, 'newCommandSeconds': summary['newCommandSeconds'],
                  'newCollectorSeconds': summary['newCollectorSeconds']}))
