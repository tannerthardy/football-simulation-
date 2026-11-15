"""QB lane, 2026-11-15: the dropback as the handbook describes it (docs/football-handbook/qb-drops-and-pocket.md),
measured with the same code on NFL tracking and sim exports (EXPORT_FACING=1 for the sim's body facing).
Non-designed dropbacks, no play action, no screens, no spikes; the ball thrown (pass_forward).

Feet are not tracked and 10 Hz cannot resolve a step, so 'per step' is per share of the drop's depth, and 'which step
the ball leaves on' is read from the body: where he is against the top of his drop, his speed and what his last
movement was when the ball leaves.

  1. Drop speed: backward speed (yd/s) as he passes 25 / 50 / 75 / 90% of the depth he reaches; time snap -> top.
  2. Chest against travel: |facing - downfield| (0 = shoulders square to the line, 90 = side-on) and
     |facing - direction of travel| (180 = backpedal, 90 = moving side-on / crossover) at those same depth shares,
     while moving faster than 1.5 yd/s.
  3. The release: time plant -> release (the plant: after his fastest backward movement, the first frame he moves
     back slower than 1 yd/s); displacement plant -> release (up, across); his speed at the release; the hitch
     count (forward movements of 0.3+ yd after the plant, each ended by a stop under 0.5 yd/s or the release); whether
     the release comes on a forward movement (stepping into it), set (under 1 yd/s), or going back or sideways.
  5. The last 0.6 s before the release, on plays where he planted at least 0.6 s before it, against the nearest defender within 5 yd then: his displacement split into
     still (under 0.4 yd), up (upfield the largest part), across away from the man, across toward him, back.
     By the man's place: edge (more than 1.5 yd across and not in front of him) or in front / interior.
(4, the read index against the footwork, is sim-only: drop-reads.ts.)
usage: python3 -I drop-steps.py name=a.jsonl.gz,... [--plays-csv plays.csv] [--show N]"""
import sys, os, json, gzip, csv, re, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; PFF = {}; SHOW = 0
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
if '--show' in args:
    i = args.index('--show'); SHOW = int(args[i + 1]); del args[i:i + 2]
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen|bubble|tunnel|slip|now_', re.I)
FR = (0.25, 0.5, 0.75, 0.9)
q = lambda v, p=.5: (sorted(v)[int(p * (len(v) - 1))] if v else float('nan'))
ang = lambda a: abs((a + 540) % 360 - 180)


def one(raw):
    """Rows for one play, or None when it is not a dropback this measures."""
    p = Play(raw); qbs = p.who('O', 'QB'); fw = raw['events'].get('pass_forward')
    if not qbs or fw is None: return None
    qb = qbs[0]; xy = raw['xy']; dt = p.dt
    kend = min(len(xy) - 1, int(round(fw / dt)))
    X = [xy[k][2 * qb] for k in range(kend + 1)]; Y = [xy[k][2 * qb + 1] for k in range(kend + 1)]
    if any(v is None for v in X + Y) or kend < 6: return None
    x0 = X[0]; deep = min(X); depth = x0 - deep
    if depth < 1.0: return None
    O = raw.get('o'); fac = (lambda k: O[k][qb]) if O else (lambda k: None)
    v = lambda k: ((X[min(k + 1, kend)] - X[max(k - 1, 0)]) / ((min(k + 1, kend) - max(k - 1, 0)) * dt),
                   (Y[min(k + 1, kend)] - Y[max(k - 1, 0)]) / ((min(k + 1, kend) - max(k - 1, 0)) * dt))
    # The plant: after his fastest backward movement in the drop (to the first time within 0.25 yd of his deepest
    # point), the first frame he is moving back slower than 1 yd/s. Drift after it is pocket movement.
    kd = next(k for k, x in enumerate(X) if x <= deep + 0.25)
    kpk = min(range(1, kd + 1), key=lambda k: v(k)[0])
    kt = next((k for k in range(kpk, kend + 1) if v(k)[0] > -1.0), kend)
    if kt < 3: return None
    row = {'id': raw['id'], 'gun': x0 <= -3, 'depth': depth, 'top': kt * dt, 'rel': kend * dt, 'X': X[:kend + 1]}
    # 1-2: at each share of the depth, on the way back.
    sp, sq, tr = [], [], []
    for f in FR:
        k = next(k for k, x in enumerate(X) if x0 - x >= f * depth)
        vx, vy = v(k); s = math.hypot(vx, vy); sp.append(-vx)
        fk = fac(k)
        sq.append(ang(fk) if fk is not None else None)
        tr.append(ang(fk - math.degrees(math.atan2(vy, vx))) if fk is not None and s > 1.5 else None)
    row.update(sp=sp, sq=sq, tr=tr)
    # 3: the release.
    vx, vy = v(kend); row['vrel'] = math.hypot(vx, vy)
    row['up'] = X[kend] - X[kt]; row['across'] = abs(Y[kend] - Y[kt])
    hitch, moving, run0 = 0, False, None
    for k in range(kt, kend + 1):
        fx = v(k)[0]
        if not moving and fx > 0.5: moving, run0 = True, X[k - 1] if k > 0 else X[k]
        elif moving and (math.hypot(*v(k)) < 0.5 or k == kend):
            if X[k] - run0 >= 0.3: hitch += 1
            moving = False
    if moving and X[kend] - run0 >= 0.3: hitch += 1
    row['hitch'] = hitch
    row['on'] = 'set' if row['vrel'] < 1 else 'forward' if vx > 0.7 * row['vrel'] else 'back' if vx < -0.7 * row['vrel'] else 'side'
    # 5: the last 0.6 s against the nearest defender.
    # Only once his drop is over (planted 0.6 s or more before the release): otherwise the window is the drop.
    k6 = kend - int(round(0.6 / dt))
    if k6 >= kt:
        best = None
        for i, pl in enumerate(raw['players']):
            if pl['side'] != 'D' or xy[k6][2 * i] is None: continue
            d = math.hypot(xy[k6][2 * i] - X[k6], xy[k6][2 * i + 1] - Y[k6])
            if d < 5 and (best is None or d < best[0]): best = (d, xy[k6][2 * i], xy[k6][2 * i + 1])
        if best:
            dx, dy = X[kend] - X[k6], Y[kend] - Y[k6]; mdy = best[2] - Y[k6]
            edge = abs(mdy) > 1.5 and best[1] <= X[k6] + 1
            if math.hypot(dx, dy) < 0.4: c = 'still'
            elif abs(dx) >= abs(dy): c = 'up' if dx > 0 else 'back'
            else: c = 'across-away' if dy * mdy < 0 else 'across-toward'
            row['last'] = ('edge' if edge else 'front', c)
    return row


