"""Call-mix diagnosis (docs/reviews/2026-11-11-call-mix.md): one row per NFL dropback, BDB 2025 weeks 1-9 (plays.csv + player_play.csv, no tracking).
python3 -I scripts/diag/call-mix/nfl_calls.py data/raw/bdb2025/big-data-bowl-data > out/call-mix/nfl.jsonl
Target route = routeRan of wasTargettedReceiver; rushers = wasInitialPassRusher count; coverage = pff_passCoverage."""
import csv, json, sys, collections
D = sys.argv[1]
T = lambda v: v in ('1', 'TRUE', 'True')
pp = collections.defaultdict(list)
for r in csv.DictReader(open(f'{D}/player_play.csv')): pp[(r['gameId'], r['playId'])].append(r)
FAM = {'Cover-3': 'cover3', 'Cover-3 Seam': 'cover3', 'Cover-3 Cloud Right': 'cover3', 'Cover-3 Cloud Left': 'cover3', 'Cover-3 Double Cloud': 'cover3',
       'Cover-1': 'cover1', 'Cover-1 Double': 'cover1', 'Cover-2': 'cover2', 'Quarters': 'cover4', 'Cover-6 Right': 'cover6', 'Cover 6-Left': 'cover6',
       'Cover-0': 'cover0', '2-Man': 'cover2man'}
for p in csv.DictReader(open(f'{D}/plays.csv')):
    if not T(p['isDropback']) or p['playNullifiedByPenalty'] == 'Y': continue
    if T(p['qbSpike']) or T(p['qbKneel']): continue
    rows = pp[(p['gameId'], p['playId'])]
    off = p['possessionTeam']
    tgt = next((r for r in rows if T(r['wasTargettedReceiver'])), None)
    routes = [r['routeRan'] for r in rows if T(r['wasRunningRoute']) and r['routeRan'] not in ('', 'NA')]
    def num(v):
        try: return float(v)
        except Exception: return None
    yac = num(tgt['yardageGainedAfterTheCatch']) if tgt else None
    print(json.dumps({'q': int(p['quarter']), 'down': int(p['down']), 'dist': int(p['yardsToGo']), 'clock': p['gameClock'],
        'cov': p['pff_passCoverage'], 'covFamily': FAM.get(p['pff_passCoverage'], 'other'), 'mz': p['pff_manZone'],
        'rushers': sum(T(r['wasInitialPassRusher']) for r in rows if r['teamAbbr'] != off),
        'res': p['passResult'], 'yards': num(p['yardsGained']), 'air': num(p['passLength']), 'yac': yac,
        'pa': T(p['playAction']), 'ttt': num(p['timeToThrow']), 'route': tgt['routeRan'] if tgt and tgt['routeRan'] not in ('', 'NA') else None,
        'routes': routes, 'game': p['gameId'], 'off': off}))
