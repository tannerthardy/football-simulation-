"""QB lane, 2026-11-23 (Flex / Integration: the QB still drifting back at 2.0-2.5 s). One operator for NFL tracking
(BDB 2025, out/mechanics/nfl-plays.jsonl.gz with plays.csv) and sim exports (scripts/mechanics/sim-export.ts), the
same definitions as scripts/diag/escape/drop-steps.py: non-designed dropbacks with the ball thrown (pass_forward), no
screens, no spikes, no throwaways (sim). Depth = yd behind his snap spot along the field.

Per dropback:
  - depth and speed at 0.5 s steps from the snap to 3.0 s (while he still has the ball);
  - his first set: the first frame 1 yd or more from his snap spot moving slower than 1 yd/s; depth at the set; set to
    the release;
  - drift after the set: depth at the release minus depth at the set (+ = further back), and the deepest point;
  - hitches after the set: forward movements of 0.3+ yd, each ended by a stop under 0.5 yd/s or the release.
Groups: alignment (gun: snap spot 3+ yd behind the line) x play action; gun non-PA also by depth at the set
(under 2 yd 'quick', 2-3.5 '3-step', 3.5+ '5-step'), the same bands both sides, since NFL tracking has no drop call.
usage: python3 -I drop_set.py name=a.jsonl.gz,... [--plays-csv plays.csv]"""
import sys, os, json, gzip, csv, re, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen|bubble|tunnel|slip|now_', re.I)
STEPS = (0.5, 1.0, 1.5, 2.0, 2.5, 3.0)
q = lambda v, p=.5: (sorted(v)[int(p * (len(v) - 1))] if v else float('nan'))


def one(raw):
    p = Play(raw); qbs = p.who('O', 'QB'); fw = raw['events'].get('pass_forward')
    if not qbs or fw is None: return None
    qb = qbs[0]; xy = raw['xy']; dt = p.dt
    kend = min(len(xy) - 1, int(round(fw / dt)))
    X = [xy[k][2 * qb] for k in range(kend + 1)]; Y = [xy[k][2 * qb + 1] for k in range(kend + 1)]
    if any(v is None for v in X + Y) or kend < 4: return None
    x0, y0 = X[0], Y[0]
    sp = lambda k: math.hypot(X[min(k + 1, kend)] - X[max(k - 1, 0)], Y[min(k + 1, kend)] - Y[max(k - 1, 0)]) / ((min(k + 1, kend) - max(k - 1, 0)) * dt)
    dep = lambda k: x0 - X[k]
    row = {'gun': x0 <= -3, 'rel': kend * dt, 'at': {}}
    for s in STEPS:
        k = int(round(s / dt))
        if k <= kend: row['at'][s] = (dep(k), sp(k))
    ks = next((k for k in range(1, kend + 1) if math.hypot(X[k] - x0, Y[k] - y0) >= 1 and sp(k) < 1.0), None)
    row['setT'] = ks * dt if ks is not None else None
    row['setD'] = dep(ks) if ks is not None else None
    row['toThrow'] = (kend - ks) * dt if ks is not None else None
    row['drift'] = dep(kend) - dep(ks) if ks is not None else None
    row['deep'] = max(dep(k) for k in range(kend + 1))
    hitches = 0
    if ks is not None:
        k = ks; base = X[ks]
        while k < kend:
            k += 1
            if X[k] - base >= 0.3:
                hitches += 1
                while k < kend and sp(k) >= 0.5: k += 1
                base = X[k]
            elif X[k] < base: base = X[k]
    row['hitch'] = hitches
    return row


def group(r):
    if not r['gun']: return 'under centre' + (' PA' if r['pa'] else '')
    if r['pa']: return 'gun PA'
    if r['setD'] is None: return 'gun, never set'
    return 'gun quick (<2 yd)' if r['setD'] < 2 else 'gun 3-step (2-3.5)' if r['setD'] < 3.5 else 'gun 5-step (3.5+)'


ORDER = ['gun quick (<2 yd)', 'gun 3-step (2-3.5)', 'gun 5-step (3.5+)', 'gun, never set', 'gun PA', 'under centre', 'under centre PA']
for arg in args:
    name, paths = arg.split('=', 1); rows = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id']); con = str((raw.get('cell') or {}).get('concept') or '')
            sim = raw.get('source') == 'sim'
            if pf is None and not sim: continue
            isPA = (pf is not None and pf['playAction'] == 'TRUE') or (sim and ('pa' in con.split('+') or con.startswith('pa_')))
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
            if sim and DES.search(con): continue
            if sim and (raw.get('labels') or {}).get('throwaway'): continue
            r = one(raw)
            if r: r['pa'] = isPA; rows.append(r)
    print(f"== {name} (thrown dropbacks {len(rows)})")
    G = {}
    for r in rows: G.setdefault(group(r), []).append(r)
    for g in ORDER:
        R = G.get(g)
        if not R: continue
        S = [r for r in R if r['setT'] is not None]
        print(f"  {g:22s} n {len(R):5d} | release p50 {q([r['rel'] for r in R]):.2f} s | first set p50 {q([r['setT'] for r in S]):.2f} s at {q([r['setD'] for r in S]):.2f} yd"
              f" | set->throw p50 {q([r['toThrow'] for r in S]):.2f} | drift after set p25/50/75 {q([r['drift'] for r in S], .25):+.2f}/{q([r['drift'] for r in S]):+.2f}/{q([r['drift'] for r in S], .75):+.2f}"
              f" | deepest p50 {q([r['deep'] for r in R]):.2f} | hitch 0/1/2+ {sum(r['hitch'] == 0 for r in S) / max(1, len(S)):.0%}/{sum(r['hitch'] == 1 for r in S) / max(1, len(S)):.0%}/{sum(r['hitch'] >= 2 for r in S) / max(1, len(S)):.0%}")
        print('      depth / speed by time: ' + '  '.join(f"{s:.1f}s {q([r['at'][s][0] for r in R if s in r['at']]):.2f}/{q([r['at'][s][1] for r in R if s in r['at']]):.1f} (n {sum(s in r['at'] for r in R)})" for s in STEPS))
