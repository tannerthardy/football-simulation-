"""QB lane, 2026-11-14: what he was responding to when he began to leave the pocket. Same code on NFL tracking and sim
exports. Non-designed dropbacks. LEFT is escape.py's: behind the line, outside the tackles' snap width (+0.5 yd) or
more than 2.5 yd laterally off his snap spot. ONSET is the start of that movement: the last frame before he left at
which his speed was under 1.5 yd/s (the snap if never).
At the onset: the time; the nearest DL/LB, how far, and whether an offensive lineman or back is within 1.5 yd of that
man ("engaged", inferred from tracking, weak) or not ("free"); how fast that man is closing on him.
Then leaves are split RUSH (nearest DL/LB within 3 yd at the onset) and NOBODY NEAR (beyond 3 yd), each with its
outcomes. Last row: of dropbacks with the ball still in his hand at 2.5 / 3.0 / 3.5 s and still in the pocket, the
share that leave later (how leaving depends on how long he has held it).
usage: python3 -I leave-onset.py name=a.jsonl.gz,b.jsonl.gz ... [--plays-csv plays.csv]"""
import sys, os, json, gzip, math, re, csv
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
def held_end(raw, p, qb, kend):
    b = raw.get('bxy')
    if not b or raw['events'].get('pass_forward') is not None: return kend
    for k in range(min(kend, len(b) - 1) + 1):
        x, y = p.pos(qb, k); bb = b[k]
        if x is None or not bb or bb[0] is None: continue
        if math.hypot(bb[0] - x, bb[1] - y) > 2.5: return max(0, k - 1)
    return kend
def wrap_start(p, qb, kend):
    """A sack's time is when the last unbroken stretch with a defender within 1.5 yd of him begins (the wrap), not the
    whistle: going down in a defender's arms is not holding the ball. The cut Flex's early-sack.py uses, so one
    definition serves both lanes."""
    k = kend
    while k > 0:
        x, y = p.pos(qb, k)
        if x is None or not any(p.pos(d, k)[0] is not None and math.hypot(p.pos(d, k)[0] - x, p.pos(d, k)[1] - y) <= 1.5 for d in p.who('D')): break
        k -= 1
    return min(kend, k + 1)
args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
def q(v, p=.5):
    v = sorted(x for x in v if x is not None); return v[int(p * (len(v) - 1))] if v else float('nan')
