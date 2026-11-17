"""Tabulate v3 runs and apply the selection rule. Reads run records only; validation figures only.

    python ml/select_v3.py ml/runs v3-grid- v3-final- [--write ml/runs/v3-selection.json]

Rule, fixed before the first run:

1. Stage 1: each of the eight grid configurations is trained once with seed 42.
2. The two configurations with the highest validation nDCG@5 are finalists and are trained
   with every seed in SEEDS (the seed 42 run from stage 1 counts as one of them).
3. The configuration with the higher mean validation nDCG@5 over its seeds is selected.
   The checkpoint that is locked is the seed of that configuration with the highest
   validation nDCG@5.

A run that never passed the collapse check has no validation figure and cannot be selected.
"""
import argparse
import json
import statistics
import sys
from pathlib import Path


def name_of(config):
    return f"{config['encoder']}-w{config['width']}-{'pre' if config['pretrain'] else 'nopre'}"


def load_runs(root, prefixes):
    runs = []
    for folder in sorted(Path(root).iterdir()):
        if folder.is_dir() and any(folder.name.startswith(prefix) for prefix in prefixes) and (folder / "run.json").exists():
            runs.append(json.loads((folder / "run.json").read_text()))
    return [run for run in runs if run["train_fraction"] == 1.0]


def summarise(runs):
    by_config = {}
    for run in runs:
        by_config.setdefault(name_of(run["config"]), []).append(run)
    rows = []
    for name, group in sorted(by_config.items()):
        scored = [run for run in group if run["status"] == "ok"]
        values = [run["validation"]["ndcg5"]["mean"] for run in scored]
        rows.append({
            "configuration": name, "config": group[0]["config"], "parameters": group[0]["parameters"],
            "seeds": {str(run["seed"]): (run["validation"]["ndcg5"]["mean"] if run["status"] == "ok" else None) for run in group},
            "collapsed_runs": len(group) - len(scored),
            "mean_ndcg5": statistics.mean(values) if values else None,
            "sd_ndcg5": statistics.stdev(values) if len(values) > 1 else None,
            "best_epochs": {str(run["seed"]): run.get("best_epoch") for run in group},
            "collapse_share": {str(run["seed"]): (run["collapse"]["mentor_mean_variance_share"] if run["status"] == "ok" else None)
                               for run in group},
            "minutes": {str(run["seed"]): round(run["seconds_total"] / 60, 1) for run in group},
            "runs": {str(run["seed"]): run["run"] for run in group},
        })
    return rows


def stage_one(rows, seed="42"):
    scored = [row for row in rows if row["seeds"].get(seed) is not None]
    return [row["configuration"] for row in sorted(scored, key=lambda row: (-row["seeds"][seed], row["configuration"]))]


def select(rows, finalists, seeds):
    complete = [row for row in rows if row["configuration"] in finalists
                and all(row["seeds"].get(str(seed)) is not None for seed in seeds)]
    if not complete:
        return None
    winner = max(complete, key=lambda row: (row["mean_ndcg5"], row["configuration"]))
    seed = max(winner["seeds"], key=lambda key: (winner["seeds"][key], key))
    return {"configuration": winner["configuration"], "mean_ndcg5": winner["mean_ndcg5"], "sd_ndcg5": winner["sd_ndcg5"],
            "locked_seed": int(seed), "locked_run": winner["runs"][seed], "locked_ndcg5": winner["seeds"][seed]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("root")
    parser.add_argument("prefixes", nargs="+")
    parser.add_argument("--write")
    args = parser.parse_args()
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from train_scratch_v3 import SEEDS
    rows = summarise(load_runs(args.root, args.prefixes))
    order = stage_one(rows)
    result = {"rows": rows, "stage_one_order": order, "finalists": order[:2], "selected": select(rows, order[:2], SEEDS)}
    for row in rows:
        mean = f"{row['mean_ndcg5']:.4f}" if row["mean_ndcg5"] is not None else "none"
        print(f"{row['configuration']:28s} params {row['parameters']:>8d}  seeds {row['seeds']}  mean {mean}")
    print("finalists:", result["finalists"], "selected:", result["selected"])
    if args.write:
        Path(args.write).write_text(json.dumps(result, indent=1) + "\n")


if __name__ == "__main__":
    main()
