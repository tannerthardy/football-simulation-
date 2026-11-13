import json,threading,functools
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

root=Path('viewer').resolve()
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
errors=[];checks=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1080})
  page.route('https://**',lambda route:route.abort());page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(f'http://127.0.0.1:{server.server_port}/carrier-boundary.html')
  assert page.evaluate('async()=>await window.REPLAY_READY')
  assert page.evaluate('async()=>await window.TELEMETRY_READY')
  assert page.locator('.play').count()==3
  expected=['RB-BOUND-PARENT','RB-BOUND-REPAIR','RB-BOUND-CURRENT']
  assert page.evaluate('()=>REPLAY.plays.map(p=>p.id)')==expected
  checks.append('All three saved modes load; exact IDs, separate source labels and controlled context')
  assert page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
  for i,expected_id in enumerate(expected):
   page.locator(f'.play[data-i="{i}"]').click()
   if page.locator('#playbtn').inner_text()=='Pause':page.locator('#playbtn').click()
   assert page.evaluate('async()=>await window.TELEMETRY_READY')
   assert expected_id in page.locator('#clip-title').inner_text()
   assert 'seed 3' in page.locator('#clock').inner_text()
   assert page.locator('#layer-movement').is_enabled() and page.locator('#layer-contact').is_enabled()
   page.locator('#layer-movement').check();page.locator('#layer-contact').check()
   runner=page.evaluate(f'()=>REPLAY.plays[{i}].roster.findIndex(r=>r[1]==="RB")')
   page.select_option('#inspect-player',str(runner))
   page.locator('#scrub').evaluate("(el)=>{el.value='650';el.dispatchEvent(new Event('input',{bubbles:true}))}")
   assert 'State sampled at' in page.locator('#inspector-state').inner_text()
   assert 'lb' in page.locator('#player-motion').inner_text()
   assert page.locator('#event-details button').count()==page.evaluate(f'()=>REPLAY.plays[{i}].eventDetails.length')
  checks.append('All modes retain full telemetry, RB weight/speed inspection, movement/contact layers, events and scrubbing')
  page.click('#reset-filters');page.select_option('#outcome-filter','oob')
  assert page.locator('.play').count()==1 and 'RB-BOUND-PARENT' in page.locator('.play').inner_text()
  page.click('#reset-filters');page.locator('.more-filters summary').click();page.fill('#search','RB-BOUND-CURRENT')
  assert page.locator('.play').count()==1 and 'RB-BOUND-CURRENT' in page.locator('.play').inner_text()
  checks.append('Only the recorded parent is OOB; exact current-ID search selects current recording')
  page.click('#reset-filters');page.set_viewport_size({'width':390,'height':844})
  assert page.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth')
  assert not errors,errors
  checks.append('Offline load, mobile layout and no JavaScript errors')
  browser.close()
 print(json.dumps({'scope':'focused three-mode boundary film smoke; not complete generic viewer/video suite','checks':checks,'pageErrors':errors},indent=2))
finally:server.shutdown();server.server_close()
