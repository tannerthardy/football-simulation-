"""Yards after the catch split into yards before first contact and after it, by catch depth (same code, NFL and sim).

usage: python3 -I scripts/diag/pass-operators/yac_split.py <off.jsonl.gz> [...] -- <on.jsonl.gz> [...] --- <nfl.jsonl.gz>

Completions; the catch point is the catcher's position at events.catch; the end is his last tracked x. Per depth bin:
mean YAC = before first contact + after, catcher speed and downfield velocity at the catch, nearest defender, catch to
first contact p50, share with no contact."""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
def go(paths):
    R = collections.defaultdict(list)
    for path in paths:
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw['events']
            if raw['kind'] != 'pass' or 'catch' not in ev: continue
            c = raw.get('receiver') if raw.get('receiver') is not None else raw.get('target')
            if c is None: continue
            p = Play(raw); ka = p.k(ev['catch']); ke = min(p.k(ev['end']), p.frames - 1)
            if p.pos(c, ka)[0] is None: continue
            cx, cy = p.pos(c, ka); vx, vy = p.velocity(c, ka)
            fam = 'air<0' if cx < 0 else 'air0-5' if cx < 5 else 'air5-10' if cx < 10 else 'air10-20' if cx < 20 else 'air20+'
            D = [d for d in p.who('D') if p.pos(d, ka)[0] is not None]
            if not D: continue
            dd = min(p.dist(c, d, ka) for d in D)
            # downfield gain before first contact vs after
            kf = p.k(ev['first_contact']) if 'first_contact' in ev and p.k(ev['first_contact']) >= ka else None
            xe = (next((p.pos(c, k)[0] for k in range(ke, ka - 1, -1) if p.pos(c, k)[0] is not None), cx))
            xf = p.pos(c, kf)[0] if kf is not None and kf <= ke and p.pos(c, kf)[0] is not None else None
            before = (xf - cx) if xf is not None else (xe - cx); after = (xe - xf) if xf is not None else 0
            tfc = (kf - ka) * p.dt if xf is not None else None
            o = dict(dd=dd, cs=math.hypot(vx, vy), vx=vx, before=before, after=after, tfc=tfc, yac=xe - cx)
            for k in (fam, 'all'): R[k].append(o)
    return R
i = sys.argv.index('--'); j = sys.argv.index('---'); A = {'nfl': go(sys.argv[j+1:]), 'off': go(sys.argv[1:i]), 'on': go(sys.argv[i + 1:j])}
for fam in ('all', 'air<0', 'air0-5', 'air5-10', 'air10-20', 'air20+'):
    for k in A:
        v = A[k][fam]
        if not v: continue
        print(f"{fam:12} {k:3} n{len(v):4} YAC mean {sum(o['yac'] for o in v)/len(v):5.2f} = before contact {sum(o['before'] for o in v)/len(v):5.2f} + after {sum(o['after'] for o in v)/len(v):5.2f} | "
              f"catch speed {q([o['cs'] for o in v]):.1f} downfield vx {q([o['vx'] for o in v]):+.1f} | nearest D {q([o['dd'] for o in v]):.1f} yd | catch->contact {q([o['tfc'] for o in v if o['tfc'] is not None]):.2f}s | no contact {100*sum(o['tfc'] is None for o in v)/len(v):.0f}%")
