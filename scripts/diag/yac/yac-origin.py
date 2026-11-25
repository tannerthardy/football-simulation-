"""Where the yards after the catch come from: one operator on common-format plays (NFL tracking or sim), completions only.
usage: python3 -I scripts/diag/yac/yac-origin.py NFL.jsonl.gz SIM.jsonl.gz [--json OUT]

Per completion (a catch event, the target tracked at the throw and at the catch):
  separation  distance from the target to the nearest defender at the throw (pass_forward) and at the catch;
  near5       defenders within 5 yd of the carrier at the catch; first contact = first frame at or after the catch with a defender within
              1.0 yd of the carrier (a tracking proxy, same code for both), and the sources' own first_contact event beside it;
  first arriver  the carrier still moving > 2 yd/s 0.5 s after that frame, with the play still live (proxy, same code);
              sim only: the engine's own first call on the carrier (missed_tackle / broken_tackle / tackle ...) beside it;
  YAC         play yards - the carrier's x (yards past the line) at the catch; by separation band, coverage family and shell, catch depth;
  decomposition   NFL YAC per separation band x our band mix, and ours x the NFL's mix.
"""
import gzip, json, sys, math
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402

BANDS = [(0, 1, '0-1'), (1, 2, '1-2'), (2, 3, '2-3'), (3, 5, '3-5'), (5, 1e9, '5+')]
DEPTHS = [(-1e9, 0, 'behind line'), (0, 5, '0-5'), (5, 10, '5-10'), (10, 20, '10-20'), (20, 1e9, '20+')]
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
mean = lambda v: sum(v) / len(v) if v else float('nan')
band = lambda s: next(n for lo, hi, n in BANDS if lo <= s < hi)
depth = lambda x: next(n for lo, hi, n in DEPTHS if lo <= x < hi)


def shell(label):
    t = (label or '').lower().replace(' ', '').replace('-', '').replace('_', '')
    for key, name in (('cover0', 'C0'), ('cover1', 'C1'), ('cover2', 'C2'), ('2man', 'C2'), ('cover3', 'C3'), ('cover4', 'C4'), ('quarters', 'C4'),
                      ('cover6', 'C6'), ('cover9', 'C3')):
        if key in t:
            return name
    return None


def nearest_def(p, i, k, defs):
    best = math.inf
    for d in defs:
        best = min(best, p.dist(i, d, k))
    return best


def scan(path):
    rows = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass':
            continue
        ev = raw.get('events') or {}
        tc, tt = ev.get('catch'), ev.get('pass_forward')
        r = raw.get('receiver') if raw.get('source') == 'sim' and raw.get('receiver') is not None else raw.get('target')
        if tc is None or tt is None or r is None or raw.get('yards') is None:
            continue
        p = Play(raw)
        if not p.live(tc):
            continue
        defs = p.who('D')
        kc, kt = p.k(tc), p.k(tt)
        end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
        x0, _ = p.pos(r, kc)
        if x0 is None:
            continue
        s_catch, s_throw = nearest_def(p, r, kc, defs), nearest_def(p, r, kt, defs)
        if math.isinf(s_catch) or math.isinf(s_throw):
            continue
        near5 = sum(1 for d in defs if p.dist(r, d, kc) <= 5.0)
        kd = next((k for k in range(kc, end + 1) if nearest_def(p, r, k, defs) <= 1.0), None)
        t_contact = None if kd is None else (kd - kc) * p.dt
        escaped = None
        if kd is not None:
            k5 = kd + 5
            escaped = bool(k5 <= end and p.speed(r, k5) > 2.0)
        fc = ev.get('first_contact')
        lab = raw.get('labels') or {}
        calls = [c['type'] for c in lab.get('carrierContacts', [])] if raw.get('source') == 'sim' else None
        cell = raw.get('cell') or {}
        rows.append(dict(id=raw['id'], yac=raw['yards'] - x0, x=x0, s_throw=s_throw, s_catch=s_catch, near5=near5, t_contact=t_contact,
                         ev_contact=None if fc is None or fc < tc else fc - tc, escaped=escaped, calls=calls,
                         fam=coverage_family(cell.get('coverage')), shell=shell(cell.get('coverage'))))
    return rows


def pct(n, d):
    return f"{100 * n / d:.0f}%" if d else 'n/a'


