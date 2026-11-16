"""Pursuers on a carrier at speed, one operator: every defender 2.5-6 yd from a carrier moving > 6 yd/s after the catch,
not ahead of him (side or behind, his bearing from the carrier's run >= 60 deg): his speed, its gain over the next 0.5 s,
and closing. usage: python3 -I scripts/diag/yac/pursuer-speed.py --nfl NFL.jsonl.gz --sim DIR"""
import sys, math, glob
sys.path.insert(0, 'scripts/diag/yac')
import importlib.util
spec = importlib.util.spec_from_file_location('ya', 'scripts/diag/yac/yac-arrive.py')
args = sys.argv[1:]; sys.argv = [sys.argv[0]]
ya = importlib.util.module_from_spec(spec); spec.loader.exec_module(ya)
mean = lambda v: sum(v) / len(v) if v else float('nan')
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
def run(name, plays):
    rows = []
    for pl in plays:
        C, D, dt = pl['C'], pl['D'], pl['dt']; h = int(round(.5 / dt))
        for i, P in D.items():
            for k in range(1, len(C) - h - 1):
                if P[k][0] is None or P[k + h][0] is None: continue
                cvx, cvy = ya.vel(C, k, dt); cs = math.hypot(cvx, cvy)
                if cs <= 6: continue
                dx, dy = P[k][0] - C[k][0], P[k][1] - C[k][1]; L = math.hypot(dx, dy)
                if not 2.5 <= L < 6: continue
                if (dx * cvx + dy * cvy) / (L * cs) > 0.5: continue  # ahead of him: not a pursuer
                vx, vy = ya.vel(P, k, dt); s0 = math.hypot(vx, vy); s1 = math.hypot(*ya.vel(P, k + h, dt))
                rows.append((s0, s1 - s0, (-vx * dx - vy * dy) / L - (-cvx * dx - cvy * dy) / L, cs, pl['fam']))
                break
    for fm in ('man', 'zone', None):
        R = [r for r in rows if fm is None or r[4] == fm]
        print(f"{name:4s} {fm or 'all':4s} n {len(R):4d} | carrier {mean([r[3] for r in R]):.2f} | pursuer speed p25/50/75 {q([r[0] for r in R], .25):.2f}/{q([r[0] for r in R]):.2f}/{q([r[0] for r in R], .75):.2f} "
              f"| gain next 0.5 s {mean([r[1] for r in R]):+.2f} | relative closing {mean([r[2] for r in R]):+.2f} | faster than carrier {mean([r[0] > r[3] for r in R]):.0%}")
if '--nfl' in args: run('NFL', ya.nfl(args[args.index('--nfl') + 1]))
if '--sim' in args: run('sim', ya.sim(sorted(glob.glob(args[args.index('--sim') + 1] + '/cover*.json'))))
