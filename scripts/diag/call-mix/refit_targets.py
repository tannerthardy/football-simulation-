"""CALL_MIX refit targets (prep; no fit). Per down-and-distance bucket, the NFL shares the next refit adds to fit.py's
five route classes. Report only.

  python3 -I scripts/diag/call-mix/refit_targets.py data/raw/bdb2025/big-data-bowl-data out/call-mix/nfl_routes_w1-6.jsonl \
      [--sim out/call-mix/plays.jsonl[,more.jsonl] out/call-mix/profiles.json]

The sim side (collect.ts rows, profiles.ts route classes) is the same table from the call as made: gun or under center
from the formation, play action from the concept's drop ('pa', 'boot'), the drop bin from the called set's
displacement (dropSpec; BDB's is achieved), routes by installed class. Its cross split is by route id (shallow 5 yd,
shallow_high 6, cross 14), shown as three columns: shallow_high sits on the NFL cut.

Rows (BDB 2025 weeks 1-9 plays.csv / player_play.csv; route depths from nfl_route_depth.py, weeks given there):
  screen   share of dropbacks on which any receiver's routeRan is SCREEN (the call, decoys and play-action screens
           included), and 'screen tgt' those on which the targeted receiver ran it (the screen thrown).
  rpo      share of all called offensive plays (dropbacks + designed runs) PFF marks pff_runPassOption = 1, and the
           share of those that end as a dropback (the throw or the pull) vs a handoff.
  uc       share of dropbacks from under center (SINGLEBACK, I_FORM, JUMBO); 'uc quick' those with the ball out
           (timeToThrow) under 2.0 s and no play action.
  drop     dropbackDistance class on TRADITIONAL, non-play-action dropbacks, gun and under center separately:
           < 3.5 yd, 3.5-5, 5-7, 7+. BDB's dropbackDistance is the QB's displacement from where he took the snap
           (gun median 2.9 yd, under center 4.2 on weeks 1-9), not depth behind the line, so the same bin is a
           different drop from the gun and under center: read them separately, never pooled.
  class    routes run, fit.py's classes, with cross split at 6 yd of depth (shallow < 6, deep 6+). Depth is the
           runner's deepest point before the throw or 3.0 s: an early throw truncates a deep cross, so the split is
           an upper bound on the shallow share; read it with the thrown=false rows beside it.
Buckets as fit.py: 1st; 2nd and 3rd/4th, short 1-3, medium 4-7, long 8+."""
import csv, json, sys, collections
A = sys.argv[1:]; SIM = None
if '--sim' in A: i = A.index('--sim'); SIM = (A[i + 1], A[i + 2]); del A[i:i + 3]
D, RJ = A[0], A[1]
T = lambda v: v in ('1', 'TRUE', 'True')
BUCKETS = ['1st', '2nd_short', '2nd_med', '2nd_long', '3rd_short', '3rd_med', '3rd_long']
def bucket(down, dist):
    down, dist = int(down), int(dist)
    if down <= 1: return '1st'
    return f"{'2nd' if down == 2 else '3rd'}_{'short' if dist <= 3 else 'med' if dist <= 7 else 'long'}"
UC = {'SINGLEBACK', 'I_FORM', 'JUMBO'}
screen, screen_tgt = set(), set()
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] == 'SCREEN':
        screen.add((r['gameId'], r['playId']))
        if r['wasTargettedReceiver'] == '1': screen_tgt.add((r['gameId'], r['playId']))
C = collections.defaultdict(collections.Counter)
for p in csv.DictReader(open(f'{D}/plays.csv')):
    if p['playNullifiedByPenalty'] == 'Y' or T(p['qbSpike']) or T(p['qbKneel']) or T(p['qbSneak']): continue
    b = bucket(p['down'], p['yardsToGo']); k = (p['gameId'], p['playId']); c = C[b]; db = T(p['isDropback'])
    c['plays'] += 1
    if p['pff_runPassOption'] == '1': c['rpo'] += 1; c['rpo_db'] += db
    if not db: continue
    c['db'] += 1; c['screen'] += k in screen; c['screen_tgt'] += k in screen_tgt
    uc = p['offenseFormation'] in UC; pa = T(p['playAction'])
    c['uc'] += uc
    try: ttt = float(p['timeToThrow'])
    except ValueError: ttt = None
    if uc and not pa and ttt is not None and ttt < 2.0: c['uc_quick'] += 1
    if p['dropbackType'] == 'TRADITIONAL' and not pa and k not in screen:
        try: dd = float(p['dropbackDistance'])
        except ValueError: continue
        g = 'uc' if uc else 'gun'
        c[f'{g}_n'] += 1
        c[f"{g}_{'q' if dd < 3.5 else '3' if dd < 5 else '5' if dd < 7 else '7'}"] += 1
R = collections.defaultdict(collections.Counter)
def rclass(label, depth):
    if label in ('HITCH', 'OUT', 'IN'): return 'quick' if depth < 8 else 'breaking'
    if label == 'SLANT': return 'quick'
    if label in ('FLAT', 'ANGLE'): return 'flat'
    if label == 'CROSS': return 'cross_shallow' if depth < 6 else 'cross_deep'
    if label == 'SCREEN': return 'screen'
    return 'vertical'
for l in open(RJ):
    r = json.loads(l)
    if r.get('pa'): continue
    b = bucket(r['down'], r['dist']); k = rclass(r['label'], r['depth'])
    R[b]['n'] += 1; R[b][k] += 1
    if k.startswith('cross') and not r.get('thrown'): R[b][k + '_late'] += 1
