"""The standing pass-rep report (Integration / the user, 2026-11-13): "does each offensive lineman have NFL-realistic
places every 0.5 s; are they beaten at realistic rates; are the D-linemen getting where they should; why doesn't our QB
get sacked enough if he just stands still". Same operator code on NFL tracking and sim exports (common play format).

usage: python3 -I scripts/diag/pass-operators/pass-rep-report.py [--nfl-labels <bdb2025 dir>] [--review <review.json>]
       <plays.jsonl.gz>

Dropbacks only. Offense attacks +x; the line of scrimmage is x = 0.
- Linemen: the five OL by y at the snap, LT the offense's left (largest y) to RT.
- Rushers (operator, both sides): defenders who are within 2.5 yd of the line at the snap or come from behind it,
  and by 1.5 s (or the throw) have moved >= 1.0 yd toward the QB's starting spot. Edge: outside a tackle's y at the
  snap; interior: between them.
- Rush count: rushers per dropback (4 / 5 / 6+; 3 or fewer are folded into 4). Gun: the QB 3 yd or more behind the
  line at the snap.

1. POCKET MAP. Per lineman slot and 0.5-s slice to 4.0 s (ball still in the QB's hands): depth behind the line, depth
   in front of the QB, width outward from the ball (+ toward his side), distance to the nearest rusher. Per rusher
   class: distance to the QB and closing speed (+ = closing). Medians, n per cell.
2. BEATEN. NFL only, from BDB 2025's PFF labels (`--nfl-labels`): per lineman slot and rush count, the share credited
   with pressure allowed and its time. Then the agreement of our operator (the lineman whose nearest rusher comes off
   him, attached <= 1.2 yd for >= 0.5 s then beyond 1.5 yd, and reaches 2 yd of the QB before the throw:
   come-off.py's own-blocker rule) with the label, per lineman-dropback.
3. SACK FUNNEL. Per dropback: a rusher free (from 1.0 s: within 5 yd of the QB with no offensive non-QB within 1.5 yd)
   and when first; the
   nearest rusher to the QB at 2.0 / 2.5 / 3.0 / 3.5 s (ball still in hand); a rusher within 2 yd before the ball is
   out; contact (within 1.0 yd) given that; sacked given contact; time to throw. NFL sacks: plays.csv passResult 'S'
   (needs `--nfl-labels`); sim sacks: the review file's stats.sacked (`--review`).
`PASS_REP_TRACE=<seed>` prints 12 dropbacks with the funnel stage each reached, for eye-checks.
"""
import sys, os, json, gzip, math, csv, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
SLICES = [0.5 * i for i in range(1, 9)]
SLOTS = ('LT', 'LG', 'C', 'RG', 'RT')

args = sys.argv[1:]; labels_dir = review_path = None
while args and args[0].startswith('--'):
    if args[0] == '--nfl-labels': labels_dir = args[1]
    elif args[0] == '--review': review_path = args[1]
    args = args[2:]
path = args[0]

# NFL labels: per play, nflIds of the 22 (offense first, then by nflId: the converter's order) and per-player labels.
LAB = {}; PLAYLAB = {}
if labels_dir:
    plays = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(os.path.join(labels_dir, 'plays.csv')))}
    pp = {}
    for r in csv.DictReader(open(os.path.join(labels_dir, 'player_play.csv'))):
        pp.setdefault(f"{r['gameId']}-{r['playId']}", []).append(r)
    for pid, rows in pp.items():
        pl = plays.get(pid)
        if not pl: continue
        off = pl['possessionTeam']
        rows.sort(key=lambda r: (r['teamAbbr'] != off, int(r['nflId'])))
        LAB[pid] = rows; PLAYLAB[pid] = pl
SIMSACK = {}
if review_path:
    for p in json.load(open(review_path))['plays']:
        if p.get('kind') == 'pass': SIMSACK[p['id']] = bool((p.get('stats') or {}).get('sacked'))

