import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PlaySim } from '../src/sim/playsim.js';
import { restoreSetup } from '../scripts/diag/saved-play.js';

// A wide-zone double (RG with C on DT_W, LB_W the backer) where C takes the man alone and RG is off him:
// the outside-zone overtake. One saved run-only snap (matched-restage seed 7, snap 82). Re-picked from snap 0,
// where under the squeeze read (DL_SQUEEZE from a seen carrier's track) LG gets hands on DT_W as C's helper
// and leaves by the ordinary joined release, so that snap no longer holds an overtake. Snap 82 holds one on
// develop, on the squeeze read, and with #364 and #366.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/overtake-climb.json', import.meta.url), 'utf8')) as { setup: string };

function play() {
  const sim = new PlaySim(restoreSetup(Buffer.from(fixture.setup, 'base64')));
  const rg = sim.slot('RG')!, c = sim.slot('C')!, down = sim.slot('DT_W')!, backer = sim.slot('LB_W')!;
  const combo = (rg.behavior as any).plan.combination;
  return { sim, rg, c, down, backer, combo };
}

describe('an overtaken zone member climbs on his own read', () => {
  it('is the planned wide-zone double this scene is about', () => {
    const { sim, rg, c, down, backer, combo } = play();
    expect(sim.offCall.run?.scheme).toBe('wideZone');
    expect(combo.members).toEqual([rg, c]);
    expect(combo.defender).toBe(down);
    expect(combo.backer).toBe(backer);
  });

  it('climbs only after his partner has carried the man alone, then the partner keeps him and the climber gets the backer', () => {
    const { sim, rg, c, down, backer } = play();
    let alone = -1, release = -1, kept = true, loaded = -1, carrierAtBacker = -1;
    while (sim.phase === 'live' && sim.t < 3.5) {
      sim.tick();
      const e = down.engagement;
      if (release < 0) {
        if (e && e.blocker === c && e.helpers.length === 0 && !rg.engagement) { if (alone < 0) alone = sim.t; } else alone = -1;
        const climb = sim.events.find(ev => ev.type === 'block_climb' && ev.a === rg.idx);
        if (climb) release = climb.t;
        continue;
      }
      const runner = sim.carrier;
      if (carrierAtBacker < 0 && runner && runner !== sim.qb && runner.pos.x > backer.pos.x - 1) carrierAtBacker = sim.t;
      const beforeCross = !runner || runner === sim.qb || runner.pos.x < sim.los;
      if (beforeCross && !down.isDown(sim.t) && !(e && e.blocker === c && sim.world.joints.includes(e.hands!))) kept = false;
      const hands = rg.engagement?.defender === backer ? rg.engagement.hands : null;
      if (loaded < 0 && hands && Math.hypot(hands.normalForce ?? 0, hands.tangentForce ?? 0) > 0) loaded = sim.t;
    }
    // His own evidence first: C carries DT_W alone, RG off him, for at least the 0.15 s hold before RG goes.
    expect(release).toBeGreaterThan(0);
    expect(alone).toBeGreaterThan(0);
    expect(release - alone).toBeGreaterThanOrEqual(.15 - 1e-9);
    expect(rg.tags.has('combo-check-climb')).toBe(true);
    // The keeper keeps real hands on the man until the carrier crosses.
    expect(kept).toBe(true);
    // The climber loads the backer before the carrier gets to him.
    expect(loaded).toBeGreaterThan(release);
    expect(carrierAtBacker < 0 || loaded < carrierAtBacker).toBe(true);
  });
});
