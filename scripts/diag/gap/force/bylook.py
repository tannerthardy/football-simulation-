"""edgespace.py's own per-play operator (imported unchanged), broken down by
lab look (sim) and by coverage shell; plus the bounce choice and gain.
usage: bylook.py SIM_COMMON.jsonl.gz"""
import gzip, json, sys, importlib.util
from collections import defaultdict
sys.path.insert(0, 'scripts/mechanics')
spec = importlib.util.spec_from_file_location('es', 'scripts/diag/gap/force/edgespace.py')
src = open('scripts/diag/gap/force/edgespace.py').read().split('\nfor path in sys.argv')[0]
es = {}; exec(compile(src, 'edgespace', 'exec'), es)
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
rows = []
for l in gzip.open(sys.argv[1], 'rt'):
    raw = json.loads(l); r = es['one'](raw)
    if r:
        r['id'] = raw['id']; r['look'] = raw['id'].split('/')[3]; r['form'] = raw['id'].split('/')[2]; r['dir'] = raw['id'].split('/')[1]
        rows.append(r)
def show(key):
    g = defaultdict(list)
    for r in rows: g[key(r)].append(r)
    for k, sel in sorted(g.items()):
        free = [r for r in sel if r['B_near'] > 3]
        print(f"  {str(k):28s} n={len(sel):3d} B free {100*len(free)/len(sel):3.0f}% B_near p50 {q([r['B_near'] for r in sel])} | bounced {100*sum(r['bounce'] for r in sel)/len(sel):3.0f}% | yards p50 {q([r['yards'] for r in sel])} mean {sum(r['yards'] for r in sel)/len(sel):5.1f} 20+ {100*sum(r['yards']>=20 for r in sel)/len(sel):3.0f}% | bounced&closed yards p50 {q([r['yards'] for r in sel if r['bounce'] and r['B_near']<=3])}")
for fam in ('power', 'counter', 'trap'):
    print(fam)
    sub = [r for r in rows if r['fam'] == fam]
    keep = rows[:]; rows[:] = sub
    show(lambda r: r['look'])
    show(lambda r: (r['form'], r['dir']))
    rows[:] = keep
