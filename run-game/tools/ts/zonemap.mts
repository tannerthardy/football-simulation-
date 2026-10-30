/** Zone installation map on the current checkout (run from the repo root).
 * usage: node --import tsx zonemap.ts <iz_over|wz_under> [--save] */
import { writeFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { nativeTraceSetup } = await import(root + '/scripts/diag/command-trace.ts');
const { FRONT_BY_ID } = await import(root + '/src/playbook/defense.ts');
const { RunBlocker, playSideSign } = await import(root + '/src/sim/behaviors/blocking.ts');
const lab = await import(root + '/lab-app/engine.ts');
const CASES: Record<string, any> = {
  iz_over: { recipe: { coverage: 'cover3_buzz', concept: 'iz_strong', seed: 1, roster: 7, formation: 'ace_12', flip: false }, front: 'over' },
  wz_under: { recipe: { coverage: 'cover3_buzz', concept: 'wz_weak', seed: 1, roster: 7, formation: 'ace_12', flip: false }, front: 'under' },
};
const key = process.argv[2], c = CASES[key];
const setup = nativeTraceSetup(c.recipe); setup.defCall.front = FRONT_BY_ID[c.front];
if (process.argv.includes('--save')) {
  const sc = { format: lab.SCENARIO_FORMAT, id: `g2-${key}`, name: `G2 ${key} (Ace12 ${c.recipe.concept} vs ${c.front}, cover3_buzz, roster 7 seed 1)`,
    created: new Date().toISOString(), setup: lab.storeSetup(setup), interventions: [], flags: {}, source: { kind: 'builder' } };
  writeFileSync(`out/lab/scenarios/g2-${key}.json`, JSON.stringify(sc, null, 1));
}
const sim = new PlaySim(setup);
const dir = sim.attackDir('O'), ps = playSideSign(sim, sim.offCall.run);
const rel = (y: number) => ((y - sim.ballY) * ps).toFixed(1), dep = (x: number) => ((x - sim.los) * dir).toFixed(1);
const name = (a: any) => a ? a.slot : '-';
const deps: any[] = [];
const old = RunBlocker.prototype.startDeparture;
RunBlocker.prototype.startDeparture = function (a: any, s: any, d: any, k: any, b: any, p: any) { deps.push({ t: +s.t.toFixed(2), climber: a.slot, keeper: k.slot, defender: d.slot, backer: b.slot }); return old.call(this, a, s, d, k, b, p); };
sim.tick(); // plans exist after the first tick
const line = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && (['LT','LG','C','RG','RT'].includes(o.slot) || sim.offAlign.spots[o.slot]?.inline));
line.sort((p: any, q: any) => (p.pos.y - q.pos.y) * ps);
console.log(`${key}: develop-relative play side +; ball y ${sim.ballY.toFixed(1)}, los ${sim.los}`);
console.log('LINE (backside → playside): ' + line.map((o: any) => { const p = o.behavior.plan; const cb = p.combination;
  return `${o.slot}@${rel(o.pos.y)} ${p.kind}→${name(p.target)}${p.climbTo ? '^' + p.climbTo.slot : ''}${cb ? ` [combo ${cb.members.map(name).join('+')} on ${name(cb.defender)} next ${name(cb.backer)}]` : ''}`; }).join(' | '));
const front = sim.defense.filter((d: any) => (d.pos.x - sim.los) * dir < 8 && Math.abs(d.pos.y - sim.ballY) < 10).sort((p: any, q: any) => (p.pos.y - q.pos.y) * ps);
const covered = (o: any) => front.find((d: any) => (d.pos.x - sim.los) * dir < 2 && Math.abs(d.pos.y - o.pos.y) < 0.9);
console.log('COVERED: ' + line.map((o: any) => `${o.slot}:${name(covered(o))}`).join(' '));
console.log('FRONT: ' + front.map((d: any) => `${d.slot}@${rel(d.pos.y)},${dep(d.pos.x)}`).join(' | '));
const lbs = front.filter((d: any) => (d.pos.x - sim.los) * dir >= 2);
const minD = new Map<string, { d: number; t: number }>();
let handoff = -1, cross = -1; const arrive = new Map<string, number>(); const fits = new Map<string, string>();
const contacts: string[] = [];
while (sim.phase === 'live' && sim.t < 4) {
  sim.tick();
  const c0 = sim.carrier;
  if (handoff < 0 && c0 && c0 !== sim.qb && c0.team === 'O') handoff = +sim.t.toFixed(2);
  if (c0 && c0 !== sim.qb && cross < 0 && (c0.pos.x - sim.los) * dir > 0) cross = +sim.t.toFixed(2);
  for (const l of lbs) {
    if (!fits.has(l.slot) && l.runFit) fits.set(l.slot, `${l.runFit.kind}/${l.runFit.gap}${l.runFit.side > 0 ? '+' : '-'} t${sim.t.toFixed(2)}`);
    if (c0 && c0 !== sim.qb && !arrive.has(l.slot) && (c0.pos.x - l.pos.x) * dir > -1) arrive.set(l.slot, +sim.t.toFixed(2));
  }
  for (const d of deps) { const a = sim.slot(d.climber), b = sim.slot(d.backer); const r = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
    const k = `${d.climber}->${d.backer}`, m = minD.get(k); if (!m || r < m.d) minD.set(k, { d: r, t: +sim.t.toFixed(2) }); }
  for (const e of sim.engagements) { const s = `${e.blocker.slot}>${e.defender.slot}`; if (lbs.includes(e.defender) && !contacts.some(x => x.startsWith(s))) contacts.push(`${s}@${sim.t.toFixed(2)}`); }
}
const res = sim.result ?? null;
RunBlocker.prototype.startDeparture = old;
console.log('BACKER FITS (GAP_MATCH, first job): ' + [...fits].map(([k, v]) => `${k} ${v}`).join(' | '));
console.log(`RUNNER: handoff ${handoff}s, crosses LOS ${cross}s; reaches each backer's level: ` + [...arrive].map(([k, v]) => `${k} ${v}s`).join(' '));
console.log('DEPARTURES: ' + (deps.length ? deps.map(d => `${d.t}s ${d.climber} leaves ${d.defender} (keeper ${d.keeper}) for ${d.backer}`).join(' | ') : 'none'));
console.log('CLIMBER → BACKER closest: ' + [...minD].map(([k, v]) => `${k} ${v.d.toFixed(2)} yd @${v.t}s`).join(' | '));
console.log('BLOCKS ON BACKERS: ' + (contacts.join(' ') || 'none'));
const first = sim.events.find((e: any) => e.type === 'carrier_contact' || e.type === 'tackle_wrap');
console.log(`FIRST CARRIER CONTACT: ${first ? `${first.t}s ${sim.agents[first.b]?.slot ?? sim.agents[first.a]?.slot}` : 'none'}; result ${sim.outcome?.kind ?? ''} ${((sim.endSpot?.x ?? sim.los) - sim.los) * dir}`);
