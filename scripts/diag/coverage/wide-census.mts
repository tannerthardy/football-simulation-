// Wide-open receivers at the throw, attributed to the coverage paths in docs/reviews/2026-11-23-coverage-cards-engine.md
// section A (diagnosis only; read-only taps, no engine change).
//
// Wide open (the QB lane's definition): at the release, a receiver running a route whose nearest defender is 4+ yd away,
// with no defender within 2 yd of the QB-to-receiver segment, the QB set (speed under 2 yd/s). Every eligible receiver
// on every dropback throw is measured, thrown to or not; yards are the play's yards on throws to him.
//
// Ownership: a defender "relates" to a receiver on a tick when his job names him (CoverageDefender man/wall/crossWall/
// trap/read/rob), his man target is him (ManCoverage), or his zone technique selected him as its lane/carry/deep target
// that tick (ZoneCoverage.selectTarget). Spans tolerate 0.2 s gaps. Each wide-open receiver gets one label, first match:
//   owned        someone relates to him within 0.2 s of the throw (owned but beaten: man / zone)
//   P2           his last owner let him go through CUT_WALL's pass-under (man/wall on an under <= 7 yd -> zone)
//   P5           his last owner believed run when he let him go, or (never owned) on play action an underneath
//                seat on his side was in its run fit in the last second before the throw
//   P6           he is a back and his last owner moved to the other back (or, never owned, a defender related to the
//                other back)
//   P3           he is #1, let go by a corner while under 7 yd deep
//   P8           he is 13+ yd deep at the throw
//   P4           let go at 7-14 yd moving inside, vs a Cover 3 family call
//   P9           bunch/stack structure vs a Box/Area/Banjo call
//   P10          (never owned) a structure tag nothing consumes, or a back flexed out, or pre-snap motion
//   P11          (never owned) a man call with nobody on him
//   P7           under 4 yd deep (flat/stick races)
//   P1           let go by a zone/match defender, nobody picked him up (no hand-off)
//   P1n          never related to by anyone (zone)
// P12 (eyes) has no mechanical rule here.
//
// Rungs: RUNG=0 develop; RUNG=1 also needs the rung-1 flags in the environment; RUNG=2 adds the harness-only spot
// override (catalog mutated in-process: every zone call keeps its seats but plays them as spot drops with no rules;
// no structure or distribution checks; no pressures that bring their own coverage; man calls unchanged).
//   node --import tsx scripts/diag/coverage/wide-census.mts [seed] [games] [out.jsonl]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ZoneCoverage, believesRun } from '../../../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../../../src/sim/coverage/defender.js';
import { COVERAGES, COVERAGE_BY_ID } from '../../../src/playbook/coverages.js';
import { PRESSURES } from '../../../src/playbook/defense.js';
import { formationStructure } from '../../../src/playbook/structure.js';

const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const RUNG = Number(process.env.RUNG ?? 0);
const outPath = process.argv[4] ?? `out/diag/coverage/wide-census-r${RUNG}.jsonl`;

if (RUNG === 2) {
  const spotRoles = (roles: any) => Object.fromEntries(Object.entries(roles).map(([k, r]: any) =>
    [k, r?.kind === 'zone' && r.zone !== 'robber' && r.zone !== 'hole' ? { kind: 'zone', zone: r.zone, style: 'spot' } : r]));
  const spotUnder = (u: any[]) => u.map((s) => { const z = typeof s === 'string' ? s : s.zone; return z === 'robber' || z === 'hole' ? s : { zone: z, style: 'spot' }; });
  // Every call keeps its own seats and landmarks (variant structure stays: replacing a variant's roles with its
  // family base fails the playcaller's per-personnel install check), but plays them as spot drops with no rules and
  // no checks. Man calls are unchanged; hole/robber seats keep their match default (assign.ts).
  for (const c of COVERAGES as any[]) {
    if (!c.man) { c.roles = spotRoles(c.roles); c.underneath = spotUnder(c.underneath); }
    c.checks = {}; c.structureChecks = [];
  }
  for (let i = PRESSURES.length - 1; i >= 0; i--) if ((PRESSURES[i] as any).coverage) PRESSURES.splice(i, 1);
}

