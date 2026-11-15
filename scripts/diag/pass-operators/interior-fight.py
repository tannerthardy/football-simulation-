"""The interior pass-rush hand fight, as tracking can see it (Integration, 2026-11-14, before the hand-fight design note).
Same code on NFL tracking and sim exports.

usage: python3 -I scripts/diag/pass-operators/interior-fight.py <plays.jsonl.gz> [...]

Pairs as interior-orbit.py on pass plays (each of the three middle OL and the nearest DL within 1.2 yd from the snap +
0.2 s; engaged while within 1.2 yd, up to 2.5 s, ending at the throw). Per pair, by time since first contact (0-0.5,
0.5-1.0, 1.0-1.5, 1.5-2.5 s):
  - the pair's orbit so far (net bearing change from contact);
  - the rusher's offset across the blocker's line to the QB (yd, + = toward the side he started on): where his half-man is;
  - the centre-to-centre separation.
And per pair: the time to first release, the first frame where either the separation opens past 1.2 yd or the rusher's
bearing from the blocker passes 70 deg off the blocker's line to the QB (past his shoulder); never if neither within the
rep; with the share released by 1.0 / 2.0 s.
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
wrap = lambda a: (a + 180) % 360 - 180
BINS = [(0, .5), (.5, 1.0), (1.0, 1.5), (1.5, 2.5)]
for path in sys.argv[1:]:
    orb = {b: [] for b in BINS}; off = {b: [] for b in BINS}; sep = {b: [] for b in BINS}; spd = {b: [] for b in BINS}; tb = {b: [] for b in BINS}; td = {b: [] for b in BINS}; shb = {b: [] for b in BINS}; grp = {g: {b: [] for b in BINS} for g in ('held', 'released')}; tq = {b: [] for b in BINS}; ax = {b: [] for b in BINS}; bret = {b: [] for b in BINS}; dadv = {b: [] for b in BINS}; rel = []; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw.get('events', {})
        OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
        qbs = p.who('O', 'QB')
        if len(OL) < 5 or not qbs: continue
        qb = qbs[0]
        DL = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] == 'DL']
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw) if fw is not None else p.frames - 1)
        for b in OL[1:4]:
            k0 = d = None
            for k in range(p.k(0.2), min(kend, p.k(2.0)) + 1):
                if p.pos(b, k)[0] is None: continue
                c = [(p.dist(b, x, k), x) for x in DL if p.pos(x, k)[0] is not None and p.dist(b, x, k) <= 1.2]
                if c: k0 = k; d = min(c)[1]; break
            if k0 is None: continue
            n += 1
            def geo(k):
                (bx, by), (dx, dy), (qx, qy) = p.pos(b, k), p.pos(d, k), p.pos(qb, k)
                ux, uy = qx - bx, qy - by; L = math.hypot(ux, uy) or 1; ux, uy = ux / L, uy / L
                rx, ry = dx - bx, dy - by
                lat = rx * -uy + ry * ux                     # across his line to the QB
                ang = math.degrees(math.atan2(lat, -(rx * ux + ry * uy)))   # 0 = the rusher straight in front, away from the QB
                return math.degrees(math.atan2(ry, rx)), lat, math.hypot(rx, ry), ang
            g0 = geo(k0); side = 1 if g0[1] >= 0 else -1; acc = 0; prev = g0[0]; released = None
            mine = {b: [] for b in BINS}; mq = {b: [] for b in BINS}; ma = {b: [] for b in BINS}
            for k in range(k0, min(kend, k0 + 25) + 1):
                if p.pos(b, k)[0] is None or p.pos(d, k)[0] is None or p.pos(qb, k)[0] is None: break
                g = geo(k); acc += wrap(g[0] - prev); prev = g[0]; t = (k - k0) * p.dt
                if released is None and (g[2] > 1.2 or abs(g[3]) > 70): released = t
                for bn in BINS:
                    if bn[0] <= t < bn[1]:
                        orb[bn].append(abs(acc)); off[bn].append(g[1] * side); sep[bn].append(g[2])
                        # The rusher's speed while engaged (within 1.2 yd), central difference over 0.2 s.
                        if g[2] <= 1.2 and p.pos(d, k - 1)[0] is not None and k + 1 < p.frames and p.pos(d, k + 1)[0] is not None:
                            spd[bn].append(math.hypot(p.pos(d, k + 1)[0] - p.pos(d, k - 1)[0], p.pos(d, k + 1)[1] - p.pos(d, k - 1)[1]) / (2 * p.dt))
                            mine[bn].append(spd[bn][-1])
                            # Toward the QB and across (yd/s, the rusher's velocity on his line to the QB): is he still
                            # driving at him, or has the rush stopped (a stalemate, effort gone, the rush given up)?
                            (qx0, qy0), (rx0, ry0) = p.pos(qb, k), p.pos(d, k)
                            if qx0 is not None:
                                ql = math.hypot(qx0 - rx0, qy0 - ry0) or 1
                                vdx = (p.pos(d, k + 1)[0] - p.pos(d, k - 1)[0]) / (2 * p.dt); vdy = (p.pos(d, k + 1)[1] - p.pos(d, k - 1)[1]) / (2 * p.dt)
                                mq[bn].append((vdx * (qx0 - rx0) + vdy * (qy0 - ry0)) / ql); ma[bn].append(abs((vdx * -(qy0 - ry0) + vdy * (qx0 - rx0)) / ql))
                                # The meeting: the blocker's velocity toward the QB (his retreat) and the rusher's.
                                if p.pos(b, k - 1)[0] is not None and p.pos(b, k + 1)[0] is not None:
                                    vbx = (p.pos(b, k + 1)[0] - p.pos(b, k - 1)[0]) / (2 * p.dt); vby = (p.pos(b, k + 1)[1] - p.pos(b, k - 1)[1]) / (2 * p.dt)
                                    bret[bn].append((vbx * (qx0 - rx0) + vby * (qy0 - ry0)) / ql); dadv[bn].append(mq[bn][-1])
                            # The orbit split: each man's velocity across the line between them (perpendicular), and
                            # the blocker's share of their relative motion across it (+: he turns with the pair).
                            if p.pos(b, k - 1)[0] is not None and p.pos(b, k + 1)[0] is not None:
                                (bx0, by0), (dx0, dy0) = p.pos(b, k), p.pos(d, k)
                                L = math.hypot(dx0 - bx0, dy0 - by0) or 1; tx, ty = -(dy0 - by0) / L, (dx0 - bx0) / L
                                vb = ((p.pos(b, k + 1)[0] - p.pos(b, k - 1)[0]) / (2 * p.dt), (p.pos(b, k + 1)[1] - p.pos(b, k - 1)[1]) / (2 * p.dt))
                                vd = ((p.pos(d, k + 1)[0] - p.pos(d, k - 1)[0]) / (2 * p.dt), (p.pos(d, k + 1)[1] - p.pos(d, k - 1)[1]) / (2 * p.dt))
                                ub, ud = vb[0] * tx + vb[1] * ty, vd[0] * tx + vd[1] * ty
                                tb[bn].append(abs(ub)); td[bn].append(abs(ud))
                                if abs(ud - ub) > 0.3: shb[bn].append(-ub / (ud - ub))
                if g[2] > 1.2 and released is not None: break
            rel.append(released)
            for bn in BINS: grp['held' if released is None else 'released'][bn].extend(mine[bn])
            if released is None:
                for bn in BINS: tq[bn].extend(mq[bn]); ax[bn].extend(ma[bn])
    print(f"== {os.path.basename(path)}: engaged interior pass-rush pairs {n}")
    for bn in BINS:
        print(f"   {bn[0]:.1f}-{bn[1]:.1f} s: orbit p50/p90 {q(orb[bn]):.0f}/{q(orb[bn], .9):.0f} deg | his offset across the blocker's line to the QB p25/50/75 {q(off[bn], .25):+.2f}/{q(off[bn]):+.2f}/{q(off[bn], .75):+.2f} yd | separation p50 {q(sep[bn]):.2f} (n {len(sep[bn])})")
    print("   across the line between them (engaged), |blocker| / |rusher| p50 yd/s and the blocker's share of their relative motion p50: " + ' | '.join(f"{bn[0]:.1f}-{bn[1]:.1f} s {q(tb[bn]):.2f} / {q(td[bn]):.2f}, {q(shb[bn]):+.2f}" for bn in BINS))
    print("   the meeting, all engaged pairs: the blocker's / the rusher's velocity toward the QB (the blocker's retreat), p50 yd/s: " + ' | '.join(f"{bn[0]:.1f}-{bn[1]:.1f} s {q(bret[bn]):+.2f} / {q(dadv[bn]):+.2f}" for bn in BINS))
    print("   held pairs: the rusher's velocity toward the QB / across his line to the QB, p50 yd/s: " + ' | '.join(f"{bn[0]:.1f}-{bn[1]:.1f} s {q(tq[bn]):+.2f} / {q(ax[bn]):.2f}" for bn in BINS))
    for gname in ('held', 'released'):
        print(f"   engaged rusher speed, pairs {gname} (never released / released within 2.5 s), p50 (n): " + ' | '.join(f"{bn[0]:.1f}-{bn[1]:.1f} s {q(grp[gname][bn]):.2f} ({len(grp[gname][bn])})" for bn in BINS))
    print("   the rusher's speed while engaged (within 1.2 yd), p50 / p75: " + ' | '.join(f"{bn[0]:.1f}-{bn[1]:.1f} s {q(spd[bn]):.2f} / {q(spd[bn], .75):.2f}" for bn in BINS))
    R = [r for r in rel if r is not None]
    print(f"   first release (separation past 1.2 yd or past his shoulder, 70 deg): p25/50/75 {q(R, .25):.1f}/{q(R):.1f}/{q(R, .75):.1f} s | released by 1.0 s {100 * sum(1 for r in R if r <= 1.0) / max(1, len(rel)):.0f}%, by 2.0 s {100 * sum(1 for r in R if r <= 2.0) / max(1, len(rel)):.0f}% | never {100 * sum(1 for r in rel if r is None) / max(1, len(rel)):.0f}%")
