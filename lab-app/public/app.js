// Play Lab client. Every number shown comes from an engine run; the lab only draws and asks.
import { allCamera, drawEndZone, drawTop, GROUP_NAMES, nearestIndex, stateAt, telemetryAt, topCamera, traceStepAt } from './render.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clone = (v) => JSON.parse(JSON.stringify(v));

const LAYERS = [
  ['motion', 'Requested vs actual', '#ffd34d', 'Yellow dashed: what the controller asked for (velocity, facing). White: what the body did.'],
  ['job', 'Job & target', '#63f2f5', 'Recorded job, coverage landmark and target/man links.'],
  ['owner', 'Command owner', '#ffcf8a', 'Selected player: which controller owned the command and which stage rewrote it (command trace).'],
  ['perception', 'What he sees', '#ffffff', 'Selected player: the delayed picture of others he actually looked up, with its age.'],
  ['contact', 'Reach & contact', '#ff7ad9', 'Reach circles, body contacts, engagements (move, control, hold) and tackle grips.'],
  ['support', 'Falls & balance', '#c58cff', 'Support state (falling/down/rising), balance bar and support deviation.'],
  ['ball', 'Ball flight', '#ffe6a0', 'Recorded flight path, aimed point and arrival, catch point, QB\'s pending target.'],
  ['pursuit', 'Pursuit intercepts', '#5cff8d', 'Selected player: intercept point from his own pursuit estimate. Green feasible, orange fallback.'],
  ['fits', 'Run fits & blocks', '#b8f7c8', 'Gap fits, block assignments, drive direction, pull paths, pass-set lanes. Gap letters are drawn from OL spots at the snap.'],
  ['duty', 'Blocking responsibility', '#63f2f5', 'Each blocker\'s current duty (solid cyan, dashed when he is departing a double team) against the one he was given at the snap (grey dotted), with hand load. A recorder: no block is graded.'],
  ['trails', 'Trails', '#aaaaaa', 'Path so far.'],
  ['coach', "Coach's hand", '#ff9d2e', 'Your changes: original spot, moved spot, and an H badge on the player.'],
];
const KEY_EVENTS = new Set(['snap', 'handoff', 'pitch', 'throw', 'throwaway', 'catch', 'drop', 'pbu', 'interception', 'sack', 'tackle', 'tackle_wrap', 'carrier_contact', 'missed_tackle', 'broken_tackle', 'fumble', 'recovery', 'touchdown', 'safety', 'out_of_bounds', 'scramble', 'slide', 'pressure', 'shed', 'block_contact', 'block_exchange', 'block_abandon', 'block_climb', 'squeeze', 'fall', 'hit', 'incomplete']);

const S = {
  catalog: null, rosters: null, recipe: null, scenario: null, preview: null, run: null, runs: [], runA: null, runB: null,
  t: 0, playing: false, view: 'all22', selected: -1, second: -1, traces: new Map(), notes: [],
  layers: { motion: false, job: false, owner: true, perception: true, contact: false, support: true, ball: true, pursuit: true, fits: false, duty: false, trails: true, coach: true },
  filter: { team: 'all', group: 'all', near: 0 }, labels: 'slot', arrange: false, zoom: 1, pan: [0, 0], hits: [], building: null,
};
try { Object.assign(S.layers, JSON.parse(localStorage.getItem('lab-layers') ?? '{}')); } catch { /* storage may be unavailable */ }

// ------------------------------------------------------------------ api

async function api(path, body, method) {
  const res = await fetch(`/api/${path}`, body === undefined ? { method: method ?? 'GET' } : { method: method ?? 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}
function toast(text, ms = 2600) { const el = $('toast'); el.textContent = text; el.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.hidden = true; }, ms); }
function status(text) { $('status').textContent = text; }
const fail = (e) => { console.error(e); status(''); toast(`⚠ ${e.message}`, 5000); };

// ------------------------------------------------------------------ builder

const opt = (value, label, selected) => `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;

function defaultRecipe() {
  return { rosterSeed: 7, strength: 0.6, offense: { formation: 'gun_doubles_11', kind: 'pass', concept: 'four_verts', flip: false },
    defense: { personnel: 'nickel', front: 'over', coverage: 'cover3', pressure: null, zoneStyle: 'match' },
    situation: { down: 1, distance: 10, ballOn: 30, hash: 'middle' }, seed: 1, audibles: false, picks: [], edits: [] };
}

function fillBuilder() {
  const c = S.catalog, r = S.recipe;
  const byPersonnel = {};
  for (const f of c.formations) (byPersonnel[f.personnel] ??= []).push(f);
  $('formation').innerHTML = Object.entries(byPersonnel).map(([p, fs]) => `<optgroup label="${p} personnel">${fs.map(f => opt(f.id, f.name, f.id === r.offense.formation)).join('')}</optgroup>`).join('');
  document.querySelector(`input[name=kind][value=${r.offense.kind}]`).checked = true;
  $('flip').checked = r.offense.flip; $('audibles').checked = r.audibles;
  fillConcepts();
  $('def-personnel').innerHTML = c.defPersonnel.map(p => opt(p.id, p.id, p.id === r.defense.personnel)).join('');
  fillFronts();
  $('coverage').innerHTML = c.coverages.map(v => opt(v.id, `${v.name}${v.man ? ' (man)' : ''}`, v.id === r.defense.coverage)).join('');
  fillPressures();
  $('zone-style').value = r.defense.zoneStyle;
  $('down').value = String(r.situation.down); $('distance').value = String(r.situation.distance);
  const own = r.situation.ballOn <= 50; $('side').value = own ? 'own' : 'opp'; $('yard').value = String(own ? r.situation.ballOn : 100 - r.situation.ballOn);
  $('hash').value = r.situation.hash; $('roster-seed').value = String(r.rosterSeed); $('strength').value = String(r.strength); $('strength-out').value = r.strength.toFixed(2);
  $('seed').value = String(r.seed);
}
function fillConcepts() {
  const r = S.recipe, list = r.offense.kind === 'pass' ? S.catalog.pass : S.catalog.run;
  if (!list.some(x => x.id === r.offense.concept)) r.offense.concept = list[0].id;
  const groups = {};
  for (const x of list) (groups[x.family ?? x.scheme] ??= []).push(x);
  $('concept').innerHTML = Object.entries(groups).map(([g, xs]) => `<optgroup label="${esc(g)}">${xs.map(x => opt(x.id, x.name, x.id === r.offense.concept)).join('')}</optgroup>`).join('');
}
function fillFronts() {
  const r = S.recipe, fronts = S.catalog.fronts.filter(f => f.personnel.includes(r.defense.personnel));
  if (!fronts.some(f => f.id === r.defense.front)) r.defense.front = fronts[0]?.id;
  $('front').innerHTML = fronts.map(f => opt(f.id, f.name, f.id === r.defense.front)).join('');
}
function fillPressures() {
  const r = S.recipe, cov = S.catalog.coverages.find(c => c.id === r.defense.coverage);
  const ok = S.catalog.pressures.filter(p => p.coverages.includes(cov?.family) || p.coverages.includes(cov?.id));
  if (r.defense.pressure && !ok.some(p => p.id === r.defense.pressure)) r.defense.pressure = null;
  $('pressure').innerHTML = opt('', 'None (base rush)', !r.defense.pressure) + ok.map(p => opt(p.id, p.name + (p.flag ? ` (needs ${p.flag}=1)` : ''), p.id === r.defense.pressure)).join('');
}

function readBuilder() {
  const r = S.recipe;
  r.offense.formation = $('formation').value; r.offense.kind = document.querySelector('input[name=kind]:checked').value;
  r.offense.concept = $('concept').value; r.offense.flip = $('flip').checked; r.audibles = $('audibles').checked;
  r.defense.personnel = $('def-personnel').value; r.defense.front = $('front').value; r.defense.coverage = $('coverage').value;
  r.defense.pressure = $('pressure').value || null; r.defense.zoneStyle = $('zone-style').value;
  const yard = Math.max(1, Math.min(50, Number($('yard').value) || 30));
  r.situation = { down: Number($('down').value), distance: Math.max(1, Number($('distance').value) || 10),
    ballOn: $('side').value === 'own' ? yard : 100 - yard, hash: $('hash').value };
  r.rosterSeed = Number($('roster-seed').value) || 0; r.strength = Number($('strength').value);
  r.seed = Number($('seed').value) || 0;
}

/** The engine rebuilds the setup from the recipe; nothing is computed here. */
async function rebuild() {
  if (!S.recipe) return;
  const recipe = clone(S.recipe);
  const job = (S.building = api('build', { recipe, base: S.scenario ? { ...S.scenario, name: $('scenario-name').value } : { name: $('scenario-name').value } }));
  try {
    const scenario = await job;
    if (S.building !== job) return;
    const dropped = (S.scenario?.interventions.length ?? 0) - scenario.interventions.length;
    S.scenario = scenario;
    if (dropped > 0) toast(`${dropped} coach's-hand move(s) dropped: that player no longer has the spot.`);
    await refreshPreview();
    renderInterventions(); renderLineup();
  } catch (e) { fail(e); }
}

