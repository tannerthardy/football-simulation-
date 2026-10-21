"""Check saved projected-help films; no simulation or outcome selection.

python3 film-check.py BEFORE_RAW.json.gz AFTER_RAW.json.gz FILM.html OUTPUT_DIR
"""
import base64, functools, gzip, hashlib, json, re, sys, threading, zipfile
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

before_path, after_path, html_path, output_dir = map(Path, sys.argv[1:5])
output_dir.mkdir(parents=True, exist_ok=True)
reports = [json.loads(gzip.decompress(path.read_bytes())) for path in [before_path, after_path]]
assert [report['sourceSha256'] for report in reports] == [
 '248a44cfeab595291717eb5ace15b98c55b19a17e3fd29d87a706bc30018bd57',
 '704158f29be7a7e31b669fddfbf1cecb2fe2332d37a18eaa2db16a3f69e59c12']
match = re.search(r'const REPLAY = (\{[^\n]*\});', html_path.read_text())
assert match, 'Embedded replay JSON missing'
packed = json.loads(match.group(1).replace('<\\/', '</'))
expected = [f'HELP-R1-{formation}-{concept}-cover4-S3' for formation, concept in [
 ('gun_doubles_11','four_verts'), ('gun_doubles_11','dagger'), ('gun_bunch_11','mesh'), ('gun_trips_11','smash')]]
witness_id='HELP-R2-gun_trips_11-smash-cover4-S3'
expected.append(witness_id)
fixtures_per_phase=len(expected)
assert len(packed['plays']) == 10
assert reports[0]['inputSha256'] == reports[1]['inputSha256']
assert reports[0]['profilesSha256'] == reports[1]['profilesSha256']
assert reports[0]['toolSha256'] == reports[1]['toolSha256']
assert reports[0]['sourceVersionToolSha256'] == reports[1]['sourceVersionToolSha256']
assert reports[0]['sourceSha256'] != reports[1]['sourceSha256']
assert len(reports[0]['rows']) == len(reports[1]['rows']) == 24
for before, after in zip(reports[0]['rows'], reports[1]['rows']):
 assert before['id'] == after['id']
 for key in ['input', 'players', 'profileSha256', 'initialContext', 'initialSignature', 'initialFootballSignature']:
  assert before[key] == after[key], (before['id'], key)
assert [c['label'] for c in packed['meta']['sourceComparison']] == [
 'Baseline: spacing-only help', 'Candidate: persistent near help']
