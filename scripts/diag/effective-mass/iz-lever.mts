// HANDS_LEVER's inside-zone row (Integration, 2026-11-14; the fresh run set's IZ +0.73, SE 0.24, missed per run 0.133 ->
// 0.242). A matched staged set: inside zone (iz_strong) from ace_12 against a base 4-3 Under and Over, both flips, the
// same generated bodies and seeds in both arms (the dither panel's construction). Per play: yards; the first tick the
// two arms diverge and the body that diverges (and the engagement it is in); per matched block (blocker slot x
// defender slot): its duration, each man's net facing change over it, and how it ended.
// usage: node --import tsx scripts/diag/effective-mass/iz-lever.mts [seeds] > out.json   (run once per arm: HANDS_LEVER=0/1)
import { readFileSync } from 'node:fs';
const stack = JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags;
for (const [k, v] of Object.entries(stack)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { Rng } = await import('../../../src/core/rng.js');
const { generateTeam, pickDefense, pickOffense } = await import('../../../src/league/team.js');
const { RUN_BY_ID } = await import('../../../src/playbook/concepts.js');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../../../src/playbook/defense.js');
const { FORMATION_BY_ID } = await import('../../../src/playbook/formations.js');
const { PlaySim } = await import('../../../src/sim/playsim.js');
const seeds = Number(process.argv[2] ?? 30);
const out: any[] = [];
for (const team of [101, 202, 303]) {
  const offense = generateTeam(new Rng(team), 'IZ O', 'IZO', { strength: .55 }), defense = generateTeam(new Rng(team + 1), 'IZ D', 'IZD', { strength: .55 });
  for (const front of ['under', 'over']) for (let seed = 1; seed <= seeds; seed++) {
    const formation = FORMATION_BY_ID.ace_12;
    const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'iz' },
      defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'iz' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    const pos: number[][] = []; const reps = new Map<any, any>();
    const tick0 = sim.tick.bind(sim);
    sim.tick = () => {
      tick0();
      pos.push(sim.agents.flatMap((a: any) => [Math.round(a.pos.x * 1000) / 1000, Math.round(a.pos.y * 1000) / 1000]));
      for (const e of sim.engagements) {
        const k = `${e.blocker.slot}>${e.defender.slot}`;
        const r = reps.get(e) ?? { k, t0: sim.t, fb0: e.blocker.body.facing, fd0: e.defender.body.facing };
        r.t1 = sim.t; r.fb1 = e.blocker.body.facing; r.fd1 = e.defender.body.facing; reps.set(e, r);
      }
    };
    const res = sim.run();
    const turn = (a: number, b: number) => Math.round(Math.atan2(Math.sin(b - a), Math.cos(b - a)) * 180 / Math.PI);
    const blocks = [...reps.values()].map((r) => ({ k: r.k, dur: Math.round((r.t1 - r.t0) * 100) / 100, tb: turn(r.fb0, r.fb1), td: turn(r.fd0, r.fd1) }));
    const tackler = sim.events.filter((e: any) => e.type === 'tackle').map((e: any) => sim.agents[e.b ?? e.a]?.slot)[0] ?? null;
    out.push({ id: `${team}/${front}/${seed}`, yards: res.yards, pos, slots: sim.agents.map((a: any) => a.slot), blocks, tackler,
      missed: sim.stats?.missedTackles ?? null, broken: sim.stats?.brokenTackles ?? null });
  }
}
process.stdout.write(JSON.stringify(out));
