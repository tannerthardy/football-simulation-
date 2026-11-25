// Hand check of #936's "hook walls the slant" (slant_flat vs cover3): per play, the hook candidates the operator picks at
// the snap, and every linebacker or safety's distance to the slant's throwing line (passer to the slant receiver where he
// is at the label time + 0.4 s), at the cap label (0.85 s) and at the release. Observer only.
import { PlaySim } from '../wt951/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt951/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt951/scripts/diag/command-trace.js';
const r1 = (x: number) => Math.round(x * 10) / 10;
const segDist = (p: any, a: any, b: any) => { const ux = b.x - a.x, uy = b.y - a.y, L2 = ux * ux + uy * uy || 1; const t = Math.max(0, Math.min(1, ((p.x - a.x) * ux + (p.y - a.y) * uy) / L2)); return { d: Math.hypot(p.x - (a.x + ux * t), p.y - (a.y + uy * t)), t }; };
for (let seed = 1; seed <= 10; seed++) {
  const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage: 'cover3', seed, roster: 3, formation: 'gun_doubles_11', flip: false });
  setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
  const sim: any = new PlaySim(setup); let rel: number | null = null; const snap: Record<number, any[]> = {};
  const tb = sim.throwBall.bind(sim); sim.throwBall = (q: any, t: any, ...r: any[]) => { if (rel === null) rel = sim.t; return tb(q, t, ...r); };
  const t0 = sim.tick.bind(sim); sim.tick = () => { t0(); (snap[Math.round(sim.t * 20)] = sim.agents.map((a: any) => ({ slot: a.slot, x: a.pos.x, y: a.pos.y }))); if (sim.t > 3.2) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  const S1slot = sim.offAlign.numbering['S1'];
  const at = (t: number) => snap[Math.round(t * 20)] ?? snap[Math.round(Math.min(t, 3.2) * 20)];
  const row = (t: number, tag: string) => { const A = at(t), A2 = at(Math.min(t + 0.4, 3.2)); if (!A || !A2) return ''; const qb = A.find((a: any) => a.slot === 'QB'), sl = A2.find((a: any) => a.slot === S1slot);
    const men = A.filter((a: any) => /^(LB|MLB|OLB|SS|FS|NB|S_|ILB|WLB|SLB|MIKE|WILL|SAM)/.test(a.slot) || /LB|S$/.test(a.slot)).map((m: any) => { const s = segDist(m, qb, sl); return `${m.slot}:${r1(s.d)}@${r1(s.t)}`; });
    return `${tag} t=${r1(t)} slant catch(${r1(sl.x)},${r1(sl.y)}) line dist ${men.join(' ')}`; };
  const s0 = at(0.05), los = sim.los, side = (sim.offAlign.strongSign >= 0 ? 1 : -1);
  const hooks = s0.filter((a: any) => sim.defense.some((d: any) => d.slot === a.slot) && !/^(DE|DT|NT)/.test(a.slot)).map((a: any) => ({ slot: a.slot, dep: r1(a.x - los), out: r1((a.y - sim.ballY) * side) })).filter((h: any) => h.dep >= 2.5 && h.dep <= 7.5 && h.out >= -1 && h.out <= 3.5);
  console.log(`seed ${seed} release ${rel !== null ? r1(rel) : '-'} | operator hooks at snap ${JSON.stringify(hooks)}\n   ${row(0.85, 'cap')}\n   ${row(rel ?? 2, 'release')}`);
}
