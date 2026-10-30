"""DL vs LB displacement on runs, same operator for NFL and sim (common play format, metrics.Play).
Per run (RB carrier, handoff): for each DL and each box LB, x displacement toward his own goal since the snap at
1/2/3 s; for DL also his furthest-back point while within 1.5 yd of an OL in the first 3 s; and whether he is
engaged (within 1.5 yd of an OL) at each time.
    python3 -I linedrive.py <repo> <plays.jsonl.gz> [concept filter]"""
import gzip, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[1]) / 'scripts/mechanics'))
from metrics import Play, ENGAGED_YD

def q(v, p):
    v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')

out = {}
def add(k, x): out.setdefault(k, []).append(x)
want = sys.argv[3] if len(sys.argv) > 3 else None
n = 0
with gzip.open(sys.argv[2], 'rt') as fh:
    for line in fh:
        raw = json.loads(line); p = Play(raw)
        c = raw.get('carrier')
        if c is None or p.players[c]['group'] != 'RB' or 'handoff' not in p.events: continue
        fam = raw.get('concept_family') or raw.get('family') or ''
        if want and want not in str(raw.get('concept', '')) + str(fam): continue
        n += 1
        ol = p.who('O', 'OL'); box = set(p.box_defenders())
        if not ol: continue
        for d in p.who('D'):
            g = p.players[d]['group']
            if g == 'DL':
                best = None
                for k in range(0, p.k(min(3.0, p.end)) + 1):
                    if min(p.dist(d, o, k) for o in ol) <= ENGAGED_YD:
                        x = p.pos(d, k)[0] - p.pos(d, 0)[0]; best = x if best is None else max(best, x)
                if best is not None: add('DL furthest back while engaged, 0-3 s', best)
            if g not in ('DL', 'LB') or (g == 'LB' and d not in box): continue
            for t in (1.0, 2.0, 3.0):
                if not p.live(t): continue
                k = p.k(t); x = p.pos(d, k)[0] - p.pos(d, 0)[0]
                eng = min(p.dist(d, o, k) for o in ol) <= ENGAGED_YD
                add(f'{g} back at {t:.0f}s, all', x)
                if eng: add(f'{g} back at {t:.0f}s, engaged', x)
                add(f'{g} engaged share at {t:.0f}s', 1.0 if eng else 0.0)
print(Path(sys.argv[2]).name, 'runs', n)
for k in sorted(out):
    v = out[k]
    if 'share' in k: print(f'  {k}: {sum(v)/len(v):.2f} (n {len(v)})')
    else: print(f'  {k}: p25 {q(v,.25):.2f} p50 {q(v,.5):.2f} p75 {q(v,.75):.2f} p90 {q(v,.9):.2f} (n {len(v)})')
