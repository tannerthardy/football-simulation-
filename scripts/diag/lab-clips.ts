/** Play Lab clips for Tanner: one scenario + one note per clip, replayable with `npm run lab:replay`.
 *   node --import tsx scripts/diag/lab-clips.ts build [out=artifacts/lab-clips]
 *   node --import tsx scripts/diag/lab-clips.ts arm <clip>      (prints this process's facts as JSON; flags come from the environment)
 * `build` needs two captures (commands in the README): out/seal-hold/seed9.json and out/lab-clips/remote-grasp-seed7.json.
 * Every clip's "alternative" arm is the same scenario run in its own process with the change's switch off, so the
 * facts printed in the README are a matched pair, not two different plays. Nothing here changes football behavior. */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as engine from '../../lab-app/engine.js';
import type { Recipe, Scenario } from '../../lab-app/engine.js';

type Facts = Record<string, unknown>;
interface Clip {
  key: string; change: string; title: string;
  source: { recipe: Recipe } | { capture: 'seal-hold-9-130' | 'remote-grasp-7-117' };
  seed?: number;
  /** Switch that turns the change off, for the alternative arm. */
  off?: Record<string, string>;
  /** Blocker and defender of the rep a run clip is about. */
  rep?: { blocker: string; defender: string };
  players: Array<{ team: 'O' | 'D'; slot: string }>;
  at: number; window: { from: number; to: number };
  category: 'bad decision' | 'impossible physics' | 'wrong information' | 'missing technique' | 'looks great' | 'other';
  duty: string; changed: string; alternative: string; question: string;
}

const base = (o: Partial<Recipe['offense']>, d: Partial<Recipe['defense']>): Recipe => {
  const r = engine.defaultRecipe();
  r.offense = { ...r.offense, ...o }; r.defense = { ...r.defense, ...d };
  r.rosterSeed = 7; r.situation.ballOn = 30;
  return r;
};
const smash = base({ formation: 'gun_doubles_11', kind: 'pass', concept: 'smash' }, { personnel: 'nickel', front: 'over', coverage: 'cover3' });
const wideZone = (coverage: string) => base({ formation: 'ace_12', kind: 'run', concept: 'wz_weak' }, { personnel: 'nickel', front: 'under', coverage });

