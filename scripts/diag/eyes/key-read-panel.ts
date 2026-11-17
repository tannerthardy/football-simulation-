// node --import tsx scripts/diag/eyes/key-read-panel.ts > rows.jsonl
// Integration (2026-11-16), Rules' back-three trace: the key read reads one way in every coverage. For each keyed
// concept, staged by coverage from trips and doubles: the key's role, the man QB_KEY_MAN named (slot) and what that man
// is really doing at the snap (his zone, or man on whom: diagnostic truth), the defender really playing the key's job on
// that side (for a flat / curl-flat key, the zone defender with a flat zone on the key's side), the read (throwTo, s),
// and the named man's movement along the stretch from the snap to the read (his true displacement, diagnostic). Passive.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const CONCEPTS = (process.env.KEY_CONCEPTS ?? 'stick,quick_outs,slant_flat,curl_flat,flood,double_outs,hitch_out,sail_corner,hitch_post,smash,corner_flat,levels,dagger').split(',');
const COVS = 'cover1 cover2man cover2 tampa2 cover3 cover3_match cover4 cover6'.split(' ');
for (const concept of CONCEPTS) for (const formation of ['gun_trips_11', 'gun_doubles_11']) for (const coverage of COVS) for (const roster of [3, 7, 11]) for (const seed of [1, 2]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false })); } catch { continue; }
  let qb: any = null, snapPos: Map<any, any> | null = null, row: any = null;
  for (let i = 0; i < 300 && sim.phase === 'live' && sim.carrier === sim.qb && !row; i++) {
    sim.tick(); const b: any = sim.qb.behavior;
    if (b?.kind !== 'qb-pass') continue;
    if (!qb) { qb = b; if (!b.plan?.key) break; snapPos = new Map(sim.defense.map((d: any) => [d, { ...d.pos }])); }
    if (b.keyRead && !row) {
      const k = b.plan.key, man = k.man, job = (d: any) => d?.behavior?.kind === 'zone' ? d.behavior.zone : d?.behavior?.kind === 'man' ? `man:${d.behavior.target?.slot}` : d?.behavior?.kind ?? null;
      const side = Math.sign((k.low.pos.y + k.high.pos.y) / 2 - sim.ballY) || 1;
      const flatMan = sim.defense.find((d: any) => d.behavior?.kind === 'zone' && /flat/.test(d.behavior.zone) && Math.sign(d.pos.y - sim.ballY) === side) ?? null;
      const lo = k.low.pos, hi = k.high.pos, sx = hi.x - lo.x, sy = hi.y - lo.y, L = Math.hypot(sx, sy) || 1;
      const moved = man && snapPos ? ((man.pos.x - snapPos.get(man).x) * sx + (man.pos.y - snapPos.get(man).y) * sy) / L : null;
      row = { concept, formation, coverage, roster, seed, role: k.role, man: man?.slot ?? null, manJob: job(man), trueFlat: flatMan?.slot ?? null, trueFlatJob: job(flatMan),
        t: +sim.t.toFixed(2), throwTo: b.keyRead.throwTo, s: b.keyRead.s, mode: b.keyRead.mode ?? null, moved: moved === null ? null : +moved.toFixed(2),
        lowSlot: k.low.slot, highSlot: k.high.slot };
    }
  }
  if (!row) continue;
  // The play's result: the first QB throw's target (low / high / other), completion, interception, sack, yards.
  let target: string | null = null; const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, t: any, ...rest: any[]) => { if (p === sim.qb && target === null) target = t?.slot ?? '-'; return tb(p, t, ...rest); };
  let res: any = null; try { res = sim.run(); } catch { /* staged */ }
  row.target = target === row.lowSlot ? 'low' : target === row.highSlot ? 'high' : target === null ? null : 'other';
  row.flipped = !!sim.qb.behavior?.keyFlipped;
  row.cmp = !!res?.stats?.completed; row.int = sim.events.some((e: any) => e.type === 'interception'); row.sack = sim.events.some((e: any) => e.type === 'sack'); row.yards = res?.yards ?? null;
  console.log(JSON.stringify(row));
}
