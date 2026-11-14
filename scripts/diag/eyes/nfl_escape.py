"""The QB out of the pocket (BDB 2025, all 9 weeks, PFF labels): on non-designed dropbacks where he leaves the pocket
(dropbackType SCRAMBLE / SCRAMBLE_ROLLOUT_*), what it ends in (throw from outside, throwaway, run, sack), how long
from leaving the tackle box to the throw (timeToThrow - timeInTackleBox), where the throws go (air yards; toward his
escape side, middle, or back across, from the gamebook direction), how they do (completion, INT, YAC, EPA) against
in-pocket throws, and by quarterback. Throwaway = incompletion with no intended receiver in the gamebook text.
Run: python3 -I nfl_escape.py [datadir] [outdir]"""
import csv, sys, os, re, collections, json
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'out', 'eyes')
os.makedirs(OUT, exist_ok=True)
pos = {r['nflId']: (r['position'], r['displayName']) for r in csv.DictReader(open(f'{D}/players.csv'))}
P = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv'))
     if r['isDropback'] == 'TRUE' and r['qbSpike'] != 'TRUE' and r['dropbackType'] not in ('DESIGNED_RUN', 'NA', 'UNKNOWN')
     and r['playNullifiedByPenalty'] != 'Y'}
qb = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in P and pos.get(r['nflId'], ('',))[0] == 'QB' and k not in qb: qb[k] = pos[r['nflId']][1]
f = lambda v: float(v) if v not in ('NA', '') else None
def outcome(r):
    res = r['passResult']
    if res == 'S': return 'sack'
    if res == 'R': return 'run'
    if res == 'I' and not re.search(r'pass incomplete \w+ \w+ to ', r['playDescription']) and 'pass incomplete' in r['playDescription']: return 'throwaway'
    return 'throw'
def direction(r):
    m = re.search(r'pass (?:incomplete |intended )?(short|deep) (left|middle|right)', r['playDescription'])
    if not m: m = re.search(r'pass (short|deep) (left|middle|right)', r['playDescription'])
    return m.group(2) if m else None
recs = []
for k, r in P.items():
    kind = 'escape' if r['dropbackType'].startswith('SCRAMBLE') else 'designed rollout' if 'ROLLOUT' in r['dropbackType'] else 'pocket'
    side = 'right' if r['passLocationType'] == 'OUTSIDE_RIGHT' or r['dropbackType'].endswith('RIGHT') else 'left' if r['passLocationType'] == 'OUTSIDE_LEFT' or r['dropbackType'].endswith('LEFT') else None
    o = outcome(r); d = direction(r)
    rel = None if not (side and d) else 'toward' if d == side else 'middle' if d == 'middle' else 'back across'
    ttt, tib = f(r['timeToThrow']), f(r['timeInTackleBox'])
    recs.append(dict(kind=kind, pl=r['playAction'] == 'TRUE', out=o, res=r['passResult'], loc=r['passLocationType'], rel=rel, qb=qb.get(k),
                     ttt=ttt, tib=tib, after=(ttt - tib) if ttt is not None and tib is not None and ttt > tib + 0.05 else None,
                     air=f(r['passLength']), yds=f(r['yardsGained']), epa=f(r['expectedPointsAdded']), tts=f(r['timeToSack'])))
json.dump(recs, open(f'{OUT}/nfl_escape.json', 'w'))
def q(v, p=.5):
    v = sorted(x for x in v if x is not None)
    if not v: return float('nan')
    i = (len(v) - 1) * p; lo = int(i); return v[lo] + (v[min(lo + 1, len(v) - 1)] - v[lo]) * (i - lo)
pct = lambda a, b: f'{100*a/b:.0f}%' if b else '-'
mean = lambda v: (sum(x for x in v if x is not None) / max(1, sum(x is not None for x in v)))
L = []
N = len(recs); E = [x for x in recs if x['kind'] == 'escape']
L.append(f'Non-designed-run dropbacks {N} (spikes, nullified removed); escapes (PFF scramble dropback) {len(E)} = {pct(len(E), N)}; '
         f'designed rollouts {sum(x["kind"]=="designed rollout" for x in recs)}')
L += ['\n**1. What an escape ends in**', '| | n | throw | throwaway | run | sack |', '|---|---|---|---|---|---|']
for lab, rs in (('all escapes', E), ('no play action', [x for x in E if not x['pl']]), ('play action', [x for x in E if x['pl']])):
    c = collections.Counter(x['out'] for x in rs)
    L.append(f'| {lab} | {len(rs)} | ' + ' | '.join(pct(c[o], len(rs)) for o in ('throw', 'throwaway', 'run', 'sack')) + ' |')
