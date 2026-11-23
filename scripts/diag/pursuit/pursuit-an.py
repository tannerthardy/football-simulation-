"""Pursuit operator (shared, NFL and sim rows in the same format). Uses only positions and velocities at 10 Hz.
Frames t from the catch (0) to the end. Carrier frame: u = carrier direction of travel (or +x if he is under 1 yd/s).
Contact proxy: centre distance <= CONTACT yd (same rule both sides). Beaten: first frame the carrier is past the defender
along u by > BEAT_LEAD yd and that lead grows over the next 0.2 s (and stays > BEAT_LEAD), with no stop yet.
D1 = nearest defender at the catch."""
import json, math, sys, collections
CONTACT, BEAT_LEAD, W = 1.0, 1.0, 53.33
BLOCK, BLOCK_FR = 1.2, 3   # D1 engaged: a non-carrier offensive player within BLOCK yd for >= BLOCK_FR frames before the beat
def unit(vx, vy, fb=(1.0, 0.0)):
    s = math.hypot(vx, vy); return (vx / s, vy / s) if s > 1.0 else fb
def ang(a, b):
    d = math.degrees(math.atan2(a[1], a[0]) - math.atan2(b[1], b[0]))
    while d > 180: d -= 360
    while d < -180: d += 360
    return d
def cv_intercept(px, py, sd, cx, cy, cvx, cvy):
    """Earliest time t a defender at speed sd from (px,py) meets a carrier moving at constant velocity; bearing to that spot."""
    rx, ry = cx - px, cy - py; a = cvx * cvx + cvy * cvy - sd * sd; b = 2 * (rx * cvx + ry * cvy); c = rx * rx + ry * ry
    ts = []
    if abs(a) < 1e-9: ts = [-c / b] if abs(b) > 1e-9 else []
    else:
        disc = b * b - 4 * a * c
        if disc >= 0: ts = [(-b - math.sqrt(disc)) / (2 * a), (-b + math.sqrt(disc)) / (2 * a)]
    ts = [t for t in ts if t > 0]
    if not ts: return None
    t = min(ts); return (rx + cvx * t, ry + cvy * t), t
def q(v, p):
    v = sorted(x for x in v if x is not None); return v[min(len(v) - 1, int(p * len(v)))] if v else float('nan')
def frames(track):
    return {round(r[0], 1): r for r in track}

JUMP = 1.5   # data guard: any tracked body moving > JUMP yd between consecutive 0.1 s frames (15 yd/s) drops the play
def jumps(row):
    for tr in [row['car'], *row['defs'].values(), *(row.get('offs') or {}).values()]:
        for a, b in zip(tr, tr[1:]):
            if b[0] - a[0] < 0.15 and math.hypot(b[1] - a[1], b[2] - a[2]) > JUMP: return True
    return False

def analyse(row):
    if jumps(row): return 'jump'
    a = _an(row)
    if isinstance(a, dict):
        f = _an(row, front=True)
        a['front'] = {k: f[k] for k in ('d1', 'd1dist', 'd1pos', 'outcome', 'cls', 'blk', 'start', 'contact_t', 'beat_t', 'after', 'tackle_from')} if f else None
        a['pair'] = pair(row)
    return a

