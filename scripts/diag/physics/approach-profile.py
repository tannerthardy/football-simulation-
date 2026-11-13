"""How the first-contact defender arrives, NFL vs sim, same operator.
For runs whose carrier moves >= 2 yd/s at first contact, the nearest
defender (within 1.5 yd) from 0.6 s before contact to contact: his speed,
his velocity along the carrier's travel, the closing speed along the line
of centers, and the depth of the contact past the line, by approach angle.
python3 -I scripts/diag/physics/approach-profile.py NFL.jsonl.gz SIM.jsonl.gz [...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play

OFFS = (-.6, -.4, -.2, 0.0)


def measure(paths):
    rows = []
    for path in paths:
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line)
            if raw['kind'] != 'run' or raw.get('carrier') is None:
                continue
            p = Play(raw)
            t0 = p.events.get('first_contact')
            if t0 is None or t0 < .7:
                continue
            c, k0 = raw['carrier'], p.k(t0)
            vx, vy = p.velocity(c, k0)
            sp = math.hypot(vx, vy)
            if sp < 2 or p.pos(c, k0)[0] is None:
                continue
            ux, uy = vx / sp, vy / sp
            d = min((d for d in p.who('D') if p.pos(d, k0)[0] is not None), key=lambda d: p.dist(c, d, k0), default=None)
            if d is None or p.dist(c, d, k0) > 1.5:
                continue
            dx, dy = p.pos(d, k0)[0] - p.pos(c, k0)[0], p.pos(d, k0)[1] - p.pos(c, k0)[1]
            L = math.hypot(dx, dy) or 1
            row = {'group': p.players[d]['group'], 'ang': math.degrees(math.acos(max(-1, min(1, (ux * dx + uy * dy) / L)))), 'depth': p.pos(c, k0)[0]}
            for o in OFFS:
                k = p.k(t0 + o)
                if p.pos(d, k)[0] is None or p.pos(c, k)[0] is None:
                    break
                dv, cv = p.velocity(d, k), p.velocity(c, k)
                ex, ey = p.pos(c, k)[0] - p.pos(d, k)[0], p.pos(c, k)[1] - p.pos(d, k)[1]
                E = math.hypot(ex, ey) or 1
                row[f'sp{o}'] = math.hypot(*dv)
                row[f'with{o}'] = dv[0] * ux + dv[1] * uy
                row[f'close{o}'] = ((dv[0] - cv[0]) * ex + (dv[1] - cv[1]) * ey) / E
                row[f'dist{o}'] = E
                row[f'csp{o}'] = math.hypot(*cv)
                # Closest approach of the two current straight paths: how far off
                # center he is aiming (0 = dead center on the runner).
                wx, wy = dv[0] - cv[0], dv[1] - cv[1]
                W = math.hypot(wx, wy) or 1
                row[f'miss{o}'] = abs(-ex * wy + ey * wx) / W
            else:
                rows.append(row)
    return rows


def med(v):
    v = sorted(v)
    return v[len(v) // 2] if v else float('nan')


nfl, sim = measure([sys.argv[1]]), measure(sys.argv[2:])
print('nearest defender before first contact; times are seconds before contact')
groups = sorted({r['group'] for r in nfl + sim})
cuts = [('all', 0, 181, None), ('head-on (<45)', 0, 45, None), ('side (45-135)', 45, 135, None), ('behind (>135)', 135, 181, None)] + [(f'group {g}', 0, 181, g) for g in groups]
for label, lo, hi, grp in cuts:
    a = [r for r in nfl if lo <= r['ang'] < hi and grp in (None, r['group'])]; b = [r for r in sim if lo <= r['ang'] < hi and grp in (None, r['group'])]
    if not a or not b:
        continue
    print(f'\n{label}: n NFL {len(a)} sim {len(b)}; contact depth NFL {med([r["depth"] for r in a]):+.1f} sim {med([r["depth"] for r in b]):+.1f} yd')
    for key, name in (('sp', 'defender speed'), ('with', 'defender v along carrier travel'), ('close', 'closing speed on line of centers'), ('dist', 'center distance'), ('csp', 'carrier speed'), ('miss', 'path miss distance')):
        cells = '  '.join(f'{-o:.1f}s {med([r[f"{key}{o}"] for r in a]):+5.2f}/{med([r[f"{key}{o}"] for r in b]):+5.2f}' for o in OFFS)
        print(f'  {name:34s} NFL/sim  {cells}')
