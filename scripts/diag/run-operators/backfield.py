"""Backfield first contact (Integration, 2026-11-10): how often a zone run's first contact happens behind the line, and
how often the runner is then stopped at 0 yd or less, by contact depth. Same code on NFL tracking and sim dumps.

First contact as frontcourse.py: the first frame at or after the handoff that any defender's centre is within 1.0 yd of
the carrier's, with no depth or angle filter. Depth = the carrier's x from the line at that frame (- = behind).
Bins: deeper than 1 yd behind; 0-1 yd behind; at or past the line. Stuff = play yards <= 0 (NFL: the play's yards
gained; sim: the dump's yards). Runs with no contact before the end are counted apart.
usage: python3 -I backfield.py <nfl.jsonl.gz | sim zone dump with off> [...]"""
import sys, json, gzip, math, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_argv, sys.argv = sys.argv, sys.argv[:1]  # frontcourse reports on its argv at import
import frontcourse as fc  # noqa: E402
sys.argv = _argv


def yards_of(path):
    """Play yards in file order (the loader yields the same plays in the same order)."""
    if path.endswith('.gz'):
        for l in gzip.open(path, 'rt'):
            p = json.loads(l)
            if p['kind'] != 'run' or p['carrier'] is None or p['cell'].get('concept') not in ('OUTSIDE ZONE', 'INSIDE ZONE'):
                continue
            if not p['events'].get('end'):
                continue
            yield p.get('yards', p.get('playYards'))
    else:
        for l in open(path):
            yield json.loads(l)['yards']


def table(path):
    bins = {'< -1': [0, 0], '-1..0': [0, 0], '>= 0': [0, 0], 'none': [0, 0]}
    n = 0
    for (C, D, O, ho, e, *_), y in zip(fc.plays(path), yards_of(path)):
        if y is None:
            continue
        n += 1
        h = max(1, int(round(ho * 10)))
        hit = next((f for f in range(h, e + 1) if min(math.dist(d, C[f]) for d in D[f]) <= 1.0), None)
        k = 'none' if hit is None else '< -1' if C[hit][0] < -1 else '-1..0' if C[hit][0] < 0 else '>= 0'
        bins[k][0] += 1; bins[k][1] += y <= 0
    bf = [bins['< -1'][i] + bins['-1..0'][i] for i in (0, 1)]
    allst = sum(b[1] for b in bins.values())
    pct = lambda a, b: f"{100 * a / b:5.1f}%" if b else '    -'
    print(f"== {path}: {n} zone runs, stuff {pct(allst, n)}")
    print(f"   backfield first contact {pct(bf[0], n)} of runs; stuffed after it {pct(bf[1], bf[0])} (n {bf[0]})")
    for k, (m, s) in bins.items():
        print(f"   {k:6} {m:5} runs ({pct(m, n)}) stuffed {pct(s, m)}")


for p in sys.argv[1:]:
    table(p)
