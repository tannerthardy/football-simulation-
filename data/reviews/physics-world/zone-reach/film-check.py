"""Verify saved ordinary OL films and browser behavior without resimulation.

python3 film-check.py BEFORE-film.json.gz AFTER-film.json.gz FILM.html OUTPUT_DIR
Matching BEFORE.json.gz / AFTER.json.gz panel companions are required.
Retained film-before / film-after also accept panel-before / panel-after.
"""
import base64, functools, gzip, hashlib, json, re, sys, threading, zipfile
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

before_path, after_path, html_path, output_dir = map(Path, sys.argv[1:5])
output_dir.mkdir(parents=True, exist_ok=True)
film_paths = [before_path, after_path]
report_paths = [p.with_name(p.name.replace('film-', 'panel-', 1)) if p.name.startswith('film-')
                else Path(str(p).replace('-film.json.gz', '.json.gz')) for p in film_paths]
films = [json.loads(gzip.decompress(p.read_bytes())) for p in film_paths]
reports = [json.loads(gzip.decompress(p.read_bytes())) for p in report_paths]
expected_sources = [
    'a629d4d04485ade21e4354b8078ed6cd0bf56b155aa92b83dad7f97cc2d8172f',
    'cf53e3f0e72915d9798ed0cd411f669ae8bba40db9ed4bd9f6b630173f939316',
]
assert [f['sourceBefore'] for f in films] == expected_sources
assert [r['sourceBefore'] for r in reports] == expected_sources
assert expected_sources[0] != expected_sources[1]
match = re.search(r'const REPLAY = (\{[^\n]*\});', html_path.read_text())
assert match, 'Embedded replay JSON missing'
packed = json.loads(match.group(1).replace('<\\/', '</'))
zone_ids = [f'ZR-R1-{run}-over-{side}-S3' for run in ['oz_strong', 'wz_strong'] for side in ['R', 'L']]
controls = [('iz_strong', 'over', 3), ('duo', 'odd', 11), ('power', 'under', 3), ('counter', 'tite', 11)]
control_ids = [f'ZR-R1-{run}-{front}-{side}-S{seed}' for run, front, seed in controls for side in ['R', 'L']]
expected = zone_ids + control_ids
assert len(packed['plays']) == 24
assert reports[0]['cohort'] == reports[1]['cohort']
assert reports[0]['collectorSha256'] == reports[1]['collectorSha256']
assert reports[0]['moduleSha256']['src/physics/world.ts'] == reports[1]['moduleSha256']['src/physics/world.ts']
assert packed['meta']['filmSchema'] == 'zone-reach-comparison-v1'
assert 'selected' not in packed['meta']['cohort'].lower() or 'before outcomes' in packed['meta']['cohort'].lower()
for a, b in zip(reports[0]['trials'], reports[1]['trials']):
    for key in ['id', 'profileSha256']:
        assert a[key] == b[key], (a['id'], key)
    assert a['control'] == b['control']
    if a['control']:
        assert a['observedSignature'] == b['observedSignature'], (a['id'], 'installed control execution changed')
