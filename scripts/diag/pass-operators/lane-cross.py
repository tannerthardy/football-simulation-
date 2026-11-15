"""Throwing lanes through the rush (Integration, 2026-11-15; the bat at the line): how often a pass's path crosses close
to a defensive lineman in its first 0.4 s, the same code on NFL tracking (ball path from nfl-ball.jsonl.gz, matched by
play id) and sim exports (their own ball path, 'bxy'). Horizontal only (tracking has no ball height).

usage: python3 -I scripts/diag/pass-operators/lane-cross.py <plays.jsonl.gz> [--ball nfl-ball.jsonl.gz] [--plays-csv plays.csv]

Per forward pass: the closest horizontal distance from the ball to any DL over the frames from the throw to 0.4 s
later; a crossing within 0.55 yd (his body plus a raised hand) and within 0.95 yd (his reach). NFL: the share of
crossings tipped (the tipped flag).
"""
import sys, os, json, gzip, math, csv, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
args = list(sys.argv[1:]); ballp = None; PFF = None
if '--ball' in args: i = args.index('--ball'); ballp = args[i + 1]; del args[i:i + 2]
if '--plays-csv' in args: i = args.index('--plays-csv'); PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(args[i + 1]))}; del args[i:i + 2]
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen|^pa_|\+pa', re.I)
BALL = {}
if ballp:
    for line in gzip.open(ballp, 'rt'):
        o = json.loads(line); BALL[o['id']] = o
for path in args:
    n = c55 = c95 = t55 = t95 = tipped = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        if PFF is not None:
            if raw.get('source') == 'sim':
                if DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            else:
                pf = PFF.get(str(raw.get('id')))
                if not pf or pf['isDropback'] != 'TRUE' or pf['dropbackType'].startswith('DESIGNED') or pf['playAction'] == 'TRUE': continue
        ev = raw.get('events', {}); fw = ev.get('pass_forward')
        if fw is None: continue
        p = Play(raw)
        b = raw.get('bxy') if raw.get('source') == 'sim' else (BALL.get(raw.get('id')) or {}).get('b')
        if not b: continue
        DL = [d for d in p.who('D') if p.players[d]['group'] == 'DL']
        k0 = p.k(fw); k1 = min(p.frames - 1, len(b) - 1, p.k(fw + 0.4))
        best = 9.0
        for k in range(k0, k1 + 1):
            if not b[k] or b[k][0] is None: continue
            for d in DL:
                x, y = p.pos(d, k)
                if x is None: continue
                best = min(best, math.hypot(b[k][0] - x, b[k][1] - y))
        n += 1
        tip = bool((BALL.get(raw.get('id')) or {}).get('tipped')) if raw.get('source') != 'sim' else False
        if best <= 0.55: c55 += 1; t55 += tip
        if best <= 0.95: c95 += 1; t95 += tip
        tipped += tip
    print(f"== {os.path.basename(path)}: forward passes {n} | ball within 0.55 yd of a DL in its first 0.4 s: {100 * c55 / max(1, n):.1f}% of passes, within 0.95 yd: {100 * c95 / max(1, n):.1f}%"
          + (f" | tipped (flag) {100 * tipped / max(1, n):.2f}% of passes; of crossings within 0.55 / 0.95 yd {100 * t55 / max(1, c55):.1f} / {100 * t95 / max(1, c95):.1f}%" if ballp else ''))
