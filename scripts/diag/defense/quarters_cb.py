"""Quarters corner, one operator for NFL tracking and sim common plays (sim from scripts/mechanics/sim-export.ts).
Population: dropback passes (kind 'pass') whose coverage label is a quarters family (cover-4 / quarters / cover4;
cover-6 and split-field calls are left out), each side's widest defensive back (group DB, the corner) aligned 5+ yd off the line at the snap,
against that side's #1 (the widest offensive skill player on his side at the snap) and #2 (the next one inside).
Taught (sourced in the quarters design note): 7-8 yd off, outside shade, MOD on #1; when #1 goes short he sinks and
helps on #2's corner/post. Measured per corner:
  alignment: depth at the snap and his lateral shade over #1 (+ = outside #1);
  first steps: his depth velocity (+ = away from the line) at 0.5, 1.0 and 1.5 s;
  #1 vertical (still climbing over 4 yd/s at 2.0 s): his cushion over #1 (his depth minus #1's) at 2.0 and 2.5 s;
  #1 short (inside 9 yd and under 2 yd/s downfield at 2.0 s): his depth change 1.0 -> 2.0 s, his lateral move inside 1.0 -> 2.0 s, his distance
    to #2 at 2.0 s, and whether #2 is vertical (climbing over 4 yd/s at 2.0 s);
  #1's stop (Integration's follow-up): the first time in 0-3.5 s that #1, having climbed over 3 yd/s, drops under 1 yd/s
    downfield; its time, #1's depth then, and the corner's depth change in the 0.5 s after it (sink, + = away from the line);
  outcomes: throws to #1 / #2 on his side, completion and yards.
usage: python3 -I quarters_cb.py FILE [FILE ...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402

def fam(label):
    t = (label or '').lower()
    if any(w in t for w in ('6', 'split', 'man', 'red zone', 'goal')): return None
    return 'quarters' if ('4' in t or 'quarter' in t) else None

q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
rows = []
for path in sys.argv[1:]:
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass' or not fam((raw.get('cell') or {}).get('coverage')): continue
        p = Play(raw); by = raw['ball_y']
        k = lambda t: p.k(t)
        if p.frames < k(2.5) + 1: continue
        skill = [i for i, pl in enumerate(p.players) if pl['side'] == 'O' and pl['group'] not in ('OL', 'QB') and p.pos(i, 0)[0] is not None]
        cbs = [i for i in p.who('D', 'DB') if p.pos(i, 0)[0] is not None]
        ev = raw.get('events') or {}
        for side in (1, -1):
            mine = sorted([i for i in skill if (p.pos(i, 0)[1] - by) * side > 0], key=lambda i: -abs(p.pos(i, 0)[1] - by))
            corner = [i for i in cbs if (p.pos(i, 0)[1] - by) * side > 0]
            if not mine or not corner: continue
            c = max(corner, key=lambda i: abs(p.pos(i, 0)[1] - by)); one = mine[0]; two = mine[1] if len(mine) > 1 else None
            cx, cy = p.pos(c, 0)
            if cx < 5: continue
            r = {'depth': cx, 'shade': (abs(cy - by) - abs(p.pos(one, 0)[1] - by))}
            for t in (0.5, 1.0, 1.5): r[f'v{t}'] = p.velocity(c, k(t))[0]
            d1, v1 = p.pos(one, k(2.0))[0], p.velocity(one, k(2.0))[0]
            r['one'] = 'vertical' if v1 > 4 else 'short' if d1 < 9 and v1 < 2 else 'mid'
            if r['one'] == 'vertical':
                for t in (2.0, 2.5): r[f'cush{t}'] = p.pos(c, k(t))[0] - p.pos(one, k(t))[0]
            if r['one'] == 'short':
                (x1, y1), (x2, y2) = p.pos(c, k(1.0)), p.pos(c, k(2.0))
                r['sink'] = x2 - x1; r['inside'] = (abs(y1 - by) - abs(y2 - by))
                o0, o2 = p.pos(one, 0)[1], p.pos(one, k(2.0))[1]
                r['cross'] = (abs(o0 - by) - abs(o2 - by)) >= 2
                if two is not None:
                    r['to2'] = p.dist(c, two, k(2.0)); r['two_vert'] = p.velocity(two, k(2.0))[0] > 4
            climbed, stop = False, None
            for f in range(0, min(p.frames - 1, k(3.5)) + 1):
                vx = p.velocity(one, f)[0]
                if vx is None: break
                if vx > 3: climbed = True
                elif climbed and vx < 1: stop = f; break
            if stop is not None:
                r['stop_t'] = stop / max(1, k(1.0)); r['stop_d'] = p.pos(one, stop)[0]
                if stop + k(0.5) < p.frames: r['stop_sink'] = p.pos(c, stop + k(0.5))[0] - p.pos(c, stop)[0]
            tgt = raw.get('target')
            r['thrown'] = '1' if tgt == one else '2' if tgt == two and two is not None else None
            r['cmp'] = ev.get('catch') is not None; r['yards'] = raw.get('yards') or 0
            rows.append(r)

def line(lab, R):
    if not R: return
    print(f"{lab:28s} n {len(R):4d} | depth {q([r['depth'] for r in R])} shade {q([r['shade'] for r in R])} | depth vel 0.5/1.0/1.5 s "
          f"{q([r['v0.5'] for r in R])}/{q([r['v1.0'] for r in R])}/{q([r['v1.5'] for r in R])}")
print(f"quarters corners, {', '.join(sys.argv[1:])}")
line('all', rows)
V = [r for r in rows if r['one'] == 'vertical']; S = [r for r in rows if r['one'] == 'short']
line('#1 vertical', V)
if V: print(f"   cushion over #1 at 2.0 / 2.5 s p25/p50/p75: {q([r['cush2.0'] for r in V],.25)}/{q([r['cush2.0'] for r in V])}/{q([r['cush2.0'] for r in V],.75)} | {q([r['cush2.5'] for r in V],.25)}/{q([r['cush2.5'] for r in V])}/{q([r['cush2.5'] for r in V],.75)}")
line('#1 short', S)
if S:
    S2 = [r for r in S if 'to2' in r]
    print(f"   1.0 -> 2.0 s: sink p50 {q([r['sink'] for r in S])} yd, inside p50 {q([r['inside'] for r in S])} yd | dist to #2 at 2.0 s p50 {q([r['to2'] for r in S2])} "
          f"(#2 vertical {sum(r['two_vert'] for r in S2)}/{len(S2)}; when vertical p50 {q([r['to2'] for r in S2 if r['two_vert']])})")
for lab, f in (('#1 short, stays', lambda r: not r.get('cross')), ('#1 short, crosses', lambda r: r.get('cross'))):
    T = [r for r in S if f(r)]
    if T: print(f"   {lab}: n {len(T)} | 1.0 -> 2.0 s sink p50 {q([r['sink'] for r in T])} yd, inside p50 {q([r['inside'] for r in T])} yd")
line('#1 in between', [r for r in rows if r['one'] == 'mid'])
for who in ('1', '2'):
    T = [r for r in rows if r['thrown'] == who]
    if T: print(f"throws to #{who} on his side: n {len(T)} comp {sum(r['cmp'] for r in T) / len(T):.2f} yd/throw {sum(r['yards'] for r in T) / len(T):.1f}")
P = [r for r in rows if 'stop_t' in r]
print(f"#1 stops (climbed >3 then <1 yd/s within 3.5 s): {len(P)}/{len(rows)}")
for lab, f in (('all stops', lambda r: True), ('stop inside 5 yd (no-cover zone)', lambda r: r['stop_d'] <= 5),
               ('stop 5-9 yd', lambda r: 5 < r['stop_d'] < 9), ('stop 9+ yd', lambda r: r['stop_d'] >= 9)):
    T = [r for r in P if f(r)]
    if T: print(f"   {lab:34s} n {len(T):4d} | stop at p25/p50/p75 {q([r['stop_t'] for r in T],.25)}/{q([r['stop_t'] for r in T])}/{q([r['stop_t'] for r in T],.75)} s, "
                f"depth p50 {q([r['stop_d'] for r in T])} yd | corner sink in the 0.5 s after p50 {q([r['stop_sink'] for r in T if 'stop_sink' in r])} yd")
