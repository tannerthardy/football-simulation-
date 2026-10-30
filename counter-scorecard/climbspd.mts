// Counter combos: after release, the climber's requested speed (his MoveCommand) vs achieved speed, joints still on
// him, distance to the released DL, and his plan kind, at +0.1/+0.3/+0.5 s. Stream 0, captured counter snaps.
import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const seeds = process.argv[3].split(',').map(Number);
const A: Record<string, number[]> = {}; const K: Record<string, number> = {};
const push = (k: string, v: number) => (A[k] ??= []).push(v);
for (const seed of seeds) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) {
    if (p.pass) continue;
    const setup = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (setup.offCall?.run?.scheme !== 'counter') continue;
    const sim = new PlaySim(setup);
    const combos = new Set<any>();
    for (const a of sim.offense) if (a.behavior instanceof RunBlocker && a.behavior.plan.combination) combos.add(a.behavior.plan.combination);
    const req = new Map<any, number>(); const reqv = new Map<any, any>(); const reqf = new Map<any, any>();
    for (const a of sim.offense) {
      const b: any = a.behavior; if (!(b instanceof RunBlocker)) continue;
      const up = b.update.bind(b);
      b.update = (ag: any, s: any) => { const c = up(ag, s); req.set(ag, c?.vel ? Math.hypot(c.vel.x, c.vel.y) : NaN); reqv.set(ag, c?.vel ?? null); reqf.set(ag, c?.facing); return c; };
    }
    const rel = new Map<any, { t: number; climber: any; dl: any }>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      for (const c of combos) {
        if (!rel.has(c) && c.released) {
          const climber = c.members.find((m: any) => m.behavior?.plan?.kind === 'climb') ?? c.members.find((m: any) => m !== c.keeper);
          rel.set(c, { t: sim.t, climber, dl: c.defender });
        }
        const r = rel.get(c); if (!r) continue;
        const dt = sim.t - r.t;
        for (const k of [0.1, 0.3, 0.5]) if (Math.abs(dt - k) < .026) {
          const m = r.climber;
          push(`+${k} req`, req.get(m) ?? NaN); push(`+${k} got`, Math.hypot(m.vel.x, m.vel.y));
          push(`+${k} dDL`, Math.hypot(m.pos.x - r.dl.pos.x, m.pos.y - r.dl.pos.y));
          const j = sim.world.joints.filter((jj: any) => jj.a === m.body || jj.b === m.body).length;
          push(`+${k} joints`, j);
          const ux = (r.dl.pos.x - m.pos.x), uy = (r.dl.pos.y - m.pos.y), ul = Math.hypot(ux, uy) || 1, v = reqv.get(m);
          if (v) push(`+${k} req into DL`, (v.x * ux + v.y * uy) / ul);
          push(`+${k} DL vel into climber`, -(r.dl.vel.x * ux + r.dl.vel.y * uy) / ul);
          push(`+${k} got into DL`, (m.vel.x * ux + m.vel.y * uy) / ul);
          const kp = c.members.find((x: any) => x !== m); push(`+${k} d keeper`, Math.hypot(kp.pos.x - m.pos.x, kp.pos.y - m.pos.y));
          const others = [...sim.offense, ...sim.defense].filter((o: any) => o !== m && o !== r.dl && o !== kp);
          push(`+${k} gap other`, Math.min(...others.map((o: any) => Math.hypot(o.pos.x - m.pos.x, o.pos.y - m.pos.y) - o.profile.radius - m.profile.radius)));
          if (v && Math.hypot(v.x, v.y) > .5) { const d = Math.atan2(v.y, v.x) - m.body.facing; push(`+${k} |facing-reqdir| deg`, Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * 57.3); }
          { const rf = reqf.get(m); push(`+${k} req facing given`, rf === undefined || rf === null ? 0 : 1); if (rf != null && v) { const d = Math.atan2(v.y, v.x) - rf; push(`+${k} |reqfacing-reqdir| deg`, Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * 57.3); } }
          push(`+${k} gap DL`, Math.hypot(ux, uy) - r.dl.profile.radius - m.profile.radius);
          K[`+${k} kind ${m.behavior?.plan?.kind}${m.engagement ? ' engaged-' + (m.engagement.defender === r.dl ? 'DL' : m.engagement.defender === c.backer ? 'backer' : 'other') : ''}`] = (K[`+${k} kind ${m.behavior?.plan?.kind}${m.engagement ? ' engaged-' + (m.engagement.defender === r.dl ? 'DL' : m.engagement.defender === c.backer ? 'backer' : 'other') : ''}`] ?? 0) + 1;
        }
      }
    };
    sim.run();
  }
}
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? `${v[v.length >> 2].toFixed(2)}/${v[v.length >> 1].toFixed(2)}/${v[3 * v.length >> 2].toFixed(2)} n${v.length}` : '-'; };
for (const k of Object.keys(A).sort()) console.log(k.padEnd(14), q(A[k]));
for (const [k, v] of Object.entries(K).sort()) console.log(v, k);
