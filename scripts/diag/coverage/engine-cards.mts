// Engine assignment cards in the agreed template (Coverage with Rules, 2026-11-23; reads only): one card per
// coverage × seat, rows 1-11, each row what our code makes him do, with file:function, "none" where no code exists.
// The seat's role comes from the catalog (src/playbook/coverages.ts); the row text comes from the rule, zone and man
// technique sections of docs/reviews/2026-11-23-coverage-cards-engine.md (sections E1-E4), keyed by role kind, zone
// and rule. Develop 0226f0d3, flags at their defaults.
// usage: node --import tsx scripts/diag/coverage/engine-cards.mts > out/engine-cards.md   (run from the checkout root)
import { COVERAGES } from '../../../src/playbook/coverages.js';

const FAMILY_ORDER = ['cover4', 'cover6', 'cover3', 'cover2', 'tampa2', 'cover0', 'cover1', 'cover2man'];
const famOf = (id: string, fam?: string) => (id === 'deuce' || id === 'deuce_dot') ? 'deuce' : fam ?? id;

/** Row 7 (eyes): ZONE_EYES keyRefs (src/sim/zone-eyes.ts:keyRefs) for 0.9 s, then the QB; man: his body facing only. */
function eyes(zone: string): string {
  const side = zone.endsWith('_w') || zone.includes('_w_') ? 'W' : 'S';
  let key: string;
  if (zone.startsWith('flat') || zone.startsWith('curl_flat')) key = `${side}2, else ${side}1`;
  else if (zone.startsWith('hook_s') || zone.startsWith('hook_w')) key = `${side}3, else ${side}2`;
  else if (zone === 'hook_mid' || zone === 'hole' || zone === 'robber' || zone.startsWith('curl')) key = 'S3, else S2 (the strong side, whatever his zone side)';
  else if (zone.startsWith('deep_third') || zone.startsWith('deep_half') || (zone.startsWith('quarter') && zone.endsWith('out'))) key = `${side}1, else ${side}2`;
  else if (zone.startsWith('quarter')) key = `${side}2, else ${side}1`;
  else key = 'S2, else W2';
  return `head on ${key} for 0.9 s (ZONE_EYES), then the QB as he sees him; on a believed release, the receiver his shoulder read picks (zone-eyes.ts:keyRefs/zoneEyesTarget; head.ts:stepHeads)`;
}
const DEEP = (z: string) => /^(deep_|quarter_|tampa_mid)/.test(z);

