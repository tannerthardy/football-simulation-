/**
 * Gap accounting at the snap (observation only). For every formation against
 * every installable personnel x front x coverage (no pressure; ball in the
 * middle, unflipped), lists the run gaps the offense presents (one between each
 * pair of adjacent surfaces: OL, attached ends, wings; plus the one outside the
 * last surface), the defenders who own each one at the snap (buildRunFits jobs:
 * edge, interior, insert, force; a fit outside the last surface is contain; a
 * shallow alley player fills the nearest gap the box leaves; deep alley players
 * do not own a gap), and the
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
    const contain: Record<string, string[]> = { S: [], W: [] };
    const alley: Array<{ slot: string; lat: number }> = [];
    for (const [d, j] of jobs as Map<any, any>) {
      const role = sim.defAlign.spots[d.slot].role;
      const deep = role.kind === 'zone' && isDeepZone(role.zone);
      const isOwner = OWN.has(j.kind) && !(j.kind === 'force' && deep);
      const shallowAlley = j.kind === 'alley' && !deep && Math.abs(d.pos.x - sim.los) < 8 && Math.abs(d.pos.y - ball) < 7;
      if (isOwner || shallowAlley) committed++;
      if (shallowAlley) alley.push({ slot: d.slot, lat: (d.pos.y - ball) * s });
      if (!isOwner) continue;
      const sideName = j.side === s ? 'S' : 'W';
      // The gap containing a fit's centre (gapY), on the surfaces actually there.
      const own = (gap: string, sideOf: number, kind: string) => {
        const sn = sideOf === s ? 'S' : 'W', mine = gaps.filter(g => g.side === sn);
        const l = (gapY(off, gap, sideOf) - ball) * (sideOf === s ? 1 : -1) * s;
        const g = mine.find(x => l >= x.lo - 1e-6 && l < x.hi) ?? (l < mine[0].lo ? mine[0] : mine[mine.length - 1]);
        owners.set(g.side + g.name, [...(owners.get(g.side + g.name) ?? []), `${d.slot}:${kind}`]);
      };
      if (j.kind === 'force') {
        force[sideName].push(d.slot);
        // A box curl-flat force backer keeps his inside bubble on inside flow.
        if (j.inside) own(j.inside.gap, j.inside.side, 'force-inside');
        continue;
      }
      // A fit outside the last surface on his side (a D gap with no attached
      // end) is contain on the perimeter, not a second owner of that side's C.
      if ('ABCDE'.indexOf(j.gap) >= gaps.filter(g => g.side === sideName).length) { contain[sideName].push(d.slot); continue; }
      own(j.gap, j.side, j.kind);
    }
    // The contain or force player fits the outermost gap on his side when
    // nobody else owns it (the down safety or nickel outside an attached end).
    for (const side of ['S', 'W']) {
      const outer = gaps.filter(g => g.side === side).at(-1)!, key = side + outer.name;
      const edge = contain[side][0] ?? force[side][0];
      if (!owners.has(key) && edge) owners.set(key, [`${edge}:${contain[side].length ? 'contain' : 'force'}`]);
    }
    const unowned = gaps.filter(g => !owners.has(g.side + g.name));
    // A shallow alley player (box depth, inside 7 yd) fills the gap the box
    // leaves: each fills the nearest one left. Raw holes count without him.
    const holesRaw = unowned.map(g => g.side + g.name);
    const left = [...unowned];
    for (const a of alley) {
      if (!left.length) break;
      const lat = (g: typeof left[number]) => (g.side === 'S' ? 1 : -1) * (g.lo + g.hi) / 2;
      const i = left.reduce((b, g, k) => Math.abs(lat(g) - a.lat) < Math.abs(lat(left[b]) - a.lat) ? k : b, 0);
      owners.set(left[i].side + left[i].name, [`${a.slot}:alley`]);
      left.splice(i, 1);
    }
    const holes = left.map(g => g.side + g.name);
    const dups = [...owners.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => `${k}=${v.join('+')}`);
    rows.push({ f: f.id, personnel, front: front.id, cov: cov.id, family: cov.family ?? cov.id, shell: cov.look ?? cov.shell, gaps: gaps.length, gapNames: gaps.map(g => g.side + g.name), committed, holesRaw, holes, dups, forceS: force.S, forceW: force.W, containS: contain.S, containW: contain.W });
  }
}
console.log(JSON.stringify(rows));