pc = lambda a, b: f"{100 * a / max(1, b):.0f}%"
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
for arg in args:
    name, paths = arg.split('=', 1); n = 0; L = []; held = {2.5: [0, 0], 3.0: [0, 0], 3.5: [0, 0]}; H3 = []; sackT = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
            if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            p = Play(raw); qbs = p.who('O', 'QB')
            if not qbs or p.pos(qbs[0], 0)[0] is None: continue
            qb = qbs[0]; ev = raw['events']; by = raw['ball_y']
            OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
            if len(OL) < 5: continue
            n += 1
            width = max(abs(p.pos(o, 0)[1] - by) for o in OL) + 0.5; y0 = p.pos(qb, 0)[1]
            fw = ev.get('pass_forward'); kend = held_end(raw, p, qb, min(p.frames - 1, p.k(fw if fw is not None else p.end)))
            if fw is None and not any(p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0 for k in range(kend + 1)): kend = wrap_start(p, qb, kend)
            out_k = None; crossed = False
            for k in range(p.k(0.3), kend + 1):
                x, y = p.pos(qb, k)
                if x is None: break
                if x > 0: crossed = True; break
                if abs(y - by) > width or abs(y - y0) > 2.5: out_k = k; break
            for m in held:
                km = int(round(m / p.dt))
                if km <= kend and (out_k is None or out_k > km): held[m][0] += 1; held[m][1] += out_k is not None
            # Still holding at 3.0 s (wherever he is): how the play resolves.
            k3 = int(round(3.0 / p.dt)); lab0 = raw.get('labels') or {}
            if fw is None and not crossed:
                crossed0 = any(p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0 for k in range(kend + 1))
                if not crossed0: sackT.append(kend * p.dt)
            if k3 <= kend:
                if fw is not None:
                    aw = (pf['passResult'] == 'I' and 'pass incomplete' in pf['playDescription'] and not re.search(r'pass incomplete \w+ \w+ to ', pf['playDescription'])) if pf is not None else bool(lab0.get('throwaway'))
                    r3 = 'away' if aw else 'throw'
                else: r3 = 'run' if (crossed or any(p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0 for k in range(kend + 1))) else 'sack'
                H3.append((out_k is not None and out_k > k3, out_k is not None and out_k <= k3, r3))
            if out_k is None: continue
            if fw is None: crossed = crossed or any(p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0 for k in range(kend + 1))
            lab = raw.get('labels') or {}
            if fw is not None:
                away = (pf['passResult'] == 'I' and 'pass incomplete' in pf['playDescription'] and not re.search(r'pass incomplete \w+ \w+ to ', pf['playDescription'])) if pf is not None else bool(lab.get('throwaway'))
                res = 'away' if away else 'throw'
            else: res = 'run' if crossed else 'sack'
            ko = 0
            for k in range(out_k, 0, -1):
                a, b = p.pos(qb, k), p.pos(qb, k - 1)
                if a[0] is None or b[0] is None: break
                if math.hypot(a[0] - b[0], a[1] - b[1]) / p.dt < 1.5: ko = k; break
            x, y = p.pos(qb, ko)
            RU = [d for d in p.who('D') if p.players[d]['group'] in ('DL', 'LB')]
            BL = [o for o in p.who('O') if o != qb and p.players[o]['group'] in ('OL', 'RB', 'TE')]
            best = None
            for d in RU:
                dx, dy = p.pos(d, ko)
                if dx is None: continue
                dd = math.hypot(dx - x, dy - y)
                if best is None or dd < best[0]: best = (dd, d, dx, dy)
            if best is None: continue
            dd, d, dx, dy = best
            eng = any(p.pos(o, ko)[0] is not None and math.hypot(p.pos(o, ko)[0] - dx, p.pos(o, ko)[1] - dy) <= 1.5 for o in BL)
            kb = max(0, ko - int(round(0.3 / p.dt))); px, py = p.pos(d, kb); qx, qy = p.pos(qb, kb)
            close = (math.hypot(px - qx, py - qy) - dd) / max(p.dt, (ko - kb) * p.dt) if px is not None and qx is not None and ko > kb else None
            L.append(dict(t=ko * p.dt, tout=out_k * p.dt, dd=dd, eng=eng, close=close, res=res, typ=(pf['dropbackType'] if pf is not None else 'sim'), pa=(pf['playAction'] == 'TRUE' if pf is not None else bool(re.search(r'^pa_|\+pa$|play.?action', str((raw.get('cell') or {}).get('concept') or ''), re.I)))))
    print(f"== {name}: dropbacks {n}, left the pocket {len(L)} = {100 * len(L) / max(1, n):.1f}%")
    if not L: continue
    print(f"   onset at p25/50/75 {q([l['t'] for l in L], .25):.1f}/{q([l['t'] for l in L]):.1f}/{q([l['t'] for l in L], .75):.1f} s; onset to out of the pocket p50 {q([l['tout'] - l['t'] for l in L]):.1f} s; nearest DL/LB at the onset {q([l['dd'] for l in L], .25):.1f}/{q([l['dd'] for l in L]):.1f}/{q([l['dd'] for l in L], .75):.1f} yd, engaged {pc(sum(l['eng'] for l in L), len(L))}, closing p50 {q([l['close'] for l in L]):.1f} yd/s")
    for lab, S in (('RUSH (within 3 yd)', [l for l in L if l['dd'] <= 3]), ('NOBODY NEAR (beyond 3 yd)', [l for l in L if l['dd'] > 3])):
        if not S: continue
        c = lambda r: sum(l['res'] == r for l in S)
        print(f"   {lab:26s} {pc(len(S), len(L))} of leaves = {100 * len(S) / max(1, n):.1f}% of dropbacks | onset p50 {q([l['t'] for l in S]):.1f} s | that man engaged {pc(sum(l['eng'] for l in S), len(S))}, free {pc(sum(not l['eng'] for l in S), len(S))} | ends throw {pc(c('throw'), len(S))} away {pc(c('away'), len(S))} run {pc(c('run'), len(S))} sack {pc(c('sack'), len(S))}")
    print('   still in the pocket with the ball at ' + '; '.join(f"{m:.1f} s: {v[0]} ({pc(v[0], n)} of dropbacks), of those {pc(v[1], v[0])} leave later" for m, v in held.items()))
    import collections
    for lab, S in (('RUSH', [l for l in L if l['dd'] <= 3]), ('NOBODY NEAR', [l for l in L if l['dd'] > 3])):
        C = collections.Counter(l['typ'] for l in S)
        print(f"   {lab:12s} by dropback type: " + ', '.join(f"{k} {pc(v, len(S))}" for k, v in C.most_common()) + f" | play action {pc(sum(l['pa'] for l in S), len(S))} | onset before 1.5 s {pc(sum(l['t'] < 1.5 for l in S), len(S))}")
    if H3:
        m = len(H3); g = lambda f: sum(1 for h in H3 if f(h))
        print(f"   still holding at 3.0 s: {m} = {pc(m, n)} of dropbacks | already out {pc(g(lambda h: h[1]), m)}, leaves later {pc(g(lambda h: h[0]), m)}, stays in {pc(g(lambda h: not h[0] and not h[1]), m)} | ends throw {pc(g(lambda h: h[2] == 'throw'), m)} away {pc(g(lambda h: h[2] == 'away'), m)} run {pc(g(lambda h: h[2] == 'run'), m)} sack {pc(g(lambda h: h[2] == 'sack'), m)}")
        for nm, f in (('stays in the pocket', lambda h: not h[0] and not h[1]), ('out (then or later)', lambda h: h[0] or h[1])):
            S = [h for h in H3 if f(h)]; c = lambda r: sum(h[2] == r for h in S)
            print(f"      {nm:20s} n {len(S):4d}: throw {pc(c('throw'), len(S))} away {pc(c('away'), len(S))} run {pc(c('run'), len(S))} sack {pc(c('sack'), len(S))}")
    if sackT: print(f"   sacks (no pass, never past the line) {len(sackT)} = {100 * len(sackT) / max(1, n):.1f}% of dropbacks; time p10/25/50/75/90 {q(sackT, .1):.1f}/{q(sackT, .25):.1f}/{q(sackT):.1f}/{q(sackT, .75):.1f}/{q(sackT, .9):.1f} s; after 3.0 s {pc(sum(t >= 3.0 for t in sackT), len(sackT))}, after 4.0 s {pc(sum(t >= 4.0 for t in sackT), len(sackT))}")
