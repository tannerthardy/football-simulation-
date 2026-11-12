// press_stall.py's stall, measured inside games (league-sampled, record off) so the cause is visible: pass plays,
// each WR with a defender within 2.5 yd at the snap. Per stalled pair: his task (route id / behavior), the cause on
// stalled frames (corner's hands joint, bodies touching, a block engagement, or nothing on him), and his commanded
// speed vs achieved. usage: npx tsx scripts/diag/risk/press-stall-games.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const P: any = PlaySim.prototype, tick0 = P.tick;
const rows: any[] = [];
P.tick = function () {
  if (this.__ps === undefined) {
    this.__ps = null;
    if (this.qb && this.offense.some((o: any) => o.behavior?.constructor?.name === 'RouteRunner')) {
      const wr = this.offense.filter((o: any) => o.player?.position === 'WR');
      const pairs = [];
      for (const o of wr) { const d = this.defense.reduce((b: any, x: any) => Math.hypot(x.pos.x - o.pos.x, x.pos.y - o.pos.y) < Math.hypot(b.pos.x - o.pos.x, b.pos.y - o.pos.y) ? x : b);
        if (Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y) <= 2.5) { const sp = this.defAlign?.spots?.[d.slot];
          pairs.push({ o, d, f: [] as any[], kind: sp?.press && sp.manTarget === o.slot ? 'press-man' : this.defCall?.coverage?.man ? 'man-other' : 'zone' }); } }
      this.__ps = { pairs, t0: this.t };
    }
  }
  const r = tick0.call(this);
  const S = this.__ps;
  if (S && !S.done) {
    const t = this.t - S.t0;
    for (const p of S.pairs) { const { o, d } = p, dir = this.attackDir(o.team);
      const b = o.behavior;
      p.f.push({ t, behind: (d.pos.x - o.pos.x) * dir > 0, dist: Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y), sp: Math.hypot(o.vel.x, o.vel.y),
        joint: this.world.joints.some((j: any) => j.kind === 'hands' && ((j.a === d.body && j.b === o.body) || (j.a === o.body && j.b === d.body))),
        eng: !!o.engagement, touch: Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= o.profile.radius + d.profile.radius + 0.15,
        task: b?.route?.id ?? b?.constructor?.name ?? '?', R: `${(o.pos.x - this.los).toFixed(2)},${o.pos.y.toFixed(2)}`, D: `${(d.pos.x - this.los).toFixed(2)},${d.pos.y.toFixed(2)}`, dsp: Math.hypot(d.vel.x, d.vel.y).toFixed(1) }); }
    if (t > 1.2 || this.phase !== 'live') {
      S.done = true;
      for (const p of S.pairs) { const f = p.f, k2 = Math.round(0.2 / this.dt), st: any[] = [];
        for (let k = 0; k + k2 < f.length; k++) { const a = f[k];
          if (a.t >= 0.1 && a.t <= 0.9 && a.behind && a.dist <= 1.5 && a.sp < 4 && f[k + k2].sp <= a.sp + 0.1) st.push(a); }
        if (st.length && process.env.SHOW && (globalThis as any).__shown++ < 5) { console.log(`-- ${p.kind} WR ${p.o.slot} task ${f[10]?.task} vs ${p.d.slot} (${p.d.behavior?.constructor?.name}) tight ${JSON.stringify(p.o.behavior?.tightAtSnap?.map((x: any) => x.slot))}`);
          for (let k = 0; k < f.length; k += 3) { const a = f[k]; console.log(`   ${a.t.toFixed(2)} R ${a.R} v ${a.sp.toFixed(1)} | D ${a.D} dv ${a.dsp} | centres ${a.dist.toFixed(2)}${a.touch ? ' TOUCH' : ''}`); } }
        rows.push({ st, kind: p.kind, dk: p.d.behavior?.constructor?.name ?? '?', task: f[Math.min(f.length - 1, Math.round(0.5 / this.dt))]?.task ?? '?' }); }
    }
  }
  return r;
};
(globalThis as any).__shown = 0;
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const s = rows.filter(r => r.st.length), fr = s.flatMap(r => r.st);
const pct = (n: number, d: number) => (100 * n / Math.max(1, d)).toFixed(0) + '%';
const q = (v: number[]) => { const x = [...v].sort((a, b) => a - b); return x.length ? x[Math.floor((x.length - 1) / 2)].toFixed(2) : '-'; };
console.log(`PRESS_JAM=${process.env.PRESS_JAM ?? '0'} pressed WR pairs ${rows.length}, stalled ${pct(s.length, rows.length)}`);
const cls = (a: any) => a.joint ? 'hands' : a.eng ? 'engaged' : a.touch ? 'bodies' : 'nothing';
for (const k of ['hands', 'engaged', 'bodies', 'nothing']) { const v = fr.filter(a => cls(a) === k);
  console.log(`  ${k.padEnd(8)} ${pct(v.length, fr.length).padStart(4)} of stalled frames | speed p50 ${q(v.map(a => a.sp))} | t p50 ${q(v.map(a => a.t))} | centres ${q(v.map(a => a.dist))}`); }
for (const k of ['press-man', 'man-other', 'zone']) { const v = rows.filter(r => r.kind === k); console.log(`  ${k.padEnd(9)} pairs ${v.length}, stalled ${pct(v.filter(r => r.st.length).length, v.length)}`); }
{ const by: Record<string, [number, number]> = {}; for (const r of rows) { const e = (by[r.dk] ??= [0, 0]); e[0]++; if (r.st.length) e[1]++; }
  console.log('  by defender behavior (pairs, stalled): ' + Object.entries(by).sort((a, b) => b[1][0] - a[1][0]).map(([k, [n, m]]) => `${k} ${m}/${n}`).join(', ')); }
const by: Record<string, [number, number]> = {};
for (const r of rows) { const e = (by[r.task] ??= [0, 0]); e[0]++; if (r.st.length) e[1]++; }
console.log('  by task (pairs, stalled): ' + Object.entries(by).sort((a, b) => b[1][1] - a[1][1]).slice(0, 12).map(([k, [n, m]]) => `${k} ${m}/${n}`).join(', '));