/** Row 5/6/8/10c per rule: the short form of section E2 (rules.ts). */
const RULE: Record<string, { job: string; rel: string; off: string; back: string }> = {
  c3_corner: { job: '#1 only. #1 shallow (deepest ≤ 5) under/in → his deep third (latched after 0.35 s); shallow stop/out/flat → deep third while shallow; anything else (none, vertical, block, any stem past 5) → man #1, outside, overTop, protectDepth (rules.ts:c3Corner, zoneOffOne)', rel: 'man outside over the top; no cushion set by the rule (ManCoverage: E3)', off: 'releases #1 under/in/stop/out to his zone; "find #2 high" in the comment is not implemented; no rule reads #1 for him, only a rule hook\'s cutWall window (CUT_WALL) when #1 crosses it: one-sided', back: 'none' },
  c3_curl_flat: { job: '#2 (else the back to his side), #1, #3. Push (latched): #3/back fast flat (< 2 yd deep) with #2 not out/flat → man #3 overTop. Smash (latched): #1 shallow stop with #2 vertical → man #1. Undeclared #2 → read. #2 vertical ≤ 12 → man #2 inside; past 12 → delivered (latched zone) if a cap is seen. #2 out/flat → man #2 outside overTop. #2 in/under: #3 away → carry across, else zone. #2 stop/block → zone (rules.ts:seamCurlFlatDeclared)', rel: 'inside on the vertical carry; outside over the top on the out', off: 'delivers the seam at 12 yd only on sight of a cap (any defender); #2 in/under with #3 not away → zone, picked up only by a rule hook\'s cutWall if under ≤ 7, no taker for an in; Push leaves #2 (hook takes him only if it read #2 vertical); Smash coordinated with the corner on #1 stop', back: 'B/B2 via backTo: the first back with a non-none, non-block release to his side, B before B2 (rules.ts:backTo)' },
  c3_seam: { job: 'as c3_curl_flat with carry = 99: carries #2 vertical indefinitely, never delivers (rules.ts:seamCurlFlat)', rel: 'as c3_curl_flat', off: 'as c3_curl_flat, without the 12-yd delivery', back: 'as c3_curl_flat' },
  c3_hook: { job: '#3 (else the back to his side), #2. Push (latched) with the curl-flat: #3 fast flat and #2 vertical < 12 → man #2 inside to 15. #3 vertical ≥ 3 → man #3 inside to 15 (not latched). Else cutWall (unders ≤ 7 within ±5 of his landmark), then zone (rules.ts:c3Hook)', rel: 'inside to 15 yd; crossWall at his window depth', off: 'releases #2/#3 at 15 to zone (deep middle by geography); #3 breaking in at 7-14 yd falls out of the carry and cutWall ignores ins: nobody by rule', back: 'back to his side as #3; a back released straight up counts to the +y side (reads.ts outSign default)' },
  mike_3: { job: 'B only. B vertical, in, or under past 1.5 → man B inside to 15 (then latched zone). Else cutWall. Cover 4/6 only: widen to hook_s/w when B goes flat 2+ yd outward (APEX_LEVERAGE bit 4). Else hook_mid (rules.ts:mike3, mikeWiden)', rel: 'inside on the back', off: 'B\'s angle/under ≤ 7 → crossWall from hook_mid ±5 then zone (CUT_WALL); B vertical at 15 → zone: one-sided', back: 'B only, never B2' },
  q_corner_mod: { job: '#1. With a #2 on his side: #1 shallow under/in → quarter_out zone (latched after 0.35 s); shallow stop/out/flat → zone while shallow. Without #2: only under/in. Else man #1 outside, protectDepth (rules.ts:qCorner, zoneOffOne)', rel: 'outside leverage; no cushion in the rule', off: 'hands #1\'s shallow break to the apex only when the apex\'s own oneShallow(#1) holds and #2 is not flat/quick out; the safety is free on a #1 shallower than 7 (ROB_COMMIT bit 4): with #2 to the flat, #1 is nobody\'s', back: 'none' },
  q_corner_meg: { job: 'man #1 outside, every release; exempt from the pass-under (rules.ts:qCorner)', rel: 'outside leverage', off: 'none (man)', back: 'none' },
  q_safety: { job: '#2, #1. SCREW: run read and #2 up/out/undeclared → man #2 overTop outside. #2 vertical ≥ 7 → two (latched): man #2 overTop inside. #2 declared out/flat/under/in/stop → one (latched): helpOne(#1) (over the top on a vertical, rob an in/under/stop/out at 7+, free under 7). No #2: man #1 if climbing (rules.ts:qSafety, helpOneCommitted)', rel: 'over the top of #2 or #1; rob in the QB-#1 lane', off: 'coordinated with the apex on #2\'s seam (apex walls to 10, safety takes at 7) and with the corner on #1 deep; free on #1 under 7 yd', back: 'none' },
  q_apex: { job: '#2, #1, #3/back. flat3 (latched): #2 vertical ≥ 10 at vx > 3 with #3/back flat → man on the flat runner. Palms/Deuce: #2 flat/out → man #1 in/under < 14, else curl zone. flat (latched): #2 quick out → man #2 overTop. one (latched): MOD corner and #1 shallow, #2 not flat → man #1. two (latched): #2 under ≤ 7 with #3 away → man #2 head-up. Else wallTwo: read, wall #2 level 2-10 yd, zone (latched) on any break or at 10 (rules.ts:quarterFlat, quarterFlatTaught, wallTwo)', rel: 'walls #2\'s seam level or 1 yd outside; 9-yd cushion over a committed flat back (techniques.ts:Wall)', off: 'seam to the safety at 7-10: coordinated; #2 under with #3 not away → zone, cutWall by the Mike only; his man on a #1 under is rewritten by the pass-under: one-sided', back: 'a #3/back flat is his only after #2 reaches 10 yd vertical (flat3)' },
  palms_corner: { job: '#2 quick out (not zoned) → trap #2 (latched). Else MOD on #1 with china; his zone-off zone is his nominal zone (flat in Deuce) (rules.ts:palmsCorner)', rel: 'trap: outside-in on #2\'s catch point (techniques.ts:Trap)', off: 'gives #1 to palms_safety on the same quick-out cue: coordinated, but the safety starts 15-17 yd deep', back: 'none' },
  palms_safety: { job: '#2 quick out → one (latched): man #1 overTop outside. #2 vertical ≥ 7 → two (latched): man #2 overTop inside. #2 under/in/stop (or block on a pass) → helpOne(#1). Else zone (rules.ts:palmsSafety)', rel: 'over the top', off: 'coordinated with the Palms corner', back: 'none' },
  cloud_corner: { job: 'SQUAT_TOPDOWN: a flat threat (#2/#3/back flat, or out < 6 not climbed) with a high threat (#1 vertical, or a climbed out < 15) → man on the high threat, inside, trail; a flat threat alone → flat zone; no flat threat → flat zone (rules.ts:squatTopDown)', rel: 'sinks under the high threat, trailing from inside, to 15 yd', off: 'releases the vertical at 15 to the half safety (a plain zone): one-sided', back: 'a back to the flat is a flat threat' },
  sink_corner: { job: 'as cloud_corner, and with no flat threat once #2/#3 and #1 have declared → man #1 outside, trail (sink). Re-read every tick (rules.ts:squatTopDown)', rel: 'sinks under #1 trailing; flips man/zone as labels change', off: 'releases #1 at 15 to the half safety: one-sided; on Smash with a flat he takes the flat and the hitch is nobody\'s', back: 'a back to the flat is a flat threat; a wheel (first flat, now vertical past 7) → man overTop (latched)' },
  c2_hook: { job: '#2, #1 (C2_APEX). Undeclared → read #2. #2 vertical → wall inside to 10 (with a seen cap) / 15, then handed (latched) to hook. #2 in < 14 → man #2 inside. #2 out after climbing → man #2 trail. #2 out low or flat → curl: man #1 in/under < 14, else curl zone. under/stop/block → hook (rules.ts:verticalCurlTaught)', rel: 'walls the seam to 10-15 yd', off: 'seam to the half safety on sight of a cap: sight-conditional; #2 under → cutWall, then zone: one-sided', back: 'none' },
  vertical_hook: { job: 'strength #3 vertical ≥ 3 → three (latched): man inside trail to 18, then zone; else mike_3 (rules.ts:verticalHook)', rel: 'trail inside on #3', off: 'releases #3 at 18 to the halves: one-sided', back: 'as mike_3' },
  tampa_mike: { job: 'TAMPA_PIPE: exactly one vertical (≥ 4) in the pipe, field centre ±4 yd (not the ball) and < 20 deep → man inside trail (latched); none or two → zone tampa_mid at the ball, 13 deep (rules.ts:tampaPipe)', rel: 'trail inside the pipe runner', off: 'none; seams outside the pipe are the hook\'s wall then the halves', back: 'none' },
  poach_safety: { job: 'the other side\'s #3 and his own #1. #3 vertical ≥ 6 → three (latched): man overTop inside. #3 any other release, including block → x (latched): helpOne(#1) (rules.ts:poachSafety)', rel: 'over the top', off: 'coordinated with read_hook on #3\'s vertical (6 vs 8); a block-then-release #3 latches x and #3 deep is nobody\'s', back: 'none' },
  read_hook: { job: '#3 and the back to his side. four (latched): a back flat/out < 3 deep with a #3 → man the back. #3 vertical < 8 → wall; ≥ 8 → zone (latched). #3 under/in/stop < 8 → three (latched) man head-up. #3 flat/out → zone (latched). Then cutWall, zone (rules.ts:readHook)', rel: 'walls #3 to 8; head-up on #3 under', off: '#3 vertical to poach/stubbie at 8: coordinated; #3 flat/out: zone, expecting the apex (flat3) or mush, neither guaranteed (F09); his man on a #3 under ≤ 7 is rewritten by the pass-under', back: 'four latches on any back flat/out with a #3, abandoning #3' },
  mush: { job: 'Book (MUSH_TRAP): #3 flat/out < 5 → trap #3; MUSH_MATCH: #2 flat/out with #3 not out/flat → man #2 outside (latched). #3 cancels or #2 shallow ≤ 5 → zone (latched). Undeclared → read. Else man #2 inside. Exempt from the pass-under (rules.ts:mush)', rel: 'trap / man on #2', off: '#2 shallow under/stop/in at ≤ 5 → zone, no rule reads #2: one-sided', back: 'none' },
  stubbie_safety: { job: '#3 vertical ≥ 6 → three (latched) man overTop inside. #3 cancelled and #2 vertical ≥ 6 → two (latched). Cancelled and #2 in/stop → rob #2. Else zone (rules.ts:stubbieSafety)', rel: 'over the top / rob', off: 'coordinated with read_hook on #3\'s vertical', back: 'none' },
  box_out_low: { job: 'bunch #1-#3: the first out/flat → locked man inside overTop (rules.ts:box, settle)', rel: '-', off: 'pickup by release area, locked for the play; a stop is in no pool; the second out has no taker', back: 'none' },
  box_in_low: { job: 'bunch #1-#3: the first under/in → locked man head-up; exempt from the pass-under (BOX_IN) (rules.ts:box)', rel: '-', off: 'as box_out_low; the second in has no taker', back: 'none' },
  box_out_deep: { job: 'the first vertical past 5 in count order → man outside overTop; locks past 10 (rules.ts:box)', rel: '-', off: 'a single vertical gets both deep defenders; a deep receiver breaking before 10 unlocks and is nobody\'s', back: 'none' },
  box_in_deep: { job: 'the last vertical past 5 → man inside overTop; locks past 10 (rules.ts:box)', rel: '-', off: 'as box_out_deep', back: 'none' },
  area_flat: { job: '#2/#3: the first out/flat → locked man inside overTop; else #1 shallow → man #1; else zone (rules.ts:area)', rel: '-', off: 'his man on a #1 under is rewritten by the pass-under; stops are in no pool', back: 'none' },
  area_hook: { job: '#2/#3: the first under/in < 10 → man head-up (locked after 0.35 s); else #3 vertical 2-10 → wall; else cutWall, zone (rules.ts:area)', rel: 'wall / head-up', off: 'his man on an under ≤ 7 is rewritten by the pass-under; hook_mid is a plain seat: one-sided', back: 'none' },
  topper: { job: 'exactly one of #2/#3 deep → locked man inside overTop; two deep → zone (rules.ts:area)', rel: 'over the top', off: 'with #2 and #3 both vertical he zones', back: 'none' },
  banjo_out: { job: 'the first of #1/#3 out/flat (else the other of the first in-breaker, else #1) → man outside after both declare; read before. No #3 → man #1 (rules.ts:banjo)', rel: '-', off: 'coordinated logic from each man\'s own reads (0.12-0.19 s confirmation); man: false, so a shallow under ≤ 7 is rewritten by the pass-under; no #3 puts both banjo players on #1', back: 'none' },
  banjo_in: { job: 'the other of #1/#3 → man inside after both declare. No #3 → man #1 (rules.ts:banjo)', rel: '-', off: 'as banjo_out', back: 'none' },
  clue_corner: { job: '#2 under/in/out/flat/stop/block → one (latched): man #1 outside. #2 vertical past 5 with #1 declared not vertical → two (latched): man #2 overTop. No #2 → man #1. Else zone (rules.ts:clueCorner)', rel: 'outside', off: 'none; the bunch underneath seats are spot drops; #3 is read by no rule on that side', back: 'none' },
  three_rec_hook: { job: 'strength #3: vertical or in ≥ 5 → three (latched) man inside to 18 or under the LB level; other release → zone. Then B within 8 yd laterally with any release → four (latched) man inside (rules.ts:threeRecHook)', rel: 'inside', off: '#3 under/stop to bonus_hook: coordinated, but bonus\'s man on an under ≤ 7 is rewritten by the pass-under; four can latch on a back releasing away', back: 'B only' },
  bonus_hook: { job: 'strength #3 under/in/stop < 9 → man head-up (not latched); else cutWall, zone (rules.ts:bonusHook). In deuce_dot hook_w he still keys strength #3', rel: 'head-up', off: 'man on an under ≤ 7 rewritten by the pass-under: one-sided; deuce_dot: the weak side has no rule reader', back: 'none' },
  invert_safety: { job: 'wallTwo(12); no coverage in the catalog uses it (rules.ts:invertSafety)', rel: '-', off: '-', back: '-' },
  rat: { job: 'jumps the nearest under ≤ 7 yd moving laterally toward the hole within 8 yd of it and 9 of him, man head-up; drops him 8 yd past or at 8 deep; exempt from the pass-under (rules.ts:runRule rat → cut with area)', rel: 'head-up on the crosser', off: 'none', back: 'a back on an under qualifies' },
  robber: { job: 'plain zone robber; the rule adds nothing (rules.ts:runRule)', rel: 'see E1 (zone robber)', off: 'none', back: 'none' },
};

