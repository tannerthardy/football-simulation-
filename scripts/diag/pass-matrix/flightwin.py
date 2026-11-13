"""Flight-window timeline of the break on the ball (Defense, C9; report only). Same code on NFL and sim plays
(common format). Extends flight.py from one 0.4 s mean to a timeline.

Population: targeted passes with pass_forward and pass_arrived; defenders other than linemen 3-8 yd from the eventual
catch point (the target at pass_arrived) at the throw. For each: speed toward the catch point (velocity from
0.1 s position differences, projected on the line to the catch point) from 0.5 s before the release to arrival.

Break onset: the first frame from 0.5 s before the release on with speed toward the catch point >= 2.0 yd/s that
holds for the next frame too. Reported relative to the release (negative = before it), with the share already
breaking 0.5 s before (onset = -0.5) and the share never breaking before arrival.
Before the break: his speed and downfield velocity 0.3 s before onset (settled vs still drifting).

Splits: coverage family; role (NFL by alignment at the snap: S if 8+ yd deep, CB if 10+ yd from the ball laterally,
else slot; LB by group; sim by the record's slot); flight time; his depth against the catch point at the throw.

  python3 -I flightwin.py <plays.jsonl.gz>[,more] [covfam.json]
"""
import sys, json, gzip, math, statistics as S, collections as C

NFL_COV = {'Cover-0': 'C0', 'Cover-1': 'C1', 'Cover-1 Double': 'C1', 'Cover-2': 'C2', '2-Man': '2-Man', 'Cover-3': 'C3',
           'Cover-3 Seam': 'C3', 'Cover-3 Cloud Left': 'C3', 'Cover-3 Cloud Right': 'C3', 'Cover-3 Double Cloud': 'C3',
           'Quarters': 'C4', 'Cover 6-Left': 'C6', 'Cover-6 Right': 'C6'}
SIM_FAM = {'cover0': 'C0', 'cover1': 'C1', 'cover2man': '2-Man', 'cover2': 'C2', 'tampa2': 'C2', 'cover3': 'C3', 'cover4': 'C4', 'cover6': 'C6'}
TS = [-0.4, -0.2, 0.0, 0.2, 0.4, 0.6, 0.8]


def q(v, f=.5):
    v = sorted(v)
    return v[int(f * (len(v) - 1))] if v else float('nan')


def role(a, x0, y0, by):
    sl = a.get('slot')
    if sl:
        return 'S' if sl in ('FS', 'SS') else 'CB' if sl.startswith('CB') else 'slot' if sl in ('NB', 'DB') else 'LB' if sl.startswith('LB') else 'DL'
    g = a['group']
    return 'LB' if g == 'LB' else 'DL' if g == 'DL' else ('S' if x0 >= 8 else 'CB' if abs(y0 - by) >= 10 else 'slot')


