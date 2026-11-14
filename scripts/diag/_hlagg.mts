// HANDS_LEVER IZ aggregate (Run Game, not committed): over every fresh-set IZ run, from the handoff: carrier depth at
// +1.0/+1.5 s; OL blockers' |facing off the line to their man| (deg) sampled +0.25..+1.5 s; the time and depth of the
// first defender within 1.0 yd of the carrier. One JSON line per play to stdout.
import { readdirSync, readFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const placebo = process.env.REF_PLACEBO ? (() => { const [slot, sign] = process.env.REF_PLACEBO!.split(':'); return { slot, d: (sign === '-1' ? -1 : 1) * Number(process.env.REF_PLACEBO_SIZE ?? 1e-3) }; })() : null;
const wrap = (r: number) => Math.atan2(Math.sin(r), Math.cos(r));
for (const f of readdirSync('out/matched-restage').filter(f => /^seed\d+-run\.json$/.test(f))) {
  const seed = Number(f.match(/\d+/)![0]); let i = 0;
  for (const p of JSON.parse(readFileSync(`out/matched-restage/${f}`, 'utf8'))) {
    const id = `s${seed}-${i++}`, st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== 'insideZone') continue;
    const sim: any = new PlaySim(st);
    let ho = -1, done = false; const turns: number[] = []; const row: any = { id };
    const t0 = sim.tick.bind(sim);
    sim.tick = () => { t0();
      if (placebo && !done) { done = true; const a = sim.agents.find((x: any) => placebo.slot === 'LB' ? x.team !== sim.offense[0].team && /LB/.test(x.slot) : x.slot === placebo.slot); if (a) a.body.pos.y += placebo.d; }
      if (ho < 0 && sim.events.some((e: any) => e.type === 'handoff')) ho = sim.t;
      if (ho < 0) return; const dt = sim.t - ho, c = sim.carrier; if (!c) return;
      for (const k of [1.0, 1.5]) if (Math.abs(dt - k) < sim.dt / 2) row[`x${k}`] = +(c.pos.x - sim.los).toFixed(2);
      if (dt > 0.2 && dt < 1.55 && Math.round(dt / 0.25) * 0.25 - dt < sim.dt / 2 && Math.round(dt / 0.25) * 0.25 - dt >= -sim.dt / 2)
        for (const e of sim.engagements) if (/^(LT|LG|C|RG|RT)$/.test(e.blocker.slot)) {
          const to = Math.atan2(e.defender.pos.y - e.blocker.pos.y, e.defender.pos.x - e.blocker.pos.x);
          turns.push(Math.abs(wrap(e.blocker.body.facing - to)) * 180 / Math.PI);
        }
      if (row.contactT === undefined && sim.defense.some((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 1.0)) {
        row.contactT = +dt.toFixed(2); row.contactX = +(c.pos.x - sim.los).toFixed(2); }
    };
    const r = sim.run(); row.yards = +r.yards.toFixed(2); row.turns = turns.map(t => Math.round(t));
    console.log(JSON.stringify(row));
  }
}
