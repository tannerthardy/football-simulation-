"""usage: python3 -I scripts/diag/pass-operators/depth_split.py [--ball out/mechanics/nfl-ball.jsonl.gz] <plays.jsonl.gz> [...]

Targeted passes split by where the target is at arrival (yards downfield of his start: short < 6, intermediate 6-12,
deep 12+) and man / zone (same code, NFL and sim): attempts, completion, yards per attempt, YAC per catch (the
carrier's last x minus his x at arrival) and the receiver's speed at arrival. Throwaways excluded."""
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
if '--ball' in sys.argv:
    i = sys.argv.index('--ball'); sys.argv.pop(i + 1); sys.argv.pop(i)
for path in sys.argv[1:]:
    G = {}
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r); ev = r['events']
        if r['kind'] != 'pass' or 'pass_forward' not in ev or r.get('target') is None: continue
        if (r.get('labels') or {}).get('throwaway'): continue
        t = r['target']; p = Play(r)
        ka = min(p.k(ev.get('pass_arrived', ev['end'])), p.frames - 1); ke = min(p.k(ev['end']), p.frames - 1)
        if p.pos(t, ka)[0] is None or p.pos(t, 0)[0] is None: continue
        depth = p.pos(t, ka)[0] - p.pos(t, 0)[0]
        band = 'short <6' if depth < 6 else 'inter 6-12' if depth < 12 else 'deep 12+'
        fam = coverage_family((r.get('cell') or {}).get('coverage')) or 'other'
        comp = 'catch' in ev
        yac = None
        if comp:
            xe = next((p.pos(t, k)[0] for k in range(ke, ka - 1, -1) if p.pos(t, k)[0] is not None), None)
            yac = (xe - p.pos(t, ka)[0]) if xe is not None else None
        G.setdefault((band, fam), []).append(dict(comp=comp, yds=r.get('yards') or 0, yac=yac, rs=p.speed(t, ka)))
    print(f'== {os.path.basename(path)}')
    for band in ('short <6', 'inter 6-12', 'deep 12+'):
        for fam in ('zone', 'man'):
            v = G.get((band, fam), [])
            if not v: continue
            c = [o for o in v if o['comp']]
            print(f"   {band:10} {fam:4} att {len(v):5} | comp {100*len(c)/len(v):3.0f}% | yd/att {sum(o['yds'] for o in v)/len(v):5.2f} | YAC/catch mean {sum(o['yac'] for o in c if o['yac'] is not None)/max(1,len(c)):.2f} p50 {q([o['yac'] for o in c if o['yac'] is not None]):.1f} | speed at arrival {q([o['rs'] for o in v]):.1f}")
