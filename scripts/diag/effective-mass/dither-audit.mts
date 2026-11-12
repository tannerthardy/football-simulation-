/** Engine-wide dither audit (Defense for the owner via Integration, 2026-11-12; report only). Every player, every live
 * tick of every scrimmage play on a panel of league games. For each request direction change > 20 deg between
 * consecutive ticks (both requests > 1 yd/s), grouped by controller (behaviour kind, Flex's commitment-probe groups):
 *  - the first pipeline stage that turned it:
 *      mode switch          the behaviour's kind, or the pursuit planner's stage, changed this tick;
 *      behaviour / planner  the behaviour's own output (behavior.update) turned;
 *      containment          PlaySim.decide's coverage containment turned it (recomputed: containCoverage alone matches);
 *      decide (other)       another decide stage (coverage orientation, open-to-ball, breakdown) turned it;
 *      contact technique    the decision held but the intent (block / tackle technique) turned;
 *  - reversed: a later request within 20 deg of the one before the change, within 0.3 s;
 *  - cue: his picture of the nearest opponent turned > 20 deg or changed speed > 1 yd/s over the previous 0.2 s;
 *  - the achieved speed change over the next tick, against ticks with no change.
 * usage: node --import tsx scripts/diag/effective-mass/dither-audit.mts <repo root, e.g. .> [first seed] [games] */
