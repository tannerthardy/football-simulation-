# Playbook references for engine work

A working guide to coaching playbooks, manuals and clinics. It covers which
source to read for the problem in front of you, what to extract from it, how
to record an extracted rule, and what is safe to commit. It is distilled from
an external research brief on NFL playbook sources (2026-10-21) and checked
against the engine's current backlog. Access was checked the same day.

Playbooks describe *intended assignments and technique*. They do not measure
movement, timing, force or outcomes. Use them to decide **who is responsible
for what, and under which conditions**. Use tracking data and film to decide
**how fast and how well** it happens
([evaluation environment](EVALUATION_ENVIRONMENT.md)).

## Rules for using these sources

1. **Never commit source files or page images.** Keep downloads outside the
   checkout (or under ignored `data/raw/playbooks/`). Record the URL, file
   name, page and SHA-256 in your notes or review.
2. **Write rules in your own words** as engine-facing records (template
   below). Quote only short phrases where the wording matters.
3. **Public hosting is not permission.** Several "NFL playbooks" are scans of
   team-internal material. A site hosting them does not establish rights to
   redistribute them, upload them, or use them as training data. Prefer
   publisher-issued material (the FootballXOs spread playbook, clinic
   articles) and general doctrine. Treat team installs as
   corroboration you read, not content you reproduce.
4. **Don't trust listing blurbs.** Promotional text on download pages was
   not checked against the files, and at least one listing contradicts its
   own file name (the "2020 Georgia" listing describes 2024 Oregon).
5. **Cite pages as 1-based physical PDF pages.** The research brief used
   zero-based numbers. The numbers below are corrected.
6. **Coaching systems differ.** If a rule depends on a system (for example,
   which lineman a center blocks against a shade, or whether the strong end
   in an Over front is a 5- or 6-technique), name the system. Don't present
   one coach's choice as universal.

## Access status (checked 2026-10-21)

