"""Phase 0 of the effective-mass plan (docs/reviews/2026-11-10-effective-mass-plan.md): the course of a front-on first
contact, same code on NFL tracking and sim dumps. No engine change.

Contact rules as hitterback.py: the first frame after the handoff that any defender's centre is within 1.0 yd of the
carrier's, carrier depth -1..3 yd, hitter within 45 deg ahead of the carrier's travel. The approach axis is the carrier's
travel over the frame before contact. Hitter class as hitblk.py (blocked / shed / free); approach speed bins <3, 3-5, 5+.

For each contact, at -0.1, 0, +0.1, +0.2, +0.3, +0.5, +1.0 s:
- runner and hitter speed along the approach axis (yd/s, backward difference over 0.1 s; + = the runner's way);
- their centre separation (yd).
Also:
- torso: whether the two centres close to torso distance (<= 0.65 yd) within 0.3 s. A proximity "contact" that never
  does is an arm's-length touch, not a collision; it is reported apart so collisions are compared with collisions;
- gain (runner along the axis, contact -> end), hitter displacement along the axis, and runner relative to hitter;
- at +0.2 s: an offensive non-carrier within 1 yd of the hitter (a blocker still on him), another defender within 1 yd
  of the runner (a second tackler);
- incoming relative momentum m_r v_r - m_h v_h along the axis when the source carries masses (players[].weight or
  .mass; NFL weights are lb), else omitted and said so;
- in the aligned course, torso angles when the source carries orientation (NFL export 'o'; sim dump carFace / defFace):
  the hitter against square to the runner and the runner against his path, at first proximity, at torso distance and
  0.3 s later, with the share of hitters side-on (>= 45 deg).

Tracking positions are the shoulder pads on NFL data; on sim dumps they are the body centre (until a law gives a separate
contact point, which the dump must then export). Ends: NFL events.end, sim the last frame.
usage: python3 -I frontcourse.py <nfl.jsonl.gz | sim zone dump with off> [...] [--json out.json]"""
import sys, json, gzip, math, statistics as st, collections

OFFS = (-1, 0, 1, 2, 3, 5, 10)        # frames (0.1 s)
TORSO = 0.65


def mass_of(q):
    w = q.get('weight', q.get('mass'))
    if w is None:
        return None
    return w * 0.45359237 if w > 180 else w  # lb on NFL data, kg otherwise


def plays(path):
    if path.endswith('.gz'):
        for l in gzip.open(path, 'rt'):
            p = json.loads(l)
            if p['kind'] != 'run' or p['carrier'] is None or p['cell'].get('concept') not in ('OUTSIDE ZONE', 'INSIDE ZONE'):
                continue
            end = p['events'].get('end')
            if not end:
                continue
            c = p['carrier']; X = p['xy']; pl = p['players']
            D = [i for i, q in enumerate(pl) if q['side'] == 'D']
            O = [i for i, q in enumerate(pl) if q['side'] == 'O' and i != c]
            Oo = p.get('o')   # per-frame orientation, deg, math convention in the normalized frame (if exported)
            yield ([(r[2*c], r[2*c+1]) for r in X], [[(r[2*i], r[2*i+1]) for i in D] for r in X],
                   [[(r[2*i], r[2*i+1]) for i in O] for r in X], p['events'].get('handoff') or 0,
                   min(int(round(end*10)), len(X)-1), mass_of(pl[c]), [mass_of(pl[i]) for i in D],
                   [f[c] for f in Oo] if Oo else None, [[f[i] for i in D] for f in Oo] if Oo else None)
    else:
        for l in open(path):
            r = json.loads(l)
            if not r.get('off'):
                sys.exit('sim dump needs the "off" frames (dump-zone.mts "$PWD" off)')
            yield ([tuple(x) for x in r['car']], r['def'], r['off'], r['handoff'], len(r['car'])-1,
                   r.get('carMass'), r.get('defMass') or [None] * len(r['def'][0]), r.get('carFace'), r.get('defFace'))


