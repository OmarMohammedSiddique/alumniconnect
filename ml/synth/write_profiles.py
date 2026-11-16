"""Write profile wording for specifications with Claude Haiku, in resumable batches.

Each batch is one headless Claude Code call (`claude -p --model haiku`) with no tools, no
project settings and an empty working directory, so the writer sees only the system prompt and
the briefs from prompts.py. Raw replies are kept per batch; a batch that already has a reply
file is skipped, so an interrupted run can be continued.

    python ml/synth/write_profiles.py ml/data/onet/taxonomy.json ml/data/synth-v3 [--only ids.txt] [--round 2]
"""
import argparse
import json
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from prompts import SYSTEM, batch_prompt, template_for  # noqa: E402

BATCH = 20
WORKERS = 8
MODEL = "haiku"


def batches(specs):
    """Group by split (one prompt template each), mixing Mentors and Mentees in file order."""
    groups = {}
    for spec in specs:
        groups.setdefault(spec["split"], []).append(spec)
    for split in sorted(groups):
        rows = groups[split]
        for start in range(0, len(rows), BATCH):
            yield rows[start:start + BATCH]


def parse_reply(text, expected):
    """Extract the JSON array from a reply and check it has one well-formed object per brief."""
    start, end = text.find("["), text.rfind("]")
    if start < 0 or end < start:
        raise ValueError("no JSON array in reply")
    rows = json.loads(text[start:end + 1])
    if not isinstance(rows, list) or len(rows) != expected:
        raise ValueError(f"expected {expected} profiles, got {len(rows) if isinstance(rows, list) else 'non-list'}")
    cleaned = []
    for number, row in enumerate(rows, 1):
        if not isinstance(row, dict) or row.get("n") != number:
            raise ValueError(f"profile {number} is out of order or malformed")
        skills = row.get("skills")
        if not all(isinstance(row.get(key), str) for key in ("headline", "bio", "industry")) \
                or not isinstance(skills, list) or not all(isinstance(skill, str) for skill in skills):
            raise ValueError(f"profile {number} has wrong field types")
        cleaned.append({"headline": row["headline"].strip(), "bio": row["bio"].strip(),
                        "skills": [skill.strip() for skill in skills if skill.strip()],
                        "industry": row["industry"].strip()})
    return cleaned


def call_writer(system, prompt, workdir):
    command = ["claude", "-p", "--model", MODEL, "--system-prompt", system, "--tools", "", "--strict-mcp-config",
               "--setting-sources", "", "--output-format", "json", "--no-session-persistence"]
    done = subprocess.run(command, input=prompt, capture_output=True, text=True, cwd=workdir, timeout=900)
    if done.returncode != 0:
        raise RuntimeError(f"writer exited {done.returncode}: {done.stderr[-300:]}")
    reply = json.loads(done.stdout)
    if reply.get("is_error"):
        raise RuntimeError(f"writer error: {str(reply.get('result'))[:300]}")
    return reply


def write_batch(index, specs, taxonomy, raw_dir, round_number, workdir):
    target = raw_dir / f"round{round_number}_batch{index:04d}.json"
    if target.exists():
        return "kept"
    template = template_for(specs[0]["split"])
    prompt = batch_prompt(specs, taxonomy)
    for attempt in (1, 2, 3):
        try:
            reply = call_writer(SYSTEM[template], prompt, workdir)
            profiles = parse_reply(reply["result"], len(specs))
        except (ValueError, RuntimeError, subprocess.TimeoutExpired, json.JSONDecodeError) as problem:
            failure = str(problem)
            continue
        record = {"template": template, "model": sorted(reply.get("modelUsage", {})), "attempts": attempt,
                  "cost_usd": reply.get("total_cost_usd"), "output_tokens": reply.get("usage", {}).get("output_tokens"),
                  "profiles": [{"person_id": spec["person_id"], **profile} for spec, profile in zip(specs, profiles)]}
        target.write_text(json.dumps(record, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        return "written"
    print(f"batch {index} failed three times: {failure}", file=sys.stderr, flush=True)
    return "failed"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("taxonomy")
    parser.add_argument("data_dir")
    parser.add_argument("--only", help="file with person ids to (re)write, one per line")
    parser.add_argument("--round", type=int, default=1)
    parser.add_argument("--limit", type=int, help="write only the first N batches (trial run)")
    args = parser.parse_args()
    taxonomy = json.loads(Path(args.taxonomy).read_text(encoding="utf-8"))["occupations"]
    data_dir = Path(args.data_dir)
    specs = [json.loads(line) for line in (data_dir / "specs.jsonl").read_text(encoding="utf-8").splitlines()]
    if args.only:
        wanted = set(Path(args.only).read_text().split())
        specs = [spec for spec in specs if spec["person_id"] in wanted]
    raw_dir = data_dir / "raw"
    raw_dir.mkdir(exist_ok=True)
    jobs = list(enumerate(batches(specs)))[:args.limit]
    with tempfile.TemporaryDirectory() as workdir, ThreadPoolExecutor(WORKERS) as pool:
        results = list(pool.map(lambda job: write_batch(job[0], job[1], taxonomy, raw_dir, args.round, workdir), jobs))
    print({status: results.count(status) for status in sorted(set(results))})
    if "failed" in results:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
