import json, math, sys
J=json.load(open(sys.argv[1])); slots=sys.argv[2].split(','); W=53.33
print('ev', J['ev'])
def rel(d,c):
    s=math.hypot(c[2],c[3]); u=(c[2]/s,c[3]/s) if s>1 else (1,0)
    dx,dy=d[0]-c[0],d[1]-c[1]; al=dx*u[0]+dy*u[1]; lat=-dx*u[1]+dy*u[0]
    outside=(dy<0) if c[1]<W/2 else (dy>0)
    return ('ahead' if al>1 else 'behind' if al<-1 else 'level'), ('out' if outside else 'in'), al, lat
for f in J['frames'][::int(sys.argv[3]) if len(sys.argv)>3 else 1]:
    c=f['car']; line='t%.1f car y%.1f v%.1f |'%(f['t'],c[1],math.hypot(c[2],c[3]))
    for k in slots:
        d=f['d'][k]; p=d['pos']; r=rel(p,c); aim=d['aim']
        line+=' %s %.1fyd %s/%s al%+.1f lat%+.1f sp%.1f %s V%s%s |'%(k, math.hypot(p[0]-c[0],p[1]-c[1]), r[0], r[1], r[2], r[3], math.hypot(p[2],p[3]), d['stage'], d['assumedV'], (' aim al%+.1f'%rel(aim,c)[2]) if aim else '')
    print(line)
