#!/usr/bin/env python3
"""Flag inventory (read-only): every env flag read in src, with read form, sites, registry state,
first/last commit touching it, FLAGS.md presence. Writes JSON to stdout. Run from repo root."""
import json, re, subprocess, sys, collections, pathlib
root = pathlib.Path('.')
read = collections.defaultdict(list)
pat = re.compile(r"process\.env\.([A-Z][A-Z_0-9]*)\s*(!==\s*'0'|===\s*'1'|===\s*'0'|!==\s*'1'|\?\?\s*[-0-9.]+|)")
for p in sorted(root.glob('src/**/*.ts')):
    for i, line in enumerate(p.read_text().splitlines(), 1):
        for m in pat.finditer(line):
            read[m.group(1)].append((str(p), i, re.sub(r'\s+', '', m.group(2)) or 'raw'))
stack = json.load(open('config/reference-stack.json'))
flags_md = pathlib.Path('docs/FLAGS.md').read_text()
md_names = set(re.findall(r"^\| `([A-Z][A-Z_0-9]*)`", flags_md, re.M))
# first/last commit touching a flag in src: one pass over history
first, last, nlast = {}, {}, {}
names = set(read)
cur = None
out = subprocess.run(['git', 'log', '--format=C%H %ad', '--date=short', '-p', '-U0', '--', 'src'], capture_output=True, text=True, check=True).stdout
r2 = re.compile(r"process\.env\.([A-Z][A-Z_0-9]*)")
for line in out.splitlines():
    if line.startswith('C') and re.match(r'C[0-9a-f]{40} ', line):
        cur = (line[1:41], line[42:]); continue
    if line.startswith(('+', '-')) and not line.startswith(('+++', '---')):
        for n in r2.findall(line):
            if n in names:
                if n not in last: last[n] = cur          # log is newest first
                first[n] = cur                           # ends as the oldest
res = {}
for n in sorted(names):
    sites = read[n]
    forms = sorted({s[2] for s in sites})
    res[n] = dict(sites=[f"{s[0]}:{s[1]}" for s in sites], forms=forms,
                  stack=stack['flags'].get(n), numeric=stack['numeric'].get(n),
                  inFlagsMd=n in md_names,
                  first=first.get(n), last=last.get(n))
res['_registryNotRead'] = sorted(set(stack['flags']) - names)
res['_mdNotRead'] = sorted(md_names - names)
res['_readNotMd'] = sorted(names - md_names)
res['_readNotStack'] = sorted(names - set(stack['flags']) - set(stack['numeric']))
json.dump(res, sys.stdout, indent=1)
