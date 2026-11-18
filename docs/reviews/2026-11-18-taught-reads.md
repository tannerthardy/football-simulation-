# Taught reads per pass concept (2026-11-18)

Integration's question after Tools' film-room finding: the call's declared progression and the installed plan the
quarterback runs differed. Across 32 concepts and 5 formations (gun doubles, gun trips, ace, gun empty, I-pro), the
two orders agreed on 77 of 160 concept-formation pairs and on the first read on 91. Only 9 concepts agreed in every
formation. Three kinds of difference:
- formation: a list written for trips was read in doubles;
- keyed plans: the order was printed [high, low, ...] while the key drives the read;
- the compiler's timing order where no key is installed: mesh read the backside go where the sit is taught, and
  y_cross and four_verts read clear-outs.

`TAUGHT_ORDER` (off) makes the taught read the one source: `src/playbook/taught-reads.ts`.
- The installed plan reads the taught refs in order. An installed key's pair leads as one look, a ref the formation
  does not field drops out, and an unlisted route is a clear-out he does not look at.
- The call's `progression` is the same list.
- A back listed before the last read runs a designed route read in turn, so he is not the outlet.

On, all 160 pairs agree. In 147 the first read is one of the taught first two; in the other 13 an installed compiler
key leads.

## The table

Each row gives the read by role: S1..S3 are strong #1-#3 outside-in, W1/W2 weak, B the back. It also gives the
sources, a confidence, and the alternative install where sources disagree.

Quotes marked [s] came from a search excerpt; the page itself could not be opened. Check the wording before citing.
"From X" marks one of our own combinations, read as the closest taught concept X.

