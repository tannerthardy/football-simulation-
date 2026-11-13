"""Whole-game YAC from gameyac.ts outputs (g-7.jsonl, g-8.jsonl in each dir), with a by-game bootstrap interval.
python3 -I games.py DIR [DIR ...]"""
import json, sys, random
def load(d):
    R=[]
    for s in (7,8):
        R += [dict(json.loads(l), seed=s) for l in open(f'{d}/g-{s}.jsonl') if l.strip()]
    return R
q=lambda v,f=.5: sorted(v)[int(f*(len(v)-1))]
for d in sys.argv[1:]:
    R=load(d); C=[r for r in R if r['comp'] and r['yac'] is not None]
    yac=sum(r['yac'] for r in C)/len(C)
    # bootstrap by game
    games={}
    for r in C: games.setdefault((r['seed'],r['g']),[]).append(r['yac'])
    keys=list(games); random.seed(1); bs=[]
    for _ in range(400):
        pick=[random.choice(keys) for _ in keys]; v=[x for k in pick for x in games[k]]; bs.append(sum(v)/len(v))
    bs.sort()
    first=[r for r in R if r['n']<15]; late=[r for r in R if r['n']>=45]
    print(f"{d.split('/')[3]}: pass plays {len(R)} comp {100*len(C)/len(R):.1f}% YAC {yac:.2f} (90% {bs[20]:.2f}-{bs[379]:.2f}) | sep {sum(r['sep'] for r in R if r['sep'] is not None)/sum(r['sep'] is not None for r in R):.2f} air {sum(r['air'] for r in C if r['air'] is not None)/len(C):.2f} | D energy at snap p50 {q([r['eD'] for r in R]):.3f} (late plays {q([r['eD'] for r in late]):.3f}) O {q([r['eO'] for r in R]):.3f} | YAC by seed " + ' '.join(f"{s}:{sum(r['yac'] for r in C if r['seed']==s)/sum(r['seed']==s for r in C):.2f}" for s in (7,8)))
