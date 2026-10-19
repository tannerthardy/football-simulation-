/** One selected lab case, tick by tick, for review (observation only). For
 * each named slot: position, stored velocity, the behavior's command, the
 * final intent after contact controllers and teammate spacing, facing,
 * support state, block rep (role, opponent, start) and possession; plus all
 * play events and the result. Settings come from the environment: launch it
 * through scripts/baseline.mjs (--candidate --flag ...) so the receipt binds
 * commit, source digest and resolved flags. The case identity, roster pair,
 * seed and the resolved values of every profile flag are written into the
 * witness itself.
 * node --import tsx scripts/diag/stretch/witness.ts --case iz/strong/gun_doubles_11/over3/pair11/77
 *   --slots RB,QB [--from 0] [--to 2.5] --out data/reviews/current/x.json */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { makeSim, rosters } from '../zone-lab/lab.js';

const arg = (n: string, d?: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const id = arg('--case')!, out = arg('--out')!;
const [concept, dir, formation, look, roster, seedS] = id.split('/');
const slots = arg('--slots', 'RB,QB')!.split(','), from = +arg('--from', '0')!, to = +arg('--to', '3')!;
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8')) as { flags: Record<string, string | null> };
const sim = makeSim({ concept, dir: dir as 'strong' | 'weak', look, roster, seed: +seedS, formation }, rosters());
const r2 = (v: number) => Math.round(v * 1000) / 1000;
const vec = (v: { x: number; y: number } | undefined) => v ? [r2(v.x), r2(v.y)] : null;
const cmds = (sim as unknown as { cmds: { vel: { x: number; y: number } }[] }).cmds;
const ticks: unknown[] = [];
while (sim.phase === 'live' && sim.t < 20) {
  sim.tick();
  if (sim.t < from - 1e-9 || sim.t > to + 1e-9) continue;
  ticks.push({ t: r2(sim.t), actors: Object.fromEntries(slots.map(slot => {
    const a = sim.slot(slot);
    if (!a) return [slot, null];
    const e = a.engagement;
    return [slot, { pos: vec(a.pos), vel: vec(a.vel), command: vec(cmds[a.idx]?.vel), intent: vec(sim.intents[a.idx]?.vel),
      facing: r2(a.facing), support: a.body.support?.state ?? null, behavior: a.behavior.kind, carrier: sim.carrier === a,
      rep: e ? { role: e.blocker === a ? 'blocker' : e.defender === a ? 'defender' : 'helper',
        opponent: (e.blocker === a ? e.defender : e.blocker).slot, start: r2(e.start), type: e.type } : null }];
  })) });
}
const result = sim.buildResult();
const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const witness = {
  case: id, los: sim.los, ballY: sim.ballY, attackDir: sim.attackDir('O'), dt: sim.dt, window: [from, to], slots,
  rosterPair: roster, seed: +seedS,
  flags: Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null])),
  commit: git(['rev-parse', 'HEAD']), dirtyFiles: git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean),
  tool: { path: 'scripts/diag/stretch/witness.ts', sha256: createHash('sha256').update(readFileSync('scripts/diag/stretch/witness.ts')).digest('hex') },
  node: process.version,
  result: { gain: r2(result.offenseYards), outcome: result.outcome },
  events: sim.events.map(e => ({ t: e.t, type: e.type, a: e.a !== undefined && e.a !== null ? sim.agents[e.a as number]?.slot ?? e.a : null,
    b: e.b !== undefined && e.b !== null ? sim.agents[e.b as number]?.slot ?? e.b : null, note: e.note ?? null })),
  ticks,
};
const text = JSON.stringify(witness);
writeFileSync(out, text + '\n');
console.log(`${id}: gain ${witness.result.gain} ${witness.result.outcome}, ${ticks.length} ticks -> ${out} sha256 ${createHash('sha256').update(text + '\n').digest('hex')}`);
