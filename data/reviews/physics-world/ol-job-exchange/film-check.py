"""Check four fixed exchange witnesses per source without simulation.

python3 film-check.py BEFORE.json.gz AFTER.json.gz VIEWER.html OUTPUT_DIR
Chromium is served only over localhost; external HTTPS requests are blocked.
"""
import base64, functools, gzip, hashlib, json, re, sys, threading, zipfile
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

before_path, after_path, html_path, output_dir = map(Path, sys.argv[1:5])
output_dir.mkdir(parents=True, exist_ok=True)
paths = [before_path, after_path]
films = [json.loads(gzip.decompress(p.read_bytes())) for p in paths]
match = re.search(r'const REPLAY = (\{[^\n]*\});', html_path.read_text())
assert match, 'Embedded replay JSON missing'
packed = json.loads(match.group(1).replace('<\\/', '</'))
expected = [f'WX-R1-{pair}-{side}-S3' for pair in ['duo-odd', 'power-under'] for side in ['R', 'L']]
assert packed['meta']['filmSchema'] == 'ol-work-exchange-comparison-v1' and len(packed['plays']) == 8
assert films[0]['sourceBefore'] != films[1]['sourceBefore']
assert films[0]['collectorSha256'] == films[1]['collectorSha256'] and films[0]['cohort'] == films[1]['cohort']
assert films[0]['moduleSha256']['src/physics/world.ts'] == films[1]['moduleSha256']['src/physics/world.ts']
max_error = 0; saved_all = []; actual_observer_records = []
for group, (film, path) in enumerate(zip(films, paths)):
    assert film['schema'] == 'ol-work-exchange-film-v1'
    assert film['sourceBefore'] == film['sourceAfter'] and re.fullmatch('[a-f0-9]{64}', film['sourceBefore'])
    assert [p['id'] for p in film['plays']] == expected
    comparison = packed['meta']['sourceComparison'][group]
    assert comparison['sourceSha256'] == film['sourceBefore'] and comparison['collectorSha256'] == film['collectorSha256']
    assert comparison['cohortSha256'] == hashlib.sha256(json.dumps(film['cohort'], separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
    assert comparison['inputRawSha256'] == hashlib.sha256(path.read_bytes()).hexdigest()
    assert comparison['moduleSha256'] == film['moduleSha256']
    assert comparison['observerChecks'] == [{key: p[key] for key in ['id', 'initialSha256', 'profileSha256', 'observedSignature', 'plainSignature']} for p in film['plays']]
    for saved, replay in zip(film['plays'], packed['plays'][group*4:(group+1)*4]):
        saved_all.append(saved); result = saved['result']; frames = result['frames']
        assert saved['observerVerified'] and saved['observedSignature'] == saved['plainSignature']
        assert saved['naturalEnd'] and result['outcome'] != 'timeout' and result['telemetry']['level'] == 'full'
        assert replay['id'] == ('BEFORE-' if group == 0 else 'FINAL-') + saved['id']
        assert replay['fixtureId'] == saved['id'] and replay['filmSelection'] == saved['selection'] == 'fixed-before-outcomes'
        assert replay['fixtureRun'] == saved['run'] and replay['fixtureSeed'] == saved['seed'] == 3
        assert replay['fixtureFlip'] == saved['flip'] and replay['sourceSha256'] == film['sourceBefore']
        assert replay['initialSha256'] == saved['initialSha256'] and replay['profileSha256'] == saved['profileSha256']
        assert replay['physicalSha256'] == saved['observedSignature'] and replay['recordingVerified']
        assert replay['naturalResult'] == {k: v for k, v in result.items() if k not in ['frames', 'telemetry']}
        assert replay['eventDetails'] == result['events'] and replay['exchanges'] == saved['exchanges']
        assert replay['plan']['formation'] == saved['formation'] == 'ace_11' and replay['plan']['personnel'] == '11'
        assert replay['plan']['front'] == saved['front'] and replay['plan']['coverage'] == 'cover3'
        assert replay['plan']['defPersonnel'] == ('base34' if saved['front'] == 'odd' else 'base43')
        assert 'rushers' not in replay['plan'], 'Do not invent an unrecorded rusher count'
        assert replay['recordedPlayers'] == saved['players']
        assert replay['roster'] == [[p['team'], p['slot'], p['name'], p['jersey']] for p in saved['players']]
        assert replay['profiles'] == [{k: p[k] for k in ['position', 'heightIn', 'weightLb', 'ratings']} for p in saved['players']]
        assert replay['weights'] == [p['weightLb'] for p in saved['players']]
        assert replay['inspectedLineman'] == next(k for k,p in enumerate(saved['players']) if p['slot'] == 'RG')
        assert replay['frames']['t'] == [f['t'] for f in frames] and replay['frames']['c'] == [f['carrier'] for f in frames]
        for axis, field in [('p','agents'), ('b','ball'), ('s','carrierPosture')]:
            original = [x for frame in frames for x in frame[field]]
            assert len(original) == len(replay['frames'][axis])
            max_error = max(max_error, max(abs(a-b/10) for a,b in zip(original,replay['frames'][axis])))
        assert json.loads(gzip.decompress(base64.b64decode(replay['telemetry']['data']))) == result['telemetry']
        assert len(saved['exchanges']) == sum(e['type'] == 'block_exchange' for e in result['events'])
        for exchange in saved['exchanges']:
            assert exchange['event'] in result['events'] and exchange['event']['type'] == 'block_exchange'
            assert exchange['event']['t'] == exchange['t'] and exchange['physicsStepRecorded']
            assert abs(exchange['completedAt'] - exchange['t'] - .05) < 1e-8
            assert [s['slot'] for s in exchange['before']] == [s['slot'] for s in exchange['afterDecision']] == exchange['participants']
            assert [s['slot'] for s in exchange['loads']] == exchange['participants']
            assert exchange['physicalStateUnchangedAtDecision'] == ([(s['slot'],s['physical']) for s in exchange['before']] == [(s['slot'],s['physical']) for s in exchange['afterDecision']])
            assert exchange['physicalJointsUnchangedAtDecision'] == ([(s['slot'],s['joints']) for s in exchange['before']] == [(s['slot'],s['joints']) for s in exchange['afterDecision']])
            for cue in exchange['consumedImages']:
                assert cue['observer'] in [p['slot'] for p in saved['players']] and cue['target'] in [p['slot'] for p in saved['players']]
            actual_observer_records.append({'source': group, 'fixture': saved['id'], 't': exchange['t'],
                'initiator': exchange['observer'], 'participants': exchange['participants'],
                'actualObservers': sorted(set(c['observer'] for c in exchange['consumedImages'])),
                'bodyStateUnchangedAtDecision': exchange['physicalStateUnchangedAtDecision'],
                'physicalJointsUnchangedAtDecision': exchange['physicalJointsUnchangedAtDecision']})
assert max_error <= .050000001
for a,b in zip(films[0]['plays'],films[1]['plays']):
    for key in ['id','run','front','flip','seed','formation','selection','players','initialSha256','profileSha256']:
        assert a[key] == b[key], (a['id'],key)
    for key in ['agents','ball','carrier','carrierPosture']:
        assert a['result']['frames'][0][key] == b['result']['frames'][0][key]
zip_path = html_path.with_suffix('.zip')
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    info=zipfile.ZipInfo(html_path.name,(1980,1,1,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED
    z.writestr(info,html_path.read_bytes())
with zipfile.ZipFile(zip_path) as z:
    assert z.namelist() == [html_path.name] and z.read(html_path.name) == html_path.read_bytes() and z.testzip() is None
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(html_path.parent.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
errors=[]; clips=[]; videos=[]; inspections=[]
screenshots=Path('out/job-exchange/film'); screenshots.mkdir(parents=True,exist_ok=True)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1440,'height':1080})
        page.add_init_script("""window.__filmStamps=[];const old=CanvasRenderingContext2D.prototype.fillText;
          CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(String(text).startsWith('Film '))window.__filmStamps.push(String(text));return old.call(this,text,...args);};""")
        page.route('https://**',lambda route:route.abort()); page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/{html_path.name}')
        assert page.evaluate('async()=>await window.REPLAY_READY') and page.evaluate('async()=>await window.TELEMETRY_READY')
        assert page.locator('.play').count()==8 and page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
        for i,saved in enumerate(saved_all):
            replay=packed['plays'][i];page.locator(f'.play[data-i="{i}"]').click()
            if page.locator('#playbtn').inner_text()=='Pause':page.locator('#playbtn').click()
            assert page.evaluate('async()=>await window.TELEMETRY_READY')
            assert replay['id'] in page.locator('#clip-title').inner_text() and 'OL work exchange comparison' in page.locator('#dd').inner_text()
            assert page.locator('#inspect-player').input_value()==str(replay['inspectedLineman'])
            last=saved['result']['frames'][-1]['t']
            def seek(t):page.locator('#scrub').evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}))}',str(round(t/last*1000)))
            for exchange in saved['exchanges']:
                t=min(exchange['completedAt']+.02,last);seek(t)
                for slot in exchange['participants']:
                    idx=next(k for k,a in enumerate(saved['players']) if a['slot']==slot)
                    page.select_option('#inspect-player',str(idx))
                    page.wait_for_function("a=>{const e=document.querySelector('#work-exchanges');return e.dataset.fixture===a[0]&&e.dataset.slot===a[1]&&Math.abs(Number(e.dataset.time)-a[2])<.02&&e.textContent.includes('Completed native tick')}",arg=[replay['id'],slot,t])
                    text=page.locator('#work-exchanges').inner_text();state=next(a for a in exchange['afterDecision'] if a['slot']==slot)
                    assert slot+' at decision: '+state['plan']['kind']+' → '+state['plan']['target'] in text,text
                    own=[c for c in exchange['consumedImages'] if c['observer']==slot]
                    for cue in own:assert 'Actual observer '+slot+' saw '+cue['target'] in text,text
                    if not own:assert 'No consumed visual image recorded for '+slot in text,text
                    assert 'Arm impulse ' in text and 'ground impulse ' in text and 'Applied velocity intention ' in text
                    inspections.append({'id':replay['id'],'t':exchange['t'],'slot':slot,'actualObserverImagesAndIntentionInspected':True,'nativeCompletedLoadInspected':True,'text':text})
            assert page.locator('#event-details button').count()==len(saved['result']['events'])
            page.click('#copy-reference');assert page.locator('#play-reference').input_value().startswith('Film '+replay['sourceSha256'][:12]+' / '+replay['id'])
            if i in [0,4]:
                page.evaluate('()=>{window.__filmStamps=[]}');page.fill('#clip-start','0');page.fill('#clip-end','1')
                with page.expect_download(timeout=15000) as info:page.click('#export-video')
                download=info.value;assert replay['sourceSha256'][:12] in download.suggested_filename
                dest=screenshots/download.suggested_filename;download.save_as(dest)
                stamps=page.evaluate('()=>window.__filmStamps');assert dest.stat().st_size>0 and stamps
                assert all(s.startswith('Film '+replay['sourceSha256'][:12]+' · ') for s in stamps)
                videos.append({'id':replay['id'],'sourceSha256':replay['sourceSha256'],'filename':download.suggested_filename,'bytes':dest.stat().st_size,'sourceStampCorrect':True})
            clips.append({'id':replay['id'],'fullTelemetryReady':True,'eventsInspected':len(saved['result']['events']),'referenceSourceCorrect':True})
        page.click('#reset-filters');page.locator('.more-filters summary').click();page.select_option('#game-filter','1');assert page.locator('.play').count()==4
        page.click('#reset-filters');page.fill('#search',expected[0]);assert page.locator('.play').count()==2
        page.click('#reset-filters');page.select_option('#group-by','front');assert page.locator('.clip-group').count()==2
        page.select_option('#group-by','concept');assert page.locator('.clip-group').count()==2
        page.select_option('#group-by','coverage');assert page.locator('.clip-group').count()==1
        page.screenshot(path=str(screenshots/'film-room-desktop.png'),full_page=True)
        page.set_viewport_size({'width':390,'height':844});assert page.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth')
        page.screenshot(path=str(screenshots/'film-room-mobile.png'),full_page=True);assert not errors,errors
        browser.close()
