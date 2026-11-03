import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const agg: Record<string, number> = {}; const add = (k: string) => agg[k] = (agg[k] ?? 0) + 1;
const ex: string[] = [];
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  snaps.forEach((p: any, ix: number) => { if (p.pass) return; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== 'power') return;
    const sim: any = new PlaySim(st); sim.tick();
    const g = sim.offense.find((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'pull' && a.behavior.plan.pullRole === 'kick');
    if (!g) return; const e = g.behavior.plan.target; if (!e) return;
    add('n');
    let otherFirst: string | null = null, otherAt = 0, gEng = false, gAt = 0, other = '';
    while (sim.t < 3.5 && sim.phase === 'live') { sim.tick();
      const by = sim.offense.find((o: any) => o !== g && o.engagement?.defender === e);
      if (by && !otherFirst && !gEng) { otherFirst = by.slot; otherAt = sim.t; }
      if (g.engagement?.defender === e && !gEng) { gEng = true; gAt = sim.t; other = sim.offense.filter((o: any) => o !== g && o.engagement?.defender === e).map((o: any) => o.slot).join('+'); }
      if (g.engagement && g.engagement.defender !== e && !gEng) { add('guard engages someone else first'); gEng = true; }
    }
    if (otherFirst) { add(`kick man engaged first by ${otherFirst.replace(/^[LR]/, '')}`); if (gEng && gAt) add(`   ...guard still joins him (${other ? 'shared' : 'after the other left'})`); if (ex.length < 6) ex.push(`seed ${seed} #${ix} ${otherFirst}@${otherAt.toFixed(2)} guard@${gAt.toFixed(2)} ${other}`); }
    else if (gEng && gAt) add('guard kicks him first');
    else if (!gEng) add('guard never engages');
  });
}
console.log(agg); console.log(ex.join('\n'));
