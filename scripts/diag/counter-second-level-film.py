"""Render existing native frames only. GT/GH are different calls, not a rollback pair."""
import gzip,json,sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
source=Path(sys.argv[1] if len(sys.argv)>1 else 'out/counter-second-level/report/film-frames.json.gz')
out=Path(sys.argv[2] if len(sys.argv)>2 else 'out/counter-second-level/film');out.mkdir(parents=True,exist_ok=True)
data=json.load(gzip.open(source));font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
fonts={n:ImageFont.truetype(font,n)for n in[12,14,16,21]}
W,H=1100,650;scale=23

def frame(t):
 im=Image.new('RGB',(W,H),'#102028');draw=ImageDraw.Draw(im)
 draw.text((24,12),'Counter GT and GH: different installations, same sniffer look',font=fonts[21],fill='white')
 draw.text((24,45),'Same players / Over / seed 77. Native all 22; camera crop. Gold outlines = loaded hands (tick end); bodies at tick entry.',font=fonts[14],fill='#c9d6db')
 for col,(key,label)in enumerate([('GT01','GT: guard kicks, tackle wraps'),('GH01','GH: guard kicks, off-ball H wraps')]):
  r=data[key];frames=r['frames'];f=min(frames,key=lambda f:abs(f['t']-t));left=24+col*550;top=137
  draw.text((left,80),label,font=fonts[16],fill='white');draw.text((left,108),f't = {f["t"]:.2f} s',font=fonts[14],fill='#c9d6db')
  def point(p):return (left+(38-p['y'])*scale,top+(49-p['x'])*scale)
  draw.rectangle([left,top,left+21*scale,top+17*scale],fill='#173e37',outline='#91aaa1')
  for x in [35,40,45]:
   a=point({'x':x,'y':38});b=point({'x':x,'y':17});draw.line([a,b],fill='#94b1a1' if x==40 else '#4a6a5b',width=2 if x==40 else 1)
   draw.text((left+4,a[1]-18),'LOS' if x==40 else str(x),font=fonts[12],fill='#c6d5ca')
  for i,color in [(6,'#ffe29b'),(10,'#ffb15d')]:
   tail=[point(z['bodies'][i]['pos'])for z in frames if max(0,t-.7)<=z['t']<=t]
   if len(tail)>1:draw.line(tail,fill=color,width=2)
  loaded=set()
  for e in f['loads']:
   if e['hands']and abs(e['hands']['normal'])+abs(e['hands']['tangent'])>1:
    loaded.update([e['b'],e['d'],*e['helpers']])
    for b in[e['b'],*e['helpers']]:draw.line([point(f['bodies'][b]['pos']),point(f['bodies'][e['d']]['pos'])],fill='#ffd75b',width=3)
  for i,b in enumerate(f['bodies']):
   p=b['pos']
   if not(32<=p['x']<=49 and 17<=p['y']<=38):continue
   x,y=point(p);slot=r['slots'][str(i)];radius=7 if i<11 else 6
   color='#5db0db'if i<11 else'#dc6d77'
   if i==6:color='#fff0a3'
   if i==10:color='#ffad4d'
   draw.ellipse([x-radius,y-radius,x+radius,y+radius],fill=color,outline='#ffd75b'if i in loaded else'#0a1720',width=2)
   if slot in['RG','RT','H','RB','LB_W','LB_M']:
    draw.text((x+8,y-9),slot,font=fonts[12],fill='white')
  if key=='GH01' and t>=2.95:draw.text((left,553),'H / Will: real load begins 2.95 s',font=fonts[14],fill='#ffcf7d')
  if t>=r['firstContact']['t']:
   draw.text((left,578),f'First RB contact: {r["slots"][str(r["firstContact"]["b"])]} at {r["firstContact"]["t"]:.2f} s',font=fonts[14],fill='#f1c2bf')
 draw.text((24,616),'Film is a 0–4.5 s prefix at 1x. Different endings are not an improvement test; see the protection report.',font=fonts[14],fill='#b5c6ce')
 return im
frames=[frame(i/10)for i in range(46)]
frames[0].save(out/'counter-gt-gh.gif',save_all=True,append_images=frames[1:],duration=100,loop=0,optimize=True)
frame(3.25).save(out/'counter-collection.png')
print(out)