export const CLIPS: Clip[] = [
  { key: '274a-scramble', change: '#274 scramble cue', title: 'Smash vs Cover 3: the QB takes off at 3.4 s', source: { recipe: smash }, seed: 4,
    players: [{ team: 'D', slot: 'LB_M' }, { team: 'D', slot: 'CB_S' }], at: 3.45, window: { from: 3.2, to: 5.2 }, category: 'other',
    duty: 'Gun doubles, Smash, against the nickel Over in Cover 3. The Mike has the strong hook, the nickel and strong safety the curl-flats, the free safety the deep middle, the corners the deep thirds; the four-man rush closes on the QB.',
    changed: 'Until #274 every defender read the true "QB has scrambled" flag the instant it flipped. Now each defender reacts only to his own delayed picture of a QB who is carrying and heading for the line (over 2.5 yd/s at the front of the pocket, or outside the tackles heading downfield). Rushers turn to their fit, underneath zones come up, and man and deep-zone defenders stay with their receivers until the QB crosses the line.',
    alternative: 'An underneath defender could stay home on his curl-flat until the QB crosses the line, as the corners do, and trade the QB\'s green grass for a throw he can still make.',
    question: 'The Mike comes up as soon as the QB leaves, the nickel, strong safety and free safety wait about half a second more, and the corners wait for the line: is that the right order for Cover 3?' },
  { key: '274b-stepup', change: '#274 scramble cue', title: 'Same play, other seed: the QB steps up and throws', source: { recipe: smash }, seed: 15,
    players: [{ team: 'D', slot: 'LB_M' }, { team: 'D', slot: 'NB' }], at: 3.45, window: { from: 3.0, to: 3.9 }, category: 'other',
    duty: 'Same Smash against Cover 3, play seed 15: the tackles are driven back and the pocket collapses from the edges while the QB climbs.',
    changed: 'The cue needs the QB moving toward the line above 2.5 yd/s at the front of the pocket (never deeper than 2 yd behind the line, or 1 yd behind the pictured tackles), or outside the tackles. A step-up inside a collapsing pocket is not evidence of a runner, so the defenders keep their zones and the QB throws at 3.75 s.',
    alternative: 'A defender who reads any forward QB movement as a run would come up here and open the throw behind him.',
    question: 'This QB climbs about 2.2 yd/s at the back of a collapsing pocket and throws; is there anything in that picture a real linebacker would have read as "he\'s running"?' },
  { key: '275-edge', change: '#275 edge contain', title: 'Weak wide zone: the blocked end', source: { recipe: wideZone('cover3') }, seed: 2, off: { EDGE_CONTAIN: '0' }, rep: { blocker: 'H', defender: 'DE_W' },
    players: [{ team: 'D', slot: 'DE_W' }, { team: 'O', slot: 'H' }], at: 2.0, window: { from: 0.7, to: 2.8 }, category: 'looks great',
    duty: 'Singleback Twin TE, weak wide zone, against the nickel 4-3 Under in Cover 3. The H (second tight end) blocks the weak-side end; the back reads the wide zone track.',
    changed: 'EDGE_CONTAIN (on by default): a blocked edge now bounds his lateral objective to just outside where the back\'s observed track crosses his depth, and if he is already wider he stops and holds his ground. Before, the end and blocker chased each other sideways down the line.',
    alternative: 'The old arm (EDGE_CONTAIN=0, the `-off` scenario) lets the end run along the line with the blocker; a coach might also want the end to keep playing outside the blocker\'s shoulder to set the edge no matter where the back is.',
    question: 'Once the tight end has him and he is already outside the back\'s track, should the end hold his ground and make the back bend, or keep sliding outside the blocker to set the edge?' },
  { key: '279-gaps', change: '#279 gap fits', title: 'Nickel Under vs 12 personnel: who has the weak C', source: { recipe: wideZone('cover2') }, seed: 2, off: { GAP_MATCH: '0' },
    players: [{ team: 'D', slot: 'LB_W' }, { team: 'D', slot: 'LB_M' }], at: 0.6, window: { from: 0.3, to: 1.6 }, category: 'other',
    duty: 'Nickel 4-3 Under in Cover 2 against Singleback Twin TE, weak wide zone. The Will and Mike are the insert backers and share the open gaps; the corners are force; the nickel, free and strong safety are the alley players.',
    changed: 'GAP_MATCH (on by default): the backers\' open gaps are now filled as a set, not nearest-first. When there are more gaps than backers, the gap left open is one an alley player still covers on that side, never an A gap or an unsupported gap.',
    alternative: 'Nearest-first (GAP_MATCH=0): the Will takes the weak A and the Mike the strong B, which leaves the weak C, the gap inside the boxed wide end, with no owner.',
    question: 'The Will now has the weak C and the Mike slides to the weak A, which leaves the strong B to the strong-side alley safety: against a weak-side run, is that the fit you want?' },
  { key: '281-seal', change: '#281 seal hold', title: 'Duo: the tackle and the end', source: { capture: 'seal-hold-9-130' }, off: { SEAL_HOLD: '0' }, rep: { blocker: 'LT', defender: 'DE_W' },
    players: [{ team: 'O', slot: 'LT' }, { team: 'D', slot: 'DE_W' }], at: 4.0, window: { from: 3.2, to: 5.4 }, category: 'other',
    duty: 'Gun Trey (TE attached), Duo. The left tackle blocks the weak-side end with his hands on him; the rep is a drive block, not a reach.',
    changed: 'SEAL_HOLD (on by default): once the blocker\'s hands are loaded, his seal correction targets the leverage he caught the man with, instead of running toward the end\'s outside at his top lateral request and carrying him along. Ground gained toward the wanted shoulder is kept. Physics and strength are unchanged.',
    alternative: 'The old arm (SEAL_HOLD=0, the `-off` scenario) keeps trying to get head-up, which walks the pair sideways. A real tackle might also give ground and take the end where the end wants to go.',
    question: 'The tackle caught the end on his inside half and now drives him from there instead of walking outside to get head-up: is that how a tackle blocks the end on a duo?' },
  { key: '273-remote', change: '#273 remote grab (held)', title: 'A strong safety lunges at a receiver beyond arm\'s length', source: { capture: 'remote-grasp-7-117' },
    players: [{ team: 'D', slot: 'SS' }, { team: 'O', slot: 'Z' }], at: 3.1, window: { from: 2.8, to: 4.0 }, category: 'impossible physics',
    duty: 'Pistol Doubles, Slant-Flat. The strong safety is a curl-flat player who breaks on the receiver after the catch.',
    changed: 'Develop lets a lunge form a hold wherever the lunge ends. #273 (held) makes the hold form only if the hands can reach the runner (standing reach, a lunge step, or a dive layout). This clip is today\'s develop; it has no switch.',
    alternative: 'Without the remote hold the safety misses and the receiver keeps running, which is what #273 shows in many snaps (+28% yards per play on its matched set).',
    question: 'The safety is about half a yard past arm\'s length when the hold forms, with the receiver at 5.5 yd/s and him at 3: should a tackle that reaches this far ever hold, or is that a miss?' },
];

