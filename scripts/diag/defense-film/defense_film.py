"""The defense's assignment on film: one operator for NFL tracking (nfl-defense-film.py, BDB 2025) and the sim
(sim-defense-film.mts) in the same per-play format (Integration, 2026-11-23, the user's film room). Observation only.

Seats are classed by geometry for both sides (no labels): at the snap, a DB 8+ yd deep is a deep safety; any other DB
is over the receiver nearest him laterally (within 5 yd) and is a corner when that receiver is the widest on his side,
a slot defender otherwise; a box backer is an LB (or OLB) 2-8 yd deep within 6 yd of the ball laterally. Receivers are
offensive players other than the OL and the QB. Labels used, both sides: coverage family, man/zone, run / pass,
play action, the motion man, the blitzers.

  1 alignment at the snap, by coverage family: corners' cushion (depth off their receiver), leverage (+ inside),
    press share (cushion < 2.5 yd: the receiver stands about 1 yd off the ball); slot defenders the same; deep safeties' depth, width from the ball and the two
    safeties' split; box backers' depth; box count (defenders within the OL's width + 2 yd and 7.5 yd deep).
  2 disguise: the shell shown at the snap (two-high: two DBs 9+ yd deep 8+ yd apart; one-high: one or two together;
    zero: none) against the coverage played; rotation down (two-high shown, one-high played) and back.
  3 motion (one motion man moving 3+ yd across): who follows (lock: a defender who moves 0.6+ of the motion's width
    and ends within 3 yd of him; bump: defenders who move 0.5+ yd with it), deep safety rotation (2+ yd), and
    pre-snap collisions between defenders (centres under 0.6 yd at any pre-snap frame) per 100 plays.
  4 play action (dropbacks): box backers' and deep safeties' depth change from the snap at 0.5 / 1.0 / 1.5 / 2.5 s,
    their furthest step toward the line by 1.5 s, the deficit against straight dropbacks at 1.5 and 2.5 s, and their
    speed back (away from the line) over 1.5-2.5 s.
  5 run fits (runs with a carrier): at the carrier's arrival at the line (first x >= -1 after the handoff, else
    handoff + 0.8 s) the six gap lanes (A, B, C each side, from the OL at the snap): a lane is filled when a defender
    is within 1 yd of its centre laterally and 3 yd deep; unfilled lanes per play; the nearest defender to the carrier
    then; the deep safeties' time to 5 yd depth and distance to the carrier at 1.5 s; by coverage family.
  6 blitzers stopped by a non-blocker: a blitzer within 0.8 yd of an offensive player who is not blocking (NFL: ran a
    route and blocked nobody; sim: not in a blocking behaviour) whose speed is under 1.5 yd/s within 0.3 s after.
usage: python3 -I scripts/diag/defense-film/defense_film.py NFL.jsonl SIM.jsonl [SIM2.jsonl ...]"""
import json, sys, math, collections
import numpy as np

OL = {'T', 'G', 'C', 'OT', 'OG'}
DB = {'CB', 'S', 'SS', 'FS', 'DB'}
LB = {'LB', 'ILB', 'MLB', 'OLB'}
BLOCK_KINDS = {'pass-pro', 'run-block', 'screen-block', 'block-look'}  # the sim's blocking behaviours (a 'pa-fake' back is not one)


def load(paths):
    out = []
    for p in paths:
        for l in open(p):
            out.append(json.loads(l))
    return out


def snap_i(pl):
    t = pl['t']
    return min(range(len(t)), key=lambda i: abs(t[i]))


def at_t(pl, tt):
    t = pl['t']
    return min(range(len(t)), key=lambda i: abs(t[i] - tt))


def P(pl, fi, k):
    xy = pl['xy'][fi]
    return xy[2 * k], xy[2 * k + 1]


