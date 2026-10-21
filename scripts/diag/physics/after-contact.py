"""Runner speed and forward progress after first contact, NFL vs sim, same
operator: speed at contact + 0.0..1.2 s, forward yards gained since contact,
share of plays already whistled. Designed runs only.
python3 -I scripts/diag/physics/after-contact.py NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play

OFFS = (0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2)


def measure(paths):
    rows = []
    for path in paths:
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line)
            if raw['kind'] != 'run' or raw.get('carrier') is None:
                continue
            p = Play(raw)
            t0 = p.events.get('first_contact')
            if t0 is None or not p.live(t0):
                continue
            c = raw['carrier']
            k0 = p.k(t0)
            x0 = p.pos(c, k0)[0]
            if x0 is None or p.speed(c, k0) < 2.0:
                continue  # moving runners only
            # Approach angle of the nearest defender at contact, same rule on both:
            # 0 = straight ahead of the carrier's travel, 180 = from behind.
            vx, vy = p.velocity(c, k0)
            cx, cy = p.pos(c, k0)
            near = min((d for d in p.who('D') if p.pos(d, k0)[0] is not None), key=lambda d: p.dist(c, d, k0), default=None)
            ang = None
            if near is not None and math.hypot(vx, vy) > .5:
                dx, dy = p.pos(near, k0)[0] - cx, p.pos(near, k0)[1] - cy
                L = math.hypot(dx, dy) or 1
                ang = math.degrees(math.acos(max(-1, min(1, (vx * dx + vy * dy) / (math.hypot(vx, vy) * L)))))
            row = [ang]
            for dt in OFFS:
                t = t0 + dt
                if t > p.end:
                    row.append(None)
                    continue
                k = p.k(t)
                x = p.pos(c, k)[0]
                row.append((p.speed(c, k), None if x is None else x - x0))
            rows.append(row)
    return rows


def med(v):
    v = sorted(v)
    return v[len(v) // 2] if v else float('nan')


nfl, sim = measure([sys.argv[1]]), measure(sys.argv[2:])
for label, lo, hi in (('all', -1, 181), ('head-on (<45)', -1, 45), ('side (45-135)', 45, 135), ('from behind (>135)', 135, 181)):
    a = [r[1:] for r in nfl if r[0] is not None and lo <= r[0] < hi]
    b = [r[1:] for r in sim if r[0] is not None and lo <= r[0] < hi]
    if not a or not b:
        continue
    print(f'\n{label}: NFL {len(a)} runs, sim {len(b)}')
    print('  +s   live share NFL / sim   speed median NFL / sim   yards since contact NFL / sim')
    for j, dt in enumerate(OFFS):
        la = [r[j] for r in a if r[j]]; lb = [r[j] for r in b if r[j]]
        print(f'  {dt:.1f}    {len(la)/len(a):.2f} / {len(lb)/len(b):.2f}            {med([s for s, _ in la]):.2f} / {med([s for s, _ in lb]):.2f}               '
              f'{med([x for _, x in la if x is not None]):+.2f} / {med([x for _, x in lb if x is not None]):+.2f}')
