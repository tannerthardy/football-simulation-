"""The back's flat and what opens behind the curl-flat defender (same code on NFL and sim common-format plays).
Thrown non-PA drop-backs against zone. (1) Targets to a back caught or thrown within 10 yd of a sideline: completion,
YAC per catch (mean / p50). (2) Targets to a non-back 5-12 yd past the line and within 12 yd of a sideline at the
arrival (the curl / out window behind the curl-flat player): completion and yards per target.
usage: python3 -I scripts/diag/pass-operators/flat_cost.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa
for arg in sys.argv[1:]:
    name, paths = arg.split('='); A, B = [], []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            r = json.loads(line); r = r.get('common', r)
            if r['kind'] != 'pass': continue
            concept = str((r.get('cell') or {}).get('concept') or 'NA')
            if (r.get('source') == 'sim' and concept.startswith('pa_')) or (r.get('source') != 'sim' and concept not in ('NA', 'UNDEFINED')): continue
            ev = r['events']; t = r.get('target')
            if 'pass_forward' not in ev or t is None or coverage_family((r.get('cell') or {}).get('coverage')) != 'zone': continue
            p = Play(r); ka = min(p.k(ev.get('pass_arrived', ev['end'])), p.frames - 1); x, y = p.pos(t, ka)
            if x is None: continue
            car = r.get('carrier'); intc = car is not None and p.players[car]['side'] == 'D'
            comp = 'catch' in ev and not intc; yds = 0 if intc else (r.get('yards') or 0)
            wide = min(y, 53.33 - y)
            if p.players[t]['group'] == 'RB':
                if wide < 10:
                    cx = p.pos(t, min(p.k(ev['catch']), p.frames - 1))[0] if comp else None
                    A.append(dict(comp=comp, yac=(yds - cx) if comp and cx is not None else None))
            elif 5 <= x <= 12 and wide < 12:
                cx = p.pos(t, min(p.k(ev['catch']), p.frames - 1))[0] if comp else None
                B.append(dict(comp=comp, yds=yds, air=cx, yac=(yds - cx) if comp and cx is not None else None))
    q = lambda v: sorted(v)[len(v) // 2] if v else float('nan')
    ya = [o['yac'] for o in A if o['yac'] is not None]
    print(f'== {name}: back to the wide flat n {len(A)} | complete {100 * sum(o["comp"] for o in A) / max(1, len(A)):.0f}% | YAC per catch mean {sum(ya) / max(1, len(ya)):.1f} p50 {q(ya):.1f}'
          f' || behind the curl-flat (non-back, 5-12 yd, wide) n {len(B)} | complete {100 * sum(o["comp"] for o in B) / max(1, len(B)):.0f}% | yd/target {sum(o["yds"] for o in B) / max(1, len(B)):.2f}'
          f' | per catch: air {(lambda v: sum(v) / max(1, len(v)))([o["air"] for o in B if o["air"] is not None]):.1f}, YAC mean {(lambda v: sum(v) / max(1, len(v)))([o["yac"] for o in B if o["yac"] is not None]):.1f} p50 {q([o["yac"] for o in B if o["yac"] is not None]):.1f}')
