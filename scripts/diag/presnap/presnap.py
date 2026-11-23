"""Pre-snap movement: one operator on NFL (nfl-presnap.py) and sim (sim-presnap.mts) rows (Integration, 2026-11-23,
the user's request). Positions only; nothing of the QB's cadence, hands or legs is in the data (the snap time and the
line set are the only clocks both sides share). Defenders by group: DL (DE / DT / NT), LB, CB (CB / NB / DB), S
(S / SS / FS); by depth at the start of the window: on the line (< 1.5 yd), box (1.5-7), deep (7+).
Windows: the last 3.0 s before the snap (both sides; our pre-snap phase is at most 3 s except for long motions), and,
NFL only, from the line set. A play with no pre-snap frames in ours counts as standing still (that is what it is).
  1 movement per defender: path length (over 0.3 s samples, so tracking jitter does not add up), net displacement,
    depth change and width change (net), moves (a move: a run of steps faster than 0.5 yd/s that covers 0.5 yd or more),
    when the moves start (s before the snap);
  2 walk-ups: a LB or S 4+ yd deep at the window's start who comes within 2.5 yd of the line; cycles (up at <= 2.5, back
    at >= 4.0); at the snap still up or backed off; post-snap job (rush = initial pass rusher / rush or blitz behavior)
    and look vs job: walked up at the snap and dropped (a bluff) / came from 4+ yd at the snap (a disguised rusher);
    by down and distance;
  3 front movement: DL moving 1+ yd laterally (a slide), LB moving 1.5+ yd laterally (a re-stack);
  4 motion: plays with man_in_motion: per defender, the share who move 1+ yd after the motion starts, how far, how
    soon (first move start minus the motion's start); the deep-safety count (deeper than 9 yd) at the motion's start
    and at the snap (a rotation is a change);
  5 the last defensive move's start before the snap, every move's start, and the share of defenders moving at the snap;
  collisions: two defenders' centres under 0.6 yd at any pre-snap frame: whether both were moving (each faster than 0.5
    yd/s there) and whether they were crossing (their relative lateral order swaps within 0.5 s), per 100 plays.
usage: python3 -I scripts/diag/presnap/presnap.py NFL.jsonl SIM.jsonl [SIM2 ...]"""
import json, sys, math, collections
import numpy as np

