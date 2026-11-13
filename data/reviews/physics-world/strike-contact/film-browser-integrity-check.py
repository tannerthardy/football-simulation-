import base64, functools, gzip, hashlib, json, re, sys, threading, zipfile
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

film_path, html_path, output_dir = map(Path, sys.argv[1:4])
output_dir.mkdir(parents=True, exist_ok=True)
raw = json.loads(gzip.decompress(film_path.read_bytes()))
html = html_path.read_text()
match = re.search(r'const REPLAY = (\{[^\n]*\});', html)
assert match, 'Embedded replay JSON missing'
packed = json.loads(match.group(1).replace('<\\/', '</'))
assert len(raw['plays']) == len(packed['plays']) == 14
historical = raw['schema'] == 'motion-contact-film-v1'
assert packed['meta']['sourceSha256'] == raw['sourceBefore']
assert packed['meta']['scriptSha256'] == raw['scriptBefore']
assert packed['meta']['fixtureSha256'] == raw.get('fixtureBefore')
assert packed['meta']['rawFilmSha256'] == hashlib.sha256(film_path.read_bytes()).hexdigest()
max_error = 0
for saved, replay in zip(raw['plays'], packed['plays']):
 assert saved['id'] == replay['id']
 assert replay['windowCensored'] and not any(replay['flags'][k] for k in ['td','to','sack','big','complete','stuff','broken','oob','pressure'])
 assert replay['frames']['t'] == [f['t'] for f in saved['frames']]
 assert replay['frames']['c'] == [f['carrier'] for f in saved['frames']]
 for axis, field in [('p','agents'), ('b','ball')]:
  original = [x for frame in saved['frames'] for x in frame[field]]
  assert len(original) == len(replay['frames'][axis])
  max_error = max(max_error, max(abs(a-b/10) for a,b in zip(original, replay['frames'][axis])))
 assert json.loads(gzip.decompress(base64.b64decode(replay['telemetry']['data']))) == saved['telemetry']
 assert replay['physicalSha256'] == saved['physicalSha256']
 assert replay['initialStateSha256'] == saved['initialStateSha256']
 assert replay['profileSha256'] == saved['profileSha256']
 assert replay['recordedParticipants'] == saved['participants']
 assert replay['physicalProfiles'] == [{'idx':p['idx'],'profile':p['profile']} for p in saved['players']]
 assert replay['profiles'] == [{'position':p['position'],'heightIn':p['heightIn'],'weightLb':p['weightLb'],'ratings':p['ratings']} for p in saved['players']]
 assert replay['weights'] == [p['weightLb'] for p in saved['players']]
 assert len(replay['eventDetails']) == len(saved['events'])
 for saved_event, event in zip(saved['events'], replay['eventDetails']):
  assert {k:v for k,v in saved_event.items() if k != 't'} == {k:v for k,v in event.items() if k != 't'}
  assert abs(saved_event['t']-event['t']) <= .00500001
 assert replay['contactObservation']['firstForce'] == saved['firstContact']
 if not historical:
  assert replay['contactObservation']['firstHandBody'] == saved['firstHandBodyContact']
  assert replay['contactObservation']['metrics'] == saved['contactMetrics']
  assert replay['contactObservation']['installation'] == saved['initial']['installation']
assert max_error <= .050000001
zip_path = html_path.with_suffix('.zip')
zip_exact = None
if zip_path.exists():
 with zipfile.ZipFile(zip_path) as z:
  entries = [name for name in z.namelist() if name.endswith('.html')]
  assert len(entries) == 1
  assert z.read(entries[0]) == html_path.read_bytes()
  zip_exact = True

