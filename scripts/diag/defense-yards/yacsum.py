"""YAC summary on common-format plays (Integration's reporting rule, 2026-11-11): median / trimmed mean (catches with
30+ yd after the catch removed) / mean ± SE, and the shares of catches gaining 10+ and 20+ after the catch.
Carrier phase from the catch (yards.py `plays`). usage: python3 -I scripts/diag/defense-yards/yacsum.py <plays.jsonl.gz> [...]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_a = sys.argv; sys.argv = sys.argv[:1]
from yards import plays  # noqa
sys.argv = _a
for path in sys.argv[1:]:
    v = []
    for kind, p, c, k0, last in plays(path):
        if kind == 'pass' and c is not None: v.append(p.pos(c, last)[0] - p.pos(c, k0)[0])
    n = len(v); s = sorted(v); m = sum(v) / n; sd = math.sqrt(sum((x - m) ** 2 for x in v) / (n - 1)); t = [x for x in v if x < 30]
    print(f"{os.path.basename(path)}: catches {n} | YAC median {s[n // 2]:.1f} / trimmed (<30) mean {sum(t) / len(t):.2f} / mean {m:.2f} ± {sd / math.sqrt(n):.2f} | 10+ {100 * sum(x >= 10 for x in v) / n:.1f}% 20+ {100 * sum(x >= 20 for x in v) / n:.1f}%")