def speed_bin(v):
    return '<3' if v < 3 else '3-5' if v < 5 else '5+'


def course(path):
    rows = []
    for C, D, O, ho, e, mr, MD, FC, FD in plays(path):
        h = max(1, int(round(ho*10)))
        hit = next((f for f in range(h, e) if min(math.dist(d, C[f]) for d in D[f]) <= 1.0), None)
        if hit is None or e - hit < 2 or hit < 2 or not (-1 <= C[hit][0] < 3):
            continue
        j = min(range(len(D[hit])), key=lambda j: math.dist(D[hit][j], C[hit]))
        vx, vy = C[hit][0] - C[hit-1][0], C[hit][1] - C[hit-1][1]; sp = math.hypot(vx, vy)
        rx, ry = D[hit][j][0] - C[hit][0], D[hit][j][1] - C[hit][1]; rd = math.hypot(rx, ry) or 1
        if not (sp > 0.05 and (rx * vx + ry * vy) / (rd * sp) > math.cos(math.radians(45))):
            continue
        ux, uy = vx / sp, vy / sp
        near = lambda f: any(math.dist(o, D[f][j]) <= 1.2 for o in O[f])
        cls = 'blocked' if near(hit) else 'shed' if sum(near(f) for f in range(max(0, hit-10), hit)) >= 3 else 'free'

        def along(P, f):
            if f < 1 or f > e:
                return None
            return ((P[f][0] - P[f-1][0]) * ux + (P[f][1] - P[f-1][1]) * uy) * 10
        H = [d[j] for d in D]
        vr = {o: along(C, hit + o) for o in OFFS}
        vh = {o: along(H, hit + o) for o in OFFS}
        sep = {o: (math.dist(C[hit+o], H[hit+o]) if hit + o <= e else None) for o in OFFS}
        torso = min(math.dist(C[f], H[f]) for f in range(hit, min(e, hit + 3) + 1)) <= TORSO
        # Lateral offset of the hitter from the runner's approach path (|cross track|, yd): at first contact, and at
        # the closest approach within 0.3 s. A central hit (0) exchanges momentum along the path; an offset one can
        # turn tangential and let the runner slide off the shoulder.
        cross = lambda f: abs(-(H[f][0] - C[f][0]) * uy + (H[f][1] - C[f][1]) * ux)
        close = min(range(hit, min(e, hit + 3) + 1), key=lambda f: math.dist(C[f], H[f]))
        off0, offc = cross(hit), cross(close)
        disp = lambda P: (P[e][0] - P[hit][0]) * ux + (P[e][1] - P[hit][1]) * uy
        g, hd = disp(C), disp(H)
        f2 = min(e, hit + 2)
        blocker_on = any(math.dist(o, H[f2]) <= 1.0 for o in O[f2])
        second = any(k != j and math.dist(D[f2][k], C[f2]) <= 1.0 for k in range(len(D[f2])))
        mh = MD[j] if j < len(MD) else None
        mom = (mr * vr[0] - mh * vh[0]) if (mr and mh and vr[0] is not None and vh[0] is not None) else None
        # Aligned course (Integration, 2026-11-10): time zero is the first frame within 0.5 s of first proximity at which
        # the centres reach torso distance, or the closest approach if they never do. First proximity is not the same
        # stage of the collision on both sources, so the exchange is compared from torso distance. Closing speed (runner
        # minus hitter along the axis, on the frame before) bins the inputs, not the runner's speed alone.
        win = range(hit, min(e, hit + 5) + 1)
        tc = next((f for f in win if math.dist(C[f], H[f]) <= TORSO), min(win, key=lambda f: math.dist(C[f], H[f])))
        vrA = {o: along(C, tc + o) for o in OFFS}
        vhA = {o: along(H, tc + o) for o in OFFS}
        sepA = {o: (math.dist(C[tc+o], H[tc+o]) if 0 <= tc + o <= e else None) for o in OFFS}
        closing = (vrA[-1] - vhA[-1]) if vrA[-1] is not None and vhA[-1] is not None else None
        # Torso angles (deg): the hitter's facing against "square to the runner" (facing back down the runner's path:
        # 0 square, 90 side-on, 180 back turned); the runner's facing against his own path (0 square, 90 side-on).
        path = math.atan2(uy, ux)
        wrap = lambda a: abs((a + 180.0) % 360.0 - 180.0)
        def angles(f):
            if FC is None or FD is None or f > e or FC[f] is None or FD[f][j] is None:
                return None
            return (wrap(FD[f][j] - math.degrees(path + math.pi)), wrap(FC[f] - math.degrees(path)))
        ang = {'prox': angles(hit), 'torso': angles(tc), 'torso+0.3': angles(min(e, tc + 3)),
               'torso+0.5': angles(tc + 5), 'torso+1.0': angles(tc + 10)}   # later frames: None past the end, not clamped
        # The hitter's own rotation (|change of facing|, deg) from torso distance to +0.5 and +1.0 s, and between them:
        # a held pair that keeps wheeling shows a large late term (Integration's one-point-grasp check, 2026-11-10).
        def hturn(a, b):
            if FD is None or b > e or FD[a][j] is None or FD[b][j] is None:
                return None
            return wrap(FD[b][j] - FD[a][j])
        hrot = {'0.5': hturn(tc, tc + 5), '1.0': hturn(tc, tc + 10), '0.5-1.0': hturn(tc + 5, tc + 10)}
        # Slip (step 2's question): the runner's velocity relative to the hitter, split along the line of centres
        # (closing, + = approaching) and across it (tangential, |.|), from frame differences; and how far the line of
        # centres itself has turned by +0.3 s (deg). A pair that slides past each other has tangential speed and a
        # turning bearing; a locked pair has neither.
        def slip(f):
            if f < 1 or f > e:
                return None
            nx, ny = H[f][0] - C[f][0], H[f][1] - C[f][1]; d = math.hypot(nx, ny) or 1e-9; nx, ny = nx / d, ny / d
            rx = ((C[f][0] - C[f-1][0]) - (H[f][0] - H[f-1][0])) * 10; ry = ((C[f][1] - C[f-1][1]) - (H[f][1] - H[f-1][1])) * 10
            return (rx * nx + ry * ny, abs(-rx * ny + ry * nx))
        slipA = {o: slip(tc + o) for o in (0, 1, 2, 3, 5)}
        def bearing(f):
            return math.degrees(math.atan2(H[f][1] - C[f][1], H[f][0] - C[f][0]))
        bturn = wrap(bearing(min(e, tc + 3)) - bearing(tc))
        rows.append(dict(cls=cls, bin=speed_bin(sp * 10), torso=torso, vr=vr, vh=vh, sep=sep, gain=g, hdisp=hd,
                         rel=g - hd, off0=off0, offc=offc, blocker_on=blocker_on, second=second, t_end=(e - hit) / 10, mom=mom,
                         vrA=vrA, vhA=vhA, sepA=sepA, closing=closing, cbin=speed_bin(closing) if closing is not None else None,
                         lag=(tc - hit) / 10, ang=ang, hrot=hrot, slipA=slipA, bturn=bturn))
    return rows


