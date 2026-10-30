import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { Rng } = await import(root + '/src/core/rng.ts');
const [seed, idx, shift] = process.argv.slice(2).map(Number);
const snap = (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])[idx];
let setup: any = restoreSetup(Buffer.from(snap.setup, 'base64'));
if (shift) { const base = typeof setup.seed === 'number' ? new Rng(setup.seed) : setup.seed; setup = { ...setup, seed: base.fork(`shift:${shift}`) }; }
const f = (v: any) => v ? `${(v.x).toFixed(2)},${(v.y).toFixed(2)}` : '-';
(globalThis as any).__KICK = (k: any) => { if (k.t > 2.5) return; console.log(`t ${k.t.toFixed(2)} kick ${k.kick} seen ${f(k.kickSeen.pos)} face ${k.kickSeen.facing.toFixed(2)} ${k.kickSeen.pose} | on ${f(k.on)} v ${f(k.onv)} logged ${k.logged} TAG ${k.tag} side ${k.side} pref ${k.preferred.toFixed(2)} | ` + k.defs.map((d: any) => `${d.slot}@${f(d.pos)} ${d.pose} d${d.d.toFixed(2)} eng:${d.eng}`).join('; ')); };
const sim: any = new PlaySim(setup);
const r = sim.run();
console.log('call', snap.call, 'result', JSON.stringify(r).slice(0, 120));
