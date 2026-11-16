# When a back on a route leaves the protection, by whether an off-ball backer sat in the box (Integration on BOX_DEPTH,
# #35). Same operator on NFL tracking and sim exports (common format; offense +x, line at x = 0). Dropbacks (kind
# 'pass'); the back: an RB in the backfield at the snap.
# On a route = he leaves the protection area before the pass / end. His release: the first time he crosses the line (x > 0) or is 2.5+ yd outside the tackle box (the last lineman's y
# +- 2.5), whichever is first. Box backer: a defender who is not a DL, 1.5-5.0 yd off the ball at the snap, within the
# linemen's width +- 3.5 yd (and, separately, 3.5-5.0 yd: the men a 3.5 yd call leaves out). Reported: n, the release
# time p25/50/75, the share released by 1.0 s ("free release") and by 1.5 s, and the share of dropbacks on which the
# back ran a route at all.
# usage: python3 scripts/diag/pass-operators/back-release.py <plays.jsonl.gz> ...
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r)
        if r.get('kind') != 'pass' or not r.get('xy'): continue
        p = Play(r); dt = r['dt']; n = len(r['xy'])
        at = lambda i, t: p.pos(i, max(0, min(n - 1, int(round(t / dt)))))
        OL = [i for i in p.who('O', 'OL') if at(i, 0)[0] is not None]
        if len(OL) < 5: continue
        ys = [at(i, 0)[1] for i in OL]; lo, hi = min(ys), max(ys)
        end_t = min((r['events'].get(k) for k in ('pass', 'pass_forward', 'sack', 'end') if r['events'].get(k) is not None), default=(n - 1) * dt)
        D = [d for d in p.who('D') if r['players'][d]['group'] != 'DL' and at(d, 0)[0] is not None]
        box = [d for d in D if 1.5 <= at(d, 0)[0] <= 5.0 and lo - 3.5 <= at(d, 0)[1] <= hi + 3.5]
        box35 = [d for d in box if at(d, 0)[0] >= 3.5]
        for b in p.who('O', 'RB'):
            x0 = at(b, 0)[0]
            if x0 is None or x0 > -2: continue
            T = [k * dt for k in range(int(end_t / dt) + 1)]
            rel = next((t for t in T if at(b, t)[0] is not None and (at(b, t)[0] > 0 or at(b, t)[1] < lo - 2.5 or at(b, t)[1] > hi + 2.5)), None)
            rows.append({'route': rel is not None, 'rel': rel, 'box': len(box), 'box35': len(box35)})
    print(f'{os.path.basename(path)}: dropback backs {len(rows)}')
    for lab, S in (('backer in the box at 1.5-5 yd', [x for x in rows if x['box']]), ('  of which one at 3.5-5 yd', [x for x in rows if x['box35']]),
                   ('no backer within 5 yd', [x for x in rows if not x['box']])):
        R = [x for x in S if x['route'] and x['rel'] is not None]
        if not S: continue
        rt = [x['rel'] for x in R]
        print(f"  {lab}: n {len(S)} ({100*len(S)/len(rows):.0f}%), ran a route {100*len(R)/len(S):.0f}% | release p25/50/75 {q(rt,.25):.2f}/{q(rt):.2f}/{q(rt,.75):.2f} s | by 1.0 s {100*sum(t <= 1.0 for t in rt)/max(1,len(rt)):.0f}%, by 1.5 s {100*sum(t <= 1.5 for t in rt)/max(1,len(rt)):.0f}%")
