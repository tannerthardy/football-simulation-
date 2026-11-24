"""Block release operator (2026-11-24), positions only, one formula for NFL and sim plays. Measurement only.

A play: {ptype: 'run'|'pass', dpos: {id: position}, frames: [{t, car: id|None, off: {id: [x, y]}, def: {id: [x, y]}}]}
(10 Hz from the snap; +x is the offense's attack direction; car is the ball carrier other than a pocket QB, or None).

Release: a defender engaged with a blocker (some offensive non-carrier within ENG yd for >= ENG_MIN s) whose distance
to that blocker then opens past OPEN yd and keeps opening for 0.2 s. The release frame is the first frame past OPEN.
Per release:
 - his speed at the release and at +0.2 / +0.3 / +0.5 / +1.0 s (velocity from centred 0.2 s position differences);
 - peak acceleration (speed change over 0.2 s) within 1 s and when it comes;
 - first movement at +0.3 s relative to the carrier: toward him (within 45 deg of the bearing to him), along the line
   (|vy| > |vx|), or downfield (vx > 0, away from the line toward his own goal);
 - time from the release until the carrier passes his level (carrier x >= his x), when there is a carrier;
 - once the carrier is past his level: his speed 0.5 s later, and whether he chases (velocity along the carrier's
   travel > 3 yd/s).
Usage (sim plays file or NFL rows file): python3 -I release-op.py PLAYS.json ROWS-out.json   (plays -> rows)
                                         python3 -I release-op.py --tables ROWS.json"""
