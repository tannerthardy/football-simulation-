"""Outside zone, NFL vs sim, same operator: where the play differs. Play side
= the side the OL moved by 1.5 s. Lateral values are play-side signed, depth
is x relative to the line (negative = backfield). Medians.
python3 -I scripts/diag/zone/stretch-gaps.py LABEL=plays.jsonl.gz[,more.jsonl.gz] ..."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
FAM = 'outside_zone'
def plays(paths):
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line)
            if raw['kind'] == 'run' and raw.get('carrier') is not None and CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) == FAM:
                yield raw
res = {}
for arg in sys.argv[1:]:
    label, paths = arg.split('=', 1)
    R = {}
    add = lambda k, v: R.setdefault(k, []).append(v) if v is not None and not (isinstance(v, float) and math.isnan(v)) else None
    for raw in plays(paths):
        p = Play(raw)
        if p.frames < 21: continue
        c = raw['carrier']
        if p.players[c]['group'] != 'RB': continue
        ol = [i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None and p.pos(i, 20)[0] is not None]
        if len(ol) < 5 or p.pos(c, 0)[0] is None: continue
        by = raw['ball_y']
        dy = lambda i, k: p.pos(i, k)[1] - p.pos(i, 0)[1]
        s = 1 if sum(dy(i, 15) for i in ol) >= 0 else -1
        lat = lambda i, k: s * (p.pos(i, k)[1] - by)
        x = lambda i, k: p.pos(i, k)[0]
        # Alignment.
        add('rb_depth_snap', x(c, 0)); add('rb_lat_snap', lat(c, 0))
        qb = p.who('O', 'QB')
        if qb and p.pos(qb[0], 0)[0] is not None: add('qb_depth_snap', x(qb[0], 0))
        # Back's speed and path.
        for t in (0.5, 1.0, 1.5, 2.0):
            k = p.k(t)
            if k < p.frames and p.pos(c, k)[0] is not None:
                add(f'rb_speed_{t}', p.speed(c, k)); add(f'rb_lat_{t}', s * dy(c, k)); add(f'rb_x_{t}', x(c, k))
        h = p.events.get('handoff')
        if h is not None and p.pos(c, p.k(h))[0] is not None:
            k = p.k(h); add('handoff_t', h); add('handoff_x', x(c, k)); add('handoff_lat', lat(c, k))
            # Cut: first frame after the handoff heading more upfield than lateral.
            for kk in range(k + 1, p.frames - 1):
                (x0, y0), (x1, y1) = p.pos(c, kk - 1), p.pos(c, kk + 1)
                if None in (x0, x1): continue
                vx, vy = (x1 - x0) / (2 * p.dt), (y1 - y0) / (2 * p.dt)
                if vx > abs(vy) and vx > 1:
                    add('cut_t', kk * p.dt); add('cut_lat', lat(c, kk)); add('cut_x', x(c, kk)); break
        # Line by position: outermost play-side OL first.
        order = sorted(ol, key=lambda i: -s * (p.pos(i, 0)[1] - by))
        for name, i in zip(('ps_T', 'ps_G', 'C', 'bs_G', 'bs_T'), order):
            for t in (1.0, 2.0):
                k = p.k(t); add(f'{name}_lat_{t}', s * dy(i, k)); add(f'{name}_x_{t}', x(i, k) - x(i, 0))
        # Defense: line (aligned on the ball inside the box) and backers.
        dl = [i for i in p.box_defenders() if p.pos(i, 20)[0] is not None]
        lb = [i for i in p.who('D') if p.pos(i, 0)[0] is not None and 3 <= p.pos(i, 0)[0] <= 7 and abs(p.pos(i, 0)[1] - by) <= 6 and p.pos(i, 20)[0] is not None]
        for name, g in (('DL', dl), ('LB', lb)):
            if not g: continue
            for t in (1.0, 1.5, 2.0):
                k = p.k(t)
                add(f'{name}_lat_{t}', sum(s * dy(i, k) for i in g) / len(g)); add(f'{name}_x_{t}', sum(x(i, k) for i in g) / len(g))
            add(f'{name}_n', len(g))
        fc = p.events.get('first_contact')
        if fc is not None and p.pos(c, p.k(fc))[0] is not None:
            add('contact_t', fc); add('contact_x', x(c, p.k(fc))); add('contact_lat', lat(c, p.k(fc)))
            add('after_contact', raw['yards'] - x(c, p.k(fc)))
        add('yards', raw['yards'])
    res[label] = R
labels = list(res)
keys = []
for R in res.values():
    for k in R:
        if k not in keys: keys.append(k)
print(f"{'measure':18}" + ''.join(f"{l:>14}" for l in labels))
for k in keys:
    print(f"{k:18}" + ''.join(f"{q(res[l].get(k, [])):14.2f}" for l in labels))
print(f"{'n plays':18}" + ''.join(f"{len(res[l].get('yards', [])):14d}" for l in labels))
