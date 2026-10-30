/** One play, one offensive slot: command trace from..to (decision raw, final, rewrite stages), achieved velocity. args: seed idx slot from to */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const [seed, idx] = process.argv.slice(2, 4).map(Number), slot = process.argv[4], [from, to] = process.argv.slice(5).map(Number);
const p = (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])[idx];
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
const tr = sim.recordCommands({ actor: { team: 'O', slot }, from, to });
sim.run();
const v = (x: any) => x ? `(${x.x.toFixed(2)},${x.y.toFixed(2)})` : '-';
for (const s of tr.steps) console.log(`t ${(s.stepStart?.t ?? s.start?.t ?? 0).toFixed?.(2)} raw ${v(s.decision?.raw?.vel)} stages ${s.rewrites.map((r: any) => r.stage + v(r.command?.vel)).join(' ')} final ${v(s.final?.vel)} | body v ${v(s.start?.body?.velocity)} | end v ${v(s.endpoint?.velocity ?? s.endpoint?.body?.velocity)}`);
