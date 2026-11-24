"""Per-row binding-limit summary from staged-bench output. python3 -I scripts/diag/blocking/bind_table.py out/p0/b3/bench-pass-cap1.txt"""
import re, sys
print('| case | pair (yd/s) | change | grip binds (share of ticks, blocker / rusher) | leg force below grip (blocker / rusher) | balance: offset / base radius, mean and max (blocker; rusher) | lean-force angle (deg) b / d |'); print('|---|---|---|---|---|---|---|')
for l in open(sys.argv[1]):
    m = re.match(r'^(.*?)\s+pair (-?[\d.]+) \(([+-][\d.]+)\).*?binds grip\(util>=\.95\) b/d ([\d.]+)/([\d.]+), legs below grip b/d ([\d.]+)/([\d.]+), balance \(offset/base radius mean, max\) b/d ([\d.]+),([\d.]+)/([\d.]+),([\d.]+).*?lean-force angle \(atan lean/weight\) b/d (\d+)/(\d+) deg', l)
    if m: g = m.groups(); print(f'| {g[0]} | {g[1]} | {g[2]} | {g[3]} / {g[4]} | {g[5]} / {g[6]} | {g[7]}, {g[8]}; {g[9]}, {g[10]} | {g[11]} / {g[12]} |')