/** Rows 5/6/8 for a plain (unruled or spot) zone seat: section E1. */
function zoneRows(z: string, spotNote: string): { job: string; rel: string; off: string } {
  if (z.startsWith('deep_third')) return { job: `landmark 16 deep, 10.4 from the sideline; plays the deepest vertical in his outer-third band; once his #1 is vertical only #1 (and #2 when in his third, OWNED_FIX) count, every other vertical drops out of his set (defense.ts:ZoneCoverage deep branch)${spotNote}`, rel: 'cushion 1.6 + 0.16·vx − 0.6·anticipation over the receiver, inside shoulder (CUSHION_BREAK); turns on a broken cushion; pattern-drive on a stopped #1 in match style', off: 'none (no zone hand-off in ZoneCoverage); a #3 seam or wheel beside #1 is outside his set' };
  if (z.startsWith('deep_half')) return { job: `landmark 15 deep, 13.5 from the sideline; HALF_KEY keys #1 to #2 by alignment numbering (vertical vs cancel), lateral aim a weighted mix of the verticals in his half; SAFETY_DEPTH depth over the deepest${spotNote}`, rel: 'splits two verticals at the midpoint; one vertical: cushion and shoulder as the third', off: 'none' };
  if (z === 'deep_mid') return { job: `landmark 15 deep at the ball; band ≈ middle third ± 3; splits the two deepest verticals; a third is not split${spotNote}`, rel: 'depth over the deepest; QB-look lean', off: 'none; a vertical beyond ≈ 14.8 yd from the far sideline is in nobody\'s deep band' };
  if (z === 'tampa_mid') return { job: 'landmark 13 deep at the ball; band ±7', rel: 'as deep_mid', off: 'none' };
  if (z.startsWith('quarter')) return { job: `landmark ${z.endsWith('out') ? '13 deep, 8 from the sideline; owns his #1' : '12 deep, ball ±7; owns his #2'}; if the owned receiver is not vertical he plays the deepest vertical in his band${spotNote}`, rel: 'cushion and shoulder as the third; breaks on the load like an underneath man (not DEEP_GATE)', off: 'none' };
  if (z.startsWith('curl_flat')) return { job: `landmark 8.5 deep, ≈ 12 outside the ball (+2.5 deeper in spot); match style: seam carry of a climber 2-10 yd within 6 of the landmark, CURL_FLAT_BACK widen to a back/#3 showing outside, lane pick (82% of QB→receiver), two-man curl/flat expand with no #3; spot style: drop, then only the QB's eyes move him${spotNote}`, rel: 'never deeper than 0.5 yd in front of his pick; carry ends at 10 yd', off: 'none; the carry ends at 10 yd with nobody told' };
  if (z.startsWith('flat')) return { job: `landmark 4 deep, 9 from the sideline; FLAT_CARRY (#1 cancelled → carry the flat route from on top/outside until capped), FLAT_SINK (sink under a climber at his depth), else lane pick${spotNote}`, rel: 'flat-carry 0.5 on top, 0.7 outside; flat-sink 1 under, 0.7 inside', off: 'none (flat-sink → flat and capped flat-carry are his own decisions)' };
  if (z.startsWith('hook') || z.startsWith('curl')) return { job: `landmark ${z === 'hook_mid' ? '10.5 at the ball' : z.startsWith('curl') ? '11 deep, ≤ 9 outside' : '10 deep, ball ±5'}; seam carry to 13 yd, lane pick, hook-stem-read holds depth over a climbing stem${spotNote}`, rel: 'lane between QB and receiver', off: 'none; carry ends at 13 yd; band membership re-decided every tick (ZONE_HOLD bit 1 off)' };
  if (z === 'robber' || z === 'hole') return { job: `landmark ${z === 'hole' ? '6' : '11'} deep at the ball; same underneath branches as the hook (no robber-specific code)`, rel: 'lane pick', off: 'none' };
  return { job: `landmark ${z}`, rel: '-', off: 'none' };
}

