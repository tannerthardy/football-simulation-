"""M1: descriptive 2022/2023 REG NFL kicking, decisions, penalties and drives.

python3 scripts/data/nflverse_game_layer.py --download --out out/game-layer.json
Standard library only. Raw inputs remain under ignored data/raw/nflverse/.
"""
import argparse
import hashlib
import importlib.util
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("nflverse_reference", ROOT / "scripts/nflverse-reference.py")
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)
number, flag, distribution = reference.number, reference.flag, reference.distribution
spec = importlib.util.spec_from_file_location("nflverse_penalties", ROOT / "scripts/data/nflverse_penalties.py")
penalty_parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(penalty_parser)
parse_penalties, TYPES = penalty_parser.parse_penalties, penalty_parser.CANONICAL_TYPES
YEARS = (2022, 2023)
MANIFEST = "game-layer-download-manifest.json"
FG_BINS = (("18-29", 18, 29), ("30-39", 30, 39), ("40-49", 40, 49),
           ("50-54", 50, 54), ("55+", 55, float("inf")))
FIELDS = ("own1-29", "own30-49", "opp49-35", "opp34-20", "redZone")
DISTANCES = ("1", "2", "3-5", "6-10", "11+")
MARGINS = tuple(str(n) for n in range(-15, 16)) + ("outside", "unknown")
REQUIRED = set("season season_type game_id play_id home_team away_team posteam defteam play_type desc "
               "field_goal_attempt field_goal_result extra_point_attempt extra_point_result kick_distance "
               "punt_attempt punt_blocked punt_inside_twenty punt_downed punt_fair_catch punt_out_of_bounds "
               "punt_returner_player_id kickoff_attempt kickoff_fair_catch kickoff_downed kickoff_out_of_bounds "
               "kickoff_returner_player_id touchback own_kickoff_recovery return_yards down ydstogo yardline_100 "
               "qtr half_seconds_remaining score_differential fourth_down_converted fourth_down_failed "
               "two_point_attempt two_point_conv_result touchdown td_team posteam_score_post defteam_score_post "
               "penalty penalty_type penalty_team fixed_drive fixed_drive_result interception fumble_lost "
               "qb_spike qb_kneel timeout timeout_team home_timeouts_remaining away_timeouts_remaining "
               "fumbled_1_team fumbled_2_team fumble_recovery_1_team fumble_recovery_2_team".split())


class Stats:
    def __init__(self):
        self.c = Counter()
        self.samples = defaultdict(list)
        self.outcomes = Counter()


def ratio(n, d):
    return n / d if d else None


def mean(xs):
    return {"n": len(xs), "value": sum(xs) / len(xs) if xs else None}


def field_bin(yards):
    if yards is None or not 0 <= yards <= 99:
        return None
    return FIELDS[0] if yards > 70 else FIELDS[1] if yards >= 50 else FIELDS[2] if yards >= 35 else FIELDS[3] if yards >= 20 else FIELDS[4]


def distance_bin(yards):
    if yards is None or yards < 1:
        return None
    return str(int(yards)) if yards in (1, 2) else "3-5" if yards <= 5 else "6-10" if yards <= 10 else "11+"


def lost_fumble_team(row):
    """Attribute one provider lost-fumble row flag; don't invent a multi-loss ledger."""
    clubs = {row["home_team"], row["away_team"]}
    pairs = [(row[f"fumbled_{i}_team"], row[f"fumble_recovery_{i}_team"]) for i in (1, 2)]
    losses = {team for team, recovery in pairs if team in clubs and recovery in clubs and team != recovery}
    if len(losses) == 1:
        return next(iter(losses))
    if len(losses) > 1:
        return None
    fumblers = {team for team, _ in pairs if team in clubs}
    return next(iter(fumblers)) if len(fumblers) == 1 else None


