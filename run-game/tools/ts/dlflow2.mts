/** Doubled run DL (engagement with >=1 helper), zone runs, per tick: requested vs achieved lateral velocity signed to
 * the play side (+ = with the play), requested depth (toward own goal +), and which branch wrote his command.
 * Also the owner's and helpers' achieved play-side lateral. args: seeds... (out/matched-restage/seedN-run.json) */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { runContactObservers } = await import(root + '/src/sim/run-contact-observer.ts');
const { playSideSign } = await import(root + '/src/sim/behaviors/blocking.ts');
const acc: Record<string, Record<string, number>> = {};
const put = (bin: string, k: string, v = 1) => { const a = (acc[bin] ??= {}); a[k] = (a[k] ?? 0) + v; };
for (const seed of process.argv.slice(2)) for (const p of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme ?? '';
  if (!/zone/i.test(sch) || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const ps = playSideSign(sim, sim.offCall.run), dir = sim.attackDir('O');
  const last = new Map<any, number>();
  runContactObservers.set(sim, (e: any, kind: string, data: any) => {
    if (kind !== 'defender-movement' || !e.helpers?.length) return;
    const d = e.defender;
    const ry = data.command.vel.y * ps, prev = last.get(d); last.set(d, ry);
    const bin0 = `${sch} ${sim.t < 0.8 ? 'a <0.8' : sim.t < 1.5 ? 'b 0.8-1.5' : 'c 1.5+'}`;
    if (prev !== undefined && Math.abs(ry) > .3 && Math.abs(prev) > .3) { put(bin0, 'np'); if (Math.sign(ry) !== Math.sign(prev)) put(bin0, 'flip'); }
    if (Math.abs(ry) > .3) { put(bin0, 'nr'); if (ry > 0) put(bin0, 'with'); }
    const bin = `${sch} ${sim.t < 0.8 ? 'a <0.8' : sim.t < 1.5 ? 'b 0.8-1.5' : 'c 1.5+'}`;
    const mode = data.workOff ? 'shed' : data.declared ? 'declared' : data.reading ?? 'other';
    put(bin, 'n'); put(bin, 'mode ' + mode);
    put(bin, 'req lat', data.command.vel.y * ps); put(bin, 'ach lat', d.vel.y * ps);
    put(bin, 'req |lat|', Math.abs(data.command.vel.y)); put(bin, 'ach |lat|', Math.abs(d.vel.y));
    put(bin, 'req back', data.command.vel.x * dir); put(bin, 'ach back', d.vel.x * dir);
    put(bin, 'owner ach lat', e.blocker.vel.y * ps);
    for (const h of e.helpers) { const hb = h.agent ?? h.blocker ?? h; if (hb?.vel) { put(bin, 'nh'); put(bin, 'helper ach lat', hb.vel.y * ps); } }
  });
  while (sim.phase === 'live' && sim.t < 3) sim.tick();
}
for (const [bin, a] of Object.entries(acc).sort()) {
  const n = a.n, f = (k: string, d = n) => (a[k] / d).toFixed(2);
  const modes = Object.entries(a).filter(([k]) => k.startsWith('mode ')).map(([k, v]) => `${k.slice(5)} ${(v / n).toFixed(2)}`).join(', ');
  console.log(`${bin.padEnd(22)} ticks ${String(n).padStart(5)} | DL lat req ${f('req lat')} ach ${f('ach lat')} (|req| ${f('req |lat|')} |ach| ${f('ach |lat|')}) | back req ${f('req back')} ach ${f('ach back')} | owner lat ${f('owner ach lat')} helper lat ${a.nh ? f('helper ach lat', a.nh) : '-'} | flip/tick ${a.np ? f('flip', a.np) : '-'} req with play ${a.nr ? f('with', a.nr) : '-'} | ${modes}`);
}
