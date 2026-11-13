"""Pursuit arrival: do pursuers come to balance, and what does the first arrival turn into. Same code for NFL and sim
common format; observation only. Open field t0 as pursuit.py (pass: the catch; run: carrier first past the line).
Population: every defender, every 0.1 s from t0 to +3.0 s or the play's end, while the carrier is moving > 1 yd/s.
(1) Approach: defender speed and closing speed (rate the gap shrinks) by distance to the carrier (10-8 / 8-5 / 5-3 /
    3-2 / 2-1.5 yd), by geometry at that moment (ahead / level / trailing, as pursuit.py) and group (DL / LB / DB).
    Only defenders who come inside 1.5 yd later in the window ("arrivers"), so the curve is an approach, not a drift.
(2) First arrival: the first defender inside 1.5 yd after t0. At that moment his speed, closing angle (between his
    velocity and the line to the carrier; 0 = straight at him) and the carrier's lateral move over the previous 0.5 s
    (displacement across his heading at -0.5 s). Outcome within 1.0 s:
      ended   - the play ends with the carrier within 2 yd of him;
      past    - at +1.0 s he is behind the carrier (bearing off the carrier's heading > 120 deg) and > 1.5 yd away;
      slowed  - the carrier's speed at +0.5 s is under 60% of his speed at the arrival (and not ended / past);
      with    - otherwise (still on him, or the carrier carried on near him).
    YAC after the arrival (carrier x at the end minus at the arrival).
(3) Carrier: speed at t0, +0.5, +1.0, +2.0 s; heading change over the 1.0 s before the first arrival.
(4) Start: distance of the nearest and second-nearest defender at t0 and the nearest's geometry, by catch depth
    (catch x past the line 0-5 / 5-10 / 10-20 / 20+; runs one bucket); share never reached within 1 yd by +3 s.
usage: python3 -I scripts/diag/pass-operators/arrival.py name=a.jsonl.gz[,b][:maxplays] ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa


def q(v, f='{:.1f}'):
    v = sorted(x for x in v if x is not None)
    return '-' if len(v) < 5 else '/'.join(f.format(v[int(p * (len(v) - 1))]) for p in (.25, .5, .75))


def bearing(p, d, c, k):
    (x, y), (cx, cy) = p.pos(d, k), p.pos(c, k); cvx, cvy = p.velocity(c, k); cs = math.hypot(cvx, cvy)
    dist = math.hypot(cx - x, cy - y)
    if cs < 1 or dist < 1e-6: return None
    return math.degrees(math.acos(max(-1, min(1, ((x - cx) * cvx + (y - cy) * cvy) / (dist * cs)))))


def geo_of(b): return None if b is None else 'ahead' if b < 60 else 'level' if b <= 120 else 'trailing'


BANDS = (('10-8', 8, 10), ('8-5', 5, 8), ('5-3', 3, 5), ('3-2', 2, 3), ('2-1.5', 1.5, 2))
for arg in sys.argv[1:]:
    name, spec = arg.split('='); paths, _, mx = spec.partition(':'); mx = int(mx or 10 ** 9)
    AP = C.defaultdict(list); FA = []; CAR = C.defaultdict(list); ST = C.defaultdict(list); n = 0
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            if n >= mx: break
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {}); kind = raw.get('kind')
            if kind not in ('run', 'pass'): continue
            p = Play(raw); kl = p.k(p.end)
            if kind == 'pass':
                if 'catch' not in ev or raw.get('target') is None: continue
                c = raw['target']; k0 = p.k(ev['catch'])
            else:
                c = raw.get('carrier')
                if c is None: continue
                k0 = next((k for k in range(p.k(ev.get('handoff', 0)), kl + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] > 0), None)
                if k0 is None: continue
            if p.players[c]['side'] != 'O' or k0 >= kl or p.pos(c, k0)[0] is None: continue
            n += 1
            kw = min(kl, k0 + round(3.0 / p.dt)); s1 = round(0.1 / p.dt) or 1
            depth = ('run' if kind == 'run' else
                    (lambda x: '0-5' if x < 5 else '5-10' if x < 10 else '10-20' if x < 20 else '20+')(p.pos(c, k0)[0]))
            D = [d for d in p.who('D') if p.pos(d, k0)[0] is not None]
            # (4) start
            ds = sorted((p.dist(d, c, k0), d) for d in D)
            if ds:
                reached = any(p.pos(d, k)[0] is not None and p.pos(c, k)[0] is not None and p.dist(d, c, k) <= 1
                              for d in D for k in range(k0, kw + 1, s1))
                ST[depth].append((ds[0][0], ds[1][0] if len(ds) > 1 else None, geo_of(bearing(p, ds[0][1], c, k0)), reached, p.pos(c, kl)[0] - p.pos(c, k0)[0] if p.pos(c, kl)[0] is not None else None))
            # (3) carrier speed
            for lab, dtm in (('t0', 0), ('+0.5', .5), ('+1.0', 1), ('+2.0', 2)):
                k = k0 + round(dtm / p.dt)
                if k <= kl and p.pos(c, k)[0] is not None: CAR[(kind, depth, lab)].append(p.speed(c, k))
            # (1) approach curves of arrivers, (2) first arrival
            first = None
            for d in D:
                g = p.players[d]['group']; ka = None
                for k in range(k0, kw + 1):
                    if p.pos(d, k)[0] is None or p.pos(c, k)[0] is None: break
                    if p.dist(d, c, k) <= 1.5: ka = k; break
                if ka is None: continue
                if first is None or ka < first[1]: first = (d, ka)
                for k in range(k0, ka, s1):
                    dist = p.dist(d, c, k); band = next((b for b, lo, hi in BANDS if lo <= dist < hi), None)
                    if band is None or p.speed(c, k) < 1: continue
                    k2 = min(ka, k + s1); closing = (dist - p.dist(d, c, k2)) / ((k2 - k) * p.dt) if k2 > k else None
                    AP[(kind, geo_of(bearing(p, d, c, k)), g, band)].append((p.speed(d, k), closing))
            if first:
                d, ka = first
                (x, y), (cx, cy) = p.pos(d, ka), p.pos(c, ka); vx, vy = p.velocity(d, ka); dx, dy = cx - x, cy - y; L = math.hypot(dx, dy) or 1
                ang = abs(math.degrees(math.atan2(-vx * dy + vy * dx, vx * dx + vy * dy))) if math.hypot(vx, vy) > 0.5 else None
                kb = max(k0 - round(1.0 / p.dt), 0, ka - round(0.5 / p.dt)); lat = None
                if p.pos(c, kb)[0] is not None:
                    hx, hy = p.velocity(c, kb); hs = math.hypot(hx, hy)
                    if hs > 1: lat = abs((-(cx - p.pos(c, kb)[0]) * hy + (cy - p.pos(c, kb)[1]) * hx) / hs)
                k1 = ka + round(1.0 / p.dt); kh = ka + round(0.5 / p.dt); sp0 = p.speed(c, ka)
                if kl <= k1 and p.pos(c, kl)[0] is not None and p.pos(d, kl)[0] is not None and p.dist(d, c, kl) <= 2: out = 'ended'
                elif k1 <= kl and p.pos(d, k1)[0] is not None and p.pos(c, k1)[0] is not None and p.dist(d, c, k1) > 1.5 and (bearing(p, d, c, k1) or 0) > 120: out = 'past'
                elif kh <= kl and p.pos(c, kh)[0] is not None and p.speed(c, kh) < 0.6 * sp0: out = 'slowed'
                else: out = 'with'
                k1b = ka - round(1.0 / p.dt); hc = None
                if k1b >= 0 and p.pos(c, k1b)[0] is not None:
                    a0, a1 = p.velocity(c, k1b), p.velocity(c, ka)
                    if math.hypot(*a0) > 1 and math.hypot(*a1) > 1: hc = abs((math.degrees(math.atan2(a1[1], a1[0]) - math.atan2(a0[1], a0[0])) + 540) % 360 - 180)
                FA.append(dict(kind=kind, depth=depth, g=p.players[d]['group'], t=(ka - k0) * p.dt, sp=p.speed(d, ka), ang=ang, lat=lat, out=out,
                               csp=sp0, hc=hc, yac=(p.pos(c, kl)[0] - cx) if p.pos(c, kl)[0] is not None else None, pid=raw.get('id')))
    print(f'== {name}: {n} plays')
    print('  (1) arrivers: speed / closing (yd/s) p25/p50/p75 by distance band')
    for kind in ('run', 'pass'):
        for geo in ('level', 'trailing', 'ahead'):
            for g in ('DL', 'LB', 'DB'):
                row = []
                for b, _, _ in BANDS:
                    X = AP[(kind, geo, g, b)]
                    row.append(f"{b} {q([x[0] for x in X])}|{q([x[1] for x in X])}" if len(X) >= 20 else f'{b} -')
                print(f'    {kind:4} {geo:8} {g}: ' + '  '.join(row))
    print('  (2) first arrival inside 1.5 yd: outcome within 1 s, his speed, closing angle, carrier lateral move 0.5 s, YAC after')
    for kind in ('run', 'pass'):
        for depth in (['run'] if kind == 'run' else ['0-5', '5-10', '10-20', '20+']):
            X = [f for f in FA if f['kind'] == kind and f['depth'] == depth]
            if len(X) < 10: continue
            o = C.Counter(f['out'] for f in X)
            print(f"    {kind:4} {depth:5} n {len(X):4}: " + ', '.join(f"{k} {100 * o[k] / len(X):.0f}%" for k in ('ended', 'with', 'slowed', 'past'))
                  + f" | at {q([f['t'] for f in X])} s, speed {q([f['sp'] for f in X])}, angle {q([f['ang'] for f in X], '{:.0f}')}, lateral {q([f['lat'] for f in X], '{:.2f}')}, carrier {q([f['csp'] for f in X])}, turn 1 s {q([f['hc'] for f in X], '{:.0f}')}, YAC after {q([f['yac'] for f in X])}")
            for out in ('past', 'ended'):
                Y = [f for f in X if f['out'] == out]
                if len(Y) >= 5: print(f"        {out:6}: speed {q([f['sp'] for f in Y])}, angle {q([f['ang'] for f in Y], '{:.0f}')}, lateral {q([f['lat'] for f in Y], '{:.2f}')}, YAC after {q([f['yac'] for f in Y])}")
    print('  (3) carrier speed at t0 / +0.5 / +1.0 / +2.0 s (p50)')
    for kind, depths in (('run', ['run']), ('pass', ['0-5', '5-10', '10-20', '20+'])):
        for depth in depths:
            print(f"    {kind:4} {depth:5}: " + ' / '.join(q(CAR[(kind, depth, lab)]).split('/')[1] if q(CAR[(kind, depth, lab)]) != '-' else '-' for lab in ('t0', '+0.5', '+1.0', '+2.0')))
    print('  (4) start: nearest / second defender distance at t0, nearest geometry, never reached within 1 yd by +3 s, YAC')
    for depth in ('run', '0-5', '5-10', '10-20', '20+'):
        X = ST[depth]
        if len(X) < 10: continue
        gc = C.Counter(x[2] for x in X)
        nev = [x for x in X if not x[3]]
        print(f"    {depth:5} n {len(X):4}: nearest {q([x[0] for x in X])} second {q([x[1] for x in X])} | " + ', '.join(f"{k} {100 * gc[k] / len(X):.0f}%" for k in ('ahead', 'level', 'trailing'))
              + f" | never reached {100 * len(nev) / len(X):.0f}% (YAC {q([x[4] for x in nev])}; reached {q([x[4] for x in X if x[3]])})")
    if os.environ.get('ARRIVAL_IDS'):
        for out in ('past', 'ended', 'with'):
            print(f'  sample {out}:', [(f['pid'], round(f['t'], 1)) for f in FA if f['out'] == out and f['kind'] == 'pass'][:6])
