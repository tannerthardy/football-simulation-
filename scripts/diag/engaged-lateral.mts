/**
 * Engaged box LBs on run plays: lateral velocity toward the carrier side (yd/s) at each stage, while engaged.
 *   raw       the controller's request (CoverageDefender etc.)
 *   final     the intent after the engagement/spacing rewrites (what the legs are asked for)
 *   achieved  the body's endpoint velocity
 *   blocker final / blocker achieved   the engaging blocker's final intent and achieved velocity
 * Also counts which rewrite stages change the lateral by > 0.3 yd/s.
 * HOLD=1: counterfactual that zeroes the engaged LB's final lateral request just before world.step
 * (depth and push kept), separating what the legs are asked for from what contact carries.
 *
 * Usage: tsx scripts/diag/engaged-lateral.mts [repoRoot] [captures...]
 * Captures default to out/matched-restage/seed7.json and seed8.json (saved setups from the
 * matched-restage overlay); pass others, e.g. out/matched-restage/seed9-run.json.
 * Built from Defense's _lbeng.mts operator.
 */
import { readFileSync } from 'node:fs';
const W = process.argv[2] ?? process.cwd();
const files = process.argv.length > 3 ? process.argv.slice(3) : [7, 8].map(k => `${W}/out/matched-restage/seed${k}.json`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const agg: Record<string, number[]> = {}; const stages: Record<string, number> = {};
const put = (k: string, v: number) => (agg[k] ??= []).push(v);
let n = 0;
for (const file of files) for (const p of JSON.parse(readFileSync(file, 'utf8'))) {
  if (p.pass) continue;
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); const sc = String(st.offCall?.run?.scheme);
  const fam = /outside|wide|toss|stretch/i.test(sc) ? 'wide' : /inside|split|duo/i.test(sc) ? 'iz' : 'gap';
  const probe: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const box = probe.defense.filter((a: any) => { const s = probe.defAlign.spots[a.slot]?.pos; return a.slot.startsWith('LB') && s && Math.abs(s.x - probe.los) >= 2.5 && Math.abs(s.x - probe.los) <= 8 && Math.abs(s.y - probe.ballY) < 6; }).map((a: any) => a.slot);
  for (const slot of box) {
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    if (process.env.HOLD) { const step0 = sim.world.step.bind(sim.world); sim.world.step = (intents: any[], dt: number) => {
      const m = sim.defense.find((a: any) => a.slot === slot); if (m.engagement && intents[m.idx]) intents[m.idx] = { ...intents[m.idx], vel: { x: intents[m.idx].vel.x, y: 0 } };
      return step0(intents, dt); }; }
    const trace = sim.recordCommands({ actor: { team: 'D', slot }, from: 0, to: 4 });
    const me = sim.defense.find((a: any) => a.slot === slot);
    const rows = new Map<number, any>();
    while (sim.phase === 'live' && sim.t < 4) {
      const t0 = sim.t; sim.tick();
      const b = sim.ball; const car = b.kind === 'held' ? b.carrier : null; const e = me.engagement;
      rows.set(Math.round(t0 * 1e6), { eng: !!e, side: car ? Math.sign(car.pos.y - me.pos.y) : 0, bl: e?.blocker, blv: e?.blocker ? { ...e.blocker.vel } : null, bfin: e?.blocker ? sim.intents[e.blocker.idx]?.vel : null, push: sim.intents[me.idx]?.push ?? 0 });
    }
    n++;
    for (const s of trace.steps) {
      const r = rows.get(Math.round(s.stepStart * 1e6)); if (!r || !r.eng || !r.side) continue;
      const raw: any = s.decision?.raw, fin: any = s.final, end: any = s.endpoint;
      const av = end?.body?.velocity ?? end?.velocity;
      if (raw?.vel) put(`${fam} 1 raw`, raw.vel.y * r.side);
      for (const w of s.rewrites ?? []) if (raw?.vel && Math.abs(w.command.vel.y - raw.vel.y) > .3) stages[w.stage] = (stages[w.stage] ?? 0) + 1;
      if (fin?.vel) put(`${fam} 2 final`, fin.vel.y * r.side);
      if (av) put(`${fam} 3 achieved`, av.y * r.side);
      if (r.bfin) put(`${fam} 4a blocker final`, r.bfin.y * r.side);
      if (r.blv) put(`${fam} 4b blocker achieved`, r.blv.y * r.side);
      put(`${fam} 5 push`, fin?.push ?? 0);
      // Opposed requests: LB asks toward the carrier, his blocker asks away (> 0.5 yd/s each).
      if (fin?.vel && r.bfin && av && r.blv && fin.vel.y * r.side > .5 && r.bfin.y * r.side < -.5) {
        put(`${fam} 6 opposed: LB final`, fin.vel.y * r.side); put(`${fam} 6 opposed: blocker final`, r.bfin.y * r.side);
        put(`${fam} 6 opposed: LB achieved`, av.y * r.side); put(`${fam} 6 opposed: blocker achieved`, r.blv.y * r.side);
        put(`${fam} 6 opposed: LB-blocker mass ratio`, me.profile.massKg / r.bl.profile.massKg);
      }
    }
  }
}
const q = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return `${s[s.length >> 2].toFixed(2)}/${s[s.length >> 1].toFixed(2)}/${s[(3 * s.length) >> 2].toFixed(2)}`; };
console.log('box LB plays', n);
for (const [k, v] of Object.entries(agg).sort()) console.log(k.padEnd(28), 'p25/50/75', q(v), 'n', v.length);
console.log('rewrite stages changing lateral by >0.3:', JSON.stringify(stages));