def roles(pl):
    """Seats at the snap by geometry."""
    s = snap_i(pl); ply = pl['players']; by = pl['ballY']
    off = [k for k, q in enumerate(ply) if q['side'] == 'O']
    rec = [k for k in off if ply[k]['pos'] not in OL and ply[k]['pos'] != 'QB']
    ol = [k for k in off if ply[k]['pos'] in OL]
    seat = {}
    for k, q in enumerate(ply):
        if q['side'] != 'D': continue
        x, y = P(pl, s, k)
        if q['pos'] in DB or q['pos'] == 'CB':
            if x >= 8: seat[k] = ('safety', None); continue
            near = min(rec, key=lambda r: abs(P(pl, s, r)[1] - y), default=None)
            if near is None or abs(P(pl, s, near)[1] - y) > 5: seat[k] = ('db-other', None); continue
            side = 1 if P(pl, s, near)[1] >= by else -1
            same = [r for r in rec if (P(pl, s, r)[1] - by) * side > 0]
            widest = max(same, key=lambda r: (P(pl, s, r)[1] - by) * side) if same else near
            seat[k] = ('corner' if near == widest else 'slot', near)
        elif q['pos'] in LB and 2 <= x <= 8 and abs(y - by) <= 6:
            seat[k] = ('box', None)
    return seat, rec, ol


def q(v, f=.5):
    v = sorted(x for x in v if x is not None and not (isinstance(x, float) and math.isnan(x)))
    return v[int(f * (len(v) - 1))] if v else float('nan')


def fmt(v):
    return f'{q(v):.2f} [{q(v, .25):.2f}, {q(v, .75):.2f}] n{len(v)}'


def flag(nfl, sim):
    a, b = q(nfl), q(sim); iqr = q(nfl, .75) - q(nfl, .25)
    return ' <<' if not math.isnan(a) and not math.isnan(b) and abs(a - b) > max(iqr / 2, 0.25) else ''


FAMS = ['cover0', 'cover1', 'cover3', 'cover2', 'cover2man', 'cover4', 'cover6']


def op_alignment(plays):
    R = collections.defaultdict(lambda: collections.defaultdict(list))
    for pl in plays:
        fam = pl['cov']['fam']
        if fam not in FAMS: continue
        s = snap_i(pl); by = pl['ballY']; seat, rec, ol = roles(pl)
        for k, (kind, near) in seat.items():
            x, y = P(pl, s, k)
            if kind in ('corner', 'slot'):
                rx, ry = P(pl, s, near); inside = 1 if ry > by else -1
                R[fam][f'{kind} cushion'].append(x - rx); R[fam][f'{kind} leverage(+in)'].append((ry - y) * inside)
                R[fam][f'{kind} press'].append(1.0 if x - rx < 2.5 else 0.0)  # the receiver stands about 1 yd off the ball: a press corner shows 1.5-2.5
            elif kind == 'box':
                R[fam]['box LB depth'].append(x)
        saf = sorted([k for k, v in seat.items() if v[0] == 'safety'], key=lambda k: -P(pl, s, k)[0])[:2]
        for k in saf:
            x, y = P(pl, s, k); R[fam]['safety depth'].append(x); R[fam]['safety width'].append(abs(y - by))
        if len(saf) == 2: R[fam]['safeties split'].append(abs(P(pl, s, saf[0])[1] - P(pl, s, saf[1])[1]))
        if ol:
            lo = min(P(pl, s, k)[1] for k in ol) - 2; hi = max(P(pl, s, k)[1] for k in ol) + 2
            R[fam]['box count'].append(sum(1 for k, qq in enumerate(pl['players']) if qq['side'] == 'D' and P(pl, s, k)[0] <= 7.5 and lo <= P(pl, s, k)[1] <= hi))
    return R


def shell_at(pl, fi, depth):
    ply = pl['players']; deep = [P(pl, fi, k) for k, qq in enumerate(ply) if qq['side'] == 'D' and (qq['pos'] in DB) and P(pl, fi, k)[0] >= depth]
    if not deep: return 'zero'
    ys = sorted(y for _, y in deep)
    return 'two-high' if len(deep) >= 2 and ys[-1] - ys[0] >= 8 else 'one-high'


def op_disguise(plays):
    T = collections.Counter(); intended = collections.Counter()
    for pl in plays:
        if pl['kind'] != 'pass' or pl['cov']['shell'] not in ('one-high', 'two-high', 'zero'): continue
        shown = shell_at(pl, snap_i(pl), 9); played = pl['cov']['shell']
        T[(shown, played)] += 1
        if pl['cov'].get('look'): intended[(pl['cov']['look'], played)] += 1
    return T, intended


