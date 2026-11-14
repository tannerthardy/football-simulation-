// Carrier / spacing reversals per play on the dither panel (Integration, 2026-11-14, ENGAGE_FELT's dither row): the
// same 135 plays as test/dither-budget.test.ts, each with its own accumulator, so two arms can be compared play by play;
// at each new carrier spacing reversal, the bodies within 2 yd of the carrier (team, engaged or not, closing speed).
// usage: [ENGAGE_FELT=1] node --import tsx scripts/diag/effective-mass/carrier-dither.mts > out.json
import { readFileSync } from 'node:fs';
const stackOn = Object.entries(JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);
const perPlay: Record<string, { rev: number; moving: number; near: string[] }> = {};
function play(sim: any, core: any, label: string) {
  const acc: any = {};
  core.watch(sim, acc);
  const tick = sim.tick.bind(sim); let last = 0; const near: string[] = [];
  sim.tick = () => {
    tick();
    const r = acc.carrier?.src?.spacing?.reversed ?? 0;
    if (r > last && sim.carrier) {
      const c = sim.carrier;
      for (const a of sim.agents) { if (a === c) continue; const d = Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y); if (d < 2) near.push(`${a.team === c.team ? 'mate' : 'opp'}${a.engagement || sim.engagements?.some?.((e: any) => e.defender === a) ? '-engaged' : '-free'}`); }
    }
    last = r;
  };
  sim.run();
  perPlay[label] = { rev: acc.carrier?.src?.spacing?.reversed ?? 0, moving: acc.carrier?.moving ?? 0, near };
}
async function measure() {
    for (const k of stackOn) if (process.env[k] === undefined) process.env[k] = '1';
  const { Rng } = await import('../../../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../../../src/league/team.js');
  const { PASS_BY_ID, RUN_BY_ID, SCREEN_BY_ID } = await import('../../../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../../../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../../../src/playbook/formations.js');
  const { PlaySim } = await import('../../../src/sim/playsim.js');
  const core = await import('./dither-core.js');
  core.instrument(PlaySim);
  const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 });
  const defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
  const acc: import('./dither-core.js').Acc = {};
  for (const run of ['oz_strong', 'oz_weak', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss', 'duo']) for (let seed = 1; seed <= 5; seed++) {
    const formation = FORMATION_BY_ID.ace_12;
    const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    play(sim, core, `${(sim as any).offCall?.label}/${seed}`);
  }
  for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'slant_flat', 'four_verts']) for (let seed = 1; seed <= 5; seed++) {
    const formation = FORMATION_BY_ID.gun_doubles_11;
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'o31' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    play(sim, core, `${(sim as any).offCall?.label}/${seed}`);
  }
  for (const pass of ['bubble_screen', 'rb_slip_screen', 'tunnel_screen', 'wide_now_screen', 'four_verts', 'y_cross', 'flood', 'pa_shot', 'pa_flood'])
    for (let seed = 1; seed <= (pass.includes('screen') ? 10 : 5); seed++) {
    const deep = !pass.includes('screen'), formation = deep ? FORMATION_BY_ID.gun_doubles_11 : FORMATION_BY_ID.gun_trips_11;
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: deep ? PASS_BY_ID[pass] : SCREEN_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: pass.startsWith('pa_') ? COVERAGE_BY_ID.cover1 : deep ? COVERAGE_BY_ID.cover2 : seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1,
        pressure: null, zoneStyle: 'spot', label: 'scr' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    play(sim, core, `${(sim as any).offCall?.label}/${seed}`);
  }

}
await measure();
console.log(JSON.stringify(perPlay));
