/** Counterfactual arms for engaged stretch reps (diagnostic only; no source
 * change). Just before each World step, engaged outside/wide-zone run reps
 * get one named request alteration; bodies, seeds and everything else stay
 * the same. Reports lateral flow of engaged pairs and the play's outcome.
 *
 *   control   unchanged
 *   noattack  engaged first-level defender requests no forward drive (keeps
 *             his own current depth velocity) and keeps his lateral request
 *   face      both face 45 deg toward their lateral travel instead of square
 *   both      noattack + face
 *   race      capability test: blocker and defender both request 3.4 yd/s
 *             toward the play side (the called track tempo), depth unchanged
 *   racefree  race, with the defender's forward drive also removed
 *
 * node --import tsx scripts/diag/stretch/arms.ts ARM [--seeds 77,71001,1] [--out file]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { LOOK_SPECS, makeSim, rosters, caseId } from '../zone-lab/lab.js';

const arm = process.argv[2] ?? 'control';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const R = rosters();
const out: string[] = [];
const angleOf = (x: number, y: number) => Math.atan2(y, x);
for (const concept of arg('--concepts', 'oz,wz').split(',')) for (const dir of ['strong', 'weak'] as const)
  for (const lk of LOOK_SPECS.map(l => l[0])) for (const roster of ['pair11', 'pair31']) for (const seed of arg('--seeds', '77,71001,1').split(',').map(Number)) {
    const c = { concept, dir, look: lk, roster, seed, formation: 'ace_12' };
    const sim = makeSim(c, R);
    const ps = dir === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
    const step = sim.world.step.bind(sim.world);
    let lat: number[] = [], olLat: number[] = [];
    (sim.world as any).step = (intents: any[], dt: number) => {
      if (arm !== 'control') for (const e of sim.engagements) {
        if (e.type !== 'run' || !['LT', 'LG', 'C', 'RG', 'RT', 'Y', 'H'].includes(e.blocker.slot)) continue;
        const d = e.defender, b = e.blocker, di = intents[d.idx], bi = intents[b.idx];
        const first = d.runFit && (d.runFit.kind === 'interior' || d.runFit.kind === 'edge');
        if (!di || !bi) continue;
        if ((arm === 'noattack' || arm === 'both') && first) intents[d.idx] = { ...di, vel: { x: d.vel.x, y: di.vel.y } };
        if (arm === 'race' || arm === 'racefree') {
          const ps2 = dir === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
          intents[b.idx] = { ...intents[b.idx], vel: { x: intents[b.idx].vel.x, y: ps2 * 3.4 } };
          intents[d.idx] = { ...intents[d.idx], vel: { x: arm === 'racefree' ? d.vel.x : intents[d.idx].vel.x, y: ps2 * 3.4 } };
        }
        if (arm === 'face' || arm === 'both') {
          for (const [a, it] of [[d, intents[d.idx]], [b, bi]] as const) {
            const toOpp = angleOf((a === d ? b : d).pos.x - a.pos.x, (a === d ? b : d).pos.y - a.pos.y);
            const travel = Math.sign(it.vel.y || 1);
            // Turn 45 deg from square toward the lateral direction of the request.
            const q = toOpp + travel * Math.sign(Math.cos(toOpp)) * Math.PI / 4;
            intents[a.idx] = { ...it, facing: q };
          }
        }
      }
      return step(intents, dt);
    };
    let t2: { dl: number[]; ol: number[] } | null = null;
    const start = new Map(sim.agents.map(a => [a, a.pos.y]));
    while (sim.phase === 'live' && sim.t < 20) {
      sim.tick();
      if (!t2 && sim.t >= 2) {
        const eng = sim.engagements.filter(e => e.type === 'run');
        t2 = { dl: eng.map(e => (e.defender.pos.y - start.get(e.defender)!) * ps), ol: eng.map(e => (e.blocker.pos.y - start.get(e.blocker)!) * ps) };
      }
    }
    const res = sim.buildResult();
    out.push(JSON.stringify({ id: caseId(c), ...c, gain: Math.round(res.offenseYards * 100) / 100, terminal: sim.phase !== 'live', t2 }));
  }
const file = arg('--out', `out/stretch/arm-${arm}.jsonl.gz`);
mkdirSync('out/stretch', { recursive: true });
writeFileSync(file, gzipSync(out.join('\n') + '\n'));
const rows = out.map(l => JSON.parse(l));
const g = rows.map(r => r.gain).sort((a, b) => a - b), n = g.length;
const med = (xs: number[]) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const dl = rows.flatMap(r => r.t2?.dl ?? []), ol = rows.flatMap(r => r.t2?.ol ?? []);
console.log(`${arm.padEnd(9)} n ${n} mean ${(g.reduce((a, b) => a + b, 0) / n).toFixed(2)} p50 ${g[n >> 1].toFixed(1)} neg ${(100 * g.filter(x => x < 0).length / n).toFixed(1)}% 4+ ${(100 * g.filter(x => x >= 4).length / n).toFixed(1)}% 10+ ${(100 * g.filter(x => x >= 10).length / n).toFixed(1)}% | engaged at 2 s lateral since snap: DL ${med(dl).toFixed(2)} OL ${med(ol).toFixed(2)} (NFL OZ 4.45 / 4.94)`);