assert 'retained retrospective second-roster Smash witness' in packed['meta']['cohort']
saved_all = []; max_error = 0; natural = 0; censored = 0; pose_counts = []
for group, (report, path) in enumerate(zip(reports,[before_path,after_path])):
 rows = [r for r in report['rows'] if r['recording']]
 assert [r['id'] for r in rows] == expected
 assert all(not row['end']['censored'] for row in rows[:4])
 assert rows[4]['end']['censored'] == (group == 0)
 assert rows[4]['profileSha256'] != rows[3]['profileSha256'], 'The witness retains its different roster'
 comparison = packed['meta']['sourceComparison'][group]
 assert comparison['sourceSha256'] == report['sourceSha256']
 assert comparison['diagnosticScriptSha256'] == report['toolSha256']
 assert comparison['sourceVersionToolSha256'] == report['sourceVersionToolSha256']
 assert comparison['inputSha256'] == report['inputSha256']
 assert comparison['profilesSha256'] == report['profilesSha256']
 assert comparison['rawReportSha256'] == hashlib.sha256(path.read_bytes()).hexdigest()
 assert comparison['decodedReportSha256'] == hashlib.sha256(gzip.decompress(path.read_bytes())).hexdigest()
 assert comparison['observerChecks'] == report['observerNeutrality']
 assert len(comparison['observerChecks']) == 24
 assert all(c['initial'] and c['final'] and c['observedSignature']==c['plainSignature']
            and c['observedInitialSignature']==c['plainInitialSignature'] for c in comparison['observerChecks'])
 pose_count = 0
 for saved, replay in zip(rows,packed['plays'][group*fixtures_per_phase:(group+1)*fixtures_per_phase]):
  saved_all.append(saved); recording = saved['recording']; end = saved['end']
  assert replay['id'] == ('BEFORE-' if group==0 else 'FINAL-')+saved['id']
  assert replay['fixtureId'] == saved['id']
  selection='retained-retrospective-witness' if saved['id']==witness_id else 'fixed-before-outcomes'
  assert replay['filmSelection'] == saved['selection'] == selection
  if saved['id']==witness_id:
   assert 'Retrospective witness (roster 2)' in replay['call'] and 'Retrospective witness (roster 2)' in replay['text']
   assert saved['input']['roster']==2 and saved['input']['offenseSeed']==31 and saved['input']['defenseSeed']==32
  else:
   assert saved['input']['roster']==1 and saved['input']['offenseSeed']==7 and saved['input']['defenseSeed']==19
  assert replay['windowCensored'] == end['censored'] and replay['inspectionEndpoint'] == end
  assert not replay['creditedYardsComputed'] and replay['yds']==0 and not replay['flags']['big'] and not replay['flags']['stuff']
  if end['censored']:
   assert end['phase']=='live' and end['t']==8 and end['endSpot'] is None
   assert 'inspection censor' in replay['endpointLabel'] and 'no whistle, timeout or football outcome' in replay['endpointLabel']
   censored += 1
  else:
   assert end['phase']=='dead' and replay['outcome']==end['outcome']
   assert replay['endpointLabel'].startswith('Natural '+str(end['outcome'])+' at '+f"{end['t']:.2f}s")
   natural += 1
  assert replay['flags']['complete'] == bool(end['stats']['completed'])
  assert replay['flags']['to'] == bool(end['stats'].get('interceptedBy') or end['stats'].get('fumbleLost'))
  assert replay['frames']['t'] == [f['t'] for f in recording['frames']]
  assert replay['frames']['c'] == [f['carrier'] for f in recording['frames']]
  for axis,field in [('p','agents'),('b','ball'),('s','carrierPosture')]:
   original = [x for frame in recording['frames'] for x in frame[field]]
   assert len(original)==len(replay['frames'][axis])
   max_error = max(max_error,max(abs(a-b/10) for a,b in zip(original,replay['frames'][axis])))
  assert json.loads(gzip.decompress(base64.b64decode(replay['telemetry']['data']))) == recording['telemetry']
  assert replay['eventDetails'] == recording['events']
  assert replay['recordedPlayers'] == saved['players']
  assert replay['physicalProfiles'] == [{'idx':a['idx'],'profile':a['profile']} for a in saved['players']]
  assert replay['profiles'] == [{'position':a['player']['position'],**a['player']['measurables'],
                               'ratings':a['player']['ratings']} for a in saved['players']]
  assert replay['weights'] == [a['player']['measurables']['weightLb'] for a in saved['players']]
  assert replay['roster'] == [[a['team'],a['slot'],a['player']['firstName']+' '+a['player']['lastName'],a['player']['jersey']] for a in saved['players']]
  assert replay['recordedInitialContext'] == saved['initialContext']
  assert replay['initialStateSha256'] == saved['initialSignature']
  assert replay['initialFootballSha256'] == saved['initialFootballSignature']
  assert replay['profileSha256'] == saved['profileSha256'] and replay['physicalSha256'] == saved['signature']
  assert replay['fixtureInput'] == saved['input'] and replay['helpSummary'] == saved['summary']
  for frame in recording['telemetry']['frames']:
   assert len(frame['agents'])==22
   pose_count += sum(entry.get('pose') in ['up','down','rising'] for entry in frame.get('perception',[]))
 pose_counts.append(pose_count)