def pair(row):
    """'Together': the two nearest defenders at the catch, +0.5 s, +1.0 s and the first contact (first frame any defender is
    within CONTACT): the angle between them seen from the carrier and whether they are on opposite sides of his velocity
    line (bracketed). And the first defender to reach contact range: from behind his hips (bearing > 90 deg off his travel)
    or not; his along/lateral position at contact."""
    car = frames(row['car']); T = sorted(car); defs = {k: frames(v) for k, v in row['defs'].items()}
    t0 = T[0]; u0 = unit(car[t0][3], car[t0][4])
    first = None
    for t in T:
        c = car[t]; near = [(math.hypot(f[t][1] - c[1], f[t][2] - c[2]), k) for k, f in defs.items() if t in f]
        if near and min(near)[0] <= CONTACT: first = (t, min(near)[1]); break
    def at(t, who=None):
        if t not in car: return None
        c = car[t]; u = unit(c[3], c[4], u0)
        near = sorted((math.hypot(f[t][1] - c[1], f[t][2] - c[2]), k) for k, f in defs.items() if t in f)[:2]
        if len(near) < 2: return None
        out = []
        for d_, k in near:
            dx, dy = defs[k][t][1] - c[1], defs[k][t][2] - c[2]
            out.append((dx * u[0] + dy * u[1], -dx * u[1] + dy * u[0], math.atan2(dy, dx)))
        sep = abs(math.degrees(math.atan2(math.sin(out[0][2] - out[1][2]), math.cos(out[0][2] - out[1][2]))))
        return dict(sep=round(sep), bracket=out[0][1] * out[1][1] < 0, d=[round(near[0][0], 1), round(near[1][0], 1)])
    res = {'catch': at(t0), 'p05': at(round(t0 + 0.5, 1)), 'p10': at(round(t0 + 1.0, 1)), 'contact': at(first[0]) if first else None}
    if first:
        t, k = first; c = car[t]; u = unit(c[3], c[4], u0); dx, dy = defs[k][t][1] - c[1], defs[k][t][2] - c[2]
        al = dx * u[0] + dy * u[1]; off = math.degrees(math.acos(max(-1, min(1, al / max(1e-6, math.hypot(dx, dy))))))
        res['first'] = dict(t=t, who=k, off=round(off), behind_hips=off > 90, moving=math.hypot(c[3], c[4]) > 1.0)
    return res

