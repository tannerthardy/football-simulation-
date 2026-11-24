"""Merge staged-bench outputs into one sensitivity table.
  python3 -I scripts/diag/blocking/sens_table.py out/p0/bench-pass-cap1.txt out/p0/bench-pass-cap1.25.txt out/p0/bench-run-cap1.txt out/p0/bench-run-cap1.25.txt
Each file: staged-bench.mts output (one mode, one TURF_MU_SCALE). Prints rows = cases, columns = the files: change in the pair's velocity from that file's base row (yd/s)."""
import re, sys
files = sys.argv[1:]
data = []
for f in files:
    d, order = {}, []
    for l in open(f):
        m = re.match(r'^(.*?)\s+pair (-?[\d.]+) \(([+-][\d.]+)\)', l)
        if m: d[m.group(1).strip()] = (float(m.group(2)), float(m.group(3))); order.append(m.group(1).strip())
    data.append((f, d, order))
print('| case | ' + ' | '.join(re.sub(r'.*/bench-|\.txt', '', f) for f, _, _ in data) + ' |'); print('|---|' + '---|' * len(data))
for name in data[0][2]:
    cells = []
    for _, d, _ in data:
        v = d.get(name)
        cells.append('-' if v is None else (f'{v[0]:.2f} (base)' if name.startswith('base') else f'{v[1]:+.2f}'))
    print(f'| {name} | ' + ' | '.join(cells) + ' |')
