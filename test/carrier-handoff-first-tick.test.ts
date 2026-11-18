import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

/** The dither panel's duo, seed 2 (ace_12 against the base 4-3 Under in cover 3): the back's last request into the exchange, his first request as the carrier and the next tick's. */
async function firstTicks(commitTick: '0' | '1') {
  vi.resetModules();
  const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>).filter(([, v]) => v === 'on').map(([k]) => k);
  for (const k of stackOn) process.env[k] = '1';
  process.env.READ_COMMIT_TICK = commitTick;
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 }), defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
  const formation = FORMATION_BY_ID.ace_12;
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: true, kind: 'run', run: RUN_BY_ID.duo, label: 'duo' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
    los: 35, ballY: 26.65, firstDownX: 45, seed: 2 } as never);
  const tick = sim.tick.bind(sim), seq: { kind: string; deg: number }[] = [];
  sim.tick = () => { tick(); if (sim.phase !== 'live') return; const a = sim.agents[6], it = sim.intents[6];
    if (it && Math.hypot(it.vel.x, it.vel.y) > 1) seq.push({ kind: a.behavior?.kind, deg: Math.atan2(it.vel.y, it.vel.x) * 180 / Math.PI }); };
  sim.run();
  const i = seq.findIndex((s) => s.kind === 'carrier');
  return { into: seq[i - 1].deg, first: seq[i].deg, next: seq[i + 1].deg };
}

afterEach(() => { for (const k of ['READ_COMMIT_TICK', 'DIR_START']) delete process.env[k]; vi.resetModules(); });

describe('READ_COMMIT_TICK: the tick the design window ends, the carrier runs the ordinary lane read at once', () => {
  it('off: the first request after the handoff is the designed press, 18 deg off his mesh line, and the next tick reads another line', async () => {
    const r = await firstTicks('0');
    expect(Math.abs(r.first - r.into)).toBeGreaterThan(15);
    expect(Math.abs(r.next - r.first)).toBeGreaterThan(10);
  });
  it('on: his first request is the line the next tick holds', async () => {
    const r = await firstTicks('1');
    expect(Math.abs(r.first - r.into)).toBeLessThan(8);
    expect(Math.abs(r.next - r.first)).toBeLessThan(8);
  });
});
