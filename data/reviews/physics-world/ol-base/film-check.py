import base64, functools, gzip, hashlib, json, re, sys, threading, zipfile
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

before_path, after_path, html_path, output_dir = map(Path, sys.argv[1:5])
output_dir.mkdir(parents=True, exist_ok=True)
films = [json.loads(gzip.decompress(path.read_bytes())) for path in [before_path, after_path]]
html = html_path.read_text()
match = re.search(r'const REPLAY = (\{[^\n]*\});', html)
assert match, 'Embedded replay JSON missing'
packed = json.loads(match.group(1).replace('<\\/', '</'))
expected = [f'OLB-R1-{concept}-R-S3' for concept in ['iz_strong','wz_strong','power','trap','counter','oz_strong']]
assert len(packed['plays']) == 12
assert films[0]['inputSha256'] == films[1]['inputSha256']
assert films[0]['profileSha256'] == films[1]['profileSha256']
assert films[0]['scriptBefore'] == films[1]['scriptBefore']
assert films[0]['moduleSha256']['src/physics/world.ts'] == films[1]['moduleSha256']['src/physics/world.ts']
max_error = 0
saved_all = []
for group, (film, path) in enumerate(zip(films, [before_path,after_path])):
 assert [p['id'] for p in film['plays']] == expected
 comparison=packed['meta']['sourceComparison'][group]
 assert comparison['sourceSha256'] == film['sourceBefore'] == film['sourceAfter']
 assert comparison['diagnosticScriptSha256'] == film['scriptBefore'] == film['scriptAfter']
 assert comparison['moduleSha256'] == film['moduleSha256']
 assert comparison['inputSha256'] == film['inputSha256']
 assert comparison['profilesSha256'] == film['profileSha256']
 assert comparison['rawFilmSha256'] == hashlib.sha256(path.read_bytes()).hexdigest()
 assert comparison['rawDecodedFilmSha256'] == hashlib.sha256(gzip.decompress(path.read_bytes())).hexdigest()
 for saved, replay in zip(film['plays'], packed['plays'][group*6:(group+1)*6]):
  saved_all.append(saved)
  recording=saved['recording']
  assert replay['id'] == ('BASE-' if group==0 else 'CAND-') + saved['id']
  assert replay['fixtureId'] == saved['id'] and replay['filmSelection'] == 'fixed-before-outcomes'
  assert replay['windowCensored'] == saved['end']['censored']
  assert replay['inspectionEndpoint'] == saved['end']
  assert saved['end']['censored'] and saved['end']['t']==3 and saved['end']['phase']=='live'
  assert not any(replay['flags'][k] for k in ['td','to','sack','big','complete','stuff','broken','oob','pressure'])
  assert replay['frames']['t'] == [f['t'] for f in recording['frames']]
  assert replay['frames']['c'] == [f['carrier'] for f in recording['frames']]
  for axis,field in [('p','agents'),('b','ball'),('s','carrierPosture')]:
   original=[x for frame in recording['frames'] for x in frame[field]]
   assert len(original)==len(replay['frames'][axis])
   max_error=max(max_error,max(abs(a-b/10) for a,b in zip(original,replay['frames'][axis])))
  assert json.loads(gzip.decompress(base64.b64decode(replay['telemetry']['data']))) == recording['telemetry']
  assert replay['eventDetails'] == recording['events']
  assert replay['recordedPlayers'] == saved['players']
  assert replay['physicalProfiles'] == [{'idx':a['idx'],'profile':a['profile']} for a in saved['players']]
  assert replay['profiles'] == [{'position':a['position'],'heightIn':a['heightIn'],'weightLb':a['weightLb'],'ratings':a['ratings']} for a in saved['players']]
  assert replay['weights'] == [a['weightLb'] for a in saved['players']]
  assert replay['recordedInitialState'] == saved['initial']
  assert replay['recordedInitialContext'] == saved['initialContext']
  assert replay['initialStateSha256'] == saved['initialSignature']
  assert replay['profileSha256'] == saved['profileSha256']
  assert replay['physicalSha256'] == saved['signature']
  assert replay['fixtureInput'] == saved['input'] and replay['fixture']==saved['fixture']
  assert replay['resolvedOffCall'] == saved['resolvedOffCall']
  assert replay['baseObservation']['summary'] == saved['summary']
  assert replay['baseObservation']['firstContacts'] == saved['firstContacts']
  assert replay['baseObservation']['firstAcquisitions'] == saved['firstAcquisitions']
  assert replay['physics']==saved['physics'] and replay['invariants']==saved['invariants']
  for frame in recording['telemetry']['frames']:
   assert len(frame['agents'])==22
   for agent in frame['agents']:
    assert 'body' in agent and 'posture' in agent['body']
