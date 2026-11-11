// Fixed run set replay (Defense, 2026-11-11; report only; the CUSHION_NEED run-tackle trace): per defender, tackle attempts (hit / missed_tackle events) and whether the
// CUSHION_NEED squeeze ('cushion-need' tag) acted on him and whether his man engaged (blocked) him.
import { readFileSync, writeFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
(PlaySim as any).recordedSingleStream = true;
// usage: node scripts/ref.mjs [--flag X=1] -- node --import tsx scripts/diag/defense-yards/cnruns.mts <out.jsonl> 7 9 11 ... (needs out/matched-restage, see ref-report.mjs)
const [out, ...seedArgs] = process.argv.slice(2);
const seeds = seedArgs.map(Number);
const rows: any[] = [];
for (const seed of seeds) {
  let i = 0;
  for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
    const id = `s${seed}-${i++}`, st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    const sim: any = new PlaySim(st);
    const info = new Map<any, any>();
    const t0 = sim.tick.bind(sim);
    sim.tick = () => { t0();
      for (const d of sim.defense) {
        let s = info.get(d); if (!s) { s = { tag: false, blockedByMan: false, kinds: new Set() }; info.set(d, s); }
        if (d.tags.has('cushion-need')) s.tag = true;
        const b = d.behavior, man = b?.target ?? b?.sub?.target ?? null;
        if (b?.kind) s.kinds.add(b.kind);
        if (man) s.man = man.slot;
        const e = d.engagement; if (e && man && (e.blocker === man || e.a === man || e.b === man || e.other?.(d) === man)) s.blockedByMan = true;
      }
    };
    let r: any; try { r = sim.run(); } catch (e) { continue; }
    const car = (t: number) => null;
    for (const ev of sim.events) {
      if (ev.type !== 'missed_tackle' && ev.type !== 'hit') continue;
      const d = sim.defense.find((x: any) => x.idx === ev.a); if (!d) continue;
      const s = info.get(d) ?? {};
      rows.push({ id, scheme: st.offCall?.run?.scheme ?? 'other', type: ev.type, slot: d.slot, kinds: [...(s.kinds ?? [])].join('/'), man: s.man ?? null,
        tag: !!s.tag, blockedByMan: !!s.blockedByMan, depth: ev.pos ? +(ev.pos.x - sim.los).toFixed(1) : null, t: ev.t });
    }
  }
}
writeFileSync(out, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(out, rows.length);
