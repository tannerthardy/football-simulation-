// Diagnostic, observation only. Run from a checkout with out/matched-restage/seed{7..29 odd}-run.json
// (scripts/diag/edge/capture-runs.ts). node --import tsx scripts/diag/tackle-finish/fall-cause.mts
// Zone runs, first contact -1..+3 yd: at the tick the carrier leaves his feet, what is acting on him.
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const C: Record<string, number> = {}; let n = 0; const ex: string[] = [];
const bump = (k: string) => { C[k] = (C[k] ?? 0) + 1; };
for (let seed = 7; seed <= 29; seed += 2) for (const [pi, p] of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')).entries()) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!['outsideZone', 'wideZone', 'insideZone'].includes(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const up = sim.attackDir('O');
  let hit: any = null, done = false;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { const before = sim.carrier?.body.support?.state; tick(); const c = sim.carrier; if (done || !c || c === sim.qb || c.team !== 'O') return;
    if (!hit && sim.events.some((e: any) => e.type === 'handoff' || e.type === 'pitch') && sim.defense.some((q: any) => Math.hypot(q.pos.x - c.pos.x, q.pos.y - c.pos.y) <= 1.0)) hit = { t: sim.t, x: (c.pos.x - sim.los) * up };
    if (!hit || hit.x < -1 || hit.x >= 3) return;
    if (before === 'up' && c.body.support?.state !== 'up') { done = true; n++;
      const b = sim.bond, T = b?.tacklers ?? [];
      const torso = (d: any) => c.profile.radius + d.profile.radius;
      const tags: string[] = [];
      tags.push(`tacklers ${Math.min(T.length, 3)}`);
      const secureRoll = T.filter((d: any) => { const dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y); return d.body.support?.state === 'up' && dist <= torso(d) + .15 && (b.grip?.get(d) ?? 0) >= .5; });
      tags.push(secureRoll.length ? 'roll-eligible' : 'no-roll');
      if (T.some((d: any) => d.body.support?.state !== 'up')) tags.push('tackler-down/dropped');
      if ((sim.world as any).strideHolds?.[c.idx] > 0) tags.push('stride-held');
      const recent = sim.events.filter((e: any) => e.t >= sim.t - 0.15 && ['strike', 'hit', 'collision', 'big_hit', 'tackle_hit'].some(k => e.type.includes(k))).length;
      if (recent) tags.push('recent-strike');
      const sp = Math.hypot(c.vel.x, c.vel.y); tags.push(sp < 1 ? 'carrier-slow<1' : sp < 3 ? 'carrier-1-3' : 'carrier-3+');
      const fx = (c.body.support?.fall?.x ?? 0) * up; tags.push(fx > 0.5 ? 'falls-forward' : fx < -0.5 ? 'falls-backward' : 'falls-sideways');
      for (const t of tags) bump(t);
      bump(`fall x roll: ${tags.at(-1)} / ${tags[1]} / ${tags[0]}`);
      if (ex.length < 6) ex.push(`s${seed}-${pi} t+${(sim.t - hit.t).toFixed(2)} ${tags.join(', ')} | grips ${T.map((d: any) => (b.grip?.get(d) ?? 0).toFixed(2)).join('/')} fall ${JSON.stringify(c.body.support?.fall && { x: +c.body.support.fall.x.toFixed(2), y: +c.body.support.fall.y.toFixed(2) })}`);
    }
  };
  sim.run();
}
console.log('carriers off their feet after contact at -1..+3:', n);
for (const [k, v] of Object.entries(C).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${(100 * v / n).toFixed(0)}%`);
console.log(ex.join('\n'));
