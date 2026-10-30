/** usage: node --import tsx cattrace.mts set.bin ID SLOT from to [out.json] */
import { readFileSync, writeFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const [setFile, id, slot, from, to, out] = process.argv.slice(2);
const p = (deserialize(readFileSync(setFile)) as any[]).find(q => q.id === id);
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
const tr = sim.recordCommands({ actor: { team: 'O', slot }, from: +from, to: +to });
const res = sim.run();
const a = sim.slot(slot);
const f = (v: any) => v ? `(${v.x.toFixed(2)},${v.y.toFixed(2)})` : '-';
for (const s of tr.steps) {
  const plan = s.start.behavior.job, tgt = s.start.behavior.target?.slot ?? '-';
  const eng = s.start.engagement ? `${s.start.engagement.blocker.slot}>${s.start.engagement.defender.slot}` : '';
  const contacts = s.start.lastStepContacts.map((c: any) => `${c.other.slot}:${c.impulse.toFixed(1)}`).join(' ');
  console.log(`${s.stepStart.toFixed(2)} ${plan}->${tgt} raw ${f(s.decision?.raw.vel)} final ${f(s.final?.vel)} pos ${f(s.start.body.position)} vel ${f(s.start.body.velocity)} ${eng} ${contacts} ${s.rewrites.map((r: any) => r.stage).join(',')}`);
  for (const c of s.climbAccess ?? []) {
    const d = c.data, name = (k: number) => sim.agents[k].slot;
    console.log(`   ACCESS -> ${c.target.slot}: ${d.result} obstacle ${d.obstacle === null ? '-' : name(d.obstacle)}; surfaces ` + d.surfaces.map((q: any) => `${name(q.key)} cur ${q.current.toFixed(3)} allow ${q.allowed.toFixed(3)} orig ${q.original.toFixed(3)}`).join(' | '));
    for (const k of d.candidates) console.log(`     sign ${k.sign} goal ${f(k.goal)} ${k.rejected ?? 'ok'}${k.support ? ` step ${k.support.step} ${k.support.state}` : ''}${k.failed ? ' vs ' + k.failed.map(name).join(',') : ''}${k.gaps ? ' gaps ' + k.gaps.map((g: number, i: number) => `${name(d.surfaces[i].key)} ${g.toFixed(3)}`).join(' ') : ''}${k.score !== undefined ? ' score ' + k.score.toFixed(2) : ''}`);
    if (d.fallback) console.log(`     fallback ${d.fallback.chose}: braking incursion ${d.fallback.braking.toFixed(3)} vs original ${d.fallback.original.toFixed(3)}`);
  }
}
console.log('result', res.outcome, res.yards.toFixed(2));
console.log('events', sim.events.filter((e: any) => ['carrier_contact', 'tackle', 'engage', 'block_threat', 'combo_release'].includes(e.type) || /combo|release|threat/.test(e.type)).slice(0, 30).map((e: any) => `${e.t} ${e.type} ${e.a !== undefined ? sim.agents[e.a].slot : ''}>${e.b !== undefined ? sim.agents[e.b].slot : ''}`).join(' | '));
if (out) writeFileSync(out, JSON.stringify(tr.steps));
