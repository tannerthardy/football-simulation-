# Route effort by family: coached throttle or fitted constant (2026-11-14)

Tools' route-speed diagnosis (#750) item 1, for Integration. Flag `ROUTE_EFFORT` (off). No card proposed yet.

**Provenance.** `routeEffort` (src/sim/route-motion.ts) gives each family a constant under 1:

| family | effort |
|---|---|
| quick | .78 |
| flat | .80 |
| back | .80 |
| cross | .84 |
| intermediate | .86 |
| deep | .94 |

Each is plus 0.04 x (route running - 0.5), clamped .70-.98. They come from df08fff7, "Calibrate movement against NFL tracking data" (2026-10-08): fitted constants with no coached reason attached. The QB's receiver forecast uses the same function.

**As coached.** Routes are run at full speed; the stem is sold at full speed so the defender respects the vertical; separation comes at the break ("the brake is the move and the throttle is the finish"). The coached reasons to slow are specific, and each is already its own mechanism here:

- the deceleration into a break: the route law's through-speed at a corner;
- the settle or sit at a route's end: `settle`, `sitVsZone`;
- the timing with the drop: route depth and the break.

None is a family-wide throttle on the whole route.

Sources: Youth Football Online ("routes must be ran at full speed"); Sports Unlimited's WR guide ("the brake is the move"); USA Football, "Coaching the wide receiver: the speed cut".

## Measured, by route and body

**Operators.** Tools' `nfl_route_speed.py` (BDB 2025 weeks 1-6, drop-backs, ball still held, time since the snap) and `sim_route_speed.ts`, from claude/route-speed-diag 4c51e402.

**Sim setup.** 12 concepts x 8 seeds against Cover 3; the Y slot is the TE.

**Matching.** Each route is matched to its NFL label by depth at 3.0 s:

- dig to IN 8+, short_in to IN under 8;
- out to OUT 8+, quick_out to OUT under 8;
- curl and comeback to HITCH 8+, hitch to HITCH under 8;
- cross to CROSS 8+, shallow to CROSS under 8;
- seam to GO; the rest by name.

Medians, yd/s:

```
route     family       body  n sim/NFL | NFL 1.0/1.5/2.0/2.5/3.0 s     | sim effort as-is              | sim effort 1                  | effort 1 - NFL at 1.5 / 2.0 / 3.0
go        deep         WR    56/ 652 |  4.5/ 6.3/ 7.1/ 7.5/ 7.9 |  4.8/ 6.6/ 7.8/ 8.6/ 9.0 |  4.9/ 6.8/ 8.0/ 8.9/ 9.4 | +0.5 / +0.9 / +1.5
post      deep         WR     8/ 347 |  4.7/ 6.5/ 7.4/ 7.8/ 8.0 |  4.8/ 6.6/ 7.6/ 6.9/ 7.8 |  4.9/ 6.7/ 7.8/ 7.4/ 8.1 | +0.2 / +0.4 / +0.1
corner    deep         WR     8/ 264 |  4.5/ 6.3/ 7.2/ 7.6/ 7.7 |  3.9/ 5.7/ 6.9/ 7.2/ 5.4 |  4.0/ 5.8/ 7.1/ 7.3/ 6.0 | -0.5 / -0.1 / -1.7
corner    deep         TE     8/  87 |  4.1/ 5.8/ 6.7/ 7.0/ 7.2 |  3.3/ 4.9/ 6.0/ 6.5/ 4.9 |  3.4/ 5.0/ 6.2/ 6.7/ 5.2 | -0.7 / -0.5 / -2.0
seam      deep         WR    16/ 652 |  4.5/ 6.3/ 7.1/ 7.5/ 7.9 |  4.0/ 5.8/ 6.9/ 7.7/ 8.2 |  4.0/ 5.9/ 7.1/ 7.9/ 8.4 | -0.4 / -0.0 / +0.6
seam      deep         TE     8/ 113 |  4.2/ 5.9/ 6.8/ 7.1/ 7.1 |  3.3/ 4.9/ 6.0/ 6.7/ 7.1 |  3.4/ 5.0/ 6.2/ 6.9/ 7.5 | -0.9 / -0.7 / +0.3
dig       intermediate WR    16/ 340 |  4.6/ 6.3/ 6.8/ 6.6/ 6.3 |  4.7/ 6.3/ 7.3/ 5.3/ 3.9 |  4.9/ 6.7/ 7.7/ 4.8/ 4.1 | +0.4 / +0.9 / -2.2
dig       intermediate TE    16/  57 |  4.4/ 5.8/ 6.0/ 5.6/ 5.6 |  3.2/ 4.7/ 5.7/ 6.2/ 3.9 |  3.4/ 5.0/ 6.1/ 6.3/ 3.9 | -0.8 / +0.1 / -1.7
curl      intermediate WR    16/ 319 |  4.5/ 6.3/ 6.9/ 6.6/ 4.6 |  4.7/ 6.3/ 7.3/ 5.0/ 2.3 |  4.9/ 6.7/ 7.6/ 4.2/ 2.1 | +0.4 / +0.7 / -2.5
comeback  intermediate WR    16/ 319 |  4.5/ 6.3/ 6.9/ 6.6/ 4.6 |  4.7/ 6.3/ 7.3/ 7.8/ 5.0 |  4.9/ 6.7/ 7.9/ 7.5/ 4.6 | +0.4 / +1.0 / -0.0
out       intermediate WR    16/ 174 |  4.6/ 6.4/ 6.8/ 6.7/ 6.3 |  4.2/ 6.0/ 6.7/ 5.2/ 4.0 |  4.4/ 6.3/ 6.8/ 5.1/ 3.7 | -0.1 / -0.1 / -2.6
out       intermediate TE     8/  49 |  4.5/ 6.1/ 6.5/ 6.4/ 6.3 |  3.2/ 4.7/ 5.7/ 5.2/ 4.7 |  3.4/ 5.0/ 6.0/ 5.0/ 4.3 | -1.1 / -0.5 / -1.9
short_in  quick        TE     8/  34 |  3.3/ 4.2/ 4.3/ 4.4/ 4.3 |  2.8/ 4.2/ 4.0/ 3.3/ 4.2 |  2.8/ 4.3/ 3.9/ 3.4/ 4.5 | +0.1 / -0.3 / +0.1
quick_out quick        WR    16/ 132 |  3.6/ 4.7/ 4.6/ 5.0/ 5.2 |  4.2/ 5.4/ 3.6/ 4.7/ 6.1 |  4.2/ 5.4/ 3.8/ 5.0/ 6.5 | +0.8 / -0.8 / +1.3
quick_out quick        TE     8/  81 |  3.7/ 4.6/ 4.4/ 5.0/ 5.2 |  2.8/ 4.2/ 3.9/ 4.3/ 5.3 |  2.8/ 4.3/ 3.9/ 4.6/ 5.7 | -0.3 / -0.5 / +0.5
hitch     quick        WR    56/ 232 |  3.6/ 4.7/ 4.1/ 2.8/ 2.2 |  4.3/ 5.4/ 2.9/ 0.9/ 0.8 |  4.4/ 5.5/ 2.9/ 0.9/ 1.0 | +0.8 / -1.2 / -1.2
hitch     quick        TE    16/ 139 |  3.2/ 4.1/ 3.8/ 3.2/ 2.7 |  2.9/ 4.3/ 4.2/ 1.7/ 1.3 |  2.9/ 4.4/ 4.2/ 1.6/ 1.3 | +0.3 / +0.3 / -1.4
slant     quick        WR    16/  88 |  3.4/ 4.0/ 4.9/ 5.2/ 5.3 |  3.9/ 5.3/ 6.5/ 7.1/ 6.3 |  3.9/ 5.6/ 6.9/ 6.8/ 7.7 | +1.6 / +2.0 / +2.4
cross     cross        TE     8/  63 |  4.0/ 5.8/ 6.8/ 7.2/ 7.4 |  2.9/ 4.5/ 5.3/ 5.0/ 5.7 |  3.0/ 4.6/ 5.3/ 5.2/ 6.0 | -1.1 / -1.4 / -1.4
shallow   cross        WR    16/ 213 |  3.5/ 5.4/ 6.5/ 7.1/ 7.3 |  3.2/ 4.7/ 5.4/ 6.5/ 7.2 |  3.2/ 4.7/ 5.6/ 6.8/ 7.7 | -0.7 / -0.9 / +0.4
flat      flat         WR    16/  77 |  3.1/ 4.2/ 5.1/ 5.2/ 4.8 |  3.3/ 5.1/ 6.1/ 6.8/ 6.8 |  3.5/ 5.5/ 6.8/ 7.7/ 7.2 | +1.3 / +1.7 / +2.4
flat      flat         TE    16/ 245 |  2.1/ 2.7/ 3.3/ 4.5/ 5.3 |  2.5/ 4.1/ 5.2/ 5.8/ 6.2 |  2.5/ 4.4/ 5.7/ 6.6/ 7.2 | +1.7 / +2.4 / +1.9
```