const ROW1_ZONE = (slot: string, z: string, depth?: number) => `${slot.startsWith('CB') ? 'corner: zone spot by landmark (flat 4, half 8.2, third/quarter-out 7.3), sideline shade' : slot === 'NB' || slot === 'DB' ? 'slot DB: over a detached #2 (SLOT_LEV re-places to his seat), else apex 6.5 wide, 5 deep' : slot === 'FS' || slot === 'SS' ? (DEEP(z) ? 'safety: two-high 12-14 deep (quarters 12), one-high post 14.5' : 'safety down: 4.4-5.8 deep by TE/QB') : 'backer: front table 4.3-4.8 deep; apex walk-out in zone calls'}${depth !== undefined ? `; call sets depth ${depth}` : ''} (alignment.ts:alignDefense)`;
const ROW1_MAN = (slot: string, press: boolean) => `man: ${press ? 'press 1.2-1.3, just outside head-up (corners, slot DBs)' : 'off 6 (corners), slot 4.5, backs 5'}; TIGHT_OFF 4.5 over a tight #2 (alignment.ts:alignDefense man re-align)`;
const ROW2 = (slot: string) => `Recognition (recognition.ts): ${slot.startsWith('LB') ? 'LB keys OL 1.0, pull 1.0, QB 0.8, RB 1.0, WR 0' : slot === 'FS' || slot === 'SS' ? 'S keys OL 0.8, QB 0.6, RB 0.4, WR 0.7, scaled down with depth' : 'CB/NB/DB keys WR 1.4, QB 0.3, OL 0.2, RB 0.2'}; commits after his observation delay on a filtered pass probability; sticky on a seen throw`;
const ROW3 = (slot: string, z?: string) => z && /^(flat|curl_flat)/.test(z) ? 'force on his side (run-fits.ts:buildRunFits: flat 0, curl-flat 1), gap D, ≈ 2.5 yd off the LOS outside the end man at 0.9 speed (executeRunFit force)' : slot.startsWith('LB') ? 'insert: gap landmark 2.25 yd (run-fits.ts:executeRunFit insert, GAP_MATCH)' : 'alley: aim max(5, align−1) deep at the back\'s y +1.2, speed 0.65 (run-fits.ts:executeRunFit alley)';
const ROW4_ZONE = 'a zone/match seat goes to his run fit the moment his read commits run (defense.ts:ZoneCoverage.zonePlay; techniques.ts:Technique.update); no depth floor, no pass-first hold, no landmark leash; back only on a run→pass flip or a seen throw; no hand-off of his vacated zone';
const ROW4_MAN = 'PASS_FIRST: a man defender on a detached receiver stays on him on a run read; on a back, he leaves only when he sees him carrying or blocking (defense.ts:ManCoverage.coverMan)';
const ROW9_DEEP = 'DEEP_GATE: held deep seats break only on the ball seen (+ reaction); the arm does nothing (defense.ts:playsThrow, playBelievedBall)';
const ROW9_UNDER = 'keys the QB: plants on the load, breaks on the seen delivery to the receiver the passer\'s shoulders point at (25°, with error), else on the ball (defense.ts:believesThrow, underneathPlant, shoulderTarget)';
const ROW9_MAN = 'true ball-in-air gate, then his man\'s hands cue or the ball seen + reaction; with a seen delivery he may run to the receiver the shoulders point at, not necessarily his man (defense.ts:ManCoverage.update, playBelievedBall)';
const ROW10B = 'MotionRuntime (motion.ts): re-installs the call every 0.2 s on a 0.3 s-old picture (checks re-run), walks defenders at ≤ 0.75 vmax, exchanges jobs by least squared distance (corners keep sides; deep jobs to safeties); man calls lock the motion man 51-69% by type; nothing after the snap (no renumbering; ReleaseReader.sideNow unused)';