def op_motion(plays):
    out = collections.Counter(); movers = []; coll = 0; pre_plays = 0; rows = []
    for pl in plays:
        pre = [i for i, t in enumerate(pl['t']) if t <= 0.001]
        if len(pre) > 1:
            pre_plays += 1
            D = [k for k, qq in enumerate(pl['players']) if qq['side'] == 'D']
            hit = False
            for i in pre:
                for a in range(len(D)):
                    for b in range(a + 1, len(D)):
                        xa, ya = P(pl, i, D[a]); xb, yb = P(pl, i, D[b])
                        if math.hypot(xa - xb, ya - yb) < 0.6: hit = True; break
                    if hit: break
                if hit: break
            coll += hit
        m = pl.get('motion')
        if m is None or m < 0 or len(pre) < 2: continue
        i0, s = pre[0], snap_i(pl)
        my0, my1 = P(pl, i0, m)[1], P(pl, s, m)[1]; dy = my1 - my0
        if abs(dy) < 3: continue
        sg = 1 if dy > 0 else -1; n = 0; lock = False; srot = False
        for k, qq in enumerate(pl['players']):
            if qq['side'] != 'D': continue
            d = (P(pl, s, k)[1] - P(pl, i0, k)[1]) * sg
            if d >= 0.5: n += 1
            if d >= 0.6 * abs(dy) and abs(P(pl, s, k)[1] - my1) <= 3: lock = True
            if qq['pos'] in DB and P(pl, i0, k)[0] >= 8 and (abs(P(pl, s, k)[1] - P(pl, i0, k)[1]) >= 2 or abs(P(pl, s, k)[0] - P(pl, i0, k)[0]) >= 2): srot = True
        man = 'man' if pl['cov']['man'] else 'zone'
        out[(man, 'lock' if lock else 'bump' if n else 'none')] += 1; out[(man, 'n')] += 1; out[(man, 'safety rotates')] += srot
        movers.append(n); rows.append((pl['id'], man, round(dy, 1), n, lock, srot))
    return out, movers, coll, pre_plays, rows


def op_pa(plays):
    R = collections.defaultdict(lambda: collections.defaultdict(list))
    for pl in plays:
        if not pl['dropback']: continue
        g = 'PA' if pl['pa'] else 'DB'
        s = snap_i(pl); seat, _, _ = roles(pl)
        for k, (kind, _) in seat.items():
            if kind not in ('box', 'safety'): continue
            x0 = P(pl, s, k)[0]
            for tt in (0.5, 1.0, 1.5, 2.5):
                fi = at_t(pl, tt)
                if abs(pl['t'][fi] - tt) < 0.06: R[(kind, g)][f'dx {tt}'].append(P(pl, fi, k)[0] - x0)
            f15 = at_t(pl, 1.5); f25 = at_t(pl, 2.5)
            xs = [P(pl, i, k)[0] for i in range(s, f15 + 1)]
            R[(kind, g)]['furthest step in by 1.5'].append(min(xs) - x0)
            if abs(pl['t'][f25] - 2.5) < 0.06: R[(kind, g)]['speed back 1.5-2.5'].append((P(pl, f25, k)[0] - P(pl, f15, k)[0]) / 1.0)
    return R


