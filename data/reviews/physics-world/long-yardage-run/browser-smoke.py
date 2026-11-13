from pathlib import Path
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright

out = Path('out/long-yardage-run/browser')
out.mkdir(parents=True, exist_ok=True)
errors, checks = [], []
replay = Path('viewer/long-yardage-runs.html').resolve()
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(replay.parent)))
Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1080})
    page.route('https://**', lambda route: route.abort())
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(f'http://127.0.0.1:{server.server_port}/{replay.name}')
    assert page.evaluate('async()=>await window.REPLAY_READY')
    assert page.evaluate('async()=>await window.TELEMETRY_READY')
    assert page.locator('.play').count() == 4
    assert '3rd & 27' in page.locator('#dd').inner_text()
    assert page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
    assert 'Q0' not in page.locator('#list').inner_text()
    checks.append('Four fixed controlled clips load offline with third&27 and no invented game clock/score')
    for index in range(4):
        page.locator(f'.play[data-i="{index}"]').click()
        assert page.evaluate('async()=>await window.TELEMETRY_READY')
        for name in ['assignments', 'contact', 'movement']:
            page.locator('#layer-' + name).check()
        for slot in ['DE_W', 'LB_M', 'FS', 'SS', 'RB']:
            idx = page.evaluate(f'REPLAY.plays[{index}].roster.findIndex(a=>a[1]=="{slot}")')
            page.select_option('#inspect-player', str(idx))
            page.locator('#scrub').evaluate('(el)=>{el.value=500;el.dispatchEvent(new Event("input",{bubbles:true}));}')
            page.wait_for_function('(s)=>document.getElementById("inspector-title").textContent.startsWith(s+" #")', arg=slot)
            assert page.locator('#inspect-player').input_value() == str(idx)
            assert page.locator('#inspector-title').inner_text()
            assert page.locator('#inspector-state').inner_text()
        assert '12 yd' in page.locator('#result').inner_text()
        assert '27-yard line to gain' in page.locator('#result').inner_text()
        assert 'seed 3' in page.locator('#clock').inner_text()
        clip_id = page.evaluate(f'REPLAY.plays[{index}].id')
        assert page.locator('#clip-title').inner_text().startswith(clip_id)
        checks.append(f'{clip_id}: assignments/contact/movement render; edge/backer/safety/carrier inspection and seed/context succeed')
    page.screenshot(path=str(out / 'long-yardage.png'), full_page=True)
    page.locator('.more-filters summary').click()
    page.fill('#search', 'LY-R1-iz_strong-3rd27-drop3-R')
    assert page.locator('.play').count() == 1
    assert page.locator('#clip-title').inner_text().startswith('LY-R1-iz_strong-3rd27-drop3-R')
    checks.append('Stable named-fixture search selects the three-rusher Inside Zone clip')
    assert not errors, errors
    browser.close()
server.shutdown()
result = {'schema': 'long-yardage-film-browser-smoke-v1', 'checks': checks, 'pageErrors': errors}
(out / 'checks.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
