"""QB lane, 2026-11-14: the late-throw tail. Same code on NFL tracking and sim exports. Non-designed dropbacks.
Of dropbacks: ball still in his hand at 3.0 / 3.5 / 4.0 s. Of targeted throws: released after 3.0 / 3.5 s, and how
dropbacks still held at 3.0 s end (throw, no forward pass). Time is from the snap to the forward pass.
usage: python3 -I late-throw-tail.py name=a.jsonl.gz,b.jsonl.gz ... [--plays-csv plays.csv]"""
import sys, json, gzip, csv, re
args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
def q(v, p):
    v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')
for arg in args:
    name, paths = arg.split('=', 1); n = 0; T = []; ends = []; late = [0, 0]
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass': continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
            if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            n += 1; ev = raw['events']; fw = ev.get('pass_forward')
            end = fw if fw is not None else ev.get('end', 0); ends.append(end)
            if fw is not None: T.append(fw)
            if end >= 3.0: late[0] += 1; late[1] += fw is None
    pc = lambda a, b: f"{100 * a / max(1, b):.1f}%"
    print(f"{name:10s} dropbacks {n} | still holding at 3.0 s {pc(sum(e >= 3.0 for e in ends), n)}, 3.5 s {pc(sum(e >= 3.5 for e in ends), n)}, 4.0 s {pc(sum(e >= 4.0 for e in ends), n)} | of throws: after 3.0 s {pc(sum(t >= 3.0 for t in T), len(T))}, after 3.5 s {pc(sum(t >= 3.5 for t in T), len(T))}, after 4.0 s {pc(sum(t >= 4.0 for t in T), len(T))}; release p50/p75/p90 {q(T, .5):.2f}/{q(T, .75):.2f}/{q(T, .9):.2f} | held at 3.0 s and no forward pass {pc(late[1], late[0])}")
