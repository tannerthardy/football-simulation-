#!/usr/bin/env python3
"""Rough off-path size per flag: for each `const ID = process.env.NAME ...` find uses of ID in the file and
count lines that exist only for the 0 path: `if (!ID) {...}` bodies, the `else` body of `if (ID) {...} else {...}`,
the false arm of `ID ? a : b` on its own lines, and `ID && ...`-less early returns are not counted. Rough on purpose;
the number is a lower-bound grep-level estimate. Output JSON {NAME: {ids, uses, offLines, files}}."""
import re, json, pathlib, sys
decl = re.compile(r"(?:export\s+)?const\s+([A-Za-z_][A-Za-z_0-9]*)\s*=\s*[^;\n]*process\.env\.([A-Z][A-Z_0-9]*)")
def block_end(lines, i, j):
    """index of line closing the brace opened on line i at column j (inclusive), or None"""
    depth = 0
    for k in range(i, min(len(lines), i + 400)):
        s = lines[k]
        for c in (s[j:] if k == i else s):
            if c == '{': depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0: return k
    return None
res = {}
for p in sorted(pathlib.Path('src').glob('**/*.ts')):
    lines = p.read_text().splitlines()
    ids = {}
    for i, l in enumerate(lines):
        m = decl.search(l)
        if m: ids[m.group(1)] = (m.group(2), i)
    for ident, (name, di) in ids.items():
        r = res.setdefault(name, dict(ids=[], uses=0, offLines=0, files=[]))
        r['ids'].append(ident); r['files'].append(str(p))
        use = re.compile(r"(?<![A-Za-z_0-9.])(!?)" + re.escape(ident) + r"(?![A-Za-z_0-9])")
        for i, l in enumerate(lines):
            if i == di: continue
            for m in use.finditer(l):
                r['uses'] += 1
                neg = m.group(1) == '!'
                head = l[:m.start()]
                # if (!ID) { ... }  -> the body is off-only;  if (ID) {...} else {...} -> else body off-only
                mi = re.search(r"if\s*\(\s*$", head)
                if mi:
                    rest = l[m.end():]
                    br = rest.find('{')
                    if rest.strip().startswith(')') and br >= 0:
                        col = m.end() + br
                        e = block_end(lines, i, col)
                        if e is None: continue
                        if neg:
                            r['offLines'] += e - i + 1
                        else:
                            # look for else after e
                            tail = lines[e]
                            em = re.search(r"\}\s*else\s*(\{)?", tail[tail.rfind('}'):]) if 'else' in tail else None
                            nxt = lines[e + 1] if e + 1 < len(lines) else ''
                            if em and em.group(1):
                                col2 = tail.rfind('}') + tail[tail.rfind('}'):].find('{')
                                e2 = block_end(lines, e, col2)
                                if e2: r['offLines'] += e2 - e + 1
                            elif nxt.strip().startswith('else') and '{' in nxt:
                                e2 = block_end(lines, e + 1, nxt.find('{'))
                                if e2: r['offLines'] += e2 - e
                    else:
                        # single-line if (cond) stmt;   -> negated: the statement is off-only (one line)
                        if neg: r['offLines'] += 1
                    continue
                # ternary: ID ? a : b  (count the b arm: one line, or its lines if it spans)
                if re.match(r"\s*\?", l[m.end():]) and not neg:
                    r['offLines'] += 1
                elif neg and re.search(r"!" + re.escape(ident) + r"\s*(\|\||&&|\?)", l):
                    r['offLines'] += 1
                elif re.match(r"\s*&&", l[m.end():]) and not neg:
                    r['offLines'] += 0  # guard on new code: no off-only line
                elif neg:
                    r['offLines'] += 1
json.dump(res, sys.stdout, indent=1)
