import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PlaySim } from '../src/sim/playsim.js';
import { restoreSetup } from '../scripts/diag/saved-play.js';

// A wide-zone double (LG with C on DT_S, LB_W the backer) where C takes the man alone and LG is off him:
// the outside-zone overtake. One saved run-only snap (matched-restage seed 7, snap 17). Snap 0 was this
// scene until its DT key-stepped into LG with the zone step: a joined double, not this overtake.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/overtake-climb.json', import.meta.url), 'utf8')) as { setup: string };

function play() {
  const sim = new PlaySim(restoreSetup(Buffer.from(fixture.setup, 'base64')));
  const lg = sim.slot('LG')!, c = sim.slot('C')!, down = sim.slot('DT_S')!, backer = sim.slot('LB_W')!;
  const combo = (lg.behavior as any).plan.combination;
  return { sim, lg, c, down, backer, combo };
}

describe('an overtaken zone member climbs on his own read', () => {
  it('is the planned wide-zone double this scene is about', () => {
    const { sim, lg, c, down, backer, combo } = play();
    expect(sim.offCall.run?.scheme).toBe('wideZone');
    expect(combo.members).toEqual([lg, c]);
    expect(combo.defender).toBe(down);
    expect(combo.backer).toBe(backer);
  });

  it('climbs only after his partner has carried the man alone, then the partner keeps him and the climber gets the backer', () => {
    const { sim, lg, c, down, backer } = play();
    let alone = -1, release = -1, kept = true, loaded = -1, carrierAtBacker = -1;
    while (sim.phase === 'live' && sim.t < 3.5) {
      sim.tick();
      const e = down.engagement;
      if (release < 0) {
        if (e && e.blocker === c && e.helpers.length === 0 && !lg.engagement) { if (alone < 0) alone = sim.t; } else alone = -1;
        const climb = sim.events.find(ev => ev.type === 'block_climb' && ev.a === lg.idx);
        if (climb) release = climb.t;
        continue;
      }
      const runner = sim.carrier;
      if (carrierAtBacker < 0 && runner && runner !== sim.qb && runner.pos.x > backer.pos.x - 1) carrierAtBacker = sim.t;
      const beforeCross = !runner || runner === sim.qb || runner.pos.x < sim.los;
      if (beforeCross && !down.isDown(sim.t) && !(e && e.blocker === c && sim.world.joints.includes(e.hands!))) kept = false;
      const hands = lg.engagement?.defender === backer ? lg.engagement.hands : null;
      if (loaded < 0 && hands && Math.hypot(hands.normalForce ?? 0, hands.tangentForce ?? 0) > 0) loaded = sim.t;
    }
    // His own evidence first: C carries DT_S alone, LG off him, for at least the 0.15 s hold before LG goes.
    expect(release).toBeGreaterThan(0);
    expect(alone).toBeGreaterThan(0);
    expect(release - alone).toBeGreaterThanOrEqual(.15 - 1e-9);
    expect(lg.tags.has('combo-check-climb')).toBe(true);
    // The keeper keeps real hands on the man until the carrier crosses.
    expect(kept).toBe(true);
    // The climber loads the backer before the carrier gets to him.
    expect(loaded).toBeGreaterThan(release);
    expect(carrierAtBacker < 0 || loaded < carrierAtBacker).toBe(true);
  });
});
