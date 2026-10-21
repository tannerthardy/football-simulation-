"""Verify the existing tackle-timing export against its two saved films."""
import base64, copy, functools, gzip, hashlib, json, math, re, sys, threading, zipfile
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

before_path, after_path, html_path, output_dir = map(Path, sys.argv[1:5])
output_dir.mkdir(parents=True, exist_ok=True)
def read(path):
 data=path.read_bytes();return json.loads(gzip.decompress(data) if path.suffix=='.gz' else data)
films=[read(before_path),read(after_path)]
match=re.search(r'const REPLAY = (\{[^\n]*\});',html_path.read_text());assert match
packed=json.loads(match.group(1).replace('<\\/','</'))
expected=[f'TT-R1-{g}-S83-L' for g in ['frontalForm','imminentCrossing','glancingEscapeReach',
 'fasterCarrierEscape','fatiguedCrossing','recoveringCrossing','trafficCrossing']]+['TT-W-crossing-S19-L','TT-W-crossing-S19-R']
assert len(packed['plays'])==18
assert films[0]['sourceBefore']!=films[1]['sourceBefore']
for pin in ['scriptSha256','inputSha256','cohortSha256','profilesSha256']:
 assert films[0][pin]==films[1][pin]
assert packed['meta']['sourceSha256']==films[1]['sourceBefore']
assert [c['sourceSha256'] for c in packed['meta']['sourceComparison']]==[f['sourceBefore'] for f in films]
assert [c['label'] for c in packed['meta']['sourceComparison']]==['Baseline','Candidate']
round2=lambda x:math.floor(x*100+.5)/100
max_error=0;full_checks=[];censored=[];natural=[]
for group,film in enumerate(films):
 assert film['schema']=='tackle-timing-review-film-v1' and film['sourceBefore']==film['sourceAfter']
 assert [r['id'] for r in film['plays']]==expected
 for i,(saved,replay) in enumerate(zip(film['plays'],packed['plays'][group*9:(group+1)*9])):
  assert saved['recordingVerified'] and saved['sourceSha256']==film['sourceBefore']
  assert replay['id']==('BASE-' if group==0 else 'CAND-')+saved['id'] and replay['fixtureId']==saved['id']
  assert replay['sourceSha256']==film['sourceBefore'] and replay['profileSha256']==saved['profileSha256']
  assert replay['filmSelection']==saved['selection'] and replay['cohortGroup']==saved['input']['group']
  assert saved['selection']==('preselected-primary-subset' if i<7 else 'separate-retrospective-witness')
  other=films[1-group]['plays'][i]
  assert saved['input']==other['input'] and saved['players']==other['players']
  assert saved['initialCarrierPosition']==other['initialCarrierPosition'] and saved['profileSha256']==other['profileSha256']
  start=saved['simulationStartedAt'];assert start==2 and replay['rawSimulationStartedAt']==2
  raw=saved['result'];assert replay['rawSimulationDuration']==raw['duration']
  frames=[dict(f,t=round2(f['t']-start)) for f in raw['frames'] if f['t']>=start]
  assert frames[0]['t']==0 and replay['frames']['t']==[f['t'] for f in frames]
  assert replay['frames']['c']==[f['carrier'] for f in frames]
  for axis,field in [('p','agents'),('b','ball'),('s','carrierPosture')]:
   original=[x for f in frames for x in f[field]]
   assert len(original)==len(replay['frames'][axis])
   max_error=max(max_error,max(abs(a-b/10) for a,b in zip(original,replay['frames'][axis])))
  events=[dict(e,t=round2(e['t']-start)) for e in raw['events'] if e['t']>=start]
  assert replay['eventDetails']==events
  telemetry=copy.deepcopy(raw['telemetry'])
  telemetry['frames']=[f for f in telemetry['frames'] if f['t']>=start]
  for f in telemetry['frames']:
   f['t']=round2(f['t']-start)
   for seen in f.get('perception',[]):seen['t']=round2(seen['t']-start)
   if f.get('ball') and 'arrivalT' in f['ball']:f['ball']['arrivalT']=round2(f['ball']['arrivalT']-start)
  telemetry['decisions']=[dict(d,t=round2(d['t']-start)) for d in telemetry['decisions'] if d['t']>=start]
  assert json.loads(gzip.decompress(base64.b64decode(replay['telemetry']['data'])))==telemetry
  assert replay['profiles']==[{'position':a['position'],'heightIn':a['heightIn'],'weightLb':a['weightLb'],'ratings':a['ratings']} for a in saved['players']]
  assert replay['weights']==[a['weightLb'] for a in saved['players']]
  assert replay['roster']==[[a['team'],a['slot'],a['name'],a['jersey']] for a in saved['players']]
  assert replay['rawEngineGainYd']==raw['yards'] and replay['windowCensored']==(raw['outcome']=='timeout')
  if replay['windowCensored']:
   carrier=frames[0]['carrier'];advance=frames[-1]['agents'][carrier*3]-saved['initialCarrierPosition']['x']
   assert replay['postCatchAdvanceType']=='observed-at-window-end' and 'inspection window ended live' in replay['text']
   assert 'no credited gain' in replay['text']
   assert not any(replay['flags'][k] for k in ['big','stuff','complete','td','to','sack','oob','pressure'])
   censored.append(replay['id'])
  else:
   advance=raw['endX']-saved['initialCarrierPosition']['x']
   assert replay['postCatchAdvanceType']=='credited-at-whistle' and replay['outcome']==raw['outcome']
   assert 'credited yd after staged catch' in replay['text'];natural.append(replay['id'])
  assert replay['postCatchAdvanceYd']==round2(advance) and not replay['flags']['pressure']
  full_checks.append({'id':replay['id'],'sourceSha256':replay['sourceSha256'],
   'recordedPhysicalSha256':saved['physicalSha256'],'fullShiftedTelemetryAndEvents':True,
   'profileAndInputPairMatch':True,'windowCensored':replay['windowCensored']})
