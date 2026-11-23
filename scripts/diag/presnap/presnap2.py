"""Pre-snap movement, part 2 (agreed with Rules, 2026-11-23): same rows and operator conventions as presnap.py.
  4b late rotation: the start of each defender's last move before the snap, binned under 0.5 / 0.5-1.0 / over 1.0 s
     before the snap (or none), by group; safeties apart: deep safeties (7+ yd) whose last move starts in the last
     1.0 s;
  9 caught moving: a defender faster than 1 yd/s at the snap frame (centred difference), by group; on the post-snap
     side, his time from the snap to 2 yd/s in any direction, against defenders standing still (under 0.3 yd/s) in the
     same group: the first-step lag the coaching cites as the cost;
  2b A-gap mug: both inside backers (LB) within 2.5 yd of the line and within 2.5 yd laterally of the ball at the snap;
     per play, and whether either rushed;
  1b settling vs anticipating (a proxy; the two cannot be told apart in positions): defensive movement before and
     after the offense's last movement (the last offensive player's move ends), path per defender in each part.
usage: python3 -I scripts/diag/presnap/presnap2.py NFL.jsonl SIM.jsonl [SIM2 ...]"""
import json, sys, math, collections
import numpy as np
GROUP = {'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'LB': 'LB', 'ILB': 'LB', 'MLB': 'LB', 'OLB': 'LB', 'CB': 'CB', 'NB': 'CB', 'DB': 'CB', 'S': 'S', 'SS': 'S', 'FS': 'S'}
OL = {'T', 'G', 'C', 'OT', 'OG', 'OL'}


def q(v, f=.5): return float(np.percentile(v, f * 100)) if len(v) else float('nan')
def f3(v): return f'{q(v):4.2f} ({q(v, .25):4.2f}-{q(v, .75):4.2f})' if len(v) else '-'
def pct(a, b): return f'{100 * a / max(1, b):4.1f}%'


def moves(P, T):
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


def analyse(R, lab):
    late = collections.defaultdict(collections.Counter); deepS = collections.Counter()
    caught = collections.Counter(); lag = collections.defaultdict(list); mug = collections.Counter(); sett = collections.defaultdict(lambda: [[], []])
    for r in R:
        T = r['t']; k0 = min(range(len(T)), key=lambda k: abs(T[k]))
        if abs(T[k0]) > 0.06 or k0 + 2 >= len(T): continue
        W = [k for k in range(len(T)) if T[k] >= -3.0 - 1e-9 and k <= k0]; TW = [T[k] for k in W]
        pl = r['players']; P = lambda i, k: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1])
        # the offense's last movement end before the snap
        oe = None
        for i, p in enumerate(pl):
            if p['side'] != 'O' or p['pos'] in OL: continue
            for s, e, _ in moves([P(i, k) for k in W], TW):
                if e < -0.05: oe = max(oe, e) if oe is not None else e
        lbs = []
        for i, p in enumerate(pl):
            g = GROUP.get(p['pos'])
            if p['side'] != 'D' or not g: continue
            PW = [P(i, k) for k in W]; mv = [m for m in moves(PW, TW) if m[0] < -0.05]
            last = -mv[-1][0] if mv else None
            late[g]['none' if last is None else '< 0.5 s' if last < 0.5 else '0.5-1.0 s' if last <= 1.0 else '> 1.0 s'] += 1
            if g == 'S' and PW[0][0] >= 7:
                deepS['n'] += 1; deepS['last move in the last 1.0 s'] += last is not None and last <= 1.0
            v0 = math.dist(P(i, k0 + 1), P(i, k0 - 1)) / max(1e-6, T[k0 + 1] - T[k0 - 1]) if k0 > 0 else 0
            # first step: time from the snap to 2 yd/s
            t2 = None
            for k in range(k0 + 1, len(T)):
                if T[k] > 1.5: break
                if math.dist(P(i, k), P(i, k - 1)) / max(1e-6, T[k] - T[k - 1]) >= 2: t2 = T[k]; break
            if v0 > 1: caught[g] += 1; lag[(g, 'moving')].append(t2 if t2 is not None else 1.6)
            elif v0 < 0.3: lag[(g, 'still')].append(t2 if t2 is not None else 1.6)
            caught[(g, 'n')] += 1
            x0, y0 = P(i, k0)
            if g == 'LB' and x0 <= 2.5 and abs(y0) <= 2.5: lbs.append(i)
            if oe is not None:
                pre = [P(i, k) for k in W if T[k] <= oe]; post = [P(i, k) for k in W if T[k] >= oe]
                path = lambda Q: sum(math.dist(Q[j], Q[j - 1]) for j in range(3, len(Q), 3)) if len(Q) > 3 else 0.0
                sett[g][0].append(path(pre[::1])); sett[g][1].append(path(post))
        mug['plays'] += 1
        if len(lbs) >= 2: mug['A-gap mug'] += 1; mug['mug, a backer rushed'] += any(pl[i]['rush'] for i in lbs)
    print(f'\n## {lab}: {mug["plays"]} plays')
    print('  4b last move start before the snap (last 3 s): ' + ' | '.join(f'{g}: ' + ', '.join(f'{b} {pct(late[g][b], sum(late[g].values()))}' for b in ('> 1.0 s', '0.5-1.0 s', '< 0.5 s', 'none')) for g in ('DL', 'LB', 'CB', 'S')))
    print(f'     deep safeties (7+ yd) whose last move starts in the last 1.0 s: {pct(deepS["last move in the last 1.0 s"], deepS["n"])} (n {deepS["n"]})')
    print('  9 caught moving (> 1 yd/s at the snap): ' + ' | '.join(f'{g} {pct(caught[g], caught[(g, "n")])}' for g in ('DL', 'LB', 'CB', 'S')))
    print('    time from the snap to 2 yd/s, moving vs still, p50 (p25-p75) s: ' + ' | '.join(f'{g} {f3(lag[(g, "moving")])} vs {f3(lag[(g, "still")])}' for g in ('DL', 'LB', 'CB', 'S')))
    print(f'  2b A-gap mug (both inside backers within 2.5 yd of the line and of the ball): {pct(mug["A-gap mug"], mug["plays"])} of plays; a backer rushed on {pct(mug["mug, a backer rushed"], mug["A-gap mug"])} of them')
    print('  1b path per defender before / after the offense\'s last movement (plays where the offense moved): ' + ' | '.join(f'{g} {q(sett[g][0]):.2f} / {q(sett[g][1]):.2f} (mean {np.mean(sett[g][0]) if sett[g][0] else float("nan"):.2f} / {np.mean(sett[g][1]) if sett[g][1] else float("nan"):.2f})' for g in ('DL', 'LB', 'CB', 'S')))


if __name__ == '__main__':
    analyse([json.loads(l) for l in open(sys.argv[1])], 'NFL')
    analyse([json.loads(l) for p in sys.argv[2:] for l in open(p)], 'sim')
