"""Corruption checks on synthetic fixtures; no private dataset needed."""
import csv
import json
from pathlib import Path
import tempfile
import unittest
from audit_pilot_bundle import audit

class BundleAuditTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        reviews=[]
        for split,prefix in [('train','original_training'),('val','validation'),('test','test')]:
            ps=[dict(person_id=f'{split}-{role}',role=role,split=split,headline=f'{split} {role} title',bio=f'{split} {role} details',skills=['skill'],industry='example') for role in ['mentor','mentee']]
            pair=dict(pair_id=f'{split}-pair',mentee_id=f'{split}-mentee',mentor_id=f'{split}-mentor',split=split,relevance_score=2,label_rationale='fixture reason',ambiguity_flag=False,annotation_status='machine_generated_pending_human_review')
            self.write(prefix+'_profiles.jsonl',ps);self.write(prefix+'_pairs.jsonl',[pair])
            row={'pair_id':pair['pair_id'],'mentee_id':pair['mentee_id'],'mentor_id':pair['mentor_id']}
            for p in ps:
                for k in ['headline','bio','industry']:row[p['role']+'_'+k]=p[k]
                row[p['role']+'_skills']='; '.join(p['skills'])
            row['human_relevance_score_0_to_3']='';reviews.append(row)
        self.write('proposed_training_corrections.jsonl',[])
        (self.root/'manifest.json').write_text('{"files":{}}')
        with (self.root/'human_review_sheet.csv').open('w',newline='') as f:
            w=csv.DictWriter(f,fieldnames=list(reviews[0]));w.writeheader();w.writerows(reviews)
    def write(self,name,rows):
        (self.root/name).write_text(''.join(json.dumps(x)+'\n' for x in rows))
    def test_valid_fixture(self):
        self.assertEqual(audit(self.root)['structural_errors'],[])
    def test_missing_test_judgment(self):
        self.write('test_pairs.jsonl',[])
        self.assertIn('incomplete heldout matrix:test',audit(self.root)['structural_errors'])
    def test_boolean_score_rejected(self):
        p=self.root/'validation_pairs.jsonl';x=json.loads(p.read_text());x['relevance_score']=True;self.write(p.name,[x])
        self.assertTrue(any('pair schema' in e for e in audit(self.root)['structural_errors']))
    def test_cross_split_id(self):
        p=self.root/'test_profiles.jsonl';rows=[json.loads(x) for x in p.read_text().splitlines()];rows[0]['person_id']='train-mentor';self.write(p.name,rows)
        self.assertTrue(any('duplicate person_id' in e for e in audit(self.root)['structural_errors']))
    def test_manifest_corruption(self):
        (self.root/'manifest.json').write_text('{"files":{"test_profiles.jsonl":{"sha256":"wrong"}}}')
        self.assertIn('manifest hash mismatch',audit(self.root)['structural_errors'])
    def test_review_text_mismatch(self):
        p=self.root/'human_review_sheet.csv';p.write_text(p.read_text().replace('train mentor details','wrong biography'))
        self.assertIn('review text differs',audit(self.root)['structural_errors'])

if __name__=='__main__':unittest.main()