def _an(row, front=False):
    """front=True: D1 is the nearest defender not behind the carrier at the catch (along his travel > -1 yd)."""
    car = frames(row['car']); T = sorted(car)
    if len(T) < 3: return None
    defs = {k: frames(v) for k, v in row['defs'].items()}
    t0 = T[0]; c0 = car[t0]; cx, cy, cvx, cvy = c0[1], c0[2], c0[3], c0[4]
    u0 = unit(cvx, cvy); cs = math.hypot(cvx, cvy); side = min(cy, W - cy)
    cmax = max(math.hypot(car[t][3], car[t][4]) for t in T)
    out_sign = -1 if cy < W / 2 else 1   # +y lateral toward his sideline? lateral outside = toward nearer sideline
    def rel(d, c, u):
        dx, dy = d[1] - c[1], d[2] - c[2]
        along = dx * u[0] + dy * u[1]; lat = -dx * u[1] + dy * u[0]
        sl = -1 if c[2] < W / 2 else 1   # direction (in y) of his near sideline is -y if he is below mid
        outside = (d[2] - c[2]) * sl < 0  # defender between carrier and the near sideline
        outside = ((d[2] - c[2]) < 0) if c[2] < W / 2 else ((d[2] - c[2]) > 0)
        return along, lat, outside
    dist = lambda d, c: math.hypot(d[1] - c[1], d[2] - c[2])
    at0 = {k: f[t0] for k, f in defs.items() if t0 in f}
    if not at0: return None
    bands = {b: sum(1 for d in at0.values() if dist(d, c0) <= b) for b in (3, 5, 8)}
    pool = [k for k in at0 if rel(at0[k], c0, u0)[0] >= -1] if front else list(at0)
    if not pool: return None
    d1k = min(pool, key=lambda k: dist(at0[k], c0)); d1 = defs[d1k]; d10 = d1[t0]
    al, la, outs = rel(d10, c0, u0)
    pos = 'ahead' if al > 1 else 'behind' if al < -1 else 'level'
    t2 = round(t0 + 0.2, 1)
    clos = (dist(d10, c0) - dist(d1[t2], car[t2])) / 0.2 if t2 in d1 and t2 in car else None
    # CV closest approach (secondary)
    rx, ry = d10[1] - cx, d10[2] - cy; wx, wy = d10[3] - cvx, d10[4] - cvy; ww = wx * wx + wy * wy
    ts = max(0.0, -(rx * wx + ry * wy) / ww) if ww > 1e-9 else 0.0; cpa = math.hypot(rx + wx * ts, ry + wy * ts)
    # D1 outcome
    contact_t = None; beat_t = None; level_seen = False
    for i, t in enumerate(T):
        if t not in d1: break
        c, d = car[t], d1[t]
        if contact_t is None and dist(d, c) <= CONTACT: contact_t = t
        u = unit(c[3], c[4], u0); a_, _, _ = rel(d, c, u); lead = -a_
        if lead <= BEAT_LEAD: level_seen = True
        t2_ = round(t + 0.2, 1)
        if level_seen and lead > BEAT_LEAD and t2_ in car and t2_ in d1:
            u2 = unit(car[t2_][3], car[t2_][4], u); lead2 = -rel(d1[t2_], car[t2_], u2)[0]
            sep, sep2 = dist(d, c), dist(d1[t2_], car[t2_])
            if lead2 > lead and lead2 > BEAT_LEAD and sep > CONTACT + 0.5 and sep2 > sep and i < len(T) - 3:
                beat_t = t; break
    tend = T[-1]; dend = dist(d1[tend], car[tend]) if tend in d1 else 99
    end = row['end']
    if beat_t is not None: outcome = 'missed (contact range, then beaten)' if contact_t is not None and contact_t <= beat_t else 'beaten without contact'
    elif not level_seen: outcome = 'trailing from the catch (never level)'
    elif contact_t is not None and dend <= 2.0: outcome = 'stopped (tackle or held for help)'
    elif contact_t is not None: outcome = 'contact, then play ended elsewhere'
    else: outcome = 'never reached (play ended: ' + end + ')'
    # geometry before the beat (or contact) for D1: heading vs bearing and vs CV intercept (carrier current v, carrier max speed)
    tk = beat_t if beat_t is not None else (contact_t if contact_t is not None else tend)
    geo = []
    for t in T:
        if t > tk or t not in d1: break
        c, d = car[t], d1[t]; dsp = math.hypot(d[3], d[4]); csp = math.hypot(c[3], c[4])
        if dsp < 1.0: geo.append((t, None, None, None, dsp, csp)); continue
        hd = (d[3], d[4]); br = (c[1] - d[1], c[2] - d[2])
        ic = cv_intercept(d[1], d[2], max(dsp, 1), c[1], c[2], c[3], c[4])
        uc = unit(c[3], c[4], u0); im = cv_intercept(d[1], d[2], max(dsp, 1), c[1], c[2], uc[0] * cmax, uc[1] * cmax)
        e_b = ang(hd, br); e_i = ang(hd, ic[0]) if ic else None; e_m = ang(hd, im[0]) if im else None
        # sign: + = heading points ahead of the bearing (toward the carrier's travel), measured on the carrier's side
        sgn = 1 if (br[0] * uc[1] - br[1] * uc[0]) < 0 else -1
        geo.append((t, e_b * sgn, e_i * sgn if e_i is not None else None, e_m * sgn if e_m is not None else None, dsp, csp))
    # engaged by a blocker before the beat/contact (needs offense tracks; None when the row has none)
    blk = None
    if row.get('offs'):
        offs = [frames(v) for v in row['offs'].values()]; n = 0
        for t in T:
            if t > tk or t not in d1: break
            if any(t in o and dist(o[t], d1[t]) <= BLOCK for o in offs): n += 1
        blk = n >= BLOCK_FR
    early = [g for g in geo if g[0] <= t0 + 0.5]
    start = q([g[4] for g in early], .5) if early else None
    cls = None
    if beat_t is not None:
        last = [g for g in geo if g[0] >= tk - 0.5 and g[1] is not None]
        dB = q([g[1] for g in last], .5) if last else None; dI = q([g[2] for g in last if g[2] is not None], .5) if last else None
        dM = q([g[3] for g in last if g[3] is not None], .5) if last else None
        dc = d1[beat_t]; cc = car[beat_t]; ucb = unit(cc[3], cc[4], u0); vd_along = dc[3] * ucb[0] + dc[4] * ucb[1]
        if blk: cls = 'engaged by a blocker before the beat'
        elif contact_t is not None and contact_t <= beat_t: cls = 'reached contact range, then beaten (lunge/miss/broken)'
        elif start is not None and start < 2.0: cls = 'flat-footed / late start'
        elif vd_along < -1.0: cls = 'overrun (moving against the carrier at the beat)'
        elif dB is not None and dI is not None and abs(dB) < abs(dI) - 10: cls = 'old angle (aimed at or behind the carrier)'
        elif dI is not None and dM is not None and abs(dI) < 15 and abs(dM) > 25: cls = 'angle right for current speed, not his top speed'
        else: cls = 'other / outrun on a fair angle'
    # after a beat: who is left
    after = None
    if beat_t is not None:
        cb = car[beat_t]; others = {k: f[beat_t] for k, f in defs.items() if k != d1k and beat_t in f}
        ahead = sum(1 for d in others.values() if rel(d, cb, unit(cb[3], cb[4], u0))[0] > 0 and dist(d, cb) <= 8)
        # The next defender into contact range after the beat: when, and the carrier's gain until then; the second
        # defender (nearest other at the beat): where he is in the carrier's frame and whether he is closing.
        nxt_t = next((t for t in T if t > beat_t and any(t in f and dist(f[t], car[t]) <= CONTACT for k, f in defs.items() if k != d1k)), None)
        k2 = min(others, key=lambda k: dist(others[k], cb)) if others else None
        sec = None
        if k2:
            ub = unit(cb[3], cb[4], u0); al2, _, out2 = rel(others[k2], cb, ub); t2b = round(beat_t + 0.2, 1)
            cl2 = (dist(others[k2], cb) - dist(defs[k2][t2b], car[t2b])) / 0.2 if t2b in defs[k2] and t2b in car else None
            sec = dict(pos='ahead' if al2 > 1 else 'behind' if al2 < -1 else 'level', outside=out2, d=round(dist(others[k2], cb), 1), closing=cl2,
                       speed=math.hypot(others[k2][3], others[k2][4]))
        after = dict(next_t=round(nxt_t - beat_t, 1) if nxt_t is not None else None, next_yds=round(car[nxt_t][1] - cb[1], 1) if nxt_t is not None else None, second=sec,
                     n3=sum(dist(d, cb) <= 3 for d in others.values()), n5=sum(dist(d, cb) <= 5 for d in others.values()), n8=sum(dist(d, cb) <= 8 for d in others.values()),
                     ahead8=ahead, yds_after=round(car[tend][1] - cb[1], 1), end=end, secs_after=round(tend - beat_t, 1))
    tackle_from = None
    if outcome.startswith('stopped'):
        a1, _, o1 = rel(d1[contact_t], car[contact_t], unit(car[contact_t][3], car[contact_t][4], u0))
        tackle_from = dict(at_catch=pos, outside_at_catch=outs, at_contact='front' if a1 > 0.3 else 'behind' if a1 < -0.3 else 'side')
    spd = lambda tt: math.hypot(car[tt][3], car[tt][4]) if tt in car else None
    return dict(src=row['src'], man=row['man'], side=side, outside=side <= 12, cs=cs, cmax=cmax, cs05=spd(round(t0 + 0.5, 1)), cs10=spd(round(t0 + 1.0, 1)), air=row.get('air'), end=end,
                yac=round(car[tend][1] - cx, 1), bands=bands, d1=d1k, d1dist=dist(d10, c0), d1pos=pos, d1out=outs, d1clos=clos, cpa=cpa, cpa_t=ts,
                outcome=outcome, cls=cls, blk=blk, contact_t=contact_t, beat_t=beat_t, start=start, after=after, tackle_from=tackle_from, geo=geo,
                key=row.get('key'), ev=row.get('ev'))

if __name__ == '__main__':
    rows = []; nj = 0
    for f in sys.argv[1:]:
        for r in json.load(open(f)):
            a = analyse(r)
            if a == 'jump': nj += 1
            elif a: rows.append(a)
    json.dump(rows, open(sys.argv[1].replace('.json', '-an.json'), 'w'))
    print('analysed', len(rows), 'dropped for a tracking jump (> %.1f yd in 0.1 s)' % JUMP, nj)
