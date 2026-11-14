"""Crossers against man coverage: why does the trailing defender gain? (Run Game for Integration, 2026-11-14.)
Same operator on NFL tracking and sim exports; route labels and the man/zone split exactly as
scripts/diag/eyes/crosser-sep.py (QB lane, claude/exciting-cori-hc8l4u 0e87ceb4): NFL routeRan CROSS; sim route id
cross / shallow / shallow_high / under; man = NFL pff_manZone Man, sim called cover0 / cover1 / man.

For each CROSS route on a non-designed dropback in man coverage, while the ball is held (to 3.0 s):
- his shadow: the defensive back or linebacker with the smallest mean distance to him over 0.5-2.0 s (no assignment
  labels exist in the NFL data; a pass rusher near a releasing crosser is not his man);
- route (item 4): depth past the line and speed at 1.0 / 2.0 / 3.0 s, and his crossing (lateral) speed;
- speed (item 3): the shadow's speed at the same marks, the receiver minus shadow speed;
- position (item 2): the shadow's place in the receiver's frame at the snap, 1.0 and 2.0 s: "behind" = how far the
  shadow trails along the receiver's direction of travel (+ = behind him), "over" = shadow depth minus receiver depth
  (+ = on top, deeper), plus the separation;
- traffic (item 1): another body (anyone but the pair) within 1.0 yd of the shadow between 0.5 and 3.0 s; the share
  of routes with such a moment; the shadow's speed and the separation change from 0.3 s before to 0.5 s after the
  first such moment, against the same change at the same time on routes with no traffic.

  --class shallow|mid|deep keeps crossers by their peak depth past the line while the ball is held (to 3.0 s):
  shallow under 6 yd, deep 8 yd or more (Rules + Coaching: compare like with like).
  python3 -I crosser-man.py --data <bdb2025 dir> [--list N] [--class C] name=a.jsonl.gz,...
"""
import sys, os, json, gzip, csv, math, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
LIST = 0
CLASS = None
if '--class' in args:
    i = args.index('--class'); CLASS = args[i + 1]; del args[i:i + 2]
if '--list' in args:
    i = args.index('--list'); LIST = int(args[i + 1]); del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] not in ('NA', ''): RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = r['routeRan']
SIM_CROSS = {'cross', 'shallow', 'shallow_high', 'under'}
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
def q(v):
    v = sorted(x for x in v if x is not None and not math.isnan(x))
    if len(v) < 4: return '-'
    return '/'.join(f'{v[int(p * (len(v) - 1))]:.2f}' for p in (.25, .5, .75))
def vel(p, j, k):
    a, b = max(0, k - 1), min(p.frames - 1, k + 1)
    (x0, y0), (x1, y1) = p.pos(j, a), p.pos(j, b)
    if x0 is None or x1 is None or b == a: return None
    return ((x1 - x0) / ((b - a) * p.dt), (y1 - y0) / ((b - a) * p.dt))
