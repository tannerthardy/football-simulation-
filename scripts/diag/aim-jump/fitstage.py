#!/usr/bin/env python3
"""What turns a slow run defender before the chase (TKL-2, Stage 4).

Reads scan.ts rows of designed runs (scan.ts ... runs). Windows use pursuit_aim.py's
filter at the window start (6-15 yd here, no other offensive body within 1.0 yd, not
in the cone more than 135 deg behind the runner, both moving faster than 2 yd/s,
the defender under 0.8 of the carrier's speed) and its event (body heading change
over 15 deg in 0.2 s). Commands lead the body, so each re-steer looks at the last
0.45 s of steps. Split by where the runner is (yards past the line) and by phase:
  chase       the defender's chase ran in the last 0.2 s
  before      it didn't: his controller's own command (a run fit, coverage, rush)
For "before", the first of: his job changed; his command's objective changed kind
or its point moved more than 15 deg in bearing; his raw command turned with the
objective steady; a rewrite after it turned (stages, as in stages.py); his
command was steady and the body was still turning toward it.

    python3 -I scripts/diag/aim-jump/fitstage.py scan.jsonl [...]
"""
import json, math, sys
from collections import Counter, defaultdict
def ang(v): return math.degrees(math.atan2(v['y'], v['x']))
def turn(a, b): return abs((a - b + 540) % 360 - 180)
def spread(hs): return max(turn(h, hs[0]) for h in hs) if len(hs) > 1 else 0
REWRITES = ['technique-intents', 'containment', 'coverage-orientation', 'open-to-ball', 'engagement', 'tackle-bond', 'spacing', 'snap-guard']
XB = ((-99, -2), (-2, 0), (0, 2), (2, 99))
xb = lambda x: next(f"{a if a > -99 else '<'}..{b if b < 99 else '+'}" for a, b in XB if a <= x < b)
W = Counter(); E = Counter(); C = Counter(); OWN = Counter(); EX = defaultdict(list)
for path in sys.argv[1:]:
    seq = defaultdict(dict)
    for l in open(path):
        r = json.loads(l); seq[(r['k'], r['slot'])][round(r['t'] * 20)] = r
    for key, S in seq.items():
        for t, n in S.items():
            o = S.get(t - 4)
            if not o or o['c']['id'] != n['c']['id']: continue
            c, cv = o['c'], o['c']['vel']
            rx, ry = o['pos']['x'] - c['pos']['x'], o['pos']['y'] - c['pos']['y']
            dist = math.hypot(rx, ry); cs = math.hypot(cv['x'], cv['y']); sp = math.hypot(o['vel']['x'], o['vel']['y'])
            if not 6 <= dist <= 15 or cs < 2 or sp < 2 or sp / cs >= .8 or c.get('nearO', 9) <= 1.0: continue
            if turn(ang(cv), math.degrees(math.atan2(ry, rx))) > 135: continue
            if math.hypot(n['vel']['x'], n['vel']['y']) <= 2: continue
            x = (c['pos']['x'] - o['los']) * o['dir']; band = xb(x)
            win = [w for w in (S.get(t - j) for j in range(10)) if w]
            chase = any(w['planner'] is not None for w in win[:5])
            phase = 'chase' if chase else 'before'
            W[(band, phase)] += 1
            if turn(ang(n['vel']), ang(o['vel'])) <= 15: continue
            E[(band, phase)] += 1
            if chase: continue
            objs = [w['objective'] for w in win]
            jobs = {w['job'] for w in win}
            if len({w['owner'] for w in win}) > 1 or len(jobs) > 1: k = 'controller or job changed'
            elif len({(ob or {}).get('kind') for ob in objs}) > 1: k = 'objective started, stopped or changed kind'
            elif all(objs) and spread([math.degrees(math.atan2(ob['point']['y'] - w['pos']['y'], ob['point']['x'] - w['pos']['x'])) for ob, w in zip(objs, win)]) > 15:
                k = 'objective point moved >15 deg'
            else:
                raw = [ang(dict(w['stages']).get('raw')) for w in win if dict(w['stages']).get('raw') and math.hypot(dict(w['stages'])['raw']['x'], dict(w['stages'])['raw']['y']) > .5]
                fin = [ang(w['final']) for w in win if w['final'] and math.hypot(w['final']['x'], w['final']['y']) > .5]
                if spread(raw) > 15: k = 'raw command turned, objective steady' + ('' if all(objs) else ' (no objective)')
                elif spread(fin) > 15:
                    k = 'a rewrite turned it'
                    for st in REWRITES:
                        b = []
                        for w in win:
                            got = dict(w['stages']); cur = got.get('raw')
                            for s2 in REWRITES[:REWRITES.index(st) + 1]:
                                if s2 in got: cur = got[s2]
                            if cur and math.hypot(cur['x'], cur['y']) > .5: b.append(ang(cur))
                        if spread(b) > 15: k = f'rewrite: {st}'; break
                else: k = 'command steady, body still turning'
            C[(band, k)] += 1; OWN[(k, f"{n['owner']}/{n['ownerKind']}")] += 1
            if len(EX[k]) < 3: EX[k].append(f"{path.split('/')[-1]} {n['k']} {n['slot']} t={n['t']:.2f} x={x:.1f}")
print("slow 6-15 yd windows and re-steers by carrier yards past the line:")
for a, b in XB:
    bd = xb(a if a > -99 else -50)
    print("   " + bd.ljust(6) + "  ".join(f" {ph}: {E[(bd, ph)]:4d}/{W[(bd, ph)]:5d} = {100 * E[(bd, ph)] / max(1, W[(bd, ph)]):5.1f}%" for ph in ('before', 'chase')))
tot = sum(C.values()); print(f"before the chase, what turned him ({tot}):")
for k, v in Counter({k: sum(vv for (bd, kk), vv in C.items() if kk == k) for _, k in C}).most_common():
    print(f"  {v:5d} {100 * v / tot:4.0f}%  {k}   e.g. {'; '.join(EX[k][:2])}")
print("  by controller/kind (top 10):")
for (k, o), v in OWN.most_common(10): print(f"     {v:4d}  {k[:44]:44s} {o}")