async function refreshPreview() {
  S.preview = await api('preview', { scenario: S.scenario });
  const fouls = S.preview.snap.fouls;
  const banner = $('banner');
  banner.className = 'banner' + (fouls.length ? ' bad' : '');
  banner.textContent = fouls.length ? `Engine pre-snap ruling: ${fouls.map(f => `${f.kind} (${f.against})${f.reason ? ' – ' + f.reason : ''}`).join('; ')}` : (S.scenario.interventions.length ? `${S.scenario.interventions.length} coach's-hand move(s) in this scenario` : '');
  if (!S.run || S.arrange) draw();
}

function renderInterventions() {
  const list = S.scenario?.interventions ?? [];
  $('interventions').innerHTML = list.map(iv => `<li><span><span class="coach">✋ ${esc(iv.team)} ${esc(iv.slot)}</span> moved ${Math.hypot(iv.to.x - iv.from.x, iv.to.y - iv.from.y).toFixed(1)} yd
    (${fmtDelta(iv)})</span><button data-remove="${esc(iv.id)}">✕</button></li>`).join('') || '<li class="hint" style="border:0">No changes. Every player is where the engine put him.</li>';
}
function fmtDelta(iv) {
  const dx = iv.to.x - iv.from.x, dy = iv.to.y - iv.from.y, parts = [];
  if (Math.abs(dx) > 0.05) parts.push(`${Math.abs(dx).toFixed(1)} ${dx > 0 ? 'downfield' : 'back'}`);
  if (Math.abs(dy) > 0.05) parts.push(`${Math.abs(dy).toFixed(1)} ${dy > 0 ? "to offense's left" : "to offense's right"}`);
  return parts.join(', ');
}

// ------------------------------------------------------------------ flags

function renderFlags() {
  const settings = S.catalog.settings, flags = S.scenario?.flags ?? {}, q = $('flag-filter').value.trim().toUpperCase();
  $('flags').innerHTML = Object.entries(settings).filter(([k]) => !q || k.includes(q)).map(([name, def]) => {
    if (typeof def !== 'boolean') return `<label title="numeric/text setting (default ${esc(def)})"><span>${esc(name)}</span><input data-flag-text="${esc(name)}" value="${esc(flags[name] ?? '')}" placeholder="${esc(def)}" style="width:70px"></label>`;
    const on = flags[name] !== undefined ? flags[name] !== '0' && (flags[name] === '1' || def) : def;
    return `<label class="${flags[name] !== undefined ? 'changed' : ''}"><span>${esc(name)}</span><input type="checkbox" data-flag="${esc(name)}"${on ? ' checked' : ''}></label>`;
  }).join('');
}

// ------------------------------------------------------------------ players

const RATING_GROUPS = {
  Physical: ['strength', 'stamina', 'balance', 'toughness'],
  Passing: ['throwPower', 'accShort', 'accMid', 'accDeep', 'release', 'throwOnRun', 'touch', 'pocketPresence'],
  'Ball carrier': ['vision', 'elusiveness', 'breakTackle', 'ballSecurity', 'patience'],
  Receiving: ['routeRunning', 'releaseVsPress', 'hands', 'contestedCatch', 'ballTracking'],
  Blocking: ['passBlock', 'runBlock', 'handTechnique', 'leadBlock'],
  Defense: ['passRushPower', 'passRushFinesse', 'blockShedding', 'tackling', 'hitPower', 'pursuit', 'manCoverage', 'zoneCoverage', 'press', 'ballSkills'],
  Mental: ['awareness', 'playRecognition', 'decisionMaking', 'composure', 'discipline', 'anticipation', 'consistency', 'workRate'],
};
const MEASURABLES = [['heightIn', 'Height (in)', 66, 82, 0.1], ['weightLb', 'Weight (lb)', 160, 360, 1], ['armIn', 'Arm (in)', 28, 38, 0.1], ['forty', '40 (s)', 4.2, 5.8, 0.01],
  ['tenSplit', '10 split (s)', 1.4, 2.0, 0.01], ['shuttle', 'Shuttle (s)', 3.8, 5.2, 0.01], ['threeCone', '3-cone (s)', 6.4, 8.4, 0.01], ['vertical', 'Vertical (in)', 20, 45, 0.5], ['broad', 'Broad (in)', 90, 140, 1], ['bench', 'Bench reps', 0, 45, 1]];

function renderLineup() {
  if (!S.preview || !S.rosters) return;
  const r = S.recipe;
  if (!r) { $('lineup').innerHTML = '<p class="hint">Imported game plays keep their own players.</p>'; return; }
  const rows = (team) => S.preview.roster.map((p, i) => [p, i]).filter(([p]) => p.team === team).map(([p]) => {
    const pool = team === 'O' ? S.rosters.offense : S.rosters.defense;
    const edited = r.edits.some(e => e.playerId === p.playerId);
    return `<div class="slot-row${edited ? ' edited' : ''}"><b>${esc(p.slot)}</b><select data-pick="${team}:${esc(p.slot)}">${pool.map(q => opt(q.id, `${q.position} #${q.jersey} ${q.name}`, q.id === p.playerId)).join('')}</select><button data-edit="${esc(p.playerId)}" title="Edit ratings">✎</button></div>`;
  }).join('');
  $('lineup').innerHTML = `<h3>Offense</h3>${rows('O')}<h3>Defense</h3>${rows('D')}`;
}

function renderEditor(playerId) {
  const all = [...S.rosters.offense, ...S.rosters.defense], base = all.find(p => p.id === playerId);
  if (!base) { $('editor').innerHTML = ''; return; }
  const edit = S.recipe.edits.find(e => e.playerId === playerId) ?? { playerId, ratings: {}, measurables: {} };
  const rating = (k) => edit.ratings?.[k] ?? base.ratings[k];
  const meas = (k) => edit.measurables?.[k] ?? base.measurables[k];
  $('editor').innerHTML = `<h3>${esc(base.position)} #${base.jersey} ${esc(base.name)}</h3><p class="hint">${esc(base.archetype)} · changed values in orange. <button id="editor-reset">Reset player</button> <button id="editor-close">Close</button></p>
    ${Object.entries(RATING_GROUPS).map(([g, keys]) => `<details${g === 'Physical' ? ' open' : ''}><summary>${g}</summary>${keys.map(k => `<div class="slider${edit.ratings?.[k] !== undefined ? ' changed' : ''}"><span>${k}</span><input type="range" min="1" max="100" step="1" value="${rating(k)}" data-rating="${k}"><output>${rating(k)}</output></div>`).join('')}</details>`).join('')}
    <details><summary>Measurables</summary>${MEASURABLES.map(([k, label, lo, hi, step]) => `<div class="slider${edit.measurables?.[k] !== undefined ? ' changed' : ''}"><span>${label}</span><input type="range" min="${lo}" max="${hi}" step="${step}" value="${meas(k)}" data-meas="${k}"><output>${meas(k)}</output></div>`).join('')}</details>`;
  $('editor').dataset.player = playerId;
}

function setEdit(playerId, kind, key, value) {
  let edit = S.recipe.edits.find(e => e.playerId === playerId);
  if (!edit) S.recipe.edits.push(edit = { playerId, ratings: {}, measurables: {} });
  (edit[kind] ??= {})[key] = value;
}

// ------------------------------------------------------------------ runs

