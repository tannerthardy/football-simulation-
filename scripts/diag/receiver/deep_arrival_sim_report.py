"""Report for deep-arrival-sim.ts output (one or more jsonl files). Same measures as deep_arrival_nfl.py where they exist.
usage: python3 -I deep_arrival_sim_report.py FILE.jsonl [...]"""
import json, sys, statistics as st
R = [json.loads(l) for f in sys.argv[1:] for l in open(f) if l.strip()]
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
n = len(R); print(f'n {n} throws, ball >= 15 yd past the line at the arrival event')
res = {}
for r in R: res[r['result']] = res.get(r['result'], 0) + 1
print('arrival event:', res, '| by someone other than the target:', sum(r['other'] == 'other' for r in R))
def row(name, key, S=R):
    v = [r[key] for r in S if r.get(key) is not None]
    print(f'{name:34s} p25/p50/p75 {q(v,.25)}/{q(v)}/{q(v,.75)}  >2 yd {sum(x>2 for x in v)/max(1,len(v)):.2f}  n {len(v)}')
row('QB aim error (landing vs aim)', 'aimErr'); row('ball at arrival to the aim point', 'ballToAim'); row('aim height (yd)', 'aimZ'); row('receiver to aim at arrival', 'rcvToAim'); row('receiver to true landing', 'rcvToLand'); row('receiver moved during flight', 'rcvMoved')
row('ball-to-receiver at arrival event', 'ballToRcv'); row('closest approach within +-0.5 s', 'minDist'); row('catch reach (profile)', 'reach')
print('ball-to-receiver by 0.05 s tick around the arrival event (median):')
print('  tick  ' + ' '.join(f'{o:5d}' for o in range(-10, 11, 2)))
print('  all   ' + ' '.join(f'{(q([r["around"][str(o)] for r in R if str(o) in r["around"]]) or 0):5.2f}' for o in range(-10, 11, 2)))
print('receiver knows the flight (glance rule) at s after the throw:', q([r['knowsAt'] for r in R if r['knowsAt'] is not None]), f'({sum(r["knowsAt"] is not None for r in R)} of {n})', '| flight s', q([r['flight'] for r in R]))
for k, lab in (('b1_0', '1.0 s'), ('b0_5', '0.5 s'), ('b0_25', '0.25 s'), ('b0_1', '0.1 s')):
    v = [r['estErr'][k] for r in R if r['estErr'].get(k) is not None]; print(f'his estimated landing vs true, {lab} before arrival: p25/p50/p75 {q(v,.25)}/{q(v)}/{q(v,.75)}  n {len(v)}')
v = [r['speed']['arr'] for r in R]; vm = [r['speed']['arr'] / r['speed']['vmax'] for r in R]
print(f'receiver speed at arrival {q(v)} yd/s ({q(vm)} of his top speed); 0.5 s before {q([r["speed"]["b05"] for r in R])}; 1.0 s before {q([r["speed"]["b10"] for r in R])}')
print('hips off his travel at 0.5 s before / at arrival (deg, median):', q([r['hipsOff']['b05'] for r in R if r['hipsOff']['b05'] is not None]), '/', q([r['hipsOff']['arr'] for r in R if r['hipsOff']['arr'] is not None]), '| trunk twist at arrival (|deg|):', q([abs(r['trunk']['arr']) for r in R]))
for cov in sorted({r['coverage'] for r in R}): S = [r for r in R if r['coverage'] == cov]; print(f'  {cov:14s} n {len(S):3d} ball-to-receiver {q([r["ballToRcv"] for r in S])}  result {sorted({r["result"] for r in S})}')
