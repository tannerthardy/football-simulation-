/** Backside ends on zone runs away (end on the side opposite the play), engaged with a blocker, 0.5-3.0 s after the
 * handoff: where is the end relative to the blocker (lateral toward the ball beyond the blocker's frame = past him),
 * the end's request toward the ball, the blocker's lateral request toward the ball, hand joint hold/steer/forces,
 * and how the rep ends. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { playSideSign } = await import(root + '/src/sim/behaviors/blocking.ts');
const seeds = process.argv.slice(2); const t: Record<string, number> = {}; const add = (k: string) => t[k] = (t[k] ?? 0) + 1;
const rows: Record<string, number[]> = {}; const push = (k: string, v: number) => (rows[k] ??= []).push(v);
let ticks = 0;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const run = sim.offCall.run; if (!run || !/Zone/.test(run.scheme)) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const ps = playSideSign(sim, run);
  const ends = sim.defense.filter((d: any) => /^DE_|^OLB|^EDGE|^SAM|^WILL/.test(d.slot) && (d.pos.y - sim.ballY) * ps < -2);
  let handoff = -1;
  while (sim.phase === 'live' && sim.t < 5) {
    sim.tick();
    const c = sim.carrier;
    if (handoff < 0 && c && c !== sim.qb) handoff = sim.t;
    if (handoff < 0 || !c || sim.t < handoff + .5 || sim.t > handoff + 3) continue;
    for (const d of ends) {
      const e = d.engagement; if (!e || e.defender !== d || e.type !== 'run') continue;
      const b = e.blocker; ticks++;
      const toBall = Math.sign(c.pos.y - d.pos.y) || 1;
      const past = (d.pos.y - b.pos.y) * toBall - b.profile.radius; // >0: end is beyond the blocker's frame toward the ball
      const k = past > .35 ? 'past frame (>0.35)' : past > 0 ? 'at frame edge (0-0.35)' : 'blocker between';
      add(k);
      const dReq = sim.intents[d.idx].vel.y * toBall, bReq = sim.intents[b.idx].vel.y * toBall;
      push(k + ' | end req toward ball', dReq); push(k + ' | blocker req toward ball', bReq);
      push(k + ' | end achieved toward ball', d.vel.y * toBall);
      const j = e.hands; push(k + ' | hold', j?.hold ?? 0); push(k + ' | control', e.control);
      push(k + ' | joint normal (+apart)', j?.normalForce ?? 0); push(k + ' | dist', Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y));
      const facing = Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x), off = Math.abs(Math.atan2(Math.sin(facing - b.facing), Math.cos(facing - b.facing)));
      push(k + ' | chest off man (deg)', off * 180 / Math.PI);
    }
  }
}
const md = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
console.log(`backside-end engaged ticks ${ticks}`);
for (const [k, v] of Object.entries(t).sort((a, b) => b[1] - a[1])) console.log(`  ${(100 * v / ticks).toFixed(0)}%  ${k}`);
for (const [k, v] of Object.entries(rows).sort()) console.log(`  ${k}: med ${md(v).toFixed(2)}`);
