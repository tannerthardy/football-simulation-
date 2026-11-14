"""QB lane, 2026-11-14: completion and interception rate by when the ball is released. NFL tracking and sim exports,
non-designed dropbacks, targeted throws (throw-aways out). NFL result from plays.csv passResult; sim from the export's
catch event and labels. An outcome, not an inferred category.
usage: python3 -I completion-by-time.py --plays-csv plays.csv name=a.jsonl.gz,b.jsonl.gz ..."""
import sys, gzip, json, csv, re
args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
EDGES = (2.0, 2.5, 3.0, 3.5, 4.0)
for arg in args:
    name, paths = arg.split('=', 1); B = [[0, 0, 0] for _ in range(len(EDGES) + 1)]
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass': continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
            if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            ev = raw['events']; fw = ev.get('pass_forward'); lab = raw.get('labels') or {}
            if fw is None: continue
            if pf is not None:
                if pf['passResult'] not in ('C', 'I', 'IN'): continue
                if pf['passResult'] == 'I' and not re.search(r'pass incomplete \w+ \w+ to ', pf['playDescription']): continue
                cmp = pf['passResult'] == 'C'; it = pf['passResult'] == 'IN'
            else:
                if lab.get('throwaway'): continue
                it = bool(lab.get('interception')); cmp = ('catch' in ev) and not it
            b = B[sum(fw >= e for e in EDGES)]; b[0] += 1; b[1] += cmp; b[2] += it
    tot = sum(b[0] for b in B); labs = ['<2.0'] + [f"{EDGES[i]:.1f}-{EDGES[i + 1]:.1f}" for i in range(len(EDGES) - 1)] + ['4.0+']
    print(f"{name:16s} n {tot:5d} | " + ' | '.join(f"{l} s: {100 * b[0] / max(1, tot):.0f}% of throws, comp {100 * b[1] / max(1, b[0]):.0f}%, INT {100 * b[2] / max(1, b[0]):.1f}%" for l, b in zip(labs, B)))