// ----------------------------------------------------------------- facts

const round = (v: number, k = 100) => Math.round(v * k) / k;
type Run = ReturnType<typeof engine.run>;

function at(run: Run, i: number, t: number) {
  const n = run.roster.length, ts = run.frames.t;
  let k = 0; while (k < ts.length - 1 && ts[k] < t) k++;
  return { x: run.frames.p[(k * n + i) * 3], y: run.frames.p[(k * n + i) * 3 + 1] };
}
const idx = (run: Run, team: string, slot: string) => run.roster.findIndex(r => r.team === team && r.slot === slot);

function measure(clip: Clip, run: Run): Facts {
  const out: Facts = { outcome: run.summary.outcome, yards: run.summary.yards };
  const ev = (type: string) => run.events.filter(e => e.type === type);
  if (clip.key.startsWith('274')) {
    const qb = idx(run, 'O', 'QB'), n = run.roster.length, ts = run.frames.t;
    const scr = ev('scramble')[0]?.t, thr = ev('throw')[0]?.t;
    out.scrambleAt = scr ?? null; out.throwAt = thr ?? null;
    let crosses: number | null = null, peak = { v: 0, t: 0, depth: 0 };
    for (let k = 2; k < ts.length; k++) {
      const x = run.frames.p[(k * n + qb) * 3];
      if (crosses === null && x > run.los) crosses = ts[k];
      const v = (x - run.frames.p[((k - 2) * n + qb) * 3]) / (ts[k] - ts[k - 2]);
      if (ts[k] <= (scr ?? thr ?? 99) && v > peak.v) peak = { v: round(v, 10), t: ts[k], depth: round(x - run.los, 10) };
    }
    out.qbCrossesLineAt = crosses; out.qbPeakForwardBeforeScrambleOrThrow = peak;
    const lt = idx(run, 'O', 'LT'), rt = idx(run, 'O', 'RT');
    out.tackleDepthBehindLineAtPeak = round(run.los - Math.min(at(run, lt, peak.t).x, at(run, rt, peak.t).x), 10);
    if (scr === undefined) return out;
    const tel = run.telemetry!, from = scr;
    const first: Record<string, number | null> = {};
    for (const [slot] of run.roster.map((r, i) => [r.slot, i] as const).filter((_, i) => run.roster[i].team === 'D')) {
      const i = idx(run, 'D', slot); first[slot] = null;
      for (let k = 0; k < tel.frames.length; k++) {
        const f = tel.frames[k]; if (f.t < from - 0.05 || f.t > from + 3) continue;
        const v = (f.agents[i] as unknown as { intent?: { velocity?: [number, number] } }).intent?.velocity; if (!v) continue;
        const dx = run.frames.p[(k * n + qb) * 3] - run.frames.p[(k * n + i) * 3], dy = run.frames.p[(k * n + qb) * 3 + 1] - run.frames.p[(k * n + i) * 3 + 1];
        const d = Math.hypot(dx, dy) || 1, sp = Math.hypot(v[0], v[1]);
        if (sp > 2 && (v[0] * dx + v[1] * dy) / (sp * d) > Math.SQRT1_2) { first[slot] = round(f.t - from); break; }
      }
    }
    out.firstRequestTowardQbSecondsAfterScramble = first;
  } else if (clip.rep) {
    const blocker = idx(run, 'O', clip.rep.blocker), end = idx(run, 'D', clip.rep.defender);
    const engaged = run.telemetry!.frames.filter(fr => ((fr as unknown as { blocks?: Array<{ a: number; b: number }> }).blocks ?? [])
      .some(x => (x.a === blocker && x.b === end) || (x.a === end && x.b === blocker))).map(fr => fr.t);
    if (!engaged.length) { out.engaged = null; return out; }
    const t0 = engaged[0], t1 = engaged[engaged.length - 1], from = t0 + 0.3, to = Math.min(t0 + 2.3, t1);
    // Lateral travel in yards, positive toward his own sideline, negative toward the middle of the field.
    const centre = engine.FIELD.width / 2, outward = (i: number) => round((at(run, i, to).y - at(run, i, from).y) * Math.sign(at(run, end, from).y - centre), 10);
    out.engagedFromTo = [t0, t1]; out.lateralYardsTowardSidelineOverEngagement = { window: [round(from), round(to)], end: outward(end), blocker: outward(blocker) };
    out.tackleBy = run.events.filter(e => e.type === 'tackle').map(e => run.roster[e.a!]?.slot)[0] ?? null;
  } else if (clip.key === '279-gaps') {
    const f = run.telemetry!.frames.find(fr => fr.t >= 0.5)!;
    out.fitsAt0_5s = Object.fromEntries(run.roster.map((r, i) => [r, i] as const).filter(([r]) => r.team === 'D').map(([r, i]) => {
      const rf = (f.agents[i] as unknown as { runFit?: { gap: string; side: number; kind: string } }).runFit;
      return [r.slot, rf ? `${rf.gap}${rf.side > 0 ? '+' : '-'} ${rf.kind}` : null];
    }));
    out.tackleBy = run.events.filter(e => e.type === 'tackle').map(e => run.roster[e.a!]?.slot)[0] ?? null;
  } else if (clip.key === '273-remote') {
    out.tackleEvents = run.events.filter(e => /tackle|carrier_contact/.test(e.type)).map(e => `${e.type}@${e.t.toFixed(2)} ${run.roster[e.a!]?.slot}${e.b != null ? '>' + run.roster[e.b].slot : ''}`).slice(0, 6);
  }
  return out;
}

