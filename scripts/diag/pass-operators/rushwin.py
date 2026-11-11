"""How pass rushers beat their blockers: when, where and how they win. Same code on
NFL tracking and sim plays (common play format; x = yards past the line toward
the defense). Report only (Integration, 2026-11-11).

Dropbacks with 5+ OL and one QB. The rep runs from the snap to the throw (or the
end, capped at 4.0 s).
- Rusher: by 1.5 s (or the rep's end) more than 1.0 yd behind his snap spot and
  within 3 yd of the line (rushcount.py). Edge: lined up outside the tackle's
  snap y; interior otherwise.
- Protection size: offensive non-QB players behind the line within the OL span
  +- 3 yd at that frame (rushcount.py), banded 5-, 6, 7+.
- His blocker at a frame: the nearest member of the protection (the OL, and
  any other offensive non-QB player still in protection at 1.5 s by the
  protector definition above; a receiver brushing past on his release is not
  a blocker). Engaged: that player within 1.2 yd.
- Winning (Flex's qb-leave.py): nearer the QB than his blocker is, or no blocker
  within 1.2 yd. A rusher counts as winning only from 0.5 s, and after he has
  been engaged; a rusher never engaged before he is within 2 yd of the QB is
  "unblocked". First win: the first such frame, held 0.2 s.
- At the first win: distance to the QB, and bearing from the QB (front: within
  45 deg of upfield; edge 45-135; behind).
- Warning: first win -> first frame within 1 yd of the QB.
- Pressure: first frame from 0.6 s within 2 yd of the QB (before that an
  under-center QB is still at the line). How it arrived:
  - unblocked;
  - walked back: his blocker within 1.2 yd of him, nearer the QB, and he is
    square behind him (within 0.5 yd of the blocker-QB line): a bull rush
    driving the man into the QB;
  - ridden: the blocker attached and nearer the QB but the rusher beside him
    (more than 0.5 yd off that line): run around the QB at the edge;
  - won edge / won interior: otherwise, by alignment.
- Corner: for an edge rusher who wins, the first frame he is deeper than his
  blocker; his depth relative to the QB then (x_rusher - x_QB; + = short of the QB).
- Set at contact: at his first engaged frame, the blocker's depth off the line
  and his lateral move from his own snap spot, outward (+) or inward.
- Rep shape: at 1.0 / 1.5 / 2.0 s, while engaged (blocker within 1.5 yd):
  rusher-to-QB minus blocker-to-QB distance (+: the blocker is between), the
  blocker's distance to the QB, and the rusher's lateral offset off the line
  from the blocker to the QB (0: square in front; ~0.5+: half-man or past).

  python3 -I scripts/diag/pass-operators/rushwin.py PLAYS.jsonl.gz [...]
"""
import collections
import gzip
import json
import math
import statistics as st
import sys

CAP = 4.0
# Pressure is counted from here: an under-center QB starts within 2 yd of the
# interior line, so earlier frames are the snap, not a rush (2.7% of NFL pressures).
PRESS_FROM = 0.6
# STRICT=1: a win must be clear (0.3 yd nearer the QB than his blocker, or free)
# and closing on the QB at 1 yd/s or more over the next 0.3 s.
STRICT = bool(__import__('os').environ.get('STRICT'))
DUMP = bool(__import__('os').environ.get('DUMP'))


def q(v, fmt='{:.2f}'):
    if len(v) < 4:
        return '-'
    return '/'.join(fmt.format(x) for x in st.quantiles(v, n=4))