assert max_error <= .050000001
zip_path=html_path.with_suffix('.zip')
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 info=zipfile.ZipInfo(html_path.name,(1980,1,1,0,0,0))
 info.compress_type=zipfile.ZIP_DEFLATED
 z.writestr(info,html_path.read_bytes())
with zipfile.ZipFile(zip_path) as z:
 assert z.namelist()==[html_path.name]
 assert z.read(html_path.name)==html_path.read_bytes()
 assert z.testzip() is None

class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(html_path.parent.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
errors=[];clips=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1080})
  page.route('https://**',lambda route:route.abort())
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(f'http://127.0.0.1:{server.server_port}/{html_path.name}')
  assert page.evaluate('async()=>await window.REPLAY_READY')
  assert page.evaluate('async()=>await window.TELEMETRY_READY')
  assert page.locator('.play').count()==12
  assert page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
  for i,saved in enumerate(saved_all):
   replay=packed['plays'][i]
   page.locator(f'.play[data-i="{i}"]').click()
   if page.locator('#playbtn').inner_text()=='Pause': page.locator('#playbtn').click()
   assert page.evaluate('async()=>await window.TELEMETRY_READY')
   assert replay['id'] in page.locator('#clip-title').inner_text()
   assert 'controlled OL-base inspection' in page.locator('#dd').inner_text()
   assert page.locator(f'.play[data-i="{i}"] .gain').inner_text()=='Inspection window'
   assert page.locator('#layer-movement').is_enabled()
   page.locator('#layer-movement').check()
   for name in ['contact','assignments','perception']:
    if page.locator('#layer-'+name).is_enabled():page.locator('#layer-'+name).check()
   assert page.locator('#inspect-player').input_value()==str(replay['inspectedBlocker'])
   page.locator('#scrub').evaluate("(el)=>{el.value='120';el.dispatchEvent(new Event('input',{bubbles:true}))}")
   state=page.locator('#inspector-state').inner_text()
   assert 'Requested physical posture' in state and 'Posture' in state and 'State sampled at' in state
   nearest=max((f for f in saved['recording']['telemetry']['frames'] if f['t']<=.354000001),key=lambda f:f['t'])
   agent=nearest['agents'][replay['inspectedBlocker']]
   assert f"{agent['body']['posture']:.2f}" in state
   if 'posture' in agent.get('intent',{}):assert f"{agent['intent']['posture']:.2f}" in state
   else: assert 'Unset · recorded World default 0.20' in state
   assert page.locator('#event-details button').count()==len(saved['recording']['events'])
   assert 'Live 3.00s inspection censor' in page.locator('#result').inner_text()
   assert 'Unengaged first-level posture' in page.locator('#kv').inner_text()
   assert 'no whistle, timeout, credited gain or football outcome' in page.locator('#kv').inner_text()
   clips.append({'id':replay['id'],'fullTelemetry':True,'physicalPostureRequestAndAchievedState':True,
     'playerInspectionAndLayers':True,'rawEventCount':len(saved['recording']['events']),'liveInspectionCensor':True})
  page.click('#reset-filters');page.select_option('#outcome-filter','stuff');assert page.locator('.play').count()==0
  page.click('#reset-filters');page.locator('.more-filters summary').click()
  page.fill('#search',expected[2]);assert page.locator('.play').count()==2
  page.click('#reset-filters');page.select_option('#game-filter','1');assert page.locator('.play').count()==6
  page.click('#reset-filters');page.set_viewport_size({'width':390,'height':844})
  assert page.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth')
  assert not errors,errors
  browser.close()
finally:
 server.shutdown();server.server_close()
browser_check={'schema':'ol-base-browser-smoke-v1','clips':clips,'pageErrors':errors,'offlineFontsBlocked':True,
 'stuffFilterRejectsInspectionWindows':True,'pairedFixtureSearch':True,'recordedSourceFilter':True,'mobileNoHorizontalOverflow':True}
integrity={'schema':'ol-base-film-integrity-v1','clips':12,'sourceComparison':packed['meta']['sourceComparison'],
 'exactFullTelemetryIncludingPhysicalPostureAndIntent':True,'exactRawEventsActorsNotesTimes':True,
 'exactInitialContextsProfilesRatingsAndWeights':True,'exactContactAcquisitionSummariesAndCensoredEndpoints':True,
 'recordedFrameTimesAndPossession':True,'maxExistingPackingPositionFacingError':max_error,'zipHtmlByteExact':True,
 'htmlSha256':hashlib.sha256(html_path.read_bytes()).hexdigest(),'zipSha256':hashlib.sha256(zip_path.read_bytes()).hexdigest()}
(output_dir/'browser-check.json').write_text(json.dumps(browser_check,indent=2)+'\n')
(output_dir/'film-integrity.json').write_text(json.dumps(integrity,indent=2)+'\n')
print(json.dumps({'browser':browser_check,'integrity':integrity},indent=2))
