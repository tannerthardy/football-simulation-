// MAN_BACK side effects (Integration, 2026-11-23, the six-seed card: interceptions +0.4 pts, rush yards per carry
// -0.1). Whole games (generated teams at strength 0.55, leagueSample per seed). Read-only tap on PlaySim.
// Per play: kind; ticks with a defender in MAN_BACK's branch (tag 'man-back') before and after a handoff; on run
// plays, every man defender on a backfield receiver: his depth at the handoff, his read, and his distance to the carrier. Per interception: the
// interceptor (slot, behavior kind and tags at the throw, his depth and distance to the target at the throw), the
// target (slot, position), and the QB's picture of the interceptor at the throw (seen vs true position, picture age).
// usage: [MAN_BACK=1] node --import tsx scripts/diag/flat-seat/man-back-probe.mts --seed 101 --out rows.jsonl
import { createWriteStream } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = createWriteStream(arg('--out', 'mb.jsonl'));
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this; let pre = 0, post = 0, handoffAt: number | null = null; const atHandoff: any[] = [];
  let throwState: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const ho = sim.events.find((e: any) => e.type === 'handoff' || e.type === 'pitch_catch');
    if (ho && handoffAt === null) {
      handoffAt = sim.t;
      for (const d of sim.defense) if (d.behavior?.kind === 'man' && sim.offAlign.spots[d.behavior.target?.slot]?.backfield) {
        const c = sim.carrier; atHandoff.push({ slot: d.slot, tagged: !!d.tags?.has('man-back'), read: d.recog?.read ?? null, depth: +(d.pos.x - sim.los).toFixed(2), dist: c ? +Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y).toFixed(2) : null });
      }
    }
    const n = sim.defense.filter((d: any) => d.tags?.has('man-back')).length;
    if (handoffAt === null) pre += n; else post += n;
    if (!throwState && sim.ball.kind === 'air') {
      throwState = { t: sim.t, target: sim.ball.target ?? null, defs: sim.defense.map((d: any) => {
        const q = sim.see(sim.qb, d);
        return { slot: d.slot, kind: d.behavior?.kind ?? null, tags: [...(d.tags ?? [])], depth: +(d.pos.x - sim.los).toFixed(2), pos: [+d.pos.x.toFixed(2), +d.pos.y.toFixed(2)],
          qbSeen: [+q.pos.x.toFixed(2), +q.pos.y.toFixed(2)], qbAge: q.age ?? null };
      }) };
    }
  };
  const res: any = orig.apply(this);
  const row: any = { seed, kind: sim.offCall.kind, pre, post, atHandoff, int: null };
  const by = sim.stats?.interceptedBy;
  if (by && throwState) {
    const d = sim.defense.find((x: any) => x.player.id === by), i = throwState.defs.find((x: any) => x.slot === d?.slot);
    const thr = sim.events.find((e: any) => e.type === 'throw'), tgt = thr?.b !== undefined ? sim.agents[thr.b] : null;
    row.int = { slot: d?.slot, at: i, target: tgt ? { slot: tgt.slot, pos: tgt.player.position } : null,
      distToTarget: tgt && i ? +Math.hypot(i.pos[0] - tgt.pos.x, i.pos[1] - tgt.pos.y).toFixed(2) : null };
  }
  out.write(JSON.stringify(row) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed });
out.end(); await new Promise<void>((r) => out.on('finish', () => r()));
