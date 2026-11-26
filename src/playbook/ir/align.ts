/**
 * Alignment from the call description alone (step 1b; Integration's grammar plan). A port of alignment.ts
 * `alignDefense` / `alignDisguised` whose every read of a front, coverage, pressure or personnel name is replaced by
 * description data:
 * - the disguise: present in the description only when the shown coverage differs;
 * - the sub package (nickel, dime): `alignment.subPackage`;
 * - the second level's spots (today `BACKERS[FAMILY[front.id]]`): `alignment.secondLevel`;
 * - the three conditional Sam rules (today by front id over/even, over, bear): `alignment.frontRules`, each a typed
 *   condition on the observed offense evaluated below exactly as before.
 * The rest is today's code unchanged: the geometry vocabularies (technique offsets, zone spots, line splits, seat to
 * role), the placement rules over roles, the seat assignment and the man matching. It reads the same engine switches
 * as alignment.ts (imported, never read from the environment here). The working call carries no front name, so a
 * name read left behind cannot match. The coverage object is carried only because today's output returns it.
 * Offense: alignment.ts `alignOffense` reads no formation name (only the split-kind and QB-alignment vocabularies), so
 * `alignOffenseFromDescription` lowers the description and calls it; its only name reads are in the play context
 * (`ctx.run.scheme`, `ctx.pass` #1's route), which a formation description does not carry.
 */
import { CENTER_Y, FIELD_WIDTH } from '../../core/field.js';
import { clamp, type Vec2 } from '../../core/vec.js';
import type { CoverageRole, DefSlot, DefensivePlayCall, Gap, ReceiverRef, SkillSlot, Technique, UnderSeat } from '../types.js';
import {
  AGAP_ALIGN, AGAP_LEAGUE, BLITZ_CREEP, BOX_ALIGN, CREEP_DEPTH, DEF_ALIGN, EDGE_CALL_TE, EDGE_TECH, FIT_TE_GAP,
  FRONT_ALIGN, FRONT_PLAYERS, MIRROR_SCATTER, NICKEL_FRONTS_ALIGN, OL_SLOTS, OL_SPLITS, SAM_ON_DEPTH, SAM_ON_TE,
  SHELL_SHOW, SHORT_PACKAGE, SHOULDER, SLOT_LEV, TIGHT_OFF, TIGHT_OFF_DEPTH, TIGHT_SPLIT, alignOffense, coverageDepth,
  flipRef, flipZone, frontSign, gapY, inlineOf, isDeepZone, otherSide, scatterSide, seatRole, seatZone, situationDepth,
  tackleOf, techniqueGap, techniqueOffset, zoneLandmark, zoneSpot,
  type AlignContext, type AlignStyle, type DefSpot, type DefenseAlignment, type DepthJob, type ManPreference, type OffenseAlignment,
} from '../alignment.js';
import { lowerDefense, lowerFormation } from './lower.js';
import type { DefenseDescription, OffenseDescription } from './types.js';

export function alignOffenseFromDescription(d: OffenseDescription, flip: boolean, los: number, ballY: number, ctx: AlignContext = {}): OffenseAlignment {
  return alignOffense(lowerFormation(d), flip, los, ballY, ctx);
}

/** The call the placement code reads, built from the description, with the front's name removed. */
function workingCall(desc: DefenseDescription): DefensivePlayCall {
  const call = lowerDefense({ ...desc, shown: undefined });
  return { ...call, front: { ...call.front, id: '', name: '' } };
}

/** The disguise's look: the shown coverage's roles on the same players, no pressure, no disguise. */
function shownLook(desc: DefenseDescription): DefenseDescription {
  const s = desc.shown!;
  return { ...desc, shown: undefined, pressure: null, coverage: s.coverage,
    players: desc.players.map((p) => ({ ...p, what: { coverage: s.roles[p.who.slot] } })) };
}

