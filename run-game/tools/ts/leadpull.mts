/** Counter lead puller (tackle), 0-2.2 s by 0.2 s bins: requested speed (decision), after spacing, achieved speed,
 * lateral progress toward the pull since the snap, and which teammate spacing cuts against (top, with engaged flag).
 * args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const bins: Record<string, Record<string, number>> = {}; const add = (b: string, k: string, v = 1) => { const o = (bins[b] ??= {}); o[k] = (o[k] ?? 0) + v; };
let sim: any, lead: any = null, cuts: any[] = [];
(globalThis as any).__SPC = (a: any, b: any, cut: number) => { if (a === lead) cuts.push({ b, cut }); };
(globalThis as any).__SPCEND = (a: any, before: any, after: any) => {
  if (a !== lead) return;
  const bin = (Math.floor(sim.t / 0.2) * 0.2).toFixed(1);
  add(bin, 'n'); add(bin, 'req', Math.hypot(before.vel.x, before.vel.y)); add(bin, 'spaced', Math.hypot(after.vel.x, after.vel.y));
  const top = cuts.sort((x, y) => y.cut - x.cut)[0];
  if (top && top.cut > 1) { const eng = sim.engagements.some((e: any) => e.blocker === top.b || e.helpers?.includes(top.b)); add(bin, `cut by ${top.b.slot}${eng ? '*' : ''}`); }
};
for (const seed of process.argv.slice(2)) for (const p of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])) {
  if (p.pass) continue;
  sim = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (sim.offCall.run?.scheme !== 'counter' || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  lead = sim.offense.find((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull' && o.behavior.plan.pullRole === 'lead' && /T$/.test(o.slot));
  if (!lead) continue;
  const ps = Math.sign((lead.behavior.plan.pullPath?.at(-1)?.y ?? lead.pos.y) - lead.pos.y) || 1, y0 = lead.pos.y;
  while (sim.phase === 'live' && sim.t < 2.2) {
    cuts = []; sim.tick();
    const bin = (Math.floor((sim.t - 1e-9) / 0.2) * 0.2).toFixed(1);
    add(bin, 'ach', lead.speed); add(bin, 'lat', (lead.pos.y - y0) * ps); add(bin, 'na');
  }
}
for (const [b, o] of Object.entries(bins).sort((x, y) => +x[0] - +y[0])) {
  const cutters = Object.entries(o).filter(([k]) => k.startsWith('cut by')).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => `${k.slice(7)} ${(v / o.n).toFixed(2)}`).join(', ');
  console.log(`t ${b} | req ${(o.req / o.n).toFixed(2)} spaced ${(o.spaced / o.n).toFixed(2)} achieved ${(o.ach / o.na).toFixed(2)} | lateral ${(o.lat / o.na).toFixed(2)} | spacing cut>1 by: ${cutters}`);
}