// ----------------------------------------------------------------- scenarios

const FIXED = '2026-10-25T00:00:00.000Z';
function scenarioFor(clip: Clip, flags: Record<string, string>, suffix = ''): Scenario {
  const id = `clip-${clip.key}${suffix}`, name = `${clip.change}: ${clip.title}${suffix ? ' (switch off)' : ''}`;
  if ('recipe' in clip.source) {
    return { ...engine.scenarioFromRecipe(clip.source.recipe, { id, name, created: FIXED, flags }), id, name };
  }
  const [dir, file, play] = clip.source.capture === 'seal-hold-9-130' ? ['out/seal-hold', 'seed9.json', 130] : ['out/lab-clips', 'remote-grasp-seed7.json', 117];
  const raw = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const entry = (Array.isArray(raw) ? raw : raw.plays).find((p: { play: number }) => p.play === play);
  if (!entry) throw new Error(`Capture ${dir}/${file} has no play ${play}; see the README for the capture command`);
  const bytes = Buffer.from(entry.setup, 'base64');
  return { format: engine.SCENARIO_FORMAT, id, name, created: FIXED,
    setup: { encoding: 'v8-base64', sha256: engine.sha256(bytes), bytes: entry.setup }, interventions: [], flags,
    source: { kind: 'saved-play', playId: `${file.replace('.json', '')} play ${play}`, identity: engine.identity(), text: `${entry.call} vs ${entry.defense}` } };
}