function runScenarioSnapshot() {
  const s = clone(S.scenario); s.name = $('scenario-name').value; return s;
}

async function runPlay(seed) {
  if (!S.scenario) return;
  if (S.building) await S.building.catch(() => {});
  const scenario = runScenarioSnapshot();
  const runSeed = seed ?? (S.recipe ? Number($('seed').value) : ($('seed').value === '' ? undefined : Number($('seed').value)));
  status('Running on the engine…');
  try {
    const run = await api('run', { scenario, seed: runSeed });
    run.scenario = scenario; run.id = `R${S.runs.length + 1}`;
    S.runs.push(run); setRun(run);
    const orig = scenario.source?.kind === 'saved-play' && runSeed === undefined ? scenario.source.original : null;
    const same = orig && orig.outcome === run.summary.outcome && orig.yards === run.summary.yards && orig.events === run.events.length;
    status(`${run.id}: ${describe(run)} · ${run.summary.ms} ms${orig ? (same ? ' · ✓ same as the game\'s original' : ` · ✗ differs from the game's original (${orig.outcome} ${orig.yards} yd)`) : ''}`);
    saveScenario(true).catch(() => {});
  } catch (e) { fail(e); }
}

function describe(run) {
  const s = run.summary;
  const what = s.outcome === 'incomplete' ? 'incomplete' : s.outcome === 'touchdown' ? 'TOUCHDOWN' : s.turnover ? 'turnover' : `${s.yards >= 0 ? '+' : ''}${s.yards.toFixed(1)} yd`;
  return `${run.offCall.label} vs ${run.defCall.label}${run.defCall.check ? ` (checked ${run.defCall.check.from}→${run.defCall.coverage})` : ''} · seed ${run.seed ?? 'play'} · ${what} (${s.outcome}${s.penalty ? ', flag: ' + s.penalty.kind : ''})`;
}

function setRun(run, keepTime) {
  S.run = run; S.arrange = false; $('arrange').classList.remove('on');
  const T = run.frames.t;
  if (!keepTime) { S.t = T[0]; S.playing = true; }
  S.zoom = 1; S.pan = [0, 0];
  // Frames before 0 are the recorded pre-snap (stems, motion, the count).
  $('time').min = String(T[0]); $('time').max = String(T[T.length - 1]); $('time').step = '0.05';
  $('empty').hidden = true;
  renderEvents(); renderTicks(); renderRuns(); renderNotes(); loadTraceIfNeeded(); draw();
}

function renderRuns() {
  $('run-list').innerHTML = `<tr><th>A</th><th>B</th><th>Run</th><th>Seed</th><th>Result</th></tr>` + S.runs.slice().reverse().map(r => `<tr data-run="${r.id}" class="${r === S.run ? 'current' : ''}">
    <td><input type="radio" name="ra" data-a="${r.id}"${S.runA === r ? ' checked' : ''}></td><td><input type="radio" name="rb" data-b="${r.id}"${S.runB === r ? ' checked' : ''}></td>
    <td>${r.id}${r.interventions.length ? ' ✋' : ''}</td><td>${r.seed ?? '–'}</td><td>${esc(r.summary.outcome)} ${r.summary.yards.toFixed(1)}</td></tr>`).join('');
}

// ------------------------------------------------------------------ batch

async function runBatch() {
  if (!S.scenario) return;
  const n = Math.max(2, Math.min(500, Number($('batch-count').value) || 20)), first = Number($('seed').value) || 0;
  const seeds = Array.from({ length: n }, (_, k) => (first + k) >>> 0);
  const scenario = runScenarioSnapshot();
  showTab('runs');
  try {
    const { id, total } = await api('batch', { scenario, seeds, label: scenario.name });
    const results = []; let since = 0;
    for (;;) {
      const job = await api(`jobs/${id}?since=${since}`);
      results.push(...job.results); since = results.length;
      $('batch-progress').innerHTML = `<div class="hint">Batch: ${job.done}/${total} plays${job.failed ? `, ${job.failed} failed` : ''} · ${((Date.now() - job.started) / 1000).toFixed(1)} s</div><div class="progress"><i style="width:${(100 * job.done / total).toFixed(1)}%"></i></div>`;
      if (job.finished) break;
      await new Promise(r => setTimeout(r, 300));
    }
    renderBatch(results, scenario);
  } catch (e) { fail(e); }
}

function renderBatch(results, scenario) {
  const ok = results.filter(r => r.summary).sort((a, b) => a.summary.yards - b.summary.yards);
  const yards = ok.map(r => r.summary.yards), mean = yards.reduce((a, b) => a + b, 0) / (yards.length || 1);
  const median = yards.length ? yards[Math.floor(yards.length / 2)] : 0;
  const outcomes = {}; for (const r of ok) outcomes[r.summary.outcome] = (outcomes[r.summary.outcome] ?? 0) + 1;
  const lo = Math.floor(Math.min(...yards, 0)), hi = Math.ceil(Math.max(...yards, 1)), bins = Math.min(30, Math.max(8, hi - lo));
  const width = (hi - lo) / bins, counts = Array(bins).fill(0);
  for (const y of yards) counts[Math.min(bins - 1, Math.floor((y - lo) / width))]++;
  const top = Math.max(...counts, 1);
  $('batch-summary').innerHTML = `<h3>${esc(scenario.name)} · ${ok.length} seeds</h3>
    <div class="hint">Mean ${mean.toFixed(1)} yd · median ${median.toFixed(1)} yd · ${Object.entries(outcomes).map(([k, v]) => `${k} ${v}`).join(' · ')}</div>
    <div class="histogram">${counts.map((c, k) => `<div style="height:${(100 * c / top).toFixed(0)}%" title="${(lo + k * width).toFixed(1)} to ${(lo + (k + 1) * width).toFixed(1)} yd: ${c}"></div>`).join('')}</div>
    <div class="hint">${lo} yd … ${hi} yd. Click a play to watch it (sorted by yards; the tails are at the ends).</div>
    <table class="table">${ok.map(r => `<tr data-seed="${r.seed}"><td>seed ${r.seed}</td><td>${esc(r.summary.outcome)}</td><td>${r.summary.yards.toFixed(1)} yd</td><td>${r.summary.penalty ? esc(r.summary.penalty.kind) : ''}</td></tr>`).join('')}</table>`;
}

// ------------------------------------------------------------------ trace

/** The selected blocker's responsibility ledger: his duty over time, why it changed, and his initial job's facts. */
function dutyHtml(run, i) {
  const R = run.responsibility, b = R?.timeline.find(x => x.actor === i);
  if (!b) return '';
  const nm = (j) => j == null ? '–' : esc(name(run, j)), f = (v) => v == null ? '–' : v.toFixed(2);
  const spans = b.spans.map(s => `<div class="ev" data-t="${s.from}">${s.from.toFixed(2)}–${s.to.toFixed(2)}s ${esc(s.kind)} → ${nm(s.target)}${s.departure ? ' · departing' : ''} <span class="hint">(${esc(s.because)})</span></div>`).join('');
  const jobs = R.jobs.filter(j => j.members.includes(i)).map(j => {
    const fc = j.firstCarrierContact;
    return `<div class="hint">Job ${j.id}: ${j.members.map(m => nm(m)).join(' + ')} → ${nm(j.backer)} · stratum ${j.stratum} · member load first ${f(j.firstMemberLoad)}s · first carrier contact ${fc ? f(fc.t) + 's (' + fc.defenders.map(nm).join(', ') + ')' : '–'} · his target\'s own contact ${j.targetCarrierContacts.length ? f(Math.min(...j.targetCarrierContacts.map(c => c.t))) + 's' : '–'}</div>`;
  }).join('');
  return `<h3>Responsibility</h3>${spans}${jobs}<div class="hint">A recorder: contact and load are not a block grade. A dash means not recorded.</div>`;
}

function wantsTrace() { return S.selected >= 0 && S.run && (S.layers.owner || S.layers.pursuit || true); }
async function loadTraceIfNeeded() {
  if (!wantsTrace()) return;
  const r = S.run.roster[S.selected], key = `${S.run.id}:${r.team}:${r.slot}`;
  if (S.traces.has(key)) return;
  S.traces.set(key, null);
  try {
    const T = S.run.frames.t;
    const trace = await api('trace', { scenario: S.run.scenario, seed: S.run.seed ?? undefined, actor: { team: r.team, slot: r.slot }, from: 0, to: T[T.length - 1] + 0.2 });
    S.traces.set(key, trace); draw();
  } catch (e) { S.traces.delete(key); fail(e); }
}
function currentTrace() {
  if (S.selected < 0 || !S.run) return null;
  const r = S.run.roster[S.selected]; return S.traces.get(`${S.run.id}:${r.team}:${r.slot}`) ?? null;
}

// ------------------------------------------------------------------ events

const name = (run, i) => i == null || i < 0 || !run.roster[i] ? '' : `${run.roster[i].team} ${run.roster[i].slot}`;
function renderEvents() {
  const run = S.run; if (!run) return;
  const all = $('events-all').checked;
  const coach = run.interventions.map(iv => ({ t: 0, coach: true, text: `✋ coach's hand: ${iv.team} ${iv.slot} moved ${Math.hypot(iv.to.x - iv.from.x, iv.to.y - iv.from.y).toFixed(1)} yd before the snap` }));
  const evs = run.events.map((e, k) => ({ ...e, k })).filter(e => all || KEY_EVENTS.has(e.type));
  $('events').innerHTML = coach.map(e => `<li class="coach" data-t="0">0.00s ${esc(e.text)}</li>`).join('') + evs.map(e =>
    `<li data-t="${e.t}" data-a="${e.a ?? ''}">${e.t.toFixed(2)}s ${esc(e.type)} ${esc(name(run, e.a))}${e.b != null ? ' → ' + esc(name(run, e.b)) : ''}${e.note ? ' · ' + esc(e.note) : ''}</li>`).join('');
}
function renderTicks() {
  const run = S.run; if (!run) return;
  const T = run.frames.t, t0 = T[0], span = (T[T.length - 1] - t0) || 1, at = (t) => (100 * (t - t0) / span).toFixed(2);
  const ev = run.events.filter(e => KEY_EVENTS.has(e.type));
  const windows = S.notes.filter(n => n.runKey === runKey(run)).map(n => `<span class="window" style="left:${at(n.window.from)}%;width:${100 * (n.window.to - n.window.from) / span}%"></span>`);
  $('ticks').innerHTML = windows.join('') + ev.map(e => `<i class="${['throw', 'catch', 'tackle', 'handoff', 'sack', 'interception', 'touchdown', 'snap'].includes(e.type) ? 'key' : ''}" style="left:${at(e.t)}%" title="${e.t.toFixed(2)}s ${esc(e.type)}"></i>`).join('')
    + (run.interventions.length ? `<i class="coach" style="left:${at(Math.max(t0, 0))}%" title="coach's hand"></i>` : '');
}
const runKey = (run) => `${run.scenario.setup.sha256}:${run.seed}:${JSON.stringify(run.interventions.map(i => [i.slot, i.to]))}`;

// ------------------------------------------------------------------ player panel

function renderPlayer() {
  const run = S.run, i = S.selected, el = $('player-panel');
  if (!run || i < 0) {
    if (S.arrange && S.preview) { el.innerHTML = '<p class="hint">Arrange mode: drag a player. Release on open grass; bodies may not overlap.</p>'; return; }
    el.innerHTML = '<p class="hint">Click a player to follow him. Shift-click a second player to include him in a note.</p>'; return;
  }
  const r = run.roster[i], tel = telemetryAt(run, S.t), ag = tel?.agents?.[i], body = ag?.body;
  const speed = body ? Math.hypot(body.velocity[0], body.velocity[1]) : null;
  const req = ag?.intent?.velocity ? Math.hypot(ag.intent.velocity[0], ag.intent.velocity[1]) : null;
  const step = traceStepAt(currentTrace(), S.t);
  const effort = step?.final?.effort;
  const evs = run.events.filter(e => e.a === i || e.b === i);
  const decisions = (run.telemetry?.decisions ?? []).filter(d => d.a === i && d.t <= S.t + 1e-6).slice(-4);
  const hand = run.interventions.find(iv => iv.team === r.team && iv.slot === r.slot);
  const mph = (v) => (v * 3600 / 1760).toFixed(1);
  el.innerHTML = `<div class="pp"><h2>${esc(r.slot)} · #${r.jersey} ${esc(r.name)}</h2>
    <div class="sub">${esc(r.position)} · ${Math.floor(r.heightIn / 12)}'${Math.round(r.heightIn % 12)}" ${Math.round(r.weightLb)} lb · top speed ${r.physical.vmax.toFixed(1)} yd/s · reach ${r.physical.reach.toFixed(2)} yd · reacts ${(r.physical.reactionTime * 1000).toFixed(0)} ms</div>
    ${hand ? `<div class="coach">✋ Coach's hand: lined up ${fmtDelta(hand)} from his own spot. Not his choice.</div>` : ''}
    <dl>
      <dt>Speed</dt><dd>${speed == null ? '–' : `${speed.toFixed(2)} yd/s (${mph(speed)} mph)`}</dd>
      <dt>Asked for</dt><dd>${req == null ? '–' : `${req.toFixed(2)} yd/s`}${effort != null ? ` · effort ${effort.toFixed(2)}` : ''}</dd>
      <dt>Energy</dt><dd>${body ? (body.energy * 100).toFixed(0) + '%' : '–'}</dd>
      <dt>Support</dt><dd>${body ? `${body.state} · balance ${body.balance.toFixed(2)} · posture ${body.posture.toFixed(2)}` : '–'}</dd>
      <dt>Job</dt><dd>${esc(ag?.job ?? ag?.kind ?? '–')}${ag?.target != null ? ' → ' + esc(name(run, ag.target)) : ''}</dd>
      ${ag?.runFit ? `<dt>Run fit</dt><dd>${esc(ag.runFit.gap)} ${esc(ag.runFit.technique)} · ${esc(ag.runFit.kind)} · ${esc(ag.runFit.pace)}</dd>` : ''}
      ${ag?.belief ? `<dt>Read</dt><dd>${esc(ag.belief.read)} · pass ${(ag.belief.passProbability * 100).toFixed(0)}%</dd>` : ''}
    </dl>
    ${dutyHtml(run, i)}
    <h3>Command trace at ${S.t.toFixed(2)}s</h3>
    <div class="trace">${traceText(step)}</div>
    <h3>Recent decisions</h3>
    ${decisions.length ? decisions.map(d => `<div class="ev" data-t="${d.t}">${d.t.toFixed(2)}s ${esc(d.kind)} → ${esc(d.chose)}${d.cue ? ' · cue: ' + esc(d.cue) : ''}</div>`).join('') : '<div class="hint">No decision recorded for him yet.</div>'}
    <h3>His events</h3>
    ${evs.length ? evs.map(e => `<div class="ev" data-t="${e.t}">${e.t.toFixed(2)}s ${esc(e.type)}${e.b != null && e.a === i ? ' → ' + esc(name(run, e.b)) : e.a !== i ? ' ← ' + esc(name(run, e.a)) : ''}</div>`).join('') : '<div class="hint">None.</div>'}
    <details><summary>Ratings</summary><div class="ratings">${Object.entries(r.ratings).map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div></details></div>`;
}

/** The runner's own decision: arrival evidence, chosen lane, and the designed track's exit gate. */
function carrierLine(r) {
  const n = (v) => v == null ? '-' : v.toFixed(2);
  if (r.kind === 'design-exit')
    return `design exit: ${r.exit ? 'LEAVE' : 'stay'} · aim blocked ${r.aimBlocked} · best ${n(r.bestScore)} vs aim ${n(r.aimScore)} + ${n(r.margin)}`;
  const held = r.arrival.filter(a => a.blockerBonus > 0).map(a => `${a.defender.slot} +${a.blockerBonus}`);
  return `runner (${r.designed ? 'designed' : 'open field'}): lane ${n(r.selected?.heading)} score ${n(r.selected?.score)}${r.selected?.blocked ? ' blocked' : ''}`
    + `${r.aim ? ` · aim ${n(r.aim.score)}${r.aim.blocked ? ' blocked' : ''}` : ''} · ${r.arrival.length} threats seen${held.length ? `, held-up credit: ${held.join(', ')}` : ''}`;
}

function traceText(step) {
  const trace = currentTrace();
  if (trace === null && S.selected >= 0) return 'Loading the command trace…';
  if (!step) return 'No step recorded at this moment.';
  const lines = [];
  const d = step.decision;
  if (d) {
    lines.push(`owner: ${d.ownerAfterUpdate.controller}${d.ownerAfterUpdate.job ? ' (' + d.ownerAfterUpdate.job + ')' : ''}`);
    if (d.ownerAfterUpdate.target) lines.push(`target: ${d.ownerAfterUpdate.target.team} ${d.ownerAfterUpdate.target.slot} [${d.ownerAfterUpdate.targetSource}]`);
    lines.push(`asked: vel (${d.raw.vel.x.toFixed(2)}, ${d.raw.vel.y.toFixed(2)})${d.raw.effort != null ? ' effort ' + d.raw.effort.toFixed(2) : ''}`);
  } else lines.push('no decision this step (controller not evaluated)');
  for (const rw of step.rewrites) lines.push(`rewritten by ${rw.stage}: vel (${rw.command.vel.x.toFixed(2)}, ${rw.command.vel.y.toFixed(2)})`);
  if (step.final) lines.push(`final: vel (${step.final.vel.x.toFixed(2)}, ${step.final.vel.y.toFixed(2)})${step.final.facing != null ? ' facing ' + step.final.facing.toFixed(2) : ''}`);
  if (step.observations.length) {
    // One entry per player: the freshest look this step.
    const seen = new Map();
    for (const o of step.observations) { const k = `${o.target.team} ${o.target.slot}`, prev = seen.get(k); if (!prev || (o.age ?? 9) < (prev.age ?? 9)) seen.set(k, o); }
    lines.push(`looked at ${seen.size}: ${[...seen].map(([k, o]) => `${k} ${o.age == null ? '?' : o.age.toFixed(2) + 's'}`).join(', ')}`);
  }
  for (const p of step.pursuit ?? []) lines.push(p.data.kind === 'intercept' ? `pursuit: ${p.data.prediction.estimate.status} at ${p.data.prediction.t.toFixed(2)}s` : `pursuit: chase (${p.data.planner})`);
  for (const c of step.carrier ?? []) lines.push(carrierLine(c.data));
  if (step.start.engagement) lines.push(`engaged: ${step.start.engagement.type} ${step.start.engagement.move ?? ''} with ${step.start.engagement.blocker.slot}/${step.start.engagement.defender.slot}`);
  return esc(lines.join('\n'));
}

// ------------------------------------------------------------------ notes

function openNoteForm() {
  if (!S.run) { toast('Run a play first.'); return; }
  S.playing = false; showTab('notes');
  $('note-form').hidden = false;
  $('note-from').value = Math.max(0, S.t - 0.5).toFixed(2); $('note-to').value = (S.t + 0.5).toFixed(2);
  renderNotePlayers(); $('note-text').focus();
}
function renderNotePlayers() {
  const ps = [S.selected, S.second].filter(i => i >= 0).map(i => name(S.run, i));
  $('note-players').textContent = ps.length ? `Players: ${ps.join(' and ')}` : 'No player selected (click one on the field; shift-click a second).';
}
async function saveNote(ev) {
  ev.preventDefault();
  const run = S.run, text = $('note-text').value.trim();
  if (!text) { toast('Write what you saw.'); return; }
  try {
    await saveScenario(true);
    const players = [S.selected, S.second].filter(i => i >= 0).map(i => ({ index: i, team: run.roster[i].team, slot: run.roster[i].slot, playerId: run.roster[i].playerId, name: run.roster[i].name }));
    const note = await api('notes', {
      scenarioId: S.scenario.id, scenarioName: $('scenario-name').value, category: $('note-category').value, text,
      at: Number(S.t.toFixed(3)), window: { from: Number($('note-from').value), to: Number($('note-to').value) }, players,
      seed: run.seed, engine: run.engine, flags: run.flags, interventions: run.interventions,
      result: { outcome: run.summary.outcome, yards: run.summary.yards }, view: { view: S.view, layers: S.layers },
      // The exact constructor input that produced this run, so the moment restores even if the scenario changes later.
      scenario: run.scenario,
    });
    note.runKey = runKey(run);
    S.notes.push(note); $('note-form').hidden = true; $('note-text').value = '';
    renderNotes(); renderTicks(); toast('Note saved. "Copy reference" gives agents the exact moment.');
  } catch (e) { fail(e); }
}
async function loadNotes() {
  if (!S.scenario) return;
  try { S.notes = (await api(`notes?scenario=${encodeURIComponent(S.scenario.id)}`)).map(n => ({ ...n, runKey: `${n.scenario.setup.sha256}:${n.seed}:${JSON.stringify((n.interventions ?? []).map(i => [i.slot, i.to]))}` })); }
  catch { S.notes = []; }
  renderNotes();
}
function renderNotes() {
  const cls = (c) => c === 'looks great' ? 'good' : c === 'other' ? '' : 'bad';
  $('notes').innerHTML = S.notes.slice().reverse().map(n => `<div class="note" data-note="${esc(n.id)}">
    <div class="cat ${cls(n.category)}">${esc(n.category)}</div><div>${esc(n.text)}</div>
    <div class="meta">${n.window.from.toFixed(2)}–${n.window.to.toFixed(2)}s · seed ${n.seed ?? '–'} · ${n.players.map(p => esc(p.team + ' ' + p.slot)).join(', ') || 'no player'} · ${esc(n.id)}</div>
    <div class="row"><button data-goto="${esc(n.id)}">Go to moment</button><button data-copy="${esc(n.id)}">Copy reference</button><button data-del="${esc(n.id)}">Delete</button></div></div>`).join('') || '<p class="hint">No notes on this scenario yet.</p>';
}
async function gotoNote(n) {
  S.scenario = clone(n.scenario); S.recipe = n.scenario.recipe ? clone(n.scenario.recipe) : null;
  $('scenario-name').value = n.scenario.name;
  if (S.recipe) fillBuilder();
  const existing = S.runs.find(r => runKey(r) === n.runKey);
  if (existing) setRun(existing, true);
  else await runPlay(n.seed ?? undefined);
  S.playing = false; S.t = n.at;
  const idx = (p) => S.run.roster.findIndex(r => r.team === p.team && r.slot === p.slot);
  S.selected = n.players[0] ? idx(n.players[0]) : -1; S.second = n.players[1] ? idx(n.players[1]) : -1;
  if (n.view?.layers) Object.assign(S.layers, n.view.layers);
  renderLayers(); loadTraceIfNeeded(); draw();
}
function noteReference(n) {
  return [`Play Lab note ${n.id} (${n.category}): ${n.text}`,
    `Moment: ${n.at.toFixed(2)}s, window ${n.window.from.toFixed(2)}–${n.window.to.toFixed(2)}s; players ${n.players.map(p => `${p.team} ${p.slot} (${p.playerId})`).join(', ') || 'none'}`,
    `Scenario: ${n.scenarioName} (${n.scenarioId}), seed ${n.seed ?? "play's own"}, setup sha256 ${n.scenario.setup.sha256.slice(0, 16)}…${n.interventions?.length ? `, ${n.interventions.length} coach's-hand move(s)` : ''}`,
    `Engine: commit ${n.engine?.commit ?? '?'}${n.engine?.srcDirty ? ' (+uncommitted src)' : ''}, engine sha256 ${String(n.engine?.engineSha256 ?? '?').slice(0, 16)}…, flags ${JSON.stringify(n.flags ?? {})}`,
    `Restore headless: ${n.replay}`,
    `Open in the lab: http://localhost:${location.port}/#note=${n.id}`].join('\n');
}
function momentReference() {
  const run = S.run; if (!run) return '';
  const ps = [S.selected, S.second].filter(i => i >= 0).map(i => `${run.roster[i].team} ${run.roster[i].slot}`);
  return [`Play Lab moment (unsaved, write a note to keep it): ${$('scenario-name').value} · seed ${run.seed ?? "play's own"} · ${S.t.toFixed(2)}s${ps.length ? ' · ' + ps.join(', ') : ''}`,
    `Scenario ${S.scenario.id}, setup sha256 ${run.scenario.setup.sha256.slice(0, 16)}…, engine ${run.engine?.commit ?? '?'}${run.engine?.srcDirty ? ' (+uncommitted src)' : ''}, flags ${JSON.stringify(run.flags)}`,
    `Open in the lab: http://localhost:${location.port}/#scenario=${S.scenario.id}&seed=${run.seed ?? ''}&t=${S.t.toFixed(2)}${ps.length ? '&p=' + ps.map(p => p.replace(' ', ':')).join(',') : ''}`].join('\n');
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied.'); }
  catch { window.prompt('Copy this reference:', text); }
}

// ------------------------------------------------------------------ library

async function saveScenario(quiet) {
  if (!S.scenario) return;
  S.scenario.name = $('scenario-name').value;
  const saved = await api(`scenarios/${S.scenario.id}`, S.scenario, 'PUT');
  if (!quiet) { toast(`Saved to out/lab/scenarios/${saved.id}.json`); renderLibrary(); }
}
async function renderLibrary() {
  try {
    const list = await api('scenarios');
    $('library').innerHTML = list.map(s => `<div class="lib-row"><span>${esc(s.name)}<small>${esc(s.play)} · ${s.interventions ? s.interventions + ' ✋ · ' : ''}${esc(String(s.saved ?? '').slice(0, 16).replace('T', ' '))}</small></span><span><button data-open="${esc(s.id)}">Open</button> <button data-delete="${esc(s.id)}">✕</button></span></div>`).join('') || '<p class="hint">Nothing saved yet.</p>';
    const bins = await api('saved-plays');
    $('saved-plays').innerHTML = bins.map(b => `<div class="lib-row"><code>${esc(b)}</code><button data-import="${esc(b)}">Import</button></div>`).join('') || '<p class="hint">No saved game plays under out/. Capture one with <code>scripts/diag/capture-game-play.ts</code>.</p>';
  } catch (e) { fail(e); }
}
async function openScenario(s) {
  S.scenario = s; S.recipe = s.recipe ? clone(s.recipe) : null; S.run = null; S.selected = S.second = -1;
  $('scenario-name').value = s.name;
  document.querySelectorAll('[data-pane=build] select, [data-pane=build] input').forEach(el => { el.disabled = !S.recipe && el.id !== 'flag-filter' && !el.dataset.flag; });
  if (S.recipe) { fillBuilder(); S.rosters = await api(`rosters?seed=${S.recipe.rosterSeed}&strength=${S.recipe.strength}`); }
  else $('seed').value = '';
  await refreshPreview(); renderInterventions(); renderLineup(); renderFlags(); await loadNotes();
  S.arrange = true; $('empty').hidden = true; draw();
}

// ------------------------------------------------------------------ drawing

const canvases = [$('canvas-a'), $('canvas-b')];
function sizeCanvas(c) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return [ctx, w, h];
}

/** Preview runs look like a one-frame run so the same renderer draws arrange mode. */
function previewRun() {
  const p = S.preview;
  return { roster: p.roster, los: p.los, firstDownX: p.firstDownX, ballY: p.ballY, events: [], frames: { t: [0], p: p.placed.flatMap(q => [q.x, q.y, q.facing]), b: [p.los, p.ballY, 0], c: [-1], s: [0, 0] } };
}

function drawOne(canvas, run, opts = {}) {
  const [ctx, W, H] = sizeCanvas(canvas);
  const arrange = !!opts.arrange;
  const base = { t: S.t, layers: S.layers, filter: S.filter, selected: S.selected, second: S.second, labels: S.labels,
    trace: run === S.run ? currentTrace() : null, interventions: arrange ? S.scenario.interventions : run.interventions, arrange, placed: S.preview?.placed };
  if (S.view === 'endzone' && !arrange) return drawEndZone(ctx, W, H, run, S.t, base);
  let cam;
  if (S.view === 'playercam' && !arrange) {
    const st = stateAt(run, S.t), i = S.selected >= 0 ? S.selected : st.carrier >= 0 ? st.carrier : run.roster.findIndex(r => r.slot === 'QB');
    const p = st.players[i]; cam = topCamera(W, H, p[0], p[1], 26 / S.zoom, Math.PI / 2 - p[2]);
  } else cam = opts.cam ?? allCamera(run, W, H, S.t, S.zoom, S.pan);
  const out = drawTop(ctx, W, H, { ...base, run, cam });
  return { ...out, cam };
}

function draw() {
  const compare = S.view === 'compare';
  canvases[1].hidden = !compare;
  if (S.arrange && S.preview) { S.hits = [drawOne(canvases[0], previewRun(), { arrange: true })]; renderPlayer(); return; }
  if (!S.run) return;
  if (compare) {
    const a = S.runA ?? S.run, b = S.runB ?? S.runs.find(r => r !== a);
    if (!b) { $('banner').textContent = 'Pick runs A and B in the Runs tab to compare.'; S.hits = [drawOne(canvases[0], a)]; }
    else {
      const [, W, H] = sizeCanvas(canvases[0]);
      const cam = allCamera(a.frames.t.length > b.frames.t.length ? a : b, W, H, S.t, S.zoom, S.pan);
      S.hits = [drawOne(canvases[0], a, { cam }), drawOne(canvases[1], b, { cam })];
      $('banner').className = 'banner'; $('banner').textContent = $('banner').title = `A = ${a.id}, B = ${b.id} · ${divergence(a, b)}`;
    }
  } else S.hits = [drawOne(canvases[0], S.run)];
  const T = S.run.frames.t;
  $('time').value = String(S.t); $('clock').textContent = `${S.t.toFixed(2)}s`;
  $('play').textContent = S.playing ? '⏸' : '▶';
  highlightEvents(); renderPlayer();
  void T;
}

/** First recorded time where any body differs by more than 1 cm, and whose. Frames are matched by time, not index. */
function divergence(a, b) {
  if (a.roster.length !== b.roster.length || a.roster.some((r, i) => r.slot !== b.roster[i].slot || r.team !== b.roster[i].team)) return 'different lineups';
  const n = a.roster.length, key = (t) => Math.round(t * 1000), bAt = new Map(b.frames.t.map((t, k) => [key(t), k]));
  const firstShared = a.frames.t.find(t => bAt.has(key(t)));
  const what = [a.scenario.setup.sha256 !== b.scenario.setup.sha256 ? 'different setups' : null, a.seed !== b.seed ? `seeds ${a.seed ?? 'own'}/${b.seed ?? 'own'}` : null,
    JSON.stringify(a.interventions) !== JSON.stringify(b.interventions) ? "different coach's hand" : null, JSON.stringify(a.flags) !== JSON.stringify(b.flags) ? 'different switches' : null].filter(Boolean);
  const note = (a.frames.t[0] !== b.frames.t[0] ? ` (pre-snap starts differ: ${a.frames.t[0].toFixed(2)}s vs ${b.frames.t[0].toFixed(2)}s)` : '') + (what.length ? ` · ${what.join(', ')}` : ' · same inputs');
  for (let k = 0; k < a.frames.t.length; k++) {
    const kb = bAt.get(key(a.frames.t[k])); if (kb === undefined) continue;
    for (let i = 0; i < n; i++) {
      const ia = (k * n + i) * 3, ib = (kb * n + i) * 3;
      if (Math.hypot(a.frames.p[ia] - b.frames.p[ib], a.frames.p[ia + 1] - b.frames.p[ib + 1]) > 0.01)
        return `first divergence at ${a.frames.t[k].toFixed(2)}s: ${a.roster[i].team} ${a.roster[i].slot}${a.frames.t[k] === firstShared ? ' (already different at the first shared frame)' : ''}${note}`;
    }
  }
  return (a.frames.t.length === b.frames.t.length ? 'identical bodies throughout' : 'same bodies until one play ended') + note;
}

function highlightEvents() {
  for (const li of $('events').children) {
    const t = Number(li.dataset.t);
    li.className = (li.classList.contains('coach') ? 'coach ' : '') + (Math.abs(t - S.t) < 0.03 ? 'now' : t < S.t ? 'past' : '');
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (S.playing && S.run) {
    const T = S.run.frames.t, end = T[T.length - 1];
    S.t = Math.min(end, S.t + dt * Number($('speed').value));
    if (S.t >= end) S.playing = false;
    draw();
  }
  requestAnimationFrame(loop);
}

function seek(t) { if (!S.run) return; const T = S.run.frames.t; S.t = Math.max(T[0], Math.min(T[T.length - 1], t)); draw(); }
function stepFrame(dir) {
  if (!S.run) return; S.playing = false;
  const T = S.run.frames.t, k = nearestIndex(T, S.t);
  seek(T[Math.max(0, Math.min(T.length - 1, k + dir))]);
}

// ------------------------------------------------------------------ field interaction

function pick(ev) {
  const canvas = ev.currentTarget, which = canvases.indexOf(canvas), hit = S.hits[which];
  if (!hit) return -1;
  const rect = canvas.getBoundingClientRect(), x = ev.clientX - rect.left, y = ev.clientY - rect.top;
  if (hit.hit) { let best = -1, bd = Infinity; for (const [i, px, py, r] of hit.hit) { const d = Math.hypot(px - x, py - y); if (d < r + 6 && d < bd) { bd = d; best = i; } } return best; }
  let best = -1, bd = Infinity;
  hit.positions.forEach(([px, py, r], i) => { const d = Math.hypot(px - x, py - y); if (d < r + 6 && d < bd) { bd = d; best = i; } });
  return best;
}

let drag = null;
function onDown(ev) {
  const i = pick(ev);
  if (S.arrange && S.preview) {
    if (i >= 0) { drag = { i }; ev.currentTarget.setPointerCapture(ev.pointerId); }
    return;
  }
  if (i < 0) { if (!ev.shiftKey) { drag = { pan: true, x: ev.clientX, y: ev.clientY, start: [...S.pan] }; } return; }
  if (ev.shiftKey && S.selected >= 0 && i !== S.selected) S.second = S.second === i ? -1 : i;
  else { S.selected = S.selected === i ? -1 : i; S.second = -1; }
  loadTraceIfNeeded(); renderNotePlayers?.(); draw();
}
function onMove(ev) {
  if (!drag) return;
  const hit = S.hits[0];
  if (drag.pan && hit?.cam) { const dx = (ev.clientX - drag.x) / hit.cam.sc, dy = (ev.clientY - drag.y) / hit.cam.sc; S.pan = [drag.start[0] - dx, drag.start[1] + dy]; draw(); return; }
  if (drag.i !== undefined && hit?.cam) {
    const rect = canvases[0].getBoundingClientRect();
    const [x, y] = hit.cam.inv(ev.clientX - rect.left, ev.clientY - rect.top);
    S.preview.placed[drag.i] = { ...S.preview.placed[drag.i], x: Math.round(x * 20) / 20, y: Math.round(y * 20) / 20 };
    drag.moved = true; draw();
  }
}
async function onUp() {
  const d = drag; drag = null;
  if (!d || d.i === undefined || !d.moved) return;
  const p = S.preview, i = d.i, r = p.roster[i], to = p.placed[i];
  // Bodies may not start inside each other: the lab refuses the drop rather than let the engine resolve an overlap.
  for (let j = 0; j < p.roster.length; j++) {
    if (j === i) continue;
    const q = p.placed[j];
    if (Math.hypot(q.x - to.x, q.y - to.y) < r.physical.radius + p.roster[j].physical.radius + 0.05) {
      toast(`Too close to ${p.roster[j].team} ${p.roster[j].slot}: bodies would overlap.`); await refreshPreview(); return;
    }
  }
  const from = p.native[i], list = S.scenario.interventions, existing = list.find(iv => iv.team === r.team && iv.slot === r.slot);
  if (Math.hypot(to.x - from.x, to.y - from.y) < 0.05) S.scenario.interventions = list.filter(iv => iv !== existing);
  else if (existing) existing.to = { x: to.x, y: to.y };
  else list.push({ id: `align-${r.team}-${r.slot}`, kind: 'align', by: "coach's hand", team: r.team, slot: r.slot, playerId: r.playerId, from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } });
  renderInterventions(); await refreshPreview().catch(fail);
}

// ------------------------------------------------------------------ wiring

function showTab(name) {
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('[data-pane]').forEach(p => p.classList.toggle('on', p.dataset.pane === name));
  if (name === 'library') renderLibrary();
}

function renderLayers() {
  $('layers').innerHTML = LAYERS.map(([k, label, color, help]) => `<label title="${esc(help)}"><input type="checkbox" data-layer="${k}"${S.layers[k] ? ' checked' : ''}><span class="swatch" style="background:${color}"></span>${esc(label)}</label>`).join('');
}

function wire() {
  document.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => showTab(b.dataset.tab); });
  document.querySelectorAll('[data-view]').forEach(b => { b.onclick = () => { S.view = b.dataset.view; document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('on', x === b)); if (S.view !== 'compare') $('banner').textContent = ''; draw(); }; });
  const rebuildOn = ['formation', 'concept', 'flip', 'audibles', 'def-personnel', 'front', 'coverage', 'pressure', 'zone-style', 'down', 'distance', 'side', 'yard', 'hash'];
  for (const id of rebuildOn) $(id).addEventListener('change', () => {
    readBuilder();
    if (id === 'def-personnel') fillFronts();
    if (id === 'coverage') fillPressures();
    if (id === 'formation') { /* concepts stay; the engine checks receivers */ }
    readBuilder(); rebuild();
  });
  document.querySelectorAll('input[name=kind]').forEach(r => r.addEventListener('change', () => { readBuilder(); fillConcepts(); readBuilder(); rebuild(); }));
  $('roster-seed').addEventListener('change', async () => { readBuilder(); S.recipe.picks = []; S.recipe.edits = []; S.rosters = await api(`rosters?seed=${S.recipe.rosterSeed}&strength=${S.recipe.strength}`); rebuild(); });
  $('strength').addEventListener('input', () => { $('strength-out').value = Number($('strength').value).toFixed(2); });
  $('strength').addEventListener('change', async () => { readBuilder(); S.recipe.picks = []; S.recipe.edits = []; S.rosters = await api(`rosters?seed=${S.recipe.rosterSeed}&strength=${S.recipe.strength}`); rebuild(); });
  $('seed').addEventListener('change', () => { if (S.recipe) { readBuilder(); rebuild(); } });
  $('run').onclick = () => runPlay();
  $('seed-next').onclick = async () => { $('seed').value = String((Number($('seed').value) || 0) + 1); if (S.recipe) { readBuilder(); await rebuild(); } runPlay(); };
  $('batch').onclick = () => runBatch();
  $('save').onclick = () => saveScenario().catch(fail);
  $('new').onclick = async () => {
    S.scenario = null; S.run = null; S.selected = S.second = -1; S.notes = []; renderNotes();
    S.recipe = defaultRecipe(); $('scenario-name').value = 'Untitled play';
    document.querySelectorAll('[data-pane=build] select, [data-pane=build] input').forEach(el => { el.disabled = false; });
    fillBuilder(); S.rosters = await api(`rosters?seed=${S.recipe.rosterSeed}&strength=${S.recipe.strength}`);
    await rebuild(); renderFlags(); S.arrange = true; showTab('build'); draw();
  };
  $('arrange').onclick = () => {
    if (!S.preview) return;
    S.arrange = !S.arrange; S.playing = false; $('arrange').classList.toggle('on', S.arrange);
    if (S.arrange) { $('empty').hidden = true; S.selected = S.second = -1; }
    draw();
  };
  $('reset-align').onclick = async () => { S.scenario.interventions = []; renderInterventions(); await refreshPreview().catch(fail); };
  $('interventions').onclick = async (e) => { const id = e.target.dataset?.remove; if (!id) return; S.scenario.interventions = S.scenario.interventions.filter(iv => iv.id !== id); renderInterventions(); await refreshPreview().catch(fail); };
  $('flag-filter').oninput = renderFlags;
  $('flags').onchange = (e) => {
    const f = e.target.dataset.flag, ft = e.target.dataset.flagText;
    S.scenario.flags ??= {};
    if (f) { const def = S.catalog.settings[f]; if (e.target.checked === def) delete S.scenario.flags[f]; else S.scenario.flags[f] = e.target.checked ? '1' : '0'; }
    if (ft) { if (e.target.value === '') delete S.scenario.flags[ft]; else S.scenario.flags[ft] = e.target.value; }
    renderFlags(); refreshPreview().catch(fail);
  };
  $('lineup').onchange = (e) => {
    const k = e.target.dataset.pick; if (!k) return;
    const [team, slot] = k.split(':'); S.recipe.picks = S.recipe.picks.filter(p => !(p.team === team && p.slot === slot));
    S.recipe.picks.push({ team, slot, playerId: e.target.value }); rebuild();
  };
  $('lineup').onclick = (e) => { const id = e.target.dataset.edit; if (id) renderEditor(id); };
  $('editor').oninput = (e) => { const out = e.target.nextElementSibling; if (out?.tagName === 'OUTPUT') out.value = e.target.value; };
  $('editor').onchange = (e) => {
    const pid = $('editor').dataset.player;
    if (e.target.dataset.rating) setEdit(pid, 'ratings', e.target.dataset.rating, Number(e.target.value));
    else if (e.target.dataset.meas) setEdit(pid, 'measurables', e.target.dataset.meas, Number(e.target.value));
    else return;
    e.target.parentElement.classList.add('changed'); rebuild();
  };
  $('editor').onclick = (e) => {
    if (e.target.id === 'editor-close') $('editor').innerHTML = '';
    if (e.target.id === 'editor-reset') { const pid = $('editor').dataset.player; S.recipe.edits = S.recipe.edits.filter(x => x.playerId !== pid); renderEditor(pid); rebuild(); }
  };
  $('run-list').onclick = (e) => {
    const a = e.target.dataset.a, b = e.target.dataset.b;
    if (a) { S.runA = S.runs.find(r => r.id === a); draw(); return; }
    if (b) { S.runB = S.runs.find(r => r.id === b); draw(); return; }
    const row = e.target.closest('tr[data-run]'); if (row) setRun(S.runs.find(r => r.id === row.dataset.run));
  };
  $('batch-summary').onclick = (e) => { const row = e.target.closest('tr[data-seed]'); if (row) { $('seed').value = row.dataset.seed; if (S.recipe) S.recipe.seed = Number(row.dataset.seed); runPlay(Number(row.dataset.seed)); } };
  $('note-new').onclick = openNoteForm;
  $('note-form').onsubmit = saveNote;
  $('note-cancel').onclick = () => { $('note-form').hidden = true; };
  $('note-from-now').onclick = () => { $('note-from').value = S.t.toFixed(2); };
  $('note-to-now').onclick = () => { $('note-to').value = S.t.toFixed(2); };
  $('notes').onclick = async (e) => {
    const n = S.notes.find(x => x.id === (e.target.dataset.goto ?? e.target.dataset.copy ?? e.target.dataset.del ?? e.target.closest('.note')?.dataset.note));
    if (!n) return;
    if (e.target.dataset.copy) copy(noteReference(n));
    else if (e.target.dataset.del) { if (confirm('Delete this note?')) { await api(`notes/${n.id}`, undefined, 'DELETE'); S.notes = S.notes.filter(x => x !== n); renderNotes(); renderTicks(); } }
    else gotoNote(n).catch(fail);
  };
  $('library').onclick = async (e) => {
    if (e.target.dataset.open) openScenario(await api(`scenarios/${e.target.dataset.open}`)).catch(fail);
    if (e.target.dataset.delete && confirm('Delete this scenario file?')) { await api(`scenarios/${e.target.dataset.delete}`, undefined, 'DELETE'); renderLibrary(); }
  };
  $('saved-plays').onclick = async (e) => { if (e.target.dataset.import) openScenario(await api('import-saved', { path: e.target.dataset.import })).then(() => toast('Imported. Its setup is the saved bytes; the builder is locked.')).catch(fail); };
  $('play').onclick = () => { if (!S.run) return; const T = S.run.frames.t; if (S.t >= T[T.length - 1]) S.t = T[0]; S.playing = !S.playing; draw(); };
  $('back').onclick = () => stepFrame(-1); $('fwd').onclick = () => stepFrame(1);
  $('time').oninput = () => { S.playing = false; seek(Number($('time').value)); };
  $('copy-ref').onclick = () => copy(momentReference());
  $('events').onclick = (e) => { const li = e.target.closest('li'); if (!li) return; S.playing = false; if (li.dataset.a !== '' && li.dataset.a !== undefined) { S.selected = Number(li.dataset.a); loadTraceIfNeeded(); } seek(Number(li.dataset.t)); };
  $('events-all').onchange = renderEvents;
  $('player-panel').onclick = (e) => { const el = e.target.closest('[data-t]'); if (el) { S.playing = false; seek(Number(el.dataset.t)); } };
  $('layers').onchange = (e) => { const k = e.target.dataset.layer; if (!k) return; S.layers[k] = e.target.checked; try { localStorage.setItem('lab-layers', JSON.stringify(S.layers)); } catch { /* optional */ } loadTraceIfNeeded(); draw(); };
  $('f-group').innerHTML = Object.entries(GROUP_NAMES).map(([k, v]) => opt(k, v)).join('');
  $('f-team').onchange = () => { S.filter.team = $('f-team').value; draw(); };
  $('f-group').onchange = () => { S.filter.group = $('f-group').value; draw(); };
  $('f-near').oninput = () => { S.filter.near = Number($('f-near').value); $('f-near-out').value = S.filter.near ? `${S.filter.near} yd` : 'any distance'; draw(); };
  $('jerseys').onchange = () => { S.labels = $('jerseys').checked ? 'jersey' : 'slot'; draw(); };
  for (const c of canvases) {
    c.addEventListener('pointerdown', onDown); c.addEventListener('pointermove', onMove); c.addEventListener('pointerup', onUp);
    c.addEventListener('wheel', (e) => { e.preventDefault(); S.zoom = Math.max(0.5, Math.min(6, S.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); draw(); }, { passive: false });
    c.addEventListener('dblclick', () => { S.zoom = 1; S.pan = [0, 0]; draw(); });
  }
  window.addEventListener('resize', draw);
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (e.key === ' ') { e.preventDefault(); $('play').click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? seek(S.t - 1) : stepFrame(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.shiftKey ? seek(S.t + 1) : stepFrame(1); }
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openNoteForm(); }
    else if (e.key === 'r' || e.key === 'R') runPlay();
    else if (e.key === 'Escape') { S.selected = S.second = -1; draw(); }
  });
}