def report(name, rows):
    n = len(rows)
    print(f"== {name}: {n} completions")
    for k, label in (('s_throw', 'separation at throw'), ('s_catch', 'separation at catch')):
        v = [r[k] for r in rows]
        extra = f"  >=3 yd {pct(sum(x >= 3 for x in v), n)}  >=5 yd {pct(sum(x >= 5 for x in v), n)}" if k == 's_catch' else ''
        print(f"  {label}: p25/50/75 {q(v, .25):.2f}/{q(v):.2f}/{q(v, .75):.2f}{extra}")
    nc = [r['near5'] for r in rows]
    print(f"  defenders within 5 yd at the catch: 0 {pct(sum(x == 0 for x in nc), n)}, 1 {pct(sum(x == 1 for x in nc), n)}, 2 {pct(sum(x == 2 for x in nc), n)}, 3+ {pct(sum(x >= 3 for x in nc), n)}")
    tc = [r['t_contact'] for r in rows if r['t_contact'] is not None]
    ec = [r['ev_contact'] for r in rows if r['ev_contact'] is not None]
    print(f"  catch to first defender within 1 yd (proxy): reached {pct(len(tc), n)}, p25/50/75 {q(tc, .25):.1f}/{q(tc):.1f}/{q(tc, .75):.1f} s; source first_contact event: present {pct(len(ec), n)}, p50 {q(ec):.1f} s")
    ee = [r['escaped'] for r in rows if r['escaped'] is not None]
    print(f"  first arriver fails (proxy: still > 2 yd/s 0.5 s later, play live): {pct(sum(ee), len(ee))} of {len(ee)} with a defender within 1 yd")
    sim = [r['calls'] for r in rows if r['calls'] is not None]
    if sim:
        first = [c[0] if c else None for c in sim]
        print(f"  engine log, first call on the carrier: missed_tackle {pct(sum(f == 'missed_tackle' for f in first), len(sim))}, broken_tackle {pct(sum(f == 'broken_tackle' for f in first), len(sim))}; "
              f"any missed/broken in the play {pct(sum(any(x in ('missed_tackle', 'broken_tackle') for x in c) for c in sim), len(sim))}")
    print(f"  YAC per reception {mean([r['yac'] for r in rows]):.2f} (p50 {q([r['yac'] for r in rows]):.1f})")


def split(rows, key, order):
    out = {}
    for name in order:
        v = [r['yac'] for r in rows if key(r) == name]
        out[name] = (len(v), mean(v))
    return out


def table(title, a, b, order):
    print(f"-- {title}: n / mean YAC   NFL | ours")
    for name in order:
        (na, ma), (nb, mb) = a[name], b[name]
        print(f"   {name:12s} {na:5d} {ma:5.2f} | {nb:4d} {mb:5.2f}")


if __name__ == '__main__':
    nfl, sim = scan(sys.argv[1]), scan(sys.argv[2])
    report('NFL', nfl); report('ours', sim)
    bn = [n for *_, n in BANDS]
    table('separation at the catch', split(nfl, lambda r: band(r['s_catch']), bn), split(sim, lambda r: band(r['s_catch']), bn), bn)
    table('coverage family', split(nfl, lambda r: r['fam'], ['man', 'zone']), split(sim, lambda r: r['fam'], ['man', 'zone']), ['man', 'zone'])
    sh = ['C0', 'C1', 'C2', 'C3', 'C4', 'C6']
    table('shell', split(nfl, lambda r: r['shell'], sh), split(sim, lambda r: r['shell'], sh), sh)
    dn = [n for *_, n in DEPTHS]
    table('catch depth', split(nfl, lambda r: depth(r['x']), dn), split(sim, lambda r: depth(r['x']), dn), dn)
    # Decomposition on separation bands.
    sn, ss = split(nfl, lambda r: band(r['s_catch']), bn), split(sim, lambda r: band(r['s_catch']), bn)
    wn = {b: sn[b][0] / len(nfl) for b in bn}; ws = {b: ss[b][0] / len(sim) for b in bn}
    yn = {b: sn[b][1] for b in bn}; ys = {b: ss[b][1] for b in bn}
    nfl_mean, sim_mean = mean([r['yac'] for r in nfl]), mean([r['yac'] for r in sim])
    mix = sum(ws[b] * yn[b] for b in bn if ss[b][0] and sn[b][0]) / sum(ws[b] for b in bn if ss[b][0] and sn[b][0])
    same = sum(wn[b] * ys[b] for b in bn if ss[b][0] and sn[b][0]) / sum(wn[b] for b in bn if ss[b][0] and sn[b][0])
    print(f"-- decomposition (separation bands): NFL {nfl_mean:.2f}, ours {sim_mean:.2f}, gap {sim_mean - nfl_mean:+.2f}; "
          f"NFL YAC per band x our mix {mix:.2f} (openness {mix - nfl_mean:+.2f}); our YAC per band x NFL mix {same:.2f} (same openness {same - nfl_mean:+.2f})")
    if '--json' in sys.argv:
        json.dump(dict(nfl=nfl, sim=sim), open(sys.argv[sys.argv.index('--json') + 1], 'w'))
