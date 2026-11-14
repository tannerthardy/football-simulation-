"""QB lane, 2026-11-14: why we throw fewer balls under 2.0 s than the NFL (12% against 20%). Splits it into what is
thrown and how fast. Targeted throws on non-designed dropbacks, NFL tracking and sim exports, same code.
Depth is where the target is at the ball's arrival, past the line (the air proxy escape.py uses). Rows per depth bin:
its share of throws, the release time p25/50/75, and the share released under 2.0 s. If the bins' shares match and
ours are slower inside a bin, it is his release; if the shares differ, it is the menu. Also by gun / under center.
usage: python3 -I quick-split.py --plays-csv plays.csv name=a.jsonl.gz,..."""
import sys, os, gzip, json, csv, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
def q(v, p=.5):
    v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket', re.I)
BINS = (('behind the line', -99, 0), ('0-5 yd', 0, 5), ('5-10', 5, 10), ('10-20', 10, 20), ('20+', 20, 999))
for arg in args:
    name, paths = arg.split('=', 1); R = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
            if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            ev = raw['events']; fw = ev.get('pass_forward'); t = raw.get('target'); lab = raw.get('labels') or {}
            if fw is None or t is None or lab.get('throwaway'): continue
            p = Play(raw); qbs = p.who('O', 'QB')
            if not qbs or p.pos(qbs[0], 0)[0] is None: continue
            ka = min(p.frames - 1, p.k(ev.get('pass_arrived', ev.get('end')))); x, ty = p.pos(t, ka)
            if x is None: continue
            R.append((fw, x, 'gun' if p.pos(qbs[0], 0)[0] < -3 else 'under', bool(pf and pf.get('playAction') == 'TRUE') if pf is not None else bool(re.search(r'^pa_|\+pa$', str((raw.get('cell') or {}).get('concept') or ''))),
                      p.players[t].get('group') or p.players[t].get('pos') or '?', abs(ty - raw['ball_y']), bool(pf is not None and pf.get('pff_runPassOption') == '1')))
    n = len(R); print(f"== {name}: targeted throws {n}; under 2.0 s {100 * sum(r[0] < 2 for r in R) / max(1, n):.0f}%; release p25/50/75 {q([r[0] for r in R], .25):.2f}/{q([r[0] for r in R]):.2f}/{q([r[0] for r in R], .75):.2f}")
    for lab, lo, hi in BINS:
        S = [r for r in R if lo <= r[1] < hi]
        if S: print(f"   {lab:16s} {100 * len(S) / n:4.0f}% of throws | release p25/50/75 {q([r[0] for r in S], .25):.2f}/{q([r[0] for r in S]):.2f}/{q([r[0] for r in S], .75):.2f} s | under 2.0 s {100 * sum(r[0] < 2 for r in S) / len(S):.0f}% | these are {100 * sum(r[0] < 2 for r in S) / max(1, sum(r[0] < 2 for r in R)):.0f}% of all the quick throws")
    for a in ('gun', 'under'):
        S = [r for r in R if r[2] == a]
        if S: print(f"   {a:16s} {100 * len(S) / n:4.0f}% of throws | release p25/50/75 {q([r[0] for r in S], .25):.2f}/{q([r[0] for r in S]):.2f}/{q([r[0] for r in S], .75):.2f} s | under 2.0 s {100 * sum(r[0] < 2 for r in S) / len(S):.0f}%")
    S = [r for r in R if r[3]]
    print(f"   play action      {100 * len(S) / max(1, n):4.0f}% of throws | release p50 {q([r[0] for r in S]):.2f} s")
    # The behind-the-line bin, split: who it goes to and how wide (receiver screens and RPO throws against the back).
    S = [r for r in R if r[1] < 0]
    if S:
        m = len(S); print(f"   behind the line, n {m}:")
        for g in sorted({r[4] for r in S}, key=lambda g: -sum(r[4] == g for r in S))[:4]:
            G = [r for r in S if r[4] == g]; print(f"      to {g:3s} {100 * len(G) / m:3.0f}% | release p25/50/75 {q([r[0] for r in G], .25):.2f}/{q([r[0] for r in G]):.2f}/{q([r[0] for r in G], .75):.2f} s")
        for lab, lo, hi in (('within 8 yd of the ball', 0, 8), ('8-16 yd wide', 8, 16), ('16+ yd wide', 16, 99)):
            G = [r for r in S if lo <= r[5] < hi]
            if G: print(f"      {lab:24s} {100 * len(G) / m:3.0f}% | release p50 {q([r[0] for r in G]):.2f} s")
        G = [r for r in S if r[6]]
        print(f"      RPO-tagged (NFL only)    {100 * len(G) / m:3.0f}%" + (f" | release p50 {q([r[0] for r in G]):.2f} s" if G else ''))