def games(root, year):
    """Require grouped native game order; bound memory to one game, reject duplicate plays."""
    current, rows, seen_games, seen_plays = None, [], set(), set()
    for row in reference.read_csv(root / f"play_by_play_{year}.csv.gz"):
        if not REQUIRED <= row.keys():
            raise ValueError(f"Missing PBP columns: {sorted(REQUIRED - row.keys())}")
        if row["season_type"] != "REG":
            continue
        if number(row["season"]) != year:
            raise ValueError("Season/file mismatch")
        game_id, play_id = reference.play_key(row)
        if game_id != current:
            if rows:
                yield sorted(rows, key=lambda r: number(r["play_id"]))
            if game_id in seen_games:
                raise ValueError("Input must group rows by game")
            seen_games.add(game_id)
            current, rows, seen_plays = game_id, [], set()
        if play_id in seen_plays:
            raise ValueError(f"Duplicate PBP identity: {game_id}/{play_id}")
        seen_plays.add(play_id)
        rows.append(row)
    if rows:
        yield sorted(rows, key=lambda r: number(r["play_id"]))


def summarize(s, team_games):
    c, samples = s.c, s.samples
    def event(prefix, successes):
        n = c[prefix + ".n"]
        return {"n": n, **{key: c[prefix + "." + key] for key in successes},
                **{key + "Rate": ratio(c[prefix + "." + key], n) for key in successes}}
    fg = event("fg", ("made", "blocked"))
    fg["distanceBins"] = [{"distanceYd": label, **event("fg." + label, ("made", "blocked"))} for label, _, _ in FG_BINS]
    fg["outsideBinsOrUnknownDistance"] = c["fg.unbinned"]
    punt = event("punt", ("touchback", "fairCatch", "returnInvolvement", "inside20", "blocked"))
    punt.update(perTeamGame=ratio(c["punt.n"], team_games), grossYards=mean(samples["punt.gross"]),
                netYards=mean(samples["punt.net"]), returnInvolvementYards=mean(samples["punt.return"]))
    kickoff = event("kickoff", ("touchback", "returned", "onside"))
    kickoff.update(returnYards=mean(samples["kickoff.return"]), onsideRecovered=c["kickoff.onsideRecovered"])
    fourth = event("fourth", ("go", "punt", "fg"))
    fourth.update(conversions={"n": c["fourth.goKnown"], "converted": c["fourth.converted"],
                               "rate": ratio(c["fourth.converted"], c["fourth.goKnown"])},
                  cells=[{"field": f, "yardsToGo": d, **event(f"fourth.{f}.{d}", ("go", "punt", "fg")),
                          "conversionN": c[f"fourth.{f}.{d}.goKnown"],
                          "converted": c[f"fourth.{f}.{d}.converted"],
                          "conversionRate": ratio(c[f"fourth.{f}.{d}.converted"], c[f"fourth.{f}.{d}.goKnown"])}
                         for f in FIELDS for d in DISTANCES])
    two = event("two", ("success",))
    two.update(touchdowns=c["two.td"], attemptsPerTouchdown=ratio(c["two.n"], c["two.td"]),
               byMargin=[{"marginAfterTD": int(m) if m not in ("outside", "unknown") else m,
                          "n": c[f"two.{m}.td"], "attempts": c[f"two.{m}.n"],
                          "attemptsPerTouchdown": ratio(c[f"two.{m}.n"], c[f"two.{m}.td"]),
                          "successes": c[f"two.{m}.success"],
                          "successRate": ratio(c[f"two.{m}.success"], c[f"two.{m}.n"])} for m in MARGINS])
    penalties = {"n": c["penalty.n"], "perTeamGame": ratio(c["penalty.n"], team_games),
                 "byType": [{"type": t, "n": c["penalty." + t],
                             "perTeamGame": ratio(c["penalty." + t], team_games)} for t in TYPES]}
    drives = {"n": c["drive.n"], "perTeamGame": ratio(c["drive.n"], team_games),
              "offensivePoints": c["drive.points"], "pointsPerDrive": ratio(c["drive.points"], c["drive.n"]),
              "redZone": {"n": c["drive.rz"], "touchdowns": c["drive.rzTD"],
                          "tdRate": ratio(c["drive.rzTD"], c["drive.rz"])},
              "outcomes": [{"result": result, "n": n, "share": ratio(n, c["drive.n"])} for result, n in sorted(s.outcomes.items())]}
    return {"n": team_games, "fieldGoals": fg, "extraPoints": event("xp", ("made",)), "punts": punt,
            "kickoffs": kickoff, "fourthDown": fourth, "twoPoint": two, "penalties": penalties,
            "drives": drives,
            "turnovers": {"n": c["turnover.n"], "interceptions": c["turnover.int"],
                          "lostFumbleFlags": c["turnover.fumble"], "unattributedFlags": c["turnover.unattributed"],
                          "teamAttributionAmbiguous": c["turnover.ambiguous"],
                          "perTeamGame": None if c["turnover.ambiguous"] else ratio(c["turnover.n"], team_games)},
            "spikes": {"n": c["spike.n"], "perTeamGame": ratio(c["spike.n"], team_games)},
            "kneels": {"n": c["kneel.n"], "perTeamGame": ratio(c["kneel.n"], team_games)},
            "timeouts": {"n": len(samples["timeout.half"]), "charged": c["timeout.n"], "annotations": c["timeout.annotations"],
                         "perTeamHalf": ratio(c["timeout.n"], len(samples["timeout.half"])),
                         "usedPerTeamHalf": distribution(samples["timeout.half"])}}