for arg in args:
    name, paths = arg.split('=', 1); rows = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id']); con = str((raw.get('cell') or {}).get('concept') or '')
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE' or pf['playAction'] == 'TRUE'): continue
            if raw.get('source') == 'sim' and (DES.search(con) or 'pa' in con.split('+') or con.startswith('pa_')): continue
            if raw.get('source') == 'sim' and (raw.get('labels') or {}).get('throwaway'): continue
            r = one(raw)
            if r: rows.append(r)
    print(f"== {name} (dropbacks thrown {len(rows)})")
    for g in (True, False):
        for lo, hi in ((1, 3.5), (3.5, 6), (6, 99)):
            S = [r for r in rows if r['gun'] == g and lo <= r['depth'] < hi]
            if len(S) < 20: continue
            print(f"  {'gun' if g else 'under center'} drop {lo}-{hi if hi < 99 else ''} yd (n {len(S)}): snap->plant p50 {q([r['top'] for r in S]):.2f} s, plant->release p25/50/75 "
                  f"{q([r['rel'] - r['top'] for r in S], .25):.2f}/{q([r['rel'] - r['top'] for r in S]):.2f}/{q([r['rel'] - r['top'] for r in S], .75):.2f} s")
            print("    1 backward speed p50 at depth share " + '  '.join(f"{f:.0%}: {q([r['sp'][i] for r in S]):.1f}" for i, f in enumerate(FR)))
            sq = [[r['sq'][i] for r in S if r['sq'][i] is not None] for i in range(len(FR))]
            tr = [[r['tr'][i] for r in S if r['tr'][i] is not None] for i in range(len(FR))]
            if any(sq):
                print("    2 |chest - downfield| p50 " + '  '.join(f"{f:.0%}: {q(sq[i]):.0f}" for i, f in enumerate(FR))
                      + " | |chest - travel| p50 " + '  '.join(f"{f:.0%}: {q(tr[i]):.0f}" for i, f in enumerate(FR)))
            n = len(S); hc = [sum(1 for r in S if min(r['hitch'], 2) == h) for h in (0, 1, 2)]
            on = {c: sum(1 for r in S if r['on'] == c) for c in ('set', 'forward', 'side', 'back')}
            print(f"    3 up from the plant p50 {q([r['up'] for r in S]):.1f} yd, across {q([r['across'] for r in S]):.1f} yd, speed at release p50 {q([r['vrel'] for r in S]):.1f} | hitches 0/1/2+ "
                  + '/'.join(f"{100 * h / n:.0f}" for h in hc) + "% | release " + ', '.join(f"{c} {100 * m / n:.0f}%" for c, m in on.items()))
    for side in ('edge', 'front'):
        L = [r['last'][1] for r in rows if r.get('last') and r['last'][0] == side]
        if len(L) < 20: continue
        print(f"  5 last 0.6 s, nearest man within 5 yd {side} (n {len(L)}, {100 * len(L) / len(rows):.0f}% of dropbacks): "
              + ', '.join(f"{c} {100 * L.count(c) / len(L):.0f}%" for c in ('still', 'up', 'across-away', 'across-toward', 'back')))
    for r in rows[:SHOW]:
        print(f"   [{r['id']}] gun {r['gun']} depth {r['depth']:.1f} plant {r['top']:.1f} rel {r['rel']:.1f} hitch {r['hitch']} on {r['on']} v {r['vrel']:.1f} last {r.get('last')}"
              f" | x " + ' '.join(f"{x:.1f}" for x in r['X'][::2]))