async function restoreFromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('note')) {
    const n = await api(`notes/${h.get('note')}`);
    n.runKey = `${n.scenario.setup.sha256}:${n.seed}:${JSON.stringify((n.interventions ?? []).map(i => [i.slot, i.to]))}`;
    await openScenario(await api(`scenarios/${n.scenarioId}`).catch(() => n.scenario));
    if (!S.notes.some(x => x.id === n.id)) S.notes.push(n);
    await gotoNote(n); return true;
  }
  if (h.get('scenario')) {
    await openScenario(await api(`scenarios/${h.get('scenario')}`));
    const seed = h.get('seed');
    await runPlay(seed === '' || seed === null ? undefined : Number(seed));
    S.playing = false; S.t = Number(h.get('t') ?? 0);
    const ps = (h.get('p') ?? '').split(',').filter(Boolean).map(p => S.run.roster.findIndex(r => `${r.team}:${r.slot}` === p));
    S.selected = ps[0] ?? -1; S.second = ps[1] ?? -1; loadTraceIfNeeded(); draw(); return true;
  }
  return false;
}

async function init() {
  wire(); renderLayers();
  try {
    S.catalog = await api('catalog');
    $('engine').textContent = `engine ${S.catalog.commit?.slice(0, 8) ?? '?'}${S.catalog.srcDirty ? '+edits' : ''} · ${S.catalog.pool} workers`;
    if (!(await restoreFromHash())) {
      S.recipe = defaultRecipe(); fillBuilder();
      S.rosters = await api(`rosters?seed=${S.recipe.rosterSeed}&strength=${S.recipe.strength}`);
      await rebuild(); renderFlags();
      S.arrange = true; $('empty').hidden = true; draw();
    } else renderFlags();
  } catch (e) { fail(e); }
  requestAnimationFrame(loop);
}
window.playLab = S; // for debugging and browser tests
init();
