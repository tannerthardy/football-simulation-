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
  const b: any = rb.behavior; let own: any = null; const up = b.update.bind(b); b.update = (a: any, sm: any) => (own = up(a, sm));
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
    if (r < 4.5) { a[1]++; low++; if (branch.startsWith('ready') && d >= 1 && set === 'gun') { const o = Math.hypot(own.vel.x, own.vel.y); (globalThis as any).__ex ??= []; const cm = sim.cmds[rb.idx].vel; const nearQB = Math.hypot(sim.qb.pos.x - rb.pos.x, sim.qb.pos.y - rb.pos.y); (globalThis as any).__ex.push([o, r, v, Math.hypot(cm.x, cm.y), nearQB]); } }
  }
}
console.log(`ticks at 2.3-3.3 yd/s before the handoff: ${n}, requesting < 4.5 yd/s: ${(100 * low / n).toFixed(0)}%`);
for (const [k, [t, l]] of Object.entries(acc).sort((a, b) => b[1][1] - a[1][1])) console.log(`  ${k}: ${t} ticks, ${(100 * l / t).toFixed(0)}% low (${(100 * l / Math.max(1, low)).toFixed(0)}% of all low)`);
const ex = (globalThis as any).__ex ?? []; const med = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
console.log('gun ready d>=1 low ticks:', ex.length, 'controller command median', med(ex.map((e: any) => e[0]))?.toFixed(2), 'final intent', med(ex.map((e: any) => e[1]))?.toFixed(2), 'speed', med(ex.map((e: any) => e[2]))?.toFixed(2), 'share where controller itself < 4.5', (ex.filter((e: any) => e[0] < 4.5).length / Math.max(1, ex.length)).toFixed(2));
console.log('  after open-to-ball (cmds) median', med(ex.map((e: any) => e[3]))?.toFixed(2), '| back-QB distance median', med(ex.map((e: any) => e[4]))?.toFixed(2), '| cmds >= 4.5 share', (ex.filter((e: any) => e[3] >= 4.5).length / Math.max(1, ex.length)).toFixed(2));
