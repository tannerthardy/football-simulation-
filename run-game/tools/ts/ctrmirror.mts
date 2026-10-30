/** Integration's constructed counter-mirror witness: run-execution roster (seeds 11/12, strength .55), ace_11 / Over /
 * Cover 3, seed 77, counter flip=true, default dice. Prints a 0.1 s timeline of the back and the play-side bodies. */
const root = process.cwd();
const { CENTER_Y } = await import(root + '/src/core/field.ts');
const { Rng } = await import(root + '/src/core/rng.ts');
const { generateTeam, pickDefense, pickOffense } = await import(root + '/src/league/team.ts');
const { RUN_BY_ID } = await import(root + '/src/playbook/concepts.ts');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(root + '/src/playbook/defense.ts');
const { FORMATION_BY_ID } = await import(root + '/src/playbook/formations.ts');
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const offense = generateTeam(new Rng(11), 'O', 'OFF', { strength: 0.55 });
const defense = generateTeam(new Rng(12), 'D', 'DEF', { strength: 0.55 });
const formation = FORMATION_BY_ID.ace_11;
const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
  offCall: { formation, flip: process.env.FLIP !== '0', kind: 'run', run: RUN_BY_ID[process.env.CON ?? 'counter'], label: 'x' },
  defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'c3' },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 77 });
const f = (v: number) => v.toFixed(2).padStart(6);
const who = (process.env.WHO ?? 'RB,LG,LT,RG,RT,C,DE_W,DE_S,DT_W,DT_S,LB_W,LB_M,LB_S').split(',');
let last = -1;
while (sim.phase === 'live' && sim.t < 8) {
  sim.tick();
  const k = Math.round(sim.t * 20);
  if (k % 2 || k === last) continue; last = k;
  if (sim.t < 0.5) continue;
  const parts = who.map((s) => { const a = sim.slot(s); if (!a) return ''; const pl = a.behavior?.plan;
    return `${s} ${f(a.pos.x - sim.los)},${f(a.pos.y - CENTER_Y)}${pl ? ' ' + pl.kind + (pl.target ? '>' + pl.target.slot : '') : ''}${a.engagement ? ' E' + (a.engagement.blocker === a ? a.engagement.defender.slot : a.engagement.blocker.slot) : ''}`; });
  console.log(`t ${sim.t.toFixed(2)} | ` + parts.join(' | '));
}
console.log('result', JSON.stringify(sim.result ?? sim.outcome ?? null)?.slice(0, 300));
console.log('events', JSON.stringify(sim.events.filter((e: any) => /contact|tackle|wrap/.test(e.type) && !/block_contact/.test(e.type)).slice(0, 6)).slice(0, 900));