| concept | read | sources | conf. | alternative |
|---|---|---|---|---|
| slant_flat | key flat defender: S2 flat / S1 slant; S3; W1, W2 | Scribd QB Reads [s] scribd.com/doc/225841391; NFP slant-flat vs Cover 2 [s]; USA Football (Dragon) "read the curl/flat defender" blogs.usafootball.com/blog/7512 | high | first defender inside the slant |
| stick | key flat defender: S3 flat / S2 stick; W1, W2; B (S1 go a pre-snap look) | Throw Deep, Stick: "identify the flat defender and throw off of his movement" | high | Glazier: CB, inside-out |
| quick_outs | flat defender: S1 out / S2 hitch; S3 seam in the void; W1, W2 | Smart Football, BYU 64 "Key best located Safety on 1st step"; Throw Deep, five plays that beat Cover 3 | medium | pre-snap softest corner |
| hitches | outside to inside: S1, S2, S3; W1, W2; B | Win With The Pass: "reads outside hitch to inside hitch" | med-high | BYU All Curl: key the Mike |
| smash | high-low the CB: S1 hitch / S2 corner; S3; W1, W2; B | Throw Deep, Smash: "high-low the CB"; Glazier, Smash | high | corner first (Smart Football [s]) |
| curl_flat | key flat defender: S1 curl / S2 flat; B; S3; W1, W2 | USA Football, reads: "If he covers the flat, throw the curl"; Hewitt (USA Football): "No. 1 receiver to No. 2 receiver to running back" | high | BYU: key the Mike |
| mesh | S1 corner; S2, W2 crossers; S3 sit; B swing (W1 go clears) | Holgorsen / Leach "triangle read" (black41flashreverse.substack.com); Brink, Spokesman-Review | med-high | Throw Deep: flare first |
| four_verts | S2, W2 seams off the cap; S3 read seam; S1, W1; B | Coach Hoover, 4 verticals; Throw Deep, 4 Verts | medium | Mumme / AJ Smith: 1-to-5 progression |
| flood | peek S1; high-low flat defender S2 out / S3 flat; W1, W2; B | Throw Deep (Cover 3); Breakdown Sports, Wisconsin flood "deep to shallow" | high | Coach Kou: peek the backside post |
| dagger | S2 seam on the safety; dig to shallow S1 / S3; W2; B (W1 go clears) | Coach Kou, Dagger: "You read the dig to the shallow"; Throw Deep | med-high | key the hook linebacker |
| drive | hook LB: S2 dig / W2 shallow; S1; B | Smart Football, Shallow cross, drag and drive | med-high | Throw Deep: peek the post |
| y_cross | W1 post; S2 cross; S3 flat; W2; B | Throw Deep, Y-Cross: "1) Post 2) Deep Crosser 3) RB Check-down"; Brink | medium | Air Raid 69: back first |
| levels | peek S3; apex short to deep S2 / S1; W2; B | Smart Football, Levels: "read short-to-deep" | med-high | hook high-low |
| comebacks | S1, S2, S3; W1, W2; B | Smart Football (drive's comeback key) | low | pre-snap matchup |
| pa_post_dig | high-low the safety S1 post / S2 dig; W1; W2 | Throw Deep, Yankee | med-high | Mills: safety, then linebackers |
| pa_flood | S1, S2, S3, B (flat), W1, W2 | Bowen, NFL 101; Breakdown Sports | medium | boot: over first |
| pa_shot | S2 or W1 post off the middle safety; S1; W2 | Throw Deep, play action; USA Football, Yankee | med-low | Yankee order |
| double_slants | apex, inside-out: S2, S1; S3; W2 | Coach Hoover, Double Slant | high | key the Mike (Stanford Daily) |
| fade_flat | from Tare: S1 hole shot; S2 flat / S3 hitch; W1; B | Bowen [s] | low-med | fade first vs Cover 2 [s] |
| hitch_post | from hitch-seam: S1, S2, S3; W2; B | Win With The Pass, hitch-seam | low | high-low the flat defender |
| double_outs | from sail: S1 / S2; S3; W1, W2; B | Bowen [s]; Throw Deep | low | (reasoning) |
| hitch_out | from stick: S2 / S3; S1; W1, W2; B | Throw Deep, Stick | low-med | (reasoning) |
| seam_slant | S2 / S3 off the apex; W2, W1 (S1 go clears) | no source found: reasoning | low | seam-safety key first |
| hitch_cross | S2 cross; S1 / S3 curl-flat outlet; W2; B | Throw Deep: "The crossing route over LB level is option A" | medium | drive-style hook read |
| post_cross | from Yankee: S1 post / S2 cross; S3; W2 | USA Football, Yankee | med-low | Throw Deep, Yankee |
| sail_corner | from Flat-7: S1 / S2; S3; W1; B | Bowen | low-med | smash order |
| corner_flat | key flat defender: S1 corner / S2 flat; S3; W1, W2; B | Bowen; Glazier | medium | smash family |
| trips_stick | S3 flat / S2 stick; S1; W1; B | Throw Deep, Stick | med-high | Glazier: CB |
| trips_sail | from flood: S1; S2 out / B out; S3; W1, W2 | Throw Deep; Breakdown Sports | medium | BYU Y-Sail |
| seam_hitch | S1; S2 seam off the near safety; S3; W2; B | Win With The Pass "Hitch, Seam, Seam"; Smart Football R&S seam read | medium | ACE: hitch, seam, check |
| trips_outs | from flood: S1; S2 / S3; W1, W2 | Throw Deep | medium | BYU 65 |
| verts_hitch | S2 seam off the cap; S1; S3 hitch; W2, W1; B | Coach Hoover; Win With The Pass | low-med | trips: S3 hitch first |

Weakest rows: seam_slant has no source. double_outs, hitch_post and comebacks are reasoned from neighbouring
concepts. Mesh and four_verts have genuinely different taught installs; the most common one is used.

## Measured (staged dropbacks; 32 concepts x cover 3/4/2/1 x gun doubles/trips x 2 seeds x flip; `scripts/diag/routes/taught-order.mts`)

Concepts that changed, off -> on. The time to throw is the median; the first read counts either half of a key.

| concept | t throw | first read | comp | int | yd/play | sacks |
|---|---|---|---|---|---|---|
| stick | 2.30 → 2.30 | 0.59 → 0.56 | 0.81 → 0.81 | 1 → 1 | 9.7 → 7.2 | 0 → 0 |
| hitches | 2.30 → 2.30 | 0.47 → 0.41 | 0.72 → 0.69 | 1 → 1 | 4.1 → 3.7 | 0 → 0 |
| curl_flat | 2.70 → 2.90 | 0.84 → 0.88 | 0.94 → 0.75 | 0 → 0 | 12.7 → 11.7 | 1 → 0 |
| four_verts | 3.15 → 3.15 | 0.40 → 0.12 | 0.32 → 0.32 | 0 → 0 | 9.6 → 9.6 | 1 → 1 |
| flood | 3.05 → 3.05 | 0.38 → 0.44 | 0.66 → 0.59 | 0 → 1 | 8.5 → 11.1 | 0 → 0 |
| drive | 3.25 → 3.30 | 0.72 → 0.67 | 0.48 → 0.47 | 0 → 2 | 8.1 → 8.5 | 2 → 1 |
| y_cross | 3.60 → 3.60 | 0.03 → 0.03 | 0.41 → 0.52 | 0 → 0 | 9.3 → 9.6 | 2 → 2 |
| levels | 3.00 → 3.00 | 0.87 → 0.81 | 0.81 → 0.74 | 0 → 1 | 7.8 → 7.4 | 1 → 1 |
| comebacks | 3.70 → 3.30 | 0.07 → 0.34 | 0.50 → 0.41 | 0 → 1 | 5.4 → 4.7 | 3 → 3 |
| pa_post_dig | 3.40 → 3.40 | 0.61 → 0.67 | 0.39 → 0.40 | 1 → 1 | 5.9 → 5.4 | 0 → 1 |
| pa_flood | 3.25 → 2.80 | 0.00 → 0.09 | 0.47 → 0.66 | 1 → 0 | 6.6 → 9.7 | 0 → 0 |
| pa_shot | 3.70 → 3.65 | 0.42 → 0.46 | 0.19 → 0.15 | 1 → 1 | 7.0 → 5.0 | 1 → 1 |
| double_slants | 2.35 → 2.35 | 0.83 → 0.67 | 0.79 → 0.77 | 1 → 2 | 8.2 → 7.2 | 2 → 2 |
| fade_flat | 2.65 → 2.65 | 0.65 → 0.65 | 0.81 → 0.84 | 0 → 0 | 9.5 → 9.7 | 1 → 1 |
| hitch_post | 2.85 → 2.85 | 0.66 → 0.62 | 0.75 → 0.66 | 0 → 0 | 6.4 → 5.5 | 0 → 0 |
| seam_slant | 2.55 → 2.55 | 0.58 → 0.89 | 0.52 → 0.57 | 4 → 3 | 7.9 → 5.9 | 0 → 3 |
| hitch_cross | 2.90 → 2.90 | 0.43 → 0.43 | 0.57 → 0.60 | 0 → 0 | 4.2 → 5.5 | 1 → 1 |
| post_cross | 2.65 → 2.70 | 0.26 → 0.07 | 0.71 → 0.63 | 0 → 1 | 7.8 → 5.8 | 1 → 2 |
| sail_corner | 2.85 → 2.90 | 0.72 → 0.75 | 0.75 → 0.81 | 0 → 1 | 9.3 → 8.8 | 0 → 0 |
| corner_flat | 3.20 → 3.20 | 0.70 → 0.70 | 0.77 → 0.80 | 1 → 1 | 9.5 → 9.8 | 1 → 1 |
| trips_stick | 2.50 → 2.50 | 0.62 → 0.59 | 0.59 → 0.56 | 1 → 1 | 4.6 → 4.3 | 0 → 0 |
| trips_sail | 2.75 → 2.90 | 0.42 → 0.55 | 0.68 → 0.58 | 2 → 0 | 10.7 → 8.7 | 1 → 1 |
| seam_hitch | 2.45 → 2.45 | 0.48 → 0.54 | 0.76 → 0.75 | 0 → 0 | 6.5 → 6.1 | 3 → 4 |
| trips_outs | 2.65 → 2.95 | 0.68 → 0.50 | 0.71 → 0.77 | 0 → 0 | 7.8 → 9.4 | 1 → 2 |
| verts_hitch | 2.70 → 2.85 | 0.57 → 0.52 | 0.61 → 0.58 | 0 → 0 | 8.9 → 8.8 | 1 → 1 |

All, off: att 969 comp 0.663 int 20 yd/play 7.80 first 0.55 sacks 33
All, on: att 969 comp 0.654 int 24 yd/play 7.59 first 0.55 sacks 38

Two corrections were made along the way, each from a diagnosed cause:
1. A taught peek (flood's, trips_sail's, trips_outs', pa_flood's and fade_flat's go; levels' seam) is the plan's alert,
   a glance and not a rhythm place. As a first place it was almost never thrown: flood's first-read share fell
   .38 -> .09 and trips_outs' .68 -> .07, and the ball left 0.3 s later.
2. A taught high-low pair is one look, so it takes one rhythm place. Read in sequence, its second route waited a step
   and the eight extra sacks came on those plays.

What remains is mildly adverse overall: interceptions 20 -> 24 and sacks 33 -> 38 in about 970 dropbacks, with
completion and yards per play within noise. Some taught orders read deep before short where our compiler had ordered
by readiness:
- post_cross: the post before the cross;
- comebacks: the comeback first;
- four_verts: the seams before the outside goes.
When the deep read is covered, the ball is held longer. That is the read as taught. Its cost belongs to the QB's
clock and the routes' timing, not to the order.