export function alignDefenseFromDescription(desc: DefenseDescription, off: OffenseAlignment, present: DefSlot[], prefs: ManPreference = {}, style: AlignStyle = {}): DefenseAlignment {
  // A disguise is in the description only when the shown coverage differs (the describer's preset step).
  if (desc.shown) return alignDisguisedFromDescription(desc, off, present, prefs, style);
  const call = workingCall(desc);
  const s = off.strongSign;
  const los = off.los;
  const cov = call.coverage;
  const spots: Partial<Record<DefSlot, DefSpot>> = {};
  const has = (slot: DefSlot) => present.includes(slot);
  // FRONT_STRENGTH: the front's own strong side; `s` stays the coverage's.
  const fs = frontSign(call, off), flipFront = fs !== s;
  const teAt = (sign: number) => sign === s ? off.hasTE.S : off.hasTE.W;

  // --- front ---
  const frontSlots = call.front.slots;
  // FRONT_ALIGN: each side's end man (the widest defender on the line) sets
  // the edge; his technique comes from the call against the look and his build.
  const edgeTech = new Map<DefSlot, Technique>(), edgeShift = new Map<DefSlot, number>();
  // Vs a pair the 9 is the end's outside shoulder, inside the wing.
  const pairShade = new Set<DefSlot>();
  const sideSign = (side: 'S' | 'W') => side === 'S' ? fs : -fs;
  // A wing: an attached receiver just outside the inline end, off the ball.
  const wingOn = (side: 'S' | 'W') => Object.values(off.spots).find(sp => !sp.inline && !sp.backfield
    && !OL_SLOTS.has(sp.slot) && (sp.pos.y - off.ballY) * sideSign(side) > inlineOf(off.line) + .3
    && (sp.pos.y - off.ballY) * sideSign(side) < inlineOf(off.line) + 2 && los - sp.pos.x < 2.5);
  // A back offset to that side (installs: "near"), not behind the QB or away.
  const nearBack = (side: 'S' | 'W') => Object.values(off.spots).some(sp => sp.backfield && sp.slot !== 'QB'
    && (sp.pos.y - off.ballY) * sideSign(side) > .5);
  // Nickel and dime calls; a 3-4 has no LB_S slot but is a base front.
  const nickel = desc.alignment.subPackage;
  if (FRONT_ALIGN) for (const side of ['S', 'W'] as const) {
    const onLine = present.filter(slot => frontSlots[slot]?.side === side && frontSlots[slot]!.depth < 2);
    const hasTE = teAt(sideSign(side));
    const end = onLine.sort((a, b) => techniqueOffset(frontSlots[b]!.tech, hasTE, off.line) - techniqueOffset(frontSlots[a]!.tech, hasTE, off.line))[0];
    if (!end) continue;
    // NICKEL_FRONTS: a side whose widest man on the line is an inside
    // technique has no edge by design (the Mint's weak C-gap bubble, filled
    // by a backer): he keeps his technique rather than becoming the end.
    if (NICKEL_FRONTS_ALIGN && ['0', '1', '2i', '2', '3', '4i'].includes(frontSlots[end]!.tech)) continue;
    let tech = frontSlots[end]!.tech;
    if (call.edge) tech = hasTE ? EDGE_CALL_TE[call.edge] : call.edge === 'tight' ? '9' : 'w9';
    // With no end there a 6 or 7 is a ghost: he stands where the end would.
    else if (!hasTE) tech = tech === '6' || tech === '7' ? '9' : EDGE_TECH.includes(tech) ? tech : 'w9';
    // Installs (2017 Colts pp. 13, 79): vs a pair of ends the end plays a 9;
    // in nickel ("Auto") a 6 vs a near back, a 9 vs a dot or far back. Base
    // fronts keep their own map, at least on the end.
    else if (wingOn(side)) { tech = '9'; pairShade.add(end); }
    else if (nickel && end.startsWith('DE')) tech = nearBack(side) ? '6' : '9';
    else if (!EDGE_TECH.includes(tech)) tech = '6';
    edgeTech.set(end, tech);
    // His build moves his feet within his technique, not into the next one,
    // and never inside a tight end he is set on (a wide nine has room to
    // come in). Half the tracked slope: light ends also draw the wide calls.
    const mass = style.mass?.[end];
    if (pairShade.has(end)) edgeShift.set(end, inlineOf(off.line) + SHOULDER - techniqueOffset(tech, true, off.line));
    else if (mass !== undefined) edgeShift.set(end, Math.max(clamp(-.025 * (mass - 118), tech === 'w9' ? -.4 : -.2, .4),
      hasTE ? -techniqueOffset(tech, true, off.line) + inlineOf(off.line) : -Infinity));
  }
  for (const slot of present) {
    const fa = frontSlots[slot];
    if (!fa) continue;
    const sign = sideSign(fa.side);
    const hasTE = teAt(sign);
    const tech = edgeTech.get(slot) ?? fa.tech;
    const lateral = FRONT_ALIGN && AGAP_ALIGN && tech === '1' && fa.depth < 2
      ? (style.aGap ?? AGAP_LEAGUE) * off.line.cg
      : techniqueOffset(tech, hasTE, off.line) + (edgeShift.get(slot) ?? 0);
    const y = off.ballY + sign * lateral;
    const fit = call.front.fits?.[slot];
    spots[slot] = { slot, pos: { x: los + fa.depth, y }, role: { kind: 'rush' },
      gap: fit?.gap ?? techniqueGap(fa.tech, FIT_TE_GAP && hasTE), gapSign: fit ? sideSign(fit.side) : sign };
    const rushGap = fit?.gap ?? techniqueGap(fa.tech);
    if (FIT_TE_GAP && rushGap !== spots[slot]!.gap) spots[slot]!.rushGap = rushGap;
  }

  // FRONT_MENU: off-ball backers by the front's family and their number.
  const backerSpots = desc.alignment.secondLevel;
  // SAM_ON_TE (experimental, off): a "Sam on" call walks the Over/Even Sam
  // onto the line on an attached tight end's outside shoulder, a front man
  // like the Under's 9; the Mike and Will are then the two off-ball backers.
  // Not against a wing (handled below) or a detached #2 (the apex).
  const s2 = off.numbering.S2;
  const samOnTE = SAM_ON_TE && !!call.samOn && FRONT_ALIGN && desc.alignment.frontRules.includes('samOnTE')
    && !!spots.LB_S && !!frontSlots.LB_S && frontSlots.LB_S.depth > 2 && teAt(fs) && !wingOn('S')
    && !(!has('NB') && !flipFront && off.counts.S >= 2 && !!s2 && !off.spots[s2].inline);
  const offBall = (['LB_W', 'LB_M', 'LB_S'] as DefSlot[]).filter(slot => spots[slot] && frontSlots[slot]!.depth > 2 && !(samOnTE && slot === 'LB_S'));
  const table = backerSpots?.[offBall.length as 1 | 2 | 3];
  if (table) {
    const G = OL_SPLITS ? off.line.cg : 1.3, T = tackleOf(off.line);
    const across = (u: number) => {
      const a = Math.abs(u), sign = u >= 0 ? fs : -fs;
      const out = a <= 1 ? a * G : a <= 2 ? G + (a - 1) * (T - G) : T + (a - 2) * (teAt(sign) ? inlineOf(off.line) - T : T - G);
      return off.ballY + sign * out;
    };
    // Weak to strong: the Will takes the weakest spot, the Sam the strongest.
    offBall.forEach((slot, i) => { const [u, depth] = table[i]; spots[slot]!.pos = { x: los + depth, y: across(u) }; });
    // A mug walks a backer into an A gap no lineman occupies, at the tracked
    // 1.2 yd: the Mike first, to the strong side when both are open.
    if (call.mug) {
      const lined = present.filter(slot => frontSlots[slot] && frontSlots[slot]!.depth < 2 && !slot.startsWith('LB'));
      const open = [fs, -fs].filter(sign => !lined.some(slot => {
        const u = (spots[slot]!.pos.y - off.ballY) * sign / G;
        return u > -.25 && u < .9;
      }));
      const muggers = (['LB_M', 'LB_W'] as DefSlot[]).filter(slot => offBall.includes(slot)).slice(0, Math.min(call.mug, open.length));
      muggers.forEach((slot, i) => { spots[slot]!.pos = { x: los + 1.2, y: off.ballY + open[i] * .5 * G }; });
    }
  }

  // --- receivers by side for DB alignment ---
  const rec = (ref: ReceiverRef) => {
    const slot = off.numbering[ref];
    return slot ? off.spots[slot].pos : null;
  };
  const shell = cov.look ?? cov.shell;
  const cornerDepth = cov.press ? 1.2 : shell === 'one-high' ? 7 : 6;
  /** DEF_ALIGN: a defensive back's depth and outward shade (negative =
   * inside) on the receiver he aligns over, from his role in the call. */
  const dbSpot = (slot: DefSlot, r: Vec2, sign: number): { depth: number; shade: number } => {
    const role = cov.roles[slot];
    const spot = role?.kind === 'man' || (!role && cov.man)
      ? (cov.press || (role?.kind === 'man' && role.press) ? { depth: 1.3, shade: 0.15 }
        : { depth: 6, shade: role?.kind === 'man' && role.lev === 'outside' ? 0.5 : role?.kind === 'man' && role.lev === 'head' ? 0 : -0.2 })
      : zoneSpot(role?.kind === 'zone' ? role.zone : undefined, slot === 'NB' || slot === 'DB');
    // The team's habit moves its outside zone corners deeper or tighter.
    if (role?.kind === 'zone' && slot.startsWith('CB')) {
      const z = role.zone;
      const job: DepthJob | null = z.startsWith('flat') ? 'flatCB' : z.startsWith('deep_third') ? 'thirdCB' : z.endsWith('_out') ? 'quarterCB' : null;
      spot.depth = Math.max(1.3, spot.depth + (style.cbDepth ?? 0) + (job ? situationDepth(job, style.situation) : 0));
    }
    const room = sign > 0 ? FIELD_WIDTH - r.y : r.y;
    if (room < 9) spot.shade = Math.min(spot.shade, -0.2);
    return spot;
  };

  const placeCorner = (slot: DefSlot, side: 'S' | 'W') => {
    if (!has(slot)) return;
    const sign = side === 'S' ? s : -s;
    // A nub side (only an attached end) has no #1 for the corner: he aligns
    // as the nub-side corner, wide and off, as with no receiver at all.
    const s1 = off.numbering[`${side}1` as ReceiverRef];
    const r1 = s1 && !off.spots[s1].inline ? rec(`${side}1` as ReceiverRef) : null;
    const spot = DEF_ALIGN && r1 ? dbSpot(slot, r1, sign) : null;
    const y = r1 ? (spot ? r1.y + sign * spot.shade : r1.y - sign * (cov.press ? 0.6 : shell === 'one-high' ? -0.8 : 0.8)) : off.ballY + sign * 14;
    spots[slot] = { slot, pos: { x: los + (spot?.depth ?? cornerDepth), y: clamp(y, 1, FIELD_WIDTH - 1) }, role: { kind: 'rush' }, gap: 'D', gapSign: sign, press: cov.press };
  };
  placeCorner('CB_S', 'S');
  placeCorner('CB_W', 'W');

  // Nickel over the strong slot (or apex if none); dime over the weak slot.
  const placeSlotDB = (slot: DefSlot, side: 'S' | 'W') => {
    if (!has(slot)) return;
    const sign = side === 'S' ? s : -s;
    const r2 = rec(`${side}2` as ReceiverRef);
    const apex = off.ballY + sign * 6.5;
    const detachedSlot = r2 && !off.spots[off.numbering[`${side}2` as ReceiverRef]!].inline;
    const spot = DEF_ALIGN && detachedSlot ? dbSpot(slot, r2, sign) : null;
    const y = detachedSlot ? r2.y + sign * (spot ? spot.shade : -0.8) : apex;
    spots[slot] = { slot, pos: { x: los + (spot?.depth ?? (cov.press ? 1.5 : 5)), y }, role: { kind: 'rush' }, gap: 'D', gapSign: sign, press: cov.press };
  };
  // The nickel goes to the side with a detached slot: vs. an inline TE and a
  // flanker on the strong side, the slot is usually to the weak side.
  const detached = (side: 'S' | 'W') => {
    const r = off.numbering[`${side}2` as ReceiverRef];
    return !!r && !off.spots[r].inline;
  };
  const nickelSide: 'S' | 'W' = !detached('S') && detached('W') ? 'W' : 'S';
  placeSlotDB('NB', nickelSide);
  placeSlotDB('DB', nickelSide === 'S' ? 'W' : 'S');

  // Safeties by shell.
  if (has('FS') || has('SS')) {
    if (shell === 'two-high') {
      // DEF_ALIGN: halves or quarters by the safety's role, held on the field.
      const deep = (slot: 'SS' | 'FS', sign: number): Vec2 => {
        if (!DEF_ALIGN) return { x: los + 12, y: off.ballY + sign * 9 };
        const r = cov.roles[slot], quarters = r?.kind === 'zone' && r.zone.startsWith('quarter');
        const [depth, width, follow] = quarters ? [12, 6.65, 0.45] : [14, 6.9, 0.36];
        const sit = situationDepth(quarters ? 'quarter' : 'half', style.situation);
        return { x: los + depth + (style.safetyDepth ?? 0) + sit, y: CENTER_Y + follow * (off.ballY - CENTER_Y) + sign * width };
      };
      if (has('SS')) spots.SS = { slot: 'SS', pos: deep('SS', s), role: { kind: 'rush' }, gap: 'D', gapSign: s };
      if (has('FS')) spots.FS = { slot: 'FS', pos: deep('FS', -s), role: { kind: 'rush' }, gap: 'D', gapSign: -s };
    } else {
      const fs = DEF_ALIGN ? { x: los + (cov.man ? 14.7 : 14.5) + (style.safetyDepth ?? 0) + situationDepth('post', style.situation), y: CENTER_Y + (cov.man ? 0.34 : 0) * (off.ballY - CENTER_Y) }
        : { x: los + 13, y: clamp(off.ballY, 18, FIELD_WIDTH - 18) };
      // The post is whichever safety the call makes the deep player (the
      // Lurk's SS); the other is the down safety.
      const deepRole = (slot: DefSlot) => { const r = cov.roles[slot]; return r?.kind === 'zone' && isDeepZone(r.zone); };
      const [post, low]: DefSlot[] = deepRole('SS') && !deepRole('FS') ? ['SS', 'FS'] : ['FS', 'SS'];
      if (has(post)) spots[post] = { slot: post, pos: fs, role: { kind: 'rush' }, gap: 'A', gapSign: -s };
      // BOX_ALIGN: the down safety at his tracked spot outside the strong
      // side's end of the line (an attached end or the tackle).
      const uc = (off.spots.QB?.pos.x ?? los - 5) > los - 2.5, te = off.hasTE.S;
      const down = BOX_ALIGN ? { depth: te ? (uc ? 4.4 : 5.2) : (uc ? 5.1 : 5.8), out: te ? 1.5 : uc ? 2.7 : 3.9 } : { depth: 7.5, out: 3 };
      if (has(low)) spots[low] = { slot: low, pos: { x: los + down.depth, y: off.coreEdge.S + s * down.out }, role: { kind: 'rush' }, gap: 'D', gapSign: s };
    }
  }

  // LBs without front alignment (shouldn't happen, but keep them sane).
  for (const slot of present) {
    if (!spots[slot]) spots[slot] = { slot, pos: { x: los + 5, y: off.ballY }, role: { kind: 'rush' }, gap: 'A', gapSign: s };
  }

  // Off-ball LBs walk out to apex vs. spread looks in two-high shells.
  let apex = false;
  // FRONT_STRENGTH: the backer on the receivers' side, the Will when the
  // front sets the other way.
  const apexLB: DefSlot = flipFront ? 'LB_W' : 'LB_S';
  // Zone calls only: in a man call each defender aligns on his man below.
  if (!cov.man && !has('NB') && off.counts.S >= 2 && has(apexLB) && frontSlots[apexLB] && frontSlots[apexLB]!.depth > 2) {
    const r2 = rec('S2');
    // Against trips he splits #2 and a detached #3, not #2 and the core.
    const s3 = off.numbering.S3, r3 = s3 && !off.spots[s3].inline && !off.spots[s3].backfield ? off.spots[s3].pos : null;
    if (r2 && !off.spots[off.numbering.S2!].inline) { spots[apexLB]!.pos = { x: los + 4.5, y: (r2.y + (r3?.y ?? off.coreEdge.S)) / 2 }; apex = !flipFront; }
  }
  // FRONT_ALIGN: the Over Sam is a "90", the end's outside shade at
  // linebacker depth; a wing is attached, not spread, so vs one he tightens
  // to the line head-up on him (2017 Colts p. 77). A detached #2 keeps the apex.
  if (FRONT_ALIGN && desc.alignment.frontRules.includes('samOverEnd') && spots.LB_S && teAt(fs)) {
    const wing = wingOn('S'), sam = spots.LB_S;
    if (wing) sam.pos = { x: los + (frontSlots.DE_S?.depth ?? .9), y: wing.pos.y };
    // Lateral only: his depth is the front's (or FRONT_MENU's tracked) backer depth.
    else if (!apex) sam.pos = { x: sam.pos.x, y: off.ballY + fs * (inlineOf(off.line) + SHOULDER) };
  }
  if (samOnTE) spots.LB_S!.pos = { x: los + SAM_ON_DEPTH, y: off.ballY + fs * (inlineOf(off.line) + SHOULDER) };

  // BOX_ALIGN: answer every detached inside receiver in a zone call.
  if (BOX_ALIGN && !cov.man) {
    const blitzing = new Set(Object.keys(call.pressure?.blitzers ?? {}));
    // A backer walked out to one receiver is spent: the next receiver takes
    // the next-nearest backer (the Mike against trips), not the same one back.
    const walked = new Set<DefSlot>();
    for (const side of ['W', 'S'] as const) {
      const sign = side === 'S' ? s : -s;
      for (const i of [2, 3]) {
        const slot = off.numbering[`${side}${i}` as ReceiverRef];
        if (!slot || off.spots[slot].inline || off.spots[slot].backfield) continue;
        const y2 = (off.spots[slot].pos.y - off.ballY) * sign;
        const inner = off.numbering[`${side}${i + 1}` as ReceiverRef];
        const next = inner && !off.spots[inner].inline && !off.spots[inner].backfield
          ? (off.spots[inner].pos.y - off.ballY) * sign : (off.coreEdge[side] - off.ballY) * sign;
        const answer = Object.values(spots).find(sp => {
          const depth = sp!.pos.x - los, y = (sp!.pos.y - off.ballY) * sign;
          return depth < 8 && (Math.abs(y - y2) < 1.5 || (depth > 1 && y > next + .5 && y < y2 - 1.5));
        });
        // The backer already answering him is spent on him as well.
        if (answer) { if (answer.slot.startsWith('LB')) walked.add(answer.slot); continue; }
        const apexY = off.ballY + sign * (y2 + next) / 2;
        const backer = (['LB_W', 'LB_M', 'LB_S'] as DefSlot[]).filter(lb => spots[lb] && frontSlots[lb] && frontSlots[lb]!.depth > 2
          && spots[lb]!.pos.x - los > 2 && !blitzing.has(lb) && !walked.has(lb))
          .sort((a, b) => Math.abs(spots[a]!.pos.y - apexY) - Math.abs(spots[b]!.pos.y - apexY))[0];
        if (backer) { spots[backer]!.pos = { x: los + 4.6, y: apexY }; walked.add(backer); }
      }
    }
  }

  // BOX_ALIGN: end men widen on passing downs; backers' depth by down and distance.
  const sit = style.situation;
  if (BOX_ALIGN && sit && sit.down >= 3 && sit.distance >= 3) for (const sign of [fs, -fs]) {
    const end = present.filter(slot => frontSlots[slot] && frontSlots[slot]!.depth < 2 && spots[slot]
      && (spots[slot]!.pos.y - off.ballY) * sign > 0 && spots[slot]!.pos.x - los < 2)
      .sort((a, b) => (spots[b]!.pos.y - spots[a]!.pos.y) * sign)[0];
    if (end) spots[end]!.pos = { x: spots[end]!.pos.x, y: spots[end]!.pos.y + sign * .4 };
  }
  if (BOX_ALIGN && sit && sit.down >= 3 && (sit.distance <= 2 || sit.distance >= 7)) {
    const shift = sit.distance <= 2 ? -.5 : .5;
    for (const lb of ['LB_W', 'LB_M', 'LB_S'] as DefSlot[])
      if (spots[lb] && spots[lb]!.pos.x - los > 2.5) spots[lb]!.pos = { x: spots[lb]!.pos.x + shift, y: spots[lb]!.pos.y };
  }

  // --- roles ---
  const roles: Partial<Record<DefSlot, CoverageRole>> = {};
  const pressure = call.pressure;
  const blitzers = new Set<DefSlot>();
  if (pressure) {
    // Sides are the coverage's (consumers read them against its strength);
    // a front player's follow the front.
    const front = (slot: DefSlot) => flipFront && FRONT_PLAYERS.has(slot);
    for (const [slot, b] of Object.entries(pressure.blitzers) as Array<[DefSlot, { gap: Gap; side: 'S' | 'W' }]>) {
      if (!has(slot)) continue;
      roles[slot] = { kind: 'blitz', gap: b.gap, side: front(slot) ? otherSide(b.side) : b.side };
      blitzers.add(slot);
    }
    for (const [slot, z] of Object.entries(pressure.droppers ?? {}) as Array<[DefSlot, UnderSeat]>) {
      if (has(slot)) { const role = seatRole(z); roles[slot] = front(slot) && role.kind === 'zone' ? { ...role, zone: flipZone(role.zone) } : role; }
    }
  }
  const dlSlots: DefSlot[] = ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'];
  for (const slot of dlSlots) if (has(slot) && !roles[slot]) roles[slot] = { kind: 'rush' };
  // 3-4 OLB on the line in a Sam position rushes too.
  if (has('LB_S') && frontSlots.LB_S && frontSlots.LB_S.depth < 2 && !roles.LB_S && !cov.man) roles.LB_S = { kind: 'rush' };
  // NICKEL_FRONTS: so does a Will or Mike walked up onto the line as an edge
  // (Penny); a rover off the ball drops on 3rd and long (a three-man rush with
  // eight in coverage) and rushes otherwise.
  for (const lb of ['LB_W', 'LB_M'] as DefSlot[])
    if (has(lb) && frontSlots[lb] && frontSlots[lb]!.depth < 2 && !roles[lb] && !cov.man) roles[lb] = { kind: 'rush' };
  for (const slot of dlSlots) if (has(slot) && frontSlots[slot]?.rover && roles[slot]?.kind === 'rush' && !cov.man
    && style.situation && style.situation.down >= 3 && style.situation.distance >= 7) roles[slot] = { kind: 'zone', zone: 'hook_mid' };

  for (const slot of present) {
    if (roles[slot]) continue;
    const r = cov.roles[slot];
    // A backer's man preferences are by his side of the front.
    if (r) roles[slot] = r.kind === 'man' && r.prefer && flipFront && FRONT_PLAYERS.has(slot) ? { ...r, prefer: r.prefer.map(flipRef) } : r;
  }

  // Remaining defenders fill underneath zones (zone) or play man (man).
  const unassigned = present.filter((p) => !roles[p]);
  if (!cov.man) {
    const zones = cov.underneath.filter((z) => !Object.values(roles).some((r) => r?.kind === 'zone' && r.zone === seatZone(z)));
    // The call's seats in priority order, as many as there are free
    // defenders, go to the defenders by the least total distance to their
    // landmarks: one seat at a time, nearest first, sent a backer over the
    // trips #2 to the weak hook while the man beside the weak hook took the
    // strong one.
    const free = new Set(unassigned);
    const pool = [...free];
    const seats = zones.slice(0, pool.length);
    const lms = seats.map(seat => zoneLandmark(seatZone(seat), off));
    const dist = (slot: DefSlot, i: number) => Math.hypot(spots[slot]!.pos.x - lms[i].x, spots[slot]!.pos.y - lms[i].y);
    let best: { cost: number; pick: DefSlot[] } | null = null;
    const pick: DefSlot[] = [];
    const used = new Set<DefSlot>();
    const search = (i: number, cost: number) => {
      if (best && cost >= best.cost) return;
      if (i === seats.length) { best = { cost, pick: [...pick] }; return; }
      for (const slot of pool) {
        if (used.has(slot)) continue;
        used.add(slot); pick.push(slot);
        search(i + 1, cost + dist(slot, i));
        pick.pop(); used.delete(slot);
      }
    };
    search(0, 0);
    (best as { cost: number; pick: DefSlot[] } | null)?.pick.forEach((slot, i) => { roles[slot] = seatRole(seats[i]); free.delete(slot); });
    for (const slot of free) roles[slot] = { kind: 'zone', zone: 'hook_mid' };
  } else {
    // Man calls can still name underneath seats (a rat, a robber, a hole player)
    // for defenders left over after the man assignments are made below.
    for (const slot of unassigned) roles[slot] = { kind: 'man', prefer: ['B', 'S3', 'W2'] };
  }

  // --- man matching ---
  const receivers = Object.entries(off.refOf) as Array<[SkillSlot, ReceiverRef]>;
  if(cov.man){
    // Pressure may use a marker who had a back/slot responsibility. Optional
    // low help and brackets check to the vacated man before we leave an
    // eligible receiver unaccounted for. Deep help stays the called coverage.
    let shortage=receivers.length-present.filter(slot=>{const r=roles[slot];return r?.kind==='man'&&!r.double;}).length;
    for(const slot of present){
      if(shortage<=0)break;
      const r=roles[slot];
      if((r?.kind==='zone'&&!isDeepZone(r.zone))||(r?.kind==='man'&&r.double)){
        roles[slot]={kind:'man',prefer:['B','B2','S3','S2','W2']};shortage--;
      }
    }
    // Odd/goal-line personnel have five front players (the DE slots include
    // stand-up edges). The same pressure cannot blindly add to a four-man
    // rush. An uncalled edge takes a coverage assignment when the man budget
    // requires it; keep explicit blitzers and the called deep help intact.
    for(const slot of ['DE_S','DE_W'] as const){
      if(shortage<=0)break;
      if(roles[slot]?.kind==='rush'){
        roles[slot]={kind:'man',prefer:slot==='DE_S'?['S3','S2','B','B2']:['W2','B2','B']};shortage--;
      }
    }
  }
  const taken = new Set<SkillSlot>();
  const manDefs = present.filter((p) => roles[p]?.kind === 'man');
  // Coach overrides first (shadowing).
  for (const d of manDefs) {
    const o = prefs.overrides?.[d];
    if (o && off.refOf[o] && !taken.has(o)) {
      spots[d]!.manTarget = o;
      taken.add(o);
    }
  }
  // Then preference lists in priority order: corners, nickel, safeties, LBs.
  const order: DefSlot[] = ['CB_S', 'CB_W', 'NB', 'DB', 'SS', 'FS', 'LB_S', 'LB_W', 'LB_M', 'DE_S', 'DE_W'];
  for (const d of order) {
    if (!manDefs.includes(d) || spots[d]!.manTarget) continue;
    const role = roles[d] as { kind: 'man'; prefer?: ReceiverRef[]; double?: boolean };
    // A shadow override may take the other corner's #1. That corner must
    // trade to the remaining outside receiver before an interior/box player
    // is asked to cover him; the slot names are not fixed field-side bodies.
    const preferences = role.prefer ?? [];
    const corner = d === 'CB_S' || d === 'CB_W', slotDB = d === 'NB' || d === 'DB';
    // A slot defender covers a detached slot, not an attached end (that is a
    // safety's or backer's man), on either side; a corner does not press a
    // nub end as his #1.
    // Without a slot defender on the field (base), a nub-side corner travels
    // to a detached #2; a nickel or dime is there to cover that slot himself.
    const refs = corner ? [...preferences, 'S1', 'W1', ...(has('NB') || has('DB') ? [] : ['S2', 'W2'])] as ReceiverRef[]
      : slotDB ? [...preferences, 'S2', 'W2', 'S3', 'W3'] as ReceiverRef[] : preferences;
    // ...only when a box player or safety in man is there to take that end or
    // back; otherwise (split-field 2-Man to a nub end) the DB keeps him rather
    // than leave him free and cross the formation.
    const boxMan = manDefs.some(m => m !== 'CB_S' && m !== 'CB_W' && m !== 'NB' && m !== 'DB');
    for (const ref of refs) {
      const tgt = off.numbering[ref];
      if (tgt && boxMan && (corner || slotDB) && (off.spots[tgt].inline || off.spots[tgt].backfield)) continue;
      if (tgt && (!taken.has(tgt) || role.double)) {
        spots[d]!.manTarget = tgt;
        taken.add(tgt);
        break;
      }
    }
  }
  // Any uncovered receiver goes to the nearest unassigned man defender.
  for (const [slot] of receivers) {
    if (taken.has(slot)) continue;
    let best: DefSlot | null = null;
    let bestD = Infinity;
    for (const d of manDefs) {
      if (spots[d]!.manTarget) continue;
      // Defensive backs leave an attached end or a back to the box players when one is free.
      const db = d === 'CB_S' || d === 'CB_W' || d === 'NB' || d === 'DB';
      const dd = Math.hypot(spots[d]!.pos.x - off.spots[slot].pos.x, spots[d]!.pos.y - off.spots[slot].pos.y)
        + (db && (off.spots[slot].inline || off.spots[slot].backfield) ? 20 : 0);
      if (dd < bestD) {
        bestD = dd;
        best = d;
      }
    }
    if (best) {
      spots[best]!.manTarget = slot;
      taken.add(slot);
    }
  }
  // Man defenders left without a receiver take the call's underneath seats
  // (rat, robber, lurk) in order, or play robber.
  const spare = manDefs.filter((d) => !spots[d]!.manTarget);
  const seats = [...cov.underneath];
  for (const d of spare) {
    const seat = seats.shift();
    roles[d] = seat ? seatRole(seat) : { kind: 'zone', zone: 'robber' };
  }

  // Pre-snap: man defenders align on their man.
  for (const d of manDefs) {
    const t = spots[d]!.manTarget;
    if (!t) continue;
    const tp = off.spots[t].pos;
    const isCorner = d === 'CB_S' || d === 'CB_W' || d === 'NB' || d === 'DB';
    // A back on the ball has no inside: the defender shades from his own
    // side of it, not from a fixed side of the field (which flipped the
    // backers' sides with the offense's orientation).
    const inside = Math.sign(off.ballY - tp.y) || Math.sign(spots[d]!.pos.y - tp.y) || s;
    const mr = roles[d] as Extract<CoverageRole, { kind: 'man' }>;
    const press = (mr.press ?? cov.press) && !mr.overTop;
    const depth = off.spots[t].backfield ? 5 : mr.overTop ? 10 : isCorner ? (press ? (DEF_ALIGN ? 1.3 : 1.2) : 6) : 4;
    const shade = mr.lev === 'outside' ? -inside : mr.lev === 'head' ? 0 : inside;
    // DEF_ALIGN: a corner presses about head-up, plays the called shoulder
    // from off, and takes the inside against a receiver near the sideline.
    const room = Math.min(tp.y, FIELD_WIDTH - tp.y);
    const offset = DEF_ALIGN && isCorner && !off.spots[t].backfield
      ? (room < 9 ? inside * 0.2 : press ? -inside * 0.15 : shade * (mr.lev === 'outside' ? 0.5 : 0.2))
      : shade * 0.7;
    spots[d]!.pos = { x: los + depth, y: clamp(tp.y + offset, 1, FIELD_WIDTH - 1) };
    spots[d]!.press = press && isCorner && !off.spots[t].backfield;
  }

  // Calls that set a pre-snap depth for a seat (a rotating safety cheated
  // down, an inverted corner pressed to bail) keep his lateral alignment.
  for (const slot of present) {
    const r = roles[slot];
    if (r?.kind === 'zone' && r.depth !== undefined && spots[slot]) spots[slot]!.pos = { x: los + r.depth, y: spots[slot]!.pos.y };
  }

  // Finalize roles and zone ids.
  for (const slot of present) {
    const r = roles[slot]!;
    spots[slot]!.role = r;
    if (r.kind === 'zone' || r.kind === 'man') {
      const spot = spots[slot]!;
      spot.pos.x = los + coverageDepth(los, spot.pos.x - los);
    }
    if (r.kind === 'zone') spots[slot]!.zone = r.zone;
    if (r.kind === 'blitz') {
      spots[slot]!.gap = r.gap;
      spots[slot]!.gapSign = r.side === 'S' ? s : -s;
    }
  }

  // SLOT_LEV (experimental, off): a slot defender's zone spot comes from the
  // seat he is finally given. Placed before roles were assigned, he took the
  // no-role default (hook: 4.5 yd, 0.5 inside) even as a curl-flat or flat
  // player; NFL zone DBs over a slot stand +0.2 outside in Cover 3, -0.1 in
  // Cover 2 and Quarters (scripts/diag/align/overtwo.py).
  if (SLOT_LEV && DEF_ALIGN) for (const slot of ['NB', 'DB'] as DefSlot[]) {
    const sp = spots[slot], r = roles[slot];
    if (!sp || r?.kind !== 'zone' || r.depth !== undefined) continue;
    const near = (['S2', 'W2', 'S3', 'W3'] as ReceiverRef[]).map(ref => off.numbering[ref]).filter((t): t is NonNullable<typeof t> => !!t)
      .map(t => off.spots[t]).filter(o => o && !o.inline && !o.backfield && Math.abs(o.pos.y - sp.pos.y) <= 1.5)
      .sort((a, b) => Math.abs(a.pos.y - sp.pos.y) - Math.abs(b.pos.y - sp.pos.y))[0];
    if (!near) continue;
    const out = Math.sign(near.pos.y - off.ballY) || 1, z = zoneSpot(r.zone, true);
    sp.pos = { x: los + coverageDepth(los, z.depth), y: clamp(near.pos.y + out * z.shade, 1, FIELD_WIDTH - 1) };
  }
  // TIGHT_OFF (experimental, off): a defensive back over a tight #2 (an
  // inline end or a man within 3.5 yd of his tackle) plays off him, not in
  // press: with the line and the formation's traffic inside, the reduced
  // split leaves no room to jam and plays through him as the run's force.
  // NFL DBs over a tight #2 stand 3.2 / 4.5 / 6.5 yd deep (p25/50/75), 10%
  // pressed; ours pressed 39% (scripts/diag/align/overtwo.py). A blitzer keeps his spot.
  if (TIGHT_OFF) {
    const tackles = (['LT', 'RT'] as const).map(t => off.spots[t]?.pos.y).filter((y): y is number => y !== undefined);
    const tight = (['S2', 'W2'] as ReceiverRef[]).map(ref => off.numbering[ref]).filter((t): t is NonNullable<typeof t> => !!t)
      .map(t => off.spots[t]).filter(sp => sp && !sp.backfield && (sp.inline || Math.min(...tackles.map(y => Math.abs(sp.pos.y - y))) < TIGHT_SPLIT));
    for (const slot of present) {
      const sp = spots[slot];
      if (!sp || !/^(CB|NB|DB|SS|FS)/.test(slot) || sp.role.kind === 'blitz' || sp.pos.x - los >= 2) continue;
      if (tight.some(r => Math.abs(r.pos.y - sp.pos.y) <= 1.5)) { sp.pos = { x: los + TIGHT_OFF_DEPTH, y: sp.pos.y }; sp.press = false; }
    }
  }
  // SHORT_PACKAGE: the Bear's Sam is on the line outside the attached end
  // ("Dubs" 9; HonestNFL HNFL-129), whatever he covers after the snap.
  if (SHORT_PACKAGE && desc.alignment.frontRules.includes('samBearEnd') && spots.LB_S && teAt(fs))
    spots.LB_S.pos = { x: los + (frontSlots.DE_S?.depth ?? .9), y: off.ballY + fs * techniqueOffset('9', true, off.line) };
  // Off the ball, two players do not stand on one spot: whoever is inside
  // 0.9 yd of a teammate already there steps aside. The several placement
  // rules above each pick their own spot; this keeps their landmarks and gives
  // the later one the next patch of grass: outward, away from the ball, unless
  // that would carry a man defender across his man (his called leverage, the
  // side of the receiver he aligned on), at any step. Then he keeps his
  // landmark and stacks a step deeper, as man defenders do over a bunch or
  // stack.
  const settled: DefSlot[] = [];
  for (const slot of [...present].sort((a, b) => Math.abs(spots[a]!.pos.y - off.ballY) - Math.abs(spots[b]!.pos.y - off.ballY))) {
    const p = spots[slot]!.pos, t = spots[slot]!.manTarget && !off.spots[spots[slot]!.manTarget!].backfield
      ? off.spots[spots[slot]!.manTarget!].pos : null;
    const lev = t ? Math.sign(p.y - t.y) : 0;
    const keeps = (y: number) => !lev || Math.sign(y - t!.y) === lev;
    let dir = 0;
    if (p.x - los > 2) for (let k = 0; k < 4; k++) {
      const near = settled.find((o) => Math.hypot(spots[o]!.pos.x - p.x, spots[o]!.pos.y - p.y) < .9);
      if (!near) break;
      const q = spots[near]!.pos, out = Math.sign(p.y - off.ballY) || Math.sign(p.y - q.y) || s;
      const aside = (d: number) => clamp(q.y + d * Math.sqrt(Math.max(0, .81 - (p.x - q.x) ** 2)) + d * .01, 1, FIELD_WIDTH - 1);
      // Each step re-checks the leverage: a second teammate further out can
      // make the next outward step cross the man even when the first did not.
      if (dir !== 2) dir = keeps(aside(dir || out)) ? dir || out : 2;
      if (dir === 2) p.x = q.x + Math.sqrt(Math.max(0, .81 - (p.y - q.y) ** 2)) + .01;
      else p.y = aside(dir);
    }
    settled.push(slot);
  }
  // Box count: defenders within the tackle box area at snap.
  let box = 0;
  for (const slot of present) {
    const p = spots[slot]!.pos;
    if (p.x - los < 7.5 && Math.abs(p.y - off.ballY) < 6) box++;
  }
  const rushers = present.filter((p) => spots[p]!.role.kind === 'rush' || spots[p]!.role.kind === 'blitz');
  // BLITZ_CREEP (experimental, off): a backer with a blitz assignment stands
  // where tracked rushers stand, walked up to time the snap, instead of at
  // the front's backer depth, walked toward the gap he will shoot: an A or B
  // gap blitzer over the gap, a C or D gap blitzer outside the tackle. It
  // shows the pressure: the offense sees him up. Tracked shallow backers on
  // zone runs stand outside the tackles (42%), over an uncovered lineman
  // (32%) or in a gap (17%), rarely stacked behind a down lineman (9%).
  // NFL box backers who rush stand a median 2.26 yd deep on passes and 2.47
  // on runs at the snap frame (p75 3.3; non-rushers 4.45-4.62); ours blitzed
  // from 4.6 and never stood shallower than 4.0.
  if (BLITZ_CREEP) for (const slot of blitzers) {
    const sp = spots[slot];
    if (sp && slot.startsWith('LB') && sp.pos.x - los > CREEP_DEPTH) sp.pos = { x: los + CREEP_DEPTH, y: gapY(off, sp.gap, sp.gapSign) };
  }
  // ALIGN_HABIT (experimental, off): an off-ball defender stands where his
  // own habit and this snap put him, not on the exact landmark: a personal
  // depth habit plus per-snap placement scatter (PlaySim draws both). NFL
  // off-ball backers: depth sd 0.91, between players 0.41, within a player 0.78
  // (scripts/diag/align); ours stood on one spot (4.6 / 4.6 / 5.0 at p25/50/75).
  // Front men, pressed backs and blitzers keep their spots.
  if (style.scatter) for (const slot of present) {
    const sp = spots[slot], j = style.scatter[slot];
    if (!sp || !j || sp.press || sp.role.kind === 'blitz' || sp.pos.x - los <= 2) continue;
    sp.pos = { x: los + Math.max(2.2, sp.pos.x - los + j.x), y: clamp(sp.pos.y + j.y * (MIRROR_SCATTER ? scatterSide(off, sp.pos.y) : 1), 1, FIELD_WIDTH - 1) };
  }
  return { spots, rushers, coverage: cov, boxCount: box };
}

