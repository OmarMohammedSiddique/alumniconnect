"""Plot validation nDCG@5 against the amount of training data (data-size learning curve).

    python ml/plot_learning_curve_v3.py ml/runs <output.png> <output.json> <run> [<run> ...]

Each run is the selected configuration trained on a fraction of the training Mentees and
their judged pools, with the same validation pool. This is separate from the loss-per-epoch
curves saved inside each run.
"""
import json
import sys
from pathlib import Path


def collect(root, names):
    points = []
    for name in names:
        record = json.loads((Path(root) / name / "run.json").read_text())
        points.append({"run": name, "fraction": record["train_fraction"], "train_mentees": record["data"]["counts"]["train_mentees"],
                       "train_pairs": record["data"]["counts"]["train_pairs"], "seed": record["seed"], "status": record["status"],
                       "validation_ndcg5": record["validation"]["ndcg5"]["mean"] if record["status"] == "ok" else None,
                       "ci95": record["validation"]["ndcg5"]["ci95"] if record["status"] == "ok" else None,
                       "best_epoch": record.get("best_epoch")})
    return sorted(points, key=lambda point: (point["fraction"], point["seed"]))


def plot(points, target, references=None):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    scored = [point for point in points if point["validation_ndcg5"] is not None]
    figure, axis = plt.subplots(figsize=(6.4, 4))
    axis.errorbar([p["train_mentees"] for p in scored], [p["validation_ndcg5"] for p in scored],
                  yerr=[[p["validation_ndcg5"] - p["ci95"][0] for p in scored], [p["ci95"][1] - p["validation_ndcg5"] for p in scored]],
                  marker="o", capsize=3, label="scratch v3 (95% interval over validation Mentees)")
    for name, value in (references or {}).items():
        axis.axhline(value, linestyle="--", linewidth=1, label=name, color={"TF-IDF": "tab:green", "MiniLM": "tab:red"}.get(name, "grey"))
    axis.set(xlabel="training Mentees used (each with its judged pool)", ylabel="validation nDCG@5",
             title="Data-size learning curve")
    axis.legend(fontsize=8)
    figure.tight_layout()
    figure.savefig(target, dpi=130)
    plt.close(figure)


if __name__ == "__main__":
    root, image, output, names = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
    found = collect(root, names)
    baselines = json.loads((Path(root) / "v3-baselines-validation" / "baselines.json").read_text())
    plot(found, image, {"TF-IDF": baselines["tfidf"]["subsets"]["all"]["ndcg5"]["mean"],
                        "MiniLM": baselines["minilm"]["subsets"]["all"]["ndcg5"]["mean"]})
    Path(output).write_text(json.dumps(found, indent=1) + "\n")
    for point in found:
        print(point)
