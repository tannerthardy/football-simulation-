/**
 * Gap accounting at the snap (observation only). For every formation against
 * every installable personnel x front x coverage (no pressure; ball in the
 * middle, unflipped), lists the run gaps the offense presents (one between each
 * pair of adjacent surfaces: OL, attached ends, wings; plus the one outside the
 * last surface), the defenders who own each one at the snap (buildRunFits jobs:
 * edge, interior, insert, force; deep alley players do not own a gap), and the
 * spacing: how many defenders are committed to a run fit (owners plus
 * shallow alley players inside 7 yd of the ball). Force is the perimeter
 * outside the last gap, reported per side, not a gap owner.
 * usage: npx tsx scripts/diag/align/gap-accounting.mts <root> [--limit N] > out/align/gap-accounting.json (about 20 s)
 */
const root = process.argv[2];
const limit = Number(process.argv[process.argv.indexOf('--limit') + 1] || 0) || Infinity;
const E = await import(`${root}/lab-app/engine.ts`);
const { PlaySim } = await import(`${root}/src/sim/playsim.ts`);
const { buildRunFits } = await import(`${root}/src/sim/run-fits.ts`);
const { gapY, isDeepZone } = await import(`${root}/src/playbook/alignment.ts`);
const { FORMATIONS } = await import(`${root}/src/playbook/formations.ts`);
const { FRONTS, COVERAGES } = await import(`${root}/src/playbook/defense.ts`);
const { DEF_PERSONNEL } = await import(`${root}/src/playbook/types.ts`);
const { coverageHasNamedZonePlayers } = await import(`${root}/src/playbook/call-integrity.ts`);

const OWN = new Set(['edge', 'interior', 'insert', 'force']);
const rows: any[] = [];
let n = 0;
outer: for (const f of FORMATIONS) for (const personnel of Object.keys(DEF_PERSONNEL)) {
  for (const front of FRONTS.filter((x: any) => x.personnel.includes(personnel))) for (const cov of COVERAGES) {
    if (!coverageHasNamedZonePlayers(personnel, cov)) continue;
    if (n++ >= limit) break outer;
    const r = E.defaultRecipe();
    r.offense = { formation: f.id, kind: 'run', concept: 'iz_strong', flip: false };
    r.defense = { personnel, front: front.id, coverage: cov.id, pressure: null, zoneStyle: 'match' };
    r.situation = { ...r.situation, hash: 'middle' };
    let sim: any;
    try { sim = new PlaySim(E.buildSetup(r)); } catch (e) { rows.push({ f: f.id, personnel, front: front.id, cov: cov.id, error: String(e).slice(0, 80) }); continue; }
    const off = sim.offAlign, s = off.strongSign, ball = off.ballY;
    // Surfaces per side, inside-out: tackle, then attached players (on the line or a wing) within 2.5 yd of the last surface.
    const gaps: Array<{ side: string; name: string; lo: number; hi: number }> = [];
    for (const side of [1, -1]) {
      const lat = (y: number) => (y - ball) * side * s; // + outward on that side
      const olLat = ['C', 'LG', 'RG', 'LT', 'RT'].map(k => off.spots[k]).filter(Boolean).map((p: any) => lat(p.pos.y)).filter((v: number) => v > -0.1).sort((a: number, b: number) => a - b);
      const surfaces = [...olLat];
      const others = Object.values(off.spots).filter((p: any) => !['C', 'LG', 'RG', 'LT', 'RT', 'QB'].includes(p.slot) && !p.backfield)
        .map((p: any) => ({ p, l: lat(p.pos.y), d: off.los - p.pos.x })).filter((o: any) => o.l > 0).sort((a: any, b: any) => a.l - b.l);
      for (const o of others) if (o.l - surfaces[surfaces.length - 1] < 2.6 && o.d < 2.6) surfaces.push(o.l);
      const names = 'ABCDEF';
      for (let i = 0; i < surfaces.length; i++) gaps.push({ side: side === 1 ? 'S' : 'W', name: names[i], lo: surfaces[i], hi: i + 1 < surfaces.length ? surfaces[i + 1] : surfaces[i] + 2.5 });
    }
    const jobs = buildRunFits(sim);
    const owners = new Map<string, string[]>();
    let committed = 0;
    const force: Record<string, string[]> = { S: [], W: [] };
    for (const [d, j] of jobs as Map<any, any>) {
      const role = sim.defAlign.spots[d.slot].role;
      const deep = role.kind === 'zone' && isDeepZone(role.zone);
      const isOwner = OWN.has(j.kind) && !(j.kind === 'force' && deep);
      if (isOwner || (j.kind === 'alley' && !deep && Math.abs(d.pos.x - sim.los) < 8 && Math.abs(d.pos.y - ball) < 7)) committed++;
      if (!isOwner) continue;
      const sideName = j.side === s ? 'S' : 'W', sideSign = j.side === s ? 1 : -1;
      if (j.kind === 'force') { force[sideName].push(d.slot); continue; }
      // The gap containing his assigned gap's centre (gapY), on the surfaces actually there.
      const mine = gaps.filter(g => g.side === sideName);
      const l = (gapY(off, j.gap, j.side) - ball) * sideSign * s;
      const g = mine.find(x => l >= x.lo - 1e-6 && l < x.hi) ?? (l < mine[0].lo ? mine[0] : mine[mine.length - 1]);
      const key = g.side + g.name;
      owners.set(key, [...(owners.get(key) ?? []), `${d.slot}:${j.kind}`]);
    }
    const holes = gaps.map(g => g.side + g.name).filter(k => !owners.has(k));
    const dups = [...owners.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => `${k}=${v.join('+')}`);
    rows.push({ f: f.id, personnel, front: front.id, cov: cov.id, family: cov.family ?? cov.id, shell: cov.look ?? cov.shell, gaps: gaps.length, gapNames: gaps.map(g => g.side + g.name), committed, holes, dups, forceS: force.S, forceW: force.W });
  }
}
console.log(JSON.stringify(rows));