function card(c: any, slot: string, r: any): string[] {
  const rows: [string, string, string][] = [];
  const checks = [...(c.structureChecks ?? []).map((s: any) => `${s.when.join('+')} → ${s.to.join('/')}`), ...Object.entries(c.checks ?? {}).map(([k, v]: any) => `${k} → ${v.join('/')}`)];
  const r10a = checks.length ? `call checks: ${checks.join('; ')} (coverages.ts:installCoverage/checkCall); nothing for quads, weak bunch/stack, nub, closed trips, two-back` : 'none for this call (coverages.ts: no checks); seats are landmarks filled by nearest free defender, not matched to the receiver count';
  if (r.kind === 'man') {
    const tech = [r.lev && `lev ${r.lev}`, r.trail && 'trail', r.overTop && 'overTop', r.protectDepth && 'protectDepth', r.double && 'double', r.press && 'press'].filter(Boolean).join(', ');
    rows.push(['1', 'alignment & shell shown', `${ROW1_MAN(slot, !!(r.press ?? c.press) && !r.overTop)}; shell ${c.shell}${c.look ? `, shows ${c.look}` : ''}`]);
    rows.push(['2', 'run/pass key', ROW2(slot)]);
    rows.push(['3', 'run fit', 'his man first; a back seen carrying or a back/inline end blocking → run fit (defense.ts:ManCoverage.coverMan → runFit); DB_SLOWPLAY gives ground on a wide man']);
    rows.push(['4', 'play-action rule', ROW4_MAN]);
    rows.push(['5', 'pass job', `man on ${(r.prefer ?? []).join(' > ') || 'the nearest uncovered receiver'} (alignment.ts man matching)${tech ? `; ${tech}` : ''}; target fixed at the snap`]);
    rows.push(['6', 'relation to threats', 'cushion: press 0.8, off ≤ 5.5 shrinking with depth (CUSHION_NEED); inside/outside 0.7 yd off his line, recomputed from the ball every tick; hips open on a consumed cushion or a crosser and never re-close in man calls (defense.ts:ManCoverage.trackReceiver)']);
    rows.push(['7', 'eyes', 'no look target: his body facing (toward the offense in the pedal, along his run once open); the ball or his man\'s hands are his throw cues']);
    rows.push(['8', 'pass-off', 'none: no switch on crossers, rubs or stacks, no banjo in ManCoverage']);
    rows.push(['9', 'break trigger', ROW9_MAN]);
  } else if (r.kind === 'zone') {
    const z = r.zone as string;
    const ruled = !!r.rule;
    const spotNote = ruled ? '' : '; plain zone (spot or match by the coach\'s matchRate)';
    const zr = zoneRows(z, spotNote);
    const R = ruled ? RULE[r.rule] : null;
    rows.push(['1', 'alignment & shell shown', `${ROW1_ZONE(slot, z, r.depth)}; shell ${c.shell}${c.look ? `, shows ${c.look} (rotates from the shown spot at the snap at his drop pace, slowed until he reads pass)` : ''}`]);
    rows.push(['2', 'run/pass key', ROW2(slot)]);
    rows.push(['3', 'run fit', ROW3(slot, z)]);
    rows.push(['4', 'play-action rule', r.rule === 'q_safety' ? `${ROW4_ZONE}; except SCREW: on a run read with #2 up/out/undeclared he takes #2 over the top (rules.ts:qSafety)` : ROW4_ZONE]);
    rows.push(['5', 'pass job', R ? `${r.rule}: ${R.job}; underneath it, ${z}: ${zr.job}` : `${z}: ${zr.job}`]);
    rows.push(['6', 'relation to threats', R ? R.rel : zr.rel]);
    rows.push(['7', 'eyes', eyes(z)]);
    rows.push(['8', 'pass-off', R ? `${R.off}. CUT_WALL pass-under (coverage/defender.ts:passUnder): his man/wall on an under ≤ 7 becomes a wall from his landmark ±5, then zone${['q_corner_meg', 'mush', 'rat'].includes(r.rule) ? ' (exempt for this rule)' : ''}` : zr.off]);
    rows.push(['9', 'break trigger', DEEP(z) && !z.startsWith('quarter') ? ROW9_DEEP : ROW9_UNDER]);
    if (R) rows.push(['10c', 'back release', R.back]);
  } else {
    rows.push(['1', 'alignment & shell shown', `${r.kind}`]);
  }
  rows.push(['10a', 'formation adj.', r10a]);
  rows.push(['10b', 'motion adj.', ROW10B]);
  if (!rows.some((x) => x[0] === '10c')) rows.push(['10c', 'back release', r.kind === 'man' ? 'a back is a man target through the preference list (B before B2); a back who never releases keeps his defender standing over him (no rush/robber/help branch)' : 'threat sets include backs (ZoneCoverage); no back-specific rule']);
  rows.push(['11', 'notes', '']);
  rows.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]) || a[0].localeCompare(b[0]));
  return [`### ${c.id} × ${slot}`, '', '| # | field | rule | file:function |', '|---|---|---|---|',
    ...rows.map(([n, f, t]) => { const m = t.match(/\(([^()]*(?:\.ts|keyRefs)[^()]*)\)\s*$/); return `| ${n} | ${f} | ${m ? t.slice(0, m.index).trim() : t} | ${m ? m[1] : '-'} |`; }), ''];
}

