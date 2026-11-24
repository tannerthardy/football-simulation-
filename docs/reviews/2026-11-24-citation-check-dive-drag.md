# Citation check: DIVE_STANCE's stance sources and the ball-drag proposal's sources (2026-11-24, Rules + Coaching)

Asked by Integration. Two checked documents (Tools' branches, not edited here):
- `docs/reviews/2026-11-23-dive-stance.md` and `src/physics/dive.ts` (DIVE_STANCE, PR #871, `tools/dive-stance` d2b25a47);
- `docs/reviews/2026-11-24-ball-drag-proposal.md` (`tools/open-census` b8b7ff837).

**Method.** Abstracts and bibliographic records came from Europe PMC's REST search and Crossref. Full texts were fetched
where they are open (Price, Moss and Gay; Horn and Fearn for a reference list).

Fetches that failed:
- Springer, PubMed and AIP returned a cookie or bot wall.
- The NFL rulebook PDFs returned HTML.

**Status key:**
- CHECKED: the number or claim is in the source.
- PARAPHRASE: the idea is there, in other words or less precisely.
- NOT FOUND: the source that was read lacks it.
- NOT READ: the part that would hold it (the full text) was not obtained.

## DIVE_STANCE: contact times behind `DIVE_STANCE_S = 0.12 s`

The claims are:
- (A) a sprinter's foot is down about 0.2 s in the first steps and 0.09-0.11 s at top speed;
- (B) a running jump's take-off foot is down about 0.10-0.15 s.

| source | record | what the abstract says | status |
|---|---|---|---|
| Mero, Komi and Gregor, "Biomechanics of sprint running. A review", Sports Med 1992, 13(6):376-392 (doi 10.2165/00007256-199213060-00002) | confirmed | lists reaction time, technique, EMG, force production, neural factors and muscle structure; gives no contact time | (A) NOT FOUND in the abstract; full text NOT READ |
| Rabita et al., "Sprint mechanics in world-class athletes", Scand J Med Sci Sports 2015, 25(5):583-594 (doi 10.1111/sms.12389) | confirmed | force, power and force orientation against velocity over a 40 m sprint on force plates; no contact time | (A) NOT FOUND in the abstract; full text NOT READ (it measures every step, so per-step contact times are probably in it, unconfirmed) |
| Hay, "Citius, altius, longius: the biomechanics of jumping for distance", J Biomech 1993 (26 Suppl 1) | confirmed | a review of long- and triple-jump technique; says the take-off "received little attention"; no number | (B) NOT FOUND in the abstract; full text NOT READ |

**For the stance figure: none of the three cited sources confirms a number.** The figures are plausible values from
the field, but these citations do not carry them.

- The one secondary hit was a jump study quoting Ballreich and Kuhlow (1986) for take-off contact "between 0.10 - 0.13 s
  for the high performance athletes". It is a quote of a quote and was not read.
- I suggest Tools state 0.12 s as a stated choice (L) and remove the three citations, or cite a full text that has been
  read and holds the numbers.

**Correction to my own release-pace doc (#874).** I called Mero, Komi and Gregor 1992 "a sprint reaction-time review".
It is a general sprint-biomechanics review, and reaction time is one topic in it. The conclusion there (it does not
support a stance-start delay of 0.10-0.15 s) is unchanged; the doc is corrected in this commit.

## Ball drag proposal

| claim in the proposal | source | status | note |
|---|---|---|---|
| C_D end-on 0.05-0.06; spinning slightly lower | Watts and Moore, "The drag force on an American football", Am J Phys 71(8):791-793, 2003 (doi 10.1119/1.1578065) | CHECKED | the abstract: "Both are in the range of 0.05-0.06" |
| "about 10% lower when spinning at 600 rpm" | Watts and Moore | PARAPHRASE | the abstract says only "slightly lower"; the 10% and 600 rpm need the full text (NOT READ) |
| Rae and Streit about 0.15 at 60 mph; Brancazio about 0.1; Cunningham and Dowell about 0.5 | Watts and Moore | PARAPHRASE | the abstract says theirs is "about half the value assumed by Brancazio (1985), about one-third that reported by Rae and Streit (2002) and far smaller than that reported by Cunningham and Dowell (1976)". That fits 0.1 and 0.15; "0.5" and "60 mph" need the full text (NOT READ) |
| foam-rubber ball, 20.8 x 12.7 cm, pendulum suspension, 10-30 m/s | Watts and Moore | NOT READ / PARAPHRASE | the abstract says "suspended from the top of a wind tunnel by bicycle spokes attached to small bearings"; it gives no ball material or size |
| Rae and Streit's measurement, and the 0.2 / 0.5 / 0.8 at 0, 45 and 90 degrees attributed to it | Rae and Streit, "Wind-tunnel measurements of the aerodynamic loads on an American football", Sports Engineering 5:165-172, 2002 (doi 10.1046/j.1460-2687.2002.00106.x) | record CHECKED; content NOT READ | as the proposal says; Crossref has no abstract |
| the spin axis keeps its direction while the velocity turns down at about 0.37 rad/s (27.4 m/s, 30 degree launch); the misalignment stays small, about 9 degrees of yaw at one point; air drag on the centre of mass neglected | Price, Moss and Gay, "The paradox of the tight spiral pass in American football: a simple resolution" | CHECKED | full text (NSF PAR copy): "the rate of v rotation is about 0.37 rad/s"; Table I, launch speed 27.4 m/s and launch angle 30 (from Rae); "corresponds to zero pitch and a yaw of 9"; "Because of our neglect of air drag on..." |
| the citation "LLNL-JRNL-809624, 2020" | Price, Moss and Gay | PARAPHRASE | the published paper is Am J Phys 88:704-710 (2020), doi 10.1119/10.0001388; cite that. The LLNL number was not seen (LLNL acknowledgement only) |
| torque proportional to sin 2 of the angle of attack (Rae and Streit) | Price, Moss and Gay | CHECKED | "the torque magnitude is ... sin 2θ", citing Rae and Streit ("Rae and Streit have shown") |
| the ball: about 17 cm at its widest, 28 cm long, 14-15 oz | NFL Rule 2 | PARAPHRASE (secondary) | the rulebook PDFs were blocked. Search excerpts of the 2013 and 2020 rulebooks read: long axis 11 to 11 1/4 in, long circumference 28 to 28 1/2 in, short circumference 21 to 21 1/4 in, weight 14 to 15 oz |

**Arithmetic of the ball spec:**
- A 21 in short circumference gives a 6.68 in diameter, 17.0 cm.
- The 11 in long axis is 27.9 cm.
- 14-15 oz is 0.397-0.425 kg.

The proposal's m = 0.43 kg is just above the 15 oz top. With m = 0.41 (14.5 oz) and A = 0.0227 m^2 (17.0 cm), k is
0.029 x C_D per yd at two figures. None of the proposal's conclusions move.
