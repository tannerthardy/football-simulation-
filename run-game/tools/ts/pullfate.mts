/** Counter/power pullers: does each get within 1.2 yd (centers) of any defender before the carrier is 2 yd past the
 * LOS (or the play ends)? For those that don't: role at the snap and at the end, target at the end, where the puller
 * was when the carrier crossed (depth, lateral from his snap spot), distance to his target then, and the target's
 * state (engaged by whom / free / down). args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const tally: Record<string, number> = {}; const add = (k: string) => tally[k] = (tally[k] ?? 0) + 1;
for (const seed of process.argv.slice(2)) for (const [pi, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme;
  if (!['counter', 'power'].includes(sch) || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const dir = sim.attackDir('O');
  const pullers = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
  const st = new Map(pullers.map((o: any) => [o, { role0: o.behavior.plan.pullRole, tgt0: o.behavior.plan.target?.slot, y0: o.pos.y, touch: null as any, atCross: null as any }]));
  let crossT: number | null = null;
  while (sim.phase === 'live' && sim.t < 5) {
    sim.tick();
    const c = sim.carrier;
    for (const [o, s] of st as any) {
      if (s.touch) continue;
      for (const d of sim.defense) if (Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y) < 1.2) { s.touch = { t: sim.t, who: d.slot }; break; }
    }
    if (c && c !== sim.qb && crossT === null && (c.pos.x - sim.los) * dir > 0) {
      crossT = sim.t;
      for (const [o, s] of st as any) {
        const b: any = o.behavior, tg = b.plan?.target;
        const eng = tg ? sim.engagements.find((e: any) => e.defender === tg) : null;
        s.atCross = { depth: (o.pos.x - sim.los) * dir, lat: o.pos.y - s.y0, role: b.plan?.pullRole ?? b.plan?.kind, tgt: tg?.slot, dist: tg ? Math.hypot(tg.pos.x - o.pos.x, tg.pos.y - o.pos.y) : null,
          tstate: !tg ? 'none' : tg.isDown?.(sim.t) ? 'down' : eng ? `engaged by ${eng.blocker.slot}` : 'free', cx: (c.pos.x - sim.los) * dir };
      }
    }
    if (crossT !== null && c && (c.pos.x - sim.los) * dir > 2) break;
  }
  for (const [o, s] of st as any) {
    const k = `${sch} ${s.role0}`;
    add(k); if (!s.touch) add(k + ' no touch'); else if (crossT !== null && s.touch.t > crossT) add(k + ' touch after cross');
    if (!s.touch) {
      const a = s.atCross;
      const why = !a ? 'carrier never crossed' : a.tstate;
      add(k + ' no touch: target ' + why.replace(/engaged by \w+/, 'engaged'));
      console.log(`s${seed}#${pi} ${sch} ${o.slot} ${s.role0}->${a?.role} tgt ${s.tgt0}->${a?.tgt} | at carrier crossing: depth ${a?.depth.toFixed(1)} lat ${a?.lat.toFixed(1)} dist to target ${a?.dist?.toFixed(1)} target ${a?.tstate}`);
    }
  }
}
console.log(JSON.stringify(tally, null, 0));