GROUP = {'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'LB': 'LB', 'ILB': 'LB', 'MLB': 'LB', 'OLB': 'LB', 'CB': 'CB', 'NB': 'CB', 'DB': 'CB', 'S': 'S', 'SS': 'S', 'FS': 'S'}


def q(v, f=.5): return float(np.percentile(v, f * 100)) if len(v) else float('nan')
def f3(v): return f'{q(v):4.1f} ({q(v, .25):4.1f}-{q(v, .75):4.1f})' if len(v) else '   -'
def pct(a, b): return f'{100 * a / max(1, b):4.1f}%'


def band(d): return 'line' if d < 1.5 else 'box' if d < 7 else 'deep'


def moves(P, T):
    """Runs of 0.1 s steps faster than 0.5 yd/s covering 0.5 yd or more: [(start t, end t, length)]."""
    out, run = [], None
    for k in range(1, len(P)):
        dt = T[k] - T[k - 1]
        if dt <= 0: continue
        d = math.dist(P[k], P[k - 1])
        if d / dt > 0.5:
            run = run or [T[k - 1], T[k], 0.0]; run[1] = T[k]; run[2] += d
        elif run:
            if run[2] >= 0.5: out.append(tuple(run))
            run = None
    if run and run[2] >= 0.5: out.append(tuple(run))
    return out


def window(r, lo):
    """Frame indices with lo <= t <= 0 (t < 0 strictly before the snap; the snap frame included)."""
    return [k for k, t in enumerate(r['t']) if lo - 1e-9 <= t <= 1e-9]


def analyse(R, lab, lo, nfl_ls=False):
    print(f'\n## {lab}: window {"from the line set" if nfl_ls else f"the last {-lo:.1f} s"}; {len(R)} plays, {sum(1 for r in R if r["t"][0] < -0.05)} with pre-snap frames')
    per = collections.defaultdict(list); starts = collections.defaultdict(list); lastmove = []
    wu = collections.Counter(); wu_dd = collections.defaultdict(lambda: [0, 0]); front = collections.Counter(); nD = collections.Counter()
    mot = collections.defaultdict(list); rot = collections.Counter(); coll = collections.Counter(); npre = 0
    for r in R:
        W = window(r, r['ls'] if nfl_ls and r['ls'] is not None else lo)
        if not W: continue
        T = [r['t'][k] for k in W]; pre = T[0] < -0.05; npre += pre
        D = [i for i, p in enumerate(r['players']) if p['side'] == 'D']
        Pd = {i: [(r['xy'][k][2 * i], r['xy'][k][2 * i + 1]) for k in W] for i in D}
        lastend = None
        for i in D:
            g = GROUP.get(r['players'][i]['pos']); P = Pd[i]
            if not g: continue
            b = band(P[0][0]); key = (g, b); nD[key] += 1
            Q = P[::3] + ([P[-1]] if (len(P) - 1) % 3 else [])  # 0.3 s samples: steps of tracking jitter do not add up
            path = sum(math.dist(Q[k], Q[k - 1]) for k in range(1, len(Q)))
            mv = moves(P, T)
            per[key].append((path, math.dist(P[-1], P[0]), P[-1][0] - P[0][0], abs(P[-1][1]) - abs(P[0][1]), len(mv)))
            for s, e, _ in mv: starts[g].append(-s); lastend = max(lastend, s) if lastend is not None else s
            if len(P) > 1 and math.dist(P[-1], P[-2]) / max(1e-6, T[-1] - T[-2]) > 0.5: wu['moving at the snap'] += 1
            wu['defenders'] += 1
            # 2 walk-ups
            if g in ('LB', 'S') and P[0][0] >= 4:
                ups, state, cyc = 0, 'back', 0
                for x, _ in P:
                    if state == 'back' and x <= 2.5: state = 'up'; ups += 1
                    elif state == 'up' and x >= 4.0: state = 'back'
                if ups:
                    rush = r['players'][i]['rush']; up_at_snap = P[-1][0] <= 2.5
                    wu['walk-up'] += 1; wu['cycles 2+'] += ups >= 2; wu['up at the snap'] += up_at_snap; wu['backed off'] += not up_at_snap
                    wu['up at the snap, rushed'] += up_at_snap and rush; wu['up at the snap, dropped (bluff)'] += up_at_snap and not rush
                    wu['backed off, rushed'] += (not up_at_snap) and rush
                    dd = ('3rd/4th & 7+' if r['down'] >= 3 and r['togo'] >= 7 else '3rd/4th & <7' if r['down'] >= 3 else '1st/2nd')
                    wu_dd[dd][0] += 1
            if g in ('LB', 'S'):
                if P[-1][0] >= 4 and r['players'][i]['rush']: wu['rusher from 4+ yd at the snap (disguised)'] += 1
                wu['LB/S defenders'] += 1
            if g == 'DL' and abs(P[-1][1] - P[0][1]) >= 1: front['DL slide 1+ yd'] += 1
            if g == 'LB' and abs(P[-1][1] - P[0][1]) >= 1.5: front['LB re-stack 1.5+ yd'] += 1
        dd = ('3rd/4th & 7+' if r['down'] >= 3 and r['togo'] >= 7 else '3rd/4th & <7' if r['down'] >= 3 else '1st/2nd'); wu_dd[dd][1] += 1
        if lastend is not None: lastmove.append(-lastend)
        # 4 motion
        ms = [t for t, e in r['events'] if e == 'man_in_motion' and t < 0]
        if ms:
            m0 = max(min(ms), T[0]); k0 = min(range(len(T)), key=lambda k: abs(T[k] - m0))
            deep0 = sum(1 for i in D if GROUP.get(r['players'][i]['pos']) in ('S', 'CB') and Pd[i][k0][0] > 9)
            deep1 = sum(1 for i in D if GROUP.get(r['players'][i]['pos']) in ('S', 'CB') and Pd[i][-1][0] > 9)
            rot['motion plays'] += 1; rot['deep count changed'] += deep0 != deep1; rot['2 -> 1 (rotate down)'] += deep0 >= 2 and deep1 == 1; rot['1 -> 2'] += deep0 == 1 and deep1 >= 2
            for i in D:
                g = GROUP.get(r['players'][i]['pos'])
                if not g: continue
                P = Pd[i][k0:]; TT = T[k0:]
                d = math.dist(P[-1], P[0]); mv = [m for m in moves(P, TT) if m[0] > TT[0] + 1e-9]
                mot[g].append((d, (mv[0][0] - m0) if mv else None))
        # collisions
        if pre:
            hit = None
            for a in range(len(D)):
                for b_ in range(a + 1, len(D)):
                    i, j = D[a], D[b_]
                    for k in range(len(W) - 1):
                        if T[k] >= -1e-9: break
                        if math.dist(Pd[i][k], Pd[j][k]) < 0.6:
                            vi = math.dist(Pd[i][k + 1], Pd[i][k]) / 0.1; vj = math.dist(Pd[j][k + 1], Pd[j][k]) / 0.1
                            k2 = min(len(W) - 1, k + 5); k1 = max(0, k - 5)
                            cross = (Pd[i][k1][1] - Pd[j][k1][1]) * (Pd[i][k2][1] - Pd[j][k2][1]) < 0
                            hit = hit or (vi > 0.5 and vj > 0.5, cross)
                            break
            if hit: coll['plays'] += 1; coll['both moving'] += hit[0]; coll['crossing'] += hit[1]
    print(f'\n### 1 movement per defender in the window, p50 (p25-p75); mean moves; share with any move')
    print('| group | depth | n | path yd | net yd | depth change (net, + deeper) | width change (net, + wider) | moves (mean) | any move |')
    print('|---|---|---|---|---|---|---|---|---|')
    for g in ('DL', 'LB', 'CB', 'S'):
        for b in ('line', 'box', 'deep'):
            A = per[(g, b)]
            if len(A) < 10: continue
            print(f'| {g} | {b} | {len(A)} | {f3([a[0] for a in A])} | {f3([a[1] for a in A])} | {f3([a[2] for a in A])} | {f3([a[3] for a in A])} | {np.mean([a[4] for a in A]):.2f} | {pct(sum(a[4] > 0 for a in A), len(A))} |')
    print('\n  move starts, s before the snap, p50 (p25-p75): ' + ' | '.join(f'{g} {f3(starts[g])} (n {len(starts[g])})' for g in ('DL', 'LB', 'CB', 'S')))
    print(f'  5 the last defensive move to start before the snap: p50 {q(lastmove):.2f} s (p25 {q(lastmove, .25):.2f}, p75 {q(lastmove, .75):.2f}); plays with no defensive move {pct(len(R) - len(lastmove), len(R))}; defenders moving (> 0.5 yd/s) at the snap {pct(wu["moving at the snap"], wu["defenders"])}')
    n = wu['LB/S defenders']
    print(f'\n### 2 walk-ups (LB / S 4+ yd deep coming within 2.5 yd of the line), per LB/S defender and per play')
    print(f'  walk-ups {wu["walk-up"]} ({pct(wu["walk-up"], n)} of LB/S, {wu["walk-up"] / max(1, len(R)):.3f} per play); 2+ cycles {pct(wu["cycles 2+"], wu["walk-up"])}; up at the snap {pct(wu["up at the snap"], wu["walk-up"])}, backed off {pct(wu["backed off"], wu["walk-up"])}')
    print(f'  up at the snap: rushed {wu["up at the snap, rushed"]}, dropped (bluff) {wu["up at the snap, dropped (bluff)"]}; backed off and rushed {wu["backed off, rushed"]}; rushers from 4+ yd at the snap {wu["rusher from 4+ yd at the snap (disguised)"]} ({wu["rusher from 4+ yd at the snap (disguised)"] / max(1, len(R)):.3f} per play)')
    print('  walk-ups per play by down: ' + ' | '.join(f'{k} {v[0] / max(1, v[1]):.3f} (plays {v[1]})' for k, v in sorted(wu_dd.items())))
    print(f'\n### 3 front movement: DL slides 1+ yd {front["DL slide 1+ yd"] / max(1, len(R)):.3f} per play; LB re-stacks 1.5+ yd {front["LB re-stack 1.5+ yd"] / max(1, len(R)):.3f} per play')
    print(f'\n### 4 motion ({rot["motion plays"]} plays): deep-safety count changed {pct(rot["deep count changed"], rot["motion plays"])} (2 -> 1 {pct(rot["2 -> 1 (rotate down)"], rot["motion plays"])}, 1 -> 2 {pct(rot["1 -> 2"], rot["motion plays"])})')
    for g in ('DL', 'LB', 'CB', 'S'):
        A = mot[g]
        if not A: continue
        mv = [a for a in A if a[0] >= 1]
        print(f'  {g}: moved 1+ yd after the motion started {pct(len(mv), len(A))}; how far (movers) {f3([a[0] for a in mv])}; first new move start after the motion start {f3([a[1] for a in A if a[1] is not None])} s')
    print(f'\n### collisions: defender centres under 0.6 yd before the snap: {coll["plays"]} of {npre} plays with pre-snap frames ({pct(coll["plays"], npre)}); both moving {pct(coll["both moving"], coll["plays"])}, crossing {pct(coll["crossing"], coll["plays"])}')


if __name__ == '__main__':
    N = [json.loads(l) for l in open(sys.argv[1])]
    S = [json.loads(l) for p in sys.argv[2:] for l in open(p)]
    analyse(N, 'NFL', -3.0); analyse(S, 'sim', -3.0); analyse(N, 'NFL', -3.0, nfl_ls=True)
