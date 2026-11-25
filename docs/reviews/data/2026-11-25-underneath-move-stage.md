# UNDERNEATH_MOVE staged reads (Flex, 2026-11-25)

The option routes' underneath read (stick, hook) and the seam read, staged on develop 9d516a680: 12 seeds,
gun_trips_11, each trips-side receiver as the runner (`scripts/diag/routes/underneath-read-stage.mts`, `UNDERNEATH_MOVE=0`
for off). The rule: the read works away only from a key playing him as a man in his own picture for 0.3 s: eyes on him
(seen head, else hips, within 25 deg of the line to him and nearer him than the passer), or moving with him (trailing
or closing on his line) while his eyes are not on the passer. An exit is capped by where a defender will be 0.4 s ahead.
The passer's forecast changes its expected answer only after 0.3 s of consecutive reads.

## 1. Away answers, off -> on

| route | runner | coverage | away off -> on | on: reasons |
|---|---|---|---|---|
| stick | S1 | cover2 | 8 -> 0 | key-sitting 8, no-fresh-key 4 |
| stick | S1 | cover4 | 8 -> 9 | escape-open 9, no-fresh-key 3 |
| stick | S1 | cover3 | 6 -> 0 | key-sitting 6, no-fresh-key 6 |
| stick | S1 | cover1 | 11 -> 10 | escape-open 10, escape-capped 2 |
| stick | S1 | cover0 | 11 -> 10 | escape-open 10, escape-capped 2 |
| stick | S2 | cover2 | 12 -> 0 | key-sitting 12 |
| stick | S2 | cover4 | 12 -> 0 | key-sitting 12 |
| stick | S2 | cover3 | 12 -> 0 | key-sitting 12 |
| stick | S2 | cover1 | 11 -> 9 | escape-open 9, escape-capped 3 |
| stick | S2 | cover0 | 11 -> 9 | escape-open 9, escape-capped 3 |
| stick | S3 | cover2 | 11 -> 0 | key-sitting 12 |
| stick | S3 | cover4 | 0 -> 0 | escape-capped 11, key-sitting 1 |
| stick | S3 | cover3 | 0 -> 0 | escape-capped 12 |
| stick | S3 | cover1 | 11 -> 11 | escape-open 11, escape-capped 1 |
| stick | S3 | cover0 | 11 -> 11 | escape-open 11, escape-capped 1 |
| hook | S1 | cover2 | 0 -> 0 | no-fresh-key 12 |
| hook | S1 | cover4 | 10 -> 10 | escape-open 10, escape-capped 1, no-fresh-key 1 |
| hook | S1 | cover3 | 9 -> 0 | key-sitting 10, no-fresh-key 2 |
| hook | S1 | cover1 | 0 -> 0 | escape-capped 12 |
| hook | S1 | cover0 | 0 -> 0 | escape-capped 12 |
| hook | S2 | cover2 | 0 -> 0 | escape-capped 9, no-fresh-key 3 |
| hook | S2 | cover4 | 0 -> 0 | key-sitting 9, escape-capped 3 |
| hook | S2 | cover3 | 0 -> 0 | escape-capped 12 |
| hook | S2 | cover1 | 0 -> 0 | escape-capped 12 |
| hook | S2 | cover0 | 0 -> 0 | escape-capped 12 |
| hook | S3 | cover2 | 0 -> 0 | escape-capped 12 |
| hook | S3 | cover4 | 2 -> 0 | key-sitting 10, escape-capped 2 |
| hook | S3 | cover3 | 0 -> 0 | escape-capped 10, key-sitting 2 |
| hook | S3 | cover1 | 0 -> 0 | escape-capped 12 |
| hook | S3 | cover0 | 0 -> 0 | escape-capped 12 |