const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT', 'QB']);
const UNUSED_TAGS = ['quads', 'empty', 'bunch_weak', 'stack_weak', 'nub_weak', 'nub', 'two_back', 'iso_weak', 'reduced'];
const Z: any = ZoneCoverage.prototype, CD: any = CoverageDefender.prototype, P: any = PlaySim.prototype;
const sel0 = Z.selectTarget, pu0 = CD.passUnder, tick0 = P.tick, ev0 = P.event, res0 = P.buildResult;
let tickNo = 0;
const sel = new WeakMap<any, { n: number; r: any }>();
Z.selectTarget = function (a: any, target: any) { sel.set(a, { n: tickNo, r: target }); return sel0.call(this, a, target); };
const pu = new WeakMap<any, { n: number; r: string }[]>();
CD.passUnder = function (sim: any, d: any) {
  const res = pu0.call(this, sim, d);
  if ((d.t === 'man' || d.t === 'wall') && res.t === 'zone') { const L = pu.get(this) ?? []; L.push({ n: tickNo, r: d.r.slot }); pu.set(this, L); }
  return res;
};
const rows: any[] = [];
const plays: any[] = [];

function relOf(sim: any, d: any): [string | null, string] {
  const b: any = d.behavior;
  if (!b) return [null, ''];
  if (b instanceof CoverageDefender) {
    const m = /^(man|wall|crossWall|trap|read|rob):(.+)$/.exec(b.job);
    if (m) return [m[2], m[1] === 'man' ? 'match-man' : 'match-' + m[1]];
  } else if (b.kind === 'man' && b.target) return [b.target.slot, 'man'];
  const s = sel.get(d);
  const z = b instanceof CoverageDefender ? b.job.split(':')[1] : b.zone;
  return s && s.n === tickNo && s.r ? [s.r.slot, /deep|quarter|tampa_mid/.test(z ?? '') ? 'zone-deep' : 'zone-under'] : [null, ''];
}

P.tick = function () {
  tickNo++;
  const st = this.__wc ??= { log: [] as any[], done: false, motion: false };
  const r = tick0.call(this);
  if (!st.done && this.isPass && this.throwAt < 0 && this.phase === 'live') {
    const dir = this.attackDir('O');
    st.log.push({ t: this.t, n: tickNo,
      D: this.defense.map((d: any) => { const [rel, how] = relOf(this, d); return { s: d.slot, pos: d.player.position, rel, how, run: believesRun(this, d), zone: d.behavior?.zone ?? null,
        pu: (pu.get(d.behavior) ?? []).filter((e) => e.n === tickNo).map((e) => e.r) }; }),
      O: Object.fromEntries(this.offense.filter((o: any) => !OL.has(o.slot)).map((o: any) => [o.slot, { d: (o.pos.x - this.los) * dir, vy: o.vel.y, y: o.pos.y }])) });
  }
  return r;
};

function segDist(p: any, a: any, b: any): number {
  const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy;
  const t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L)) : 0;
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

P.event = function (type: string, a: any, b: any, note?: string) {
  if (type === 'throw' && b && this.__wc && !this.__wc.done && this.offCall?.pass?.family !== 'screen') {
    const st = this.__wc; st.done = true;
    const qb = this.qb, dir = this.attackDir('O');
    const cov = this.defCall?.coverage, pa = this.offCall?.pass?.family === 'playaction';
    const str = formationStructure(this.offAlign);
    const refOf: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.offAlign.numbering ?? {})) if (v) refOf[v as string] = k;
    const qbSpeed = Math.hypot(qb.vel.x, qb.vel.y);
    const play = { game: st.game, call: cov?.id, fam: cov?.family, man: !!cov?.man, label: this.defCall?.label, concept: this.offCall?.pass?.name,
      pa, tags: str.tags, key: str.key, qbSpeed, tt: this.t, target: b.slot, open: [] as string[], yards: null as number | null, rows: [] as any[] };
    for (const R of this.offense) {
      if (OL.has(R.slot)) continue;
      const kind = R.behavior?.kind;
      if (kind !== 'route' && kind !== 'track' && R !== b) continue;
      const near = Math.min(...this.defense.map((d: any) => Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y)));
      const lane = Math.min(...this.defense.map((d: any) => segDist(d.pos, qb.pos, R.pos)));
      const depth = (R.pos.x - this.los) * dir;
      const open = near >= 4 && lane >= 2 && qbSpeed < 2;
      const row: any = { slot: R.slot, ref: refOf[R.slot] ?? (this.offAlign.spots[R.slot]?.backfield ? 'B' : '?'), pos: R.player.position,
        back: R.player.position === 'RB' || R.player.position === 'FB', backfield: !!this.offAlign.spots[R.slot]?.backfield,
        depth, near, lane, open, thrown: R === b };
      if (open) Object.assign(row, attribute(this, st.log, R, row, play));
      play.rows.push(row);
      if (open) play.open.push(R.slot);
    }
    this.__wcPlay = play;
  }
  return ev0.call(this, type, a, b, note);
};

