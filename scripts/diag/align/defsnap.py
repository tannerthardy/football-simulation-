"""Defensive alignment at the snap by coverage shell, one operator for NFL
tracking and sim common plays (frame 0 = the snap). Shell from the coverage
label: single-high (Cover 1/3 and their variants), two-high (Cover 2/4/6,
Quarters, 2-Man, Tampa 2), zero (Cover 0). For the two widest defensive backs:
depth (cushion), leverage on the nearest receiver (+ outside) and the share
pressed (within 2 yd). For the two deepest backs: depth and lateral spread.
Off-ball backers (deeper than 2 yd): depth and offset from the ball.
Defensive linemen and backers on the line: depth.
usage: defsnap.py FILE [FILE ...]"""
import gzip, json, re, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
q = lambda v, f: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
fmt = lambda v: f"{q(v, .25)}/{q(v, .5)}/{q(v, .75)} (n {len(v)})" if v else '-'
def shell(label):
    s = (label or '').lower().replace('-', '').replace(' ', '')
    if re.search(r'cover0|zero', s): return 'zero'
    if re.search(r'cover2|2man|cover4|quarter|cover6|tampa|cover9|twoman', s): return 'two-high'
    if re.search(r'cover1|cover3|mable|buzz|seam', s): return 'single-high'
    return None
for path in sys.argv[1:]:
    o = {}
    add = lambda k, v: o.setdefault(k, []).append(v)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass': continue
        sh = shell((raw.get('cell') or {}).get('coverage'))
        if not sh: continue
        p = Play(raw); by = raw['ball_y']
        pos = {i: p.pos(i, 0) for i in range(p.n)}
        if any(v[0] is None for v in pos.values()): continue
        ol = sorted(p.who('O', 'OL'), key=lambda i: pos[i][1])
        if len(ol) != 5: continue
        lo, hi = pos[ol[0]][1], pos[ol[4]][1]
        recv = [i for i in p.who('O', 'WR') + p.who('O', 'TE') if pos[i][0] > -2.5 and min(abs(pos[i][1] - lo), abs(pos[i][1] - hi)) > 3]
        dbs = p.who('D', 'DB')
        for i in sorted(dbs, key=lambda i: -abs(pos[i][1] - by))[:2]:
            x, y = pos[i]; add(f'{sh}: CB depth', x); add(f'{sh}: CB pressed (<=2 yd)', 1.0 if x <= 2 else 0.0)
            if recv:
                r = min(recv, key=lambda j: abs(pos[j][1] - y))
                add(f'{sh}: CB leverage (+ outside)', (y - pos[r][1]) * (1 if pos[r][1] >= by else -1))
        deep = sorted(dbs, key=lambda i: -pos[i][0])[:2]
        for i in deep: add(f'{sh}: deep DB depth', pos[i][0])
        if len(deep) == 2: add(f'{sh}: two deepest lateral spread', abs(pos[deep[0]][1] - pos[deep[1]][1]))
        for i in p.who('D', 'LB'):
            x, y = pos[i]
            if x > 2: add(f'{sh}: off-ball LB depth', x); add(f'{sh}: off-ball LB offset', abs(y - by))
            else: add(f'{sh}: LB on the line depth', x)
        for i in p.who('D', 'DL'): add(f'{sh}: DL depth', pos[i][0])
    print(path.split('/')[-1], '(dropbacks; p25/p50/p75 yd; pressed = share)')
    for k in sorted(o):
        v = o[k]
        print(f"  {k:36s} {(f'{100*sum(v)/len(v):.0f}% (n {len(v)})') if 'pressed' in k else fmt(v)}")
