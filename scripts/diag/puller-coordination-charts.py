import os,json,gzip
os.environ['MPLCONFIGDIR']='/tmp/puller-mpl'
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path
r=json.load(gzip.open('data/reviews/current/puller-coordination/summary.json.gz'))
get=lambda arm,id:next(x for x in r['arms'][arm]['rows']if x['id']==id)
a,b=get('baseline','P01'),get('near-support','P01')
fig,(ax,bx)=plt.subplots(2,1,figsize=(9,6),sharex=True)
for row,color,label,blocker in [(a,'#777777','Before: C assigned deep SS','RG'),(b,'#146b9e','Candidate: C collects Sam','C')]:
 timeline=[f for f in row['timeline']if 2.75<=f['t']<=4]
 ts=[f['t']for f in timeline]
 dist=lambda f:((f['bodies']['RB']['before']['pos']['x']-f['bodies']['LB_S']['before']['pos']['x'])**2+(f['bodies']['RB']['before']['pos']['y']-f['bodies']['LB_S']['before']['pos']['y'])**2)**.5
 ax.plot(ts,[dist(f)for f in timeline],'-o',color=color,label=label,lw=2,ms=3)
 idx=5 if blocker=='RG'else 3
 loads=[next((abs(e['hands']['normal'])+abs(e['hands']['tangent'])for e in f['loads']if e['b']==idx and e['d']==17 and e['hands']),0)for f in timeline]
 bx.plot(ts,loads,'-o',color=color,label=f'{blocker}/Sam force samples',lw=2,ms=3)
ax.axvline(3.75,color='#777777',ls=':',label='Before: Sam grasps RB at3.75s')
ax.axvline(3.6,color='#146b9e',ls=':',label='Candidate: corner grasps RB at3.60s')
ax.set_ylabel('RB–Sam distance (yd)');ax.legend(fontsize=8,loc='upper left');ax.set_title('Pin-and-pull: useful Sam protection, with the corner still earning access')
bx.set_ylabel('|normal| + |lateral| force');bx.set_xlabel('Time after snap (s)');bx.legend(fontsize=8)
for x in [ax,bx]:x.grid(alpha=.2)
fig.text(.015,.005,'Full native all22 runs. Positions/forces sampled every0.25s. C/Sam load starts3.15s; Sam has no RB contact through5s. Candidate remains live at5s.',fontsize=7)
fig.tight_layout(rect=[0,.025,1,1]);fig.savefig('docs/reviews/puller-coordination/protection.png',dpi=140);plt.close(fig)
# The accepted-host candidate, kept separate from the held count.
s=json.load(gzip.open('data/reviews/current/cleared-kick/summary.json.gz'))
old=next(x for x in s['arms']['baseline']['rows']if x['id']=='K03');new=next(x for x in s['arms']['kick-only']['rows']if x['id']=='K03')
fig,(ax,bx)=plt.subplots(2,1,figsize=(9,5),sharex=True)
for row,color,label in [(old,'#777777','Accepted'),(new,'#146b9e','Cleared-kick candidate')]:
 fs=[f for f in row['timeline']if 1.75<=f['t']<=3.5]
 ax.plot([f['t']for f in fs],[f['bodies']['LG']['raw']['vel']['x']for f in fs],'-o',color=color,label=label,ms=3)
 bx.plot([f['t']for f in fs],[f['bodies']['LG']['after']['vel']['x']for f in fs],'-o',color=color,label=label,ms=3)
ax.set_ylabel('Requested LG vx (yd/s)');bx.set_ylabel('Achieved LG vx (yd/s)');bx.set_xlabel('Time after snap (s)');ax.legend(fontsize=8);ax.set_title('Strong Counter: fit the acquired end after the flat track')
for x in [ax,bx]:x.grid(alpha=.2)
fig.text(.015,.005,'Exact accepted-host paired inputs; ordinary spacing/contact. End load2.95→2.90s. First RB contact stays CB at3.55s. The broader count is excluded.',fontsize=7)
fig.tight_layout(rect=[0,.025,1,1]);fig.savefig('docs/reviews/puller-coordination/kick-transition.png',dpi=140)
print('Two static charts; no film generated.')
