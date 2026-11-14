"""QB lane, 2026-11-13: what the QB's not-still time is made of, his response to a near body by where it is, and what
picks his direction. Same code on NFL tracking and sim exports. Non-designed dropbacks, frames while he is in the
pocket (escape.py's box) and has the ball.
  1 TIME: from 0.5 s to the throw. DROP = until his backward speed first stays < 0.5 yd/s for 0.2 s. After it each
    frame is STILL (< 1 yd/s), NEAR-BODY (moving, a DL/LB within 3 yd), UP (moving, none within 3 yd, mostly +x) or
    DRIFT (moving, none within 3 yd, lateral or back).
  2 EVENT: after the drop, the first frame a DL/LB is within D yd (3, then 2) with the ball still in his hand 0.2 s
    later. Bearing of that body from +x (field) and, where the source has orientation, from his body facing.
    Response = displacement over the next 0.5 s (cut plays dropped): moved >= 1 yd; and how the play ends.
  3 DIRECTION: on responses >= 1 yd, his heading vs straight away from the body, vs the most open of 8 directions
    (the point 3 yd that way with the largest distance to any DL/LB), and up/lateral/back by where the body is.
usage: python3 -I pocket.py <plays.jsonl.gz> [--plays-csv plays.csv]"""
import sys, json, gzip, math, csv, re, os, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
def held_end(raw, p, qb, kend):
    """Last frame the QB can still have the ball on a play with no forward pass: the frame before the ball's track
    (sim exports' `bxy`) is first more than 2.5 yd from him (a strip, a fumble, a lateral). Without it a strip-sack's
    return is read as the QB running (he is chasing the returner). NFL files carry no ball track or fumble event."""
    b = raw.get('bxy')
    if not b or raw['events'].get('pass_forward') is not None: return kend
    for k in range(min(kend, len(b) - 1) + 1):
        x, y = p.pos(qb, k); bb = b[k]
        if x is None or not bb or bb[0] is None: continue
        if math.hypot(bb[0] - x, bb[1] - y) > 2.5: return max(0, k - 1)
    return kend

args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
def q(v, p=.5):
    v = sorted(x for x in v if x is not None)
    return v[int(p * (len(v) - 1))] if v else float('nan')
