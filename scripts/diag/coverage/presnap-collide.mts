// Pre-snap defender collisions (Flex's definition: two defenders' centres within 0.6 yd at any pre-snap frame) per play,
// with motion or not, and at the snap each defender's distance from his assigned alignment spot (out of position: over
// 1.5 yd). Read-only: the recorded frames (record 'light'). Tools' game set.
//   node --import tsx scripts/diag/coverage/presnap-collide.mts <seed> <first> <games>
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';
import { appendFileSync } from 'node:fs';
const DETAIL = process.env.DETAIL; // a jsonl path: one row per overlapping pair of installed spots

const seed = Number(process.argv[2] ?? 101), first = Number(process.argv[3] ?? 0), games = Number(process.argv[4] ?? 1);
const P: any = PlaySim.prototype, res0 = P.buildResult;
const out = { gaps: 0, unfilled: 0, boxSum: 0, closeSpots: 0, spotPairs: new Map<string, number>(), plays: 0, presnap: 0, collide: 0, motion: 0, motionCollide: 0, seats: 0, outOfPos: 0, pairs: new Map<string, number>() };
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
      // Are two of the installed alignment spots themselves within 1.0 yd (a collision built into the alignment)?
      const sp = Object.entries(this.defAlign?.spots ?? {}) as Array<[string, any]>;
      let close: string | null = null;
      for (let i = 0; i < sp.length && !close; i++) for (let j = i + 1; j < sp.length; j++)
        if (Math.hypot(sp[i][1].pos.x - sp[j][1].pos.x, sp[i][1].pos.y - sp[j][1].pos.y) < 1.0) { close = [sp[i][0], sp[j][0]].sort().join('-'); break; }
      if (close) { out.closeSpots++; out.spotPairs.set(close, (out.spotPairs.get(close) ?? 0) + 1); }
      if (DETAIL) for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) {
        const A = sp[i][1], B = sp[j][1], d = Math.hypot(A.pos.x - B.pos.x, A.pos.y - B.pos.y);
        if (d >= 1.0) continue;
        const role = (r: any) => r?.kind === 'zone' ? `zone:${r.zone}` : r?.kind === 'man' ? 'man' : r?.kind === 'blitz' ? `blitz:${r.gap}` : r?.kind ?? '?';
        appendFileSync(DETAIL, JSON.stringify({ seed, a: sp[i][0], b: sp[j][0], d: +d.toFixed(2), ra: role(A.role), rb: role(B.role),
          pa: [+(A.pos.x - this.los).toFixed(1), +A.pos.y.toFixed(1)], pb: [+(B.pos.x - this.los).toFixed(1), +B.pos.y.toFixed(1)],
          front: this.defCall?.front?.id, cov: this.defCall?.coverage?.id, check: this.defCall?.check ? `${this.defCall.check.from}:${this.defCall.check.when}` : null,
          pressure: this.defCall?.pressure?.id ?? null, stem: !!this.defCall?.frontStem, creep: !!this.defCall?.creep, motion: this.offCall?.motion?.kind ?? null,
          form: this.offCall?.formation?.id, personnel: this.defCall?.personnel }) + '\n');
      }
      // At the snap: each zone / man defender's distance from his installed alignment spot.
      const snap = frames.find((f: any) => f.t >= 0);
      // Gaps at the snap: between the five linemen (A, B each side) and outside each tackle (C, 1.5 yd), a gap is filled
      // when a defender within 6 yd of the line stands inside it.
      if (snap) {
        const ol = this.agents.map((a: any, i: number) => ({ a, i })).filter((x: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(x.a.slot))
          .map((x: any) => snap.agents[x.i * 3 + 1]).sort((p: number, q: number) => p - q);
        if (ol.length === 5) {
          const dside = Math.sign(D.reduce((t: number, x: any) => t + snap.agents[x.i * 3] - this.los, 0)) || 1;
          const bounds = [[ol[0] - 1.5, ol[0]], [ol[0], ol[1]], [ol[1], ol[2]], [ol[2], ol[3]], [ol[3], ol[4]], [ol[4], ol[4] + 1.5]];
          for (const [lo, hi] of bounds) {
            out.gaps++;
            const filled = D.some((x: any) => { const dx = (snap.agents[x.i * 3] - this.los) * dside, y = snap.agents[x.i * 3 + 1]; return dx >= -0.5 && dx <= 6 && y >= lo && y <= hi; });
            if (!filled) out.unfilled++;
          }
        }
        out.boxSum += this.defAlign?.boxCount ?? 0;
      }
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
console.log(JSON.stringify({ seed, flag: process.env.PRESNAP_GIVE ?? '0', ...out, pairs: [...out.pairs].sort((a, b) => b[1] - a[1]).slice(0, 6), spotPairs: [...out.spotPairs].sort((a, b) => b[1] - a[1]).slice(0, 6) }));