def range_values(report):
    """Only sufficiently aggregated team-season measures, not sparse policy cells."""
    out = {"fg.makeRate": report["fieldGoals"]["madeRate"], "fg.blockedRate": report["fieldGoals"]["blockedRate"],
           "xp.makeRate": report["extraPoints"]["madeRate"],
           "punt.perTeamGame": report["punts"]["perTeamGame"],
           "kickoff.touchbackRate": report["kickoffs"]["touchbackRate"],
           "kickoff.returnRate": report["kickoffs"]["returnedRate"],
           "two.attemptsPerTD": report["twoPoint"]["attemptsPerTouchdown"],
           "two.successRate": report["twoPoint"]["successRate"],
           "penalties.perTeamGame": report["penalties"]["perTeamGame"],
           "drives.perTeamGame": report["drives"]["perTeamGame"],
           "drives.pointsPerDrive": report["drives"]["pointsPerDrive"],
           "redZone.tdRate": report["drives"]["redZone"]["tdRate"],
           "turnovers.perTeamGame": report["turnovers"]["perTeamGame"],
           "spikes.perTeamGame": report["spikes"]["perTeamGame"],
           "kneels.perTeamGame": report["kneels"]["perTeamGame"],
           "timeouts.perTeamHalf": report["timeouts"]["perTeamHalf"]}
    for b in report["fieldGoals"]["distanceBins"]:
        out["fg." + b["distanceYd"] + ".makeRate"] = b["madeRate"]
    for key in ("touchbackRate", "fairCatchRate", "returnInvolvementRate", "inside20Rate", "blockedRate"):
        out["punt." + key] = report["punts"][key]
    for key in ("grossYards", "netYards", "returnInvolvementYards"):
        out["punt." + key] = report["punts"][key]["value"]
    out["kickoff.returnYards"] = report["kickoffs"]["returnYards"]["value"]
    for key in ("goRate", "puntRate", "fgRate"):
        out["fourth." + key] = report["fourthDown"][key]
    for p in report["penalties"]["byType"]:
        out["penalty." + p["type"]] = p["perTeamGame"]
    return out


