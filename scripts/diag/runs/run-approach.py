"""Run-side approach table (Run Game for Defense, 2026-11-23) from run-approach.mts. Defense's conventions
(pursuit-stages.py): lead = his line's angle off the line of sight, + toward the carrier's travel, against the lead a
constant-velocity intercept at his current speed needs (pursuit-an.cv_intercept); 'at the man' = request within 10 deg
of the bearing. Per designed run, each defender who comes within REACH yd of the carrier before the first hold on the
play ends it (a defender 'with a chance'):
 - closest approach (centre distance) and whether a blocker was on him there;
 - his velocity along the carrier's travel at the closest frame, against the carrier's speed (matching = 1, opposing < 0),
   and the momentum he brings against the carrier's (againstRatio = -m_d v_d.u / m_c c_s, Rules' / finish-trace sign);
 - 0.3 s before: needed lead, his request's and his achieved lead minus it; request at the man;
 - the stage that set his request over the last 0.5 s before the closest frame (mode);
 - outcome: grasped (he was a holder), missed (missed_tackle by him), or no attempt.
Usage: python3 -I run-approach.py OUT.json [OUT2.json ...]"""
import json, math, sys, collections, importlib.util, os
spec = importlib.util.spec_from_file_location('pa', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pursuit', 'pursuit-an.py'))
pa = importlib.util.module_from_spec(spec); spec.loader.exec_module(pa)
REACH, LB = 2.5, 3
def q(v, p):
    v = sorted(x for x in v if x is not None); return round(v[min(len(v) - 1, int(p * len(v)))], 2) if v else None
def sang(a, b): return math.degrees(math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]))
def angd(v, b): return abs(sang(v, b))
for path in sys.argv[1:]:
    J = json.load(open(path)); out = []
    for r in J['rows']:
        F = r['frames']; ev = r['ev']
        first_hold = next((e[0] for e in ev if e[1] == 'tackle_wrap'), None)
        holders = {e[2] for e in ev if e[1] == 'tackle_wrap'}
        missers = {e[2] for e in ev if e[1] == 'missed_tackle'}
        for k in F[0]['d']:
            best = None
            for i, f in enumerate(F):
                if first_hold is not None and f['t'] > first_hold + 0.2 + 1e-9: break
                if k not in f['d']: continue
                c, d = f['car'], f['d'][k]['pos']
                dist = math.hypot(c[0] - d[0], c[1] - d[1])
                if best is None or dist < best[0]: best = (dist, i)
            if not best or best[0] > REACH: continue
            dist, i = best; f = F[i]; c = f['car']; d = f['d'][k]; cs = math.hypot(c[2], c[3])
            u = (c[2] / cs, c[3] / cs) if cs > 1 else (1.0, 0.0)
            along_v = d['pos'][2] * u[0] + d['pos'][3] * u[1]
            eng = k in (r['eng'].get(f"{f['t']:.2f}", []))
            md, mc = r['mass'].get(k + '@d', 100), r['mass'].get(r['carrier'] + '@o', 95)
            j = max(0, i - LB); g = F[j]; gc = g['car']; gd = g['d'][k]
            b = (gc[0] - gd['pos'][0], gc[1] - gd['pos'][1])
            ic = pa.cv_intercept(gd['pos'][0], gd['pos'][1], max(1.0, math.hypot(gd['pos'][2], gd['pos'][3])), gc[0], gc[1], gc[2], gc[3])
            sgn = 1 if (b[0] * gc[3] - b[1] * gc[2]) >= 0 else -1
            need = sgn * sang(b, ic[0]) if ic else None
            req = gd.get('cmd') or gd.get('req'); vel = (gd['pos'][2], gd['pos'][3])
            dreq = sgn * sang(b, req) - need if (req and need is not None and math.hypot(*req) > 0.5) else None
            dach = sgn * sang(b, vel) - need if (need is not None and math.hypot(*vel) > 1) else None
            at_man = angd(req, b) < 10 if req and math.hypot(*req) > 0.5 else None
            stages = collections.Counter((F[m]['d'][k]['stage'] or 'none: ' + (F[m]['d'][k].get('kind') or '?')) for m in range(max(0, i - 5), i + 1) if k in F[m]['d'])
            ahead = (d['pos'][0] - c[0]) * u[0] + (d['pos'][1] - c[1]) * u[1]
            out.append(dict(ptype=r['ptype'], pos=r['pos'].get(k, '?'), outcome='grasped' if k in holders else 'missed' if k in missers else 'no attempt',
                            dist=dist, eng=eng, t=f['t'], match=along_v / cs if cs > 1 else None, against=-md * along_v / max(1, mc * cs) if cs > 1 else None,
                            cs=cs, ds=math.hypot(d['pos'][2], d['pos'][3]), ahead=ahead, need=need, dreq=dreq, dach=dach, at_man=at_man,
                            stage=stages.most_common(1)[0][0] if stages else '?', end=r['endX']))
    print(f"== {path}: {J['games']} games, env {J['env']}, designed runs {len(J['rows'])}, defenders with a chance (within {REACH} yd before the first hold) {len(out)}")
    def row(lab, X):
        if not X: return
        print(f"  {lab:<34} n {len(X):4} | closest p50 {q([x['dist'] for x in X], .5)} | blocked there {sum(x['eng'] for x in X) / len(X):.2f} | ahead of him {sum(x['ahead'] > 0 for x in X) / len(X):.2f}"
              f" | his speed along the run / carrier's p50 {q([x['match'] for x in X], .5)} (opposing < 0: {sum(1 for x in X if x['match'] is not None and x['match'] < 0) / len(X):.2f}) | againstRatio p50 {q([x['against'] for x in X], .5)}, > 0.5 {sum(1 for x in X if (x['against'] or 0) > 0.5) / len(X):.2f}"
              f" | lead: needed p50 {q([x['need'] for x in X], .5)}, request-needed p50 {q([x['dreq'] for x in X], .5)}, achieved-needed p50 {q([x['dach'] for x in X], .5)}, request under >30 {sum(1 for x in X if x['dreq'] is not None and x['dreq'] < -30) / max(1, sum(1 for x in X if x['dreq'] is not None)):.2f}"
              f" | request at the man {sum(1 for x in X if x['at_man']) / max(1, sum(1 for x in X if x['at_man'] is not None)):.2f} | carrier p50 {q([x['cs'] for x in X], .5)}, defender {q([x['ds'] for x in X], .5)}")
    free = [x for x in out if not x['eng']]
    print(' by outcome (free at closest approach):')
    for o in ('grasped', 'missed', 'no attempt'): row(o, [x for x in free if x['outcome'] == o])
    print(' by the stage that set his request (free):')
    for s, n in collections.Counter(x['stage'] for x in free).most_common(): row(s, [x for x in free if x['stage'] == s])
    print(' by position group (free):')
    grp = lambda p: 'DL' if p in ('DE', 'DT', 'NT', 'EDGE') else 'LB' if 'LB' in p else 'DB' if p in ('CB', 'S', 'FS', 'SS', 'DB', 'NB') else p
    for g in ('DL', 'LB', 'DB'): row(g, [x for x in free if grp(x['pos']) == g])
    print(' ahead of the carrier vs behind (free):')
    row('ahead (in front of him)', [x for x in free if x['ahead'] > 0]); row('behind / level', [x for x in free if x['ahead'] <= 0])
