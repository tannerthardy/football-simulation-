// Counter combos: why the joined release read declines, per combo (instrumented blocking.ts in the worktree).
import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const seeds = process.argv[3].split(',').map(Number), shifts = Number(process.argv[4] ?? 0);
type Rec = { after?: any[]; reasons: Record<string, number>; first: Record<string, number>; rel: number; members: string; byT: [number, string][] };
const all: Rec[] = [];
for (const seed of seeds) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  snaps.forEach((p: any, i: number) => {
    if (p.pass) return;
    for (let s = 0; s <= shifts; s++) {
      let setup = restoreSetup(Buffer.from(p.setup, 'base64'));
      if (setup.offCall?.run?.id !== 'counter') return;
      if (s) setup = { ...setup, seed: (typeof setup.seed === 'number' ? new Rng(setup.seed) : setup.seed).fork(`shift:${s}`) };
      const sim = new PlaySim(setup);
      const recs = new Map<any, Rec>();
      (globalThis as any).__why = (combo: any, obs: any, t: number, why: string) => {
        let r = recs.get(combo);
        if (!r) recs.set(combo, r = { reasons: {}, first: {}, rel: -1, members: combo.members.map((m: any) => m.slot).join('+') + '>' + combo.defender.slot + '/' + combo.backer?.slot, byT: [] });
        r.reasons[why] = (r.reasons[why] ?? 0) + 1; r.first[why] ??= t; r.byT.push([t, `${obs.slot}:${why}`]);
      };
      const tick = sim.tick.bind(sim);
      sim.tick = () => { tick(); for (const [c, r] of recs) {
        if (r.rel < 0 && c.released) r.rel = sim.t;
        if (r.rel >= 0 && !(r as any).done) {
          const dt = sim.t - r.rel, cl = c.members.find((m: any) => m !== c.keeper && m.behavior?.plan?.climbTo) ?? c.members.find((m: any) => m.behavior?.plan?.kind === 'climb' || m.behavior?.plan?.climbTo);
          const k = [0, .5, 1.0].find(x => Math.abs(dt - x) < .026);
          if (k !== undefined) {
            r.after ??= [];
            const m = cl ?? c.members[0], b = c.backer, e = m.engagement;
            const dir = sim.attackDir('O');
            r.after.push({ dt: k, who: m.slot, plan: m.behavior?.plan?.kind, tgt: m.behavior?.plan?.target?.slot, x: +((m.pos.x - sim.los) * dir).toFixed(2), dlx: +((c.defender.pos.x - sim.los) * dir).toFixed(2),
              bx: +((b.pos.x - sim.los) * dir).toFixed(2), d: +Math.hypot(b.pos.x - m.pos.x, b.pos.y - m.pos.y).toFixed(2), eng: e ? (e.blocker === m || e.helpers.includes(m) ? e.defender.slot : e.blocker.slot) : '-',
              spd: +Math.hypot(m.vel.x, m.vel.y).toFixed(2), vx: +(m.vel.x * dir).toFixed(2), joints: sim.world.joints.filter((j: any) => j.a === m.body || j.b === m.body).length, cx: sim.carrier ? +((sim.carrier.pos.x - sim.los) * dir).toFixed(2) : null });
            if (k === 1.0) (r as any).done = true;
          }
        }
      } };
      sim.run();
      for (const r of recs.values()) { (r as any).id = `S${seed}-${i}.s${s}`; all.push(r); }
    }
  });
}
const tot: Record<string, number> = {}, dom: Record<string, number> = {};
let rel = 0; const relT: number[] = [];
for (const r of all) {
  if (r.rel >= 0) { rel++; relT.push(r.rel); }
  // the reason that last held the read before 2.0 s (or release)
  const end = r.rel >= 0 ? r.rel : 2.0;
  const held = r.byT.filter(([t, w]) => t >= .6 && t <= end && !w.endsWith('release'));
  const c: Record<string, number> = {};
  for (const [, w] of held) { const k = w.split(':')[1]; c[k] = (c[k] ?? 0) + 1; tot[k] = (tot[k] ?? 0) + 1; }
  const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';
  const k = (r.rel >= 0 ? 'released ' : 'never    ') + top; dom[k] = (dom[k] ?? 0) + 1;
}
relT.sort((a, b) => a - b);
console.log('combos', all.length, 'released', rel, 'median rel t', relT[relT.length >> 1]?.toFixed(2), 'q1/q3', relT[relT.length >> 2]?.toFixed(2), relT[3 * relT.length >> 2]?.toFixed(2));
console.log('read outcomes 0.6 s .. release/2.0 s:', tot);
console.log('dominant hold reason by combo:', Object.entries(dom).sort((a, b) => b[1] - a[1]));
const pick: Rec[] = [];
const A: Record<string, number[]> = {}; const E: Record<string, number> = {};
for (const r of all) for (const a of r.after ?? []) {
  for (const f of ['x', 'dlx', 'bx', 'd', 'cx', 'spd', 'vx', 'joints']) (A[a.dt + ' ' + f] ??= []).push(a[f]);
  const ek = a.dt + ' eng ' + (a.eng === '-' ? 'none' : a.eng === r.members.split('>')[1].split('/')[1] ? 'backer' : a.eng === r.members.split('>')[1].split('/')[0] ? 'DL' : 'other');
  E[ek] = (E[ek] ?? 0) + 1;
}
const md = (v: number[]) => { v = v.filter(x => x !== null).sort((a, b) => a - b); return v[v.length >> 1]; };
for (const k of Object.keys(A)) console.log(k, md(A[k]));
console.log(E);
for (const r of all.slice(0, 12)) console.log((r as any).id, r.members, JSON.stringify(r.after));
for (const r of pick) console.log((r as any).id, r.members, r.byT.filter(([t]) => t >= .5 && t <= 2.2).map(([t, w]) => `${t.toFixed(2)} ${w}`).join(' | '));
