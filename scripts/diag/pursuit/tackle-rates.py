"""Tables from tackle-rates.mts. Usage: python3 -I tackle-rates.py OUT.json
Attempt = missed_tackle + tackle_wrap (initial). Sack attempts on a pocket QB are excluded everywhere."""
import json, sys, collections
J = json.load(open(sys.argv[1])); G = J['games']
E = [e for e in J['events'] if not e['pocket']]; P = J['plays']
def q(v, p):
    v = sorted(x for x in v if x is not None); return v[min(len(v) - 1, int(p * len(v)))] if v else float('nan')
def pct(n, d): return f'{100 * n / d:4.1f}%' if d else '  -  '
grp = {'CB': 'DB', 'S': 'DB', 'FS': 'DB', 'SS': 'DB', 'LB': 'LB', 'ILB': 'LB', 'OLB': 'LB', 'MLB': 'LB', 'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'EDGE': 'DL'}
for e in E:
    e['dgrp'] = grp.get(e['defPos'], e['defPos'])
    e['field'] = 'open field (<= 1 defender within 5 yd)' if e['near5'] <= 1 else 'traffic (2+ within 5 yd)'
    e['approach'] = 'head-on (< 45 deg)' if e['bearing'] < 45 else 'angle (45-135)' if e['bearing'] <= 135 else 'from behind (> 135)'
    e['cband'] = 'carrier < 3 yd/s' if e['cs'] < 3 else 'carrier 3-6' if e['cs'] < 6 else 'carrier 6+'
    e['clband'] = 'closing < 2 yd/s' if e['closing'] < 2 else 'closing 2-5' if e['closing'] < 5 else 'closing 5+'
miss = [e for e in E if e['type'] == 'missed_tackle']; wrap = [e for e in E if e['type'] == 'tackle_wrap']; brk = [e for e in E if e['type'] == 'broken_tackle']
att = len(miss) + len(wrap)
rush = sum(p['rush'] for p in P); rec = sum(p['reception'] for p in P)
rushE = [e for e in E if e['playType'] in ('inside run', 'outside run', 'qb scramble')]; recE = [e for e in E if e['playType'] in ('pass', 'screen')]
print(f"{G} games, {len(P)} scrimmage plays; rush attempts {rush}, receptions {rec}; seed {J['firstSeed']}+")
print(f"per game: missed {len(miss) / G:.1f}, broken {len(brk) / G:.1f}, attempts {att / G:.1f}, wraps {len(wrap) / G:.1f}")
print(f"per attempt: missed {pct(len(miss), att)}; broken per hold {pct(len(brk), len(wrap))}; missed + broken per attempt {pct(len(miss) + len(brk), att)}")
for lab, S, n in (('rush', rushE, rush), ('reception', recE, rec)):
    m = sum(e['type'] == 'missed_tackle' for e in S); b = sum(e['type'] == 'broken_tackle' for e in S)
    print(f"per {lab}: missed {m / max(1, n):.3f}, broken {b / max(1, n):.3f}, missed + broken {(m + b) / max(1, n):.3f}")
for lab, keep in (('rushes', lambda p: p['rush']), ('receptions', lambda p: p['reception']), ('all ball-carrier plays', lambda p: p['rush'] or p['reception'])):
    S = [p for p in P if keep(p)]
    print(f"share of {lab} with at least one missed: {pct(sum(p['missed'] > 0 for p in S), len(S))}; broken: {pct(sum(p['broken'] > 0 for p in S), len(S))}; either: {pct(sum(p['missed'] + p['broken'] > 0 for p in S), len(S))}")
print(f"yards after the event p50 / mean: missed {q([e['yardsAfter'] for e in miss], .5):.1f} / {sum(e['yardsAfter'] or 0 for e in miss) / max(1, len(miss)):.1f}; broken {q([e['yardsAfter'] for e in brk], .5):.1f} / {sum(e['yardsAfter'] or 0 for e in brk) / max(1, len(brk)):.1f}; wrap {q([e['yardsAfter'] for e in wrap], .5):.1f}")
for key, title in (('carrierPos', 'carrier position'), ('dgrp', 'defender group'), ('playType', 'play type'), ('field', 'open field vs traffic'),
                   ('approach', 'approach bearing (carrier frame)'), ('cband', 'carrier speed'), ('clband', 'closing speed')):
    print(f'\nby {title}:  missed / attempts (miss rate) | broken / holds (break rate) | yards after a miss, a break p50')
    for k in sorted(set(e[key] for e in E)):
        m = [e for e in miss if e[key] == k]; w = [e for e in wrap if e[key] == k]; b = [e for e in brk if e[key] == k]
        print(f"  {k:<40} {len(m):>4} / {len(m) + len(w):<5} ({pct(len(m), len(m) + len(w))}) | {len(b):>4} / {len(w):<5} ({pct(len(b), len(w))}) | {q([e['yardsAfter'] for e in m], .5):.1f}, {q([e['yardsAfter'] for e in b], .5):.1f}")
