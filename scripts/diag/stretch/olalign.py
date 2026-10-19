"""Line alignment at the snap, one operator for NFL tracking and sim common
plays (first frame). The five OL ordered across the field; the center is the
middle one. Depth = yards behind the ball's line (body centre, +: deeper);
splits = lateral centre-to-centre gaps. Also inline TE depth/split and the
depth of DL within 3 yd of the ball laterally... over 8 yd. Medians [p25,p75].
usage: olalign.py FILE [--ytg60] [--runs]"""
import gzip, json, sys
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v: f"{sorted(v)[len(v)//2]:5.2f} [{sorted(v)[len(v)//4]:5.2f},{sorted(v)[3*len(v)//4]:5.2f}]" if v else '-'
rows = {k: [] for k in ('C', 'G', 'T', 'split C-G', 'split G-T', 'TE depth', 'split T-TE', 'DL depth', 'width tackle-to-tackle')}
n = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or ('--runs' not in sys.argv and False): continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    xy = raw['xy'][0]; P = raw['players']
    ol = sorted([i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and xy[2 * i] is not None], key=lambda i: xy[2 * i + 1])
    if len(ol) != 5: continue
    n += 1
    x = lambda i: -xy[2 * i]; y = lambda i: xy[2 * i + 1]
    c = ol[2]; rows['C'].append(x(c))
    for g in (ol[1], ol[3]): rows['G'].append(x(g)); rows['split C-G'].append(abs(y(g) - y(c)))
    for t, g in ((ol[0], ol[1]), (ol[4], ol[3])): rows['T'].append(x(t)); rows['split G-T'].append(abs(y(t) - y(g)))
    rows['width tackle-to-tackle'].append(abs(y(ol[4]) - y(ol[0])))
    for i, p in enumerate(P):
        if p['side'] == 'O' and p['group'] == 'TE' and xy[2 * i] is not None:
            near = min((ol[0], ol[4]), key=lambda t: abs(y(t) - y(i)))
            if abs(y(i) - y(near)) < 2.5: rows['TE depth'].append(x(i)); rows['split T-TE'].append(abs(y(i) - y(near)))
        if p['side'] == 'D' and p['group'] == 'DL' and xy[2 * i] is not None and abs(y(i) - y(c)) < 8: rows['DL depth'].append(xy[2 * i])
print(f"{path.split('/')[-1][:24]:24s} runs {n}")
for k, v in rows.items(): print(f"  {k:24s} {q(v)}  (n {len(v)})")
