"""The shape of a stretch run, same operator for NFL and sim: play-side lateral
displacement of the OL (mean), box defenders (mean) and the ball carrier at
0.5/1.0/1.5/2.0 s, handoff time, and where the carrier crosses the line
relative to the ball. Play side = the side the OL moved by 1.5 s.
python3 -I scripts/diag/zone/stretch-shape.py LABEL=plays.jsonl.gz [...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
FAM = sys.argv[1] if sys.argv[1] in ('outside_zone', 'inside_zone', 'gap_pull') else 'outside_zone'
for arg in sys.argv[1:]:
    if '=' not in arg: continue
    label, path = arg.split('=', 1)
    rows = {k: [] for k in ('ol5', 'ol10', 'ol15', 'ol20', 'bx10', 'bx15', 'bx20', 'rb5', 'rb10', 'rb15', 'rb20', 'rx10', 'rx15', 'rx20', 'rx25', 'ry25', 'hand', 'cross', 'crossT', 'yds')}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw['kind'] != 'run' or raw.get('carrier') is None: continue
        if CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != FAM: continue
        p = Play(raw)
        if p.frames < 21: continue
        ol = [i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None and p.pos(i, 20)[0] is not None]
        c = raw['carrier']
        if len(ol) < 5 or p.pos(c, 20)[0] is None or p.players[c]['group'] != 'RB': continue
        dy = lambda i, k: p.pos(i, k)[1] - p.pos(i, 0)[1]
        sgn = 1 if sum(dy(i, 15) for i in ol) >= 0 else -1
        box = [i for i in p.box_defenders() if p.pos(i, 20)[0] is not None]
        for k in (5, 10, 15, 20):
            rows[f'ol{k}'].append(sgn * sum(dy(i, k) for i in ol) / len(ol))
            rows[f'rb{k}'].append(sgn * dy(c, k))
            if k >= 10 and box: rows[f'bx{k}'].append(sgn * sum(dy(i, k) for i in box) / len(box))
        for k in (10, 15, 20, 25):
            if k < p.frames and p.pos(c, k)[0] is not None: rows[f'rx{k}'].append(p.pos(c, k)[0])
        if 25 < p.frames and p.pos(c, 25)[0] is not None: rows['ry25'].append(sgn * dy(c, 25))
        if 'handoff' in p.events: rows['hand'].append(p.events['handoff'])
        cross = next((k for k in range(p.frames) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] > 0), None)
        if cross is not None: rows['cross'].append(sgn * (p.pos(c, cross)[1] - raw['ball_y'])); rows['crossT'].append(cross * p.dt)
        rows['yds'].append(raw['yards'])
    n = len(rows['yds'])
    md = lambda k: f"{q(rows[k], .5):5.2f}"
    print(f"{label:10} {FAM} n={n:5} | OL 0.5/1/1.5/2 s {md('ol5')} {md('ol10')} {md('ol15')} {md('ol20')} | box 1/1.5/2 {md('bx10')} {md('bx15')} {md('bx20')} | RB {md('rb5')} {md('rb10')} {md('rb15')} {md('rb20')} | RB depth 1/1.5/2/2.5 s {md('rx10')} {md('rx15')} {md('rx20')} {md('rx25')} (lateral at 2.5 {md('ry25')}) | handoff {md('hand')} s | crosses at {md('crossT')} s, crosses LOS at {md('cross')} yd (p25 {q(rows['cross'], .25):.2f} p75 {q(rows['cross'], .75):.2f}) | yds med {md('yds')}")
