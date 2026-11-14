"""Crosser depth by class, 2026-11-14 (Rules + Coaching, routes and call mix; for Coverage's CUT_WALL re-read).
Is our crosser too deep because of the mix (more deep overs) or because each crosser drifts deeper than the NFL's?
One operator on NFL tracking and sim exports. Crossing routes: NFL routeRan CROSS by a WR or TE (backs, who cross behind the line, are left out); sim route ids cross (14 yd),
shallow (5), shallow_high (6). Against zone (NFL pff_manZone Zone; sim the called coverage not cover0 / cover1 / man),
non-designed dropbacks, ball still in the QB's hand. Depth = the receiver's x past the line; across = lateral distance
from his snap spot. Class by his depth at 2.0 s: shallow under 4 yd, mid 4-8, deep 8+ (a route thrown before 2.0 s
has no class and is left out of the class rows).
usage: python3 -I crosser-class.py --data <bdb2025 dir> name=a.jsonl.gz,... """
import sys, os, json, gzip, csv, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] == 'CROSS': RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = 'CROSS'
SIMX = {'cross', 'shallow', 'shallow_high'}
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
T = (1.0, 1.5, 2.0, 2.5, 3.0)
def q(v, p=.5):
    v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')
def klass(d): return 'shallow' if d < 4 else 'mid' if d < 8 else 'deep'
for arg in args:
    name, paths = arg.split('=', 1); rows = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id']); cell = raw.get('cell') or {}
            if pf is not None:
                if pf['dropbackType'].startswith('DESIGNED') or pf['isDropback'] != 'TRUE' or pf['pff_manZone'] != 'Zone' or pf['playAction'] == 'TRUE': continue
            else:
                cov = str(cell.get('coverage') or ''); con = str(cell.get('concept') or '')
                if re.search(r'cover0|cover1|man', cov, re.I) or DES.search(con) or '+pa' in con or con.startswith('pa_'): continue
            p = Play(raw); fw = raw['events'].get('pass_forward'); held = fw if fw is not None else p.end
            for j, pl in enumerate(p.players):
                if pl['side'] != 'O': continue
                if pf is not None:
                    if RR.get((raw['id'], str(pl.get('id')))) != 'CROSS' or pl.get('pos') in ('RB', 'FB'): continue
                    rid = 'CROSS'
                else:
                    rt = pl.get('route'); rid = rt.split(':')[-1] if rt else None
                    if rid not in SIMX: continue
                x0, y0 = p.pos(j, 0)
                if x0 is None: continue
                d, a = {}, {}
                for t in T:
                    k = p.k(t)
                    if t > held or k >= p.frames: break
                    x, y = p.pos(j, k)
                    if x is None: break
                    d[t] = x; a[t] = abs(y - y0)
                rows.append((rid, (cell.get('concept') if pf is None else None), d, a))
    print(f"== {name}: crossing routes vs zone, ball held: {len(rows)}")
    def line(lab, R):
        out = f"   {lab:22s} n {len(R):4d}  depth p50 " + ' '.join(f"{t:.1f}s {q([r[2][t] for r in R if t in r[2]]):5.1f}" for t in T)
        out += "  | across p50 " + ' '.join(f"{t:.1f}s {q([r[3][t] for r in R if t in r[3]]):5.1f}" for t in (1.0, 2.0, 3.0))
        return out
    print(line('all', rows))
    C = [r for r in rows if 2.0 in r[2]]
    for c in ('shallow', 'mid', 'deep'):
        R = [r for r in C if klass(r[2][2.0]) == c]
        print(line(f"class {c} ({100 * len(R) / max(1, len(C)):.0f}%)", R))
    if any(r[1] for r in rows):
        for rid in ('shallow', 'shallow_high', 'cross'):
            R = [r for r in rows if r[0] == rid]
            print(line(f"id {rid}", R))
        cc = collections.Counter(r[1] for r in rows if r[0] == 'shallow')
        for con, _ in cc.most_common(6):
            print(line(f"  shallow in {con}", [r for r in rows if r[0] == 'shallow' and r[1] == con]))
