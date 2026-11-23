"""QB lane, 2026-11-23 (Rules' stop-route timing, through Integration): when the ball leaves against the targeted
receiver's break, NFL against ours, one operator on the mechanics exports (BDB 2025 out/mechanics/nfl-plays.jsonl.gz
with player_play.csv for routeRan and the target; sim exports, the route id on each player). Thrown passes to a
receiver on a route, by route family:
  stop     NFL HITCH;           ours hitch, quick_hitch, hook, curl, comeback, stick
  out      NFL OUT, CORNER;     ours quick_out, out, corner, back_out
  in       NFL IN, SLANT, POST; ours dig, slant, short_in, post
  cross    NFL CROSS;           ours cross, shallow, shallow_high, mesh_under
  vertical NFL GO;              ours go, seam (no break: release time and speed at arrival only)
The break, the same both sides, on the receiver's 10 Hz track from the snap to the ball's arrival (+0.3 s):
  stop: his plant, the first frame after his peak speed that he is below half of it;
  out / in / cross: the frame of his sharpest turn (heading change over +-0.2 s, moving faster than 2 yd/s both sides).
Reported: release minus break (s; negative = thrown before the break), the share thrown before it, time to throw, air
yards, the receiver's speed at the ball's arrival and the share under 1 yd/s.
usage: python3 -I release_vs_break.py name=a.jsonl.gz,... [--player-play player_play.csv]"""
import sys, os, json, gzip, csv, math
args = sys.argv[1:]; PP = {}
if '--player-play' in args:
    i = args.index('--player-play')
    for r in csv.DictReader(open(args[i + 1])):
        if r['wasTargettedReceiver'] == '1': PP[f"{r['gameId']}-{r['playId']}"] = (r['nflId'], r['routeRan'])
    del args[i:i + 2]
NFL = {'HITCH': 'stop', 'OUT': 'out', 'CORNER': 'out', 'IN': 'in', 'SLANT': 'in', 'POST': 'in', 'CROSS': 'cross', 'GO': 'vertical'}
SIM = {'hitch': 'stop', 'quick_hitch': 'stop', 'hook': 'stop', 'curl': 'stop', 'comeback': 'stop', 'stick': 'stop',
       'quick_out': 'out', 'out': 'out', 'corner': 'out', 'back_out': 'out', 'dig': 'in', 'slant': 'in', 'short_in': 'in',
       'post': 'in', 'cross': 'cross', 'shallow': 'cross', 'shallow_high': 'cross', 'mesh_under': 'cross', 'go': 'vertical', 'seam': 'vertical'}
q = lambda v, p=.5: (sorted(v)[int(p * (len(v) - 1))] if v else float('nan'))


def one(raw, idx, fam):
    ev = raw['events']; fw = ev.get('pass_forward')
    arr = ev.get('pass_arrived') or ev.get('pass_outcome_caught') or ev.get('pass_outcome_incomplete') or ev.get('end')
    if fw is None or arr is None or arr <= fw: return None
    dt = raw['dt']; xy = raw['xy']; ka = min(len(xy) - 1, int(round(arr / dt))); kr = int(round(fw / dt))
    kend = min(len(xy) - 1, ka + int(round(.3 / dt)))
    P = [(xy[k][2 * idx], xy[k][2 * idx + 1]) for k in range(kend + 1)]
    if any(p[0] is None for p in P) or kend < 8: return None
    def vel(k):
        a, b = max(k - 1, 0), min(k + 1, kend)
        return ((P[b][0] - P[a][0]) / ((b - a) * dt), (P[b][1] - P[a][1]) / ((b - a) * dt))
    sp = [math.hypot(*vel(k)) for k in range(kend + 1)]
    row = {'fam': fam, 'rel': kr * dt, 'vArr': sp[ka], 'air': None, 'brk': None}
    los = 0.0
    row['air'] = P[ka][0] - los
    k0 = int(round(.3 / dt))
    if fam == 'stop':
        kp = max(range(k0, ka + 1), key=lambda k: sp[k])
        kb = next((k for k in range(kp + 1, kend + 1) if sp[k] < .5 * sp[kp]), None)
        if kb is not None: row['brk'] = kb * dt
    elif fam in ('out', 'in', 'cross'):
        w = max(1, int(round(.2 / dt))); best, kb = 0.0, None
        for k in range(max(k0, w), kend - w + 1):
            if sp[k - w] < 2 or sp[k + w] < 2: continue
            h1 = math.atan2(*reversed(vel(k - w))); h2 = math.atan2(*reversed(vel(k + w)))
            d = abs((h2 - h1 + math.pi) % (2 * math.pi) - math.pi)
            if d > best: best, kb = d, k
        if kb is not None and best > math.radians(25): row['brk'] = kb * dt
    return row


for arg in args:
    name, paths = arg.split('=', 1); rows = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy') or raw['events'].get('pass_forward') is None: continue
            if raw.get('source') == 'sim':
                if (raw.get('labels') or {}).get('throwaway') or raw.get('target') is None: continue
                rid = str(raw['players'][raw['target']].get('route') or '').split(':')[-1]; fam = SIM.get(rid); idx = raw['target']
            else:
                t = PP.get(raw['id'])
                if not t: continue
                fam = NFL.get(t[1]); idx = next((i for i, p in enumerate(raw['players']) if str(p.get('id')) == t[0]), None)
            if not fam or idx is None: continue
            r = one(raw, idx, fam)
            if r: rows.append(r)
    print(f"== {name} (targeted, thrown: {len(rows)})")
    for fam in ('stop', 'out', 'in', 'cross', 'vertical'):
        R = [r for r in rows if r['fam'] == fam]
        if not R: continue
        B = [r for r in R if r['brk'] is not None]; d = [r['rel'] - r['brk'] for r in B]
        print(f"  {fam:8s} n {len(R):5d} (break found {len(B)}) | release - break p25/50/75 {q(d, .25):+.2f}/{q(d):+.2f}/{q(d, .75):+.2f} s, before the break {sum(x < 0 for x in d) / max(1, len(d)):.0%}"
              f" | release p50 {q([r['rel'] for r in R]):.2f} s, break p50 {q([r['brk'] for r in B]):.2f} | receiver at arrival p50 {q([r['vArr'] for r in R]):.1f} yd/s, under 1: {sum(r['vArr'] < 1 for r in R) / len(R):.0%}")