pc = lambda a, n: f"{100 * a / n:5.1f}" if n else '  -  '
print('bucket     plays   db  screen%  tgt%  rpo%  rpo->db%  uc%  uc_quick%   gun: n  <3.5  3.5-5  5-7  7+    uc: n  <3.5  3.5-5  5-7  7+')
for b in BUCKETS + ['all']:
    c = sum(C.values(), collections.Counter()) if b == 'all' else C[b]
    print(f"{b:10s} {c['plays']:5d} {c['db']:5d}  {pc(c['screen'], c['db'])} {pc(c['screen_tgt'], c['db'])}  {pc(c['rpo'], c['plays'])}  {pc(c['rpo_db'], c['rpo'])}  "
          f"{pc(c['uc'], c['db'])}  {pc(c['uc_quick'], c['db'])}   {c['gun_n']:6d} " + ' '.join(pc(c[f'gun_{x}'], c['gun_n']) for x in 'q357') +
          f"   {c['uc_n']:5d} " + ' '.join(pc(c[f'uc_{x}'], c['uc_n']) for x in 'q357'))
KS = ['quick', 'flat', 'cross_shallow', 'cross_deep', 'breaking', 'vertical', 'screen']
print('\nroutes run, no play action (% of routes)\nbucket       n   ' + '  '.join(f'{k:>13s}' for k in KS) + '   deep share of crosses')
for b in BUCKETS + ['all']:
    r = sum(R.values(), collections.Counter()) if b == 'all' else R[b]; n = r['n']
    xc = r['cross_shallow'] + r['cross_deep']
    print(f"{b:10s} {n:5d}   " + '  '.join(f"{pc(r[k], n):>13s}" for k in KS) + f"   {pc(r['cross_deep'], xc)}")

if SIM:
    rows = [json.loads(l) for p in SIM[0].split(',') for l in open(p)]
    cls = json.load(open(SIM[1]))['routes']
    SCREENS = {'slip_screen', 'te_screen', 'bubble', 'now_screen', 'tunnel'}
    C = collections.defaultdict(collections.Counter); R = collections.defaultdict(collections.Counter)
    for r in rows:
        if r.get('rec') not in ('play', 'run'): continue
        b = bucket(max(1, r['down']), max(1, round(r['dist']))); c = C[b]; c['plays'] += 1
        if r.get('rpo'): c['rpo'] += 1; c['rpo_db'] += r['rec'] == 'play'
        if r['rec'] != 'play': continue
        c['db'] += 1
        ids = [x['route'] for x in r['routes']]; scr = any(i in SCREENS for i in ids)
        tr = (r.get('target') or {}).get('route')
        c['screen'] += scr; c['screen_tgt'] += tr in SCREENS
        uc = not r.get('gun', True); pa = r.get('drop') in ('pa', 'boot')
        c['uc'] += uc
        if uc and not pa and r.get('ttt') is not None and r['ttt'] < 2.0: c['uc_quick'] += 1
        if not pa and not scr and not r.get('scramble') and r.get('set') is not None:
            g = 'uc' if uc else 'gun'; dd = r['set']; c[f'{g}_n'] += 1
            c[f"{g}_{'q' if dd < 3.5 else '3' if dd < 5 else '5' if dd < 7 else '7'}"] += 1
        if pa: continue
        for i in ids:
            if i in ('block',) or i is None: continue
            i = i.rstrip('*'); k = 'screen' if i in SCREENS else {'shallow': 'cross_shallow', 'shallow_high': 'cross_high', 'cross': 'cross_deep'}.get(i) or cls.get(i)
            if k: R[b]['n'] += 1; R[b][k] += 1
    print('\n==== sim (the call as made) ====')
    print('bucket     plays   db  screen%  tgt%  rpo%  rpo->db%  uc%  uc_quick%   gun: n  <3.5  3.5-5  5-7  7+    uc: n  <3.5  3.5-5  5-7  7+')
    for b in BUCKETS + ['all']:
        c = sum(C.values(), collections.Counter()) if b == 'all' else C[b]
        print(f"{b:10s} {c['plays']:5d} {c['db']:5d}  {pc(c['screen'], c['db'])} {pc(c['screen_tgt'], c['db'])}  {pc(c['rpo'], c['plays'])}  {pc(c['rpo_db'], c['rpo'])}  "
              f"{pc(c['uc'], c['db'])}  {pc(c['uc_quick'], c['db'])}   {c['gun_n']:6d} " + ' '.join(pc(c[f'gun_{x}'], c['gun_n']) for x in 'q357') +
              f"   {c['uc_n']:5d} " + ' '.join(pc(c[f'uc_{x}'], c['uc_n']) for x in 'q357'))
    KS2 = ['quick', 'flat', 'cross_shallow', 'cross_high', 'cross_deep', 'breaking', 'vertical', 'screen']
    print('\nroutes run, no play action (% of routes)\nbucket       n   ' + '  '.join(f'{k:>13s}' for k in KS2) + '   cross (deep) share of crosses')
    for b in BUCKETS + ['all']:
        r = sum(R.values(), collections.Counter()) if b == 'all' else R[b]; n = r['n']
        xc = r['cross_shallow'] + r['cross_high'] + r['cross_deep']
        print(f"{b:10s} {n:5d}   " + '  '.join(f"{pc(r[k], n):>13s}" for k in KS2) + f"   {pc(r['cross_deep'], xc)}")
