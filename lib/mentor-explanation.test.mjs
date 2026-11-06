import assert from 'node:assert/strict';
import test from 'node:test';
import { sharedSkillLabels, mentorExplanation, formatProfileSimilarity } from './mentor-explanation.ts';

test('shared-skill explanations use only usable returned evidence, preserving input order', () => {
  const input = [' Python ', 'SQL', 'python', '', ' ', null, 5, 'Public Speaking'];
  const original = [...input];
  assert.deepEqual(sharedSkillLabels(input), ['Python', 'SQL', 'Public Speaking']);
  assert.deepEqual(input, original);
  assert.equal(mentorExplanation('semantic', input).summary, 'Shared skills: Python, SQL, Public Speaking');
});

test('absent or empty evidence never invents a recommendation reason', () => {
  for (const value of [undefined, null, [], ['', '  ', false], 'Python']) {
    const text = mentorExplanation('semantic', value);
    assert.match(text.summary, /^No exact shared skills identified\./);
    assert.match(text.limitation, /does not guarantee mentorship suitability or success/);
    assert.doesNotMatch(text.summary, /Shared skills:|%|expert|industry match/i);
  }
});

test('keyword results explain their retrieval mode without semantic claims', () => {
  for (const value of [null, [], ['Python']]) {
    const text = mentorExplanation('keyword', value);
    assert.match(text.summary, /keyword search/);
    assert.doesNotMatch(text.summary, /similarity|shared skills|%/i);
    assert.equal(text.limitation, null);
  }
});

test('technical cosine detail remains finite, bounded and never probability-like', () => {
  for (const value of [undefined, null, NaN, Infinity, -Infinity, -1.01, 1.01, '0.83']) {
    assert.equal(formatProfileSimilarity(value), 'Unavailable');
  }
  assert.equal(formatProfileSimilarity(-1), '-1.000');
  assert.equal(formatProfileSimilarity(0), '0.000');
  assert.equal(formatProfileSimilarity(0.8345), '0.835');
  assert.equal(formatProfileSimilarity(1), '1.000');
});

test('long returned labels stay literal and do not become generated reasons', () => {
  const label = 'UnbrokenSkill'.repeat(40);
  assert.equal(mentorExplanation('semantic', [label]).summary, `Shared skills: ${label}`);
  assert.equal(mentorExplanation('semantic', ['<script>test</script>']).summary, 'Shared skills: <script>test</script>');
});
