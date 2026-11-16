"""Report for zone-man-after.mts: what each defender does from the catch to the whistle, man (cover1) vs zone.
usage: python3 -I scripts/diag/yac/zone-man-report.py out/diag/yac/cover*.json"""
import json, math, sys
from collections import Counter

rows = [r for p in sys.argv[1:] for r in json.load(open(p))]
fam = lambda r: 'man' if r['coverage'] in ('cover0', 'cover1') else 'zone'
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
mean = lambda v: sum(v) / len(v) if v else float('nan')
TACK = {'tackle_wrap', 'missed_tackle', 'broken_tackle', 'hit', 'tackle'}


def per_play(r):
    tr, d0 = r['tr'], r['dir']
    ids = [d['i'] for d in tr[0]['d']]
    S = {}
    for i in ids:
        s = []
        for f in tr:
            d = next(x for x in f['d'] if x['i'] == i); c = f['c']
            dx, dy = c['x'] - d['x'], c['y'] - d['y']; L = math.hypot(dx, dy) or 1e-9
            ux, uy = dx / L, dy / L
            sp = math.hypot(d['vx'], d['vy']); csp = math.hypot(c['vx'], c['vy'])
            close = d['vx'] * ux + d['vy'] * uy
            rel = (d['vx'] - c['vx']) * ux + (d['vy'] - c['vy']) * uy
            ang = math.degrees(math.acos(max(-1, min(1, close / sp)))) if sp > .5 else float('nan')
            # leverage: where he is relative to the carrier's run (0 = straight ahead of him, 180 = behind)
            lev = math.degrees(math.acos(max(-1, min(1, (-ux * c['vx'] - uy * c['vy']) / csp)))) if csp > .5 else float('nan')
            ahead = (d['x'] - c['x']) * d0  # + = downfield of the carrier
            rq = math.hypot(d['rvx'], d['rvy'])
            s.append(dict(t=f['t'], dist=L, sp=sp, rq=rq, close=close, rel=rel, ang=ang, lev=lev, ahead=ahead, chase=d['chase'], cls=d['cls'], lab=d['lab'], eng=d['eng'], cx=c['x']))
        S[i] = s
    arr = {i: next((x['t'] for x in s if x['dist'] < 1.0), None) for i, s in S.items()}
    order = sorted([i for i in ids if arr[i] is not None], key=lambda i: arr[i])
    return S, arr, order


def at(s, t):
    return min(s, key=lambda x: abs(x['t'] - t))


out = {'man': [], 'zone': []}
for r in rows:
    S, arr, order = per_play(r)
    end_cx = r['tr'][-1]['c']['x']
    p = dict(r=r, S=S, arr=arr, order=order)
    if order:
        f = order[0]; s = S[f]; a = at(s, arr[f]); pre = at(s, arr[f] - 0.3)
        p['yac_after1'] = (end_cx - a['cx']) * r['dir']
        p['yac_before1'] = r['yac'] - p['yac_after1']
        ev = [e for e in r['ev'] if e['type'] in TACK and (e.get('a') == f or e.get('b') == f) and e['t'] <= arr[f] + 0.6]
        p['f_ev'] = sorted({e['type'] for e in ev})
        p['f'] = dict(sp=pre['sp'], rq=pre['rq'], close=pre['close'], ang=pre['ang'], lev=a['lev'], chase=pre['chase'], cls=pre['cls'], lab=pre['lab'], t=arr[f],
                      ends=r['tr'][-1]['t'] - arr[f], slot=r['defPos'][str(f)])
    out[fam(r)].append(p)

