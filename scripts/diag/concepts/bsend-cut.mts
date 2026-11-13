// Probe (Defense, report only): zone runs of a fixed run set: where the carrier crosses the line relative to the ball's
// snap y (play side + / backside -, a cutback = crossing on the backside), yards, and whether the backside end (as in
// bsend-exec.mts) makes the first carrier contact. One JSON line per play. Seeds as arguments.
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const ZONE = new Set(['insideZone', 'outsideZone', 'wideZone', 'splitZone', 'stretch']);
const seeds = process.argv.slice(2).map(Number);
for (const seed of seeds) { let i = 0; for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  const id = `s${seed}-${i++}`; if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!ZONE.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const call = st.offCall; let end: any = null, side = 0, cross: number | null = null; const y0 = sim.ballY; const tick0 = sim.tick.bind(sim);
  sim.tick = () => {
    if (!end) { const dir = sim.attackDir(sim.offense[0].team); side = (call.run.direction === 'strong' ? 1 : -1) * sim.offAlign.strongSign;
      end = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * dir) < 1.5 && d.behavior?.kind === 'rush' && Math.sign(d.pos.y - sim.ballY) === -side)
        .sort((p: any, q: any) => Math.abs(q.pos.y - sim.ballY) - Math.abs(p.pos.y - sim.ballY))[0] ?? null; }
    tick0();
    const c = sim.carrier, dir = sim.attackDir(sim.offense[0].team);
    if (cross === null && c && c !== sim.qb && (c.pos.x - sim.los) * dir > 0) cross = +((c.pos.y - y0) * side).toFixed(2);
  };
  const r = sim.run();
  const cc = sim.events.find((e: any) => e.type === 'carrier_contact' && sim.agents[e.a] !== sim.qb);
  console.log(JSON.stringify({ id, scheme: call.run.scheme, yards: r.yards, cross, firstHitter: cc ? sim.agents[cc.b]?.slot : null, endHit: !!(cc && end && sim.agents[cc.b] === end), endTackle: sim.events.some((e: any) => (e.type === 'tackle' || e.type === 'tackle_wrap') && end && sim.agents[e.a] === end) }));
} }
