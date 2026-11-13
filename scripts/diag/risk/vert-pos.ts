// Where the corner is on our gos against Cover 3 / Cover 4 (sim only; the twin of vert_sep_nfl.py --pos). Non-PA pass
// calls. A go or seam runner's corner = the defensive back (CB / S) nearest him at the snap. At 1.5 / 2.0 / 2.85 s with the ball
// still in the QB's hands: depth over him (+ = deeper), lateral (+ = inside), distance; on top (> 1 yd deeper) / hip to
// hip / trailing; and the corner's zone and the technique his zone command named (deep-over, deep-open-carry,
// deep-turn-run, deep-drive, ...), so the binding branch can be read.
// No. 1 only (the widest on his side at the snap) unless VP_ALL=1, as vert_sep_nfl.py --pos. Man carries: his request,
// achieved and requested upfield speed, body facing off travel, lateral distance (the twin columns of the NFL operator).
// usage: npx tsx scripts/diag/risk/vert-pos.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ZoneCoverage, ManCoverage } from '../../../src/sim/behaviors/defense.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
import { FIELD_WIDTH } from '../../../src/core/field.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const Z: any = ZoneCoverage.prototype, up0 = Z.update, P: any = PlaySim.prototype, tick0 = P.tick;
const last = new WeakMap<any, string>();
Z.update = function (a: any, sim: any) { const c = up0.call(this, a, sim); last.set(a, facingTechnique(c)?.label ?? 'other'); return c; };
// MAN_REQ: a man carry's request: its label, the requested speed upfield, and his top speed (sim only).
const M: any = ManCoverage.prototype, mu0 = M.update, req = new WeakMap<any, any>();
M.update = function (a: any, sim: any) { const c = mu0.call(this, a, sim); last.set(a, 'man:' + (facingTechnique(c)?.label ?? 'other') + (this.opts?.overTop ? '+top' : '') + (this.opts?.protectDepth ? '+deep' : '')); req.set(a, { vx: c?.vel?.x ?? 0, vmax: a.profile.vmax, hips: !!this.hipsOpen, cf: c?.facing === undefined ? null : Math.abs(Math.atan2(Math.sin(c.facing - Math.atan2(c.vel.y, c.vel.x)), Math.cos(c.facing - Math.atan2(c.vel.y, c.vel.x)))) * 57.3, bf: Math.abs(Math.atan2(Math.sin(a.facing - Math.atan2(a.vel.y, a.vel.x)), Math.cos(a.facing - Math.atan2(a.vel.y, a.vel.x)))) * 57.3, tags: [...(a.tags ?? [])].join(',') }); return c; };
const shell = (id: string) => { const t = id.replace(/[^a-z0-9]/g, ''); return t.includes('cover3') ? 'cover3' : t.includes('cover4') || t.includes('quarters') ? 'cover4' : null; };
const rows: any[] = [];
P.tick = function () {
  if (this.__vp === undefined) {
    const sh = shell(String(this.defCall?.coverage?.id ?? ''));
    this.__vp = sh && this.offCall?.kind === 'pass' && !String(this.offCall?.pass?.id ?? '').startsWith('pa_') ? { sh, call: String(this.defCall?.coverage?.id ?? ''), pairs: [] as any[], marks: [1.5, 2.0, 2.85] } : null;
    if (this.__vp) for (const o of this.offense) {
      const id = o.behavior?.route?.id ?? o.behavior?.fallback?.route?.id;
      if (id !== 'go' && id !== 'seam') continue;
      const dbs = this.defense.filter((d: any) => ['CB', 'S'].includes(d.player?.position)); if (!dbs.length) continue;
      const c = dbs.reduce((b: any, d: any) => Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y) < Math.hypot(b.pos.x - o.pos.x, b.pos.y - o.pos.y) ? d : b);
      if (Math.hypot(c.pos.x - o.pos.x, c.pos.y - o.pos.y) > 15) continue;
      // No. 1: the widest offensive player on his side of the offense's centre at the snap.
      const cy = this.offense.reduce((t: number, p: any) => t + p.pos.y, 0) / this.offense.length, side = Math.sign(o.pos.y - cy) || 1;
      const one = this.offense.every((p: any) => (p.pos.y - cy) * side <= 0 || Math.abs(p.pos.y - cy) <= Math.abs(o.pos.y - cy) + 1e-6);
      if (!one && !process.env.VP_ALL) continue;
      this.__vp.pairs.push({ o, c, row: {} as any, zone: (c.behavior as any)?.zone ?? c.behavior?.kind });
    }
  }
  const r = tick0.call(this), V = this.__vp;
  if (V && V.marks.length && this.t >= V.marks[0] - 1e-9) {
    const lab = String(V.marks.shift());
    if (this.ball.kind === 'held' && this.ball.carrier === this.qb) {
      const dir = this.attackDir(this.offense[0].team), mid = FIELD_WIDTH / 2;
      for (const p of V.pairs) p.row[lab] = { over: (p.c.pos.x - p.o.pos.x) * dir, inside: Math.abs(p.o.pos.y - mid) - Math.abs(p.c.pos.y - mid),
        dist: Math.hypot(p.c.pos.x - p.o.pos.x, p.c.pos.y - p.o.pos.y), cvx: p.c.vel.x * dir, ovx: p.o.vel.x * dir, rq: req.get(p.c) ? { ...req.get(p.c), vx: req.get(p.c).vx * dir } : undefined, cvmax: p.c.profile.vmax, ovmax: p.o.profile.vmax, tech: last.get(p.c) ?? (p.c.behavior?.kind ?? '?'), depth: (p.o.pos.x - this.los) * dir };
    }
    if (!V.marks.length) { for (const p of V.pairs) rows.push({ sh: V.sh, call: V.call, zone: p.zone, row: p.row }); this.__vp = null; }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { if (v.length < 5) return '-'; const x = [...v].sort((a, b) => a - b); return [.25, .5, .75].map(f => x[Math.floor(f * (x.length - 1))].toFixed(1)).join('/'); };
const cnt = (v: string[]) => { const m = new Map<string, number>(); for (const k of v) m.set(k, (m.get(k) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${k} ${n}`).join(', '); };
for (const sh of ['cover3', 'cover4']) {
  const V = rows.filter(r => r.sh === sh);
  console.log(`== sim seed ${seed} ${sh}: GO runner vs his corner (DB nearest him at the snap), n ${V.length} | corner zones ${cnt(V.map(r => String(r.zone)))}`);
  for (const lab of ['1.5', '2', '2.85']) { // '2' is the 2.0 s mark
    const W = V.map(r => r.row[lab]).filter(Boolean);
    if (W.length < 5) continue;
    console.log(`   ${lab.padStart(4)} s n ${W.length} | runner depth ${q(W.map(w => w.depth))} | over him ${q(W.map(w => w.over))} | inside ${q(W.map(w => w.inside))} | |lateral| ${q(W.map(w => Math.sqrt(Math.max(0, w.dist ** 2 - w.over ** 2))))} | distance ${q(W.map(w => w.dist))} | on top ${(100 * W.filter(w => w.over > 1).length / W.length).toFixed(0)}% hip ${(100 * W.filter(w => Math.abs(w.over) <= 1).length / W.length).toFixed(0)}% trailing ${(100 * W.filter(w => w.over < -1).length / W.length).toFixed(0)}% | technique ${cnt(W.map(w => w.tech))}`);
  }
}

// By call at 2.85 s: plain cover3 / cover4 against each match call, the corner's technique and on-top share.
for (const sh of ['cover3', 'cover4']) {
  const V = rows.filter(r => r.sh === sh && r.row['2.85']);
  const calls = [...new Set(V.map(r => r.call))].sort();
  console.log(`== sim seed ${seed} ${sh} by call at 2.85 s`);
  for (const c of calls) {
    const W = V.filter(r => r.call === c).map(r => ({ ...r.row['2.85'], zone: r.zone, s15: r.row['1.5']?.cvx, q15: r.row['1.5']?.rq, q20: r.row['2']?.rq, t15: r.row['1.5']?.tech, s20: r.row['2']?.cvx, o15: r.row['1.5']?.ovx, o20: r.row['2']?.ovx }));
    if (W.length < 3) continue;
    const R = W.filter(w => w.rq && String(w.tech).startsWith('man'));
    if (R.length >= 3) console.log(`      man carries n ${R.length}: his speed upfield ${q(R.map(w => w.cvx))} vs runner ${q(R.map(w => w.ovx))} | his speed at 1.5/2.0 s ${q(R.map(w => w.s15 ?? 0))} , ${q(R.map(w => w.s20 ?? 0))} vs runner ${q(R.map(w => w.o15 ?? 0))} , ${q(R.map(w => w.o20 ?? 0))} | requested upfield at 1.5 / 2.0 / 2.85 s ${q(R.filter(w => w.q15).map(w => w.q15.vx))} , ${q(R.filter(w => w.q20).map(w => w.q20.vx))} , ${q(R.map(w => w.rq.vx * 1))} | at 1.5 s body facing off travel ${q(R.filter(w => w.q15).map(w => w.q15.bf))} deg, requested facing off requested travel ${q(R.filter(w => w.q15 && w.q15.cf !== null).map(w => w.q15.cf))} | label at 1.5 s ${cnt(R.map(w => String(w.t15 ?? '-')))} | his top speed ${q(R.map(w => w.cvmax))} vs runner ${q(R.map(w => w.ovmax))} | over ${q(R.map(w => w.over))} | |lateral| ${q(R.map(w => Math.sqrt(Math.max(0, w.dist ** 2 - w.over ** 2))))} | hips open ${(100 * R.filter(w => w.rq.hips).length / R.length).toFixed(0)}% | body facing off travel ${q(R.map(w => w.rq.bf))} deg | requested facing off requested travel ${q(R.filter(w => w.rq.cf !== null).map(w => w.rq.cf))} (set ${R.filter(w => w.rq.cf !== null).length}/${R.length}) | tags ${cnt(R.flatMap(w => String(w.rq.tags).split(',').filter(Boolean)))}`);
    console.log(`   ${c.padEnd(18)} n ${String(W.length).padStart(3)} | corner zones ${cnt(W.map(w => String(w.zone)))} | technique ${cnt(W.map(w => w.tech))} | on top ${(100 * W.filter(w => w.over > 1).length / W.length).toFixed(0)}% | distance p50 ${q(W.map(w => w.dist)).split('/')[1] ?? '-'}`);
  }
}