const out: string[] = [];
const fams = [...new Set(COVERAGES.map((c) => famOf(c.id, c.family)))].sort((a, b) => (FAMILY_ORDER.indexOf(a) + 99) % 99 - (FAMILY_ORDER.indexOf(b) + 99) % 99 || a.localeCompare(b));
const famRank = (f: string) => { const i = ['cover4', 'cover6', 'cover3', 'cover2', 'tampa2', 'cover0', 'cover1', 'cover2man', 'deuce'].indexOf(f); return i < 0 ? 50 : i; };
fams.sort((a, b) => famRank(a) - famRank(b));
for (const f of fams) {
  out.push(`## Family ${f}`, '');
  for (const c of COVERAGES.filter((x) => famOf(x.id, x.family) === f)) {
    out.push(`<!-- ${c.id}: ${c.name}; shell ${c.shell}${c.look ? ` shown ${c.look}` : ''} -->`, '');
    for (const [slot, r] of Object.entries(c.roles) as [string, any][]) out.push(...card(c, slot, r));
    c.underneath.forEach((u: any, i: number) => {
      const z = typeof u === 'string' ? { kind: 'zone', zone: u } : { kind: 'zone', ...u };
      out.push(...card(c, `under${i + 1} (${z.zone}; next free defender in fill order)`, z));
    });
  }
}
console.log(out.join('\n'));