def season(rows_by_game):
    league, teams, team_games, audit = Stats(), defaultdict(Stats), Counter(), Counter()
    def targets(team):
        return (league, teams[team]) if team in team_games else (league,)
    def add(team, key, n=1):
        for s in targets(team):
            s.c[key] += n
    def sample(team, key, value):
        if value is not None:
            for s in targets(team):
                s.samples[key].append(value)
    game_count = 0
    for rows in rows_by_game:
        game_count += 1
        home, away = rows[0]["home_team"], rows[0]["away_team"]
        for team in (home, away):
            if not team:
                raise ValueError("Game team missing")
            team_games[team] += 1
        drives = defaultdict(list)
        timeout_halves = {(team, half): None for team in (home, away) for half in (1, 2)}
        pending_td = None
        for r in rows:
            audit["regularSeasonRows"] += 1
            team, kind = r["posteam"], r["play_type"]
            official = kind != "no_play"
            # nflfastR labels several completed tries no_play when a later
            # dead-ball foul is enforced between downs; the try still counts.
            official_try = official or bool(re.search(r"enforced between downs", r["desc"], re.I))
            # Penalties include no-play rows; first-penalty columns alone are insufficient.
            penalties = parse_penalties(r)
            for key in ("declined", "offsetting", "superseded", "unresolved"):
                audit["penalties." + key] += penalties.get(key, 0)
            for p in penalties["events"]:
                add(p["team"], "penalty.n")
                add(p["team"], "penalty." + p["type"])
                audit["penalties.unknownTeam"] += p["team"] not in (home, away)
            if official and flag(r["field_goal_attempt"]):
                result = r["field_goal_result"]
                if result not in ("made", "missed", "blocked"):
                    audit["fg.unknownResult"] += 1
                else:
                    add(team, "fg.n")
                    add(team, "fg.made", result == "made")
                    add(team, "fg.blocked", result == "blocked")
                    distance = number(r["kick_distance"])
                    label = next((b for b, lo, hi in FG_BINS if distance is not None and lo <= distance <= hi), None)
                    if label is None:
                        add(team, "fg.unbinned")
                    else:
                        add(team, f"fg.{label}.n")
                        add(team, f"fg.{label}.made", result == "made")
                        add(team, f"fg.{label}.blocked", result == "blocked")
            if official_try and flag(r["extra_point_attempt"]):
                if r["extra_point_result"] not in ("good", "failed", "blocked"):
                    audit["xp.unknownResult"] += 1
                else:
                    add(team, "xp.n")
                    add(team, "xp.made", r["extra_point_result"] == "good")
            if official and flag(r["punt_attempt"]):
                add(team, "punt.n")
                for col, key in (("touchback", "touchback"), ("punt_fair_catch", "fairCatch"),
                                 ("punt_inside_twenty", "inside20"), ("punt_blocked", "blocked")):
                    add(team, "punt." + key, flag(r[col]) is True)
                returned = bool(r["punt_returner_player_id"]) and not any(flag(r[k]) for k in
                    ("touchback", "punt_fair_catch", "punt_downed", "punt_out_of_bounds", "punt_blocked"))
                add(team, "punt.returnInvolvement", returned)
                yards, ret = number(r["kick_distance"]), number(r["return_yards"])
                if not flag(r["punt_blocked"]):
                    sample(team, "punt.gross", yards)
                    sample(team, "punt.net", yards - ret - (20 if flag(r["touchback"]) else 0)
                           if yards is not None and ret is not None else None)
                if returned:
                    sample(team, "punt.return", ret)
            if official and flag(r["kickoff_attempt"]):
                kicking = r["defteam"]  # nflfastR posteam is the receiving team here.
                add(kicking, "kickoff.n")
                onside = bool(re.search(r"\bonside\b", r["desc"], re.I))
                returned = bool(r["kickoff_returner_player_id"]) and not onside and not any(flag(r[k]) for k in
                    ("touchback", "kickoff_fair_catch", "kickoff_downed", "kickoff_out_of_bounds", "own_kickoff_recovery"))
                add(kicking, "kickoff.touchback", flag(r["touchback"]) is True)
                add(kicking, "kickoff.returned", returned)
                add(kicking, "kickoff.onside", onside)
                add(kicking, "kickoff.onsideRecovered", onside and flag(r["own_kickoff_recovery"]) is True)
                if returned:
                    sample(kicking, "kickoff.return", number(r["return_yards"]))
            if number(r["down"]) == 4:
                quarter, seconds, margin = number(r["qtr"]), number(r["half_seconds_remaining"]), number(r["score_differential"])
                if quarter not in (1, 2, 3, 4) or seconds is None or margin is None:
                    audit["fourth.excludedOvertimeOrUnknownContext"] += 1
                elif seconds <= 120:
                    audit["fourth.excludedLastTwoMinutes"] += 1
                elif quarter == 4 and abs(margin) >= 17:
                    audit["fourth.excludedGarbage"] += 1
                elif not official or flag(r["qb_kneel"]) or flag(r["qb_spike"]):
                    audit["fourth.excludedNoPlayOrClockAct"] += 1
                else:
                    f, d = field_bin(number(r["yardline_100"])), distance_bin(number(r["ydstogo"]))
                    choice = "punt" if flag(r["punt_attempt"]) else "fg" if flag(r["field_goal_attempt"]) else "go" if kind in ("run", "pass") else None
                    if f is None or d is None or choice is None:
                        audit["fourth.excludedUnknownDecisionOrGrid"] += 1
                    else:
                        for prefix in ("fourth", f"fourth.{f}.{d}"):
                            add(team, prefix + ".n")
                            add(team, prefix + "." + choice)
                            if choice == "go" and (flag(r["fourth_down_converted"]) or flag(r["fourth_down_failed"])):
                                add(team, prefix + ".goKnown")
                                add(team, prefix + ".converted", flag(r["fourth_down_converted"]) is True)
            is_try = flag(r["extra_point_attempt"]) or flag(r["two_point_attempt"])
            if official and flag(r["touchdown"]) and not is_try:
                td_team = r["td_team"]
                margin = number(r["posteam_score_post"]) - number(r["defteam_score_post"]) if number(r["posteam_score_post"]) is not None and number(r["defteam_score_post"]) is not None else None
                if td_team != team and margin is not None:
                    margin = -margin
                bucket = "unknown" if margin is None else str(int(margin)) if -15 <= margin <= 15 else "outside"
                add(td_team, "two.td")
                add(td_team, f"two.{bucket}.td")
                pending_td = {"team": td_team, "margin": bucket, "consumed": False}
            if official_try and flag(r["two_point_attempt"]):
                if r["two_point_conv_result"] not in ("success", "failure"):
                    audit["two.unknownResult"] += 1
                else:
                    add(team, "two.n")
                    success = r["two_point_conv_result"] == "success"
                    add(team, "two.success", success)
                    if pending_td and pending_td["team"] == team and not pending_td["consumed"]:
                        prefix = "two." + pending_td["margin"]
                        add(team, prefix + ".n")
                        add(team, prefix + ".success", success)
                        pending_td["consumed"] = True
                    else:
                        audit["two.unmatchedOrRepeatedTD"] += 1
            if official and not is_try:
                for source, key in (("qb_spike", "spike.n"), ("qb_kneel", "kneel.n")):
                    add(team, key, flag(r[source]) is True)
                if flag(r["interception"]):
                    add(team, "turnover.int")
                    add(team, "turnover.n")
                if flag(r["fumble_lost"]):
                    fumbler = lost_fumble_team(r)
                    add(fumbler, "turnover.fumble")
                    add(fumbler, "turnover.n")
                    if fumbler is None:
                        league.c["turnover.unattributed"] += 1
                        audit["turnovers.ambiguousFumbleAttribution"] += 1
                        for club in (home, away):
                            teams[club].c["turnover.ambiguous"] += 1
            quarter = number(r["qtr"])
            if quarter in (1, 2, 3, 4):
                half = 1 if quarter <= 2 else 2
                for club, key in ((home, "home_timeouts_remaining"), (away, "away_timeouts_remaining")):
                    remaining = number(r[key])
                    if remaining is not None:
                        if remaining not in (0, 1, 2, 3):
                            raise ValueError("Invalid timeout inventory")
                        timeout_halves[(club, half)] = int(remaining)
            if flag(r["timeout"]) and r["timeout_team"] in (home, away) and quarter in (1, 2, 3, 4):
                charged_team = r["timeout_team"]
                add(charged_team, "timeout.annotations")
            if r["fixed_drive"]:
                drives[(r["fixed_drive"], team)].append(r)
        for (team, _), remaining in timeout_halves.items():
            if remaining is None:
                audit["timeouts.missingTerminalInventory"] += 1
            else:
                used = 3 - remaining
                sample(team, "timeout.half", used)
                add(team, "timeout.n", used)
        for drive in drives.values():
            live = [r for r in drive if r["play_type"] in ("run", "pass", "qb_kneel", "qb_spike", "punt", "field_goal")
                    and not flag(r["two_point_attempt"])]
            if not live:
                audit["drives.excludedNoPossessionPlay"] += 1
                continue
            owner = live[0]["posteam"]
            if owner not in (home, away):
                raise ValueError("Drive owner missing")
            add(owner, "drive.n")
            scored_td = any(flag(r["touchdown"]) and r["td_team"] == owner and r["play_type"] != "no_play" and not flag(r["two_point_attempt"]) for r in drive)
            rz = any(r["posteam"] == owner and number(r["yardline_100"]) is not None and number(r["yardline_100"]) <= 20 for r in live)
            add(owner, "drive.rz", rz)
            add(owner, "drive.rzTD", rz and scored_td)
            points = 6 * int(scored_td)
            for r in drive:
                if r["posteam"] != owner or (r["play_type"] == "no_play" and not (
                        (flag(r["two_point_attempt"]) or flag(r["extra_point_attempt"])) and
                        re.search(r"enforced between downs", r["desc"], re.I))):
                    continue
                points += 3 * (r["field_goal_result"] == "made") + (r["extra_point_result"] == "good") + 2 * (r["two_point_conv_result"] == "success")
            add(owner, "drive.points", points)
            results = {r["fixed_drive_result"] for r in drive if r["fixed_drive_result"]}
            if len(results) != 1:
                audit["drives.unknownOrInconsistentResult"] += 1
            outcome = next(iter(results)) if len(results) == 1 else "unknown"
            for s in targets(owner):
                s.outcomes[outcome] += 1
    report = summarize(league, sum(team_games.values()))
    reports = [summarize(teams[t], n) for t, n in sorted(team_games.items())]
    values = [range_values(r) for r in reports]
    report.update(games={"n": game_count, "teamGames": sum(team_games.values()), "byTeam": dict(sorted(team_games.items()))},
                  teamSeasonRanges={key: distribution(v[key] for v in values) for key in values[0]},
                  audit={"n": audit["regularSeasonRows"], **dict(sorted(audit.items()))})
    return report, values