P.buildResult = function () {
  const res = res0.call(this);
  const p = this.__wcPlay;
  if (p && !p.closed) { p.closed = true; p.yards = res.yards; p.outcome = res.outcome; plays.push(p); for (const r of p.rows) if (r.open) rows.push({ ...r, call: p.call, fam: p.fam, game: p.game, yards: r.thrown ? res.yards : null }); }
  return res;
};

function attribute(sim: any, log: any[], R: any, row: any, play: any): any {
  const S = R.slot, tEnd = log.at(-1)?.t ?? 0;
  // per defender: spans relating to R
  const spans = new Map<string, { from: number; to: number; nFrom: number; nTo: number }[]>();
  for (const L of log) for (const d of L.D) if (d.rel === S) {
    const A = spans.get(d.s) ?? []; const last = A.at(-1);
    if (last && L.t - last.to <= 0.2) { last.to = L.t; last.nTo = L.n; } else A.push({ from: L.t, to: L.t, nFrom: L.n, nTo: L.n });
    spans.set(d.s, A);
  }
  const owners = [...spans].map(([s, A]) => ({ s, ...A.at(-1)! })).sort((x, y) => y.to - x.to);
  const dPos = (s: string) => log[0]?.D.find((d: any) => d.s === s)?.pos;
  const at = (t: number) => log.find((L) => L.t >= t - 1e-6) ?? log.at(-1);
  const nowOwners = owners.filter((o) => tEnd - o.to <= 0.2);
  const base: any = { owners: owners.map((o) => `${o.s}@${o.from.toFixed(2)}-${o.to.toFixed(2)}`).join(' ') };
  const otherBacks = sim.offense.filter((o: any) => o !== R && (o.player.position === 'RB' || o.player.position === 'FB')).map((o: any) => o.slot);
  if (nowOwners.length) {
    const lastL = log.at(-1), hows = nowOwners.map((o) => lastL.D.find((d: any) => d.s === o.s)?.how ?? (log as any).findLast((L: any) => L.D.some((d: any) => d.s === o.s && d.rel === S))?.D.find((d: any) => d.s === o.s)?.how);
    const rank = ['man', 'match-man', 'match-wall', 'match-crossWall', 'match-trap', 'match-read', 'match-rob', 'zone-under', 'zone-deep'];
    const how = hows.filter(Boolean).sort((a: string, b: string) => rank.indexOf(a) - rank.indexOf(b))[0] ?? '?';
    const dir = sim.attackDir('O');
    const ods = nowOwners.map((o) => { const d = sim.defense.find((x: any) => x.slot === o.s); return { s: o.s, dist: Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y), over: (d.pos.x - R.pos.x) * dir }; })
      .sort((p, q) => p.dist - q.dist);
    // over: the owner's depth beyond the receiver (> 1 on top, -1..1 level, < -1 trailing); rcvUp: the receiver's downfield speed.
    return { ...base, path: 'owned', sub: how, owner: ods[0].s, ownerDist: ods[0].dist, ownerOver: ods[0].over, rcvUp: R.vel.x * dir, route: R.behavior?.route?.id ?? null };
  }
  if (owners.length) {
    const o = owners[0], L = at(o.to), Lnext = log.find((x) => x.t > o.to + 0.01);
    const dRow = L?.D.find((d: any) => d.s === o.s), next = Lnext?.D.find((d: any) => d.s === o.s);
    const rD = L?.O[S];
    const near = (n: number) => Math.abs(n - o.nTo) <= 3;
    const puHit = log.some((x) => near(x.n) && x.D.some((d: any) => d.s === o.s && d.pu.includes(S)));
    const ctx = { ...base, owner: o.s, ownerPos: dPos(o.s), letGo: o.to, depthAtLetGo: rD?.d, nextRel: next?.rel ?? null };
    if (puHit) return { ...ctx, path: 'P2' };
    if (dRow?.run || next?.run) return { ...ctx, path: 'P5' };
    if (row.back && next?.rel && otherBacks.includes(next.rel)) return { ...ctx, path: 'P6' };
    if (/1$/.test(row.ref) && dPos(o.s) === 'CB' && (rD?.d ?? 99) < 7) return { ...ctx, path: 'P3' };
    if (row.depth >= 13) return { ...ctx, path: 'P8' };
    const inward = rD && Math.sign(rD.vy) === Math.sign(sim.ballY - rD.y) && Math.abs(rD.vy) > 1.5;
    if (rD && rD.d >= 7 && rD.d <= 14 && inward && play.fam === 'cover3') return { ...ctx, path: 'P4' };
    if (/box|area|banjo/.test(play.call ?? '') && play.tags.some((t: string) => /bunch|stack/.test(t))) return { ...ctx, path: 'P9' };
    if (row.depth < 4) return { ...ctx, path: 'P7' };
    return { ...ctx, path: 'P1' };
  }
  // never related to by anyone
  const side = Math.sign(R.pos.y - sim.ballY) || 1;
  if (play.pa && log.some((L) => L.t >= tEnd - 1 && L.D.some((d: any) => d.run && d.zone && !/deep|quarter/.test(d.zone)
    && /flat|curl|hook|seam/.test(d.zone) && (d.zone.endsWith('_w') ? -1 : 1) * sim.offAlign.strongSign === side))) return { ...base, path: 'P5' };
  if (row.back && log.some((L) => L.D.some((d: any) => otherBacks.includes(d.rel)))) return { ...base, path: 'P6' };
  if (row.depth >= 13) return { ...base, path: 'P8' };
  if (/box|area|banjo/.test(play.call ?? '') && play.tags.some((t: string) => /bunch|stack/.test(t))) return { ...base, path: 'P9' };
  if (play.tags.some((t: string) => UNUSED_TAGS.includes(t)) || (row.backfield === false && row.back) || sim.__motioned) return { ...base, path: 'P10' };
  if (play.man) return { ...base, path: 'P11' };
  if (row.depth < 4) return { ...base, path: 'P7' };
  return { ...base, path: 'P1n' };
}