saved_all = []; max_error = 0; natural = 0; stale_states = []; cancellations = []
zone_read_origins = 0; zone_read_snapshots = 0
for group, (film, report, film_path, report_path) in enumerate(zip(films, reports, film_paths, report_paths)):
    assert film['schema'] == 'zone-reach-film-v1' and report['schema'] == 'zone-reach-review-v1'
    assert film['sourceBefore'] == film['sourceAfter'] == report['sourceBefore'] == report['sourceAfter']
    assert film['collectorSha256'] == report['collectorSha256']
    assert [p['id'] for p in film['plays']] == report['filmIds'] == expected
    assert report['summary']['observerVerifiedCount'] == report['summary']['snaps'] == 48
    assert len(report['trials']) == 48
    assert all(r['observerVerified'] and r['observedSignature'] == r['plainSignature'] for r in report['trials'])
    comparison = packed['meta']['sourceComparison'][group]
    assert comparison['sourceSha256'] == film['sourceBefore']
    assert comparison['collectorSha256'] == film['collectorSha256']
    assert comparison['cohortSha256'] == hashlib.sha256(json.dumps(report['cohort'], separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
    assert comparison['filmRawSha256'] == hashlib.sha256(film_path.read_bytes()).hexdigest()
    assert comparison['reportRawSha256'] == hashlib.sha256(report_path.read_bytes()).hexdigest()
    assert comparison['moduleSha256'] == report['moduleSha256']
    assert comparison['observerChecks'] == [{key: r[key] for key in [
        'id', 'initialSha256', 'profileSha256', 'observedSignature', 'plainSignature']} for r in report['trials']]
    for saved, replay in zip(film['plays'], packed['plays'][group*12:(group+1)*12]):
        saved_all.append(saved); result = saved['result']; frames = result['frames']
        row = next(r for r in report['trials'] if r['id'] == saved['id'])
        assert replay['id'] == ('BEFORE-' if group == 0 else 'FINAL-') + saved['id']
        assert replay['fixtureId'] == saved['id'] and replay['filmSelection'] == saved['selection'] == ('installed-negative-control' if saved['id'] in control_ids else 'fixed-before-outcomes')
        assert saved['roster'] == 0
        assert replay['installedControl'] == row['control'] == (saved['id'] in control_ids)
        assert replay['fixtureFormation'] == row['formation'] == replay['plan']['formation'] == 'ace_11'
        assert replay['olMetrics'] == row['olMetrics']
        assert replay['plan']['personnel'] == '11' and replay['plan']['qb'] == 'under'
        assert replay['plan']['front'] == saved['front']
        assert replay['plan']['defPersonnel'] == ('base34' if saved['front'] in ['odd', 'tite'] else 'base43')
        assert 'rushers' not in replay['plan'], 'Do not invent a rusher count missing from saved records'
        if saved['id'] in control_ids:
            assert 'Installed control' in replay['call'] and 'installed nonzone control' in replay['text']
        assert replay['fixtureSeed'] == saved['seed'] and replay['fixtureFlip'] == saved['flip']
        assert replay['fixtureRun'] == saved['run'] and replay['sourceSha256'] == film['sourceBefore']
        assert replay['initialSha256'] == row['initialSha256'] and replay['profileSha256'] == row['profileSha256']
        assert replay['physicalSha256'] == row['observedSignature'] == row['plainSignature']
        assert replay['naturalResult'] == {k: v for k, v in result.items() if k not in ['frames', 'telemetry']}
        assert replay['naturalResult'] == row['result'] and result['outcome'] != 'timeout'
        assert saved['trace'][-1]['phase'] == 'dead'
        assert abs(saved['trace'][-1]['t'] + .05 - result['duration']) < 1e-8
        assert replay['flags']['complete'] == bool(result['stats'].get('completed'))
        assert replay['flags']['to'] == bool(result['stats'].get('interceptedBy') or result['stats'].get('fumbleLost'))
        assert replay['frames']['t'] == [f['t'] for f in frames]
        assert replay['frames']['c'] == [f['carrier'] for f in frames]
        for axis, field in [('p', 'agents'), ('b', 'ball'), ('s', 'carrierPosture')]:
            original = [x for frame in frames for x in frame[field]]
            assert len(original) == len(replay['frames'][axis])
            max_error = max(max_error, max(abs(a-b/10) for a, b in zip(original, replay['frames'][axis])))
        assert json.loads(gzip.decompress(base64.b64decode(replay['telemetry']['data']))) == result['telemetry']
        assert replay['eventDetails'] == result['events']
        assert replay['recordedPlayers'] == saved['players']
        assert replay['profiles'] == [{key: p[key] for key in ['position', 'heightIn', 'weightLb', 'ratings']} for p in saved['players']]
        assert replay['weights'] == [p['weightLb'] for p in saved['players']]
        assert replay['roster'] == [[p['team'], p['slot'], p['name'], p['jersey']] for p in saved['players']]
        expected_trace = []
        original_updates = {(u['observer'], round(u['t'], 9)): u
                            for tick in saved['trace'] for u in tick['updates']}
        verified_reads = set()
        for tick in saved['trace']:
            states = [{k: member[k] for k in ['slot', 'plan', 'engagement', 'tags']} for member in tick['after']]
            transitions = [{key: u[key] for key in ['t', 'observer', 'classification', 'changedTargets', 'staleMembersAfter',
                            'before', 'after', 'oldCombinationAfter', 'requested', 'events', 'consumedImages']}
                           | {'beforePlan': u['beforeBody']['plan'], 'afterPlan': u['afterBody']['plan']}
                           for u in tick['updates'] if u['classification'] != 'no-target-change'
                           or u['beforeBody']['plan']['kind'] != u['afterBody']['plan']['kind']]
            expected_trace.append({'t': tick['t'], 'achievedAt': tick['t']+.05, 'phase': tick['phase'],
                                   'members': states, 'loads': tick['deliveredStep'], 'transitions': transitions,
                                   'reads': [{k: u[k] for k in ['t', 'observer', 'requested', 'targetGeometry', 'zoneReadChanged']}
                                             | {'actorAtRead': {k: u['beforeBody'][k] for k in ['pos', 'vel']},
                                                'consumedZoneImages': u['consumedImages'] if u['zoneReadChanged'] else []}
                                             for u in tick['updates'] if u['observer'] in ['LT', 'LG', 'C', 'RG', 'RT']]})
            for state in states:
                plan = state['plan']; combo = plan and plan['combination']
                zone = plan and plan.get('zoneRead')
                if zone:
                    zone_read_snapshots += 1
                    origin_key = (state['slot'], round(zone['t'], 9))
                    if origin_key not in verified_reads:
                        origin = original_updates[origin_key]
                        assert origin['zoneReadChanged'], (saved['id'], origin_key, 'read origin did not change its stored read')
                        assert origin['afterBody']['plan']['zoneRead'] == zone
                        target_slot = saved['players'][zone['target']]['slot']
                        assert any(image['target'] == target_slot and image['image'] == zone['seen']
                                   for image in origin['consumedImages']), (saved['id'], origin_key, 'stored read differs from consumed target image')
                        verified_reads.add(origin_key); zone_read_origins += 1
                if combo and not combo['released'] and plan['target'] != combo['defender']:
                    stale_states.append({'group': group, 'fixture': saved['id'], 'slot': state['slot'], 't': tick['t'],
                                         'target': plan['target'], 'comboDefender': combo['defender']})
            cancellations.extend({'group': group, 'fixture': saved['id'], 'observer': u['observer'], 't': u['t']}
                                 for u in transitions if u['classification'] == 'cancelled-combination')
        assert replay['ownershipTrace'] == expected_trace
        for event in result['events']:
            if event['type'] == 'block_abandon':
                assert any(kind == 'block_abandon' and abs(time-event['t']) <= .0050001 for time, kind in replay['ev'])
        natural += 1
assert max_error <= .050000001
assert not stale_states, 'Neither source should reintroduce the previous ownership bug'
for i in range(12):
    for key in ['id', 'selection', 'roster', 'run', 'front', 'flip', 'seed', 'offCall', 'defCall', 'los', 'firstDownX', 'players']:
        assert saved_all[i][key] == saved_all[i+12][key], (expected[i], key)
    for key in ['agents', 'ball', 'carrier', 'carrierPosture']:
        assert saved_all[i]['result']['frames'][0][key] == saved_all[i+12]['result']['frames'][0][key]
zip_path = html_path.with_suffix('.zip')
with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    info = zipfile.ZipInfo(html_path.name, (1980, 1, 1, 0, 0, 0)); info.compress_type = zipfile.ZIP_DEFLATED
    z.writestr(info, html_path.read_bytes())
with zipfile.ZipFile(zip_path) as z:
    assert z.namelist() == [html_path.name] and z.read(html_path.name) == html_path.read_bytes() and z.testzip() is None
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(html_path.parent.resolve())))
threading.Thread(target=server.serve_forever, daemon=True).start()
errors = []; clips = []; videos = []; ownership_checks = []
screenshots = Path('out/zone-fit/film'); screenshots.mkdir(parents=True, exist_ok=True)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1080})
        page.add_init_script("""window.__filmStamps=[];
            const originalFillText=CanvasRenderingContext2D.prototype.fillText;
            CanvasRenderingContext2D.prototype.fillText=function(text,...args){
              if(String(text).startsWith('Film '))window.__filmStamps.push(String(text));
              return originalFillText.call(this,text,...args);
            };""")
        page.route('https://**', lambda route: route.abort())
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/{html_path.name}')
        assert page.evaluate('async()=>await window.REPLAY_READY') and page.evaluate('async()=>await window.TELEMETRY_READY')
        assert page.locator('.play').count() == 24 and page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
        for i, saved in enumerate(saved_all):
            replay = packed['plays'][i]; page.locator(f'.play[data-i="{i}"]').click()
            if page.locator('#playbtn').inner_text() == 'Pause': page.locator('#playbtn').click()
            assert page.evaluate('async()=>await window.TELEMETRY_READY')
            assert replay['id'] in page.locator('#clip-title').inner_text()
            assert 'controlled zone reach comparison' in page.locator('#dd').inner_text()
            assert page.locator('#inspect-player').input_value() == str(replay['inspectedLineman'])
            for layer in ['assignments', 'movement', 'contact', 'perception']:
                if page.locator('#layer-'+layer).is_enabled(): page.locator('#layer-'+layer).check()
            last_t = saved['result']['frames'][-1]['t']
            seek = lambda time: page.locator('#scrub').evaluate(
                '(el,value)=>{el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}))}', str(round(time/last_t*1000)))
            seek(min(.75, last_t))
            page.wait_for_function("(id)=>{const e=document.querySelector('#ownership-state');return e.dataset.fixture===id&&Number(e.dataset.time)>.5&&e.textContent.includes('After tick')}", arg=replay['id'])
            assert 'Body state' in page.locator('#inspector-state').inner_text()
            assert 'Actual engagement' in page.locator('#ownership-state').inner_text() or 'No actual block engagement' in page.locator('#ownership-state').inner_text()
            assert 'Arm impulse' in page.locator('#ownership-state').inner_text()
            assert page.locator('#event-details button').count() == len(saved['result']['events'])
            if saved['id'] == zone_ids[2]:
                seek(.45)
                page.wait_for_function("(id)=>{const e=document.querySelector('#ownership-state');return e.dataset.fixture===id&&Math.abs(Number(e.dataset.time)-.45)<.02}", arg=replay['id'])
                text = page.locator('#ownership-state').inner_text()
                assert 'Physical contacts 0' in text and 'surviving hand joints 0' in text, text
                assert 'Arm impulse 0.00' in text and 'ground impulse' in text, text
                if i < 12:
                    assert 'No stored zone-read record' in text
                else:
                    assert 'Stored zone phase' in text and 'Consumed delayed visual image' in text and 'Relative hip at that read' in text
                    assert 'Intended contact surface aim' in text and 'Current-envelope outward-step estimate' in text
                ownership_checks.append({'id': replay['id'], 'sourceSha256': replay['sourceSha256'],
                                         'fixedWideZoneRGInspected': True, 'inspectedTime': .45,
                                         'zeroEarlyContactsAndHands': True, 'actualGroundImpulseShown': True,
                                         'controllerIntentionSeparatedFromActualLoad': True, 'inspectedText': text})
            if i >= 12 and saved['id'] == zone_ids[1]:
                seek(.9)
                page.wait_for_function("(id)=>{const e=document.querySelector('#ownership-state');return e.dataset.fixture===id&&Math.abs(Number(e.dataset.time)-.9)<.02}", arg=replay['id'])
                text = page.locator('#ownership-state').inner_text()
                assert 'Stored zone phase runoff' in text and 'surface frame -1.00, 0.00' in text, text
                assert 'Actual engagement:' in text and 'surviving hand joints 1' in text, text
                assert 'Arm impulse 0.00' not in text, text
                ownership_checks.append({'id': replay['id'], 'sourceSha256': replay['sourceSha256'],
                                         'fixedOutsideZoneRGContactInspected': True, 'inspectedTime': .9,
                                         'stableSurfaceFrameSeparateFromDisplacement': True,
                                         'runoffIntentionSeparatedFromActualContact': True, 'inspectedText': text})
            if i >= 12 and saved['id'] == zone_ids[3]:
                seek(3.36)
                lg = next(k for k, player in enumerate(saved['players']) if player['slot'] == 'LG')
                page.select_option('#inspect-player', str(lg))
                page.wait_for_function("(id)=>{const e=document.querySelector('#ownership-state');return e.dataset.fixture===id&&Math.abs(Number(e.dataset.time)-3.36)<.02&&e.textContent.includes('LG reach')}", arg=replay['id'])
                text = page.locator('#ownership-state').inner_text()
                assert 'After tick 3.30–3.35s' in text and 'Actual engagement: LG → DT_S' in text, text
                assert 'surface frame -0.49, -0.87' in text and 'frame seal target -0.14' in text, text
                assert 'world-lateral seal target -0.30 (intent)' in text, text
                assert 'surviving hand joints 1' in text and 'Arm impulse 37.22' in text, text
                ownership_checks.append({'id': replay['id'], 'sourceSha256': replay['sourceSha256'],
                                         'fixedWideZoneLGAcquiredLegacyFrameInspected': True, 'inspectedTime': 3.36,
                                         'preservedNonverticalFrameAndRealHandsShown': True,
                                         'worldLateralIntentSeparatedFromFrameProjection': True, 'inspectedText': text})
            page.click('#copy-reference')
            assert page.locator('#play-reference').input_value().startswith('Film '+replay['sourceSha256'][:12]+' / '+replay['id'])
            if i in [0, 12]:
                page.evaluate('()=>{window.__filmStamps=[]}')
                page.fill('#clip-start', '0'); page.fill('#clip-end', '1')
                with page.expect_download(timeout=15000) as info: page.click('#export-video')
                download = info.value
                assert replay['sourceSha256'][:12] in download.suggested_filename
                video_path = screenshots / download.suggested_filename; download.save_as(video_path)
                assert video_path.stat().st_size > 0
                stamps = page.evaluate('()=>window.__filmStamps')
                assert stamps and all(stamp.startswith('Film '+replay['sourceSha256'][:12]+' · ') for stamp in stamps)
                videos.append({'id': replay['id'], 'selectedSourceSha256': replay['sourceSha256'],
                               'downloadFilename': download.suggested_filename, 'nonemptyBytes': video_path.stat().st_size,
                               'paintedStampUsesSelectedSource': True, 'sampleStamp': stamps[0]})
            clips.append({'id': replay['id'], 'fullTelemetry': True, 'naturalFinish': True,
                          'recordedOwnershipAndDeliveredLoadsInspected': True, 'rawEventCount': len(saved['result']['events']),
                          'copiedReferenceUsesSelectedEngineSource': True})
        page.click('#reset-filters'); page.select_option('#outcome-filter', 'stuff')
        assert page.locator('.play').count() == sum(p['flags']['stuff'] for p in packed['plays'])
        page.click('#reset-filters'); page.locator('.more-filters summary').click(); page.fill('#search', expected[0])
        assert page.locator('.play').count() == 2
        page.click('#reset-filters'); page.fill('#search', 'Installed control')
        assert page.locator('.play').count() == 16
        page.click('#reset-filters'); page.select_option('#game-filter', '1'); assert page.locator('.play').count() == 12
        page.select_option('#game-filter', 'all'); page.select_option('#front-filter', 'odd')
        assert page.locator('.play').count() == 4
        page.click('#reset-filters'); page.select_option('#group-by', 'front')
        assert page.locator('.clip-group').count() == 4
        page.select_option('#group-by', 'concept')
        assert page.locator('.clip-group').count() == 6
        page.select_option('#group-by', 'coverage'); assert page.locator('.clip-group').count() == 1
        page.screenshot(path=str(screenshots/'film-room-desktop.png'), full_page=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        assert page.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth')
        page.screenshot(path=str(screenshots/'film-room-mobile.png'), full_page=True)
        assert not errors, errors
        browser.close()
finally:
    server.shutdown(); server.server_close()
browser_check = {'schema': 'zone-reach-browser-smoke-v1', 'clips': clips, 'pageErrors': errors,
                 'offlineFontsBlocked': True, 'stuffFilterUsesRecordedResults': True, 'pairedFixtureSearch': True,
                 'installedControlsLabelledAndSearchable': True, 'frontFilterAndGrouping': True,
                 'recordedSourceFilter': True, 'conceptAndCoverageGrouping': True, 'mobileNoHorizontalOverflow': True,
                 'copiedReferenceUsesSelectedEngineSource': True, 'videoExportUsesSelectedEngineSource': videos,
                 'nativeOwnershipBeforeAfterInspected': ownership_checks}
integrity = {'schema': 'zone-reach-film-integrity-v1', 'clips': 24, 'predeterminedClips': 24, 'zoneClips': 8, 'installedControlClips': 16,
             'sourceComparison': packed['meta']['sourceComparison'], 'exactFullTelemetry': True,
             'exactRawEventsActorsNotesTimes': True, 'exactPlayersProfilesRatingsWeights': True,
             'exactNativeOwnershipAndDeliveredLoads': True, 'crossSourceProfilesAndInitialPositionsMatch': True,
             'all48ObserverControlsPerPhaseNeutral': True, 'naturalFinishes': natural, 'inspectionCensors': 0,
             'allEightInstalledControlsExecutionExact': True,
             'storedZoneReadOriginsAndConsumedImagesExact': True,
             'storedZoneReadOriginsVerified': zone_read_origins, 'storedZoneReadSnapshotsVerified': zone_read_snapshots,
             'recordedFrameTimesAndPossession': True, 'maxExistingPackingPositionFacingError': max_error,
             'baselineStaleStates': 0, 'candidateStaleStates': 0, 'recordedCancellations': cancellations,
             'zipHtmlByteExact': True, 'htmlSha256': hashlib.sha256(html_path.read_bytes()).hexdigest(),
             'zipSha256': hashlib.sha256(zip_path.read_bytes()).hexdigest(),
             'checkerSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
repo = Path(__file__).resolve().parents[4]
integrity['exportToolSha256'] = {path: hashlib.sha256((repo/path).read_bytes()).hexdigest() for path in [
    'scripts/export-zone-reach.ts', 'scripts/replay-data.ts', 'scripts/replay-telemetry-packing.ts', 'viewer/replay.template.html']}
(output_dir/'browser-check.json').write_text(json.dumps(browser_check, indent=2)+'\n')
(output_dir/'film-integrity.json').write_text(json.dumps(integrity, indent=2)+'\n')
print(json.dumps({'browser': browser_check, 'integrity': integrity}, indent=2))