def main():
    paths = sys.argv[1].split(',')
    fam = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {}
    R = C.defaultdict(list)
    for path in paths:
        for l in gzip.open(path, 'rt'):
            p = json.loads(l); p = p.get('common', p)
            if p.get('kind') != 'pass': continue
            lab = (p.get('cell') or {}).get('coverage')
            cov = NFL_COV.get(lab) or SIM_FAM.get(fam.get(lab, lab))
            if not cov: continue
            ev = p['events']; t = p.get('target'); thr, arr = ev.get('pass_forward'), ev.get('pass_arrived')
            if t is None or thr is None or arr is None: continue
            X = p['xy']; dt = p.get('dt', 0.1); f0 = int(round(thr / dt)); f1 = min(len(X) - 1, int(round(arr / dt)))
            if f1 - f0 < 3 or f0 < 6: continue
            pos = lambda d, k: (X[k][2 * d], X[k][2 * d + 1])
            if pos(t, f1)[0] is None: continue
            cp = pos(t, f1); by = p['ball_y']; flight = (f1 - f0) * dt
            for d, a in enumerate(p['players']):
                if a['side'] != 'D' or a['group'] == 'DL': continue
                if any(pos(d, k)[0] is None for k in range(f0 - 6, f1 + 1)) or pos(d, 0)[0] is None: continue
                if not 3 <= math.dist(pos(d, f0), cp) < 8: continue
                rl = role(a, *pos(d, 0), by)
                if rl == 'DL': continue

                def tw(k):  # speed toward the catch point over [k-1, k]
                    (x0, y0), (x1, y1) = pos(d, k - 1), pos(d, k)
                    vx, vy = (x1 - x0) / dt, (y1 - y0) / dt; ux, uy = cp[0] - x1, cp[1] - y1; L = math.hypot(ux, uy) or 1
                    return (vx * ux + vy * uy) / L, vx, math.hypot(vx, vy)
                series = {k: tw(k) for k in range(f0 - 5, f1 + 1)}
                onset = next((k for k in range(f0 - 5, f1) if series[k][0] >= 2.0 and series[k + 1][0] >= 2.0), None)
                pre = series.get(onset - 3) if onset is not None and onset - 3 >= f0 - 5 else None
                over = pos(d, f0)[0] - cp[0]
                R[(cov, rl)].append({'tl': {T: series.get(f0 + int(round(T / dt)), (None,))[0] for T in TS},
                                     'onset': None if onset is None else (onset - f0) * dt, 'flight': flight,
                                     'pre': pre, 'over': over})
    print(f"== {','.join(x.split('/')[-1] for x in paths)}")
    print('  family/role        n   | speed toward the catch point (yd/s) at t from the release ' + ' '.join(f'{T:+.1f}' for T in TS))
    print('                           | break onset p25/p50/p75 (s from release), already at -0.5, never | 0.3 s before onset: speed, downfield')
    for key in sorted(R):
        V = R[key]
        if len(V) < 20: continue
        tl = ' '.join(f"{S.mean([v['tl'][T] for v in V if v['tl'][T] is not None]):+5.2f}" for T in TS)
        on = [v['onset'] for v in V if v['onset'] is not None]; never = sum(v['onset'] is None for v in V) / len(V)
        early = sum(o <= -0.5 + 1e-9 for o in on) / len(V)
        pre = [v['pre'] for v in V if v['pre']]
        print(f"  {key[0]:5}/{key[1]:5} {len(V):5} | {tl}")
        print(f"                           | {q(on, .25):+.1f}/{q(on):+.1f}/{q(on, .75):+.1f}  at -0.5 {early:3.0%} never {never:3.0%} | "
              f"{q([x[2] for x in pre]):.1f} yd/s, vx {q([x[1] for x in pre]):+.1f}")
    print('  zone families pooled (C2, C3, C4, C6): onset p50 by flight time and by depth against the catch point')
    Z = [v for k, V in R.items() if k[0] in ('C2', 'C3', 'C4', 'C6') for v in V]
    for name, f in (('flight < 0.6 s', lambda v: v['flight'] < 0.6), ('flight 0.6-1.0', lambda v: 0.6 <= v['flight'] <= 1.0), ('flight > 1.0', lambda v: v['flight'] > 1.0),
                    ('over the catch point (2+ yd)', lambda v: v['over'] > 2), ('level', lambda v: -2 <= v['over'] <= 2), ('under (2+ yd)', lambda v: v['over'] < -2)):
        X = [v for v in Z if f(v)]
        on = [v['onset'] for v in X if v['onset'] is not None]
        if len(X) < 20: continue
        print(f"    {name:30} n {len(X):5} onset p25/50/75 {q(on, .25):+.1f}/{q(on):+.1f}/{q(on, .75):+.1f} never {sum(v['onset'] is None for v in X) / len(X):3.0%} "
              f"| toward at +0.2 {S.mean([v['tl'][0.2] for v in X if v['tl'][0.2] is not None]):+.2f} at +0.4 {S.mean([v['tl'][0.4] for v in X if v['tl'][0.4] is not None]):+.2f}")


if __name__ == '__main__':
    main()
