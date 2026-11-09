/** DEF_STANCE check on native snaps: stance by slot/front; per front defender get-off (first speed > 1 yd/s), posture at his
 * first engagement, run-read time; per play yards / sack / pressure. One arm per process. usage: <out.jsonl> [seeds] */
import { writeFileSync } from 'node:fs';
import { nativeTraceSetup } from './command-trace.js';
import { PlaySim } from '../../src/sim/playsim.js';
(PlaySim as any).recordedSingleStream = true;
const OUT = process.argv[2], SEEDS = Number(process.argv[3] ?? 4); const rows: string[] = [];
const CON = ['iz_strong', 'oz_strong', 'power', 'counter', 'smash', 'four_verts', 'flood', 'curl_flat', 'mesh', 'dagger'];
for (const concept of CON) for (const formation of ['gun_doubles_11', 'ace_11', 'i_pro_21']) for (const coverage of ['cover3', 'cover2', 'cover1']) for (let seed = 1; seed <= SEEDS; seed++) for (const flip of [false, true]) {
  let setup: any; try { setup = nativeTraceSetup({ coverage, concept, seed, roster: 7, formation, flip }); } catch { continue; }
  let sim: any; try { sim = new PlaySim(setup); } catch { continue; }
  const front = sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot)); const M = new Map<any, any>(front.map((d: any) => [d, { go: NaN, post: NaN, run: NaN }]));
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); for (const d of front) { const m = M.get(d)!;
      if (!Number.isFinite(m.go) && Math.hypot(d.vel.x, d.vel.y) > 1) m.go = sim.t;
      if (!Number.isFinite(m.post) && d.engagement) m.post = d.body.support?.posture ?? NaN;
      if (!Number.isFinite(m.run) && d.recog?.read === 'run') m.run = sim.t; } };
  let r: any; try { r = sim.run(); } catch { continue; }
  const pr = (sim.events as any[]).find(e => e.type === 'pressure');
  rows.push(JSON.stringify({ id: `${concept}|${formation}|${coverage}|${seed}|${flip}`, concept, pass: !!setup.offCall?.pass, front: sim.defCall.front.id, pers: sim.defCall.personnel, y: r.yards, sack: !!r.stats?.sacked, press: !!pr,
    def: front.map((d: any) => ({ slot: d.slot, pos: d.player.position, st: d.setStance, ...M.get(d) })) }));
}
writeFileSync(OUT, rows.join('\n'));
