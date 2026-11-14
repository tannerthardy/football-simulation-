// usage: npm run ref -- --flag HEAD=1 --flag ZONE_EYES=0|1 -- npx tsx scripts/diag/eyes/zone-eyes.ts SEED GAMES
// ZONE_EYES lane read, at the release (the throw event) for every zone defender before he believes a throw: his head
// (Agent.head; his body facing when HEAD is off) within 30 / 90 deg of the bearing to the QB; his hips (body facing)
// off that bearing; his speed; and the cost: of the eligible receivers within 15 yd of him, the share inside his head's
// cone (head.ts inHeadCone; under SIGHT_COVER + HEAD the only ones his picture is refreshed for). By seat (deep zone or
// underneath). State reads only (no perception call), so the probe does not change what he sees.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { inHeadCone, wantAt } from '../../../src/sim/head.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const P: any = PlaySim.prototype, ev0 = P.event;
const dif = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
const rows: any[] = [];
P.event = function (type: string, a: any, b: any, note?: string) {
  if (type === 'throw' && !this.__z) {
    this.__z = true;
    const q = this.qb.pos;
    const elig = this.offense.filter((o: any) => o !== this.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
    for (const d of this.defense) {
      if (d.behavior?.kind !== 'zone' || d.tags.has('readArm')) continue;
      const brg = Math.atan2(q.y - d.pos.y, q.x - d.pos.x), head = d.head ?? d.body.facing;
      const near = elig.filter((o: any) => Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) < 15);
      const inCone = near.filter((o: any) => inHeadCone(head, Math.atan2(o.pos.y - d.pos.y, o.pos.x - d.pos.x))).length;
      // receivers behind him: more than 90 deg off the bearing to the QB
      const behind = near.filter((o: any) => dif(Math.atan2(o.pos.y - d.pos.y, o.pos.x - d.pos.x), brg) > 90);
      const behindIn = behind.filter((o: any) => inHeadCone(head, Math.atan2(o.pos.y - d.pos.y, o.pos.x - d.pos.x))).length;
      rows.push({ deep: !!d.behavior.deep, head: dif(head, brg), hips: dif(d.body.facing, brg), sp: Math.hypot(d.vel.x, d.vel.y),
        near: near.length, inCone, behind: behind.length, behindIn, eyes: d.tags.has('zone-eyes'), why: wantAt(d, this.t)?.reason ?? 'none', sb: d.tags.has('shoulder-break') || d.tags.has('onBall') || d.tags.has('catch-carry'), trunk: Math.abs((d.body.trunk ?? 0) * 180 / Math.PI), sp2: Math.hypot(d.vel.x, d.vel.y), look: this.intents?.[d.idx]?.look !== undefined, cmdFace: this.intents?.[d.idx]?.facing === undefined ? null : dif(this.intents[d.idx].facing, brg), slot: d.slot, zone: d.behavior.zone ?? '' });
    }
  }
  return ev0.call(this, type, a, b, note);
};
const b0 = P.buildResult; P.buildResult = function () { const r = b0.call(this); this.__z = undefined; return r; };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const med = (v: number[]) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)].toFixed(1) : '-';
for (const [nm, f] of [['underneath', (r: any) => !r.deep], ['deep', (r: any) => r.deep]] as const) {
  const T = rows.filter(f), N = T.reduce((s, r) => s + r.near, 0), C = T.reduce((s, r) => s + r.inCone, 0);
  console.log(`ZE ${nm}: n ${T.length} | head off QB median ${med(T.map(r => r.head))} deg, within 30 ${(T.filter(r => r.head <= 30).length / T.length).toFixed(2)}, within 90 ${(T.filter(r => r.head <= 90).length / T.length).toFixed(2)} | hips off QB ${med(T.map(r => r.hips))} | speed ${med(T.map(r => r.sp))} | receivers within 15 yd in his head cone ${(C / Math.max(1, N)).toFixed(2)} (of ${N}) | behind him in cone ${(T.reduce((s, r) => s + r.behindIn, 0) / Math.max(1, T.reduce((s, r) => s + r.behind, 0))).toFixed(2)} (of ${T.reduce((s, r) => s + r.behind, 0)}) | eyes look applied (ever) ${(T.filter(r => r.eyes).length / T.length).toFixed(2)}`);
}
{ const W = rows.filter(r => !r.deep && r.head > 90), by = (k: string) => Object.entries(W.reduce((m: any, r: any) => (m[r[k]] = (m[r[k]] ?? 0) + 1, m), {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', ');
  console.log(`ZE underneath head >90 off: n ${W.length} | want ${by('why')} | zone ${by('zone')} | hips off QB ${med(W.map(r => r.hips))} | trunk ${med(W.map(r => r.trunk))} deg | speed ${med(W.map(r => r.sp2))} | breaking (shoulder/ball/carry) ${(W.filter(r => r.sb).length / Math.max(1, W.length)).toFixed(2)} | intent has look ${(W.filter(r => r.look).length / Math.max(1, W.length)).toFixed(2)} | intent facing off QB ${med(W.map(r => r.cmdFace).filter((x: any) => x !== null))}`); }
