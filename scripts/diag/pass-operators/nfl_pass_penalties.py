"""NFL penalty budget for contact around the catch (C14): defensive pass interference, offensive pass interference,
defensive holding and illegal contact per 100 passes, by air depth (nflverse play-by-play; BDB 2025's plays.csv
leaves out plays wiped out by a penalty, so it cannot give these rates).
Passes: regular-season plays of type pass or no_play whose description has a pass ("pass short/deep ..."), not a
sack or spike (nflverse marks a play wiped out by a foul as no_play with qb_dropback 0, so dropback flags are not
used). Accepted, declined and offsetting fouls all count. Fouls are read from the description
("PENALTY on X, Defensive Pass Interference"), so a second foul on the same play counts too. Depth = the description's
'short' / 'deep' (nflverse: deep = 15+ air yards), which no_play rows keep while their air_yards is blank. Man/zone is not in nflverse.
usage: python3 -I scripts/diag/pass-operators/nfl_pass_penalties.py <play_by_play_2022.csv.gz>
(file: https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2022.csv.gz)"""
import csv, gzip, re, sys, collections
F = {'DPI': r'Defensive Pass Interference', 'OPI': r'Offensive Pass Interference', 'DH': r'Defensive Holding',
     'IC': r'Illegal Contact', 'OH': r'Offensive Holding'}
C = collections.defaultdict(collections.Counter); N = collections.Counter()
for r in csv.DictReader(gzip.open(sys.argv[1], 'rt', newline='')):
    if r['season_type'] != 'REG' or r['play_type'] not in ('pass', 'no_play'): continue
    d = r['desc'] or ''
    m = re.search(r'\bpass (?:incomplete )?(short|deep)\b', d)
    if not m or 'sacked' in d or 'spiked' in d: continue
    db = m.group(1)
    for key in (('all',), ('depth', db)):
        N[key] += 1
        for k, pat in F.items(): C[key][k] += len(re.findall(pat, d, re.I))
print('NFL 2022 regular season: fouls per 100 passes (nflverse pbp; offensive holding for scale)')
for key in sorted(N, key=lambda k: (len(k), k)):
    n = N[key]; print(f"  {'/'.join(key):14} n {n:6} " + '  '.join(f"{k} {100*C[key][k]/n:4.2f}" for k in F))
