"""Render saved native film only; never simulate.
python scripts/checkpoint-clips.py OUT [SELECTION.json]
Selection: [{"game":"zone-reference","before":5,"after":6,"note":"..."}]
Indices are native zero-based log indices. Without selection, use first comparable
run and pass calls, requiring same offense/concept/coverage/front and <=15yd LOS.
Comparable game clips are not same-state counterfactuals; preserve this caption.
"""
import gzip,json,sys,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
out=Path(sys.argv[1]); dest=out/'clips';dest.mkdir(exist_ok=True)
ledger=json.loads((out/'batch-ledger.json').read_text())
cache={}
for r in ledger['games']:
    if r['status']=='complete':
        p=out/r['arm']/r['id']/'game.json.gz'
        cache[(r['arm'],r['id'])]=json.loads(gzip.decompress(p.read_bytes()))
if len(sys.argv)>2: picks=json.loads(Path(sys.argv[2]).read_text())
else:
    picks=[]
    for game in sorted(set(g for arm,g in cache)):
        b=cache.get(('baseline',game));c=cache.get(('candidate',game))
        if not b or not c: continue
        for kind in ['run','pass']:
            done=False
            for p in b['log']:
                if p['kind']!=kind or not p.get('replay',{}).get('frames'):continue
                for q in c['log']:
                    if q['kind']!=kind or not q.get('replay',{}).get('frames'):continue
                    if p['offense']!=q['offense'] or abs(p['yardline']-q['yardline'])>15:continue
                    keys=['concept','formation','coverage','front']
                    if not all(p.get('plan',{}).get(k)==q.get('plan',{}).get(k) for k in keys):continue
                    picks.append({'game':game,'before':p['index'],'after':q['index'],'note':'First comparable '+kind+' call by fixed source-independent matching; game histories/fatigue/execution may differ.'});done=True;break
                if done:break
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
manifest=[]
for n,pick in enumerate(picks):
    game=pick['game'];bs=cache[('baseline',game)];cs=cache[('candidate',game)]
    bp=next(p for p in bs['log'] if p['index']==pick['before']);cp=next(p for p in cs['log'] if p['index']==pick['after'])
    if not bp.get('replay',{}).get('frames') or not cp.get('replay',{}).get('frames'):raise ValueError('Missing native frames')
    ballxs=[f['ball'][0] for p in [bp,cp] for f in p['replay']['frames']]
    lo=max(0,min(bp['replay']['los'],cp['replay']['los'],*ballxs)-8);hi=min(120,max(bp['replay']['los']+25,cp['replay']['los']+25,*ballxs)+8)
    if hi-lo<45:hi=min(120,lo+45)
    width,height=1440,960; field_y=150;field_h=740;scale_y=field_h/53.333;scale_x=680/(hi-lo)
    ts=sorted(set(round(f['t'],2) for p in [bp,cp] for f in p['replay']['frames']))
    images=[]
    for t in ts:
        im=Image.new('RGB',(width,height),'#14202c');d=ImageDraw.Draw(im)
        d.text((18,12),game+' | native before / after | '+pick['note'][:150],font=font,fill='white')
        d.text((18,37),'Same teams/settings/game seed; later game histories and snap execution may differ. Raw physical film; official credits below.',font=small,fill='#ccddee')
        for panel,(label,raw,p) in enumerate([('Previous accepted',bs,bp),('Combined candidate',cs,cp)]):
            off=panel*720
            d.text((off+18,63),label+' '+raw['provenance']['commit'][:8]+'  P'+str(p['index']+1).zfill(3),font=font,fill='white')
            d.text((off+18,88),str(p.get('call',''))[:62],font=font,fill='white')
            d.text((off+18,111),str(p.get('defense',''))[:65]+' | '+str(p['down'])+'&'+str(p['distance'])+' at '+str(p['yardline']),font=small,fill='#dddcaa')
            d.rectangle((off+20,field_y,off+700,field_y+field_h),fill='#224936')
            xy=lambda x,y:(off+20+(x-lo)*scale_x,field_y+y*scale_y)
            for x in range(math.ceil(lo/5)*5,math.floor(hi/5)*5+1,5):
                a,b=xy(x,0),xy(x,53.333);d.line((a,b),fill='#507260',width=1)
                d.text((a[0]+3,field_y+3),str(x-10),font=small,fill='#bdcebd')
            for key,col in [('los','#74baff'),('firstDownX','#f9d158')]:
                if lo<=p['replay'][key]<=hi:d.line((xy(p['replay'][key],0),xy(p['replay'][key],53.333)),fill=col,width=2)
            f=max((f for f in p['replay']['frames'] if f['t']<=t+1e-6),key=lambda f:f['t'],default=p['replay']['frames'][0])
            for i,a in enumerate(p['replay']['players']):
                x,y,face=f['agents'][3*i:3*i+3];px,py=xy(x,y)
                if not(off+14<=px<=off+706):continue
                col='#7ebcfa' if a['team']=='O' else '#f39b84';r=7
                d.ellipse((px-r,py-r,px+r,py+r),fill=col,outline='white' if f['carrier']==i else '#1b2730',width=2)
                d.line((px,py,px+10*math.cos(face),py+10*math.sin(face)),fill='white',width=2)
                d.text((px+8,py-6),a['slot'],font=small,fill='white')
            bx,by=xy(*f['ball'][:2]);d.ellipse((bx-3,by-3,bx+3,by+3),fill='#ffed68')
            credit=p.get('officialCredit');cdesc=(credit['treatment']+' '+str(credit.get('yards',''))+'yd') if credit else ('raw nullified' if p.get('nullified') else 'physical result')
            d.text((off+18,905),f"{t:.2f}s | {p.get('outcome')} | raw/log {p['yards']:.2f} yd | official: {cdesc}",font=small,fill='white')
            d.text((off+18,928),str(p.get('text',''))[:103],font=small,fill='#ddddee')
        images.append(im)
    path=dest/f'{n+1:02d}-{game}-{bp["index"]+1}-{cp["index"]+1}.gif'
    images[0].save(path,save_all=True,append_images=images[1:],duration=100,loop=0,optimize=False)
    manifest.append({**pick,'gif':str(path.relative_to(out)),'beforeSource':bs['provenance']['sourceSha256'],'afterSource':cs['provenance']['sourceSha256'],'beforeCall':bp['call'],'afterCall':cp['call'],'beforeOutcome':bp.get('outcome'),'afterOutcome':cp.get('outcome'),'beforeYards':bp['yards'],'afterYards':cp['yards'],'frames':len(images),'maxTime':ts[-1]})
(out/'clips.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'clips':len(manifest),'files':[p['gif'] for p in manifest]}))