assert max_error <= .050000001
assert all(count > 0 for count in pose_counts), 'Both engines record delayed visible pose'
for i in range(fixtures_per_phase):
 assert saved_all[i]['input']==saved_all[i+fixtures_per_phase]['input']
 assert saved_all[i]['players']==saved_all[i+fixtures_per_phase]['players']
 assert saved_all[i]['initialFootballSignature']==saved_all[i+fixtures_per_phase]['initialFootballSignature']
zip_path=html_path.with_suffix('.zip')
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 info=zipfile.ZipInfo(html_path.name,(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
 z.writestr(info,html_path.read_bytes())
with zipfile.ZipFile(zip_path) as z:
 assert z.namelist()==[html_path.name] and z.read(html_path.name)==html_path.read_bytes() and z.testzip() is None
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(html_path.parent.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
errors=[];clips=[];video_checks=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1080})
  page.add_init_script("""window.__filmStamps=[];
    const originalFillText=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){
      if(String(text).startsWith('Film '))window.__filmStamps.push(String(text));
      return originalFillText.call(this,text,...args);
    };""")
  page.route('https://**',lambda route:route.abort())
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(f'http://127.0.0.1:{server.server_port}/{html_path.name}')
  assert page.evaluate('async()=>await window.REPLAY_READY') and page.evaluate('async()=>await window.TELEMETRY_READY')
  assert page.locator('.play').count()==10 and page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
  for i,saved in enumerate(saved_all):
   replay=packed['plays'][i];page.locator(f'.play[data-i="{i}"]').click()
   if page.locator('#playbtn').inner_text()=='Pause':page.locator('#playbtn').click()
   assert page.evaluate('async()=>await window.TELEMETRY_READY')
   assert replay['id'] in page.locator('#clip-title').inner_text()
   if saved['id']==witness_id:assert 'Retrospective witness (roster 2)' in page.locator('#offcall').inner_text()
   assert 'controlled coverage inspection' in page.locator('#dd').inner_text()
   assert page.locator(f'.play[data-i="{i}"] .gain').inner_text()==replay['endpointLabel']
   assert page.locator('#inspect-player').input_value()==str(replay['inspectedDefender'])
   for name in ['assignments','movement','contact','perception']:
    if page.locator('#layer-'+name).is_enabled():page.locator('#layer-'+name).check()
   frames=saved['recording']['telemetry']['frames']
   pose_frame=next((f for f in frames if any(e['a']==replay['inspectedDefender'] and e.get('pose') for e in f.get('perception',[]))),None)
   target=pose_frame or next(f for f in frames if f['t']>=.5)
   page.locator('#scrub').evaluate('(el,value)=>{el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}))}',
      str(round(target['t']/(saved['recording']['frames'][-1]['t'])*1000)))
   state=page.locator('#inspector-state').inner_text()
   assert 'State sampled at' in state and 'Body state' in state
   if pose_frame:assert 'saw ' in page.locator('#inspector-links').inner_text()
   assert replay['endpointLabel'] in page.locator('#result').inner_text()
   assert replay['endpointLabel'] in page.locator('#kv').inner_text()
   assert page.locator('#event-details button').count()==len(saved['recording']['events'])
   page.click('#copy-reference')
   assert page.locator('#play-reference').input_value().startswith('Film '+replay['sourceSha256'][:12]+' / '+replay['id'])
   if i in [0,fixtures_per_phase]:
    page.evaluate('()=>{window.__filmStamps=[]}')
    page.fill('#clip-start','0');page.fill('#clip-end','1')
    with page.expect_download(timeout=15000) as download_info:page.click('#export-video')
    download=download_info.value
    assert replay['sourceSha256'][:12] in download.suggested_filename
    video_dir=Path('out/projected-help/film');video_dir.mkdir(parents=True,exist_ok=True)
    video_path=video_dir/download.suggested_filename;download.save_as(video_path)
    assert video_path.stat().st_size>0
    stamps=page.evaluate('()=>window.__filmStamps')
    assert stamps and all(stamp.startswith('Film '+replay['sourceSha256'][:12]+' · ') for stamp in stamps)
    video_checks.append({'id':replay['id'],'selectedSourceSha256':replay['sourceSha256'],
      'downloadFilename':download.suggested_filename,'nonemptyBytes':video_path.stat().st_size,
      'paintedStampUsesSelectedSource':True,'sampleStamp':stamps[0]})
   clips.append({'id':replay['id'],'fullTelemetry':True,'naturalFinishOrLiveCensor':True,
     'delayedPoseInspected':bool(pose_frame),'rawEventCount':len(saved['recording']['events']),
     'copiedReferenceUsesSelectedEngineSource':True})
  page.click('#reset-filters');page.select_option('#outcome-filter','complete')
  assert page.locator('.play').count()==sum(p['flags']['complete'] for p in packed['plays'])
  page.click('#reset-filters');page.locator('.more-filters summary').click();page.fill('#search',expected[0])
  assert page.locator('.play').count()==2
  page.click('#reset-filters');page.select_option('#game-filter','1');assert page.locator('.play').count()==5
  page.select_option('#game-filter','all');page.select_option('#group-by','coverage')
  assert page.locator('.clip-group').count()==1
  page.select_option('#group-by','concept');assert page.locator('.clip-group').count()==4
  screenshot_dir=Path('out/projected-help/film')
  screenshot_dir.mkdir(parents=True,exist_ok=True)
  page.screenshot(path=str(screenshot_dir/'film-room-desktop.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844})
  assert page.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth')
  page.screenshot(path=str(screenshot_dir/'film-room-mobile.png'),full_page=True)
  assert not errors,errors
  browser.close()
finally:server.shutdown();server.server_close()
browser_check={'schema':'projected-help-browser-smoke-v1','clips':clips,'pageErrors':errors,'offlineFontsBlocked':True,
 'completionFilterUsesRecordedStats':True,'pairedFixtureSearch':True,'recordedSourceFilter':True,
 'conceptAndCoverageGrouping':True,'mobileNoHorizontalOverflow':True,
 'copiedReferenceUsesSelectedEngineSource':True,'videoExportUsesSelectedEngineSource':video_checks}
integrity={'schema':'projected-help-film-integrity-v1','clips':10,'predeterminedClips':8,'retrospectiveWitnessClips':2,'sourceComparison':packed['meta']['sourceComparison'],
 'exactFullTelemetry':True,'exactRawEventsActorsNotesTimes':True,'exactInitialContextsProfilesRatingsWeights':True,
 'crossSourceInitialFootballStateAndPlayersMatch':True,'all24CrossSourceInitialContextsMatch':True,
 'all24ObserverControlsPerPhaseNeutral':True,
 'exactNaturalEndpointsAndLiveCensors':True,'naturalFinishes':natural,'liveInspectionCensors':censored,
 'creditedYardsNotComputed':True,'recordedFrameTimesAndPossession':True,'visiblePoseEntries':pose_counts,
 'maxExistingPackingPositionFacingError':max_error,'zipHtmlByteExact':True,
 'htmlSha256':hashlib.sha256(html_path.read_bytes()).hexdigest(),'zipSha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),
 'checkerSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
repo = Path(__file__).resolve().parents[4]
integrity['exportToolSha256'] = {path: hashlib.sha256((repo/path).read_bytes()).hexdigest() for path in [
 'scripts/export-visible-help.ts', 'scripts/replay-data.ts', 'scripts/replay-telemetry-packing.ts',
 'viewer/replay.template.html']}
(output_dir/'browser-check.json').write_text(json.dumps(browser_check,indent=2)+'\n')
(output_dir/'film-integrity.json').write_text(json.dumps(integrity,indent=2)+'\n')
print(json.dumps({'browser':browser_check,'integrity':integrity},indent=2))