pct = lambda a, b: f"{100*a/max(1,b):.0f}%"
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
wrap = lambda a: math.atan2(math.sin(a), math.cos(a))
for path in args:
    TD = collections.defaultdict(list); DD = collections.defaultdict(list); T = collections.defaultdict(lambda: collections.Counter()); EV = {3: [], 2: []}; n = collections.Counter()
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        pf = PFF.get(raw['id'])
        if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
        if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
        p = Play(raw); qbs = p.who('O', 'QB')
        if not qbs or p.pos(qbs[0], 0)[0] is None: continue
        qb = qbs[0]; ev = raw['events']; fw = ev.get('pass_forward'); by = raw['ball_y']
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        width = max(abs(p.pos(o, 0)[1] - by) for o in OL) + 0.5; y0 = p.pos(qb, 0)[1]
        aln = 'gun' if p.pos(qb, 0)[0] < -3 else 'under'; n[aln] += 1
        kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        kend = held_end(raw, p, qb, kend)
        RU = [d for d in p.who('D') if p.players[d]['group'] in ('DL', 'LB')]
        ori = raw.get('o')
        def vel(k):
            k1, k0 = min(p.frames - 1, k + 1), max(0, k - 2)
            a, b = p.pos(qb, k1), p.pos(qb, k0)
            return None if a[0] is None or b[0] is None or k1 == k0 else ((a[0] - b[0]) / ((k1 - k0) * p.dt), (a[1] - b[1]) / ((k1 - k0) * p.dt))
        def near(k):
            qx, qy = p.pos(qb, k); best = (99, None)
            for d in RU:
                x, y = p.pos(d, k)
                if x is None: continue
                dd = math.hypot(x - qx, y - qy)
                if dd < best[0]: best = (dd, d)
            return best
        kd = None; done = {3: False, 2: False}
        out = 'throw' if fw is not None else ('run' if any(p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0 for k in range(kend + 1)) else 'sack')
        for k in range(p.k(0.5), kend + 1):
            x, y = p.pos(qb, k)
            if x is None or x > 0 or abs(y - by) > width or abs(y - y0) > 2.5: break
            v = vel(k); v1 = vel(k - 1)
            if v is None or v1 is None: continue
            if kd is None:
                x00 = p.pos(qb, 0)[0]
                if (-v[0] < 0.5 and -v1[0] < 0.5 and x00 - x >= 1.5) or k * p.dt >= 2.5: kd = k; TD[aln].append(k * p.dt); DD[aln].append(x00 - x)
                else: T[aln]['drop'] += 1; continue
            s = math.hypot(*v); dd, d = near(k)
            if s < 1: T[aln]['still'] += 1
            elif dd <= 3: T[aln]['near-body'] += 1
            elif v[0] > abs(v[1]): T[aln]['up'] += 1
            else: T[aln]['drift'] += 1
            for D in (3, 2):
                if done[D] or dd > D or d is None: continue
                done[D] = True
                ka = k + p.k(0.5)
                if k + 2 > kend: continue
                rx, ry = p.pos(d, k); bear = math.atan2(ry - y, rx - x)
                fld = abs(bear); o = None
                if ori and ori[k][qb] is not None: o = abs(wrap(bear - math.radians(ori[k][qb])))
                k3 = max(0, k - 3); px, py = p.pos(qb, k3); pre = math.hypot(x - px, y - py) / 0.3 if px is not None else None
                rec = dict(aln=aln, fld=fld, o=o, pre=pre, out=out, cut=ka > kend, t=k * p.dt, edge=abs(ry - y) > 1.5 and rx <= x + 1)
                if ka <= kend and p.pos(qb, ka)[0] is not None:
                    ax, ay = p.pos(qb, ka); mx, my = ax - x, ay - y; m = math.hypot(mx, my); rec['m'] = m
                    rec['away'] = -(mx * math.cos(bear) + my * math.sin(bear))
                    if m >= 1:
                        h = math.atan2(my, mx); rec['offaway'] = abs(wrap(h - (bear + math.pi)))
                        opens = []
                        for j in range(8):
                            th = j * math.pi / 4; cx, cy = x + 3 * math.cos(th), y + 3 * math.sin(th)
                            if cx > -1.5: opens.append((-1, th)); continue
                            dm = min((math.hypot(p.pos(e, k)[0] - cx, p.pos(e, k)[1] - cy) for e in RU if p.pos(e, k)[0] is not None), default=99)
                            opens.append((dm, th))
                        rank = sorted(opens, reverse=True); mine = min(range(8), key=lambda j: abs(wrap(h - opens[j][1])))
                        rec['openrank'] = [th for _, th in rank].index(opens[mine][1])
                        rec['dirn'] = 'up' if mx > abs(my) else 'back' if -mx > abs(my) else 'lateral'
                EV[D].append(rec)
    print(f"== {os.path.basename(path)}: dropbacks {sum(n.values())} (gun {n['gun']}, under {n['under']})")
    for a in ('gun', 'under'):
        c = T[a]; tot = sum(c.values()); post = tot - c['drop']
        print(f"   1 drop ends {a:5s}: p25/50/75 {q(TD[a],.25):.1f}/{q(TD[a]):.1f}/{q(TD[a],.75):.1f} s, {q(DD[a]):.1f} yd behind his snap spot")
        print(f"   1 TIME {a:5s}: drop {pct(c['drop'], tot)} of in-pocket time | after the drop: still {pct(c['still'], post)}, moving with a DL/LB within 3 yd {pct(c['near-body'], post)}, moving up (none near) {pct(c['up'], post)}, drifting lateral/back (none near) {pct(c['drift'], post)}")
    for D in (3, 2):
        E = EV[D]; F = [r for r in E if 'm' in r]
        print(f"   2 EVENT first DL/LB within {D} yd after the drop: {len(E)} ({pct(len(E), sum(n.values()))} of dropbacks), at p50 {q([r['t'] for r in E]):.1f} s; ball out within 0.5 s {pct(sum(r['cut'] for r in E), len(E))}; ends throw {pct(sum(r['out']=='throw' for r in E), len(E))} sack {pct(sum(r['out']=='sack' for r in E), len(E))} run {pct(sum(r['out']=='run' for r in E), len(E))}")
        def row(lab, S):
            if len(S) < 8: return
            print(f"      {lab:34s} n {len(S):5d} | moved >= 1 yd in 0.5 s {pct(sum(r['m'] >= 1 for r in S), len(S)):>4s} | displacement p50 {q([r['m'] for r in S]):.2f}, away from him p50 {q([r['away'] for r in S]):+.2f} | sacked {pct(sum(r['out']=='sack' for r in S), len(S)):>4s}")
        row('all (ball held 0.5 s more)', F)
        row('  QB still before (< 1 yd/s)', [r for r in F if r['pre'] is not None and r['pre'] < 1])
        row('  QB moving before', [r for r in F if r['pre'] is not None and r['pre'] >= 1])
        for lab, lo, hi in (('field: in front (< 60 deg of +x)', 0, 60), ('field: to the side (60-110)', 60, 110), ('field: behind (> 110)', 110, 181)):
            row('  ' + lab, [r for r in F if lo <= math.degrees(r['fld']) < hi])
        if any(r['o'] is not None for r in F):
            for lab, lo, hi in (('body: in front (< 60 deg of facing)', 0, 60), ('body: to the side (60-110)', 60, 110), ('body: behind (> 110)', 110, 181)):
                row('  ' + lab, [r for r in F if r['o'] is not None and lo <= math.degrees(r['o']) < hi])
                row('    and QB still before', [r for r in F if r['o'] is not None and lo <= math.degrees(r['o']) < hi and r['pre'] is not None and r['pre'] < 1])
        M = [r for r in F if 'dirn' in r]
        if len(M) >= 8:
            c = collections.Counter(r['dirn'] for r in M)
            print(f"   3 DIRECTION ({D} yd, moved >= 1 yd, n {len(M)}): up {pct(c['up'], len(M))} lateral {pct(c['lateral'], len(M))} back {pct(c['back'], len(M))} | within 45 deg of straight away {pct(sum(r['offaway'] < math.pi/4 for r in M), len(M))}, 45-90 {pct(sum(math.pi/4 <= r['offaway'] < math.pi/2 for r in M), len(M))}, toward him (> 90) {pct(sum(r['offaway'] >= math.pi/2 for r in M), len(M))}"
                  f" | took the most open of 8 directions {pct(sum(r['openrank'] == 0 for r in M), len(M))}, top two {pct(sum(r['openrank'] <= 1 for r in M), len(M))}, top three {pct(sum(r['openrank'] <= 2 for r in M), len(M))} (chance 12/25/38%)")
            for lab, f in (('body at the edge (wide of him, at or behind his depth)', lambda r: r['edge']), ('body in front / inside', lambda r: not r['edge'])):
                S = [r for r in M if f(r)]; c = collections.Counter(r['dirn'] for r in S)
                if S: print(f"      {lab:56s} n {len(S):4d}: up {pct(c['up'], len(S))} lateral {pct(c['lateral'], len(S))} back {pct(c['back'], len(S))}")