Reading:
- Stick against zone sits: Cover 2 0 of 12 on every runner (the curl-flat widening into his line has his eyes on the
  passer), Cover 3 0. Cover 4: S2 and S3 sit; **S1 works away 9 of 12**: the quarters corner's eyes are on #1, which is
  his rule (MOD: man on #1). Same for hook S1 against Cover 4.
- Stick against man works away: S3 against Cover 1 and 0 back to 11 of 12 (the off man sinking with his eyes on him).
  S1 11 -> 10 and S2 11 -> 9: the moving exit cap now catches a defender arriving in the exit (escape-capped 2 and 3).
- Hook against man: still escape-capped, as before.
- Leverage side: the installed answer is one fixed 'away' path (stick: out to 9 yd width at 6 yd), so a break away from
  the defender's leverage (back inside against an outside man) needs a second installed answer; left as a later option.

## 2. What his picture shows of the key's eyes and hips at the read (degrees, medians; truth column for validation only)

`scripts/diag/routes/underneath-facing-stage.mts`. Seen head and hips are the perception record's (delayed).

| route | runner | coverage | n | head off him | head off QB | head nearer him | hips off him | hips off QB | key truly man |
|---|---|---|---|---|---|---|---|---|---|
| stick | S1 | cover2 | 8 | 170 | 2 | 0 | 170 | 2 | 0 |
| stick | S1 | cover4 | 9 | 2 | 40 | 9 | 2 | 40 | 0 |
| stick | S1 | cover3 | 6 | 62 | 5 | 0 | 18 | 39 | 0 |
| stick | S1 | cover1 | 12 | 90 | 138 | 11 | 90 | 138 | 12 |
| stick | S1 | cover0 | 12 | 90 | 138 | 11 | 90 | 138 | 12 |
| stick | S2 | cover2 | 12 | 79 | 4 | 0 | 80 | 6 | 0 |
| stick | S2 | cover4 | 12 | 42 | 3 | 0 | 22 | 19 | 0 |
| stick | S2 | cover3 | 12 | 47 | 3 | 0 | 65 | 26 | 0 |
| stick | S2 | cover1 | 12 | 106 | 145 | 11 | 106 | 145 | 12 |
| stick | S2 | cover0 | 12 | 106 | 144 | 11 | 106 | 144 | 12 |
| stick | S3 | cover2 | 12 | 29 | 4 | 0 | 30 | 6 | 0 |
| stick | S3 | cover4 | 12 | 41 | 2 | 0 | 42 | 3 | 0 |
| stick | S3 | cover3 | 12 | 44 | 2 | 0 | 44 | 3 | 0 |
| stick | S3 | cover1 | 12 | 12 | 22 | 12 | 12 | 22 | 12 |
| stick | S3 | cover0 | 12 | 12 | 22 | 12 | 12 | 22 | 12 |

Zone keys look within 2-6 deg of the passer in every zone cell but S1 against Cover 4 (the corner on #1). Trailing man
keys (S1, S2 against Cover 1) look upfield, 90-106 deg off him and 138-145 off the passer: neither cue, so motion
decides. The off man on S3 looks 12 deg off him.

## 3. The seam read, staged only (not built)

`scripts/diag/routes/seam-read-stage.mts`: seam_read on S2, what he answers on where the roof men stand against the same
rule on his picture carried 0.5 s ahead (post/under/base of 12), and how many roof men are rotating to the middle or
bailing in his picture.

| formation | runner | coverage | n | answer now (post/under/base) | answer 0.5 s ahead | changed | roof men toward middle >1.5 yd/s | roof men bailing (vx > 3) |
|---|---|---|---|---|---|---|---|---|
| gun_doubles_11 | S2 | cover2 | 12 | 12/0/0 | 8/4/0 | 4 | 0 | 0 |
| gun_doubles_11 | S2 | cover4 | 12 | 2/10/0 | 0/12/0 | 2 | 12 | 24 |
| gun_doubles_11 | S2 | cover6 | 12 | 2/10/0 | 0/12/0 | 2 | 12 | 12 |
| gun_doubles_11 | S2 | tampa2 | 12 | 12/0/0 | 0/12/0 | 12 | 0 | 0 |
| gun_doubles_11 | S2 | cover2_invert | 12 | 0/6/6 | 0/12/0 | 6 | 6 | 6 |
| gun_doubles_11 | S2 | cover3 | 12 | 0/0/12 | 0/0/12 | 0 | 3 | 4 |
| gun_doubles_11 | S2 | cover3_buzz | 12 | 0/12/0 | 0/12/0 | 0 | 12 | 17 |
| gun_doubles_11 | S2 | cover9 | 12 | 0/8/4 | 0/9/3 | 5 | 12 | 15 |
| gun_doubles_11 | S2 | cover1 | 12 | 0/0/12 | 0/4/8 | 4 | 0 | 0 |
| gun_trips_11 | S2 | cover2 | 12 | 12/0/0 | 12/0/0 | 0 | 9 | 0 |
| gun_trips_11 | S2 | cover4 | 12 | 0/12/0 | 0/12/0 | 0 | 0 | 13 |
| gun_trips_11 | S2 | cover6 | 12 | 12/0/0 | 10/2/0 | 2 | 1 | 12 |
| gun_trips_11 | S2 | tampa2 | 12 | 7/5/0 | 2/10/0 | 5 | 5 | 5 |
| gun_trips_11 | S2 | cover2_invert | 12 | 0/12/0 | 0/12/0 | 0 | 7 | 12 |
| gun_trips_11 | S2 | cover3 | 12 | 0/12/0 | 0/12/0 | 0 | 12 | 23 |
| gun_trips_11 | S2 | cover3_buzz | 12 | 0/0/12 | 0/0/12 | 0 | 0 | 12 |
| gun_trips_11 | S2 | cover9 | 12 | 0/3/9 | 0/10/2 | 7 | 0 | 4 |
| gun_trips_11 | S2 | cover1 | 5 | 0/0/5 | 0/1/4 | 1 | 0 | 0 |

The motion matters in several cells: Tampa 2 from doubles reads 'post' 12 of 12 on split safeties while the picture
ahead says 'under' 12 of 12; Cover 9 from trips changes 7 of 12, Cover 2 invert from doubles 6 of 12, Cover 2 from
doubles 4 of 12. A rule on motion is a separate build (roof men's direction and depth change), after the quick game.
