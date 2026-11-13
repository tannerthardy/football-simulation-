import hashlib
import json
import threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path('/workspace/football-simulation-')
folder = root / 'out/decision-awareness/checks'
html = root / 'viewer/decision-awareness.html'
errors = []
checks = []
class LocalFiles(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(LocalFiles, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = 'http://127.0.0.1:' + str(server.server_port)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                               args=['--no-sandbox', '--disable-dev-shm-usage'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1100}, accept_downloads=True)
    context.route('http://**/*', lambda route: route.continue_() if route.request.url.startswith(origin + '/') else route.abort())
    context.route('https://**/*', lambda route: route.abort())
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(origin + '/viewer/decision-awareness.html', wait_until='load')
    page.wait_for_function("document.querySelectorAll('#list .play').length === 20")
    assert page.title() == 'Awareness and commitment: controlled run comparison'
    ids = page.evaluate('REPLAY.plays.map(p => p.id)')
    assert len(ids) == 20 and len(set(ids)) == 20
    for i, identifier in enumerate(ids):
        page.locator(f'#list .play[data-i="{i}"]').click()
        page.wait_for_function('(id) => document.querySelector("#clip-title").textContent.includes(id)', arg=identifier)
        page.locator('#scrub').evaluate("e => { e.value=500; e.dispatchEvent(new Event('input', {bubbles:true})); }")
        page.wait_for_function("document.querySelector('#ownership-state').textContent.includes('After tick')")
        reference = page.locator('#play-reference').input_value()
        source = page.evaluate('(i) => REPLAY.plays[i].sourceSha256', i)
        assert source[:12] in reference and identifier in reference
        row = page.evaluate('(i) => ({id:REPLAY.plays[i].id, source:REPLAY.plays[i].sourceSha256, full:REPLAY.plays[i].telemetry.level, roster:REPLAY.plays[i].roster.length, outcome:REPLAY.plays[i].naturalResult.outcome})', i)
        assert row['full'] == 'full' and row['roster'] == 22 and row['outcome'] != 'timeout'
        assert page.locator('#ownership-state').get_attribute('data-fixture') == identifier
        row['sourceReferenceAndCompletedTickVisible'] = True
        checks.append(row)
    page.locator('#group-by').select_option('front')
    assert page.locator('#list .clip-group').count() == 4
    page.locator('details.more-filters > summary').click()
    page.locator('#game-filter').select_option('1')
    assert page.locator('#list .play').count() == 10
    page.locator('#reset-filters').click()
    assert page.locator('#list .play').count() == 20
    page.locator('#list .play[data-i="10"]').click()
    for layer in ('assignments', 'movement', 'contact', 'perception'):
        page.locator('#layer-' + layer).check()
    page.locator('#clip-start').fill('0')
    page.locator('#clip-end').fill('0.3')
    with page.expect_download(timeout=20000) as download:
        page.locator('#export-video').click()
    file = folder / 'smoke-clip.webm'
    download.value.save_as(file)
    assert file.read_bytes()[:4] == bytes.fromhex('1a45dfa3')
    assert not errors, errors
    result = {'schema':'current-run-viewer-smoke-v1', 'htmlSha256':hashlib.sha256(html.read_bytes()).hexdigest(),
              'method':'Local loopback HTTP in installed Chromium; all external HTTP/HTTPS requests blocked; all20clips checked after seek, source references and completed OL inspection; source/front filters, four layers and short WebM download exercised.',
              'clips':checks, 'pageErrors':errors, 'downloadBytes':file.stat().st_size,
              'limitations':['Smoke check is not a football realism judgment or cross-browser codec guarantee.', 'Direct file navigation is blocked by managed Chromium policy; file:// not verified.']}
    (folder/'browser.json').write_text(json.dumps(result,indent=2)+'\n')
    browser.close()
server.shutdown()
print(json.dumps({'clips':len(checks), 'pageErrors':errors, 'webmBytes':file.stat().st_size}))
