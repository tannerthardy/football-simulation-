/** Mesh backs before the handoff, moving 2.3-3.3 yd/s: share of ticks requesting < 4.5 yd/s, by branch. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunnerToMesh } = await import(root + '/src/sim/assign.ts');
const { handoffReach } = await import(root + '/src/sim/assign.ts').catch(() => ({ handoffReach: null })) as any;
const acc: Record<string, [number, number]> = {}; let n = 0, low = 0;
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const rb = sim.slot('RB'); if (!rb || !(rb.behavior instanceof RunnerToMesh)) continue;
  const b: any = rb.behavior;
  const qd = (sim.qb.pos.x - sim.los) * sim.attackDir('O'), set = qd > -2 ? 'under' : qd > -4.5 ? 'pistol' : 'gun';
  while (sim.phase === 'live' && sim.t < 2.5 && rb.behavior === b) {
    sim.tick();
    if (rb.behavior !== b) break;
    const v = Math.hypot(rb.vel.x, rb.vel.y); if (v < 2.3 || v > 3.3) continue;
    const iv = sim.intents[rb.idx].vel, r = Math.hypot(iv.x, iv.y);
    const qb = sim.see(rb, sim.qb), d = Math.hypot(b.mesh.x - rb.pos.x, b.mesh.y - rb.pos.y);
    const lead = Math.min(.5, d / Math.max(1, v)), qbAt = { x: qb.pos.x + qb.vel.x * lead, y: qb.pos.y + qb.vel.y * lead };
    const reach = sim.qb.profile.reach + rb.profile.radius;
    const ready = Math.hypot(qbAt.x - b.mesh.x, qbAt.y - b.mesh.y) <= reach;
    const branch = (!b.ride ? 'no ride (draw)' : b.passed ? 'passed (riding to aim)' : ready ? 'ready (QB there)' : 'not ready (QB not there yet)') + (r < 4.5 ? '' : '') + ' d<1:' + (d < 1);
    const k = `${set} ${branch}`; const a = (acc[k] ??= [0, 0]); a[0]++; n++;
    if (r < 4.5) { a[1]++; low++; }
  }
}
console.log(`ticks at 2.3-3.3 yd/s before the handoff: ${n}, requesting < 4.5 yd/s: ${(100 * low / n).toFixed(0)}%`);
for (const [k, [t, l]] of Object.entries(acc).sort((a, b) => b[1][1] - a[1][1])) console.log(`  ${k}: ${t} ticks, ${(100 * l / t).toFixed(0)}% low (${(100 * l / Math.max(1, low)).toFixed(0)}% of all low)`);
