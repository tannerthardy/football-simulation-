"""Who carries the start-state deficit before the catch (Integration, 2026-11-11). Same code on NFL tracking and sim plays
(common format). Defenders unengaged and within 6 yd of the catcher at the catch (catchwin.py's population), classed by:
  cov:   man / zone from the play's coverage label (metrics.coverage_family; NFL PFF, sim call names);
  role:  by the record's slot where it has one (sim: FS/SS = S, CB_* = CB, NB/DB = slot, LB_* = LB, else DL); otherwise
         LB (group), else a DB is S if 8+ yd deep at the snap, CB if 10+ yd from the ball laterally, else slot (NFL);
  depth: his x against the catcher's at -0.6 s: over (> +2 yd downfield of him), level, under (< -2).
For each class: n; at -1.0 s, -0.6 s, the release (events.pass_forward) and the catch: his speed, velocity toward the
catcher (along the line to the catcher at that frame), share slow (< 1.5 yd/s) and share moving away (cos < -0.7).
Also the flight time (catch - release) and where -0.6 s sits relative to the release.
usage: python3 -I scripts/diag/defense-yards/catchwho.py <plays.jsonl.gz> [...]"""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')


def state(p, d, c, k):
    (dx, dy), (cx, cy) = p.pos(d, k), p.pos(c, k); L = math.hypot(cx - dx, cy - dy) or 1
    vx, vy = p.velocity(d, k); s = math.hypot(vx, vy); tw = (vx * (cx - dx) + vy * (cy - dy)) / L
    return s, tw, s < 1.5, s >= 1.5 and tw / s < -0.7


for path in sys.argv[1:]:
    S = collections.defaultdict(list); C = collections.Counter(); FL = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if raw.get('kind') != 'pass' or 'catch' not in ev or 'pass_forward' not in ev: continue
        c = raw.get('receiver') if raw.get('receiver') is not None else raw.get('target')
        if c is None: continue
        p = Play(raw); kc, kr = p.k(ev.get('pass_arrived', ev['catch'])), p.k(ev['pass_forward'])  # ball arrival (NFL catch event lags it 0.3-0.4 s)
        k10 = kc - int(round(1.0 / p.dt)); k6 = kc - int(round(0.6 / p.dt))
        if k10 < 0 or kr > kc or any(p.pos(c, k)[0] is None for k in range(min(k10, kr), kc + 1)): continue
        FL.append((kc - kr) * p.dt)
        cov = coverage_family((raw.get('cell') or {}).get('coverage')) or 'other'
        O = [o for o in p.who('O') if o != c]; by = raw['ball_y']
        for d in p.who('D'):
            if any(p.pos(d, k)[0] is None for k in range(min(k10, kr), kc + 1)): continue
            if p.dist(c, d, kc) > 6 or any(p.dist(o, d, kc) <= 1.2 for o in O): continue
            g = p.players[d]['group']; x0, y0 = p.pos(d, 0)
            if x0 is None: continue
            sl = p.players[d].get('slot')
            if sl:   # sim records carry the play's slot (the job), not the roster position: an LB at SS plays safety
                role = 'S' if sl in ('FS', 'SS') else 'CB' if sl.startswith('CB') else 'slot' if sl in ('NB', 'DB') else 'LB' if sl.startswith('LB') else 'DL'
            else:
                role = 'LB' if g == 'LB' else 'DL' if g == 'DL' else ('S' if x0 >= 8 else 'CB' if abs(y0 - by) >= 10 else 'slot')
            rel = p.pos(d, k6)[0] - p.pos(c, k6)[0]; dep = 'over' if rel > 2 else 'under' if rel < -2 else 'level'
            for key in (('all',), (cov,), (cov, role), (cov, role, dep), ('depth', dep)):
                C[key] += 1
                for name, k in (('-1.0', k10), ('-0.6', k6), ('rel', kr), ('catch', kc)):
                    s, tw, slow, away = state(p, d, c, k)
                    S[key + (name, 's')].append(s); S[key + (name, 'tw')].append(tw); S[key + (name, 'slow')].append(slow); S[key + (name, 'away')].append(away)
    print(f"== {os.path.basename(path)}: flight (catch - release) p50 {q(FL):.2f} s (p25 {q(FL, .25):.2f}, p75 {q(FL, .75):.2f}); -0.6 s is {'before' if q(FL) > 0.6 else 'after'} the release at the median")
    fmt = lambda key, name: f"{q(S[key + (name, 's')]):.1f} / {q(S[key + (name, 'tw')]):+.1f} / {100 * sum(S[key + (name, 'slow')]) / len(S[key + (name, 'slow')]):2.0f}% / {100 * sum(S[key + (name, 'away')]) / len(S[key + (name, 'away')]):2.0f}%"
    print("   class                     n    | speed / toward / slow / away at -1.0 s | -0.6 s | release | catch")
    keys = [('all',)] + [k for k in sorted(C, key=lambda k: (len(k), str(k))) if k != ('all',) and C[k] >= 15]
    for key in keys:
        print(f"   {'/'.join(key):24} {C[key]:5} | {fmt(key, '-1.0')} | {fmt(key, '-0.6')} | {fmt(key, 'rel')} | {fmt(key, 'catch')}")
