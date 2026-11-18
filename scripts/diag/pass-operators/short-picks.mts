// Interceptions in whole games, for the QB lane and DEF_CATCH (Integration, 2026-11-18). In-sim, with the QB lane's window
// probe (int-margin.ts's hook: marginProbe on the QB, his window's rows at the last evaluation before the release). Per
// interception: the call (coverage, concept), air yards, time of flight; the picker (slot, behavior kind, technique tags at
// the release and at the pick); at the release, his distance off the throwing lane (the QB to the pick spot) and how far
// along it, his facing against his bearing to the QB (eyes on the QB within 60 deg), his speed; how far he moved to the
// pick against the most his body could cover in that time from his speed toward the spot (vmax, tau: his profile); the
// QB window's row for him (m: believed margin in s, negative = there first; first; iPath / iJump / iContest; blind;
// facingQB; role path) or none (the window gave him nothing). Verdict: 'reach beyond his body' (moved more than his
// sprint allows: physics), 'in the lane, eyes on the QB' (within his reach of the lane, facing the QB at the release: a
// throw at a seen defender), else 'broke on it'. Also the ball's miss from the QB's aim (the pick spot against the aim), and
// the picker's distance to the aim at the release and at the pick (the QB lane's errant-ball split).
// usage: DEF_CATCH=1 BALL_SIGHT=1 READ_WINDOW=1 node --import tsx scripts/diag/pass-operators/short-picks.mts --seed 101 --out rows.json
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = arg('--out', 'sp.json');
const rows: any[] = []; let throws = 0, playNo = 0;
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  playNo++; const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let rel: any = null;
  const tick = sim.tick.bind(sim); sim.tick = () => { const b: any = sim.qb.behavior; if (b?.kind === 'qb-pass') b.marginProbe = true; tick(); };
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
    if (p === sim.qb && !rel && !away && intended) {
      throws++;
      rel = { t: sim.t, aim: { x: intended.x, y: intended.y }, throwRec: (p.behavior as any)?.throwRec ? { P: +(p.behavior as any).throwRec.P.toFixed(3), intRisk: +(p.behavior as any).throwRec.intRisk.toFixed(3) } : null, qb: { ...sim.qb.pos }, target: target?.slot ?? null, flightPlan: arrivalT - sim.t, margins: (p.behavior as any)?.marginLast ?? null,
        defs: new Map(sim.defense.map((d: any) => [d, { pos: { ...d.pos }, vel: { ...d.vel }, facing: d.body.facing, kind: d.behavior?.kind ?? null, tags: [...(d.tags ?? [])] }])) };
    }
    return tb(p, target, v0, intended, arrivalT, away, ...rest);
  };
  const res: any = orig.apply(this);
  const ie = sim.events.find((e: any) => e.type === 'interception');
  if (rel && ie) {
    const D = sim.defense.find((d: any) => d.idx === ie.a); const s0: any = D && rel.defs.get(D);
    if (D && s0) {
      const dir = sim.attackDir(sim.qb.team), spot = ie.pos ?? D.pos, q = rel.qb;
      const lx = spot.x - q.x, ly = spot.y - q.y, L = Math.hypot(lx, ly) || 1;
      const along = ((s0.pos.x - q.x) * lx + (s0.pos.y - q.y) * ly) / (L * L), off = Math.abs((s0.pos.x - q.x) * ly - (s0.pos.y - q.y) * lx) / L;
      const toQB = Math.atan2(q.y - s0.pos.y, q.x - s0.pos.x), eyes = Math.abs(Math.atan2(Math.sin(s0.facing - toQB), Math.cos(s0.facing - toQB))) * 180 / Math.PI;
      const flight = ie.t - rel.t, mx = spot.x - s0.pos.x, my = spot.y - s0.pos.y, need = Math.hypot(mx, my);
      const v0 = need > 0 ? Math.max(0, (s0.vel.x * mx + s0.vel.y * my) / need) : 0, { vmax, tau } = D.profile;
      const maxRun = vmax * flight - (vmax - v0) * tau * (1 - Math.exp(-flight / tau)), reach = D.profile.reach + 0.3;
      const m = (rel.margins ?? []).find((r: any) => r.slot === D.slot) ?? null;
      // The QB lane's split (2026-11-18): an errant ball onto a defender near the aim, or a break to the aim.
      const miss = Math.hypot(spot.x - rel.aim.x, spot.y - rel.aim.y), toAim0 = Math.hypot(s0.pos.x - rel.aim.x, s0.pos.y - rel.aim.y), toAimPick = Math.hypot(D.pos.x - rel.aim.x, D.pos.y - rel.aim.y);
      const verdict = maxRun + reach < need - 0.3 ? 'reach beyond his body' : off <= reach + 0.5 && along > 0 && along < 1.1 && eyes <= 60 ? 'in the lane, eyes on the QB' : 'broke on it';
      rows.push({ seed, playNo, releaseT: +rel.t.toFixed(2), throwRec: rel.throwRec, cov: sim.defCall?.coverage?.id ?? null, concept: sim.offCall?.pass?.id ?? null, target: rel.target, air: +((spot.x - sim.los) * dir).toFixed(1), flight: +flight.toFixed(2),
        slot: D.slot, pos: D.player.position, kind0: s0.kind, tags0: s0.tags, tagsPick: [...(D.tags ?? [])], off: +off.toFixed(2), along: +along.toFixed(2), eyes: Math.round(eyes),
        speed0: +Math.hypot(s0.vel.x, s0.vel.y).toFixed(2), miss: +miss.toFixed(2), toAim0: +toAim0.toFixed(2), toAimPick: +toAimPick.toFixed(2), need: +need.toFixed(2), maxRun: +maxRun.toFixed(2), reach: +reach.toFixed(2), window: m, verdict });
    }
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed });
writeFileSync(out, JSON.stringify({ throws, rows })); console.log('throws', throws, 'picks', rows.length);