| Source | Access from a cloud task | Content | Status for us |
|---|---|---|---|
| [FootballXOs spread offense playbook](https://www.footballxos.com/footballxos-spread-offense-playbook.pdf), 138 pp. | Direct PDF, text layer, SHA-256 `92756b6742251507989562ae19aaa4be3388ce6bc2bde260d1213b4b4ae2fd1f` | Publisher's teaching sample (high-school/college spread) | **Read.** Use it for representation and rule wording |
| [2008 Alabama defense (Saban/Smart)](https://www.footballxos.com/download/alabama-crimson-tide-defense-2008-nick-saban-kirby-smart/), 430 pp. | Direct download link; **scanned, no text layer**; SHA-256 `34a10ccfbc5c3d793a6614133eb60db8aa06f22156aa84b6ce80c85caa4015fd` | Team-internal manual (staff and player material in the first pages) | Rights unclear. Only pages 1–8 were viewed; coverage chapters not extracted |
| [2002 Broncos offense](https://www.footballxos.com/download/2002-denver-broncos-mike-shanahan-pdf/) (33.31 MB), [2010 Jets defense](https://www.footballxos.com/download/2010-ny-jets-defense-rex-ryan-pdf/) (10.61 MB), [Cowboys 4-3 Over Stack LB fits](https://www.footballxos.com/download/dallas-cowboys-43-over-stack-lb-fits-pdf/) | Direct download links present | Team material (attributed) | Not downloaded. Same rights caution |
| [2013 Seahawks defense](https://footballplaybooks.net/download/2013-seattle-seahawks-defense-pete-carroll/) (19.66 MB), [2020 Browns OL manual](https://footballplaybooks.net/download/2020-cleveland-browns-ol-manual-bill-callahan/) (1.81 MB), other footballplaybooks.net items | **Locked** (email/sign-up gate) | Attributed team material | Needs a person to download and supply it |
| [2014 49ers (Roman) preview on pdfcoffee](https://pdfcoffee.com/2014-49ers-greg-roman-playbook-pdf-free.html) | HTTP 403 from the cloud proxy | Marked "Confidential Property" | Not used |
| [Football Xs and Os zone/OL clinic pages](https://www.footballxos.com/downloads/offense/?cp=2), [NDSU run-fit analysis](https://www.footballxos.com/how-north-dakota-state-executes-their-run-fits/) | Public web pages | Clinic and analysis articles | Good next reads for technique and fits |

A cloud task cannot complete an email sign-up. If a locked source is needed,
ask the user to download it and supply the file. Don't create accounts.

## What to read for the current backlog

Ordered by where the engine needs it now (see
[realism plan](REALISM_PLAN.md) backlog rows 10–14 and
[evaluation environment](EVALUATION_ENVIRONMENT.md) §5 step 4).

### 1. Run-blocking assignments (backlog 10–11; E2 gap-run cells)

**Start with:** [run-blocking doctrine audit](reviews/2026-10-21-run-blocking-doctrine-audit.md),
which finds that several of the worst-stuffed cells are assignment errors.

| Read | Pages | Extract |
|---|---|---|
| FootballXOs spread | 62–64 trap, 66–68 power, 83–85 counter, 52–54 veer | Rule lines per position (QB, F, X, H, Y, Z, PST, PSG, C, BSG, BST): who is kicked out (EMLOS), PST/PSG combo to the backside LB, center's head-up vs. shade/uncovered rule, puller "first LB to show", trap PST rule. Pages 53, 63, 67 and 84 diagram the same play against eight fronts, and mark the fronts the play is *not* run against (trap vs. 4-3 Under and Bear; counter vs. 5-2, 3-5 and Bear). That is a direct input for the play caller's `beats` lists |
| Zone clinic material (Gibbs, Grabowski) | — | Covered/uncovered by playside shade, aiming points, combo release conditions, backside cutoff, what the back reads |
| 2002 Broncos, Cowboys run install (if supplied) | — | Corroboration of zone/gap rules at NFL level; FB/TE roles |

Veer, midline and dash are option plays that read a defender instead of
blocking him. The engine has no option runs, so they are low priority except
as examples of a read key written as a rule.

### 2. Run fits and fronts (backlog 10; plan §10)

| Read | Extract |
|---|---|
| Cowboys 4-3 Over Stack LB fits (if used) | Each front defender's gap by front and formation strength; LB fits versus flow, pullers and the FB |
| NDSU run-fit article | Gap, layered and funnel fit vocabulary; force/spill decisions |
| 1999 Buccaneers DL manual | DL key reading (hat/hands of the blocker), gap control vs. reach/down/double |

Engine anchors: `FRONTS` in `src/playbook/defense.ts`, fits in
`src/sim/behaviors/defense.ts`, recognition in `src/sim/recognition.ts`.

### 3. Protection (backlog 12; weak-side free-rusher pattern)

| Read | Pages | Extract |
|---|---|---|
| FootballXOs spread | 94 quick game, 95 six-man "man to the call side, zone away" with RB-declared RIP/LIZ (LOU/RAY vs. odd, BOB vs. Bear), 96 seven-man, 97 sprint-out, 98 pinch, 99 boot | Who declares the protection, which side is man and which is zone, the back's responsibility by front, what happens when the Mike blitzes |
| 2004 Patriots (if supplied) | — | Mike identification, hot/sight adjustments |

The engine's protection is an each-tick inside-out matching
(`ProtectionCoordinator` in `src/sim/behaviors/blocking.ts`) with no declared
slide or call side. That is the gap these pages address.

### 4. Coverage rules and checks (roadmap gap 4; backlog 14)

The roadmap's missing checks are Cover 3 **Rip/Liz** match, quarters
**MOD/MEG** and two-read, trips **Poach**, and the curl-flat **sink** rule.
They are Saban-family terms, so the 2008 Alabama manual is the natural source,
but it is a scan of uncertain provenance (see access table). Until a
person decides to use it, implement from the general definitions below and
verify against film or tracking.

### 5. Formations, motion and the E2 mapping tables (backlog 17)

| Read | Pages | Extract |
|---|---|---|
| FootballXOs spread | 11–20 base sets, 21–26 modifiers (invert, over, ZAX/HAZ swaps), 27–40 sets by receiver count and TE count, 41–42 backfield sets, 43 numbered motion landmarks (1–10), 44–50 named motions and shifts | A vocabulary to compare with ours: `Formation`/`Split` in `src/playbook/types.ts`, sets in `src/playbook/formations.ts`. Motion landmarks map to positions relative to the end man and the widest receiver |

**Name collisions.** "RIP/LIZ" is a protection direction in the spread
playbook and a coverage strength call in Saban-family defenses. "Over" and
"Under" are front names, while "H (over)" in the spread playbook is a
formation modifier. Keep source terms in records; map them to engine ids
explicitly.

## Doctrine quick reference

This is general coaching knowledge, recorded so agents share one vocabulary.
Confidence is *reasonably interpreted* unless a page is cited. Systems vary,
so confirm against a source before encoding anything not marked with a page.

**Run offense**

- *Gap–down–backer* (gap schemes): playside linemen block their inside gap,
  then the man on the next inside lineman, then a linebacker. A lineman's
  inside gap ends at the next inside lineman.
- *EMLOS*: the end man on the line of scrimmage after the down blocks. Power
  and counter kick him out (spread pp. 66, 83).
- *Puller jobs*: kick out the EMLOS, log him (seal inside) if he squeezes or
  wrong-arms, or wrap through to the first linebacker to show playside.
- *Center on power and counter*: block the man head-up; if uncovered or the
  nose is shaded backside, block back to replace the pulling guard
  (spread pp. 66, 83).
- *Trap*: leave only the trapped lineman; the PST releases inside if the
  trapped man is over him, else blocks the man on him to the outside gap
  (spread p. 62).
- *Zone covered/uncovered*: covered means a defender is head-up or shaded to
  your playside. Uncovered linemen combo with the covered lineman playside
  and climb to the backer when the defender is controlled or the backer
  commits. Backside linemen cut off.
- *Fullback*: iso, leading on the playside backer; insert or slice, kicking
  or sealing the backside end on inside zone; kicking the EMLOS on power with
  a back. He is never "no assignment".
- *Runner*: press the aiming point, read the designated block or defender,
  then bang, bend or bounce. On outside zone, a lost reach means cut up, not
  continue to the edge.

**Run defense**

- *Gap fits*: every gap has one defender. Movement (slants, stunts) exchanges
  gaps, and a puller or FB adds a gap that someone must fill (spill or
  squeeze-and-force).
- *Force/contain*: one defender per side turns the ball back inside. Who that
  is (corner, safety or OLB) depends on the coverage call.

**Pass protection**

- *Man to the call side, zone away* (spread p. 95): the back declares the
  call, usually away from the 1-technique. Call-side linemen take their man;
  away-side linemen slide to their gap, and the back takes the remaining
  threat.
- *Hot or sight adjust*: when rushers exceed blockers, the QB and receivers
  answer the unblocked rusher. An unblocked rusher can be designed, so
  telemetry must tell designed hot from a missed assignment.

**Coverage checks (Saban-family terms; verify before encoding)**

- *Rip/Liz*: strength calls (right/left) that set the direction of the match
  rules in Cover 3 match.
- *MOD* ("man only deep"): the corner carries #1 in man only if he goes
  vertical; otherwise he plays zone.
- *MEG* ("man everywhere he goes"): the corner plays #1 in man on any route,
  typically on the backside of quarters versus a single receiver.
- *Poach*: against 3×1, the backside safety leaves the single side to help
  on #3 strong. The backside corner usually plays MEG.
- *Sink*: the curl-flat defender sinks under #1's deep or curl route until a
  threat appears in the flat, instead of jumping the first flat release.

## Extraction record

Use this template for every rule an agent extracts. Put records in the
relevant review or design note, not in source code comments.

```yaml
source: FootballXOs spread offense playbook   # title as published
url: https://www.footballxos.com/footballxos-spread-offense-playbook.pdf
page: 66                                      # 1-based physical PDF page
type: installation | manual | clinic | breakdown | secondary | general-doctrine
confidence: directly_seen | reasonably_interpreted | disputed
scheme: power (gap)
role: C                                       # source role; then the engine slot
engine_slot: C
trigger: nose head-up | uncovered | weak shade
assignment: block man on | block back to replace BSG
branches: …                                   # front, shade, slant, motion, flow
coordination: …                               # combo partner, exchange, release condition
not_specified: release timing, footwork distance, contact strength
engine_anchor: src/sim/behaviors/blocking.ts planRunBlocking
test: scripts/diag/run-plans.ts cell (formation × concept × front) or a test/ case
```

**Worked example (spread p. 62, our wording):** Trap, PST. If the trapped
lineman aligns over the PST, release inside to the second level. If the
trapped lineman is inside the PST, block the man on to the outside gap.
*Not specified:* release angle, timing, or the rule when no defender is on the
PST. *Engine:* `planRunBlocking` trap branch, which currently leaves the
PST's man unblocked in both cases (audit finding 3).
