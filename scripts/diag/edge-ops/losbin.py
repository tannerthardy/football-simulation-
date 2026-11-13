import sys, collections
exec(open(sys.argv[0].replace('losbin.py','lbarr.py')).read().split("\nfor path in sys.argv[1:]:")[0])
BINS=('cut (<0)','B/C (0-3)','edge (3-6)','bounce (6+)')
for path in sys.argv[1:]:
    B=collections.defaultdict(list)
    for con, ol, ot, df, car, fc, sh in plays(path):
        if con!='OU' or len(car)<15: continue
        ps = 1 if sum(ol[10][i][1]-ol[0][i][1] for i in range(5)) >= 0 else -1
        pst = max(o[1]*ps for o in ol[0]); al='UC' if car[0][0] < -6 else 'GUN'
        f0=next((f for f in range(len(car)) if car[f][0]>=0), None)
        if f0 is None: continue
        r=car[f0][1]*ps-pst; b=BINS[0] if r<0 else BINS[1] if r<3 else BINS[2] if r<6 else BINS[3]
        B[(al,b)].append(1)
    print('==',path.split('/')[-1])
    for al in ('GUN','UC'):
        n=sum(len(B[(al,b)]) for b in BINS)
        print(' ',al,f'n{n}','  '.join(f"{b} {100*len(B[(al,b)])/n:.0f}%" for b in BINS))
