// Pre-snap defender collisions (Flex's definition: two defenders' centres within 0.6 yd at any pre-snap frame) per play,
// with motion or not, and at the snap each defender's distance from his assigned alignment spot (out of position: over
// 1.5 yd). Read-only: the recorded frames (record 'light'). Tools' game set.
//   node --import tsx scripts/diag/coverage/presnap-collide.mts <seed> <first> <games>
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';

const seed = Number(process.argv[2] ?? 101), first = Number(process.argv[3] ?? 0), games = Number(process.argv[4] ?? 1);
const P: any = PlaySim.prototype, res0 = P.buildResult;
const out = { plays: 0, presnap: 0, collide: 0, motion: 0, motionCollide: 0, seats: 0, outOfPos: 0, pairs: new Map<string, number>() };
P.buildResult = function () {
  const r = res0.call(this);
  if (!compilingPlan() && !this.__pc) {
    this.__pc = true;
    out.plays++;
    const frames = this.frames ?? [];
    const pre = frames.filter((f: any) => f.t < 0);
    const D = this.agents.map((a: any, i: number) => ({ a, i })).filter((x: any) => x.a.team === 'D');
    if (pre.length) {
      out.presnap++;
      const motion = !!this.offCall?.motion;
      if (motion) out.motion++;
      let hit: string | null = null;
      for (const f of pre) {
        for (let i = 0; i < D.length && !hit; i++) for (let j = i + 1; j < D.length; j++) {
          const a = D[i].i * 3, b = D[j].i * 3, dx = f.agents[a] - f.agents[b], dy = f.agents[a + 1] - f.agents[b + 1];
          if (dx * dx + dy * dy < 0.36) { hit = [D[i].a.slot, D[j].a.slot].sort().join('-'); break; }
        }
        if (hit) break;
      }
      if (hit) { out.collide++; if (motion) out.motionCollide++; out.pairs.set(hit, (out.pairs.get(hit) ?? 0) + 1); }
      // At the snap: each zone / man defender's distance from his installed alignment spot.
      const snap = frames.find((f: any) => f.t >= 0);
      if (snap) for (const { a, i } of D) {
        const sp = this.defAlign?.spots?.[a.slot];
        if (!sp || (sp.role.kind !== 'zone' && sp.role.kind !== 'man')) continue;
        out.seats++;
        if (Math.hypot(snap.agents[i * 3] - sp.pos.x, snap.agents[i * 3 + 1] - sp.pos.y) > 1.5) out.outOfPos++;
      }
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let i = 0; i < games; i++) simulateGame(home, away, { seed: seed + first + i, record: true, recordLevel: 'light' });
console.log(JSON.stringify({ seed, flag: process.env.PRESNAP_GIVE ?? '0', ...out, pairs: [...out.pairs].sort((a, b) => b[1] - a[1]).slice(0, 6) }));
