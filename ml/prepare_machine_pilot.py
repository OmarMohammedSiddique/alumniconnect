"""Prepare a separate machine-labelled pilot; preserve all source labels/text."""
import argparse
import hashlib
import json
from pathlib import Path
from audit_pilot_bundle import audit

def prepare(source, target):
    source, target = Path(source), Path(target)
    report = audit(source)
    if report['structural_errors'] or report['correction_source_mismatches']:
        raise ValueError('Source integrity failed; inspect independent audit first')
    if target.exists():
        raise FileExistsError('Refusing to overwrite an existing pilot version')
    target.mkdir(parents=True)
    for split, prefix in [('train','original_training'),('validation','validation'),('test','test')]:
        for kind in ['profiles','pairs']:
            rows = [json.loads(line) for line in (source/f'{prefix}_{kind}.jsonl').read_text().splitlines() if line.strip()]
            for row in rows:
                row['split'] = split
                if kind == 'pairs':
                    assert row['annotation_status'] == 'machine_generated_pending_human_review'
            (target/f'{split}_{kind}.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows))
    flags = {
        'annotation_policy':'All labels remain machine-generated; audit does not imply human approval.',
        'no_rescoring':True,
        'proposed_corrections_applied':0,
        'priority_training_pairs':['PAIR-TRN-008','PAIR-TRN-015','PAIR-TRN-029','PAIR-TRN-035','PAIR-TRN-038','PAIR-TRN-055','PAIR-TRN-056'],
        'priority_test_pairs':['PAIR-TST-041'],
        'test_access':'No test performance during notebook development; final scoring withheld pending human review and model lock.',
        'profile_policy':'Do not delete explicit mentoring exclusions without rejudging all affected pairs.',
    }
    (target/'review_flags.json').write_text(json.dumps(flags,indent=2)+'\n')
    (target/'README.md').write_text('# Machine-labelled engineering pilot\n\nNot human-reviewed or a research-approved dataset freeze. Original profiles and\nscores preserved; split spelling normalized to validation. No proposed semantic\ncorrections auto-applied. See review_flags.json.\n\nUse only headline, bio, skills and industry as model input. Never feed rationale,\nambiguity, IDs, split or annotation status into the encoder. Test performance is\nwithheld. The separate original human-review sheet remains available for later.\n')
    manifest = {
        'version':'pilot-machine-v1','human_reviewed':False,'research_ready':False,
        'use':'engineering_smoke_test_only','source_hashes':report['input_hashes'],
        'changes':['Normalize val split name to validation','Separate immutable pilot and review flags','Replace misleading readiness wording; preserve labels and texts'],
        'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(target.iterdir())},
        'counts':report['counts'],
    }
    (target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return manifest

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('source');parser.add_argument('target');args=parser.parse_args()
    print(json.dumps(prepare(args.source,args.target)['counts'],indent=2))
