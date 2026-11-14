"""Early sacks (Integration, 2026-11-14: ours come about 0.7 s early). Same code on NFL tracking and sim exports.

usage: python3 -I scripts/diag/pass-operators/early-sack.py name=a.jsonl.gz[,b.jsonl.gz] ... [--plays-csv plays.csv]

Population and sack time as the QB lane's leave-onset.py: dropbacks with five or more OL, not designed movement (PFF
dropbackType for the NFL; a boot/roll/sprint/waggle/naked/screen concept in ours), no forward pass, QB never past the
line; the sack time is the last frame he can have the ball (the ball within 2.5 yd of him). It counts a fumble behind
the line and does not use the official flag: use it for timing, not level.
The sacker: the DL/LB nearest the QB at that frame. His path, from 0.3 s to the sack (0.1 s frames; 'blocked' = an
offensive non-QB within 1.2 yd of him, inferred from tracking, weak):
  - 'unblocked': never within 1.2 yd of a blocker (a free rusher or a blitzer no one picked up);
  - 'beat his man': blocked at some frame; he came free at the last frame he was blocked + 1. Side: inside if at
    that frame he is nearer the ball's snap y than the man he left (across the field), else outside. Edge if his snap
    spot was outside the outermost OL's, else interior.
  - 'crossed' (stunt/twist proxy): by the frame he came free (or 1.5 s), his order across the field among the
    rushers on the line at the snap has changed (he went across a teammate's snap spot).
Then the other end: the share of dropbacks still holding the ball, behind the line, at 3.0 / 4.0 / 5.0 s, and how
those end (throw, run, sack).
Limits: geometric proxies (alignment, not assignment; no move labels); n is small in ours.
"""
import sys, os, json, gzip, math, re, csv, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
pc = lambda a, b: f"{100 * a / b:.0f}%" if b else '-'
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)


def held_end(raw, p, qb, kend):
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
for arg in args:
    name, paths = arg.split('=', 1); n = 0; S = []; hold = {3.0: C.Counter(), 4.0: C.Counter(), 5.0: C.Counter()}
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
            fw = ev.get('pass_forward'); kend = held_end(raw, p, qb, min(p.frames - 1, p.k(fw if fw is not None else p.end)))
            crossed = any(p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0 for k in range(kend + 1))
            res = 'throw' if fw is not None else 'run' if crossed else 'sack'
            for T, c in hold.items():
                kT = p.k(T)
                if kT <= kend and not any(p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0 for k in range(kT + 1)): c[res] += 1
            if res != 'sack': continue
            x, y = p.pos(qb, kend)
            RU = [d for d in p.who('D') if p.players[d]['group'] in ('DL', 'LB') and p.pos(d, kend)[0] is not None]
            if not RU or x is None: continue
            d = min(RU, key=lambda d: math.hypot(p.pos(d, kend)[0] - x, p.pos(d, kend)[1] - y))
            BL = [o for o in p.who('O') if o != qb]
            last_blocked, by_whom = None, None
            for k in range(p.k(0.3), max(p.k(0.3), kend - p.k(0.3)) + 1):
                dx, dy = p.pos(d, k)
                if dx is None: continue
                near = [(math.hypot(p.pos(o, k)[0] - dx, p.pos(o, k)[1] - dy), o) for o in BL if p.pos(o, k)[0] is not None]
                near = [z for z in near if z[0] <= 1.2]
                if near: last_blocked, by_whom = k, min(near)[1]
            wide = max(abs(p.pos(o, 0)[1] - by) for o in OL)
            edge = abs(p.pos(d, 0)[1] - by) > wide
            r = {'t': kend * p.dt, 'edge': edge}
            if last_blocked is None:
                r['how'] = 'unblocked'; kf = p.k(1.5)
            else:
                kf = min(kend, last_blocked + 1); r['how'] = 'beat his man'; r['free'] = kf * p.dt
                rx, ry = p.pos(d, kf); ox, oy = p.pos(by_whom, kf)
                r['side'] = 'inside' if abs(ry - by) < abs(oy - by) else 'outside'
                r['byGroup'] = p.players[by_whom]['group']
            # Crossed: his order across the field among the rushers on the line at the snap changed by the free frame.
            line0 = [e for e in RU if p.pos(e, 0)[0] is not None and p.pos(e, 0)[0] <= 1.6]
            kf = min(kf, kend)
            if d in line0 and p.pos(d, kf)[0] is not None:
                y0, yf = p.pos(d, 0)[1], p.pos(d, kf)[1]
                r['crossed'] = any((p.pos(e, 0)[1] - y0) * (p.pos(e, 0)[1] - yf) < 0 for e in line0 if e != d)
            else: r['crossed'] = False
            S.append(r)
    T = [r['t'] for r in S]
    print(f"== {name}: dropbacks {n}, sacks {len(S)} = {100 * len(S) / max(1, n):.1f}% | time p10/25/50/75/90 {q(T, .1):.1f}/{q(T, .25):.1f}/{q(T):.1f}/{q(T, .75):.1f}/{q(T, .9):.1f} s | before 3.0 s {pc(sum(t < 3.0 for t in T), len(T))} ({100 * sum(t < 3.0 for t in T) / max(1, n):.2f}% of dropbacks)")
    for lab, f in (('before 3.0 s', lambda r: r['t'] < 3.0), ('3.0 s and after', lambda r: r['t'] >= 3.0)):
        g = [r for r in S if f(r)]
        if not g: continue
        b = [r for r in g if r['how'] == 'beat his man']
        cnt = C.Counter((('edge' if r['edge'] else 'interior') + ' ' + r['side']) for r in b)
        print(f"   {lab:16s} n {len(g):4d} ({100 * len(g) / max(1, n):.2f}% of dropbacks): unblocked {pc(sum(r['how'] == 'unblocked' for r in g), len(g))} | beat his man {pc(len(b), len(g))}"
              f" [{', '.join(f'{k} {pc(v, len(b))}' for k, v in sorted(cnt.items()))}; came free p50 {q([r['free'] for r in b]):.1f} s, before 2.5 s {pc(sum(r['free'] < 2.5 for r in b), len(b))}; left a {dict(C.Counter(r['byGroup'] for r in b))}]"
              f" | crossed (stunt proxy) {pc(sum(r['crossed'] for r in g), len(g))} | sacker edge {pc(sum(r['edge'] for r in g), len(g))}")
    print('   still holding the ball behind the line at ' + ' | '.join(f"{T:.1f} s: {sum(c.values())} ({pc(sum(c.values()), n)} of dropbacks), ends throw {pc(c['throw'], sum(c.values()))} run {pc(c['run'], sum(c.values()))} sack {pc(c['sack'], sum(c.values()))}" for T, c in hold.items()))