const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let game = 0;
const t0 = P.tick;
P.tick = function () { if (!this.__wc) this.__wc = { log: [], done: false, game }; return t0.call(this); };
for (let g = 0; g < games; g++) { game = g; simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false }); console.error(`game ${g}: plays ${plays.length}, open ${rows.length}`); }

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, plays.map((p) => JSON.stringify(p)).join('\n') + '\n');
const set = plays.filter((p) => p.qbSpeed < 2);
const allYds = plays.reduce((s, p) => s + (p.yards ?? 0), 0);
const openThrown = rows.filter((r) => r.thrown);
console.log(`RUNG ${RUNG}, seed ${seed}, ${games} games: dropback throws ${plays.length} (QB set ${set.length}); wide-open receivers ${rows.length}`
  + ` (${(rows.length / Math.max(1, set.length)).toFixed(2)} per set throw); throws to a wide-open man ${openThrown.length}`
  + ` (${(100 * openThrown.length / plays.length).toFixed(0)}% of throws), yards ${openThrown.reduce((s, r) => s + r.yards, 0).toFixed(0)} of ${allYds.toFixed(0)}`);
const paths = ['owned', 'P1', 'P1n', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11'];
console.log('| path | wide-open | share | thrown | yards thrown | share of wide-open yards |\n|---|---|---|---|---|---|');
const openYds = openThrown.reduce((s, r) => s + r.yards, 0) || 1;
for (const k of paths) {
  const v = rows.filter((r) => r.path === k), th = v.filter((r) => r.thrown), y = th.reduce((s, r) => s + r.yards, 0);
  console.log(`| ${k}${k === 'owned' ? ` (${[...new Set(v.map((r) => r.sub))].map((h) => `${h} ${v.filter((r) => r.sub === h).length}`).join(', ')})` : ''} | ${v.length} | ${(100 * v.length / Math.max(1, rows.length)).toFixed(0)}% | ${th.length} | ${y.toFixed(0)} | ${(100 * y / openYds).toFixed(0)}% |`);
}
const fams = [...new Set(plays.map((p) => p.fam))];
console.log('\nper family: set throws, wide-open per set throw, top paths');
for (const f of fams) {
  const ps = set.filter((p) => p.fam === f), v = rows.filter((r) => r.fam === f);
  const cnt = new Map<string, number>(); for (const r of v) cnt.set(r.path, (cnt.get(r.path) ?? 0) + 1);
  console.log(`  ${f}: ${ps.length}, ${(v.length / Math.max(1, ps.length)).toFixed(2)} | ${[...cnt].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
}