finally:server.shutdown();server.server_close()
browser_check={'schema':'ol-work-exchange-browser-v1','clips':clips,'pageErrors':errors,'externalHttpsBlocked':True,
  'recordedSourceFilter':True,'pairedFixtureSearch':True,'frontConceptCoverageGrouping':True,'mobileNoHorizontalOverflow':True,
  'videoExport':videos,'actualObserverExchangeInspections':inspections}
repo=Path(__file__).resolve().parents[4]
integrity={'schema':'ol-work-exchange-film-integrity-v1','clips':8,'predeterminedClips':8,'naturalFinishes':8,
  'sourceComparison':packed['meta']['sourceComparison'],'eightObserverControlsNeutral':True,'exactFullTelemetry':True,
  'exactEventsPlayersProfilesRatingsWeights':True,'exactNativeExchangeAndCompletedStepRecords':True,
  'crossSourceProfilesInitialStatesAndPositionsMatch':True,'maxExistingPackingPositionFacingError':max_error,
  'actualObserverRecords':actual_observer_records,'zipHtmlByteExact':True,
  'htmlSha256':hashlib.sha256(html_path.read_bytes()).hexdigest(),'zipSha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),
  'checkerSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
  'toolSha256':{s:hashlib.sha256((repo/s).read_bytes()).hexdigest() for s in ['scripts/diag/ol-exchange-witness.ts','scripts/export-ol-exchange.ts','scripts/replay-data.ts','scripts/replay-telemetry-packing.ts','viewer/replay.template.html']}}
(output_dir/'browser-check.json').write_text(json.dumps(browser_check,indent=2)+'\n')
(output_dir/'film-integrity.json').write_text(json.dumps(integrity,indent=2)+'\n')
print(json.dumps({'clips':8,'exchangePlayerInspections':len(inspections),'videoChecks':len(videos),'pageErrors':errors,'integrity':integrity},indent=2))