DEFINITIONS = {
    "population": "2022 and 2023 REG PBP. Games/team-games are observed game IDs, not assumed schedule counts. No postseason.",
    "units": "Rates are fractions, not percentages. Every table/row states n; averages also state their nonmissing n. Null means no eligible/known denominator.",
    "kicks": "FG/XP/punts/kickoffs require the attempt flag and play_type != no_play, except a completed XP with an explicit between-downs foul is retained. FG outcomes made/missed/blocked; XP good/failed/blocked. FG bins are inclusive integer yards; outside/missing distance counted separately.",
    "punts": "Rates use all recorded non-nullified punt attempts, blocked included. Gross/net averages exclude blocked punts. Net = kick_distance - return_yards - 20 for a touchback, with both yardage fields known; it is a PBP-derived net, not a penalty-adjusted official punter ledger. Return involvement means a returner ID without touchback, fair catch, downed, OOB or blocked flag; zero-yard/negative returns and muffs count. This proxy is not certified official credited returns.",
    "kickoffs": "Kicking team is defteam (posteam receives). Touchback/return shares use all non-nullified kickoffs. Returns require returner ID and exclude touchback, fair catch, downed, OOB, own recovery and onside. Onside attempts are explicit onside labels in desc; no dedicated onside flag is supplied.",
    "seasonRules": "Historical 2022/2023 populations, not 2026 rule-matched targets. The 2023 inside-25 kickoff fair-catch rule changed this population, and both seasons predate the 2024 dynamic kickoff. Prefer the separate season tables before using pooled team-season ranges.",
    "fourthDown": "Regulation, half_seconds_remaining >120, known preplay margin, excluding Q4 abs(margin)>=17 as garbage time; exclude no_play, kneels and spikes. Observed choices only, not recommended policy. Go conversion uses known fourth_down_converted/failed flags, not assumed success from yardage.",
    "fourthFieldGrid": "yardline_100 measures distance to opponent goal: own1-29=71..99; own30-49=50..70 including midfield (omitted in requested labels); opp49-35=35..49; opp34-20=20..34; redZone=0..19. For this disjoint decision grid, the 20 is assigned to opp34-20; drive red zone separately uses <=20.",
    "fourthDistanceGrid": "ydstogo=1,2,3..5,6..10,11+. Unknown/invalid states excluded with audit counts. All 25 cells retained, including n=0.",
    "twoPoint": "Tries with success/failure outcomes, per all official TDs including defensive/ST TDs. Exclude no_play except explicit fouls enforced between downs, which do not erase the completed try. Associate each try with the most recent same-team TD, using scoring-team margin immediately after its six points, before the try. Margin -15..15 plus outside/unknown rows; unmatched/repeated TD links audited.",
    "penalties": "Accepted enforced description clauses after the last replay reversal; first-penalty columns alone are insufficient. Declined, offsetting and superseded clauses excluded and audited. Team/type/acceptance gaps stay unresolved; other contains known accepted types outside the listed categories. Delay of game combines offensive and defensive labels. Penalties include no_play and special teams.",
    "drives": "One game/fixed_drive/posteam with at least one run/pass/punt/FG possession play (kneels/spikes included, tries excluded); kickoff-only/no-possession groups excluded. Splitting by owner avoids a known fixed_drive merge of two possessions. Outcome is unique provider fixed_drive_result. Offensive points only: owner's TD*6, made FG*3 and subsequent made XP/2pt in the group; defensive/ST returns and safeties do not inflate offensive PPD.",
    "redZone": "Eligible drive with at least one possession-play preplay yardline_100<=20; long TDs without a preplay RZ snap are not trips. TD numerator requires the drive owner to score.",
    "turnovers": "nflfastR interception + fumble_lost row flags on non-nullified, non-try rows. Interceptions credit posteam; fumble flags credit the unique differing-team recovery pair, or a unique known fumbler (covers muffs, repeated same-team fumbles and touchbacks). If both teams explicitly lose a fumble, retain one league row flag but leave team attribution unknown; affected team-season rates are null/excluded from quantiles. This is a provider row-flag reference, not a complete multiple-turnover ledger.",
    "timeouts": "Charged inventory used =3 minus the last known home/away_timeouts_remaining in each regulation half, after ordering by numeric play_id; includes zero-use halves. Missing terminal inventories audited and excluded from known denominator. timeout==1 named-team annotations reported separately: they can include refunded/uncharged fourth timeouts and must not be called charged usage. Overtime excluded.",
    "ranges": "Equal-weight team-season values, separately 32 per season and pooled 64 when nonmissing; linear-interpolated p10/p50/p90. Descriptive variation, not uncertainty intervals, fitted targets or independent play samples. Sparse fourth/margin cells have n but no team-season percentile bands.",
}


