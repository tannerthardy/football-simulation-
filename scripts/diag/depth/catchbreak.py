"""Broken contact after the catch, one operator for NFL tracking and sim common
plays. At the receiver's first contact after the catch (the metrics' first
tackler: nearest defender), split by approach angle and entry speed: the share
broken (metrics' proxy: >= 4 yd/s 0.5 s later and >= 5 more yards), the
tackler's closing speed along the line to the carrier, how many other
defenders are within 3 / 5 yd, and how soon a second defender gets within
1.5 yd. Broken vs held compared on the same quantities.
usage: catchbreak.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402

q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
mean = lambda v: round(sum(v) / len(v), 3) if v else None


def rows(path):
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass': continue
        ev = raw.get('events') or {}
        tc, t0 = ev.get('catch'), ev.get('first_contact')
        r = raw.get('receiver', raw.get('target'))
        if r is None or tc is None or t0 is None or t0 < tc: continue
        p = Play(raw)
        if not p.live(t0) or not p.live(t0 + .5): continue
        k = p.k(t0)
        cx, cy = p.pos(r, k)
        if cx is None: continue
        ds = [d for d in p.who('D') if p.pos(d, k)[0] is not None]
        tk = min(ds, key=lambda d: p.dist(d, r, k))
        cv, tv = p.velocity(r, k), p.velocity(tk, k)
        cs, ts = math.hypot(*cv), math.hypot(*tv)
        if cs <= 1 or ts <= 1: continue
        cos = (cv[0] * tv[0] + cv[1] * tv[1]) / (cs * ts)
        angle = 'headon' if cos < -.5 else 'behind' if cos > .5 else 'side'
        tx, ty = p.pos(tk, k); dx, dy = cx - tx, cy - ty; dd = math.hypot(dx, dy) or 1
        closing = ((tv[0] - cv[0]) * dx + (tv[1] - cv[1]) * dy) / dd
        others = [p.dist(d, r, k) for d in ds if d != tk]
        second = None
        for j in range(k, min(p.frames - 1, p.k(t0 + 2.0)) + 1):
            if any(p.pos(d, j)[0] is not None and p.dist(d, r, j) <= 1.5 for d in ds if d != tk):
                second = (j - k) * p.dt; break
        after = raw['yards'] - cx
        kept = p.speed(r, p.k(t0 + .5))
        yield dict(angle=angle, speed='slow' if cs < 3 else 'mid' if cs < 5.5 else 'fast', cs=cs, ts=ts,
                   closing=closing, gap=dd, n3=sum(o <= 3 for o in others), n5=sum(o <= 5 for o in others),
                   second=second, broke=kept >= 4 and after >= 5, after=after)


for path in sys.argv[1:]:
    R = list(rows(path))
    print(f'{path.split("/")[-1][:28]}  contacts {len(R)}  broke {100 * mean([r["broke"] for r in R]):.1f}%')
    for key, vals in (('angle', ('headon', 'side', 'behind')), ('speed', ('slow', 'mid', 'fast'))):
        print('  ' + ' | '.join(f'{v} {100 * sum(r[key] == v for r in R) / len(R):.0f}% broke '
                                f'{100 * (mean([r["broke"] for r in R if r[key] == v]) or 0):.0f}%' for v in vals))
    for lab, S in (('held ', [r for r in R if not r['broke']]), ('broke', [r for r in R if r['broke']])):
        sec = [r['second'] for r in S]
        print(f'  {lab} n {len(S):4d} carrier {q([r["cs"] for r in S])} tackler {q([r["ts"] for r in S])} '
              f'closing {q([r["closing"] for r in S])} gap {q([r["gap"] for r in S])} '
              f'others<=3 {mean([r["n3"] for r in S])} <=5 {mean([r["n5"] for r in S])} '
              f'second<=1.5yd within 1s {100 * mean([s is not None and s <= 1 for s in sec]):.0f}% p50 {q([s for s in sec if s is not None])}s')
    fast = [r for r in R if r['speed'] == 'fast']
    print('  fast by angle: ' + ' | '.join(
        f'{a} {sum(r["angle"] == a for r in fast)} broke {100 * (mean([r["broke"] for r in fast if r["angle"] == a]) or 0):.0f}%'
        for a in ('headon', 'side', 'behind')))
    bins = ((-99, 0), (0, 1), (1, 2), (2, 3), (3, 99))
    for lab, S in (('fast', fast), ('mid ', [r for r in R if r['speed'] == 'mid'])):
        print(f'  {lab} by closing yd/s: ' + ' | '.join(
            f'{lo if lo > -99 else "<"}..{hi if hi < 99 else ""} {100 * len(B) / max(1, len(S)):.0f}% broke {100 * (mean([r["broke"] for r in B]) or 0):.0f}%'
            for lo, hi in bins for B in [[r for r in S if lo <= r['closing'] < hi]]))
        print(f'  {lab} by gap yd: ' + ' | '.join(
            f'{lo}..{hi if hi < 99 else ""} {100 * len(B) / max(1, len(S)):.0f}% broke {100 * (mean([r["broke"] for r in B]) or 0):.0f}%'
            for lo, hi in ((0, .75), (.75, 1.0), (1.0, 1.25), (1.25, 1.5), (1.5, 99)) for B in [[r for r in S if lo <= r['gap'] < hi]]))
