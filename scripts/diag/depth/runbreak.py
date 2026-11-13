"""Broken run contacts, one operator for NFL tracking and sim common plays.
At the run's first contact (metrics' proxy for a break: >= 4 yd/s 0.5 s
later and >= 5 more yards; first tackler = nearest defender), the share
broken by the tackler's group, the box count, the deep shell (defenders 10+
yd off the ball at the snap), the carrier's entry speed, where the contact is
(yards past the line), and how many other defenders were within 3 yd.
usage: runbreak.py FILE [FILE...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
mean = lambda v: sum(v) / len(v) if v else 0


def rows(path):
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        t = (raw.get('events') or {}).get('first_contact')
        p = Play(raw); c = raw['carrier']
        if t is None or not p.live(t) or not p.live(t + .5): continue
        k = p.k(t)
        if p.pos(c, k)[0] is None: continue
        ds = [d for d in p.who('D') if p.pos(d, k)[0] is not None]
        d = min(ds, key=lambda d: p.dist(d, c, k))
        x = p.pos(c, k)[0]; after = raw['yards'] - x; kept = p.speed(c, p.k(t + .5)); cs = p.speed(c, k)
        deep = sum(1 for e in p.who('D') if p.pos(e, 0)[0] is not None and p.pos(e, 0)[0] >= 10)
        yield dict(grp=p.players[d]['group'], box=p.box_count(), deep=min(deep, 2), x=x, cs=cs,
                   speed='slow' if cs < 3 else 'mid' if cs < 5.5 else 'fast',
                   near=sum(1 for e in ds if e != d and p.dist(e, c, k) <= 3), broke=kept >= 4 and after >= 5)


def split(R, key, vals):
    return ' | '.join(f'{v} {100 * len(B) / len(R):.0f}% broke {100 * mean([r["broke"] for r in B]):.0f}%'
                      for v in vals for B in [[r for r in R if r[key] == v]] if B)


for path in sys.argv[1:]:
    R = list(rows(path))
    print(f'{path.split("/")[-1][:26]}  contacts {len(R)}  broke {100 * mean([r["broke"] for r in R]):.1f}%')
    print('  tackler: ' + split(R, 'grp', ('DL', 'LB', 'DB')))
    print('  box: ' + split(R, 'box', sorted({r['box'] for r in R})))
    print('  deep at snap: ' + split(R, 'deep', (0, 1, 2)))
    print('  entry speed: ' + split(R, 'speed', ('slow', 'mid', 'fast')))
    for lab, S in (('held ', [r for r in R if not r['broke']]), ('broke', [r for r in R if r['broke']])):
        print(f'  {lab} n {len(S):4d} contact at +{q([r["x"] for r in S])} yd, entry {q([r["cs"] for r in S])} yd/s, others within 3 yd {mean([r["near"] for r in S]):.2f}')