def med(v):
    v = [x for x in v if x is not None]
    return st.median(v) if v else None


def fmt(x, w=5, p=2):
    return f"{x:+{w}.{p}f}" if x is not None else ' ' * (w - 1) + '-'


def show(name, out, masses):
    print(f"== {name}: front-on first contacts at -1..3 yd: {out['all']['n']}  (torso-distance collisions {round(out['torso']['n']) if 'torso' in out else 0})")
    print(f"   speeds along the approach axis (yd/s) at " + ' '.join(f"{o/10:+.1f}" for o in OFFS) + " s; gain = runner, contact -> end")
    for g, cell in out.items():
        print(f"   {g:12} n {cell['n']:4} torso {100*cell['torso']:3.0f}% | runner " + ' '.join(fmt(cell['vr'][o]) for o in OFFS)
              + " | hitter " + ' '.join(fmt(cell['vh'][o]) for o in OFFS))
        print(f"   {'':12}          sep " + ' '.join(fmt(cell['sep'][o], 4) for o in OFFS)
              + f" | gain {fmt(cell['gain'])} = hitter {fmt(cell['hdisp'])} + rel {fmt(cell['rel'])} | +0.2 s: blocker on him {100*cell['blocker_on']:3.0f}%, 2nd tackler {100*cell['second']:3.0f}% | to end {cell['t_end']:.1f} s"
              + (f" | m_r v_r - m_h v_h {cell['mom']:+.0f} kg yd/s" if cell['mom'] is not None else ''))
        if cell.get('offc') is not None:
            print(f"   {'':12}          offset from his path: at contact {cell['off0']:.2f} yd, at closest approach {cell['offc']:.2f} yd, central (< 0.15 yd) {100*cell['off_central']:3.0f}%")
    if not masses:
        print('   (no masses in this source: momentum omitted)')


