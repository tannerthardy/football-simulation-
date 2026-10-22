"""Kick or log at the runner's arrival, one operator for NFL tracking and sim
common plays (gap-pull runs, RB carries). The puller is the OL with the
largest lateral displacement snap -> 1.5 s (over 2 yd); his pull direction is
the play side. When the carrier is first within 1 yd of the line, the end is
the defender nearest the puller (within 1.5 yd): 'kicked' if he is on the
puller's play side, 'logged' if inside. The runner passes inside or outside
the puller (his lateral position then). Shares and gains by case.
usage: kickside.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
for path in sys.argv[1:]:
    R = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        concept = raw['id'].split('/')[0] if raw.get('source') == 'sim' and '/' in raw['id'] else (raw.get('cell') or {}).get('concept')
        if CONCEPT_FAMILY.get(concept) != 'gap_pull': continue
        p = Play(raw); c = raw['carrier']
        if p.players[c]['group'] != 'RB': continue
        k15 = p.k(1.5)
        if k15 >= p.frames: continue
        best = None
        for i in p.who('O', 'OL'):
            if p.pos(i, 0)[0] is None or p.pos(i, k15)[0] is None: continue
            dy = p.pos(i, k15)[1] - p.pos(i, 0)[1]
            if best is None or abs(dy) > abs(best[1]): best = (i, dy)
        if not best or abs(best[1]) < 2: continue
        pu, side = best[0], math.copysign(1, best[1])
        ka = next((k for k in range(p.frames) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= -1), None)
        if ka is None or p.pos(pu, ka)[0] is None: continue
        ds = [d for d in p.who('D') if p.dist(d, pu, ka) <= 1.5]
        if not ds: continue
        end = min(ds, key=lambda d: p.dist(d, pu, ka))
        endOut = (p.pos(end, ka)[1] - p.pos(pu, ka)[1]) * side
        runOut = (p.pos(c, ka)[1] - p.pos(pu, ka)[1]) * side
        R.append(dict(case='kicked' if endOut > 0 else 'logged', run='outside' if runOut > 0 else 'inside', y=raw['yards']))
    print(path.split('/')[-1], 'plays', len(R))
    for case in ('kicked', 'logged'):
        S = [r for r in R if r['case'] == case]
        out = [r for r in S if r['run'] == 'outside']; ins = [r for r in S if r['run'] == 'inside']
        g = lambda A: f"n {len(A):4d} median {q([r['y'] for r in A])} loss {100 * sum(r['y'] < 0 for r in A) / max(1, len(A)):.0f}%"
        print(f"  {case:7s} {100 * len(S) / max(1, len(R)):.0f}% | runner inside the puller {100 * len(ins) / max(1, len(S)):.0f}% ({g(ins)}) | outside ({g(out)})")