assert max_error<=.050000001
zip_path=html_path.with_suffix('.zip')
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 info=zipfile.ZipInfo(html_path.name,(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
 z.writestr(info,html_path.read_bytes())
with zipfile.ZipFile(zip_path) as z:
 assert z.namelist()==[html_path.name] and z.read(html_path.name)==html_path.read_bytes() and z.testzip() is None
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(html_path.parent.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start();errors=[];clips=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1080});page.route('https://**',lambda r:r.abort())
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(f'http://127.0.0.1:{server.server_port}/{html_path.name}')
  assert page.evaluate('async()=>await window.REPLAY_READY') and page.evaluate('async()=>await window.TELEMETRY_READY')
  assert page.locator('.play').count()==18 and page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden() and page.locator('#dd').is_hidden()
  for i in [0,2,6,8,9,11,15,17]:
   replay=packed['plays'][i];page.locator(f'.play[data-i="{i}"]').click()
   if page.locator('#playbtn').inner_text()=='Pause':page.locator('#playbtn').click()
   assert page.evaluate('async()=>await window.TELEMETRY_READY') and replay['id'] in page.locator('#clip-title').inner_text()
   assert replay['text'] in page.locator('#result').inner_text()
   if replay['windowCensored']:assert page.locator(f'.play[data-i="{i}"] .gain').inner_text()=='Live window'
   carrier=replay['frames']['c'][0];page.select_option('#inspect-player',str(carrier))
   for name in ['movement','contact','perception']:
    if page.locator('#layer-'+name).is_enabled():page.locator('#layer-'+name).check()
   page.locator('#scrub').evaluate('(el)=>{el.value="200";el.dispatchEvent(new Event("input",{bubbles:true}))}')
   assert 'State sampled at' in page.locator('#inspector-state').inner_text()
   assert page.locator('#event-details button').count()==len(replay['eventDetails'])
   clips.append({'id':replay['id'],'playerInspectionAndLayers':True,'honestEndpointCaption':True})
  page.click('#reset-filters');page.select_option('#outcome-filter','stuff')
  assert page.locator('.play').count()==sum(p['flags']['stuff'] for p in packed['plays'])
  page.click('#reset-filters');page.locator('.more-filters summary').click();page.fill('#search',expected[2]);assert page.locator('.play').count()==2
  page.click('#reset-filters');page.select_option('#game-filter','1');assert page.locator('.play').count()==9
  page.click('#reset-filters');page.screenshot(path=str(output_dir/'film-room-desktop.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844});assert page.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth')
  page.screenshot(path=str(output_dir/'film-room-mobile.png'),full_page=True)
  assert not errors,errors;browser.close()
finally:server.shutdown();server.server_close()
browser={'schema':'tackle-timing-browser-smoke-v1','clips':clips,'pageErrors':errors,'offlineFontsBlocked':True,
 'playerInspectionAndLayers':True,'stuffFilterExcludesLiveWindows':True,'pairedFixtureSearch':True,'recordedSourceFilter':True,'mobileNoHorizontalOverflow':True}
integrity={'schema':'tackle-timing-export-integrity-v1','clips':18,'concepts':8,'sourceComparison':packed['meta']['sourceComparison'],
 'rawFilms':[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [before_path,after_path]],
 'fullRecordingChecks':full_checks,'censoredClips':censored,'naturalClips':natural,'censoredCompletedResultFlagsCleared':True,
 'parkedQbPressureFlagExcluded':True,'shiftedFullTelemetryFramesAndDecisionsVerified':18,'exactShiftedEventActorsNotesPositions':True,
 'allGeneratedProfilesRatingsWeightsAndRosterNamesVerified':True,'postCatchAdvanceUsesObservedOrWhistleAsLabelled':True,
 'maxExistingPackingPositionFacingError':max_error,'zipHtmlByteExact':True,
 'exporterSha256':hashlib.sha256(Path('scripts/export-tackle-timing.ts').read_bytes()).hexdigest(),
 'templateSha256':hashlib.sha256(Path('viewer/replay.template.html').read_bytes()).hexdigest(),
 'checkerSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
 'viewerSha256':hashlib.sha256(html_path.read_bytes()).hexdigest(),'zipSha256':hashlib.sha256(zip_path.read_bytes()).hexdigest()}
(output_dir/'browser-check.json').write_text(json.dumps(browser,indent=2)+'\n')
(output_dir/'export-integrity.json').write_text(json.dumps(integrity,indent=2)+'\n')
print(json.dumps({'browser':browser,'integrity':integrity},indent=2))
