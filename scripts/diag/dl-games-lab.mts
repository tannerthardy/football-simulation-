/** Paired DL-games lab (Defense): the same native snap with and without a called line game.
 * Runs: yards, tackle for loss, whether any DL reaches 1 yd past the LOS behind the line (penetration) by 1.5 s.
 * Passes: sack, pressure event, first pressure time. usage: _dlgames-lab.mts runs|passes [seeds] */
import { nativeTraceSetup } from './command-trace.js';
import { PlaySim } from '../../src/sim/playsim.js';
(PlaySim as any).recordedSingleStream = true;
const mode = process.argv[2] ?? 'runs', SEEDS = Number(process.argv[3] ?? 6);
const RUNS = ['iz_strong', 'oz_strong', 'wz_weak', 'power', 'counter', 'duo', 'trap', 'split_zone'];
const PASSES = ['four_verts', 'smash', 'curl_flat', 'flood', 'dagger', 'mesh', 'levels', 'drive'];
const FORMS = mode === 'runs' ? ['ace_11', 'i_pro_21', 'gun_doubles_11'] : ['gun_doubles_11', 'gun_trips_11', 'ace_11'];
const GAMES: any[] = mode === 'runs'
  ? [null, { kind: 'angle', dir: 'S' }, { kind: 'angle', dir: 'W' }, { kind: 'slant', dir: 'S' }, { kind: 'slant', dir: 'W' }, { kind: 'pinch', dir: 'S' }]
  : [null, { kind: 'twist', dir: 'S', pair: 'TE' }, { kind: 'twist', dir: 'W', pair: 'TE' }, { kind: 'twist', dir: 'S', pair: 'ET' }, { kind: 'twist', dir: 'W', pair: 'ET' }, { kind: 'twist', dir: 'S', pair: 'TT' }];
const S: Record<string, any[]> = {};
for (const concept of mode === 'runs' ? RUNS : PASSES) for (const formation of FORMS) for (let seed = 1; seed <= SEEDS; seed++) for (const flip of [false, true]) {
  for (const game of GAMES) {
    let setup: any; try { setup = nativeTraceSetup({ coverage: 'cover3', concept, seed, roster: 7, formation, flip }); } catch { continue; }
    if (game) setup.defCall = { ...setup.defCall, dlGame: game };
    let sim: any; try { sim = new PlaySim(setup); } catch { continue; } const dir = sim.attackDir(sim.offense[0].team);
    let pen = false; const t0 = sim.tick.bind(sim);
    sim.tick = () => { t0(); if (sim.t <= 1.5) for (const d of sim.defense) if (['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'].includes(d.slot) && (d.pos.x - sim.los) * dir < -1 && !d.engagement) pen = true; };
    let r: any; try { r = sim.run(); } catch { continue; }
    const ev = sim.events as any[]; const pr = ev.find(e => e.type === 'pressure');
    const key = game ? `${game.kind}${game.pair ?? ''} ${game.dir}` : 'none';
    (S[key] ??= []).push({ y: r.yards, tfl: r.yards < 0, pen, sack: !!r.stats?.sacked, pressure: !!pr, pt: pr?.t ?? null, id: `${concept}|${formation}|${seed}|${flip}` });
  }
}
const base = new Map((S.none ?? []).map(x => [x.id, x]));
for (const [k, v] of Object.entries(S)) {
  const n = v.length, mean = (f: (x: any) => number) => v.reduce((a, x) => a + f(x), 0) / n;
  const paired = v.filter(x => base.has(x.id)).map(x => x.y - base.get(x.id)!.y);
  const d = paired.reduce((a, b) => a + b, 0) / Math.max(1, paired.length), sd = Math.sqrt(paired.reduce((a, b) => a + (b - d) ** 2, 0) / Math.max(1, paired.length));
  console.log(k.padEnd(12), 'n', String(n).padStart(4), mode === 'runs'
    ? `| mean ${mean(x => x.y).toFixed(2)} (paired d ${d >= 0 ? '+' : ''}${d.toFixed(2)} se ${(sd / Math.sqrt(paired.length)).toFixed(2)}) | 10+ ${(100 * mean(x => +(x.y >= 10))).toFixed(1)}% | TFL ${(100 * mean(x => +x.tfl)).toFixed(1)}% | DL free past LOS by 1.5 s ${(100 * mean(x => +x.pen)).toFixed(1)}%`
    : `| sack ${(100 * mean(x => +x.sack)).toFixed(1)}% | pressure ${(100 * mean(x => +x.pressure)).toFixed(1)}% | DL free past LOS by 1.5 s ${(100 * mean(x => +x.pen)).toFixed(1)}% | yds ${mean(x => x.y).toFixed(2)} (paired d ${d.toFixed(2)} se ${(sd / Math.sqrt(paired.length)).toFixed(2)})`);
}
