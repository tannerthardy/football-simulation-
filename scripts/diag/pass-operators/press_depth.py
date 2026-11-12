"""Corner depth at the snap over the outside receiver (same code, NFL and sim).

usage: python3 -I scripts/diag/pass-operators/press_depth.py [--plays plays.csv] <plays.jsonl.gz> [...]

Population: pass plays; each outside receiver (WR 10+ yd from the ball laterally) and the defensive back nearest him
at the snap (frame 0) within 4 yd laterally. Depth = the defender's x minus the receiver's x (yards off him), and
the share within 2.0 yd centre to centre ('pressed'). By coverage family (man / zone from the play's coverage label)
and by down (1st; 2nd/3rd and short <= 3; 2nd/3rd and long >= 7; other). NFL down/distance from BDB plays.csv
(--plays); sim from cell.down / cell.toGo (sim-export)."""
import sys, os, json, gzip, math, csv, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
args = sys.argv[1:]; dd = {}
if args and args[0] == '--plays':
    for r in csv.DictReader(open(args[1], newline='')):
        dd[f"{r['gameId']}-{r['playId']}"] = (int(r['down'] or 0), int(r['yardsToGo'] or 0))
    args = args[2:]
BINS = ((-9, 1.0), (1.0, 2.0), (2.0, 3.0), (3.0, 4.5), (4.5, 6.0), (6.0, 8.0), (8.0, 99))
for path in args:
    G = collections.defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass': continue
        p = Play(raw); cell = raw.get('cell') or {}
        cov = coverage_family(cell.get('coverage')) or 'other'
        down, togo = (cell.get('down'), cell.get('toGo')) if cell.get('down') is not None else dd.get(raw['id'], (0, 0))
        dn = '1st' if down == 1 else f"{'2nd/3rd'} short" if down in (2, 3) and togo <= 3 else f"{'2nd/3rd'} long" if down in (2, 3) and togo >= 7 else 'other'
        for r in p.who('O'):
            if p.players[r]['group'] != 'WR' or p.pos(r, 0)[0] is None or abs(p.pos(r, 0)[1] - raw['ball_y']) < 10: continue
            rx, ry = p.pos(r, 0)
            cands = [d for d in p.who('D') if p.players[d]['group'] in ('CB', 'DB', 'S', 'DBACK') or p.players[d].get('slot', '').startswith(('CB', 'NB', 'DB'))]
            if not cands: cands = p.who('D')
            cands = [d for d in cands if p.pos(d, 0)[0] is not None and abs(p.pos(d, 0)[1] - ry) <= 4]
            if not cands: continue
            d = min(cands, key=lambda d: p.dist(r, d, 0))
            depth = p.pos(d, 0)[0] - rx
            for key in (('all',), ('cov', cov), ('down', dn)):
                G[key].append((depth, p.dist(r, d, 0)))
    print('==', os.path.basename(path))
    print('  ' + 'group'.ljust(22) + 'n      ' + ' '.join(f"{lo:>4}-{hi:<3}" for lo, hi in BINS) + '  | p25/50/75 depth | pressed (<2 yd centre to centre)')
    for key in sorted(G, key=lambda k: (len(k), k)):
        v = G[key]; n = len(v)
        print('  ' + '/'.join(key).ljust(22) + f"{n:<6} " + ' '.join(f"{100*sum(lo <= x < hi for x, _ in v)/n:8.0f}%"[-9:] for lo, hi in BINS)
              + f"  | {q([x for x,_ in v],.25):.1f} {q([x for x,_ in v]):.1f} {q([x for x,_ in v],.75):.1f} | {100*sum(c < 2 for _, c in v)/n:.0f}%")
