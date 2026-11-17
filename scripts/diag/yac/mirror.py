"""Deep defenders giving ground in front of a carrier, one positions operator, NFL vs sim (zone completions).
usage: python3 -I mirror.py YA_PATH --nfl NFL.jsonl.gz --sim DIR
Per play with YAC >= 20 (and never-reached): each defender deeper than the carrier at the catch, within 15 yd.
'Giving ground' = ahead of the carrier, within 8 yd, and moving downfield (his velocity along the attack > 1 yd/s).
Report: time spent giving ground before he either touches (1 yd), falls level/behind, or the play ends."""
import sys, math, importlib.util
ya_path = sys.argv[1]; args = sys.argv[2:]; sys.argv = [sys.argv[0]]
spec = importlib.util.spec_from_file_location('ya', ya_path); ya = importlib.util.module_from_spec(spec); spec.loader.exec_module(ya)
mean = lambda v: sum(v) / len(v) if v else float('nan')
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
def run(name, plays):
    rows = {'20+': [], 'never': []}
    for pl in plays:
        if pl['fam'] != 'zone': continue
        C, D, dt = pl['C'], pl['D'], pl['dt']
        never = all(D[i][k][0] is None or math.hypot(D[i][k][0] - C[k][0], D[i][k][1] - C[k][1]) > 1.0 for i in D for k in range(len(C)))
        keys = (['20+'] if pl['yac'] >= 20 else []) + (['never'] if never else [])
        if not keys: continue
        give, touched, outcomes = [], 0, []
        for i, P in D.items():
            if P[0][0] is None or not (P[0][0] - C[0][0] > 0 and math.hypot(P[0][0] - C[0][0], P[0][1] - C[0][1]) <= 15): continue
            t_give, res = 0.0, 'play over'
            for k in range(len(C)):
                if P[k][0] is None: break
                dx = P[k][0] - C[k][0]; L = math.hypot(dx, P[k][1] - C[k][1])
                if L <= 1.0: res = 'touch'; break
                if dx <= 0: res = 'level/behind'; break
                vx, vy = ya.vel(P, k, dt)
                if L <= 8 and vx > 1: t_give += dt
            give.append(t_give); outcomes.append(res)
        for key in keys: rows[key].append((pl['yac'], give, outcomes))
    for key, R in rows.items():
        if not R: continue
        mx = [max(g) if g else 0 for _, g, _ in R]
        allo = [o for _, _, os in R for o in os]
        print(f"{name} {key:5s} plays {len(R)} YAC {mean([r[0] for r in R]):.1f} | deep defenders/play {mean([len(g) for _, g, _ in R]):.1f} | longest giving-ground p50 {q(mx):.1f} s p75 {q(mx, .75):.1f} | plays with one giving ground >1 s {mean([x > 1 for x in mx]):.0%} | deep defender ends: " +
              ', '.join(f"{o} {allo.count(o) / max(1, len(allo)):.0%}" for o in ('touch', 'level/behind', 'play over')))
if '--nfl' in args: run('NFL', ya.nfl(args[args.index('--nfl') + 1]))
if '--sim' in args:
    import glob
    run('sim', ya.sim(sorted(glob.glob(args[args.index('--sim') + 1] + '/cover*.json'))))
