"""Gap soundness by numbers at the snap: one position-only operator for NFL
tracking and sim snaps. Per snap: gaps the offense presents (per side: the
OL on that side plus one, plus one per attached TE/wing/WR chained within
2.6 yd of the last surface and no more than 2.6 yd behind the line), box
defenders (-0.5..7.5 yd deep, laterally inside the last surface + W yd;
W = --width, default 3: a wide 9 or overhang is in), and
the margin box - gaps. A margin of -1 can be squared by one fitter outside
the box (a down safety 7.5-12 yd deep inside the last surface + 2 yd: 'plus').
usage: python3 -I scripts/mechanics/gap_soundness_reference.py FILE.jsonl.gz [--label X] [--width W]
NFL: out/mechanics/nfl-plays.jsonl.gz; sim: scripts/diag/align/snap-positions.mts."""
import collections, gzip, json, sys

WIDTH = float(sys.argv[sys.argv.index('--width') + 1]) if '--width' in sys.argv else 3.0

def snap(r):
    f0 = r['xy'][0]; P = r['players']
    pts = [(p, f0[2*i], f0[2*i+1]) for i, p in enumerate(P) if f0[2*i] is not None]
    ol = [y for p, x, y in pts if p['side'] == 'O' and p['group'] == 'OL']
    if len(ol) < 5: return None
    c = sorted(ol)[len(ol)//2]  # centre's lateral spot
    gaps = 0; outer = {}
    for side in (1, -1):
        lat = sorted((y - c) * side for y in ol if (y - c) * side > .3)
        surf = lat[-1] if lat else 0.0
        g = len(lat) + 1
        others = sorted((y - c) * side for p, x, y in pts if p['side'] == 'O' and p['group'] in ('TE', 'WR', 'RB')
                        and x >= -2.6 and (y - c) * side > surf)
        for l in others:
            if l - surf < 2.6: surf = l; g += 1
        gaps += g; outer[side] = surf
    box = plus = 0
    for p, x, y in pts:
        if p['side'] != 'D': continue
        side = 1 if y >= c else -1; l = (y - c) * side
        if l > outer[side] + WIDTH: continue
        if -0.5 <= x <= 7.5: box += 1
        elif 7.5 < x <= 12: plus += 1
    return gaps, box, plus

def main(path, label):
    rows = []
    with gzip.open(path, 'rt') as f:
        for line in f:
            r = json.loads(line); s = snap(r)
            if s: rows.append((r.get('kind'), s, r.get('pers')))
    for kind in ('run', 'pass', None):
        R = [s for k, s, _ in rows if kind is None or k == kind]
        if not R: continue
        m = collections.Counter(max(-3, min(2, b - g)) for g, b, p in R)
        squared = sum(1 for g, b, p in R if b - g >= 0 or (b - g == -1 and p >= 1))
        n = len(R)
        print(f"{label} {kind or 'all'} n={n}  margin box-gaps: " + '  '.join(f"{k:+d}:{100*m[k]/n:.0f}%" for k in sorted(m))
              + f"  | sound by box {100*sum(1 for g,b,p in R if b>=g)/n:.0f}%, with one plus-fitter {100*squared/n:.0f}%"
              + f"  | gaps mean {sum(g for g,b,p in R)/n:.2f} box mean {sum(b for g,b,p in R)/n:.2f}")

if __name__ == '__main__':
    main(sys.argv[1], (sys.argv[sys.argv.index('--label') + 1] if '--label' in sys.argv else 'x') + f'(+{WIDTH:g})')
