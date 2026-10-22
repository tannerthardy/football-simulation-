/** Backside defensive linemen on lab runs, over time (observation only; flags from the
 * environment): read (run/pass/unsure), the fit tags in force, his lateral
 * travel toward the play and his aim's lateral offset from him. Same roster,
 * seeds and calls as scripts/run-blocking-lab.ts.
 * node --import tsx scripts/diag/runblock/dltrace.ts [form] [concept] [front] [reps] */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const [form = 'ace_11', concept = 'power', front = 'over', repsS = '20'] = process.argv.slice(2);
const reps = Number(repsS), rng = new Rng(7);
const home = generateTeam(rng.fork('offense'), 'Offense', 'OFF', { strength: 0.55 });
const away = generateTeam(rng.fork('defense'), 'Defense', 'DEF', { strength: 0.55 });
const formation = FORMATION_BY_ID[form], personnel = formation.personnel === '11' ? 'nickel' : 'base43';
const T = [0.5, 1, 1.5, 2];
const ticks = { n: 0, toward: 0, flip: 0, downhill: [] as number[], speed: [] as number[] };
const acc: Record<string, { read: Record<string, number>; tag: Record<string, number>; flow: number[]; job: Record<string, number>; want: number[]; got: number[] }> = {};
for (let i = 0; i < reps; i++) for (const flip of [false, true]) {
  const sim = new PlaySim({ offense: pickOffense(home, formation.personnel), defense: pickDefense(away, personnel),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[concept], label: concept },
    defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: rng.fork(`${form}:${concept}:${front}:${flip}:${i}`) });
  const lbs = sim.defense.filter(d => /^(DE|DT|NT)/.test(d.slot) && (d.pos.y - sim.ballY) * playSideSign(sim, RUN_BY_ID[concept]) < -0.5);
  const start = new Map(lbs.map(d => [d, d.pos.y]));
  const ps = playSideSign(sim, RUN_BY_ID[concept]);
  let k = 0;
  const lastSign = new Map<typeof lbs[number], number>();
  while (sim.phase === 'live' && k < T.length) {
    sim.tick();
    if (sim.t > 1.3 && sim.t <= 2.0) for (const d of lbs) {
      const it = sim.intents[d.idx]; if (!it || d.engagement) continue;
      const sg = Math.sign(it.vel.y * ps); const prev = lastSign.get(d);
      ticks.n++; if (sg > 0) ticks.toward++; if (prev !== undefined && sg !== prev && sg !== 0) ticks.flip++;
      lastSign.set(d, sg); ticks.downhill.push(-it.vel.x * sim.attackDir(d.team) * -1); ticks.speed.push(Math.hypot(d.vel.x, d.vel.y));
    }
    if (sim.t + 1e-9 < T[k]) continue;
    for (const d of lbs) {
      const key = `${T[k].toFixed(1)}s`;
      const a = acc[key] ??= { read: {}, tag: {}, flow: [], job: {}, want: [], got: [] };
      const intent = sim.intents[d.idx]; const free = !d.engagement && !sim.world.joints.some(j => j.a === d.body || j.b === d.body);
      const st = free ? 'free' : 'held'; a.read[st] = (a.read[st] ?? 0) + 1;
      if (intent) { a.want.push(intent.vel.y * ps); a.got.push(d.vel.y * ps); }
      const r = d.recog?.read ?? 'none'; a.read[r] = (a.read[r] ?? 0) + 1;
      const tags = [...d.tags].filter(t => t.startsWith('fit-')).join(',') || 'no fit tag';
      a.tag[tags] = (a.tag[tags] ?? 0) + 1;
      const j = d.runFit ? `${d.runFit.kind}/${d.runFit.pace}` : 'none'; a.job[j] = (a.job[j] ?? 0) + 1;
      a.flow.push((d.pos.y - start.get(d)!) * ps);
    }
    k++;
  }
}
const med = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1]?.toFixed(2);
for (const [t, a] of Object.entries(acc)) console.log(t, 'flow toward play p50', med(a.flow), '| backside DL: requested / actual lateral speed toward play', med(a.want), '/', med(a.got), '| read', JSON.stringify(a.read), '| tags', JSON.stringify(a.tag), '| job', JSON.stringify(a.job));
console.log(`1.3-2.0 s free backers: request toward play ${(100 * ticks.toward / ticks.n).toFixed(0)}% of ticks, sign flips ${(100 * ticks.flip / ticks.n).toFixed(1)}% of ticks, requested x ${med(ticks.downhill)}, actual speed ${med(ticks.speed)}`);
