"""OL on runs: forward displacement at 1/2/3 s; how many OL are past +2 yd (beyond the LOS) by the time the carrier
reaches +2; and per OL whether he is within 1.5 yd of a DL at that moment. Same operator, NFL and sim.
    python3 -I olmove.py <repo> <plays.jsonl.gz>"""
import gzip, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[1]) / 'scripts/mechanics'))
from metrics import Play, ENGAGED_YD, CONCEPT_FAMILY
def q(v, p):
    v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')
out = {}
FAM=['?']
def add(k, x): out.setdefault(FAM[0]+': '+k, []).append(x)
with gzip.open(sys.argv[2], 'rt') as fh:
    for line in fh:
        raw = json.loads(line); p = Play(raw); c = raw.get('carrier')
        if c is None or p.players[c]['group'] != 'RB' or 'handoff' not in p.events: continue
        FAM[0] = CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept') or '', 'other')
        ol = p.who('O', 'OL'); dl = p.who('D', 'DL'); lb = p.who('D', 'LB')
        if not ol: continue
        side = 0
        if p.live(2.0):
            dy = p.pos(c, p.k(2.0))[1] - p.pos(c, 0)[1]; side = (dy > 0) - (dy < 0)
        for t in (1.0, 2.0, 3.0):
            if p.live(t):
                k = p.k(t)
                for o in ol:
                    add(f'OL forward at {t:.0f}s', p.pos(o, k)[0] - p.pos(o, 0)[0])
                    if side: add(f'OL lateral toward the run at {t:.0f}s', (p.pos(o, k)[1] - p.pos(o, 0)[1]) * side)
        k2 = next((k for k in range(p.k(p.events['handoff']), p.k(p.end) + 1) if p.pos(c, k)[0] >= 2.0), None)
        if k2 is None: continue
        add('plays with carrier reaching +2', 1)
        add('OL beyond +2 when carrier reaches +2 (per play)', sum(1 for o in ol if p.pos(o, k2)[0] >= 2.0))
        add('OL beyond LOS (x>0) when carrier reaches +2 (per play)', sum(1 for o in ol if p.pos(o, k2)[0] > 0))
        for o in ol:
            add('OL x when carrier reaches +2', p.pos(o, k2)[0])
            add('OL within 1.5 of a DL then', 1.0 if dl and min(p.dist(o, d, k2) for d in dl) <= ENGAGED_YD else 0.0)
            add('OL within 1.5 of a LB then', 1.0 if lb and min(p.dist(o, d, k2) for d in lb) <= ENGAGED_YD else 0.0)
        add('carrier time to +2', k2 * p.dt)
print(Path(sys.argv[2]).name)
for k in sorted(out):
    v = out[k]
    if k.startswith('plays'): print(f'  {k}: {len(v)}')
    elif 'within' in k: print(f'  {k}: {sum(v)/len(v):.2f}')
    else: print(f'  {k}: mean {sum(v)/len(v):.2f} p25 {q(v,.25):.2f} p50 {q(v,.5):.2f} p75 {q(v,.75):.2f}')
