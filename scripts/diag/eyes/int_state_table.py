import json,sys,collections
def q(v,p=.5): v=sorted(x for x in v if x is not None); return v[int(p*(len(v)-1))] if v else float('nan')
D='/tmp/claude-0/-home-user-football-simulation-/76234656-8d68-5b7d-bfdd-37c8868ac92f/scratchpad/league93/'
for a in sys.argv[1:]:
    R=[json.loads(l) for s in ('11','31') for l in open(f'{D}{a}_otd{s}.jsonl') if l.startswith('{')]
    att=[r for r in R if r['release'] and not r['release']['away']]
    I=[r['intState'] for r in R if r.get('int') and r.get('intState')]
    cls=collections.Counter()
    for x in I:
        c='tipped' if x['tipped'] else 'broke on the throw' if x['broke'] else 'sitting (<1.5 yd/s, <3 yd)' if x['speed']<1.5 and x['dist']<3 else 'other (moving, no break)'
        cls[c]+=1
    print(f"{a}: attempts {len(att)}, INT {sum(r['int'] for r in R)} ({sum(r['int'] for r in R)/len(att):.1%}) | by interceptor state: {dict(cls)} | man on the target {sum(x['onTarget'] for x in I)}, kinds {dict(collections.Counter(x['kind'] for x in I))} | dist to the spot at release p50 {q([x['dist'] for x in I]):.1f} yd, closing p50 {q([x['closing'] for x in I]):+.1f} yd/s | batted {sum(1 for r in att if r.get('bat'))} ({sum(1 for r in att if r.get('bat'))/len(att):.1%})")
