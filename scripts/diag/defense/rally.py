# The rally to a short catch (Defense). One operator over the common play format (xy at 10 Hz, offence attacks +x,
# optional facing 'o' in degrees, atan2 convention) for the NFL and the sim; the sim-side rally.mts adds the request.
# Completions caught 0-12 yd past the line (catch frame: events.catch, else pass_arrived). For every defender: when he
# first comes within 1 yd of the carrier (arrival, until events.end), his distance from the carrier at the catch and
# from the catch point at the throw (pass_forward); at the catch, his velocity off the line to the carrier (under 45,
# 45-90, over 90 deg; under 1 yd/s its own bin) and, with 'o', whether he faced the QB (body within 90 deg of the line
# back to the QB's position at the throw); his achieved speed along the line to the carrier at +0.25 / +0.5 s. Rows for
# the first and second to arrive and for every defender within 8 yd of the carrier at the catch.
#   python3 -I rally.py nfl=PLAYS.jsonl.gz,BALL.jsonl.gz sim=PLAYS.jsonl.gz
import sys, gzip, json, math
def jl(p):
    for l in gzip.open(p, 'rt'): yield json.loads(l)
def at(P, f, j):
    if f < 0 or f >= len(P['xy']): return None
    x, y = P['xy'][f][2 * j], P['xy'][f][2 * j + 1]
    return None if x is None or y is None else (x, y)
def vel(P, f, j):
    a, b = at(P, f - 1, j), at(P, f + 1, j)
    return None if a is None or b is None else ((b[0] - a[0]) / (2 * P['dt']), (b[1] - a[1]) / (2 * P['dt']))
def ang(a, b): return abs(math.degrees((a - b + math.pi) % (2 * math.pi) - math.pi))
def load(spec):
    kind, files = spec.split('=', 1); files = files.split(','); out = []
    if kind.startswith('nfl'):
        ball = {b['id']: b for b in jl(files[1])} if len(files) > 1 else {}
        for p in jl(files[0]):
            b = ball.get(p['id'])
            if p['kind'] == 'pass' and p.get('target') is not None and b and b.get('passResult') == 'C': out.append(p)
    else:
        for p in jl(files[0]):
            lab = p.get('labels', {})
            if p['kind'] == 'pass' and p.get('target') is not None and 'catch' in p.get('events', {}) and not lab.get('interception'): out.append(p)
    return kind, out
def rows(P):
    ev = P['events']; dt = P['dt']
    tc = ev.get('catch', ev.get('pass_arrived'))
    if tc is None or 'pass_forward' not in ev or not P.get('bxy'): return None
    C, F = int(round(tc / dt)), int(round(ev['pass_forward'] / dt)); n = len(P['xy'])
    end = min(n - 2, int(round(ev.get('end', 1e9) / dt)) if 'end' in ev else n - 2)
    t = P['target']; c0 = at(P, C, t); los = P['bxy'][0][0]
    if c0 is None or not (0 <= c0[0] - los <= 12) or C + 6 > end: return None
    qbj = next((j for j, p in enumerate(P['players']) if p['side'] == 'O' and p.get('group') == 'QB'), None)
    qb = at(P, F, qbj) if qbj is not None else None
    R = []
    for j, pl in enumerate(P['players']):
        if pl['side'] != 'D': continue
        d0, v0, dth = at(P, C, j), vel(P, C, j), at(P, F, j)
        if d0 is None or v0 is None or dth is None: continue
        lx, ly = c0[0] - d0[0], c0[1] - d0[1]; L = math.hypot(lx, ly); sp = math.hypot(*v0)
        bin_ = 'slow' if sp < 1 else ('<45' if ang(math.atan2(v0[1], v0[0]), math.atan2(ly, lx)) < 45 else '45-90' if ang(math.atan2(v0[1], v0[0]), math.atan2(ly, lx)) < 90 else '>90')
        fq = None
        if P.get('o') and P['o'][C] and P['o'][C][j] is not None and qb:
            fq = ang(math.radians(P['o'][C][j]), math.atan2(qb[1] - d0[1], qb[0] - d0[0])) < 90
        arrive = None; m = {}
        for f in range(C, end + 1):
            a, b = at(P, f, j), at(P, f, t)
            if a is None or b is None: continue
            dx, dy = b[0] - a[0], b[1] - a[1]; D = math.hypot(dx, dy)
            if arrive is None and D < 1: arrive = (f - C) * dt
            for k, kf in ((0.25, 2), (0.5, 5)):
                if f == C + kf and D > 0.01:
                    v = vel(P, f, j)
                    if v: m[k] = (v[0] * dx + v[1] * dy) / D
        st = {}
        for lab, f in (('throw', F), ('catch', C)):
            a, b, v = at(P, f, j), at(P, f, t), vel(P, f, j)
            if a and b and v:
                dx, dy = b[0] - a[0], b[1] - a[1]; sp_ = math.hypot(*v)
                st[lab] = dict(dist=math.hypot(dx, dy), sp=sp_, head=ang(math.atan2(v[1], v[0]), math.atan2(dy, dx)) if sp_ > 0.5 else None,
                               closing=(v[0] * dx + v[1] * dy) / max(0.01, math.hypot(dx, dy)))
        R.append(dict(distCatch=L, distThrow=math.hypot(c0[0] - dth[0], c0[1] - dth[1]), bin=bin_, faceQB=fq, arrive=arrive, m=m, st=st))
    vt = vel(P, C, t)
    fam = 'stopped' if vt is None or math.hypot(*vt) < 2 else ('vertical' if vt[0] > abs(vt[1]) else 'across') if True else ''
    if fam == 'across':
        inward = -math.copysign(1, c0[1] - P['bxy'][0][1]) if abs(c0[1] - P['bxy'][0][1]) > 0.5 else 0
        fam = 'in / across' if vt[1] * inward > 0 else 'out / to the sideline'
    depth = c0[0] - los
    for r in R: r['fam'] = f"{'0-4' if depth < 4 else '4-8' if depth < 8 else '8-12'} yd, {fam}"
    return R
