"""Render the two saved P033 encounters at native 1x. No simulation."""
import gzip
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path('out/spread-air-lanes')
out=Path('docs/reviews/spread-air-lanes/film')
out.mkdir(parents=True,exist_ok=True)
packets=[json.loads(gzip.decompress((root/name).read_bytes())) for name in ['p033-prefix.json.gz','p033-paired-candidate.json.gz']]
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
small=ImageFont.truetype(font,12)
normal=ImageFont.truetype(font,15)
title=ImageFont.truetype(font,20)
images=[]
for k in range(61):
 t=k*.05
 im=Image.new('RGB',(1230,670),'#102421');draw=ImageDraw.Draw(im)
 draw.text((18,10),f'P033 | Inside Zone Weak | {t:.2f} s | native 1x',font=title,fill='white')
 for arm,p in enumerate(packets):
  r=p['selected'];x0=15+arm*615;y0=90;scale=30
  point=lambda v:(x0+(v['x']-18)*scale,y0+(36-v['y'])*scale)
  label='Recorded gap mapping' if arm==0 else 'Center vacancy corrected (paired intervention)'
  draw.text((x0,45),label,font=normal,fill='white')
  for x in range(18,37):
   a,b=point({'x':x,'y':19}),point({'x':x,'y':36});draw.line([a,b],fill='#26483e',width=1)
  for y in range(19,37):
   draw.line([point({'x':18,'y':y}),point({'x':36,'y':y})],fill='#26483e',width=1)
  draw.line([point({'x':25,'y':19}),point({'x':25,'y':36})],fill='#eeeeee',width=2)
  draw.text((point({'x':25,'y':36})[0]+4,y0+4),'LOS',fill='white',font=small)
  fs=r['frames'];ended=t>=fs[-1]['t']+.05-1e-9
  f=next((f for f in fs if abs(f['t']-t)<1e-8),fs[-1]);bodies=f['after'] if ended else f['before']
  actors=r['input']['actors']
  if not ended:
   for j in f['joints']:
    if j.get('kind')=='hands' and abs(j.get('normalForce',0))>1e-7:
     draw.line([point(bodies[j['a']]['pos']),point(bodies[j['b']]['pos'])],fill='#e2b64a',width=3)
  for a,b in zip(actors,bodies):
   px,py=point(b['pos']);rad=a['profile']['radius']*scale
   if not(x0<px<x0+550 and y0<py<y0+515):continue
   color='#64b7ed' if a['team']=='O' else '#ef8473'
   if a['slot']=='RB':color='#ffffff'
   draw.ellipse([px-rad,py-rad,px+rad,py+rad],fill=color,outline='#18231e',width=1)
   draw.text((px+rad+2,py-7),a['slot'],font=small,fill=color)
  rb=bodies[6];p0=point(rb['pos'])
  if not ended:
   v=f['final'][6]['vel'];v1={'x':rb['pos']['x']+v['x']*.18,'y':rb['pos']['y']+v['y']*.18}
   v2={'x':rb['pos']['x']+rb['vel']['x']*.18,'y':rb['pos']['y']+rb['vel']['y']*.18}
   draw.line([p0,point(v1)],fill='white',width=3);draw.line([p0,point(v2)],fill='#62edb9',width=3)
  reads=[e for e in r['reads'] if e['actor']==6 and e['phase']=='aim' and e['t']<=t+1e-9]
  if reads:
   e=reads[-1];p1=point(e['selected']);draw.ellipse([p1[0]-5,p1[1]-5,p1[0]+5,p1[1]+5],outline='#df97ef',width=2)
   draw.text((x0,610),f"Read {e['t']:.2f}s: preferred y={e['preferred']:.2f}",font=normal,fill='#df97ef')
  if ended:draw.text((x0,585),'Whistle: final pose held',font=small,fill='white')
 draw.text((18,638),'White: applied RB request | Green: actual RB velocity | Gold: last-step normal hand load | Magenta: selected entry',font=small,fill='white')
 images.append(im)
 if k==44:im.save(out/'decision-2.20.png')
images[0].save(out/'p033-paired.gif',save_all=True,append_images=images[1:],duration=50,loop=0,optimize=True)
receipt={'schema':'p033-native-film-v1','frames':61,'frameDelayMs':50,'displaySpeed':1,'newWorldSteps':0,
         'inputs':[{'path':str(root/n),'sha256':hashlib.sha256((root/n).read_bytes()).hexdigest()} for n in ['p033-prefix.json.gz','p033-paired-candidate.json.gz']],
         'rendererSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
         'limitations':['Zoom view of actual 22-body simulations. Arrows show requests and achieved velocity, not predicted instant travel.',
                       'Gold uses the preceding resolved hand-joint normal force; no nominal-engagement force is invented.',
                       'No original-runtime-wide or current-branch full-game adoption claim.']}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'film':str(out/'p033-paired.gif'),'bytes':(out/'p033-paired.gif').stat().st_size,'newWorldSteps':0}))
