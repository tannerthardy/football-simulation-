"""Over-the-top defender on stop routes: when he stops retreating after the catcher's break (same code, NFL and sim).
Completions to a catcher 8+ yd past the line of scrimmage whose downfield speed is <= 0.5 yd/s at the ball's arrival (curl, comeback,
hitch, stop routes; no route labels needed). Break = the first frame after the catcher's peak downfield
speed (>= 3 yd/s) where it falls below 1 yd/s. Defenders: unengaged, within 6 yd of the catcher at arrival
and 2+ yd downfield of him at the break (catchwho's 'over'), any coverage.
Reports: release - break; defender downfield velocity (+ = retreating) at break -0.2, break, +0.2, +0.4, +0.6
and release; reaction = first frame after the break where his downfield velocity is <= 0.5 yd/s, minus the break
(none within 1.5 s counts as 1.5); share away at release (catchwho definition), by coverage family.
usage: python3 -I scripts/diag/pass-operators/stopbreak.py <plays.jsonl.gz> [...]"""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    S = collections.defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if raw.get('kind') != 'pass' or 'catch' not in ev or 'pass_forward' not in ev: continue
        c = raw.get('receiver') if raw.get('receiver') is not None else raw.get('target')
        if c is None: continue
        p = Play(raw); ka, kr = p.k(ev.get('pass_arrived', ev['catch'])), p.k(ev['pass_forward'])
        if any(p.pos(c, k)[0] is None for k in range(0, ka + 1)): continue
        los = p.pos(c, 0)[0] if False else 0.0  # common format: x measured from the line of scrimmage
        if p.pos(c, ka)[0] < 8 or p.velocity(c, ka)[0] > 0.5: continue
        vx = [p.velocity(c, k)[0] for k in range(ka + 1)]
        kp = max(range(ka + 1), key=lambda k: vx[k])
        if vx[kp] < 3: continue
        kb = next((k for k in range(kp, ka + 1) if vx[k] < 1), None)
        if kb is None: continue
        cov = coverage_family((raw.get('cell') or {}).get('coverage')) or 'other'
        O = [o for o in p.who('O') if o != c]; n = int(round(0.2 / p.dt))
        for d in p.who('D'):
            ks = range(max(0, kb - n), min(len(raw['xy']) - 1, kb + 8 * n) + 1)
            if any(p.pos(d, k)[0] is None for k in list(ks) + [ka, kr]): continue
            if p.dist(c, d, ka) > 6 or any(p.dist(o, d, ka) <= 1.2 for o in O): continue
            if p.pos(d, kb)[0] - p.pos(c, kb)[0] <= 2: continue
            dv = lambda k: p.velocity(d, k)[0] if 0 <= k < len(raw['xy']) and p.pos(d, k)[0] is not None else float('nan')
            react = next(((k - kb) * p.dt for k in range(kb, kb + int(1.5 / p.dt) + 1) if dv(k) <= 0.5), 1.5)
            (dx, dy), (cx, cy) = p.pos(d, kr), p.pos(c, kr); L = math.hypot(cx - dx, cy - dy) or 1
            vxr, vyr = p.velocity(d, kr); sp = math.hypot(vxr, vyr); tw = (vxr * (cx - dx) + vyr * (cy - dy)) / L
            for key in ('all', cov):
                S[key, 'rb'].append((kr - kb) * p.dt); S[key, 'react'].append(react); S[key, 'away'].append(sp >= 1.5 and tw / sp < -0.7)
                S[key, 'depth'].append(p.pos(c, kb)[0]); S[key, 'gap'].append(p.pos(d, kb)[0] - p.pos(c, kb)[0])
                for name, k in (('b-0.2', kb - n), ('b', kb), ('b+0.2', kb + n), ('b+0.4', kb + 2 * n), ('b+0.6', kb + 3 * n), ('rel', kr)):
                    S[key, name].append(dv(k))
    print(f"== {os.path.basename(path)}")
    print("   cov     n   | release-break p25/50/75 | catcher depth at break | over by | def downfield vel p50 at b-0.2 / b / +0.2 / +0.4 / +0.6 / release | reaction p25/50/75 (none 1.5) | away at release")
    for key in ('all', 'zone', 'man', 'other'):
        if not S[key, 'rb']: continue
        nn = len(S[key, 'rb']); fv = lambda name: f"{q([v for v in S[key, name] if v == v]):+.1f}"
        print(f"   {key:6} {nn:4} | {q(S[key,'rb'],.25):+.2f} {q(S[key,'rb']):+.2f} {q(S[key,'rb'],.75):+.2f} | {q(S[key,'depth']):5.1f} | {q(S[key,'gap']):4.1f} | "
              f"{' / '.join(fv(nm) for nm in ('b-0.2','b','b+0.2','b+0.4','b+0.6','rel'))} | {q(S[key,'react'],.25):.2f} {q(S[key,'react']):.2f} {q(S[key,'react'],.75):.2f} | {100*sum(S[key,'away'])/nn:.0f}%")
