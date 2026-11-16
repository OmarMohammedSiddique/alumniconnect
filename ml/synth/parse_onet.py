"""Parse the O*NET text database into one compact JSON taxonomy file.

Standard library only. Run in isolated mode so nothing in the download
directory can be imported:

    python -I ml/synth/parse_onet.py ml/data/onet/download/db_30_2_text ml/data/onet/taxonomy.json

O*NET is published by the U.S. Department of Labor, Employment and Training
Administration, under CC BY 4.0. The download itself stays in the ignored
`ml/data/` folder.
"""
import csv
import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path

PRIMARY_TIERS = {"Primary-Short", "Primary-Long"}


def rows(folder, name):
    with open(folder / name, encoding="utf-8", newline="") as handle:
        yield from csv.DictReader(handle, delimiter="\t", quoting=csv.QUOTE_NONE)


def top_elements(folder, name, limit):
    """Highest importance (IM scale) elements per occupation."""
    found = defaultdict(list)
    for row in rows(folder, name):
        if row["Scale ID"] == "IM" and row["Recommend Suppress"] != "Y":
            found[row["O*NET-SOC Code"]].append((float(row["Data Value"]), row["Element Name"]))
    return {code: [n for _, n in sorted(items, key=lambda x: (-x[0], x[1]))[:limit]] for code, items in found.items()}


def parse(folder):
    folder = Path(folder)
    occupations = {}
    for row in rows(folder, "Occupation Data.txt"):
        occupations[row["O*NET-SOC Code"]] = {"title": row["Title"], "description": row["Description"]}
    for row in rows(folder, "Job Zones.txt"):
        if row["O*NET-SOC Code"] in occupations:
            occupations[row["O*NET-SOC Code"]]["job_zone"] = int(row["Job Zone"])
    tasks = defaultdict(list)
    for row in rows(folder, "Task Statements.txt"):
        if row["Task Type"] == "Core":
            tasks[row["O*NET-SOC Code"]].append(row["Task"])
    tech = defaultdict(list)
    for row in rows(folder, "Technology Skills.txt"):
        tech[row["O*NET-SOC Code"]].append((row["Hot Technology"] == "Y", row["Example"], row["Commodity Title"]))
    alternates = defaultdict(list)
    for row in rows(folder, "Alternate Titles.txt"):
        alternates[row["O*NET-SOC Code"]].append(row["Alternate Title"])
    related = defaultdict(list)
    for row in rows(folder, "Related Occupations.txt"):
        if row["Relatedness Tier"] in PRIMARY_TIERS:
            related[row["O*NET-SOC Code"]].append(row["Related O*NET-SOC Code"])
    skills = top_elements(folder, "Skills.txt", 8)
    knowledge = top_elements(folder, "Knowledge.txt", 6)
    usable = [code for code, item in sorted(occupations.items())
              if "job_zone" in item and len(tasks[code]) >= 5 and len(tech[code]) >= 5 and code in knowledge]
    # Tools listed for more than a quarter of occupations (office suites, email) say nothing
    # about a field, so they are dropped. Hot technologies come first, then better-known tools.
    frequency = defaultdict(int)
    for code in usable:
        for name in {name for _, name, _ in tech[code]}:
            frequency[name] += 1
    ceiling = len(usable) // 4
    kept = {}
    for code in usable:
        item = occupations[code]
        specific = sorted({(not hot, -frequency[name], name) for hot, name, _ in tech[code] if frequency[name] <= ceiling})
        kept[code] = {
            **item,
            "tasks": tasks[code][:10],
            "tools": [name for _, _, name in specific[:20]],
            "skills": skills.get(code, []),
            "knowledge": knowledge[code],
            "alternate_titles": sorted(alternates[code])[:40],
            "related": related[code],
        }
    for item in kept.values():
        item["related"] = [code for code in item["related"] if code in kept]
    return kept


def main(argv):
    if len(argv) != 3:
        raise SystemExit("usage: python -I parse_onet.py <onet text folder> <output json>")
    folder, output = Path(argv[1]), Path(argv[2])
    occupations = parse(folder)
    readme = (folder / "Read Me.txt").read_text(encoding="utf-8", errors="replace")
    payload = {
        "source": "O*NET Database, U.S. Department of Labor, Employment and Training Administration",
        "licence": "CC BY 4.0, https://www.onetcenter.org/license_db.html",
        "version": readme.strip().splitlines()[0].strip(),
        "release": readme.strip().splitlines()[1].strip(),
        "occupation_data_sha256": hashlib.sha256((folder / "Occupation Data.txt").read_bytes()).hexdigest(),
        "occupations": occupations,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{payload['version']} ({payload['release']}): kept {len(occupations)} occupations -> {output}")


if __name__ == "__main__":
    main(sys.argv)