class Quiet(SimpleHTTPRequestHandler):
 def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(html_path.parent.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
errors=[]; clips=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1080})
  page.route('https://**',lambda route:route.abort())
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(f'http://127.0.0.1:{server.server_port}/{html_path.name}')
  assert page.evaluate('async()=>await window.REPLAY_READY')
  assert page.evaluate('async()=>await window.TELEMETRY_READY')
  assert page.locator('.play').count()==14
  assert page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
  for i,saved in enumerate(raw['plays']):
   page.locator(f'.play[data-i="{i}"]').click()
   if page.locator('#playbtn').inner_text()=='Pause':page.locator('#playbtn').click()
   assert page.evaluate('async()=>await window.TELEMETRY_READY')
   assert saved['id'] in page.locator('#clip-title').inner_text()
   assert 'no football result' in page.locator('#dd').inner_text()
   assert 'Inspection window' in page.locator(f'.play[data-i="{i}"] .gain').inner_text()
   assert page.locator('#layer-movement').is_enabled()
   page.locator('#layer-movement').check()
   if page.locator('#layer-contact').is_enabled():page.locator('#layer-contact').check()
   if page.locator('#layer-perception').is_enabled():page.locator('#layer-perception').check()
   assert page.locator('#inspect-player').input_value()==str(saved['participants']['te']['idx'])
   page.locator('#scrub').evaluate("(el)=>{el.value='200';el.dispatchEvent(new Event('input',{bubbles:true}))}")
   assert 'State sampled at' in page.locator('#inspector-state').inner_text()
   summary=page.locator('#result').inner_text()
   key_values=page.locator('#kv').inner_text()
   if historical:
    assert 'Historical fixture' in summary and 'strike loads unrecorded' in summary
    assert 'maintained hand/body load counts unavailable' in key_values
   else:
    assert 'Corrected slice installation' in summary
    assert 'hand/body loaded' in key_values
    if saved['firstContact']:
     assert 'first achieved force' in key_values
     for channel in saved['firstContact']['sources']:assert channel in key_values
    else:assert 'no achieved force in window' in key_values
    assert page.locator('#event-jumps button').filter(has_text='First achieved force').count()==int(saved['firstContact'] is not None)
    assert page.locator('#event-jumps button').filter(has_text='First hand/body load').count()==int(saved['firstHandBodyContact'] is not None)
   assert page.locator('#event-details button').count()==len(saved['events'])
   clips.append({'id':saved['id'],'fullTelemetry':True,'participantInspectionAndLayers':True,'noFootballResult':True,'contactAccountingLabel':True})
  page.click('#reset-filters');page.select_option('#outcome-filter','stuff')
  assert page.locator('.play').count()==0
  page.click('#reset-filters');page.locator('.more-filters summary').click()
  page.fill('#search',raw['plays'][2]['id'])
  assert page.locator('.play').count()==1
  page.click('#reset-filters');page.set_viewport_size({'width':390,'height':844})
  assert page.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth')
  assert not errors,errors
  browser.close()
finally:server.shutdown();server.server_close()
browser_check={'schema':'motion-contact-browser-smoke-v2','filmSchema':raw['schema'],'clips':clips,'pageErrors':errors,'offlineFontsBlocked':True,'stuffFilterRejectsInspectionWindows':True,'specificIdSearch':True,'mobileNoHorizontalOverflow':True}
integrity={'schema':'motion-contact-film-integrity-v2','filmSchema':raw['schema'],'clips':14,'exactFullTelemetry':True,'recordedFrameTimesAndPossession':True,'eventActorsNotesAndRoundedTimes':True,'exactContactObservations':True,'exactParticipantsPhysicalProfilesRatingsAndWeights':True,'sourceFixtureDiagnosticPins':True,'noInventedFootballResult':True,'maxExistingPackingPositionFacingError':max_error,'zipHtmlByteExact':zip_exact}
(output_dir/'browser-check.json').write_text(json.dumps(browser_check,indent=2)+'\n')
(output_dir/'film-integrity.json').write_text(json.dumps(integrity,indent=2)+'\n')
print(json.dumps({'browser':browser_check,'integrity':integrity},indent=2))
