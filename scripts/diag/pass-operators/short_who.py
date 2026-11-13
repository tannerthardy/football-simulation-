"""Who defends a 0-5 yd zone throw at the ball's arrival (nearest defender a safety or not; safeties' distance; underneath defenders within 3 yd and completion by that count). usage: python3 -I scripts/diag/pass-operators/short_who.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family
for arg in sys.argv[1:]:
    name, paths = arg.split('=')
    R = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            r = json.loads(line); r = r.get('common', r)
            if r['kind'] != 'pass' or str((r.get('cell') or {}).get('concept') or '').startswith('pa_'): continue
            ev = r['events']; t = r.get('target')
            if 'pass_forward' not in ev or t is None or (r.get('labels') or {}).get('throwaway'): continue
            if coverage_family((r.get('cell') or {}).get('coverage')) != 'zone': continue
            p = Play(r); ka = min(p.k(ev.get('pass_arrived', ev['end'])), p.frames - 1); kr = p.k(ev['pass_forward'])
            x = p.pos(t, ka)[0]
            if x is None or not (0 <= x < 5): continue
            D = [d for d in p.who('D') if p.pos(d, ka)[0] is not None]
            near = min(D, key=lambda d: p.dist(d, t, ka))
            saf = [d for d in D if p.pos(d, 0)[0] is not None and p.pos(d, 0)[0] >= 9]
            sd = min((p.dist(d, t, ka) for d in saf), default=None)
            R.append(dict(comp='catch' in ev, nsaf=p.pos(near, 0)[0] >= 9, nd=p.dist(near, t, ka), sd=sd,
                          und=sum(1 for d in D if p.pos(d, 0)[0] is not None and p.pos(d, 0)[0] < 9 and p.dist(d, t, ka) < 3),
                          safthrow=[p.pos(d, kr)[0] for d in saf if p.pos(d, kr)[0] is not None]))
    q = lambda v: sorted(v)[len(v) // 2] if v else float('nan')
    print(f'== {name}: zone targets 0-5 yd n {len(R)} | complete {100*sum(o["comp"] for o in R)/len(R):.0f}%')
    for lab, f in (('nearest at arrival is a safety', lambda o: o['nsaf']), ('nearest is not a safety', lambda o: not o['nsaf'])):
        v = [o for o in R if f(o)]
        print(f'   {lab:<32} {100*len(v)/len(R):4.0f}% | complete {100*sum(o["comp"] for o in v)/max(1,len(v)):.0f}% | nearest p50 {q([o["nd"] for o in v]):.1f} yd')
    print(f'   nearest safety to the target at arrival p50 {q([o["sd"] for o in R if o["sd"] is not None]):.1f} yd | within 3 yd {100*sum(1 for o in R if o["sd"] is not None and o["sd"] < 3)/len(R):.0f}% | underneath defenders within 3 yd: mean {sum(o["und"] for o in R)/len(R):.2f} | nearest any p50 {q([o["nd"] for o in R]):.1f}')
    for k in (0, 1, 2):
        v = [o for o in R if min(o['und'], 2) == k]
        print(f'   underneath within 3 yd = {k}{"+" if k==2 else ""}: {100*len(v)/len(R):.0f}% complete {100*sum(o["comp"] for o in v)/max(1,len(v)):.0f}%')