def gaps(pl, s, ol):
    ys = sorted(P(pl, s, k)[1] for k in ol)
    if len(ys) < 5: return []
    c = ys[len(ys) // 2]; L = [y for y in ys if y < c]; H = [y for y in ys if y > c]
    out = []
    for side, lst in ((-1, sorted(L, reverse=True)), (1, sorted(H))):
        if len(lst) < 2: continue
        g, t = lst[0], lst[1]
        out += [((c + g) / 2, f'A{side:+d}'), ((g + t) / 2, f'B{side:+d}'), (t + side * 1.2, f'C{side:+d}')]
    return out


def op_runfit(plays):
    R = collections.defaultdict(lambda: collections.defaultdict(list)); rows = []
    for pl in plays:
        if pl['kind'] != 'run' or pl.get('carrier') is None or pl.get('handoff') is None: continue
        fam = pl['cov']['fam']; s = snap_i(pl); seat, _, ol = roles(pl); c = pl['carrier']
        h = at_t(pl, pl['handoff'])
        ti = next((i for i in range(h, len(pl['t'])) if P(pl, i, c)[0] >= -1), at_t(pl, pl['handoff'] + 0.8))
        G = gaps(pl, s, ol)
        if not G: continue
        D = [k for k, qq in enumerate(pl['players']) if qq['side'] == 'D']
        filled = sum(1 for gy, _ in G if any(abs(P(pl, ti, k)[1] - gy) <= 1.0 and P(pl, ti, k)[0] <= 3 for k in D))
        un = len(G) - filled
        cx, cy = P(pl, ti, c); near = min(math.hypot(P(pl, ti, k)[0] - cx, P(pl, ti, k)[1] - cy) for k in D)
        R[fam]['unfilled lanes (of 6)'].append(un); R[fam]['nearest defender at the line'].append(near)
        R[fam]['time to the line'].append(pl['t'][ti])
        saf = [k for k, v in seat.items() if v[0] == 'safety']
        f15 = at_t(pl, 1.5)
        for k in saf:
            t5 = next((pl['t'][i] for i in range(s, len(pl['t'])) if P(pl, i, k)[0] <= 5), None)
            R[fam]['safety time to 5 yd'].append(t5 if t5 is not None else 9.9)
            R[fam]['safety to carrier 1.5 s'].append(math.hypot(P(pl, f15, k)[0] - P(pl, f15, c)[0], P(pl, f15, k)[1] - P(pl, f15, c)[1]))
        rows.append((pl['id'], fam, un, round(near, 2), pl['t'][ti]))
    return R, rows


def op_blitz(plays):
    n = stopped = 0; rows = []
    for pl in plays:
        if pl['kind'] != 'pass': continue
        ply = pl['players']
        # A blitzer, both sides: an LB or DB off the ball (2+ yd deep at the snap) who rushed (NFL: an initial pass rusher;
        # sim: a rush or blitz behaviour 0.3 s after the snap). Edge rushers on the line are not blitzers.
        s0 = snap_i(pl)
        rushed = (lambda k: ply[k].get('rush')) if pl['src'] == 'nfl' else (lambda k: ply[k].get('k0') in ('rush', 'blitz'))
        bl = [k for k, qq in enumerate(ply) if qq['side'] == 'D' and (qq['pos'] in LB or qq['pos'] in DB) and P(pl, s0, k)[0] >= 2 and rushed(k)]
        nonb = [k for k, qq in enumerate(ply) if qq['side'] == 'O' and qq['pos'] not in OL and qq['pos'] != 'QB'
                and ((qq.get('route') and not qq.get('block')) if pl['src'] == 'nfl' else (qq.get('k0', '') not in BLOCK_KINDS))]
        s = snap_i(pl); end = at_t(pl, min(pl['throw'] or 3.0, 3.0))
        for b in bl:
            n += 1; hit = False
            for i in range(s + 1, end):
                bx, by = P(pl, i, b)
                for o in nonb:
                    ox, oy = P(pl, i, o)
                    if math.hypot(bx - ox, by - oy) < 0.8:
                        j = min(i + 3, len(pl['t']) - 1)
                        sp = math.hypot(P(pl, j, b)[0] - P(pl, j - 1, b)[0], P(pl, j, b)[1] - P(pl, j - 1, b)[1]) / max(1e-3, pl['t'][j] - pl['t'][j - 1])
                        if sp < 1.5: hit = True; rows.append((pl['id'], ply[b]['pos'], ply[o]['pos'], round(pl['t'][i], 2), round(sp, 2)))
                        break
                if hit: break
            stopped += hit
    return n, stopped, rows


def table(title, A, B, keys_order=None):
    print(f'\n## {title}')
    for fam in [f for f in (keys_order or sorted(set(A) | set(B)))]:
        if fam not in A and fam not in B: continue
        print(f'  {fam}:')
        for m in sorted(set(A.get(fam, {})) | set(B.get(fam, {}))):
            a, b = A.get(fam, {}).get(m, []), B.get(fam, {}).get(m, [])
            print(f'    {m:34s} NFL {fmt(a):34s} sim {fmt(b)}{flag(a, b)}')


if __name__ == '__main__':
    nfl = load([sys.argv[1]]); sim = load(sys.argv[2:])
    print(f'plays: NFL {len(nfl)} (runs {sum(p["kind"] == "run" for p in nfl)}, PA {sum(p["pa"] for p in nfl)}) | sim {len(sim)} (runs {sum(p["kind"] == "run" for p in sim)}, PA {sum(p["pa"] for p in sim)})')
    print('(<< : the sim median differs from the NFL median by more than half the NFL interquartile range)')
    table('1. Alignment at the snap, by coverage family: p50 [p25, p75]', op_alignment(nfl), op_alignment(sim), FAMS)
    for lab, data in (('NFL', nfl), ('sim', sim)):
        T, I = op_disguise(data); tot = sum(T.values())
        print(f'\n## 2. Disguise ({lab}, pass plays {tot}): shell shown at the snap -> coverage played')
        for (sh, pl_), v in sorted(T.items(), key=lambda kv: -kv[1]): print(f'    shown {sh:9s} played {pl_:9s} {v:5d} ({100 * v / tot:.1f}%)')
        down = sum(v for (a, b), v in T.items() if a == 'two-high' and b != 'two-high'); back = sum(v for (a, b), v in T.items() if a != 'two-high' and b == 'two-high')
        print(f'    rotate down (two-high shown, not played) {100 * down / max(1, tot):.1f}% | rotate back (two-high played, not shown) {100 * back / max(1, tot):.1f}%')
        if I: print('    sim call (look -> played):', dict(I))
    for lab, data in (('NFL', nfl), ('sim', sim)):
        o, mv, coll, pre, rows = op_motion(data)
        print(f'\n## 3. Motion ({lab}): motion plays (3+ yd across) man {o[("man", "n")]} zone {o[("zone", "n")]}')
        for man in ('man', 'zone'):
            nn = max(1, o[(man, 'n')])
            print(f'    {man}: lock {100 * o[(man, "lock")] / nn:.0f}% | bump only {100 * o[(man, "bump")] / nn:.0f}% | nobody {100 * o[(man, "none")] / nn:.0f}% | a deep safety rotates {100 * o[(man, "safety rotates")] / nn:.0f}%')
        print(f'    defenders moving with motion p50 {q(mv)} | pre-snap collisions between defenders: {coll} of {pre} plays with pre-snap frames ({100 * coll / max(1, pre):.1f}%)')
        print('    sample:', rows[:12])
    A, B = op_pa(nfl), op_pa(sim)
    print('\n## 4. Play action: depth change from the snap (- = toward the line), p50 [p25, p75]')
    for kind in ('box', 'safety'):
        for g in ('DB', 'PA'):
            print(f'  {kind} {"straight dropback" if g == "DB" else "play action"}:')
            for m in sorted(set(A[(kind, g)]) | set(B[(kind, g)])):
                a, b = A[(kind, g)][m], B[(kind, g)][m]
                print(f'    {m:30s} NFL {fmt(a):34s} sim {fmt(b)}{flag(a, b)}')
    for lab, R in (('NFL', A), ('sim', B)):
        for kind in ('box', 'safety'):
            d15 = q(R[(kind, 'PA')]['dx 1.5']) - q(R[(kind, 'DB')]['dx 1.5']); d25 = q(R[(kind, 'PA')]['dx 2.5']) - q(R[(kind, 'DB')]['dx 2.5'])
            print(f'    {lab} {kind}: PA deficit against dropbacks at 1.5 s {d15:+.2f} yd, at 2.5 s {d25:+.2f} yd')
    RA, ra = op_runfit(nfl); RB, rb = op_runfit(sim)
    table('5. Run fits by coverage family: p50 [p25, p75]', RA, RB, FAMS)
    print('    NFL sample:', ra[:12]); print('    sim sample:', rb[:12])
    for lab, data in (('NFL', nfl), ('sim', sim)):
        n, st, rows = op_blitz(data)
        print(f'\n## 6. Blitzers stopped by a non-blocker ({lab}): {st} of {n} blitzers ({100 * st / max(1, n):.1f}%) | sample {rows[:12]}')