pocket = {}; rushmap = {}; beaten = {}; agree = {'tp': 0, 'fp': 0, 'fn': 0, 'tn': 0}; RAGREE = {'tp': 0, 'fp': 0, 'fn': 0, 'tn': 0}; funnel = []; traces = []
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'pass' or not raw.get('xy'): continue
    p = Play(raw); ev = raw['events']; pid = raw.get('id')
    qbs = p.who('O', 'QB')
    if not qbs: continue
    qb = qbs[0]
    OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
    if len(OL) != 5: continue
    OL.sort(key=lambda o: -p.pos(o, 0)[1]); slot = dict(zip(OL, SLOTS))
    others = [o for o in p.who('O') if o != qb and p.pos(o, 0)[0] is not None]
    fw = ev.get('pass_forward'); tend = fw if fw is not None else p.end
    kend = min(p.frames - 1, p.k(tend))
    q0 = p.pos(qb, 0); gun = -q0[0] >= 3.0; by = raw['ball_y']
    yL, yR = p.pos(OL[0], 0)[1], p.pos(OL[-1], 0)[1]
    rushers = []
    for d in p.who('D'):
        x0, y0 = p.pos(d, 0)
        if x0 is None or x0 > 2.5: continue
        k15 = min(kend, p.k(1.5)); x1, y1 = p.pos(d, k15)
        if x1 is None: continue
        if math.hypot(x0 - q0[0], y0 - q0[1]) - math.hypot(x1 - q0[0], y1 - q0[1]) >= 1.0:
            rushers.append((d, 'edge' if (y0 > yL or y0 < yR) else 'interior'))
    nr = len(rushers); rc = '4' if nr <= 4 else '5' if nr == 5 else '6+'
    for t in SLICES:
        k = p.k(t)
        if k > kend: break
        qx, qy = p.pos(qb, k)
        if qx is None: continue
        for o in OL:
            ox, oy = p.pos(o, k)
            if ox is None: continue
            dr = min((math.hypot(p.pos(d, k)[0] - ox, p.pos(d, k)[1] - oy) for d, _ in rushers if p.pos(d, k)[0] is not None), default=float('nan'))
            out = (oy - by) * (1 if slot[o] in ('LT', 'LG') else -1 if slot[o] in ('RG', 'RT') else 0)
            pocket.setdefault((slot[o], t, rc, gun), []).append((-ox, ox - qx, out, dr))
        for d, cls in rushers:
            dx, dy = p.pos(d, k)
            if dx is None: continue
            vx, vy = p.velocity(d, k); dist = math.hypot(dx - qx, dy - qy) or 1e-6
            closing = -((dx - qx) * vx + (dy - qy) * vy) / dist
            rushmap.setdefault((cls, t, rc, gun), []).append((dist, closing))
    # 2. beaten: labels and our operator per lineman
    lab = LAB.get(pid)
    if lab and len(lab) == len(p.players):
        ops = {d for d, _ in rushers}
        for d in p.who('D'):
            lr = lab[d].get('wasInitialPassRusher') in ('1', 'TRUE', 'True'); f = d in ops
            RAGREE['tp' if lr and f else 'fn' if lr else 'fp' if f else 'tn'] += 1
    if lab and len(lab) == len(p.players):
        for o in OL:
            r = lab[o]; allowed = r.get('pressureAllowedAsBlocker') in ('1', 'TRUE', 'True')
            tt = r.get('timeToPressureAllowedAsBlocker'); tt = float(tt) if tt not in (None, '', 'NA') else None
            beaten.setdefault((slot[o], rc), []).append((allowed, tt))
    # our operator: own-blocker come-off then within 2 yd of the QB before the throw
    flagged = set()
    for d, _ in rushers:
        last = None; since = None
        for k in range(max(1, p.k(0.5)), kend + 1):
            rx, ry = p.pos(d, k)
            if rx is None: break
            near = [(math.hypot(p.pos(o, k)[0] - rx, p.pos(o, k)[1] - ry), o) for o in OL if p.pos(o, k)[0] is not None]
            dist, o = min(near) if near else (99, None)
            if o is not None and dist <= 1.2:
                if last != o: since = k
                last = o; continue
            if last is None or dist <= 1.5: continue
            held = (k - since) * p.dt if since is not None else 0
            if held >= 0.5 and any(p.pos(qb, j)[0] is not None and p.pos(d, j)[0] is not None and p.dist(d, qb, j) <= 2.0 for j in range(k, kend + 1)):
                flagged.add(last)
            last = None
    if lab and len(lab) == len(p.players):
        for o in OL:
            allowed = lab[o].get('pressureAllowedAsBlocker') in ('1', 'TRUE', 'True'); f = o in flagged
            agree['tp' if allowed and f else 'fn' if allowed else 'fp' if f else 'tn'] += 1
    # 3. funnel
    first_free = None; nearest = {}; reached = contact = False; t_reach = None
    for k in range(p.k(0.5), kend + 1):
        qx, qy = p.pos(qb, k)
        if qx is None: break
        for d, _ in rushers:
            dx, dy = p.pos(d, k)
            if dx is None: continue
            dq = math.hypot(dx - qx, dy - qy)
            free = k * p.dt >= 1.0 and dq <= 5.0 and all(p.pos(o, k)[0] is None or math.hypot(p.pos(o, k)[0] - dx, p.pos(o, k)[1] - dy) > 1.5 for o in others)
            if free and first_free is None: first_free = k * p.dt
            if dq <= 2.0 and not reached: reached = True; t_reach = k * p.dt
            if dq <= 1.0 and reached: contact = True
        t = round(k * p.dt, 2)
        if t in (2.0, 2.5, 3.0, 3.5):
            nearest[t] = min((math.hypot(p.pos(d, k)[0] - qx, p.pos(d, k)[1] - qy) for d, _ in rushers if p.pos(d, k)[0] is not None), default=float('nan'))
    if labels_dir:
        pl = PLAYLAB.get(pid); sacked = bool(pl and pl.get('passResult') == 'S')
    else:
        sacked = SIMSACK.get(pid, False)
    funnel.append({'free': first_free, 'nearest': nearest, 'reached': reached, 'treach': t_reach, 'contact': contact, 'sacked': sacked,
                   'tthrow': tend, 'gun': gun, 'rc': rc})
    if os.environ.get('PASS_REP_TRACE'): traces.append((pid, nr, first_free, t_reach, contact, sacked, round(tend, 2)))