def q(v, p):
    v = sorted(x for x in v if x is not None)
    return v[min(len(v) - 1, int(p * (len(v) - 1) + .5))] if v else float('nan')
for spec in sys.argv[1:]:
    kind, plays = load(spec); per = [r for r in (rows(p) for p in plays) if r]
    first = [sorted([x for x in r if x['arrive'] is not None], key=lambda x: x['arrive']) for r in per]
    print(f"== {kind}: {len(per)} short completions (0-12 yd); first arrives {sum(len(a) >= 1 for a in first) / max(1, len(per)):.2f}, second {sum(len(a) >= 2 for a in first) / max(1, len(per)):.2f}")
    for lab, k in (('first', 0), ('second', 1)):
        S = [a[k] for a in first if len(a) > k]
        print(f"  {lab}: arrival p25/p50/p75 {q([s['arrive'] for s in S], .25):.2f}/{q([s['arrive'] for s in S], .5):.2f}/{q([s['arrive'] for s in S], .75):.2f} s | from the carrier at the catch {q([s['distCatch'] for s in S], .5):.1f} yd, from the catch point at the throw {q([s['distThrow'] for s in S], .5):.1f} yd")
    N = [x for r in per for x in r if x['distCatch'] < 8]
    print(f"  every defender within 8 yd at the catch (n {len(N)}), by his velocity off the line to the carrier and facing:")
    for b in ('<45', '45-90', '>90', 'slow'):
        for fq in ((True, False) if any(x['faceQB'] is not None for x in N) else (None,)):
            S = [x for x in N if x['bin'] == b and x['faceQB'] == fq]
            if len(S) < 10: continue
            lab = 'facing QB ' if fq else 'back to QB' if fq is False else 'any facing'
            print(f"    {b:5s} {lab} n {len(S):5d} | along the line got +0.25 s {q([s['m'].get(0.25) for s in S], .5):.2f} +0.5 s {q([s['m'].get(0.5) for s in S], .5):.2f} | arrives {sum(s['arrive'] is not None for s in S) / len(S):.2f}, p50 {q([s['arrive'] for s in S], .5):.2f} s | dist at catch {q([s['distCatch'] for s in S], .5):.1f}")

    print("  position and motion of the first and second to arrive, and of the nearest two at the catch, at the throw and at the catch (dist / speed / heading off the line to the catcher / closing speed):")
    fams = sorted({x['fam'] for r in per for x in r})
    def cell(S, lab):
        X = [s['st'].get(lab) for s in S if s['st'].get(lab)]
        return f"{q([x['dist'] for x in X], .5):4.1f} / {q([x['sp'] for x in X], .5):3.1f} / {q([x['head'] for x in X], .5):3.0f} / {q([x['closing'] for x in X], .5):4.1f}"
    for fam in ['all'] + fams:
        P_ = [r for r in per if fam == 'all' or (r and r[0]['fam'] == fam)]
        if len(P_) < 15: continue
        arr = [sorted([x for x in r if x['arrive'] is not None], key=lambda x: x['arrive']) for r in P_]
        near = [sorted(r, key=lambda x: x['distCatch']) for r in P_]
        A1 = [a[0] for a in arr if a]; A2 = [a[1] for a in arr if len(a) > 1]; N1 = [r[0] for r in near if r]; N2 = [r[1] for r in near if len(r) > 1]
        print(f"    {fam:28s} n {len(P_):4d} | 1st to arrive ({len(A1) / len(P_):.2f}) throw {cell(A1, 'throw')} catch {cell(A1, 'catch')} | 2nd ({len(A2) / len(P_):.2f}) throw {cell(A2, 'throw')} catch {cell(A2, 'catch')} | nearest at catch: 1st {cell(N1, 'catch')}, 2nd {cell(N2, 'catch')}")
