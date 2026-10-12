"""Runner speed and forward progress after first contact, NFL vs sim, same
operator: speed at contact + 0.0..1.2 s, forward yards gained since contact,
share of plays already whistled. Designed runs only.
python3 -I scripts/diag/physics/after-contact.py NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...]"""
import gzip, json, sys
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
            row = []
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
print(f'runs with a moving carrier at first contact: NFL {len(nfl)}, sim {len(sim)}')
print('  +s   live share NFL / sim   speed median NFL / sim   yards since contact NFL / sim')
for j, dt in enumerate(OFFS):
    la = [r[j] for r in nfl if r[j]]; lb = [r[j] for r in sim if r[j]]
    print(f'  {dt:.1f}    {len(la)/len(nfl):.2f} / {len(lb)/len(sim):.2f}            {med([s for s, _ in la]):.2f} / {med([s for s, _ in lb]):.2f}               '
          f'{med([x for _, x in la if x is not None]):+.2f} / {med([x for _, x in lb if x is not None]):+.2f}')
