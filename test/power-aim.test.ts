/** POWER_AIM (defense.ts PassRusher.powerMark; experimental, off; #35 item 2b): a power rush aims down the middle of the
 * lineman setting to him, not at the QB. On the engine defaults (the reference stack), staged double_outs (seed 2, whose
 * dice give the strong-side end the power plan) from
 * gun_trey_11 against Cover 1: off, the strong-side end on the power plan ran his line at the QB through the attached
 * end's release and hit him; on, he takes his lane's first step and then the tackle, so he meets an offensive lineman
 * and not the end. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function reps(flag: string) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('POWER_AIM', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  let power = 0, hitEnd = 0, engagedOL = 0;
  for (let roster = 1; roster <= 6; roster++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'double_outs', seed: 2, roster, formation: 'gun_trey_11', flip: false }));
    const de = sim.defense.find((d: any) => d.slot === 'DE_S');
    if (de?.behavior?.plan !== 'power') continue;
    power++;
    const end = sim.offense.find((a: any) => sim.offAlign.spots[a.slot]?.inline);
    let hit = false, eng = false;
    while (sim.phase === 'live' && sim.t < 2.0) {
      sim.tick();
      if (Math.hypot(de.pos.x - end.pos.x, de.pos.y - end.pos.y) <= de.profile.radius + end.profile.radius + 0.15) hit = true;
      if (de.engagement?.type === 'pass' && de.engagement.defender === de && ['LT', 'LG', 'C', 'RG', 'RT'].includes(de.engagement.blocker.slot)) eng = true;
    }
    hitEnd += +hit; engagedOL += +eng;
  }
  return { power, hitEnd, engagedOL };
}

describe('POWER_AIM', () => {
  it('on: the power end rushes the tackle, not through the attached end; off, he runs through the end', async () => {
    const off = await reps('0'), on = await reps('1');
    console.log(`power reps ${off.power}; hit the end off ${off.hitEnd} on ${on.hitEnd}; engaged a lineman by 2 s off ${off.engagedOL} on ${on.engagedOL}`);
    expect(off.power).toBeGreaterThanOrEqual(2);
    expect(off.hitEnd).toBeGreaterThanOrEqual(2);
    expect(on.hitEnd).toBe(0);
    expect(on.engagedOL).toBe(on.power);
  }, 240_000);
});