def run(path):
    S = collections.defaultdict(lambda: collections.defaultdict(list))
    C = collections.defaultdict(collections.Counter)
    n = 0
    for line in gzip.open(path, 'rt') if path.endswith('.gz') else open(path):
        p = json.loads(line)
        if p.get('kind') != 'pass':
            continue
        pl, X = p['players'], p['xy']
        Q = [i for i, a in enumerate(pl) if a['group'] == 'QB' and a['side'] == 'O']
        if len(Q) != 1:
            continue
        qb = Q[0]
        O = [i for i, a in enumerate(pl) if a['side'] == 'O' and i != qb]
        D = [i for i, a in enumerate(pl) if a['side'] == 'D']
        OL = [i for i in O if pl[i]['group'] == 'OL']
        if len(OL) < 5:
            continue
        dt = p.get('dt', .1)
        thr = p.get('events', {}).get('pass_forward')
        endt = min(CAP, thr if thr is not None else (len(X) - 1) * dt)
        kend = min(len(X) - 1, int(round(endt / dt)))
        if kend < 6:
            continue
        n += 1
        P = lambda i, f: (X[f][2 * i], X[f][2 * i + 1])
        dist = lambda a, b, f: math.dist(P(a, f), P(b, f))
        k15 = min(int(round(1.5 / dt)), kend)
        ys = sorted(P(o, 0)[1] for o in OL)
        lo, hi = ys[0], ys[-1]
        prot = sum(1 for o in O if P(o, k15)[0] < 0.3 and lo - 3 <= P(o, k15)[1] <= hi + 3)
        band = '5-' if prot <= 5 else '6' if prot == 6 else '7+'
        PROT = sorted(set(OL) | {o for o in O if P(o, k15)[0] < 0.3 and lo - 3 <= P(o, k15)[1] <= hi + 3})
        rushers = [e for e in D if P(e, k15)[0] < P(e, 0)[0] - 1.0 and P(e, k15)[0] < 3]
        for e in rushers:
            y0 = P(e, 0)[1]
            al = 'edge' if (y0 < lo - 0.3 or y0 > hi + 0.3) else 'interior'
            for key in (al, f'{al} prot {band}', 'all'):
                C[key]['rushers'] += 1
            engaged = False
            first_eng = None
            win = None
            run_ = 0
            press = None
            one = None
            corner = None
            for f in range(1, kend + 1):
                # Blockers: the protection (a receiver brushing past on his
                # release is not a blocker).
                b = min(PROT, key=lambda o: dist(o, e, f))
                db = dist(b, e, f)
                dq = dist(qb, e, f)
                if db <= 1.2 and not engaged:
                    engaged = True
                    first_eng = (f, b)
                w = engaged and f * dt >= 0.5 and (db > 1.2 or dq < dist(qb, b, f))
                if STRICT and w:
                    g = min(kend, f + 3)
                    closing = (dq - dist(qb, e, g)) / max(dt, (g - f) * dt)
                    w = (db > 1.2 or dq < dist(qb, b, f) - 0.3) and closing >= 1.0
                run_ = run_ + 1 if w else 0
                if win is None and run_ * dt >= 0.2 - 1e-9:
                    win = (f - run_ + 1, b)
                if win and corner is None and al == 'edge' and P(e, f)[0] < P(win[1], f)[0]:
                    corner = P(e, f)[0] - P(qb, f)[0]
                if press is None and dq <= 2.0 and f * dt >= PRESS_FROM - 1e-9:
                    bx, by_ = P(b, f); ux, uy = P(qb, f)[0] - bx, P(qb, f)[1] - by_
                    off = abs((P(e, f)[0] - bx) * uy - (P(e, f)[1] - by_) * ux) / (math.hypot(ux, uy) or 1)
                    press = (f, b, db, dist(qb, b, f), dq, off)
                if one is None and dq <= 1.0:
                    one = f
            for key in (al, f'{al} prot {band}', 'all'):
                c, s = C[key], S[key]
                if press:
                    c['pressures'] += 1
                    f, b, db, dqb, dq, off = press
                    if first_eng is None or first_eng[0] >= f:
                        lab = 'unblocked'
                    elif db <= 1.2 and dqb < dq and off <= 0.5:
                        lab = 'walked_back'
                    elif db <= 1.2 and dqb < dq:
                        lab = 'ridden'
                    else:
                        lab = f'won_{al}'
                    c['p_' + lab] += 1
                    if key == 'all' and DUMP:
                        print(json.dumps({'id': p.get('id'), 'rusher': e, 'blocker': b, 'al': al, 'label': lab, 't': round(f * dt, 2),
                                          'qb_x0': round(P(qb, 0)[0], 2), 'qb_x': round(P(qb, f)[0], 2), 'db': round(db, 2),
                                          'dqb': round(dqb, 2), 'dq': round(dq, 2), 'off': round(off, 2)}), file=sys.stderr)
                if win:
                    f, b = win
                    c['won'] += 1
                    if key == 'all' and DUMP:
                        print(json.dumps({'kind': 'win', 'id': p.get('id'), 'rusher': e, 'blocker': b, 'al': al, 't': round(f * dt, 2),
                                          'pressed': bool(press)}), file=sys.stderr)
                    s['t_win'].append(f * dt)
                    s['d_win'].append(dist(qb, e, f))
                    ex, ey = P(e, f); qx, qy = P(qb, f)
                    ang = abs(math.degrees(math.atan2(ey - qy, ex - qx)))
                    c['bear_' + ('front' if ang < 45 else 'edge' if ang <= 135 else 'behind')] += 1
                    if one is not None and one >= f:
                        s['warn'].append((one - f) * dt)
                if corner is not None:
                    s['corner'].append(corner)
                if first_eng:
                    f, b = first_eng
                    s['set_depth'].append(-P(b, f)[0])
                    out = 1 if P(b, 0)[1] >= (lo + hi) / 2 else -1
                    s['set_width'].append((P(b, f)[1] - P(b, 0)[1]) * out)
                    s['t_contact'].append(f * dt)
                for t in (1.0, 1.5, 2.0):
                    f = int(round(t / dt))
                    if f <= kend:
                        b = min(PROT, key=lambda o: dist(o, e, f))
                        if dist(b, e, f) <= 1.5:
                            s[f'between_{t}'].append(dist(qb, e, f) - dist(qb, b, f))
                            s[f'blockerQB_{t}'].append(dist(qb, b, f))
                            bx, by_ = P(b, f); ux, uy = P(qb, f)[0] - bx, P(qb, f)[1] - by_
                            L = math.hypot(ux, uy) or 1
                            rx, ry = P(e, f)[0] - bx, P(e, f)[1] - by_
                            s[f'offset_{t}'].append(abs(rx * uy - ry * ux) / L)
    return n, C, S


