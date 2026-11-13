"""QB lane, 2026-11-13: come-off-set.py's detection, copied, with the 0.5 s after-window audited.
How often the window is cut by the throw, QB movement on full vs cut windows, the rusher's distance at the come-off,
and by-eye traces (QB xy and rusher distance, frame by frame). usage: python3 -I comeoff_check.py <plays.jsonl.gz> [trace-seed]"""
import sys, os, json, gzip, math, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
NEAR, OFF = 1.2, 1.5
path = sys.argv[1]; rows = []; drop = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'pass' or not raw.get('xy'): continue
    p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
    if not qbs: continue
    qb = qbs[0]; OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
    if len(OL) < 5: continue
    drop += 1
    ys = sorted(OL, key=lambda o: p.pos(o, 0)[1]); tackle = {ys[0], ys[-1]}
    fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
    for d in [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] in ('DL', 'LB')]:
        last = None
        for k in range(max(1, p.k(0.5)), kend + 1):
            rx, ry = p.pos(d, k); qx, qy = p.pos(qb, k)
            if rx is None or qx is None: break
            near = [(math.hypot(p.pos(o, k)[0] - rx, p.pos(o, k)[1] - ry), o) for o in OL if p.pos(o, k)[0] is not None]
            dist, o = min(near) if near else (99, None)
            if o is not None and dist <= NEAR: last = o; continue
            if last is None or dist <= OFF: continue
            o0 = last; last = None; since = k
            while since > 0 and p.pos(o0, since - 1)[0] is not None and p.pos(d, since - 1)[0] is not None and p.dist(d, o0, since - 1) <= OFF: since -= 1
            held = (k - since) * p.dt
            ux, uy = rx - qx, ry - qy; ul = math.hypot(ux, uy) or 1e-6; ux, uy = ux / ul, uy / ul
            ka = min(kend, k + p.k(0.5)); ax, ay = p.pos(qb, ka)
            if ax is None: continue
            k3 = max(0, k - p.k(0.3)); px, _ = p.pos(qb, k3)
            setq = px is not None and (qx - px) / 0.3 > -0.5
            win = (ka - k) * p.dt
            tow = (ax - qx) * ux + (ay - qy) * uy
            sp = math.hypot(ax - qx, ay - qy)
            k4 = min(p.frames - 1, k + p.k(0.4))
            # Stays off: 0.4 s later he is beyond 2.0 yd of every lineman (not hovering at arm's length), and nearer the QB.
            later = [p.dist(d, o, k4) for o in OL if p.pos(o, k4)[0] is not None and p.pos(d, k4)[0] is not None]
            free = bool(later) and min(later) > 2.0
            closing = p.pos(d, k4)[0] is not None and p.pos(qb, k4)[0] is not None and math.hypot(p.pos(d, k4)[0] - qx, p.pos(d, k4)[1] - qy) < ul - 0.5
            k5 = max(0, k - p.k(0.5)); p5 = p.pos(qb, k5)
            pre = math.hypot(qx - p5[0], qy - p5[1]) / 0.5 if p5[0] is not None else None
            rows.append(dict(pre=pre, behind=qx < 0, free=free, closing=closing, id=raw.get('id'), d=d, o=o0, k=k, held=held, cls='tackle' if o0 in tackle else 'interior', set=setq, win=win, tow=tow, sp=sp,
                             toQB=ul, thrown=fw is not None, fw=fw, t=k * p.dt, p=p, qb=qb, kend=kend, out=('throw' if fw is not None else 'no throw'), yards=raw.get('yards')))
