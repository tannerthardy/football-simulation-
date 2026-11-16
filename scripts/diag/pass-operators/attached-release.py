# An attached end's release on pass plays, NFL tracking vs sim exports with one operator (#35 item 2). Common format
# (offense +x, line at x = 0). Attached end: a TE at the snap within 1.5 yd of the line and 0.5-2.5 yd outside the
# outermost lineman on his side. On a route: past 5 yd downfield by 3.0 s (or the pass/end, whichever is first) -
# a kept-in or chipping end that never gets there is left out. "Covered": a DL or LB at the snap 0-2.5 yd ahead of
# him and within 1.5 yd laterally (receiver.ts RELEASE_SEEN's tight box). Contact: centres within 1.0 yd.
# Per class: depth past the line at 0.5 / 1.0 / 1.5 / 2.0 s; first contact with a DL/LB within 1.2 s and its time;
# the end's downfield speed over the 0.3 s after that contact; the covering man's depth at 1.0 s (rushing = behind
# the line). usage: python3 scripts/diag/pass-operators/attached-release.py <plays.jsonl.gz> ...
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r)
        if r.get('kind') != 'pass' or not r.get('xy'): continue
        p = Play(r); dt = r['dt']; n = len(r['xy'])
        at = lambda i, t: p.pos(i, min(n - 1, int(round(t / dt))))
        OL = [i for i in p.who('O', 'OL') if at(i, 0)[0] is not None]
        if len(OL) < 5: continue
        ys = [at(i, 0)[1] for i in OL]
        end_t = min((r['events'].get(k) for k in ('pass', 'pass_forward', 'sack', 'end') if r['events'].get(k) is not None), default=(n - 1) * dt)
        DEF = [i for i in p.who('D') if r['players'][i]['group'] in ('DL', 'LB') and at(i, 0)[0] is not None]
        for i in p.who('O', 'TE'):
            x0, y0 = at(i, 0)
            if x0 is None or x0 < -1.5: continue
            out = 1 if y0 > (min(ys) + max(ys)) / 2 else -1
            w = (y0 - (max(ys) if out > 0 else min(ys))) * out
            if not (0.5 <= w <= 2.5): continue
            tr = min(3.0, end_t)
            if max((at(i, k * dt)[0] or -9) for k in range(int(tr / dt) + 1)) < 5: continue
            cov = [d for d in DEF if 0 <= at(d, 0)[0] - x0 <= 2.5 and abs(at(d, 0)[1] - y0) <= 1.5]
            first = None
            for k in range(int(min(1.2, end_t) / dt) + 1):
                for d in DEF:
                    a, b = at(i, k * dt), at(d, k * dt)
                    if a[0] is not None and b[0] is not None and math.hypot(a[0] - b[0], a[1] - b[1]) <= 1.0: first = (k * dt, d); break
                if first: break
            after = None
            if first:
                t0 = first[0]; t1 = min(t0 + 0.3, end_t)
                if t1 > t0 + dt / 2 and at(i, t1)[0] is not None: after = (at(i, t1)[0] - at(i, t0)[0]) / (t1 - t0)
            dep = {t: at(i, t)[0] for t in (0.5, 1.0, 1.5, 2.0) if t <= end_t}
            rows.append({'cov': bool(cov), 'covRush': bool(cov) and all((at(d, 1.0)[0] or 9) < 0.5 for d in cov), 'first': first[0] if first else None,
                         'firstCov': bool(first and first[1] in cov), 'after': after, 'dep': dep, 'x0': x0})
    print(f'{os.path.basename(path)}: attached ends on a route {len(rows)}')
    for lab, S in (('covered (DL/LB over him)', [r for r in rows if r['cov']]), ('  covering man rushes', [r for r in rows if r['covRush']]), ('uncovered', [r for r in rows if not r['cov']])):
        if not S: print(f'  {lab}: none'); continue
        c = [r for r in S if r['first'] is not None]
        deps = ' '.join(f"{t}s {q([r['dep'][t] for r in S if t in r['dep']]):.2f}" for t in (0.5, 1.0, 1.5, 2.0))
        print(f"  {lab} n {len(S)} ({100*len(S)/len(rows):.0f}%) | stance x0 {q([r['x0'] for r in S]):.2f} | depth {deps} | contact by 1.2 s {100*len(c)/len(S):.0f}% "
              f"(the covering man {100*sum(r['firstCov'] for r in c)/max(1,len(c)):.0f}%), at p50 {q([r['first'] for r in c]):.2f} s | downfield speed 0.3 s after p25/50 "
              f"{q([r['after'] for r in c if r['after'] is not None], .25):.2f}/{q([r['after'] for r in c if r['after'] is not None]):.2f}")
