"""QB lane, 2026-11-13: (i) escape traces by eye; (ii) which side he slides to off a body in front; (iii) what lateral/back
movement with nobody near turns into. Same code NFL and sim. usage: python3 -I remaining.py <plays.jsonl.gz> [--plays-csv f] [--trace seed]"""
import sys, os, json, gzip, math, csv, re, random, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; PFF = {}; trace = None
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
if '--trace' in args: i = args.index('--trace'); trace = int(args[i + 1]); del args[i:i + 2]
pct = lambda a, b: f"{100*a/max(1,b):.0f}%"
def q(v, p=.5):
    v = sorted(x for x in v if x is not None); return v[int(p * (len(v) - 1))] if v else float('nan')
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
for path in args:
    ESC = []; SL = []; EP = []; n = 0
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
        n += 1
        width = max(abs(p.pos(o, 0)[1] - by) for o in OL) + 0.5; y0 = p.pos(qb, 0)[1]
        kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        RU = [d for d in p.who('D') if p.players[d]['group'] in ('DL', 'LB')]
        tgt = raw.get('target'); tside = None
        if fw is not None and tgt is not None:
            ka = min(p.frames - 1, p.k(ev.get('pass_arrived', ev.get('end')))); ty = p.pos(tgt, ka)[1]
            if ty is not None: tside = ty
        def near(k):
            qx, qy = p.pos(qb, k); best = (99, None)
            for d in RU:
                x, y = p.pos(d, k)
                if x is None: continue
                dd = math.hypot(x - qx, y - qy)
                if dd < best[0]: best = (dd, d)
            return best
        def inbox(k):
            x, y = p.pos(qb, k)
            return x is not None and x <= 0 and abs(y - by) <= width and abs(y - y0) <= 2.5
        out = 'throw' if fw is not None else ('run' if any(p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0 for k in range(p.frames)) else 'sack')
        kout = None
        for k in range(p.k(0.3), kend + 1):
            x, y = p.pos(qb, k)
            if x is None or x > 0: break
            if not inbox(k): kout = k; break
        if kout is not None: ESC.append(dict(id=raw['id'], k=kout, p=p, qb=qb, out=out, fw=fw, near=near, kend=kend, by=by, width=width, yards=raw.get('yards')))
        # (ii) slide side: first DL/LB within 3 yd, in front/inside (not edge), he moves >= 1 yd mostly laterally in 0.5 s
        done = False; ep = None
        for k in range(p.k(1.5), kend + 1):
            if not inbox(k): break
            x, y = p.pos(qb, k); dd, d = near(k)
            ka = k + 5
            if not done and d is not None and dd <= 3 and ka <= kend and p.pos(qb, ka)[0] is not None:
                done = True
                rx, ry = p.pos(d, k); edge = abs(ry - y) > 1.5 and rx <= x + 1
                ax, ay = p.pos(qb, ka); mx, my = ax - x, ay - y
                if not edge and math.hypot(mx, my) >= 1 and abs(my) >= abs(mx):
                    s = 1 if my > 0 else -1
                    SL.append(dict(away=(None if abs(ry - y) < 0.4 else (s * (y - ry) > 0)), tgt=(None if tside is None or abs(tside - y) < 3 else (s * (tside - y) > 0)),
                                   mid=(None if abs(y - 26.67) < 2 else (s * (26.67 - y) > 0)), back=(s * (y0 - y) > 0) if abs(y - y0) > 0.5 else None))
            # (iii) episodes of lateral/back movement with nobody within 3 yd
            k0 = max(0, k - 2); k1 = min(p.frames - 1, k + 1); a, b = p.pos(qb, k1), p.pos(qb, k0)
            if a[0] is None or b[0] is None or k1 == k0: continue
            vx, vy = (a[0] - b[0]) / ((k1 - k0) * p.dt), (a[1] - b[1]) / ((k1 - k0) * p.dt)
            mov = math.hypot(vx, vy) >= 1 and dd > 3 and not vx > abs(vy)
            if mov and ep is None and k * p.dt >= 2.0: ep = dict(k=k, x=x, y=y, lat=abs(vy) >= abs(vx), s=(1 if vy > 0 else -1), dd=dd)
            if ep is not None and (not mov or k == kend):
                dur = (k - ep['k']) * p.dt
                if dur >= 0.3:
                    left = kout is not None and kout <= k + 10
                    thrown_in = fw is not None and kout is None and (kend - k) * p.dt <= 0.5
                    ep.update(dur=dur, dist=math.hypot(x - ep['x'], y - ep['y']), left=left, thrown=thrown_in,
                              totgt=(None if tside is None or abs(tside - ep['y']) < 3 else (ep['s'] * (tside - ep['y']) > 0)), out=out)
                    EP.append(ep)
                ep = None
    print(f"== {os.path.basename(path)}: dropbacks {n}")
    def share(key):
        v = [r[key] for r in SL if r[key] is not None]; return f"{pct(sum(v), len(v))} (n {len(v)})"
    print(f"   (ii) lateral slides off a body in front/inside within 3 yd: {len(SL)} | to the side away from that body {share('away')} | toward the eventual target's side {share('tgt')} | toward the middle of the field {share('mid')} | back toward his snap spot {share('back')}")
    print(f"   (iii) episodes of lateral/back movement (>= 1 yd/s for 0.3 s+, from 2.0 s) with no DL/LB within 3 yd: {len(EP)} = {100*len(EP)/max(1,n):.0f} per 100 dropbacks; lateral {pct(sum(e['lat'] for e in EP), len(EP))}; lasts p50 {q([e['dur'] for e in EP]):.1f} s, covers p50 {q([e['dist'] for e in EP]):.1f} yd; nearest rusher at its start p50 {q([e['dd'] for e in EP]):.1f} yd")
    print(f"         then: out of the pocket within 1 s {pct(sum(e['left'] for e in EP), len(EP))} | a throw from the pocket within 0.5 s of its end {pct(sum(e['thrown'] for e in EP), len(EP))} | neither {pct(sum(not e['left'] and not e['thrown'] for e in EP), len(EP))}")
    v = [e['totgt'] for e in EP if e['lat'] and e['totgt'] is not None and not e['left']]
    print(f"         in-pocket lateral episodes on thrown plays: toward the eventual target's side {pct(sum(v), len(v))} (n {len(v)})")
    if trace is not None:
        rnd = random.Random(trace)
        for r in rnd.sample(ESC, min(12, len(ESC))):
            p, k, qb = r['p'], r['k'], r['qb']
            fr = list(range(max(0, k - 10), min(p.frames, k + 21), 3))
            print(f"   -- {r['id']} left at {k*p.dt:.1f} s, {r['out']} at {r['fw']}, yards {r['yards']}, box half-width {r['width']:.1f}, ball_y {r['by']:.1f}")
            print('      t       ' + ' '.join(f"{j*p.dt:5.1f}" for j in fr))
            print('      QB x    ' + ' '.join(f"{p.pos(qb,j)[0]:5.1f}" if p.pos(qb,j)[0] is not None else '    -' for j in fr))
            print('      QB y-by ' + ' '.join(f"{p.pos(qb,j)[1]-r['by']:5.1f}" if p.pos(qb,j)[0] is not None else '    -' for j in fr))
            print('      rusher  ' + ' '.join(f"{r['near'](j)[0]:5.1f}" if p.pos(qb,j)[0] is not None else '    -' for j in fr))
