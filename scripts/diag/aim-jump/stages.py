#!/usr/bin/env python3
"""Which pipeline stage turns a slow pursuer when his aim holds (TKL-2, Stage 4).

Reads scan.ts rows (with `stages`). Each stage is read as the command as it
stands after that stage, so a rewrite that applies on and off counts as turning. A window (the operator's sample filter applied at its start, see keep()): the pursuer is under 0.8 of the
runner's speed, 6-15 yd away, moving faster than 2 yd/s at both ends of 0.2 s,
and his body heading turns more than 15 deg over it (the NFL re-steer
operator's event). Commands lead the body, so each window looks at the last
0.45 s of steps. It is classed as in the aim-jump review, and for "command
moved, aim steady" the first stage, in pipeline order, whose requested
bearing ranges over 15 deg in those steps is named (requests under 0.5 yd/s
have no bearing and are skipped).

    python3 -I scripts/diag/aim-jump/stages.py scan.jsonl [...]
"""
import json, math, sys
from collections import Counter, defaultdict
def ang(v): return math.degrees(math.atan2(v['y'], v['x']))
def turn(a, b): return abs((a - b + 540) % 360 - 180)
def spread(hs): return max(turn(h, hs[0]) for h in hs) if len(hs) > 1 else 0
def brg(r): return math.degrees(math.atan2(r['aim']['y'] - r['pos']['y'], r['aim']['x'] - r['pos']['x']))
def keep(r):
    """pursuit_aim.py's sample filter at the window start: no other offensive body within 1.0 yd, and not in
    the cone more than 135 deg behind the runner. Rows from scans without `nearO` keep every sample."""
    if r['c'].get('nearO', 9) <= 1.0: return False
    cv, rx, ry = r['c']['vel'], r['pos']['x'] - r['c']['pos']['x'], r['pos']['y'] - r['c']['pos']['y']
    return math.hypot(cv['x'], cv['y']) < .5 or turn(ang(cv), math.degrees(math.atan2(ry, rx))) <= 135
ORDER = ['intercept-sprint', 'approach-and-gather', 'around-bodies', 'close-gather', 'held-tackle', 'raw',
         'technique-intents', 'containment', 'coverage-orientation', 'open-to-ball', 'engagement', 'tackle-bond',
         'spacing', 'snap-guard', 'final']
C = Counter(); first = Counter(); owners = Counter(); evaluated = Counter(); examples = defaultdict(list)
switch = Counter()
for path in sys.argv[1:]:
    seq = defaultdict(dict)
    for l in open(path):
        r = json.loads(l); seq[(r['k'], r['slot'])][round(r['t'] * 20)] = r
    for key, S in seq.items():
        for t, n in S.items():
            o = S.get(t - 4)
            if not o or o['c']['id'] != n['c']['id'] or n['dist'] is None or not (6 <= n['dist'] <= 15): continue
            sp = math.hypot(n['vel']['x'], n['vel']['y']); cs = math.hypot(n['c']['vel']['x'], n['c']['vel']['y'])
            if sp < 2 or sp / max(.1, cs) >= .8 or math.hypot(o['vel']['x'], o['vel']['y']) < 2: continue
            if not keep(o): continue
            if turn(ang(n['vel']), ang(o['vel'])) <= 15: continue
            win = [S.get(t - j) for j in range(0, 10)]
            win = [w for w in win if w]
            cmds = [ang(w['final']) for w in win if w['final'] and math.hypot(w['final']['x'], w['final']['y']) > .5]
            aims = [brg(w) for w in win if 'aim' in w and w['planner'] == 'used']
            chased = all(S.get(t - j) and S[t - j]['planner'] == 'used' for j in range(5))
            if not chased:
                C['switched into the chase within 0.2 s (or gather)'] += 1
                prev = [S.get(t - j) for j in range(0, 10)]
                switch[' -> '.join(dict.fromkeys(f"{w['owner']}/{w['planner']}" for w in reversed([p for p in prev if p])))] += 1
                continue
            if spread(aims) > 15: C['aim moved >15 deg'] += 1; continue
            if spread(cmds) <= 15: C['command and aim steady'] += 1; continue
            C['command moved >15 deg, aim steady'] += 1
            # The command as it stands after each stage: the latest stage up to it that wrote one in that
            # step. A rewrite that applies in some steps and not others turns the command at that stage.
            bear = defaultdict(list)
            for w in win:
                got = dict((name, v) for name, v in w.get('stages', []))
                cur = None
                for s in ORDER:
                    if s in got: cur = got[s]
                    if cur is not None and math.hypot(cur['x'], cur['y']) > .5: bear[s].append(ang(cur))
            stage = next((s for s in ORDER if spread(bear.get(s, [])) > 15), 'none over 15 deg (spread across stages)')
            if stage not in ('intercept-sprint', 'approach-and-gather', 'around-bodies', 'close-gather', 'held-tackle'):
                # Did the stage itself turn, or did it start or stop applying in the window?
                present = [any(nm == stage for nm, _ in w.get('stages', [])) for w in win]
                if stage != 'raw' and stage != 'final' and not all(present): stage += ' (applies on and off)'
            first[stage] += 1; owners[(stage, n['owner'], n['ownerKind'])] += 1
            evaluated[(stage, sum(1 for w in win if w['evaluated']))] += 1
            if len(examples[stage]) < 4:
                examples[stage].append(f"{path.split('/')[-1]} {n['k']} {n['slot']} t={n['t']:.2f} dist {n['dist']:.1f}")
