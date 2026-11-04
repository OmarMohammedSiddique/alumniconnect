# Machine-labelled pilot status · 2 November 2026

Human review is deferred at the user's request. Engineering preparation and a
from-scratch training smoke test are authorized. Labels must not be described as
human-reviewed, perfect or final ground truth.

`ml/prepare_machine_pilot.py` creates a separate ignored `ml/data/pilot-machine-v1`
from the supplied bundle after independent structural checks. It refuses to
replace an existing version. The original source files and human-review sheet
remain unchanged.

Completed preparation:

- [x] Independent structure/manifest/reference checks passed.
- [x] Derived split names standardized (`val` -> `validation`).
- [x] Separate manifest records source hashes and engineering-only scope.
- [x] All profile text and machine grades preserved; no speculative rescoring.
- [x] Twenty-seven proposed semantic corrections left unapplied pending review.
- [x] Priority review cases recorded separately from model inputs.
- [x] Human-reviewed/research-ready flags remain false.
- [ ] Human label and conceptual-template review (deferred).
- [ ] Research-approved dataset freeze (deferred).

Automated fixes address verifiable formatting, provenance and process boundaries.
Removing valid mentoring restrictions or inventing expert judgments would not
make the data better. Future human corrections create a new version and require
new comparisons; they do not retroactively validate this pilot's results.

Training/notebook execution evidence will be recorded in a separate milestone.