n = len(funnel)
print(f"== {os.path.basename(path)}: dropbacks {n}" + (f" (labelled {sum(1 for _ in beaten.values())} cells)" if labels_dir else ''))
print("1. POCKET MAP (medians; ball in hand). Per slot: depth behind the line / in front of the QB / width outward / nearest rusher, yd (n)")
for gun in (True, False):
    for rc in ('4', '5', '6+'):
        rows = []
        for s in SLOTS:
            cells = []
            for t in (1.0, 2.0, 3.0):
                c = pocket.get((s, t, rc, gun), [])
                cells.append(f"{t:.0f}s {q([x[0] for x in c]):.1f}/{q([x[1] for x in c]):+.1f}/{q([x[2] for x in c]):+.1f}/{q([x[3] for x in c]):.1f} (n {len(c)})" if len(c) >= 10 else f"{t:.0f}s -")
            rows.append(f"      {s:2s} " + ' | '.join(cells))
        print(f"   {'gun' if gun else 'under'} rush {rc}:"); print('\n'.join(rows))
        for cls in ('edge', 'interior'):
            cells = []
            for t in (1.0, 2.0, 3.0):
                c = rushmap.get((cls, t, rc, gun), [])
                cells.append(f"{t:.0f}s to QB {q([x[0] for x in c]):.1f} closing {q([x[1] for x in c]):+.1f} (n {len(c)})" if len(c) >= 10 else f"{t:.0f}s -")
            print(f"      {cls:8s} " + ' | '.join(cells))