import json, math, sys, collections
ENG, ENG_MIN, OPEN = 1.2, 0.3, 1.5
GRP = {'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'EDGE': 'DL', 'OLB': 'LB', 'ILB': 'LB', 'MLB': 'LB', 'LB': 'LB', 'CB': 'DB', 'S': 'DB', 'SS': 'DB', 'FS': 'DB', 'DB': 'DB', 'NB': 'DB'}

def vel(fr, i, key, pid):
    a, b = max(0, i - 1), min(len(fr) - 1, i + 1)
    pa, pb = fr[a][key].get(pid), fr[b][key].get(pid)
    dt = fr[b]['t'] - fr[a]['t']
    if not pa or not pb or dt <= 0: return None
    return ((pb[0] - pa[0]) / dt, (pb[1] - pa[1]) / dt)

def analyse_play(p):
    fr = p['frames']; rows = []
    if len(fr) < 8: return rows
    n = len(fr)
    for did in fr[0]['def']:
        i = 0
        while i < n:
            f = fr[i]; dp = f['def'].get(did)
            if not dp: i += 1; continue
            # nearest offensive blocker (not the carrier)
            near = [(math.dist(dp, op), oid) for oid, op in f['off'].items() if oid != f.get('car')]
            if not near or min(near)[0] > ENG: i += 1; continue
            bid = min(near)[1]; j = i
            while j < n and fr[j]['def'].get(did) and fr[j]['off'].get(bid) and math.dist(fr[j]['def'][did], fr[j]['off'][bid]) <= OPEN: j += 1
            if (fr[min(j, n - 1)]['t'] - f['t']) < ENG_MIN or j >= n - 3: i = j + 1; continue
            # opening past OPEN and still opening 0.2 s later
            d0 = math.dist(fr[j]['def'][did], fr[j]['off'][bid]) if fr[j]['def'].get(did) and fr[j]['off'].get(bid) else None
            k2 = min(n - 1, j + 2)
            d2 = math.dist(fr[k2]['def'][did], fr[k2]['off'][bid]) if fr[k2]['def'].get(did) and fr[k2]['off'].get(bid) else None
            if d0 is None or d2 is None or d2 <= d0: i = j + 1; continue
            rows.append(release_row(p, did, j)); break  # first release per defender per play
        # next defender
    return [r for r in rows if r]

def release_row(p, did, j):
    fr = p['frames']; n = len(fr); t0 = fr[j]['t']
    def sp_at(dt):
        k = min(n - 1, j + round(dt * 10)); v = vel(fr, k, 'def', did)
        return math.hypot(*v) if v else None
    speeds = {f's{dt}': sp_at(dt) for dt in (0, 0.2, 0.3, 0.5, 1.0)}
    peak, peak_t = None, None
    for k in range(j, min(n - 2, j + 10)):
        a, b = vel(fr, k, 'def', did), vel(fr, k + 2, 'def', did)
        if a and b:
            acc = (math.hypot(*b) - math.hypot(*a)) / 0.2
            if peak is None or acc > peak: peak, peak_t = acc, fr[k]['t'] - t0
    k3 = min(n - 1, j + 3); v3 = vel(fr, k3, 'def', did); car = fr[k3].get('car'); first = None
    if v3 and math.hypot(*v3) > 0.5:
        dp = fr[k3]['def'][did]
        cp = fr[k3]['off'].get(car) if car else None
        if cp:
            b = (cp[0] - dp[0], cp[1] - dp[1])
            ang = abs(math.degrees(math.atan2(v3[0] * b[1] - v3[1] * b[0], v3[0] * b[0] + v3[1] * b[1])))
            first = 'toward carrier' if ang <= 45 else 'along the line' if abs(v3[1]) > abs(v3[0]) else 'downfield' if v3[0] > 0 else 'upfield'
        else:
            first = 'along the line' if abs(v3[1]) > abs(v3[0]) else 'downfield' if v3[0] > 0 else 'upfield'
    # carrier passes his level
    pass_t, after_sp, chase = None, None, None
    for k in range(j, n):
        car = fr[k].get('car'); cp = fr[k]['off'].get(car) if car else None; dp = fr[k]['def'].get(did)
        if cp and dp and cp[0] >= dp[0]:
            pass_t = fr[k]['t'] - t0
            k5 = min(n - 1, k + 5); v = vel(fr, k5, 'def', did); cv = vel(fr, k5, 'off', car) if fr[k5]['off'].get(car) else None
            if v: after_sp = math.hypot(*v)
            if v and cv and math.hypot(*cv) > 1: chase = (v[0] * cv[0] + v[1] * cv[1]) / math.hypot(*cv) > 3
            break
    return dict(ptype=p['ptype'], grp=GRP.get(p['dpos'].get(did) or '', p['dpos'].get(did) or '?'), t=round(t0, 1), peak=peak, peak_t=peak_t, first=first,
                to_pass=pass_t, after_sp=after_sp, chase=chase, **speeds)

def q(v, pct):
    v = sorted(x for x in v if x is not None); return round(v[min(len(v) - 1, int(pct * len(v)))], 2) if v else None

def tables(R):
    print(f'releases: {len(R)}')
    for lab, keep in [('all', lambda r: True)] + [(f'{pt} {g}', (lambda pt, g: lambda r: r['ptype'] == pt and r['grp'] == g)(pt, g)) for pt in ('run', 'pass') for g in ('DL', 'LB', 'DB')]:
        X = [r for r in R if keep(r)]
        if len(X) < 10: continue
        fc = collections.Counter(r['first'] for r in X if r['first']); nf = sum(fc.values()) or 1
        P = [r for r in X if r['to_pass'] is not None]
        print(f"  {lab:<8} n {len(X):>5} | speed at release / +0.2 / +0.3 / +0.5 / +1.0 s p50 {q([r['s0'] for r in X], .5)} / {q([r['s0.2'] for r in X], .5)} / {q([r['s0.3'] for r in X], .5)} / {q([r['s0.5'] for r in X], .5)} / {q([r['s1.0'] for r in X], .5)}"
              f" | peak accel p50 {q([r['peak'] for r in X], .5)} yd/s2 at +{q([r['peak_t'] for r in X], .5)} s"
              f" | first move: " + ', '.join(f'{k} {100 * v / nf:.0f}%' for k, v in fc.most_common())
              + f" | release -> carrier passes his level p50 {q([r['to_pass'] for r in P], .5)} s (n {len(P)})"
              + f" | after he is passed: speed +0.5 s p50 {q([r['after_sp'] for r in P], .5)}, chasing (> 3 yd/s along his travel) {100 * sum(1 for r in P if r['chase']) / max(1, sum(1 for r in P if r['chase'] is not None)):.0f}%")

if __name__ == '__main__':
    if sys.argv[1] == '--tables':
        tables(json.load(open(sys.argv[2])))
    else:
        plays = json.load(open(sys.argv[1])); rows = []
        for p in (plays['plays'] if isinstance(plays, dict) else plays): rows.extend(analyse_play(p))
        json.dump(rows, open(sys.argv[2], 'w')); print('rows', len(rows)); tables(rows)
