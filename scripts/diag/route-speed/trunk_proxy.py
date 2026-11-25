# Trunk-twist proxy for BDB 2025 offensive tackles on drop-backs: the angle between the shoulder orientation `o` and the direction of motion `dir`
# (his feet's travel: the nearest observable to the hips), engaged (nearest defender within 1.5 yd) against unengaged (nearest defender over 3 yd),
# moving frames only (s >= 1.0 yd/s), snap + 0.5 s to snap + 3.4 s; and the angle between `o` and the direction back from the QB through him.
#   python3 -I scripts/diag/route-speed/trunk_proxy.py WEEK [WEEK ...]      (from the repo root)  Unsigned angles in degrees.
import csv, sys, math, collections as C
D='data/raw/bdb2025/big-data-bowl-data'
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
play={}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['isDropback'] in ('TRUE','True'): play[(r['gameId'],r['playId'])]=r['possessionTeam']
def ang(a,b): return abs((a-b+180)%360-180)
R=C.defaultdict(lambda: C.defaultdict(list))
for w in sys.argv[1:]:
    fr=C.defaultdict(lambda: C.defaultdict(dict)); snap={}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k=(r['gameId'],r['playId'])
        if k not in play or r['displayName']=='football' or r['o'] in ('','NA') or r['dir'] in ('','NA'): continue
        f=int(r['frameId'])
        if r['event']=='ball_snap': snap.setdefault(k,f)
        fr[k][f][r['nflId']]=(float(r['x']),float(r['y']),float(r['s']),float(r['o']),float(r['dir']),r['club'])
    for k,F in fr.items():
        if k not in snap: continue
        s0=snap[k]; poss=play[k]
        for f in range(s0+5,s0+35):
            if f not in F: continue
            qb=[a for i,a in F[f].items() if pos.get(i)=='QB' and a[5]==poss]
            for i,a in F[f].items():
                if pos.get(i)!='T' or a[5]!=poss or a[2]<1.0: continue
                d=min((math.hypot(a[0]-b[0],a[1]-b[1]) for b in F[f].values() if b[5]!=poss), default=99)
                cls='engaged (<1.5 yd)' if d<1.5 else 'unengaged (>3 yd)' if d>3 else None
                if not cls: continue
                R[cls]['o_vs_dir'].append(ang(a[3],a[4]))
                if qb:
                    back=math.degrees(math.atan2(a[0]-qb[0][0],a[1]-qb[0][1]))%360
                    R[cls]['o_vs_backfromQB'].append(ang(a[3],back)); R[cls]['dir_vs_backfromQB'].append(ang(a[4],back))
q=lambda v,p: sorted(v)[int(p*(len(v)-1))]
for cls,m in R.items():
    for key,v in m.items(): print(f'{cls:20s} {key:18s} n {len(v):6d} p50 {q(v,.5):5.1f} p75 {q(v,.75):5.1f} p90 {q(v,.9):5.1f}')