L.append('Escapes ending in a pass attempt (throw + throwaway): ' + pct(sum(x['out'] in ('throw', 'throwaway') for x in E), len(E)))
T = [x for x in E if x['out'] in ('throw', 'throwaway')]
L += ['\n**2. Time** (s)', '| | p25 | p50 | p75 | n |', '|---|---|---|---|---|']
for lab, v in (('escape throws: time in the box', [x['tib'] for x in T]), ('escape throws: box exit to throw', [x['after'] for x in T]),
               ('escape throws: snap to throw', [x['ttt'] for x in T]), ('escape runs: time in the box', [x['tib'] for x in E if x['out'] == 'run']),
               ('escape sacks: snap to sack', [x['tts'] for x in E if x['out'] == 'sack']), ('pocket throws: snap to throw', [x['ttt'] for x in recs if x['kind'] == 'pocket' and x['out'] == 'throw'])):
    L.append(f'| {lab} | {q(v,.25):.2f} | {q(v):.2f} | {q(v,.75):.2f} | {sum(y is not None for y in v)} |')
L += ['\n**3. Where escape throws go and how they do** (targeted throws; throwaways excluded)',
      '| | n | share | air p50 | air mean | comp | INT | YAC (comp) | yds/att | EPA/att |', '|---|---|---|---|---|---|---|---|---|---|']
def trow(lab, rs, base):
    c = [x for x in rs if x['res'] == 'C']
    return (f'| {lab} | {len(rs)} | {pct(len(rs), base)} | {q([x["air"] for x in rs]):.0f} | {mean([x["air"] for x in rs]):.1f} | {pct(len(c), len(rs))} | '
            f'{pct(sum(x["res"]=="IN" for x in rs), len(rs))} | {mean([x["yds"]-x["air"] for x in c if x["air"] is not None]):.1f} | {mean([x["yds"] for x in rs]):.1f} | {mean([x["epa"] for x in rs]):+.2f} |')
ET = [x for x in E if x['out'] == 'throw']
L.append(trow('escape: all', ET, len(ET)))
for rel in ('toward', 'middle', 'back across'): L.append(trow(f'escape: {rel}', [x for x in ET if x['rel'] == rel], len(ET)))
for b, (lo, hi) in (('air < 0', (-99, 0)), ('0-9', (0, 10)), ('10-19', (10, 20)), ('20+', (20, 99))):
    L.append(trow(f'escape: air {b}', [x for x in ET if x['air'] is not None and lo <= x['air'] < hi], len(ET)))
PT = [x for x in recs if x['kind'] == 'pocket' and x['out'] == 'throw' and x['loc'] == 'INSIDE_BOX']
L.append(trow('pocket throws (inside box)', PT, len(PT)))
L.append(trow('designed rollout throws', [x for x in recs if x['kind'] == 'designed rollout' and x['out'] == 'throw'], 1))
L.append(trow('pocket dropback, thrown from outside the box', [x for x in recs if x['kind'] == 'pocket' and x['out'] == 'throw' and x['loc'].startswith('OUTSIDE')], 1))
L.append(f"\nEscape runs: yds p50 {q([x['yds'] for x in E if x['out']=='run']):.0f}, mean {mean([x['yds'] for x in E if x['out']=='run']):.1f}, EPA {mean([x['epa'] for x in E if x['out']=='run']):+.2f}; "
         f"escape sacks EPA {mean([x['epa'] for x in E if x['out']=='sack']):+.2f}; escape throwaways EPA {mean([x['epa'] for x in E if x['out']=='throwaway']):+.2f}")
# by QB
L += ['\n**4. By quarterback** (>= 25 escapes)', '| QB | dropbacks | escape rate | throw | throwaway | run | sack | box exit to throw p50 | comp (escape throws) | air p50 |', '|---|---|---|---|---|---|---|---|---|---|']
byq = collections.defaultdict(list)
for x in recs: byq[x['qb']].append(x)
rows = []
for name, rs in byq.items():
    e = [x for x in rs if x['kind'] == 'escape']
    if len(e) < 25: continue
    c = collections.Counter(x['out'] for x in e); t = [x for x in e if x['out'] == 'throw']
    rows.append((c['throw'] / len(e), f"| {name} | {len(rs)} | {pct(len(e), len(rs))} | " + ' | '.join(pct(c[o], len(e)) for o in ('throw', 'throwaway', 'run', 'sack')) +
                f" | {q([x['after'] for x in t]):.2f} | {pct(sum(x['res']=='C' for x in t), len(t))} | {q([x['air'] for x in t]):.0f} |"))
L += [r for _, r in sorted(rows, reverse=True)]
open(f'{OUT}/nfl_escape.md', 'w').write('\n'.join(L) + '\n'); print('\n'.join(L))