## Reading: what effort 1 does, and what the constants were masking

Effort 1 moves route speed by only 0.1-0.5 yd/s, because a receiver is under the cap through most of a route. The large differences from the NFL are other mechanisms, which the constants partly masked or did not touch.

| finding | routes | the mechanism | owner |
|---|---|---|---|
| above the NFL at the current effort | slant (WR +1.3 / +1.0); flat (WR +1.0 / +2.0, TE +1.9 / +0.9) | missing coached mechanisms (candidates: the slant vs press and vs zone, his release and throttle in the window; the TE's flat after a chip or bluff release; a flat runner turned to the QB) | candidates; sources to find |
| stops dead at the route's end | hitch (0.9 vs 2.8 yd/s at 2.5 s), curl (2.1-2.3 vs 4.6 at 3.0 s) | the settle | route end (Rules + Coaching) |
| near the NFL | post, seam WR, shallow WR, short_in, quick_out TE | | |

**Corrected 2026-11-14 (Tools' three reads, #750).** Three rows of the first reading were wrong.

1. **"Under the NFL after the break at 3.0 s" (dig, curl, out, corner) is timing, not the corner law.**
   - Every one of ours breaks at nearly the same time, while NFL break times spread. Our dig breaks at 3.2-3.6 s (p10-p90) and our out at 2.8-3.0. The NFL IN breaks at 2.4 / 2.6 / 2.9 / 3.2 / 3.5 s (p10 / 25 / 50 / 75 / 90) and the OUT at 2.5-3.7. So at 3.0 s many NFL receivers are already out of their break and ours are in it.
   - Break-aligned (IN / OUT, depth 8+, 75-90 deg), the NFL is v_in 5.6 / v_min 3.9 / v_out 4.9 and ours 5.2 / 3.8 / 6.7: we exit faster.
   - Matched on break depth (9 yd or more, route_break.py), the break time is the same: NFL IN 3.1 s at 11.6 yd, our dig 3.0 s at 12.6.
   - What remains is shape: the NFL deep in and out turn 55-57 deg (v_min / v_in .84-.90, radius 6.5-7.4 yd); ours, authored square, turn 69-80 deg (.59-.69, radius 2.3-3.5).
   - That is a route-points question with sources, its own item.
   - The spread in when a man breaks has to come from his release, his get-off and the coverage he works, since every break here is at a fixed depth.
2. **"Go above the NFL" was selection, not the body.**
   - The NFL GO label includes many that stop at 10-13 yd or track the ball.
   - Matched on depth 14 yd or more at 3.0 s with a free release, ours minus NFL is -0.25 / -0.09 / +0.03 / +0.11 yd/s at 1.5 / 2.0 / 2.5 / 3.0 s.
   - There is no capacity issue. The slant's early lead needs the same matched re-read before it is called acceleration.
3. **The TE is not slow.**
   - The median generated TE is within 0.3 yd/s of NFL TEs on straights.
   - The staged bench's TE (team seed 51) is a below-median body (vmax 8.60 against 9.00).
   - The over's gap is that body, plus effort .84, plus the get-off. Bench rows should use the median TE or several team seeds.

**Proposed table.** Effort 1 for every family: no family has a coached throttle over the whole route. What a receiver brings through each break, and whether the break is a cut or a roll, is declared per route point in the route table (`rules/route-table`, on ROUTE_FILLET's cut field), set against break-aligned NFL rows matched on break depth. The tracked `pace` overrides stay, because they carry a measured reason (the back's check-release flat). The named mechanisms above are each their own item, not reasons to keep a fitted constant. Off, the constants are unchanged.
