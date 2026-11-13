"""The break on the ball, by coverage family, sim and NFL with the same code (common play format).

Defenders other than linemen who are 3-8 yd from the eventual catch point (the target at pass_arrived) at the
throw: their speed toward the catch point, their downfield speed, and the share moving away from it, over the
first 0.4 s of the ball's flight. Coverage: PFF pff_passCoverage (NFL drop-back passes, population.py) or the played call's
family (sim forced-grid plays from sim.ts).

  python3 -I flight.py <nfl plays.jsonl.gz> <bdb dir> <sim.jsonl.gz[,more]>
"""
import sys, os, json, gzip, math, csv, statistics as S, collections as C
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from population import nfl_population

NFL_COV = {'Cover-0': 'C0', 'Cover-1': 'C1', 'Cover-1 Double': 'C1', 'Cover-2': 'C2', '2-Man': '2-Man', 'Cover-3': 'C3',
           'Cover-3 Seam': 'C3', 'Cover-3 Cloud Left': 'C3', 'Cover-3 Cloud Right': 'C3', 'Cover-3 Double Cloud': 'C3',
           'Quarters': 'C4', 'Cover 6-Left': 'C6', 'Cover-6 Right': 'C6'}
SIM_COV = {'cover0': 'C0', 'cover1': 'C1', 'cover2man': '2-Man', 'cover2': 'C2', 'tampa2': 'C2', 'cover3': 'C3', 'cover4': 'C4', 'cover6': 'C6'}

def measure(paths, covof):
    R = C.defaultdict(list)
    for path in paths:
        for l in gzip.open(path, 'rt'):
            p = json.loads(l)
            if p.get('kind') != 'pass': continue
            cov = covof(p)
            if not cov: continue
            ev = p['events']; t = p.get('target'); thr = ev.get('pass_forward'); arr = ev.get('pass_arrived')
            if t is None or thr is None or arr is None: continue
            X = p['xy']; f0 = int(round(thr / 0.1)); f1 = min(len(X) - 1, int(round(arr / 0.1)))
            if f1 - f0 < 5: continue
            cp = (X[f1][2 * t], X[f1][2 * t + 1])
            for d, a in enumerate(p['players']):
                if a['side'] != 'D' or a['group'] == 'DL': continue
                P0 = (X[f0][2 * d], X[f0][2 * d + 1]); P4 = (X[f0 + 4][2 * d], X[f0 + 4][2 * d + 1])
                if not 3 <= math.dist(P0, cp) < 8: continue
                v = ((P4[0] - P0[0]) / 0.4, (P4[1] - P0[1]) / 0.4); u = (cp[0] - P0[0], cp[1] - P0[1])
                R[cov].append(((v[0] * u[0] + v[1] * u[1]) / math.hypot(*u), v[0]))
    return R

def main():
    nfl_path, bdb, sims = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
    plays = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{bdb}/plays.csv'))}
    pop, _ = nfl_population(bdb)  # drop-back passes: no play action, RPO, designed rollout or screen
    def nfl_cov(p):
        r = plays.get(p['id'])
        return None if not r or pop.get(tuple(p['id'].split('-'))) != 'keep' else NFL_COV.get(r['pff_passCoverage'])
    nfl = measure([nfl_path], nfl_cov)
    sim = measure(sims, lambda p: SIM_COV.get((p.get('matrix') or {}).get('playedFamily')))
    fm = lambda R: f"{len(R):6} | {S.mean(r[0] for r in R):5.2f} | {S.mean(r[1] for r in R):5.2f} | {sum(r[0] < 0 for r in R) / len(R):4.0%}" if R else '—'
    print('coverage | NFL n | toward the catch point (yd/s) | downfield | moving away || sim n | toward | downfield | moving away')
    for k in ('C0', 'C1', '2-Man', 'C2', 'C3', 'C4', 'C6'):
        print(f"{k:5} | {fm(nfl.get(k, []))} || {fm(sim.get(k, []))}")

if __name__ == '__main__':
    main()