def show_aligned(name, aligned):
    print(f"   -- aligned on first torso distance (<= {TORSO} yd; else closest approach), by closing speed (runner - hitter, frame before)")
    print(f"      speeds along the approach axis (yd/s) at " + ' '.join(f"{o/10:+.1f}" for o in OFFS) + " s from torso distance")
    for g, c in aligned.items():
        print(f"   {g:22} n {c['n']:4} closing {c['closing']:4.2f} yd/s, torso at +{c['lag']:.1f} s after proximity | runner "
              + ' '.join(fmt(c['vr'][o]) for o in OFFS) + " | hitter " + ' '.join(fmt(c['vh'][o]) for o in OFFS)
              + " | sep " + ' '.join(fmt(c['sep'][o], 4) for o in OFFS))
        if c.get('slip'):
            sl = c['slip']
            print(f"   {'':22} slip, runner relative to hitter (yd/s, median) at +0.0/+0.1/+0.2/+0.3/+0.5 s: closing "
                  + ' '.join(fmt(sl[o]['closing'] if o in sl else sl[str(o)]['closing'], 5) for o in (0, 1, 2, 3, 5)) + " | tangential "
                  + ' '.join(fmt(sl[o]['tangential'] if o in sl else sl[str(o)]['tangential'], 5) for o in (0, 1, 2, 3, 5))
                  + f" | line of centres turned by +0.3 s {c['bearing_turn']:3.0f} deg")
        if c.get('facing'):
            print(f"   {'':22} torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): "
                  + '  '.join(f"{k} {v['hitter']:3.0f}/{v['runner']:3.0f} deg, side-on {100*v['hitter_side_on']:3.0f}%" for k, v in c['facing'].items()))
        hr = c.get('hitter_rotation') or {}
        if any(v is not None for v in hr.values()):
            print(f"   {'':22} hitter's own rotation from torso distance, median |change of facing| (deg): "
                  + '  '.join(f"{k} s {v:3.0f}" if v is not None else f"{k} s   -" for k, v in hr.items()))


if '--from-json' in sys.argv:
    # Print a stored result (e.g. the NFL run, frontcourse-nfl.json) with the same layout.
    for name, out in json.load(open(sys.argv[sys.argv.index('--from-json') + 1])).items():
        for cell in out.values():
            for k in ('vr', 'vh', 'sep'):
                cell[k] = {int(o): v for o, v in cell[k].items()}
        if name.endswith('aligned on torso distance'):
            show_aligned(name, out)
        else:
            show(name, out, any(c['mom'] is not None for c in out.values()))
    sys.exit(0)

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
OUT = sys.argv[sys.argv.index('--json') + 1] if '--json' in sys.argv else None
if OUT in ARGS:
    ARGS.remove(OUT)
