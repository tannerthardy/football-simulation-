"""Man-coverage DBs on deep passes, in flight (BDB 2027, read in place from the archive zip; the tracked draft cohort
only, not all-22, so this is every tracked man DB on the play, not the target's defender). Plays: pass_length >= 20
(air yards), pass_result C / I / IN, not nullified. Players: coverage_assignment MAN, nfl_position CB / S / SS / FS /
DB. From the tracking (10 Hz, through the play): his speed at pass_forward and at pass_arrived, the change between,
and how far his body orientation (o) turns over the flight; flight time. Split by flight time.
usage: python3 -I scripts/diag/pass-operators/bdb27_deep_db.py ARCHIVE.zip"""
import sys, csv, io, zipfile, collections as C
z = zipfile.ZipFile(sys.argv[1]); D = 'nfl-big-data-bowl-2027/'
rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(D + n), encoding='utf-8'))
pos = {r['nfl_id']: r['nfl_position'] for r in rd('players.csv')}
want = {}
for r in rd('player_play.csv'):
    try: L = float(r['pass_length'])
    except ValueError: continue
    if L >= 20 and r['pass_result'] in ('C', 'I', 'IN') and r['play_nullified_by_penalty'] != 'Y' and r['coverage_assignment'] == 'MAN' and pos.get(r['nfl_id']) in ('CB', 'S', 'SS', 'FS', 'DB'):
        want[(r['game_id'], r['play_id'], r['nfl_id'])] = r['pass_result']
print(f'{len(want)} man DB rows on deep passes', file=sys.stderr)
plays = {(g, p) for g, p, _ in want}
fr = C.defaultdict(dict); evf = C.defaultdict(dict)
for season in (2023, 2024, 2025):
    for r in rd(f'game_tracking_{season}.csv'):
        k = (r['game_id'], r['play_id'])
        if k not in plays: continue
        t = r['time']
        if r['event'] in ('pass_forward', 'pass_arrived') and r['event'] not in evf[k]: evf[k][r['event']] = t
        if (k[0], k[1], r['nfl_id']) in want: fr[(k[0], k[1], r['nfl_id'])][t] = (float(r['s']) if r['s'] not in ('NA', '') else None, float(r['o']) if r['o'] not in ('NA', '') else None)
    print(f'season {season} read', file=sys.stderr)
from datetime import datetime
ts = lambda s: datetime.fromisoformat(s.replace('Z', ''))
rows = []
for key, res in want.items():
    k = key[:2]; e = evf.get(k, {})
    if 'pass_forward' not in e or 'pass_arrived' not in e or key not in fr: continue
    a, b = fr[key].get(e['pass_forward']), fr[key].get(e['pass_arrived'])
    if not a or not b or a[0] is None or b[0] is None: continue
    fl = (ts(e['pass_arrived']) - ts(e['pass_forward'])).total_seconds()
    turn = abs((b[1] - a[1] + 180) % 360 - 180) if a[1] is not None and b[1] is not None else None
    rows.append(dict(s0=a[0], s1=b[0], fl=fl, turn=turn, res=res))
q = lambda v: '/'.join(f'{sorted(v)[int(f * (len(v) - 1))]:.1f}' for f in (.25, .5, .75)) if len(v) >= 5 else '-'
print(f'== BDB 2027 man DBs (tracked cohort) on deep passes (20+ air yards): n {len(rows)}')
for lo, hi in ((0, 1.8), (1.8, 2.4), (2.4, 9)):
    V = [r for r in rows if lo <= r['fl'] < hi]
    if V: print(f'   flight {lo}-{hi if hi < 9 else "+"} s n {len(V):4d} | speed at the release {q([r["s0"] for r in V])} yd/s -> at the arrival {q([r["s1"] for r in V])} | gain {q([r["s1"] - r["s0"] for r in V])} | body turns {q([r["turn"] for r in V if r["turn"] is not None])} deg over the flight')
