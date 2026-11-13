// Where the corner is on our gos against Cover 3 / Cover 4 (sim only; the twin of vert_sep_nfl.py --pos). Non-PA pass
// calls. A go or seam runner's corner = the defensive back (CB / S) nearest him at the snap. At 1.5 / 2.0 / 2.85 s with the ball
// still in the QB's hands: depth over him (+ = deeper), lateral (+ = inside), distance; on top (> 1 yd deeper) / hip to
// hip / trailing; and the corner's zone and the technique his zone command named (deep-over, deep-open-carry,
// deep-turn-run, deep-drive, ...), so the binding branch can be read.
// usage: npx tsx scripts/diag/risk/vert-pos.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ZoneCoverage } from '../../../src/sim/behaviors/defense.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
import { FIELD_WIDTH } from '../../../src/core/field.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const Z: any = ZoneCoverage.prototype, up0 = Z.update, P: any = PlaySim.prototype, tick0 = P.tick;
const last = new WeakMap<any, string>();
Z.update = function (a: any, sim: any) { const c = up0.call(this, a, sim); last.set(a, facingTechnique(c)?.label ?? 'other'); return c; };
const shell = (id: string) => { const t = id.replace(/[^a-z0-9]/g, ''); return t.includes('cover3') ? 'cover3' : t.includes('cover4') || t.includes('quarters') ? 'cover4' : null; };
const rows: any[] = [];
P.tick = function () {
  if (this.__vp === undefined) {
    const sh = shell(String(this.defCall?.coverage?.id ?? ''));
    this.__vp = sh && this.offCall?.kind === 'pass' && !String(this.offCall?.pass?.id ?? '').startsWith('pa_') ? { sh, pairs: [] as any[], marks: [1.5, 2.0, 2.85] } : null;
    if (this.__vp) for (const o of this.offense) {
      const id = o.behavior?.route?.id ?? o.behavior?.fallback?.route?.id;
      if (id !== 'go' && id !== 'seam') continue;
      const dbs = this.defense.filter((d: any) => ['CB', 'S'].includes(d.player?.position)); if (!dbs.length) continue;
      const c = dbs.reduce((b: any, d: any) => Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y) < Math.hypot(b.pos.x - o.pos.x, b.pos.y - o.pos.y) ? d : b);
      if (Math.hypot(c.pos.x - o.pos.x, c.pos.y - o.pos.y) > 15) continue;
      this.__vp.pairs.push({ o, c, row: {} as any, zone: (c.behavior as any)?.zone ?? c.behavior?.kind });
    }
  }
  const r = tick0.call(this), V = this.__vp;
  if (V && V.marks.length && this.t >= V.marks[0] - 1e-9) {
    const lab = String(V.marks.shift());
    if (this.ball.kind === 'held' && this.ball.carrier === this.qb) {
      const dir = this.attackDir(this.offense[0].team), mid = FIELD_WIDTH / 2;
      for (const p of V.pairs) p.row[lab] = { over: (p.c.pos.x - p.o.pos.x) * dir, inside: Math.abs(p.o.pos.y - mid) - Math.abs(p.c.pos.y - mid),
        dist: Math.hypot(p.c.pos.x - p.o.pos.x, p.c.pos.y - p.o.pos.y), tech: last.get(p.c) ?? (p.c.behavior?.kind ?? '?'), depth: (p.o.pos.x - this.los) * dir };
    }
    if (!V.marks.length) { for (const p of V.pairs) rows.push({ sh: V.sh, zone: p.zone, row: p.row }); this.__vp = null; }
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
    console.log(`   ${lab.padStart(4)} s n ${W.length} | runner depth ${q(W.map(w => w.depth))} | over him ${q(W.map(w => w.over))} | inside ${q(W.map(w => w.inside))} | distance ${q(W.map(w => w.dist))} | on top ${(100 * W.filter(w => w.over > 1).length / W.length).toFixed(0)}% hip ${(100 * W.filter(w => Math.abs(w.over) <= 1).length / W.length).toFixed(0)}% trailing ${(100 * W.filter(w => w.over < -1).length / W.length).toFixed(0)}% | technique ${cnt(W.map(w => w.tech))}`);
  }
}
