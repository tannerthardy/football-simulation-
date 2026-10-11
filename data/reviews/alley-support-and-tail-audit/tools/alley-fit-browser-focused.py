"""Focused offline checks of this saved-only eight-clip component film."""
import argparse
import hashlib
import json
import subprocess
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import quote
from playwright.sync_api import sync_playwright

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

parser = argparse.ArgumentParser()
parser.add_argument('html', type=Path)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
html = args.html.resolve(strict=True)
args.out.mkdir(parents=True, exist_ok=True)
errors, checks = [], []
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(html.parent)))
Thread(target=server.serve_forever, daemon=True).start()
started = time.monotonic()
receipt = {'html': str(html), 'htmlSha256': hashlib.sha256(html.read_bytes()).hexdigest(),
           'browserToolSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
           'scope': 'Focused paired-film selection, playback, full inspection and WebM checks; does not replace all legacy viewer regression tests.'}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1080})
        page.route('https://**', lambda route: route.abort())
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/{quote(html.name)}')
        assert page.evaluate('async () => await window.REPLAY_READY')
        def pause():
            if page.locator('#playbtn').inner_text() == 'Pause':
                page.click('#playbtn')
        pause()
        assert page.evaluate('async () => await window.TELEMETRY_READY')
        meta = page.evaluate('''() => ({meta:REPLAY.meta, plays:REPLAY.plays.map(p => ({id:p.id, fixtureId:p.fixtureId,
            sourceSha256:p.sourceSha256, sourceMethod:p.sourceMethod, fixtureSeed:p.fixtureSeed,
            nativeGameContext:p.nativeGameContext, first:p.frames.t[0], last:p.frames.t.at(-1),
            concept:p.concept, plan:p.plan}))})''')
        assert [clip['id'] for clip in meta['plays']] == ['B-G4-P127','A-G4-P127','B-G3-P099','A-G3-P099','B-G4-P012','A-G4-P012','B-G2-P188','A-G2-P188']
        assert page.locator('.play').count() == 8
        assert 'component counterfactual' in page.locator('#cohort-note').inner_text()
        assert page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
        checks.append('All four paired native witnesses retained; component method explicit and end-to-end game scoreboard hidden')
        def indices():
            return page.locator('.play').evaluate_all('(rows) => rows.map(r => Number(r.dataset.i))')
        for group in ['concept', 'front', 'coverage', 'formation', 'game']:
            page.select_option('#group-by', group)
            assert sorted(indices()) == list(range(8))
        checks.append('Every grouping mode preserves all eight clips')
        inspected = []
        for index, clip in enumerate(meta['plays']):
            page.locator(f'.play[data-i="{index}"]').click()
            pause()
            assert page.evaluate('async () => await window.TELEMETRY_READY')
            assert clip['id'] in page.locator('#clip-title').inner_text()
            assert f"seed {clip['fixtureSeed']}" in page.locator('#clock').inner_text()
            assert f"Native Game {clip['nativeGameContext']['game']}" in page.locator('#result').inner_text()
            page.wait_for_function('(source) => document.getElementById("play-reference").value.includes(source)', arg=clip['sourceSha256'][:12], timeout=5000)
            frame_info = page.evaluate('(i) => ({level:REPLAY.plays[i].telemetry.level, count:REPLAY.plays[i].telemetry.frames.length, first:REPLAY.plays[i].telemetry.frames[0].t, agents:REPLAY.plays[i].telemetry.frames[0].agents.length})',index)
            assert frame_info['level'] == 'full' and frame_info['agents'] == 22 and frame_info['first'] == clip['first']
            page.select_option('#inspect-player','20')
            page.locator('#event-jumps button').last.click()
            assert 'State sampled at' in page.locator('#inspector-state').inner_text()
            assert 'Footwork support available' in page.locator('#inspector-state').inner_text()
            inspected.append({'id':clip['id'], 'telemetryFrames':frame_info['count'], 'firstRecordedTime':clip['first'], 'source':clip['sourceSha256']})
        assert meta['plays'][6]['first'] == meta['plays'][7]['first'] == -0.8
        checks.append('Each clip decodes full real telemetry, native Game context and per-clip source; FS support inspection works and Toss motion starts at -0.8 s')
        page.click('#reset-filters')
        page.select_option('#coverage-filter','cover3')
        assert indices() == [4,5]
        page.click('#watch'); pause()
        page.click('#next'); pause()
        assert page.locator('.play[aria-current]').get_attribute('data-i') == '5'
        page.click('#prev'); pause()
        assert page.locator('.play[aria-current]').get_attribute('data-i') == '4'
        page.click('#reset-filters')
        if not page.locator('#search').is_visible():
            page.locator('.more-filters summary').click()
        page.fill('#search','A-G4-P127')
        assert indices() == [1]
        checks.append('Coverage filtering, watch selection, next/previous and exact clip-ID search preserve the intended pair/source')
        page.click('#reset-filters')
        page.locator('.play[data-i="1"]').click(); pause()
        assert page.evaluate('async () => await window.TELEMETRY_READY')
        page.select_option('#inspect-player','20')
        for layer in ['assignments','movement','contact','perception']:
            assert page.locator('#layer-'+layer).is_enabled()
            page.check('#layer-'+layer)
        page.click('#restart'); pause()
        before = page.locator('#play-reference').input_value()
        page.click('#playbtn')
        page.wait_for_function('(before) => document.getElementById("play-reference").value !== before',arg=before,timeout=5000)
        pause()
        page.screenshot(path=str(args.out/'desktop.png'),full_page=True)
        checks.append('Recorded movement advances during playback with all four inspection layers enabled')
        page.fill('#clip-start','0'); page.fill('#clip-end','1.2')
        saved = page.locator('#play-reference').input_value()
        with page.expect_download(timeout=15000) as download_info:
            page.click('#export-video')
            assert page.locator('#next').is_disabled() and page.locator('#scrub').is_disabled()
        download = download_info.value
        video_path = args.out/'alley-fit-sample.webm'
        download.save_as(str(video_path))
        page.wait_for_function('document.getElementById("export-status").textContent.startsWith("Downloaded")')
        page.wait_for_function('(value) => document.getElementById("play-reference").value === value',arg=saved)
        assert 'A-G4-P127' in download.suggested_filename and meta['plays'][1]['sourceSha256'][:12] in download.suggested_filename
        probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','stream=codec_name,width,height,nb_read_frames','-of','json',str(video_path)],text=True))['streams'][0]
        assert probe['codec_name'] in ['vp8','vp9'] and probe['width']==1280 and probe['height']==840 and int(probe['nb_read_frames'])>=20
        checks.append('Real 1.2-second WebM download decodes at 1280x840 with correct clip/source filename and restores replay position')
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(args.out/'mobile.png'),full_page=True)
        assert page.locator('#clip-title').is_visible()
        checks.append('Mobile viewport renders the selected clip and inspector')
        assert not errors, errors
        receipt.update({'status':'passed','checks':checks,'clips':inspected,'video':probe,'videoBytes':video_path.stat().st_size,'browserErrors':errors,'wallSeconds':round(time.monotonic()-started,3)})
        browser.close()
except BaseException as error:
    receipt.update({'status':'failed','checks':checks,'browserErrors':errors,'error':str(error),'wallSeconds':round(time.monotonic()-started,3)})
    raise
finally:
    server.shutdown()
    (args.out/'check.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2))
