"""QB lane / CALL_MIX refit, 2026-11-14: the achieved drop, one operator on NFL tracking and sim exports.
The QB's displacement from where he took the snap, at its largest, from the snap to the throw (or the sack / 4.0 s):
  back = max over frames of (x at snap - x)            (straight back from the snap spot)
  eucl = max over frames of |pos - pos at snap|         (any direction)
NFL: checked against BDB's dropbackDistance on the same plays (which operator it is), then binned as
refit_targets.py does (< 3.5, 3.5-5, 5-7, 7+), gun and under center apart. Non-designed, non-play-action
dropbacks with no screen route; sim: no 'pa'/'boot'/screen concepts (by name), formation from the export cell.
Result (2026-11-14, BDB wk 1-6 vs develop 3c2f968d, seeds 101/105/109/113 x 4 games): 'back' reproduces dropbackDistance
(median |diff| 0.04 yd). Gun back p25/50/75 sim 2.7/3.4/3.4 vs NFL 2.3/3.1/3.9, 5+ yd 1.5% vs 7.6%; under center sim
4.4/6.1/6.3 vs NFL 3.4/4.8/6.5 (sim n 68, NFL 132), < 3.5 yd 19% vs 25%, 5-7 yd 63% vs 30%. Corrected the same day: the
first version kept '+pa' play-action concepts in the sim side (the name test missed the suffix).
usage: python3 -I scripts/diag/call-mix/drop_depth.py --data <bdb2025 dir> name=a.jsonl.gz,... """
import sys, os, json, gzip, csv, math, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
SCR = set()
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] == 'SCREEN': SCR.add(f"{r['gameId']}-{r['playId']}")
UC_NFL = {'SINGLEBACK', 'I_FORM', 'JUMBO'}
SIM_SKIP = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen|^pa_|_pa$|\+pa\b|bubble|tunnel|slip|now_', re.I)
def q(v, p=.5):
    v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')
def bins(v):
    n = len(v) or 1
    return ' '.join(f"{100 * sum(1 for x in v if lo <= x < hi) / n:5.1f}" for lo, hi in ((-9, 3.5), (3.5, 5), (5, 7), (7, 99)))
for arg in args:
    name, paths = arg.split('=', 1); G = collections.defaultdict(lambda: collections.defaultdict(list)); pair = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id']); cell = raw.get('cell') or {}
            if pf is not None:
                if pf['dropbackType'] != 'TRADITIONAL' or pf['playAction'] == 'TRUE' or raw['id'] in SCR: continue
                uc = pf['offenseFormation'] in UC_NFL
            else:
                if SIM_SKIP.search(str(cell.get('concept') or '')): continue
                if (raw.get('labels') or {}).get('scramble'): continue
                f = str(cell.get('formation') or ''); uc = not re.search(r'gun|empty|pistol', f)
            p = Play(raw); ev = raw['events']
            tend = min(ev.get('pass_forward') or ev.get('sack') or ev.get('end') or 4.0, 4.0)
            qb = next((j for j, pl in enumerate(p.players) if pl.get('group') == 'QB' or pl.get('pos') == 'QB'), None)
            if qb is None: continue
            x0, y0 = p.pos(qb, 0)
            if x0 is None: continue
            back = eucl = 0.0
            for k in range(0, min(p.frames - 1, p.k(tend)) + 1):
                x, y = p.pos(qb, k)
                if x is None: continue
                back = max(back, x0 - x); eucl = max(eucl, math.hypot(x - x0, y - y0))
            g = 'uc' if uc else 'gun'
            G[g]['back'].append(back); G[g]['eucl'].append(eucl); G[g]['start'].append(-x0)
            if pf is not None:
                try: dd = float(pf['dropbackDistance']); G[g]['bdb'].append(dd); pair.append((dd, back, eucl))
                except ValueError: pass
    print(f"== {name}")
    if pair:
        for j, lab in ((1, 'back'), (2, 'eucl')):
            e = [abs(a[0] - a[j]) for a in pair]
            print(f"   BDB dropbackDistance vs {lab}: |diff| median {q(e):.2f} p90 {q(e, .9):.2f} yd (n {len(pair)})")
    for g in ('gun', 'uc'):
        d = G[g]
        if not d['back']: continue
        print(f"   {g:3s} n {len(d['back']):5d}  QB start {q(d['start']):.1f} yd off the ball  back p25/50/75 {q(d['back'], .25):.1f}/{q(d['back']):.1f}/{q(d['back'], .75):.1f}"
              f"  bins <3.5 / 3.5-5 / 5-7 / 7+: back {bins(d['back'])}  eucl {bins(d['eucl'])}" + (f"  BDB {bins(d['bdb'])}" if d['bdb'] else ''))
