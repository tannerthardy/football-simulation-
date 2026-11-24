"""Summary of run-cost-tap.mts files (2026-11-24): python3 -I run-cost-an.py LABEL=GLOB [LABEL=GLOB ...]"""
import json, glob, sys, statistics as S
def mean(v): v = [x for x in v if x is not None]; return round(S.mean(v), 2) if v else None
for arg in sys.argv[1:]:
    lab, pat = arg.split('=', 1); R = []
    for f in sorted(glob.glob(pat)): R += json.load(open(f))['runs']
    Y = [r for r in R if r['yards'] is not None]; C = [r for r in Y if r['crossed']]
    cut = [r for r in C if r['cutback']]; bnc = [r for r in C if r['bounce']]; vac = [r for r in C if r['vacated']]
    print(f"{lab:<10} runs {len(Y)} | yards mean {mean([r['yards'] for r in Y])} p50 {sorted(r['yards'] for r in Y)[len(Y)//2]} | stuff {100*sum(r['stuff'] for r in Y)/len(Y):.1f}%"
          f" | 10+ {100*sum(r['yards']>=10 for r in Y)/len(Y):.1f}% 20+ {100*sum(r['yards']>=20 for r in Y)/len(Y):.1f}%"
          f" | cutback {len(cut)} ({100*len(cut)/max(1,len(C)):.1f}%) yd {mean([r['yards'] for r in cut])} | bounce {len(bnc)} ({100*len(bnc)/max(1,len(C)):.1f}%) yd {mean([r['yards'] for r in bnc])}"
          f" | through a vacated DL gap {len(vac)} ({100*len(vac)/max(1,len(C)):.1f}%) yd {mean([r['yards'] for r in vac])}")
