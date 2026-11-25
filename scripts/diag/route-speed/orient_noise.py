# Orientation-sensor floor for BDB 2025 `o` (shoulder-pad orientation, compass degrees clockwise from +y); weeks given as arguments.
#   python3 -I scripts/diag/route-speed/orient_noise.py WEEK [WEEK ...]      (from the repo root)
# Three numbers, all absolute (unsigned) angles on drop-backs, offensive T/G/C:
#   1. frame-to-frame |d o| of linemen standing still pre-snap (s < 0.3 yd/s on both frames, 1.5 s before the snap): jitter
#   2. |o - direction of play| of the same men (they should be square to the line): the floor of an absolute facing angle
#   3. |o - bearing to the nearest defender| for a tackle and a defender within 1.5 yd with both s < 0.7 yd/s (nearly still pairs)
# Weeks 1-2: 1. p50 0.0 / p90 1.8 / p99 10.2 deg (sd 4.5); 2. p50 11.9 / p90 44.1 deg; 3. p50 18.7 / p90 75.7 deg (n 1,885).
# Unsigned: no sign convention; see signed_off.py for the signed measure.
import csv, sys, math, statistics as st, collections as C
D='data/raw/bdb2025/big-data-bowl-data'
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
play={}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['isDropback'] in ('TRUE','True'): play[(r['gameId'],r['playId'])]=r['possessionTeam']
def ang(a,b): return abs((a-b+180)%360-180)
jit=[]; dev=[]; eng=[]; engfloor=[]
for w in sys.argv[1:]:
    fr=C.defaultdict(lambda: C.defaultdict(dict)); snap={}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k=(r['gameId'],r['playId'])
        if k not in play or r['displayName']=='football' or r['o'] in ('','NA'): continue
        f=int(r['frameId'])
        if r['event']=='ball_snap': snap.setdefault(k,f)
        fr[k][f][r['nflId']]=(float(r['x']),float(r['y']),float(r['s']),float(r['o']),r['club'],r['playDirection'])
    for k,F in fr.items():
        if k not in snap: continue
        s0=snap[k]; poss=play[k]
        # pre-snap stationary tackles/guards/centers: frame-to-frame jitter of o and deviation from the direction of play
        for f in range(s0-15,s0-1):
            if f in F and f+1 in F:
                for i,a in F[f].items():
                    if pos.get(i) in ('T','G','C') and a[4]==poss and a[2]<0.3 and i in F[f+1] and F[f+1][i][2]<0.3:
                        jit.append(ang(a[3],F[f+1][i][3]))
                        dev.append(ang(a[3], 90 if a[5]=='right' else 270))
        # engaged pairs nearly still: tackle with a defender within 1.5 yd, both speeds < 0.7, after the snap
        for f in range(s0+5,s0+35):
            if f not in F: continue
            for i,a in F[f].items():
                if pos.get(i)!='T' or a[4]!=poss or a[2]>=0.7: continue
                best=None
                for j,b in F[f].items():
                    if b[4]==poss or b[2]>=0.7: continue
                    d=math.hypot(a[0]-b[0],a[1]-b[1])
                    if d<1.5 and (best is None or d<best[0]): best=(d,b)
                if best:
                    b=best[1]; brg=math.degrees(math.atan2(b[0]-a[0], b[1]-a[1]))%360  # clockwise from +y, same as o
                    eng.append(ang(a[3],brg))
print('pre-snap stationary OL (s<0.3 both frames): n',len(jit),'frame-to-frame |d o| p50/p90/p99', [round(sorted(jit)[int(p*(len(jit)-1))],1) for p in (.5,.9,.99)], 'sd of signed ~', round(st.pstdev(jit),1))
print('pre-snap OL |o - direction of play| p50/p90', [round(sorted(dev)[int(p*(len(dev)-1))],1) for p in (.5,.9)])
print('nearly-still tackle with a defender within 1.5 yd (both s<0.7), |o - bearing to him| n',len(eng),'p50/p90', [round(sorted(eng)[int(p*(len(eng)-1))],1) for p in (.5,.9)])
