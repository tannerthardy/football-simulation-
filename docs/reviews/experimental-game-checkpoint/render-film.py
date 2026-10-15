#!/usr/bin/env python3
"""Render actual saved all-22 trajectories. Never creates or reruns football."""
import argparse
import bisect
import gzip
import hashlib
import json
import math
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1280, 800, 20


def font(size, bold=False):
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans' + ('-Bold' if bold else '') + '.ttf', size)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('root', type=Path)
    ap.add_argument('--input', type=Path, required=True)
    args = ap.parse_args()
    root = args.root.resolve()
    manifest = json.loads(args.input.read_text())
    games = {}
    for arm in ['accepted', 'experimental']:
        for f in manifest['fixtures']:
            p = root / arm / f['id'] / 'game.json.gz'
            d = json.loads(gzip.decompress(p.read_bytes()))
            assert d['complete'] and d['provenance']['sourceSha256'] == manifest['sources'][arm]
            games[arm, f['id']] = d
    candidates = [(f['id'], p) for f in manifest['fixtures'] for p in games['experimental', f['id']]['log']
                  if p['kind'] in ['run', 'pass'] and p.get('replay', {}).get('frames') and not p.get('nullified')]
    picks, used = [], set()

    def add(arm, fixture, p, reason):
        key = (arm, fixture, p['index'])
        if key in used:
            return False
        used.add(key)
        picks.append({'arm': arm, 'fixture': fixture, 'play': p, 'reason': reason})
        return True

    # Deterministic selection recipe declared before game outcomes: opening
    # pair, first WZ, median run, worst run, first caught Stick, largest YAC, INT.
    first_id = manifest['fixtures'][0]['id']
    opening = {}
    for arm in ['accepted', 'experimental']:
        p = next(p for p in games[arm, first_id]['log'] if p['kind'] in ['run', 'pass'] and p.get('replay', {}).get('frames'))
        opening[arm] = p
        add(arm, first_id, p, 'First scrimmage snap in the declared reference matchup')
    opening_match = all(opening['accepted'].get(k) == opening['experimental'].get(k) for k in ['kind', 'call', 'defense', 'plan'])
    opening_match = opening_match and opening['accepted']['replay']['frames'][0] == opening['experimental']['replay']['frames'][0]
    runs = [(f, p) for f, p in candidates if p['kind'] == 'run']
    passes = [(f, p) for f, p in candidates if p['kind'] == 'pass']
    options = [
        ([(f, p) for f, p in runs if p.get('plan', {}).get('concept') in ['wideZone', 'outsideZone']], 'First experimental stretch run'),
        (sorted(runs, key=lambda x: x[1]['yards'])[len(runs)//2:] + sorted(runs, key=lambda x: x[1]['yards'])[:len(runs)//2], 'Median-ranked experimental designed run'),
        (sorted(runs, key=lambda x: x[1]['yards']), 'Lowest-gain experimental designed run'),
        ([(f, p) for f, p in passes if p.get('plan', {}).get('concept') == 'stick' and p.get('stats', {}).get('completed')]
         or [(f, p) for f, p in passes if p.get('plan', {}).get('concept') == 'stick']
         or [(f, p) for f, p in passes if p.get('stats', {}).get('completed')], 'First experimental completed Stick (otherwise first Stick/completion)'),
        (sorted([(f, p) for f, p in passes if p.get('stats', {}).get('completed')], key=lambda x: x[1].get('stats', {}).get('yac', -math.inf), reverse=True), 'Largest recorded experimental YAC'),
        ([(f, p) for f, p in passes if p.get('stats', {}).get('interceptedBy')]
         or [(f, p) for f, p in passes if p.get('stats', {}).get('sacked')], 'First experimental interception (otherwise first sack)'),
    ]
    for choices, reason in options:
        for fixture, p in choices:
            if add('experimental', fixture, p, reason):
                break
    metadata = {'schema': 'experimental-film-selection-v1', 'simulation': False,
                'openingPairSameCallsPlanInitialFrame': opening_match,
                'selection': 'Fixed deterministic selection recipe; includes routine, adverse, largest-YAC and turnover examples. All games remain available in complete film.',
                'fps': FPS, 'interpolation': 'Linear between saved native positional frames; no extrapolation beyond ending.',
                'sources': manifest['sources'], 'clips': []}
    mp4 = root / 'checkpoint-film.mp4'
    command = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(mp4)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    title, text, small = font(24, True), font(18), font(13)
    scale = (W - 90) / 120
    left, top = 45, 170
    xy = lambda x, y: (left + x * scale, top + y * scale)
    for number, pick in enumerate(picks, 1):
        p = pick['play']
        replay = p['replay']
        frames = [f for f in replay['frames'] if f['t'] >= 0]
        assert len(frames) > 1
        times = [f['t'] for f in frames]
        end = times[-1]
        seconds = end + 1.0
        label = f"{'ACCEPTED' if pick['arm']=='accepted' else 'EXPERIMENTAL'} | {pick['fixture']} | P{p['index']+1}"
        result = f"{p['outcome']} | {p['yards']:+.2f} yd"
        metadata['clips'].append({'number': number, 'arm': pick['arm'], 'fixture': pick['fixture'],
                                  'playIndex': p['index'], 'quarter': p['quarter'], 'clock': p['clock'],
                                  'call': p.get('call'), 'defense': p.get('defense'), 'outcome': p['outcome'], 'yards': p['yards'],
                                  'reason': pick['reason'], 'nativeLastFrame': end, 'videoSeconds': seconds})
        backdrop = Image.new('RGB', (W, H), '#101c28')
        d = ImageDraw.Draw(backdrop)
        d.text((45, 18), label, fill='#f0f4f7', font=title)
        d.text((45, 55), str(p.get('call', p['kind']))[:110], fill='#a9d7ff', font=text)
        d.text((45, 83), f"Q{p['quarter']} {int(p['clock']//60)}:{int(p['clock']%60):02d} | {p['down']} & {p['distance']:.1f} | {result}", fill='#f2dc9f', font=text)
        d.text((45, 112), pick['reason'][:125], fill='#b4c3d1', font=small)
        d.rectangle([*xy(0, 0), *xy(120, 53.333333333333336)], fill='#1e6047', outline='#d8e7da', width=2)
        for x in range(10, 111, 5):
            a, b = xy(x, 0), xy(x, 53.333333333333336)
            d.line([a, b], fill='#bed4c1' if x%10 == 0 else '#79a58a', width=1)
            if x%10 == 0 and 10 < x < 110:
                value = int(50 - abs(60-x))
                d.text(xy(x-.7, 4), str(value), fill='#cbded0', font=small)
                d.text(xy(x-.7, 48), str(value), fill='#cbded0', font=small)
        for y in [23.583333333333332, 29.75]:
            for x in range(11, 110):
                d.line([xy(x, y-.18), xy(x, y+.18)], fill='#b7d3bf')
        for x, color in [(replay['los'], '#51c9ff'), (replay['firstDownX'], '#ffd65b')]:
            d.line([xy(x, 0), xy(x, 53.333333333333336)], fill=color, width=2)
        d.text((45, H-57), 'All-22 native center positions | offense blue, defense red, carrier gold | offense advances right', fill='#c1ced9', font=small)
        d.text((45, H-33), f"Clip {number}/{len(picks)} | {manifest['sources'][pick['arm']][:16]} | Full games and player inspection in the linked film rooms", fill='#9aafc0', font=small)
        for n in range(math.ceil(seconds*FPS)):
            t = min(end, n/FPS)
            k = max(0, min(len(frames)-2, bisect.bisect_right(times, t)-1))
            a, b = frames[k], frames[k+1]
            u = min(1, max(0, (t-a['t'])/(b['t']-a['t']))) if b['t'] > a['t'] else 0
            im = backdrop.copy()
            d = ImageDraw.Draw(im)
            d.text((1050, 112), f'{t:05.2f}s', fill='#ffffff', font=text)
            for i, player in enumerate(replay['players']):
                x = a['agents'][i*3]*(1-u)+b['agents'][i*3]*u
                y = a['agents'][i*3+1]*(1-u)+b['agents'][i*3+1]*u
                facing = a['agents'][i*3+2]
                px, py = xy(x, y)
                carrier = a['carrier'] == i
                color = '#64b5ff' if player['team'] == 'O' else '#ff8a80'
                if carrier:
                    d.ellipse((px-9, py-9, px+9, py+9), outline='#ffe169', width=3)
                d.ellipse((px-5, py-5, px+5, py+5), fill=color, outline='#142d2a')
                d.line([(px, py), (px+9*math.cos(facing), py+9*math.sin(facing))], fill=color, width=2)
                if player['slot'] in ['QB', 'RB'] or (player['team']=='O' and t < 1):
                    d.text((px+6, py-15), player['slot'], fill='#ffffff', font=small)
            ball = [a['ball'][j]*(1-u)+b['ball'][j]*u for j in range(3)]
            bx, by = xy(ball[0], ball[1])
            d.ellipse((bx-3, by-3, bx+3, by+3), fill='#fff1c9', outline='#442a12')
            events = [e for e in replay['events'] if abs(e['t']-t) < .18 and e['type'] in ['handoff','throw','catch','interception','tackle','touchdown','carrier_contact','sack','broken_tackle']]
            if events:
                d.text((45, 141), ' · '.join(e['type'] for e in events), fill='#ffe095', font=small)
            process.stdin.write(im.tobytes())
        print(json.dumps({'clipRendered': number, 'label': label, 'seconds': seconds}), flush=True)
    process.stdin.close()
    assert process.wait() == 0
    metadata['video'] = {'path': mp4.name, 'bytes': mp4.stat().st_size, 'sha256': hashlib.sha256(mp4.read_bytes()).hexdigest()}
    (root / 'film-selection.json').write_text(json.dumps(metadata, indent=2)+'\n')
    # An inline preview is a short excerpt of the actual reel, not another play.
    preview_start = sum(c['videoSeconds'] for c in metadata['clips'][:2])
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(preview_start),'-i',str(mp4),'-t','12','-vf','fps=8,scale=900:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer','-loop','0',str(root/'film-preview.gif')], check=True)
    print(json.dumps(metadata['video']))


if __name__ == '__main__':
    main()
