import json,pathlib,time
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
root=pathlib.Path('/workspace/football-experimental-games/out/experimental-games/checkpoint');manifest=json.load(open('/workspace/football-experimental-games/data/reviews/current/experimental-game-inputs.json'));checks=[];errors=[]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1080});page.route('https://**',lambda route:route.abort());page.on('pageerror',lambda e:errors.append(str(e)))
 for arm in ['accepted','experimental']:
  for f in manifest['fixtures']:
   p=root/arm/f['id']/'film.html';s=json.load(open(p.parent/'summary.json'));start=time.monotonic();page.goto(f'http://127.0.0.1:{server.server_port}/{arm}/{f["id"]}/film.html');assert page.evaluate('async()=>await window.REPLAY_READY');assert page.evaluate('async()=>await window.TELEMETRY_READY')
   meta=page.evaluate('()=>({source:REPLAY.meta.sourceSha256,final:REPLAY.meta.final,clips:REPLAY.plays.filter(p=>p.frames).length,frames:REPLAY.plays.reduce((n,p)=>n+(p.frames?.t.length??0),0)})');assert meta['source']==manifest['sources'][arm];assert meta['final']==s['score'];assert meta['clips']==s['filmedPlays'];assert page.locator('.play').count()==s['filmedPlays'];page.locator('.play').first.click()
   if page.locator('#playbtn').inner_text()=='Pause':page.click('#playbtn')
   page.evaluate("()=>{const s=document.getElementById('scrub');s.value=500;s.dispatchEvent(new Event('input',{bubbles:true}));}");page.wait_for_timeout(80)
   assert page.locator('#field').is_visible();assert not errors,errors
   if arm=='experimental' and f['id']=='zone-reference':page.screenshot(path=str(root/'film-room.png'),full_page=True)
   checks.append({'arm':arm,'id':f['id'],'source':meta['source'],'filmedPlays':meta['clips'],'frames':meta['frames'],'loadAndSeekSeconds':time.monotonic()-start})
 browser_version=browser.version;browser.close()
server.shutdown()
(root/'viewer-check.json').write_text(json.dumps({'schema':'experimental-film-viewer-check-v1','browser':browser_version,'offline':True,'externalRequestsBlocked':True,'checks':checks,'pageErrors':errors,'simulation':False},indent=2)+'\n');print(json.dumps({'filmsChecked':len(checks),'clips':sum(x['filmedPlays'] for x in checks),'errors':errors}))