for k in ('man', 'zone'):
    P = out[k]; R = [p for p in P if p['order']]
    print(f"== {k}: {len(P)} completions, YAC mean {mean([p['r']['yac'] for p in P]):.2f} p50 {q([p['r']['yac'] for p in P]):.1f}, catch depth {mean([p['r']['catchX'] for p in P]):.1f}")
    print(f"   reached within 1 yd {len(R) / len(P):.0%}; first arrival p25/50/75 {q([p['f']['t'] for p in R], .25):.2f}/{q([p['f']['t'] for p in R]):.2f}/{q([p['f']['t'] for p in R], .75):.2f} s")
    print(f"   YAC before first arrival {mean([p['yac_before1'] for p in R]):.2f}, after {mean([p['yac_after1'] for p in R]):.2f}; never reached: n {len(P) - len(R)} YAC {mean([p['r']['yac'] for p in P if not p['order']]):.1f}")
    F = [p['f'] for p in R]
    print(f"   first arriver 0.3 s before: speed {mean([f['sp'] for f in F]):.2f} req {mean([f['rq'] for f in F]):.2f} closing {mean([f['close'] for f in F]):.2f} angle off line p50 {q([f['ang'] for f in F if f['ang'] == f['ang']]):.0f} deg, chasing {mean([f['chase'] for f in F]):.0%}")
    lev = [f['lev'] for f in F if f['lev'] == f['lev']]
    print(f"   first arriver leverage at arrival (0 = in the carrier's path): front<60 {mean([x < 60 for x in lev]):.0%} side {mean([60 <= x < 120 for x in lev]):.0%} behind>=120 {mean([x >= 120 for x in lev]):.0%}")
    print(f"   play over within 0.5 s of first arrival {mean([f['ends'] <= .5 for f in F]):.0%}, 1.0 s {mean([f['ends'] <= 1.0 for f in F]):.0%}; his events: " +
          ', '.join(f"{e} {mean([e in p['f_ev'] for p in R]):.0%}" for e in ('tackle_wrap', 'missed_tackle', 'broken_tackle')))
    print(f"   first arriver class: {Counter(f['cls'] for f in F).most_common(4)}; slot {Counter(f['slot'] for f in F).most_common(5)}")
    # second and third arrivers
    for n, nm in ((1, '2nd'), (2, '3rd')):
        Q = [p for p in R if len(p['order']) > n]
        g = [p['arr'][p['order'][n]] - p['arr'][p['order'][0]] for p in Q]
        print(f"   {nm} arriver: present {len(Q) / len(P):.0%}, after the 1st p50 {q(g):.2f} s")
    # everyone within 8 yd at the catch who is not the first arriver: when does he start chasing, how does he close
    rows2 = []
    for p in P:
        f0 = p['order'][0] if p['order'] else None
        for i, s in p['S'].items():
            if i == f0 or s[0]['dist'] > 10 or s[0]['eng']:
                continue
            tch = next((x['t'] for x in s if x['chase']), None)
            a5, a10 = at(s, .5), at(s, 1.0)
            rows2.append(dict(d0=s[0]['dist'], tch=tch, c5=a5['close'], c10=a10['close'], sp5=a5['sp'], rq5=a5['rq'], ang10=a10['ang'], cls=s[0]['cls'], lab5=a5['lab'], ch5=a5['chase'],
                              ahead=s[0]['ahead'], rel10=a10['rel'], dmin=min(x['dist'] for x in s)))
    ch = [x['tch'] for x in rows2 if x['tch'] is not None]
    print(f"   others within 10 yd at the catch, unblocked (n {len(rows2)}): ever chase {len(ch) / max(1, len(rows2)):.0%}, start p50 {q(ch):.2f} s; chasing at +0.5 s {mean([x['ch5'] for x in rows2]):.0%}")
    print(f"     at +0.5 s speed {mean([x['sp5'] for x in rows2]):.2f} req {mean([x['rq5'] for x in rows2]):.2f} closing {mean([x['c5'] for x in rows2]):.2f}; +1.0 s closing {mean([x['c10'] for x in rows2]):.2f} gain on carrier {mean([x['rel10'] for x in rows2]):.2f}")
    nc = [x for x in rows2 if not x['ch5']]
    print(f"     not chasing at +0.5 s: {len(nc) / max(1, len(rows2)):.0%}, by class/label {Counter((x['cls'], x['lab5']) for x in nc).most_common(5)}")
    print(f"     downfield of the carrier at the catch {mean([x['ahead'] > 0 for x in rows2]):.0%}")
