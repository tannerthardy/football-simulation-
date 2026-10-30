"""DL motion between 2 and 3 s on runs, NFL and sim, same operator. Split by where the carrier is relative to the DL
at 2 s (past him downfield or not) and by engaged (within 1.5 yd of an OL) at 2 s.
    python3 -I dlpursue.py <repo> <plays.jsonl.gz>"""
import gzip, json, sys, math
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[1]) / 'scripts/mechanics'))
from metrics import Play, ENGAGED_YD
def q(v, p):
    v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')
out = {}
def add(k, x): out.setdefault(k, []).append(x)
with gzip.open(sys.argv[2], 'rt') as fh:
    for line in fh:
        raw = json.loads(line); p = Play(raw); c = raw.get('carrier')
        if c is None or p.players[c]['group'] != 'RB' or 'handoff' not in p.events or not p.live(3.0): continue
        ol = p.who('O', 'OL')
        if not ol: continue
        k2, k3 = p.k(2.0), p.k(3.0)
        for d in p.who('D', 'DL'):
            eng = min(p.dist(d, o, k2) for o in ol) <= ENGAGED_YD
            passed = p.pos(c, k2)[0] > p.pos(d, k2)[0]
            dx = p.pos(d, k3)[0] - p.pos(d, k2)[0]
            # closing on the carrier over the second: change in distance
            close = p.dist(d, c, k2) - p.dist(d, c, k3)
            still = min(p.dist(d, o, k3) for o in ol) <= ENGAGED_YD
            key = f"{'engaged' if eng else 'free'} at 2s, carrier {'past him' if passed else 'not past'}"
            add(key + ': back 2->3s', dx); add(key + ': closes on carrier', close); add(key + ': still engaged at 3s', 1.0 if still else 0.0)
            add('all: share engaged & carrier past', 1.0 if (eng and passed) else 0.0)
print(Path(sys.argv[2]).name)
for k in sorted(out):
    v = out[k]
    if 'still' in k or 'share' in k: print(f'  {k}: {sum(v)/len(v):.2f} (n {len(v)})')
    else: print(f'  {k}: p25 {q(v,.25):.2f} p50 {q(v,.5):.2f} p75 {q(v,.75):.2f} (n {len(v)})')