tot = sum(C.values())
print(f"body re-steers {tot}")
for k, v in C.most_common(): print(f"  {v:5d} {100 * v / tot:4.0f}%  {k}")
m = sum(first.values())
print(f"command moved, aim steady ({m}): first stage whose request turned >15 deg in the last 0.45 s")
for k, v in first.most_common(): print(f"  {v:5d} {100 * v / m:4.0f}%  {k}   e.g. {'; '.join(examples[k][:2])}")
print("  by owner (controller/kind):")
for (s, o, kd), v in owners.most_common(12): print(f"     {v:4d}  {s:22s} {o}/{kd}")
print("switches into the chase, owner/planner sequence over the last 0.45 s (top 8):")
for k, v in switch.most_common(8): print(f"  {v:4d}  {k}")

# How the two largest first stages turn him.
#   around-bodies: per step, the detour's bearing minus the approach's (0 when no body is in the way).
#   raw: per step, whether the controller's raw command is the chase's output (within 2 deg).
how = Counter()
for path in sys.argv[1:]:
    seq = defaultdict(dict)
    for l in open(path):
        r = json.loads(l); seq[(r['k'], r['slot'])][round(r['t'] * 20)] = r
    for key, S in seq.items():
        for t, n in S.items():
            o = S.get(t - 4)
            if not o or o['c']['id'] != n['c']['id'] or n['dist'] is None or not (6 <= n['dist'] <= 15): continue
            sp = math.hypot(n['vel']['x'], n['vel']['y']); cs = math.hypot(n['c']['vel']['x'], n['c']['vel']['y'])
            if sp < 2 or sp / max(.1, cs) >= .8 or math.hypot(o['vel']['x'], o['vel']['y']) < 2: continue
            if not keep(o) or turn(ang(n['vel']), ang(o['vel'])) <= 15: continue
            win = [S.get(t - j) for j in range(0, 10)]; win = [w for w in win if w]
            if not all(S.get(t - j) and S[t - j]['planner'] == 'used' for j in range(5)): continue
            if spread([brg(w) for w in win if 'aim' in w and w['planner'] == 'used']) > 15: continue
            if spread([ang(w['final']) for w in win if w['final'] and math.hypot(w['final']['x'], w['final']['y']) > .5]) <= 15: continue
            st = [dict((nm, v) for nm, v in w.get('stages', [])) for w in win]
            def b(g, k): v = g.get(k); return ang(v) if v and math.hypot(v['x'], v['y']) > .5 else None
            ab = [b(g, 'around-bodies') for g in st]; ap = [b(g, 'approach-and-gather') for g in st]
            if spread([x for x in ab if x is not None]) > 15:
                d = [((x - y + 540) % 360 - 180) for x, y in zip(ab, ap) if x is not None and y is not None]
                active = [abs(v) > 1 for v in d]
                signs = {1 if v > 0 else -1 for v in d if abs(v) > 1}
                k = ('detour switches on and off' if any(active) and not all(active)
                     else 'detour flips side' if len(signs) > 1
                     else 'detour active throughout, its tangent rotates' if all(active) else 'no detour (approach itself)')
                how['around-bodies: ' + k] += 1
                if all(active) and len(signs) == 1:
                    how['   ...tangent-rotating: detour size p50 ' + str(int(sorted(abs(v) for v in d)[len(d) // 2] // 10 * 10)) + 's deg'] += 1
                continue
            rw = [b(g, 'raw') for g in st]
            if spread([x for x in rw if x is not None]) > 15:
                same = [x is not None and y is not None and turn(x, y) < 2 for x, y in zip(rw, ab if any(ab) else ap)]
                early = [S.get(t - j) for j in range(5, 10)]
                started = any(w is None or w['planner'] != 'used' for w in early)
                how['raw: ' + ('the chase started 0.25-0.45 s ago (entry seen through the lag)' if started
                               else 'raw is the chase output every step' if all(same) else 'raw departs from the chase output in some steps')] += 1
for k, v in sorted(how.items()): print(f"  {v:5d}  {k}")
