/** RELEASE_COMMIT (receiver.ts routeCraft; experimental, off; #35 item 2): one decision per man. On the engine defaults
 * (the reference stack), staged double_outs from gun_trey_11 against Cover 1: the attached end released round the end
 * over him; off, once that end is no longer ahead of him the route craft takes him back across the same man's body (his
 * lateral request reverses); on, the craft keeps the release's side round that man. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function reversals(flag: string) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('RELEASE_COMMIT', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  let touched = 0, reversed = 0;
  for (let roster = 1; roster <= 6; roster++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'double_outs', seed: 2, roster, formation: 'gun_trey_11', flip: false }));
    const end = sim.offense.find((a: any) => sim.offAlign.spots[a.slot]?.inline);
    let hit: { d: any; t: number } | null = null; const sides: number[] = [];
    while (sim.phase === 'live' && sim.t < 2.0) {
      sim.tick();
      if (!hit) for (const d of sim.defense) {
        if ((d.player.position === 'EDGE' || d.player.position === 'DT') && Math.hypot(d.pos.x - end.pos.x, d.pos.y - end.pos.y) <= end.profile.radius + d.profile.radius + 0.15) { hit = { d, t: sim.t }; break; }
      }
      if (hit && sim.t - hit.t <= 0.6) { const vy = sim.cmds[sim.agents.indexOf(end)].vel.y; if (Math.abs(vy) > 3) sides.push(Math.sign(vy)); }
    }
    if (!hit) continue;
    touched++;
    if (sides.some((s, i) => i > 0 && s !== sides[i - 1])) reversed++;
  }
  return { touched, reversed };
}

describe('RELEASE_COMMIT', () => {
  it('on: the attached end keeps his release side round the rusher who hit him; off, the craft takes him back across', async () => {
    const off = await reversals('0'), on = await reversals('1');
    console.log(`touched off ${off.touched} on ${on.touched}; reversed off ${off.reversed} on ${on.reversed}`);
    expect(off.touched).toBeGreaterThanOrEqual(3);
    expect(off.reversed).toBeGreaterThanOrEqual(2);
    expect(on.reversed).toBeLessThan(off.reversed);
  }, 240_000);
});
