// Who is (and who should be) on the back's flat catch (sim only; the twin of flat_position.py's sample). Completions to
// a running back caught 4 yd or less past the line and 6+ yd outside the ball, by shell (quarters: cover4* / cover6* /
// split_quarters*; cover3: cover3* / cover9*; cover2: cover2 / tampa2). For the defender nearest the catch at the
// catch and for the call's flat-side underneath player (the rule-coverage defender on the catch side whose nominal
// zone is a flat / curl-flat / quarter apex): his slot, rule, nominal zone, every job he took (with time) from the
// snap, his technique label at -1.0 / -0.5 / 0 s, his position relative to the catcher (lateral + outside, depth +
// deeper) at -1.0 and 0 s, and the time the back's release first showed to his side (the back 2+ yd outside the
// ball with outward speed over 1.5 yd/s).
// usage: npx tsx scripts/diag/risk/flat-role.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const shell = (id: string) => { const t = id.replace(/[^a-z0-9]/g, ''); return t.startsWith('cover4') || t.startsWith('cover6') || t.startsWith('splitquarters') ? 'quarters' : t.startsWith('cover3') || t.startsWith('cover9') ? 'cover3' : t.startsWith('cover2') || t.startsWith('tampa2') ? 'cover2' : null; };
const P: any = PlaySim.prototype, t0 = P.tick, rows: any[] = [], ctrl: any[] = [];
const b0 = P.buildResult;
P.buildResult = function () { const res = b0.call(this); const S = this.__fr; if (S?.row) { S.row.yards = res.yards; S.row.turnover = res.turnover; } if (S?.ctrl) { S.ctrl.yards = res.yards; S.ctrl.caught = res.outcome !== 'incomplete' && !res.turnover; } return res; };
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  const sh = shell(String(this.defCall?.coverage?.id ?? '')); if (!sh) return r;
  const S = this.__fr ?? (this.__fr = { hist: [] as any[], done: false, show: new Map<number, number>() });
  if (S.done) return r;
  const dir = this.attackDir(this.offense[0].team);
  const snap = { t: this.t, def: this.defense.map((d: any) => ({ d, pos: { ...d.pos }, lab: facingTechnique(this.cmds?.[d.idx] ?? {})?.label ?? '-' })), off: this.offense.map((o: any) => ({ o, pos: { ...o.pos } })) };
  S.hist.push(snap); if (S.hist.length > 25) S.hist.shift();
  for (const o of this.offense) if (o.player?.position === 'RB') {
    const out = o.pos.y - this.ballY, s = Math.sign(out) || 1;
    if (!S.show.has(s) && Math.abs(out) >= 2 && s * o.vel.y > 1.5) S.show.set(s, this.t);
  }
  if (this.ball.kind === 'held' && this.ball.carrier && this.ball.carrier !== this.qb && this.offense.includes(this.ball.carrier) && S.thrown) {
    S.done = true; const R = this.ball.carrier;
    if (R.player?.position !== 'RB') return r;
    const depth = (R.pos.x - this.los) * dir, out = R.pos.y - this.ballY;
    if (depth > 4 || Math.abs(out) < 6) return r;
    const side = Math.sign(out), H = S.hist, h0 = H[H.length - 1], h10 = H[Math.max(0, H.length - 21)], h5 = H[Math.max(0, H.length - 11)];
    const relN = (h: any, d: any) => { const dp = h.def.find((x: any) => x.d === d).pos, rp = h.off.find((x: any) => x.o === R).pos; return { lat: (dp.y - rp.y) * side, depth: (dp.x - rp.x) * dir }; };
    const relTo = (h: any, d: any) => { const v = relN(h, d); return `lat ${v.lat.toFixed(1)} depth ${v.depth.toFixed(1)}`; };
    const lab = (h: any, d: any) => h.def.find((x: any) => x.d === d)?.lab ?? '-';
    const desc = (d: any) => { const b: any = d.behavior; return { slot: d.slot, rule: b?.rule ?? '-', zone: b?.zone ?? b?.kind ?? '-', jobs: (b?.history ?? []).map((j: any) => `${j.job}@${j.t.toFixed(1)}`).join(' > '),
      labs: [lab(h10, d), lab(h5, d), lab(h0, d)].join(' / '), at10: relTo(h10, d), at0: relTo(h0, d), dist: Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y),
      n10: relN(h10, d), n0: relN(h0, d), lab10: lab(h10, d), wallEnd: (() => { const hs = b?.history ?? []; const i = hs.findIndex((j: any) => j.job.startsWith('wall')); return i >= 0 && hs[i + 1] ? hs[i + 1].t : null; })(), walled: (b?.history ?? []).some((j: any) => j.job.startsWith('wall')) }; };
    const near = [...this.defense].sort((a: any, b: any) => Math.hypot(a.pos.x - R.pos.x, a.pos.y - R.pos.y) - Math.hypot(b.pos.x - R.pos.x, b.pos.y - R.pos.y))[0];
    const flatOwner = this.defense.find((d: any) => { const b: any = d.behavior, z = String(b?.zone ?? ''); return (z.includes('flat') || String(b?.rule ?? '').includes('apex')) && (z.endsWith('_s') ? this.offAlign.strongSign : -this.offAlign.strongSign) === side; });
    const row = { sh, call: this.defCall.coverage.id, t: this.t, show: S.show.get(side) ?? null, near: desc(near), owner: flatOwner ? desc(flatOwner) : null, same: near === flatOwner, catchDepth: depth, yards: NaN as number, turnover: false };
    rows.push(row); S.row = row;
  }
  if (this.ball.kind === 'air' && !S.thrown && sh === 'quarters') {
    const T = this.ball.target, rid = (T?.behavior as any)?.route?.id;
    const two = [this.offAlign.numbering.S2, this.offAlign.numbering.W2].filter(Boolean);
    if (T && two.includes(T.slot) && ['go', 'seam', 'seam_read', 'curl', 'post', 'corner'].includes(rid)) { S.ctrl = { route: rid, yards: NaN, caught: false }; ctrl.push(S.ctrl); }
  }
  if (this.ball.kind === 'air') S.thrown = true;
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
for (const sh of ['quarters', 'cover3', 'cover2']) {
  const V = rows.filter(r => r.sh === sh); if (!V.length) continue;
  const cnt = (v: string[]) => { const m = new Map<string, number>(); for (const k of v) m.set(k, (m.get(k) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} ${n}`).join(', '); };
  console.log(`== seed ${seed} ${sh}: back flat catches n ${V.length} | the nearest is the flat owner ${V.filter(r => r.same).length} | nearest by slot/zone: ${cnt(V.map(r => `${r.near.slot}:${r.near.zone}`))} | flat owner found ${V.filter(r => r.owner).length}`);
  const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
  const O = V.filter(r => r.owner), E = V.filter(r => r.t <= 3.0);
  console.log(`   catch time ${q(V.map(r => r.t))} s (by 3.0 s: ${E.length}) | back showed ${q(V.filter(r => r.show !== null).map(r => r.show))} s | nearest at the catch ${q(V.map(r => r.near.dist))} yd`);
  console.log(`   flat owner (n ${O.length}): distance at the catch ${q(O.map(r => r.owner.dist))} | at -1.0 s lat ${q(O.map(r => r.owner.n10.lat))} depth ${q(O.map(r => r.owner.n10.depth))} | at the catch lat ${q(O.map(r => r.owner.n0.lat))} depth ${q(O.map(r => r.owner.n0.depth))} | walled No. 2 ${O.filter(r => r.owner.walled).length}, left the wall ${q(O.filter(r => r.owner.wallEnd !== null).map(r => r.owner.wallEnd))} s (catch - that ${q(O.filter(r => r.owner.wallEnd !== null).map(r => r.t - r.owner.wallEnd))} s) | label at -1.0 s ${cnt(O.map(r => r.owner.lab10))}`);
  const Y = V.filter(r => Number.isFinite(r.yards));
  console.log(`   yards on these catches mean ${(Y.reduce((t, r) => t + r.yards, 0) / Math.max(1, Y.length)).toFixed(1)} p50 ${q(Y.map(r => r.yards)).split('/')[1] ?? '-'} | YAC (yards - catch depth) mean ${(Y.reduce((t, r) => t + r.yards - r.catchDepth, 0) / Math.max(1, Y.length)).toFixed(1)} p50 ${q(Y.map(r => r.yards - r.catchDepth)).split('/')[1] ?? '-'} | 10+ ${(100 * Y.filter(r => r.yards >= 10).length / Math.max(1, Y.length)).toFixed(0)}% 20+ ${(100 * Y.filter(r => r.yards >= 20).length / Math.max(1, Y.length)).toFixed(0)}%`);
  if (sh === 'quarters') { const Cn = ctrl.filter(r => Number.isFinite(r.yards)); console.log(`   control, quarters targets to No. 2 on go / seam / curl / post / corner: n ${Cn.length} | complete ${(100 * Cn.filter(r => r.caught).length / Math.max(1, Cn.length)).toFixed(0)}% | yards per target ${(Cn.reduce((t, r) => t + (r.caught ? r.yards : 0), 0) / Math.max(1, Cn.length)).toFixed(2)}`); }
  if (process.env.LIST) for (const r of V) console.log(`   ${r.call.padEnd(16)} catch ${r.t.toFixed(1)} s, back showed ${r.show === null ? '-' : r.show.toFixed(1)} s | NEAREST ${r.near.slot} ${r.near.rule}/${r.near.zone} ${r.near.dist.toFixed(1)} yd: -1.0 ${r.near.at10}, 0 ${r.near.at0} | ${r.near.labs} | jobs ${r.near.jobs}${r.owner && !r.same ? ` || OWNER ${r.owner.slot} ${r.owner.rule}/${r.owner.zone} ${r.owner.dist.toFixed(1)} yd: -1.0 ${r.owner.at10}, 0 ${r.owner.at0} | ${r.owner.labs} | jobs ${r.owner.jobs}` : ''}`);
}
