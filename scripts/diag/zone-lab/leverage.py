"""For first contacts by an ENGAGED defender: was the carrier on the
defender's free side (opposite his blocker) or on the blocker's side?
python -I scripts/diag/zone-lab/leverage.py 'out/zone-lab/base-*.jsonl.gz'"""
import glob, gzip, json, sys
from collections import Counter
rows = [json.loads(l) for f in sorted(glob.glob(sys.argv[1])) for l in gzip.open(f, 'rt')]
c = Counter(); g = {}
for r in rows:
    if 'error' in r or not r.get('firstContact') or not r['firstContact']['by']: continue
    fc = r['firstContact']; di = r['slots'].index(fc['by'])
    # frame shortly before contact
    fr = [f for f in r['frames'] if f['t'] <= fc['t'] - 0.15]
    if not fr: continue
    f = fr[-1]; P = f['p']
    eng = [e for e in f['e'] if e[1] == di]
    if not eng: continue
    b = P[eng[0][0]]; d = P[di]; rb = P[r['rbIdx']]
    # lateral offsets relative to defender, in play-side frame
    bs = (b[1] - d[1]) * r['ps']; rs = (rb[1] - d[1]) * r['ps']
    side = 'carrier on free side' if bs * rs < 0 else 'carrier on blocker side'
    k = (r['concept'], side); c[k] += 1; g.setdefault(k, []).append(r['gain'])
for k in sorted(c):
    v = sorted(g[k]); print(k, c[k], 'median gain', v[len(v)//2])