const W = process.argv[2] ?? process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { containCoverage } = await import(`${W}/src/sim/coverage-space.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { movementObjective } = await import(`${W}/src/sim/movement-objective.ts`);
const first = Number(process.argv[3] ?? 101), games = Number(process.argv[4] ?? 4);
const GROUP: Record<string, string> = { 'qb-pass': 'QB', 'qb-handoff': 'QB', mesh: 'QB', 'pa-fake': 'QB', 'pass-pro': 'block', 'run-block': 'block',
  'screen-block': 'block', 'downfield-block': 'block', 'block-look': 'block', rush: 'rush', blitz: 'rush', zone: 'coverage', man: 'coverage',
  pursuit: 'pursuit', 'run-fit': 'run fit', track: 'pursuit', route: 'route', carrier: 'carrier', 'scramble-ball': 'loose ball' };
const ang = (a: any, b: any) => Math.abs(((Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x)) * 180 / Math.PI + 540) % 360 - 180);
const sp = (v: any) => Math.hypot(v.x, v.y);
const turned = (p: any, r: any) => !!p && !!r && sp(p) > 1 && sp(r) > 1 && ang(p, r) > 20;
const stopped = (p: any, r: any) => !!p && !!r && (sp(p) > 1) !== (sp(r) > 1);

type Acc = { time: number; changes: number; reversed: number; cue: number; dvC: number[]; dvS: number[]; src: Record<string, { n: number; rev: number; cue: number; dv: number[] }> };
const acc: Record<string, Acc> = {};
const get = (g: string) => acc[g] ??= { time: 0, changes: 0, reversed: 0, cue: 0, dvC: [], dvS: [], src: {} };

// Per-agent per-tick pipeline record, filled by the decide wrapper and the trace proxy.
const dec = new WeakMap<any, any>(), stage = new WeakMap<any, string>();
const decide0 = (PlaySim.prototype as any).decide;
(PlaySim.prototype as any).decide = function (this: any, i: number, t: number) {
  const a = this.agents[i], b = a.behavior, up = b.update; let out: any = null;
  b.update = (...args: any[]) => (out = up.apply(b, args));
  try { decide0.call(this, i, t); } finally { b.update = up; }
  const cov = b.kind === 'man' || b.kind === 'zone';
  const goal = out ? movementObjective(out) : undefined;
  dec.set(a, { lab: out ? (facingTechnique(out)?.label ?? '') : '', goal: goal ? { ...goal.point } : null, upd: out ? { ...out.vel } : null, cmd: { ...this.cmds[i].vel }, contained: out && cov ? { ...containCoverage(a, out).vel } : null });
};
const tc0 = PlaySim.prototype.commandTraceFor;
PlaySim.prototype.commandTraceFor = function (this: any, a: any) {
  const inner = tc0.call(this, a);
  return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit'
    ? (target: any, d: any) => { stage.set(a, d?.kind === 'chase' ? `${d.planner}:${d.requests?.at(-1)?.stage ?? '-'}` : d?.kind ?? '-'); return o?.pursuit?.(target, d); }
    : (typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined) }) as any;
};

for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s, record: false, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage') return undefined;
    const hist = new Map<any, any[]>();
    // A passive stub of the responsibility ledger: it records each pipeline stage's velocity per agent this tick.
    const stv = new Map<any, Record<string, any>>();
    const put = (a: any, k: string, c: any) => { if (!c?.vel) return; const m = stv.get(a) ?? {}; m[k] = { ...c.vel }; stv.set(a, m); };
    sim.responsibility = new Proxy({}, { get: (_o, k) => k === 'decision' ? (a: any, _b: any, c: any) => put(a, 'decision', c)
      : k === 'stage' ? (st: string, a: any, c: any) => put(a, st, c)
      : k === 'stageAll' ? (st: string, I: any[]) => I.forEach((c, i) => put(sim.agents[i], st, c))
      : () => undefined });
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      for (const a of sim.agents) stage.delete(a);
      stv.clear();
      tick();
      if (sim.phase !== 'live') return;
      for (const a of sim.agents) {
        const it = sim.intents?.[a.idx]; if (!it) continue;
        const d = dec.get(a) ?? {};
        const opp = (a.team === 'O' ? sim.defense : sim.offense).reduce((b: any, o: any) => !b || Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y) < Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y) ? o : b, null);
        const seen = opp ? sim.see(a, opp) : null;
        const k = a.behavior?.kind ?? 'none';
        const row = { req: { ...it.vel }, ac: sp(a.vel), mode: `${k}|${stage.get(a) ?? ''}`, opp, sv: seen ? { ...seen.vel } : null, upd: d.upd, cmd: d.cmd, contained: d.contained, st: stv.get(a) ?? {}, lab: d.lab, goal: d.goal, g: GROUP[k] ?? k };
        const H = hist.get(a) ?? []; H.push(row); if (H.length > 8) H.shift(); hist.set(a, H);
        if (H.length < 2) continue;
        const p = H[H.length - 2], r = row, A = get(r.g);
        if (sp(p.req) > 1 && sp(r.req) > 1) A.time += sim.dt;
        // the previous change's next-tick speed change is settled now
        // the previous tick's change (or steady tick) settles now, in the group it was counted in
        if (p.pend) { const P = get(p.g); (p.pend.src ? P.src[p.pend.src].dv : P.dvS).push(r.ac - p.ac); if (p.pend.src) P.dvC.push(r.ac - p.ac); }
        if (!turned(p.req, r.req)) { r.pend = { src: null }; continue; }
        // first pipeline stage whose output turned (or crossed 1 yd/s) since the last tick
        const ORDER = ['decision', 'containment', 'coverage-orientation', 'open-to-ball', 'technique-intents', 'engagement', 'tackle-bond', 'spacing', 'snap-guard'];
        const first = ORDER.find(k => turned(p.st[k], r.st[k]) || stopped(p.st[k], r.st[k]));
        const NAME: Record<string, string> = { decision: 'behaviour / planner', containment: 'containment', 'coverage-orientation': 'decide (orientation)', 'open-to-ball': 'decide (open-to-ball)',
          'technique-intents': 'contact technique (dive/lunge)', engagement: 'engagement', 'tackle-bond': 'tackle bond', spacing: 'spacing', 'snap-guard': 'snap guard' };
        let src = r.mode !== p.mode ? 'mode switch' : first ? NAME[first] : 'unattributed';
        // inside the behaviour: a new technique, a new goal (objective point moved > 1 yd), or the same goal re-steered
        if (src === 'behaviour / planner') src = p.lab !== r.lab ? 'behaviour: technique change'
          : p.goal && r.goal && Math.hypot(p.goal.x - r.goal.x, p.goal.y - r.goal.y) > 1 ? 'behaviour: new goal'
          : p.goal && r.goal ? 'behaviour: same goal re-steered' : 'behaviour: no stated goal';
        const j = Math.max(0, H.length - 5), s0 = H[j].sv, s1 = r.sv;
        const cue = !!s0 && !!s1 && H[j].opp === r.opp && ((sp(s0) > 1 && sp(s1) > 1 && ang(s0, s1) > 20) || Math.abs(sp(s1) - sp(s0)) > 1);
        A.changes++; if (cue) A.cue++;
        const S = A.src[src] ??= { n: 0, rev: 0, cue: 0, dv: [] }; S.n++; if (cue) S.cue++;
        r.pend = { src }; r.change = { before: p.req, t: sim.t, src, g: r.g };
        // reversal check for earlier changes still within 0.3 s
        (r as any).checked = true;
      }
      // reversals: a change is reversed if a later request returns within 20 deg of the request before it, within 0.3 s
      for (const H of hist.values()) {
        const r = H[H.length - 1];
        for (const q of H.slice(0, -1)) {
          if (!q.change || q.change.done || sim.t - q.change.t > 0.3 + 1e-9) continue;
          if (sp(r.req) > 1 && ang(q.change.before, r.req) <= 20) { q.change.done = true; const A = get(q.change.g); A.reversed++; A.src[q.change.src].rev++; }
        }
      }
    };
    return sim.run();
  } } });
}
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
console.log(`dither audit (${games} league games from ${first}); per controller: moving s | re-aims > 20 deg /s | reversed within 0.3 s | after a new cue | next-tick speed change after a re-aim / steady`);
const all: { g: string; src: string; n: number; rev: number; lost: number }[] = [];
for (const [g, A] of Object.entries(acc).sort((a, b) => b[1].time - a[1].time)) {
  if (A.time < 5) continue;
  console.log(`${g.padEnd(11)} ${A.time.toFixed(0).padStart(6)} | ${(A.changes / A.time).toFixed(2)} | ${pc(A.reversed, A.changes)} | ${pc(A.cue, A.changes)} | ${mean(A.dvC).toFixed(3)} / ${mean(A.dvS).toFixed(3)}`);
  for (const [src, S] of Object.entries(A.src).sort((a, b) => b[1].n - a[1].n)) {
    const lost = S.dv.reduce((x, v) => x + Math.min(0, v - mean(A.dvS)), 0);
    all.push({ g, src, n: S.n, rev: S.rev, lost });
    console.log(`     ${src.padEnd(20)} ${pc(S.n, A.changes).padStart(4)} of re-aims (${(S.n / A.time).toFixed(2)}/s) | reversed ${pc(S.rev, S.n)} | after a cue ${pc(S.cue, S.n)} | next tick ${mean(S.dv).toFixed(3)}`);
  }
}
const totRev = all.reduce((x, r) => x + r.rev, 0), totLost = all.reduce((x, r) => x + r.lost, 0);
console.log('\nranked dither sources (share of all reversed re-aims; share of speed lost against steady ticks):');
for (const r of all.sort((a, b) => b.rev - a.rev).slice(0, 15))
  console.log(`  ${(r.g + ' / ' + r.src).padEnd(36)} reversed ${pc(r.rev, totRev).padStart(4)} | speed lost ${pc(r.lost, totLost).padStart(4)} | n ${r.n}`);
