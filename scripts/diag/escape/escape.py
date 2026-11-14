"""The QB out of the pocket, one operator for NFL tracking and sim exports (common play format).

usage: python3 -I scripts/diag/escape/escape.py <plays.jsonl.gz> [--plays-csv data/.../plays.csv]

Dropbacks, designed rollouts/boots excluded (NFL: PFF dropbackType; sim: concept name). He has LEFT THE POCKET at the
first frame from 0.3 s to the throw (or the end) at which, behind the line (x < 0), he is outside the tackles' snap
width (|y - ball_y| > max tackle |y - ball_y| at the snap + 0.5 yd) or more than 2.5 yd laterally off his snap y.
Outcome: a forward pass (throw; throwaway from the label: NFL gamebook text without a receiver, sim's own call), else a
run if he crosses the line, else a sack/other. Throw quality: target's x at the arrival (air proxy, same on both),
completion (catch event), INT (NFL passResult IN; sim label), toward his escape side or back across. With --plays-csv
the NFL rows also print the agreement with PFF's scramble label.
"""
import sys, os, json, gzip, math, re, csv, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
def held_end(raw, p, qb, kend):
    """Last frame the QB can still have the ball on a play with no forward pass: the frame before the ball's track
    (sim exports' `bxy`) is first more than 2.5 yd from him (a strip, a fumble, a lateral). Without it a strip-sack's
    return is read as the QB running (he is chasing the returner). NFL files carry no ball track or fumble event."""
    b = raw.get('bxy')
    if not b or raw['events'].get('pass_forward') is not None: return kend
    for k in range(min(kend, len(b) - 1) + 1):
        x, y = p.pos(qb, k); bb = b[k]
        if x is None or not bb or bb[0] is None: continue
        if math.hypot(bb[0] - x, bb[1] - y) > 2.5: return max(0, k - 1)
    return kend
  # noqa
args = sys.argv[1:]; pcsv = None
if '--plays-csv' in args: i = args.index('--plays-csv'); pcsv = args[i + 1]; del args[i:i + 2]
PFF = {}
if pcsv:
    for r in csv.DictReader(open(pcsv)): PFF[f"{r['gameId']}-{r['playId']}"] = r
def q(v, p=.5):
    v = sorted(x for x in v if x is not None)
    if not v: return float('nan')
    i = (len(v) - 1) * p; lo = int(i); return v[lo] + (v[min(lo + 1, len(v) - 1)] - v[lo]) * (i - lo)
pct = lambda a, b: f'{100*a/b:.0f}%' if b else '-'
mean = lambda v: sum(x for x in v if x is not None) / max(1, sum(x is not None for x in v))
DESIGNED = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket', re.I)
for path in args:
    R = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        pf = PFF.get(raw['id'])
        if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
        if raw.get('source') == 'sim' and DESIGNED.search(str((raw.get('cell') or {}).get('concept') or '')): continue
        p = Play(raw); qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]; ev = raw['events']; by = raw['ball_y']
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5 or p.pos(qb, 0)[0] is None: continue
        width = max(abs(p.pos(o, 0)[1] - by) for o in OL) + 0.5
        y0 = p.pos(qb, 0)[1]
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        kend = held_end(raw, p, qb, kend)
        out_k = None; side = 0; crossed = False
        for k in range(p.k(0.3), kend + 1):
            x, y = p.pos(qb, k)
            if x is None: break
            if x > 0: crossed = True; break
            if abs(y - by) > width or abs(y - y0) > 2.5:
                out_k = k; side = 1 if (y - y0) > 0 else -1; break
        if fw is None:
            crossed = crossed or any(p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0 for k in range(kend + 1))
        lab = raw.get('labels') or {}
        if fw is not None:
            if pf is not None: away = pf['passResult'] == 'I' and 'pass incomplete' in pf['playDescription'] and not re.search(r'pass incomplete \w+ \w+ to ', pf['playDescription'])
            else: away = bool(lab.get('throwaway'))
            out = 'throwaway' if away else 'throw'
        else: out = 'run' if crossed else 'sack/other'
        t = raw.get('target'); air = rel = None
        if out == 'throw' and t is not None:
            ka = p.k(ev.get('pass_arrived', ev.get('end')))
            tx, ty = p.pos(t, min(ka, p.frames - 1))
            if tx is not None:
                air = tx
                if side: d = ty - p.pos(qb, p.k(fw))[1]; rel = 'toward' if d * side > 3 else 'back across' if d * side < -3 else 'middle'
        intc = (pf['passResult'] == 'IN') if pf is not None else bool(lab.get('interception'))
        R.append(dict(esc=out_k is not None, t_out=out_k * p.dt if out_k is not None else None, out=out, fw=fw,
                      after=(fw - out_k * p.dt) if (fw is not None and out_k is not None) else None, air=air, rel=rel,
                      comp='catch' in ev, intc=intc, yds=raw.get('yards'),
                      pff=(pf['dropbackType'].startswith('SCRAMBLE') if pf is not None else None)))
    E = [r for r in R if r['esc']]
    print(f'== {os.path.basename(path)}: dropbacks {len(R)}, left the pocket {len(E)} = {pct(len(E), len(R))}')
    if R and R[0]['pff'] is not None:
        tp = sum(r['esc'] and r['pff'] for r in R); P_ = sum(r['pff'] for r in R)
        print(f'   vs PFF scramble label: label {P_}, caught {pct(tp, P_)}; of ours flagged, labelled {pct(tp, len(E))}')
    c = collections.Counter(r['out'] for r in E)
    print('   after leaving: ' + ', '.join(f'{o} {pct(c[o], len(E))}' for o in ('throw', 'throwaway', 'run', 'sack/other')) +
          f" | left at p25/50/75 {q([r['t_out'] for r in E],.25):.1f}/{q([r['t_out'] for r in E]):.1f}/{q([r['t_out'] for r in E],.75):.1f} s")
    T = [r for r in E if r['out'] in ('throw', 'throwaway')]
    print(f"   leaving to the pass p25/50/75 {q([r['after'] for r in T],.25):.2f}/{q([r['after'] for r in T]):.2f}/{q([r['after'] for r in T],.75):.2f} s (n {len(T)})")
    for lab, rs in (('escape throws', [r for r in E if r['out'] == 'throw']), ('  toward', [r for r in E if r['rel'] == 'toward']),
                    ('  middle', [r for r in E if r['rel'] == 'middle']), ('  back across', [r for r in E if r['rel'] == 'back across']),
                    ('in-pocket throws', [r for r in R if not r['esc'] and r['out'] == 'throw'])):
        print(f"   {lab:16s} n {len(rs):5d} | air p50 {q([r['air'] for r in rs]):5.1f} | comp {pct(sum(r['comp'] for r in rs), len(rs)):>4s} | INT {pct(sum(r['intc'] for r in rs), len(rs)):>3s} | yds/att {mean([r['yds'] for r in rs]):.1f}")
    runs = [r for r in E if r['out'] == 'run']
    print(f"   escape runs yds p50 {q([r['yds'] for r in runs]):.0f} mean {mean([r['yds'] for r in runs]):.1f}; all runs by the QB on dropbacks {pct(sum(r['out']=='run' for r in R), len(R))}; sacks {pct(sum(r['out']=='sack/other' for r in R), len(R))}")