def main():
    for path in sys.argv[1:]:
        n, C, S = run(path)
        print(f'== {path.split("/")[-1]}: {n} dropbacks')
        for key in ['all', 'edge', 'interior'] + sorted(k for k in C if 'prot' in k):
            c, s = C[key], S[key]
            r = max(1, c['rushers'])
            w = max(1, c['won'])
            pr = max(1, c['pressures'])
            print(f"  {key:22s} rushers {c['rushers']:5d} | win {100*c['won']/r:5.1f}% at t {q(s['t_win'])} s, "
                  f"{q(s['d_win'])} yd from QB, bearing front/edge/behind "
                  f"{100*c['bear_front']/w:.0f}/{100*c['bear_edge']/w:.0f}/{100*c['bear_behind']/w:.0f}% | warning {q(s['warn'])} s (n {len(s['warn'])})")
            if 'prot' in key:
                continue
            print(f"  {'':22s} pressures {c['pressures']} ({100*c['pressures']/r:.1f}% of rushers): unblocked {100*c['p_unblocked']/pr:.0f}%, "
                  f"walked back {100*c['p_walked_back']/pr:.0f}%, ridden {100*c['p_ridden']/pr:.0f}%, won edge {100*c['p_won_edge']/pr:.0f}%, won interior {100*c['p_won_interior']/pr:.0f}%")
            print(f"  {'':22s} contact t {q(s['t_contact'])} s | blocker set depth {q(s['set_depth'])} yd, width out {q(s['set_width'])} yd"
                  + (f" | corner depth vs QB {q(s['corner'])} yd (n {len(s['corner'])})" if key == 'edge' else ''))
            print(f"  {'':22s} rusher-QB minus blocker-QB (engaged): 1.0 s {q(s['between_1.0'])} | 1.5 s {q(s['between_1.5'])} | 2.0 s {q(s['between_2.0'])}; "
                  f"blocker to QB 1.0/1.5/2.0 s p50 {st.median(s['blockerQB_1.0']) if s['blockerQB_1.0'] else float('nan'):.2f}/"
                  f"{st.median(s['blockerQB_1.5']) if s['blockerQB_1.5'] else float('nan'):.2f}/{st.median(s['blockerQB_2.0']) if s['blockerQB_2.0'] else float('nan'):.2f}")
            print(f"  {'':22s} rusher's offset off the blocker-QB line (engaged; half-man ~0.5): 1.0 s {q(s['offset_1.0'])} | 1.5 s {q(s['offset_1.5'])} | 2.0 s {q(s['offset_2.0'])}")


if __name__ == '__main__':
    sys.exit(main())
