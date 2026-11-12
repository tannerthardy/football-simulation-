"""usage: python3 -I scripts/diag/pass-operators/loose_ball.py [--ball out/mechanics/nfl-ball.jsonl.gz] <plays.jsonl.gz> [...]

What a ball does after it reaches the receiver and is not caught (same code, NFL and sim). Population: targeted
throws not completed, whose ball came within 1.5 yd of the target (the first such frame is 'at him'). From there:
how far the ball travels (ground plane) over the next 0.3 / 0.5 s, its ground speed then, the nearest defender's
distance to the ball at 0 and +0.3 s, and the outcome (interception or not). Split short (< 10 yd past the line at
'at him') and deep. Tracking has no ball height; travel and speed on the ground are the comparable parts."""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
BALL = {}
if '--ball' in sys.argv:
    i = sys.argv.index('--ball'); bp = sys.argv.pop(i + 1); sys.argv.pop(i)
    for l in gzip.open(bp, 'rt'):
        b = json.loads(l); BALL[b['id']] = b
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r); ev = r['events']
        if r['kind'] != 'pass' or 'pass_forward' not in ev or r.get('target') is None or 'catch' in ev and not (r.get('labels') or {}).get('interception'): pass
        if r['kind'] != 'pass' or 'pass_forward' not in ev or r.get('target') is None: continue
        lab = r.get('labels') or {}
        if lab.get('throwaway'): continue
        meta = BALL.get(r.get('id')); bxy = r.get('bxy') or (meta or {}).get('b')
        if not bxy: continue
        intc = bool(meta.get('int')) if r.get('bxy') is None and meta is not None else bool(lab.get('interception'))
        if 'catch' in ev and not intc: continue
        p = Play(r); t = r['target']; kf = p.k(ev['pass_forward']); ke = min(p.k(ev['end']), len(bxy) - 1, p.frames - 1)
        k0 = next((k for k in range(kf + 1, ke + 1) if p.pos(t, k)[0] is not None and math.hypot(p.pos(t, k)[0] - bxy[k][0], p.pos(t, k)[1] - bxy[k][1]) <= 1.5), None)
        if k0 is None or k0 + 5 > ke: continue
        D = [i for i, a in enumerate(r['players']) if a['side'] == 'D']
        def nd(k): return min((math.hypot(p.pos(i, k)[0] - bxy[k][0], p.pos(i, k)[1] - bxy[k][1]) for i in D if p.pos(i, k)[0] is not None), default=99)
        k3, k5 = k0 + p.k(0.3), k0 + p.k(0.5)
        rows.append(dict(int=intc, deep=bxy[k0][0] >= 10, tr3=math.hypot(bxy[k3][0] - bxy[k0][0], bxy[k3][1] - bxy[k0][1]),
                         tr5=math.hypot(bxy[k5][0] - bxy[k0][0], bxy[k5][1] - bxy[k0][1]),
                         sp=math.hypot(bxy[k3][0] - bxy[k3 - 1][0], bxy[k3][1] - bxy[k3 - 1][1]) / p.dt, d0=nd(k0), d3=nd(k3)))
    print(f'== {os.path.basename(path)}: balls that reached the target (1.5 yd) and were not caught by the offense: {len(rows)}')
    for lab, v in (('short < 10', [o for o in rows if not o['deep']]), ('deep 10+', [o for o in rows if o['deep']])):
        if not v: continue
        print(f"   {lab:10} n {len(v):4} | ball travel after +0.3 / +0.5 s p50 {q([o['tr3'] for o in v]):.1f} / {q([o['tr5'] for o in v]):.1f} yd, ground speed at +0.3 s {q([o['sp'] for o in v]):.1f} | nearest defender to the ball at 0 / +0.3 s {q([o['d0'] for o in v]):.1f} / {q([o['d3'] for o in v]):.1f} yd, within 1 yd at +0.3 s {100*sum(o['d3'] <= 1 for o in v)/len(v):.0f}% | -> interception {100*sum(o['int'] for o in v)/len(v):.1f}%")
