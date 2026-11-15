"""Outside receivers against a pressed corner: how they release. Same operator on NFL tracking and sim exports (Run
Game for Integration, 2026-11-14). Non-designed dropbacks; the receiver is the widest offensive player on his side
(WR or TE), running a route (NFL routeRan present; sim route id present, not a screen).
- Pressed: a DB within 2.0 yd (--press D) of him at the snap, no deeper than 2.5 yd past the line (that DB is "the corner").
  --holds keeps only corners who hold their ground (gain less than 1 yd of depth by 0.6 s); others bailed at the snap.
- Time to 5 yd: the first frame his x (yards past the line) reaches 5.
- Lateral: his y change, outward + (toward his sideline), when he first reaches 1 yd past the line and 5 yd.
- Release side: at the frame he first passes the corner's depth (or at 5 yd), inside or outside the corner.
- Leverage: the corner's y at the snap relative to him (outside shade if outward of him by 0.3+, inside if inward by
  0.3+, else head-up).
- Speed profile through 1.2 s. Jab/stutter: before 5 yd his sideways velocity passes 0.8 yd/s one way and then 0.8 the
  other way (a feint and a release the other side).
- Contact: the corner's centre within 1.0 yd of his for 0.2 s or more before he reaches 5 yd.
- Class: through (contact, no stutter), stutter (stutter, either), speed (neither; a release on one side).

  python3 -I press-release.py --data <bdb2025 dir> [--list N] name=a.jsonl.gz,...
"""
import sys, os, json, gzip, csv, math, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
LIST = 0
HOLD = '--holds' in args
PR = 2.0
if '--press' in args:
    i = args.index('--press'); PR = float(args[i + 1]); del args[i:i + 2]
if HOLD: args.remove('--holds')
if '--list' in args:
    i = args.index('--list'); LIST = int(args[i + 1]); del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] not in ('NA', ''): RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = r['routeRan']
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
def q(v):
    v = sorted(x for x in v if x is not None)
    if len(v) < 4: return f'- (n {len(v)})'
    return '/'.join(f'{v[int(p * (len(v) - 1))]:.2f}' for p in (.25, .5, .75)) + f' (n {len(v)})'
