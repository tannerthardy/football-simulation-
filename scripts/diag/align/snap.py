"""Alignment at the snap, one operator for NFL tracking and sim common plays
(frame 0 = the snap; x = yards past the line toward the defense, y across the
field). Offense: the five linemen sorted across the field (center = middle):
splits between neighbours (center to center of bodies, yd), depth of center,
guards and tackles and the tackle-minus-center stagger; attached tight end
(within 3 yd of a tackle) split from the tackle and depth; receivers' split
from the ball, room to the sideline and depth (on or off the ball); backs'
and the quarterback's depth. Defense: linemen's depth and shade (lateral
offset from the nearest offensive lineman or tight end, + outside); backers'
depth; the widest defensive backs' depth (cushion) and leverage on the
nearest receiver (+ outside); the deepest two backs' depth. p25 / p50 / p75.
usage: snap.py FILE [FILE ...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
W = 53.33
q = lambda v, f: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
fmt = lambda v: f"{q(v, .25)}/{q(v, .5)}/{q(v, .75)} (n {len(v)})" if v else '-'
for path in sys.argv[1:]:
    o = {}
    add = lambda k, v: o.setdefault(k, []).append(v)
    n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        p = Play(raw); by = raw['ball_y']
        pos = {i: p.pos(i, 0) for i in range(p.n)}
        if any(v[0] is None for v in pos.values()): continue
        g = lambda i: p.players[i]['group']
        ol = sorted(p.who('O', 'OL'), key=lambda i: pos[i][1])
        if len(ol) != 5: continue
        n += 1
        ys = [pos[i][1] for i in ol]; xs = [pos[i][0] for i in ol]
        add('OL split C-G', ys[3] - ys[2]); add('OL split C-G', ys[2] - ys[1])
        add('OL split G-T', ys[4] - ys[3]); add('OL split G-T', ys[1] - ys[0])
        add('OL width T-T', ys[4] - ys[0])
        add('C depth', xs[2]); add('G depth', xs[1]); add('G depth', xs[3]); add('T depth', xs[0]); add('T depth', xs[4])
        add('T minus C depth', xs[0] - xs[2]); add('T minus C depth', xs[4] - xs[2])
        add('C offset from ball', ys[2] - by)
        lo, hi = ys[0], ys[4]
        for i in p.who('O', 'TE'):
            x, y = pos[i]
            d = min(abs(y - lo), abs(y - hi))
            if d <= 3 and x > -2.5: add('TE attached split from T', d); add('TE attached depth', x)
            elif x > -2.5: add('TE detached split from ball', abs(y - by))
            else: add('TE in backfield depth', x)
        for i in p.who('O', 'WR'):
            x, y = pos[i]
            add('WR split from ball', abs(y - by)); add('WR room to sideline', min(y, W - y)); add('WR depth', x)
        for i in p.who('O', 'RB'):
            x, y = pos[i]; add('RB depth', x); add('RB offset from ball', abs(y - by))
        for i in p.who('O', 'QB'):
            add('QB depth', pos[i][0])
        blockers = ol + [i for i in p.who('O', 'TE') if min(abs(pos[i][1] - lo), abs(pos[i][1] - hi)) <= 3 and pos[i][0] > -2.5]
        for i in p.who('D', 'DL'):
            x, y = pos[i]; add('DL depth', x)
            b = min(blockers, key=lambda j: abs(pos[j][1] - y))
            add('DL shade from nearest blocker (+ outside)', (y - pos[b][1]) * (1 if pos[b][1] >= by else -1))
        for i in p.who('D', 'LB'):
            x, y = pos[i]; add('LB depth', x); add('LB offset from ball', abs(y - by))
        dbs = p.who('D', 'DB')
        wrs = p.who('O', 'WR') + [i for i in p.who('O', 'TE') if pos[i][0] > -2.5 and min(abs(pos[i][1] - lo), abs(pos[i][1] - hi)) > 3]
        for i in sorted(dbs, key=lambda i: -abs(pos[i][1] - by))[:2]:
            x, y = pos[i]; add('CB (widest DB) depth', x)
            if wrs:
                r = min(wrs, key=lambda j: abs(pos[j][1] - y))
                add('CB leverage on nearest WR (+ outside)', (y - pos[r][1]) * (1 if pos[r][1] >= by else -1))
                add('CB lateral gap to nearest WR', abs(y - pos[r][1]))
        for i in sorted(dbs, key=lambda i: -pos[i][0])[:2]:
            add('deep DB depth', pos[i][0])
    print(f"{path.split('/')[-1]}: {n} snaps (p25/p50/p75, yd)")
    for k, v in o.items(): print(f"  {k:42s} {fmt(v)}")