for arg in args:
    name, paths = arg.split('=', 1)
    S = collections.defaultdict(list); C = collections.Counter(); ex = collections.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
            cov = str((raw.get('cell') or {}).get('coverage') or '')
            if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            man = (pf['pff_manZone'] == 'Man') if pf is not None else bool(re.search(r'cover0|cover1|man', cov, re.I))
            if not man: continue
            p = Play(raw); ev = raw['events']; fw = ev.get('pass_forward')
            kend = min(p.frames - 1, p.k(fw if fw is not None else p.end), p.k(3.0))
            Dd = p.who('D'); allp = list(range(len(p.players)))
            for j, pl in enumerate(p.players):
                if pl['side'] != 'O': continue
                if pf is not None: lab = RR.get((raw['id'], str(pl.get('id'))))
                else:
                    rt = pl.get('route'); rid = rt.split(':')[-1] if rt else None; lab = 'CROSS' if rid in SIM_CROSS else None
                if lab != 'CROSS' or kend < p.k(1.5): continue
                ks = range(p.k(0.5), min(kend, p.k(2.0)) + 1)
                def md(d):
                    v = [p.dist(j, d, k) for k in ks]; v = [x for x in v if math.isfinite(x)]
                    return sum(v) / len(v) if v else math.inf
                cover = [d for d in Dd if p.players[d]['group'] in ('DB', 'LB')]
                if not cover: continue
                sh = min(cover, key=md)
                if not math.isfinite(md(sh)) or md(sh) > 6: continue
                peak = max((p.pos(j, k)[0] for k in range(0, kend + 1) if p.pos(j, k)[0] is not None), default=0)
                cls = 'shallow' if peak < 6 else 'deep' if peak >= 8 else 'mid'
                if CLASS and cls != CLASS: continue
                C['routes'] += 1
                for t in (1.0, 2.0, 3.0):
                    k = p.k(t)
                    if k > kend: continue
                    vr, vd = vel(p, j, k), vel(p, sh, k)
                    if vr is None or vd is None: continue
                    sr, sd = math.hypot(*vr), math.hypot(*vd)
                    S[f'depth{t}'].append(p.pos(j, k)[0]); S[f'rspeed{t}'].append(sr); S[f'rlat{t}'].append(abs(vr[1]))
                    S[f'dspeed{t}'].append(sd); S[f'dv{t}'].append(sr - sd); S[f'sep{t}'].append(p.dist(j, sh, k))
                for t in (0.0, 1.0, 2.0):
                    k = p.k(t)
                    if k > kend: continue
                    vr = vel(p, j, max(k, p.k(0.5)))
                    if vr is None: continue
                    L = math.hypot(*vr) or 1; ux, uy = vr[0] / L, vr[1] / L
                    (rx, ry), (dx, dy) = p.pos(j, k), p.pos(sh, k)
                    S[f'behind{t}'].append(-((dx - rx) * ux + (dy - ry) * uy)); S[f'over{t}'].append(dx - rx)
                # Traffic: a third body within 1.0 yd of the shadow.
                kt = next((k for k in range(p.k(0.5), kend + 1)
                           if any(o not in (j, sh) and p.dist(o, sh, k) <= 1.0 for o in allp)), None)
                k0 = kt if kt is not None else p.k(1.5)
                ka, kb = k0 - 3, min(kend, k0 + 5)
                if ka >= 0 and kb > k0:
                    dsep = p.dist(j, sh, kb) - p.dist(j, sh, ka)
                    va, vb = vel(p, sh, ka), vel(p, sh, k0)
                    key = 'traffic' if kt is not None else 'clean'
                    C[key] += 1; S[f'dsep_{key}'].append(dsep); S[f't_{key}'].append(k0 * p.dt)
                    if va and vb: S[f'dslow_{key}'].append(math.hypot(*vb) - math.hypot(*va))
                    if len(ex[key]) < LIST: ex[key].append(f"{raw['id']} rec {j} shadow {sh} t {k0 * p.dt:.1f} sep {p.dist(j, sh, ka):.1f}->{p.dist(j, sh, kb):.1f}")
    r = max(1, C['routes'])
    print(f"== {name} [{CLASS or 'all'}]: CROSS routes vs man {C['routes']} (shadow within 6 yd); with traffic {100 * C['traffic'] / r:.0f}%")
    print(f"   (4) route: depth 1/2/3 s {q(S['depth1.0'])} | {q(S['depth2.0'])} | {q(S['depth3.0'])}; speed {q(S['rspeed1.0'])} | {q(S['rspeed2.0'])} | {q(S['rspeed3.0'])}; crossing speed {q(S['rlat1.0'])} | {q(S['rlat2.0'])} | {q(S['rlat3.0'])}")
    print(f"   (3) shadow speed {q(S['dspeed1.0'])} | {q(S['dspeed2.0'])} | {q(S['dspeed3.0'])}; receiver minus shadow {q(S['dv1.0'])} | {q(S['dv2.0'])} | {q(S['dv3.0'])}; sep {q(S['sep1.0'])} | {q(S['sep2.0'])} | {q(S['sep3.0'])}")
    print(f"   (2) shadow behind (along travel) snap/1/2 s {q(S['behind0.0'])} | {q(S['behind1.0'])} | {q(S['behind2.0'])}; over (+ deeper) {q(S['over0.0'])} | {q(S['over1.0'])} | {q(S['over2.0'])}")
    for key in ('traffic', 'clean'):
        print(f"   (1) {key:7s} n {C[key]}: at t {q(S['t_' + key])} s, sep change -0.3..+0.5 s {q(S['dsep_' + key])} yd; shadow speed change into it {q(S['dslow_' + key])} yd/s")
    for key, rows in ex.items():
        for row in rows: print(f"      {key}: {row}")
