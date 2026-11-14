"""Where the outside defenders are on a wide catch (same code on NFL and sim common-format plays). Observation only.
Catches live at +1 s with the catcher within 10 yd of a sideline at the catch (in_front.py's wide), by target group
(RB / WR-TE) and coverage family. Outside defenders: on the catcher's side of the ball at the snap, the outermost and
next-outermost defenders by lateral distance from the ball (the corner and the apex/overhang/flat player). For each, at
the catch: depth over the catcher (+ = downfield of him) and lateral offset (+ = toward the sideline), distance, and where
he is: in front (downfield within 10 yd), deep past (downfield more than 10 yd away), inside (more than 5 yd inside him,
not downfield), under (behind him); his depth change from the snap to the catch (bail). Throw and catch times. Plus in_front.py's nobody-in-front
share for the same population.
usage: python3 -I scripts/diag/pass-operators/outside_wide.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa


def q(v):
    v = sorted(x for x in v if x is not None)
    return '-' if len(v) < 5 else '/'.join(f'{v[int(f * (len(v) - 1))]:.1f}' for f in (.25, .5, .75))


for arg in sys.argv[1:]:
    name, paths = arg.split('=')
    G = C.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
            if raw.get('kind') != 'pass' or 'catch' not in ev or raw.get('target') is None: continue
            p = Play(raw); c = raw['target']; k0 = p.k(ev['catch']); kl = p.k(p.end)
            if p.pos(c, k0)[0] is None or (kl - k0) * p.dt < 1.0: continue
            cx, cy = p.pos(c, k0)
            if min(cy, 53.33 - cy) >= 10: continue
            grp = 'RB' if p.players[c].get('group') == 'RB' else 'WR/TE'
            fam = coverage_family((raw.get('cell') or {}).get('coverage')) or 'other'
            by = raw.get('ball_y', 26.65); side = 1 if cy > by else -1
            D = [d for d in p.who('D') if p.pos(d, k0)[0] is not None and p.pos(d, 0)[0] is not None]
            front = any(p.pos(d, k0)[0] > cx and p.dist(d, c, k0) <= 10 for d in D)
            outs = sorted([d for d in D if (p.pos(d, 0)[1] - by) * side > 0], key=lambda d: -abs(p.pos(d, 0)[1] - by))[:2]
            row = dict(front=front, o=[], tt=ev.get('pass_forward'), tc=ev['catch'])
            for d in outs:
                x, y = p.pos(d, k0); dx = x - cx; dy = (y - cy) * side; dist = math.hypot(x - cx, y - cy)
                where = 'in front' if dx > 0 and dist <= 10 else 'deep past' if dx > 0 else 'inside' if dy < -5 else 'under'
                row['o'].append(dict(dx=dx, dy=dy, dist=dist, where=where, bail=x - p.pos(d, 0)[0], snapx=p.pos(d, 0)[0]))
            G[(grp, fam)].append(row)
    print(f'== {name}: wide catches live at +1 s; outside defenders on his side at the snap (1 = outermost, 2 = next)')
    for (grp, fam), V in sorted(G.items()):
        if len(V) < 10: continue
        nf0 = [r for r in V if not r['front']]
        print(f'   {grp:<5} {fam:<5} n {len(V):4d} | nobody in front {100 * len(nf0) / len(V):.0f}% | throw / catch time p25/p50/p75 all {q([r["tt"] for r in V])} / {q([r["tc"] for r in V])} s; nobody in front {q([r["tt"] for r in nf0])} / {q([r["tc"] for r in nf0])} s')
        for i in (0, 1):
            W = [r['o'][i] for r in V if len(r['o']) > i]
            cnt = C.Counter(o['where'] for o in W)
            print(f'      #{i + 1}: snap depth {q([o["snapx"] for o in W])} | at the catch over him {q([o["dx"] for o in W])}, toward the sideline {q([o["dy"] for o in W])}, distance {q([o["dist"] for o in W])} yd'
                  f' | ' + ', '.join(f'{k} {100 * cnt[k] / len(W):.0f}%' for k in ('in front', 'deep past', 'inside', 'under')) + f' | bail snap->catch {q([o["bail"] for o in W])}')
        nf = [r for r in V if not r['front']]
        if len(nf) >= 5:
            for i in (0, 1):
                W = [r['o'][i] for r in nf if len(r['o']) > i]; cnt = C.Counter(o['where'] for o in W)
                print(f'        nobody in front, #{i + 1}: ' + ', '.join(f'{k} {100 * cnt[k] / len(W):.0f}%' for k in ('in front', 'deep past', 'inside', 'under')) + f' | over him {q([o["dx"] for o in W])}, distance {q([o["dist"] for o in W])}')
