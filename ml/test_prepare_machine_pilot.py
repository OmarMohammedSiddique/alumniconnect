import hashlib
import json
import unittest
import test_audit_pilot_bundle as fixtures
from prepare_machine_pilot import prepare

class PreparationTest(unittest.TestCase):
    def setUp(self):
        fixtures.BundleAuditTest.setUp(self)
    def write(self, name, rows):
        fixtures.BundleAuditTest.write(self, name, rows)
    def test_preserves_source_and_labels(self):
        before={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in self.root.iterdir()}
        output=self.root/'derived'
        manifest=prepare(self.root,output)
        self.assertFalse(manifest['human_reviewed'])
        row=json.loads((output/'validation_pairs.jsonl').read_text())
        self.assertEqual(row['relevance_score'],2)
        self.assertEqual(row['split'],'validation')
        self.assertEqual(row['annotation_status'],'machine_generated_pending_human_review')
        self.assertEqual(before,{name:hashlib.sha256((self.root/name).read_bytes()).hexdigest() for name in before})
    def test_refuses_overwrite(self):
        output=self.root/'derived';prepare(self.root,output)
        with self.assertRaises(FileExistsError):prepare(self.root,output)
    def test_rejects_missing_matrix(self):
        (self.root/'test_pairs.jsonl').write_text('')
        with self.assertRaises(ValueError):prepare(self.root,self.root/'derived')
