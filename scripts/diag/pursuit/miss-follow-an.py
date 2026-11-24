"""Summary of miss-follow-tap.mts: python3 -I miss-follow-an.py LABEL=FILE ..."""
import json, sys
def q(v, p=.5): v = sorted(x for x in v if x is not None); return round(v[int(p * (len(v) - 1))], 2) if v else None
for arg in sys.argv[1:]:
    lab, f = arg.split('=', 1)
    for pt in ('catch', 'run'):
        R = [r for r in json.load(open(f))['rows'] if r['ptype'] == pt]; F = [r for r in R if r['follow']]
        if not R: continue
        nx = [r for r in R if r['next']]
        print(f"{lab:<6} {pt:<5} misses {len(R)} | follow man dist p50 {q([r['follow']['dist'] for r in F])} (p25 {q([r['follow']['dist'] for r in F], .25)}), lateral on the other side p50 {q([r['follow']['lat'] for r in F])}, trail-tagged {sum(r['follow']['trail'] for r in F)}"
              f" | next attempt within 1.0 s {100*sum(1 for r in nx if r['next']['dt'] <= 1.0)/len(R):.0f}%, by the follow man {100*sum(1 for r in nx if r['next']['by']=='follow man')/len(R):.0f}%, made {100*sum(1 for r in nx if r['next']['made'])/len(R):.0f}%"
              f" | yards after the miss p50 {q([r['yardsAfter'] for r in R])} mean {round(sum(r['yardsAfter'] for r in R if r['yardsAfter'] is not None)/max(1,len(R)),2)}")
        T = [r for r in F if r['follow']['trail']]
        if T: print(f"        trail-tagged follow men n {len(T)}: dist p50 {q([r['follow']['dist'] for r in T])}, lateral p50 {q([r['follow']['lat'] for r in T])}, next attempt by him {100*sum(1 for r in T if r['next'] and r['next']['by']=='follow man')/len(T):.0f}% (made {100*sum(1 for r in T if r['next'] and r['next']['by']=='follow man' and r['next']['made'])/len(T):.0f}%), yards after p50 {q([r['yardsAfter'] for r in T])}")

    A = json.load(open(f)).get('attempts', [])
    for pt in ('catch', 'run'):
        for tr in (False, True):
            X = [r for r in A if r['ptype'] == pt and r['trail'] == tr]
            if X: print(f"{lab:<6} {pt:<5} attempts {'trail-tagged' if tr else 'other':<12} n {len(X):>4} | missed {100*sum(r['missed'] for r in X)/len(X):.0f}% | distance p50 {q([r['dist'] for r in X])} | dives {sum(1 for r in X if r['detail']=='dive')}")
    for pt in ('catch', 'run'):
        for lab2, keep in [('never trail', lambda r: r.get('since') is None), ('released 0.3-1.5 s before', lambda r: r.get('since') is not None and 0.3 < r['since'] <= 1.5), ('trail within 0.3 s', lambda r: r['trail'])]:
            X = [r for r in A if r['ptype'] == pt and keep(r)]
            if X: print(f"{lab:<6} {pt:<5} {lab2:<26} n {len(X):>4} | missed {100*sum(r['missed'] for r in X)/len(X):.0f}% | distance p50 {q([r['dist'] for r in X])} | approach p50 {q([r.get('appr') for r in X])} | 56+ deg {100*sum(1 for r in X if (r.get('appr') or 0) >= 56)/len(X):.0f}%")
