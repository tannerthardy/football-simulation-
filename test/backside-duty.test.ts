/** BACKSIDE_DUTY (src/sim/run-fits.ts; experimental, off), part (a): the backside end on zone flow away turns and runs
 * at the play instead of shuffling square. Fixed outside-zone runs away from the end (ace_12 vs base 4-3 Under, cover
 * 3; teams from fixed seeds; reference stack on), the unblocked box end on the backside while he is free between 0.6
 * and 1.5 s: off, his body faces downfield while he moves along the line (facing off his velocity > 35 deg on most of
 * those ticks); on, he opens to his travel and, on his own flow read, asks for his chase pace along the flow instead of
 * keeping station on the mesh point, so he is further toward the play by 1.5 s (attempt 2; attempt 1, hips alone, did
 * not move him: under the gait law a ~4 yd/s request is approached slowly, KNOWN_PROBLEMS PHY-4). Requests and achieved
 * motion only; no outcome is asserted. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(flag: string) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('BACKSIDE_DUTY', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(101), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(102), 'D', 'DEF', { strength: .55 });
  let open = 0, ticks = 0; const toward: number[] = [];
  for (const run of ['oz_strong', 'oz_weak', 'wz_strong']) for (let seed = 1; seed <= 6; seed++) {
    const formation = FORMATION_BY_ID.ace_12;
    const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never) as any;
    const dir = sim.attackDir(sim.offense[0].team);
    const side = (RUN_BY_ID[run].direction === 'strong' ? 1 : -1) * sim.offAlign.strongSign;
    const end = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * dir) < 1.5 && d.behavior?.kind === 'rush' && Math.sign(d.pos.y - sim.ballY) === -side)
      .sort((p: any, q: any) => Math.abs(q.pos.y - sim.ballY) - Math.abs(p.pos.y - sim.ballY))[0];
    if (!end) continue;
    const y0 = end.pos.y; let at15: number | null = null;
    while (sim.phase !== 'dead' && sim.t < 1.55) {
      sim.tick();
      if (sim.t >= 0.6 && !end.engagement && Math.hypot(end.vel.x, end.vel.y) > 1.5 && side * end.vel.y > 1) {
        ticks++; const off = Math.abs(((end.body.facing - Math.atan2(end.vel.y, end.vel.x)) * 180 / Math.PI % 360 + 540) % 360 - 180);
        if (off < 35) open++;
      }
      if (at15 === null && sim.t >= 1.5 - 1e-9) at15 = (end.pos.y - y0) * side;
    }
    if (at15 !== null && !end.engagement) toward.push(at15);
  }
  const mean = toward.reduce((a, b) => a + b, 0) / Math.max(1, toward.length);
  return { openShare: open / Math.max(1, ticks), ticks, toward: mean, n: toward.length };
}

describe('BACKSIDE_DUTY (a): the backside end turns and chases flow away', () => {
  it('on, he faces his travel more often and is further toward the play at 1.5 s than off', async () => {
    const off = await run('0'), on = await run('1');
    if (process.env.BD_PRINT) console.log('BD', JSON.stringify({ off, on }));
    expect(off.ticks).toBeGreaterThan(20);
    expect(on.openShare).toBeGreaterThan(off.openShare + 0.15);
    expect(on.toward).toBeGreaterThan(off.toward); // engine-56: -0.09 vs -0.21 yd
  }, 300_000);
});