store = {}
for path in ARGS:
    R = course(path)
    name = path.split('/')[-1]
    out = {}
    groups = [('all', lambda r: True), ('torso', lambda r: r['torso']), ('touch only', lambda r: not r['torso'])]
    groups += [(f'{c} {b}', (lambda c, b: lambda r: r['cls'] == c and r['bin'] == b)(c, b)) for c in ('blocked', 'shed', 'free') for b in ('<3', '3-5', '5+')]
    groups += [(f'all {b}', (lambda b: lambda r: r['bin'] == b)(b)) for b in ('<3', '3-5', '5+')]
    for g, f in groups:
        rr = [r for r in R if f(r)]
        if len(rr) < 5:
            continue
        out[g] = dict(n=len(rr), torso=sum(r['torso'] for r in rr) / len(rr),
                      vr={o: med([r['vr'][o] for r in rr]) for o in OFFS}, vh={o: med([r['vh'][o] for r in rr]) for o in OFFS},
                      sep={o: med([r['sep'][o] for r in rr]) for o in OFFS}, gain=med([r['gain'] for r in rr]),
                      hdisp=med([r['hdisp'] for r in rr]), rel=med([r['rel'] for r in rr]),
                      blocker_on=sum(r['blocker_on'] for r in rr) / len(rr), second=sum(r['second'] for r in rr) / len(rr),
                      t_end=med([r['t_end'] for r in rr]), mom=med([r['mom'] for r in rr]),
                      off0=med([r['off0'] for r in rr]), offc=med([r['offc'] for r in rr]),
                      off_central=sum(r['offc'] < 0.15 for r in rr) / len(rr))
    if out:
        show(name, out, any(r['mom'] is not None for r in R))
    store[name] = out
    # The aligned course, by closing speed.
    aligned = {}
    agroups = [('all', lambda r: True)] + [(f'closing {b}', (lambda b: lambda r: r['cbin'] == b)(b)) for b in ('<3', '3-5', '5+')]
    agroups += [(f'{c} closing {b}', (lambda c, b: lambda r: r['cls'] == c and r['cbin'] == b)(c, b)) for c in ('blocked', 'free') for b in ('3-5', '5+')]
    for g, f in agroups:
        rr = [r for r in R if f(r)]
        if len(rr) < 5:
            continue
        facing = {}
        for k in ('prox', 'torso', 'torso+0.3', 'torso+0.5', 'torso+1.0'):
            a = [r['ang'][k] for r in rr if r['ang'][k] is not None]
            if a:
                facing[k] = dict(hitter=med([x[0] for x in a]), runner=med([x[1] for x in a]),
                                 hitter_side_on=sum(x[0] >= 45 for x in a) / len(a), n=len(a))
        aligned[g] = dict(n=len(rr), facing=facing, closing=med([r['closing'] for r in rr]), lag=med([r['lag'] for r in rr]),
                          vr={o: med([r['vrA'][o] for r in rr]) for o in OFFS}, vh={o: med([r['vhA'][o] for r in rr]) for o in OFFS},
                          sep={o: med([r['sepA'][o] for r in rr]) for o in OFFS},
                          slip={o: dict(closing=med([r['slipA'][o][0] for r in rr if r['slipA'][o] is not None]),
                                        tangential=med([r['slipA'][o][1] for r in rr if r['slipA'][o] is not None])) for o in (0, 1, 2, 3, 5)},
                          bearing_turn=med([r['bturn'] for r in rr]),
                          hitter_rotation={k: med([r['hrot'][k] for r in rr if r.get('hrot') and r['hrot'][k] is not None]) for k in ('0.5', '1.0', '0.5-1.0')})
    if aligned:
        show_aligned(name, aligned)
    store[name + ' | aligned on torso distance'] = aligned
if OUT:
    json.dump(store, open(OUT, 'w'), indent=1, default=str)