R = [r for r in rows if r['held'] >= 0.5]
print(f"== {os.path.basename(path)}: dropbacks {drop}, come-offs (own blocker >= 0.5 s) {len(R)}")
full = [r for r in R if r['win'] >= 0.5 - 1e-9]; cut = [r for r in R if r['win'] < 0.5 - 1e-9]
print(f"   stays off at +0.4 s: {100*sum(r['free'] for r in R)/max(1,len(R)):.0f}% of come-offs; off and closing: {100*sum(r['free'] and r['closing'] for r in R)/max(1,len(R)):.0f}%")
print(f"   after-window: full 0.5 s {len(full)} ({100*len(full)/max(1,len(R)):.0f}%), cut by the throw/end {len(cut)}; cut window p50 {q([r['win'] for r in cut]):.2f} s")
for lab, S in (('all', R), ('full window', full), ('cut', cut), ('full, set', [r for r in full if r['set']]), ('full, dropping', [r for r in full if not r['set']]),
               ('full, stays off (>2 yd of every OL at +0.4)', [r for r in full if r['free']]), ('full, hovering (within 2 yd)', [r for r in full if not r['free']]),
               ('full, off and closing 0.5+ yd', [r for r in full if r['free'] and r['closing']]),
               ('full, QB still before (< 1 yd/s over prior 0.5 s)', [r for r in full if r['pre'] is not None and r['pre'] < 1 and r['behind']]),
               ('  still + stays off', [r for r in full if r['pre'] is not None and r['pre'] < 1 and r['behind'] and r['free']]),
               ('  still + off and closing', [r for r in full if r['pre'] is not None and r['pre'] < 1 and r['behind'] and r['free'] and r['closing']]),
               ('  still + off, closing, rusher <= 5 yd', [r for r in full if r['pre'] is not None and r['pre'] < 1 and r['behind'] and r['free'] and r['closing'] and r['toQB'] <= 5]),
               ('  still + hovering', [r for r in full if r['pre'] is not None and r['pre'] < 1 and r['behind'] and not r['free']]),
               ('full, QB moving 1-3 yd/s before', [r for r in full if r['pre'] is not None and 1 <= r['pre'] < 3]),
               ('full, QB already running (>= 3 yd/s) before', [r for r in full if r['pre'] is not None and r['pre'] >= 3]),
               ('full, rusher <= 4 yd', [r for r in full if r['toQB'] <= 4]), ('full, rusher 4-6', [r for r in full if 4 < r['toQB'] <= 6]), ('full, rusher > 6', [r for r in full if r['toQB'] > 6])):
    if not S: continue
    print(f"   {lab:48s} n {len(S):4d} | toward rusher p25/50/75 {q([r['tow'] for r in S],.25):+.2f}/{q([r['tow'] for r in S]):+.2f}/{q([r['tow'] for r in S],.75):+.2f}"
          f" | moved >= 0.5 away {100*sum(r['tow'] <= -0.5 for r in S)/len(S):.0f}% | any displacement p50/p75 {q([r['sp'] for r in S]):.2f}/{q([r['sp'] for r in S],.75):.2f}"
          f" | rusher to QB p50 {q([r['toQB'] for r in S]):.1f} | t p50 {q([r['t'] for r in S]):.1f}")
if len(sys.argv) > 2:
    rnd = random.Random(int(sys.argv[2]))
    for r in rnd.sample(R, min(12, len(R))):
        p, k, qb, d = r['p'], r['k'], r['qb'], r['d']
        print(f"   -- {r['id']} t {r['t']:.1f}s {r['cls']} {'set' if r['set'] else 'dropping'} rusher {p.players[d].get('slot', d)} off {p.players[r['o']].get('slot', r['o'])} close {r['held']:.1f}s, toQB {r['toQB']:.1f}, {r['out']} at {r['fw']}, yards {r['yards']}")
        fr = range(max(0, k - 6), min(p.frames, k + 9), 2)
        print('      t      ' + ' '.join(f"{j*p.dt:5.1f}" for j in fr))
        print('      QB x   ' + ' '.join(f"{p.pos(qb,j)[0]:5.1f}" if p.pos(qb,j)[0] is not None else '    -' for j in fr))
        print('      QB y   ' + ' '.join(f"{p.pos(qb,j)[1]:5.1f}" if p.pos(qb,j)[0] is not None else '    -' for j in fr))
        print('      r->QB  ' + ' '.join(f"{p.dist(d,qb,j):5.1f}" if p.pos(d,j)[0] is not None and p.pos(qb,j)[0] is not None else '    -' for j in fr))
        print('      r->OL  ' + ' '.join(f"{p.dist(d,r['o'],j):5.1f}" if p.pos(d,j)[0] is not None and p.pos(r['o'],j)[0] is not None else '    -' for j in fr))
