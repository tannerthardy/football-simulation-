// What the QB chooses at the throw (report only): on league-sampled games (leagueSample, same population as
// sim-export / collect.ts), one row per called dropback. Passive: wraps QBPass methods and reads state; the game
// is identical to an unprobed one.
//   node --import tsx scripts/diag/call-mix/qb-reads.ts [--seed 101] [--games 16] > out/call-mix/qb-reads.jsonl
// Row: concept; the read order (route id and class of each read); when each read index became current (s after
// the snap); at the throw, the read he was on, the target's place in the order and the path that threw it
// (drop: rhythm throw on the last step of the drop; read: the current read; outlet: the rhythm outlet as his eyes
// leave a read; out: out of reads, best available; hot: under imminent pressure, best available; other); and, at
// the throw or the sack, every skill player's route, class, depth, width and nearest defender (distance, and
// whether that defender is closing).
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { routeClass } from '../../../src/game/call-mix.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '16'));
const P: any = QBPass.prototype;
let cur: any = null;
const tag = (name: string, f: (...a: any[]) => any) => function (this: any, ...a: any[]) {
  const r = f.apply(this, a);
  if (cur && r) cur.flag = { name, t: a[1]?.t, urgency: a[2] };
  return r;
};
P.outletThrow = tag('outlet', P.outletThrow);
P.bestOption = tag('best', P.bestOption);
const startThrow = P.startThrow;
P.startThrow = function (a: any, sim: any, ev: any) {
  if (cur && !cur.throw) {
    const target = ev?.target;
    const f = cur.flag && Math.abs(cur.flag.t - sim.t) < 1e-9 ? cur.flag : null;
    const path = this.phase === 'drop' ? 'drop' : f?.name === 'outlet' ? 'outlet' : f?.name === 'best' ? (f.urgency === 1 ? 'hot' : 'out')
      : target === this.reads[this.readIdx] ? 'read' : 'other';
    cur.throw = { t: +sim.t.toFixed(2), readIdx: this.readIdx + 1, nReads: this.reads.length, targetIdx: this.reads.indexOf(target) + 1, path,
      P: +(ev?.P ?? 0).toFixed(3), intRisk: +(ev?.intRisk ?? 0).toFixed(3) };
    cur.snap = picture(sim, target);
  }
  return startThrow.call(this, a, sim, ev);
};
function routeId(a: any): string | null {
  const b = a.behavior;
  if (b instanceof RouteRunner) return b.route.id;
  const inner = b?.inner ?? b?.then ?? null;
  if (inner instanceof RouteRunner) return inner.route.id;
  return b?.kind === 'pass-pro' ? 'block' : b?.kind ?? null;
}
/** The route the concept installs for this receiver (a back's check release counts as a checkdown). */
function installed(sim: any, a: any): string | null {
  const c = sim.offCall.pass; if (!c) return null;
  const ref = sim.offAlign.refOf[a.slot], spot = sim.offAlign.spots[a.slot];
  if (ref === 'B') return c.back === 'block' ? 'block' : c.back === 'check' ? 'checkdown' : c.back;
  if (ref === 'B2' || !ref) return 'checkdown';
  if (spot?.inline && c.teBlock) return 'block';
  const side = ref[0] === 'S' ? c.strong : c.weak, n = Number(ref[1]);
  return side[n] ?? (n === 1 ? 'go' : 'seam');
}
function picture(sim: any, target: any) {
  const dir = sim.attackDir('O');
  return sim.offense.filter((o: any) => o !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot)).map((o: any) => {
    let near: any = null, nd = Infinity;
    for (const d of sim.defense) { const x = Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y); if (x < nd) { nd = x; near = d; } }
    const rel = { x: near.pos.x - o.pos.x, y: near.pos.y - o.pos.y };
    const closing = -(((near.vel.x - o.vel.x) * rel.x + (near.vel.y - o.vel.y) * rel.y) / (nd || 1));
    const rid = routeId(o) === 'block' ? 'block' : installed(sim, o) ?? routeId(o);
    let cls: string | null = null;
    try { cls = rid && rid !== 'block' ? routeClass(rid) : null; } catch { cls = null; }
    return { slot: o.slot, pos: o.player.position, route: rid, cls, back: o.slot === 'RB' || o.slot === 'F' || sim.offAlign.refOf?.[o.slot] === 'B' || sim.offAlign.refOf?.[o.slot] === 'B2',
      breakTime: o.behavior instanceof RouteRunner ? +(o.behavior as any).breakTime?.toFixed?.(2) : null,
      target: o === target, depth: +((o.pos.x - sim.los) * dir).toFixed(2), width: +Math.abs(o.pos.y - sim.ballY).toFixed(2),
      near: +nd.toFixed(2), closing: +closing.toFixed(2) };
  });
}
const out = (o: unknown) => process.stdout.write(JSON.stringify(o) + '\n');
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  const res = simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, hooks: {
    playResult: (sim: any, kind: string) => {
      if (kind !== 'scrimmage' || sim.offCall.kind !== 'pass' || !sim.offCall.pass) return undefined;
      const qbb: any = sim.qb.behavior;
      cur = { readsAt: [] as number[], throw: null, snap: null, flag: null };
      const reads = (qbb.reads ?? []).map((r: any) => ({ slot: r.slot, route: installed(sim, r) }));
      let lastIdx = -1, sackSnap: any = null;
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        tick();
        const b: any = sim.qb.behavior;
        if (b instanceof QBPass && (b as any).phase === 'set' && (b as any).readIdx !== lastIdx) {
          lastIdx = (b as any).readIdx; cur.readsAt[lastIdx] = +sim.t.toFixed(2);
        }
      };
      const r = sim.run();
      const s = sim.stats;
      if (s.sacked) sackSnap = picture(sim, null);
      out({ seed: seed + g, down: sim.down, dist: +(sim.firstDownX - sim.los).toFixed(1), concept: sim.offCall.pass.id, family: sim.offCall.pass.family,
        reads: reads.map((x: any) => ({ ...x, cls: (() => { try { return x.route && x.route !== 'block' ? routeClass(x.route) : null; } catch { return null; } })() })),
        readsAt: cur.readsAt, throw: cur.throw, atThrow: cur.snap, atSack: sackSnap,
        att: !!s.attempted, cmp: !!s.completed, sack: !!s.sacked, scramble: !!s.scramble, throwaway: !!s.throwaway,
        yards: +r.yards.toFixed(2), air: s.airYards ?? null, yac: s.yac ?? null, ttt: s.timeToThrow ?? null });
      cur = null;
      return r;
    } } as any });
  console.error(`game ${g + 1}/${games}: ${res.score.home}-${res.score.away}`);
}
