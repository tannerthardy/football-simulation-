"""Retain exact owner observations separately from paired isolated setups.

python3 scripts/data/owner_film_report.py out/owner-feedback-original.json out/owner-feedback-fixed-before.json out/owner-feedback-fixed-after.json out/owner-feedback-reviewed
"""
import argparse
import json
from pathlib import Path


def contact_rows(clip):
    bodies = clip["bodies"]
    rows = []
    for row in clip["rows"]:
        for contact in row.get("contacts") or []:
            a, b = bodies[contact["i"]], bodies[contact["j"]]
            if a["team"] == b["team"]:
                rows.append({"tickStart": row["t"], "team": a["team"], "slots": [a["slot"], b["slot"]], **contact})
    return rows


def summary(clip):
    return {"result": clip["result"], "events": clip["events"], "teammateContacts": contact_rows(clip),
            "falls": [{"tickStart": row["t"], "slots": [clip["bodies"][i]["slot"] for i in row["falls"]]}
                      for row in clip["rows"] if row.get("falls")]}


def samples(clip):
    wanted = {i for i, body in enumerate(clip["bodies"])
              if body.get("alignment", {}).get("manTarget") or body["slot"] in ("QB", "RB", "F", "LG", "CB_S", "NB")}
    out = []
    for row in clip["rows"]:
        interesting = any(e["type"] in ("handoff", "throw", "catch", "interception") for e in row["events"])
        teammate_hit = any(clip["bodies"][c["i"]]["team"] == clip["bodies"][c["j"]]["team"] and c["closing"] > 1
                           for c in row.get("contacts") or [])
        if abs(row["t"] - round(row["t"])) < 1e-7 or interesting or teammate_hit or row.get("falls"):
            out.append({"t": row["t"], "ball": row["ball"], "carrier": row.get("carrier"), "events": row["events"],
                        "agents": [{"team": clip["bodies"][i]["team"], "slot": clip["bodies"][i]["slot"], **agent}
                                   for i, agent in enumerate(row["agents"]) if i in wanted]})
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("original", type=Path)
    parser.add_argument("before", type=Path)
    parser.add_argument("after", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    original, before, after = (json.loads(p.read_text()) for p in (args.original, args.before, args.after))
    assert original["sourceSha256"] == original["filmSourceSha256"] == before["sourceSha256"]
    assert original["clips"].keys() == before["clips"].keys() == after["clips"].keys()
    for id in original["clips"]:
        # Policies may differ; physical player capabilities must not be retuned.
        assert len(before["clips"][id]["bodies"]) == len(after["clips"][id]["bodies"])
        for a, b in zip(before["clips"][id]["bodies"], after["clips"][id]["bodies"]):
            assert (a["slot"], a["team"], a["profile"]) == (b["slot"], b["team"], b["profile"])
    observed = {"sourceSha256": original["sourceSha256"], "filmSourceSha256": original["filmSourceSha256"],
                "mode": original["mode"],
                "note": "All seven packed paths verified exactly by owner-film.ts. Contacts report the enclosing 0.05-s tick start, not exact continuous contact time. Samples retain integer-second rows, possession events, teammate contacts above 1 yd/s, and falls. Body indices refer to the retained bodies array. Full raw traces stay ignored.",
                "clips": {id: {"bodies": clip["bodies"], **summary(clip), "samples": samples(clip)} for id, clip in original["clips"].items()}}
    paired = {"beforeSourceSha256": before["sourceSha256"], "afterSourceSha256": after["sourceSha256"],
              "identicalPhysicalProfiles": True,
              "note": "Same saved calls/players/seed/energy/CB_S shadow; game scouting and audibles omitted. Original pressure objects remain serialized, but current alignment may drop an uncalled edge to restore enough markers. These are isolated scenarios, not original-clip counterfactuals; baseline results differ from original games. Only seven descriptive cases, not calibration. All original inputs retained in owner-setups.json.",
              "clips": {id: {"before": summary(before["clips"][id]), "after": summary(after["clips"][id])} for id in original["clips"]}}
    setups = {"sourceSha256": original["sourceSha256"], "note": paired["note"],
              "clips": {id: {"setup": clip["setup"]} for id, clip in original["clips"].items()}}
    args.output.mkdir(parents=True, exist_ok=True)
    for name, report in [("owner-observations", observed), ("owner-isolated-pairs", paired), ("owner-setups", setups)]:
        (args.output / (name + ".json")).write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