if labels_dir:
    print("2. BEATEN (NFL, PFF pressure allowed as blocker): share of lineman-dropbacks; time p50")
    for rc in ('4', '5', '6+'):
        print(f"   rush {rc}: " + ' | '.join(f"{s} {100 * sum(a for a, _ in beaten.get((s, rc), [])) / max(1, len(beaten.get((s, rc), []))):.1f}% at {q([t for a, t in beaten.get((s, rc), []) if a and t is not None]):.1f}s (n {len(beaten.get((s, rc), []))})" for s in SLOTS))
    r_ = RAGREE
    print(f"   rusher operator against wasInitialPassRusher, per defender: labelled {r_['tp'] + r_['fn']}, flagged {r_['tp'] + r_['fp']}, both {r_['tp']}"
          f" | recall {100 * r_['tp'] / max(1, r_['tp'] + r_['fn']):.0f}% | precision {100 * r_['tp'] / max(1, r_['tp'] + r_['fp']):.0f}%")
    a = agree; lab_pos = a['tp'] + a['fn']; op_pos = a['tp'] + a['fp']
    print(f"   our operator against the label, per lineman-dropback: labelled {lab_pos}, flagged {op_pos}, both {a['tp']}"
          f" | recall {100 * a['tp'] / max(1, lab_pos):.0f}% | precision {100 * a['tp'] / max(1, op_pos):.0f}%")
else:
    print("2. BEATEN: no labels for the sim; see the funnel and come-off.py")
print("3. SACK FUNNEL (per dropback)")
for lab_, sub in (('all', funnel), ('gun', [f for f in funnel if f['gun']]), ('under', [f for f in funnel if not f['gun']])):
    m = len(sub)
    if not m: continue
    fr = [f for f in sub if f['free'] is not None]; re_ = [f for f in sub if f['reached']]; co = [f for f in re_ if f['contact']]
    near = ' '.join(f"{t:.1f}s {q([f['nearest'][t] for f in sub if t in f['nearest'] and not math.isnan(f['nearest'][t])]):.1f} (n {sum(1 for f in sub if t in f['nearest'])})" for t in (2.0, 2.5, 3.0, 3.5))
    print(f"   {lab_:5s} n {m}: rusher free {100 * len(fr) / m:.0f}% (first at p50 {q([f['free'] for f in fr]):.2f} s) | nearest rusher to QB {near}"
          f" | within 2 yd before the ball is out {100 * len(re_) / m:.1f}% (at {q([f['treach'] for f in re_]):.2f} s) | contact given that {100 * len(co) / max(1, len(re_)):.0f}%"
          f" | sacked given contact {100 * sum(f['sacked'] for f in co) / max(1, len(co)):.0f}% | sacked {100 * sum(f['sacked'] for f in sub) / m:.1f}% | time to throw p50 {q([f['tthrow'] for f in sub]):.2f} s")
for rc in ('4', '5', '6+'):
    sub = [f for f in funnel if f['rc'] == rc]; m = len(sub)
    if m < 20: continue
    re_ = [f for f in sub if f['reached']]; co = [f for f in re_ if f['contact']]
    print(f"   rush {rc:2s} n {m}: free {100 * sum(f['free'] is not None for f in sub) / m:.0f}% | within 2 yd {100 * len(re_) / m:.1f}% | contact | 2 yd {100 * len(co) / max(1, len(re_)):.0f}% | sacked {100 * sum(f['sacked'] for f in sub) / m:.1f}%")
if traces:
    for t in random.Random(int(os.environ['PASS_REP_TRACE'])).sample(traces, min(12, len(traces))):
        print(f"   trace {t[0]} rushers {t[1]} | first free {t[2]} | within 2 yd at {t[3]} | contact {t[4]} | sacked {t[5]} | ball out {t[6]}")