function noteText(c: Clip) {
  return `${c.title}. DUTY: ${c.duty} WHAT CHANGED: ${c.changed} ALTERNATIVE: ${c.alternative} QUESTION: ${c.question}`;
}

function build(outDir: string) {
  rmSync(outDir, { recursive: true, force: true });
  for (const d of ['scenarios', 'notes', 'facts']) mkdirSync(join(outDir, d), { recursive: true });
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const identity = engine.identity();
  const readme: string[] = [];
  for (const clip of CLIPS) {
    const sc = scenarioFor(clip, {});
    const main = engine.run(sc, { seed: clip.seed });
    const facts: Record<string, Facts> = { develop: measure(clip, main) };
    writeFileSync(join(outDir, 'scenarios', `${sc.id}.json`), JSON.stringify(sc));
    const players = clip.players.map(p => {
      const r = main.roster.find(x => x.team === p.team && x.slot === p.slot)!;
      return { index: main.roster.indexOf(r), team: p.team, slot: p.slot, playerId: r.playerId, name: r.name };
    });
    const note = { format: 'play-lab-note-v1', id: `note-${clip.key}`, scenarioId: sc.id, scenarioName: sc.name, category: clip.category, text: noteText(clip),
      at: clip.at, window: clip.window, players, seed: main.seed, engine: { commit, srcDirty: false, ...identity }, flags: {}, interventions: [],
      result: { outcome: main.summary.outcome, yards: main.summary.yards }, view: { view: 'all22', layers: {} }, scenario: sc,
      saved: FIXED, scenarioFile: `scenarios/${sc.id}.json`, replay: `npm run lab:replay -- artifacts/lab-clips/notes/note-${clip.key}.json` };
    writeFileSync(join(outDir, 'notes', `note-${clip.key}.json`), JSON.stringify(note));
    if (clip.off) {
      const off = scenarioFor(clip, clip.off, '-off');
      writeFileSync(join(outDir, 'scenarios', `${off.id}.json`), JSON.stringify(off));
      const r = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/diag/lab-clips.ts', 'arm', clip.key], { encoding: 'utf8', env: { ...process.env, ...clip.off } });
      if (r.status !== 0) throw new Error(`arm ${clip.key} failed: ${r.stderr}`);
      facts.switchOff = JSON.parse(r.stdout);
    }
    writeFileSync(join(outDir, 'facts', `${clip.key}.json`), JSON.stringify({ clip: clip.key, seed: main.seed, engine: { commit, ...identity }, facts }, null, 1));
    readme.push(clip.key);
    console.log(clip.key, JSON.stringify(facts));
  }
  writeFileSync(join(outDir, 'keys.json'), JSON.stringify(readme));
}

function arm(key: string) {
  const clip = CLIPS.find(c => c.key === key)!;
  const sc = scenarioFor(clip, {});
  const run = engine.run(sc, { seed: clip.seed });
  console.log(JSON.stringify(measure(clip, run)));
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'build') build(arg ?? 'artifacts/lab-clips');
else if (cmd === 'arm') arm(arg);
else console.error('usage: build [outDir] | arm <clip>');
