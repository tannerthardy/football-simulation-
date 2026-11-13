/** Where does a tackle grasp form farther than arm's length, in an ordinary game? Observation only.
 *   node --import tsx scripts/diag/remote-grasp-scan.ts [seed=7] [out=out/lab-clips/remote-grasp-seed7.json]
 * "Standing arm's length" is the engine's own: radii of both bodies plus 0.9 x the holder's reach
 * (tackle.ts `grasp`, the same number that sets a standing hold's reach). A grasp is remote when its
 * center distance at formation is farther than that; `extended` dives are excluded because they
 * stretch along the ground by design. The stricter reading (reach + target radius from the holder's center) is also counted. Saves each play with a remote grasp as a constructor input. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import type { PlaySetup } from '../../src/sim/playsim.js';
import { bytesHash, captureSetup } from './saved-play.js';
import { executionIdentity } from './saved-play.js';

const seed = Number(process.argv[2] ?? 7), out = process.argv[3] ?? `out/lab-clips/remote-grasp-seed${seed}.json`;
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let n = 0, setup: PlaySetup | null = null, scrimmage = 0, grasps = 0, remote = 0, remoteFromCenter = 0;
const plays: unknown[] = [];
simulateGame(home, away, { seed, hooks: {
  playSetup: s => { setup = s; },
  playResult: (sim, kind) => {
    n++;
    if (kind !== 'scrimmage' || !setup) return undefined;
    scrimmage++;
    const bytes = captureSetup(setup), rows: unknown[] = [];
    // Joints are rebuilt as holds break, so look for new grasps at the start of each World step,
    // before the bodies have moved from where `grasp()` formed them.
    const seen = new WeakSet<object>(), step = sim.world.step.bind(sim.world);
    sim.world.step = ((intents: Parameters<typeof step>[0], dt: number) => {
      for (const j of sim.world.joints) {
        if (j.kind !== 'grasp' || seen.has(j)) continue;
        seen.add(j);
        const holder = sim.agents.find(a => a.body === j.a), held = sim.agents.find(a => a.body === j.b);
        if (!holder || !held) continue;
        const dd = Math.hypot(held.pos.x - holder.pos.x, held.pos.y - holder.pos.y);
        const arm = held.profile.radius + holder.profile.radius + holder.profile.reach * 0.9;
        grasps++;
        const isRemote = j.origin !== 'dive' && dd > arm + 0.05;
        if (isRemote) remote++;
        // Stricter reading (#273's table): the hand starts at the holder's center, so span = reach + target radius.
        const fromCenter = j.origin !== 'dive' && dd > holder.profile.reach + held.profile.radius + 0.05;
        if (fromCenter) remoteFromCenter++;
        rows.push({ t: +sim.t.toFixed(2), holder: `${holder.team}:${holder.slot}`, held: `${held.team}:${held.slot}`, origin: j.origin,
          distance: +dd.toFixed(2), armsLength: +arm.toFixed(2), beyond: +(dd - arm).toFixed(2), remote: isRemote, beyondFromCenter: +(dd - holder.profile.reach - held.profile.radius).toFixed(2),
          heldSpeed: +Math.hypot(held.vel.x, held.vel.y).toFixed(1), holderSpeed: +Math.hypot(holder.vel.x, holder.vel.y).toFixed(1) });
      }
      return step(intents, dt);
    }) as typeof sim.world.step;
    const run = sim.run.bind(sim);
    sim.run = () => {
      const r = run();
      if ((rows as { remote: boolean }[]).some(x => x.remote))
        plays.push({ play: n, call: sim.offCall.label, defense: sim.defCall.label, outcome: r.outcome, yards: +r.yards.toFixed(2),
          setupSha256: bytesHash(bytes), setup: bytes.toString('base64'), grasps: rows });
      return r;
    };
    return undefined;
  },
} });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ identity: executionIdentity(), seed, scrimmage, grasps, remote, remoteFromCenter, plays }));
console.log(`seed ${seed}: ${scrimmage} scrimmage plays, ${grasps} grasps, ${remote} beyond standing arm's length (${(100 * remote / Math.max(1, grasps)).toFixed(0)}%), ${remoteFromCenter} beyond reach + target radius from the holder's center (${(100 * remoteFromCenter / Math.max(1, grasps)).toFixed(0)}%); ${plays.length} plays saved to ${out}`);
