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
  .mass; NFL weights are lb), else omitted and said so.

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
            yield ([(r[2*c], r[2*c+1]) for r in X], [[(r[2*i], r[2*i+1]) for i in D] for r in X],
                   [[(r[2*i], r[2*i+1]) for i in O] for r in X], p['events'].get('handoff') or 0,
                   min(int(round(end*10)), len(X)-1), mass_of(pl[c]), [mass_of(pl[i]) for i in D])
    else:
        for l in open(path):
            r = json.loads(l)
            if not r.get('off'):
                sys.exit('sim dump needs the "off" frames (dump-zone.mts "$PWD" off)')
            yield ([tuple(x) for x in r['car']], r['def'], r['off'], r['handoff'], len(r['car'])-1,
                   r.get('carMass'), r.get('defMass') or [None] * len(r['def'][0]))


def speed_bin(v):
    return '<3' if v < 3 else '3-5' if v < 5 else '5+'


def course(path):
    rows = []
    for C, D, O, ho, e, mr, MD in plays(path):
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
        disp = lambda P: (P[e][0] - P[hit][0]) * ux + (P[e][1] - P[hit][1]) * uy
        g, hd = disp(C), disp(H)
        f2 = min(e, hit + 2)
        blocker_on = any(math.dist(o, H[f2]) <= 1.0 for o in O[f2])
        second = any(k != j and math.dist(D[f2][k], C[f2]) <= 1.0 for k in range(len(D[f2])))
        mh = MD[j] if j < len(MD) else None
        mom = (mr * vr[0] - mh * vh[0]) if (mr and mh and vr[0] is not None and vh[0] is not None) else None
        rows.append(dict(cls=cls, bin=speed_bin(sp * 10), torso=torso, vr=vr, vh=vh, sep=sep, gain=g, hdisp=hd,
                         rel=g - hd, blocker_on=blocker_on, second=second, t_end=(e - hit) / 10, mom=mom))
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
    if not masses:
        print('   (no masses in this source: momentum omitted)')


if '--from-json' in sys.argv:
    # Print a stored result (e.g. the NFL run, frontcourse-nfl.json) with the same layout.
    for name, out in json.load(open(sys.argv[sys.argv.index('--from-json') + 1])).items():
        for cell in out.values():
            for k in ('vr', 'vh', 'sep'):
                cell[k] = {int(o): v for o, v in cell[k].items()}
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
                      t_end=med([r['t_end'] for r in rr]), mom=med([r['mom'] for r in rr]))
    if out:
        show(name, out, any(r['mom'] is not None for r in R))
    store[name] = out
if OUT:
    json.dump(store, open(OUT, 'w'), indent=1, default=str)