/**
 * Disguised coverage: roles, man matchups and landmarks come from the real
 * call; the secondary and off-ball linebackers stand where the shown coverage
 * would put them and rotate at the snap. Linemen and blitzers align as played.
 * Press only survives if both looks press (you can't jam from 7 yards).
 */
function alignDisguisedFromDescription(desc: DefenseDescription, off: OffenseAlignment, present: DefSlot[], prefs: ManPreference, style: AlignStyle): DefenseAlignment {
  const played = alignDefenseFromDescription({ ...desc, shown: undefined }, off, present, prefs, style);
  const look = alignDefenseFromDescription(shownLook(desc), off, present, prefs, style);
  for (const slot of present) {
    const p = played.spots[slot]!;
    const l = look.spots[slot];
    if (!l || p.role.kind === 'rush' || p.role.kind === 'blitz') continue;
    if (p.role.kind === 'man' && p.manTarget) {
      // Present a cushion without swapping the player's actual matchup to
      // the opposite side of the field. A shadow corner changes sides with
      // his receiver; a zero safety cannot disguise twelve yards away from
      // a detached man and pretend the rotation costs nothing.
      const target = off.spots[p.manTarget];
      const corner = slot === 'CB_S' || slot === 'CB_W' || slot === 'NB' || slot === 'DB';
      const depth = target.backfield ? 5 : p.role.overTop ? 10 : corner ? 6 : 4;
      // SHELL_SHOW: a man safety may show the deep look and come down at the
      // snap, paying for it with his own feet (tracked: Cover 1 shows two
      // high 26% of dropbacks, Cover 0 shows someone deep 36%), when that
      // spot is on his man's side of the ball and within 8 yd of him.
      const side = (y: number) => Math.sign(y - off.ballY);
      if (SHELL_SHOW && (slot === 'FS' || slot === 'SS') && l.pos.x - off.los > 8
        && side(l.pos.y) === side(target.pos.y) && Math.abs(l.pos.y - target.pos.y) <= 8)
        p.pos = { x: Math.min(l.pos.x, off.los + coverageDepth(off.los, 12)), y: l.pos.y };
      else p.pos = { x: Math.min(l.pos.x, off.los + coverageDepth(off.los, depth)), y: p.pos.y };
    } else p.pos = { ...l.pos };
    p.press = !!p.press && !!l.press;
  }
  let box = 0;
  for (const slot of present) {
    const q = played.spots[slot]!.pos;
    if (q.x - off.los < 7.5 && Math.abs(q.y - off.ballY) < 6) box++;
  }
  return { ...played, boxCount: box };
}
