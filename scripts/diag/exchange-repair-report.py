"""Offline reduction of saved evidence; never launches the simulator."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--prefix', type=Path, required=True)
p.add_argument('--out', type=Path, default=Path('data/reviews/current/shotgun-exchange'))
args = p.parse_args()
packet = json.loads(gzip.decompress(args.prefix.read_bytes()))
native_path = Path('data/reviews/current/experimental-game-checkpoint/experimental/spread-air/game.json.gz')
game = json.loads(gzip.decompress(native_path.read_bytes()))
traces = {t['index']: t for t in packet['traces']}
edge = []
for index in [4, 11, 17, 18, 39]:
    play = game['log'][index]
    replay = traces[index]['fullReplay'] if index in traces else play['replay']
    samples = []
    first = next(f for f in replay['telemetry']['frames'] if f['agents'][1].get('target') is not None)
    target = first['agents'][1]['target']
    for f in replay['telemetry']['frames']:
        if f['t'] > 2.4:
            break
        film = min(replay['frames'], key=lambda x: abs(x['t']-f['t']))
        blocker = f['agents'][1]
        rusher = f['agents'][target]
        block = next((b for b in f.get('blocks', []) if b['a'] == 1 and b['b'] == target), None)
        samples.append(dict(t=f['t'], target=blocker.get('target'),
                            blocker=film['agents'][3:6], rusher=film['agents'][target*3:target*3+3],
                            request=blocker.get('intent'), body=blocker.get('body'),
                            rusherRequest=rusher.get('intent'), rusherBody=rusher.get('body'),
                            nominalPassSet=blocker.get('passSet'), block=block))
    edge.append(dict(play=index+1, index=index, call=play['call'],
                     target=target, targetSlot=replay['players'][target]['slot'],
                     firstTargetAt=first['t'], outcome=play['outcome'],
                     events=[e for e in replay['events'] if e['type'] in
                             ['block_contact', 'shed', 'pressure', 'throw', 'hit', 'sack', 'fumble']],
                     samples=samples, recording=replay['telemetry']['level']))
args.out.mkdir(parents=True, exist_ok=True)
(args.out/'edge-screen.json').write_text(json.dumps(dict(
    schema='saved-wide-edge-screen-v1', evidencePin='4ae667e29b3ce085f43c5cb911b294349cda2b8f',
    sourceSha256=game['provenance']['sourceSha256'],
    prefixSha256=hashlib.sha256(args.prefix.read_bytes()).hexdigest(),
    nativeGameSha256=hashlib.sha256(native_path.read_bytes()).hexdigest(),
    newSimulations=0, caveat='Recorded intent is final request; body is after that step. '
    'The chosen internal set/cutoff point and raw request are not recorded. '
    'P019 has standard recording, without full body/hand telemetry.',
    plays=edge), indent=2)+'\n')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from math import dist

trace = json.loads(gzip.decompress((args.out/'trace.json.gz').read_bytes()))
new = next(r for r in trace['rows'] if r['id'] == 'spread-air')
old = traces[37]
old_points = [(f['tickStart']+.05, next(a for a in f['actors'] if a['slot']=='QB')['pos'],
               next(a for a in f['actors'] if a['slot']=='RB')['pos']) for f in old['ticks']]
new_points = [(f['t'], f['qb']['pos'], f['rb']['pos']) for f in new['frames'] if f['t'] <= 1.6]
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11})
fig, axes = plt.subplots(1, 2, figsize=(11, 4.3), layout='constrained')
for points, color, label in [(old_points, '#b45309', 'Recorded'), (new_points, '#047857', 'Cadence correction')]:
    for idx, style, role in [(1, '--', 'QB'), (2, '-', 'RB')]:
        axes[0].plot([p[idx]['y']-29.75 for p in points], [p[idx]['x']-87.9 for p in points],
                     style, color=color, linewidth=2, label=f'{label} {role}')
    axes[1].plot([p[0] for p in points], [dist(p[1].values(),p[2].values()) for p in points],
                 color=color, linewidth=2, label=label)
axes[0].set(xlabel='Lateral position from QB alignment (yd)', ylabel='Depth from LOS (yd)', title='P038: first 1.6 seconds')
axes[0].legend(fontsize=8, loc='upper left'); axes[0].grid(alpha=.15)
axes[1].axhline(new['physicalReach'],color='#475569',linestyle='--',label='Unchanged physical reach')
axes[1].axvline(1.05,color='#475569',linestyle=':',label='Transfer window opens')
axes[1].scatter([1.05],[new['transferDistance']],color='#047857',zorder=5)
axes[1].set(xlabel='Seconds after snap',ylabel='QB–RB separation (yd)',title='A reachable exchange at 1.05 s',xlim=(0,1.6),ylim=(.5,4))
axes[1].legend(fontsize=8);axes[1].grid(alpha=.15)
fig.savefig(args.out/'exchange.png',dpi=155)
print(json.dumps({'nativeSimulations':0,'files':['edge-screen.json','exchange.png']}))
