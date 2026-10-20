"""Run-gain survival, NFL60 vs sim lab arms: P(gain >= next | gain >= this)
for 0/3/5/10/15/20/30/40 yd. NFL is runs with 60+ yd to go (nfl-ytg.json).
usage: survival.py LABEL [LABEL ...]  (out/open-field/all/LABEL.jsonl.gz)"""
import gzip, json, sys
ytg = json.load(open('out/mechanics/nfl-ytg.json'))
def gains(path, nfl):
    g=[]
    for line in gzip.open(path,'rt'):
        r=json.loads(line); raw=r.get('common', r) if 'common' in r else r
        if raw.get('kind')!='run': continue
        if nfl and ytg.get(raw['id'],0)<60: continue
        g.append(raw['yards'])
    return g
B=[0,3,5,10,15,20,30,40]
def row(name,g):
    s=[sum(1 for x in g if x>=b) for b in B]
    print(f"{name:10s} n {len(g):5d} " + ' '.join(f"P(>={B[i+1]}|>={B[i]}) {s[i+1]/max(1,s[i]):.2f}" for i in range(len(B)-1)))
row('NFL60', gains('out/mechanics/nfl-plays.jsonl.gz', True))
for l in sys.argv[1:]: row(l, gains(f'out/open-field/all/{l}.jsonl.gz', False))