for arg in args:
    name, paths = arg.split('=', 1)
    S = collections.defaultdict(list); C = collections.Counter(); ex = collections.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['isDropback'] != 'TRUE'): continue
            if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            p = Play(raw); by = raw.get('ball_y', 0); P = raw['players']
            O = [j for j, pl in enumerate(P) if pl['side'] == 'O' and pl['group'] in ('WR', 'TE', 'RB')]
            DBs = [d for d in p.who('D') if P[d]['group'] == 'DB']
            ends = p.k(min(raw['events'].get('pass_forward', 99), p.end, 3.0))
            for side in (1, -1):
                mine = [j for j in O if (p.pos(j, 0)[1] - by) * side > 0]
                if not mine: continue
                j = max(mine, key=lambda j: (p.pos(j, 0)[1] - by) * side)
                if P[j]['group'] not in ('WR', 'TE'): continue
                if pf is not None:
                    if (raw['id'], str(P[j].get('id'))) not in RR: continue
                else:
                    rt = P[j].get('route')
                    if not rt or 'screen' in rt: continue
                x0, y0 = p.pos(j, 0)
                near = [d for d in DBs if p.dist(j, d, 0) <= 3.0 and p.pos(d, 0)[0] <= 2.5]
                if near:
                    d = min(near, key=lambda d: p.dist(j, d, 0))
                    S['al_gap'].append(p.dist(j, d, 0)); S['al_cbx'].append(p.pos(d, 0)[0]); S['al_wrx'].append(x0)
                cbs = [d for d in DBs if p.dist(j, d, 0) <= PR and p.pos(d, 0)[0] <= 2.5]
                if not cbs: C['off'] += 1; continue
                cb = min(cbs, key=lambda d: p.dist(j, d, 0)); C['pressed'] += 1
                holds = p.pos(cb, min(p.frames - 1, p.k(0.6)))[0] - p.pos(cb, 0)[0] < 1.0
                C['holds' if holds else 'bails'] += 1
                if HOLD and not holds: continue
                out = side
                lev = (p.pos(cb, 0)[1] - y0) * out
                levc = 'outside' if lev > 0.3 else 'inside' if lev < -0.3 else 'head-up'
                k5 = next((k for k in range(0, ends + 1) if p.pos(j, k)[0] >= 5), None)
                k1 = next((k for k in range(0, ends + 1) if p.pos(j, k)[0] >= 1), None)
                if k5 is None: C['no5'] += 1; continue
                S[('t5', levc)].append(k5 * p.dt); S[('t5', 'all')].append(k5 * p.dt)
                S['lat1'].append((p.pos(j, k1)[1] - y0) * out if k1 is not None else None); S['lat5'].append((p.pos(j, k5)[1] - y0) * out)
                kp = next((k for k in range(0, k5 + 1) if p.pos(j, k)[0] >= p.pos(cb, k)[0]), k5)
                rel = 'outside' if (p.pos(j, kp)[1] - p.pos(cb, kp)[1]) * out > 0 else 'inside'
                C[(levc, rel)] += 1
                rfam = (RR.get((raw['id'], str(P[j].get('id')))) if pf is not None else str(P[j].get('route')).split(':')[-1]) or '?'
                rfam = {'go': 'GO', 'vertical': 'GO', 'fade': 'GO', 'hitch': 'HITCH', 'comeback': 'HITCH', 'curl': 'HITCH', 'quick_out': 'OUT'}.get(rfam.lower(), rfam.upper())
                S[('rt', rfam)].append(((p.pos(j, k5)[1] - y0) * out, rel, levc))
                sp = [p.speed(j, k) for k in range(0, min(p.frames - 1, p.k(1.2)) + 1)]
                # A jab or stutter: his sideways velocity (0.2 s centred) goes past 0.8 yd/s one way, then past 0.8 the
                # other way, before he reaches 5 yd (a release that commits one way does not reverse).
                stut = False; first = 0
                for k in range(1, k5):
                    vy = (p.pos(j, min(p.frames - 1, k + 1))[1] - p.pos(j, k - 1)[1]) / (2 * p.dt) * out
                    if first == 0 and abs(vy) > 0.8: first = 1 if vy > 0 else -1
                    elif first and vy * first < -0.8: stut = True; break
                cont = 0; maxc = 0
                for k in range(0, k5 + 1):
                    cont = cont + 1 if p.dist(j, cb, k) <= 1.0 else 0; maxc = max(maxc, cont)
                contact = maxc * p.dt >= 0.2
                cls = 'stutter' if stut else 'through' if contact else 'speed'
                C[cls] += 1; S[('t5', cls)].append(k5 * p.dt); C[('contact', cls)] += contact
                C[('lev', levc, rfam)] += 1; C[('levstut', levc, rfam)] += cls == 'stutter'
                S[('t5lev', levc, rfam)].append(k5 * p.dt)
                for t in (0.3, 0.5, 0.7, 0.9, 1.1):
                    k = p.k(t)
                    if k < len(sp): S[('v', cls, t)].append(sp[k])
                if len(ex[cls]) < LIST:
                    ex[cls].append(f"{raw['id']} rec {j} cb {cb} lev {levc} t5 {k5 * p.dt:.1f} lat1 {S['lat1'][-1] if S['lat1'][-1] is None else round(S['lat1'][-1], 1)} rel {rel} contact {maxc * p.dt:.1f}s v " +
                                   ' '.join(f'{v:.1f}' for v in sp[:13:2]) + ' | gap ' + ' '.join(f'{p.dist(j, cb, min(k, p.frames - 1)):.1f}' for k in range(0, 15, 2))
                                   + ' | dy ' + ' '.join(f'{(p.pos(j, min(k, p.frames - 1))[1] - p.pos(cb, min(k, p.frames - 1))[1]) * out:+.1f}' for k in range(0, 15, 2)))
    n = max(1, C['pressed'] - C['no5'])
    print(f"   alignment, nearest DB within 3 yd and <=2.5 deep: gap {q(S['al_gap'])}; corner depth {q(S['al_cbx'])}; receiver depth {q(S['al_wrx'])}")
    print(f"   corners holding / bailing at the snap: {C['holds']} / {C['bails']}")
    print(f"== {name}{' [holds]' if HOLD else ''}: outside receivers {C['pressed'] + C['off']}, pressed {C['pressed']} ({100 * C['pressed'] / max(1, C['pressed'] + C['off']):.0f}%); reached 5 yd {n}")
    print(f"   time to 5 yd: all {q(S[('t5', 'all')])}; by leverage outside {q(S[('t5', 'outside')])} head-up {q(S[('t5', 'head-up')])} inside {q(S[('t5', 'inside')])}")
    print(f"   lateral (outward +) at 1 yd {q(S['lat1'])}, at 5 yd {q(S['lat5'])}")
    print('   release side by leverage: ' + '; '.join(f"{l}: in {C[(l, 'inside')]} out {C[(l, 'outside')]}" for l in ('outside', 'head-up', 'inside')))
    for key in sorted(k for k in S if isinstance(k, tuple) and k[0] == 'rt'):
        v = S[key]
        if len(v) < 8: continue
        hu = [r for _, r, l in v if l == 'head-up']
        lv = ' '.join(f"{L} {sum(r == 'outside' for _, r, l in v if l == L)}/{sum(l == L for _, _, l in v)}" for L in ('outside', 'head-up', 'inside'))
        print(f"   route {key[1]:8s} n {len(v):4d}: lateral at 5 yd {q([a for a, _, _ in v])}; released outside by corner shade: {lv}")
    for rf in ('GO', 'HITCH', 'OUT', 'SLANT'):
        row = []
        for L in ('outside', 'head-up', 'inside'):
            n_ = C[('lev', L, rf)]
            if n_: row.append(f"{L} jab {C[('levstut', L, rf)]}/{n_} t5 {q(S[('t5lev', L, rf)]).split(' ')[0]}")
        if row: print(f"   {rf:5s} by corner shade: " + '; '.join(row))
    for cls in ('speed', 'stutter', 'through'):
        print(f"   {cls:8s} {C[cls]} ({100 * C[cls] / n:.0f}%), contact on {C[('contact', cls)]}; t5 {q(S[('t5', cls)])}; speed 0.3/0.5/0.7/0.9/1.1 s " +
              ' | '.join(q(S[('v', cls, t)]).split(' ')[0] for t in (0.3, 0.5, 0.7, 0.9, 1.1)))
        for row in ex[cls]: print('      ' + row)
