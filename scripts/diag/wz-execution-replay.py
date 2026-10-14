"""Plot actual short all-22 captures; no simulation or controller information writes.

python3 scripts/diag/wz-execution-replay.py --before /absolute/before.json.gz \
  --candidate out/wz-execution/third.json.gz --out out/wz-execution
"""
import argparse
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import time

os.environ.setdefault('MPLCONFIGDIR', '/tmp/wz-execution-replay-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Circle, Rectangle
import numpy as np
from PIL import Image

CASES = ('uc12-wz-s3', 'uc12-wz-s3-mirror', 'uc12-wz-weak-s3')
TITLES = ('Strong · Y playside', 'Strong · H playside', 'Weak')
OL_COLORS = {'LT': '#3269bc', 'LG': '#b76523', 'C': '#8b60ad', 'RG': '#398b52', 'RT': '#9a861d'}
LOADED = '#d29d00'
IMPACT = '#e22731'


def read(path):
    return json.loads(gzip.decompress(Path(path).read_bytes()))


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def frame_at(case, boundary):
    if boundary == 0:
        return [a['initialBody'] for a in case['actors']], [], []
    frame = next(f for f in case['frames'] if abs(f['after'] - boundary) < 1e-9)
    return frame['afterBodies'], frame['jointOutputs'], frame['report']['contacts']


def color(actor):
    if actor['slot'] in OL_COLORS:
        return OL_COLORS[actor['slot']]
    if actor['team'] == 'O' and actor['slot'] in ('Y', 'H'):
        return '#009b9d'
    return '#b2b9be' if actor['team'] == 'O' else '#596269'


def main():
    started = time.perf_counter()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--before', type=Path, required=True)
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--out', type=Path, default=Path('out/wz-execution'))
    parser.add_argument('--delay-ms', type=int, default=100)
    args = parser.parse_args()
    captures = [('Before', args.before, read(args.before)), ('Candidate', args.candidate, read(args.candidate))]
    for _, _, cap in captures:
        assert cap['from'] == 0 and cap['stop'] == 2 and not cap['diagnosticBypass']
        for ident in CASES:
            case = next(c for c in cap['panel'] if c['input']['id'] == ident)
            assert len(case['actors']) == 22 and case['restoredFromSnap'] and not case['actions']
    args.out.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 8})
    fig, axes = plt.subplots(2, 3, figsize=(14.4, 9), dpi=100)
    fig.subplots_adjust(left=.045, right=.99, top=.87, bottom=.115, wspace=.17, hspace=.24)
    title = fig.suptitle('Wide zone · achieved movement and physical load · 0.00 s', fontsize=17, y=.985)
    fig.text(.5, .946, 'Strong runs toward lower field y (left); weak runs right. 0–2 s opening only · playback at half speed.',
             ha='center', fontsize=10)
    fig.text(.5, .920, 'Exact native all-22 reactions from snap. Main view shows the box; each inset retains all 22 players.',
             ha='center', fontsize=9)
    legends = [Line2D([], [], marker='o', ls='', color=c, label=s) for s, c in OL_COLORS.items()]
    legends += [Line2D([], [], marker='o', ls='', color='#009b9d', label='TE'),
                Line2D([], [], color=LOADED, lw=3, label='Actual loaded hands'),
                Line2D([], [], color=IMPACT, marker='o', markerfacecolor='none', lw=1.5, label='Torso impact this interval')]
    fig.legend(handles=legends, loc='lower center', bbox_to_anchor=(.5, .048), ncol=8, fontsize=8, frameon=False)
    fig.text(.5, .026, 'Hand links/halos require nonzero achieved normal or tangent force. Engagement labels alone draw no load.',
             ha='center', fontsize=8)
    fig.text(.5, .009, 'Actual positions, facing, load and impacts are analysis measurements; none supplies information to a player.',
             ha='center', fontsize=8, color='#444444')
    panes = []
    for row, (label, _, cap) in enumerate(captures):
        for col, ident in enumerate(CASES):
            case = next(c for c in cap['panel'] if c['input']['id'] == ident)
            ax = axes[row, col]
            ax.set(xlim=(19, 34), ylim=(33, 45), facecolor='#f0f5ed', xlabel='Field y · lateral (yd)')
            if col == 0:
                ax.set_ylabel('Field x · upfield (yd)')
            ax.set_xticks(range(20, 35, 2)); ax.set_yticks(range(34, 46, 2))
            ax.grid(color='#d8e2d4', lw=.6)
            ax.axhline(40, color='#809478', lw=.9, ls='--', zorder=0)
            ax.set_title(f'{label} · {TITLES[col]}\n{cap["revision"][:7]} · source {cap["sourceSha256"][:12]}', fontsize=10)
            inset = ax.inset_axes([.69, .66, .29, .31])
            inset.set(xlim=(0, 53.333333), ylim=(30, 55), facecolor='#f9fbf7')
            inset.set_xticks([]); inset.set_yticks([])
            inset.add_patch(Rectangle((19, 33), 15, 12, fill=False, ec='#879881', lw=.6))
            inset.set_title('all 22', fontsize=6, pad=1)
            dots = inset.scatter([], [], s=4, zorder=2)
            bodies, faces, labels, halos = [], [], [], []
            for actor in case['actors']:
                highlighted = actor['slot'] in OL_COLORS or actor['slot'] in ('Y', 'H', 'RB', 'QB')
                radius = actor['profile']['radius']
                circle = Circle((0, 0), radius, fc=color(actor), ec='white', lw=.7,
                                alpha=1 if highlighted else .65, zorder=4 if highlighted else 3)
                ax.add_patch(circle); bodies.append(circle)
                face, = ax.plot([], [], color='#1e2930', lw=.9, alpha=.8, zorder=5)
                faces.append(face)
                text = ax.text(0, 0, actor['slot'], ha='center', va='bottom',
                               fontsize=7 if highlighted else 5.8, color='#24323a',
                               weight='bold' if actor['slot'] in OL_COLORS else 'normal', clip_on=True, zorder=8)
                labels.append(text)
                halo = Circle((0, 0), radius + .07, fill=False, ec=LOADED, lw=2, visible=False, zorder=6)
                ax.add_patch(halo); halos.append(halo)
            panes.append({'case': case, 'ax': ax, 'bodies': bodies, 'faces': faces, 'labels': labels,
                          'halos': halos, 'dots': dots, 'links': []})
    frames = []
    palette = None
    snapshots = []
    for tick in range(41):
        boundary = tick / 20
        title.set_text(f'Wide zone · achieved movement and physical load · {boundary:.2f} s')
        for pane in panes:
            actors = pane['case']['actors']
            bodies, joints, contacts = frame_at(pane['case'], boundary)
            assert len(bodies) == 22
            loaded = [j for j in joints if j['kind'] == 'hands' and
                      (abs(j.get('normalForce') or 0) > 1e-8 or abs(j.get('tangentForce') or 0) > 1e-8)]
            hit = [c for c in contacts if c['impulse'] > 1e-8]
            loaded_players = {i for j in loaded for i in (j['a'], j['b'])}
            hit_players = {i for c in hit for i in (c['i'], c['j'])}
            for link in pane['links']:
                link.remove()
            pane['links'] = []
            for j in loaded:
                a, b = bodies[j['a']]['pos'], bodies[j['b']]['pos']
                force = math.hypot(j.get('normalForce') or 0, j.get('tangentForce') or 0)
                link, = pane['ax'].plot([a['y'], b['y']], [a['x'], b['x']], color=LOADED,
                                        lw=min(3.2, 1 + force / 700), alpha=.85, zorder=2)
                pane['links'].append(link)
            for c in hit:
                a, b = bodies[c['i']]['pos'], bodies[c['j']]['pos']
                link, = pane['ax'].plot([a['y'], b['y']], [a['x'], b['x']], color=IMPACT,
                                        lw=2, alpha=.85, zorder=7)
                pane['links'].append(link)
            for i, (actor, body) in enumerate(zip(actors, bodies)):
                x, y, facing = body['pos']['x'], body['pos']['y'], body['facing']
                radius = actor['profile']['radius']
                pane['bodies'][i].center = (y, x)
                pane['bodies'][i].set_edgecolor(IMPACT if i in hit_players else 'white')
                pane['bodies'][i].set_linewidth(2.5 if i in hit_players else .7)
                pane['faces'][i].set_data([y, y + math.sin(facing) * radius * 1.4],
                                          [x, x + math.cos(facing) * radius * 1.4])
                pane['labels'][i].set_position((y, x + radius + .06))
                pane['halos'][i].center = (y, x)
                pane['halos'][i].set_visible(i in loaded_players or i in hit_players)
                pane['halos'][i].set_edgecolor(IMPACT if i in hit_players else LOADED)
            pane['dots'].set_offsets(np.array([[b['pos']['y'], b['pos']['x']] for b in bodies]))
            pane['dots'].set_color([IMPACT if i in hit_players else color(a) for i, a in enumerate(actors)])
        fig.canvas.draw()
        rgba = np.asarray(fig.canvas.buffer_rgba())
        rgb = Image.fromarray(rgba[:, :, :3].copy())
        if palette is None:
            palette = rgb.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
            # The first frame has no contact. Reserve the diagnostic colors
            # so its adaptive palette cannot turn later red impacts orange.
            reserved = [*OL_COLORS.values(), '#009b9d', LOADED, IMPACT]
            colors = palette.getpalette()
            for i, hex_color in enumerate(reserved, start=256 - len(reserved)):
                colors[3 * i:3 * i + 3] = [int(hex_color[k:k + 2], 16) for k in (1, 3, 5)]
            palette.putpalette(colors)
        frames.append(rgb.quantize(palette=palette, dither=Image.Dither.NONE))
        if tick in (10, 20, 40):
            path = args.out / f'replay-{boundary:.2f}s.png'
            rgb.save(path, optimize=True)
            snapshots.append(str(path))
    gif = args.out / 'replay.gif'
    frames[0].save(gif, save_all=True, append_images=frames[1:], duration=args.delay_ms,
                   loop=0, optimize=True, disposal=1)
    plt.close(fig)
    receipt = {'protocol': 'wz-execution-replay-v1', 'inputs': [
        {'label': label, 'path': str(path.resolve()), 'sha256': sha(path),
         'revision': cap['revision'], 'runtime': cap['sourceSha256']} for label, path, cap in captures],
        'output': str(gif.resolve()), 'bytes': gif.stat().st_size, 'sha256': sha(gif),
        'frames': len(frames), 'simulatedSeconds': 2, 'frameDurationMs': args.delay_ms,
        'mainView': {'fieldY': [19, 34], 'fieldX': [33, 45]}, 'all22Inset': True,
        'snapshots': snapshots, 'scriptSha256': sha(__file__),
        'newWorldSteps': 0, 'seconds': time.perf_counter() - started}
    (args.out / 'replay-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt))


if __name__ == '__main__':
    main()