def study(root):
    manifest = json.loads((root / MANIFEST).read_text())
    wanted = {f"play_by_play_{year}.csv.gz" for year in YEARS}
    inputs = sorted((r for r in manifest["files"] if r["name"] in wanted), key=lambda r: r["name"])
    if {r["name"] for r in inputs} != wanted or len(inputs) != len(wanted):
        raise ValueError("Missing or duplicate input provenance; run --download first")
    for record in inputs:
        path = root / record["name"]
        if path.stat().st_size != record["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != record["sha256"]:
            raise ValueError(f"Input checksum mismatch: {record['name']}")
    reports, team_values = {}, []
    for year in YEARS:
        reports[str(year)], values = season(games(root, year))
        team_values.extend(values)
    sources = ("scripts/data/nflverse_game_layer.py", "scripts/data/nflverse_penalties.py", "scripts/nflverse-reference.py")
    return {"schemaVersion": 1, "task": "M1", "provenance": {
                "source": "NFL/nflfastR play-by-play via nflverse-data releases", "inputs": inputs,
                "extractors": [{"path": p, "sha256": hashlib.sha256((ROOT / p).read_bytes()).hexdigest()} for p in sources],
                "dictionaryCommit": "23f915a5be30415aeaa0c5c80cd23b2c69cda122"},
            "license": {"source": "CC-BY-4.0", "sourceTerms": "https://github.com/nflverse/nflverse-data/blob/master/LICENSE.md",
                        "derivedAggregate": "CC-BY-SA-4.0", "terms": "https://creativecommons.org/licenses/by-sa/4.0/",
                        "attribution": "NFL/nflfastR PBP via nflverse; filtered, regrouped and aggregated by football-simulation-. No FTN charting used."},
            "definitions": DEFINITIONS, "seasons": reports,
            "teamSeasonRanges": {key: distribution(v[key] for v in team_values) for key in team_values[0]}}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--raw", type=Path, default=ROOT / "data/raw/nflverse")
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--download", action="store_true")
    args = p.parse_args()
    if args.download:
        reference.download(args.raw, {"pbp": [f"play_by_play_{y}.csv.gz" for y in YEARS]}, MANIFEST)
    report = study(args.raw)
    data = json.dumps(report, indent=2, allow_nan=False) + "\n"
    if len(data.encode()) >= 200_000:
        raise ValueError("Game-layer aggregate exceeds 200 KB")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(data)
    for year, s in report["seasons"].items():
        print(year, "games", s["games"]["n"], "FG", round(s["fieldGoals"]["madeRate"], 4),
              "XP", round(s["extraPoints"]["madeRate"], 4), "punts/team-game", round(s["punts"]["perTeamGame"], 3))
    print("Saved", args.out, "bytes", len(data.encode()))


if __name__ == "__main__":
    main()
