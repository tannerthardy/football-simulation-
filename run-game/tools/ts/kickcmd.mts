/** One play: the kick puller's command trace from..to: decision raw/final velocity, rewrite stages, blocking changes. args: seed idx from to */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const [seed, idx, from, to] = process.argv.slice(2).map(Number);
const p = (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])[idx];
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
const k = sim.offense.find((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull' && o.behavior.plan.pullRole === 'kick');
(globalThis as any).__SPC = (a: any, b: any, cut: number, gap: number, cl: number, al: number) => { if (a === k && sim.t >= from && sim.t <= to) console.log('  spacing', sim.t.toFixed(2), 'peer', b.slot, 'cut', cut.toFixed(2), 'gap', gap.toFixed(2), 'closing', cl.toFixed(2), 'allowed', al.toFixed(2)); };
(globalThis as any).__KDBG = (a: any, w: string, p: any) => { if (a === k && sim.t >= from && sim.t <= to) console.log('  dbg', sim.t.toFixed(2), w, p ? ((p.x - sim.los) * sim.attackDir('O')).toFixed(2) + ',' + p.y.toFixed(2) : ''); };
(globalThis as any).__SPD = (a: any, b: any, o: any) => { if (a === k && sim.t >= from && sim.t <= to) console.log('  spd', sim.t.toFixed(2), b.slot, JSON.stringify(o, (key, v) => typeof v === 'number' ? Number(v.toFixed(2)) : v)); };
(globalThis as any).__KLOG = (a: any, aim: any, seen: any, c: any) => { if (a === k && sim.t >= from && sim.t <= to) { const rt = sim.slot('RT'), lt = sim.slot('LT'); console.log('  klog', sim.t.toFixed(2), 'K', a.pos.x.toFixed(2), a.pos.y.toFixed(2), 'aim', aim.x.toFixed(2), aim.y.toFixed(2), 'DE', seen.pos.x.toFixed(2), seen.pos.y.toFixed(2), 'v', seen.vel.x.toFixed(2), seen.vel.y.toFixed(2), 'cmd', c.vel.x.toFixed(2), c.vel.y.toFixed(2), 'RT', rt.pos.x.toFixed(2), rt.pos.y.toFixed(2), 'LT', lt.pos.x.toFixed(2), lt.pos.y.toFixed(2), 'dir', sim.attackDir('O')); } };
const tr = sim.recordCommands({ actor: { team: 'O', slot: k.slot }, from, to });
sim.run();
const v = (x: any) => x ? `(${x.x.toFixed(2)},${x.y.toFixed(2)})` : '-';
for (const s of tr.steps) {
  console.log(JSON.stringify(s.rewrites).slice(0,700)); console.log(`t ${s.t?.toFixed?.(2) ?? '?'} raw ${v(s.decision?.raw?.vel)} final ${v(s.final?.vel)} | rewrites ${s.rewrites.map((r: any) => r.stage + v(r.after?.vel ?? r.vel)).join(' ')} | keys ${Object.keys(s).join(',')}`);
}
