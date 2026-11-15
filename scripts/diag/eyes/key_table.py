"""QB lane: table for key-read.ts rows. Per arm: plays with a key read; on a "high" answer, the share thrown high and
on the read, completion and yards on those, interceptions; the same for "low"; sacks; what shut the window (counts),
and how often a man in the lane on the ground was passed over by the ball (QB_KEY_THROW's height test).
usage: python3 -I key_table.py name=rows.jsonl[,rows2.jsonl] ..."""
import sys, json
from collections import Counter
for arg in sys.argv[1:]:
    name, paths = arg.split('=', 1); R = []
    for p in paths.split(','):
        for line in open(p):
            line = line.strip()
            if line.startswith('{'): R.append(json.loads(line))
    K = [r for r in R if r['answer'] in ('low', 'high')]
    print(f"== {name}: key plays {len(R)}, read taken {len(K)}, sacked {sum(r['sacked'] for r in K)} ({100 * sum(r['sacked'] for r in K) / max(1, len(K)):.1f}%)")
    for ans in ('high', 'low'):
        A = [r for r in K if r['answer'] == ans]; T = [r for r in A if r['thrown'] == ans]; O = [r for r in T if (r.get('sawKt', 0) or 0) > 0 and not r.get('pulled')]
        if not A: continue
        yd = lambda S: sum((r['yards'] or 0) if r['cmp'] else 0 for r in S) / max(1, len(S))
        print(f"   answer {ans}: {len(A)} | thrown {ans} {len(T)} ({100 * len(T) / len(A):.0f}%), complete {100 * sum(r['cmp'] for r in T) / max(1, len(T)):.0f}%, {yd(T):.1f} yd/throw, INT {sum(r['int'] for r in T)}"
              f" | on the read {len(O)}, complete {100 * sum(r['cmp'] for r in O) / max(1, len(O)):.0f}%, INT {sum(r['int'] for r in O)} | sacked {sum(r['sacked'] for r in A)}")
    shut = Counter(s for r in K for s in set(r.get('shut') or []))
    print(f"   throws started on the read {sum(1 for r in K if (r.get('sawKt', 0) or 0) > 0)}, of them pulled down at the recheck {sum(1 for r in K if r.get('pulled'))}")
    print(f"   window shut on (plays): {dict(shut)}; plays where the ball passed over a man in the lane: {sum(1 for r in K if r.get('over'))}")
